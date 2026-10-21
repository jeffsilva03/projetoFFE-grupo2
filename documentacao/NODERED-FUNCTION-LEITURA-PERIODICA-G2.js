// NODE-RED FUNCTION: publica LEITURAS NOVAS em intervalos de 1 segundo.
// Preparado para receber msg.payload de um nó S7 IN de LEITURA, mode=all e diff=false.
// Precisa da autorização do professor antes de ligar ao PLC. NÃO altere o S7 IN original.
// NÃO armazena/reenvia valores antigos e NÃO envia comandos Siemens.

const agora = Date.now();
const anterior = Number(context.get('g2_ultima_leitura_enviada') || 0);
const intervaloMs = 1000;
if (anterior > 0 && agora - anterior < intervaloMs) return null;

const bruto = msg.payload;
if (bruto === null || typeof bruto !== 'object' || Array.isArray(bruto)) {
  node.warn('G2: S7 não entregou um objeto de sinais.');
  return null;
}

const grupos = {
  ESTOQUE: [
    'emergencia', 'emergenciaAtivada', 'comutadorAutomatico',
    'ocupado', 'aguardando', 'condicaoIniciar',
  ],
  PROCESSO: [
    'processo_segurancaOK', 'processo_chaveAutomatico',
    'processo_botaoVerde', 'processo_botaoVermelho',
    'processo_atuadoresPosicaoOK', 'processo_atuadoresOcupado',
  ],
  MONTAGEM: [
    'montagem_segurancaOK', 'montagem_chaveAutomatico',
    'montagem_botaoVerde', 'montagem_botaoVermelho',
  ],
  EXPEDICAO: [
    'expedicao_segurancaOK', 'expedicao_chaveAutomatico',
    'expedicao_botaoVerde', 'expedicao_botaoVermelho',
    'expedicao_atuadorPosicaoOK', 'expedicao_atuadorOcupado',
  ],
};

const sinais = {};
const contagem = {};
for (const [estacao, tags] of Object.entries(grupos)) {
  contagem[estacao] = 0;
  for (const tag of tags) {
    if (!Object.prototype.hasOwnProperty.call(bruto, tag)) continue;
    const valor = bruto[tag];
    if (valor === null || typeof valor === 'boolean') {
      sinais[tag] = valor;
      contagem[estacao] += 1;
    } else {
      node.warn('G2: tipo não validado para ' + tag + '. Sinal omitido.');
    }
  }
}
if (!Object.keys(sinais).length) {
  node.warn('G2: nenhuma tag do painel disponível nesta leitura.');
  return null;
}

const token = env.get('G2_BRIDGE_TOKEN');
if (typeof token !== 'string' || token.length < 16) {
  node.error('G2_BRIDGE_TOKEN ausente. Não publicar telemetria.');
  return null;
}

const endereco = String(env.get('G2_BRIDGE_HTTP_URL') ||
  'http://127.0.0.1:8092/api/g2/telemetria').trim();
const local = /^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d{1,5})?\/api\/g2\/telemetria$/.test(endereco);
const https = /^https:\/\/[a-zA-Z0-9.-]+(?::\d{1,5})?\/api\/g2\/telemetria$/.test(endereco);
if (!local && !https) {
  node.error('G2: configure apenas HTTP local ou HTTPS autorizado.');
  return null;
}

// Este horário marca uma nova mensagem recebida do S7 IN,
// NUNCA um replay de cache disparado por Inject.
msg.method = 'POST';
msg.url = endereco;
msg.headers = {
  'content-type': 'application/json',
  'x-g2-bridge-token': token,
};
msg.payload = { timestamp: new Date(agora).toISOString(), sinais };
context.set('g2_ultima_leitura_enviada', agora);

// Saída opcional para DEBUG. Não aparece para o navegador e não inclui token.
node.status({ fill: 'green', shape: 'dot', text:
  'G2: ' + Object.keys(sinais).length + ' sinais observados · ' +
  Object.entries(contagem).map(([e, n]) => e + '=' + n).join(' / ')
});

return msg;
