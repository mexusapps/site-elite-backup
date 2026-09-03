// ---------------------------------------------------------------------------
// niveis.js — os cenários.
//
// O terreno é descrito por polígonos convexos: é o que a física entende e o que
// o desenho pinta por cima. Cada fase declara também os brotos adormecidos (que
// viram plataforma quando a Bolota encosta), as gotas de orvalho e a meta.
//
// A fase 1 foi desenhada para ensinar sem uma linha de tutorial: o primeiro
// salto é curto e inevitável, o primeiro broto está no único caminho possível,
// e a primeira gota fica um pouco fora da rota — visível, opcional, convidativa.
// ---------------------------------------------------------------------------

export const FASE1 = {
  id: 1,
  nome: 'A Clareira',
  capitulo: 'Chão da Mata',
  dica: 'Segure, mire e solte.',
  habilidades: ['salto'],
  largura: 2560,
  altura: 1560,
  ceu: { topo: '#f7d9a8', meio: '#e9b98a', baixo: '#b98d78' },
  hora: 'amanhecer',
  sol: { x: 0.82, y: 0.14 },
  inicio: { x: 210, y: 1060 },
  meta: { x: 2320, y: 502, raio: 52 },

  // o que a Bolota aprende ao chegar no alto. A habilidade vale já na próxima
  // vez que ela jogar esta fase — é o que faz repetir valer a pena.
  recompensa: 'planar',

  // o riacho que corre no fundo da clareira: é ele que a Bolota atravessa nos
  // primeiros saltos, e é nele que ela cai quando erra
  agua: { y: 1312, cor: '#2f6f78', fundo: '#173f49' },

  // ----- terreno: [x, y, w, h] para blocos, ou lista de pontos para o resto ---
  terreno: [
    // barranco inicial
    { tipo: 'colina', cx: 250, topo: 1100, larg: 620, alt: 130, base: 1560, musgo: 1 },
    // pedra do meio do riacho
    { tipo: 'colina', cx: 940, topo: 1080, larg: 380, alt: 90, base: 1560, musgo: 0.8 },
    // degrau de pedra
    { tipo: 'quad', p: [[1240, 980], [1520, 950], [1520, 1560], [1240, 1560]], musgo: 0.7 },
    // paredão da direita
    { tipo: 'quad', p: [[1880, 700], [2180, 660], [2180, 1560], [1880, 1560]], musgo: 0.5 },
    // patamar da meta
    { tipo: 'quad', p: [[2180, 560], [2560, 540], [2560, 1560], [2180, 1560]], musgo: 0.9 },
    // parede esquerda, para não sair do mundo
    { tipo: 'quad', p: [[-60, -400], [0, -400], [0, 1560], [-60, 1560]], musgo: 0 },
  ],

  // ----- brotos adormecidos: encostou, floresceu ------------------------------
  // A folha desabrocha no ar, presa ao paredão: ela aparece bem na hora em que
  // a Bolota passa raspando, e o pouso que parecia impossível vira plataforma.
  brotos: [
    { x: 1762, y: 872, tipo: 'folha', larg: 268 },
    { x: 2020, y: 662, tipo: 'mola' },
  ],

  orvalho: [
    { x: 700, y: 938 },     // sobre o riacho, no arco do primeiro salto grande
    { x: 1616, y: 704 },    // alto, no caminho do broto de folha
    { x: 2092, y: 306 },    // no ápice do impulso do cogumelo
  ],

  // decoração sem colisão: árvores, samambaias, pedrinhas
  decoracao: [
    { tipo: 'arvore', x: 120, y: 1100, alt: 700, escala: 1.15 },
    { tipo: 'arvore', x: 1330, y: 960, alt: 520, escala: 0.9 },
    { tipo: 'arvore', x: 2400, y: 545, alt: 820, escala: 1.3, meta: true },
    { tipo: 'samambaia', x: 380, y: 1090, escala: 1 },
    { tipo: 'samambaia', x: 880, y: 1070, escala: 0.8 },
    { tipo: 'samambaia', x: 1450, y: 955, escala: 0.9 },
    { tipo: 'samambaia', x: 2240, y: 552, escala: 1.05 },
    { tipo: 'pedrinha', x: 560, y: 1120, escala: 1 },
    { tipo: 'pedrinha', x: 1990, y: 700, escala: 0.8 },
  ],
};

export const FASES = [FASE1];
