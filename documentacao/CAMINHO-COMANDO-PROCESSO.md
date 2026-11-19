# Como o START/STOP do software pode operar a esteira do Processo

Varredura feita em **19/11/2026** nos arquivos de fonte da Planta N2 (pasta do professor no Drive, somente leitura): projeto TIA `PROGRAMA_ATUAL_N2/02_Processo_V20`, diagrama elétrico do Processo, pacote do Node-RED da bancada e coleção do MES. Nada foi gravado no CLP, no Node-RED ou no Drive.

## Resposta curta

**Hoje o programa do CLP do Processo não tem nenhuma entrada de software que o Node-RED consiga escrever para ligar ou parar a esteira.** Os botões START e STOP do painel são entradas físicas (%I0.7 e %I1.0), e o CLP lê essas entradas direto do cartão a cada ciclo. Por isso o pulso que demos em `botaoVermelho` no dia 18/11 não parou a esteira: aquele bit fica no **DB101, que é o DB do simulador** (`02_SimuladorProcesso`), e não na lógica real.

Existem dois caminhos para o nosso START/STOP operar a máquina de verdade:

1. **Sem mexer no programa (precisa ser confirmado):** usar o modo Manual, escrevendo nos mesmos bits que a IHM Siemens usa (`IHM_Processo.Manual.MotorEsteira1/2`). Só funciona se esse DB tiver acesso padrão (não otimizado), e só com a chave em Manual.
2. **Com uma pequena mudança feita pelo professor (o caminho certo):** criar no CLP dois bits de comando remoto (start e stop) num DB de acesso padrão, ligados em paralelo com o botão verde e em série com o botão vermelho. A partir daí, o Node-RED escreve nesses bits e a esteira obedece, com todas as seguranças do programa valendo.

O detalhamento de cada um, e o que **não** fazer, vem a seguir.

## O que o CLP do Processo é

| Item | Valor encontrado | Fonte |
|---|---|---|
| CPU | S7-1200, **CPU 1215C DC/DC/DC**, 6ES7 215-1AG40-0XB0, firmware 4.4 | projeto TIA e diagrama elétrico, folha 10 |
| IHM | KTP700 Basic, 6AV2123-2GB03-0AX0 | diagrama elétrico |
| Acesso PUT/GET | habilitado (o Node-RED lê o CLP com `node-red-contrib-s7`) | projeto TIA + bancada |
| Servidor OPC UA | configurado no projeto com o nome `Smart40.Processo` (não sabemos se está ativo nem se há licença) | projeto TIA |
| Módulos do Node-RED da bancada | `node-red-contrib-s7`, `moment`, `telegrambot`, `ur-robot`, `dashboard`, `ui-table`. **Não há módulo OPC UA.** | `NODERED-BKP/package.json` |

## Entradas e saídas físicas (confirmadas em duas fontes)

A tabela de tags do TIA e o diagrama elétrico (folhas 4, 6 e 8) mostram os mesmos endereços.

| Endereço | Tag no TIA | Elemento físico |
|---|---|---|
| %I0.1 | `edEmergenciaOK` | Emergência frontal OK |
| %I0.2 | `edEixoZAvancado` | Sensor eixo Z avançado |
| %I0.3 | `edEixoZRecuado` | Sensor eixo Z recuado |
| %I0.4 | `edVacuoManipulador` | Vácuo do manipulador |
| %I0.5 | `edVacuoMesa` | Vácuo da mesa |
| %I0.6 | `edChaveComutadora` | Chave Manual/Automático (0 = esquerda, 1 = direita) |
| %I0.7 | `edBotaoVerde` | **Botão START (verde)** |
| %I1.0 | `edBotaoVermelho` | **Botão STOP (vermelho)** |
| %Q0.0 | `sdAvancaEixoZ` | Avança eixo Z |
| %Q0.1 | `sdLigaVacuoManipulador` | Vácuo do manipulador |
| %Q0.2 | `sdLigaVacuoMesa` | Vácuo da mesa |
| %Q0.3 | `sdLigaMotorEsteira1` | **Motor da esteira 1 / giro** |
| %Q0.4 | `sdLigaMotorEsteira2` | **Motor da esteira 2** |
| %Q1.1 | `sdStatusProcesso` | Sinalização de status do processo |

O botão **RESET azul não entra no CLP**: no diagrama ele está ligado ao relé de segurança (S1 → KS1/RS1). Ou seja, rearmar a segurança é sempre físico. O RESET da nossa tela só pode limpar estado de software, nunca rearmar a segurança.

## Os blocos de dados que importam

### DB2: interface com o Node-RED/MES (acesso padrão, já lido pela aba G2)

Estrutura `NodeToPlc` (Node-RED → CLP) e `PlcToNode` (CLP → Node-RED):

| Endereço | Nome no CLP | Sentido | Nome na nossa telemetria |
|---|---|---|---|
| DB2.DBX0.0 | `NodeToPlc.StatusOP.RecebidoOP` | **Node-RED → CLP** | `recebidoOP` |
| DB2.DBW2 | `PlcToNode.StatusOP.NumeroOP` | CLP → Node-RED | — |
| DB2.DBX4.0 / 4.1 / 4.2 | `CancelOP` / `FinishOP` / `StartOP` | CLP → Node-RED | `cancelOP`, `finishOP`, `startOP` |
| DB2.DBX6.0 a 6.3 | `StatusEstacao.Ocupado / Aguardando / Manual / Emergencia` | CLP → Node-RED | `ocupado` … `emergencia` |
| DB2.DBX8.0 | `RA.xEmergenciaAtivada` | CLP → Node-RED | `emergenciaAtivada` |
| DB2.DBX8.1 | `RA.xComutadorAutomatico` | CLP → Node-RED | `comutadorAutomatico` |
| DB2.DBX8.2 / 8.3 | `RA.xNecessitaHomeEixoX / Y` | CLP → Node-RED | `homeX` / `homeY` → **true = o eixo precisa fazer home** |
| DB2.DBX8.4 / 8.5 | `RA.xServoDesligadoEixoX / Y` | CLP → Node-RED | `servoX` / `servoY` → **true = servo desligado** |
| DB2.DBX8.6 | `RA.xCondicaoIniciar` | CLP → Node-RED | `condicaoIniciar` |

Repare: `StartOP` é **saída** do CLP (ele avisa que começou), não uma entrada de comando. O único bit que o Node-RED escreve no DB2 é `RecebidoOP`. Isso também resolve os quatro sinais que estavam sem descrição (`homeX`, `homeY`, `servoX`, `servoY`).

### DB101: simulador (explica o "DB morto")

O DB101 se chama **`02_SimuladorProcesso`** (há também DB100 `01_SimuladorEstoque` e DB102 `03_SimuladorMontagem`). É a área do gêmeo digital. Por isso está tudo false na bancada real e por isso escrever nele não muda nada na esteira.

### IHM_Processo: comandos manuais da IHM Siemens

Estrutura `Manual` com `AvancaEixoZ`, `VacuoManipulador`, `VacuoMesa`, **`MotorEsteira1`**, **`MotorEsteira2`**, `Stopper1`, `Stopper2`, `StatusProcesso` e os eixos X e Y (Jog+, Jog−, Servo, Reset, Home). A tabela do projeto sugere que esse DB é o **DB230**, e as informações de layout indicam **acesso otimizado** — as duas coisas precisam ser confirmadas no TIA (ver Caminho 1).

### Lógica das esteiras

- FC **`EsteirasAcionamentos`**, com as redes "Modo Automático", "Parada de Máquina" e "Máquina em Modo Manual" e as variáveis `xModoAutomatico`, `xParadaMaquina` e `xModoManual`.
- FB **`EsteirasControle`** (instância `dbEsteiras`), com as redes "Liga Esteiras", "Desliga Esteiras", "Liga Esteira 1" e "Liga Esteira 2", os bits `xEsteira1`, `xEsteira2` e o temporizador `tTempoEsteira1Ligada`.

O código Ladder fica gravado em formato binário dentro do projeto, então não dá para reproduzir rede por rede aqui. O que a bancada mostrou bate com os nomes: com o STOP pressionado, `xCondicaoIniciar` cai; com o START, a esteira liga.

## O que não fazer (e por quê)

| Ideia | Por que não |
|---|---|
| Escrever em %I0.7 / %I1.0 (forçar botão) | O CLP sobrescreve a imagem de entradas com o valor do cartão a cada ciclo. Não funciona e é má prática. |
| Escrever em %Q0.3 / %Q0.4 (ligar motor direto) | O programa reescreve a saída a cada ciclo, e escrever direto passaria por cima da emergência e dos intertravamentos. **Proibido.** |
| Escrever no DB101 | É o simulador. Não age na máquina real (já comprovado em 18/11). |
| Mudar o programa ou fazer "Download to device" por conta própria | Só o professor altera o CLP. |

**Ler** %Q0.3, %Q0.4, %I0.6, %I0.7 e %I1.0 é seguro e muito útil: é a confirmação real de que a esteira ligou ou parou, e é melhor do que o DB101, que está morto.

## Caminho 1: modo Manual pelos bits da IHM (sem mudar o programa)

**Condições:** chave em Manual, professor presente, IHM_Processo com acesso padrão.

1. **Verificar no TIA, só olhando:** abrir o `02_Processo_V20` no TIA Portal do laboratório, sem conectar ao CLP. Clicar com o botão direito em `IHM_Processo` → Propriedades → Atributos e anotar o número do DB e se **"Acesso otimizado ao bloco"** está marcado.
   - **Marcado (o mais provável):** o Node-RED (S7) não consegue endereçar esses bits. Siga para o Caminho 2.
   - **Desmarcado:** abrir o DB, ler a coluna Offset de `Manual.MotorEsteira1` e `Manual.MotorEsteira2` e seguir para o passo 2.
2. **Teste de leitura:** no Node-RED, um `s7 in` lendo `DB<n>,X<offset>`. Ao apertar "Motor Esteira 1" na IHM Siemens (em Manual), o valor tem que mudar.
3. **Teste de escrita:** com supervisão, escrever `true` e depois `false` nesse endereço e observar a esteira.

**Limite:** isso é comando **manual** (liga e desliga o motor), não START de ciclo. Em Automático, o CLP ignora esses bits.

## Caminho 2: bits de comando remoto no CLP (recomendado, feito pelo professor)

É o que o documento da Sprint 3 pressupõe quando cita endereços do tipo `DB.DBX0.0–0.3` "a confirmar". A mudança é pequena e mantém todas as seguranças.

**Proposta para levar ao professor:**

1. Criar um DB global de **acesso padrão (não otimizado)**, por exemplo `G2_ComandoRemoto`:

   | Offset | Nome | Quem escreve | Função |
   |---|---|---|---|
   | 0.0 | `xStartRemoto` | Node-RED (pulso de 500 ms) | Equivale a apertar o verde |
   | 0.1 | `xStopRemoto` | Node-RED (pulso de 500 ms) | Equivale a apertar o vermelho |
   | 0.2 | `xResetRemoto` | Node-RED (pulso) | Reset de falhas de software (o relé de segurança continua físico) |
   | 0.3 | `xVida` | Node-RED (alterna a cada 1 s) | Sinal de vida da ponte |
   | 1.0 | `xRemotoHabilitado` | CLP | true quando a chave está em Automático, a segurança está OK e `xVida` mudou nos últimos 3 s |

2. No ponto do programa onde o START e o STOP são lidos:
   - START efetivo = `edBotaoVerde` **OU** (`xStartRemoto` **E** `xRemotoHabilitado`);
   - STOP efetivo = `edBotaoVermelho` **OU** `xStopRemoto` (o stop remoto vale sempre, mesmo sem `xVida`).
3. O CLP zera `xStartRemoto` e `xStopRemoto` depois de consumir o pulso, para que um bit "preso" não repita o comando.

**O que muda do nosso lado quando o professor criar isso:**
- No Node-RED, um `s7 out` no novo DB, recebendo os comandos da ponte (G2 é o único grupo autorizado; `origem = unidade1-grupo2`).
- A confirmação de START na botoeira da Sprint 3 passa a ser **%Q0.3 ou %Q0.4 = true** dentro de 5 s. A de STOP, os dois em false.
- A emergência continua física. O botão de emergência da tela manda STOP e trava a interface, mas não substitui o cogumelo.

## Caminho 3: OPC UA (só se o professor preferir)

O projeto tem um servidor OPC UA configurado (`Smart40.Processo`), que permitiria acessar o `IHM_Processo` pelo nome, mesmo otimizado. Para isso seria preciso confirmar que o servidor está ativo e licenciado no CLP, e instalar `node-red-contrib-opcua` no Node-RED da bancada. O ganho em relação ao Caminho 1 é o mesmo (continua sendo comando manual), então só vale se o professor já usar OPC UA.

## Roteiro de teste na bancada (quando houver endereço confirmado)

Sempre com o professor ao lado e um colega com a mão no cogumelo.

1. **Somente leitura (pode ser feito já):** ler %Q0.3, %Q0.4, %I0.6, %I0.7 e %I1.0 e apertar START/STOP físicos. Os valores precisam acompanhar.
2. **STOP remoto:** com a esteira rodando pelo botão físico, mandar STOP pela tela. Esperado: %Q0.3/%Q0.4 vão para false em menos de 5 s e a tela mostra CONFIRMADO.
3. **START remoto:** com a chave em Automático e a segurança OK, mandar START. Esperado: %Q0.3 ou %Q0.4 vai para true e a tela mostra CONFIRMADO.
4. **Falha de comunicação:** parar o coletor. O START remoto precisa ser recusado (`xVida` parado) e o STOP físico continua funcionando.
5. **Emergência (por último):** apertar o cogumelo. A tela mostra EMERGÊNCIA e trava, e nenhum comando remoto liga a esteira. Ao soltar o cogumelo, só o rearme físico, seguido do RESET, libera.
6. Ao terminar, remover qualquer `s7 out` de teste e anotar o resultado na tabela do inventário.

## Fontes consultadas

- `PROGRAMA_ATUAL_N2/02_Processo_V20`: tabela de tags, interfaces dos blocos, nomes das redes e lista de DBs (extraídos do arquivo do projeto, sem abrir no TIA).
- `Diagramas Elétricos/102439_SUB CJ PROCESSO SMART 4.0 - PAINEL ELETRICO MONTADO.pdf`, folhas 2, 3, 4, 6, 8 e 10.
- `NODERED/NODERED-BKP/package.json`.

**Não foram abertos nem copiados para o repositório:** `Acessos.txt`, `flows_cred.json`, `.config.users.json` (credenciais) e o `.rar` de 3,1 GB.
