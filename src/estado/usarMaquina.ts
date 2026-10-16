import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { estadoInicial, possuiBloqueio, reduzirMaquina } from './simulacao';
import { acaoSuportada, acoesDoMock, condicaoAposComando, montarUrlSimulador, lerTelemetria, type AcaoRemota } from '../servicos/protocoloSimulador';
import { normalizarTelemetriaSimulador } from '../servicos/normalizacaoMaquina';
import type { AcaoMaquina } from '../tipos/maquina';
import type { EstadoConexao, FonteDados, TelemetriaSimulador } from '../tipos/conexao';

export function usarMaquina() {
  const [maquinaLocal, enviarLocal] = useReducer(reduzirMaquina, estadoInicial);
  const [remota, alterarRemota] = useState(false);
  const [estadoConexao, alterarEstadoConexao] = useState<EstadoConexao>('LOCAL');
  const [telemetria, alterarTelemetria] = useState<TelemetriaSimulador | null>(null);
  const [mensagemRemota, alterarMensagemRemota] = useState('Aguardando conexão ao simulador.');
  const [comandoPendente, alterarComandoPendente] = useState<string | null>(null);
  const socketAtual = useRef<WebSocket | null>(null);
  const origemRemota = useRef(false);
  const estadoAtual = useRef<EstadoConexao>('LOCAL');
  const dadosAtuais = useRef<TelemetriaSimulador | null>(null);
  const ultimaRecepcao = useRef(0);
  const temporizadorConexao = useRef<number | null>(null);
  const pendente = useRef<{ acao: AcaoRemota; temporizador: number } | null>(null);
  const definirEstado = useCallback((estado: EstadoConexao) => { estadoAtual.current = estado; alterarEstadoConexao(estado); }, []);
  const limparPendente = useCallback(() => {
    if (pendente.current) window.clearTimeout(pendente.current.temporizador);
    pendente.current = null; alterarComandoPendente(null);
  }, []);
  const encerrarSocket = useCallback(() => {
    if (temporizadorConexao.current !== null) window.clearTimeout(temporizadorConexao.current);
    temporizadorConexao.current = null;
    const socket = socketAtual.current; socketAtual.current = null;
    if (socket) { socket.onopen = null; socket.onmessage = null; socket.onerror = null; socket.onclose = null; socket.close(); }
    limparPendente();
  }, [limparPendente]);
  const conectar = useCallback((endereco: string, token: string) => {
    let url: string;
    try { url = montarUrlSimulador(endereco, token); }
    catch (erro) { return erro instanceof Error ? erro.message : 'Endereço inválido.'; }
    if (window.location.protocol === 'https:' && url.startsWith('ws:')) return 'Esta página HTTPS exige wss://. Para o mock local, use http://localhost:8081.';
    encerrarSocket(); enviarLocal({ tipo: 'PARAR' }); origemRemota.current = true; alterarRemota(true);
    alterarTelemetria(null); dadosAtuais.current = null; ultimaRecepcao.current = 0;
    definirEstado('CONECTANDO'); alterarMensagemRemota('Conectando ao simulador e aguardando a primeira telemetria...');
    let socket: WebSocket;
    try { socket = new WebSocket(url); }
    catch { definirEstado('ERRO'); alterarMensagemRemota('Não foi possível abrir a conexão. Verifique a URL.'); return null; }
    socketAtual.current = socket;
    const atual = () => socketAtual.current === socket;
    temporizadorConexao.current = window.setTimeout(() => {
      if (!atual() || ultimaRecepcao.current !== 0) return;
      encerrarSocket(); definirEstado('ERRO'); alterarMensagemRemota('Sem telemetria inicial. Verifique servidor, endereço, token e origem. Tente reconectar.');
    }, 5000);
    socket.onopen = () => { if (atual()) alterarMensagemRemota('Conexão aberta. Aguardando dados válidos do simulador...'); };
    socket.onmessage = evento => {
      if (!atual()) return;
      let dados: TelemetriaSimulador;
      try { if (typeof evento.data !== 'string') throw new Error('Formato inválido.'); dados = lerTelemetria(evento.data); }
      catch { limparPendente(); definirEstado('SEM_TELEMETRIA'); alterarMensagemRemota('Telemetria inválida recebida. Comandos bloqueados até receber dados válidos.'); return; }
      const recuperada = estadoAtual.current !== 'CONECTADO';
      ultimaRecepcao.current = Date.now(); dadosAtuais.current = dados; alterarTelemetria(dados); definirEstado('CONECTADO');
      if (temporizadorConexao.current !== null) { window.clearTimeout(temporizadorConexao.current); temporizadorConexao.current = null; }
      if (pendente.current && condicaoAposComando(pendente.current.acao, dados)) {
        const nome = acoesDoMock[pendente.current.acao]; limparPendente();
        alterarMensagemRemota(`Telemetria após ${nome} recebida. ${dados.estacaoIhm.travaSegurancaAtiva ? 'Trava de emergência ativa.' : dados.estadoGlobal === 'EM_EXECUCAO' ? 'Máquina em operação.' : 'Sistema parado, pronto para partida.'}`);
      } else if (recuperada) alterarMensagemRemota('Simulador conectado. Indicadores atualizados pela telemetria do servidor.');
    };
    socket.onerror = () => { if (atual()) { definirEstado('ERRO'); limparPendente(); alterarMensagemRemota('Falha na conexão. Verifique se o simulador está aberto, a URL, o token e a origem.'); } };
    socket.onclose = () => {
      if (!atual()) return;
      socketAtual.current = null;
      if (temporizadorConexao.current !== null) window.clearTimeout(temporizadorConexao.current);
      temporizadorConexao.current = null; limparPendente();
      const houveErro = estadoAtual.current === 'ERRO'; definirEstado(houveErro ? 'ERRO' : 'DESCONECTADO');
      if (!houveErro) alterarMensagemRemota('Conexão encerrada. Comandos bloqueados. Reconecte para receber o estado atual.');
    };
    return null;
  }, [encerrarSocket, definirEstado, limparPendente]);
  const desconectar = useCallback(() => { encerrarSocket(); definirEstado('DESCONECTADO'); alterarMensagemRemota('Simulador desconectado. Nenhum comando de parada foi enviado.'); }, [encerrarSocket, definirEstado]);
  const usarLocal = useCallback(() => { encerrarSocket(); origemRemota.current = false; alterarRemota(false); definirEstado('LOCAL'); }, [encerrarSocket, definirEstado]);
  const enviar = useCallback((acao: AcaoMaquina) => {
    if (!origemRemota.current) { enviarLocal(acao); return; }
    if (acao.tipo === 'PASSO' || acao.tipo === 'PARAR_MOVIMENTO') return;
    if (!acaoSuportada(acao)) { alterarMensagemRemota('Este controle não é suportado pelo mock. Use a simulação local para testá-lo.'); return; }
    const socket = socketAtual.current, dados = dadosAtuais.current;
    if (!socket || socket.readyState !== WebSocket.OPEN || estadoAtual.current !== 'CONECTADO' || !dados || Date.now() - ultimaRecepcao.current > 3000) { alterarMensagemRemota('Comando não enviado: conexão ou telemetria indisponível. Reconecte o simulador.'); return; }
    if (acao.tipo === 'INICIAR' && possuiBloqueio(normalizarTelemetriaSimulador(dados, ''))) { alterarMensagemRemota('Partida bloqueada pela segurança. Pressione REARMAR no mock.'); return; }
    if (acao.tipo === 'REARMAR' && dados.estadoGlobal === 'EM_EXECUCAO') { alterarMensagemRemota('Pare a máquina antes de rearmar o simulador.'); return; }
    if (pendente.current && acao.tipo !== 'EMERGENCIA' && acao.tipo !== 'PARAR') { alterarMensagemRemota('Aguarde a telemetria do comando anterior.'); return; }
    limparPendente();
    try { socket.send(JSON.stringify({ origem: 'IHM', acao: acoesDoMock[acao.tipo] })); }
    catch { definirEstado('ERRO'); alterarMensagemRemota('Comando não enviado. A conexão não está disponível.'); return; }
    const nome = acoesDoMock[acao.tipo]; alterarComandoPendente(nome);
    alterarMensagemRemota(`${nome} enviado. Aguardando a próxima telemetria, sem alterar o estado localmente.`);
    pendente.current = { acao: acao.tipo, temporizador: window.setTimeout(() => { pendente.current = null; alterarComandoPendente(null); alterarMensagemRemota(`${nome} enviado, mas a condição esperada não apareceu na telemetria. Verifique o simulador.`); }, 2500) };
  }, [definirEstado, limparPendente]);
  useEffect(() => {
    const temporizador = window.setInterval(() => {
      if (!origemRemota.current) enviarLocal({ tipo: 'PASSO' });
      else if (estadoAtual.current === 'CONECTADO' && Date.now() - ultimaRecepcao.current > 3000) { limparPendente(); definirEstado('SEM_TELEMETRIA'); alterarMensagemRemota('Sem telemetria há mais de 3 segundos. Comandos bloqueados; últimos dados não representam o estado atual.'); }
    }, 100);
    const parar = () => { if (!origemRemota.current) enviarLocal({ tipo: 'PARAR_MOVIMENTO' }); };
    const aoOcultar = () => { if (document.hidden) parar(); };
    window.addEventListener('blur', parar); document.addEventListener('visibilitychange', aoOcultar);
    return () => { window.clearInterval(temporizador); window.removeEventListener('blur', parar); document.removeEventListener('visibilitychange', aoOcultar); encerrarSocket(); };
  }, [encerrarSocket, definirEstado, limparPendente]);
  const fonte: FonteDados = { remota, disponivel: !remota || estadoConexao === 'CONECTADO', estadoConexao, telemetria, comandoPendente };
  const maquina = remota ? telemetria ? normalizarTelemetriaSimulador(telemetria, mensagemRemota) : { ...estadoInicial, mensagem: mensagemRemota } : maquinaLocal;
  return { maquina, enviar, fonte, conectar, desconectar, usarLocal };
}
