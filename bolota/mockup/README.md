# Estudos de direção de arte

Nada aqui entra no jogo. São experimentos feitos para **decidir o visual antes
de reescrever o renderizador**, depois de ficar claro que eu estava produzindo
variações da mesma coisa em vez de trocar de abordagem.

## `estilos.html` — três técnicas em 2D

Abre com `?e=papel`, `?e=pintura` ou `?e=grafico`. A composição, a cena e a pose
são idênticas nos três: o que muda é só como cada massa é preenchida, para a
comparação ser sobre a técnica e não sobre o enquadramento.

- **papel** — cor chapada, recorte com sombra projetada e fibra de papel.
- **pintura** — centenas de pinceladas afiladas orientadas por um campo de
  direção, com a cor decidida por um modelo de luz. Foi a melhor das três.
- **grafico** — poucos valores, silhuetas fortes, atmosfera fazendo o trabalho.

Conclusão do exercício: as três melhoram o acabamento, mas nenhuma cruza a
distância até um jogo ilustrado, porque a limitação não era a técnica de
preenchimento — era não haver ilustração no circuito.

## `tres.js` — a mesma fase 1, em 3D

Motivado por uma referência que o Eduardo mandou: o jogo dela não é 2D
ilustrado, é 3D. O teste renderiza **a fase 1 de verdade** — o relevo é o mesmo
polígono da colisão, extrudado em profundidade — com a Bolota construída a
partir de primitivas, e **nenhum arquivo de arte**.

O que ele demonstra: em 3D, volume, sombra e material vêm de matemática, não de
pintura. Sem um ilustrador, o 3D chega muito mais longe que o 2D.

Para gerar a imagem:

```bash
npx esbuild mockup/tres.js --bundle --format=iife --minify --outfile=/tmp/t.js
# e embutir em mockup/tres.html no lugar de __JS__
```
