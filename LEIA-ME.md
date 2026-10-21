# SMART 4.0 — Grupo 2: IHM Siemens / Botões — versão 1.1

> **Sprint 2 (branch de desenvolvimento):** o modo **Sprint 2 · Leitura de sinais** recebe apenas dados de teste baseados nas tags encontradas na Planta N2. Nenhuma comunicação real com a máquina. Consulte [ETAPA2-LEITURA-G2.md](documentacao/ETAPA2-LEITURA-G2.md).

## Como testar a Etapa 2 (somente leitura)

Abra dois terminais na pasta do projeto, após `npm.cmd ci`:

```powershell
npm.cmd run leitura-g2
```

Em outro terminal:

```powershell
npm.cmd run dev
```

Acesse `http://localhost:8081`, selecione **Sprint 2 · Leitura de sinais**, escolha estação e situação de teste e clique em **Conectar leitura G2**. Os botões verdes/vermelhos que aparecem nessa nova tela **não são clicáveis nem enviam comandos**, apenas mostram estados recebidos. Para testar a queda de dados, pare o servidor de leitura; a tela marcará as informações como indisponíveis. A simulação da Sprint 1 continua disponível, sem alterações de protocolo.

## Sprint 2 — Ponte Node-RED com as quatro estações

**Nova proposta de leitura periódica:** o código em [NODERED-FUNCTION-LEITURA-PERIODICA-G2.js](documentacao/NODERED-FUNCTION-LEITURA-PERIODICA-G2.js) seleciona apenas sinais novos vindos de um leitor S7 independente configurado com `diff=false` (ainda NÃO ligado à máquina). O plano de bancada e o inventário dos fontes estão em [PLANO-COMUNICACAO-REAL-G2.md](documentacao/PLANO-COMUNICACAO-REAL-G2.md). A `main` permanece com a Sprint 1.



**Evolução mais recente:** endereço WebSocket configurável, cache temporário para mensagens parciais e descarte individual de sinais antigos. Instruções: [CONTINUACAO-SPRINT2-PONTE.md](documentacao/CONTINUACAO-SPRINT2-PONTE.md).


Esta branch possui a nova opção **Sprint 2 · Ponte Node-RED**, que acompanha Estoque, Processo, Montagem e Expedição ao mesmo tempo.

Para ver funcionando **sem acessar a máquina**, execute `npm.cmd run demo-ponte-g2` em um terminal e `npm.cmd run dev` em outro. Abra `http://localhost:8081`, escolha a opção **Ponte Node-RED** e conecte.

O caminho foi implementado como **Node-RED simulado → HTTP → ponte local → WebSocket → painel G2**. Os testes automatizados, a leitura de quatro estações, a proteção de comandos e os builds foram aprovados no GitHub Actions. O passo de receber dados do Node-RED **real** só pode ser realizado depois de acesso autorizado à rede da instituição. A ponte é somente leitura e não possui comando de PLC.

Confira as instruções e a função para instalar futuramente no Node-RED em [PONTE-NODERED-QUATRO-ESTACOES.md](documentacao/PONTE-NODERED-QUATRO-ESTACOES.md).

Para checar os testes dessa ponte: `npm.cmd run testar-ponte`.

Para publicar a interface online, siga [Hospedar no Render](documentacao/RENDER.md).

Frontend em **React + TypeScript + Vite**, com conexão autenticada ao simulador WebSocket fornecido pelo professor. Mantém a interface Siemens, a botoeira e a opção de simulação local.

## Conectar ao simulador no Windows

1. Extraia o ZIP atualizado em uma pasta nova e abra `ihm-smart40` no VS Code. Requer Node.js **22.12 ou superior**; Node 22.22.3 atende.
2. No primeiro terminal, dentro da pasta do projeto, execute:

```powershell
npm.cmd install
npm.cmd run simulador
```

3. Mantenha esse terminal aberto. Abra um **segundo terminal**, na mesma pasta:

```powershell
npm.cmd run dev
```

4. Acesse **http://localhost:8081**.
5. Clique em **Conectar simulador**. O indicador muda para **Simulador conectado** após receber a primeira telemetria válida.

No Linux/macOS, use `npm` em vez de `npm.cmd`. No Windows, também há `INICIAR-SIMULADOR.bat` e `INICIAR.bat`; execute cada um em sua própria janela e mantenha ambos abertos.

O servidor do professor **começa em operação automática**, com velocidade de 65% e pressão de 6,2 bar. O frontend reflete esse estado após conectar; não envia uma partida automática.

## Teste rápido

- Clique em **Parar**: o servidor para e a tela recebe velocidade 0%.
- Clique em **Iniciar**: o servidor inicia e a tela recebe velocidade 65%.
- Clique em **Emergência**: velocidade 0%, trava ativa e estado Emergência.
- Clique em **Parar** durante a emergência: a trava continua ativa e a interface mantém Emergência.
- Clique em **Rearmar**: envia RESET, remove a trava no mock e volta à Parada. Depois, Iniciar permite nova partida.

No modo conectado, não há botão separado de destravamento: o contrato do professor usa o próprio RESET para isso. Rearmar fica indisponível durante operação; primeiro pare a máquina.

## Origem dos dados

| Fonte | Comportamento |
|---|---|
| Simulação local | Lógica original no navegador; modos, setas, parâmetros, falhas e pressão são configuráveis. |
| Simulador conectado | Estado, modo, pressão, velocidade e total de peças vêm do WebSocket do professor. Somente os quatro comandos suportados são enviados. |
| Conexão/telemetria indisponível | Estado atual marcado como indisponível e comandos bloqueados. Não há troca automática para dados locais. |

A animação da esteira é ilustrativa. O mock não fornece posição; por isso o marcador da peça e a posição local não aparecem no modo conectado. O contador recebido é o **total da expedição**, e não o lote configurável da simulação local. A tela identifica esse campo como “Total peças · Expedição”.

## Configuração da conexão

Os padrões já estão configurados:

- Endereço: `ws://localhost:8080`
- Token: `aluno-token-grupo2`

Abra **Configurar conexão** para editar. Desconecte antes de alterar os campos. O token é uma credencial pública de demonstração fornecida à turma.

Opcionalmente, copie `.env.exemplo` para `.env.local`, ajuste os valores e reinicie o Vite. Na versão compilada, esses valores são definidos no build; os campos da tela continuam permitindo outra configuração.

## Comandos disponíveis no mock

| Controle | Mensagem |
|---|---|
| Iniciar | `{ "origem": "IHM", "acao": "START" }` |
| Parar | `{ "origem": "IHM", "acao": "STOP" }` |
| Rearmar | `{ "origem": "IHM", "acao": "RESET" }` |
| Emergência | `{ "origem": "IHM", "acao": "EMERGENCY_STOP" }` |

O mock não recebe comandos para modo Manual/Automático, setas, parâmetros, falha/pressão, silenciamento ou reconhecimento de falha. Esses controles são bloqueados ou substituídos por leitura no modo conectado. Clique em **Usar simulação local** para testá-los na demonstração independente.

## Conexão e atualização

- A tela espera a telemetria, enviada pelo servidor a cada 500 ms, para mudar o estado. Não há mudança otimista da máquina ao clicar.
- Se não chegar telemetria inicial em 5 segundos, a conexão é encerrada e um erro é apresentado.
- Se deixar de chegar telemetria válida por mais de 3 segundos, os comandos ficam bloqueados.
- JSON inválido ou dados essenciais incorretos bloqueiam os comandos até receber nova telemetria válida.
- A reconexão é manual pelo botão da tela. Comandos não são armazenados nem reenviados.
- O servidor não envia ACK nem identifica comandos. A mensagem “Telemetria após...” indica a observação da condição esperada, sem afirmar um ACK individual. O estado pode ser alterado por outro cliente e também será refletido.
- **Desconectar ou trocar de fonte não envia STOP**. Para parar o mock, use o botão Parar enquanto conectado.
- Recarregar a página volta à simulação local e exige nova conexão manual.

## Estrutura principal

```text
src/
  Aplicacao.tsx
  entrada.tsx
  microfrontend.tsx
  componentes/
    ConexaoSimulador.tsx      Conexão, endereço e token
    PainelIhm.tsx            IHM e telemetria
    Botoeira.tsx             Comandos e iluminação
    Movimentacao.tsx         Setas locais e esteira ilustrativa
    ParametrosProducao.tsx   Configuração local / leitura do mock
    Diagnostico.tsx          Segurança local / leitura do mock
    IndicadorEstado.tsx
    Icone.tsx
  estado/
    usarMaquina.ts           Alternância de fonte e WebSocket
    simulacao.ts             Regras da simulação local
  servicos/
    protocoloSimulador.ts    Validação do contrato WebSocket do mock
    normalizacaoMaquina.ts   Tradução da fonte externa para EstadoMaquina
  tipos/
    maquina.ts
    conexao.ts
    contratoSmart40.ts       Contrato provisório v0.1 para o App Shell
    ambiente.d.ts
  estilos/
    tema-professor.css
    painel.css
    base.css
    fontes/
testes/
  simulacao.test.ts
  protocolo.test.ts
documentacao/
  simulador-professor.cjs    Mock do professor adaptado para hospedagem
  INTEGRACAO.md
  MATRIZ-SINAIS-PLANTA.md   Inventário técnico e pendências da Planta N2
  VALIDACAO.md
versao-pronta/              Aplicação compilada
```

Nomes próprios do código e textos da interface usam português. Nomes exigidos pelas ferramentas e pelo contrato do professor são preservados, como `package.json`, `WebSocket`, `START`, `bootstrap`, `mount` e `unmount`.

## Outros comandos

```powershell
npm.cmd run verificar
npm.cmd run testar
npm.cmd run build
npm.cmd run preview
npm.cmd run integracao
```

`build` gera `dist`; `preview` serve esse build; `integracao` gera o módulo ESM e o CSS em `dist-integracao`. O ZIP não inclui `node_modules`.

A pasta `versao-pronta` contém o build atualizado. Para visualizá-la com Python:

```powershell
python -m http.server 8081 --directory versao-pronta
```

O servidor do mock deve continuar aberto em outro terminal se quiser conectar.

## Problemas comuns

| Problema | Ação |
|---|---|
| PowerShell bloqueia npm.ps1 | Use `npm.cmd`, como nos comandos acima. |
| Falha de conexão | Verifique os dois terminais, endereço e token. O navegador não informa ao aplicativo se a rejeição foi 401 ou 403. |
| Porta 8080 ocupada | Feche a outra instância do simulador antes de executar novamente. |
| Sem telemetria | Confira o terminal do mock. Após restabelecer o servidor, reconecte. |
| Página HTTPS com mock ws:// local | Execute pelo endereço HTTP local. Em hospedagem HTTPS, a conexão precisa ser wss:// e a origem deve ser permitida no servidor. |
| Botões de modo e setas desabilitados | Limitação do contrato do mock; use a simulação local. |

## Preparação para a integração da turma

A auditoria das fontes da Planta N2 foi registrada em `documentacao/MATRIZ-SINAIS-PLANTA.md` e aprofundada com o manual do fabricante/TIA Portal em `documentacao/INVESTIGACAO-LACUNAS-G2.md`. A interpretação atual é restrita ao escopo do Grupo 2 (IHM e botoeira). O código separa o protocolo do mock da normalização para o modelo interno da IHM, de forma que o futuro adaptador do App Shell possa ser adicionado sem acoplar os componentes visuais ao PLC ou ao Node-RED.

O contrato `src/tipos/contratoSmart40.ts` é uma proposta provisória baseada no Runbook e ainda não é usado em runtime. A versão final depende do Grupo 1.

## Escopo

A integração com o **mock** está implementada. Não há conexão com PLC ou planta física. O limite de pressão de 4,5 bar usado para indicação de falha é um critério desta demonstração e deve ser confirmado com o professor. A integração do App Shell real ainda depende do Grupo 1.

A fonte Inter está incluída e sua licença original está em `documentacao/LICENCA-FONTE.txt`. As capturas `previa-computador.png` e `previa-celular.png` mostram a versão conectada. O tema CSS do professor foi preservado. O simulador mantém o contrato e a lógica do professor, com ajustes para hospedagem: origens adicionais por variável de ambiente, comparação exata de origens, escuta em `0.0.0.0` e token omitido dos logs.
