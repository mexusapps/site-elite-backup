// ---------------------------------------------------------------------------
// fruits.js — a corrente de frutas e todos os números do jogo.
//
// Os raios crescem por volta de 1,25× a cada degrau: é a razão que faz duas
// frutas juntas parecerem virar "a próxima" sem que a maior engula a cesta.
// A pontuação segue números triangulares, como manda a tradição do gênero:
// cada degrau vale mais do que a soma do que veio antes, então as fusões
// grandes são o que realmente conta.
// ---------------------------------------------------------------------------

export const CESTA = { w: 520, h: 560 };

export const FRUTAS = [
  { id: 0,  nome: 'Semente',  r: 13,  cor: '#a9743e', cor2: '#c99a63', pontos: 10,   forma: 'semente' },
  { id: 1,  nome: 'Amora',    r: 17,  cor: '#7b4fa8', cor2: '#a97ad4', pontos: 30,   forma: 'amora' },
  { id: 2,  nome: 'Uva',      r: 21,  cor: '#7cae3c', cor2: '#a8d466', pontos: 60,   forma: 'uva' },
  { id: 3,  nome: 'Cereja',   r: 26,  cor: '#d93a52', cor2: '#ff7b8c', pontos: 100,  forma: 'cereja' },
  { id: 4,  nome: 'Limão',    r: 32,  cor: '#c4d63f', cor2: '#e6f27a', pontos: 150,  forma: 'limao' },
  { id: 5,  nome: 'Laranja',  r: 39,  cor: '#f2911f', cor2: '#ffbe5c', pontos: 210,  forma: 'laranja' },
  { id: 6,  nome: 'Maçã',     r: 47,  cor: '#e04a3c', cor2: '#ff8574', pontos: 280,  forma: 'maca' },
  { id: 7,  nome: 'Pêssego',  r: 56,  cor: '#f79f6e', cor2: '#ffc9a6', pontos: 360,  forma: 'pessego' },
  { id: 8,  nome: 'Abacaxi',  r: 66,  cor: '#e8c341', cor2: '#ffe484', pontos: 450,  forma: 'abacaxi' },
  { id: 9,  nome: 'Melão',    r: 77,  cor: '#b9d97e', cor2: '#dff0b4', pontos: 550,  forma: 'melao' },
  { id: 10, nome: 'Melancia', r: 89, cor: '#3f8f4a', cor2: '#63c46f', pontos: 660,  forma: 'melancia' },
];

export const MAX_TIER = FRUTAS.length - 1;

/** O que cai da mão: só as cinco menores, com peso — semente é a mais comum. */
export const SORTEIO = [
  { tier: 0, peso: 30 },
  { tier: 1, peso: 26 },
  { tier: 2, peso: 22 },
  { tier: 3, peso: 15 },
  { tier: 4, peso: 7 },
];

export function sortearTier(rng) {
  let total = 0;
  for (const s of SORTEIO) total += s.peso;
  let r = rng.next() * total;
  for (const s of SORTEIO) { r -= s.peso; if (r <= 0) return s.tier; }
  return 0;
}

export const MODOS = {
  pomar: {
    id: 'pomar', nome: 'Pomar', desc: 'A cesta enche. O tucano ajuda quando transborda.',
    alturaCesta: 560, linhaSol: 92, esperaTucano: 3.2, levaTucano: 2,
  },
  tranquilo: {
    id: 'tranquilo', nome: 'Tranquilo', desc: 'Cesta maior e tucano generoso. Sem pressa nenhuma.',
    alturaCesta: 680, linhaSol: 66, esperaTucano: 2.2, levaTucano: 3,
  },
};

// Bônus e regras diversas
export const REGRAS = {
  bonusBolo: 3000,        // duas melancias viram bolo de festa
  bonusPedido: 500,
  comboJanela: 1.15,      // segundos para uma fusão contar como sequência
  comboMax: 8,
  recargaChacoalho: 7.0,  // segundos
  forcaChacoalho: 260,
  pedidoMin: 3,
  pedidoMax: 8,
  regadorACada: 2,        // pedidos cumpridos por regador ganho
};

export const BICHINHOS = [
  { nome: 'Quati',    cor: '#c98a4b', cor2: '#f0c08a' },
  { nome: 'Sagui',    cor: '#8a7a5c', cor2: '#c8b490' },
  { nome: 'Capivara', cor: '#a3703f', cor2: '#d8a166' },
  { nome: 'Tatu',     cor: '#8c8378', cor2: '#c2b6a6' },
  { nome: 'Preguiça', cor: '#9a8f6d', cor2: '#cfc5a2' },
];
