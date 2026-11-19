import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { enviar, ORIGEM_G2, type AcaoComando } from './comandos';
import { estadoInicialComandos, reduzirComandos, type EstadoComandos } from './estadoComando';
import {
  bancadaEmEmergencia, comandosPermitidos, confirma, lerTelemetria,
  TELEMETRIA_VALIDA_MS, TIMEOUT_CONFIRMACAO_MS, type TelemetriaComandos,
} from './regras';
import { EVENTO_TELEMETRIA } from './shellLocal';

/**
 * Estado dos comandos montado na raiz da aplicação (acima da troca de telas):
 * trocar de visão não perde comando pendente, auditoria nem a trava de emergência.
 */
interface ValorComandos {
  estado: EstadoComandos;
  telemetria: TelemetriaComandos | null;
  telemetriaAtual: boolean;
  emEmergencia: boolean;     // telemetria mostra EMERGENCIA em alguma estação
  travado: boolean;          // interface travada (emergência vista ou acionada, até reset confirmado)
  permitidos: ReturnType<typeof comandosPermitidos>;
  solicitar: (acao: Exclude<AcaoComando, 'emergencia'>) => void;
  acionarEmergencia: () => void;
}

const Contexto = createContext<ValorComandos | null>(null);
let sequencia = 0;
const novoId = () => `cmd-${Date.now().toString(36)}-${(++sequencia).toString(36)}`;

export function ProvedorComandos({ children }: { children: ReactNode }) {
  const [estado, despachar] = useReducer(reduzirComandos, estadoInicialComandos);
  const [telemetria, definirTelemetria] = useState<TelemetriaComandos | null>(null);
  const [recebidaEm, definirRecebidaEm] = useState(0);
  const [agora, definirAgora] = useState(() => Date.now());
  const estadoRef = useRef(estado);
  estadoRef.current = estado;

  useEffect(() => {
    const relogio = window.setInterval(() => definirAgora(Date.now()), 250);
    const aoReceber = (ev: Event) => {
      const t = lerTelemetria((ev as CustomEvent).detail);
      if (!t) return;
      const momento = Date.now();
      definirTelemetria(t);
      definirRecebidaEm(momento);
      const atual = estadoRef.current;
      if (bancadaEmEmergencia(t) && !atual.emergenciaTravada) despachar({ tipo: 'TRAVAR_EMERGENCIA' });
      const p = atual.pendente;
      if (p && confirma(p.acao, t)) {
        despachar({ tipo: 'CONFIRMADO', id: p.id, agora: momento });
        // 6.4: destrava só por RESET confirmado com telemetria sem emergência.
        if (p.acao === 'reset' && !bancadaEmEmergencia(t)) despachar({ tipo: 'DESTRAVAR_EMERGENCIA' });
      }
    };
    window.addEventListener(EVENTO_TELEMETRIA, aoReceber);
    return () => { window.clearInterval(relogio); window.removeEventListener(EVENTO_TELEMETRIA, aoReceber); };
  }, []);

  // 6.2: sem confirmação em 5 s, REJEITADO e botão reabilitado.
  useEffect(() => {
    const p = estado.pendente;
    if (!p) return;
    const restante = Math.max(0, Date.parse(p.instante) + TIMEOUT_CONFIRMACAO_MS - Date.now());
    const t = window.setTimeout(() => despachar({
      tipo: 'REJEITADO', id: p.id, motivo: 'tempo esgotado (5 s)', agora: Date.now(),
    }), restante);
    return () => window.clearTimeout(t);
  }, [estado.pendente]);

  const telemetriaAtual = telemetria !== null && agora - recebidaEm <= TELEMETRIA_VALIDA_MS;
  const emEmergencia = bancadaEmEmergencia(telemetria);
  const travado = estado.emergenciaTravada || (telemetriaAtual && emEmergencia);
  const base = comandosPermitidos(telemetria, telemetriaAtual, estado.pendente !== null);
  // Interface travada: só RESET (6.5).
  const permitidos = travado ? { start: false, stop: false, reset: base.reset } : base;

  const solicitar = useCallback((acao: Exclude<AcaoComando, 'emergencia'>) => {
    const id = novoId();
    const momento = Date.now();
    if (estadoRef.current.pendente) {
      despachar({ tipo: 'BLOQUEADO', id, origem: ORIGEM_G2, acao, motivo: 'há um comando PENDENTE', agora: momento });
      return;
    }
    const r = enviar(acao);
    if (r.ok) despachar({ tipo: 'SOLICITADO', id, origem: ORIGEM_G2, acao, agora: momento });
    else despachar({ tipo: 'BLOQUEADO', id, origem: ORIGEM_G2, acao, motivo: r.motivo, agora: momento });
  }, []);

  // 6.4: trava a interface ANTES de qualquer chamada de rede.
  const acionarEmergencia = useCallback(() => {
    despachar({ tipo: 'TRAVAR_EMERGENCIA' });
    const id = novoId();
    const momento = Date.now();
    const r = enviar('emergencia');
    if (r.ok) despachar({ tipo: 'SOLICITADO', id, origem: ORIGEM_G2, acao: 'emergencia', agora: momento });
    else despachar({ tipo: 'BLOQUEADO', id, origem: ORIGEM_G2, acao: 'emergencia', motivo: r.motivo, agora: momento });
  }, []);

  const valor = useMemo<ValorComandos>(() => ({
    estado, telemetria, telemetriaAtual, emEmergencia, travado, permitidos, solicitar, acionarEmergencia,
  }), [estado, telemetria, telemetriaAtual, emEmergencia, travado, permitidos.start, permitidos.stop, permitidos.reset, solicitar, acionarEmergencia]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function usarComandos(): ValorComandos {
  const v = useContext(Contexto);
  if (!v) throw new Error('usarComandos precisa estar dentro de <ProvedorComandos>.');
  return v;
}

/** 6.5: hook de estado de segurança, consumido por todos os botões. */
export function usarEstadoSeguranca(): boolean {
  return usarComandos().travado;
}
