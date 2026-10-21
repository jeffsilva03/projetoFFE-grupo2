'use strict';
/** Gera dados artificiais das quatro estações e envia à ponte local. */
const crypto = require('node:crypto');
const { iniciarPonte } = require('./ponte-nodered-g2.cjs');

function gerarPacote(passo = 0) {
  const fase = passo % 24;
  const start = fase >= 6 && fase < 10;
  const stop = fase >= 15 && fase < 18;
  const emergencia = fase >= 19 && fase < 22;
  const ocupado = fase >= 10 && fase < 15;
  return {
    timestamp: new Date().toISOString(),
    sinais: {
      // ESTOQUE (DB9)
      emergencia,
      emergenciaAtivada: emergencia,
      comutadorAutomatico: true,
      ocupado: ocupado && !emergencia,
      aguardando: !ocupado && !emergencia,
      condicaoIniciar: !emergencia,
      // PROCESSO (DB101)
      processo_segurancaOK: !emergencia,
      processo_chaveAutomatico: true,
      processo_botaoVerde: start,
      processo_botaoVermelho: stop,
      processo_atuadoresPosicaoOK: !ocupado,
      processo_atuadoresOcupado: ocupado,
      // MONTAGEM (DB102)
      montagem_segurancaOK: !emergencia,
      montagem_chaveAutomatico: true,
      montagem_botaoVerde: start,
      montagem_botaoVermelho: stop,
      // EXPEDIÇÃO (DB103)
      expedicao_segurancaOK: !emergencia,
      expedicao_chaveAutomatico: true,
      expedicao_botaoVerde: start,
      expedicao_botaoVermelho: stop,
      expedicao_atuadorPosicaoOK: !ocupado,
      expedicao_atuadorOcupado: ocupado,
    },
  };
}

async function executarDemo() {
  // Token efêmero somente para o processo de demonstração, nunca salvo em disco.
  const token = crypto.randomBytes(24).toString('hex');
  const ponte = await iniciarPonte({ token });
  const url = `http://127.0.0.1:${ponte.porta}/api/g2/telemetria`;
  console.log('[G2] Demonstração local de Node-RED --> Ponte --> IHM, quatro estações.');
  console.log('[G2] Abra http://localhost:8081 e selecione Sprint 2 · Ponte Node-RED.');
  console.log('[G2] NENHUMA conexão física com a Planta N2.');
  let passo = 0;
  let emAndamento = false;
  async function enviar() {
    if (emAndamento) return;
    emAndamento = true;
    try {
      const resposta = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-g2-bridge-token': token },
        body: JSON.stringify(gerarPacote(passo++)),
        signal: AbortSignal.timeout(2000),
      });
      if (!resposta.ok) console.error('[G2] Falha no envio de teste:', resposta.status);
    } catch (erro) {
      console.error('[G2] Erro na demonstração:', erro.message);
    } finally { emAndamento = false; }
  }
  await enviar();
  const intervalo = setInterval(enviar, 500);
  const encerrar = async () => {
    clearInterval(intervalo);
    await ponte.fechar();
    process.exit(0);
  };
  process.once('SIGINT', encerrar);
  process.once('SIGTERM', encerrar);
}

if (require.main === module) executarDemo().catch(erro => { console.error(erro.message); process.exitCode = 1; });
module.exports = { gerarPacote };
