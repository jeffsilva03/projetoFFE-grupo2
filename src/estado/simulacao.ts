import type { AcaoMaquina, EstadoMaquina } from '../tipos/maquina';

export const estadoInicial: EstadoMaquina = {
  estado: 'PARADA', modo: 'AUTOMATICO', direcao: 'PARADO',
  emergenciaTravada: false, segurancaRestabelecida: true,
  pressao: 6.2, posicao: 50, produzidas: 0, progressoCiclo: 0,
  parametros: { velocidade: 65, quantidade: 20 },
  avisoSonoroSilenciado: false, falhaReconhecida: false,
  mensagem: 'Sistema pronto. Pressione INICIAR para operar.',
};
export const segurancaOk = (maquina: EstadoMaquina) => maquina.segurancaRestabelecida && maquina.pressao >= 4.5;
export const possuiBloqueio = (maquina: EstadoMaquina) => maquina.emergenciaTravada || !segurancaOk(maquina) || maquina.estado === 'EMERGENCIA' || maquina.estado === 'FALHA_SEGURANCA';

export function reduzirMaquina(maquina: EstadoMaquina, acao: AcaoMaquina): EstadoMaquina {
  const parada = { direcao: 'PARADO' as const, progressoCiclo: 0 };
  switch (acao.tipo) {
    case 'EMERGENCIA':
      return { ...maquina, ...parada, estado: 'EMERGENCIA', emergenciaTravada: true, avisoSonoroSilenciado: false, falhaReconhecida: false, mensagem: 'Emergência acionada. Destrave o botão e pressione REARMAR.' };
    case 'DESTRAVAR_EMERGENCIA':
      return { ...maquina, emergenciaTravada: false, mensagem: 'Botão destravado. Pressione REARMAR para liberar o sistema.' };
    case 'REARMAR':
      if (maquina.emergenciaTravada) return { ...maquina, mensagem: 'Rearme bloqueado: destrave o botão de emergência primeiro.' };
      if (!segurancaOk(maquina)) return { ...maquina, mensagem: 'Rearme bloqueado: restabeleça a segurança e a pressão (mínimo 4,5 bar).' };
      return { ...maquina, ...parada, estado: 'PARADA', avisoSonoroSilenciado: false, falhaReconhecida: false, mensagem: 'Sistema rearmado. Aguardando uma nova partida.' };
    case 'PARAR':
      return { ...maquina, ...parada, estado: possuiBloqueio(maquina) ? maquina.estado : 'PARADA', mensagem: possuiBloqueio(maquina) ? 'Movimentos parados. O bloqueio permanece ativo.' : 'Parada solicitada. Todos os movimentos interrompidos.' };
    case 'INICIAR':
      if (possuiBloqueio(maquina)) return { ...maquina, mensagem: 'Partida bloqueada. Verifique a segurança e rearme o sistema.' };
      if (maquina.modo === 'MANUAL') return { ...maquina, mensagem: 'Modo manual: mantenha uma seta pressionada para movimentar.' };
      return { ...maquina, estado: 'OPERANDO', direcao: 'DIREITA', produzidas: maquina.produzidas >= maquina.parametros.quantidade ? 0 : maquina.produzidas, mensagem: 'Ciclo automático iniciado. Máquina em operação.' };
    case 'ALTERAR_MODO':
      if (maquina.estado !== 'PARADA') return { ...maquina, mensagem: 'Pare e libere a máquina antes de alterar o modo.' };
      return { ...maquina, ...parada, modo: acao.modo, mensagem: acao.modo === 'MANUAL' ? 'Modo manual selecionado. Mantenha as setas pressionadas.' : 'Modo automático selecionado. Pressione INICIAR.' };
    case 'MOVER':
      if (maquina.modo !== 'MANUAL' || possuiBloqueio(maquina)) return maquina;
      return { ...maquina, estado: 'OPERANDO', direcao: acao.direcao, mensagem: `Movimentação manual para a ${acao.direcao === 'ESQUERDA' ? 'esquerda' : 'direita'}. Solte para parar.` };
    case 'PARAR_MOVIMENTO':
      if (maquina.modo !== 'MANUAL' || maquina.estado !== 'OPERANDO') return maquina;
      return { ...maquina, ...parada, estado: 'PARADA', mensagem: 'Movimento manual interrompido. Máquina parada.' };
    case 'ALTERAR_SEGURANCA': {
      const alterada = { ...maquina, segurancaRestabelecida: acao.restabelecida };
      if (!acao.restabelecida) return { ...alterada, ...parada, estado: maquina.estado === 'EMERGENCIA' ? 'EMERGENCIA' : 'FALHA_SEGURANCA', falhaReconhecida: false, avisoSonoroSilenciado: false, mensagem: 'Falha de segurança simulada. Movimentos bloqueados.' };
      return { ...alterada, mensagem: 'Circuito de segurança restabelecido. Pressione REARMAR.' };
    }
    case 'ALTERAR_PRESSAO': {
      const alterada = { ...maquina, pressao: Math.max(0, Math.min(8, acao.pressao)) };
      if (alterada.pressao < 4.5) return { ...alterada, ...parada, estado: maquina.estado === 'EMERGENCIA' ? 'EMERGENCIA' : 'FALHA_SEGURANCA', falhaReconhecida: false, avisoSonoroSilenciado: false, mensagem: 'Pressão insuficiente. Restabeleça pelo menos 4,5 bar e rearme.' };
      return { ...alterada, mensagem: possuiBloqueio(maquina) ? 'Pressão restabelecida. Verifique a segurança e pressione REARMAR.' : 'Pressão pneumática atualizada na simulação.' };
    }
    case 'APLICAR_PARAMETROS':
      if (maquina.estado !== 'PARADA') return { ...maquina, mensagem: 'Pare e libere a máquina antes de aplicar parâmetros.' };
      if (!Number.isInteger(acao.parametros.quantidade) || acao.parametros.quantidade < 1 || acao.parametros.quantidade > 999 || !Number.isFinite(acao.parametros.velocidade) || acao.parametros.velocidade < 10 || acao.parametros.velocidade > 100) return { ...maquina, mensagem: 'Parâmetros inválidos. Velocidade: 10 a 100%. Lote: 1 a 999 peças.' };
      return { ...maquina, parametros: acao.parametros, produzidas: 0, progressoCiclo: 0, mensagem: 'Parâmetros aplicados. Novo lote pronto para iniciar.' };
    case 'SILENCIAR':
      return { ...maquina, avisoSonoroSilenciado: !maquina.avisoSonoroSilenciado, mensagem: maquina.avisoSonoroSilenciado ? 'Sinalização visual do alarme reativada.' : 'Alarme reconhecido visualmente. O bloqueio permanece ativo.' };
    case 'RECONHECER_FALHA':
      return { ...maquina, falhaReconhecida: true, mensagem: 'Falha reconhecida. Restabeleça a condição e pressione REARMAR.' };
    case 'PASSO': {
      if (maquina.estado !== 'OPERANDO' || possuiBloqueio(maquina)) return maquina;
      const deslocamento = maquina.parametros.velocidade / 100 * 2;
      const posicao = maquina.modo === 'MANUAL' ? Math.max(0, Math.min(100, maquina.posicao + (maquina.direcao === 'DIREITA' ? deslocamento : -deslocamento))) : (maquina.posicao + deslocamento) % 100;
      if (maquina.modo === 'MANUAL') return { ...maquina, posicao };
      const progressoCiclo = maquina.progressoCiclo + maquina.parametros.velocidade / 100;
      const produzidas = maquina.produzidas + (progressoCiclo >= 30 ? 1 : 0);
      if (produzidas >= maquina.parametros.quantidade) return { ...maquina, ...parada, posicao, produzidas, estado: 'PARADA', mensagem: 'Lote concluído. Máquina parada, aguardando nova partida.' };
      return { ...maquina, posicao, produzidas, progressoCiclo: progressoCiclo >= 30 ? 0 : progressoCiclo };
    }
  }
}
