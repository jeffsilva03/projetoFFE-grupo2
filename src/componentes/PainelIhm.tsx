import { useState } from 'react';
import type { AbaPainel, EstadoOperacional } from '../tipos/maquina';
import type { PropriedadesControle } from '../tipos/conexao';
import { segurancaOk } from '../estado/simulacao';
import { coresEstados, nomesEstados } from './IndicadorEstado';
import { Icone } from './Icone';
import { Movimentacao } from './Movimentacao';
import { ParametrosProducao } from './ParametrosProducao';
import { Diagnostico } from './Diagnostico';
const abas = [{ id: 'CONTROLE', nome: 'Controle', icone: 'painel' }, { id: 'PARAMETROS', nome: 'Parâmetros', icone: 'ajustes' }, { id: 'DIAGNOSTICO', nome: 'Diagnóstico', icone: 'escudo' }] as const;
export function PainelIhm({ maquina, enviar, fonte }: PropriedadesControle) {
  const [aba, alterarAba] = useState<AbaPainel>('CONTROLE');
  return <section className="ihm-dispositivo" aria-label="IHM Siemens SIMATIC">
    <div className="ihm-parafuso superior-esquerdo" /><div className="ihm-parafuso superior-direito" /><div className="ihm-parafuso inferior-esquerdo" /><div className="ihm-parafuso inferior-direito" />
    <div className="ihm-marca"><span className="ihm-siemens">SIEMENS</span><span>SIMATIC <b>HMI</b></span></div>
    <div className="ihm-tela">
      <header className="ihm-cabecalho-tela"><div><span className="ihm-microtexto">ESTAÇÃO SMART 4.0</span><h2>Controle da máquina</h2></div><span className="ihm-modo-atual"><i />{!fonte.disponivel ? 'Sem telemetria' : maquina.modo === 'AUTOMATICO' ? 'Automático' : maquina.modo === 'MANUAL' ? 'Manual' : 'Manutenção'}</span></header>
      <nav className="ihm-abas" aria-label="Telas da IHM">{abas.map(item => <button key={item.id} aria-current={aba === item.id ? 'page' : undefined} className={aba === item.id ? 'ativa' : ''} onClick={() => alterarAba(item.id)}><Icone nome={item.icone} tamanho={16} />{item.nome}</button>)}</nav>
      <div className="ihm-conteudo-tela">
        {aba === 'CONTROLE' && <>
          <div className="ihm-visao-controle"><section className="ihm-estados"><div className="ihm-titulo-secao"><span>Estado do sistema</span></div>
            {(Object.keys(nomesEstados) as EstadoOperacional[]).map(estado => <div key={estado} className={`ihm-linha-estado ${fonte.disponivel && maquina.estado === estado ? `selecionada ${coresEstados[estado]}` : ''}`}><i className="ihm-led" /><span>{nomesEstados[estado]}</span>{fonte.disponivel && maquina.estado === estado && <Icone nome="confirmar" tamanho={15} />}</div>)}
            <div className={`ihm-circuito ${!fonte.disponivel ? 'texto-neutro' : segurancaOk(maquina) && maquina.estado !== 'EMERGENCIA' && maquina.estado !== 'FALHA_SEGURANCA' ? 'texto-verde' : 'texto-vermelho'}`}><Icone nome="escudo" tamanho={17} /><span>{!fonte.disponivel ? 'Segurança indisponível' : segurancaOk(maquina) && maquina.estado !== 'EMERGENCIA' && maquina.estado !== 'FALHA_SEGURANCA' ? 'Segurança normal' : 'Segurança bloqueada'}</span></div>
          </section><Movimentacao maquina={maquina} enviar={enviar} fonte={fonte} /></div>
          <div className="ihm-telemetria"><div><span>Pressão pneumática</span><strong>{fonte.disponivel ? maquina.pressao.toFixed(1).replace('.', ',') : '—'}<small>bar</small></strong></div><div><span>Velocidade atual</span><strong>{!fonte.disponivel ? '—' : fonte.remota ? fonte.telemetria?.velocidadeEsteiraAtual ?? '—' : maquina.estado === 'OPERANDO' ? maquina.parametros.velocidade : 0}<small>%</small></strong></div><div><span>{fonte.remota ? 'Total peças · Expedição' : 'Produção do lote'}</span><strong>{!fonte.disponivel ? '—' : fonte.remota ? fonte.telemetria?.totalPecas ?? '—' : String(maquina.produzidas).padStart(2, '0')}{!fonte.remota && <small>/ {maquina.parametros.quantidade}</small>}</strong></div></div>
        </>}
        {aba === 'PARAMETROS' && <ParametrosProducao maquina={maquina} enviar={enviar} fonte={fonte} />}
        {aba === 'DIAGNOSTICO' && <Diagnostico maquina={maquina} enviar={enviar} fonte={fonte} />}
      </div>
      <footer className="ihm-rodape-tela"><span><i />{fonte.remota ? fonte.disponivel ? 'Telemetria do simulador' : 'Telemetria indisponível' : 'Simulação local'}</span><span>IHM · GRUPO 02</span></footer>
    </div>
    <div className="ihm-teclas-fisicas">{abas.map((item, indice) => <div key={item.id}><span>F{indice + 1}</span><button aria-label={`Abrir ${item.nome} pela tecla F${indice + 1}`} aria-pressed={aba === item.id} onClick={() => alterarAba(item.id)}><Icone nome={item.icone} tamanho={19} /></button></div>)}<div className="ihm-identificacao-modelo"><span>PAINEL DE OPERAÇÃO</span><b>SMART HMI</b></div></div>
  </section>;
}
