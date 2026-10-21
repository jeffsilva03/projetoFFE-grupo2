/**
 * URL da ponte de leitura. O browser nunca se conecta diretamente ao S7/PLC.
 * ws:// apenas local, wss:// para uma eventual publicação por proxy HTTPS autorizado.
 */
export function validarUrlPonteG2(endereco: string, origemHttps = false): string {
  let url: URL;
  try { url = new URL(endereco.trim()); }
  catch { throw new Error('Informe uma URL WebSocket válida.'); }
  if (!['ws:', 'wss:'].includes(url.protocol)) {
    throw new Error('O endereço deve começar com ws:// ou wss://.');
  }
  if (url.pathname !== '/telemetria' || url.search || url.hash || url.username || url.password) {
    throw new Error('Use apenas o endereço da ponte terminando em /telemetria, sem parâmetros ou senhas.');
  }
  const local = ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.protocol === 'ws:' && !local) {
    throw new Error('Fora deste computador, utilize wss:// com proxy seguro aprovado.');
  }
  if (origemHttps && url.protocol !== 'wss:') {
    throw new Error('Uma página HTTPS requer uma conexão wss://.');
  }
  return url.toString();
}
