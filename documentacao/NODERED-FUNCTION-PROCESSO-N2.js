// NODE-RED > PROCESSO > Function NOVA: "G2 | Exportar leitura N2" (SOMENTE LEITURA).
// Ligar uma DERIVAÇÃO do nó S7 in de PROCESSO a esta Function, sem remover
// a ligação existente para global.set. A saída desta Function vai para um
// HTTP Request NOVO (método "use msg.method", resposta descartada).
//
// ATENÇÃO: o S7 in fotografado usa "Emit only when value changes (diff)".
// Esta Function envia SOMENTE os campos que chegaram em msg.payload naquele
// instante, SEM global.get, sem inject, sem replay e SEM inventar heartbeat.
// Valores não reobservados devem expirar na ponte após 3 segundos.
// Esta taxa é indicativo de frescor do dado, NÃO comprovante de CLP online.
//
// CONFIGURAÇÕES APROVADAS PELO RESPONSÁVEL DA REDE:
// G2_BRIDGE_TOKEN = segredo longo (não colar no código, logs ou prints)
// G2_BRIDGE_HTTP_URL = destino HTTPS autenticado ou HTTP 127.0.0.1 na mesma
// máquina do Node-RED (ver documento de implantação).
// Nenhum comando, escrita S7, JOG, START/STOP ou parada de emergência é enviado.

const bruto = msg.payload;
if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) {
    node.warn('G2 N2: payload do S7 não é objeto.');
    return null;
}

// Nomes confirmados visualmente na função global.set; NÃO são variáveis
// de comando da nossa aplicação.
const mapa = {
    aguardando: 'processo_n2_aguardando',
    emergencia: 'processo_n2_emergencia',
    manual: 'processo_n2_manual',
    ocupado: 'processo_n2_ocupado',
    cancelOP: 'processo_n2_cancelOP',
    finishOP: 'processo_n2_finishOP',
    startOP: 'processo_n2_startOP',
    comutadorAutomatico: 'processo_n2_comutadorAutomatico',
    condicaoIniciar: 'processo_n2_condicaoIniciar',
    emergenciaAtivada: 'processo_n2_emergenciaAtivada',
    homeGiro: 'processo_n2_homeGiro',
    homeVertical: 'processo_n2_homeVertical',
    servoGiro: 'processo_n2_servoGiro',
    servoVertical: 'processo_n2_servoVertical'
};
const sinais = {};
for (const [entrada, saida] of Object.entries(mapa)) {
    if (!Object.prototype.hasOwnProperty.call(bruto, entrada)) continue;
    if (typeof bruto[entrada] === 'boolean') sinais[saida] = bruto[entrada];
    else node.warn('G2 N2: ignorado campo não booleano: ' + entrada);
}
if (Object.keys(sinais).length === 0) return null;

const token = env.get('G2_BRIDGE_TOKEN');
if (typeof token !== 'string' || token.length < 16) {
    node.error('G2 N2: token ausente. Não publicar dados.');
    return null;
}
const url = String(env.get('G2_BRIDGE_HTTP_URL') || '').trim();
let destino;
try { destino = new URL(url); }
catch { node.error('G2 N2: URL da ponte inválida.'); return null; }
const loopback = destino.protocol === 'http:' &&
    ['127.0.0.1', 'localhost'].includes(destino.hostname);
const seguro = destino.protocol === 'https:' &&
    !destino.username && !destino.password;
if ((!loopback && !seguro) ||
    destino.pathname !== '/api/g2/telemetria' ||
    destino.search || destino.hash) {
    node.error('G2 N2: somente HTTPS aprovado ou loopback local.');
    return null;
}
msg.method = 'POST';
msg.url = destino.toString();
msg.headers = {
    'content-type': 'application/json',
    'x-g2-bridge-token': token
};
msg.payload = {
    estacao: 'PROCESSO',
    timestamp: new Date().toISOString(),
    sinais
};
node.status({fill:'blue',shape:'dot',text:'G2 N2: ' +
    Object.keys(sinais).length + ' campos observados; somente leitura'});
return msg;
