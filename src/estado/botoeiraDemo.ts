/**
 * Estado de DEMONSTRAÇÃO local, exclusivo da réplica da botoeira física.
 * Nenhuma transição envia comandos para CLP, Node-RED ou WebSocket.
 * Não representa o estado operacional nem as condições de segurança da planta.
 */
export type ComandoBotoeiraDemo = 'START' | 'STOP' | 'RESET';
export interface EstadoBotoeiraDemo {
  status: 'PARADA' | 'OPERANDO';
  mensagem: string;
}
export const estadoInicialBotoeira: EstadoBotoeiraDemo = {
  status: 'PARADA',
  mensagem: 'Aguardando START, STOP ou RESET. Nenhum comando físico é enviado.',
};

export function reduzirBotoeiraDemo(
  estado: EstadoBotoeiraDemo,
  comando: ComandoBotoeiraDemo,
): EstadoBotoeiraDemo {
  switch (comando) {
    case 'START':
      return estado.status === 'OPERANDO'
        ? { ...estado, mensagem: 'Simulação já está em execução.' }
        : { status: 'OPERANDO', mensagem: 'START acionado: ciclo demonstrativo iniciado.' };
    case 'STOP':
      return { status: 'PARADA', mensagem: estado.status === 'PARADA'
        ? 'STOP acionado: simulação já estava parada.'
        : 'STOP acionado: ciclo demonstrativo interrompido.' };
    case 'RESET':
      return { status: 'PARADA', mensagem: 'RESET acionado: estado demonstrativo reiniciado.' };
  }
}
