import { lerAmostraG2, pacoteAtualG2 } from './leituraG2';
import { validarUrlPonteG2 } from './urlPonteG2';
import type { AmostraLeituraG2, EstacaoG2 } from '../tipos/leituraG2';

/**
 * Conexão única de LEITURA com a ponte G2 (ws://localhost:8092/telemetria).
 *
 * Fica fora dos componentes de tela: trocar de visão não fecha o WebSocket nem
 * apaga as últimas leituras. Só o botão "Desconectar" encerra a conexão.
 * Quedas inesperadas reconectam sozinhas com espera crescente (1 s a 32 s).
 *
 * Este módulo nunca chama socket.send: não existe caminho de comando para PLC.
 */

export type ConexaoPonte = 'DESLIGADA' | 'CONECTANDO' | 'ABERTA' | 'RECONECTANDO' | 'ERRO';

export interface RegistroEstacao {
  amostra: AmostraLeituraG2;
  /** Horário (relógio do navegador) em que a ponte entregou o pacote. */
  recebidaEm: number;
}

export interface EstadoPonte {
  conexao: ConexaoPonte;
  endereco: string;
  mensagem: string;
  registros: Partial<Record<EstacaoG2, RegistroEstacao>>;
  /** Quantas reconexões seguidas já foram tentadas desde a última conexão aberta. */
  tentativa: number;
  /** Quando ocorrerá a próxima tentativa automática (0 se nenhuma agendada). */
  proximaTentativaEm: number;
}

/** Subconjunto do WebSocket do navegador usado aqui (facilita os testes). */
export interface SocketLeitura {
  readonly readyState: number;
  onopen: ((evento: unknown) => void) | null;
  onmessage: ((evento: { data: unknown }) => void) | null;
  onerror: ((evento: unknown) => void) | null;
  onclose: ((evento: unknown) => void) | null;
  close(): void;
}

export interface DependenciasPonte {
  criarSocket: (url: string) => SocketLeitura;
  agendar: (acao: () => void, ms: number) => unknown;
  cancelar: (id: unknown) => void;
  agora: () => number;
  paginaHttps: () => boolean;
  enderecoInicial: string;
}

export const ESPERAS_RECONEXAO_MS = [1000, 2000, 4000, 8000, 16000, 32000] as const;
export const LIMITE_ABERTURA_MS = 5000;
export const VALIDADE_LEITURA_MS = 3000;
const SOCKET_ABERTO = 1;

export function esperaReconexao(tentativa: number): number {
  const indice = Math.min(Math.max(tentativa, 1), ESPERAS_RECONEXAO_MS.length) - 1;
  return ESPERAS_RECONEXAO_MS[indice];
}

/**
 * Uma estação só é "atual" com a conexão aberta e um pacote recebido e
 * carimbado há no máximo 3 s. Fora disso, a tela mostra "Não informado".
 */
export function estacaoAtual(estado: EstadoPonte, estacao: EstacaoG2, agoraMs: number): boolean {
  const registro = estado.registros[estacao];
  return estado.conexao === 'ABERTA' && registro !== undefined
    && agoraMs - registro.recebidaEm <= VALIDADE_LEITURA_MS
    && pacoteAtualG2(registro.amostra.timestamp, agoraMs);
}

export function criarPonteTelemetria(dep: DependenciasPonte) {
  let estado: EstadoPonte = {
    conexao: 'DESLIGADA',
    endereco: dep.enderecoInicial,
    mensagem: 'Ponte não conectada.',
    registros: {},
    tentativa: 0,
    proximaTentativaEm: 0,
  };
  const ouvintes = new Set<() => void>();
  let socket: SocketLeitura | null = null;
  let timerAbertura: unknown = null;
  let timerReconexao: unknown = null;
  /** true enquanto o usuário quer a conexão (entre "Conectar" e "Desconectar"). */
  let desejada = false;

  function atualizar(parcial: Partial<EstadoPonte>) {
    estado = { ...estado, ...parcial };
    for (const ouvinte of ouvintes) ouvinte();
  }

  function limparTimers() {
    if (timerAbertura !== null) dep.cancelar(timerAbertura);
    if (timerReconexao !== null) dep.cancelar(timerReconexao);
    timerAbertura = null;
    timerReconexao = null;
  }

  function soltarSocket() {
    const anterior = socket;
    socket = null;
    if (!anterior) return;
    anterior.onopen = null;
    anterior.onmessage = null;
    anterior.onerror = null;
    anterior.onclose = null;
    try { anterior.close(); } catch { /* já fechado */ }
  }

  function agendarReconexao(motivo: string) {
    soltarSocket();
    limparTimers();
    if (!desejada) return;
    const tentativa = estado.tentativa + 1;
    const espera = esperaReconexao(tentativa);
    timerReconexao = dep.agendar(() => { timerReconexao = null; abrir(); }, espera);
    atualizar({
      conexao: 'RECONECTANDO',
      tentativa,
      proximaTentativaEm: dep.agora() + espera,
      mensagem: `${motivo} Nova tentativa em ${Math.round(espera / 1000)} s. Leituras deixam de ser atuais.`,
    });
  }

  function abrir() {
    let url: string;
    try { url = validarUrlPonteG2(estado.endereco, dep.paginaHttps()); }
    catch (erro) {
      desejada = false;
      atualizar({
        conexao: 'ERRO', tentativa: 0, proximaTentativaEm: 0,
        mensagem: erro instanceof Error ? erro.message : 'Endereço de ponte inválido.',
      });
      return;
    }
    soltarSocket();
    limparTimers();
    let novo: SocketLeitura;
    try { novo = dep.criarSocket(url); }
    catch { agendarReconexao('Não foi possível criar o WebSocket.'); return; }
    socket = novo;
    const atual = () => socket === novo;
    atualizar({
      conexao: estado.tentativa > 0 ? 'RECONECTANDO' : 'CONECTANDO',
      proximaTentativaEm: 0,
      mensagem: estado.tentativa > 0 ? `Reconectando à ponte (tentativa ${estado.tentativa})...` : 'Conectando à ponte G2...',
    });
    timerAbertura = dep.agendar(() => {
      timerAbertura = null;
      if (atual() && novo.readyState !== SOCKET_ABERTO) {
        agendarReconexao('A ponte não respondeu em 5 s.');
      }
    }, LIMITE_ABERTURA_MS);
    novo.onopen = () => {
      if (!atual()) return;
      limparTimers();
      atualizar({
        conexao: 'ABERTA', tentativa: 0, proximaTentativaEm: 0,
        mensagem: 'Ponte conectada. Aguardando telemetria.',
      });
    };
    novo.onmessage = evento => {
      if (!atual()) return;
      try {
        if (typeof evento.data !== 'string') throw new Error('Formato não textual.');
        const amostra = lerAmostraG2(evento.data);
        const momento = dep.agora();
        if (!pacoteAtualG2(amostra.timestamp, momento)) throw new Error('Pacote vencido.');
        atualizar({
          registros: { ...estado.registros, [amostra.estacao]: { amostra, recebidaEm: momento } },
          mensagem: 'Recebendo telemetria da ponte.',
        });
      } catch {
        // Pacote ruim é descartado; as outras estações não são afetadas.
        atualizar({ mensagem: 'Um pacote inválido ou vencido foi descartado.' });
      }
    };
    novo.onerror = () => {
      if (!atual()) return;
      agendarReconexao('Falha de comunicação com a ponte.');
    };
    novo.onclose = () => {
      if (!atual()) return;
      agendarReconexao('A ponte desconectou.');
    };
  }

  return {
    obter: (): EstadoPonte => estado,
    assinar(ouvinte: () => void): () => void {
      ouvintes.add(ouvinte);
      return () => { ouvintes.delete(ouvinte); };
    },
    definirEndereco(endereco: string) {
      // Endereço só muda com a conexão parada, para não misturar fontes.
      if (desejada) return;
      atualizar({ endereco });
    },
    conectar() {
      desejada = true;
      atualizar({ registros: {}, tentativa: 0 });
      abrir();
    },
    desconectar() {
      desejada = false;
      soltarSocket();
      limparTimers();
      atualizar({
        conexao: 'DESLIGADA', registros: {}, tentativa: 0, proximaTentativaEm: 0,
        mensagem: 'Ponte desconectada. Nenhum comando foi enviado.',
      });
    },
  };
}

export type PonteTelemetria = ReturnType<typeof criarPonteTelemetria>;
