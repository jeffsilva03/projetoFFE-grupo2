'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const WebSocket = require('ws');
const { iniciarSimuladorComandos } = require('../documentacao/simulador-comandos-s3.cjs');

const espera = ms => new Promise(r => setTimeout(r, ms));

async function conectar(porta) {
  const ws = new WebSocket(`ws://127.0.0.1:${porta}/smart40`, { headers: { Origin: 'http://localhost:8081' } });
  const ultimas = [];
  ws.on('message', m => ultimas.push(JSON.parse(String(m))));
  await new Promise((ok, erro) => { ws.once('open', ok); ws.once('error', erro); });
  return {
    ws, status: () => ultimas.at(-1).estacoes,
    enviar: (acao, origem = 'unidade1-grupo2') => ws.send(JSON.stringify({ tipo: 'comando', comando: { origem, acao, timestamp: new Date().toISOString() } })),
  };
}
async function simular(porta, corpo) {
  const r = await fetch(`http://127.0.0.1:${porta}/simular`, { method: 'POST', body: JSON.stringify(corpo) });
  return r.json();
}

test('simulador: start/stop confirmados pela telemetria; origem não autorizada é recusada', async () => {
  const sim = await iniciarSimuladorComandos({ porta: 0, intervaloMs: 100, log: () => {} });
  try {
    const c = await conectar(sim.porta);
    await espera(150);
    assert.equal(c.status().processo.status, 'AGUARDANDO');
    c.enviar('start', 'unidade1-grupo3');
    await espera(900);
    assert.equal(c.status().processo.status, 'AGUARDANDO', 'G3 não comanda o CLP');
    c.enviar('start');
    await espera(900);
    assert.equal(c.status().processo.status, 'OPERANDO');
    c.enviar('stop');
    await espera(600);
    assert.equal(c.status().processo.status, 'AGUARDANDO');
    c.ws.close();
  } finally { await sim.fechar(); }
});

test('simulador: emergência física trava e reset só funciona com o cogumelo solto', async () => {
  const sim = await iniciarSimuladorComandos({ porta: 0, intervaloMs: 100, log: () => {} });
  try {
    const c = await conectar(sim.porta);
    await simular(sim.porta, { emergenciaFisica: true });
    await espera(150);
    assert.equal(c.status().processo.status, 'EMERGENCIA');
    c.enviar('reset');
    await espera(700);
    assert.equal(c.status().processo.status, 'EMERGENCIA', 'reset não libera com o cogumelo apertado');
    await simular(sim.porta, { emergenciaFisica: false });
    await espera(150);
    assert.equal(c.status().processo.status, 'EMERGENCIA', 'soltar o cogumelo não destrava sozinho');
    c.enviar('reset');
    await espera(700);
    assert.equal(c.status().processo.status, 'AGUARDANDO');
    c.ws.close();
  } finally { await sim.fechar(); }
});

test('simulador: emergência por software passa de qualquer origem; cenário de timeout ignora o comando', async () => {
  const sim = await iniciarSimuladorComandos({ porta: 0, intervaloMs: 100, log: () => {} });
  try {
    const c = await conectar(sim.porta);
    await simular(sim.porta, { ignorar: 'start' });
    c.enviar('start');
    await espera(900);
    assert.equal(c.status().processo.status, 'AGUARDANDO');
    c.enviar('emergencia', 'unidade1-grupo4');
    await espera(200);
    assert.equal(c.status().estoque.status, 'EMERGENCIA');
    c.ws.close();
  } finally { await sim.fechar(); }
});
