'use strict';
/**
 * Servidor DIDÁTICO de START/STOP — não existe código para PLC, Node-RED,
 * portas industriais, encaminhamento ou comandos físicos neste processo.
 * A interface local se conecta somente a 127.0.0.1:8093.
 */
const { WebSocketServer, WebSocket } = require('ws');

const HOST = '127.0.0.1';
const PORTA = 8093;
const ROTA = '/demo-comandos';
const ORIGENS = new Set(['http://localhost:8081', 'http://127.0.0.1:8081']);
const PROTOCOLO = 'G2_MOCK_COMANDOS_V1';
const IDENTIFICADOR = /^[0-9a-f-]{8,64}$/i;
const agora = () => new Date().toISOString();

function mensagemValida(bruto) {
  return bruto && typeof bruto === 'object' && !Array.isArray(bruto);
}
function prepararResposta(tipo, dados) {
  return { tipo, protocolo: PROTOCOLO, timestamp: agora(), ...dados };
}

/** Cada navegador recebe seu próprio estado independente e efêmero. */
async function iniciarMockComandosG2({ porta = PORTA } = {}) {
  if (!Number.isInteger(porta) || porta < 0 || porta > 65535) throw new Error('Porta inválida.');
  const servidor = new WebSocketServer({
    host: HOST, port: porta, path: ROTA, maxPayload: 1024,
    verifyClient: info => ORIGENS.has(info.origin),
  });
  await new Promise((resolver, rejeitar) => {
    if (servidor.address()) return resolver();
    servidor.once('listening', resolver);
    servidor.once('error', rejeitar);
  });
  servidor.on('connection', ws => {
    let estado = 'PARADA';
    let seguranca = 'OK';
    let sequencia = 0;
    let pendente = false;
    let timerComando = null;
    const enviar = dados => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(dados));
    };
    const telemetria = (id = null) => {
      sequencia++;
      enviar(prepararResposta('STATE_TELEMETRY', {
        origem:'SIMULADOR_LOCAL', sequencia, estado, seguranca, id,
      }));
    };
    enviar(prepararResposta('MOCK_HELLO', {
      origem:'SIMULADOR_LOCAL', estado, seguranca, sequencia,
    }));
    telemetria();
    const heartbeat = setInterval(() => telemetria(), 1000);
    ws.on('message', buffer => {
      let msg;
      try { msg = JSON.parse(buffer.toString()); }
      catch { ws.close(1008, 'JSON inválido'); return; }
      if (!mensagemValida(msg) || msg.protocolo !== PROTOCOLO) {
        ws.close(1008, 'Protocolo não autorizado'); return;
      }
      if (msg.tipo === 'SCENARIO_SET') {
        if (msg.cenario !== 'NORMAL' && msg.cenario !== 'SEGURANCA_BLOQUEADA') {
          ws.close(1008, 'Cenário inválido'); return;
        }
        seguranca = msg.cenario === 'NORMAL' ? 'OK' : 'BLOQUEADA';
        if (seguranca === 'BLOQUEADA') estado = 'PARADA';
        telemetria();
        return;
      }
      if (msg.tipo !== 'COMMAND_REQUEST' || !IDENTIFICADOR.test(msg.id) ||
          !['START', 'STOP'].includes(msg.comando)) {
        ws.close(1008, 'Comando não permitido'); return;
      }
      const resposta = (aceito, motivo) => enviar(prepararResposta('COMMAND_ACK', {
        origem:'SIMULADOR_LOCAL', id:msg.id, comando:msg.comando, aceito, motivo,
      }));
      if (pendente) { resposta(false,'Outra solicitação ainda está pendente.'); return; }
      if (msg.comando === 'START' && seguranca !== 'OK') {
        resposta(false, 'START recusado: falha de segurança SIMULADA.'); return;
      }
      if (msg.comando === 'START' && estado === 'EM_EXECUCAO') {
        resposta(false, 'START recusado: demonstração já em execução.'); return;
      }
      // ACK NÃO significa confirmação de estado. A transição vem em telemetria separada.
      resposta(true,'Solicitação recebida pelo simulador; aguardando transição.');
      pendente = true;
      timerComando = setTimeout(() => {
        timerComando = null;
        estado = msg.comando === 'START' ? 'EM_EXECUCAO' : 'PARADA';
        pendente = false;
        telemetria(msg.id);
      }, 220);
    });
    ws.on('close', () => {
      clearInterval(heartbeat);
      if (timerComando !== null) clearTimeout(timerComando);
    });
  });
  return {
    servidor,
    porta: servidor.address().port,
    fechar: () => new Promise(resolver => {
      for (const c of servidor.clients) c.terminate();
      servidor.close(resolver);
    }),
  };
}

if (require.main === module) {
  iniciarMockComandosG2().then(m => {
    console.log('[G2-MOCK] Simulador de comandos ativo: ws://127.0.0.1:' + m.porta + ROTA);
    console.log('[G2-MOCK] START/STOP virtuais com ACK e telemetria. NÃO conecta à Planta N2.');
    console.log('[G2-MOCK] Abra http://localhost:8081 e selecione "Teste START/STOP".');
    const fechar = async () => { await m.fechar(); process.exit(0); };
    process.once('SIGINT', fechar);
    process.once('SIGTERM', fechar);
  }).catch(e => { console.error('[G2-MOCK] '+e.message); process.exitCode = 1; });
}
module.exports = { iniciarMockComandosG2, PROTOCOLO, ROTA, HOST };
