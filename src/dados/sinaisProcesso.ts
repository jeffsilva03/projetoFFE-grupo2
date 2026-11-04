import type { AmostraLeituraG2 } from '../tipos/leituraG2';

/**
 * Referências de engenharia, NÃO endereços para conexão direta.
 * Endereço %I/%Q: tabelas do manual N2, p. 13 (Estação de Processo).
 * DB101: catálogo de tags do NODERED/flows.json entregue pelo professor.
 * A correspondência é de monitoramento; a lógica final requer validação na bancada.
 */
export type SinalProcesso = {
  readonly id: string;
  readonly nome: string;
  readonly enderecoPlc: string;
  readonly enderecoDb: string | null;
  readonly tagPonte: string | null;
  readonly observacao?: string;
};

export const entradasProcesso: readonly SinalProcesso[] = [
  { id:'emergencia', nome:'Botão de Emergência OK', enderecoPlc:'%I0.1', enderecoDb:null, tagPonte:null,
    observacao:'O manual nomeia esta entrada Emergência; processo_segurancaOK é condição agregada, NÃO equivalência comprovada.' },
  { id:'zAvancado', nome:'Eixo Z Avançado', enderecoPlc:'%I0.2', enderecoDb:'DB101,X0.2', tagPonte:'processo_eixoZAvancado' },
  { id:'zRecuado', nome:'Eixo Z Recuado', enderecoPlc:'%I0.3', enderecoDb:'DB101,X0.3', tagPonte:'processo_eixoZRecuado' },
  { id:'vacuoManipulador', nome:'Sensor Vácuo Manipulador', enderecoPlc:'%I0.4', enderecoDb:'DB101,X0.4', tagPonte:'processo_sensorVacuoManipulador' },
  { id:'vacuoMesa', nome:'Sensor Vácuo Mesa', enderecoPlc:'%I0.5', enderecoDb:'DB101,X0.5', tagPonte:'processo_sensorVacuo',
    observacao:'Manual: vacuostato da base de gravação. Equivalência à etiqueta Mesa necessita validação.' },
  { id:'automatico', nome:'Comutador Painel (AUT)', enderecoPlc:'%I0.6', enderecoDb:'DB101,X0.6', tagPonte:'processo_chaveAutomatico' },
  { id:'botaoVerde', nome:'Botão Verde Painel', enderecoPlc:'%I0.7', enderecoDb:'DB101,X0.7', tagPonte:'processo_botaoVerde' },
  { id:'botaoVermelho', nome:'Botão Vermelho Painel', enderecoPlc:'%I1.0', enderecoDb:'DB101,X1.0', tagPonte:'processo_botaoVermelho' },
];

export const saidasProcesso: readonly SinalProcesso[] = [
  { id:'avancaZ', nome:'Avança Eixo Z', enderecoPlc:'%Q0.0', enderecoDb:'DB101,X20.0', tagPonte:'processo_avancaEixoZ' },
  { id:'vacuoManipulador', nome:'Liga Vácuo Manipulador', enderecoPlc:'%Q0.1', enderecoDb:'DB101,X20.1', tagPonte:'processo_acionaVacuoManipulador' },
  { id:'vacuoMesa', nome:'Liga Vácuo Mesa', enderecoPlc:'%Q0.2', enderecoDb:'DB101,X20.2', tagPonte:'processo_acionaVacuoMesa' },
  { id:'esteira1', nome:'Motor da Esteira 1', enderecoPlc:'%Q0.3', enderecoDb:'DB101,X20.3', tagPonte:'processo_esteira1',
    observacao:'Manual inclui movimento de giro na mesma saída.' },
  { id:'esteira2', nome:'Motor da Esteira 2', enderecoPlc:'%Q0.4', enderecoDb:'DB101,X20.4', tagPonte:'processo_esteira2' },
  { id:'statusProcesso', nome:'Status Processo', enderecoPlc:'%Q1.1', enderecoDb:null, tagPonte:null,
    observacao:'Manual: Status Processo ao Smart Sense. Não há correspondente confirmado no DB101 fornecido.' },
];

/** Somente tags booleanas com nome documentado no catálogo do Node-RED. */
export const tagsDiagnosticoProcesso = [
  'processo_segurancaOK',
  ...entradasProcesso.flatMap(s => s.tagPonte ? [s.tagPonte] : []),
  ...saidasProcesso.flatMap(s => s.tagPonte ? [s.tagPonte] : []),
] as const;

export function interpretarSinaisProcesso(
  amostra: AmostraLeituraG2 | null,
): { entradas: Record<string, boolean | null>; saidas: Record<string, boolean | null>; segurancaOk: boolean | null } {
  const sinais = amostra?.estacao === 'PROCESSO' ? amostra.sinais : {};
  const ler = (tag: string | null): boolean | null =>
    tag && typeof sinais[tag] === 'boolean' ? sinais[tag] : null;
  return {
    entradas: Object.fromEntries(entradasProcesso.map(s => [s.id, ler(s.tagPonte)])),
    saidas: Object.fromEntries(saidasProcesso.map(s => [s.id, ler(s.tagPonte)])),
    segurancaOk: ler('processo_segurancaOK'),
  };
}
