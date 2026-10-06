import type { EstadoOperacional } from '../tipos/maquina';
export const nomesEstados: Record<EstadoOperacional, string> = { PARADA: 'Parada', OPERANDO: 'Operando', FALHA_SEGURANCA: 'Falha de segurança', EMERGENCIA: 'Emergência' };
export const coresEstados: Record<EstadoOperacional, string> = { PARADA: 'neutro', OPERANDO: 'verde', FALHA_SEGURANCA: 'amarelo', EMERGENCIA: 'vermelho' };
export function IndicadorEstado({ estado }: { estado: EstadoOperacional }) {
  return <span className={`ihm-etiqueta ${coresEstados[estado]}`}><i className="ihm-led" />{nomesEstados[estado]}</span>;
}
