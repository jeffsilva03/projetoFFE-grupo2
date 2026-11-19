import type { AcaoComando } from './comandos';

/**
 * Parte do envelope global de telemetria (evento smart40:telemetria) usada pelo G2.
 * Formato do contrato da Sprint 3: estacoes.<nome>.status = AGUARDANDO | OPERANDO | EMERGENCIA.
 */
export type StatusEstacao = 'AGUARDANDO' | 'OPERANDO' | 'EMERGENCIA';
export type NomeEstacao = 'estoque' | 'processo' | 'montagem' | 'expedicao';
export const ESTACOES: readonly NomeEstacao[] = ['estoque', 'processo', 'montagem', 'expedicao'];

export interface TelemetriaComandos {
  timestamp: string;
  estacoes: Partial<Record<NomeEstacao, { status?: string }>>;
}

/** Estação que a botoeira do G2 comanda. */
export const ESTACAO_ALVO: NomeEstacao = 'processo';
export const TIMEOUT_CONFIRMACAO_MS = 5000;
export const TELEMETRIA_VALIDA_MS = 3000;

const OBJETO = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Aceita só envelopes com timestamp e objeto estacoes; o resto é descartado. */
export function lerTelemetria(dado: unknown): TelemetriaComandos | null {
  if (!OBJETO(dado) || typeof dado.timestamp !== 'string' || !OBJETO(dado.estacoes)) return null;
  if (!Number.isFinite(Date.parse(dado.timestamp))) return null;
  const estacoes: TelemetriaComandos['estacoes'] = {};
  for (const nome of ESTACOES) {
    const e = dado.estacoes[nome];
    if (OBJETO(e)) estacoes[nome] = { status: typeof e.status === 'string' ? e.status : undefined };
  }
  return { timestamp: dado.timestamp, estacoes };
}

export function statusDe(t: TelemetriaComandos | null, nome: NomeEstacao): string | undefined {
  return t?.estacoes[nome]?.status;
}

/** 6.5: alguma estação em EMERGENCIA. */
export function bancadaEmEmergencia(t: TelemetriaComandos | null): boolean {
  return ESTACOES.some(nome => statusDe(t, nome) === 'EMERGENCIA');
}

/** A confirmação vem SEMPRE da telemetria de retorno, nunca do envio. */
export function confirma(acao: AcaoComando, t: TelemetriaComandos | null): boolean {
  if (!t) return false;
  switch (acao) {
    case 'start': return statusDe(t, ESTACAO_ALVO) === 'OPERANDO';
    case 'stop': return statusDe(t, ESTACAO_ALVO) === 'AGUARDANDO';
    case 'reset': return !bancadaEmEmergencia(t) && statusDe(t, ESTACAO_ALVO) !== undefined;
    case 'emergencia': return bancadaEmEmergencia(t);
  }
}

/**
 * Quais botões podem ser usados agora (o de emergência é sempre usável).
 * Em emergência só RESET (6.5). Sem telemetria atual, nenhum comando além da emergência.
 */
export function comandosPermitidos(
  t: TelemetriaComandos | null, telemetriaAtual: boolean, pendente: boolean,
): Record<Exclude<AcaoComando, 'emergencia'>, boolean> {
  if (!telemetriaAtual || pendente) return { start: false, stop: false, reset: false };
  if (bancadaEmEmergencia(t)) return { start: false, stop: false, reset: true };
  const alvo = statusDe(t, ESTACAO_ALVO);
  // Reset também fica disponível fora da emergência: é o primeiro da ordem de testes (6.8).
  return { start: alvo === 'AGUARDANDO', stop: alvo === 'OPERANDO', reset: true };
}
