import { useEffect, useSyncExternalStore } from 'react';
import { usarComandos } from '../../comandos/ProvedorComandos';
import { usarDoisPassos } from '../../comandos/usarDoisPassos';
import { exportarAuditoria, type RegistroAuditoria } from '../../comandos/estadoComando';
import { ESTACAO_ALVO, ESTACOES, statusDe } from '../../comandos/regras';
import { shellLocal } from '../../comandos/shellLocal';

const nomeAcao: Record<string, string> = { start: 'START', stop: 'STOP', reset: 'RESET', emergencia: 'EMERGÊNCIA' };
const nomeEstacao: Record<string, string> = { estoque: 'Estoque', processo: 'Processo', montagem: 'Montagem', expedicao: 'Expedição' };

/** Endereços da tabela 6.1: EXEMPLOS do documento, ainda não confirmados no programa real. */
const MAPEAMENTO = [
  { botao: 'Start', acao: 'Iniciar ciclo', variavel: 'DB1.DBX0.0 (exemplo)', seguranca: 'Confirmação em dois passos' },
  { botao: 'Stop', acao: 'Parar ciclo', variavel: 'DB1.DBX0.1 (exemplo)', seguranca: 'Disponível com a estação operando' },
  { botao: 'Reset', acao: 'Reiniciar falha', variavel: 'DB1.DBX0.2 (exemplo)', seguranca: 'Dois passos; único comando em emergência' },
  { botao: 'Emergência', acao: 'Parada de emergência', variavel: 'DB1.DBX0.3 (exemplo)', seguranca: 'Fail-safe; prevalece sobre tudo' },
];

function baixarAuditoria(auditoria: RegistroAuditoria[]) {
  const blob = new Blob([exportarAuditoria(auditoria)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `auditoria-g2-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function hora(iso?: string) {
  return iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour12: false }) + '.' + String(new Date(iso).getMilliseconds()).padStart(3, '0') : '—';
}

export function PainelComandos() {
  const c = usarComandos();
  const shell = useSyncExternalStore(shellLocal.assinar, shellLocal.obter);
  const start = usarDoisPassos(3000, () => c.solicitar('start'));
  const reset = usarDoisPassos(5000, () => c.solicitar('reset'));
  const { desarmar: desarmarStart } = start;
  const { desarmar: desarmarReset } = reset;
  useEffect(() => { if (!c.permitidos.start) desarmarStart(); }, [c.permitidos.start, desarmarStart]);
  useEffect(() => { if (!c.permitidos.reset) desarmarReset(); }, [c.permitidos.reset, desarmarReset]);

  const shellAtivo = shell.estado === 'CONECTADO' || shell.estado === 'CONECTANDO' || shell.estado === 'RECONECTANDO';
  const p = c.estado.pendente;
  const alvo = statusDe(c.telemetria, ESTACAO_ALVO);

  return <section className="s3-comandos" aria-label="Comandos da botoeira — Sprint 3">
    {c.travado && <div className="s3-faixa" role="alert">BANCADA EM EMERGÊNCIA - comandos bloqueados
      <small>Só o RESET (dois passos) pode ser enviado. A interface só destrava com reset confirmado pela telemetria.</small></div>}

    <div className="s3-aviso-topo">
      <strong>SPRINT 3 · COMANDOS · SIMULADOR</strong>
      <span>O controle remoto envia a intenção; quem executa é o CLP. Os endereços reais dos bits ainda precisam ser confirmados no programa carregado.</span>
    </div>

    <div className="s3-cartao s3-shell">
      <label>Conexão (papel do App Shell em modo isolado)
        <input type="url" spellCheck={false} value={shell.endereco} disabled={shellAtivo}
          onChange={e => shellLocal.definirEndereco(e.target.value)} aria-label="Endereço WebSocket do simulador de comandos" />
      </label>
      {shellAtivo
        ? <button type="button" onClick={shellLocal.desconectar}>Desconectar</button>
        : <button type="button" className="principal" onClick={shellLocal.conectar}>Conectar</button>}
      <p role="status"><b className={shell.estado === 'CONECTADO' ? 'ok' : 'nao'}>{shell.estado}</b> {shell.mensagem}</p>
    </div>

    <div className="s3-grade">
      <div className="s3-cartao">
        <h2>Estações (telemetria)</h2>
        <p className={c.telemetriaAtual ? 's3-tel ok' : 's3-tel nao'}>
          {c.telemetriaAtual ? 'Telemetria atual' : 'Sem telemetria atual — comandos bloqueados'}
        </p>
        <ul className="s3-estacoes">
          {ESTACOES.map(e => {
            const s = c.telemetriaAtual ? statusDe(c.telemetria, e) : undefined;
            return <li key={e} className={'st-' + (s ?? 'NA').toLowerCase()}>
              <span>{nomeEstacao[e]}{e === ESTACAO_ALVO ? ' · alvo' : ''}</span><strong>{s ?? 'Não informado'}</strong>
            </li>;
          })}
        </ul>
      </div>

      <div className="s3-cartao">
        <h2>Botoeira</h2>
        <div className="s3-botoes">
          <button type="button" className={'s3-bt verde' + (start.armado ? ' armado' : '')} disabled={!c.permitidos.start} onClick={start.clicar}>
            {start.armado ? 'CONFIRMAR START?' : 'START'}
          </button>
          <button type="button" className="s3-bt vermelho" disabled={!c.permitidos.stop} onClick={() => c.solicitar('stop')}>STOP</button>
          <button type="button" className={'s3-bt azul' + (reset.armado ? ' armado' : '')} disabled={!c.permitidos.reset} onClick={reset.clicar}>
            {reset.armado ? 'CONFIRMAR RESET?' : 'RESET'}
          </button>
        </div>
        <p className="s3-estado-cmd" role="status" aria-live="polite">
          {p ? <>⏳ {nomeAcao[p.acao]} <b>PENDENTE</b> — aguardando a máquina confirmar (pode levar até 2 s; limite 5 s).</>
            : alvo ? <>Processo: <b>{alvo}</b>. {start.armado ? 'Clique de novo em até 3 s para confirmar.' : reset.armado ? 'Clique de novo em até 5 s para confirmar.' : ''}</>
              : 'Sem estado da estação.'}
        </p>
        {c.estado.aviso && <p className="s3-aviso" role="alert">{c.estado.aviso}</p>}
      </div>
    </div>

    <div className="s3-cartao">
      <div className="s3-titulo-linha">
        <h2>Trilha de auditoria (últimos 10)</h2>
        <button type="button" disabled={c.estado.auditoria.length === 0} onClick={() => baixarAuditoria(c.estado.auditoria)}>Exportar JSON ({c.estado.auditoria.length})</button>
      </div>
      <table className="s3-tabela">
        <thead><tr><th>Clique</th><th>Comando</th><th>Estado</th><th>Confirmação</th><th>Δ ms</th><th>Motivo</th></tr></thead>
        <tbody>
          {c.estado.auditoria.slice(0, 10).map(r => <tr key={r.id} className={'est-' + r.estado.toLowerCase()}>
            <td>{hora(r.instante)}</td><td>{nomeAcao[r.acao]}</td><td>{r.estado}</td>
            <td>{hora(r.finalizadoEm)}</td><td>{r.latenciaMs ?? '—'}</td><td>{r.motivo ?? ''}</td>
          </tr>)}
          {c.estado.auditoria.length === 0 && <tr><td colSpan={6}>Nenhum comando ainda.</td></tr>}
        </tbody>
      </table>
      <small>Sem registro não dá para investigar por que a máquina parou: cada comando fica com origem, ação, instante e estado final.</small>
    </div>

    <details className="s3-cartao">
      <summary>Mapeamento botão → bit (6.1) — pendente de validação</summary>
      <table className="s3-tabela">
        <thead><tr><th>Botão</th><th>Ação</th><th>Variável no CLP</th><th>Segurança</th></tr></thead>
        <tbody>{MAPEAMENTO.map(m => <tr key={m.botao}><td>{m.botao}</td><td>{m.acao}</td><td>{m.variavel}</td><td>{m.seguranca}</td></tr>)}</tbody>
      </table>
      <small>Em 18/11 a escrita em DB101,X1.0 (tabela antiga do Node-RED) foi aceita pelo CLP mas não parou a esteira: o DB101 da tabela não corresponde ao programa atual. Os bits reais saem do projeto TIA e precisam da assinatura do instrutor.</small>
    </details>
  </section>;
}
