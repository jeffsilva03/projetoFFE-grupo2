import { useState } from 'react';
import type { FonteDados, EstadoConexao } from '../tipos/conexao';
export const nomesConexao: Record<EstadoConexao, string> = { LOCAL: 'Simulação local', CONECTANDO: 'Conectando...', CONECTADO: 'Simulador conectado', DESCONECTADO: 'Simulador desconectado', SEM_TELEMETRIA: 'Sem telemetria', ERRO: 'Falha de conexão' };
export function ConexaoSimulador({ fonte, conectar, desconectar, usarLocal }: { fonte: FonteDados; conectar: (endereco: string, token: string) => string | null; desconectar: () => void; usarLocal: () => void }) {
  const [endereco, alterarEndereco] = useState(import.meta.env.VITE_URL_SIMULADOR || 'ws://localhost:8080');
  const [token, alterarToken] = useState(import.meta.env.VITE_TOKEN_SIMULADOR || 'aluno-token-grupo2');
  const [erro, alterarErro] = useState('');
  const aberta = ['CONECTANDO', 'CONECTADO', 'SEM_TELEMETRIA'].includes(fonte.estadoConexao);
  return <section className="ihm-conexao" aria-label="Conexão ao simulador">
    <div className="ihm-conexao-resumo"><div><strong>{nomesConexao[fonte.estadoConexao]}</strong><p>{fonte.remota ? fonte.disponivel ? 'Dados recebidos do servidor do professor.' : 'Estado atual indisponível. Comandos bloqueados.' : 'Conecte ao servidor para controlar o mock do professor.'}</p></div><div className="ihm-conexao-acoes">{aberta ? <button onClick={desconectar}>Desconectar</button> : <button className="principal" onClick={() => alterarErro(conectar(endereco, token) || '')}>{fonte.remota ? 'Reconectar simulador' : 'Conectar simulador'}</button>}{fonte.remota && <button onClick={() => { usarLocal(); alterarErro(''); }}>Usar simulação local</button>}</div></div>
    <details><summary>Configurar conexão</summary><div className="ihm-configuracao-conexao"><label>Endereço WebSocket<input type="url" aria-label="Endereço WebSocket" value={endereco} disabled={aberta} onChange={evento => alterarEndereco(evento.target.value)} spellCheck={false} /></label><label>Token do grupo<input type="password" aria-label="Token do grupo" value={token} disabled={aberta} onChange={evento => alterarToken(evento.target.value)} autoComplete="off" /></label></div></details>
    {erro && <p className="ihm-erro" role="alert">{erro}</p>}
    {fonte.remota && <div className="ihm-conexao-detalhes"><span>{fonte.telemetria ? `Última telemetria: ${new Date(fonte.telemetria.timestamp).toLocaleTimeString('pt-BR')}` : 'Aguardando primeira telemetria válida.'}</span><span>{fonte.comandoPendente ? `Aguardando ${fonte.comandoPendente}` : 'Desconectar ou trocar de fonte não envia STOP.'}</span></div>}
  </section>;
}
