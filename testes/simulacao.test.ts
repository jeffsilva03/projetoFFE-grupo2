import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estadoInicial, reduzirMaquina } from '../src/estado/simulacao';

test('emergência interrompe operação e exige destravar antes do rearme', () => {
  let maquina = reduzirMaquina(estadoInicial, { tipo: 'INICIAR' });
  assert.equal(maquina.estado, 'OPERANDO');
  maquina = reduzirMaquina(maquina, { tipo: 'EMERGENCIA' });
  assert.equal(maquina.estado, 'EMERGENCIA');
  assert.equal(maquina.direcao, 'PARADO');
  assert.equal(reduzirMaquina(maquina, { tipo: 'PARAR' }).estado, 'EMERGENCIA');
  assert.equal(reduzirMaquina(maquina, { tipo: 'INICIAR' }).estado, 'EMERGENCIA');
  assert.equal(reduzirMaquina(maquina, { tipo: 'REARMAR' }).estado, 'EMERGENCIA');
  maquina = reduzirMaquina(maquina, { tipo: 'DESTRAVAR_EMERGENCIA' });
  assert.equal(reduzirMaquina(maquina, { tipo: 'INICIAR' }).estado, 'EMERGENCIA');
  maquina = reduzirMaquina(maquina, { tipo: 'REARMAR' });
  assert.equal(maquina.estado, 'PARADA');
  assert.equal(reduzirMaquina(maquina, { tipo: 'INICIAR' }).estado, 'OPERANDO');
});
test('falha de segurança continua bloqueada até restabelecer e rearmar', () => {
  let maquina = reduzirMaquina(estadoInicial, { tipo: 'ALTERAR_SEGURANCA', restabelecida: false });
  assert.equal(maquina.estado, 'FALHA_SEGURANCA');
  assert.equal(reduzirMaquina(maquina, { tipo: 'REARMAR' }).estado, 'FALHA_SEGURANCA');
  maquina = reduzirMaquina(maquina, { tipo: 'ALTERAR_SEGURANCA', restabelecida: true });
  assert.equal(reduzirMaquina(maquina, { tipo: 'INICIAR' }).estado, 'FALHA_SEGURANCA');
  assert.equal(reduzirMaquina(maquina, { tipo: 'REARMAR' }).estado, 'PARADA');
});
test('pressão baixa para a máquina e restauração não dá partida automática', () => {
  let maquina = reduzirMaquina(estadoInicial, { tipo: 'INICIAR' });
  maquina = reduzirMaquina(maquina, { tipo: 'ALTERAR_PRESSAO', pressao: 4 });
  assert.equal(maquina.estado, 'FALHA_SEGURANCA');
  assert.equal(maquina.direcao, 'PARADO');
  assert.equal(reduzirMaquina(maquina, { tipo: 'REARMAR' }).estado, 'FALHA_SEGURANCA');
  maquina = reduzirMaquina(maquina, { tipo: 'ALTERAR_PRESSAO', pressao: 6.2 });
  assert.equal(maquina.estado, 'FALHA_SEGURANCA');
  assert.equal(reduzirMaquina(maquina, { tipo: 'REARMAR' }).estado, 'PARADA');
});
test('movimentação requer modo manual e para ao soltar', () => {
  assert.equal(reduzirMaquina(estadoInicial, { tipo: 'MOVER', direcao: 'DIREITA' }).estado, 'PARADA');
  let maquina = reduzirMaquina(estadoInicial, { tipo: 'ALTERAR_MODO', modo: 'MANUAL' });
  maquina = reduzirMaquina(maquina, { tipo: 'MOVER', direcao: 'ESQUERDA' });
  assert.equal(maquina.estado, 'OPERANDO');
  maquina = reduzirMaquina(maquina, { tipo: 'PASSO' });
  assert.ok(maquina.posicao < estadoInicial.posicao);
  maquina = reduzirMaquina(maquina, { tipo: 'PARAR_MOVIMENTO' });
  assert.equal(maquina.estado, 'PARADA');
  assert.equal(maquina.direcao, 'PARADO');
});
test('modos e parâmetros não mudam durante a operação', () => {
  const maquina = reduzirMaquina(estadoInicial, { tipo: 'INICIAR' });
  assert.equal(reduzirMaquina(maquina, { tipo: 'ALTERAR_MODO', modo: 'MANUAL' }).modo, 'AUTOMATICO');
  assert.deepEqual(reduzirMaquina(maquina, { tipo: 'APLICAR_PARAMETROS', parametros: { velocidade: 20, quantidade: 3 } }).parametros, estadoInicial.parametros);
  assert.deepEqual(reduzirMaquina(estadoInicial, { tipo: 'APLICAR_PARAMETROS', parametros: { velocidade: Number.NaN, quantidade: 3 } }).parametros, estadoInicial.parametros);
});
test('lote para na quantidade configurada e pode ser iniciado novamente', () => {
  let maquina = reduzirMaquina(estadoInicial, { tipo: 'APLICAR_PARAMETROS', parametros: { velocidade: 100, quantidade: 1 } });
  maquina = reduzirMaquina(maquina, { tipo: 'INICIAR' });
  for (let indice = 0; indice < 30; indice++) maquina = reduzirMaquina(maquina, { tipo: 'PASSO' });
  assert.equal(maquina.produzidas, 1);
  assert.equal(maquina.estado, 'PARADA');
  assert.equal(reduzirMaquina(maquina, { tipo: 'PASSO' }).produzidas, 1);
  maquina = reduzirMaquina(maquina, { tipo: 'INICIAR' });
  assert.equal(maquina.produzidas, 0);
  assert.equal(maquina.estado, 'OPERANDO');
});
