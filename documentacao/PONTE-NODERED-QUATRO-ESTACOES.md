# Ponte Node-RED -> Grupo 2 — quatro estações

## Em uma frase

O Node-RED envia **somente dados de leitura** para um servidor intermediário, e esse servidor entrega os dados à IHM web do Grupo 2.

```text
Leitura S7 já existente no Node-RED
      -> nó Function adicional (só seleciona tags G2)
      -> nó HTTP Request (POST, somente dados)
      -> Ponte G2 (Node.js, porta local 8092)
      -> WebSocket /telemetria
      -> IHM G2: Estoque | Processo | Montagem | Expedição
```

**Este código não acessa o PLC diretamente**, não tem endereço/credencial industrial, não escreve em DB Siemens e não possui rota de comando. **A integração com a máquina real não foi testada nem autorizada**. Não altere o `NODERED/flows.json` original do professor.

## Teste agora (sem Node-RED nem máquina)

Na branch `feat/sprint2-ponte-nodered-4-estacoes`:

1. Abra o terminal no repositório e rode `npm.cmd ci` (se ainda não instalou).
2. No **terminal 1**, rode `npm.cmd run demo-ponte-g2`.
3. No **terminal 2**, rode `npm.cmd run dev`.
4. Acesse `http://localhost:8081` e abra **Sprint 2 · Ponte Node-RED**.
5. Clique em **Conectar ponte G2**.

Verá **quatro cartões atualizando simultaneamente**, cada um com seus próprios sinais. A demonstração muda o estado dos botões e condições periodicamente para permitir a verificação visual. Todas essas mudanças são **fictícias**.

Para testar interrupção de dados, pare o terminal 1: todos os cartões deverão deixar de mostrar leituras como atuais.

Para executar os testes automatizados:

```powershell
npm.cmd run verificar
npm.cmd run testar
npm.cmd run testar-ponte
npm.cmd run build
npm.cmd run integracao
```

A demonstração gera um token temporário automaticamente. Ele não é impresso na tela e não precisa ser configurado manualmente para testar.

## Preparação para usar com Node-RED em ambiente autorizado

**Não execute esta integração na rede industrial sem a autorização do professor/responsável OT.** As instruções abaixo descrevem a configuração para a mesma máquina hospedar Node-RED e a ponte. Isso é um projeto de integração **read-only**, ainda não homologado.

### Passo 1 — iniciar a ponte

Gere um token aleatório de pelo menos 16 caracteres. No PowerShell:

```powershell
$env:G2_BRIDGE_TOKEN = [guid]::NewGuid().ToString('N')
$env:G2_BRIDGE_TOKEN
npm.cmd run ponte-g2
```

Anote o token com cuidado e configure **o mesmo valor** como variável de ambiente `G2_BRIDGE_TOKEN` do processo Node-RED (não coloque no GitHub, não comite no fluxo e não guarde no navegador).

A ponte escuta **somente `127.0.0.1:8092`**, para não expor dados industriais na rede. Uma instância Node-RED em outro computador **não consegue usar o `127.0.0.1` dessa máquina**; será preciso um caminho de rede seguro aprovado pela instituição, como um gateway autorizado. Não troque simplesmente para `0.0.0.0`.

### Passo 2 — acrescentar apenas uma derivação de leitura no Node-RED

Com a autorização e com o fluxo original preservado:

1. Identifique o nó **`s7 in`** já fornecido pelo professor (`mode: all`, `diff: true`).
2. Acrescente uma nova ligação **em paralelo**, sem remover as ligações originais, para um nó **Function**.
3. Cole nesse Function o conteúdo de [EXEMPLO-FUNCTION-NODERED-G2.js](EXEMPLO-FUNCTION-NODERED-G2.js).
4. Conecte a saída do Function a um nó **HTTP Request**, configurado para usar `msg.method`, `msg.url` e `msg.headers`. O nó enviará `msg.payload` como JSON.
5. **Não conecte essa saída a nenhum `s7 out`** e não modifique a lógica de operação existente.
6. Antes de implantar, valide com o professor o comportamento e a carga da leitura no ambiente industrial.

O exemplo encaminha exclusivamente **22 sinais booleanos relevantes à IHM/botoeira G2**, não todos os 153 sinais do arquivo.

O `flows.json` mostra configurações de `s7 in`, mas **não contém** uma rota HTTP para a IHM; o caminho `/api/g2/telemetria` foi **criado por nós** nessa branch.

### Passo 3 — validar os valores na bancada (somente leitura)

Com um operador/responsável autorizado:

- alterar um botão físico em uma estação e conferir somente sua leitura na IHM;
- verificar os quatro cartões, sem assumir que um indicador seja equivalente a comando remoto;
- interromper o envio de teste e confirmar que leituras antigas aparecem como indisponíveis;
- conferir se os nomes da tabela S7 realmente chegam ao `msg.payload` no formato esperado;
- se o `s7 in` publicar **apenas mudanças** (`diff: true`), um pacote pode conter apenas parte das tags; a interface mostrará as demais como “Não informado” e não vai fabricar estados. Para visão contínua e completa, será preciso definir com o professor um modo de obter **instantâneos completos e atualizados** de cada estação.

## Contrato de comunicação criado por nós

O Node-RED faz POST em `http://127.0.0.1:8092/api/g2/telemetria` com header `x-g2-bridge-token` e JSON:

```json
{
  "timestamp": "2026-10-21T12:00:00.000Z",
  "sinais": {
    "emergencia": false,
    "comutadorAutomatico": true,
    "processo_segurancaOK": true,
    "processo_botaoVerde": false,
    "montagem_segurancaOK": true,
    "expedicao_segurancaOK": true
  }
}
```

**Atenção:** o horário é apenas um exemplo; o Function preenche o timestamp atual automaticamente.

A ponte valida token, data, tipos de valores e nomes de tags. Ela divide o pacote em mensagens WebSocket individuais por estação, preservando o formato de leitura desenvolvido na etapa anterior:

```json
{
  "timestamp": "2026-10-21T12:00:00.000Z",
  "estacao": "PROCESSO",
  "sinais": {
    "processo_segurancaOK": true,
    "processo_botaoVerde": false
  }
}
```

Campos ausentes não são convertidos para `false`. Cada cartão fica sem dados atuais após **3 segundos** sem uma atualização da sua estação.

### Segurança da ponte

- endpoint HTTP somente de **recebimento** de telemetria, com token servidor-servidor;
- processo escuta somente o endereço de loopback;
- WebSocket **somente de saída** (não recebe comandos);
- somente origens locais da interface `http://localhost:8081` e `http://127.0.0.1:8081`;
- rejeita pacotes grandes, atrasados, de tipos errados ou sem tags reconhecidas;
- sem endpoints S7, sem escrita de tags, sem controle remoto de E-STOP.

O uso do HTTP local e de token de exemplo **não autoriza um deploy remoto**. Para rede ou Internet, é necessário um gateway aprovado com HTTPS/WSS, autenticação e segregação de rede.

## Situação atual

**Implementado:** ponte Node.js, encaminhamento HTTP -> WebSocket, quatro estações na UI, demonstração sem máquina e testes de leitura/segurança. **Execução dos testes da nova branch ainda não confirmada pelo CI.**

**Pendente:** instalar em ambiente autorizado, ligar o Function ao Node-RED existente, confirmar em bancada valores reais e garantir instantâneos de leitura completos. Depois vem a integração com Grupo 1.

A `main` segue exclusivamente Sprint 1. Esta branch depende das branches de documentação e leitura criadas anteriormente e não faz merge automático.
