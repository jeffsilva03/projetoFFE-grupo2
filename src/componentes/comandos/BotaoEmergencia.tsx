import { usarComandos } from '../../comandos/ProvedorComandos';

/**
 * 6.4: emergência fail-safe. Trava a interface antes de qualquer chamada de rede,
 * nunca destrava sozinha e funciona mesmo sem conexão (avisando para usar o botão físico).
 * Não substitui o cogumelo físico da bancada.
 */
export function BotaoEmergencia() {
  const { acionarEmergencia, travado } = usarComandos();
  return <button
    type="button"
    className={'s3-emergencia' + (travado ? ' travado' : '')}
    aria-label={travado ? 'Emergência acionada. Interface travada até reset em dois passos.' : 'Acionar parada de emergência'}
    onClick={acionarEmergencia}
  >
    <span aria-hidden="true">STOP</span>
    <small aria-hidden="true">{travado ? 'TRAVADO' : 'EMERGÊNCIA'}</small>
  </button>;
}
