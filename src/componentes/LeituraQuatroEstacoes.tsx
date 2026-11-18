import { obterIndicadoresG2, estadoResumidoG2 } from '../servicos/leituraG2';
import { nomesEstacoesG2 } from '../tipos/leituraG2';
import { usarPonteTelemetria } from '../estado/usarPonteTelemetria';
import type { EstacaoG2, IndicadoresLeituraG2 } from '../tipos/leituraG2';

const estacoes: EstacaoG2[] = ['ESTOQUE', 'PROCESSO', 'MONTAGEM', 'EXPEDICAO'];

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
  // Conexão compartilhada: trocar de tela não derruba a ponte nem apaga as leituras.
  const ponte = usarPonteTelemetria();
  const { conexao, endereco, registros, mensagem, conectar, desconectar, definirEndereco } = ponte;

  const aberta = conexao === 'ABERTA';
  return <section className="ihm-leitura" aria-label="Ponte de leitura das quatro estações">
    <div className="ihm-leitura-alerta">
      <strong>SPRINT 2 · PONTE NODE-RED · SOMENTE LEITURA</strong>
      <p>Esta tela acompanha Estoque, Processo, Montagem e Expedição. Até a liberação do professor, os dados da ponte são de demonstração, não da Planta N2.</p>
    </div>
    <div className="ihm-leitura-config">
      <div className="ihm-leitura-controles">
        <label className="ihm-leitura-ponte-info">
          Endereço da ponte
          <input type="url" aria-label="Endereço WebSocket da ponte G2"
            spellCheck={false} value={endereco} disabled={ponte.ativa}
            onChange={evento => definirEndereco(evento.target.value)} />
          <small>Teste local: ws://localhost:8092/telemetria. Fora do computador: somente wss:// em gateway aprovado.</small>
        </label>
        <div className="ihm-leitura-acoes">
          {ponte.ativa ?
            <button onClick={desconectar}>Desconectar</button> :
            <button className="principal" onClick={conectar}>Conectar ponte G2</button>}
        </div>
      </div>
      <div className="ihm-leitura-feedback" role="status">
        <span className={aberta ? 'ligado' : 'indefinido'}>{aberta ? 'Conectado à ponte' : conexao === 'CONECTANDO' ? 'Conectando...' : conexao === 'RECONECTANDO' ? `Reconectando (tentativa ${ponte.tentativa})...` : 'Sem conexão'}</span>
        <p>{mensagem}</p>
      </div>
    </div>
    <div className="ihm-ponte-grade">
      {estacoes.map(estacao => {
        const registro = registros[estacao];
        const atualizada = ponte.atual(estacao);
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
