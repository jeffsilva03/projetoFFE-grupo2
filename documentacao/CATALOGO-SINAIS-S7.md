# Catálogo S7 observado no Node-RED

> Gerado a partir de `NODERED/flows.json` para a Etapa 1 do Grupo 2. Este catálogo descreve o que está configurado no fluxo fornecido pelo professor. Não é autorização de escrita na planta.

## Resumo

- Entradas na `vartable`: **153**
- DB9 (Estoque): **81**
- DB101 (Processo): **19**
- DB102 (Montagem): **33**
- DB103 (Expedição): **20**
- Nó `s7 in`: `mode=all`, `diff=true`
- Campos usados explicitamente pela função ligada ao `s7 in`: **21**
- Variáveis com nós `s7 out`: **60**

### Como ler as colunas

- **Consumido hoje**: o campo é acessado explicitamente pelo fluxo atual logo após o `s7 in`.
- **Há s7 out**: existe um nó de escrita configurado para essa variável no fluxo atual.
- Estar na `vartable` não significa, sozinho, que o Grupo 2 deva exibir ou comandar esse sinal.

## DB9 — Estoque

| Endereço | Tag | Consumido hoje | Há `s7 out` |
|---|---|---:|---:|
| `DB9,X102.0` | `pedirPosicao` | sim | não |
| `DB9,X106.0` | `adicionarEstoque` | sim | não |
| `DB9,X106.1` | `removerEstoque` | sim | não |
| `DB9,I104` | `posicaoEstoque` | sim | não |
| `DB9,X100.1` | `aguardando` | sim | não |
| `DB9,X100.3` | `emergencia` | sim | não |
| `DB9,X100.2` | `manual` | sim | não |
| `DB9,X100.0` | `ocupado` | sim | não |
| `DB9,X98.0` | `cancelOP` | sim | não |
| `DB9,X98.1` | `finishOP` | sim | não |
| `DB9,I96` | `numeroOP` | sim | não |
| `DB9,X98.2` | `startOP` | sim | não |
| `DB9,I108` | `corGuardarEstoque` | sim | não |
| `DB9,X110.1` | `comutadorAutomatico` | sim | não |
| `DB9,X110.6` | `condicaoIniciar` | sim | não |
| `DB9,X110.0` | `emergenciaAtivada` | sim | não |
| `DB9,X110.3` | `homeGiro` | sim | não |
| `DB9,X110.2` | `homeVertical` | sim | não |
| `DB9,X110.5` | `servoGiro` | sim | não |
| `DB9,X110.4` | `servoVertical` | sim | não |
| `DB9,I58` | `andares` | não | sim |
| `DB9,I02` | `corAndar1` | não | sim |
| `DB9,I20` | `corAndar2` | não | sim |
| `DB9,I38` | `corAndar3` | não | sim |
| `DB9,I06` | `corLamina1Andar1` | não | sim |
| `DB9,I24` | `corLamina1Andar2` | não | sim |
| `DB9,I42` | `corLamina1Andar3` | não | sim |
| `DB9,I08` | `corLamina2Andar1` | não | sim |
| `DB9,I26` | `corLamina2Andar2` | não | sim |
| `DB9,I44` | `corLamina2Andar3` | não | sim |
| `DB9,I10` | `corLamina3Andar1` | não | sim |
| `DB9,I28` | `corLamina3Andar2` | não | sim |
| `DB9,I46` | `corLamina3Andar3` | não | sim |
| `DB9,I56` | `numeroPedido` | não | sim |
| `DB9,I12` | `padraoLamina1Andar1` | não | sim |
| `DB9,I30` | `padraoLamina1Andar2` | não | sim |
| `DB9,I48` | `padraoLamina1Andar3` | não | sim |
| `DB9,I14` | `padraoLamina2Andar1` | não | sim |
| `DB9,I32` | `padraoLamina2Andar2` | não | sim |
| `DB9,I50` | `padraoLamina2Andar3` | não | sim |
| `DB9,I16` | `padraoLamina3Andar1` | não | sim |
| `DB9,I34` | `padraoLamina3Andar2` | não | sim |
| `DB9,I52` | `padraoLamina3Andar3` | não | sim |
| `DB9,I04` | `posicaoEstoqueAndar1` | não | sim |
| `DB9,I22` | `posicaoEstoqueAndar2` | não | sim |
| `DB9,I40` | `posicaoEstoqueAndar3` | não | sim |
| `DB9,I60` | `posicaoExpedicao` | não | sim |
| `DB9,X00.0` | `recebidoOP` | não | sim |
| `DB9,X62.0` | `iniciarPedido` | não | sim |
| `DB9,X64.0` | `recebidoEstoque` | não | sim |
| `DB9,X64.1` | `iniciarGuardar` | não | sim |
| `DB9,I66` | `posicaoGuardar` | não | sim |
| `DB9,X106.2` | `retornoEstoqueCheio` | sim | não |
| `DB9,B68` | `pos1` | não | sim |
| `DB9,B69` | `pos2` | não | sim |
| `DB9,B70` | `pos3` | não | sim |
| `DB9,B71` | `pos4` | não | sim |
| `DB9,B72` | `pos5` | não | sim |
| `DB9,B73` | `pos6` | não | sim |
| `DB9,B74` | `pos7` | não | sim |
| `DB9,B75` | `pos8` | não | sim |
| `DB9,B76` | `pos9` | não | sim |
| `DB9,B77` | `pos10` | não | sim |
| `DB9,B78` | `pos11` | não | sim |
| `DB9,B79` | `pos12` | não | sim |
| `DB9,B80` | `pos13` | não | sim |
| `DB9,B81` | `pos14` | não | sim |
| `DB9,B82` | `pos15` | não | sim |
| `DB9,B83` | `pos16` | não | sim |
| `DB9,B84` | `pos17` | não | sim |
| `DB9,B85` | `pos18` | não | sim |
| `DB9,B86` | `pos19` | não | sim |
| `DB9,B87` | `pos20` | não | sim |
| `DB9,B88` | `pos21` | não | sim |
| `DB9,B89` | `pos22` | não | sim |
| `DB9,B90` | `pos23` | não | sim |
| `DB9,B91` | `pos24` | não | sim |
| `DB9,B92` | `pos25` | não | sim |
| `DB9,B93` | `pos26` | não | sim |
| `DB9,B94` | `pos27` | não | sim |
| `DB9,B95` | `pos28` | não | sim |

## DB101 — Processo

| Endereço | Tag | Consumido hoje | Há `s7 out` |
|---|---|---:|---:|
| `DB101,X0.1` | `processo_segurancaOK` | não | não |
| `DB101,X0.2` | `processo_eixoZAvancado` | não | não |
| `DB101,X0.3` | `processo_eixoZRecuado` | não | não |
| `DB101,X0.4` | `processo_sensorVacuoManipulador` | não | não |
| `DB101,X0.5` | `processo_sensorVacuo` | não | não |
| `DB101,X0.6` | `processo_chaveAutomatico` | não | não |
| `DB101,X0.7` | `processo_botaoVerde` | não | não |
| `DB101,X1.0` | `processo_botaoVermelho` | não | não |
| `DB101,X8.0` | `processo_atuadoresPosicaoOK` | não | não |
| `DB101,X8.1` | `processo_atuadoresOcupado` | não | não |
| `DB101,X20.0` | `processo_avancaEixoZ` | não | não |
| `DB101,X20.1` | `processo_acionaVacuoManipulador` | não | não |
| `DB101,X20.2` | `processo_acionaVacuoMesa` | não | não |
| `DB101,X20.3` | `processo_esteira1` | não | não |
| `DB101,X20.4` | `processo_esteira2` | não | não |
| `DB101,X20.5` | `processo_stopper1` | não | não |
| `DB101,X20.6` | `processo_stopper2` | não | não |
| `DB101,X26.0` | `processo_triggerAtuador` | não | não |
| `DB101,W28` | `processo_posicaoAtuador` | não | não |

## DB102 — Montagem

| Endereço | Tag | Consumido hoje | Há `s7 out` |
|---|---|---:|---:|
| `DB102,X0.1` | `montagem_segurancaOK` | não | não |
| `DB102,X6.0` | `montagem_sensorVacuo` | não | não |
| `DB102,X6.1` | `montagem_alimentadorAvancado` | não | não |
| `DB102,X6.2` | `montagem_alimentadorEntregue` | não | não |
| `DB102,X6.3` | `montagem_alimentadorRecuado` | não | não |
| `DB102,X6.4` | `montagem_rampaAlimentadora` | não | não |
| `DB102,X6.5` | `montagem_chaveAutomatico` | não | não |
| `DB102,X6.6` | `montagem_botaoVerde` | não | não |
| `DB102,X6.7` | `montagem_botaoVermelho` | não | não |
| `DB102,X7.0` | `montagem_pecaStopper` | não | não |
| `DB102,W8` | `montagem_andarBloco` | não | não |
| `DB102,W10` | `montagem_totalAndares` | não | não |
| `DB102,W12` | `montagem_numeroPedido` | não | não |
| `DB102,W14` | `montagem_corLamina1` | não | não |
| `DB102,W16` | `montagem_corLamina2` | não | não |
| `DB102,W18` | `montagem_corLamina3` | não | não |
| `DB102,W20` | `montagem_padraoLamina1` | não | não |
| `DB102,W22` | `montagem_padraoLamina2` | não | não |
| `DB102,W24` | `montagem_padraoLamina3` | não | não |
| `DB102,X26.0` | `montagem_roboPosicao` | não | não |
| `DB102,X26.1` | `montagem_roboOcupado` | não | não |
| `DB102,X28.0` | `montagem_resultadoInspecao` | não | não |
| `DB102,X30.0` | `montagem_avancaAlimentador` | não | não |
| `DB102,X30.1` | `montagem_recuaAlimentador` | não | não |
| `DB102,X30.2` | `montagem_acionaVacuo` | não | não |
| `DB102,X30.3` | `montagem_esteira1` | não | não |
| `DB102,X30.4` | `montagem_esteira2` | não | não |
| `DB102,X30.5` | `montagem_stopper1` | não | não |
| `DB102,X30.6` | `montagem_stopper2` | não | não |
| `DB102,X32.0` | `montagem_triggerRobo` | não | não |
| `DB102,W34` | `montagem_posicaoRobo` | não | não |
| `DB102,X36.0` | `montagem_triggerCamera` | não | não |
| `DB102,W38` | `montagem_corEsperada` | não | não |

## DB103 — Expedição

| Endereço | Tag | Consumido hoje | Há `s7 out` |
|---|---|---:|---:|
| `DB103,X0.1` | `expedicao_segurancaOK` | não | não |
| `DB103,X0.2` | `expedicao_alimentadorAvancado` | não | não |
| `DB103,X0.3` | `expedicao_alimentadorRecuado` | não | não |
| `DB103,X0.4` | `expedicao_sensorVacuo` | não | não |
| `DB103,X0.5` | `expedicao_chaveAutomatico` | não | não |
| `DB103,X0.6` | `expedicao_botaoVerde` | não | não |
| `DB103,X0.7` | `expedicao_botaoVermelho` | não | não |
| `DB103,X6.0` | `expedicao_pecaStopper` | não | não |
| `DB103,W8` | `expedicao_posicaoGuardar` | não | não |
| `DB103,W10` | `expedicao_numeroPedido` | não | não |
| `DB103,X12.0` | `expedicao_atuadorPosicaoOK` | não | não |
| `DB103,X12.1` | `expedicao_atuadorOcupado` | não | não |
| `DB103,X20.0` | `expedicao_avancaAlimentador` | não | não |
| `DB103,X20.1` | `expedicao_acionaVacuo` | não | não |
| `DB103,X20.2` | `expedicao_esteira1` | não | não |
| `DB103,X20.3` | `expedicao_esteira2` | não | não |
| `DB103,X20.4` | `expedicao_stopper1` | não | não |
| `DB103,X20.5` | `expedicao_stopper2` | não | não |
| `DB103,X26.0` | `expedicao_triggerAtuador` | não | não |
| `DB103,W28` | `expedicao_posicaoAtuador` | não | não |
