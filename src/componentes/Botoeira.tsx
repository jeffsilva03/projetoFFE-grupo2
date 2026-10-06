import type { PropriedadesControle } from '../tipos/conexao';
import { possuiBloqueio } from '../estado/simulacao';
import { Icone, SimboloSmart } from './Icone';
export function Botoeira({ maquina, enviar, fonte }: PropriedadesControle) {
  const alarme = maquina.estado === 'EMERGENCIA' || maquina.estado === 'FALHA_SEGURANCA';
  return <section className="ihm-botoeira" aria-label="Botoeira de segurança">
    <header className="ihm-marca-estacao"><SimboloSmart tamanho={45} /><div><strong>SMART <b>4.0</b></strong><span>AUTOMAÇÃO INDUSTRIAL</span></div></header>
    <div className="ihm-seletor"><div className="ihm-rotulo-metal">MODO DE OPERAÇÃO</div><div className="ihm-modos" role="group" aria-label="Modo de operação">
      <button className={maquina.modo === 'MANUAL' ? 'selecionado' : ''} aria-pressed={maquina.modo === 'MANUAL'} disabled={fonte.remota || maquina.estado !== 'PARADA'} onClick={() => enviar({ tipo: 'ALTERAR_MODO', modo: 'MANUAL' })}>Manual</button>
      <button className={maquina.modo === 'AUTOMATICO' ? 'selecionado' : ''} aria-pressed={maquina.modo === 'AUTOMATICO'} disabled={fonte.remota || maquina.estado !== 'PARADA'} onClick={() => enviar({ tipo: 'ALTERAR_MODO', modo: 'AUTOMATICO' })}>Automático</button>
    </div></div>
    {fonte.remota && <p className="ihm-ajuda-mock">Modo definido pelo servidor. Seleção indisponível no mock.</p>}
    <div className="ihm-comandos">
      <div className="ihm-comando"><button className={`ihm-botao-industrial verde ${fonte.disponivel && maquina.estado === 'OPERANDO' ? 'aceso' : ''}`} aria-label="Iniciar máquina" disabled={!fonte.disponivel || possuiBloqueio(maquina) || Boolean(fonte.comandoPendente)} onClick={() => enviar({ tipo: 'INICIAR' })}><Icone nome="iniciar" tamanho={25} /></button><strong>INICIAR</strong><span>Partida do ciclo</span></div>
      <div className="ihm-comando"><button className="ihm-botao-industrial vermelho" aria-label="Parar máquina" disabled={!fonte.disponivel} onClick={() => enviar({ tipo: 'PARAR' })}><Icone nome="parar" tamanho={22} /></button><strong>PARAR</strong><span>Parada normal</span></div>
      <div className="ihm-comando"><button className="ihm-botao-industrial azul" aria-label="Rearmar sistema" disabled={!fonte.disponivel || (fonte.remota && (maquina.estado === 'OPERANDO' || Boolean(fonte.comandoPendente)))} onClick={() => enviar({ tipo: 'REARMAR' })}><Icone nome="rearmar" tamanho={25} /></button><strong>REARMAR</strong><span>Reset do sistema</span></div>
    </div>
    <div className={`ihm-area-emergencia ${maquina.emergenciaTravada ? 'travada' : ''}`}>
      <div className="ihm-base-emergencia"><span>PARADA DE</span><button className="ihm-botao-emergencia" aria-label="Acionar emergência" aria-pressed={maquina.emergenciaTravada} disabled={!fonte.disponivel} onClick={() => enviar({ tipo: 'EMERGENCIA' })}><Icone nome="parar" tamanho={32} /></button><strong>EMERGÊNCIA</strong></div>
      <div className="ihm-descricao-emergencia"><strong>{maquina.emergenciaTravada ? 'EMERGÊNCIA ATIVA' : 'PARADA IMEDIATA'}</strong><p>{maquina.emergenciaTravada ? fonte.remota ? 'No mock, pressione REARMAR para remover a trava.' : 'Destrave o botão. Depois, rearme o sistema.' : 'Interrompe todos os movimentos e bloqueia a máquina.'}</p>{maquina.emergenciaTravada && !fonte.remota && <button className="ihm-destravar" onClick={() => enviar({ tipo: 'DESTRAVAR_EMERGENCIA' })}><Icone nome="rearmar" tamanho={14} />Destravar botão</button>}</div>
    </div>
    <div className="ihm-comandos-auxiliares"><button disabled={fonte.remota || !alarme} aria-pressed={maquina.avisoSonoroSilenciado} onClick={() => enviar({ tipo: 'SILENCIAR' })}><span className={`ihm-mini-botao amarelo ${alarme && !maquina.avisoSonoroSilenciado ? 'aceso' : ''}`}><Icone nome="alarme" tamanho={17} /></span><span>{maquina.avisoSonoroSilenciado ? 'Alarme silenciado' : 'Silenciar alarme'}</span></button><button disabled={fonte.remota || !alarme} aria-pressed={maquina.falhaReconhecida} onClick={() => enviar({ tipo: 'RECONHECER_FALHA' })}><span className="ihm-mini-botao vermelho"><Icone nome="confirmar" tamanho={17} /></span><span>{maquina.falhaReconhecida ? 'Falha reconhecida' : 'Reconhecer falha'}</span></button></div>
    <div className="ihm-sinaleiros" aria-label="Iluminação de segurança"><span className={fonte.disponivel && maquina.estado === 'OPERANDO' ? 'verde ativo' : 'verde'}><i className="ihm-led" />Operação</span><span className={fonte.disponivel && (maquina.estado === 'PARADA' || maquina.estado === 'FALHA_SEGURANCA') ? 'amarelo ativo' : 'amarelo'}><i className="ihm-led" />Atenção</span><span className={fonte.disponivel && maquina.estado === 'EMERGENCIA' ? 'vermelho ativo' : 'vermelho'}><i className="ihm-led" />Emergência</span></div>
  </section>;
}
