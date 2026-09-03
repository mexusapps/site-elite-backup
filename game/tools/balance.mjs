// Telemetria de balanceamento: roda o bot em várias sementes e reporta até
// onde cada partida chegou. É assim que se ajusta dificuldade sem chutar.
import { openGame, runBot } from '../test/harness.mjs';

const seeds = [11, 202, 3003, 40404, 55555, 606, 7777, 88];
const modo = process.argv[2] === 'assist';
const { browser, page } = await openGame();
const linhas = [];
for (const seed of seeds) {
  const r = await runBot(page, { seed, frames: 40000, policy: 'exploratoria', assist: modo });
  linhas.push({
    seed, onda: r.final.wave, estado: r.final.state, t: Math.round(r.final.time),
    kills: r.stats.kills, score: r.final.score, sopros: r.picks,
    dano: Math.round(r.stats.damageTaken),
  });
  console.log(`semente ${String(seed).padStart(5)} · onda ${String(r.final.wave).padStart(2)}/15 · ${r.final.state.padEnd(8)} · ${String(Math.round(r.final.time)).padStart(3)}s · ${String(r.stats.kills).padStart(3)} mortes · ${r.final.score} pts`);
}
await browser.close();
const ondas = linhas.map((l) => l.onda).sort((a, b) => a - b);
const med = ondas[Math.floor(ondas.length / 2)];
const vit = linhas.filter((l) => l.estado === 'vitoria').length;
console.log(`\n${modo ? 'assistido' : 'padrão'} · onda mediana ${med} · min ${ondas[0]} · max ${ondas[ondas.length - 1]} · vitórias ${vit}/${seeds.length}`);
