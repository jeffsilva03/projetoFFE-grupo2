# Grupo 2 — caminho para comunicar a IHM com a Planta N2

**Atualizado em 21/10/2026.** Escopo: quatro estações observadas em **somente leitura**. A `main` permanece a entrega da Sprint 1.

## 1. Resposta direta: o que já existe no Drive?

**Já existe:** o Node-RED com leitura Siemens S7 e uma lista grande de tags da máquina. **Não encontramos, nas configurações examinadas, uma rota pronta para o navegador receber atualizações periódicas completas das quatro estações.** Isso NÃO significa que seja impossível ou que nada exista no restante da planta.

### Evidências verificadas

| Fonte original no Drive | O que foi encontrado | O que NÃO foi comprovado |
|---|---|---|
| `NODERED/flows.json` | 191 nós; **1 `s7 in` (`mode:all`, `diff:true`)**; endpoint S7 configurado para **200 ms**; **153 tags** (DB9/101/102/103); **60 nós `s7 out`**; **11 `http request`** externos | Não contém `http in`, `http response`, `websocket in/out` ou `mqtt in/out` para servir telemetria G2; `inject` a cada 1/3 s no fluxo não constitui uma releitura S7 completa para nossa IHM |
| `Manual/XL4002PD00.PT.MU.pdf` | S7-1200/1500, IHM KTP700, Start/Stop, reset físico; Node-RED descrito nas pp.39-40 para realidade aumentada/IoT | Manual não fornece uma URL de API/WS G2 e não valida uma conexão remota à planta |
| `Aplicativos.pdf` | Node-RED local e paleta `node-red-contrib-s7` estão na relação de aplicativos | A presença do UaExpert não comprova um endereço OPC UA de leitura da IHM; a lista de aplicativos não demonstra endpoint configurado |
| `SWAGGER.JSON` | **57 caminhos** REST para MES, inventário, produção, eventos e pedidos | Nenhum caminho encontrado que documente diretamente a **leitura ao vivo dos 22 sinais de botoeira/segurança** das quatro estações; APIs de produção não são automaticamente telemetria PLC |
| `MES/Smart4.0.postman_collection.json` | **35 requisições**, majoritariamente POST de pedidos/processos/eventos MES | Não encontramos uma coleção pronta de assinatura WS/telemetria da IHM |
| `PROGRAMA_ATUAL_N2` (4 projetos TIA Portal V20) | Artefatos internos `System/PEData.plf` com referências como `StatusProcesso`, `IHM_*`, alarmes, resets e botoeira | Arquivos binários/proprietários: busca de nomes **não equivale a abrir os blocos ladder/SCL no TIA**. Não comprovam endereços externos de API nem permitem afirmar que algo inexiste em todo o projeto |
| `Diagramas Elétricos` | Entradas físicas de botões e circuitos de segurança | Endereços físicos não são URLs de comando remoto |
| `Arquivos_fontes_Planta_N2.rar` | Arquivo consolidado, ~3,1 GB listado no Drive | **Não foi integralmente descompactado nem auditado neste trabalho**. Portanto, não podemos afirmar ausência absoluta de algum outro artefato dentro do RAR |
| `Acessos.txt` e arquivos de configuração sensíveis | Presença constatada na pasta | **Credenciais/endereços industriais não foram copiados para a IHM, código ou este documento** |

**Conclusão correta:** o trecho **PLC → Node-RED** está documentado e configurado; a publicação **Node-RED → ponte G2 → IHM** é um componente novo criado pelo Grupo 2, ainda sem testes físicos.

## 2. O que o código do Node-RED já faz?

O arquivo `flows.json` apresenta **153 nomes de variáveis**:

| Estação | DB | Total |
|---|---|---:|
| Estoque | DB9 | 81 |
| Processo | DB101 | 19 |
| Montagem | DB102 | 33 |
| Expedição | DB103 | 20 |

O nó `s7 in` está configurado com `diff: true`. Assim, o processamento pode receber apenas **variáveis que mudaram**, e não uma lista completa a cada instante. O ciclo de 200 ms está configurado no endpoint, mas **não comprova** que todas as variáveis sejam publicadas ao nosso aplicativo a cada 200 ms.

O fluxo contém alguns `inject` repetidos (1 s/3 s), **ligados principalmente a funções do Estoque e requisições MES**. Eles não publicam leitura completa das quatro estações para o G2. O `SWAGGER.JSON` e o Postman abordam APIs MES e eventos, não substituem a aquisição S7.

Outra possibilidade não comprovada nos arquivos é usar soluções como OPC UA ou a plataforma Tago IO citada no manual (p. 40). A existência desses softwares/serviços não demonstra uma URL nem um contrato de telemetria das 22 tags do G2.\n\n## 3. Por que criar leitura periódica se já temos `diff: true`?

Exemplo:

- 14h00:00: o Node-RED recebe `processo_segurancaOK = true`;
- depois o valor não muda por vários segundos;
- com `diff: true`, o fluxo pode **não reenviar a mesma tag**, mesmo que o PLC continue saudável;
- nossa IHM não deve confundir “nenhuma nova informação” com “segurança confirmada”.

A ponte G2 preserva temporariamente os últimos valores por **até 3 segundos**, mas marca os sinais como **Não informado** quando não recebe nova confirmação. Isso é intencional e evita uma tela com valores antigos apresentados como se fossem atuais.

## 4. O que foi desenvolvido nesta continuação?

Criamos uma **Function do Node-RED para saída periódica**, no arquivo:

[`NODERED-FUNCTION-LEITURA-PERIODICA-G2.js`](NODERED-FUNCTION-LEITURA-PERIODICA-G2.js).

Ela:

1. espera uma **leitura S7 recém-recebida**;
2. seleciona somente as **22 tags úteis ao G2**;
3. limita a publicação a **uma mensagem por segundo**;
4. envia via HTTP local ou HTTPS autorizado para a ponte existente;
5. **não guarda nem reenvia dados antigos** quando o S7 fica silencioso;
6. não envia START, STOP, RESET nem emergência para a máquina.

**Condição fundamental:** para garantir amostras periódicas, a Function deverá ser alimentada por uma entrada S7 que **publique valores atuais mesmo sem mudança** (por exemplo, um **segundo `s7 in` independente com `mode: all` e `diff: false`**, ligado ao endpoint autorizado).

**Não instalar nem duplicar nós S7 no ambiente industrial sem o professor aprovar a carga de leitura e a topologia.** Não mexer na entrada original com `diff: true` que já atende outras funções.

## 5. Como colocar para funcionar de verdade: passo a passo

### Etapa A — demonstração no computador (pode fazer agora)

1. Abra a branch `feat/sprint2-snapshot-periodico-g2`.
2. Rode `npm.cmd ci`.
3. No terminal 1, `npm.cmd run demo-ponte-g2`.
4. No terminal 2, `npm.cmd run dev`.
5. Abra `http://localhost:8081`, clique **Sprint 2 · Ponte Node-RED**, e conecte.
6. Veja os quatro cartões, pare o terminal 1 e confira a indicação **Sem dados atuais**.

A demonstração é artificial; não usa a máquina.

### Etapa B — escolher onde os serviços ficarão (depende do professor)

O professor precisa autorizar **um computador ou servidor na rede da bancada** para executar a ponte. Também precisa confirmar como o navegador alcançará esse servidor. Não use IPs ou tokens do Drive em código público.

- Mesmo computador: ponte `http://127.0.0.1:8092`, IHM em `http://localhost:8081`.
- Computadores diferentes: usar **gateway com HTTPS/WSS e autenticação**, aprovado pela instituição. Não expor diretamente o PLC ou a porta 8092.

### Etapa C — preparar o fluxo Node-RED (em ambiente autorizado)

1. Fazer backup/exportação do fluxo atual.
2. Sem alterar o `s7 in` original, avaliar com o professor a criação de uma **entrada somente leitura** que forneça *amostras completas e atuais*.
3. Ligar essa entrada à Function de publicação periódica nova.
4. Ligar a Function a um nó `HTTP Request`, configurado para usar `msg.method`, `msg.url`, `msg.headers` e JSON do `msg.payload`.
5. Configurar, fora do GitHub, as variáveis `G2_BRIDGE_TOKEN` e `G2_BRIDGE_HTTP_URL`.
6. Confirmar no Node-RED se as mensagens enviadas contêm os campos esperados e se a taxa de leitura ficou aceitável.
7. **Não utilizar `s7 out`** nem mudar saídas e intertravamentos existentes.

### Etapa D — testar os quatro painéis na bancada (em supervisão)

| Teste | Resultado esperado |
|---|---|
| Processo: pressionar START físico | `processo_botaoVerde` muda e a IHM mostra a leitura correta |
| Processo: pressionar STOP físico | `processo_botaoVermelho` muda |
| Montagem: observar botoeira | Campos `montagem_botaoVerde`/`montagem_botaoVermelho` atualizam, após confirmar seu significado |
| Expedição: START/STOP físicos | Campos `expedicao_botaoVerde`/`expedicao_botaoVermelho` atualizam |
| Estoque | Segurança/emergência, ocupado, aguardando e modo chegam; Start/Stop não estão expostos no conjunto atual de tags do DB9 |
| Segurança | Indicadores mostram **somente estados observados**; nunca substituir a emergência física |
| Parar a fonte de leitura | Após alguns segundos, exibir **Não informado** ou **Sem dados atuais**, nunca “Segurança OK” sem confirmação |
| Desconectar/reconectar | A IHM não reutiliza dados antigos como se fossem novos |
| Quatro estações simultâneas | Nenhuma estação confunde tags de outra |

O limite de **3 segundos** acima é uma regra de qualidade da **IHM de teste**, não é configuração de segurança física da Planta N2.

### Etapa E — comandos virtuais (somente depois)

Esta ponte é apenas de **leitura**. START/STOP/RESET da interface continuam sendo do mock até a instituição autorizar um canal de comando separado, com validações próprias. **RESET físico de segurança e E-STOP não podem ser substituídos por clique na web**.

### Etapa F — integrar ao Grupo 1

Quando houver leitura real validada, o Grupo 2 poderá encaixar o adaptador no Gateway/App Shell do Grupo 1, como combinado com o professor, sem antecipar essa integração.

## 6. Resumo do que falta perguntar/confirmar no laboratório

- O Node-RED entregue no Drive é exatamente o que está rodando na bancada?
- O fluxo industrial pode fornecer leitura completa de `DB9/101/102/103` periodicamente sem prejudicar outros processos?
- O formato real de `msg.payload` corresponde aos nomes das tags catalogadas?
- Qual servidor autorizado pode hospedar a ponte?
- Há proxy/gateway HTTPS/WSS interno e quais origens são permitidas?
- Quem opera a bancada durante os testes físicos e valida segurança?
- Onde a lógica de `StatusProcesso`, reset e alarmes deve ser exposta para leitura G2, se necessária?

## 7. O que esta auditoria NÃO garante

- Não houve conexão de rede com o PLC ou Node-RED real.
- Não foi feita descompilação confiável de todos os blocos TIA Portal.
- O arquivo `Arquivos_fontes_Planta_N2.rar` (~3,1 GB) não foi integralmente descompactado.
- Nenhuma ausência foi provada em **todas** as possíveis instalações da planta; apenas nos arquivos/rotas auditados.

## Fontes do Google Drive

- [Pasta principal — Planta N2](https://drive.google.com/drive/folders/1c-czDOiBYs7o0xU9AWlcRa_F84kcwMEs)
- [Node-RED — flows.json](https://drive.google.com/file/d/1o-KUehxFslduPGt_mL-Xq4JbS2mIPSga/view)
- [Manual SMART 4.0 — XL4002PD00.PT.MU.pdf](https://drive.google.com/file/d/1SY8gjYxpbpWtE8yKkCt8zDA3DstfP0AS/view) — principalmente pp. 15-16, 39-40, 44, 47, 50, 53-54, 205 e 217-218
- [Aplicativos.pdf](https://drive.google.com/file/d/1xT4EtQufwD42oLxyAr7MyMb4qE9Vaj5p/view)
- [SWAGGER.JSON](https://drive.google.com/file/d/1KoUgli8dImqC2ZO-N6IMBY6_U7niTvHG/view)
- [Coleção MES Postman](https://drive.google.com/file/d/12obUWvRlJpgdRVZIu92e2Z-ELkyLJExB/view)
- `PROGRAMA_ATUAL_N2/01_Estoque_V20, 02_Processo_V20, 03_Montagem_V20, 04_Expedicao_V20`: `System/PEData.plf`, verificados por referências textuais dentro de artefatos binários.
