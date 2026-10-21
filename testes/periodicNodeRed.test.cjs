'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { dividirLeitura } = require('../documentacao/ponte-nodered-g2.cjs');

const source = fs.readFileSync('documentacao/NODERED-FUNCTION-LEITURA-PERIODICA-G2.js', 'utf8');
const runFunction = new Function('msg', 'context', 'env', 'node', 'Date', source);
const token = 'token-teste-node-red-apenas-local-123456';
const sinais = {
  emergencia: false,
  processo_segurancaOK: true,
  processo_botaoVerde: false,
  montagem_segurancaOK: true,
  expedicao_segurancaOK: true,
  expansaoCodigoPLC: 'NAO-PODE-SER-PUBLICADO',
};

function criarExecucao() {
  const memoria = new Map();
  const avisos = [];
  const erros = [];
  const status = [];
  let tempo = Date.parse('2026-10-21T15:00:00.000Z');
  const contexto = {
    get: nome => memoria.get(nome),
    set: (nome, valor) => memoria.set(nome, valor),
  };
  const env = {get: chave => ({
    G2_BRIDGE_TOKEN: token,
    G2_BRIDGE_HTTP_URL: 'http://127.0.0.1:8092/api/g2/telemetria',
  })[chave]};
  const node = {
    warn: msg => avisos.push(msg),
    error: msg => erros.push(msg),
    status: msg => status.push(msg),
  };
  function DataFake(...args) { return new Date(...args); }
  DataFake.now = () => tempo;
  const ler = dados => runFunction({payload: dados}, contexto, env, node, DataFake);
  return {ler, setTempo:ms=>{tempo=ms}, getTempo:()=>tempo, avisos, erros, status, memoria, env};
}

test('publica leitura nova do S7 e distribui as quatro estações corretamente', () => {
  const x=criarExecucao();
  const msg=x.ler({...sinais});
  assert.ok(msg);
  assert.equal(msg.method,'POST');
  assert.equal(msg.payload.sinais.processo_segurancaOK,true);
  assert.equal(msg.payload.sinais.processo_botaoVerde,false);
  assert.equal(msg.payload.sinais.expansaoCodigoPLC,undefined);
  assert.equal(msg.headers['x-g2-bridge-token'],token);
  const repartido=dividirLeitura(msg.payload,x.getTempo());
  assert.deepEqual(repartido.map(z=>z.estacao),['ESTOQUE','PROCESSO','MONTAGEM','EXPEDICAO']);
  assert.equal(x.status.length,1);
});

test('emite somente uma leitura por segundo, nunca por um Inject local', () => {
  const x=criarExecucao();
  const t=x.getTempo();
  assert.ok(x.ler({...sinais}));
  x.setTempo(t+500);
  assert.equal(x.ler({...sinais}),null);
  x.setTempo(t+1000);
  assert.ok(x.ler({...sinais,processo_botaoVerde:true}));
});

test('não recria sinais ausentes usando cache, mesmo depois do intervalo', () => {
  const x=criarExecucao();
  const t=x.getTempo();
  assert.ok(x.ler({...sinais}));
  x.setTempo(t+1001);
  const segundo=x.ler({processo_botaoVerde:true});
  assert.ok(segundo);
  assert.deepEqual(segundo.payload.sinais,{processo_botaoVerde:true});
  assert.equal(segundo.payload.sinais.processo_segurancaOK,undefined);
  assert.equal(dividirLeitura(segundo.payload,x.getTempo()).length,1);
});

test('não publica caso a fonte não tenha sinais reconhecidos', () => {
  const x=criarExecucao();
  assert.equal(x.ler({naoG2:true}),null);
  assert.equal(x.ler(null),null);
  assert.equal(x.memoria.has('g2_ultima_leitura_enviada'),false);
  assert.ok(x.avisos.length >= 1);
});

test('não publica sem token aprovado e sem HTTP local/HTTPS', () => {
  const x=criarExecucao();
  x.env.get=chave=>chave==='G2_BRIDGE_TOKEN'?'curto':'http://127.0.0.1:8092/api/g2/telemetria';
  assert.equal(x.ler({...sinais}),null);
  assert.equal(x.erros.length,1);
  const y=criarExecucao();
  y.env.get=chave=>chave==='G2_BRIDGE_TOKEN'?token:'http://192.168.0.15:8092/api/g2/telemetria';
  assert.equal(y.ler({...sinais}),null);
  assert.equal(y.erros.length,1);
});

test('valores numéricos ou textuais não são convertidos silenciosamente para boolean', () => {
  const x=criarExecucao();
  const result=x.ler({
    processo_botaoVerde:1,
    processo_botaoVermelho:'false',
    processo_segurancaOK:true,
  });
  assert.ok(result);
  assert.deepEqual(result.payload.sinais,{processo_segurancaOK:true});
  assert.equal(x.avisos.length,2);
});
