// Portão barato: a física é testada em Node puro, sem navegador. Se a pilha
// não assenta aqui, não adianta desenhar nada em cima dela.
import { World, Body } from '../src/game/physics.js';
import { Rng } from '../src/core/rng.js';

let pass = 0, fail = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log(`  ✓ ${n}`); }
  else { fail++; console.log(`  ✗ ${n}${d ? ' — ' + d : ''}`); }
};
const DT = 1 / 60;
const BOUNDS = { x: 0, y: 0, w: 420, h: 620 };

function encher(seed, n, passos) {
  const w = new World({ ...BOUNDS });
  const rng = new Rng(seed);
  let dropped = 0;
  for (let f = 0; f < passos; f++) {
    if (dropped < n && f % 22 === 0) {
      const r = 14 + rng.int(0, 4) * 7;
      w.add(new Body(rng.range(r + 4, BOUNDS.w - r - 4), 40, r, rng.int(0, 4)));
      w.wakeAll();
      dropped++;
    }
    w.step(DT);
  }
  return w;
}

console.log('\nfísica');
{
  // 1. um corpo cai e para
  const w = new World({ ...BOUNDS });
  const b = w.add(new Body(210, 60, 24, 0));
  for (let i = 0; i < 240; i++) w.step(DT);
  ok('corpo solto assenta no fundo', Math.abs(b.y - (BOUNDS.h - 24)) < 1.5, 'y=' + b.y.toFixed(2));
  ok('corpo em repouso adormece', b.asleep === true);
  ok('energia vai a zero', w.energy() < 0.001, 'E=' + w.energy().toFixed(4));
}
{
  // 2. pilha grande estabiliza
  // 40 corpos é a carga real do jogo: acima disso a cesta transborda de
  // propósito e o jogo tira frutas de lá.
  const w = encher(7, 40, 2400);
  const vmax = Math.max(...w.bodies.map((b) => b.speed));
  ok('40 corpos: pilha assenta (nada se mexendo)', vmax < 12, 'vmax=' + vmax.toFixed(2));
  ok('40 corpos: todos dentro da cesta',
    w.bodies.every((b) => b.x - b.r > -1 && b.x + b.r < BOUNDS.w + 1 && b.y + b.r < BOUNDS.h + 1),
    'fora=' + w.bodies.filter((b) => b.y + b.r > BOUNDS.h + 1).length);
  ok('40 corpos: nenhum NaN', w.bodies.every((b) => Number.isFinite(b.x) && Number.isFinite(b.y)));
  ok('40 corpos: quase tudo dormindo',
    w.bodies.filter((b) => !b.asleep).length <= 2,
    'acordados=' + w.bodies.filter((b) => !b.asleep).length);

  // penetração residual pequena: sem isso as frutas "afundam" umas nas outras
  let pior = 0;
  for (let i = 0; i < w.bodies.length; i++) {
    for (let j = i + 1; j < w.bodies.length; j++) {
      const a = w.bodies[i], b = w.bodies[j];
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      pior = Math.max(pior, a.r + b.r - d);
    }
  }
  ok('penetração residual abaixo de 1 px', pior < 1.0, 'pior=' + pior.toFixed(2));
}
{
  // 3. determinismo
  const a = encher(99, 40, 1500);
  const b = encher(99, 40, 1500);
  const iguais = a.bodies.length === b.bodies.length &&
    a.bodies.every((x, i) => Math.abs(x.x - b.bodies[i].x) < 1e-9 && Math.abs(x.y - b.bodies[i].y) < 1e-9);
  ok('mesma semente produz a mesma pilha', iguais);
  const c = encher(100, 40, 1500);
  const dif = c.bodies.some((x, i) => Math.abs(x.x - a.bodies[i].x) > 0.01);
  ok('semente diferente produz pilha diferente', dif);
}
{
  // 4. nada escapa mesmo em alta velocidade
  const w = new World({ ...BOUNDS });
  const b = w.add(new Body(210, 300, 18, 0));
  b.vx = 2400; b.vy = 2400;
  let fora = false;
  for (let i = 0; i < 600; i++) {
    w.step(DT);
    if (b.x < -2 || b.x > BOUNDS.w + 2 || b.y > BOUNDS.h + 2) fora = true;
  }
  ok('corpo veloz não atravessa a parede', !fora, `x=${b.x.toFixed(1)} y=${b.y.toFixed(1)}`);
}
{
  // 5. desempenho com a cesta cheia
  const w = encher(5, 90, 3000);
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < 600; i++) w.step(DT);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / 600;
  ok('abaixo de 1,5 ms por quadro com 90 corpos', ms < 1.5, ms.toFixed(3) + ' ms');
  console.log(`    ${w.bodies.length} corpos · ${ms.toFixed(3)} ms/quadro · ${w.pairs.length / 2} pares`);
}
console.log(`\n${pass} passaram · ${fail} falharam`);
if (fail) process.exit(1);
