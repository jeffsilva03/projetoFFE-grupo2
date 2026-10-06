# Validação da versão 1.1

- Verificação TypeScript e builds independente e ESM concluídos.
- Treze testes automatizados de lógica/protocolo passaram, cobrindo segurança local, validação de telemetria, campos obrigatórios, modos, enumerações, URL/token, comandos suportados e tradução de trava/estado.
- Na validação inicial, o simulador original do professor foi executado sem modificações. A adaptação posterior para Render foi verificada com HTTP 200, origem adicional autorizada, rejeição de origem semelhante não autorizada (403), token inválido (401), telemetria e comandos STOP/START.
- Os quatro comandos START, STOP, RESET e EMERGENCY_STOP foram recebidos pelo servidor e seus estados foram observados no navegador.
- Servidor pausado antes de STOP: a tela permaneceu no estado recebido anteriormente até a nova telemetria, sem mudança otimista.
- STOP após emergência alterou o estado bruto para PRONTA, mantendo a trava: a interface continuou mostrando Emergência.
- Alteração feita por um segundo cliente WebSocket também apareceu no painel.
- Token inválido foi recusado; a interface mostrou falha e bloqueou os comandos.
- Pausa de telemetria por mais de 3 segundos bloqueou comandos e marcou o estado atual como indisponível; a retomada de dados válidos recuperou o painel.
- Encerramento do servidor, reinicialização e reconexão manual verificados. Nenhum comando foi reenviado.
- Retorno à simulação local verificado sem misturar dados do mock.
- Layout conectado verificado nas larguras 320, 390, 768, 1024 e 1440 pixels, sem transbordamento horizontal.
- Regressão dos controles locais e do ciclo de vida ESM (montagem/desmontagem/remontagem) concluída.
- Sem erros de JavaScript nos fluxos testados; capturas de computador e celular revisadas.

A integração com o App Shell real do Grupo 1 e a planta física ainda não foi realizada. O servidor original não possui ACK nem ID de comando; os testes verificam as mensagens recebidas e os estados publicados, sem exigir um contrato inexistente.
