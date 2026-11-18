# Coletor Node-RED → ponte G2 (somente leitura)

## O que é

O último elo que faltava entre a bancada e a IHM:

```text
Node-RED da bancada (192.168.150.200:1880)
  aba "G2 - Telemetria" — GET /api/g2/processo/telemetria
        │  HTTP GET (só leitura)
        ▼
Coletor no notebook do aluno  (npm.cmd run coletor-n2)
        │  POST autenticado, mesmo computador
        ▼
Ponte G2  127.0.0.1:8092  ──WebSocket──►  IHM React (réplica → "Ponte G2 · leitura")
```

O coletor sobe a ponte junto, com token efêmero. Não é preciso rodar `ponte-g2` separado nem configurar `G2_BRIDGE_TOKEN`.

**Não muda nada no Node-RED.** Usa a rota que já está nos exports (`flows (1).json`). Nenhum Deploy, nenhum `s7 out`, nenhum comando.

## Testar em casa (sem a máquina)

Terminal A:

```powershell
npm.cmd run coletor-n2 -- --simulado
```

Terminal B:

```powershell
npm.cmd run dev
```

Abra `http://localhost:8081` → **IHM real (réplica)** → **Ponte G2 · leitura** → **Conectar ponte G2**.

O Node-RED fictício tem um ciclo de 14 s e imita `mode=all` com `diff=true`. Você vai ver o painel "Processo N2" alternar entre **14/14 informados** (estação mudando de estado) e **0/14** (estação parada há mais de 3 s). Isso é o comportamento esperado, não defeito.

Para imitar a Function antiga (503 fixo): `npm.cmd run coletor-n2 -- --simulado --antiga`.

## Usar na bancada

1. Conectar o notebook no Wi-Fi da bancada e conferir a rede:

   ```powershell
   ipconfig
   Test-NetConnection 192.168.150.200 -Port 1880
   ```

2. Iniciar o coletor gravando evidências:

   ```powershell
   npm.cmd run coletor-n2 -- --registro=evidencias-nodered.jsonl
   ```

   Sem `--url`, ele consulta `http://192.168.150.200:1880/api/g2/processo/telemetria` a cada 1 s.

3. Em outro terminal, `npm.cmd run dev`, e conectar a réplica na ponte como acima.

4. Ler a primeira mensagem `[COLETOR]` do terminal:

| Mensagem | O que significa | O que fazer |
|---|---|---|
| `503 "aguardando_integracao"` | Está no ar a Function **antiga** (503 fixo, `flows.json`) | Pedir ao professor para conferir/autorizar o Deploy da versão nova |
| `503 "sem_dados_recentes"` | Function **nova** no ar, mas nenhum sinal observado nos últimos 3 s | Normal com a estação parada (`diff:true`). Observar com a estação em ciclo |
| `200 "leitura_parcial"` | Primeiro dado real chegando | Guardar o arquivo de evidências e um print da réplica |
| `Sem resposta do Node-RED` | Rede, porta 1880 ou rota inexistente (404) | Refazer o `Test-NetConnection`; conferir se a aba G2 existe |
| `Relógio do Node-RED adiantado/atrasado` | Os relógios dos dois notebooks diferem | Nada: o coletor converte pelo tempo de cada sinal |

O arquivo `evidencias-nodered.jsonl` guarda cada resposta do Node-RED com o horário local. É a evidência pedida no roteiro ("status, JSON e horário"). Não contém tokens.

## Garantias

- Só `GET` no Node-RED, sem redirecionamento, timeout de 2 s, no mínimo 500 ms entre consultas.
- Cada sinal vai para a ponte **uma única vez**, com o horário em que o Node-RED o observou. Se o Node-RED não observar de novo, a ponte deixa o sinal vencer em 3 s e a IHM mostra "Não informado". Não existe "renovar" leitura antiga.
- A idade de cada sinal é medida no relógio do próprio Node-RED (`timestampConsulta − observadosEm`) e reaplicada no relógio local. Diferença de horário entre os notebooks não faz dado velho parecer novo.
- HTTP 503 nunca vira `false`: nada é enviado.

## Pergunta para levar ao professor

Com `diff:true`, a rota só tem dado nos 3 s seguintes a uma mudança de estado. Com a estação parada, ela responde 503 mesmo com tudo funcionando. Para mostrar estado contínuo, há duas saídas, e as duas dependem de autorização:

1. uma leitura S7 periódica real (`diff:false`) só para a aba G2, se não sobrecarregar o CLP;
2. aceitar que "parada sem mudança" apareça como "Não informado".

Não vamos reenviar o cache com horário novo: isso faria dado antigo parecer leitura atual.
