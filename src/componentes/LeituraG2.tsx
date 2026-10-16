import { useCallback, useEffect, useRef, useState } from 'react';
import { estadoResumidoG2, lerAmostraG2, obterIndicadoresG2, pacoteAtualG2 } from '../servicos/leituraG2';
import { nomesEstacoesG2 } from '../tipos/leituraG2';
import type { AmostraLeituraG2, EstacaoG2, EstadoLeituraG2 } from '../tipos/leituraG2';

type Cenario = 'normal' | 'start' | 'stop' | 'falha' | 'emergencia';
const nomeCenario: Record<Cenario, string> = {
  normal: 'Condição normal',
  start: 'Botão START pressionado (teste)',
  stop: 'Botão STOP pressionado (teste)',
  falha: 'Falha de segurança (teste)',
  emergencia: 'Emergência (teste)',
};
const status: Record<EstadoLeituraG2, string> = {
  AGUARDANDO: 'Aguardando conexão',
  CONECTANDO: 'Conectando à fonte de teste...',
  ATUALIZADO: 'Recebendo sinais',
  SEM_DADOS: 'Dados indisponíveis ou antigos',
  DESCONECTADO: 'Fonte desconectada',
  ERRO: 'Falha na leitura',
};

function ValorSinal({ rotulo, valor, ligado = 'Ativo', desligado = 'Inativo' }: {
  rotulo: string; valor: boolean | null; ligado?: string; desligado?: string;
}) {
  return <div className="ihm-leitura-linha">
    <span>{rotulo}</span>
    <strong className={valor === null ? 'indefinido' : valor ? 'ligado' : 'desligado'}>
      <i aria-hidden="true" />{valor === null ? 'Não informado' : valor ? ligado : desligado}
    </strong>
  </div>;
}

export function LeituraG2() {
  const [estacao, definirEstacao] = useState<EstacaoG2>('PROCESSO');
  const [cenario, definirCenario] = useState<Cenario>('normal');
  const [estado, definirEstado] = useState<EstadoLeituraG2>('AGUARDANDO');
  const [amostra, definirAmostra] = useState<AmostraLeituraG2 | null>(null);
  const [mensagem, definirMensagem] = useState('Esta tela recebe dados de teste com os nomes das tags encontradas no Node-RED.');
  const socketRef = useRef<WebSocket | null>(null);
  const ultimoPacoteRef = useRef(0);
  const esperaInicialRef = useRef<number | null>(null);

  const encerrar = useCallback(() => {
    if (esperaInicialRef.current !== null) window.clearTimeout(esperaInicialRef.current);
    esperaInicialRef.current = null;
    const socket = socketRef.current;
    socketRef.current = null;
    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      socket.close();
    }
  }, []);

  const desconectar = useCallback(() => {
    encerrar();
    ultimoPacoteRef.current = 0;
    definirEstado('DESCONECTADO');
    definirMensagem('Leitura encerrada. Nenhum comando foi enviado.');
  }, [encerrar]);

  const conectar = useCallback(() => {
    if (window.location.protocol === 'https:') {
      definirEstado('ERRO');
      definirMensagem('A fonte de teste usa ws://localhost. Execute esta tela em http://localhost:8081.');
      return;
    }
    encerrar();
    ultimoPacoteRef.current = 0;
    definirAmostra(null);
    definirEstado('CONECTANDO');
    definirMensagem('Conectando à fonte de leitura local...');
    const url = new URL('ws://localhost:8082');
    url.searchParams.set('estacao', estacao);
    url.searchParams.set('cenario', cenario);
    let socket: WebSocket;
    try { socket = new WebSocket(url.toString()); }
    catch {
      definirEstado('ERRO');
      definirMensagem('Não foi possível abrir a conexão de leitura.');
      return;
    }
    socketRef.current = socket;
    const atual = () => socketRef.current === socket;
    esperaInicialRef.current = window.setTimeout(() => {
      if (!atual() || ultimoPacoteRef.current !== 0) return;
      encerrar();
      definirEstado('SEM_DADOS');
      definirMensagem('Sem resposta da fonte após 5 segundos. Execute npm run leitura-g2 e reconecte.');
    }, 5000);
    socket.onmessage = evento => {
      if (!atual()) return;
      try {
        if (typeof evento.data !== 'string') throw new Error('Mensagem não textual.');
        const recebida = lerAmostraG2(evento.data);
        if (recebida.estacao !== estacao || !pacoteAtualG2(recebida.timestamp)) {
          throw new Error('Estação ou horário de leitura incompatível.');
        }
        ultimoPacoteRef.current = Date.now();
        definirAmostra(recebida);
        definirEstado('ATUALIZADO');
        definirMensagem('Sinais recebidos da fonte de teste. A máquina real NÃO está conectada.');
        if (esperaInicialRef.current !== null) {
          window.clearTimeout(esperaInicialRef.current);
          esperaInicialRef.current = null;
        }
      } catch {
        ultimoPacoteRef.current = 0;
        definirEstado('SEM_DADOS');
        definirMensagem('Pacote de leitura inválido ou antigo. Dados ocultados até chegar leitura válida.');
      }
    };
    socket.onerror = () => {
      if (!atual()) return;
      definirEstado('ERRO');
      definirMensagem('Falha no WebSocket. Verifique se npm run leitura-g2 está executando.');
    };
    socket.onclose = () => {
      if (!atual()) return;
      socketRef.current = null;
      if (esperaInicialRef.current !== null) window.clearTimeout(esperaInicialRef.current);
      esperaInicialRef.current = null;
      definirEstado(anterior => anterior === 'ERRO' ? anterior : 'DESCONECTADO');
      definirMensagem('A fonte parou de enviar sinais. Nenhum comando foi enviado.');
    };
  }, [cenario, encerrar, estacao]);

  useEffect(() => {
    const relogio = window.setInterval(() => {
      if (socketRef.current && ultimoPacoteRef.current !== 0 &&
          Date.now() - ultimoPacoteRef.current > 3000) {
        ultimoPacoteRef.current = 0;
        definirEstado('SEM_DADOS');
        definirMensagem('Sinais sem atualização há mais de 3 segundos. Não representam o estado atual.');
      }
    }, 250);
    return () => { window.clearInterval(relogio); encerrar(); };
  }, [encerrar]);

  const conectada = estado === 'ATUALIZADO';
  const aberta = ['CONECTANDO', 'ATUALIZADO', 'SEM_DADOS'].includes(estado) && socketRef.current !== null;
  const sinais = conectada && amostra ? obterIndicadoresG2(amostra) : null;
  const situacao = sinais ? estadoResumidoG2(sinais) : 'Estado da máquina indisponível';
  return <section className="ihm-leitura" aria-label="Leitura de sinais do Grupo 2">
    <div className="ihm-leitura-alerta">
      <strong>SPRINT 2 · SOMENTE LEITURA · DADOS DE TESTE</strong>
      <p>Esta fonte imita os sinais do Node-RED. Não está conectada à Planta N2 e não envia START, STOP, RESET ou emergência.</p>
    </div>
    <section className="ihm-leitura-config" aria-label="Configuração da fonte de leitura">
      <div className="ihm-leitura-controles">
        <label>Estação
          <select value={estacao} disabled={aberta} onChange={e => definirEstacao(e.target.value as EstacaoG2)}>
            {(Object.keys(nomesEstacoesG2) as EstacaoG2[]).map(chave => <option key={chave} value={chave}>{nomesEstacoesG2[chave]}</option>)}
          </select>
        </label>
        <label>Situação de teste
          <select value={cenario} disabled={aberta} onChange={e => definirCenario(e.target.value as Cenario)}>
            {(Object.keys(nomeCenario) as Cenario[]).map(chave => <option key={chave} value={chave}>{nomeCenario[chave]}</option>)}
          </select>
        </label>
        <div className="ihm-leitura-acoes">
          {aberta ? <button onClick={desconectar}>Desconectar</button> :
            <button className="principal" onClick={conectar}>Conectar leitura G2</button>}
        </div>
      </div>
      <div className="ihm-leitura-feedback" role="status">
        <span className={conectada ? 'ligado' : 'indefinido'}>{status[estado]}</span>
        <p>{mensagem}</p>
        <small>Servidor de teste: ws://localhost:8082 · Última amostra: {amostra ? new Date(amostra.timestamp).toLocaleTimeString('pt-BR') : '—'}</small>
      </div>
    </section>
    <div className="ihm-leitura-resumo">
      <span>ESTADO OBSERVADO · {nomesEstacoesG2[estacao]}</span>
      <strong>{situacao}</strong>
      <p>O estado global completo ainda não está disponível nos sinais publicados. Não deduzimos operação normal de dados ausentes.</p>
    </div>
    <div className="ihm-leitura-grade">
      <section className="ihm-leitura-cartao">
        <h2>Segurança</h2>
        <ValorSinal rotulo="Segurança OK" valor={sinais?.segurancaOk ?? null} ligado="OK" desligado="Não OK" />
        <ValorSinal rotulo="Emergência (DB9)" valor={sinais?.emergencia ?? null} />
        <ValorSinal rotulo="Emergência ativada (DB9)" valor={sinais?.emergenciaAtivada ?? null} />
        <p className="ihm-leitura-nota">Estado de segurança monitorado. O E-STOP físico nunca é substituído por esta tela.</p>
      </section>
      <section className="ihm-leitura-cartao">
        <h2>Botoeira física</h2>
        <ValorSinal rotulo="Botão verde · START" valor={sinais?.botaoStart ?? null} ligado="Pressionado" desligado="Solto" />
        <ValorSinal rotulo="Botão vermelho · STOP" valor={sinais?.botaoStop ?? null} ligado="Pressionado" desligado="Solto" />
        <ValorSinal rotulo="Comutador automático" valor={sinais?.comutadorAutomatico ?? null} ligado="Ativado" desligado="Desativado" />
        <p className="ihm-leitura-nota">Estes indicadores mostram leitura de sinais, não botões clicáveis de comando.</p>
      </section>
      <section className="ihm-leitura-cartao">
        <h2>Condições da estação</h2>
        <ValorSinal rotulo="Ocupado" valor={sinais?.ocupado ?? null} />
        <ValorSinal rotulo="Aguardando" valor={sinais?.aguardando ?? null} />
        <ValorSinal rotulo="Condição para iniciar" valor={sinais?.condicaoIniciar ?? null} />
        <ValorSinal rotulo="Atuadores em posição" valor={sinais?.atuadoresPosicaoOk ?? null} />
        <ValorSinal rotulo="Atuadores ocupados" valor={sinais?.atuadoresOcupados ?? null} />
      </section>
    </div>
    <p className="ihm-leitura-rodape">Sinais ausentes aparecem como “Não informado”, não como desligados. Para testar outra situação, desconecte, selecione o cenário e conecte novamente.</p>
  </section>;
}
