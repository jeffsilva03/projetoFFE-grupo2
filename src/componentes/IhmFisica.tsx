import { useEffect, useState } from 'react';
import {
  entradasFotografadas, saidasFotografadas, laminasFotografadas,
  destinosFotografados, eixosFotografados, formatarMilimetros,
} from '../dados/ihmFisica';
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

function Led({ ativo = false }: { ativo?: boolean }) {
  return <span className={'real-led ' + (ativo ? 'aceso' : '')} aria-label={ativo ? 'Aceso na fotografia' : 'Apagado na fotografia'} />;
}

function BotaoSomenteVisual({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <button className={'real-botao-plc ' + className} disabled title="Reprodução visual: comando real não conectado">{children}</button>;
}

function CabecalhoTela({ agora }: { agora: Date }) {
  return <header className="real-cabecalho">
    <strong>ESTAÇÃO DE PROCESSO</strong>
    <span className="real-marca-central"><CuboSmart /> Smart4.0 <CuboSmart /></span>
    <time dateTime={agora.toISOString()}>{agora.toLocaleTimeString('pt-BR', { hour12: false })}　{agora.toLocaleDateString('pt-BR')}</time>
  </header>;
}

function DiagnosticoFisico() {
  return <div className="real-grid-diagnostico">
    <div><h3>Entradas</h3>{entradasFotografadas.map(entrada => <div className="real-sinal-linha" key={entrada.nome}><span>{entrada.nome}</span><Led ativo={entrada.ativo} /></div>)}</div>
    <div><h3>Saídas</h3>{saidasFotografadas.map(nome => <div className="real-sinal-linha" key={nome}><span>{nome}</span><Led /></div>)}</div>
  </div>;
}

function TabelaPosicoes({ itens }: { itens: readonly { nome: string; x: number; y: number }[] }) {
  return <div className="real-tabela-posicoes">{itens.map(item => <div className="real-posicao-linha" key={item.nome}>
    <span>{item.nome}</span><span>{formatarMilimetros(item.x)}</span><span>{formatarMilimetros(item.y)}</span>
  </div>)}</div>;
}

function EixoJog({ eixo }: { eixo: 'X' | 'Y' }) {
  return <div className="real-eixo-jog">
    <h3>Eixo {eixo}</h3><div className="real-valor-eixo">{formatarMilimetros(eixosFotografados[eixo.toLowerCase() as 'x' | 'y'])}</div>
    <div className="real-par-jog"><BotaoSomenteVisual>JOG -</BotaoSomenteVisual><BotaoSomenteVisual>JOG +</BotaoSomenteVisual></div>
  </div>;
}

function ConfiguracoesFisicas() {
  return <div className="real-configuracoes">
    <div className="real-info-config">
      <BotaoSomenteVisual>Calcular Posições</BotaoSomenteVisual>
      <small>A partir das Posições<br />Lâmina 6 e Mesa</small>
      <p>Funções permitidas se<br />Comutador estiver<br />na Posição Manual</p>
      <BotaoSomenteVisual>Salvar</BotaoSomenteVisual>
    </div>
    <div className="real-laminas">
      <div className="real-tabela-titulos"><span /><span>Eixo X</span><span>Eixo Y</span></div>
      <TabelaPosicoes itens={laminasFotografadas} />
      <BotaoSomenteVisual className="real-botao-largo">Vácuo Manipulador</BotaoSomenteVisual>
    </div>
    <div className="real-destinos">
      <div className="real-tabela-titulos"><span /><span>Eixo X</span><span>Eixo Y</span></div>
      <TabelaPosicoes itens={destinosFotografados} />
      <div className="real-duplo-jog"><EixoJog eixo="X" /><EixoJog eixo="Y" /></div>
      <div className="real-botoes-base"><BotaoSomenteVisual>Vácuo Mesa</BotaoSomenteVisual><BotaoSomenteVisual>Avança Eixo Z</BotaoSomenteVisual></div>
    </div>
  </div>;
}

function SaidasManuais() {
  return <div className="real-manual">
    <div className="real-manual-saidas"><h2>Saídas Digitais</h2>
      {saidasFotografadas.map(nome => <BotaoSomenteVisual className="real-saida-manual" key={nome}>{nome}</BotaoSomenteVisual>)}
      <p>Funções permitidas se<br />Comutador estiver<br />na Posição Manual</p>
    </div>
    <div className="real-manual-eixos">
      {(['X','Y'] as const).map(eixo => <section className="real-controle-eixo" key={eixo}>
        <h2>Elétrico {eixo === 'X' ? 'Horizontal' : 'Transversal'} (Eixo {eixo})</h2>
        <div className="real-controle-eixo-corpo">
          <div className="real-valor-eixo">{formatarMilimetros(eixosFotografados[eixo.toLowerCase() as 'x' | 'y'])}</div>
          <div className="real-estados-eixo"><BotaoSomenteVisual className="real-verde">Home</BotaoSomenteVisual><BotaoSomenteVisual>Reset</BotaoSomenteVisual><BotaoSomenteVisual className="real-verde">Servo</BotaoSomenteVisual></div>
          <div className="real-par-jog"><BotaoSomenteVisual>JOG -</BotaoSomenteVisual><BotaoSomenteVisual>JOG +</BotaoSomenteVisual></div>
        </div>
      </section>)}
    </div>
  </div>;
}

function BotoeiraFisica() {
  return <aside className="real-botoeira" aria-label="Reprodução da botoeira física">
    <div className="real-botoeira-topo"><div className="real-qr" aria-hidden="true"><i /><i /><i /><i /></div><div className="real-logo-grande"><CuboSmart /><b>SMART 4.0</b></div></div>
    <div className="real-comandos-externos">
      <div className="real-botao-externo"><span>SETUP</span><button disabled aria-label="Seletor SETUP — reprodução visual" className="real-comando-aro real-setup"><i /></button></div>
      <div className="real-botao-externo"><span>START</span><button disabled aria-label="START — reprodução visual" className="real-comando-aro real-start" /></div>
      <div className="real-botao-externo"><span>STOP</span><button disabled aria-label="STOP — reprodução visual" className="real-comando-aro real-stop" /></div>
      <div className="real-botao-externo"><button disabled aria-label="RESET — reprodução visual" className="real-comando-aro real-reset" /><span>RESET</span></div>
      <div className="real-botao-externo"><span className="real-rotulo-inferior">SEGURANÇA<br />OK</span><span className="real-comando-aro real-luz-verde" role="img" aria-label="Luz verde de segurança acesa na foto" /></div>
      <div className="real-botao-externo"><span className="real-rotulo-inferior">SEGURANÇA<br />ACIONADA</span><span className="real-comando-aro real-luz-vermelha" role="img" aria-label="Luz vermelha de segurança acesa na foto" /></div>
    </div>
    <div className="real-emergencia"><span>DESLIGA<br />EMERGÊNCIA</span><button disabled aria-label="Botão de emergência — reprodução visual" /></div>
  </aside>;
}

/**
 * Réplica de interface, independente da camada de comandos do simulador.
 * Nunca enviar comandos aos eixos, esteiras ou emergência a partir desta tela.
 */
export function IhmFisica() {
  const [tela, definirTela] = useState<TelaFisica>('INICIO');
  const [agora, definirAgora] = useState(() => new Date());
  useEffect(() => {
    const relogio = window.setInterval(() => definirAgora(new Date()), 1000);
    return () => window.clearInterval(relogio);
  }, []);
  return <section className="real-area" aria-label="Réplica da estação de processo Smart 4.0">
    <div className="real-aviso"><strong>RÉPLICA VISUAL DAS FOTOS</strong><span>Dados fotografados · Sem telemetria ao vivo · Comandos de movimento e segurança desabilitados</span></div>
    <div className="real-rolagem"><div className="real-maquina">
      <div className="real-painel-hmi">
        <div className="real-siemens-borda"><strong>SIEMENS</strong><span>SIMATIC HMI</span><em>TOUCH</em></div>
        <div className="real-display"><CabecalhoTela agora={agora} />
          {tela === 'INICIO' ? <nav className="real-menu" aria-label="Menu original da IHM">
            {(['DIAGNOSTICO','CONFIGURACOES','MANUAL'] as const).map(id => <button key={id} onClick={() => definirTela(id)}>
              <SimboloMenu tipo={id} /><strong>{id === 'DIAGNOSTICO' ? 'DIAGNÓSTICO' : id === 'CONFIGURACOES' ? 'CONFIGURAÇÕES' : 'MANUAL'}</strong>
            </button>)}
          </nav> : <div className="real-tela-interna">
            <button className="real-voltar" aria-label="Voltar ao menu inicial" onClick={() => definirTela('INICIO')}>❮❮</button>
            {tela === 'DIAGNOSTICO' ? <DiagnosticoFisico /> : tela === 'CONFIGURACOES' ? <ConfiguracoesFisicas /> : <SaidasManuais />}
          </div>}
        </div>
        <div className="real-teclas">{Array.from({ length: 8 }, (_, i) => <div key={i}><small>F{i+1}</small><span /></div>)}</div>
      </div>
      <BotoeiraFisica />
    </div></div>
    <p className="real-rodape">Telas reproduzidas: menu inicial, diagnóstico, posições dos eixos e manual. A futura ligação com as tags do CLP depende da lista de endereços validada pelo professor.</p>
  </section>;
}
