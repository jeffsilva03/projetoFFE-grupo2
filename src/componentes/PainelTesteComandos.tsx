import type { usarTesteComandos } from '../estado/usarTesteComandos';
import '../estilos/teste-comandos.css';

/** Apresentação do protocolo de teste — todo comando é destinado ao MOCK local. */
export function PainelTesteComandos({ teste }: { teste: ReturnType<typeof usarTesteComandos> }) {
  return <section className="real-teste-comandos" aria-label="Laboratório de START e STOP simulados">
    <header className="real-teste-topo">
      <div>
        <strong>LABORATÓRIO START / STOP — MOCK LOCAL</strong>
        <p>A botoeira envia solicitações exclusivamente ao simulador <code>127.0.0.1:8093</code>. A ponte Node-RED e o CLP não recebem comandos.</p>
      </div>
      {teste.conexao === 'CONECTADA' || teste.conexao === 'CONECTANDO'
        ? <button type="button" onClick={teste.desconectar}>Desconectar mock</button>
        : <button type="button" onClick={teste.conectar}>Conectar mock START/STOP</button>}
    </header>
    <div className="real-teste-resumo" role="status" aria-live="polite">
      <span><small>SESSÃO</small><strong>{teste.conexao}</strong></span>
      <span><small>ESTADO DO SIMULADOR</small><strong>{teste.estado === 'EM_EXECUCAO' ? 'Em execução' : teste.estado === 'PARADA' ? 'Parada' : 'Não informado'}</strong></span>
      <span><small>SEGURANÇA SIMULADA</small><strong>{teste.seguranca === 'OK' ? 'OK' : teste.seguranca === 'BLOQUEADA' ? 'Bloqueada' : 'Não informado'}</strong></span>
      <span><small>SOLICITAÇÃO ATUAL</small><strong>{teste.comandoPendente ? teste.comandoPendente+' — '+(teste.fase === 'ACK' ? 'ACK recebido' : 'Enviada') : 'Nenhuma pendente'}</strong></span>
    </div>
    <p className="real-teste-feedback">{teste.mensagem}</p>
    <div className="real-teste-cenario">
      <span>Teste de recusa:</span>
      <button type="button" disabled={!teste.podeEnviar || teste.seguranca === 'BLOQUEADA'}
        onClick={() => teste.simularSeguranca(true)}>Simular falha de segurança</button>
      <button type="button" disabled={!teste.podeEnviar || teste.seguranca === 'OK'}
        onClick={() => teste.simularSeguranca(false)}>Restabelecer condição simulada</button>
    </div>
    <details>
      <summary>Histórico de solicitações, ACKs e confirmações ({teste.historico.length})</summary>
      <ol className="real-teste-historico">
        {teste.historico.length === 0
          ? <li>Ainda não foram enviados comandos nesta sessão.</li>
          : teste.historico.map(item =>
            <li key={item.id}><time>{item.horario}</time> <strong>{item.etapa}</strong> {item.texto}</li>)}
      </ol>
    </details>
    <small>Somente START/STOP são enviados ao mock local. RESET, JOG e emergência permanecem desabilitados neste modo. ACK não equivale a execução; só a telemetria com o identificador da solicitação confirma o estado demonstrativo.</small>
  </section>;
}
