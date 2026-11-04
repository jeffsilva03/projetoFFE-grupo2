'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const WebSocket = require('ws');
const { iniciarMockComandosG2, PROTOCOLO, ROTA, HOST } = require('../documentacao/mock-comandos-g2.cjs');
const origem = { headers: { Origin:'http://localhost:8081' } };

function escutar(ws) {
  const filas = [], esperas = [];
  ws.on('message', bin => {
    const msg=JSON.parse(String(bin));
    if(esperas.length) esperas.shift()(msg); else filas.push(msg);
  });
  return async (tipo, id) => {
    const deadline = Date.now()+2500;
    while(Date.now()<deadline) {
      const msg = filas.length ? filas.shift() : await Promise.race([
        new Promise(resolve=>esperas.push(resolve)),
        new Promise((_,reject)=>setTimeout(()=>reject(new Error('Sem mensagem')),2400)),
      ]);
      if(msg.tipo === tipo && (id===undefined || msg.id===id)) return msg;
    }
    throw Error('Não recebeu '+tipo);
  };
}
async function iniciar() {
  const server = await iniciarMockComandosG2({porta:0});
  const ws = new WebSocket('ws://127.0.0.1:'+server.porta+ROTA,origem);
  const receber = escutar(ws);
  await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject)});
  const hello=await receber('MOCK_HELLO');
  const inicial=await receber('STATE_TELEMETRY');
  assert.equal(hello.protocolo,PROTOCOLO);
  assert.equal(inicial.estado,'PARADA');
  return {server,ws,receber,fechar:async()=>{ws.terminate();await server.fechar();}};
}
const solicitar=(ws,comando,id=randomUUID())=>{
 ws.send(JSON.stringify({tipo:'COMMAND_REQUEST',protocolo:PROTOCOLO,id,comando}));
 return id;
};
test('somente localhost e origens locais têm permissão', async()=>{
  const m=await iniciarMockComandosG2({porta:0});
  assert.equal(HOST,'127.0.0.1');
  const ws=new WebSocket('ws://127.0.0.1:'+m.porta+ROTA,{headers:{Origin:'https://outro-site.example'}});
  try {
    const status=await new Promise(resolve=>{
      ws.on('unexpected-response',(_r,r)=>resolve(r.statusCode));
      ws.on('error',()=>resolve('erro'));
    });
    assert.equal(status,401===status?401:403);
  }finally{ws.terminate();await m.fechar();}
});
test('START e STOP têm ACK correlacionado e confirmação de estado posterior',async()=>{
  const c=await iniciar();
  try {
    const start=solicitar(c.ws,'START');
    const ack=await c.receber('COMMAND_ACK',start);
    assert.equal(ack.aceito,true);
    assert.equal(ack.comando,'START');
    const confirmado=await c.receber('STATE_TELEMETRY',start);
    assert.equal(confirmado.estado,'EM_EXECUCAO');
    assert.ok(confirmado.sequencia>1);
    const stop=solicitar(c.ws,'STOP');
    assert.equal((await c.receber('COMMAND_ACK',stop)).aceito,true);
    assert.equal((await c.receber('STATE_TELEMETRY',stop)).estado,'PARADA');
  }finally{await c.fechar();}
});
test('START repetido é recusado sem apresentar falsa confirmação',async()=>{
  const c=await iniciar();
  try {
    const id=solicitar(c.ws,'START');
    await c.receber('COMMAND_ACK',id);
    await c.receber('STATE_TELEMETRY',id);
    const repetido=solicitar(c.ws,'START');
    const ack=await c.receber('COMMAND_ACK',repetido);
    assert.equal(ack.aceito,false);
    assert.match(ack.motivo,/já em execução/);
  }finally{await c.fechar();}
});
test('falha de segurança virtual recusa START, STOP continua disponível',async()=>{
  const c=await iniciar();
  try {
    c.ws.send(JSON.stringify({tipo:'SCENARIO_SET',protocolo:PROTOCOLO,cenario:'SEGURANCA_BLOQUEADA'}));
    assert.equal((await c.receber('STATE_TELEMETRY')).seguranca,'BLOQUEADA');
    const start=solicitar(c.ws,'START');
    const negado=await c.receber('COMMAND_ACK',start);
    assert.equal(negado.aceito,false);
    assert.match(negado.motivo,/segurança/);
    const stop=solicitar(c.ws,'STOP');
    assert.equal((await c.receber('COMMAND_ACK',stop)).aceito,true);
    assert.equal((await c.receber('STATE_TELEMETRY',stop)).estado,'PARADA');
    c.ws.send(JSON.stringify({tipo:'SCENARIO_SET',protocolo:PROTOCOLO,cenario:'NORMAL'}));
    assert.equal((await c.receber('STATE_TELEMETRY')).seguranca,'OK');
  }finally{await c.fechar();}
});
test('não aceita comandos de PLC ou escrita de tags',async()=>{
  const c=await iniciar();
  try {
    const fechado=new Promise(resolve=>c.ws.once('close',code=>resolve(code)));
    c.ws.send(JSON.stringify({tipo:'COMMAND_REQUEST',protocolo:PROTOCOLO,id:randomUUID(),comando:'JOG_X_MAIS'}));
    assert.equal(await fechado,1008);
  }finally{await c.fechar();}
});
