'use strict';
/**
 * Simulador de comandos da Sprint 3 (Grupo 2). NÃO conversa com CLP nem com a Planta N2.
 *
 * Faz o papel do caminho broker → agente local → CLP para testar a IHM:
 *  - recebe { tipo: 'comando', comando: { origem, acao, timestamp } } pelo WebSocket;
 *  - publica a cada 500 ms o envelope de telemetria { timestamp, estacoes: { <nome>: { status } } };
 *  - simula o tempo de resposta da máquina (a confirmação vem pela telemetria, nunca por ACK).
 *
 * Controle de cenários (só localhost), para os testes do item 6.8:
 *   POST /simular {"emergenciaFisica": true|false}   aperta/solta o cogumelo físico
 *   POST /simular {"ignorar": "start"|null}          a "máquina" não reage a esse comando (testa o timeout)
 *   GET  /estado
 */
const http = require('node:http');
const { WebSocketServer, WebSocket } = require('ws');

const HOST = '127.0.0.1';
const ESTACOES = ['estoque', 'processo', 'montagem', 'expedicao'];
const ACOES = ['start', 'stop', 'reset', 'emergencia'];
const ORIGEM_AUTORIZADA = 'unidade1-grupo2'; // G2 é o único grupo que comanda o CLP
const ATRASOS = { start: 700, stop: 400, reset: 500, emergencia: 50 };

function origensPermitidas(extra = '') {
  return new Set(['http://localhost:8081', 'http://127.0.0.1:8081',
    ...extra.split(',').map(s => s.trim()).filter(Boolean)]);
}

function iniciarSimuladorComandos({ porta = 8094, origens = '', intervaloMs = 500, log = console.log } = {}) {
  const permitidas = origensPermitidas(origens);
  const status = Object.fromEntries(ESTACOES.map(e => [e, 'AGUARDANDO']));
  const cenario = { emergenciaFisica: false, ignorar: null };
  let emergenciaLogica = false;
  const recebidos = [];

  const envelope = () => ({
    timestamp: new Date().toISOString(),
    estacoes: Object.fromEntries(ESTACOES.map(e => [e, { status: status[e] }])),
  });
  const ws = new WebSocketServer({ noServer: true, maxPayload: 2048 });
  const transmitir = () => {
    const msg = JSON.stringify(envelope());
    for (const c of ws.clients) if (c.readyState === WebSocket.OPEN) c.send(msg);
  };
  const aplicarEmergencia = () => {
    // Entra em emergência na hora; só sai com reset (ver executar('reset')).
    if (emergenciaLogica || cenario.emergenciaFisica) for (const e of ESTACOES) status[e] = 'EMERGENCIA';
  };

  function executar(acao) {
    if (cenario.ignorar === acao) { log(`[SIM] ${acao} ignorado (cenário de timeout).`); return; }
    setTimeout(() => {
      switch (acao) {
        case 'emergencia': emergenciaLogica = true; break;
        case 'reset':
          // Reset só tira da emergência se o cogumelo físico estiver solto.
          if (!cenario.emergenciaFisica) {
            emergenciaLogica = false;
            for (const e of ESTACOES) if (status[e] === 'EMERGENCIA') status[e] = 'AGUARDANDO';
          }
          break;
        case 'start': if (status.processo === 'AGUARDANDO') status.processo = 'OPERANDO'; break;
        case 'stop': if (status.processo === 'OPERANDO') status.processo = 'AGUARDANDO'; break;
      }
      aplicarEmergencia();
      transmitir();
    }, ATRASOS[acao]);
  }

  ws.on('connection', cliente => {
    cliente.send(JSON.stringify(envelope()));
    cliente.on('message', bruto => {
      let msg;
      try { msg = JSON.parse(String(bruto)); } catch { return; }
      const c = msg && msg.tipo === 'comando' ? msg.comando : null;
      if (!c || !ACOES.includes(c.acao) || typeof c.timestamp !== 'string') { log('[SIM] mensagem ignorada (formato).'); return; }
      // Emergência passa sempre (fail-safe); demais só da origem autorizada.
      if (c.acao !== 'emergencia' && c.origem !== ORIGEM_AUTORIZADA) { log(`[SIM] ${c.acao} recusado: origem ${c.origem}.`); return; }
      recebidos.push({ ...c, recebidoEm: new Date().toISOString() });
      log(`[SIM] comando ${c.acao} de ${c.origem}`);
      executar(c.acao);
    });
  });

  const servidor = http.createServer((req, res) => {
    const caminho = new URL(req.url ?? '/', 'http://localhost').pathname;
    const responder = (codigo, corpo) => { res.writeHead(codigo, { 'content-type': 'application/json' }); res.end(JSON.stringify(corpo)); };
    if (req.method === 'GET' && caminho === '/estado') return responder(200, { status, cenario, recebidos: recebidos.length });
    if (req.method === 'POST' && caminho === '/simular') {
      let corpo = '';
      req.on('data', p => { corpo += p; if (corpo.length > 1024) req.destroy(); });
      req.on('end', () => {
        try {
          const d = JSON.parse(corpo || '{}');
          if (typeof d.emergenciaFisica === 'boolean') cenario.emergenciaFisica = d.emergenciaFisica;
          if (d.ignorar === null || ACOES.includes(d.ignorar)) cenario.ignorar = d.ignorar ?? null;
          aplicarEmergencia(); transmitir();
          log(`[SIM] cenário: ${JSON.stringify(cenario)}`);
          responder(200, { status, cenario });
        } catch { responder(400, { erro: 'JSON inválido' }); }
      });
      return;
    }
    responder(404, { erro: 'rota inexistente' });
  });
  servidor.on('upgrade', (req, socket, head) => {
    const caminho = new URL(req.url ?? '/', 'http://localhost').pathname;
    const origem = req.headers.origin;
    if (caminho !== '/smart40' || (origem && !permitidas.has(origem))) {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); socket.destroy(); return;
    }
    ws.handleUpgrade(req, socket, head, c => ws.emit('connection', c, req));
  });
  const relogio = setInterval(transmitir, intervaloMs);
  return new Promise((resolve, reject) => {
    servidor.once('error', reject);
    servidor.listen(porta, HOST, () => resolve({
      porta: servidor.address().port, status, cenario, recebidos,
      fechar: async () => {
        clearInterval(relogio);
        for (const c of ws.clients) c.terminate();
        await new Promise(r => ws.close(r));
        await new Promise(r => servidor.close(r));
      },
    }));
  });
}

if (require.main === module) {
  iniciarSimuladorComandos({ porta: Number(process.env.G2_SIM_COMANDOS_PORT || 8094), origens: process.env.G2_IHM_ORIGINS || '' })
    .then(s => {
      console.log(`[SIM] Simulador de comandos Sprint 3 em ws://localhost:${s.porta}/smart40`);
      console.log('[SIM] Telemetria a cada 500 ms. NENHUMA conexão com CLP ou com a Planta N2.');
      console.log(`[SIM] Cenários: POST http://127.0.0.1:${s.porta}/simular {"emergenciaFisica":true}`);
    })
    .catch(e => { console.error('[SIM] Não iniciou:', e.message); process.exitCode = 1; });
}

module.exports = { iniciarSimuladorComandos, ORIGEM_AUTORIZADA, ESTACOES };
