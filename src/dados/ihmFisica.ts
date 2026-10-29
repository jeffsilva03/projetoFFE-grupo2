/**
 * Transcrição visual das fotografias da IHM Smart 4.0 (28/10/2026).
 * NÃO são tags validadas do PLC, endereços, permissões ou telemetria ao vivo.
 */
export const entradasFotografadas = [
  { nome: 'Botão de Emergência OK', ativo: true },
  { nome: 'Eixo Z Avançado', ativo: true },
  { nome: 'Eixo Z Recuado', ativo: false },
  { nome: 'Sensor Vácuo Manipulador', ativo: false },
  { nome: 'Sensor Vácuo Mesa', ativo: false },
  { nome: 'Comutador Painel (AUT)', ativo: false },
  { nome: 'Botão Verde Painel', ativo: false },
  { nome: 'Botão Vermelho Painel', ativo: true },
] as const;

export const saidasFotografadas = [
  'Avança Eixo Z',
  'Liga Vácuo Manipulador',
  'Liga Vácuo Mesa',
  'Motor da Esteira 1',
  'Motor da Esteira 2',
  'Status Processo',
] as const;

export const laminasFotografadas = [
  { nome: 'Lâmina 1', x: 315.70, y: 144.78 },
  { nome: 'Lâmina 2', x: 270.70, y: 144.78 },
  { nome: 'Lâmina 3', x: 225.70, y: 144.78 },
  { nome: 'Lâmina 4', x: 180.70, y: 144.78 },
  { nome: 'Lâmina 5', x: 135.70, y: 144.78 },
  { nome: 'Lâmina 6', x: 90.70, y: 144.78 },
  { nome: 'Mesa', x: 168.98, y: 5.46 },
] as const;

export const destinosFotografados = [
  { nome: 'Caneta Meio da Mesa', x: 248.98, y: 61.46 },
  { nome: 'Depósito 1', x: 400.21, y: 111.64 },
  { nome: 'Depósito 2', x: 378.79, y: 111.64 },
  { nome: 'Depósito 3', x: 354.79, y: 111.64 },
] as const;

export const eixosFotografados = { x: 1.40, y: 0.00 } as const;
export const formatarMilimetros = (valor: number) => valor.toFixed(2) + ' mm';
