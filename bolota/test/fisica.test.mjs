// Portão mais barato: a física em Node puro. Se a Bolota não pousa direito
// aqui, não adianta desenhar floresta nenhuma em cima.
import { Corpo, Forma, caixa, quad, colina, passo, prever, GRAVIDADE } from '../src/game/fisica.js';

let pass = 0, fail = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log(`  ✓ ${n}`); }
  else { fail++; console.log(`  ✗ ${n}${d !== undefined ? ' — ' + d : ''}`); }
};
const DT = 1 / 60;
const rodar = (c, formas, n, o) => { for (let i = 0; i < n; i++) passo(c, formas, DT, o); };

console.log('\nfísica');
{
  const chao = [caixa(0, 500, 900, 200)];
  const c = new Corpo(200, 100, 18);
  rodar(c, chao, 200);
  ok('a Bolota cai e pousa no chão', Math.abs(c.y - (500 - 18)) < 1.2, 'y=' + c.y.toFixed(2));
  ok('fica de fato parada', c.velocidade < 0.001, 'v=' + c.velocidade.toFixed(4));
  ok('o jogo sabe que ela está no chão', c.noChao === true);
}
{
  // quique controlado: cai de alto e não volta mais alto do que caiu
  const chao = [caixa(0, 500, 900, 200, { quique: 0.35 })];
  const c = new Corpo(200, 100, 18);
  let maisAlto = 1e9;
  for (let i = 0; i < 400; i++) { passo(c, chao, DT); if (i > 60) maisAlto = Math.min(maisAlto, c.y); }
  ok('o quique nunca ganha energia', maisAlto > 150, 'topo=' + maisAlto.toFixed(0));
  ok('e acaba parando', c.velocidade < 1, 'v=' + c.velocidade.toFixed(3));
}
{
  // rampa dentro de uma bacia: a Bolota escorrega e assenta no ponto baixo
  const rampa = quad([100, 500], [700, 300], [700, 720], [100, 720], { atrito: 0.3 });
  const chao = caixa(-200, 700, 400, 200);
  const parede = caixa(-220, 0, 40, 900);
  const c = new Corpo(300, 200, 18);
  rodar(c, [rampa, chao, parede], 700);
  ok('desce a rampa sem atravessar o terreno', c.y < 730, 'y=' + c.y.toFixed(0));
  ok('escorrega ladeira abaixo, para a esquerda', c.x < 300, 'x=' + c.x.toFixed(0));
  ok('e termina parada em algum apoio', c.velocidade < 12 && c.noChao, `v=${c.velocidade.toFixed(1)} chao=${c.noChao}`);
}
{
  // atrito alto agarra, atrito baixo desliza — os números não podem estar invertidos
  const desliza = new Corpo(300, 470, 18);
  const agarra = new Corpo(300, 470, 18);
  const gelo = quad([100, 500], [700, 500], [700, 700], [100, 700], { atrito: 0.02 });
  const musgo = quad([100, 500], [700, 500], [700, 700], [100, 700], { atrito: 0.9 });
  desliza.vx = 600; agarra.vx = 600;
  rodar(desliza, [gelo], 60); rodar(agarra, [musgo], 60);
  ok('superfície lisa deixa deslizar mais que a áspera',
    (desliza.x - 300) > (agarra.x - 300) * 2.5,
    `gelo=${(desliza.x - 300).toFixed(0)} musgo=${(agarra.x - 300).toFixed(0)}`);
}
{
  // colina orgânica
  const m = colina(400, 400, 500, 160, 800, 12);
  const c = new Corpo(400, 100, 18);
  rodar(c, [m], 300);
  ok('pousa em cima da colina', c.y < 430 && c.y > 330, 'y=' + c.y.toFixed(0));
}
{
  // velocidade alta não atravessa parede fina
  const parede = [caixa(600, 0, 24, 800)];
  const c = new Corpo(100, 400, 18);
  c.vx = 4200; c.vy = 0;
  let passou = false;
  for (let i = 0; i < 120; i++) { passo(c, parede, DT, { gravidade: 0 }); if (c.x > 640) passou = true; }
  ok('salto forte não atravessa a parede', !passou, 'x=' + c.x.toFixed(0));
}
{
  // superfície que gruda para a Bolota se segurar
  const p = caixa(600, 0, 40, 600, { grude: true });
  const c = new Corpo(400, 300, 18);
  c.vx = 900;
  rodar(c, [p], 30, { gravidade: 0 });
  ok('parede com musgo não devolve a Bolota', c.vx < 60, 'vx=' + c.vx.toFixed(1));
}
{
  // determinismo
  const mundo = () => [caixa(0, 500, 900, 200), quad([300, 500], [520, 380], [520, 500], [300, 500])];
  const a = new Corpo(120, 80, 18); a.vx = 520; a.vy = -640;
  const b = new Corpo(120, 80, 18); b.vx = 520; b.vy = -640;
  rodar(a, mundo(), 260); rodar(b, mundo(), 260);
  ok('mesma jogada = mesma trajetória',
    Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9);
}
{
  // previsão da trajetória bate com o voo real
  const mundo = [caixa(0, 560, 1200, 200)];
  const pts = prever(150, 500, 600, -700, mundo, 18, 40, 1 / 40);
  const c = new Corpo(150, 500, 18); c.vx = 600; c.vy = -700;
  rodar(c, mundo, 40 * Math.round((1 / 40) / DT));
  const fimPrev = { x: pts[pts.length - 2], y: pts[pts.length - 1] };
  ok('a linha de mira acerta onde a Bolota vai cair',
    Math.abs(fimPrev.x - c.x) < 60, `prev=${fimPrev.x.toFixed(0)} real=${c.x.toFixed(0)}`);
}
{
  // desempenho com um cenário cheio
  const formas = [];
  for (let i = 0; i < 60; i++) formas.push(caixa(i * 70, 400 + (i % 5) * 40, 60, 40));
  const c = new Corpo(100, 100, 18); c.vx = 300;
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < 3000; i++) passo(c, formas, DT);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / 3000;
  ok('abaixo de 0,3 ms por quadro com 60 formas', ms < 0.3, ms.toFixed(4) + ' ms');
  console.log(`    ${formas.length} formas · ${ms.toFixed(4)} ms/quadro`);
}
console.log(`\n${pass} passaram · ${fail} falharam`);
if (fail) process.exit(1);
