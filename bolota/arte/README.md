# Arte da BOLOTA — o que precisa ser desenhado

O jogo passa a carregar imagens em vez de desenhar tudo por código. Cada arquivo
que aparecer nesta pasta é usado na hora; o que faltar continua sendo desenhado
pelo código antigo. **Dá para entregar a arte aos poucos** — cada arquivo novo
melhora a tela sozinho, nada quebra enquanto o resto não chega.

## Regras que valem para tudo

- **PNG**, com transparência real (canal alfa) onde estiver indicado. Nada de
  fundo branco "fingindo" transparência.
- **Dobro do tamanho de tela.** Todas as medidas abaixo já são o dobro do que
  aparece; é o que mantém a imagem nítida em telas retina.
- **Sem texto, sem logotipo, sem moldura, sem sombra externa** — a sombra e a
  luz são aplicadas pelo jogo, em tempo real.
- **Uma paleta só para tudo.** Amanhecer numa clareira: sombra fria
  azul-esverdeada, luz quente âmbar, verde-musgo, terracota. O sol vem de cima
  à **direita** — todo volume deve estar iluminado desse lado e sombreado do
  lado oposto. Se dois arquivos discordarem disso, a cena se desmancha.
- **Onde estiver escrito "emenda"**, a borda esquerda tem que casar com a borda
  direita: a camada rola em laço e a emenda não pode aparecer.

## Enquadramento: onde cada coisa fica dentro da imagem

O jogo não pede que a arte tenha a altura da tela — ele posiciona cada camada.
Para isso funcionar, cada arquivo precisa respeitar onde o assunto está **dentro
da própria imagem**:

- `ceu.png` — a linha do horizonte (onde o céu encontraria o chão) deve ficar por
  volta de **70% da altura da imagem**. O jogo corta o topo conforme a janela.
- `mata_longe.png` e `mata_perto.png` — as árvores nascem **na borda de baixo** e
  a crista das copas fica por volta de **40% da altura** da imagem. Tudo acima
  disso é transparente. Não desenhe chão: o chão é do jogo.
- `frente.png` — esta é esticada para a altura da tela. Desenhe folhagem só no
  **quarto de cima** e no **quarto de baixo**; a **metade do meio tem que estar
  completamente transparente**, senão ela tapa a área de jogo.
- `terra.png` — sem luz assada. Textura neutra e uniforme: a sombra, a luz do sol
  e a oclusão são aplicadas pelo jogo por cima, em tempo real.
- `borda_grama.png` — a linha do solo (onde a grama encontra a terra) fica por
  volta de **70% da altura**; acima é capim, abaixo são raízes descendo.

## Tamanho de arquivo

Não se preocupe com peso: na hora de construir a página, o jogo recodifica tudo
para WebP com transparência. No teste com 11 imagens, 3,7 MB de PNG viraram
327 KB sem diferença visível. Mande PNG na melhor qualidade que tiver.

---

## Nível 1 — o cenário (6 arquivos, é o que mais muda a tela)

| arquivo | tamanho | transparência | o que é |
|---|---|---|---|
| `ceu.png` | 2560 × 1440 | não | Céu de amanhecer inteiro, com o sol e nuvens macias. Sem chão, sem árvores. Degradê de azul-petróleo no alto para âmbar no horizonte. |
| `mata_longe.png` | 2560 × 900 | sim, acima | Faixa de copas de árvores distantes, lavada pela névoa (baixo contraste, puxando para a cor do céu). Transparente acima da linha das copas. **Emenda.** |
| `mata_perto.png` | 2560 × 1000 | sim, acima | A mesma ideia, mais perto: copas maiores, verde mais saturado, mais contraste. Transparente acima. **Emenda.** |
| `frente.png` | 2560 × 700 | sim, no meio | Folhagem escura de primeiro plano, quase silhueta, entrando pelas bordas de cima e de baixo e deixando o miolo vazio. É a moldura da tela. **Emenda.** |
| `terra.png` | 1024 × 1024 | não | Textura de barranco: terra úmida com pedras, raízes e estratos. **Emenda nos quatro lados** (repete em ladrilho). Iluminação neutra — a luz é aplicada pelo jogo. |
| `borda_grama.png` | 1024 × 320 | sim | Faixa de grama e musgo que fica na crista do barranco: tufos, algumas florzinhas, raízes descendo. Transparente acima e abaixo da faixa. **Emenda na horizontal.** |

## Nível 2 — a Bolota, em recortes (6 arquivos)

O personagem é montado como um boneco articulado: cada parte é uma imagem
separada que o esqueleto do jogo gira e move. É assim que o Rayman é animado.
**Cada peça de frente, sem perspectiva, com o ponto de giro indicado.**

| arquivo | tamanho | ponto de giro | o que é |
|---|---|---|---|
| `bolota_cabeca.png` | 640 × 700 | centro da noz | A cabeça inteira: noz, chapéu de bolota com escamas, rosto (olhos grandes, sobrancelhas, boca sorrindo). Sem o broto. |
| `bolota_broto.png` | 300 × 420 | base do caule (embaixo, no meio) | Caule verde com duas folhinhas na ponta, apontando para cima. |
| `bolota_tronco.png` | 420 × 480 | centro | Corpinho arredondado, creme claro na barriga e mais escuro nas laterais. |
| `bolota_braco.png` | 180 × 420 | topo (ombro) | Braço inteiro esticado para baixo, com a mãozinha em forma de folha na ponta. O jogo dobra no meio. |
| `bolota_perna.png` | 200 × 460 | topo (quadril) | Perna inteira esticada para baixo, com o pézinho em forma de raiz na ponta. O jogo dobra no meio. |
| `bolota_rosto_piscando.png` | 640 × 700 | igual à cabeça | Opcional. A mesma cabeça, só com os olhos fechados. Sem ela o jogo continua piscando por código. |

Braço e perna são **um arquivo cada**, usado espelhado para o outro lado.

## Nível 3 — adereços (6 arquivos, todos com transparência)

| arquivo | tamanho | o que é |
|---|---|---|
| `arvore.png` | 900 × 1600 | Uma árvore inteira, tronco e copa, de frente. É o que fecha a lateral da tela. |
| `cogumelo.png` | 320 × 320 | Cogumelo de chapéu vermelho-terracota com pintas claras. |
| `samambaia.png` | 420 × 340 | Touceira de samambaia, folhas em leque. |
| `pedra.png` | 320 × 220 | Pedra coberta de musgo no topo. |
| `flor.png` | 180 × 240 | Florzinha simples de cinco pétalas, com caule. |
| `tronco_caido.png` | 640 × 260 | Tronco caído coberto de musgo, com os anéis à mostra numa das pontas. |

## Nível 4 — o que a fase 1 tem de próprio (3 arquivos)

| arquivo | tamanho | o que é |
|---|---|---|
| `broto_folha.png` | 700 × 320 | A folha-plataforma: uma folha grande e firme, vista de lado, presa por um caule à direita. É onde a Bolota pousa. |
| `cogumelo_mola.png` | 520 × 300 | O cogumelo-trampolim: chapéu largo e abaulado, com cara de elástico. |
| `flor_meta.png` | 640 × 640 | A flor dourada do alto da clareira, que é a meta da fase. Pétalas abertas, miolo luminoso. |

---

## Prompts prontos, se for gerar por IA

Cole cada um como está. Todos terminam com as mesmas regras de estilo, de
propósito: é a repetição que mantém os arquivos parecendo do mesmo jogo.

**Regra de estilo (repita no fim de todo prompt):**
> pintura digital estilo livro infantil premium, pinceladas visíveis, textura de
> aquarela, luz vinda de cima à direita, sombra fria azul-esverdeada e luz
> quente âmbar, paleta de verde-musgo terracota e âmbar, sem texto, sem
> logotipo, sem moldura, sem sombra projetada no fundo

- **ceu.png** — "céu de amanhecer numa floresta, degradê de azul-petróleo no
  alto para âmbar no horizonte, sol baixo à direita com halo suave, nuvens
  macias e alongadas, sem chão e sem árvores, formato panorâmico" + regra.
- **mata_longe.png** — "faixa horizontal de copas de árvores distantes vistas de
  longe, lavadas pela névoa, baixo contraste, tons de verde acinzentado, fundo
  totalmente transparente acima das copas, formato panorâmico" + regra.
- **mata_perto.png** — "faixa horizontal de copas de árvores frondosas mais
  próximas, verde-musgo saturado, silhueta recortada com tufos de folhas, fundo
  totalmente transparente acima, formato panorâmico" + regra.
- **frente.png** — "folhagem escura de primeiro plano entrando pelas bordas de
  cima e de baixo da imagem, quase silhueta, verde muito escuro, centro da
  imagem completamente vazio e transparente, formato panorâmico" + regra.
- **terra.png** — "textura de barranco de terra úmida com pedras encravadas,
  raízes finas e camadas de sedimento, iluminação neutra e uniforme, padrão que
  se repete sem emenda nos quatro lados, quadrado" + regra.
- **borda_grama.png** — "faixa horizontal de grama e musgo com tufos de capim,
  raízes descendo por baixo e algumas florzinhas brancas e rosadas, fundo
  transparente acima e abaixo, padrão que se repete sem emenda na horizontal" + regra.
- **bolota_cabeca.png** — "cabeça de um personagem fofo em forma de semente de
  carvalho, chapéu de bolota com escamas, olhos grandes e brilhantes com íris
  verde-azulada, sobrancelhas expressivas, sorriso pequeno, bochechas coradas,
  vista de frente, fundo transparente" + regra.
- **bolota_tronco.png** — "corpinho arredondado de um personagem semente,
  barriga creme clara e laterais em marrom quente, sem braços e sem pernas,
  vista de frente, fundo transparente" + regra.
- **bolota_braco.png** — "um braço curto e roliço de personagem fofo, apontando
  para baixo, terminando numa mãozinha em forma de folha, marrom quente, vista
  de frente, fundo transparente" + regra.
- **bolota_perna.png** — "uma perna curta e roliça de personagem fofo, apontando
  para baixo, terminando num pézinho em forma de raiz, marrom quente, vista de
  frente, fundo transparente" + regra.
- **bolota_broto.png** — "um broto verde com caule fino e duas folhinhas na
  ponta, apontando para cima, fundo transparente" + regra.
- **arvore.png** — "uma árvore de floresta inteira, tronco alto com casca
  texturizada e copa frondosa em tufos, vista de frente, fundo transparente" + regra.

## Onde colocar

Tudo nesta pasta (`bolota/arte/`), com **exatamente** esses nomes. Depois é só
commitar no branch `claude/premium-games-research-lul4xf` — eu puxo, encaixo e
te mostro o resultado. Se preferir, pode anexar as imagens aqui na conversa que
eu cuido de colocar no lugar.
