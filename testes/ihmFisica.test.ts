import test from 'node:test';
import assert from 'node:assert/strict';
import {
  entradasFotografadas, saidasFotografadas,
  laminasFotografadas, destinosFotografados,
  eixosFotografados, formatarMilimetros,
} from '../src/dados/ihmFisica';

test('tela de diagnóstico contém 8 entradas e 6 saídas da fotografia', () => {
  assert.equal(entradasFotografadas.length, 8);
  assert.equal(saidasFotografadas.length, 6);
  assert.equal(entradasFotografadas.filter(entrada => entrada.ativo).length, 3);
  assert.ok(saidasFotografadas.includes('Motor da Esteira 2'));
});

test('configuração possui 6 lâminas, mesa, caneta e 3 depósitos', () => {
  assert.equal(laminasFotografadas.length, 7);
  assert.equal(destinosFotografados.length, 4);
  assert.equal(laminasFotografadas[0].x, 315.70);
  assert.equal(destinosFotografados[3].y, 111.64);
  assert.equal(eixosFotografados.x, 1.40);
  assert.equal(formatarMilimetros(0), '0.00 mm');
});

test('pontos fotografados são amostra de tela, não tags de comando', () => {
  assert.equal(typeof eixosFotografados.y, 'number');
  assert.ok(entradasFotografadas.every(entrada => typeof entrada.ativo === 'boolean'));
});
