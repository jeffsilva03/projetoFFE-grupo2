import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enviar, registrarSocket, ORIGEM_G2 } from '../src/comandos/comandos';
import { bancadaEmEmergencia, comandosPermitidos, confirma, lerTelemetria } from '../src/comandos/regras';
import { estadoInicialComandos, exportarAuditoria, reduzirComandos } from '../src/comandos/estadoComando';

const tel = (processo: string, outras = 'AGUARDANDO') => lerTelemetria({
  timestamp: new Date().toISOString(),
  estacoes: { estoque: { status: outras }, processo: { status: processo }, montagem: { status: outras }, expedicao: { status: outras } },
});

test('enviar não lança exceção e explica o motivo quando não há conexão', () => {
  registrarSocket(null);
  assert.deepEqual(enviar('start'), { ok: false, motivo: 'sem conexão registrada' });
  registrarSocket({ readyState: 0, send() { throw new Error('não deveria enviar'); } });
  assert.deepEqual(enviar('stop'), { ok: false, motivo: 'conexão não está aberta' });
  registrarSocket({ readyState: 1, send() { throw new Error('quebrou'); } });
  const r = enviar('reset');
  assert.equal(r.ok, false);
  registrarSocket(null);
});

test('enviar monta { tipo: comando } com origem unidade1-grupo2, ação e timestamp ISO', () => {
  const enviados: string[] = [];
  registrarSocket({ readyState: 1, send: d => enviados.push(d) });
  const r = enviar('start', () => new Date('2026-11-18T23:00:00.000Z'));
  assert.equal(r.ok, true);
  assert.deepEqual(JSON.parse(enviados[0]), {
    tipo: 'comando', comando: { origem: ORIGEM_G2, acao: 'start', timestamp: '2026-11-18T23:00:00.000Z' },
  });
  registrarSocket(null);
});

test('confirmação vem só da telemetria de retorno', () => {
  assert.equal(confirma('start', tel('OPERANDO')), true);
  assert.equal(confirma('start', tel('AGUARDANDO')), false);
  assert.equal(confirma('stop', tel('AGUARDANDO')), true);
  assert.equal(confirma('emergencia', tel('EMERGENCIA')), true);
  assert.equal(confirma('reset', tel('AGUARDANDO')), true);
  assert.equal(confirma('reset', tel('AGUARDANDO', 'EMERGENCIA')), false);
  assert.equal(confirma('start', null), false);
});

test('em emergência só RESET; sem telemetria atual nenhum comando; pendente bloqueia tudo', () => {
  assert.deepEqual(comandosPermitidos(tel('AGUARDANDO'), true, false), { start: true, stop: false, reset: true });
  assert.deepEqual(comandosPermitidos(tel('OPERANDO'), true, false), { start: false, stop: true, reset: true });
  assert.deepEqual(comandosPermitidos(tel('AGUARDANDO', 'EMERGENCIA'), true, false), { start: false, stop: false, reset: true });
  assert.deepEqual(comandosPermitidos(tel('OPERANDO'), false, false), { start: false, stop: false, reset: false });
  assert.deepEqual(comandosPermitidos(tel('OPERANDO'), true, true), { start: false, stop: false, reset: false });
  assert.equal(bancadaEmEmergencia(tel('OPERANDO', 'EMERGENCIA')), true);
});

test('telemetria fora do formato é descartada', () => {
  assert.equal(lerTelemetria({ estacoes: {} }), null);
  assert.equal(lerTelemetria({ timestamp: 'ontem', estacoes: {} }), null);
  assert.equal(lerTelemetria('texto'), null);
});

test('PENDENTE → CONFIRMADO com latência; intertravamento ignora segundo comando', () => {
  const t0 = Date.parse('2026-11-18T23:00:00.000Z');
  let s = reduzirComandos(estadoInicialComandos, { tipo: 'SOLICITADO', id: 'a', origem: ORIGEM_G2, acao: 'start', agora: t0 });
  assert.equal(s.pendente?.estado, 'PENDENTE');
  const igual = reduzirComandos(s, { tipo: 'SOLICITADO', id: 'b', origem: ORIGEM_G2, acao: 'stop', agora: t0 + 10 });
  assert.equal(igual, s, 'segundo comando não entra enquanto houver PENDENTE');
  s = reduzirComandos(s, { tipo: 'CONFIRMADO', id: 'a', agora: t0 + 812 });
  assert.equal(s.pendente, null);
  assert.equal(s.auditoria[0].estado, 'CONFIRMADO');
  assert.equal(s.auditoria[0].latenciaMs, 812);
});

test('timeout vira REJEITADO e reabilita; confirmação atrasada de outro id é ignorada', () => {
  const t0 = Date.now();
  let s = reduzirComandos(estadoInicialComandos, { tipo: 'SOLICITADO', id: 'a', origem: ORIGEM_G2, acao: 'start', agora: t0 });
  s = reduzirComandos(s, { tipo: 'REJEITADO', id: 'a', motivo: 'sem confirmação em 5 s', agora: t0 + 5000 });
  assert.equal(s.pendente, null);
  assert.equal(s.auditoria[0].estado, 'REJEITADO');
  assert.match(s.aviso ?? '', /reabilitado/);
  assert.equal(reduzirComandos(s, { tipo: 'CONFIRMADO', id: 'a', agora: t0 + 6000 }), s);
});

test('emergência passa por cima do pendente, trava a interface e só destrava explicitamente', () => {
  const t0 = Date.now();
  let s = reduzirComandos(estadoInicialComandos, { tipo: 'SOLICITADO', id: 'a', origem: ORIGEM_G2, acao: 'start', agora: t0 });
  s = reduzirComandos(s, { tipo: 'SOLICITADO', id: 'e', origem: ORIGEM_G2, acao: 'emergencia', agora: t0 + 100 });
  assert.equal(s.pendente?.acao, 'emergencia');
  assert.equal(s.emergenciaTravada, true);
  assert.equal(s.auditoria.find(r => r.id === 'a')?.motivo, 'interrompido pela emergência');
  s = reduzirComandos(s, { tipo: 'CONFIRMADO', id: 'e', agora: t0 + 200 });
  assert.equal(s.emergenciaTravada, true, 'confirmar a emergência não destrava');
  s = reduzirComandos(s, { tipo: 'DESTRAVAR_EMERGENCIA' });
  assert.equal(s.emergenciaTravada, false);
});

test('emergência que não sai continua travada e manda usar o botão físico', () => {
  const s = reduzirComandos(estadoInicialComandos, {
    tipo: 'BLOQUEADO', id: 'e', origem: ORIGEM_G2, acao: 'emergencia', motivo: 'sem conexão registrada', agora: Date.now(),
  });
  assert.equal(s.emergenciaTravada, true);
  assert.match(s.aviso ?? '', /botão físico/);
  assert.equal(s.auditoria[0].estado, 'REJEITADO');
});

test('auditoria exporta em ordem cronológica', () => {
  const t0 = Date.now();
  let s = reduzirComandos(estadoInicialComandos, { tipo: 'SOLICITADO', id: '1', origem: ORIGEM_G2, acao: 'reset', agora: t0 });
  s = reduzirComandos(s, { tipo: 'CONFIRMADO', id: '1', agora: t0 + 300 });
  s = reduzirComandos(s, { tipo: 'SOLICITADO', id: '2', origem: ORIGEM_G2, acao: 'stop', agora: t0 + 1000 });
  const json = JSON.parse(exportarAuditoria(s.auditoria));
  assert.deepEqual(json.registros.map((r: { id: string }) => r.id), ['1', '2']);
  assert.equal(json.total, 2);
});
