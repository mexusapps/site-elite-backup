// Solucionador e gerador — o segundo portão barato, ainda sem navegador.
import { Tabuleiro, propagar, venceu, TIPOS, R, G, B, BRANCO } from '../src/game/optica.js';
import { resolver, montar } from '../src/game/solver.js';
import { gerarFase, desserializar } from '../src/game/gerador.js';
import { Rng } from '../src/core/rng.js';

let pass = 0, fail = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log(`  ✓ ${n}`); }
  else { fail++; console.log(`  ✗ ${n}${d !== undefined ? ' — ' + d : ''}`); }
};

console.log('\nsolucionador');
{
  // um espelho resolve: fonte vai para leste, flor está ao sul
  const t = new Tabuleiro(6, 6);
  t.colocar(t.idx(0, 1), { tipo: TIPOS.fonte, dir: 0, mask: BRANCO });
  t.colocar(t.idx(4, 5), { tipo: TIPOS.flor, mask: BRANCO });
  const r = resolver(t, [{ tipo: TIPOS.espelho }]);
  ok('acha a solução de um espelho', r.resolvido && r.movimentos === 1,
    `resolvido=${r.resolvido} mov=${r.movimentos}`);
  ok('a solução devolvida realmente funciona', (() => {
    const t2 = t.clonar();
    for (const p of r.solucao) t2.colocar(p.cel, montar(p));
    return venceu(t2);
  })());
  ok('a peça vai para o cruzamento certo', r.solucao[0] && r.solucao[0].cel === t.idx(4, 1),
    r.solucao[0] && r.solucao[0].cel);
}
{
  // sem peça suficiente não há solução
  const t = new Tabuleiro(6, 6);
  t.colocar(t.idx(0, 1), { tipo: TIPOS.fonte, dir: 0, mask: BRANCO });
  t.colocar(t.idx(4, 5), { tipo: TIPOS.flor, mask: BRANCO });
  const r = resolver(t, [{ tipo: TIPOS.vidro, mask: R }]);
  ok('diz honestamente quando não tem solução', r.resolvido === false);
}
{
  // dois espelhos, e o mínimo tem que ser 2
  const t = new Tabuleiro(7, 7);
  t.colocar(t.idx(0, 0), { tipo: TIPOS.fonte, dir: 0, mask: BRANCO });
  t.colocar(t.idx(0, 6), { tipo: TIPOS.flor, mask: BRANCO });
  const r = resolver(t, [{ tipo: TIPOS.espelho }, { tipo: TIPOS.espelho }, { tipo: TIPOS.espelho }]);
  ok('acha caminho com dois espelhos', r.resolvido && r.movimentos === 2, 'mov=' + r.movimentos);
}
{
  // precisa filtrar a cor
  const t = new Tabuleiro(8, 3);
  t.colocar(t.idx(0, 1), { tipo: TIPOS.fonte, dir: 0, mask: BRANCO });
  t.colocar(t.idx(7, 1), { tipo: TIPOS.flor, mask: R });
  const r = resolver(t, [{ tipo: TIPOS.vidro, mask: R }, { tipo: TIPOS.vidro, mask: B }]);
  ok('escolhe o vidro certo entre dois', r.resolvido && r.movimentos === 1 && r.solucao[0].mask === R,
    JSON.stringify(r.solucao[0]));
}

console.log('\ngerador');
{
  const rng = new Rng(12345);
  const cfg = {
    cols: 8, linhas: 7, maxPecas: 3, minPecas: 2, minFlores: 1, maxFlores: 3,
    pedras: 3, tipos: [TIPOS.espelho, TIPOS.divisor, TIPOS.vidro],
    minMovimentos: 2, maxMovimentos: 4, fonteBranca: true,
  };
  let feitos = 0, somaMov = 0, somaNos = 0;
  const t0 = Date.now();
  for (let k = 0; k < 12; k++) {
    const f = gerarFase(rng, cfg);
    if (!f) continue;
    feitos++; somaMov += f.movimentos; somaNos += f.nos;
    // cada fase gerada é conferida de novo, do zero
    const tab = desserializar(f);
    const r = resolver(tab, f.bandeja, { maxNos: 80000 });
    if (!r.resolvido || r.movimentos !== f.movimentos) { feitos = -999; break; }
  }
  const ms = (Date.now() - t0) / Math.max(1, feitos);
  ok('gera fases de verdade', feitos >= 10, 'geradas=' + feitos);
  ok('toda fase gerada é confirmada solúvel e com o mesmo mínimo', feitos > 0);
  ok('dificuldade fica dentro da faixa pedida', somaMov / Math.max(1, feitos) >= 2);
  ok('gerar uma fase custa menos de 400 ms', ms < 400, ms.toFixed(0) + ' ms');
  console.log(`    ${feitos} fases · ${(somaMov / Math.max(1, feitos)).toFixed(1)} movimentos em média · ${Math.round(somaNos / Math.max(1, feitos))} nós por busca · ${ms.toFixed(0)} ms cada`);
}
{
  // determinismo do gerador
  const cfg = {
    cols: 8, linhas: 7, maxPecas: 4, minPecas: 2, minFlores: 1, maxFlores: 3,
    pedras: 2, tipos: [TIPOS.espelho, TIPOS.prisma, TIPOS.vidro],
    minMovimentos: 2, fonteBranca: true,
  };
  const a = gerarFase(new Rng(777), cfg);
  const b = gerarFase(new Rng(777), cfg);
  ok('mesma semente gera a mesma fase', JSON.stringify(a) === JSON.stringify(b));
}
console.log(`\n${pass} passaram · ${fail} falharam`);
if (fail) process.exit(1);
