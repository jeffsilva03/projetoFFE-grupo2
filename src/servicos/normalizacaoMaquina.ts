import { estadoInicial } from '../estado/simulacao';
import type { EstadoMaquina, EstadoOperacional } from '../tipos/maquina';
import type { TelemetriaSimulador } from '../tipos/conexao';

/**
 * Traduz uma fonte externa para o modelo interno consumido pela UI.
 *
 * Esta camada existe para impedir que componentes da IHM dependam do formato
 * de transporte. Hoje a origem externa é o mock do professor. Futuramente,
 * outro adaptador poderá normalizar eventos do App Shell para EstadoMaquina
 * sem alterar PainelIhm, Botoeira ou os demais componentes.
 */
export function estadoDaTelemetriaSimulador(telemetria: TelemetriaSimulador): EstadoOperacional {
  if (telemetria.estadoGlobal === 'PARADA_EMERGENCIA' || telemetria.estacaoIhm.travaSegurancaAtiva) return 'EMERGENCIA';
  if (telemetria.estacaoIhm.pressaoPneumaticaBar < 4.5) return 'FALHA_SEGURANCA';
  return telemetria.estadoGlobal === 'EM_EXECUCAO' ? 'OPERANDO' : 'PARADA';
}

export function normalizarTelemetriaSimulador(
  telemetria: TelemetriaSimulador,
  mensagem: string,
): EstadoMaquina {
  return {
    ...estadoInicial,
    estado: estadoDaTelemetriaSimulador(telemetria),
    modo: telemetria.modoOperacao,
    emergenciaTravada: telemetria.estacaoIhm.travaSegurancaAtiva,
    segurancaRestabelecida: !telemetria.estacaoIhm.travaSegurancaAtiva,
    pressao: telemetria.estacaoIhm.pressaoPneumaticaBar,
    produzidas: telemetria.totalPecas ?? 0,
    mensagem,
  };
}
