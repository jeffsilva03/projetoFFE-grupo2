export type EstadoOperacional = 'PARADA' | 'OPERANDO' | 'FALHA_SEGURANCA' | 'EMERGENCIA';
export type ModoOperacao = 'MANUAL' | 'AUTOMATICO' | 'MANUTENCAO';
export type Direcao = 'ESQUERDA' | 'DIREITA' | 'PARADO';
export type AbaPainel = 'CONTROLE' | 'PARAMETROS' | 'DIAGNOSTICO';

export interface ParametrosProducao {
  velocidade: number;
  quantidade: number;
}
export interface EstadoMaquina {
  estado: EstadoOperacional;
  modo: ModoOperacao;
  direcao: Direcao;
  emergenciaTravada: boolean;
  segurancaRestabelecida: boolean;
  pressao: number;
  posicao: number;
  produzidas: number;
  progressoCiclo: number;
  parametros: ParametrosProducao;
  avisoSonoroSilenciado: boolean;
  falhaReconhecida: boolean;
  mensagem: string;
}
export type AcaoMaquina =
  | { tipo: 'INICIAR' | 'PARAR' | 'REARMAR' | 'EMERGENCIA' | 'DESTRAVAR_EMERGENCIA' | 'PARAR_MOVIMENTO' | 'SILENCIAR' | 'RECONHECER_FALHA' | 'PASSO' }
  | { tipo: 'ALTERAR_MODO'; modo: ModoOperacao }
  | { tipo: 'MOVER'; direcao: 'ESQUERDA' | 'DIREITA' }
  | { tipo: 'ALTERAR_SEGURANCA'; restabelecida: boolean }
  | { tipo: 'ALTERAR_PRESSAO'; pressao: number }
  | { tipo: 'APLICAR_PARAMETROS'; parametros: ParametrosProducao };
