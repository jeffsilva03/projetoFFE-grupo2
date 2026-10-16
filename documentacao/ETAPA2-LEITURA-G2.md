# Sprint 2 — Etapa 2: recebimento e consumo dos sinais do G2

## O que já funciona nesta branch

O Grupo 2 agora possui um **painel separado de leitura** que consome, pelo navegador, pacotes WebSocket com nomes de variáveis encontrados no `NODERED/flows.json`. Os pacotes vêm de um **servidor local de teste**: nenhum dado é recebido da Planta N2 nesta etapa.

A `main` preserva integralmente a entrega de Sprint 1. O mock antigo continua acessível no botão **Sprint 1 · Simulador** e seu protocolo não mudou.

A tela **Sprint 2 · Leitura de sinais** é **somente leitura**: não há botoeira de comando nessa tela e o servidor de teste encerra conexões que tentam transmitir mensagens. Não há S7, Node-RED real, credenciais industriais nem PLC na aplicação.

## Como executar no Windows

Requer Node >=22.12 e dependências instaladas:

1. `npm.cmd ci`
2. Em um terminal, `npm.cmd run leitura-g2` (WebSocket local na porta **8082**).
3. Em outro terminal, `npm.cmd run dev` (IHM em **http://localhost:8081**).
4. Acesse a IHM e clique em **Sprint 2 · Leitura de sinais**.
5. Selecione **Processo**, cenário **Condição normal**, e clique em **Conectar leitura G2**.
6. Confira os sinais. Para testar botão/falha/emergência, **Desconecte**, altere o cenário e conecte novamente.
7. Pare o processo do servidor de leitura: após aproximadamente 3 segundos sem atualização, a tela não deve mais considerar os sinais atuais.

Não use acesso HTTPS externo para testar `ws://localhost`. Esse servidor atende apenas à máquina de desenvolvimento (`127.0.0.1`).

### Testes

```powershell
npm.cmd run verificar
npm.cmd run testar
npm.cmd run build
npm.cmd run integracao
```

## Caminho de dados implementado

```text
Servidor WebSocket local de teste (somente leitura)
    -> pacote JSON por estação com nomes de tags do flows.json
    -> lerAmostraG2() valida estação, timestamp e booleanos
    -> obterIndicadoresG2() seleciona apenas os sinais do G2
    -> painel de leitura atualiza botões observados, segurança e modo
```

### Exemplo de pacote de Processo

```json
{
  "timestamp": "2026-10-16T19:00:00.000Z",
  "estacao": "PROCESSO",
  "sinais": {
    "processo_segurancaOK": true,
    "processo_chaveAutomatico": true,
    "processo_botaoVerde": false,
    "processo_botaoVermelho": false,
    "processo_atuadoresPosicaoOK": true,
    "processo_atuadoresOcupado": false
  }
}
```

**Importante:** essa estrutura é um **contrato de desenvolvimento criado pelo Grupo 2**, não uma rota oficial do Node-RED real e nem o contrato do Grupo 1.

### Regras de interpretação

- `true`: sinal digital ligado/ativo no pacote de teste;
- `false`: desligado/inativo **somente quando a fonte enviou esse valor**;
- `null` / campo ausente: **Não informado**;
- valor não booleano em tag usada: pacote rejeitado;
- timestamp com mais de 3 s ou mais de 1 s no futuro: pacote rejeitado;
- após 3 s sem mensagens recentes: situação passa a **dados indisponíveis**;
- pacote de estação diferente da selecionada: rejeitado;
- conexões novas não herdam um estado anterior;
- todos os comandos estão **fora deste canal de leitura**; nada é enviado ao PLC.

A relação **botão verde ↔ START físico** e **botão vermelho ↔ STOP físico** foi confirmada pelo manual para Processo e Expedição, mas o caminho da entrada física até a tag de DB ainda precisa de verificação em bancada. Na Montagem, o vínculo físico ainda requer detalhe. Para Estoque, o `flows.json` não expõe os dois botões físicos no conjunto de tags catalogado; o painel mostra **Não informado**.

O `emergencia` / `emergenciaAtivada` do DB9 não deve ser confundido com comando de E-STOP web. A falha de `segurancaOK` das outras bancadas não é automaticamente classificada como emergência.

## O que falta para receber da máquina real

1. Autorização do professor/OT para **leitura**, em bancada isolada.
2. Definir se o G2 representa uma estação ou as quatro.
3. Fazer o serviço aprovado de aquisição Node-RED/Gateway publicar os dados num contrato acordado, sem expor endereços, credenciais nem S7 ao navegador.
4. Confirmar em bancada a correspondência física dos sinais, valores de segurança e atualização.
5. Usar as amostras reais para adaptar `lerAmostraG2` se necessário, **sem mexer na UI nem habilitar comandos físicos**.

No fluxo fornecido do professor, já existe leitura S7 dos DB9, DB101, DB102 e DB103, mas não há canal de telemetria WebSocket próprio do G2. Nosso servidor local é uma simulação dessa futura ponte, **não uma cópia de um endpoint existente**.

## Arquivos desta etapa

- `src/tipos/leituraG2.ts`: tipos de leituras por estação;
- `src/servicos/leituraG2.ts`: lista de tags e validação;
- `src/componentes/LeituraG2.tsx`: conexão, indicadores e qualidade dos dados;
- `src/estilos/leitura-g2.css`: aparência da tela nova;
- `documentacao/simulador-leitura-g2.cjs`: fonte de teste local, sem comandos;
- `testes/leituraG2.test.ts`: testes automatizados;
- `src/Aplicacao.tsx`: opção de navegar entre Sprint 1 e Sprint 2.

## Fontes reais usadas no mapeamento

- `NODERED/flows.json`, pasta NODERED do Drive da Planta N2;
- manual `XL4002PD00.PT.MU.pdf`, páginas 44, 47, 50, 53–54;
- `documentacao/INVESTIGACAO-LACUNAS-G2.md` e `documentacao/MATRIZ-SINAIS-PLANTA.md`.

Nenhum outro grupo (robô, câmera, expedição/OEE) foi implementado aqui.
