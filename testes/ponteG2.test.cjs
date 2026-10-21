'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const WebSocket = require('ws');
const { iniciarPonte, dividirLeitura } = require('../documentacao/ponte-nodered-g2.cjs');
const { gerarPacote } = require('../documentacao/demo-ponte-g2.cjs');

const token = 'token-do-teste-isolado-123456789';
const origin = { headers: { Origin: 'http://localhost:8081' } };
function esperarSocket(socket) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Tempo de conexão esgotado.')), 3000);
    socket.once('open', () => { clearTimeout(timer); resolve(); });
    socket.once('error', e => { clearTimeout(timer); reject(e); });
  });
}

test('divide todos os 4 sinais sem expor outras tags do PLC', () => {
  const dados = dividirLeitura(gerarPacote(0));
  assert.deepEqual(dados.map(x => x.estacao), ['ESTOQUE','PROCESSO','MONTAGEM','EXPEDICAO']);
  const filtrado = dividirLeitura({
    timestamp: new Date().toISOString(),
    sinais: { processo_botaoVerde: true, umaSenhaQueNaoPertenceAoG2: true },
  });
  assert.equal(filtrado.length, 1);
  assert.deepEqual(filtrado[0].sinais, { processo_botaoVerde: true });
});

test('descarta leitura inválida, sem sinal, ou antiga', () => {
  const agora = Date.now();
  assert.throws(() => dividirLeitura({ sinais: { processo_botaoVerde: 1 }}));
  assert.throws(() => dividirLeitura({ sinais: { desconhecida: true }}));
  assert.throws(() => dividirLeitura({ estacao: 'INVALIDA', sinais: { ocupado: true }}));
  assert.throws(() => dividirLeitura({timestamp: new Date(agora-5000).toISOString(), sinais:{ocupado:true}}, agora));
  assert.deepEqual(dividirLeitura({ sinais: { processo_botaoVerde: null }})[0].sinais, {processo_botaoVerde:null});
});

test('ponte real em loopback: autenticação, 4 estações e bloqueio de comandos', async () => {
  const ponte = await iniciarPonte({ token, porta: 0 });
  const base = `http://127.0.0.1:${ponte.porta}`;
  const socket = new WebSocket(`ws://127.0.0.1:${ponte.porta}/telemetria`, origin);
  try {
    await esperarSocket(socket);
    const recebidas = [];
    let resolverQuatro, rejeitarQuatro;
    const espera = new Promise((resolve, reject) => {
      resolverQuatro = resolve; rejeitarQuatro = reject;
    });
    const limite = setTimeout(() => rejeitarQuatro(new Error('Não recebeu as quatro estações.')), 3000);
    socket.on('message', mensagem => {
      recebidas.push(JSON.parse(String(mensagem)));
      if (recebidas.length === 4) { clearTimeout(limite); resolverQuatro(); }
    });
    const requisicao = payload => fetch(base+'/api/g2/telemetria', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-g2-bridge-token': token },
      body: JSON.stringify(payload),
    });
    const bloqueado = await fetch(base+'/api/g2/telemetria', {
      method: 'POST', headers:{'content-type':'application/json','x-g2-bridge-token':'errado'},
      body: JSON.stringify(gerarPacote(0)),
    });
    assert.equal(bloqueado.status, 401);
    const invalido = await requisicao({ timestamp: new Date().toISOString(), sinais: { processo_botaoVerde: 'SIM' } });
    assert.equal(invalido.status, 422);
    const recebido = await requisicao(gerarPacote(6));
    assert.equal(recebido.status, 202);
    assert.deepEqual((await recebido.json()).recebidas, ['ESTOQUE','PROCESSO','MONTAGEM','EXPEDICAO']);
    await espera;
    assert.equal(recebidas.length, 4);
    assert.equal(recebidas.find(x=>x.estacao==='PROCESSO').sinais.processo_botaoVerde, true);
    assert.equal(recebidas.find(x=>x.estacao==='ESTOQUE').sinais.ocupado, false);
    const health = await fetch(base+'/health');
    assert.equal((await health.json()).estacoes.filter(x=>x.dadosRecentes).length, 4);
    const fechado = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Canal não rejeitou comando.')), 3000);
      socket.once('close', codigo => { clearTimeout(timer); resolve(codigo); });
    });
    socket.send(JSON.stringify({origem:'IHM',acao:'START'}));
    assert.equal(await fechado, 1008);
  } finally {
    socket.terminate();
    await ponte.fechar();
  }
});

test('ponte WebSocket recusa origem de site externo', async () => {
  const ponte = await iniciarPonte({token,porta:0});
  const socket = new WebSocket(`ws://127.0.0.1:${ponte.porta}/telemetria`, {
    headers: {Origin:'https://site-externo.example'},
  });
  try {
    const resposta = await new Promise(resolve => {
      const timeout = setTimeout(() => resolve('timeout'), 3000);
      socket.on('unexpected-response', (_req,res) => { clearTimeout(timeout); resolve(res.statusCode); });
      socket.on('error', () => { clearTimeout(timeout); resolve('erro'); });
    });
    assert.equal(resposta, 403);
  } finally {
    socket.terminate();
    await ponte.fechar();
  }
});
