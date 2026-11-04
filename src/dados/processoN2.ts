import type { AmostraLeituraG2 } from '../tipos/leituraG2';

/**
 * Nomes transcritos da Function "global.set" no Node-RED da bancada.
 * NÃO confundir StartOP/FinishOP com botão físico START/STOP ou comando remoto.
 * Semântica do sinal de emergência ainda requer validação na planta.
 */
export const sinaisProcessoN2 = [
  { origem:'aguardando', tag:'processo_n2_aguardando', rotulo:'Aguardando processo' },
  { origem:'emergencia', tag:'processo_n2_emergencia', rotulo:'Emergência — sinal informado' },
  { origem:'manual', tag:'processo_n2_manual', rotulo:'Modo manual — sinal informado' },
  { origem:'ocupado', tag:'processo_n2_ocupado', rotulo:'Processo ocupado' },
  { origem:'cancelOP', tag:'processo_n2_cancelOP', rotulo:'Cancelamento de ordem (CancelOP)' },
  { origem:'finishOP', tag:'processo_n2_finishOP', rotulo:'Finalização de ordem (FinishOP)' },
  { origem:'startOP', tag:'processo_n2_startOP', rotulo:'Início de ordem (StartOP)' },
  { origem:'comutadorAutomatico', tag:'processo_n2_comutadorAutomatico', rotulo:'Seletor automático' },
  { origem:'condicaoIniciar', tag:'processo_n2_condicaoIniciar', rotulo:'Condição de início — informativa' },
  { origem:'emergenciaAtivada', tag:'processo_n2_emergenciaAtivada', rotulo:'Emergência ativada — sinal informado' },
  { origem:'homeGiro', tag:'processo_n2_homeGiro', rotulo:'Home giro' },
  { origem:'homeVertical', tag:'processo_n2_homeVertical', rotulo:'Home vertical' },
  { origem:'servoGiro', tag:'processo_n2_servoGiro', rotulo:'Servo giro' },
  { origem:'servoVertical', tag:'processo_n2_servoVertical', rotulo:'Servo vertical' },
] as const;

export const tagsProcessoN2: readonly string[] = sinaisProcessoN2.map(s => s.tag);
export function obterLeiturasProcessoN2(amostra: AmostraLeituraG2 | null) {
  const sinais = amostra?.estacao === 'PROCESSO' ? amostra.sinais : {};
  return sinaisProcessoN2.map(({origem,tag,rotulo}) => ({
    origem, tag, rotulo, valor:typeof sinais[tag] === 'boolean' ? sinais[tag] : null,
  }));
}
