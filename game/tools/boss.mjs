import { openGame, runBot } from '../test/harness.mjs';
const { browser, page } = await openGame();
for (const seed of [11, 202, 606]) {
  const r = await page.evaluate(async (seed) => {
    const B = window.__BRASA__; const w = B.world();
    B.settings.master = 0; B.startRun(seed); B.skipToWave(8);
    w.player.flame = w.player.maxFlame;
    // build médio de 7 Sopros
    w.mods.damage *= 1.5; w.mods.attackSpeed *= 1.16; w.mods.maxFlame += 16;
    w.player.maxFlame += 16; w.player.flame = w.player.maxFlame;
    const log = [];
    let atk = 0;
    for (let f = 0; f < 5400; f++) {
      const p = w.player, b = w.boss;
      if (!b) { B.step(1); continue; }
      if (!b.alive || w.state === 'derrota') { log.push({ f, fim: w.state, bossHp: Math.max(0, Math.round(b.hp)) }); break; }
      const dx = b.x - p.x, dy = b.y - p.y; const d = Math.hypot(dx, dy) || 1;
      B.aim(dx / d, dy / d);
      let tx = (dx / d) * (d > 120 ? 1 : -1), ty = (dy / d) * (d > 120 ? 1 : -1);
      let fx = 0, fy = 0, perto = 0;
      for (let i = 0; i < w.eShots.n; i++) {
        const s = w.eShots.a[i]; if (!s.alive) continue;
        const ex = p.x - s.x, ey = p.y - s.y; const ed = Math.hypot(ex, ey);
        if (ed < 200 && (s.vx * -ex + s.vy * -ey) > 0) { fx += ex / ed; fy += ey / ed; perto++; }
      }
      if (perto) { const m = Math.hypot(fx, fy) || 1; tx += (fx / m) * 2.2; ty += (fy / m) * 2.2; }
      const set = (a, on) => on ? B.press(a) : B.release(a);
      set('left', tx < -0.2); set('right', tx > 0.2); set('up', ty < -0.2); set('down', ty > 0.2);
      set('attack', d < 150 && (++atk % 5 === 0));
      set('dash', perto >= 2 && p.dashCharges > 0);
      B.step(1);
      if (f % 600 === 0) log.push({ f, flame: Math.round(p.flame), bossPct: Math.round(b.hp / b.maxHp * 100), embers: w.embers.n });
    }
    return { seed, log, estado: w.state, bossHp: w.boss ? Math.max(0, Math.round(w.boss.hp)) : null, viva: w.boss && w.boss.alive };
  }, seed);
  console.log(seed, JSON.stringify(r.log), r.estado, 'bossHp=' + r.bossHp);
}
await browser.close();
