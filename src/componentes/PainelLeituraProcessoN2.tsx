import { obterLeiturasProcessoN2 } from '../dados/processoN2';
import type { AmostraLeituraG2 } from '../tipos/leituraG2';
import '../estilos/painel-processo-n2.css';

export function PainelLeituraProcessoN2({ amostra, conectada, atualizada }: {
  amostra:AmostraLeituraG2|null; conectada:boolean; atualizada:boolean;
}) {
  const linhas=obterLeiturasProcessoN2(atualizada?amostra:null);
  const disponíveis=linhas.filter(l=>l.valor!==null).length;
  return <section className="n2-painel" aria-label="Leituras informativas da estação de Processo N2">
    <div className="n2-cabecalho">
      <div><strong>PROCESSO N2 · ESTADOS DO NODE-RED</strong>
        <p>Tags observadas em <code>global.set</code>. Somente leitura, sem autorização para comandos.</p></div>
      <span className={'n2-conexao '+(atualizada?'n2-atual':'')}>
        {atualizada?'Pacote recente':conectada?'Sem leitura recente':'Sem conexão'} · {disponíveis}/14 informados
      </span>
    </div>
    <div className="n2-grade">
      {linhas.map(item=><div key={item.tag} className="n2-linha" title={'Origem S7: '+item.origem+' · '+item.tag}>
        <span>{item.rotulo}</span>
        <b className={item.valor===null?'n2-desconhecido':item.valor?'n2-ligado':'n2-desligado'}>
          {item.valor===null?'Não informado':item.valor?'TRUE':'FALSE'}
        </b>
      </div>)}
    </div>
    <p className="n2-nota">O estado mostrado é o valor publicado pela ponte, não uma confirmação independente de estado físico ou segurança. O nó S7 in tem diff ativado: sinais sem atualização podem expirar mesmo que o CLP mantenha o valor. StartOP/FinishOP são indicadores de ordem de produção, não os botões da máquina.</p>
  </section>;
}
