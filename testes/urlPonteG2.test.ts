import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarUrlPonteG2 } from '../src/servicos/urlPonteG2';

test('aceita endereço local do simulador de ponte', () => {
  assert.equal(validarUrlPonteG2('ws://localhost:8092/telemetria'), 'ws://localhost:8092/telemetria');
  assert.equal(validarUrlPonteG2('ws://127.0.0.1:8092/telemetria'), 'ws://127.0.0.1:8092/telemetria');
});

test('permite apenas WSS para gateway remoto aprovado', () => {
  assert.equal(validarUrlPonteG2('wss://gateway.exemplo.edu.br/telemetria', true), 'wss://gateway.exemplo.edu.br/telemetria');
  assert.throws(() => validarUrlPonteG2('ws://192.168.1.10:8092/telemetria'));
  assert.throws(() => validarUrlPonteG2('ws://gateway.exemplo.edu.br/telemetria'));
  assert.throws(() => validarUrlPonteG2('ws://localhost:8092/telemetria', true));
});

test('recusa URL fora da rota e credenciais no endereço', () => {
  for (const url of [
    'http://localhost:8092/telemetria',
    'ws://localhost:8092/api/g2/telemetria',
    'wss://gateway.exemplo.edu.br/telemetria?token=segredo',
    'wss://usuario:senha@gateway.exemplo.edu.br/telemetria',
    'javascript:alert(1)',
  ]) assert.throws(() => validarUrlPonteG2(url));
});
