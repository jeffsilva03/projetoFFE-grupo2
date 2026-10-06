import type { EstadoMaquina, AcaoMaquina } from './maquina';
export type EstadoConexao = 'LOCAL' | 'CONECTANDO' | 'CONECTADO' | 'DESCONECTADO' | 'SEM_TELEMETRIA' | 'ERRO';
export interface TelemetriaSimulador {
  timestamp: string;
  estadoGlobal: 'PRONTA' | 'EM_EXECUCAO' | 'PARADA_EMERGENCIA';
  modoOperacao: 'MANUAL' | 'AUTOMATICO' | 'MANUTENCAO';
  velocidadeEsteiraAtual: number;
  estacaoIhm: { travaSegurancaAtiva: boolean; pressaoPneumaticaBar: number };
  totalPecas: number | null;
}
export interface FonteDados {
  remota: boolean;
  disponivel: boolean;
  estadoConexao: EstadoConexao;
  telemetria: TelemetriaSimulador | null;
  comandoPendente: string | null;
}
export interface PropriedadesControle {
  maquina: EstadoMaquina;
  enviar: import('react').Dispatch<AcaoMaquina>;
  fonte: FonteDados;
}
