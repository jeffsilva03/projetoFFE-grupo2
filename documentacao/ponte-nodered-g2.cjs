'use strict';
/**
 * Ponte de telemetria G2: Node-RED --HTTP POST--> ponte --WebSocket--> IHM.
 * APENAS LEITURA. Não conecta ao PLC/S7 e não aceita comandos.
 * Por padrão escuta somente 127.0.0.1. Não publicar diretamente na Internet.
 */
const http = require('node:http');
const crypto = require('node:crypto');
const { WebSocketServer, WebSocket } = require('ws');

const PORTA_PADRAO = 8092;
const HOST = '127.0.0.1';
const LIMITE_BYTES = 16 * 1024;
const ESTACOES = ['ESTOQUE', 'PROCESSO', 'MONTAGEM', 'EXPEDICAO'];
const TAGS = Object.freeze({
  ESTOQUE: [
    'emergencia', 'emergenciaAtivada', 'comutadorAutomatico', 'ocupado',
    'aguardando', 'condicaoIniciar',
  ],
  PROCESSO: [
    'processo_segurancaOK', 'processo_chaveAutomatico', 'processo_botaoVerde',
    'processo_botaoVermelho', 'processo_atuadoresPosicaoOK', 'processo_atuadoresOcupado',
  ],
  MONTAGEM: [
    'montagem_segurancaOK', 'montagem_chaveAutomatico', 'montagem_botaoVerde',
    'montagem_botaoVermelho',
  ],
  EXPEDICAO: [
    'expedicao_segurancaOK', 'expedicao_chaveAutomatico', 'expedicao_botaoVerde',
    'expedicao_botaoVermelho', 'expedicao_atuadorPosicaoOK', 'expedicao_atuadorOcupado',
  ],
});
const OBJETO = v => v !== null && typeof v === 'object' && !Array.isArray(v);

function compararToken(valor, token) {
  if (typeof valor !== 'string' || typeof token !== 'string') return false;
  const a = Buffer.from(valor, 'utf8');
  const b = Buffer.from(token, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function dividirLeitura(payload, agora = Date.now()) {
  if (!OBJETO(payload) || !OBJETO(payload.sinais)) throw new Error('Pacote inválido: sinais ausentes.');
  if (payload.estacao !== undefined && !ESTACOES.includes(payload.estacao)) throw new Error('Estação desconhecida.');
  const data = payload.timestamp ?? new Date(agora).toISOString();
  if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(data)) {
    throw new Error('Timestamp inválido.');
  }
  const ms = Date.parse(data);
  if (!Number.isFinite(ms) || ms > agora + 1000 || agora - ms > 3000) {
    throw new Error('Leitura atrasada ou futura.');
  }
  const estacoes = payload.estacao ? [payload.estacao] : ESTACOES;
  const resultado = [];
  for (const estacao of estacoes) {
    const sinais = {};
    for (const tag of TAGS[estacao]) {
      if (!Object.hasOwn(payload.sinais, tag)) continue;
      const valor = payload.sinais[tag];
      if (valor !== null && typeof valor !== 'boolean') throw new Error('Sinal não booleano: ' + tag);
      sinais[tag] = valor;
    }
    if (Object.keys(sinais).length > 0) resultado.push({ timestamp: data, estacao, sinais });
  }
  if (resultado.length === 0) throw new Error('Nenhuma tag G2 reconhecida.');
  return resultado;
}

/**
 * Consolida atualizações parciais do S7 (diff: true) sem reutilizar como atual
 * um sinal que não foi reobservado nos últimos três segundos.
 * Esse prazo é de qualidade de dado, não uma regra de segurança da máquina.
 */
function mesclarLeituraG2(cache, parcial, agora = Date.now()) {
  const anterior = cache.get(parcial.estacao);
  const ms = Date.parse(parcial.timestamp);
  if (anterior && ms < anterior.ultimoTimestamp) {
    throw new Error('Pacote fora de ordem.');
  }
  const porTag = new Map(anterior?.porTag ?? []);
  for (const [tag, valor] of Object.entries(parcial.sinais)) {
    porTag.set(tag, { valor, atualizadoEm: ms });
  }
  const sinais = {};
  for (const tag of TAGS[parcial.estacao]) {
    const entrada = porTag.get(tag);
    sinais[tag] = entrada && agora - entrada.atualizadoEm <= 3000 && entrada.atualizadoEm <= agora + 1000
      ? entrada.valor : null;
  }
  const amostra = { timestamp: parcial.timestamp, estacao: parcial.estacao, sinais };
  cache.set(parcial.estacao, {
    porTag, ultimoTimestamp: ms, recebidoEm: agora, amostra,
  });
  return amostra;
}

function snapshotAtualG2(registro, estacao, agora = Date.now()) {
  if (!registro || agora - registro.recebidoEm > 3000) return null;
  const sinais = {};
  for (const tag of TAGS[estacao]) {
    const entrada = registro.porTag.get(tag);
    sinais[tag] = entrada && agora - entrada.atualizadoEm <= 3000 ? entrada.valor : null;
  }
  return { timestamp: registro.amostra.timestamp, estacao, sinais };
}

function origensAutorizadas(valor) {
  const origens = new Set(['http://localhost:8081', 'http://127.0.0.1:8081']);
  if (!valor) return origens;
  for (const entrada of valor.split(',').map(x => x.trim()).filter(Boolean)) {
    const url = new URL(entrada);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash || url.origin !== entrada) {
      throw new Error('Origem G2 inválida. Informe apenas https://dominio ou http://localhost:porta.');
    }
    if (url.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
      throw new Error('Origem HTTP remota não permitida. Configure HTTPS.');
    }
    origens.add(url.origin);
  }
  return origens;
}

function responder(response, codigo, mensagem) {
  response.writeHead(codigo, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(mensagem));
}

async function iniciarPonte({ token, porta = PORTA_PADRAO, origens = '' } = {}) {
  if (typeof token !== 'string' || token.length < 16) throw new Error('Configure G2_BRIDGE_TOKEN com no mínimo 16 caracteres.');
  if (!Number.isInteger(porta) || porta < 0 || porta > 65535) throw new Error('Porta inválida.');
  const permitidas = origensAutorizadas(origens);
  const ultimas = new Map();
  const ws = new WebSocketServer({ noServer: true, maxPayload: 1024 });
  ws.on('connection', cliente => {
    for (const estacao of ESTACOES) {
      const registro = ultimas.get(estacao);
      const snapshot = snapshotAtualG2(registro, estacao);
      if (snapshot && cliente.readyState === WebSocket.OPEN) {
        cliente.send(JSON.stringify(snapshot));
      }
    }
    // Proíbe qualquer comando ou envio de mensagens pelo navegador.
    cliente.on('message', () => cliente.close(1008, 'Canal somente leitura.'));
  });

  const servidor = http.createServer((requisicao, resposta) => {
    const caminho = new URL(requisicao.url ?? '/', 'http://localhost').pathname;
    if (requisicao.method === 'GET' && caminho === '/health') {
      return responder(resposta, 200, {
        status: 'ok', leitura: true, industrial: false,
        estacoes: ESTACOES.map(estacao => ({
          estacao,
          dadosRecentes: Boolean(ultimas.get(estacao) && Date.now() - ultimas.get(estacao).recebidoEm <= 3000),
        })),
      });
    }
    if (caminho !== '/api/g2/telemetria') return responder(resposta, 404, { erro: 'Rota inexistente.' });
    if (requisicao.method !== 'POST') return responder(resposta, 405, { erro: 'Use POST.' });
    if (!compararToken(requisicao.headers['x-g2-bridge-token'], token)) {
      return responder(resposta, 401, { erro: 'Não autorizado.' });
    }
    if (!(requisicao.headers['content-type'] ?? '').startsWith('application/json')) {
      return responder(resposta, 415, { erro: 'Esperado application/json.' });
    }
    let tamanho = 0;
    let encerrado = false;
    const partes = [];
    requisicao.on('data', pedaco => {
      if (encerrado) return;
      tamanho += pedaco.length;
      if (tamanho > LIMITE_BYTES) {
        encerrado = true;
        responder(resposta, 413, { erro: 'Pacote muito grande.' });
        return;
      }
      partes.push(pedaco);
    });
    requisicao.on('end', () => {
      if (encerrado) return;
      let amostras;
      try { amostras = dividirLeitura(JSON.parse(Buffer.concat(partes).toString('utf8'))); }
      catch (erro) { responder(resposta, 422, { erro: erro.message }); return; }
      // Rejeita o pacote inteiro se uma estação tiver timestamp mais antigo.
      if (amostras.some(amostra => {
        const anterior = ultimas.get(amostra.estacao);
        return anterior && Date.parse(amostra.timestamp) < anterior.ultimoTimestamp;
      })) return responder(resposta, 409, { erro: 'Leitura fora de ordem.' });
      for (const parcial of amostras) {
        const amostra = mesclarLeituraG2(ultimas, parcial);
        const mensagem = JSON.stringify(amostra);
        for (const cliente of ws.clients) {
          if (cliente.readyState === WebSocket.OPEN) cliente.send(mensagem);
        }
      }
      responder(resposta, 202, { recebidas: amostras.map(x => x.estacao) });
    });
    requisicao.on('error', () => { if (!encerrado && !resposta.writableEnded) responder(resposta, 400, { erro: 'Falha de leitura.' }); });
  });
  servidor.on('upgrade', (requisicao, socket, head) => {
    const caminho = new URL(requisicao.url ?? '/', 'http://localhost').pathname;
    const origem = requisicao.headers.origin;
    const permitida = permitidas.has(origem);
    if (caminho !== '/telemetria' || !permitida) {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    ws.handleUpgrade(requisicao, socket, head, cliente => ws.emit('connection', cliente, requisicao));
  });
  try {
    await new Promise((resolver, rejeitar) => {
      servidor.once('error', rejeitar);
      servidor.listen(porta, HOST, () => { servidor.removeListener('error', rejeitar); resolver(); });
    });
  } catch (erro) {
    ws.close();
    throw erro;
  }
  return {
    porta: servidor.address().port,
    servidor,
    ws,
    fechar: async () => {
      for (const cliente of ws.clients) cliente.terminate();
      await new Promise(resolve => ws.close(resolve));
      await new Promise(resolve => servidor.close(resolve));
    },
  };
}

if (require.main === module) {
  iniciarPonte({
    token: process.env.G2_BRIDGE_TOKEN,
    porta: Number(process.env.G2_BRIDGE_PORT ?? PORTA_PADRAO),
    origens: process.env.G2_IHM_ORIGINS ?? '',
  })
    .then(ponte => {
      console.log('[G2] Ponte SOMENTE LEITURA ativa em http://127.0.0.1:' + ponte.porta);
      console.log('[G2] POST /api/g2/telemetria; WebSocket /telemetria');
      console.log('[G2] Não há conexão direta ao PLC nem escrita industrial.');
    })
    .catch(erro => { console.error('[G2] Não iniciou:', erro.message); process.exitCode = 1; });
}

module.exports = { iniciarPonte, dividirLeitura, mesclarLeituraG2, snapshotAtualG2, origensAutorizadas, TAGS, ESTACOES };
