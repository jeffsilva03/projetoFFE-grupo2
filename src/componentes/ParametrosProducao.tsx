import { useState } from 'react';
import type { PropriedadesControle } from '../tipos/conexao';
import { Icone } from './Icone';
export function ParametrosProducao({ maquina, enviar, fonte }: PropriedadesControle) {
  const [velocidade, alterarVelocidade] = useState(String(maquina.parametros.velocidade));
  const [quantidade, alterarQuantidade] = useState(String(maquina.parametros.quantidade));
  const [erro, alterarErro] = useState('');
  const bloqueado = maquina.estado !== 'PARADA';
  if (fonte.remota) return <section className="ihm-parametros"><div className="ihm-titulo-secao"><span>Parâmetros do simulador</span><Icone nome="ajustes" /></div><p className="ihm-descricao">O mock não recebe velocidade nem quantidade do lote. A configuração permanece disponível na simulação local.</p><div className="ihm-linha-diagnostico"><span>Velocidade recebida</span><b>{fonte.disponivel ? fonte.telemetria?.velocidadeEsteiraAtual : '—'}%</b></div><div className="ihm-linha-diagnostico"><span>Total processado · Expedição</span><b>{fonte.disponivel ? fonte.telemetria?.totalPecas ?? '—' : '—'}</b></div><div className="ihm-nota"><Icone nome="informacao" /><span>Nenhum parâmetro local é aplicado ao servidor.</span></div></section>;
  return <form className="ihm-parametros" onSubmit={evento => {
    evento.preventDefault();
    const velocidadeNumero = Number(velocidade), quantidadeNumero = Number(quantidade);
    if (!velocidade.trim() || !quantidade.trim() || !Number.isFinite(velocidadeNumero) || velocidadeNumero < 10 || velocidadeNumero > 100 || !Number.isInteger(quantidadeNumero) || quantidadeNumero < 1 || quantidadeNumero > 999) { alterarErro('Informe velocidade de 10 a 100% e lote de 1 a 999 peças.'); return; }
    alterarErro(''); enviar({ tipo: 'APLICAR_PARAMETROS', parametros: { velocidade: velocidadeNumero, quantidade: quantidadeNumero } });
  }}>
    <div className="ihm-titulo-secao"><span>Parâmetros de produção</span><Icone nome="ajustes" /></div>
    <p className="ihm-descricao">Configure o ciclo automático com a máquina parada.</p>
    <label className="ihm-campo"><span>Velocidade da esteira <small>10–100%</small></span><div><input aria-label="Velocidade da esteira" type="number" min="10" max="100" required disabled={bloqueado} value={velocidade} onChange={evento => alterarVelocidade(evento.target.value)} /><span>%</span></div></label>
    <label className="ihm-campo"><span>Quantidade do lote <small>1–999 peças</small></span><div><input aria-label="Quantidade do lote" type="number" min="1" max="999" step="1" required disabled={bloqueado} value={quantidade} onChange={evento => alterarQuantidade(evento.target.value)} /><span>peças</span></div></label>
    <div className="ihm-resumo-lote"><span>Lote atual</span><b>{maquina.produzidas} / {maquina.parametros.quantidade} peças</b></div>
    {erro && <p className="ihm-erro" role="alert">{erro}</p>}
    <button className="ihm-botao-primario" type="submit" disabled={bloqueado}><Icone nome="confirmar" tamanho={17} />Aplicar parâmetros</button>
    <p className="ihm-ajuda">{bloqueado ? 'Pare e rearme o sistema para editar.' : 'Aplicar inicia um novo lote com o contador zerado.'}</p>
  </form>;
}
