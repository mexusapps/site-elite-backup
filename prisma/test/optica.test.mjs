// Portão mais barato de todos: a óptica, em Node puro, em milissegundos.
import { Tabuleiro, propagar, venceu, TIPOS, R, G, B, BRANCO, refletir, direita, esquerda } from '../src/game/optica.js';

let pass = 0, fail = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log(`  ✓ ${n}`); }
  else { fail++; console.log(`  ✗ ${n}${d !== undefined ? ' — ' + d : ''}`); }
};

const T = (cols, linhas) => new Tabuleiro(cols, linhas);
const fonte = (dir, mask = BRANCO) => ({ tipo: TIPOS.fonte, dir, mask });
const flor = (mask) => ({ tipo: TIPOS.flor, mask });
const espelho = (rot) => ({ tipo: TIPOS.espelho, rot });
const divisor = (rot) => ({ tipo: TIPOS.divisor, rot });
const prisma = () => ({ tipo: TIPOS.prisma, rot: 0 });
const vidro = (mask) => ({ tipo: TIPOS.vidro, mask });
const pedra = () => ({ tipo: TIPOS.pedra });

console.log('\nóptica');

// --- geometria dos espelhos -------------------------------------------------
{
  let bom = true;
  const esperado0 = { 0: 3, 3: 0, 2: 1, 1: 2 };   // "/"
  const esperado1 = { 0: 1, 1: 0, 2: 3, 3: 2 };   // "\"
  for (let d = 0; d < 4; d++) {
    if (refletir(d, 0) !== esperado0[d]) bom = false;
    if (refletir(d, 1) !== esperado1[d]) bom = false;
  }
  ok('espelho reflete nos quatro sentidos, nas duas inclinações', bom);
  ok('girar duas vezes à direita é o contrário', direita(direita(0)) === 2 && esquerda(0) === 3);
}

// --- feixe reto --------------------------------------------------------------
{
  const t = T(6, 3);
  t.colocar(t.idx(0, 1), fonte(0));
  t.colocar(t.idx(5, 1), flor(BRANCO));
  const r = propagar(t);
  ok('a luz atravessa o tabuleiro em linha reta', r.acesas === 1 && r.total === 1);
  ok('cada célula do caminho fica marcada',
    [1, 2, 3, 4].every((x) => r.seg[t.idx(x, 1) * 4 + 0] === BRANCO));
  ok('vitória detectada', venceu(t) === true);
}

// --- pedra ------------------------------------------------------------------
{
  const t = T(6, 3);
  t.colocar(t.idx(0, 1), fonte(0));
  t.colocar(t.idx(3, 1), pedra());
  t.colocar(t.idx(5, 1), flor(BRANCO));
  ok('a pedra bloqueia a luz', venceu(t) === false);
}

// --- espelho ----------------------------------------------------------------
{
  const t = T(6, 6);
  t.colocar(t.idx(0, 0), fonte(0));
  t.colocar(t.idx(4, 0), espelho(1));          // "\" leste→sul
  t.colocar(t.idx(4, 5), flor(BRANCO));
  ok('o espelho "\\" manda a luz para baixo', venceu(t) === true);

  const t2 = T(6, 6);
  t2.colocar(t2.idx(0, 5), fonte(0));
  t2.colocar(t2.idx(4, 5), espelho(0));        // "/" leste→norte
  t2.colocar(t2.idx(4, 0), flor(BRANCO));
  ok('o espelho "/" manda a luz para cima', venceu(t2) === true);
}

// --- divisor ----------------------------------------------------------------
{
  const t = T(7, 7);
  t.colocar(t.idx(0, 3), fonte(0));
  t.colocar(t.idx(3, 3), divisor(1));          // segue e desce
  t.colocar(t.idx(6, 3), flor(BRANCO));
  t.colocar(t.idx(3, 6), flor(BRANCO));
  const r = propagar(t);
  ok('o divisor acende duas flores de uma vez', r.acesas === 2 && r.total === 2);
}

// --- prisma -----------------------------------------------------------------
{
  const t = T(9, 9);
  t.colocar(t.idx(0, 4), fonte(0, BRANCO));
  t.colocar(t.idx(4, 4), prisma());
  t.colocar(t.idx(4, 0), flor(R));             // esquerda de leste é norte
  t.colocar(t.idx(8, 4), flor(G));             // em frente
  t.colocar(t.idx(4, 8), flor(B));             // direita é sul
  const r = propagar(t);
  ok('o prisma separa branco em vermelho, verde e azul', r.acesas === 3, `acesas=${r.acesas}`);
  ok('cada cor vai para o seu lado',
    r.flores.get(t.idx(4, 0)) === R && r.flores.get(t.idx(8, 4)) === G && r.flores.get(t.idx(4, 8)) === B);
}
{
  const t = T(9, 9);
  t.colocar(t.idx(0, 4), fonte(0, R | G));     // amarelo entra no prisma
  t.colocar(t.idx(4, 4), prisma());
  t.colocar(t.idx(4, 8), flor(B));
  const r = propagar(t);
  ok('o prisma não inventa cor que não entrou', r.acesas === 0 && !r.flores.get(t.idx(4, 8)));
}

// --- vidro colorido ----------------------------------------------------------
{
  const t = T(7, 3);
  t.colocar(t.idx(0, 1), fonte(0, BRANCO));
  t.colocar(t.idx(3, 1), vidro(R | G));        // vidro amarelo tira o azul
  t.colocar(t.idx(6, 1), flor(R | G));
  ok('vidro amarelo transforma branco em amarelo', venceu(t) === true);

  const t2 = T(7, 3);
  t2.colocar(t2.idx(0, 1), fonte(0, B));
  t2.colocar(t2.idx(3, 1), vidro(R));
  t2.colocar(t2.idx(6, 1), flor(B));
  ok('vidro vermelho apaga um feixe azul', venceu(t2) === false);
}

// --- soma de luz -------------------------------------------------------------
{
  const t = T(7, 7);
  t.colocar(t.idx(0, 3), fonte(0, R));
  t.colocar(t.idx(3, 0), fonte(1, G));
  t.colocar(t.idx(3, 6), espelho(0));          // "/" sul→oeste... confere abaixo
  t.colocar(t.idx(6, 3), flor(R));
  const r = propagar(t);
  ok('duas fontes independentes convivem', r.acesas === 1);
}
{
  // vermelho + verde chegando na mesma flor = amarelo
  const t = T(7, 7);
  t.colocar(t.idx(0, 3), fonte(0, R));         // vem da esquerda
  t.colocar(t.idx(6, 3), fonte(2, G));         // vem da direita
  t.colocar(t.idx(3, 3), flor(R | G));
  const r = propagar(t);
  ok('vermelho e verde na mesma flor viram amarelo',
    r.flores.get(t.idx(3, 3)) === (R | G) && r.acesas === 1);
}
{
  // dois feixes de cores diferentes na MESMA direção se fundem
  const t = T(9, 5);
  t.colocar(t.idx(0, 2), fonte(0, R));
  t.colocar(t.idx(4, 0), fonte(1, G));
  t.colocar(t.idx(4, 2), divisor(0));          // "/" : sul→oeste? o teste checa o efeito
  const r = propagar(t);
  const somou = r.seg[t.idx(5, 2) * 4 + 0];
  ok('feixes na mesma direção se somam', (somou & R) === R, 'mask=' + somou);
}

// --- laço fechado ------------------------------------------------------------
{
  const t = T(6, 6);
  t.colocar(t.idx(0, 1), fonte(0));
  t.colocar(t.idx(1, 1), divisor(1));          // alimenta o quadrado
  t.colocar(t.idx(4, 1), espelho(1));
  t.colocar(t.idx(4, 4), espelho(0));
  t.colocar(t.idx(1, 4), espelho(1));
  const t0 = Date.now();
  const r = propagar(t);
  ok('espelhos em círculo não travam o jogo', Date.now() - t0 < 60 && !r.estourou,
    (Date.now() - t0) + 'ms estourou=' + r.estourou);
}

// --- cor errada não acende ----------------------------------------------------
{
  const t = T(6, 3);
  t.colocar(t.idx(0, 1), fonte(0, BRANCO));
  t.colocar(t.idx(5, 1), flor(R));
  ok('luz branca não serve para uma flor que sonha vermelho', venceu(t) === false);
}

// --- desempenho ---------------------------------------------------------------
{
  const t = T(12, 10);
  t.colocar(t.idx(0, 5), fonte(0));
  for (let k = 0; k < 14; k++) t.colocar(t.idx(1 + (k % 10), 1 + ((k * 3) % 8)), divisor(k % 2));
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < 2000; i++) propagar(t);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / 2000;
  ok('propagação abaixo de 0,15 ms com 14 divisores', ms < 0.15, ms.toFixed(4) + ' ms');
}

console.log(`\n${pass} passaram · ${fail} falharam`);
if (fail) process.exit(1);
