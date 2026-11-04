import { useCallback, useEffect, useRef, useState } from 'react';
import { lerAmostraG2, pacoteAtualG2 } from '../servicos/leituraG2';
import { validarUrlPonteG2 } from '../servicos/urlPonteG2';
import type { AmostraLeituraG2 } from '../tipos/leituraG2';

type Conexao = 'DESLIGADA' | 'CONECTANDO' | 'ABERTA' | 'FALHA';

/**
 * Canal exclusivamente de leitura com a ponte existente.
 * Nenhum socket.send; nenhum protocolo de PLC no navegador.
 */
export function usarPonteProcesso() {
  const [conexao,definirConexao]=useState<Conexao>('DESLIGADA');
  const [endereco,definirEndereco]=useState(import.meta.env.VITE_G2_WS_URL || 'ws://localhost:8092/telemetria');
  const [amostra,definirAmostra]=useState<AmostraLeituraG2|null>(null);
  const [recebidaEm,definirRecebidaEm]=useState(0);
  const [agora,definirAgora]=useState(()=>Date.now());
  const [mensagem,definirMensagem]=useState('Ponte não conectada.');
  const socketRef=useRef<WebSocket|null>(null);

  const encerrar=useCallback(()=>{
    const socket=socketRef.current;
    socketRef.current=null;
    if(socket){
      socket.onopen=null; socket.onmessage=null; socket.onerror=null; socket.onclose=null;
      socket.close();
    }
  },[]);
  const desconectar=useCallback(()=>{
    encerrar(); definirConexao('DESLIGADA'); definirAmostra(null);
    definirRecebidaEm(0); definirMensagem('Ponte desconectada. Valores não disponíveis.');
  },[encerrar]);
  const conectar=useCallback(()=>{
    let url:string;
    try { url=validarUrlPonteG2(endereco,window.location.protocol==='https:'); }
    catch(error){
      definirConexao('FALHA');
      definirMensagem(error instanceof Error?error.message:'Endereço de ponte inválido.');
      return;
    }
    encerrar(); definirAmostra(null); definirRecebidaEm(0);
    definirConexao('CONECTANDO'); definirMensagem('Conectando à ponte G2...');
    let socket:WebSocket;
    try { socket=new WebSocket(url); }
    catch { definirConexao('FALHA'); definirMensagem('Não foi possível criar WebSocket.'); return; }
    socketRef.current=socket;
    const atual=()=>socketRef.current===socket;
    socket.onopen=()=>{
      if(!atual())return;
      definirConexao('ABERTA'); definirMensagem('Ponte aberta. Aguardando telemetria de Processo.');
    };
    socket.onmessage=evento=>{
      if(!atual())return;
      try{
        if(typeof evento.data!=='string') throw Error('Mensagem inválida');
        const dados=lerAmostraG2(evento.data);
        if(dados.estacao!=='PROCESSO')return; // A ponte publica as quatro estações
        const momento=Date.now();
        if(!pacoteAtualG2(dados.timestamp,momento))throw Error('Pacote antigo');
        definirAmostra(dados); definirRecebidaEm(momento);
        definirMensagem('Pacote de Processo recebido. Fonte validada apenas quanto ao formato.');
      }catch{
        definirAmostra(null); definirRecebidaEm(0);
        definirMensagem('Pacote inválido de Processo: leitura ocultada.');
      }
    };
    socket.onerror=()=>{
      if(!atual())return;
      definirConexao('FALHA'); definirAmostra(null); definirRecebidaEm(0);
      definirMensagem('Falha na comunicação com a ponte.');
    };
    socket.onclose=()=>{
      if(!atual())return;
      socketRef.current=null; definirConexao('FALHA');
      definirAmostra(null); definirRecebidaEm(0); definirMensagem('Ponte desconectada.');
    };
  },[endereco,encerrar]);
  useEffect(()=>{
    const timer=window.setInterval(()=>definirAgora(Date.now()),250);
    return ()=>{window.clearInterval(timer);encerrar();};
  },[encerrar]);
  const atualizada=conexao==='ABERTA' && amostra!==null && recebidaEm>0
    && agora-recebidaEm<=3000 && pacoteAtualG2(amostra.timestamp,agora);
  return {conexao,endereco,definirEndereco,amostra,atualizada,mensagem,conectar,desconectar};
}
