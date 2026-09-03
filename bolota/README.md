# BOLOTA — Chão da Mata

Um jogo de saltos numa clareira ao amanhecer. Uma sementinha de carvalho quer
chegar ao alto da mata; onde ela encosta, o mundo desperta. Sem violência, sem
magia, sem ninguém se machucando — cair só faz o vento trazer a Bolota de volta.

Feito do zero em JavaScript puro: nenhuma engine, nenhuma biblioteca, nenhuma
imagem, nenhum arquivo de som. A página inteira tem **119 KB** e roda offline.

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

Ao vivo também correm o **riacho** (três faixas de onda em velocidades
diferentes — é a diferença entre elas que o olho lê como água correndo) e o
**pólen em suspensão**, em coordenadas de mundo, para ficar para trás quando a
câmera anda em vez de parecer colado no monitor.

### Acabamento em WebGL

Bloom, gradação, vinheta, grão e aberração cromática são operações *por pixel*.
No canvas 2D cada uma custa uma varredura de tela inteira feita pela CPU. Em
`src/render/posfx.js` a cena pintada em 2D vira textura e todo o acabamento
acontece numa passada de fragmento:

1. **Corte de brilho com joelho suave** — limiar duro serrilha.
2. **Dois níveis de halo**: um borrão gaussiano separável a meia resolução dá o
   brilho junto ao objeto, outro a 1/8 dá o halo largo. Somar os dois é o que
   faz a luz vazar como numa lente, em vez de virar um anel.
3. **Acabamento num passe só**, e em espaço linear: exposição, curva filmica
   ACES, contraste em torno do cinza médio, tonalização partida (sombra fria,
   luz quente), saturação, vinheta, grão animado e aberração cromática radial.

Duas armadilhas que só apareceram olhando o resultado: somar brilho e aplicar
curva filmica direto nos valores de tela achatava o contraste e lavava a cor
(tudo isso tem que acontecer em luz, não em valor de pixel); e a aberração
cromática medida em fração de tela virou franja colorida na imagem inteira com
um valor cinquenta vezes maior que o certo.

**Onde não há GPU, o jogo não usa WebGL.** Uma sonda numa tela descartável lê o
rasterizador; se for por software (SwiftShader, llvmpipe), a conta toda sai mais
cara na CPU do que o acabamento 2D que ela substitui — medido aqui: 28 ms contra
75 ms por quadro. Nesse caso o caminho 2D continua inteiro. A sonda usa uma tela
descartável de propósito: pedir contexto WebGL a um canvas o compromete para
sempre, e sondar direto na tela do jogo deixava o jogo sem contexto nenhum ao
desistir do WebGL.

A **interface é desenhada numa camada própria**, por cima do acabamento: se ela
passasse pelo bloom e pela gradação, o texto ficaria lavado e o grão apareceria
em cima da tipografia.

### Qualidade automática

Não existe uma máquina "média". O jogo mede o próprio quadro e desce um degrau
de qualidade quando pesa — tela de luz menor, menos raios de sol, bloom de uma
passada, sem a camada da frente — e volta a subir quando sobra folga, com
histerese para não ficar piscando. A jogabilidade não muda em nenhum nível, e
dá para fixar o nível na mão nas Opções.

### O personagem: um esqueleto, não uma bola

A física da Bolota é um círculo — é o que se pode provar e testar. O que aparece
na tela não é: `src/render/rig.js` monta uma criaturinha com quadril, tronco,
cabeça, dois braços e duas pernas, resolvidos por **cinemática inversa de dois
ossos**. `src/render/personagem.js` só pinta a pose que sai daí.

Quatro decisões sustentam o rig:

- **Tudo é alvo mais amortecimento.** Cada estado (parada, preparando, voando,
  planando, pousando) escreve uma *pose alvo*, e a pose real persegue o alvo com
  molas de constantes diferentes por parte do corpo. Não existe máquina de
  transição nenhuma: a mistura entre poses sai de graça, e o atraso do peito e
  da cabeça em relação ao quadril é o que dá peso e continuidade ao movimento.
- **Os pés vivem no mundo, não no corpo.** No chão, cada pé traça uma vertical
  até o terreno e fica plantado ali. É por isso que ela se apoia certo numa
  rampa, com uma perna mais dobrada que a outra. O ciclo de passada avança com a
  distância percorrida, não com o relógio, então os pés não patinam.
- **Alvos polares, não pontos soltos.** Braço e perna recebem um ângulo e um
  raio em volta do ombro ou da anca. Com alvos cartesianos, um ponto perto
  demais fazia a CI dobrar o membro até virar um coto — em polar o comprimento
  do membro é escolhido, não sobra do cálculo.
- **Profundidade por ordem de desenho.** Um braço que aponta para trás é
  desenhado *atrás* do tronco, mais escuro e dessaturado. Sem esse teste, a mão
  cruzava o rosto toda vez que ela armava o salto.

Em cima disso: antecipação ao carregar (agacha, os braços vão para trás e para
baixo), pose de salto no ar (uma perna à frente, a outra atrás, o corpo mergulha
na direção do arco), absorção no pouso, planar com os braços abertos segurando a
folha, e uma pose de descanso que respira, troca o peso de um pé para o outro e
olha em volta. O broto da cabeça é uma **correntinha de Verlet** que fica em pé:
gravidade pequena, empuxo para cima e resistência a dobrar — sem isso ela pendia
sobre o rosto como um cabelo molhado.

A casca é pintada em camadas (base, barriga, veios, sombra fria, oclusão do
chapéu, luz de borda quente, especular duro) e o chapéu tem escamas desenhadas
uma a uma.

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
| 1b · esqueleto | CI exata e sem NaN, nenhum membro estica além do próprio comprimento, nenhum pé afunda no chão, ela nunca vira bola, parada continua viva, o broto fica em pé |
| 2b · WebGL | forçado mesmo sem GPU: desenha um quadro de verdade, sem erro de OpenGL |
| 2 · saúde da página | monta, expõe a API, 600 quadros parados sem exceção |
| 3 · entrada humana | dedo, mouse e teclado de verdade, via eventos do navegador |
| 4 · a fase jogada | o robô repete o caminho provado e termina a fase; progresso gravado; habilidade entregue |
| 5 · telas | navegação, foco, alvos ≥ 44 px, texto a 200%, todos os efeitos em zero |
| 6 · desempenho | com bloom ligado, e o que cada nível de qualidade custa |
| 7 · capturas | sete telas, para olhar com olho de gente |

**104 verificações, todas verdes.** O desempenho é medido em Chromium **sem GPU**
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
- **A pose de descanso estava literalmente congelada.** O teste mede o movimento
  acumulado do rig com a Bolota parada — e ele era quase zero. Personagem
  congelado é boneco, não personagem.
- **A Bolota começava enrolada.** O valor inicial do encolhimento era 1, e nos
  primeiros quadros de cada fase ela aparecia como uma bola antes de se abrir.
- **Planando, ela tombava.** O corpo girava na direção da velocidade também com
  a folha aberta, e o resultado lia como queda, não como voo. Pior: os braços
  ficavam tão fechados que sumiam atrás da própria cabeça.
- **O caminho 2D ficava sem contexto** depois que a sonda de WebGL desistia,
  porque a sonda pedia o contexto na própria tela do jogo.

---

## Arquivos

```
src/core/     math, rng, audio, fx, save
src/game/     fisica, regras, bolota, mundo, niveis, analise
src/render/   arte (pintura procedural), cena, rig (esqueleto + CI),
              personagem (a tinta), posfx (shaders de acabamento)
src/ui/       hud (canvas), screens (DOM)
src/main.js   laço de tempo fixo, câmera, entrada, progresso, API de teste
test/         fisica · jogo · rig · harness · run
```

Abrir a página com `?glsempre=1` força o caminho WebGL mesmo sem GPU — é assim
que o teste chega no shader.
