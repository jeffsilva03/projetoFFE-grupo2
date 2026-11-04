import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ENDERECO_TESTE, PROTOCOLO_TESTE, lerMensagemTeste,
  type ComandoTeste, type EstadoTeste, type SegurancaTeste,
} from '../servicos/protocoloTesteComandos';

type Conexao = 'DESLIGADA' | 'CONECTANDO' | 'CONECTADA' | 'ERRO';
type Fase = 'ENVIADA' | 'ACK';
type Pendente = {
  id: string; comando: ComandoTeste; esperado: EstadoTeste; ack: boolean; timer: number;
};
export interface EventoComando {
  id: string; horario: string; texto: string; etapa: 'SOLICITACAO' | 'ACK' | 'CONFIRMACAO' | 'RECUSADO' | 'ERRO' | 'INFO';
}
const LIMITE_TELEMETRIA_MS = 3000;
const TIMEOUT_COMANDO_MS = 4500;

/**
 * WebSocket fixo e exclusivamente localhost. Este hook não recebe URLs externas,
 * não usa IP da planta e nunca envia RESET, JOG, comandos S7 ou emergência.
 */
export function usarTesteComandos() {
  const [conexao, definirConexao] = useState<Conexao>('DESLIGADA');
  const [estado, definirEstado] = useState<EstadoTeste | null>(null);
  const [seguranca, definirSeguranca] = useState<SegurancaTeste | null>(null);
  const [recebidaEm, definirRecebidaEm] = useState(0);
  const [agora, definirAgora] = useState(Date.now());
  const [fase, definirFase] = useState<Fase | null>(null);
  const [comandoPendente, definirComandoPendente] = useState<ComandoTeste | null>(null);
  const [mensagem, definirMensagem] = useState('Desconectado do simulador local de comandos.');
  const [historico, definirHistorico] = useState<EventoComando[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const handshakeRef = useRef(false);
  const pendenteRef = useRef<Pendente | null>(null);
  const sequenciaRef = useRef(0);
  const ultimaLeituraRef = useRef(0);

  const evento = useCallback((etapa: EventoComando['etapa'], texto: string) => {
    definirHistorico(v => [{
      id: crypto.randomUUID(), horario: new Date().toLocaleTimeString('pt-BR'),
      etapa, texto,
    }, ...v].slice(0, 14));
  }, []);

  const limparPendente = useCallback(() => {
    if (pendenteRef.current) window.clearTimeout(pendenteRef.current.timer);
    pendenteRef.current = null;
    definirFase(null);
    definirComandoPendente(null);
  }, []);

  const encerrar = useCallback(() => {
    const ws=socketRef.current;
    socketRef.current=null;
    handshakeRef.current=false;
    sequenciaRef.current=0;
    ultimaLeituraRef.current=0;
    limparPendente();
    if(ws) {
      ws.onopen=null; ws.onmessage=null; ws.onerror=null; ws.onclose=null;
      ws.close();
    }
  }, [limparPendente]);

  const desconectar = useCallback(() => {
    encerrar();
    definirConexao('DESLIGADA');
    definirEstado(null); definirSeguranca(null); definirRecebidaEm(0);
    definirMensagem('Simulador desconectado. Nenhuma confirmação antiga será reutilizada.');
  }, [encerrar]);

  const conectar = useCallback(() => {
    if (window.location.protocol !== 'http:' ||
        !['localhost','127.0.0.1'].includes(window.location.hostname)) {
      definirMensagem('Teste disponível apenas em http://localhost:8081 no computador local.');
      definirConexao('ERRO');
      return;
    }
    encerrar(); definirEstado(null); definirSeguranca(null); definirRecebidaEm(0);
    definirConexao('CONECTANDO'); definirMensagem('Conectando ao mock local; aguardando identificação do servidor...');
    let ws: WebSocket;
    try { ws = new WebSocket(ENDERECO_TESTE); }
    catch { definirConexao('ERRO'); definirMensagem('Não foi possível criar WebSocket do mock.'); return; }
    socketRef.current=ws;
    const atual=()=>socketRef.current===ws;
    const falhar=(motivo:string)=>{
      if(!atual())return;
      encerrar(); definirEstado(null); definirSeguranca(null); definirRecebidaEm(0);
      definirConexao('ERRO'); definirMensagem(motivo); evento('ERRO',motivo);
    };
    ws.onopen=()=>{ if(atual()) definirMensagem('WebSocket aberto; conferindo o protocolo do simulador.'); };
    ws.onmessage=(evt)=>{
      if(!atual())return;
      let m:ReturnType<typeof lerMensagemTeste>;
      try {
        if(typeof evt.data!=='string') throw Error('Payload não textual.');
        m=lerMensagemTeste(evt.data);
      } catch { falhar('Resposta inválida ou vencida: sessão de teste encerrada.');return; }
      if(m.tipo==='MOCK_HELLO') {
        if(handshakeRef.current) { falhar('Handshake duplicado.');return; }
        handshakeRef.current=true;
        sequenciaRef.current=m.sequencia;
        definirConexao('CONECTADA');
        definirMensagem('Mock local confirmado. Aguardando telemetria inicial.');
        evento('INFO','Handshake com simulador local confirmado; nenhum dispositivo industrial foi contatado.');
        return;
      }
      if(!handshakeRef.current) { falhar('Resposta recebida antes do handshake.');return; }
      if(m.tipo==='COMMAND_ACK') {
        const p=pendenteRef.current;
        if(!p || p.id!==m.id || p.comando!==m.comando || p.ack) return;
        if(!m.aceito) {
          limparPendente(); definirMensagem(m.motivo); evento('RECUSADO',m.comando+': '+m.motivo);
        } else {
          p.ack=true; definirFase('ACK');
          definirMensagem(m.comando+': ACK recebido, aguardando confirmação na telemetria.');
          evento('ACK',m.comando+': recebido pelo mock, aguardando estado '+p.esperado+'.');
        }
        return;
      }
      if(m.sequencia<=sequenciaRef.current) return;
      sequenciaRef.current=m.sequencia;
      ultimaLeituraRef.current=Date.now();
      definirRecebidaEm(ultimaLeituraRef.current);
      definirEstado(m.estado); definirSeguranca(m.seguranca);
      const p=pendenteRef.current;
      if(p && m.id===p.id && p.ack) {
        if(m.estado!==p.esperado || (p.comando==='START'&&m.seguranca!=='OK')) {
          falhar('Telemetria divergente da solicitação '+p.comando+'; confirmação negada.');
          return;
        }
        limparPendente();
        definirMensagem(p.comando+': estado '+m.estado+' confirmado pela telemetria do mock.');
        evento('CONFIRMACAO',p.comando+': '+m.estado+' confirmado (seq '+m.sequencia+').');
      } else if(!p) {
        definirMensagem('Telemetria demonstrativa atualizada pelo servidor local.');
      }
    };
    ws.onerror=()=>falhar('Falha no WebSocket local de comandos.');
    ws.onclose=()=>falhar('Simulador de comandos desconectado; estados invalidados.');
  },[encerrar,evento,limparPendente]);

  const enviar=useCallback((comando:ComandoTeste)=>{
    const ws=socketRef.current;
    if(!ws||ws.readyState!==WebSocket.OPEN||!handshakeRef.current ||
       ultimaLeituraRef.current===0 || Date.now()-ultimaLeituraRef.current>LIMITE_TELEMETRIA_MS
       || pendenteRef.current) return;
    const id=crypto.randomUUID();
    const timer=window.setTimeout(()=>{
      if(pendenteRef.current?.id!==id)return;
      const motivo='Sem ACK ou confirmação de '+comando+' em 4,5 s. Reconecte para testar novamente.';
      encerrar(); definirConexao('ERRO'); definirEstado(null); definirSeguranca(null); definirRecebidaEm(0);
      definirMensagem(motivo); evento('ERRO',motivo);
    },TIMEOUT_COMANDO_MS);
    pendenteRef.current={
      id, comando, esperado:comando==='START'?'EM_EXECUCAO':'PARADA',
      ack:false,timer,
    };
    definirFase('ENVIADA'); definirComandoPendente(comando);
    definirMensagem(comando+': solicitação enviada ao simulador; aguardando ACK.');
    evento('SOLICITACAO',comando+': id '+id.slice(0,8)+' enviado ao mock local.');
    try {
      ws.send(JSON.stringify({tipo:'COMMAND_REQUEST',protocolo:PROTOCOLO_TESTE,id,comando}));
    } catch {
      encerrar(); definirConexao('ERRO'); definirMensagem('Não foi possível enviar ao simulador.');
      evento('ERRO','Falha de envio da solicitação '+comando+'.');
    }
  },[encerrar,evento]);

  const simularSeguranca = useCallback((bloquear:boolean)=>{
    const ws=socketRef.current;
    if(!ws||ws.readyState!==WebSocket.OPEN||!handshakeRef.current||
      ultimaLeituraRef.current===0||Date.now()-ultimaLeituraRef.current>LIMITE_TELEMETRIA_MS||
      pendenteRef.current) return;
    const cenario=bloquear?'SEGURANCA_BLOQUEADA':'NORMAL';
    try {
      ws.send(JSON.stringify({tipo:'SCENARIO_SET',protocolo:PROTOCOLO_TESTE,cenario}));
      evento('INFO',bloquear?'Falha virtual solicitada. O mock deve impedir START.':'Restabelecimento virtual solicitado.');
    } catch {
      encerrar(); definirConexao('ERRO'); definirMensagem('Falha ao atualizar cenário virtual.');
    }
  },[encerrar,evento]);

  useEffect(()=>{
    const timer=window.setInterval(()=>definirAgora(Date.now()),250);
    return ()=>{window.clearInterval(timer);encerrar();};
  },[encerrar]);
  const atualizada=conexao==='CONECTADA'&&recebidaEm>0&&agora-recebidaEm<=LIMITE_TELEMETRIA_MS;
  return {
    conexao, estado:atualizada?estado:null,seguranca:atualizada?seguranca:null,
    atualizada, mensagem, fase, comandoPendente, historico,
    conectar,desconectar,enviar,simularSeguranca,
    podeEnviar:atualizada&&!comandoPendente,
  };
}
