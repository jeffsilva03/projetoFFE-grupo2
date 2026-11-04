/**
 * Variáveis vistas no Node-RED da bancada, aba PROCESSO / Function "global.set".
 * Isso NÃO é uma lista de comandos e NÃO demonstra equivalência com bits DB101.
 *
 * Fonte: fotografias da configuração S7 in, do global.set e do Context Global
 * em 04/11/2026. Não há calibração nem confirmação de semântica elétrica.
 */
const MAPA_PROCESSO_N2 = Object.freeze({
  aguardando: 'processo_n2_aguardando',
  emergencia: 'processo_n2_emergencia',
  manual: 'processo_n2_manual',
  ocupado: 'processo_n2_ocupado',
  cancelOP: 'processo_n2_cancelOP',
  finishOP: 'processo_n2_finishOP',
  startOP: 'processo_n2_startOP',
  comutadorAutomatico: 'processo_n2_comutadorAutomatico',
  condicaoIniciar: 'processo_n2_condicaoIniciar',
  emergenciaAtivada: 'processo_n2_emergenciaAtivada',
  homeGiro: 'processo_n2_homeGiro',
  homeVertical: 'processo_n2_homeVertical',
  servoGiro: 'processo_n2_servoGiro',
  servoVertical: 'processo_n2_servoVertical',
});
const CAMPOS = Object.freeze(Object.values(MAPA_PROCESSO_N2));
function adaptarVariaveisProcessoN2(bruto) {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) {
    throw new Error('Leitura S7 PROCESSO inválida.');
  }
  const sinais = {};
  for (const [origem, destino] of Object.entries(MAPA_PROCESSO_N2)) {
    if (!Object.prototype.hasOwnProperty.call(bruto, origem)) continue;
    if (typeof bruto[origem] === 'boolean') sinais[destino] = bruto[origem];
    // Ausência ou formato incompatível NÃO equivale a desligado.
  }
  return sinais;
}
module.exports = { MAPA_PROCESSO_N2, CAMPOS, adaptarVariaveisProcessoN2 };
