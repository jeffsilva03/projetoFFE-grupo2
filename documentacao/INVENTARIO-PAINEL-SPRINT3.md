# Inventário do painel frontal — Sprint 3 (Grupo 2)

Atividade bloqueante do roteiro da Sprint 3 (seção 5). Fotos tiradas na bancada em **18/11/2026**, à noite, em [`evidencias/sprint3/painel/`](evidencias/sprint3/painel/).

## Elementos comuns às quatro estações

As quatro estações têm o **mesmo painel**, com os elementos na mesma posição.

| Elemento físico | Função aparente | Pode ser substituído pela tela? |
|---|---|---|
| IHM Siemens SIMATIC KTP700 (touch, teclas F1–F8) | Diagnóstico e comandos manuais da estação | — |
| Chave seletora preta, 2 posições | Seleção Manual / Automático | **Não** (elemento de segurança) |
| Botão verde | START | Pode ter equivalente na tela, com confirmação em dois passos |
| Botão vermelho | STOP | Pode ter equivalente na tela |
| Botão azul "RESET" | Reset de falha | Pode ter equivalente na tela, com confirmação em dois passos |
| Sinalizador verde "SEGURANÇA OK" | Indica segurança normal | **Não** |
| Sinalizador vermelho "SEGURANÇA ACIONADA" | Indica segurança acionada | **Não** |
| Botão de emergência tipo cogumelo (Schneider, base amarela "EMERGÊNCIA") | Parada de emergência | **Não**: a emergência física prevalece sobre qualquer comando da tela |
| Marcador quadrado (padrão preto e branco, Schneider) | Referência para realidade aumentada | — |

Nas fotos, o **SEGURANÇA OK está aceso nas quatro estações**. A lente vermelha do "SEGURANÇA ACIONADA" reflete a luz, e pela foto não dá para afirmar se ela está acesa.

## Tela manual da IHM em cada estação

Todas as IHMs mostram a mesma restrição: **"Funções permitidas se Comutador estiver na Posição Manual!"**. Isso confirma o item 5.3 do roteiro: os comandos manuais só respondem com a chave seletora em Manual. Em Automático, quem comanda é o ciclo da planta.

| Estação | Saídas digitais na tela | Atuadores elétricos na tela |
|---|---|---|
| Estoque | Avança Alimentador, Recua Alimentador, Liga Vácuo, Avança Manipulador, Fecha Garra, Motor Esteira 1, Motor Esteira 2, Stopper 1, Stopper 2, Status Processo | Vertical (155,11 mm) e Giro (98,04 mm), com Home, JOG−, JOG+, Reset e Servo |
| Processo | Avança Eixo Z, Vácuo Manipulador, Vácuo Mesa, Motor Esteira 1, Motor Esteira 2, Status Processo | Horizontal / Eixo X (168,98 mm) e Transversal / Eixo Y (5,46 mm), com Home, JOG−, JOG+, Reset e Servo |
| Montagem | Avança Alimentador, Recua Alimentador, Liga Vácuo, Motor Esteira 1, Motor Esteira 2, Stopper 1, Stopper 2 | Nenhum nessa tela. Ao lado fica o Teach Pendant do robô UR, com "Programa_atualizado_05_10_26", estado "Executando" |
| Expedição | Avança Manipulador, Liga Vácuo, Motor Esteira 1, Motor Esteira 2, Stopper 1, Stopper 2, Status Processo | Vertical (186,31 mm), Horizontal (17,18 mm) e Giratório (4,12 mm) |

O relógio das IHMs mostra **25/08/2012** (Estoque, Processo, Expedição) e **05/02/2013** (Montagem). Esse horário não serve como referência de tempo para evidências.

## Tabela do roteiro (Estação × Elemento × Função × Comportamento observado)

| Estação | Elemento físico | Função aparente | Comportamento observado |
|---|---|---|---|
| Todas | Botão de emergência (cogumelo) | Parada imediata | Não testado em 18/11. Teste por último, com instrutor (ordem do roteiro: reset, stop, start, emergência) |
| Todas | Chave Manual/Automático | Seleção de modo | As IHMs só liberam funções manuais em Manual. A ligar com `comutadorAutomatico` (DB2,X8.1) na telemetria |
| Processo | START (verde) | Comando de ciclo | 18/11: com START físico, a esteira começou a rodar |
| Processo | STOP (vermelho) | Comando de ciclo | 18/11: enquanto pressionado, `condicaoIniciar` (DB2,X8.6) cai para false e volta ao soltar (leitura pela aba G2 do Node-RED) |
| Processo | RESET (azul) | Reset de falha | A observar |
| Todas | Sinalizadores OK / Acionada | Indicação de segurança | SEGURANÇA OK aceso nas quatro estações no momento das fotos |

## Elementos de segurança que a tela não substitui

Botão de emergência físico, sinalizadores de segurança e chave seletora Manual/Automático. A IHM web só envia **intenções**, quem executa é o CLP. O botão de emergência da tela é um comando adicional fail-safe: ele trava a interface, mas **não substitui o cogumelo**.

## Referência de rede das IHMs

As IHMs estão em 192.168.150.11, .21, .31 e .41. O Front-End não fala diretamente com elas: tudo passa pelo broker e pelo agente local.
