/**
 * Barramento de comandos do Grupo 2 (Sprint 3, item 6.3).
 *
 * Nunca abre conexão própria: recebe o WebSocket do App Shell por registrarSocket().
 * Em modo isolado, quem faz o papel do App Shell é o shellLocal.ts.
 * O CLP é quem executa; este módulo só envia a INTENÇÃO e registra em log.
 */

export type AcaoComando = 'start' | 'stop' | 'reset' | 'emergencia';
export const ACOES: readonly AcaoComando[] = ['start', 'stop', 'reset', 'emergencia'];
export const ORIGEM_G2 = 'unidade1-grupo2';

export interface Comando {
  origem: typeof ORIGEM_G2;
  acao: AcaoComando;
  timestamp: string;
}

export type ResultadoEnvio =
  | { ok: true; comando: Comando }
  | { ok: false; motivo: string };

/** Subconjunto do WebSocket necessário aqui. */
export interface ConexaoComandos {
  readonly readyState: number;
  send(dados: string): void;
}

const ABERTO = 1;
let con: ConexaoComandos | null = null;

export function registrarSocket(c: ConexaoComandos | null): void { con = c; }
export function socketRegistrado(): boolean { return con !== null && con.readyState === ABERTO; }

/** Nunca lança exceção: devolve { ok: false, motivo } legível. */
export function enviar(acao: AcaoComando, agora: () => Date = () => new Date()): ResultadoEnvio {
  if (!ACOES.includes(acao)) return { ok: false, motivo: 'ação desconhecida' };
  if (!con) return { ok: false, motivo: 'sem conexão registrada' };
  if (con.readyState !== ABERTO) return { ok: false, motivo: 'conexão não está aberta' };
  const comando: Comando = { origem: ORIGEM_G2, acao, timestamp: agora().toISOString() };
  try {
    con.send(JSON.stringify({ tipo: 'comando', comando }));
  } catch (erro) {
    return { ok: false, motivo: 'falha ao enviar: ' + (erro instanceof Error ? erro.message : 'erro desconhecido') };
  }
  console.log('[comando]', comando); // trilha local de auditoria
  return { ok: true, comando };
}

export const comandos = {
  start: () => enviar('start'),
  stop: () => enviar('stop'),
  reset: () => enviar('reset'),
  emergencia: () => enviar('emergencia'),
};
