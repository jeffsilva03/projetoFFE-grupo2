import type { PropriedadesControle } from '../tipos/conexao';
import { Icone } from './Icone';
export function Diagnostico({ maquina, enviar, fonte }: PropriedadesControle) {
  if (fonte.remota) return <section className="ihm-diagnostico"><div className="ihm-titulo-secao"><span>Diagnóstico do simulador</span><Icone nome="escudo" /></div><p className="ihm-descricao">Leitura da telemetria recebida. Testes de falha e pressão são exclusivos da simulação local.</p><div className="ihm-linha-diagnostico"><span>Estado informado</span><b>{fonte.disponivel ? fonte.telemetria?.estadoGlobal : 'Indisponível'}</b></div><div className="ihm-linha-diagnostico"><span>Modo informado</span><b>{fonte.disponivel ? fonte.telemetria?.modoOperacao : 'Indisponível'}</b></div><div className="ihm-linha-diagnostico"><span>Trava de segurança</span><b>{!fonte.disponivel ? 'Indisponível' : fonte.telemetria?.estacaoIhm.travaSegurancaAtiva ? 'Ativa' : 'Inativa'}</b></div><div className="ihm-linha-diagnostico"><span>Pressão pneumática</span><b>{fonte.disponivel ? maquina.pressao.toFixed(1).replace('.', ',') : '—'} bar</b></div><div className="ihm-nota"><Icone nome="informacao" tamanho={18} /><span>O comando REARMAR envia RESET e remove a trava no mock. Não há comando separado de destravamento.</span></div></section>;
  return <section className="ihm-diagnostico">
    <div className="ihm-titulo-secao"><span>Diagnóstico e segurança</span><Icone nome="escudo" /></div>
    <p className="ihm-descricao">Condições virtuais para testar a resposta do painel.</p>
    <div className="ihm-linha-diagnostico"><span>Circuito de segurança</span><b className={maquina.segurancaRestabelecida ? 'texto-verde' : 'texto-vermelho'}>{maquina.segurancaRestabelecida ? 'Fechado' : 'Aberto'}</b></div>
    <button className="ihm-botao-secundario" onClick={() => enviar({ tipo: 'ALTERAR_SEGURANCA', restabelecida: !maquina.segurancaRestabelecida })}>{maquina.segurancaRestabelecida ? 'Simular falha de segurança' : 'Restabelecer segurança'}</button>
    <label className="ihm-campo-pressao" htmlFor="pressao-simulada"><span>Pressão pneumática <b>{maquina.pressao.toFixed(1).replace('.', ',')} bar</b></span><input id="pressao-simulada" type="range" min="0" max="8" step="0.1" value={maquina.pressao} onChange={evento => enviar({ tipo: 'ALTERAR_PRESSAO', pressao: Number(evento.target.value) })} /></label>
    <p className="ihm-ajuda">Pressão mínima para operação: 4,5 bar.</p>
    <div className="ihm-linha-diagnostico"><span>Botão de emergência</span><b>{maquina.emergenciaTravada ? 'Travado' : 'Destravado'}</b></div>
    <div className="ihm-linha-diagnostico"><span>Reconhecimento da falha</span><b>{maquina.falhaReconhecida ? 'Confirmado' : 'Pendente'}</b></div>
    <div className="ihm-nota"><Icone nome="informacao" tamanho={18} /><span>Dados simulados localmente. Comunicação com a planta ainda não conectada.</span></div>
  </section>;
}
