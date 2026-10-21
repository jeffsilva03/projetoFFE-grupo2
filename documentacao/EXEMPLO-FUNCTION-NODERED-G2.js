// COLE este código em um nó FUNCTION novo do Node-RED (apenas leitura).
// Entrada: msg.payload do nó S7 IN fornecido pelo professor.
// Saída: HTTP POST local, ou HTTPS por gateway autorizado.
// O timestamp é produzido somente no momento da chegada do S7 IN.
// Com diff:true, ausência de mudanças NÃO comprova comunicação saudável.
// Antes de ativar junto ao PLC real: autorização do professor/OT.
// Não edite os nós S7 OUT nem inclua credenciais industriais neste código.

const bruto = msg.payload;
if (bruto === null || typeof bruto !== 'object' || Array.isArray(bruto)) {
  return null;
}

const tagsG2 = [
  // ESTOQUE (DB9)
  'emergencia', 'emergenciaAtivada', 'comutadorAutomatico',
  'ocupado', 'aguardando', 'condicaoIniciar',
  // PROCESSO (DB101)
  'processo_segurancaOK', 'processo_chaveAutomatico',
  'processo_botaoVerde', 'processo_botaoVermelho',
  'processo_atuadoresPosicaoOK', 'processo_atuadoresOcupado',
  // MONTAGEM (DB102)
  'montagem_segurancaOK', 'montagem_chaveAutomatico',
  'montagem_botaoVerde', 'montagem_botaoVermelho',
  // EXPEDIÇÃO (DB103)
  'expedicao_segurancaOK', 'expedicao_chaveAutomatico',
  'expedicao_botaoVerde', 'expedicao_botaoVermelho',
  'expedicao_atuadorPosicaoOK', 'expedicao_atuadorOcupado',
];

const sinais = {};
for (const tag of tagsG2) {
  if (!Object.prototype.hasOwnProperty.call(bruto, tag)) continue;
  const valor = bruto[tag];
  if (valor === null || typeof valor === 'boolean') sinais[tag] = valor;
  else node.warn('Sinal G2 ignorado por tipo inválido: ' + tag);
}
if (!Object.keys(sinais).length) return null;

const token = env.get('G2_BRIDGE_TOKEN');
if (typeof token !== 'string' || token.length < 16) {
  node.error('G2_BRIDGE_TOKEN não configurado no Node-RED.');
  return null;
}

msg.method = 'POST';
const endereco = String(env.get('G2_BRIDGE_HTTP_URL') || 'http://127.0.0.1:8092/api/g2/telemetria').trim();
const local = /^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d{1,5})?\/api\/g2\/telemetria$/.test(endereco);
const seguro = /^https:\/\/[a-zA-Z0-9.-]+(?::\d{1,5})?\/api\/g2\/telemetria$/.test(endereco);
if (!local && !seguro) {
  node.error('Endereço G2 inválido. Use HTTP local ou HTTPS por gateway autorizado.');
  return null;
}
msg.url = endereco;
msg.headers = {
  'content-type': 'application/json',
  'x-g2-bridge-token': token,
};
msg.payload = { timestamp: new Date().toISOString(), sinais };
return msg;
