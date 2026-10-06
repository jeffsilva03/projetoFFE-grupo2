import type { PropriedadesControle } from '../tipos/conexao';
import { possuiBloqueio } from '../estado/simulacao';
import { Icone } from './Icone';

export function Movimentacao({ maquina, enviar, fonte }: PropriedadesControle) {
  const bloqueado = fonte.remota || maquina.modo !== 'MANUAL' || possuiBloqueio(maquina);
  const soltar = () => enviar({ tipo: 'PARAR_MOVIMENTO' });
  return <section className="ihm-movimentacao">
    <div className="ihm-titulo-secao"><span>Movimentação</span><span className="ihm-microtexto">EIXO VIRTUAL</span></div>
    <div className={`ihm-esteira ${fonte.disponivel && maquina.estado === 'OPERANDO' ? 'movendo' : ''}`}>
      <div className="ihm-trilho" />{!fonte.remota && <span className="ihm-peca" style={{ left: `${8 + maquina.posicao * .84}%` }}><span /></span>}
      <div className="ihm-rolos">{Array.from({ length: 9 }, (_, indice) => <i key={indice} />)}</div>
    </div>
    <div className="ihm-escala"><span>0%</span><span>{fonte.remota ? 'Posição não informada' : <>Posição <b>{maquina.posicao.toFixed(0)}%</b></>}</span><span>100%</span></div>
    <div className="ihm-setas">
      {(['ESQUERDA', 'DIREITA'] as const).map(direcao => <button key={direcao} type="button" className={`ihm-botao-seta ${maquina.direcao === direcao && maquina.modo === 'MANUAL' ? 'pressionado' : ''}`} aria-label={`Mover para a ${direcao.toLowerCase()}`} disabled={bloqueado}
        onPointerDown={evento => { if (evento.button !== 0) return; evento.currentTarget.setPointerCapture(evento.pointerId); enviar({ tipo: 'MOVER', direcao }); }}
        onPointerUp={soltar} onPointerCancel={soltar} onLostPointerCapture={soltar} onBlur={soltar}
        onKeyDown={evento => { if (evento.key === ' ' || evento.key === 'Enter') { evento.preventDefault(); if (!evento.repeat) enviar({ tipo: 'MOVER', direcao }); } }}
        onKeyUp={evento => { if (evento.key === ' ' || evento.key === 'Enter') { evento.preventDefault(); soltar(); } }}>
        <Icone nome={direcao === 'ESQUERDA' ? 'esquerda' : 'direita'} tamanho={27} /><span>{direcao === 'ESQUERDA' ? 'Recuar' : 'Avançar'}</span>
      </button>)}
    </div>
    <p className="ihm-ajuda">{fonte.remota ? 'Setas não disponíveis no simulador do professor.' : possuiBloqueio(maquina) ? 'Movimentação bloqueada pela segurança.' : maquina.modo === 'MANUAL' ? 'Mantenha pressionado. Solte para parar.' : 'Selecione o modo manual para movimentar.'}</p>
  </section>;
}
