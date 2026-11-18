import { useEffect, useState, useSyncExternalStore } from 'react';
import { criarPonteTelemetria, estacaoAtual } from '../servicos/ponteTelemetria';
import type { PonteTelemetria, SocketLeitura } from '../servicos/ponteTelemetria';
import type { EstacaoG2 } from '../tipos/leituraG2';

let instancia: PonteTelemetria | null = null;

/** Uma única ponte por aba do navegador, compartilhada por todas as telas. */
export function obterPonteTelemetria(): PonteTelemetria {
  if (!instancia) {
    instancia = criarPonteTelemetria({
      // O WebSocket do navegador cumpre o contrato mínimo de SocketLeitura.
      criarSocket: url => new WebSocket(url) as unknown as SocketLeitura,
      agendar: (acao, ms) => window.setTimeout(acao, ms),
      cancelar: id => window.clearTimeout(id as number),
      agora: () => Date.now(),
      paginaHttps: () => window.location.protocol === 'https:',
      enderecoInicial: import.meta.env.VITE_G2_WS_URL || 'ws://localhost:8092/telemetria',
    });
  }
  return instancia;
}

/**
 * Lê o estado da ponte compartilhada. Desmontar a tela NÃO fecha a conexão;
 * apenas o botão "Desconectar" encerra.
 */
export function usarPonteTelemetria() {
  const ponte = obterPonteTelemetria();
  const estado = useSyncExternalStore(ponte.assinar, ponte.obter);
  const [agora, definirAgora] = useState(() => Date.now());
  useEffect(() => {
    // Relógio local apenas para expirar leituras na tela (3 s).
    const relogio = window.setInterval(() => definirAgora(Date.now()), 250);
    return () => window.clearInterval(relogio);
  }, []);
  const ativa = estado.conexao === 'CONECTANDO' || estado.conexao === 'ABERTA' || estado.conexao === 'RECONECTANDO';
  return {
    ...estado,
    agora,
    ativa,
    atual: (estacao: EstacaoG2) => estacaoAtual(estado, estacao, agora),
    conectar: ponte.conectar,
    desconectar: ponte.desconectar,
    definirEndereco: ponte.definirEndereco,
  };
}
