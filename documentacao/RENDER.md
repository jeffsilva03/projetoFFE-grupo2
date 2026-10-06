# Hospedar no Render

Este projeto usa React, TypeScript e Vite. Publique a interface como **Static Site**.

1. Acesse https://dashboard.render.com/ e entre na sua conta.
2. Clique em **New > Static Site**.
3. Conecte o GitHub e autorize acesso ao repositório `jeffsilva03/projetoFFE-grupo2`.
4. Selecione esse repositório e configure:

| Campo | Valor |
| --- | --- |
| Name | `projetoFFE-grupo2` ou outro nome disponível |
| Branch | `main` |
| Root Directory | deixe vazio |
| Build Command | `npm ci && npm run build` |
| Publish Directory | `dist` |

5. Em **Environment**, defina `NODE_VERSION` como `22.22.3`, uma versão compatível com o projeto.
6. Clique em **Create Static Site** e aguarde o build e a publicação.
7. Abra o endereço `https://<nome-do-site>.onrender.com` mostrado no painel. A simulação local já funciona nesse endereço.
8. Os próximos pushes na branch `main` publicam atualizações automaticamente quando o deploy automático está habilitado.

## Conectar ao simulador do professor

A hospedagem acima publica apenas a interface. O endereço padrão `ws://localhost:8080` aponta para o computador de quem abre o site e não funciona na página HTTPS.

Publique também o simulador deste repositório como **Web Service**:

1. No Render, clique em **New > Web Service** e selecione o mesmo repositório.
2. Use as configurações:

| Campo | Valor |
| --- | --- |
| Name | `smart40-simulador-grupo2` ou outro nome disponível |
| Branch | `main` |
| Language / Runtime | `Node` |
| Root Directory | deixe vazio |
| Build Command | `npm ci` |
| Start Command | `npm start` |
| Instance Type | `Free`, se disponível na sua conta |
| Health Check Path | `/` |

3. Em **Environment**, adicione `NODE_VERSION=22.22.3` e `ORIGENS_PERMITIDAS=https://<dominio-real-da-interface>.onrender.com`. Copie a URL exata do Static Site, sem barra final. Para mais de uma origem, separe por vírgula. O servidor já usa a variável `PORT` fornecida pelo Render.
4. Clique em **Create Web Service** e espere aparecer **Live**.
5. Abra `https://<dominio-real-do-simulador>.onrender.com` e confira a mensagem de servidor ativo.
6. No **Static Site**, abra **Environment** e adicione `VITE_URL_SIMULADOR=wss://<dominio-real-do-simulador>.onrender.com` e `VITE_TOKEN_SIMULADOR=aluno-token-grupo2`.
7. Faça um novo deploy da interface usando **Manual Deploy > Deploy latest commit**, para incorporar essas variáveis.
8. Abra a interface e clique em **Conectar simulador**. Confira **Simulador conectado** e teste Parar, Iniciar, Emergência e Rearmar.

Use os domínios reais exibidos pelo Render nos lugares indicados; os nomes acima são sugestões. Não coloque `:8080` nem `:10000` no endereço público. O Render fornece HTTPS/WSS para a conexão pública.

No plano Free, o servidor pode dormir após 15 minutos sem tráfego de entrada e demorar cerca de um minuto para acordar. Antes de uma apresentação, abra a URL HTTPS do simulador, espere a mensagem de servidor ativo e depois conecte pela interface. Se a conexão inicial falhar, tente novamente após o servidor acordar. O estado da máquina é mantido na memória e reinicia quando o serviço reinicia. Todos os clientes conectados compartilham a mesma máquina de demonstração.

Na interface, abra **Configurar conexão**, informe o endereço `wss://` e o token do grupo e clique em **Conectar simulador**. Você também pode definir `VITE_URL_SIMULADOR` e `VITE_TOKEN_SIMULADOR` no Render e fazer um novo deploy para ajustar os padrões. Variáveis `VITE_` são incorporadas ao JavaScript público; use apenas credenciais de demonstração nesse mecanismo.

Documentação oficial: https://render.com/docs/static-sites

WebSocket e plano gratuito: https://render.com/docs/websocket e https://render.com/docs/free
