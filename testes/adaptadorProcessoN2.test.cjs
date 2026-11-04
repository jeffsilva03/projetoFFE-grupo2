'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {adaptarVariaveisProcessoN2,MAPA_PROCESSO_N2,CAMPOS}=require('../documentacao/processo-n2-mapeamento.cjs');
const {dividirLeitura,mesclarLeituraG2,TAGS}=require('../documentacao/ponte-nodered-g2.cjs');

const codigo=fs.readFileSync('documentacao/NODERED-FUNCTION-PROCESSO-N2.js','utf8');
const token='g2-token-fixture-somente-teste-123456789';
function functionNode(payload,config={}){
  const avisos=[],erros=[],status=[];
  const msg={payload};
  const ctx={
    msg,
    env:{get:key=>config[key]??({
      G2_BRIDGE_TOKEN:token,
      G2_BRIDGE_HTTP_URL:'http://127.0.0.1:8092/api/g2/telemetria',
    })[key]},
    node:{warn:x=>avisos.push(x),error:x=>erros.push(x),status:x=>status.push(x)},
    URL,
  };
  return {resultado:vm.runInNewContext(codigo,ctx,{timeout:300}),avisos,erros,status};
}
test('mapeamento documentado contém 14 chaves sem comandos da máquina',()=>{
  assert.equal(Object.keys(MAPA_PROCESSO_N2).length,14);
  assert.equal(CAMPOS.length,14);
  assert.ok(CAMPOS.every(tag=>TAGS.PROCESSO.includes(tag)));
  assert.equal(CAMPOS.some(x=>x.includes('startBtn')||x.includes('jog')),false);
});
test('transcreve apenas campos recebidos; não inventa START físico',()=>{
  const amostra={aguardando:false,emergencia:true,condicaoIniciar:true,startOP:false,
    nomeOperador:'segredo',numeroOP:1254};
  const resultado=adaptarVariaveisProcessoN2(amostra);
  assert.deepEqual(resultado,{
    processo_n2_aguardando:false,processo_n2_emergencia:true,
    processo_n2_startOP:false,processo_n2_condicaoIniciar:true
  });
  assert.equal(resultado.processo_botaoVerde,undefined);
  const n=functionNode(amostra);
  assert.equal(n.erros.length,0);
  assert.equal(n.resultado.payload.estacao,'PROCESSO');
  assert.equal(n.resultado.method,'POST');
  assert.equal(n.resultado.headers['x-g2-bridge-token'],token);
  assert.equal(n.resultado.payload.sinais.processo_n2_emergencia,true);
  assert.equal(n.resultado.payload.sinais.numeroOP,undefined);
  assert.equal(n.resultado.payload.sinais.nomeOperador,undefined);
});
test('a ponte recebe, retransmite e expira dados N2 por tag',()=>{
  const amostra=functionNode({manual:true,ocupado:false}).resultado.payload;
  const p=dividirLeitura(amostra);
  assert.equal(p.length,1);
  assert.equal(p[0].estacao,'PROCESSO');
  assert.equal(p[0].sinais.processo_n2_manual,true);
  assert.equal(p[0].sinais.processo_n2_ocupado,false);
  const t=1_000_000;
  const cache=new Map();
  mesclarLeituraG2(cache,{estacao:'PROCESSO',timestamp:new Date(t).toISOString(),
    sinais:{processo_n2_manual:true}},t);
  const prox=mesclarLeituraG2(cache,{estacao:'PROCESSO',timestamp:new Date(t+3100).toISOString(),
    sinais:{processo_n2_ocupado:false}},t+3100);
  assert.equal(prox.sinais.processo_n2_manual,null);
  assert.equal(prox.sinais.processo_n2_ocupado,false);
});
test('ignora valor inválido e recusa ausência de booleanos válidos',()=>{
  const leitura=functionNode({manual:'true',ocupado:1});
  assert.equal(leitura.resultado,null);
  assert.ok(leitura.avisos.length>=2);
  const parcial=functionNode({manual:true,emergencia:42});
  assert.equal(parcial.resultado.payload.sinais.processo_n2_manual,true);
  assert.equal(parcial.resultado.payload.sinais.processo_n2_emergencia,undefined);
});
test('não publica sem token ou URL de transporte aprovada',()=>{
  assert.equal(functionNode({manual:true},{G2_BRIDGE_TOKEN:'curto'}).resultado,null);
  assert.equal(functionNode({manual:true},{G2_BRIDGE_HTTP_URL:'http://192.168.150.200:1880/api/g2/telemetria'}).resultado,null);
  assert.equal(functionNode({manual:true},{G2_BRIDGE_HTTP_URL:'http://localhost:8092/api/g2/telemetria'}).resultado.method,'POST');
  assert.equal(functionNode({manual:true},{G2_BRIDGE_HTTP_URL:'https://gateway.autorizado.example/api/g2/telemetria'}).resultado.method,'POST');
});
test('publicação N2 é somente leitura e não aciona sistema industrial',()=>{
  assert.doesNotMatch(codigo,/\bglobal\.set\s*\(/);
  assert.doesNotMatch(codigo,/s7\s*out/i);
  assert.ok(!codigo.includes('msg.payload = { acao:'));
  assert.equal(functionNode({startOP:true}).resultado.payload.sinais.processo_n2_startOP,true);
});
