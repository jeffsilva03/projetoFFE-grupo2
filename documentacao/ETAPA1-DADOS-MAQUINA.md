# Etapa 1 — Dados disponíveis da máquina para o Grupo 2

> **Atualização de 16/10/2026:** esta análise inicial de Node-RED e diagramas foi aprofundada com o **manual do fabricante** e os **arquivos internos do TIA Portal**. Consulte [INVESTIGACAO-LACUNAS-G2.md](INVESTIGACAO-LACUNAS-G2.md) como parecer **mais atual sobre START/STOP, RESET, MANUTENÇÃO, alarmes e tempo de ciclo**.

## Objetivo

Determinar, com base nos arquivos da Planta N2, quais sinais podem alimentar a IHM do Grupo 2 antes de projetar o adaptador de aquisição.

## 1. O que o fluxo atual comprova

O `flows.json` possui um endpoint Siemens S7/ISO-on-TCP e um nó `s7 in` configurado com:

- `mode: all`;
- `diff: true`;
- uma `vartable` com **153 sinais**;
- ciclo configurado no endpoint de **200 ms**.

Distribuição observada:

| Estação | DB | Sinais na tabela |
|---|---:|---:|
| Estoque | DB9 | 81 |
| Processo | DB101 | 19 |
| Montagem | DB102 | 33 |
| Expedição | DB103 | 20 |

A função conectada diretamente ao `s7 in` usa explicitamente **21 campos**, todos do Estoque/DB9, e os grava no contexto global do Node-RED.

Também existem **60 variáveis com nós `s7 out`**, todas no DB9. Isso importa porque parte do DB9 é usada pelo fluxo para intercâmbio de ordens/configuração, e não deve ser confundida com telemetria puramente observacional.

O catálogo completo está em [CATALOGO-SINAIS-S7.md](CATALOGO-SINAIS-S7.md).

## 2. Sinais prioritários para a IHM do G2

### Estoque — DB9

| Endereço | Tag | Evidência | Uso candidato no G2 | Pendência |
|---|---|---|---|---|
| `DB9,X100.3` | `emergencia` | consumido hoje | estado de emergência | diferenciar de `emergenciaAtivada` |
| `DB9,X100.2` | `manual` | consumido hoje | modo manual | confirmar regra de modo |
| `DB9,X100.0` | `ocupado` | consumido hoje | estado operacional | confirmar composição do estado global |
| `DB9,X100.1` | `aguardando` | consumido hoje | estado de espera | confirmar composição do estado global |
| `DB9,X110.1` | `comutadorAutomatico` | consumido hoje | modo automático | confirmar prioridade sobre `manual` |
| `DB9,X110.6` | `condicaoIniciar` | consumido hoje | permissivo de partida | confirmar semântica no PLC |
| `DB9,X110.0` | `emergenciaAtivada` | consumido hoje | trava/estado de emergência | confirmar relação com `emergencia` |
| `DB9,X110.3` | `homeGiro` | consumido hoje | diagnóstico/home | confirmar uso na IHM |
| `DB9,X110.2` | `homeVertical` | consumido hoje | diagnóstico/home | confirmar uso na IHM |
| `DB9,X110.5` | `servoGiro` | consumido hoje | diagnóstico servo | confirmar significado 0/1 |
| `DB9,X110.4` | `servoVertical` | consumido hoje | diagnóstico servo | confirmar significado 0/1 |

### Processo — DB101

| Endereço | Tag | Evidência | Uso candidato no G2 | Pendência |
|---|---|---|---|---|
| `DB101,X0.1` | `processo_segurancaOK` | configurado na vartable | segurança | validar em execução |
| `DB101,X0.6` | `processo_chaveAutomatico` | configurado + diagrama | modo automático | validar em execução |
| `DB101,X0.7` | `processo_botaoVerde` | configurado + diagrama | estado do botão verde | não assumir START ainda |
| `DB101,X1.0` | `processo_botaoVermelho` | configurado + diagrama | estado do botão vermelho | não assumir STOP ainda |
| `DB101,X8.0` | `processo_atuadoresPosicaoOK` | configurado na vartable | permissivo/diagnóstico | validar em execução |
| `DB101,X8.1` | `processo_atuadoresOcupado` | configurado na vartable | estado operacional | validar em execução |
| `DB101,X20.3` | `processo_esteira1` | configurado na vartable | estado da esteira | confirmar se é comando/estado lógico |
| `DB101,X20.4` | `processo_esteira2` | configurado na vartable | estado da esteira | confirmar se é comando/estado lógico |

### Montagem — DB102

| Endereço | Tag | Evidência | Uso candidato no G2 | Pendência |
|---|---|---|---|---|
| `DB102,X0.1` | `montagem_segurancaOK` | configurado na vartable | segurança | validar em execução |
| `DB102,X6.5` | `montagem_chaveAutomatico` | configurado na vartable | modo automático | validar em execução |
| `DB102,X6.6` | `montagem_botaoVerde` | configurado na vartable | estado do botão verde | não assumir START ainda |
| `DB102,X6.7` | `montagem_botaoVermelho` | configurado na vartable | estado do botão vermelho | não assumir STOP ainda |
| `DB102,X7.0` | `montagem_pecaStopper` | configurado na vartable | diagnóstico de presença | validar em execução |
| `DB102,X26.1` | `montagem_roboOcupado` | configurado na vartable | ocupação/diagnóstico | possivelmente domínio G3 |
| `DB102,X30.3` | `montagem_esteira1` | configurado na vartable | estado da esteira | confirmar se é comando/estado lógico |
| `DB102,X30.4` | `montagem_esteira2` | configurado na vartable | estado da esteira | confirmar se é comando/estado lógico |

### Expedição — DB103

| Endereço | Tag | Evidência | Uso candidato no G2 | Pendência |
|---|---|---|---|---|
| `DB103,X0.1` | `expedicao_segurancaOK` | configurado na vartable | segurança | validar em execução |
| `DB103,X0.5` | `expedicao_chaveAutomatico` | configurado + diagrama | modo automático | validar em execução |
| `DB103,X0.6` | `expedicao_botaoVerde` | configurado + diagrama | estado do botão verde | não assumir START ainda |
| `DB103,X0.7` | `expedicao_botaoVermelho` | configurado + diagrama | estado do botão vermelho | não assumir STOP ainda |
| `DB103,X12.0` | `expedicao_atuadorPosicaoOK` | configurado na vartable | permissivo/diagnóstico | validar em execução |
| `DB103,X12.1` | `expedicao_atuadorOcupado` | configurado na vartable | estado operacional | validar em execução |
| `DB103,X20.2` | `expedicao_esteira1` | configurado na vartable | estado da esteira | confirmar se é comando/estado lógico |
| `DB103,X20.3` | `expedicao_esteira2` | configurado na vartable | estado da esteira | confirmar se é comando/estado lógico |

## 3. Cruzamento com os diagramas elétricos

### Processo

O diagrama confirma as entradas físicas:

- emergência frontal: `%I0.1`;
- comutador: `%I0.6`;
- botão verde: `%I0.7`;
- botão vermelho: `%I1.0`.

O DB101 repete essas funções com nomes semânticos. A interpretação mais segura é **entrada física → lógica PLC → DB101 → Node-RED**. O endereço do DB não deve ser tratado como se fosse a entrada física da botoeira.

### Expedição

O diagrama mostra emergência frontal em `%I0.1`, comutador em `%I0.5`, botão verde em `%I0.6` e botão vermelho em `%I0.7`. O Node-RED usa DB103 para os equivalentes semânticos.

### Estoque

O diagrama confirma a existência física de emergência frontal, comutador, botão verde e botão vermelho. O fluxo representa os estados de interesse do Estoque principalmente por DB9 (`emergencia`, `manual`, `ocupado`, `comutadorAutomatico`, `condicaoIniciar`, `emergenciaAtivada` etc.).

### Montagem

O diagrama confirma o circuito de emergência e RESET de segurança. O Node-RED disponibiliza `montagem_segurancaOK`, `montagem_chaveAutomatico`, `montagem_botaoVerde` e `montagem_botaoVermelho` em DB102.

## 4. O que já podemos chamar de dado obtido da máquina

### Nível A — efetivamente consumido pelo fluxo fornecido

No Estoque, o fluxo atual acessa explicitamente 21 campos recebidos do `s7 in`:

`pedirPosicao`, `adicionarEstoque`, `removerEstoque`, `posicaoEstoque`, `aguardando`, `emergencia`, `manual`, `ocupado`, `retornoEstoqueCheio`, `cancelOP`, `finishOP`, `numeroOP`, `startOP`, `corGuardarEstoque`, `comutadorAutomatico`, `condicaoIniciar`, `emergenciaAtivada`, `homeGiro`, `homeVertical`, `servoGiro` e `servoVertical`.

### Nível B — configurado para aquisição, mas ainda não consumido explicitamente pelo fluxo atual

DB101, DB102 e DB103 aparecem na mesma `vartable`. Porém, no `flows.json` fornecido, não há funções usando explicitamente os nomes `processo_*`, `montagem_*` ou `expedicao_*`.

Para o G2, esses sinais são **candidatos de aquisição que precisam ser observados em execução/bancada**, não telemetria homologada.

## 5. O que NÃO foi encontrado como sinal direto

**No contrato exposto pelo Node-RED analisado nesta etapa** não foi encontrada uma tag única confirmada equivalente a:

- `estadoGlobal` do mock;
- `modoOperacao = MANUTENCAO`;
- pressão pneumática numérica em bar;
- velocidade de esteira em porcentagem;
- ACK de comando;
- ID de comando;
- RESET lógico de software claramente exposto para escrita;
- E-STOP de software homologado.

**Atenção:** a investigação complementar identificou referências internas do TIA Portal a `StatusProcesso`, estado de manutenção, resets e alarmes, mas **ainda sem mapeamento de saída aprovado para G2**. Os campos não devem ser inventados. O estado global deverá ser derivado de sinais aprovados ou fornecido por uma camada intermediária. O manual do fabricante confirma Start/Stop físicos em Estoque/Processo/Expedição; isso não autoriza escrita remota.

## 6. Descoberta crítica sobre a comunicação

O `flows.json` contém aquisição S7 e nós `http request` para serviços/MES, mas não contém nós `http in`, WebSocket ou MQTT que publiquem a telemetria para a IHM.

Portanto, **os dados estão disponíveis dentro do lado industrial/Node-RED, mas o fluxo fornecido ainda não oferece um canal de telemetria pronto para o frontend do G2**.

Essa lacuna define a Etapa 2: criar uma camada de aquisição/exposição segura e normalizada, primeiro em ambiente de desenvolvimento, sem ligar o navegador diretamente ao PLC.

## 7. Resultado da Etapa 1

A Etapa 1 fecha com três classes:

1. **Consumido hoje pelo Node-RED:** 21 sinais de DB9/Estoque.
2. **Configurado na tabela S7:** 153 sinais distribuídos entre DB9, DB101, DB102 e DB103.
3. **Prioridade G2:** segurança, modo/chave automático, emergência, botões, permissivos e estados de ocupação/posição/movimento.

### Bloqueios que permanecem

- definir se a IHM G2 representa uma estação específica ou uma visão agregada das quatro;
- observar em execução os sinais DB101/102/103 e confirmar o payload entregue pelo `s7 in`;
- confirmar a semântica oficial de botão verde/vermelho;
- confirmar como será obtido o RESET lógico;
- definir quais sinais formam o estado global da IHM.

Esses bloqueios não impedem a Etapa 2. O adaptador pode ser construído mantendo campos não homologados como `UNKNOWN`/indisponíveis.
