# Sprint 2 — Matriz validável da IHM de Processo

**Fontes:** `Manual_Operacao_N2.pdf` recebido em 04/11/2026, p. 11–13, 20, 44–49, 90–102 e 175–194; fotos reais fornecidas pelo grupo; `NODERED/flows.json` previamente catalogado em `CATALOGO-SINAIS-S7.md`; `FFE-Sprint2.pdf`, p. 6.

## A origem de cada dado
- Endereços `%I` e `%Q`: entradas/saídas físicas do PLC, **não são endpoints web**. Tabelas do manual, página 13.
- `DB101,X...`: offsets do DB lidos no `flows.json` do Node-RED; não representam permissão de escrita.
- `processo_...`: nomes de sinais do `flows.json` recebidos pela **ponte G2, somente leitura**.
- Números da foto (X/Y, lâminas e depósitos): amostras visuais fotografadas. Não são medições atuais da máquina.
- Estado local de botoeira/JOG: simulação em memória do navegador. Não representa lógica validada do PLC.

## Matriz: Entradas (foto × manual × ponte)
| Etiqueta na foto | Entrada no manual | Tag disponível na ponte | Observação |
|---|---|---|---|
| Botão de Emergência OK | %I0.1 Emergência | — | `processo_segurancaOK` não é assumida como equivalência direta do contato de emergência |
| Eixo Z Avançado | %I0.2 | processo_eixoZAvancado | DB101,X0.2 |
| Eixo Z Recuado | %I0.3 | processo_eixoZRecuado | DB101,X0.3 |
| Sensor Vácuo Manipulador | %I0.4 | processo_sensorVacuoManipulador | DB101,X0.4 |
| Sensor Vácuo Mesa | %I0.5 | processo_sensorVacuo | Rótulo no manual é "Vacuostato base de gravação"; confirmar semântica |
| Comutador Painel (AUT) | %I0.6 | processo_chaveAutomatico | DB101,X0.6 |
| Botão Verde Painel | %I0.7 | processo_botaoVerde | DB101,X0.7 |
| Botão Vermelho Painel | %I1.0 | processo_botaoVermelho | DB101,X1.0 |

## Matriz: Saídas
| Etiqueta na foto | Saída no manual | Tag na ponte |
|---|---|---|
| Avança Eixo Z | %Q0.0 | processo_avancaEixoZ (DB101,X20.0) |
| Liga Vácuo Manipulador | %Q0.1 | processo_acionaVacuoManipulador (DB101,X20.1) |
| Liga Vácuo Mesa | %Q0.2 | processo_acionaVacuoMesa (DB101,X20.2) |
| Motor da Esteira 1 | %Q0.3 (inclui giro no manual) | processo_esteira1 (DB101,X20.3) |
| Motor da Esteira 2 | %Q0.4 | processo_esteira2 (DB101,X20.4) |
| Status Processo | %Q1.1 (para Smart Sense) | — (não confirmado no fluxo do DB101) |

O manual também relaciona `processo_segurancaOK` no conjunto lógico da planta, mas o sinal agregado não deve ser apresentado como confirmação automática do estado individual do circuito de emergência física.

## Cenários e critérios
1. **Fotografia:** estado estático dos LEDs como observado em 28/10/2026.
2. **Simulação local:** Start/Stop/Reset, seletor Setup e controles de modo manual alteram apenas o estado demonstrativo. Botão de emergência virtual produz trava local, requer liberação e Reset. **Não é função de segurança física**.
3. **Ponte G2:** lê exclusivamente pacotes `estacao=PROCESSO` da rota WebSocket `/telemetria` da ponte já existente. Um valor nulo ou ausente fica "Não informado". Sem pacote recente (3 s), todos os LEDs ficam desconhecidos. Sinais de outra estação são ignorados.
4. **Não escrevemos no PLC:** sem botões `s7 out`, sem IP de CLP no navegador, sem comandos remotos START/STOP/JOG/RESET/emergência. Executar somente com rede e gateway autorizados.
5. **Confirmação pendente:** relação entre `%I/%Q` físicos e espelho `DB101` deve ser verificada no TIA/Node-RED por responsável, assim como circuito de emergência e semântica do vacuostato.
6. **Grupo 1:** integração por microfrontend e contrato de eventos permanece provisória, até o App Shell confirmar os eventos.
7. **Manuais e endereços:** IPs da planta no manual são referência de inventário; não devem ser usados para escrever na planta nem assumidos atuais. A página 20 traz o notebook em `192.168.150.200` e CLP Processo em `192.168.150.20`.

## Conferência
```powershell
npm.cmd ci
npm.cmd run verificar
npm.cmd run testar
npm.cmd run testar-ponte
npm.cmd run build
npm.cmd run integracao
```
