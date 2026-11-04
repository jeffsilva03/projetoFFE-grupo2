# Réplica da IHM física — Sprint 2 (28/10/2026)

## Escopo
A seção **Sprint 2 · IHM real (réplica)** reproduz a aparência e a navegação observadas em cinco fotografias da estação de processo Smart 4.0, com painel Siemens SIMATIC HMI e botoeira externa.

Telas disponíveis:
1. Menu inicial com Diagnóstico, Configurações e Manual.
2. Diagnóstico: oito entradas, seis saídas e estados luminosos da fotografia.
3. Configurações: posições de seis lâminas, mesa, caneta, três depósitos e coordenadas dos eixos X/Y.
4. Manual: saídas digitais e controles visuais Home, Reset, Servo e JOG para X/Y.
5. Botoeira visual: Setup, Start, Stop, Reset, sinaleiros e emergência.

## Segurança e fidelidade
- A réplica **não controla CLP**, não altera Node-RED, não executa JOG, nem possui escrita em saídas digitais.
- Botões funcionais de navegação alteram apenas a tela da réplica. Botões de operação aparecem desabilitados intencionalmente.
- Números e LEDs foram transcritos das fotos; são **valores demonstrativos capturados naquele instante**, não valores atuais da planta.
- A data/hora do topo usa o relógio do navegador; a IHM fotografada exibia a data 04/08/2012, que não foi copiada por ser potencialmente desconfigurada.
- A aparência foi reproduzida com CSS/SVG e não utiliza recortes das fotografias.
- A integração com a estação real dependerá do mapa oficial de tags/endereços, autorização e validação dos comandos pelo professor. Não inferir endereços a partir dos rótulos.
- O simulador da Sprint 1 e os módulos de leitura/ponte da Sprint 2 permanecem separados e inalterados.

## Conferência local
Na branch Sprint2: executar \`npm ci\`, \`npm run verificar\`, \`npm run testar\`, \`npm run testar-ponte\` e \`npm run build\`, seguido de \`npm run dev\` para navegar na réplica.

## Interatividade da botoeira virtual
- START: coloca **somente o estado demonstrativo da interface** em execução.
- STOP: interrompe o ciclo demonstrativo.
- RESET: retorna o estado demonstrativo para parada e libera novo START.
- Um indicador de estado acima da réplica exibe o resultado de cada clique.
- Sinaleiros de segurança e leituras da IHM são representações fotográficas e **não são validados por essa simulação**.
- Comandos do CLP, Node-RED, servo, JOG, setup e parada de emergência da máquina real continuam indisponíveis; a demonstração não substitui o circuito de segurança.


## Evolução de 04/11/2026

Há três fontes selecionáveis na interface: Fotografia (captura estática), Simulação local (controles demonstrativos) e Ponte G2 (WebSocket somente leitura). O simulador tem SETUP Manual/Automático, START/STOP/RESET, emergência virtual travável e liberável, Servo/Home/JOG por clique e saídas digitais virtuais, com bloqueios locais. A lógica simulada NÃO substitui os intertravamentos reais da máquina.

Na ponte, a IHM mostra os sinais do DB101 que foram efetivamente publicados; ausência/vencimento é desconhecido, não "desligado". Posições reais X/Y, Salvar/Calcular e comandos de movimento permanecem indisponíveis sem dados e permissões homologados. Contrato do App Shell do Grupo 1 continua provisório.

## Laboratório START/STOP — evolução de 04/11/2026

A réplica conta com um quarto modo, Teste START/STOP, que envia somente para o mock
WebSocket local ws://127.0.0.1:8093/demo-comandos, independente da ponte Node-RED.

1. Executar npm.cmd run mock-comandos-g2 em um terminal.
2. Executar npm.cmd run dev em outro terminal.
3. Abrir http://localhost:8081 > Sprint 2 > IHM real > Teste START/STOP.
4. Conectar mock START/STOP. Pressionar os botões verde/vermelho da botoeira.
5. Conferir SOLICITACAO, ACK e CONFIRMACAO no histórico.
6. Simular falha de segurança para validar a recusa de START (cenário fictício).

ACK indica recebimento da solicitação pelo mock, não execução. A confirmação exige
telemetria de estado correlacionada ao ID enviado. Ausência de retorno em 4,5 s
invalida a sessão. Só START e STOP são enviados ao mock; RESET, JOG e emergência
não são transmitidos nesse modo. O servidor escuta apenas loopback 127.0.0.1,
sem qualquer conexão S7, OPC UA, PLC, Node-RED ou atuação industrial.

Teste real na bancada depende de autorização do professor, gateway de comandos
seguro e ensaio supervisionado. O laboratório não certifica lógica de segurança.
