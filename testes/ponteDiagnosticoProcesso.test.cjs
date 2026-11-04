'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {TAGS,dividirLeitura,mesclarLeituraG2,snapshotAtualG2}=require('../documentacao/ponte-nodered-g2.cjs');
const {gerarPacote}=require('../documentacao/demo-ponte-g2.cjs');

test('ponte aceita novas tags DB101 de Processo e descarta tags não autorizadas',()=>{
  const novas=['processo_eixoZAvancado','processo_eixoZRecuado','processo_sensorVacuoManipulador','processo_sensorVacuo','processo_avancaEixoZ','processo_acionaVacuoManipulador','processo_acionaVacuoMesa','processo_esteira1','processo_esteira2'];
  for(const tag of novas)assert.ok(TAGS.PROCESSO.includes(tag),'tag não reconhecida: '+tag);
  assert.equal(TAGS.PROCESSO.includes('processo_emergenciaFisica'),false);
  const r=dividirLeitura({estacao:'PROCESSO',timestamp:new Date().toISOString(),sinais:{processo_eixoZAvancado:true,processo_esteira1:false,segredo:true}});
  assert.deepEqual(r[0].sinais,{processo_eixoZAvancado:true,processo_esteira1:false});
});
test('demo publica novo diagnóstico sem conexão com CLP',()=>{
  const p=dividirLeitura(gerarPacote(12)).find(x=>x.estacao==='PROCESSO');
  assert.ok(p);
  assert.equal(p.sinais.processo_eixoZAvancado,true);
  assert.equal(p.sinais.processo_esteira1,true);
  assert.equal(p.sinais.processo_sensorVacuoManipulador,true);
});
test('expiração por-tag não mascara sinais antigos',()=>{
  const t=100_000_000,cache=new Map();
  mesclarLeituraG2(cache,{estacao:'PROCESSO',timestamp:new Date(t).toISOString(),sinais:{processo_eixoZAvancado:true}},t);
  const prox=mesclarLeituraG2(cache,{estacao:'PROCESSO',timestamp:new Date(t+3100).toISOString(),sinais:{processo_esteira1:true}},t+3100);
  assert.equal(prox.sinais.processo_eixoZAvancado,null);
  assert.equal(prox.sinais.processo_esteira1,true);
  assert.equal(snapshotAtualG2(cache.get('PROCESSO'),'PROCESSO',t+3100).sinais.processo_eixoZAvancado,null);
});
test('recusa valores não booleanos nas novas tags',()=>{
  assert.throws(()=>dividirLeitura({estacao:'PROCESSO',timestamp:new Date().toISOString(),sinais:{processo_eixoZAvancado:1}}));
});
