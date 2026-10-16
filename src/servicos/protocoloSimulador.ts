import type { AcaoMaquina } from '../tipos/maquina';
import type { TelemetriaSimulador } from '../tipos/conexao';
export const acoesDoMock = { INICIAR: 'START', PARAR: 'STOP', REARMAR: 'RESET', EMERGENCIA: 'EMERGENCY_STOP' } as const;
export type AcaoRemota = keyof typeof acoesDoMock;
export function acaoSuportada(acao: AcaoMaquina): acao is AcaoMaquina & { tipo: AcaoRemota } { return Object.hasOwn(acoesDoMock, acao.tipo); }
function objeto(valor: unknown): valor is Record<string, unknown> { return typeof valor === 'object' && valor !== null && !Array.isArray(valor); }
export function lerTelemetria(mensagem: string): TelemetriaSimulador {
  const dados: unknown = JSON.parse(mensagem);
  if (!objeto(dados) || typeof dados.timestamp !== 'string' || !Number.isFinite(Date.parse(dados.timestamp))) throw new Error('Data da telemetria inválida.');
  if (typeof dados.estadoGlobal !== 'string' || !['PRONTA', 'EM_EXECUCAO', 'PARADA_EMERGENCIA'].includes(dados.estadoGlobal)) throw new Error('Estado da máquina não reconhecido.');
  if (typeof dados.modoOperacao !== 'string' || !['MANUAL', 'AUTOMATICO', 'MANUTENCAO'].includes(dados.modoOperacao)) throw new Error('Modo da máquina não reconhecido.');
  if (typeof dados.velocidadeEsteiraAtual !== 'number' || !Number.isFinite(dados.velocidadeEsteiraAtual) || dados.velocidadeEsteiraAtual < 0 || dados.velocidadeEsteiraAtual > 100) throw new Error('Velocidade inválida.');
  const ihm = dados.estacaoIhm;
  if (!objeto(ihm) || typeof ihm.travaSegurancaAtiva !== 'boolean' || typeof ihm.pressaoPneumaticaBar !== 'number' || !Number.isFinite(ihm.pressaoPneumaticaBar) || ihm.pressaoPneumaticaBar < 0 || ihm.pressaoPneumaticaBar > 100) throw new Error('Dados de segurança inválidos.');
  let totalPecas: number | null = null;
  if (objeto(dados.metricasExpedicao)) { const total = dados.metricasExpedicao.pecasProcessadasTotal; if (typeof total === 'number' && Number.isSafeInteger(total) && total >= 0) totalPecas = total; }
  return { timestamp: dados.timestamp, estadoGlobal: dados.estadoGlobal as TelemetriaSimulador['estadoGlobal'], modoOperacao: dados.modoOperacao as TelemetriaSimulador['modoOperacao'], velocidadeEsteiraAtual: dados.velocidadeEsteiraAtual, estacaoIhm: { travaSegurancaAtiva: ihm.travaSegurancaAtiva, pressaoPneumaticaBar: ihm.pressaoPneumaticaBar }, totalPecas };
}
export function condicaoAposComando(acao: AcaoRemota, dados: TelemetriaSimulador): boolean {
  switch (acao) {
    case 'INICIAR': return dados.estadoGlobal === 'EM_EXECUCAO' && !dados.estacaoIhm.travaSegurancaAtiva;
    case 'PARAR': return dados.velocidadeEsteiraAtual === 0;
    case 'REARMAR': return dados.estadoGlobal === 'PRONTA' && !dados.estacaoIhm.travaSegurancaAtiva;
    case 'EMERGENCIA': return dados.estadoGlobal === 'PARADA_EMERGENCIA' && dados.estacaoIhm.travaSegurancaAtiva && dados.velocidadeEsteiraAtual === 0;
  }
}
export function montarUrlSimulador(endereco: string, token: string): string {
  const url = new URL(endereco.trim());
  if (!['ws:', 'wss:'].includes(url.protocol)) throw new Error('Use uma URL iniciada por ws:// ou wss://.');
  if (!token.trim()) throw new Error('Informe o token do grupo.');
  if (url.username || url.password) throw new Error('Informe a autenticação no campo Token.');
  url.searchParams.set('token', token.trim()); return url.toString();
}
