# Continuação da Sprint 2 — ponte configurável e sinais parciais

## O que mudou

A IHM do Grupo 2 já lê as quatro estações em uma única tela. Agora:

1. **A URL da ponte pode ser alterada na própria tela** ou em `.env.local` com `VITE_G2_WS_URL`.
2. **A ponte reúne atualizações parciais** do Node-RED, sem apagar um botão que ainda tenha um valor recente.
3. **Cada valor vence após 3 segundos sem nova leitura daquele sinal**. Se só o START mudar e a segurança não for confirmada, a segurança aparecerá como “Não informado” após esse prazo.
4. Pacotes atrasados ou fora de ordem são rejeitados, e uma estação não sobrescreve outra.
5. **Origens de acesso da IHM são configuráveis** via `G2_IHM_ORIGINS`, mantendo a ponte ligada somente ao `127.0.0.1`.

A `main` não foi alterada. Não há escrita no PLC.

## Teste sem acesso à máquina

No Windows, execute:

```powershell
npm.cmd ci
npm.cmd run demo-ponte-g2
```

Em outro terminal:

```powershell
npm.cmd run dev
```

Abra **http://localhost:8081** → **Sprint 2 · Ponte Node-RED** → **Conectar ponte G2**.

Os cartões mostram Estoque, Processo, Montagem e Expedição simultaneamente. Os valores são gerados artificialmente pelo nosso simulador; **não são da máquina real**.

Confira os testes:

```powershell
npm.cmd run verificar
npm.cmd run testar
npm.cmd run testar-ponte
npm.cmd run build
npm.cmd run integracao
```

## Configuração quando houver ambiente autorizado

### Se a ponte, IHM e Node-RED estiverem no mesmo computador

Mantenha:

- API local: `http://127.0.0.1:8092/api/g2/telemetria`
- WebSocket para a IHM: `ws://localhost:8092/telemetria`
- IHM: `http://localhost:8081`

A ponte recebe token do processo Node-RED via `G2_BRIDGE_TOKEN` e não passa o token para o navegador.

### Se estiverem em computadores diferentes

**Não troque o servidor Node.js para `0.0.0.0` nem exponha a porta 8092 diretamente.** A ponte continua restrita a `127.0.0.1` na máquina servidora.

Com autorização do professor, um gateway/proxy com autenticação e HTTPS/WSS poderá publicar apenas as rotas necessárias. Por exemplo:

- IHM: `https://ihm.exemplo.edu.br`
- WebSocket da ponte, por proxy aprovado: `wss://gateway.exemplo.edu.br/telemetria`
- Node-RED → gateway: `https://gateway.exemplo.edu.br/api/g2/telemetria`

*Esses domínios são exemplos e não representam infraestrutura existente da faculdade.*

O operador configura no computador **da ponte**:

```powershell
$env:G2_IHM_ORIGINS = "https://ihm.exemplo.edu.br"
$env:G2_BRIDGE_TOKEN = "UM_TOKEN_LONGO_GERADO_FORA_DO_REPOSITORIO"
npm.cmd run ponte-g2
```

No ambiente Node-RED, configure as variáveis `G2_BRIDGE_TOKEN` e `G2_BRIDGE_HTTP_URL` com os valores aprovados. O arquivo `EXEMPLO-FUNCTION-NODERED-G2.js` usa essas variáveis; não coloca credenciais na mensagem para o browser.

Na IHM, informe o endereço WSS no campo **Endereço da ponte** ou configure `VITE_G2_WS_URL` no build frontend. Uma página HTTPS não aceita conexão WebSocket sem criptografia.

Este projeto **não instala nem configura automaticamente esse gateway externo**. Isso depende das regras de rede da instituição.

## Atenção: Node-RED pode entregar somente mudanças

No `flows.json` do professor, o nó `s7 in` usa `diff: true`. Um pacote pode conter só alguns sinais, e valores que não mudaram podem não voltar a aparecer.

**A ponte agora consolida essas mudanças temporariamente**, mas não pode garantir que um valor antigo continua correto só porque a conexão WebSocket está aberta. Por segurança, após **3 segundos sem nova confirmação daquele sinal**, a IHM mostra **Não informado**.

Para uma visualização industrial realmente contínua, o professor precisará validar uma fonte que forneça **amostras periódicas reais** dos sinais de interesse (ou um heartbeat de aquisição confiável). Não basta reenviar valores guardados com timestamp novo: isso esconderia uma falha do PLC.

A demonstração `demo-ponte-g2` envia **amostras completas a cada 500 ms**, por isso funciona continuamente sem deixar valores vencerem.

## O que falta

- Definir as URLs e a topologia autorizadas pelo professor;
- obter valores verdadeiros via Node-RED, sem alterar saídas S7 ou circuitos de segurança;
- verificar sinais físicos e o comportamento real de `diff: true`;
- garantir atualização periódica confiável ou aceitar indicadores de leitura indisponível;
- integrar depois com o Grupo 1.

**START, STOP e RESET na IHM ainda não comandam a máquina real.** A função de segurança física não pode ser substituída pelo navegador.
