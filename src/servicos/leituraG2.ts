import type { AmostraLeituraG2, EstacaoG2, IndicadoresLeituraG2 } from '../tipos/leituraG2';

type SinalIhm = keyof IndicadoresLeituraG2;
const estaObjeto = (valor: unknown): valor is Record<string, unknown> =>
  valor !== null && typeof valor === 'object' && !Array.isArray(valor);

export const mapeamentoG2: Record<EstacaoG2, Partial<Record<SinalIhm, string>>> = {
  ESTOQUE: {
    emergencia: 'emergencia',
    emergenciaAtivada: 'emergenciaAtivada',
    comutadorAutomatico: 'comutadorAutomatico',
    ocupado: 'ocupado',
    aguardando: 'aguardando',
    condicaoIniciar: 'condicaoIniciar',
    // O flows.json do Estoque não publica botões físicos Start/Stop nessa tabela.
  },
  PROCESSO: {
    segurancaOk: 'processo_segurancaOK',
    comutadorAutomatico: 'processo_chaveAutomatico',
    botaoStart: 'processo_botaoVerde',
    botaoStop: 'processo_botaoVermelho',
    atuadoresPosicaoOk: 'processo_atuadoresPosicaoOK',
    atuadoresOcupados: 'processo_atuadoresOcupado',
  },
  MONTAGEM: {
    segurancaOk: 'montagem_segurancaOK',
    comutadorAutomatico: 'montagem_chaveAutomatico',
    botaoStart: 'montagem_botaoVerde',
    botaoStop: 'montagem_botaoVermelho',
  },
  EXPEDICAO: {
    segurancaOk: 'expedicao_segurancaOK',
    comutadorAutomatico: 'expedicao_chaveAutomatico',
    botaoStart: 'expedicao_botaoVerde',
    botaoStop: 'expedicao_botaoVermelho',
    atuadoresPosicaoOk: 'expedicao_atuadorPosicaoOK',
    atuadoresOcupados: 'expedicao_atuadorOcupado',
  },
};

/**
 * Valida um pacote recebido via WebSocket de leitura.
 * Campos ausentes significam NÃO DISPONÍVEL, nunca desligado/false.
 * Nenhum campo deste protocolo representa comando para PLC.
 */
export function lerAmostraG2(mensagem: string): AmostraLeituraG2 {
  const bruto: unknown = JSON.parse(mensagem);
  if (!estaObjeto(bruto)) throw new Error('Formato de leitura inválido.');
  const estacoes: EstacaoG2[] = ['ESTOQUE', 'PROCESSO', 'MONTAGEM', 'EXPEDICAO'];
  if (typeof bruto.estacao !== 'string' || !estacoes.includes(bruto.estacao as EstacaoG2)) {
    throw new Error('Estação não reconhecida.');
  }
  if (typeof bruto.timestamp !== 'string' ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(bruto.timestamp) ||
      !Number.isFinite(Date.parse(bruto.timestamp))) {
    throw new Error('Horário de leitura inválido.');
  }
  if (!estaObjeto(bruto.sinais)) throw new Error('Pacote sem sinais.');
  const estacao = bruto.estacao as EstacaoG2;
  const sinais: Record<string, boolean | null> = {};
  for (const tag of Object.values(mapeamentoG2[estacao])) {
    if (tag === undefined) continue;
    const valor = bruto.sinais[tag];
    if (valor !== undefined && valor !== null && typeof valor !== 'boolean') {
      throw new Error(`Sinal inválido: ${tag}.`);
    }
    sinais[tag] = valor === undefined ? null : valor as boolean | null;
  }
  return { timestamp: bruto.timestamp, estacao, sinais };
}

export function obterIndicadoresG2(amostra: AmostraLeituraG2): IndicadoresLeituraG2 {
  const mapa = mapeamentoG2[amostra.estacao];
  const resultado: IndicadoresLeituraG2 = {
    segurancaOk: null, emergencia: null, emergenciaAtivada: null,
    comutadorAutomatico: null, botaoStart: null, botaoStop: null,
    ocupado: null, aguardando: null, condicaoIniciar: null,
    atuadoresPosicaoOk: null, atuadoresOcupados: null,
  };
  for (const chave of Object.keys(resultado) as SinalIhm[]) {
    const tag = mapa[chave];
    if (tag !== undefined) resultado[chave] = amostra.sinais[tag] ?? null;
  }
  return resultado;
}

export function estadoResumidoG2(ind: IndicadoresLeituraG2): string {
  if (ind.emergencia === true || ind.emergenciaAtivada === true) return 'Sinal de emergência ativo';
  if (ind.segurancaOk === false) return 'Segurança não OK';
  if (ind.ocupado === true) return 'Estação ocupada';
  if (ind.aguardando === true) return 'Estação aguardando';
  return 'Estado global não identificado';
}

export function pacoteAtualG2(timestamp: string, agoraMs = Date.now()): boolean {
  const tempo = Date.parse(timestamp);
  return Number.isFinite(tempo) && tempo <= agoraMs + 1000 && agoraMs - tempo <= 3000;
}
