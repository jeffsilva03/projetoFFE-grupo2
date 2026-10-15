import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acaoSuportada, condicaoAposComando, lerTelemetria, montarUrlSimulador } from '../src/servicos/protocoloSimulador';
import { estadoDaTelemetriaSimulador, normalizarTelemetriaSimulador } from '../src/servicos/normalizacaoMaquina';
const dados = { timestamp: '2026-09-30T23:00:00.000Z', estadoGlobal: 'EM_EXECUCAO', modoOperacao: 'AUTOMATICO', velocidadeEsteiraAtual: 65, estacaoIhm: { travaSegurancaAtiva: false, pressaoPneumaticaBar: 6.2 }, metricasExpedicao: { pecasProcessadasTotal: 142 } };
test('interpreta o contrato real do mock sem confundir contador global com lote local', () => {
  const telemetria = lerTelemetria(JSON.stringify(dados));
  assert.equal(telemetria.totalPecas, 142);
  assert.equal(estadoDaTelemetriaSimulador(telemetria), 'OPERANDO');
  assert.equal(normalizarTelemetriaSimulador(telemetria, 'recebido').pressao, 6.2);
});
test('trava continua em emergência mesmo se STOP alterar estadoGlobal para PRONTA', () => {
  const telemetria = lerTelemetria(JSON.stringify({ ...dados, estadoGlobal: 'PRONTA', velocidadeEsteiraAtual: 0, estacaoIhm: { ...dados.estacaoIhm, travaSegurancaAtiva: true } }));
  assert.equal(estadoDaTelemetriaSimulador(telemetria), 'EMERGENCIA');
  assert.equal(condicaoAposComando('PARAR', telemetria), true);
  assert.equal(condicaoAposComando('REARMAR', telemetria), false);
});
test('JSON ou telemetria incompleta não podem virar um estado válido', () => {
  for (const mensagem of ['texto', 'null', '[]', JSON.stringify({ ...dados, estadoGlobal: 'DESCONHECIDA' }), JSON.stringify({ ...dados, velocidadeEsteiraAtual: '65' }), JSON.stringify({ ...dados, estacaoIhm: null }), JSON.stringify({ ...dados, timestamp: 'inválido' })]) assert.throws(() => lerTelemetria(mensagem));
});
test('suporta manutenção e exibe ausência de contador como nulo', () => {
  const telemetria = lerTelemetria(JSON.stringify({ ...dados, modoOperacao: 'MANUTENCAO', metricasExpedicao: {} }));
  assert.equal(telemetria.totalPecas, null);
  assert.equal(normalizarTelemetriaSimulador(telemetria, '').modo, 'MANUTENCAO');
});
test('campos de estado e modo não aceitam arrays que podem ser convertidos em texto', () => {
  assert.throws(() => lerTelemetria(JSON.stringify({ ...dados, estadoGlobal: ['PRONTA'] })));
  assert.throws(() => lerTelemetria(JSON.stringify({ ...dados, modoOperacao: ['MANUAL'] })));
});
test('não inventa comandos de modo, setas ou parâmetros', () => {
  assert.equal(acaoSuportada({ tipo: 'MOVER', direcao: 'DIREITA' }), false);
  assert.equal(acaoSuportada({ tipo: 'ALTERAR_MODO', modo: 'MANUAL' }), false);
  assert.equal(acaoSuportada({ tipo: 'DESTRAVAR_EMERGENCIA' }), false);
  assert.equal(acaoSuportada({ tipo: 'EMERGENCIA' }), true);
});
test('URL preserva parâmetros e codifica token, rejeitando protocolo incorreto', () => {
  const url = new URL(montarUrlSimulador('ws://localhost:8080/?grupo=2', 'a&b'));
  assert.equal(url.searchParams.get('grupo'), '2'); assert.equal(url.searchParams.get('token'), 'a&b');
  assert.throws(() => montarUrlSimulador('http://localhost:8080', 'token'));
  assert.throws(() => montarUrlSimulador('ws://localhost:8080', ''));
});
