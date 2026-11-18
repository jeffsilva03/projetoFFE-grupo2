'use strict';
/**
 * Simulador LOCAL do Node-RED da bancada (aba "G2 - Telemetria").
 * Serve para testar o coletor em casa. NÃO é a máquina e não lê CLP.
 *
 * Reproduz as duas versões encontradas nos exports:
 *  - versao 'antiga' (flows.json):     GET responde sempre 503 aguardando_integracao
 *  - versao 'nova'   (flows (1).json): cache por sinal com validade de 3 s;
 *                                      200 leitura_parcial ou 503 sem_dados_recentes
 *
 * O "s7 in" simulado usa mode=all + diff=true: publica o objeto inteiro só
 * quando algum valor muda. Com a estação parada, nada é publicado e, após 3 s,
 * a rota passa a responder 503 — o comportamento que esperamos ver na bancada.
 */
const http = require('node:http');

const ROTA = '/api/g2/processo/telemetria';
const CAMPOS = [
  'aguardando', 'emergencia', 'manual', 'ocupado', 'cancelOP', 'finishOP', 'startOP',
  'comutadorAutomatico', 'condicaoIniciar', 'emergenciaAtivada',
  'homeGiro', 'homeVertical', 'servoGiro', 'servoVertical',
];
const VALIDADE_MS = 3000;

/** Estado fictício da estação em função do tempo: ciclo de 14 s com 6 s parado. */
function estadoFicticio(ms, inicio) {
  const t = ((ms - inicio) / 1000) % 14;
  const trabalhando = t < 8;
  return {
    aguardando: !trabalhando,
    emergencia: false,
    manual: false,
    ocupado: trabalhando,
    cancelOP: false,
    finishOP: t >= 7 && t < 8,
    startOP: t < 1,
    comutadorAutomatico: true,
    condicaoIniciar: !trabalhando,
    emergenciaAtivada: false,
    homeGiro: !trabalhando || t >= 6,
    homeVertical: !trabalhando || t < 2,
    servoGiro: trabalhando,
    servoVertical: trabalhando,
  };
}

/** Mesma lógica da Function "G2 - Leitura Segura" do segundo export. */
function responderNova(cache, agora) {
  const sinais = {};
  const observadosEm = {};
  for (const campo of CAMPOS) {
    const item = cache[campo];
    if (!item || typeof item.valor !== 'boolean' || !Number.isFinite(item.observadoEm)) continue;
    const idade = agora - item.observadoEm;
    if (idade < 0 || idade > VALIDADE_MS) continue;
    sinais[campo] = item.valor;
    observadosEm[campo] = new Date(item.observadoEm).toISOString();
  }
  const temDados = Object.keys(sinais).length > 0;
  return {
    status: temDados ? 200 : 503,
    corpo: {
      status: temDados ? 'leitura_parcial' : 'sem_dados_recentes',
      estacao: 'PROCESSO',
      timestampConsulta: new Date(agora).toISOString(),
      dadosValidos: temDados,
      sinais,
      observadosEm,
    },
  };
}

function iniciarSimuladorNodeRed({ porta = 18800, versao = 'nova', cicloS7Ms = 200, deslocamentoRelogioMs = 0 } = {}) {
  const relogio = () => Date.now() + deslocamentoRelogioMs; // simula relógio do notebook da bancada
  const inicio = relogio();
  const cache = {};
  let ultimoPublicado = null;
  // "s7 in" com diff: publica o objeto inteiro apenas quando algo mudou.
  const s7 = setInterval(() => {
    const agora = relogio();
    const leitura = estadoFicticio(agora, inicio);
    const chave = JSON.stringify(leitura);
    if (chave === ultimoPublicado) return;
    ultimoPublicado = chave;
    // Function "G2- Registrar Sinais N2": grava cada booleano com Date.now().
    for (const campo of CAMPOS) {
      if (typeof leitura[campo] === 'boolean') cache[campo] = { valor: leitura[campo], observadoEm: agora };
    }
  }, cicloS7Ms);

  const servidor = http.createServer((req, res) => {
    const caminho = new URL(req.url ?? '/', 'http://localhost').pathname;
    if (caminho !== ROTA) { res.writeHead(404); res.end(); return; }
    if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
    const resposta = versao === 'antiga'
      ? { status: 503, corpo: { status: 'aguardando_integracao', estacao: 'PROCESSO', dadosValidos: false, mensagem: 'Telemetria real ainda não configurada' } }
      : responderNova(cache, relogio());
    res.writeHead(resposta.status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify(resposta.corpo));
  });
  return new Promise((resolve, reject) => {
    servidor.once('error', reject);
    servidor.listen(porta, '127.0.0.1', () => resolve({
      porta: servidor.address().port,
      fechar: () => new Promise(r => { clearInterval(s7); servidor.close(r); }),
    }));
  });
}

if (require.main === module) {
  const versao = process.argv.includes('--antiga') ? 'antiga' : 'nova';
  const porta = Number(process.env.G2_SIMULADOR_NODERED_PORT || 18800);
  iniciarSimuladorNodeRed({ porta, versao }).then(s => {
    console.log(`[SIMULADOR] Node-RED FICTÍCIO (versão ${versao}) em http://127.0.0.1:${s.porta}${ROTA}`);
    console.log('[SIMULADOR] Ciclo de 14 s: 8 s trabalhando, 6 s parado (com diff:true, vira 503 após 3 s parado).');
    console.log('[SIMULADOR] Nenhuma conexão com a Planta N2.');
  }).catch(e => { console.error('[SIMULADOR] Não iniciou:', e.message); process.exitCode = 1; });
}

module.exports = { iniciarSimuladorNodeRed, responderNova, estadoFicticio, CAMPOS, ROTA };
