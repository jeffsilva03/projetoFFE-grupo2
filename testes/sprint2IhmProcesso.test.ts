import test from 'node:test';
import assert from 'node:assert/strict';
import { entradasProcesso, saidasProcesso, interpretarSinaisProcesso } from '../src/dados/sinaisProcesso';
import { lerAmostraG2 } from '../src/servicos/leituraG2';
import { reduzirBotoeiraDemo as reduzir, estadoInicialBotoeira as inicial } from '../src/estado/botoeiraDemo';

const processar=(sinais:Record<string,unknown>) =>
  lerAmostraG2(JSON.stringify({estacao:'PROCESSO',timestamp:new Date().toISOString(),sinais}));

test('diagnóstico contém exatamente oito entradas e seis saídas documentadas',()=>{
  assert.equal(entradasProcesso.length,8);
  assert.equal(saidasProcesso.length,6);
  assert.equal(entradasProcesso[0].enderecoPlc,'%I0.1');
  assert.equal(saidasProcesso[5].enderecoPlc,'%Q1.1');
});
test('sinais no DB101 aparecem no diagnóstico, sem inferir emergência e status',()=>{
  const r=interpretarSinaisProcesso(processar({
    processo_eixoZAvancado:true, processo_eixoZRecuado:false,
    processo_acionaVacuoMesa:true, processo_segurancaOK:true,
    processo_botaoVerde:true, processo_esteira1:true
  }));
  assert.equal(r.entradas.zAvancado,true);
  assert.equal(r.entradas.zRecuado,false);
  assert.equal(r.entradas.emergencia,null);
  assert.equal(r.entradas.vacuoMesa,null);
  assert.equal(r.saidas.vacuoMesa,true);
  assert.equal(r.saidas.esteira1,true);
  assert.equal(r.saidas.statusProcesso,null);
  assert.equal(r.segurancaOk,true);
});
test('ignora outras estações, null e dados não publicados',()=>{
  assert.equal(interpretarSinaisProcesso(null).entradas.botaoVerde,null);
  const r=interpretarSinaisProcesso(lerAmostraG2(JSON.stringify({
    estacao:'ESTOQUE', timestamp:new Date().toISOString(),sinais:{emergencia:true},
  })));
  assert.equal(r.entradas.botaoVermelho,null);
  assert.equal(r.segurancaOk,null);
});
test('botões demonstrativos e intertravamento local de emergência',()=>{
  const iniciado=reduzir(inicial,'START');
  assert.equal(iniciado.status,'OPERANDO');
  const travado=reduzir(iniciado,'EMERGENCIA');
  assert.equal(travado.status,'PARADA');
  assert.equal(travado.emergencia,'PRESSIONADA');
  assert.equal(reduzir(travado,'START').status,'PARADA');
  assert.equal(reduzir(travado,'RESET').emergencia,'PRESSIONADA');
  const liberado=reduzir(travado,'LIBERAR_EMERGENCIA');
  assert.equal(liberado.emergencia,'AGUARDANDO_RESET');
  assert.equal(reduzir(liberado,'START').status,'PARADA');
  const reset=reduzir(liberado,'RESET');
  assert.equal(reset.emergencia,'LIBERADA');
  assert.equal(reduzir(reset,'START').status,'OPERANDO');
});
test('JOG só altera valor local no modo manual, com servo habilitado',()=>{
  assert.equal(reduzir(inicial,'JOG_X_MAIS').posicao.X,1.4);
  const manual=reduzir(inicial,'SETUP');
  assert.equal(manual.modo,'MANUAL');
  assert.equal(reduzir(manual,'START').status,'PARADA');
  assert.equal(reduzir(manual,'JOG_X_MAIS').posicao.X,1.4);
  const servo=reduzir(manual,'SERVO_X');
  assert.equal(reduzir(servo,'JOG_X_MAIS').posicao.X,1.9);
  assert.equal(reduzir(servo,'HOME_X').posicao.X,0);
  assert.equal(reduzir(reduzir(servo,'EMERGENCIA'),'JOG_X_MAIS').posicao.X,1.4);
});
test('Saídas virtuais desligam em STOP e não acionam enquanto a demo executa',()=>{
  const manual=reduzir(inicial,'SETUP');
  const saida=reduzir(manual,'VACUO_MESA');
  assert.equal(saida.saidas.vacuoMesa,true);
  assert.equal(reduzir(saida,'STOP').saidas.vacuoMesa,false);
  assert.equal(reduzir(inicial,'VACUO_MESA').saidas.vacuoMesa,false);
  assert.equal(inicial.saidas.vacuoMesa,false);
});
test('sinais booleanos inválidos são rejeitados pelo parser da ponte',()=>{
  assert.throws(()=>processar({processo_esteira1:'on'}));
});
