/**
 * Simulação LOCAL da botoeira da estação de Processo.
 * Não existe caminho de escrita no CLP, Node-RED ou WebSocket neste módulo.
 * Segurança da simulação NÃO equivale ao sistema de segurança da máquina.
 */
export type EixoDemo = 'X' | 'Y';
export type ComandoBotoeiraDemo =
  | 'START' | 'STOP' | 'RESET' | 'SETUP'
  | 'EMERGENCIA' | 'LIBERAR_EMERGENCIA'
  | 'SERVO_X' | 'SERVO_Y' | 'HOME_X' | 'HOME_Y' | 'RESET_X' | 'RESET_Y'
  | 'JOG_X_MAIS' | 'JOG_X_MENOS' | 'JOG_Y_MAIS' | 'JOG_Y_MENOS'
  | 'VACUO_MANIPULADOR' | 'VACUO_MESA' | 'AVANCAR_Z' | 'ESTEIRA_1' | 'ESTEIRA_2';

export type NomeSaidaDemo = 'vacuoManipulador' | 'vacuoMesa' | 'avancaZ' | 'esteira1' | 'esteira2';
export interface EstadoBotoeiraDemo {
  status: 'PARADA' | 'OPERANDO';
  modo: 'MANUAL' | 'AUTOMATICO';
  emergencia: 'LIBERADA' | 'PRESSIONADA' | 'AGUARDANDO_RESET';
  posicao: Record<EixoDemo, number>;
  servo: Record<EixoDemo, boolean>;
  saidas: Record<NomeSaidaDemo, boolean>;
  mensagem: string;
}
const saidasDesligadas: Record<NomeSaidaDemo, boolean> = {
  vacuoManipulador:false, vacuoMesa:false, avancaZ:false, esteira1:false, esteira2:false,
};
export const estadoInicialBotoeira: EstadoBotoeiraDemo = {
  status:'PARADA',
  modo:'AUTOMATICO',
  emergencia:'LIBERADA',
  posicao:{X:1.40,Y:0},
  servo:{X:false,Y:false},
  saidas:{...saidasDesligadas},
  mensagem:'Demonstração parada. Comandos virtuais não chegam à planta.',
};
const recusado = (estado: EstadoBotoeiraDemo, mensagem: string) => ({...estado,mensagem});
const podeManual = (estado: EstadoBotoeiraDemo) =>
  estado.modo==='MANUAL' && estado.status==='PARADA' && estado.emergencia==='LIBERADA';

export function reduzirBotoeiraDemo(
  estado: EstadoBotoeiraDemo,
  comando: ComandoBotoeiraDemo,
): EstadoBotoeiraDemo {
  if (comando==='EMERGENCIA') {
    return {...estado, status:'PARADA', emergencia:'PRESSIONADA',
      servo:{X:false,Y:false}, saidas:{...saidasDesligadas},
      mensagem:'EMERGÊNCIA SIMULADA: controles locais bloqueados. Não é parada física.'};
  }
  if (comando==='LIBERAR_EMERGENCIA') {
    return estado.emergencia==='PRESSIONADA'
      ? {...estado,emergencia:'AGUARDANDO_RESET',mensagem:'Cogumelo virtual liberado. Acione RESET para rearmar a demonstração.'}
      : recusado(estado,'Emergência simulada não está pressionada.');
  }
  if (comando==='RESET') {
    if (estado.emergencia==='PRESSIONADA') return recusado(estado,'Libere o botão de emergência virtual antes do RESET.');
    return {...estado,status:'PARADA',emergencia:'LIBERADA',servo:{X:false,Y:false},
      saidas:{...saidasDesligadas},mensagem:'RESET local: demonstração parada e rearmada.'};
  }
  if (comando==='STOP') {
    return {...estado,status:'PARADA',saidas:{...saidasDesligadas},mensagem:'STOP local: ciclo demonstrativo interrompido.'};
  }
  if (comando==='SETUP') {
    if (estado.status==='OPERANDO' || estado.emergencia!=='LIBERADA')
      return recusado(estado,'Pare a demonstração e libere a emergência antes de trocar o modo.');
    const modo=estado.modo==='MANUAL' ? 'AUTOMATICO' : 'MANUAL';
    return {...estado,modo,servo:{X:false,Y:false},saidas:{...saidasDesligadas},
      mensagem:`SETUP local: modo ${modo==='MANUAL'?'Manual':'Automático'}.`};
  }
  if (comando==='START') {
    if (estado.emergencia!=='LIBERADA') return recusado(estado,'START bloqueado: emergência demonstrativa exige RESET.');
    if (estado.modo!=='AUTOMATICO') return recusado(estado,'START bloqueado: selecione Automático no SETUP virtual.');
    return estado.status==='OPERANDO'
      ? recusado(estado,'Simulação já está em execução.')
      : {...estado,status:'OPERANDO',mensagem:'START local: ciclo demonstrativo iniciado.'};
  }
  if (!podeManual(estado)) return recusado(estado,'Comando manual bloqueado: necessário modo Manual, parada e emergência liberada.');
  if (comando==='SERVO_X' || comando==='SERVO_Y') {
    const eixo: EixoDemo=comando.slice(-1) as EixoDemo;
    return {...estado,servo:{...estado.servo,[eixo]:!estado.servo[eixo]},
      mensagem:`Servo ${eixo} demonstrativo ${estado.servo[eixo]?'desligado':'ligado'}.`};
  }
  if (comando==='RESET_X' || comando==='RESET_Y') {
    const eixo: EixoDemo=comando.slice(-1) as EixoDemo;
    return {...estado,servo:{...estado.servo,[eixo]:false},mensagem:`Reset local do eixo ${eixo}.`};
  }
  if (comando==='HOME_X' || comando==='HOME_Y') {
    const eixo: EixoDemo=comando.slice(-1) as EixoDemo;
    if (!estado.servo[eixo]) return recusado(estado,`HOME ${eixo} exige servo demonstrativo habilitado.`);
    return {...estado,posicao:{...estado.posicao,[eixo]:0},mensagem:`Eixo ${eixo} voltou à origem SIMULADA.`};
  }
  if (comando.startsWith('JOG_')) {
    const eixo: EixoDemo=comando[4] as EixoDemo;
    if (!estado.servo[eixo]) return recusado(estado,`JOG ${eixo} exige servo demonstrativo habilitado.`);
    const deslocamento=comando.endsWith('MAIS') ? .5 : -.5;
    // Limites fictícios apenas para prevenir valores ilimitados no mock; NÃO são limites reais do atuador.
    const novoValor=Math.round(Math.max(-5,Math.min(5,estado.posicao[eixo]+deslocamento))*100)/100;
    return {...estado,posicao:{...estado.posicao,[eixo]:novoValor},
      mensagem:`JOG ${eixo} virtual: ${novoValor.toFixed(2)} mm (não é posição do CLP).`};
  }
  const campos: Partial<Record<ComandoBotoeiraDemo,NomeSaidaDemo>> = {
    VACUO_MANIPULADOR:'vacuoManipulador',VACUO_MESA:'vacuoMesa',
    AVANCAR_Z:'avancaZ',ESTEIRA_1:'esteira1',ESTEIRA_2:'esteira2',
  };
  const campo=campos[comando];
  if (campo) return {...estado,saidas:{...estado.saidas,[campo]:!estado.saidas[campo]},
    mensagem:`Saída virtual ${campo} ${estado.saidas[campo]?'desligada':'ligada'}.`};
  return estado;
}
