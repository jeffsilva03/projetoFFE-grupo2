'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const WebSocket = require('ws');
const { iniciarPonte, mesclarLeituraG2, snapshotAtualG2, origensAutorizadas } = require('../documentacao/ponte-nodered-g2.cjs');
const token = 'token-de-teste-local-com-mais-de-16';

test('mescla mensagens parciais sem apagar sinais que ainda são recentes', () => {
  const agora = 2_000_000;
  const cache = new Map();
  const primeiro = mesclarLeituraG2(cache, {
    timestamp: new Date(agora).toISOString(),
    estacao: 'PROCESSO',
    sinais: { processo_segurancaOK: true, processo_botaoVerde: false },
  }, agora);
  assert.equal(primeiro.sinais.processo_segurancaOK, true);
  assert.equal(primeiro.sinais.processo_botaoVerde, false);
  assert.equal(primeiro.sinais.processo_botaoVermelho, null);

  const segundo = mesclarLeituraG2(cache, {
    timestamp: new Date(agora + 500).toISOString(),
    estacao: 'PROCESSO',
    sinais: { processo_botaoVerde: true },
  }, agora + 500);
  assert.equal(segundo.sinais.processo_botaoVerde, true);
  assert.equal(segundo.sinais.processo_segurancaOK, true);
  assert.equal(segundo.sinais.processo_botaoVermelho, null);
});

test('invalida sinal antigo mesmo quando outros sinais ainda mudam', () => {
  const t = 10_000_000;
  const cache = new Map();
  mesclarLeituraG2(cache, {
    timestamp: new Date(t).toISOString(),
    estacao: 'MONTAGEM',
    sinais: { montagem_segurancaOK: true, montagem_botaoVerde: false },
  }, t);
  const parcial = mesclarLeituraG2(cache, {
    timestamp: new Date(t + 3100).toISOString(),
    estacao: 'MONTAGEM',
    sinais: { montagem_botaoVerde: true },
  }, t + 3100);
  assert.equal(parcial.sinais.montagem_botaoVerde, true);
  assert.equal(parcial.sinais.montagem_segurancaOK, null);
  assert.equal(snapshotAtualG2(cache.get('MONTAGEM'), 'MONTAGEM', t + 3100).sinais.montagem_segurancaOK, null);
  assert.equal(snapshotAtualG2(cache.get('MONTAGEM'), 'MONTAGEM', t + 7000), null);
});

test('origem WebSocket remota só pode ser incluída via HTTPS', () => {
  const origens = origensAutorizadas('https://ihm.exemplo.edu.br,http://localhost:9000');
  assert.equal(origens.has('https://ihm.exemplo.edu.br'), true);
  assert.equal(origens.has('http://localhost:9000'), true);
  assert.throws(() => origensAutorizadas('http://site-remoto.exemplo.edu.br'));
  assert.throws(() => origensAutorizadas('https://site.exemplo.edu.br/?token=abc'));
  assert.throws(() => origensAutorizadas('https://alguem:senha@site.exemplo.edu.br'));
});

function abrir(url, origem) {
  const socket = new WebSocket(url, { headers: { Origin: origem } });
  return new Promise((resolver, rejeitar) => {
    socket.once('open', () => resolver(socket));
    socket.once('error', rejeitar);
  });
}

function receberProximo(socket) {
  return new Promise((resolver, rejeitar) => {
    const limite = setTimeout(() => rejeitar(new Error('Sem resposta WebSocket.')), 3000);
    socket.once('message', dado => { clearTimeout(limite); resolver(JSON.parse(String(dado))); });
  });
}

test('HTTP recebe deltas e WebSocket emite snapshot atualizado para cada estação', async () => {
  const ponte = await iniciarPonte({ token, porta: 0, origens: 'https://ihm.exemplo.edu.br' });
  const base = 'http://127.0.0.1:' + ponte.porta;
  let socket;
  try {
    socket = await abrir('ws://127.0.0.1:' + ponte.porta + '/telemetria', 'https://ihm.exemplo.edu.br');
    const enviar = async sinais => fetch(base + '/api/g2/telemetria', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-g2-bridge-token': token },
      body: JSON.stringify({ timestamp: new Date().toISOString(), sinais }),
    });
    let leitura = receberProximo(socket);
    const a = await enviar({ processo_segurancaOK: true, processo_botaoVerde: false });
    assert.equal(a.status, 202);
    const primeiro = await leitura;
    assert.equal(primeiro.estacao, 'PROCESSO');
    assert.equal(primeiro.sinais.processo_segurancaOK, true);
    assert.equal(primeiro.sinais.processo_botaoVerde, false);
    assert.equal(primeiro.sinais.processo_botaoVermelho, null);

    leitura = receberProximo(socket);
    const b = await enviar({ processo_botaoVerde: true });
    assert.equal(b.status, 202);
    const segundo = await leitura;
    assert.equal(segundo.sinais.processo_botaoVerde, true);
    assert.equal(segundo.sinais.processo_segurancaOK, true);

    // Nova estação mantém cache independente e não altera Processo.
    leitura = receberProximo(socket);
    const c = await enviar({ expedicao_botaoVermelho: true });
    assert.equal(c.status, 202);
    assert.equal((await leitura).estacao, 'EXPEDICAO');
    const health = await fetch(base + '/health');
    assert.equal((await health.json()).estacoes.filter(x=>x.dadosRecentes).length, 2);
  } finally {
    if (socket) socket.terminate();
    await ponte.fechar();
  }
});

test('API recusa leitura antiga fora de ordem', async () => {
  const ponte = await iniciarPonte({ token, porta: 0 });
  const url = 'http://127.0.0.1:' + ponte.porta + '/api/g2/telemetria';
  try {
    const enviar = async (timestamp, valor) => fetch(url, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-g2-bridge-token': token },
      body: JSON.stringify({ timestamp, sinais: { processo_botaoVerde: valor } }),
    });
    const agora = Date.now();
    assert.equal((await enviar(new Date(agora).toISOString(), true)).status, 202);
    assert.equal((await enviar(new Date(agora - 500).toISOString(), false)).status, 409);
  } finally {
    await ponte.fechar();
  }
});
