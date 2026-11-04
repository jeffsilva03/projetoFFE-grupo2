/**
 * Contrato fechado de um servidor exclusivamente DEMONSTRATIVO e local.
 * Nunca aceitar URL configurável de PLC, Node-RED ou gateway para comandos.
 */
export const PROTOCOLO_TESTE = 'G2_MOCK_COMANDOS_V1' as const;
export const ENDERECO_TESTE = 'ws://127.0.0.1:8093/demo-comandos' as const;
export type ComandoTeste = 'START' | 'STOP';
export type EstadoTeste = 'PARADA' | 'EM_EXECUCAO';
export type SegurancaTeste = 'OK' | 'BLOQUEADA';
export type MensagemTeste =
  | { tipo: 'MOCK_HELLO'; estado: EstadoTeste; seguranca: SegurancaTeste; sequencia: number; timestamp: string }
  | { tipo: 'COMMAND_ACK'; id: string; comando: ComandoTeste; aceito: boolean; motivo: string; timestamp: string }
  | { tipo: 'STATE_TELEMETRY'; estado: EstadoTeste; seguranca: SegurancaTeste; sequencia: number; id: string | null; timestamp: string };

const registro = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor);
const estado = (v: unknown): v is EstadoTeste => v === 'PARADA' || v === 'EM_EXECUCAO';
const seguranca = (v: unknown): v is SegurancaTeste => v === 'OK' || v === 'BLOQUEADA';
const idValido = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f-]{8,64}$/i.test(v);
const horaValida = (v: unknown, agora: number): v is string =>
  typeof v === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(v)
  && Number.isFinite(Date.parse(v)) && Math.abs(Date.parse(v)-agora) <= 5000;

export function lerMensagemTeste(texto: string, agora = Date.now()): MensagemTeste {
  const m: unknown = JSON.parse(texto);
  if (!registro(m) || m.protocolo !== PROTOCOLO_TESTE || m.origem !== 'SIMULADOR_LOCAL' ||
      !horaValida(m.timestamp,agora)) throw new Error('Resposta não pertence ao mock autorizado ou está vencida.');
  if (m.tipo === 'MOCK_HELLO' && estado(m.estado) && seguranca(m.seguranca)
      && Number.isSafeInteger(m.sequencia) && (m.sequencia as number)>=0) {
    return { tipo:m.tipo, estado:m.estado, seguranca:m.seguranca, sequencia:m.sequencia as number, timestamp:m.timestamp };
  }
  if (m.tipo === 'STATE_TELEMETRY' && estado(m.estado) && seguranca(m.seguranca)
      && Number.isSafeInteger(m.sequencia) && (m.sequencia as number)>0
      && (m.id === null || idValido(m.id))) {
    return { tipo:m.tipo, estado:m.estado, seguranca:m.seguranca, sequencia:m.sequencia as number, id:m.id as string|null, timestamp:m.timestamp };
  }
  if (m.tipo === 'COMMAND_ACK' && idValido(m.id)
      && (m.comando==='START'||m.comando==='STOP') && typeof m.aceito === 'boolean'
      && typeof m.motivo === 'string' && m.motivo.length<=200) {
    return { tipo:m.tipo, id:m.id, comando:m.comando, aceito:m.aceito, motivo:m.motivo, timestamp:m.timestamp };
  }
  throw new Error('Mensagem de confirmação do simulador inválida.');
}
