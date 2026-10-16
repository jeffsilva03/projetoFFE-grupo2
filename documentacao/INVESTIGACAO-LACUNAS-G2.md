# Investigação das lacunas — SOMENTE Grupo 2 (IHM Siemens e botoeira)

**Data:** 16/10/2026  
**Fase:** levantamento de fontes para aquisição de dados. **Não é homologação da comunicação real.**

## Resumo executivo

A nova investigação cruzou:

1. manual original do fabricante **`Manual/XL4002PD00.PT.MU.pdf`** (228 páginas);
2. diagramas elétricos de Estoque, Processo, Montagem e Expedição;
3. `NODERED/flows.json`;
4. dados internos `System/PEData.plf` dos quatro projetos TIA Portal V20;
5. Guia/Runbook do professor.

**Resultados:** START/STOP físicos confirmados por manual nas estações Estoque, Processo e Expedição. RESET físico de segurança confirmado, obrigatório e distinto dos resets lógicos internos. Referências a estados, manutenção, alarmes e temporizadores foram encontradas no TIA Portal; **não foram encontrados seus contratos externos/endereços S7 prontos para a IHM web**.

Não copiar tags internas ou endereços privados para o browser. Não criar escrita no PLC.

## 1. Checklist real da botoeira G2

Manual do fabricante, página 54, seção 7.5.1:

- IHM Siemens KTP700;
- chave para **SETUP**;
- botão **START**;
- botão **STOP**;
- botão físico de **EMERGÊNCIA**;
- botão + indicador de **RESET**;
- indicação **SEGURANÇA OK**;
- indicação **SEGURANÇA ACIONADA**.

A tela WinCC/supervisório também possui tela geral e de alarmes (manual, página 17), mas **isso não comprova telemetria de alarmes exposta no Node-RED**.

### Endereços físicos comprovados

| Estação | Entrada Start | Entrada Stop | Comutador | Emergência | Fonte |
|---|---|---|---|---|---|
| Estoque | `%I1.3` | `%I1.4` | `%I1.2` | `%I0.1` (Emergência OK) | manual p.44 |
| Processo | `%I0.7` | `%I1.0` | `%I0.6` | `%I0.1` | manual p.47 |
| Expedição | `%I0.6` | `%I0.7` | `%I0.5` | `%I0.1` | manual p.53 |
| Montagem | não discriminada no manual | não discriminada no manual | não discriminada no manual | `%I0.1` (DI1; S7-1500) | manual p.50 |

**Importante:** botão físico START/STOP confirmado **não significa** bit de comando remoto aprovado. A entrada física `%I` não é a tag `DB` exposta pelo Node-RED. Não foi validada, em ladder/SCL exportado ou bancada, a cadeia exata entre esses dois pontos.

Para Montagem, há `montagem_botaoVerde` (`DB102,X6.6`) e `montagem_botaoVermelho` (`DB102,X6.7`) no Node-RED, além de nomes internos no TIA Portal. Isso confirma a existência lógica dos campos, **não seus endereços físicos**.

## 2. Correspondência candidata entre entrada física e Node-RED

| Estação | Função | Campo DB do `flows.json` | Grau de confiança |
|---|---|---|---|
| Processo | segurança | `DB101,X0.1 processo_segurancaOK` | nome encontrado; semântica de 0/1 a validar |
| Processo | modo/comutador | `DB101,X0.6 processo_chaveAutomatico` | correspondência funcional provável |
| Processo | Start físico | `DB101,X0.7 processo_botaoVerde` | botão verde corresponde ao Start do manual; caminho físico→DB precisa de teste |
| Processo | Stop físico | `DB101,X1.0 processo_botaoVermelho` | botão vermelho corresponde ao Stop do manual; caminho físico→DB precisa de teste |
| Montagem | segurança / modo / botoeira | `DB102,X0.1`, `DB102,X6.5`, `DB102,X6.6`, `DB102,X6.7` | encontrados na tabela, comportamento em execução não validado |
| Expedição | segurança / modo / botoeira | `DB103,X0.1`, `DB103,X0.5`, `DB103,X0.6`, `DB103,X0.7` | correspondência funcional provável; testar |
| Estoque | emergência / manual / modo | `DB9,X100.3`, `DB9,X100.2`, `DB9,X110.1`, `DB9,X110.0` | campos já consumidos no Node-RED; semântica final a validar |
| Estoque | habilitação / operação | `DB9,X110.6 condicaoIniciar`, `DB9,X100.0 ocupado`, `DB9,X100.1 aguardando` | consumidos no Node-RED; possíveis permissivos/estados |

O nó `s7 in` possui `mode: all`, `diff: true` e ciclo de endpoint configurado para 200 ms. **Isso não é prova de latência real, nem de endpoint HTTP/WS da IHM.**

## 3. RESET — três conceitos distintos

**A. Rearme físico de segurança (confirmado)**

- diagramas elétricos: RESET no circuito de segurança;
- manual p.205: quando segurança atua, indicam-se segurança acionada + luz de reset e os movimentos ficam bloqueados;
- manual pp.217–218: após liberar a emergência, é necessário **rearme manual**, depois novo acionamento, sob condições seguras.

**B. Reset lógico de processo/alarme (identificado, não integrado)**

Na inspeção dos dados internos Siemens `PEData.plf` foram encontrados identificadores/descrições como:
- **Processo:** `Reset do Processo`, `Reset de Alarmes`, `IHM_Processo.Manual.EixoX.Reset`, `IHM_Processo.Manual.EixoY.Reset`;
- **Estoque/Expedição:** `Tempo 3 segundos para Reset do sistema`, `Reset de alarmes`;
- **Montagem:** `Reset do Sinal de Strobe Robô`, `ResetBloco`.

Essas referências **não** equivalem ao rearme físico do relé de segurança e **não** identificam um DB/endereço permitido para escrita remota. Os `PEData.plf` são artefatos internos do TIA Portal; a investigação conseguiu extrair referências textuais, **não decompilar/validar toda a lógica ladder/SCL**.

**C. `RESET` do mock professor (simulado)**

Existe apenas no contrato de simulação e não deve ser convertido automaticamente em reset real.

## 4. Estados operacionais: informação nova

Nos dados internos do projeto **Processo** aparecem descrições de estados:

- Bancada Ocupada;
- Bancada Aguardando;
- Bancada em Manual;
- Bancada em Manutenção;
- Bancada em Emergência;
- Bancada em Parada de Scanner;
- Bancada em Operação de Reset (descrição abreviada/incompleta no artefato);
- Bancada Coletando.

Nos quatro projetos há referências internas `StatusProcesso`/`sdStatusProcesso`; também existe `IHM_*.Manual.StatusProcesso`.

**Conclusão:** a máquina possui conceitos internos de status e manutenção, mas **não foi encontrado** na tabela de sinais exposta pelo `flows.json` um campo único validado `estadoGlobal`/enum global com mapeamento dos estados acima. O manual mostra saídas `Status Processo ao Smart Sense` nas estações, mas elas não comprovam um enum de estados completo.

## 5. Alarmes: informação nova

Foram identificadas:

- referência à tela **Alarmes** do supervisório no manual (p.17);
- `IHM_Processo.Manual.EixoX.Alarme`, `IHM_Processo.Manual.EixoY.Alarme`;
- `IHM_Estoque.Manual.EixoVertical.Alarme`, `IHM_Estoque.Manual.EixoGiro.Alarme`;
- `IHM_Expedicao.Manual.EixoVertical.Alarme`, `IHM_Expedicao.Manual.EixoHorizontal.Alarme`;
- interface `Alarmes do Sistema` no projeto Montagem;
- descrições de falhas de processo no projeto Processo.

**Falta:** lista de códigos/gravidade, fontes atualizadas, timestamp, regra de reconhecimento e canal externo read-only. `flows.json` não publica essa lista para o G2. Não declarar alarmes verdadeiros em runtime até mapear acesso.

## 6. Tempo de ciclo

Existem temporizadores internos, como `tTempoCalcularPosicoes` (Processo), `tTempoSalvarPosicao` (Estoque/Expedição) e `tTempoEsteira1Ligada` (Montagem). **Eles não comprovam, por si, uma medição de tempo de ciclo produtivo**.

Não foi identificado no `flows.json` um campo direto e aprovado equivalente a `cycleTimeMs`. Para a telemetria G2, manter `tempoCicloMs: null` até definir critério, unidade e origem.

## 7. SETUP, DESLIGA, pressão e segurança

- **SETUP:** o manual p.54 comprova uma chave para SETUP e os programas contêm referências internas de setup. Não foi confirmado um valor externo codificado para os modos `MANUAL`, `AUTOMATICO` e `MANUTENCAO` no Node-RED.
- **DESLIGA:** aparece no Guia como sinal requerido, porém não foi identificado no manual p.54 um botão físico separado com esse nome/endereço; menções a `Desliga` nos projetos incluem desligamento de motores/esteiras/vácuo, **não provam um comando geral `DESLIGA` disponível por software**.
- **Pressão:** o manual p.211 cita pressões regulamentadas de 3,5 bar (Estoque) e 4 bar (outras estações). Esses são **valores de ajuste/limitação descritos pelo manual, não leituras de sensores**. O limiar 4,5 bar existente no mock G2 não é um critério de segurança real aprovado.
- **E-STOP:** nunca confundir controle web simulado com dispositivo/circuito de segurança físico. O manual pp.205 e 217–218 e o Runbook são explícitos sobre bloqueio e rearme.

## 8. Status do fechamento das lacunas

| Questão original | Resultado |
|---|---|
| Start/Stop físico | **RESOLVIDO documentalmente** para Estoque, Processo e Expedição; Montagem requer detalhe físico adicional |
| Endereço DB dos estados de Start/Stop | **CANDIDATOS encontrados**; PLC físico→DB exige teste de leitura |
| RESET de segurança | **RESOLVIDO conceitualmente**: obrigatório e manual; não implementar comando remoto |
| Resets lógicos / alarmes | **EXISTEM INTERNAMENTE**, mas não expostos/endereçados para o G2 no fluxo atual |
| Estado global | **STATUS INTERNOS IDENTIFICADOS**; mapa para enum de telemetria ainda precisa ser definido |
| Modo MANUTENCAO | **IDENTIFICADO** como status interno, não confirmado como modo externo do G2 |
| Alarmes | **IDENTIFICADOS INTERNAMENTE**, ainda sem canal/catálogo de publicação G2 |
| Tempo de ciclo produtivo | **NÃO CONFIRMADO** como medição exposta |
| SETUP | **CONFIRMADO** como elemento físico, ainda sem mapa de payload externo |
| DESLIGA | **NÃO CONFIRMADO** como botão físico digital independente |
| Via de aquisição PLC→Node-RED | **CONFIGURADA**; verificar valores em bancada autorizada |
| Canal de leitura Node-RED→G2 | **AINDA NÃO EXISTE** no `flows.json` fornecido |

## 9. Próxima ação objetiva — G2 somente

Construir um **contrato de leitura por estação** com valores booleanos opcionais (`boolean | null`), timestamp e qualidade (`OK | STALE | UNKNOWN`), sem comandos físicos.

Depois, implementar um **adaptador de aquisição read-only**, inicialmente sobre fixtures capturadas/simuladas, para converter apenas as tags já identificadas em:

- status de segurança;
- START/STOP **observados** (estado do botão físico);
- modo/comutador;
- emergência;
- permissivos/ocupação;
- diagnósticos relevantes do painel.

Campos não publicados pela fonte real devem aparecer como indisponíveis, não como `false` ou `0`.

Antes do teste de leitura real, solicitar ao professor/responsável OT **acesso aprovado e isolado** à aquisição por Node-RED/Gateway, e a confirmação da estação da IHM do G2. Nenhuma credencial/endereço de rede industrial deve ir para o frontend.

## Fontes auditadas

- [Manual do fabricante — XL4002PD00.PT.MU.pdf](https://drive.google.com/file/d/1SY8gjYxpbpWtE8yKkCt8zDA3DstfP0AS/view) — pp.17, 44, 47, 50, 53, 54, 205, 211, 217–218
- [Node-RED — flows.json](https://drive.google.com/file/d/1o-KUehxFslduPGt_mL-Xq4JbS2mIPSga/view)
- [Diagrama elétrico Estoque](https://drive.google.com/file/d/1isfgnr_MRidtbEkCxSMA7MHgmxCVpZOg/view)
- [Diagrama elétrico Processo](https://drive.google.com/file/d/126CzEIfiBk6UzBGuQCKrCSUhcc8WvDTr/view)
- [Diagrama elétrico Montagem](https://drive.google.com/file/d/1ydjjOdqisUw7I-0iQt4mquKrmntwg1YW/view)
- [Diagrama elétrico Expedição](https://drive.google.com/file/d/1gpe1gP-B_tPBYsj9Yi9SLfNLTqQePljE/view)
- TIA V20 `PROGRAMA_ATUAL_N2/{01_Estoque_V20,02_Processo_V20,03_Montagem_V20,04_Expedicao_V20}/System/PEData.plf`. Os nomes internos são **indícios documentais**, não configuração pronta de API.
- `Guia Checklist Projeto SMART 4.0 Front-End.pdf` e `Runbook_Sprint1_Planta_N2_FFE-Semana1(1).pdf`.
