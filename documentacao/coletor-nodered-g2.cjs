'use strict';
/**
 * Coletor G2 — Node-RED da bancada  --HTTP GET-->  coletor  --POST-->  ponte local  --WS-->  IHM
 *
 * Roda no notebook do aluno. Consulta a rota de LEITURA já criada na aba
 * "G2 - Telemetria" do Node-RED (GET /api/g2/processo/telemetria) e repassa
 * os sinais à ponte G2 do mesmo computador (127.0.0.1:8092).
 *
 * Regras:
 *  - Só faz GET no Node-RED. Nunca POST/PUT, nunca Deploy, nunca S7.
 *  - Não "renova" leitura: cada sinal sai com o horário em que o Node-RED
 *    o observou (convertido para o relógio deste computador pela idade).
 *  - Uma observação só é repassada uma vez. Se o Node-RED não observar de novo
 *    (diff:true), a ponte deixa o sinal vencer em 3 s, como deve ser.
 *  - HTTP 503 não é transformado em "false": nada é enviado e a IHM mostra
 *    "Não informado".
 */
const fs = require('node:fs');
const crypto = require('node:crypto');
const { MAPA_PROCESSO_N2 } = require('./processo-n2-mapeamento.cjs');

const ROTA_NODERED = '/api/g2/processo/telemetria';
const URL_PADRAO = 'http://192.168.150.200:1880' + ROTA_NODERED;
const VALIDADE_MS = 3000;
const INTERVALO_PADRAO_MS = 1000;
const INTERVALO_MINIMO_MS = 500;
const OBJETO = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

/** Aceita só a rota de leitura do G2, sem usuário/senha embutidos. */
function validarUrlNodeRed(endereco) {
  let url;
  try { url = new URL(String(endereco).trim()); }
  catch { throw new Error('URL do Node-RED inválida.'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Use http:// ou https:// para o Node-RED.');
  if (url.username || url.password) throw new Error('Não coloque usuário/senha na URL.');
  if (url.pathname !== ROTA_NODERED || url.search || url.hash) {
    throw new Error(`A URL deve terminar em ${ROTA_NODERED}, sem parâmetros.`);
  }
  return url.toString();
}

/**
 * Classifica a resposta do Node-RED. Os formatos vêm dos dois exports:
 *  - flows.json:     503 { status: 'aguardando_integracao' }   (Function antiga, 503 fixo)
 *  - flows (1).json: 503 { status: 'sem_dados_recentes' }     (Function nova, sem sinal recente)
 *                    200 { status: 'leitura_parcial', sinais, observadosEm, timestampConsulta }
 */
function interpretarResposta(statusHttp, corpo) {
  if (!OBJETO(corpo)) return { tipo: 'INVALIDA', motivo: 'Corpo não é um objeto JSON.' };
  if (corpo.status === 'aguardando_integracao') return { tipo: 'VERSAO_ANTIGA' };
  if (corpo.status === 'sem_dados_recentes') return { tipo: 'SEM_DADOS_RECENTES' };
  if (statusHttp !== 200 || corpo.status !== 'leitura_parcial' || corpo.dadosValidos !== true) {
    return { tipo: 'INVALIDA', motivo: `Resposta inesperada (HTTP ${statusHttp}, status ${String(corpo.status)}).` };
  }
  if (corpo.estacao !== 'PROCESSO') return { tipo: 'INVALIDA', motivo: 'Estação diferente de PROCESSO.' };
  if (typeof corpo.timestampConsulta !== 'string' || !ISO.test(corpo.timestampConsulta)) {
    return { tipo: 'INVALIDA', motivo: 'timestampConsulta ausente ou inválido.' };
  }
  if (!OBJETO(corpo.sinais) || !OBJETO(corpo.observadosEm)) {
    return { tipo: 'INVALIDA', motivo: 'sinais/observadosEm ausentes.' };
  }
  const consultaServidorMs = Date.parse(corpo.timestampConsulta);
  const sinais = [];
  for (const [campo, tag] of Object.entries(MAPA_PROCESSO_N2)) {
    if (!Object.hasOwn(corpo.sinais, campo)) continue;
    const valor = corpo.sinais[campo];
    const observado = corpo.observadosEm[campo];
    // Sem horário de observação válido, o sinal é ignorado (nunca vira "false").
    if (typeof valor !== 'boolean' || typeof observado !== 'string' || !ISO.test(observado)) continue;
    const observadoServidorMs = Date.parse(observado);
    if (!Number.isFinite(observadoServidorMs)) continue;
    sinais.push({ campo, tag, valor, observadoServidorMs });
  }
  return { tipo: 'LEITURA', consultaServidorMs, sinais };
}

/**
 * Converte cada observação para o relógio local usando a IDADE medida no próprio
 * relógio do Node-RED (timestampConsulta - observadoEm). Assim uma diferença de
 * horário entre o notebook da bancada e este computador não faz leitura velha
 * parecer nova (nem o contrário).
 *
 * @param leitura   resultado de interpretarResposta (tipo LEITURA)
 * @param consultaLocalMs  instante local da consulta (meio do tempo de ida e volta)
 * @param estado    { ultimaObservacao: Map<campo, ms servidor>, ultimoTimestampLocal: number }
 * @param limiteIdadeMs  idade máxima aceita (desconta o tempo de resposta, para a
 *                       ponte não receber sinal que já chegaria vencido)
 * @returns { pacotes, descartados, estado }
 */
function montarPacotes(leitura, consultaLocalMs, estado, limiteIdadeMs = VALIDADE_MS) {
  const ultimaObservacao = new Map(estado.ultimaObservacao);
  let ultimoTimestampLocal = estado.ultimoTimestampLocal;
  const descartados = { repetidos: 0, vencidos: 0, futuros: 0, foraDeOrdem: 0 };
  const grupos = new Map();
  for (const s of leitura.sinais) {
    const idade = leitura.consultaServidorMs - s.observadoServidorMs;
    if (idade < -1000) { descartados.futuros++; continue; }
    if (idade > limiteIdadeMs) { descartados.vencidos++; continue; }
    const anterior = ultimaObservacao.get(s.campo);
    if (anterior !== undefined && s.observadoServidorMs <= anterior) { descartados.repetidos++; continue; }
    const localMs = consultaLocalMs - Math.max(idade, 0);
    if (!grupos.has(localMs)) grupos.set(localMs, { localMs, sinais: {}, campos: [] });
    const grupo = grupos.get(localMs);
    grupo.sinais[s.tag] = s.valor;
    grupo.campos.push([s.campo, s.observadoServidorMs]);
  }
  const pacotes = [];
  for (const grupo of [...grupos.values()].sort((a, b) => a.localMs - b.localMs)) {
    // A ponte recusa pacote mais antigo que o último aceito para a estação.
    if (grupo.localMs < ultimoTimestampLocal) { descartados.foraDeOrdem += grupo.campos.length; continue; }
    for (const [campo, ms] of grupo.campos) ultimaObservacao.set(campo, ms);
    ultimoTimestampLocal = grupo.localMs;
    pacotes.push({ estacao: 'PROCESSO', timestamp: new Date(grupo.localMs).toISOString(), sinais: grupo.sinais });
  }
  return { pacotes, descartados, estado: { ultimaObservacao, ultimoTimestampLocal } };
}

const DIAGNOSTICO = {
  VERSAO_ANTIGA: 'Node-RED respondeu 503 "aguardando_integracao": está implantada a Function ANTIGA (flows.json, 503 fixo). Peça ao professor para conferir o Deploy da versão nova.',
  SEM_DADOS_RECENTES: 'Node-RED respondeu 503 "sem_dados_recentes": a Function NOVA está no ar, mas nenhum dos 14 sinais foi observado nos últimos 3 s (S7 parado ou diff:true sem mudança).',
  LEITURA: 'Node-RED respondeu 200 "leitura_parcial": há sinal recente do Processo.',
  REDE: 'Sem resposta do Node-RED (rede, porta 1880 ou rota inexistente).',
  INVALIDA: 'Resposta do Node-RED fora do formato esperado.',
};

/**
 * Laço do coletor. `dep` permite testar sem rede:
 *  buscar(url) -> { status, corpo }, publicar(pacote) -> status HTTP da ponte,
 *  agora() -> ms, log(texto), registrar(objeto) (evidência opcional).
 */
function criarColetor({ urlNodeRed, intervaloMs = INTERVALO_PADRAO_MS, dep }) {
  const url = validarUrlNodeRed(urlNodeRed);
  const intervalo = Math.max(INTERVALO_MINIMO_MS, Number(intervaloMs) || INTERVALO_PADRAO_MS);
  let estado = { ultimaObservacao: new Map(), ultimoTimestampLocal: 0 };
  let ultimoTipo = null;
  let ultimaDiferencaRelogio = null;
  const contagem = { consultas: 0, pacotes: 0, sinais: 0, recusadosPonte: 0 };

  async function ciclo() {
    contagem.consultas++;
    const inicio = dep.agora();
    let resposta;
    try { resposta = await dep.buscar(url); }
    catch (erro) {
      if (ultimoTipo !== 'REDE') dep.log(`[COLETOR] ${DIAGNOSTICO.REDE} (${erro.message})`);
      ultimoTipo = 'REDE';
      dep.registrar?.({ local: new Date(inicio).toISOString(), erro: erro.message });
      return { tipo: 'REDE' };
    }
    const fim = dep.agora();
    const consultaLocalMs = Math.round((inicio + fim) / 2);
    dep.registrar?.({ local: new Date(fim).toISOString(), http: resposta.status, corpo: resposta.corpo });
    const leitura = interpretarResposta(resposta.status, resposta.corpo);
    if (leitura.tipo !== ultimoTipo) {
      dep.log(`[COLETOR] ${DIAGNOSTICO[leitura.tipo]}${leitura.motivo ? ' ' + leitura.motivo : ''}`);
      ultimoTipo = leitura.tipo;
    }
    if (leitura.tipo !== 'LEITURA') return { tipo: leitura.tipo };

    const diferenca = leitura.consultaServidorMs - consultaLocalMs;
    if (ultimaDiferencaRelogio === null || Math.abs(diferenca - ultimaDiferencaRelogio) > 500) {
      ultimaDiferencaRelogio = diferenca;
      if (Math.abs(diferenca) > 500) {
        dep.log(`[COLETOR] Relógio do Node-RED ${diferenca > 0 ? 'adiantado' : 'atrasado'} ~${(Math.abs(diferenca) / 1000).toFixed(1)} s em relação a este PC. Horários convertidos pela idade de cada sinal.`);
      }
    }
    // Desconta metade da ida e volta e uma margem: o sinal precisa chegar à ponte ainda válido.
    const limiteIdade = VALIDADE_MS - (fim - consultaLocalMs) - 200;
    const resultado = montarPacotes(leitura, consultaLocalMs, estado, limiteIdade);
    estado = resultado.estado;
    for (const pacote of resultado.pacotes) {
      const status = await dep.publicar(pacote);
      if (status === 202) { contagem.pacotes++; contagem.sinais += Object.keys(pacote.sinais).length; }
      else { contagem.recusadosPonte++; dep.log(`[COLETOR] A ponte recusou um pacote (HTTP ${status}).`); }
    }
    return { tipo: 'LEITURA', pacotes: resultado.pacotes, descartados: resultado.descartados };
  }

  return { ciclo, intervalo, url, contagem };
}

async function executar() {
  const { iniciarPonte } = require('./ponte-nodered-g2.cjs');
  const argumento = nome => process.argv.find(a => a.startsWith(`--${nome}=`))?.slice(nome.length + 3);
  const simulado = process.argv.includes('--simulado');
  let simulador = null;
  let urlNodeRed = argumento('url') || process.env.G2_NODERED_URL || URL_PADRAO;
  if (simulado) {
    // Teste em casa: sobe o Node-RED fictício neste mesmo processo.
    const { iniciarSimuladorNodeRed } = require('./simulador-nodered-g2.cjs');
    simulador = await iniciarSimuladorNodeRed({ porta: 0, versao: process.argv.includes('--antiga') ? 'antiga' : 'nova' });
    urlNodeRed = `http://127.0.0.1:${simulador.porta}${ROTA_NODERED}`;
  }
  const intervaloMs = Number(argumento('intervalo') || process.env.G2_COLETOR_INTERVALO_MS || INTERVALO_PADRAO_MS);
  const arquivoRegistro = argumento('registro') || process.env.G2_COLETOR_REGISTRO || '';
  validarUrlNodeRed(urlNodeRed);

  // Token efêmero entre coletor e ponte do MESMO processo; nunca salvo nem impresso.
  const token = crypto.randomBytes(24).toString('hex');
  const ponte = await iniciarPonte({ token, origens: process.env.G2_IHM_ORIGINS ?? '' });
  const urlPonte = `http://127.0.0.1:${ponte.porta}/api/g2/telemetria`;

  const coletor = criarColetor({
    urlNodeRed, intervaloMs,
    dep: {
      agora: () => Date.now(),
      log: texto => console.log(new Date().toLocaleTimeString('pt-BR'), texto),
      registrar: arquivoRegistro
        ? linha => fs.appendFileSync(arquivoRegistro, JSON.stringify(linha) + '\n')
        : undefined,
      async buscar(url) {
        const resposta = await fetch(url, {
          method: 'GET', redirect: 'error', cache: 'no-store',
          headers: { accept: 'application/json' }, signal: AbortSignal.timeout(2000),
        });
        let corpo = null;
        try { corpo = await resposta.json(); } catch { /* corpo não JSON fica null */ }
        return { status: resposta.status, corpo };
      },
      async publicar(pacote) {
        const resposta = await fetch(urlPonte, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-g2-bridge-token': token },
          body: JSON.stringify(pacote), signal: AbortSignal.timeout(2000),
        });
        return resposta.status;
      },
    },
  });

  console.log('[G2] Coletor SOMENTE LEITURA: Node-RED (GET) -> ponte local -> IHM.');
  if (simulado) console.log('[G2] MODO SIMULADO: Node-RED fictício local, sem conexão com a Planta N2.');
  console.log('[G2] Node-RED consultado:', coletor.url, `a cada ${coletor.intervalo} ms.`);
  console.log(`[G2] Ponte em http://127.0.0.1:${ponte.porta} — na IHM use ws://localhost:${ponte.porta}/telemetria`);
  if (arquivoRegistro) console.log('[G2] Evidências (respostas do Node-RED) gravadas em', arquivoRegistro);
  console.log('[G2] Nenhum comando é enviado ao Node-RED, ao CLP ou à máquina.');

  let ativo = true;
  let emAndamento = false;
  const tick = async () => {
    if (!ativo || emAndamento) return;
    emAndamento = true;
    try { await coletor.ciclo(); }
    catch (erro) { console.error('[COLETOR] Erro inesperado:', erro.message); }
    finally { emAndamento = false; }
  };
  await tick();
  const temporizador = setInterval(tick, coletor.intervalo);
  const resumo = setInterval(() => {
    const c = coletor.contagem;
    console.log(`[COLETOR] Resumo: ${c.consultas} consultas, ${c.pacotes} pacotes (${c.sinais} sinais) repassados, ${c.recusadosPonte} recusados pela ponte.`);
  }, 30000);
  const encerrar = async () => {
    ativo = false;
    clearInterval(temporizador); clearInterval(resumo);
    await ponte.fechar();
    if (simulador) await simulador.fechar();
    process.exit(0);
  };
  process.once('SIGINT', encerrar);
  process.once('SIGTERM', encerrar);
}

if (require.main === module) {
  executar().catch(erro => { console.error('[G2] Coletor não iniciou:', erro.message); process.exitCode = 1; });
}

module.exports = {
  ROTA_NODERED, URL_PADRAO, validarUrlNodeRed, interpretarResposta, montarPacotes, criarColetor, DIAGNOSTICO,
};
