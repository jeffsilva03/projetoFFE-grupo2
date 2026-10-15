# Integração com o mock e futura integração com App Shell — Grupo 2

## Servidor de testes do professor

O arquivo `simulador-professor.cjs` deriva do `mock_server_smart40.js`, renomeado para `.cjs` para preservar CommonJS dentro deste projeto ES Modules. Mantém o contrato e a lógica do professor, com ajustes para hospedagem: `ORIGENS_PERMITIDAS` aceita origens adicionais separadas por vírgula, a comparação de origem é exata, a escuta usa `0.0.0.0` e o token não aparece nos logs. Veja [Render](RENDER.md).

Para executá-lo em outro terminal:

```bash
npm.cmd install
npm.cmd run simulador
```

Endpoint: `ws://localhost:8080?token=aluno-token-grupo2`.

O frontend abre essa conexão ao clicar em **Conectar simulador**. Autentica pelo token na URL e usa a telemetria como fonte do estado. O servidor começa em operação automática; a interface local começa parada. Ao conectar, a tela assume os dados do servidor, sem enviar START automaticamente.

## Mapeamento implementado

| Comando da tela | Mensagem reconhecida pelo mock |
|---|---|
| Iniciar | `{"origem":"IHM","acao":"START"}` |
| Parar | `{"origem":"IHM","acao":"STOP"}` |
| Rearmar | `{"origem":"IHM","acao":"RESET"}` |
| Emergência | `{"origem":"IHM","acao":"EMERGENCY_STOP"}` |

O mock não reconhece mudança de modo, movimento direcional, aplicação de parâmetros, destravamento separado, silenciamento ou reconhecimento de falha. Esses controles ficam bloqueados no modo conectado; continuam disponíveis na simulação local. Nenhuma ação inventada é enviada.

Telemetria utilizada: `estadoGlobal`, `modoOperacao`, `velocidadeEsteiraAtual`, `estacaoIhm.travaSegurancaAtiva`, `estacaoIhm.pressaoPneumaticaBar`. É necessário tratar combinações de estado e trava; o mock não implementa exatamente as mesmas regras de segurança desta demonstração.

A trava tem prioridade na tradução do estado: PRONTA com trava ativa é exibida como Emergência. Isso ocorre se STOP for enviado após uma parada de emergência. RESET limpa a trava. Não há comando separado de destravamento no contrato. O contador da expedição é exibido como total global, sem misturar com o lote local.

O servidor não envia ACK nem ID de comando. A interface só observa a condição esperada na telemetria e apresenta uma mensagem de timeout se ela não aparecer em 2,5 segundos. Isso não permite atribuir causalidade a um comando quando há múltiplos clientes.

## Separação entre transporte e estado da IHM

A aplicação agora separa explicitamente duas responsabilidades:

- `protocoloSimulador.ts`: valida o JSON e conhece somente o contrato do mock WebSocket do professor;
- `normalizacaoMaquina.ts`: converte a telemetria recebida para `EstadoMaquina`, que é o modelo consumido pelos componentes visuais.

Assim, `PainelIhm`, `Botoeira`, `Movimentacao`, `ParametrosProducao` e `Diagnostico` não precisam conhecer DB Siemens, Node-RED ou o formato futuro do App Shell.

Quando o Grupo 1 fechar o contrato, deve ser criado um segundo normalizador/adaptador para os eventos do App Shell. O mock atual continua funcionando sem alteração do seu contrato.

O arquivo `src/tipos/contratoSmart40.ts` registra somente a proposta v0.1 do Runbook (`machine.telemetry`, `command.requested`, `command.ack` e `connection.state`). Ele é deliberadamente provisório e não está conectado ao runtime até o Grupo 1 confirmar nomes e comportamento.

A relação entre sinais encontrados no Drive, significado provável e pendências está documentada em [MATRIZ-SINAIS-PLANTA.md](MATRIZ-SINAIS-PLANTA.md).

## App Shell / Single-SPA

Há um ponto de entrada com as funções de ciclo de vida `bootstrap`, `mount` e `unmount`. Gere os arquivos com:

```bash
npm run integracao
```

Saídas: `dist-integracao/painel-ihm.js` e `dist-integracao/painel-ihm.css`. É um módulo **ESM**, com React incluído. Não é um bundle System.register. O App Shell precisa carregar este formato ou adaptar sua configuração; a URL `/main.js` do guia do professor não existe nesta versão.

Exemplo de registro no código do App Shell, supondo `registerApplication` e `start` já importados de `single-spa`, os arquivos servidos e um elemento `#area-ihm` existente:

```js
const elemento = document.getElementById('area-ihm');
const folha = document.createElement('link');
folha.rel = 'stylesheet';
folha.href = '/modulos/ihm/painel-ihm.css';
document.head.appendChild(folha);

registerApplication({
  name: '@smart40/ihm',
  app: () => import('/modulos/ihm/painel-ihm.js'),
  activeWhen: localizacao => localizacao.pathname.startsWith('/ihm'),
  customProps: { domElement: elemento },
});
start();
```

Nesta versão, cada instância da IHM gerencia sua própria conexão. Antes de integrar ao App Shell, alinhar com o Grupo 1 se a conexão passará a ser compartilhada pelo host. Esse exemplo não substitui o contrato do Grupo 1. A integração com o App Shell real ainda precisa ser validada em conjunto. O CSS próprio é limitado a `.ihm-smart40`; as variáveis globais do professor são preservadas. O arquivo `base.css`, que estiliza `body`, só entra na versão independente.

## Planta física

A auditoria dos arquivos da Planta N2 identificou sinais de referência em DB9, DB101, DB102 e DB103 e confirmou, pelos diagramas elétricos, a existência física de emergência frontal, comutador, botão verde e botão vermelho nas estações. Esses achados estão registrados na matriz de sinais.

Eles **não são binding de runtime**. Ainda é necessário confirmar com professor/Grupo 1:

- se a IHM do Grupo 2 representa uma estação ou a máquina agregada;
- a semântica oficial de botão verde/vermelho;
- o tratamento de RESET e E-STOP;
- quais campos compõem a telemetria comum;
- transporte, autenticação, autorização e ACKs do gateway.

Nenhum endereço PLC é usado pelo navegador e nenhuma escrita S7 foi implementada.
