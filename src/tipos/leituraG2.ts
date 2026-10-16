/**
 * Somente leitura dos sinais do Grupo 2 encontrados no flows.json.
 * "sinais" preserva os nomes de variáveis S7 publicados pelo adaptador.
 * O backend de aquisição (ainda não ligado à planta) acrescenta timestamp e estação.
 */
export type EstacaoG2 = 'ESTOQUE' | 'PROCESSO' | 'MONTAGEM' | 'EXPEDICAO';

export interface AmostraLeituraG2 {
  timestamp: string;
  estacao: EstacaoG2;
  sinais: Record<string, boolean | null>;
}

export interface IndicadoresLeituraG2 {
  segurancaOk: boolean | null;
  emergencia: boolean | null;
  emergenciaAtivada: boolean | null;
  comutadorAutomatico: boolean | null;
  botaoStart: boolean | null;
  botaoStop: boolean | null;
  ocupado: boolean | null;
  aguardando: boolean | null;
  condicaoIniciar: boolean | null;
  atuadoresPosicaoOk: boolean | null;
  atuadoresOcupados: boolean | null;
}

export type EstadoLeituraG2 = 'AGUARDANDO' | 'CONECTANDO' | 'ATUALIZADO' | 'SEM_DADOS' | 'DESCONECTADO' | 'ERRO';

export const nomesEstacoesG2: Record<EstacaoG2, string> = {
  ESTOQUE: 'Estoque',
  PROCESSO: 'Processo',
  MONTAGEM: 'Montagem',
  EXPEDICAO: 'Expedição',
};
