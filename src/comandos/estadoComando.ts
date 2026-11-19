import type { AcaoComando } from './comandos';

/**
 * Estado de comando (6.2) + intertravamento e auditoria (6.7), para useReducer.
 * Estado otimista = PENDENTE (luz do elevador acesa); confirmado = telemetria de retorno.
 */
export type EstadoFinal = 'PENDENTE' | 'CONFIRMADO' | 'REJEITADO';

export interface RegistroAuditoria {
  id: string;
  origem: string;
  acao: AcaoComando;
  instante: string;          // ISO do clique
  estado: EstadoFinal;
  finalizadoEm?: string;     // ISO da confirmação ou rejeição
  latenciaMs?: number;
  motivo?: string;
}

export interface EstadoComandos {
  pendente: RegistroAuditoria | null;
  auditoria: RegistroAuditoria[];   // mais recente primeiro
  emergenciaTravada: boolean;       // 6.4: só destrava por reset explícito + telemetria sem emergência
  aviso: string | null;
}

export const estadoInicialComandos: EstadoComandos = {
  pendente: null, auditoria: [], emergenciaTravada: false, aviso: null,
};

export type AcaoReducer =
  | { tipo: 'SOLICITADO'; id: string; origem: string; acao: AcaoComando; agora: number }
  | { tipo: 'BLOQUEADO'; acao: AcaoComando; motivo: string; id: string; origem: string; agora: number }
  | { tipo: 'CONFIRMADO'; id: string; agora: number }
  | { tipo: 'REJEITADO'; id: string; motivo: string; agora: number }
  | { tipo: 'TRAVAR_EMERGENCIA' }
  | { tipo: 'DESTRAVAR_EMERGENCIA' }
  | { tipo: 'AVISO'; texto: string | null };

const LIMITE_AUDITORIA = 500;

function atualizar(auditoria: RegistroAuditoria[], registro: RegistroAuditoria) {
  return auditoria.map(r => (r.id === registro.id ? registro : r));
}

function finalizar(r: RegistroAuditoria, estado: EstadoFinal, agora: number, motivo?: string): RegistroAuditoria {
  return {
    ...r, estado, motivo,
    finalizadoEm: new Date(agora).toISOString(),
    latenciaMs: agora - Date.parse(r.instante),
  };
}

export function reduzirComandos(estado: EstadoComandos, a: AcaoReducer): EstadoComandos {
  switch (a.tipo) {
    case 'SOLICITADO': {
      let auditoria = estado.auditoria;
      // Intertravamento: só a emergência pode passar por cima de um comando pendente.
      if (estado.pendente) {
        if (a.acao !== 'emergencia') return estado;
        auditoria = atualizar(auditoria, finalizar(estado.pendente, 'REJEITADO', a.agora, 'interrompido pela emergência'));
      }
      const registro: RegistroAuditoria = {
        id: a.id, origem: a.origem, acao: a.acao, instante: new Date(a.agora).toISOString(), estado: 'PENDENTE',
      };
      return {
        ...estado,
        pendente: registro,
        auditoria: [registro, ...auditoria].slice(0, LIMITE_AUDITORIA),
        emergenciaTravada: estado.emergenciaTravada || a.acao === 'emergencia',
        aviso: null,
      };
    }
    case 'BLOQUEADO': {
      // Comando que nem saiu (sem conexão, intertravado): fica na auditoria como REJEITADO.
      const iso = new Date(a.agora).toISOString();
      const registro: RegistroAuditoria = {
        id: a.id, origem: a.origem, acao: a.acao, instante: iso, estado: 'REJEITADO',
        finalizadoEm: iso, latenciaMs: 0, motivo: a.motivo,
      };
      return {
        ...estado,
        auditoria: [registro, ...estado.auditoria].slice(0, LIMITE_AUDITORIA),
        emergenciaTravada: estado.emergenciaTravada || a.acao === 'emergencia',
        aviso: a.acao === 'emergencia'
          ? 'A emergência NÃO foi transmitida (' + a.motivo + '). Use o botão físico de emergência.'
          : 'Comando não enviado: ' + a.motivo + '.',
      };
    }
    case 'CONFIRMADO': {
      if (!estado.pendente || estado.pendente.id !== a.id) return estado;
      const r = finalizar(estado.pendente, 'CONFIRMADO', a.agora);
      return { ...estado, pendente: null, auditoria: atualizar(estado.auditoria, r), aviso: null };
    }
    case 'REJEITADO': {
      if (!estado.pendente || estado.pendente.id !== a.id) return estado;
      const r = finalizar(estado.pendente, 'REJEITADO', a.agora, a.motivo);
      const aviso = r.acao === 'emergencia'
        ? 'A emergência não foi confirmada pela telemetria. Use o botão físico de emergência.'
        : 'Sem confirmação da máquina: ' + a.motivo + '. O botão foi reabilitado.';
      return { ...estado, pendente: null, auditoria: atualizar(estado.auditoria, r), aviso };
    }
    case 'TRAVAR_EMERGENCIA':
      return { ...estado, emergenciaTravada: true };
    case 'DESTRAVAR_EMERGENCIA':
      return { ...estado, emergenciaTravada: false };
    case 'AVISO':
      return { ...estado, aviso: a.texto };
  }
}

/** 6.7: exportação da trilha de auditoria. */
export function exportarAuditoria(auditoria: RegistroAuditoria[], agora = new Date()): string {
  return JSON.stringify({
    modulo: 'G2 - IHM Siemens e botoeira',
    exportadoEm: agora.toISOString(),
    total: auditoria.length,
    registros: [...auditoria].reverse(), // ordem cronológica
  }, null, 2);
}
