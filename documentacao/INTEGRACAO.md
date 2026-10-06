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

Ainda é necessário confirmar qual estação e DB correspondem ao painel atribuído ao grupo, como o backend receberá os comandos e qual contrato de telemetria será utilizado. Nenhum endereço ou mapeamento de PLC foi implementado nesta entrega.
