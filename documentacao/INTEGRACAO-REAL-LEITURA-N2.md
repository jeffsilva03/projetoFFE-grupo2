# Integração real de leitura — Estação PROCESSO (Sprint 2)

## Origem comprovada e limites

Fotos da bancada de 04/11/2026 mostram o Node-RED em `192.168.150.200:1880`,
um nó S7 in `192.168.150.20:102@0:1` com indicador online e a Function
`global.set`, que grava estados `*_processo` no contexto global.
O resultado do teste TCP/1880 e o acesso ao editor confirmam acesso à rede.
**Isso não comprova que os estados estejam atualizados em todos os instantes,
nem que o START/STOP da nossa interface possa atuar fisicamente.**

A função `global.set` recebe `msg.payload.aguardando`, `emergencia`,
`manual`, `ocupado`, `cancelOP`, `finishOP`, `startOP`,
`comutadorAutomatico`, `condicaoIniciar`, `emergenciaAtivada`,
`homeGiro`, `homeVertical`, `servoGiro` e `servoVertical`.
A tabela em `src/dados/processoN2.ts` mantém a origem e os rótulos.
`startOP` e `finishOP` são **indicadores de ordem de produção**, não
comandos START e STOP nem equivalentes comprovados dos botões físicos.

## Arquitetura preparada

```text
CLP Processo --> S7 in (já existente) --> global.set (já existente)
                         |
                         +--> NOVA Function G2 N2 (somente leitura)
                                 --> NOVO HTTP Request POST autenticado
                                         --> ponte G2 8092
                                                 --> WS /telemetria
                                                         --> IHM React
```

O arquivo `documentacao/NODERED-FUNCTION-PROCESSO-N2.js` contém o código
para a **nova** Function; não deve ser executado em `global.set` nem substituir
fluxos existentes. A Function envia só as chaves observadas no S7 in.
A ponte valida token, tipo booleano, tempo, origem, bloqueia mensagens de
comando do WebSocket e invalida por tag após 3 segundos.

**CUIDADO COM DIFF:** a configuração real S7 in está com `diff` ligado.
Mesmo quando o CLP mantém um estado estável, uma variável pode não ser
reenviada. Logo, o indicador da IHM ficará `Não informado` depois de
3 segundos. Não gerar falsos timestamps com `global.get`, timers ou
`inject` para fazer um valor antigo parecer atual. Só considerar
uma mudança como dado novo quando houve leitura nova observada. Caso
seja necessário monitoramento estável, o professor deve validar uma
fonte de leitura periódica que consulte efetivamente o PLC, sem modificar
a lógica de controle, com qualidade e carimbo de tempo da aquisição.

## Topologia: atenção ao localhost

O gateway `ponte-nodered-g2.cjs` escuta SOMENTE `127.0.0.1:8092`.
Se ele for executado no **PC do estudante**, o Node-RED em
`192.168.150.200` NÃO conseguirá alcançá-lo usando 127.0.0.1
(o loopback aponta para o próprio computador do Node-RED).

Possibilidades a definir com responsável de rede/OT:
- Executar a ponte na própria máquina do Node-RED (se houver Node.js e
  autorização), com HTTP local 127.0.0.1; usar um túnel autorizado para
  trazer o WebSocket ao navegador do estudante.
- Publicar somente um endpoint HTTPS autenticado por um gateway aprovado
  da faculdade, com controle de acesso, TLS e origens permitidas.

**Não modificar a escuta para 0.0.0.0, não desativar autenticação,
não copiar token para o React e não abrir diretamente portas industriais.**

## Procedimento de integração supervisionada

1. Fazer backup/export dos fluxos do Node-RED antes de qualquer alteração.
2. Confirmar com o professor qual host vai executar a ponte e como será
   encaminhado o HTTPS/WS ou túnel autorizado.
3. Com o professor presente, criar Function e HTTP Request NOVOS, ramificando
   apenas a saída do S7 in da estação Processo. Não remover `global.set`.
4. Configurar `G2_BRIDGE_TOKEN` e `G2_BRIDGE_HTTP_URL` **nas variáveis
   do Node-RED** (sem inserir segredos no projeto ou screenshots).
5. O professor revisa e autoriza o Deploy parcial ou completo pertinente.
   A implementação no GitHub **não executa Deploy**.
6. Selecionar `Ponte G2 · leitura` no frontend; conectar ao WS da ponte.
   Abrir a seção `Leituras do Processo N2` e conferir valores rotulados
   e o indicador de validade. Nunca tomar dado nulo como `false`.
7. Validar mudança segura de pelo menos um sinal **sob supervisão** e
   comparar com a IHM física e o Context do Node-RED. Se não houver mensagens
   atuais, registrar o bloqueio por qualidade do dado.

## Segurança

A aplicação não envia START, STOP, RESET, JOG ou emergência à máquina.
O novo conjunto `processo_n2_*` é informativo e **não é apresentado como
estado validado do circuito de segurança**. A indicação global de
EMERGÊNCIA observada anteriormente impede qualquer presunção de
liberação operacional até confirmação física pelo professor.
Comandos remotos só devem ser considerados depois de análise OT e
projeto apropriado de segurança e autorização.
