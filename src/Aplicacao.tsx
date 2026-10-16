import { useEffect, useRef, useState } from 'react';
import { usarMaquina } from './estado/usarMaquina';
import { PainelIhm } from './componentes/PainelIhm';
import { Botoeira } from './componentes/Botoeira';
import { ConexaoSimulador, nomesConexao } from './componentes/ConexaoSimulador';
import { IndicadorEstado } from './componentes/IndicadorEstado';
import { LeituraG2 } from './componentes/LeituraG2';
import { Icone, SimboloSmart } from './componentes/Icone';
import './estilos/tema-professor.css';
import './estilos/painel.css';
import './estilos/leitura-g2.css';

export function Aplicacao() {
  const { maquina, enviar, fonte, conectar, desconectar, usarLocal } = usarMaquina();
  const [hora, alterarHora] = useState(new Date());
  const [visao, alterarVisao] = useState<'SIMULADOR' | 'LEITURA'>('SIMULADOR');
  const [telaCheia, alterarTelaCheia] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const temporizador = window.setInterval(() => alterarHora(new Date()), 1000);
    const acompanhar = () => alterarTelaCheia(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', acompanhar);
    return () => { window.clearInterval(temporizador); document.removeEventListener('fullscreenchange', acompanhar); };
  }, []);
  return <div className="ihm-smart40" ref={raiz}>
    <header className="ihm-barra-superior"><a className="ihm-identidade" href="#painel" aria-label="Ir para o painel de controle"><SimboloSmart /><div><strong>SMART <b>4.0</b></strong><span>Estação de controle</span></div></a><div className="ihm-contexto"><span>GRUPO 02</span><i /><span>IHM SIEMENS</span></div><div className="ihm-ferramentas"><span className={`ihm-simulacao ${fonte.estadoConexao === 'CONECTADO' ? 'conectado' : ''}`}><i />{visao === 'LEITURA' ? 'Leitura de teste G2' : nomesConexao[fonte.estadoConexao]}</span>{document.fullscreenEnabled && <button aria-label={telaCheia ? 'Sair da tela cheia' : 'Abrir tela cheia'} onClick={async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await raiz.current?.requestFullscreen(); } catch { /* A interface continua disponível caso o navegador bloqueie. */ } }}><Icone nome="expandir" tamanho={19} /></button>}</div></header>
    <main className="ihm-principal" id="painel">
      <div className="ihm-titulo-pagina"><div><span className="ihm-sobretitulo">PAINEL DO OPERADOR</span><h1>{visao === 'LEITURA' ? 'Leitura dos sinais do G2' : 'Controle da estação'}</h1><p>{visao === 'LEITURA' ? 'Acompanhe sinais de teste com os nomes das variáveis do Node-RED.' : 'Interface digital da IHM e da botoeira de segurança.'}</p></div><div className="ihm-estado-global"><span>ESTADO GLOBAL</span>{visao === 'LEITURA' ? <span className="ihm-etiqueta neutro">Somente leitura · Teste</span> : fonte.disponivel ? <IndicadorEstado estado={maquina.estado} /> : <span className="ihm-etiqueta neutro">Estado indisponível</span>}</div></div>
      <nav className="ihm-escolha-fonte" aria-label="Ambientes do Grupo 2">
        <button aria-pressed={visao === 'SIMULADOR'} onClick={() => alterarVisao('SIMULADOR')}>Sprint 1 · Simulador</button>
        <button aria-pressed={visao === 'LEITURA'} onClick={() => { usarLocal(); alterarVisao('LEITURA'); }}>Sprint 2 · Leitura de sinais</button>
      </nav>
      {visao === 'SIMULADOR' ? <>
      <ConexaoSimulador fonte={fonte} conectar={conectar} desconectar={desconectar} usarLocal={usarLocal} />
      <div className="ihm-gabinete">
        <div className="ihm-legendas-gabinete"><span><b>01</b> INTERFACE IHM · SIMATIC</span><span><b>02</b> BOTOEIRA DE CONTROLE</span></div>
        <div className="ihm-equipamento"><PainelIhm maquina={maquina} enviar={enviar} fonte={fonte} /><Botoeira maquina={maquina} enviar={enviar} fonte={fonte} /></div>
        <div className={`ihm-feedback ${maquina.estado === 'EMERGENCIA' ? 'emergencia' : maquina.estado === 'FALHA_SEGURANCA' ? 'falha' : ''}`}><div className="ihm-feedback-icone"><Icone nome={maquina.estado === 'EMERGENCIA' || maquina.estado === 'FALHA_SEGURANCA' ? 'alarme' : 'informacao'} tamanho={18} /></div><div><span>MENSAGEM DO SISTEMA</span><p role="status" aria-live="polite">{maquina.mensagem}</p></div><time dateTime={hora.toISOString()}>{hora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time></div>
      </div>
      </> : <LeituraG2 />}
      <footer className="ihm-rodape-pagina"><span><Icone nome="escudo" tamanho={14} />{visao === 'LEITURA' ? 'Aquisição G2 · Fonte local de teste · Sem conexão com a planta' : fonte.remota ? 'Simulador WebSocket · Sem conexão com a planta física' : 'Ambiente de simulação local · Sem conexão com a planta'}</span><span>SMART 4.0 <i />Grupo 2 — IHM / Botões</span></footer>
    </main>
  </div>;
}
