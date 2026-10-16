import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estadoResumidoG2, lerAmostraG2, obterIndicadoresG2, pacoteAtualG2 } from '../src/servicos/leituraG2';

const timestamp = new Date().toISOString();
const amostra = (estacao: string, sinais: Record<string, unknown>, data = timestamp) =>
  JSON.stringify({ timestamp: data, estacao, sinais });

test('interpreta START, STOP, seletor e segurança de Processo por tags do Node-RED', () => {
  const dados = lerAmostraG2(amostra('PROCESSO', {
    processo_segurancaOK: true,
    processo_chaveAutomatico: false,
    processo_botaoVerde: true,
    processo_botaoVermelho: false,
    processo_atuadoresPosicaoOK: true,
    processo_atuadoresOcupado: false,
  }));
  const sinais = obterIndicadoresG2(dados);
  assert.equal(sinais.botaoStart, true);
  assert.equal(sinais.botaoStop, false);
  assert.equal(sinais.comutadorAutomatico, false);
  assert.equal(sinais.segurancaOk, true);
  assert.equal(sinais.emergencia, null); // Não inventar emergência na estação Processo.
  assert.equal(estadoResumidoG2(sinais), 'Estado global não identificado');
});

test('campos de sinais ausentes ficam nulos, e nunca false ou zero presumido', () => {
  const dados = lerAmostraG2(amostra('MONTAGEM', { montagem_segurancaOK: true }));
  const sinais = obterIndicadoresG2(dados);
  assert.equal(sinais.botaoStart, null);
  assert.equal(sinais.botaoStop, null);
  assert.equal(sinais.emergencia, null);
});

test('Estoque tem estados próprios, mas não inventa botões Start e Stop', () => {
  const dados = lerAmostraG2(amostra('ESTOQUE', {
    ocupado: true, aguardando: false, emergencia: false,
    emergenciaAtivada: false, comutadorAutomatico: true, condicaoIniciar: true,
  }));
  const sinais = obterIndicadoresG2(dados);
  assert.equal(sinais.ocupado, true);
  assert.equal(sinais.botaoStart, null);
  assert.equal(sinais.botaoStop, null);
  assert.equal(estadoResumidoG2(sinais), 'Estação ocupada');
});

test('falha e emergência têm prioridade sem afirmar funcionamento de E-STOP real', () => {
  const estoque = obterIndicadoresG2(lerAmostraG2(amostra('ESTOQUE', {
    emergencia: true, emergenciaAtivada: false, ocupado: true,
  })));
  assert.equal(estadoResumidoG2(estoque), 'Sinal de emergência ativo');
  const processo = obterIndicadoresG2(lerAmostraG2(amostra('PROCESSO', { processo_segurancaOK: false })));
  assert.equal(estadoResumidoG2(processo), 'Segurança não OK');
});

test('rejeita valores errados: 0 e 1 não são bools S7 validados', () => {
  for (const errado of [0, 1, 'true', [], {}, 22]) {
    assert.throws(() => lerAmostraG2(amostra('PROCESSO', { processo_botaoVerde: errado })));
  }
});

test('rejeita formato, estação e data errados', () => {
  for (const bruto of [
    '{', 'null', '[]', '{}',
    JSON.stringify({ timestamp, estacao: 'PROCESSO' }),
    amostra('OUTRA', { processo_botaoVerde: true }),
    amostra('PROCESSO', {}, 'ontem'),
  ]) assert.throws(() => lerAmostraG2(bruto));
});

test('recusa timestamp vencido e futuro, tolera relógio muito pouco adiantado', () => {
  const agora = Date.parse(timestamp);
  assert.equal(pacoteAtualG2(timestamp, agora), true);
  assert.equal(pacoteAtualG2(new Date(agora - 3001).toISOString(), agora), false);
  assert.equal(pacoteAtualG2(new Date(agora + 1001).toISOString(), agora), false);
  assert.equal(pacoteAtualG2(new Date(agora + 500).toISOString(), agora), true);
});

test('não lê tags de outra estação por engano', () => {
  const dados = lerAmostraG2(amostra('EXPEDICAO', {
    processo_botaoVerde: true, expedicao_botaoVerde: false,
  }));
  assert.equal(obterIndicadoresG2(dados).botaoStart, false);
  assert.equal(Object.hasOwn(dados.sinais, 'processo_botaoVerde'), false);
});
