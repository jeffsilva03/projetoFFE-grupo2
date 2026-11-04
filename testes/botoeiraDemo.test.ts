import assert from 'node:assert/strict';
import test from 'node:test';
import { estadoInicialBotoeira, reduzirBotoeiraDemo } from '../src/estado/botoeiraDemo';

test('START inicia demonstração e START repetido mantém execução', () => {
  const iniciado = reduzirBotoeiraDemo(estadoInicialBotoeira, 'START');
  assert.equal(iniciado.status, 'OPERANDO');
  const repetido = reduzirBotoeiraDemo(iniciado, 'START');
  assert.equal(repetido.status, 'OPERANDO');
  assert.match(repetido.mensagem, /já está em execução/);
});

test('STOP sempre resulta em estado parado', () => {
  const iniciado = reduzirBotoeiraDemo(estadoInicialBotoeira, 'START');
  assert.equal(reduzirBotoeiraDemo(iniciado, 'STOP').status, 'PARADA');
  assert.equal(reduzirBotoeiraDemo(estadoInicialBotoeira, 'STOP').status, 'PARADA');
});

test('RESET devolve a demonstração ao estado parado', () => {
  const iniciado = reduzirBotoeiraDemo(estadoInicialBotoeira, 'START');
  const reset = reduzirBotoeiraDemo(iniciado, 'RESET');
  assert.equal(reset.status, 'PARADA');
  assert.match(reset.mensagem, /estado demonstrativo reiniciado/);
  assert.equal(reduzirBotoeiraDemo(reset, 'START').status, 'OPERANDO');
});

test('ações não modificam objetos anteriores e não usam comunicação externa', () => {
  const inicio = { ...estadoInicialBotoeira };
  const depois = reduzirBotoeiraDemo(inicio, 'START');
  assert.equal(inicio.status, 'PARADA');
  assert.notStrictEqual(depois, inicio);
});
