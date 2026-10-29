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
