import { useEffect, useReducer, useState } from 'react';
import { estadoInicialBotoeira, reduzirBotoeiraDemo, type ComandoBotoeiraDemo, type EstadoBotoeiraDemo } from '../estado/botoeiraDemo';
import {
  entradasFotografadas, saidasFotografadas, laminasFotografadas,
  destinosFotografados, eixosFotografados, formatarMilimetros,
} from '../dados/ihmFisica';
import { entradasProcesso, saidasProcesso, interpretarSinaisProcesso } from '../dados/sinaisProcesso';
import { usarPonteProcesso } from '../estado/usarPonteProcesso';
import type { AmostraLeituraG2 } from '../tipos/leituraG2';
import '../estilos/ihm-fisica.css';

type TelaFisica = 'INICIO' | 'DIAGNOSTICO' | 'CONFIGURACOES' | 'MANUAL';

function CuboSmart() {
  return <span className="real-cubo" aria-hidden="true"><i /><i /><i /><i /></span>;
}

function SimboloMenu({ tipo }: { tipo: Exclude<TelaFisica, 'INICIO'> }) {
  if (tipo === 'DIAGNOSTICO') return <svg viewBox="0 0 120 120" fill="none" aria-hidden="true">
    <circle cx="60" cy="60" r="41" fill="#f5f8ef" stroke="#b6f600" strokeWidth="5" />
    <path d="M28 63h19l7-21 13 42 8-26 5 5h13" stroke="#9fdb19" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
    <path d="M35 24c16-12 33-15 48-8M88 96c-19 12-40 12-57-1" stroke="#baff19" strokeWidth="6" strokeLinecap="round" />
    <path d="m78 7 12 10-13 6M42 110l-15-12 15-3" fill="#baff19" />
    <path d="m18 41-8 16 14-3M105 74l7-15-15 5" stroke="#baff19" strokeWidth="6" strokeLinejoin="round" />
  </svg>;
  if (tipo === 'CONFIGURACOES') return <svg viewBox="0 0 120 120" aria-hidden="true">
    <path d="m52 3 17 0 5 13 13 4 12-6 12 14-7 11 5 13 13 5v18l-13 4-5 13 6 12-13 12-12-6-13 5-4 13H51l-4-13-13-5-12 6-12-13 7-12-5-13L0 74V56l13-5 5-12-6-12 13-13 12 7 12-5Z" fill="#b9ef0b"/>
    <circle cx="60" cy="60" r="34" fill="#f8fbf1"/>
    <path d="m42 40 38 39m-7-42 10 11-24 24-9-9 23-26ZM39 45l7-7 15 15-7 7-15-15Z" stroke="#b0e407" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>;
  return <svg viewBox="0 0 120 120" aria-hidden="true" fill="none" stroke="#b9f514" strokeWidth="5" strokeLinejoin="round">
    <path d="M15 62V47l11-9 8 8 8-8 8 8 9-8 9 9v15M15 64h54v12H15zM15 82h54M26 82v21M46 82v21M65 82v21"/>
    <path d="M79 63V49h13v14M71 46a29 29 0 1 1 39 0M83 20h17v13H83z"/>
    <path d="M9 90h96v15H9z" strokeWidth="4"/>
  </svg>;
}


type OrigemDiagnostico = 'FOTOGRAFIA' | 'SIMULACAO' | 'PONTE';
const origemNomes: Record<OrigemDiagnostico,string> = {
  FOTOGRAFIA:'Foto de referência',
  SIMULACAO:'Simulação local',
  PONTE:'Ponte G2 · leitura',
};

function Led({ ativo }: { ativo: boolean | null }) {
  const descricao=ativo===null?'Não informado':ativo?'Ligado':'Desligado';
  return <span className={'real-led '+(ativo===null?'desconhecido':ativo?'aceso':'')}
    role="img" aria-label={descricao} title={descricao} />;
}

function BotaoSomenteVisual({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <button type="button" className={'real-botao-plc ' + className} disabled title="Exibição informativa: sem comando industrial">{children}</button>;
}

function BotaoDemo({ children, className='', comando, ativo=false, habilitado, executar }: {
  children:React.ReactNode; className?:string; comando:ComandoBotoeiraDemo;
  ativo?:boolean; habilitado:boolean; executar:(comando:ComandoBotoeiraDemo)=>void;
}) {
  return <button type="button" className={'real-botao-plc real-controle-simulado '+(ativo?'real-ativo-manual ':'')+className}
    disabled={!habilitado} onClick={()=>executar(comando)}
    title={habilitado?'Comando somente local da simulação; não aciona a máquina':'Selecione simulação e modo manual, com segurança demonstrativa liberada'}>
    {children}
  </button>;
}

function CabecalhoTela({ agora }: { agora: Date }) {
  return <header className="real-cabecalho">
    <strong>ESTAÇÃO DE PROCESSO</strong>
    <span className="real-marca-central"><CuboSmart /> Smart4.0 <CuboSmart /></span>
    <time dateTime={agora.toISOString()}>{agora.toLocaleTimeString('pt-BR', { hour12: false })}　{agora.toLocaleDateString('pt-BR')}</time>
  </header>;
}

function entradasVirtuais(estado: EstadoBotoeiraDemo):Record<string,boolean|null> {
  return {
    emergencia:estado.emergencia==='LIBERADA',
    zAvancado:estado.saidas.avancaZ,
    zRecuado:!estado.saidas.avancaZ,
    vacuoManipulador:estado.saidas.vacuoManipulador,
    vacuoMesa:estado.saidas.vacuoMesa,
    automatico:estado.modo==='AUTOMATICO',
    botaoVerde:null, // não afirmar que um botão momentâneo permanece pressionado
    botaoVermelho:null,
  };
}
function saidasVirtuais(estado: EstadoBotoeiraDemo):Record<string,boolean|null> {
  return {...estado.saidas,statusProcesso:estado.status==='OPERANDO'};
}

function DiagnosticoFisico({origem,demo,amostra}:{
  origem:OrigemDiagnostico; demo:EstadoBotoeiraDemo; amostra:AmostraLeituraG2|null;
}) {
  const sinais=interpretarSinaisProcesso(origem==='PONTE'?amostra:null);
  const entradas = origem==='PONTE' ? sinais.entradas : origem==='SIMULACAO'
    ? entradasVirtuais(demo) : Object.fromEntries(entradasProcesso.map((s,i)=>[s.id,entradasFotografadas[i].ativo]));
  const saidas = origem==='PONTE' ? sinais.saidas : origem==='SIMULACAO'
    ? saidasVirtuais(demo) : Object.fromEntries(saidasProcesso.map(s=>[s.id,false]));
  const grupos=[{titulo:'Entradas',itens:entradasProcesso,valores:entradas},{titulo:'Saídas',itens:saidasProcesso,valores:saidas}];
  return <div className="real-grid-diagnostico">
    {grupos.map(grupo=><div key={grupo.titulo}><h3>{grupo.titulo}</h3>
      {grupo.itens.map(item=><div className="real-sinal-linha" key={item.id}
        title={item.nome+' | PLC '+item.enderecoPlc+(item.enderecoDb?' | '+item.enderecoDb:' | sem tag confirmada')}>
        <span>{item.nome}</span><Led ativo={grupo.valores[item.id]??null} />
      </div>)}
    </div>)}
  </div>;
}

function TabelaPosicoes({itens,origem}:{
  itens:readonly {nome:string;x:number;y:number}[]; origem:OrigemDiagnostico;
}) {
  return <div className="real-tabela-posicoes">{itens.map(item=><div className="real-posicao-linha" key={item.nome}>
    <span>{item.nome}</span>
    <span>{origem==='PONTE'?'—':formatarMilimetros(item.x)}</span>
    <span>{origem==='PONTE'?'—':formatarMilimetros(item.y)}</span>
  </div>)}</div>;
}
function habilitarManual(demo:EstadoBotoeiraDemo,origem:OrigemDiagnostico) {
  return origem==='SIMULACAO' && demo.status==='PARADA' && demo.modo==='MANUAL' && demo.emergencia==='LIBERADA';
}
function EixoJog({eixo,demo,origem,executar}:{
  eixo:'X'|'Y'; demo:EstadoBotoeiraDemo; origem:OrigemDiagnostico;
  executar:(comando:ComandoBotoeiraDemo)=>void;
}) {
  const habilitado=habilitarManual(demo,origem) && demo.servo[eixo];
  const posicao=origem==='SIMULACAO'?demo.posicao[eixo]:origem==='FOTOGRAFIA'?
    eixosFotografados[eixo==='X'?'x':'y']:null;
  return <div className="real-eixo-jog">
    <h3>Eixo {eixo}</h3>
    <div className="real-valor-eixo">{posicao===null?'—':formatarMilimetros(posicao)}</div>
    <div className="real-par-jog">
      <BotaoDemo comando={eixo==='X'?'JOG_X_MENOS':'JOG_Y_MENOS'} habilitado={habilitado} executar={executar}>JOG -</BotaoDemo>
      <BotaoDemo comando={eixo==='X'?'JOG_X_MAIS':'JOG_Y_MAIS'} habilitado={habilitado} executar={executar}>JOG +</BotaoDemo>
    </div>
  </div>;
}

function ConfiguracoesFisicas({origem,demo,executar}:{
  origem:OrigemDiagnostico; demo:EstadoBotoeiraDemo; executar:(comando:ComandoBotoeiraDemo)=>void;
}) {
  const manual=habilitarManual(demo,origem);
  return <div className="real-configuracoes">
    <div className="real-info-config">
      <BotaoSomenteVisual>Calcular Posições</BotaoSomenteVisual>
      <small>A partir das Posições<br />Lâmina 6 e Mesa</small>
      <p>Funções permitidas se<br />Comutador estiver<br />na Posição Manual</p>
      <BotaoSomenteVisual>Salvar</BotaoSomenteVisual>
    </div>
    <div className="real-laminas">
      <div className="real-tabela-titulos"><span /><span>Eixo X</span><span>Eixo Y</span></div>
      <TabelaPosicoes itens={laminasFotografadas} origem={origem} />
      <BotaoDemo comando="VACUO_MANIPULADOR" habilitado={manual} executar={executar}
        ativo={demo.saidas.vacuoManipulador} className="real-botao-largo">Vácuo Manipulador</BotaoDemo>
    </div>
    <div className="real-destinos">
      <div className="real-tabela-titulos"><span /><span>Eixo X</span><span>Eixo Y</span></div>
      <TabelaPosicoes itens={destinosFotografados} origem={origem} />
      <div className="real-duplo-jog">
        <EixoJog eixo="X" origem={origem} demo={demo} executar={executar} />
        <EixoJog eixo="Y" origem={origem} demo={demo} executar={executar} />
      </div>
      <div className="real-botoes-base">
        <BotaoDemo comando="VACUO_MESA" habilitado={manual} executar={executar} ativo={demo.saidas.vacuoMesa}>Vácuo Mesa</BotaoDemo>
        <BotaoDemo comando="AVANCAR_Z" habilitado={manual} executar={executar} ativo={demo.saidas.avancaZ}>Avança Eixo Z</BotaoDemo>
      </div>
    </div>
  </div>;
}

const acoesSaidas:Record<string,ComandoBotoeiraDemo|null>={
  'Avança Eixo Z':'AVANCAR_Z','Liga Vácuo Manipulador':'VACUO_MANIPULADOR',
  'Liga Vácuo Mesa':'VACUO_MESA','Motor da Esteira 1':'ESTEIRA_1',
  'Motor da Esteira 2':'ESTEIRA_2','Status Processo':null,
};
const estadoSaidas:Record<string,keyof EstadoBotoeiraDemo['saidas']|null>={
  'Avança Eixo Z':'avancaZ','Liga Vácuo Manipulador':'vacuoManipulador',
  'Liga Vácuo Mesa':'vacuoMesa','Motor da Esteira 1':'esteira1',
  'Motor da Esteira 2':'esteira2','Status Processo':null,
};

function ControleEixo({eixo,origem,demo,executar}:{
  eixo:'X'|'Y'; origem:OrigemDiagnostico;demo:EstadoBotoeiraDemo;
  executar:(comando:ComandoBotoeiraDemo)=>void;
}) {
  const manual=habilitarManual(demo,origem);
  const posicao=origem==='SIMULACAO'?demo.posicao[eixo]:origem==='FOTOGRAFIA'?
    eixosFotografados[eixo==='X'?'x':'y']:null;
  return <section className="real-controle-eixo">
    <h2>Elétrico {eixo==='X'?'Horizontal':'Transversal'} (Eixo {eixo})</h2>
    <div className="real-controle-eixo-corpo">
      <div className="real-valor-eixo">{posicao===null?'—':formatarMilimetros(posicao)}</div>
      <div className="real-estados-eixo">
        <BotaoDemo className="real-verde" comando={eixo==='X'?'HOME_X':'HOME_Y'} habilitado={manual && demo.servo[eixo]} executar={executar}>Home</BotaoDemo>
        <BotaoDemo comando={eixo==='X'?'RESET_X':'RESET_Y'} habilitado={manual} executar={executar}>Reset</BotaoDemo>
        <BotaoDemo className="real-verde" comando={eixo==='X'?'SERVO_X':'SERVO_Y'} habilitado={manual} ativo={demo.servo[eixo]} executar={executar}>Servo</BotaoDemo>
      </div>
      <div className="real-par-jog">
        <BotaoDemo comando={eixo==='X'?'JOG_X_MENOS':'JOG_Y_MENOS'} habilitado={manual && demo.servo[eixo]} executar={executar}>JOG -</BotaoDemo>
        <BotaoDemo comando={eixo==='X'?'JOG_X_MAIS':'JOG_Y_MAIS'} habilitado={manual && demo.servo[eixo]} executar={executar}>JOG +</BotaoDemo>
      </div>
    </div>
  </section>;
}

function SaidasManuais({origem,demo,executar}:{
  origem:OrigemDiagnostico; demo:EstadoBotoeiraDemo;
  executar:(comando:ComandoBotoeiraDemo)=>void;
}) {
  const manual=habilitarManual(demo,origem);
  return <div className="real-manual">
    <div className="real-manual-saidas"><h2>Saídas Digitais</h2>
      {saidasFotografadas.map(nome=>{
        const acao=acoesSaidas[nome]??null, campo=estadoSaidas[nome]??null;
        return acao?<BotaoDemo key={nome} comando={acao} ativo={campo?demo.saidas[campo]:false}
          habilitado={manual} executar={executar} className="real-saida-manual">{nome}</BotaoDemo>
          :<BotaoSomenteVisual key={nome} className="real-saida-manual">{nome}</BotaoSomenteVisual>;
      })}
      <p>Funções permitidas se<br />Comutador estiver<br />na Posição Manual</p>
    </div>
    <div className="real-manual-eixos">
      <ControleEixo eixo="X" origem={origem} demo={demo} executar={executar} />
      <ControleEixo eixo="Y" origem={origem} demo={demo} executar={executar} />
    </div>
  </div>;
}

function BotoeiraFisica({estado,origem,executar,segurancaPonte}:{
  estado:EstadoBotoeiraDemo; origem:OrigemDiagnostico;
  executar:(tipo:ComandoBotoeiraDemo)=>void; segurancaPonte:boolean|null;
}) {
  const interativa=origem==='SIMULACAO';
  const emPressionada=estado.emergencia==='PRESSIONADA';
  const segurançaOk=origem==='PONTE'?segurancaPonte:origem==='SIMULACAO'?estado.emergencia==='LIBERADA':true;
  const emergenciaAtiva=origem==='SIMULACAO'?estado.emergencia!=='LIBERADA':origem==='FOTOGRAFIA'?true:null;
  return <aside className="real-botoeira" aria-label="Reprodução da botoeira física">
    <div className="real-botoeira-topo"><div className="real-qr" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="real-logo-grande"><CuboSmart /><b>SMART 4.0</b></div>
    </div>
    <div className="real-comandos-externos">
      <div className="real-botao-externo"><span>SETUP</span><button type="button"
        disabled={!interativa} aria-label={'SETUP virtual: '+estado.modo}
        title="Alternar Manual/Automático somente na demonstração" onClick={()=>executar('SETUP')}
        className="real-comando-aro real-setup real-interativo"><i /></button></div>
      <div className="real-botao-externo"><span>START</span><button type="button" disabled={!interativa}
        aria-label="START — iniciar simulação local" title="Apenas demonstração local"
        onClick={()=>executar('START')} className={'real-comando-aro real-interativo real-start '+(interativa && estado.status==='OPERANDO'?'real-selecionado':'')} /></div>
      <div className="real-botao-externo"><span>STOP</span><button type="button" disabled={!interativa}
        aria-label="STOP — parar simulação local" title="Apenas demonstração local"
        onClick={()=>executar('STOP')} className={'real-comando-aro real-interativo real-stop '+(interativa && estado.status==='PARADA'?'real-selecionado':'')} /></div>
      <div className="real-botao-externo"><button type="button" disabled={!interativa}
        aria-label="RESET — reiniciar simulação local" title="Apenas demonstração local"
        onClick={()=>executar('RESET')} className="real-comando-aro real-interativo real-reset" /><span>RESET</span></div>
      <div className="real-botao-externo"><span className="real-rotulo-inferior">SEGURANÇA<br />OK</span><span
        className={'real-comando-aro '+(segurançaOk===null?'real-luz-apagada':segurançaOk?'real-luz-verde':'real-luz-apagada')}
        role="img" aria-label={segurançaOk===null?'Segurança não informada':segurançaOk?'Condição OK na fonte escolhida':'Condição não OK'} /></div>
      <div className="real-botao-externo"><span className="real-rotulo-inferior">SEGURANÇA<br />ACIONADA</span><span
        className={'real-comando-aro '+(emergenciaAtiva===true?'real-luz-vermelha':'real-luz-apagada')}
        role="img" aria-label={emergenciaAtiva===true?'Luz vermelha na demonstração/foto':'Sinal não demonstrado'} /></div>
    </div>
    <div className={'real-emergencia '+(emPressionada && interativa?'real-emergencia-acionada':'')}>
      <span className="real-emergencia-legenda cima">DESLIGA</span>
      <button type="button" disabled={!interativa}
        aria-label={emPressionada?'Liberar emergência SIMULADA':'Acionar emergência SIMULADA'}
        title="Somente trava da simulação. NÃO substitui o botão físico de emergência."
        onClick={()=>executar(emPressionada?'LIBERAR_EMERGENCIA':'EMERGENCIA')} />
      <span className="real-emergencia-legenda baixo">EMERGÊNCIA</span>
    </div>
  </aside>;
}

/** A réplica nunca envia escrita industrial e não apresenta simulação como telemetria real. */
export function IhmFisica() {
  const [tela,definirTela]=useState<TelaFisica>('INICIO');
  const [demo,executarDemo]=useReducer(reduzirBotoeiraDemo,estadoInicialBotoeira);
  const [origem,definirOrigem]=useState<OrigemDiagnostico>('SIMULACAO');
  const [agora,definirAgora]=useState(()=>new Date());
  const ponte=usarPonteProcesso();
  const amostra=origem==='PONTE' && ponte.atualizada?ponte.amostra:null;
  const seguranca=interpretarSinaisProcesso(amostra).segurancaOk;
  useEffect(()=>{
    const relogio=window.setInterval(()=>definirAgora(new Date()),1000);
    return ()=>window.clearInterval(relogio);
  },[]);
  function mudarFonte(proxima:OrigemDiagnostico) {
    if(proxima!=='PONTE') ponte.desconectar();
    definirOrigem(proxima);
  }
  return <section className="real-area" aria-label="Réplica da estação de processo Smart 4.0">
    <div className="real-aviso"><strong>SPRINT 2 · IHM DE PROCESSO</strong>
      <span>Referência: fotografias, manual N2 e sinais DB101 do Node-RED. Escrita no CLP sempre desabilitada.</span>
    </div>
    <div className="real-seletor-fonte" role="group" aria-label="Fonte dos indicadores da IHM">
      {(Object.keys(origemNomes) as OrigemDiagnostico[]).map(m=><button
        type="button" key={m} aria-pressed={origem===m} onClick={()=>mudarFonte(m)}>{origemNomes[m]}</button>)}
    </div>
    {origem==='PONTE' && <div className="real-ponte-config">
      <label>WebSocket da ponte de leitura (não do CLP)
        <input aria-label="Endereço da ponte de leitura do Processo" type="url" spellCheck={false}
          value={ponte.endereco} onChange={e=>ponte.definirEndereco(e.target.value)}
          disabled={ponte.conexao==='ABERTA'||ponte.conexao==='CONECTANDO'} />
      </label>
      {ponte.conexao==='ABERTA'||ponte.conexao==='CONECTANDO'
        ?<button type="button" onClick={ponte.desconectar}>Desconectar</button>
        :<button type="button" onClick={ponte.conectar}>Conectar ponte G2</button>}
      <p role="status">{ponte.mensagem} {ponte.atualizada
        ? 'Pacote atual da estação de Processo.': 'Valores indisponíveis até receber pacote atual (até 3 s).'}</p>
      <small>Conectar à ponte não comprova que a fonte seja a máquina real. Não existe envio de comandos.</small>
    </div>}
    {origem==='SIMULACAO' && <div className={'real-status-demonstracao '+(demo.status==='OPERANDO'?'operando':'parada')} role="status" aria-live="polite">
      <span className="real-status-ponto" aria-hidden="true" />
      <strong>DEMO: {demo.status==='OPERANDO'?'EM EXECUÇÃO':'PARADA'} · {demo.modo}
        {demo.emergencia!=='LIBERADA'?' · EMERGÊNCIA VIRTUAL':''}</strong>
      <span>{demo.mensagem}</span>
    </div>}
    {origem==='FOTOGRAFIA'&&<p className="real-descricao-fonte">Indicadores e posições são cópias visuais das fotografias, não leituras atuais. Controles desabilitados.</p>}
    <div className="real-rolagem"><div className="real-maquina">
      <div className="real-painel-hmi">
        <div className="real-siemens-borda"><strong>SIEMENS</strong><span>SIMATIC HMI</span><em>TOUCH</em></div>
        <div className="real-display"><CabecalhoTela agora={agora}/>
          {tela==='INICIO'?<nav className="real-menu" aria-label="Menu original da IHM">
            {(['DIAGNOSTICO','CONFIGURACOES','MANUAL'] as const).map(id=><button type="button" key={id} onClick={()=>definirTela(id)}>
              <SimboloMenu tipo={id}/><strong>{id==='DIAGNOSTICO'?'DIAGNÓSTICO':id==='CONFIGURACOES'?'CONFIGURAÇÕES':'MANUAL'}</strong>
            </button>)}
          </nav>:<div className="real-tela-interna">
            <button type="button" className="real-voltar" aria-label="Voltar ao menu inicial" title="Voltar ao menu inicial"
              onClick={()=>definirTela('INICIO')}><svg viewBox="0 0 100 80" fill="none" aria-hidden="true" focusable="false"><path
              d="M46 8L14 40L46 72M84 8L52 40L84 72" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
            {tela==='DIAGNOSTICO'?<DiagnosticoFisico origem={origem} demo={demo} amostra={amostra}/>
              :tela==='CONFIGURACOES'?<ConfiguracoesFisicas origem={origem} demo={demo} executar={executarDemo}/>
              :<SaidasManuais origem={origem} demo={demo} executar={executarDemo}/>}
          </div>}
        </div>
        <div className="real-teclas">{Array.from({length:8},(_,i)=><div key={i}><small>F{i+1}</small><span/></div>)}</div>
      </div>
      <BotoeiraFisica origem={origem} estado={demo} executar={executarDemo} segurancaPonte={seguranca}/>
    </div></div>
    <p className="real-rodape">Modo Manual: pare a demonstração, gire SETUP e habilite Servo antes de JOG ou Home.
      JOG altera apenas posições fictícias, 0,5 mm por clique. Calcular/Salvar permanecem bloqueados
      sem algoritmo validado. Em Ponte G2, ausência de telemetria torna os sinais desconhecidos.</p>
  </section>;
}
