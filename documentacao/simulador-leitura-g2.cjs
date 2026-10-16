/* Fonte de teste LOCAL e SOMENTE LEITURA para a Sprint 2.
 * Não conecta a CLP, S7 ou Node-RED real. Não recebe comandos.
 * Uso: npm run leitura-g2  | ws://localhost:8082?estacao=PROCESSO&cenario=normal
 */
const { WebSocketServer } = require('ws');

const porta = 8082;
const estacoes = ['ESTOQUE', 'PROCESSO', 'MONTAGEM', 'EXPEDICAO'];
const cenarios = ['normal', 'start', 'stop', 'falha', 'emergencia'];
const base = {
  ESTOQUE: {
    emergencia: false, emergenciaAtivada: false, comutadorAutomatico: true,
    ocupado: false, aguardando: true, condicaoIniciar: true,
  },
  PROCESSO: {
    processo_segurancaOK: true, processo_chaveAutomatico: true,
    processo_botaoVerde: false, processo_botaoVermelho: false,
    processo_atuadoresPosicaoOK: true, processo_atuadoresOcupado: false,
  },
  MONTAGEM: {
    montagem_segurancaOK: true, montagem_chaveAutomatico: true,
    montagem_botaoVerde: false, montagem_botaoVermelho: false,
  },
  EXPEDICAO: {
    expedicao_segurancaOK: true, expedicao_chaveAutomatico: true,
    expedicao_botaoVerde: false, expedicao_botaoVermelho: false,
    expedicao_atuadorPosicaoOK: true, expedicao_atuadorOcupado: false,
  },
};
function gerarSinais(estacao, cenario) {
  const dados = { ...base[estacao] };
  if (estacao === 'ESTOQUE') {
    if (cenario === 'start') { dados.ocupado = true; dados.aguardando = false; }
    if (cenario === 'stop') { dados.ocupado = false; dados.aguardando = true; }
    if (cenario === 'falha') { dados.condicaoIniciar = false; }
    if (cenario === 'emergencia') {
      dados.emergencia = true; dados.emergenciaAtivada = true; dados.condicaoIniciar = false;
      dados.ocupado = false; dados.aguardando = false;
    }
  } else {
    const prefixo = { PROCESSO: 'processo', MONTAGEM: 'montagem', EXPEDICAO: 'expedicao' }[estacao];
    if (cenario === 'start') dados[`${prefixo}_botaoVerde`] = true;
    if (cenario === 'stop') dados[`${prefixo}_botaoVermelho`] = true;
    if (cenario === 'falha' || cenario === 'emergencia') dados[`${prefixo}_segurancaOK`] = false;
    if (cenario === 'start' && estacao !== 'MONTAGEM') {
      dados[`${prefixo}_${estacao === 'EXPEDICAO' ? 'atuadorOcupado' : 'atuadoresOcupado'}`] = true;
    }
  }
  return dados;
}

const servidor = new WebSocketServer({ host: '127.0.0.1', port: porta });
servidor.on('connection', (socket, requisicao) => {
  const url = new URL(requisicao.url ?? '/', `http://localhost:${porta}`);
  const estacao = url.searchParams.get('estacao') ?? 'PROCESSO';
  const cenario = url.searchParams.get('cenario') ?? 'normal';
  if (!estacoes.includes(estacao) || !cenarios.includes(cenario)) {
    socket.close(1008, 'Estação ou cenário inválido.');
    return;
  }
  const publicar = () => {
    if (socket.readyState !== 1) return;
    socket.send(JSON.stringify({
      timestamp: new Date().toISOString(),
      estacao,
      sinais: gerarSinais(estacao, cenario),
    }));
  };
  publicar();
  const intervalo = setInterval(publicar, 500);
  // Uma tentativa de enviar comandos encerra a sessão. Esta fonte nunca escreve no PLC.
  socket.on('message', () => socket.close(1008, 'Fonte somente leitura.'));
  socket.on('close', () => clearInterval(intervalo));
  socket.on('error', () => clearInterval(intervalo));
});
servidor.on('listening', () => {
  console.log(`[G2] Fonte de teste SOMENTE LEITURA: ws://localhost:${porta}`);
  console.log('[G2] Nenhuma comunicação com a Planta N2 é realizada.');
});
