import { registrarSocket } from './comandos';
import { lerTelemetria } from './regras';

/**
 * "App Shell" de bancada para o modo isolado do G2.
 *
 * Na integração da turma, quem abre o WebSocket com o broker é o App Shell do G1:
 * ele chama registrarSocket() e dispara o evento global smart40:telemetria.
 * Aqui fazemos o mesmo papel contra o simulador local, para testar sem a planta.
 */

export const EVENTO_TELEMETRIA = 'smart40:telemetria';
export type EstadoShell = 'DESLIGADO' | 'CONECTANDO' | 'CONECTADO' | 'RECONECTANDO' | 'ERRO';

interface InfoShell { estado: EstadoShell; endereco: string; mensagem: string }

const ESPERAS = [1000, 2000, 4000, 8000];
let info: InfoShell = { estado: 'DESLIGADO', endereco: 'ws://localhost:8094/smart40', mensagem: 'Shell local desligado.' };
const ouvintes = new Set<() => void>();
let socket: WebSocket | null = null;
let timer: number | null = null;
let tentativa = 0;
let desejado = false;

function mudar(parcial: Partial<InfoShell>) { info = { ...info, ...parcial }; ouvintes.forEach(o => o()); }

export function validarEnderecoShell(endereco: string, paginaHttps = false): string {
  let url: URL;
  try { url = new URL(endereco.trim()); } catch { throw new Error('Endereço WebSocket inválido.'); }
  if (!['ws:', 'wss:'].includes(url.protocol)) throw new Error('Use ws:// ou wss://.');
  if (url.username || url.password || url.search) throw new Error('Não coloque usuário, senha ou token na URL.');
  const local = ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.protocol === 'ws:' && !local) throw new Error('ws:// só no próprio computador; fora dele use wss://.');
  if (paginaHttps && url.protocol !== 'wss:') throw new Error('Página HTTPS exige wss://.');
  return url.toString();
}

function soltar() {
  registrarSocket(null);
  const s = socket; socket = null;
  if (s) { s.onopen = s.onmessage = s.onerror = s.onclose = null; try { s.close(); } catch { /* já fechado */ } }
  if (timer !== null) window.clearTimeout(timer);
  timer = null;
}

function agendar(motivo: string) {
  soltar();
  if (!desejado) return;
  const espera = ESPERAS[Math.min(tentativa, ESPERAS.length - 1)];
  tentativa++;
  mudar({ estado: 'RECONECTANDO', mensagem: `${motivo} Nova tentativa em ${espera / 1000} s.` });
  timer = window.setTimeout(abrir, espera);
}

function abrir() {
  let url: string;
  try { url = validarEnderecoShell(info.endereco, window.location.protocol === 'https:'); }
  catch (e) { desejado = false; mudar({ estado: 'ERRO', mensagem: (e as Error).message }); return; }
  soltar();
  mudar({ estado: tentativa > 0 ? 'RECONECTANDO' : 'CONECTANDO', mensagem: 'Conectando ao simulador...' });
  const s = new WebSocket(url);
  socket = s;
  s.onopen = () => {
    if (socket !== s) return;
    tentativa = 0;
    registrarSocket(s);
    mudar({ estado: 'CONECTADO', mensagem: 'Conectado. Socket registrado no barramento de comandos.' });
  };
  s.onmessage = ev => {
    if (socket !== s || typeof ev.data !== 'string') return;
    let bruto: unknown;
    try { bruto = JSON.parse(ev.data); } catch { return; }
    const t = lerTelemetria(bruto);
    if (t) window.dispatchEvent(new CustomEvent(EVENTO_TELEMETRIA, { detail: bruto }));
  };
  s.onerror = () => { if (socket === s) agendar('Falha de comunicação.'); };
  s.onclose = () => { if (socket === s) agendar('Conexão perdida.'); };
}

export const shellLocal = {
  obter: () => info,
  assinar(o: () => void) { ouvintes.add(o); return () => { ouvintes.delete(o); }; },
  definirEndereco(endereco: string) { if (!desejado) mudar({ endereco }); },
  conectar() { desejado = true; tentativa = 0; abrir(); },
  desconectar() { desejado = false; soltar(); mudar({ estado: 'DESLIGADO', mensagem: 'Shell local desligado.' }); },
};
