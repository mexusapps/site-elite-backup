// ---------------------------------------------------------------------------
// balance.js — TODOS os números do jogo em um lugar só.
//
// Nada de constante mágica espalhada pelo código: um jogo só fica gostoso
// depois de umas duzentas iterações de ajuste, e isso só é viável se mexer nos
// números for barato. Este arquivo é o painel de controle do design.
// ---------------------------------------------------------------------------

export const SIM_HZ = 60;
export const SIM_DT = 1 / SIM_HZ;

export const ARENA = {
  w: 1420,
  h: 1020,
  wall: 34,
};

// Zoom base. Mais perto = a pancada lê melhor; mais longe = você vê a onda
// chegando. 1.3 é o meio-termo que deixa o jogador com ~40 px na tela.
export const ZOOM = { base: 1.3, corrida: 1.24, chefe: 1.12 };

export const PLAYER = {
  radius: 14,
  maxFlame: 100,
  startFlame: 100,
  decayBase: 1.35,          // por segundo, na onda 1
  decayPerWave: 0.13,
  speed: 238,
  accel: 3000,
  friction: 0.855,
  invuln: 0.62,             // após levar dano
  emberValue: 4.2,
  emberMagnet: 118,

  melee: {
    damage: 26,
    cooldown: 0.30,
    range: 84,
    halfArc: 1.02,          // ~58° para cada lado
    knockback: 300,
    hitstop: 62,
    windup: 0.045,
    active: 0.10,
  },
  shot: {
    damage: 34,
    cooldown: 0.40,
    cost: 5,                // custa vida: atirar é uma troca, não um recurso grátis
    speed: 640,
    radius: 6,
    life: 1.15,
    knockback: 150,
    hitstop: 48,
  },
  dash: {
    charges: 2,
    cooldown: 1.15,
    duration: 0.155,
    speed: 760,
    iframes: 0.26,
    damage: 16,
    hitstop: 40,
  },
};

// Escalonamento por onda — curva suave, sem pico injusto
export const SCALE = {
  hp: (w) => 1 + 0.105 * (w - 1),
  dmg: (w) => 1 + 0.052 * (w - 1),
  speed: (w) => 1 + 0.022 * (w - 1),
};

export const ENEMIES = {
  cinza: {
    name: 'Cinza', hp: 38, speed: 90, damage: 9, radius: 13,
    mass: 1, embers: 2, xp: 1, color: '#8d6ea8', accent: '#c9a7e8',
    touch: true, score: 10,
  },
  fagulha: {
    name: 'Fagulha', hp: 26, speed: 128, damage: 13, radius: 11,
    mass: 0.7, embers: 2, xp: 1, color: '#e0663c', accent: '#ffc07a',
    touch: true, score: 14,
    telegraph: 0.5, lungeSpeed: 620, lungeTime: 0.34, lungeCd: 1.9,
  },
  fumaca: {
    name: 'Fumaça', hp: 34, speed: 66, damage: 7, radius: 12,
    mass: 0.9, embers: 3, xp: 1, color: '#5c7fa8', accent: '#9fd0ff',
    touch: false, score: 16,
    keepDist: 300, shootCd: 2.15, bulletSpeed: 205, bulletDamage: 11, bulletRadius: 8,
  },
  carvao: {
    name: 'Carvão', hp: 155, speed: 54, damage: 17, radius: 23,
    mass: 3.2, embers: 6, xp: 3, color: '#4a4450', accent: '#ff8a3d',
    touch: true, score: 45, armorFront: 0.45, splits: 3,
  },
  veu: {
    name: 'Véu', hp: 72, speed: 104, damage: 8, radius: 16,
    mass: 1.1, embers: 4, xp: 2, color: '#2f2a4a', accent: '#7a6ce0',
    touch: true, score: 32, orbit: 190, drain: 1.5, drainRadius: 165,
  },
};

// Composição das ondas. Chefes em 8 e 15.
export const WAVES = [
  { n: 1,  spawn: { cinza: 5 },                                    rest: 4.5 },
  { n: 2,  spawn: { cinza: 7, fagulha: 2 },                        rest: 4.0 },
  { n: 3,  spawn: { cinza: 6, fumaca: 3 },                         rest: 4.0 },
  { n: 4,  spawn: { cinza: 8, fagulha: 4 },                        rest: 3.8 },
  { n: 5,  spawn: { cinza: 6, fumaca: 3, carvao: 1 },              rest: 3.8 },
  { n: 6,  spawn: { cinza: 9, fagulha: 4, veu: 1 },                rest: 3.6 },
  { n: 7,  spawn: { fagulha: 5, fumaca: 4, carvao: 2 },            rest: 3.6 },
  { n: 8,  boss: 'vigia',                                          rest: 5.5 },
  { n: 9,  spawn: { cinza: 10, veu: 2, fumaca: 3 },                rest: 3.4 },
  { n: 10, spawn: { fagulha: 7, carvao: 2, fumaca: 4 },            rest: 3.4 },
  { n: 11, spawn: { cinza: 12, veu: 3, fagulha: 5 },               rest: 3.2 },
  { n: 12, spawn: { carvao: 3, fumaca: 6, fagulha: 6 },            rest: 3.2 },
  { n: 13, spawn: { cinza: 14, veu: 3, carvao: 2, fagulha: 4 },    rest: 3.0 },
  { n: 14, spawn: { fagulha: 9, fumaca: 7, carvao: 3, veu: 3 },    rest: 4.5 },
  { n: 15, boss: 'noite',                                          rest: 0 },
];

export const TOTAL_WAVES = WAVES.length;

export const BOSSES = {
  vigia: {
    name: 'O VIGIA', title: 'guardião da última fornalha',
    hp: 1280, radius: 62, speed: 76, contactDamage: 17,
    color: '#3a2f52', accent: '#ffb648', embers: 40,
    phases: [1.0, 0.66, 0.33],
  },
  noite: {
    name: 'A NOITE', title: 'aquilo que apaga tudo',
    hp: 2500, radius: 78, speed: 88, contactDamage: 21,
    color: '#1a1626', accent: '#c46bff', embers: 60,
    phases: [1.0, 0.7, 0.38],
  },
};

// Paletas: a padrão, uma segura para deuteranopia/protanopia e uma de alto
// contraste. Cor nunca é a única informação — forma e tamanho também separam
// os inimigos — mas trocar a paleta é o item mais pedido de acessibilidade.
export const PALETTES = {
  padrao: {
    bg: '#0a0710', floor: '#140f1c', floorAlt: '#191327', wall: '#241a35',
    player: '#ffd98a', playerCore: '#fff6df', flame: '#ff9d3d', flameHot: '#ffe08a',
    enemy: null, danger: '#ff4d6d', ember: '#ffc46b', shot: '#ffcf7a',
    ui: '#f3e9dd', uiDim: '#9b8ba0', accent: '#ff9d3d', good: '#6be0a8',
  },
  daltonico: {
    bg: '#07080f', floor: '#101423', floorAlt: '#151a2c', wall: '#1f2740',
    player: '#ffd166', playerCore: '#fff8e0', flame: '#f4a261', flameHot: '#ffe3a3',
    enemy: null, danger: '#4cc9f0', ember: '#ffd166', shot: '#ffe08a',
    ui: '#eef2f7', uiDim: '#8fa0b8', accent: '#ffd166', good: '#4cc9f0',
  },
  contraste: {
    bg: '#000000', floor: '#0b0b0b', floorAlt: '#131313', wall: '#2a2a2a',
    player: '#ffffff', playerCore: '#ffffff', flame: '#ffcc00', flameHot: '#ffffff',
    enemy: null, danger: '#ff2b2b', ember: '#ffcc00', shot: '#ffffff',
    ui: '#ffffff', uiDim: '#bdbdbd', accent: '#ffcc00', good: '#00e676',
  },
};

// Cores por inimigo em cada paleta acessível (a padrão usa as do próprio ENEMIES)
export const ENEMY_PALETTE = {
  daltonico: {
    cinza: ['#4a6fa5', '#9ec5ff'], fagulha: ['#c96a1f', '#ffcf8a'],
    fumaca: ['#2f6f8f', '#8fe3ff'], carvao: ['#3f3f4a', '#ffb44c'],
    veu: ['#26314f', '#7fb2ff'],
  },
  contraste: {
    cinza: ['#555555', '#ffffff'], fagulha: ['#8a3a00', '#ffcc00'],
    fumaca: ['#00506b', '#00e5ff'], carvao: ['#2a2a2a', '#ffcc00'],
    veu: ['#3a0d5c', '#e08cff'],
  },
};

export const ASSIST = {
  decayMul: 0.55,
  damageTaken: 0.55,
  emberMul: 1.35,
};

export const SCORE = {
  waveClear: 250,
  bossClear: 2500,
  perFlameLeft: 6,
  timeBonus: 900,           // dividido pelo tempo, recompensa agressividade
};
