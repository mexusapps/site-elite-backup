# POMAR

Jogo de física e combinação de frutas, **completo, sem nenhuma morte, sem fim de
jogo e sem nada que uma criança não possa jogar**. Feito do zero: motor de
física próprio, nenhuma biblioteca, nenhuma imagem e nenhum arquivo de som. O
jogo inteiro é um HTML de 76 KB.

Junto vem o **sistema que o verifica**: uma escada de testes que começa provando
a física em Node puro, em milissegundos, e só depois abre o navegador.

---

## O jogo

Solte uma fruta na cesta. Duas frutas **iguais** que se encostam viram **uma
maior** — e tocam a próxima nota de uma escala. Encadeie várias e a jogada vira
uma melodiazinha que sobe.

**Semente → amora → uva → cereja → limão → laranja → maçã → pêssego → abacaxi →
melão → melancia.** Duas melancias viram **bolo de festa**.

### Ninguém perde

Esta é a regra que atravessa o projeto inteiro: **nada aqui pune**. Não existe
fim de jogo, não existe perder pontos, não existe errar. Quando a cesta
transborda, um **tucano** chega, come as frutinhas pequenas e devolve espaço —
com assobio e agradecimento. Você perde o que *poderia* ter feito com elas,
nunca o que já conquistou. A tensão vem de querer mais, não de medo.

E o tucano come as **pequenas** de propósito: o que entope a cesta são as miúdas
que não acharam par. Levar a fruta grande que você acabou de montar seria
punição disfarçada de ajuda.

### O que tem dentro

- **11 frutas**, cada uma com rosto, textura e som próprios; piscam, sorriem e
  fazem careta no tranco.
- **Pedidos**: um bichinho pede uma fruta. Fez? Confete e pontos extras.
- **Regador**: faz uma fruta da cesta crescer um degrau. Ganha-se um a cada dois
  pedidos atendidos.
- **Chacoalhar**: sacode a cesta para as frutas se acomodarem. Recarrega sozinho.
- **Álbum**: cada fruta feita uma vez fica guardada para sempre.
- **Dois modos**: Pomar e Tranquilo (cesta maior, tucano mais generoso).
- **Sequências**: fusões em cadeia multiplicam os pontos até ×8.

### Comandos

| Ação | Mouse | Toque | Teclado |
|---|---|---|---|
| Mirar | mover o cursor | arrastar o dedo | `←` `→` ou `A` `D` |
| Soltar | clicar | soltar o dedo | `espaço`, `enter` ou `↓` |
| Chacoalhar | botão na tela | botão na tela | `C` ou `↑` |
| Regador | botão na tela | botão na tela | `R` |
| Pausa | — | — | `Esc` ou `P` |

---

## Acessibilidade

- **Três paletas**: Pomar, Suave e Alto contraste.
- **Número do degrau** opcional dentro de cada fruta — frutas iguais têm sempre
  o mesmo número, então dá para jogar sem depender de cor nenhuma.
- **Escala de texto** até 200%.
- **Tremidinha e brilhos** com controle contínuo de 0 a 100%. Em zero, nenhuma
  partícula é desenhada e o jogo continua inteiro.
- Menus em DOM, navegáveis por teclado, com foco visível.
- Respeita `prefers-reduced-motion`.
- Sem tempo, sem contagem regressiva, sem pressa.
- A tela "Como joga" mostra a **corrente de frutas desenhada**: quem ainda não
  lê entende o jogo só de olhar.

---

## O motor de física

Escrito do zero para este jogo. Corpos circulares numa caixa aberta em cima,
com três coisas garantindo que a pilha se comporte:

1. **Correção de posição com folga** — resolve a penetração sem criar energia,
   que é o que faz pilhas "ferverem";
2. **Impulsos de velocidade com restituição baixa** e atrito de Coulomb;
3. **Adormecimento** — corpo parado congela e só acorda quando algo o encosta.

Solver de Gauss-Seidel, 14 iterações, 2 subpassos por quadro, varredura por
faixa ordenada em x para a fase larga. **90 corpos custam 0,12 ms por quadro.**

Nenhuma chamada a `Math.random` dentro da simulação: mesma sequência de quedas
produz exatamente a mesma pilha, sempre. É isso que torna o jogo testável.

### Dois defeitos que só o teste encontrou

**Frutas encostadas nunca se combinavam.** A fase larga usava um teste de caixa
sem margem, então dois corpos parados exatamente encostados (distância igual à
soma dos raios) ficavam de fora da lista de contatos. Duas frutas idênticas
podiam ficar se olhando para sempre. Uma margem de 3 px resolveu.

**A pilha nunca dormia.** Corpos empilhados terminavam o quadro com velocidade
guardada mesmo sem ter saído do lugar: as restrições devolviam a posição, mas
ninguém avisava a velocidade. O resultado era uma torre tremendo eternamente. A
correção é limitar a velocidade ao deslocamento realmente permitido, mas só
para quem está praticamente parado — quem está rolando de verdade continua
rolando, e as frutas seguem se acomodando nos vãos.

---

## O sistema de verificação

```bash
npm install
npm run build     # gera dist/pomar.html e dist/pomar.artifact.html
npm test          # escada completa (~25 s)
node test/physics.test.mjs   # só a física, em milissegundos
node test/logica.test.mjs    # só as regras, em milissegundos
```

| Etapa | Onde | O que prova |
|---|---|---|
| 0 · física | Node puro | assenta, não penetra, não escapa, não explode, é determinística, cabe no orçamento de quadro |
| 1 · regras | Node puro | fusões, pontuação, tucano, pedidos, regador, chacoalho, ausência de fim de jogo, determinismo |
| 2 · saúde | navegador | a página monta e roda 600 quadros sem exceção |
| 3 · input humano | navegador | teclado, mouse, arrastar o dedo e os botões da tela movem e soltam de verdade |
| 4 · o jogo jogado | navegador | dois bots (esperto e aleatório) jogam milhares de quadros; o tucano socorre; nunca há fim de jogo |
| 5 · telas | navegador | álbum desenha as 11 frutas, opções têm todos os controles, foco de teclado funciona, paleta e escala aplicam, brilhos em zero não desenha nada |
| 6 · desempenho | navegador | simulação e quadro real medidos com a cesta cheia |
| 7 · capturas | navegador | uma imagem por tela |

**72 verificações.** As duas primeiras etapas rodam sem navegador e pegam a
maior parte dos defeitos por uma fração do custo — passes baratos primeiro,
trabalho caro só depois do portão.

O bot joga pelo **mesmo caminho de código do jogador humano** (`Input.mirar`,
`Input.soltar`) e a simulação avança por passos fixos explícitos, em vez de
depender do relógio do navegador.

---

## Estrutura

```
src/core/     math · rng com semente · input · audio procedural · fx · save
src/game/     physics (o motor) · fruits (todos os números) · game (as regras)
src/render/   draw — sprites gerados, rostos ao vivo, cesta, tucano, cenário
src/ui/       hud (canvas) · screens (DOM, acessível)
src/main.js   laço de passo fixo, telas, persistência, API de depuração
test/         physics · logica (Node puro) · harness · run (a escada)
build.mjs     esbuild → um único HTML autossuficiente
```

Todos os números de jogo vivem em `src/game/fruits.js`: raios, pontuação,
composição do sorteio, regras do tucano e dos dois modos.
