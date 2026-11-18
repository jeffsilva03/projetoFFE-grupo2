import { usarPonteTelemetria } from './usarPonteTelemetria';

/**
 * Visão da estação de Processo sobre a ponte compartilhada.
 * Canal exclusivamente de leitura: nenhum socket.send, nenhum protocolo de PLC no navegador.
 */
export function usarPonteProcesso() {
  const ponte = usarPonteTelemetria();
  const registro = ponte.registros.PROCESSO;
  const atualizada = ponte.atual('PROCESSO');
  return {
    conexao: ponte.conexao,
    ativa: ponte.ativa,
    endereco: ponte.endereco,
    definirEndereco: ponte.definirEndereco,
    amostra: registro?.amostra ?? null,
    atualizada,
    mensagem: ponte.mensagem,
    conectar: ponte.conectar,
    desconectar: ponte.desconectar,
  };
}
