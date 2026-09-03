# PRISMA

Quebra-cabeça de luz e cor. A noite chegou, as flores fecharam, e cada uma sonha
com uma cor. Guie a luz até elas com espelhos, divisores, prismas e vidros
coloridos — e o jardim amanhece.

Feito do zero: nenhuma biblioteca, nenhuma imagem, nenhum arquivo de som. O jogo
inteiro é um HTML de 84 KB.

Três coisas aqui são um degrau acima dos jogos anteriores deste repositório:
**um solucionador que prova que toda fase tem solução**, **um gerador que cria
jardins infinitos jogando de trás para frente**, e **um pipeline de bloom de
verdade** rodando em canvas 2D.

---

## O jogo

- **30 jardins** em cinco capítulos, cada um apresentando uma peça nova:
  espelhos → divisores → vidros coloridos → prismas → tudo junto.
- **Jardim sem fim**: fases geradas na hora, com dificuldade crescente e
  solução garantida.
- Sem tempo, sem pontuação punitiva, sem fim de jogo. Dá para desfazer sempre.
- A **ajudinha** mostra uma jogada de uma solução real — não uma dica escrita à
  mão.

### As peças

| Peça | O que faz |
|---|---|
| **Espelho** | Manda a luz para a esquina. Toque para virar o outro lado. |
| **Divisor** | A luz segue em frente **e** vira, ao mesmo tempo. |
| **Prisma** | Separa a luz branca: vermelho à esquerda, verde em frente, azul à direita. |
| **Vidro colorido** | Deixa passar só as cores dele — branco atrás de um vidro amarelo vira amarelo. |

Luz se soma: vermelho + verde = amarelo; os três = branco. Duas lanternas
diferentes chegando na mesma flor também somam.

---

## O motor de luz

A propagação não segue o raio: é um **ponto fixo** sobre o estado
`(casa × direção) → máscara de cor`. Cada passo só acrescenta bits de cor, então
o processo termina sempre — inclusive quando os espelhos formam um circuito
fechado — e, de graça, dois feixes que entram na mesma casa na mesma direção se
fundem sozinhos, que é o comportamento fisicamente correto.

A máscara tem três bits: vermelho, verde, azul. Somar luz é `OR` de bits.

`propagar()` devolve duas coisas: a luz que **sai** de cada casa e a luz que
**chega** nela. Desenhar as duas metades é o que faz o feixe ficar contínuo — na
primeira versão o traço ia só do centro até a borda e o jogo mostrava um feixe
furado.

---

## O solucionador

Busca em largura sobre o conjunto de peças colocadas. Em largura, e não em
profundidade, porque a primeira solução encontrada é automaticamente a mais
curta — que é exatamente a medida de dificuldade que interessa.

A poda que torna isso viável: **só considera colocar peça em casa que a luz
alcança agora**. É o que uma pessoa faz, e derruba o espaço de busca de milhões
para alguns milhares de nós.

Ele serve para três coisas que seriam impossíveis sem ele:

1. **Nenhuma fase impossível é publicada.** Toda fase da campanha passou por ele.
2. **A dificuldade é medida, não estimada.** O número embaixo de cada jardim no
   mapa é o mínimo real de peças que resolve.
3. **A ajudinha é o próximo passo de uma solução verdadeira**, calculada a
   partir do que o jogador já colocou. Se o caminho atual não leva a lugar
   nenhum, ela diz isso em vez de dar uma dica inútil.

---

## O gerador

Fases nascem **jogando de trás para frente**. Em vez de sortear um tabuleiro e
torcer para ter solução, o gerador acende a lanterna, caminha com o feixe
colocando peças, e planta uma flor onde a luz termina. Depois recolhe as peças
móveis para a bandeja. A fase já nasce com solução garantida; o solucionador
entra só para medir a dificuldade real e descartar o que ficou trivial.

As pedras decorativas só entram em casas onde a luz nunca passou — assim nunca
atrapalham a solução construída.

Gerar e verificar uma fase custa **cerca de 6 ms**, o que permite o modo sem fim
gerar jardins ao vivo, no navegador, sem travar.

---

## O bloom

Feixes e brilhos são desenhados numa tela auxiliar em metade da resolução. O
halo sai de reduzir essa tela para 1/10 do tamanho, borrar levemente e ampliar
de volta — desfoque quase de graça, muito mais barato que `filter: blur` numa
tela grande.

A primeira versão somava três camadas do tamanho da tela e custava **65 ms por
quadro** em máquina sem aceleração gráfica. Montar o halo dentro da própria tela
de luz e subir só o resultado pronto levou para **20 ms** — mesma imagem, uma
composição de tela cheia em vez de três. O fundo (gradiente, estrelas, morros)
também virou cache, refeito só quando a claridade muda de verdade.

---

## Acessibilidade

Um jogo cujo tema é cor não pode depender de cor. A solução é **dupla
codificação com símbolos que se compõem**:

| Cor | Símbolo |
|---|---|
| vermelho | ▲ |
| verde | ● |
| azul | ■ |
| amarelo | ▲ ● |
| ciano | ● ■ |
| magenta | ▲ ■ |
| branco | ▲ ● ■ |

O símbolo de uma cor misturada é a junção dos símbolos das cores que a formam —
então o sistema de símbolos **ensina a soma de cores** em vez de só substituí-la.
As mesmas marcas aparecem na lanterna, na flor, no vidro e na tela de ajuda.

E os feixes são desenhados com **uma linha por canal**: luz amarela aparece como
uma linha vermelha e uma verde lado a lado, que se somam no meio. Quem não
distingue as duas conta as linhas.

No som, a mesma informação por outro canal: **cada cor é uma nota** — vermelho é
dó, verde é mi, azul é sol. Luz branca toca o acorde maior inteiro; amarelo toca
a terça.

Além disso: alto contraste, texto até 200%, brilho e faíscas de 0 a 100% (em
zero, nenhuma partícula é desenhada e o jogo continua inteiro), menus em DOM
navegáveis por teclado, e o tabuleiro inteiro jogável só com as setas.

---

## Verificação

```bash
npm install
npm run build          # dist/prisma.html e dist/prisma.artifact.html
npm test               # escada completa (~24 s)
node test/optica.test.mjs   # só a óptica, em milissegundos
node test/solver.test.mjs   # solucionador e gerador
node tools/gerar.mjs        # regenera a campanha
```

| Etapa | Onde | O que prova |
|---|---|---|
| 0 · óptica | Node puro | reflexão, divisão, prisma, filtro, soma de feixes, circuito fechado que não trava, orçamento de quadro |
| 1 · solucionador e gerador | Node puro | acha a solução mínima, é honesto quando não existe, gera fases confirmadas solúveis, é determinístico |
| 2 · saúde | navegador | a página monta e roda 400 quadros sem exceção |
| 3 · input humano | navegador | clique coloca, clique de novo gira, segurar tira, setas andam, enter coloca, Z desfaz, o botão de ajuda dá dica de verdade |
| 4 · a campanha | navegador | **as 30 fases são concluídas jogando**, todas no mínimo de peças; o modo sem fim gera e resolve ao vivo |
| 5 · telas | navegador | mapa com 30 jardins, ajuda desenhando as 4 peças e as 7 cores, foco de teclado, alto contraste, jogo completável com todos os efeitos desligados |
| 6 · desempenho | navegador | quadro com bloom medido no 90º percentil |
| 7 · capturas | navegador | uma imagem por tela |

**66 verificações.** As duas primeiras rodam sem navegador, em milissegundos, e
pegam a maior parte dos defeitos.

---

## Estrutura

```
src/core/     math · rng com semente · input · audio (sinos por FM) · fx · save
src/game/     optica (propagação) · solver (busca em largura) · gerador
              fases.js (campanha gerada) · jogo (estado da partida)
src/render/   draw (bloom, feixes, cenário) · pecas (cada peça desenhada)
src/ui/       hud (canvas) · screens (DOM, acessível)
tools/gerar   monta a campanha e grava fases.js
test/         optica · solver (Node puro) · harness · run (a escada)
```

`src/game/fases.js` é gerado — não editar à mão. Cada fase lá dentro carrega o
número mínimo de peças que a resolve, medido pelo solucionador.
