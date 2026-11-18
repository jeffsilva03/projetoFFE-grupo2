import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarPonteTelemetria, esperaReconexao, estacaoAtual } from '../src/servicos/ponteTelemetria';
import type { SocketLeitura } from '../src/servicos/ponteTelemetria';

/** Socket falso: os testes disparam abertura, mensagens e quedas manualmente. */
class SocketFalso implements SocketLeitura {
  readyState = 0;
  fechado = false;
  enviou = false;
  onopen: ((evento: unknown) => void) | null = null;
  onmessage: ((evento: { data: unknown }) => void) | null = null;
  onerror: ((evento: unknown) => void) | null = null;
  onclose: ((evento: unknown) => void) | null = null;
  constructor(readonly url: string) {}
  abrir() { this.readyState = 1; this.onopen?.({}); }
  receber(dado: unknown) { this.onmessage?.({ data: dado }); }
  cair() { this.readyState = 3; this.onclose?.({}); }
  close() { this.fechado = true; this.readyState = 3; }
  send() { this.enviou = true; }
}

/** Relógio e agenda controlados pelo teste. */
function montar(endereco = 'ws://localhost:8092/telemetria') {
  let relogio = 1_700_000_000_000;
  const timers = new Map<number, { quando: number; acao: () => void }>();
  let proximoId = 1;
  const sockets: SocketFalso[] = [];
  const ponte = criarPonteTelemetria({
    criarSocket: url => { const s = new SocketFalso(url); sockets.push(s); return s; },
    agendar: (acao, ms) => { const id = proximoId++; timers.set(id, { quando: relogio + ms, acao }); return id; },
    cancelar: id => { timers.delete(id as number); },
    agora: () => relogio,
    paginaHttps: () => false,
    enderecoInicial: endereco,
  });
  function avancar(ms: number) {
    const alvo = relogio + ms;
    for (;;) {
      const pendentes = [...timers.entries()].filter(([, t]) => t.quando <= alvo).sort((a, b) => a[1].quando - b[1].quando);
      if (pendentes.length === 0) break;
      const [id, t] = pendentes[0];
      timers.delete(id);
      relogio = t.quando;
      t.acao();
    }
    relogio = alvo;
  }
  const pacote = (estacao: string, sinais: Record<string, unknown>, deslocamentoMs = 0) =>
    JSON.stringify({ timestamp: new Date(relogio + deslocamentoMs).toISOString(), estacao, sinais });
  return { ponte, sockets, avancar, pacote, agora: () => relogio, timers };
}

test('espera de reconexão cresce de 1 s até o teto de 32 s', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 20].map(esperaReconexao),
    [1000, 2000, 4000, 8000, 16000, 32000, 32000, 32000]);
});

test('conecta, recebe pacote e marca apenas a estação recebida como atual', () => {
  const { ponte, sockets, pacote, agora } = montar();
  ponte.conectar();
  assert.equal(ponte.obter().conexao, 'CONECTANDO');
  sockets[0].abrir();
  assert.equal(ponte.obter().conexao, 'ABERTA');
  sockets[0].receber(pacote('PROCESSO', { processo_n2_aguardando: true }));
  const estado = ponte.obter();
  assert.equal(estacaoAtual(estado, 'PROCESSO', agora()), true);
  assert.equal(estacaoAtual(estado, 'MONTAGEM', agora()), false);
  assert.equal(estado.registros.PROCESSO?.amostra.sinais.processo_n2_aguardando, true);
});

test('leitura deixa de ser atual 3 s após a recepção, sem apagar o último pacote', () => {
  const { ponte, sockets, pacote, avancar, agora } = montar();
  ponte.conectar(); sockets[0].abrir();
  sockets[0].receber(pacote('PROCESSO', { processo_n2_manual: false }));
  avancar(3001);
  const estado = ponte.obter();
  assert.equal(estacaoAtual(estado, 'PROCESSO', agora()), false);
  assert.ok(estado.registros.PROCESSO, 'último pacote preservado para diagnóstico');
});

test('a conexão é independente das telas: só desconectar() fecha o socket', () => {
  const { ponte, sockets } = montar();
  ponte.conectar(); sockets[0].abrir();
  // Simula uma tela que assina e depois é desmontada (troca de visão).
  let notificacoes = 0;
  const sair = ponte.assinar(() => { notificacoes++; });
  sair();
  assert.equal(sockets[0].fechado, false);
  assert.equal(ponte.obter().conexao, 'ABERTA');
  // Uma nova tela assina e encontra a mesma conexão aberta.
  const outra = ponte.assinar(() => {});
  assert.equal(ponte.obter().conexao, 'ABERTA');
  outra();
  ponte.desconectar();
  assert.equal(sockets[0].fechado, true);
  assert.equal(ponte.obter().conexao, 'DESLIGADA');
  assert.equal(notificacoes, 0);
});

test('queda inesperada reconecta com 1 s, 2 s, 4 s e zera o contador ao abrir', () => {
  const { ponte, sockets, avancar } = montar();
  ponte.conectar(); sockets[0].abrir();
  sockets[0].cair();
  assert.equal(ponte.obter().conexao, 'RECONECTANDO');
  assert.equal(ponte.obter().tentativa, 1);
  avancar(999);
  assert.equal(sockets.length, 1, 'não tenta antes de 1 s');
  avancar(1);
  assert.equal(sockets.length, 2);
  sockets[1].cair();
  assert.equal(ponte.obter().tentativa, 2);
  avancar(2000);
  assert.equal(sockets.length, 3);
  sockets[2].cair();
  avancar(3999);
  assert.equal(sockets.length, 3);
  avancar(1);
  assert.equal(sockets.length, 4);
  sockets[3].abrir();
  assert.equal(ponte.obter().conexao, 'ABERTA');
  assert.equal(ponte.obter().tentativa, 0);
});

test('ponte que não abre em 5 s entra em reconexão', () => {
  const { ponte, sockets, avancar } = montar();
  ponte.conectar();
  avancar(5000);
  assert.equal(sockets[0].fechado, true);
  assert.equal(ponte.obter().conexao, 'RECONECTANDO');
});

test('desconectar durante a espera cancela a reconexão agendada', () => {
  const { ponte, sockets, avancar, timers } = montar();
  ponte.conectar(); sockets[0].abrir(); sockets[0].cair();
  ponte.desconectar();
  assert.equal(timers.size, 0);
  avancar(60_000);
  assert.equal(sockets.length, 1);
  assert.equal(ponte.obter().conexao, 'DESLIGADA');
});

test('pacote inválido ou vencido é descartado sem afetar outra estação', () => {
  const { ponte, sockets, pacote } = montar();
  ponte.conectar(); sockets[0].abrir();
  sockets[0].receber(pacote('MONTAGEM', { montagem_segurancaOK: true }));
  sockets[0].receber('{não é json');
  sockets[0].receber(pacote('PROCESSO', { processo_n2_ocupado: true }, -10_000));
  sockets[0].receber(pacote('PROCESSO', { processo_n2_ocupado: 'sim' }));
  const estado = ponte.obter();
  assert.ok(estado.registros.MONTAGEM);
  assert.equal(estado.registros.PROCESSO, undefined);
});

test('endereço fora do computador sem wss:// é recusado e não agenda reconexão', () => {
  const { ponte, sockets, timers } = montar('ws://192.168.150.200:8092/telemetria');
  ponte.conectar();
  assert.equal(ponte.obter().conexao, 'ERRO');
  assert.equal(sockets.length, 0);
  assert.equal(timers.size, 0);
});

test('endereço não muda com a conexão ativa e a ponte nunca envia dados', () => {
  const { ponte, sockets } = montar();
  ponte.conectar(); sockets[0].abrir();
  ponte.definirEndereco('ws://localhost:9999/telemetria');
  assert.equal(ponte.obter().endereco, 'ws://localhost:8092/telemetria');
  assert.equal(sockets[0].enviou, false);
});
