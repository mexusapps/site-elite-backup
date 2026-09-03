# BRASA

Jogo de ação em arena, completo e jogável, feito do zero: **sem motor, sem
biblioteca, sem um único arquivo de imagem ou de som**. Tudo o que aparece é
desenhado por código no canvas; tudo o que se ouve é sintetizado ao vivo pelo
WebAudio. O jogo inteiro é um arquivo HTML autossuficiente.

Junto com o jogo vem o **sistema que o verifica**: um harness que dirige a
partida dentro de um navegador headless, injeta comandos pelo mesmo caminho do
input humano e afirma invariantes sobre o estado — inclusive vencer o jogo
inteiro sem trapaça, como teste de regressão.

---

## O jogo

Você é a última brasa acesa. **A chama é a sua vida e a sua visão ao mesmo
tempo — e ela apaga sozinha, sempre.** Inimigos mortos soltam fagulhas, e
fagulhas devolvem chama. Recuar é morrer devagar: o jogo empurra você para
frente de propósito.

- **15 ondas**, cinco tipos de inimigo e **dois chefes** (ondas 8 e 15), cada um
  com três fases e repertórios diferentes de ataque.
- **25 Sopros** (melhorias) em três raridades, escolhidos 1 entre 3 ao fim de
  cada onda.
- Golpe corpo a corpo de graça; **disparo custa chama** — atirar é uma troca,
  não um recurso grátis. Avanço com invulnerabilidade.
- Teclado, mouse, gamepad e **controles de toque** com mira assistida.

### Comandos

| Ação | Teclado | Alternativa |
|---|---|---|
| Mover | `WASD` | setas · analógico esquerdo · manche na tela |
| Mirar | mouse | analógico direito · direção do movimento · automática no toque |
| Golpe | `J` | clique esquerdo · A/X |
| Disparo | `K` | clique direito · Y/RT |
| Avanço | `Espaço` | `Shift` · B/RB |
| Pausa | `Esc` | `P` · Start |

Todos remapeáveis nas opções, com dois campos por ação.

---

## Acessibilidade

Não é enfeite: são os quatro itens que concentram as reclamações reais de
jogadores, mais o que o gênero exige.

- **Remapeamento completo** de todas as ações, teclado e mouse.
- **Escala de texto** até 200%.
- **Três paletas**: padrão, segura para deuteranopia/protanopia e alto
  contraste. Cor nunca é a única informação — forma e tamanho também separam os
  inimigos.
- **Tremor de tela, clarões e escuridão** com controle contínuo de 0 a 100%.
  Escuridão em 0 mantém a arena sempre visível; a chama continua sendo a vida.
- **Modo assistido**: decaimento mais lento, menos dano recebido, fagulhas
  valendo mais e chefes com menos vida. Sem restrição nenhuma no resto do jogo.
- Menus em DOM, com foco de teclado e navegação por setas.
- Respeita `prefers-reduced-motion`.

---

## Como as três camadas de game feel foram aplicadas

A ordem importa: polimento sobre controle ruim não salva nada.

**1. Controle em tempo real**
- Passo fixo de simulação a 60 Hz, independente da taxa de quadros do monitor.
- **Buffer de comando de 130 ms**: o botão apertado logo antes da janela válida
  ainda executa.
- Invulnerabilidade de 260 ms no avanço — atravessar o ataque é mais seguro que
  fugir dele.
- Recuo do disparo, atrito e aceleração separados, diagonal não é mais rápida.

**2. Espaço simulado**
- Colisão círculo × retângulo com deslizamento pela parede, nunca grude.
- Separação de corpos entre inimigos (sem "bola de carne").
- Desvio de obstáculo por sondagem à frente, mais rede de segurança que
  reposiciona qualquer inimigo preso: **nenhuma onda pode ficar impossível de
  terminar**.
- Câmera com zona morta, antecipação na direção da mira, suavização diferente
  por eixo e zoom sutil com a velocidade.

**3. Polimento**
- **Hit-stop de 40 a 110 ms** escalando com o golpe, com abafamento da música
  durante o congelamento.
- Tremor direcional com decaimento (60% na direção do impacto, 40% aleatório).
- Esmagamento e estiramento em tudo que bate, apanha, nasce ou morre.
- Partículas com propósito, números de dano com *pop*, clarão contido no
  personagem em vez de na arena inteira.
- Áudio: três camadas por evento (transiente + corpo + cauda), variação de
  afinação de ±5% a cada disparo, limite de vozes por efeito, e trilha
  adaptativa cujas camadas entram conforme a intensidade da onda.

---

## O sistema de verificação

`npm test` sobe o Chromium, carrega o jogo e roda a escada de custo — passes
baratos primeiro, trabalho caro só depois do portão:

| # | Etapa | O que prova |
|---|---|---|
| 1 | saúde em runtime | abre, roda 600 quadros, nenhuma exceção |
| 2 | invariantes | chama na faixa, nada de NaN, ninguém fora da arena, pools não estouram — 2400 quadros de input caótico com semente fixa |
| 3 | determinismo | mesma semente + mesma sequência de comandos = partida idêntica, quadro a quadro |
| 4 | cobertura | cada mecânica é exercitada e observada: golpe, disparo, avanço, buffer, fagulhas, Sopros, armadura do Carvão, as três fases de chefe, teclado real e toque real |
| 5 | progressão | duas políticas de bot (monótona × exploratória) e **uma vitória legítima do começo ao fim, sem trapaça** |
| 6 | desempenho | orçamento de quadro sob a onda mais cheia do jogo |
| 7 | capturas | uma imagem por tela, para inspeção visual |

O ponto que faz diferença: o bot joga pelo **mesmo caminho de código do input
humano** (`Input.inject`), e a simulação avança por passos fixos explícitos em
vez de depender do relógio do navegador. Sem isso não existe teste de jogo — só
teste de código que por acaso está num jogo.

```bash
npm install
npm run build        # gera dist/brasa.html e dist/brasa.artifact.html
npm test             # escada completa (~19 s)
node tools/balance.mjs         # telemetria de dificuldade, 8 sementes
node tools/balance.mjs assist  # mesma coisa no modo assistido
```

### Telemetria de balanceamento

O bot exploratório, que escolhe Sopros às cegas (sempre a primeira carta):

| Modo | Onda mediana | Vitórias |
|---|---|---|
| padrão | 15 / 15 | 3 de 8 sementes |
| assistido | 15 / 15 | 8 de 8 sementes |

Uma partida vencedora dura de 3 a 5 minutos. A dificuldade foi ajustada por
esses números, não por palpite: a primeira medição mostrou **todas as sementes
morrendo no mesmo chefe**, o que revelou um defeito de design real — durante a
luta de chefe não existiam inimigos comuns para matar, então não havia como
recuperar chama. A correção foi ferir o chefe soltar fagulhas, mantendo a regra
do jogo (bater é como se acende) em vez de simplesmente baixar a vida dele.

---

## Estrutura

```
src/core/     math · rng com semente · input (teclado, mouse, gamepad, toque)
              audio procedural · fx (câmera, hit-stop, partículas) · save
src/game/     balance (todos os números) · entities · bosses · upgrades · world
src/render/   draw (canvas, brilho em cache, escuridão dinâmica)
src/ui/       hud (canvas) · screens (DOM, acessível)
src/main.js   laço de passo fixo, telas, persistência, API de depuração
test/         harness (o agente que joga) · run (a escada)
tools/        balance · dbg · shot
build.mjs     esbuild → um único HTML autossuficiente
```

Nenhum número de jogo está espalhado pelo código: tudo mora em
`src/game/balance.js`. Um jogo só fica gostoso depois de umas duzentas
iterações de ajuste, e isso só é viável se mexer nos números for barato.
