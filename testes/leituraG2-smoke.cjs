/* Teste ponta a ponta do servidor WebSocket de leitura local.
 * Não usa planta real nem envia comandos ao PLC.
 */
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const WebSocket = require('ws');

async function executar() {
  const servidor = spawn(process.execPath, ['documentacao/simulador-leitura-g2.cjs'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let socket;
  try {
    await new Promise((resolver, rejeitar) => {
      const timeout = setTimeout(() => rejeitar(new Error('Servidor de leitura não iniciou.')), 5000);
      servidor.on('error', erro => { clearTimeout(timeout); rejeitar(erro); });
      servidor.on('exit', codigo => { clearTimeout(timeout); rejeitar(new Error(`Servidor encerrou antes da conexão: ${codigo}`)); });
      servidor.stdout.on('data', dados => {
        if (String(dados).includes('SOMENTE LEITURA')) {
          clearTimeout(timeout);
          resolver();
        }
      });
    });
    socket = new WebSocket('ws://127.0.0.1:8082?estacao=PROCESSO&cenario=start');
    const pacote = await new Promise((resolver, rejeitar) => {
      const timeout = setTimeout(() => rejeitar(new Error('Sem telemetria de teste.')), 5000);
      socket.once('error', erro => { clearTimeout(timeout); rejeitar(erro); });
      socket.once('message', dados => { clearTimeout(timeout); resolver(JSON.parse(String(dados))); });
    });
    assert.equal(pacote.estacao, 'PROCESSO');
    assert.equal(pacote.sinais.processo_botaoVerde, true);
    assert.equal(pacote.sinais.processo_botaoVermelho, false);
    assert.equal(pacote.sinais.processo_segurancaOK, true);
    assert.ok(Number.isFinite(Date.parse(pacote.timestamp)));
    const fechado = new Promise((resolver, rejeitar) => {
      const timeout = setTimeout(() => rejeitar(new Error('Fonte não bloqueou tentativa de comando.')), 5000);
      socket.once('close', codigo => { clearTimeout(timeout); resolver(codigo); });
    });
    socket.send(JSON.stringify({ origem: 'IHM', acao: 'START' }));
    assert.equal(await fechado, 1008);
    console.log('Teste WebSocket G2: telemetria recebida e comando bloqueado.');
  } finally {
    if (socket) socket.terminate();
    servidor.kill();
  }
}
executar().catch(erro => { console.error(erro); process.exitCode = 1; });
