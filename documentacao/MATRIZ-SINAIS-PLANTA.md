# Matriz de sinais da Planta N2 — Grupo 2

> Documento de trabalho para preparar a integração futura da IHM web com a Planta N2.
> Nesta Sprint, os sinais abaixo são **referência de engenharia**. Eles não autorizam conexão direta do navegador ao PLC nem escrita em S7.

## Regra de uso

A interface do Grupo 2 deve continuar funcionando com simulação local e com o mock WebSocket do professor. A integração física futura deve seguir o caminho aprovado pela turma:

```text
PLC / serviços industriais
        ↓
adaptador autorizado (ex.: Node-RED)
        ↓
Gateway / App Shell
        ↓
contrato compartilhado smart40:*
        ↓
módulo Grupo 2
```

O frontend não deve conter credenciais industriais, abrir conexão S7 nem escrever diretamente em DB do PLC.

## Hierarquia das fontes

1. Runbook da Sprint: define escopo, segurança e arquitetura de integração.
2. `NODERED/flows.json`: evidencia tags e integrações usadas na planta.
3. Diagramas elétricos: confirmam função física de entradas, botoeira e circuito de segurança.
4. Projetos TIA Portal V20: fonte para validação definitiva da lógica PLC quando houver ambiente e autorização.
5. Mock do professor: contrato atual para desenvolvimento e demonstração independente.

## Sinais encontrados no Node-RED

### Processo — DB101

| Endereço | Tag no fluxo | Uso provável na IHM | Estado |
|---|---|---|---|
| `DB101,X0.1` | `processo_segurancaOK` | condição/indicação de segurança | confirmado no fluxo; semântica final a validar |
| `DB101,X0.6` | `processo_chaveAutomatico` | seletor Manual/Automático | confirmado no fluxo |
| `DB101,X0.7` | `processo_botaoVerde` | botão verde da estação | confirmado no fluxo; não rotular tecnicamente como START sem validação |
| `DB101,X1.0` | `processo_botaoVermelho` | botão vermelho da estação | confirmado no fluxo; não rotular tecnicamente como STOP sem validação |

O diagrama elétrico da estação Processo também mostra as funções físicas `EMERG. FRONTAL`, `COMUTADOR`, `BOTÃO VD` e `BOTÃO VM` nas entradas do PLC. Isso sustenta a correspondência física, mas não substitui a validação da lógica interna do programa Siemens.

### Montagem — DB102

| Endereço | Tag no fluxo | Uso provável na IHM | Estado |
|---|---|---|---|
| `DB102,X0.1` | `montagem_segurancaOK` | condição/indicação de segurança | confirmado no fluxo |
| `DB102,X6.5` | `montagem_chaveAutomatico` | seletor Manual/Automático | confirmado no fluxo |
| `DB102,X6.6` | `montagem_botaoVerde` | botão verde da estação | confirmado no fluxo; semântica START a validar |
| `DB102,X6.7` | `montagem_botaoVermelho` | botão vermelho da estação | confirmado no fluxo; semântica STOP a validar |

O diagrama elétrico da montagem confirma a existência do circuito de emergência frontal e do RESET no circuito de segurança.

### Expedição — DB103

| Endereço | Tag no fluxo | Uso provável na IHM | Estado |
|---|---|---|---|
| `DB103,X0.1` | `expedicao_segurancaOK` | condição/indicação de segurança | confirmado no fluxo |
| `DB103,X0.5` | `expedicao_chaveAutomatico` | seletor Manual/Automático | confirmado no fluxo |
| `DB103,X0.6` | `expedicao_botaoVerde` | botão verde da estação | confirmado no fluxo; semântica START a validar |
| `DB103,X0.7` | `expedicao_botaoVermelho` | botão vermelho da estação | confirmado no fluxo; semântica STOP a validar |

O diagrama elétrico da expedição lista `EMERG. FRONTAL`, `COMUTADOR`, `BOTÃO VD` e `BOTÃO VM`.

### Estoque — DB9

| Endereço | Tag no fluxo | Uso provável na IHM | Estado |
|---|---|---|---|
| `DB9,X100.3` | `emergencia` | estado de emergência | confirmado no fluxo; significado exato a validar |
| `DB9,X100.2` | `manual` | estado/modo manual | confirmado no fluxo |
| `DB9,X110.1` | `comutadorAutomatico` | seletor automático | confirmado no fluxo |
| `DB9,X110.6` | `condicaoIniciar` | permissivo/condição de partida | confirmado no fluxo |
| `DB9,X110.0` | `emergenciaAtivada` | trava/estado de emergência | confirmado no fluxo; diferença para `emergencia` a validar |

O diagrama elétrico do estoque lista fisicamente `EMERG. FRONTAL`, `COMUTADOR`, `BOTÃO VD` e `BOTÃO VM`.

## Relação com o contrato atual do mock

A aplicação atualmente recebe do mock:

| Campo do mock | Situação diante das fontes da planta |
|---|---|
| `estadoGlobal` | não foi encontrado como uma tag única; deve ser derivado/normalizado pelo gateway ou contrato comum |
| `modoOperacao` | há evidência física/lógica de Manual/Automático; `MANUTENCAO` ainda precisa de confirmação |
| `estacaoIhm.travaSegurancaAtiva` | há sinais de segurança/emergência, mas o mapeamento 1:1 ainda precisa de validação |
| `estacaoIhm.pressaoPneumaticaBar` | valor numérico equivalente não foi confirmado nos sinais auditados |
| `velocidadeEsteiraAtual` | velocidade percentual equivalente não foi confirmada nos sinais auditados |
| `metricasExpedicao.pecasProcessadasTotal` | pertence ao domínio de expedição/MES; não deve ser assumido como sinal da botoeira |

## Comandos da tela

O mock aceita `START`, `STOP`, `RESET` e `EMERGENCY_STOP`. Esses nomes são contrato do simulador, não endereços PLC.

Para a planta física:

- botão verde/vermelho: existem como sinais reais, porém o vínculo semântico definitivo com START/STOP deve ser validado;
- RESET: aparece no circuito de segurança dos diagramas e não deve ser convertido automaticamente em escrita de um bit de DB;
- E-STOP: é função de segurança física. Um botão web não é parada de emergência funcional;
- nenhum endereço de escrita PLC está aprovado para o navegador.

## Decisões que faltam

Antes de implementar o adaptador real, confirmar com professor/Grupo 1:

1. O Grupo 2 representa uma estação específica ou uma IHM global das quatro estações?
2. Qual é a semântica oficial dos botões verde e vermelho em cada estação?
3. Qual sinal representa o RESET lógico, se houver um exposto ao software?
4. Quais sinais devem compor `machine.telemetry`?
5. Quem calcula `status`/estado global: PLC, Node-RED, gateway ou App Shell?
6. Qual será o mecanismo de transporte real entre Gateway e App Shell?
7. O Grupo 2 receberá somente leitura ou terá comandos autorizados em fase posterior?
8. Qual é o contrato final de eventos e ACKs do Grupo 1?

## Critério para promover um sinal a "confirmado para integração"

Um item só pode sair de "validar" quando houver:

- significado aprovado;
- fonte/DB/endereço confirmado;
- tipo e unidade confirmados;
- definição de leitura/escrita;
- comportamento em perda de comunicação;
- responsável técnico;
- teste em simulador ou bancada isolada autorizado.

Até lá, o módulo deve manter o mock e apresentar UNKNOWN/STALE quando a fonte real não puder fornecer o campo.
