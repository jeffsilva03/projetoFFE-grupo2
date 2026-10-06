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

Para conectar remotamente, use um servidor WebSocket disponível em `wss://` e peça que o responsável permita a origem exata do site Render. O simulador original em `documentacao/simulador-professor.cjs` permite apenas as origens definidas no próprio arquivo; um novo domínio Render precisa ser autorizado antes de conectar.

Na interface, abra **Configurar conexão**, informe o endereço `wss://` e o token do grupo e clique em **Conectar simulador**. Você também pode definir `VITE_URL_SIMULADOR` e `VITE_TOKEN_SIMULADOR` no Render e fazer um novo deploy para ajustar os padrões. Variáveis `VITE_` são incorporadas ao JavaScript público; use apenas credenciais de demonstração nesse mecanismo.

Documentação oficial: https://render.com/docs/static-sites
