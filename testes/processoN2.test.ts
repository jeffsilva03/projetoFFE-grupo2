import assert from 'node:assert/strict';
import test from 'node:test';
import { lerAmostraG2 } from '../src/servicos/leituraG2';
import { obterLeiturasProcessoN2, sinaisProcessoN2 } from '../src/dados/processoN2';

test('14 sinais N2 com nomes distintos do mapeamento DB101',()=>{
  assert.equal(sinaisProcessoN2.length,14);
  assert.equal(new Set(sinaisProcessoN2.map(s=>s.tag)).size,14);
  assert.ok(sinaisProcessoN2.every(s=>s.tag.startsWith('processo_n2_')));
});
test('leitura N2 true/false/null fica distinta de indicadores sem dados',()=>{
  const m=lerAmostraG2(JSON.stringify({timestamp:new Date().toISOString(),estacao:'PROCESSO',
    sinais:{processo_n2_condicaoIniciar:true,processo_n2_emergencia:false,
      processo_n2_servoGiro:null}}));
  const campos=obterLeiturasProcessoN2(m);
  assert.equal(campos.find(s=>s.origem==='condicaoIniciar')?.valor,true);
  assert.equal(campos.find(s=>s.origem==='emergencia')?.valor,false);
  assert.equal(campos.find(s=>s.origem==='servoGiro')?.valor,null);
  assert.equal(campos.find(s=>s.origem==='startOP')?.valor,null);
});
test('não usa estados de Estação Estoque para Processo',()=>{
  const m=lerAmostraG2(JSON.stringify({timestamp:new Date().toISOString(),estacao:'ESTOQUE',
    sinais:{emergencia:true}}));
  assert.ok(obterLeiturasProcessoN2(m).every(s=>s.valor===null));
});
test('rejeita texto e número em tags N2 que são booleanas',()=>{
  for(const ruim of ['true',1,{},[]]){
    assert.throws(()=>lerAmostraG2(JSON.stringify({timestamp:new Date().toISOString(),
      estacao:'PROCESSO',sinais:{processo_n2_ocupado:ruim}})));
  }
});
