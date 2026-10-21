import { useCallback, useEffect, useRef, useState } from 'react';
import { lerAmostraG2, obterIndicadoresG2, pacoteAtualG2, estadoResumidoG2 } from '../servicos/leituraG2';
import { nomesEstacoesG2 } from '../tipos/leituraG2';
import type { AmostraLeituraG2, EstacaoG2, IndicadoresLeituraG2 } from '../tipos/leituraG2';

const estacoes: EstacaoG2[] = ['ESTOQUE', 'PROCESSO', 'MONTAGEM', 'EXPEDICAO'];
type Registro = { amostra: AmostraLeituraG2; recebidaEm: number };
type Conexao = 'DESLIGADA' | 'CONECTANDO' | 'ABERTA' | 'DESCONECTADA' | 'ERRO';

const linhas: { nome: string; campo: keyof IndicadoresLeituraG2; sim?: string; nao?: string }[] = [
  { nome: 'Segurança', campo: 'segurancaOk', sim: 'OK', nao: 'Não OK' },
  { nome: 'Emergência (DB9)', campo: 'emergencia' },
  { nome: 'Emergência ativada (DB9)', campo: 'emergenciaAtivada' },
  { nome: 'Comutador automático', campo: 'comutadorAutomatico' },
  { nome: 'Botão START físico', campo: 'botaoStart', sim: 'Pressionado', nao: 'Solto' },
  { nome: 'Botão STOP físico', campo: 'botaoStop', sim: 'Pressionado', nao: 'Solto' },
  { nome: 'Ocupado', campo: 'ocupado' },
  { nome: 'Aguardando', campo: 'aguardando' },
  { nome: 'Permissão de iniciar', campo: 'condicaoIniciar' },
  { nome: 'Atuadores em posição', campo: 'atuadoresPosicaoOk' },
  { nome: 'Atuadores ocupados', campo: 'atuadoresOcupados' },
];

const mostrarValor = (valor: boolean | null, sim = 'Ativo', nao = 'Inativo') =>
  valor === null ? 'Não informado' : valor ? sim : nao;

export function LeituraQuatroEstacoes() {
  const [conexao, definirConexao] = useState<Conexao>('DESLIGADA');
  const [registros, definirRegistros] = useState<Partial<Record<EstacaoG2, Registro>>>({});
  const [mensagem, definirMensagem] = useState('Aguardando conexão à ponte local.');
  const [agora, definirAgora] = useState(() => Date.now());
  const socketRef = useRef<WebSocket | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const encerrar = useCallback(() => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    const anterior = socketRef.current;
    socketRef.current = null;
    if (anterior) {
      anterior.onopen = null;
      anterior.onmessage = null;
      anterior.onerror = null;
      anterior.onclose = null;
      anterior.close();
    }
  }, []);

  const desconectar = useCallback(() => {
    encerrar();
    definirRegistros({});
    definirConexao('DESLIGADA');
    definirMensagem('Ponte desconectada. Nenhum comando enviado.');
  }, [encerrar]);

  const conectar = useCallback(() => {
    if (window.location.protocol === 'https:') {
      definirConexao('ERRO');
      definirMensagem('Ponte local usa ws://. Abra a IHM em http://localhost:8081.');
      return;
    }
    encerrar();
    definirRegistros({});
    definirConexao('CONECTANDO');
    definirMensagem('Conectando à ponte das quatro estações...');
    let socket: WebSocket;
    try { socket = new WebSocket('ws://localhost:8092/telemetria'); }
    catch {
      definirConexao('ERRO');
      definirMensagem('Não foi possível criar a conexão WebSocket.');
      return;
    }
    socketRef.current = socket;
    const atual = () => socketRef.current === socket;
    timeoutRef.current = window.setTimeout(() => {
      if (!atual() || socket.readyState === WebSocket.OPEN) return;
      encerrar();
      definirConexao('ERRO');
      definirMensagem('Ponte não respondeu em 5 segundos. Execute npm run demo-ponte-g2.');
    }, 5000);
    socket.onopen = () => {
      if (!atual()) return;
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      definirConexao('ABERTA');
      definirMensagem('Ponte conectada. As quatro estações são acompanhadas separadamente.');
    };
    socket.onmessage = evento => {
      if (!atual()) return;
      try {
        if (typeof evento.data !== 'string') throw new Error('Formato não textual.');
        const recebida = lerAmostraG2(evento.data);
        if (!pacoteAtualG2(recebida.timestamp)) throw new Error('Leitura vencida.');
        const horarioRecepcao = Date.now();
        definirAgora(horarioRecepcao);
        definirRegistros(anterior => ({
          ...anterior,
          [recebida.estacao]: { amostra: recebida, recebidaEm: horarioRecepcao },
        }));
      } catch {
        definirMensagem('Um pacote inválido foi descartado. Verifique a origem dos dados.');
      }
    };
    socket.onerror = () => {
      if (!atual()) return;
      definirConexao('ERRO');
      definirMensagem('Falha de comunicação com a ponte local.');
    };
    socket.onclose = () => {
      if (!atual()) return;
      socketRef.current = null;
      definirConexao(anterior => anterior === 'ERRO' ? anterior : 'DESCONECTADA');
      definirMensagem('A ponte desconectou. As leituras deixam de ser consideradas atuais.');
    };
  }, [encerrar]);

  useEffect(() => {
    const intervalo = window.setInterval(() => definirAgora(Date.now()), 250);
    return () => { window.clearInterval(intervalo); encerrar(); };
  }, [encerrar]);

  const aberta = conexao === 'ABERTA';
  return <section className="ihm-leitura" aria-label="Ponte de leitura das quatro estações">
    <div className="ihm-leitura-alerta">
      <strong>SPRINT 2 · PONTE NODE-RED · SOMENTE LEITURA</strong>
      <p>Esta tela acompanha Estoque, Processo, Montagem e Expedição. Até a liberação do professor, os dados da ponte são de demonstração, não da Planta N2.</p>
    </div>
    <div className="ihm-leitura-config">
      <div className="ihm-leitura-controles">
        <div className="ihm-leitura-ponte-info">
          <strong>Ponte local: ws://localhost:8092/telemetria</strong>
          <small>Para testar, execute npm run demo-ponte-g2 em outro terminal.</small>
        </div>
        <div className="ihm-leitura-acoes">
          {conexao === 'ABERTA' || conexao === 'CONECTANDO' ?
            <button onClick={desconectar}>Desconectar</button> :
            <button className="principal" onClick={conectar}>Conectar ponte G2</button>}
        </div>
      </div>
      <div className="ihm-leitura-feedback" role="status">
        <span className={aberta ? 'ligado' : 'indefinido'}>{aberta ? 'Conectado à ponte' : conexao === 'CONECTANDO' ? 'Conectando...' : 'Sem conexão'}</span>
        <p>{mensagem}</p>
      </div>
    </div>
    <div className="ihm-ponte-grade">
      {estacoes.map(estacao => {
        const registro = registros[estacao];
        const atualizada = aberta && Boolean(registro) && agora - registro!.recebidaEm <= 3000 &&
          pacoteAtualG2(registro!.amostra.timestamp, agora);
        const indicadores = atualizada && registro ? obterIndicadoresG2(registro.amostra) : null;
        return <article className="ihm-leitura-cartao ihm-ponte-estacao" key={estacao}>
          <header className="ihm-ponte-cabecalho">
            <div><span>ESTAÇÃO</span><h2>{nomesEstacoesG2[estacao]}</h2></div>
            <strong className={atualizada ? 'ihm-ponte-online' : 'ihm-ponte-offline'}>
              {atualizada ? 'Dados atuais' : 'Sem dados atuais'}
            </strong>
          </header>
          <p className="ihm-ponte-situacao">{indicadores ? estadoResumidoG2(indicadores) : 'Estado indisponível'}</p>
          {linhas.map(linha => {
            const valor = indicadores?.[linha.campo] ?? null;
            return <div className="ihm-leitura-linha" key={linha.campo}>
              <span>{linha.nome}</span>
              <strong className={valor === null ? 'indefinido' : valor ? 'ligado' : 'desligado'}>
                <i aria-hidden="true" />{mostrarValor(valor, linha.sim, linha.nao)}
              </strong>
            </div>;
          })}
          <p className="ihm-leitura-nota">
            Último pacote: {registro ? new Date(registro.amostra.timestamp).toLocaleTimeString('pt-BR') : '—'}.
            {atualizada ? ' Leitura recebida pela ponte.' : ' Informação antiga ou ausente.'}
          </p>
        </article>;
      })}
    </div>
    <p className="ihm-leitura-rodape">Quando não há sinal ou a leitura vence, exibimos “Não informado”. Os indicadores START e STOP refletem o estado dos botões físicos; esta tela não envia comandos de operação nem substitui circuitos de segurança.</p>
  </section>;
}
