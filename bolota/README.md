# BOLOTA — Chão da Mata

Um jogo de saltos numa clareira ao amanhecer. Uma sementinha de carvalho quer
chegar ao alto da mata; onde ela encosta, o mundo desperta. Sem violência, sem
magia, sem ninguém se machucando — cair só faz o vento trazer a Bolota de volta.

Feito do zero em JavaScript puro: nenhuma engine, nenhuma biblioteca, nenhuma
imagem, nenhum arquivo de som. A página inteira tem **97 KB** e roda offline.

---

## O que se faz

**Segure. Mire. Solte.** Um comando só, para o dedo, para o mouse e para o
teclado. Quanto mais tempo segurando, mais forte o salto; o arco de pontinhos
mostra exatamente onde a Bolota vai cair, e um anel em volta dela fecha quando
a força chega ao máximo.

Em cima disso, três coisas que fazem a fase virar um percurso:

- **Brotos adormecidos.** Passe perto e eles abrem. A folha vira plataforma, o
  cogumelo vira mola. Não é enfeite: eles entram na física e mudam o caminho —
  e cada um vira o seu ponto de volta.
- **Gotas de orvalho.** Três por fase, sempre um tiquinho fora da rota fácil.
  São o motivo de repetir a fase.
- **A evolução.** Terminar a fase 1 ensina a **Folha**: segurar no ar passa a
  planar. Ela vale já na próxima vez que você jogar a mesma fase — e é com ela
  que dá para pegar as três gotas.

## O que existe hoje

A **fase 1 completa** — "A Clareira", do capítulo *Chão da Mata*: 2560×1560 de
mundo, seis peças de terreno, dois brotos, três gotas, uma flor no alto.
Resolvível em **6 saltos** no mínimo. Os próximos capítulos usam o mesmo motor
e as habilidades já planejadas (Folha, Raiz, Gavinha, Flor).

---

## Como rodar

```bash
npm install       # só esbuild e playwright, para construir e testar
npm run build     # gera dist/bolota.html — abra no navegador
npm test          # a escada de verificação inteira
```

---

## Por dentro

### Física própria: círculo contra polígono convexo

`src/game/fisica.js`. Caixas alinhadas dariam degraus invisíveis num cenário de
pedras e barrancos; com polígonos convexos a rampa é de verdade e o desenho
orgânico por cima nunca mente sobre onde está o chão. Quatro subpassos por
quadro impedem atravessar parede em salto forte, e a velocidade de repouso é
zerada abaixo de um limiar, para a Bolota parar de fato.

**Nada na simulação usa `Math.random`.** A mesma sequência de comandos dá sempre
a mesma trajetória — é o que torna possível um teste que joga a fase de verdade.

### O programa que joga a fase sozinho

`src/game/analise.js`. "A fase tem solução" não é opinião. De cada ponto de
descanso a busca testa 14 ângulos × 4 forças, simula o voo até a Bolota parar de
novo e trata cada pouso como um nó novo. Busca em largura, então o primeiro
caminho encontrado é o de **menos saltos** — e ele é conferido: `repetir()` joga
esse caminho num mundo só e o teste exige que cada salto caia **no mesmo pixel**
que a busca previu. Depois, cada gota de orvalho vira o objetivo de uma busca
própria, para provar que nenhuma é decorativa.

Duas coisas que só apareceram porque a busca existe:

- O feixe ordenado só por "quem está mais à direita" enchia de estados do fim do
  mapa e jogava fora o pouso do meio do caminho que era a única rota até uma
  gota. Hoje cada faixa vertical do mapa guarda alguns representantes.
- A busca partia de uma posição inventada, e não do lugar onde a Bolota assenta
  quando o jogo começa. Meio pixel de diferença no primeiro salto mudava o resto
  da fase inteira. Hoje ela parte do mesmo estado que o jogador.

### Desenho: assar o que não muda

`src/render/cena.js`. A fase inteira (2960×1960 com margem) é pintada **uma vez**
numa tela fora do ecrã, com todas as passadas caras — veios, seixos, estratos,
musgo, oclusão, luz de borda, grão. Em jogo só se recorta o pedaço visível. Céu,
morros, mata distante e a folhagem da frente são mais quatro telas assadas uma
vez, roladas em velocidades diferentes. Ao vivo ficam a grama que balança, os
raios de sol, as partículas e o personagem.

O acabamento (gradação de cor + vinheta) era três varreduras de tela cheia;
como multiplicar é associativo, viraram **uma** imagem assada e uma passada só.

### Qualidade automática

Não existe uma máquina "média". O jogo mede o próprio quadro e desce um degrau
de qualidade quando pesa — tela de luz menor, menos raios de sol, bloom de uma
passada, sem a camada da frente — e volta a subir quando sobra folga, com
histerese para não ficar piscando. A jogabilidade não muda em nenhum nível, e
dá para fixar o nível na mão nas Opções.

### O personagem

`src/render/personagem.js` é só tinta; `src/game/bolota.js` é só movimento. A
casca é pintada em camadas (base, barriga, veios, sombra fria, oclusão do
chapéu, luz de borda quente, especular duro), o chapéu tem escamas desenhadas
uma a uma, e o broto da cabeça é uma **correntinha de Verlet** de quatro nós:
ele atrasa, chicoteia na virada e balança sozinho quando ela está parada. Mola
de esmagamento no pouso, alongamento no voo, piscadas e um olhar que segue a
mira. Nada disso muda uma regra, e é tudo que faz o boneco ter alma.

### Som gerado na hora

`src/core/audio.js`. Madeira e ar, não vidro: marimba (seno com quatro
harmônicos e um "toc" de ruído filtrado), assobios de pássaro, vento em ruído
passa-banda. A escala é pentatônica maior de Fá — não existe intervalo
dissonante possível. Todo efeito tem três camadas e varia ±6% de altura a cada
repetição, então marteladas seguidas nunca soam iguais. A **carga é uma voz
contínua** que sobe de altura enquanto o jogador segura: o ouvido aprende a
força do salto antes do olho.

### Acessibilidade

Menus em DOM de verdade (foco de teclado, leitor de tela, texto até 200%),
alvos de toque de no mínimo 44 px, e todo efeito visual pode ir a zero sem que
o jogo perca informação. Teclado completo: setas miram, espaço salta, `R`
recomeça, `P`/`esc` pausa.

---

## Verificação

`npm test` sobe uma escada — o que dá para provar sem navegador é provado sem
navegador, e o navegador só responde o que só ele sabe:

| Degrau | O que responde |
|---|---|
| 0 · física | pousa, repousa, quica sem ganhar energia, atrito não invertido, não atravessa parede a 4200 px/s, determinismo, previsão do arco, custo por quadro |
| 1 · regras e projeto | brotos mudam o terreno, mola arremessa, orvalho conta uma vez, cair não pune, meta vence, planar funciona, **a fase tem solução** e **todas as gotas são alcançáveis** |
| 2 · saúde da página | monta, expõe a API, 600 quadros parados sem exceção |
| 3 · entrada humana | dedo, mouse e teclado de verdade, via eventos do navegador |
| 4 · a fase jogada | o robô repete o caminho provado e termina a fase; progresso gravado; habilidade entregue |
| 5 · telas | navegação, foco, alvos ≥ 44 px, texto a 200%, todos os efeitos em zero |
| 6 · desempenho | com bloom ligado, e o que cada nível de qualidade custa |
| 7 · capturas | sete telas, para olhar com olho de gente |

**83 verificações, todas verdes.** O desempenho é medido em Chromium **sem GPU**
(SwiftShader, rasterização em CPU): é o pior caso possível, e mesmo assim o
quadro mediano fica em ~28 ms.

### Coisas que só o teste achou

- **Segurar o botão virava metralhadora de pulinhos.** O estado "carregando" não
  contava como "pode carregar", então o segundo quadro de cada toque já soltava
  o salto sozinho. Quatro saltos por toque.
- **O cogumelo era um pula-pula infinito.** Com o tampo reto, a Bolota caía
  sempre no mesmo ponto, era arremessada na vertical e voltava ali, para sempre.
  O tampo virou cúpula, e o impulso passou a devolver o comando: por 0,75 s dá
  para preparar um salto no ar.
- **A seta da direita mirava no chão.** O limite da mira ia até quase a
  horizontal; o salto batia no barranco e a Bolota não saía do lugar.
- **A mata do fundo saía preta.** A função de mistura de cores só entendia
  hexadecimal e devolvia `NaN` para qualquer cor já misturada — o canvas recusava
  o valor e mantinha o preenchimento anterior. Um parser tolerante devolveu a
  floresta.
- **A vitória estourava a tela em branco** justo no momento em que o jogador
  quer olhar.

---

## Arquivos

```
src/core/     math, rng, audio, fx, save
src/game/     fisica, regras, bolota, mundo, niveis, analise
src/render/   arte (pintura procedural), cena, personagem
src/ui/       hud (canvas), screens (DOM)
src/main.js   laço de tempo fixo, câmera, entrada, progresso, API de teste
test/         fisica · jogo · harness · run
```
