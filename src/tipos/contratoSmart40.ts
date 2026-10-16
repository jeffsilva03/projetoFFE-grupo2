/**
 * Contrato provisório de integração do Grupo 2 com o App Shell.
 *
 * Baseado no contrato v0.1 do Runbook da Sprint. Não representa tags PLC e
 * não autoriza conexão industrial direta. O Grupo 1 deve confirmar a versão
 * final antes de este contrato ser usado como transporte de produção.
 */

export const VERSAO_CONTRATO_SMART40 = '0.1.0' as const;

export type TipoEventoSmart40 =
  | 'machine.telemetry'
  | 'command.requested'
  | 'command.ack'
  | 'connection.state';

export interface EnvelopeSmart40<
  TTipo extends TipoEventoSmart40 = TipoEventoSmart40,
  TDados = unknown,
> {
  schemaVersion: typeof VERSAO_CONTRATO_SMART40;
  eventId: string;
  type: TTipo;
  timestamp: string;
  source: string;
  data: TDados;
}

export interface TelemetriaMaquinaSmart40 {
  status?: string;
  modo?: string;
  emergencia?: boolean;
  intertravamentoSeguranca?: boolean;
  tempoCicloMs?: number;
  alarmes?: string[];
}

export interface ComandoSolicitadoSmart40 {
  commandId: string;
  alvo: string;
  acao: string;
  moduloOrigem: 'G2';
  parametros?: Record<string, unknown>;
  simulation: true;
}

export type ResultadoComandoSmart40 = 'SIMULATED' | 'ACCEPTED' | 'REJECTED';

export interface AckComandoSmart40 {
  commandId: string;
  resultado: ResultadoComandoSmart40;
  mensagem?: string;
}

export type EstadoConexaoSmart40 =
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'STALE';

export interface ConexaoSmart40 {
  estado: EstadoConexaoSmart40;
  ultimaTelemetria?: string;
  latenciaMs?: number;
}
