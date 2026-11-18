'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const WebSocket = require('ws');
const {
  validarUrlNodeRed, interpretarResposta, montarPacotes, criarColetor, URL_PADRAO,
} = require('../documentacao/coletor-nodered-g2.cjs');
const { iniciarSimuladorNodeRed, responderNova } = require('../documentacao/simulador-nodered-g2.cjs');
const { iniciarPonte } = require('../documentacao/ponte-nodered-g2.cjs');

const iso = ms => new Date(ms).toISOString();
const estadoVazio = () => ({ ultimaObservacao: new Map(), ultimoTimestampLocal: 0 });

test('aceita só a rota de leitura do G2, sem senha na URL', () => {
  assert.equal(validarUrlNodeRed(URL_PADRAO), 'http://192.168.150.200:1880/api/g2/processo/telemetria');
  assert.throws(() => validarUrlNodeRed('http://192.168.150.200:1880/'));
  assert.throws(() => validarUrlNodeRed('http://192.168.150.200:1880/api/g2/processo/telemetria?x=1'));
  assert.throws(() => validarUrlNodeRed('http://admin:senha@192.168.150.200:1880/api/g2/processo/telemetria'));
  assert.throws(() => validarUrlNodeRed('ws://192.168.150.200:1880/api/g2/processo/telemetria'));
});

test('distingue a Function antiga (503 fixo) da nova sem dados recentes', () => {
  assert.equal(interpretarResposta(503, { status: 'aguardando_integracao' }).tipo, 'VERSAO_ANTIGA');
  assert.equal(interpretarResposta(503, { status: 'sem_dados_recentes', sinais: {}, observadosEm: {} }).tipo, 'SEM_DADOS_RECENTES');
  assert.equal(interpretarResposta(404, null).tipo, 'INVALIDA');
  assert.equal(interpretarResposta(200, { status: 'leitura_parcial', dadosValidos: true, estacao: 'MONTAGEM' }).tipo, 'INVALIDA');
});

test('converte nomes do Node-RED para processo_n2_* e ignora sinal sem horário ou não booleano', () => {
  const t = Date.parse('2026-11-18T22:00:00.000Z');
  const r = interpretarResposta(200, {
    status: 'leitura_parcial', estacao: 'PROCESSO', dadosValidos: true, timestampConsulta: iso(t),
    sinais: { aguardando: true, manual: false, ocupado: 'sim', homeGiro: true, campoEstranho: true },
    observadosEm: { aguardando: iso(t - 500), manual: iso(t - 500), ocupado: iso(t - 500) },
  });
  assert.equal(r.tipo, 'LEITURA');
  assert.deepEqual(r.sinais.map(s => [s.tag, s.valor]), [
    ['processo_n2_aguardando', true], ['processo_n2_manual', false],
  ]);
});

test('preserva a idade de cada sinal mesmo com relógio do Node-RED adiantado', () => {
  const servidor = Date.parse('2026-11-18T22:00:10.000Z'); // Node-RED 10 s adiantado
  const local = servidor - 10_000;
  const leitura = interpretarResposta(200, {
    status: 'leitura_parcial', estacao: 'PROCESSO', dadosValidos: true, timestampConsulta: iso(servidor),
    sinais: { aguardando: true, ocupado: false },
    observadosEm: { aguardando: iso(servidor - 800), ocupado: iso(servidor - 800) },
  });
  const { pacotes } = montarPacotes(leitura, local, estadoVazio());
  assert.equal(pacotes.length, 1);
  assert.equal(Date.parse(pacotes[0].timestamp), local - 800); // 800 ms de idade, no relógio local
  assert.deepEqual(pacotes[0].sinais, { processo_n2_aguardando: true, processo_n2_ocupado: false });
});

test('não reenvia a mesma observação nem sinal vencido (nada de "renovar" cache)', () => {
  const t = Date.parse('2026-11-18T22:00:00.000Z');
  const corpo = (consulta, observado) => ({
    status: 'leitura_parcial', estacao: 'PROCESSO', dadosValidos: true, timestampConsulta: iso(consulta),
    sinais: { aguardando: true }, observadosEm: { aguardando: iso(observado) },
  });
  const primeira = montarPacotes(interpretarResposta(200, corpo(t, t - 200)), t, estadoVazio());
  assert.equal(primeira.pacotes.length, 1);
  // Consulta 1 s depois, mesma observação: não é dado novo.
  const segunda = montarPacotes(interpretarResposta(200, corpo(t + 1000, t - 200)), t + 1000, primeira.estado);
  assert.equal(segunda.pacotes.length, 0);
  assert.equal(segunda.descartados.repetidos, 1);
  // Observação nova é repassada.
  const terceira = montarPacotes(interpretarResposta(200, corpo(t + 2000, t + 1900)), t + 2000, segunda.estado);
  assert.equal(terceira.pacotes.length, 1);
  // Observação com mais de 3 s de idade é descartada.
  const vencida = montarPacotes(interpretarResposta(200, corpo(t, t - 3500)), t, estadoVazio());
  assert.equal(vencida.pacotes.length, 0);
  assert.equal(vencida.descartados.vencidos, 1);
});

test('simulador reproduz a Function nova: 503 quando o cache passa de 3 s', () => {
  const agora = Date.now();
  assert.equal(responderNova({ aguardando: { valor: true, observadoEm: agora - 500 } }, agora).status, 200);
  const velho = responderNova({ aguardando: { valor: true, observadoEm: agora - 3500 } }, agora);
  assert.equal(velho.status, 503);
  assert.equal(velho.corpo.status, 'sem_dados_recentes');
});

test('coletor só consulta o Node-RED e não publica nada quando a resposta é 503', async () => {
  const publicados = [];
  const logs = [];
  const coletor = criarColetor({
    urlNodeRed: URL_PADRAO,
    dep: {
      agora: () => Date.now(),
      log: t => logs.push(t),
      buscar: async () => ({ status: 503, corpo: { status: 'aguardando_integracao' } }),
      publicar: async p => { publicados.push(p); return 202; },
    },
  });
  assert.equal((await coletor.ciclo()).tipo, 'VERSAO_ANTIGA');
  assert.equal((await coletor.ciclo()).tipo, 'VERSAO_ANTIGA');
  assert.equal(publicados.length, 0);
  assert.equal(logs.length, 1, 'diagnóstico aparece uma vez, não a cada consulta');
  assert.match(logs[0], /ANTIGA/);
});

test('ponta a ponta: Node-RED simulado (relógio 7 s adiantado) -> coletor -> ponte -> WebSocket', async () => {
  const token = 'token-do-teste-coletor-123456789';
  const simulador = await iniciarSimuladorNodeRed({ porta: 0, deslocamentoRelogioMs: 7000 });
  const ponte = await iniciarPonte({ token, porta: 0 });
  const metodos = [];
  try {
    const cliente = new WebSocket(`ws://127.0.0.1:${ponte.porta}/telemetria`, { headers: { Origin: 'http://localhost:8081' } });
    await new Promise((ok, erro) => { cliente.once('open', ok); cliente.once('error', erro); });
    const recebido = new Promise(ok => cliente.on('message', m => {
      const dado = JSON.parse(String(m));
      if (dado.estacao === 'PROCESSO' && dado.sinais.processo_n2_aguardando !== null) ok(dado);
    }));
    await new Promise(r => setTimeout(r, 400)); // s7 in simulado publica o primeiro estado
    const coletor = criarColetor({
      urlNodeRed: `http://127.0.0.1:${simulador.porta}/api/g2/processo/telemetria`,
      dep: {
        agora: () => Date.now(),
        log: () => {},
        async buscar(url) {
          metodos.push('GET');
          const r = await fetch(url, { method: 'GET' });
          return { status: r.status, corpo: await r.json() };
        },
        async publicar(pacote) {
          const r = await fetch(`http://127.0.0.1:${ponte.porta}/api/g2/telemetria`, {
            method: 'POST', headers: { 'content-type': 'application/json', 'x-g2-bridge-token': token },
            body: JSON.stringify(pacote),
          });
          return r.status;
        },
      },
    });
    const resultado = await coletor.ciclo();
    assert.equal(resultado.tipo, 'LEITURA');
    assert.equal(coletor.contagem.recusadosPonte, 0, 'a ponte aceitou apesar do relógio adiantado');
    const dado = await recebido;
    assert.equal(typeof dado.sinais.processo_n2_aguardando, 'boolean');
    assert.ok(Math.abs(Date.now() - Date.parse(dado.timestamp)) < 1500, 'timestamp no relógio local');
    assert.deepEqual([...new Set(metodos)], ['GET']);
    cliente.close();
  } finally {
    await ponte.fechar();
    await simulador.fechar();
  }
});
