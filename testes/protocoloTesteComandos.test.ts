import assert from 'node:assert/strict';
import test from 'node:test';
import { ENDERECO_TESTE, PROTOCOLO_TESTE, lerMensagemTeste } from '../src/servicos/protocoloTesteComandos';

const base={protocolo:PROTOCOLO_TESTE,origem:'SIMULADOR_LOCAL',timestamp:new Date().toISOString()};
test('URL de comandos está fixa no loopback, distinta da ponte de telemetria',()=>{
  assert.equal(ENDERECO_TESTE,'ws://127.0.0.1:8093/demo-comandos');
  assert.equal(new URL(ENDERECO_TESTE).hostname,'127.0.0.1');
  assert.notEqual(new URL(ENDERECO_TESTE).port,'8092');
});
test('protocolo separa ACK e confirmação pela telemetria correlacionada',()=>{
  const id='123e4567-e89b-12d3-a456-426614174000';
  const ack=lerMensagemTeste(JSON.stringify({...base,tipo:'COMMAND_ACK',id,comando:'START',aceito:true,motivo:'Recebido'}));
  assert.equal(ack.tipo,'COMMAND_ACK');
  const telemetry=lerMensagemTeste(JSON.stringify({...base,tipo:'STATE_TELEMETRY',id,estado:'EM_EXECUCAO',seguranca:'OK',sequencia:2}));
  assert.equal(telemetry.tipo,'STATE_TELEMETRY');
  if(telemetry.tipo==='STATE_TELEMETRY') assert.equal(telemetry.id,id);
});
test('handshake validado e desconhecidos recusados',()=>{
  const hello=lerMensagemTeste(JSON.stringify({...base,tipo:'MOCK_HELLO',estado:'PARADA',seguranca:'OK',sequencia:0}));
  assert.equal(hello.tipo,'MOCK_HELLO');
  for(const bad of [
    {...base,tipo:'COMMAND_ACK',id:'x',comando:'START',aceito:true,motivo:'OK'},
    {...base,tipo:'COMMAND_ACK',id:'1234567890',comando:'EMERGENCY_STOP',aceito:true,motivo:'OK'},
    {...base,tipo:'STATE_TELEMETRY',id:null,estado:'RODANDO',seguranca:'OK',sequencia:1},
    {...base,tipo:'STATE_TELEMETRY',id:null,estado:'PARADA',seguranca:'OK',sequencia:-1},
    {...base,tipo:'MOCK_HELLO',estado:'PARADA',seguranca:'OK',sequencia:0,origem:'PLC'},
    {...base,tipo:'STATE_TELEMETRY',id:null,estado:'PARADA',seguranca:'OK',sequencia:1,timestamp:new Date(Date.now()-10000).toISOString()},
  ]) assert.throws(()=>lerMensagemTeste(JSON.stringify(bad)));
});
