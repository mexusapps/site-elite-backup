// ---------------------------------------------------------------------------
// run.mjs — escada de custo da verificação.
//
//   1. saúde em runtime      (o jogo abre e roda sem erro)
//   2. conformidade          (invariantes declarados nunca são violados)
//   3. determinismo          (mesma semente + mesmo input = mesma partida)
//   4. cobertura             (cada mecânica é exercitada e observada)
//   5. progressão            (dá para vencer o jogo inteiro)
//   6. desempenho            (orçamento de quadro)
//   7. capturas              (uma imagem por tela, para inspeção)
//
// Passes baratos e reversíveis primeiro; o caro só roda depois do portão.
// ---------------------------------------------------------------------------

import { openGame, runBot, scripted, hash } from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SHOTS = resolve(here, '../dist/shots');
mkdirSync(SHOTS, { recursive: true });

let pass = 0, fail = 0;
const failures = [];
const only = process.argv[2];

function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; failures.push(name + (detail ? ` — ${detail}` : '')); console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); }
}
function group(n) { console.log(`\n${n}`); }
const num = (v) => (typeof v === 'number' && Number.isFinite(v));

const t0 = Date.now();
const { browser, page, logs } = await openGame();

try {
  // === 1. saúde =============================================================
  group('1 · saúde em runtime');
  {
    const api = await page.evaluate(() => ({
      ready: window.__BRASA__.ready,
      version: window.__BRASA__.version,
      mode: window.__BRASA__.mode,
      ui: window.__BRASA__.ui(),
      canvas: !!document.getElementById('game').getContext('2d'),
    }));
    ok('API de depuração exposta', api.ready === true);
    ok('canvas 2d disponível', api.canvas);
    ok('abre no menu principal', api.mode === 'menu' && api.ui === 'title', `mode=${api.mode} ui=${api.ui}`);

    const idle = await page.evaluate(() => {
      const B = window.__BRASA__;
      B.settings.master = 0;
      B.startRun(7);
      for (let i = 0; i < 600; i++) B.step(1);
      return { snap: B.snapshot(), errors: B.errors };
    });
    ok('600 quadros sem exceção', idle.errors.length === 0, idle.errors.join(' | '));
    ok('simulação avançou', idle.snap.frame >= 600, 'frame=' + idle.snap.frame);
    ok('tempo avança', idle.snap.time > 9, 't=' + idle.snap.time);
    ok('chama decai sem agir', idle.snap.flame < 100, 'flame=' + idle.snap.flame);
  }

  // === 2. conformidade com a especificação ===================================
  group('2 · invariantes de jogabilidade');
  {
    const inv = await page.evaluate(() => {
      const B = window.__BRASA__;
      const w = B.world();
      B.settings.master = 0;
      B.startRun(4242);
      const viol = [];
      const check = (f) => {
        const p = w.player;
        if (!(p.flame >= -0.001 && p.flame <= p.maxFlame + 0.001)) viol.push(`chama fora da faixa f=${f} v=${p.flame}`);
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) viol.push(`posição NaN f=${f}`);
        if (p.x < -1 || p.y < -1 || p.x > w.arena.w + 1 || p.y > w.arena.h + 1) viol.push(`jogador fora da arena f=${f} ${p.x},${p.y}`);
        if (!Number.isFinite(p.vx) || !Number.isFinite(p.vy)) viol.push(`velocidade NaN f=${f}`);
        if (w.score < 0) viol.push('pontuação negativa');
        for (const e of w.enemies) {
          if (!Number.isFinite(e.x) || !Number.isFinite(e.y)) { viol.push(`inimigo NaN f=${f}`); break; }
          if (e.hp > e.maxHp + 0.001) { viol.push(`vida de inimigo acima do máximo f=${f}`); break; }
          if (e.x < -50 || e.y < -50 || e.x > w.arena.w + 50 || e.y > w.arena.h + 50) { viol.push(`inimigo fora da arena f=${f}`); break; }
        }
        if (w.pShots.n > w.pShots.max || w.eShots.n > w.eShots.max) viol.push('pool estourado');
        if (w.particles.n > w.particles.max) viol.push('partículas acima do teto');
      };
      // dirige aleatoriamente, mas com semente fixa, batendo em tudo
      let s = 99;
      const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
      for (let f = 0; f < 2400; f++) {
        if (B.mode === 'recompensa') { B.pick(0); continue; }
        if (f % 7 === 0) {
          for (const a of ['up', 'down', 'left', 'right']) rnd() < 0.4 ? B.press(a) : B.release(a);
          rnd() < 0.5 ? B.press('attack') : B.release('attack');
          rnd() < 0.2 ? B.press('shoot') : B.release('shoot');
          rnd() < 0.1 ? B.press('dash') : B.release('dash');
          B.aim(rnd() * 2 - 1, rnd() * 2 - 1);
        }
        B.step(1);
        if (f % 3 === 0) check(f);
        if (w.state === 'derrota') break;
      }
      return { viol, snap: B.snapshot(), errors: B.errors };
    });
    ok('nenhum invariante violado em 2400 quadros', inv.viol.length === 0, inv.viol.slice(0, 3).join(' | '));
    ok('sem exceções durante o caos', inv.errors.length === 0, inv.errors.join(' | '));
  }

  // === 3. determinismo ========================================================
  group('3 · determinismo');
  {
    const script = [
      ['right'], ['right', 'attack'], ['right'], ['down'], ['down', 'attack'],
      ['left'], ['left', 'shoot'], ['up'], ['up', 'dash'], [],
    ];
    const a = await scripted(page, { seed: 777, script, frames: 1500 });
    const b = await scripted(page, { seed: 777, script, frames: 1500 });
    const c = await scripted(page, { seed: 778, script, frames: 1500 });
    ok('mesma semente produz a mesma partida', hash(a.trace) === hash(b.trace),
      `${hash(a.trace)} vs ${hash(b.trace)}`);
    ok('semente diferente produz partida diferente', hash(a.trace) !== hash(c.trace));
    ok('sem exceções nas execuções roteirizadas', a.errors.length === 0 && c.errors.length === 0);
  }

  // === 4. cobertura de comportamento ==========================================
  group('4 · cobertura de mecânicas');
  {
    const r = await page.evaluate(() => {
      const B = window.__BRASA__;
      const w = B.world();
      const out = {};
      B.settings.master = 0;

      // golpe corpo a corpo mata
      B.startRun(11);
      w.pendingSpawns.length = 0;
      w.enemies.length = 0;
      const e = w.spawnEnemyAt('cinza', w.player.x + 40, w.player.y);
      e.spawnT = 0;
      const hp0 = e.hp;
      B.aim(1, 0);
      let embersNaMorte = 0;
      for (let i = 0; i < 90; i++) {
        if (i % 8 === 0) B.press('attack'); else B.release('attack');
        B.step(1);
        if (!e.alive && !embersNaMorte) embersNaMorte = w.embers.n;
      }
      out.meleeDano = hp0 - e.hp;
      out.meleeMatou = !e.alive;
      out.kills = w.stats.kills;

      // morte solta fagulhas (medido no quadro da morte) e fagulha devolve chama
      out.embersSpawn = embersNaMorte > 0;
      w.player.flame = 40;
      const f0 = w.player.flame;
      for (let i = 0; i < 180; i++) B.step(1);
      out.emberCura = w.stats.embers > 0;

      // disparo custa chama e causa dano
      B.startRun(12);
      w.pendingSpawns.length = 0; w.enemies.length = 0;
      w.arena.obstacles.length = 0;            // linha de tiro limpa
      const e2 = w.spawnEnemyAt('cinza', w.player.x + 260, w.player.y);
      e2.spawnT = 0; e2.speed = 0;
      const flameBefore = w.player.flame;
      const hpBefore = e2.hp;
      B.aim(1, 0);
      B.press('shoot'); B.step(1); B.release('shoot');
      for (let i = 0; i < 45; i++) B.step(1);
      out.tiroCustou = flameBefore - w.player.flame > 4;
      out.tiroAcertou = e2.hp < hpBefore;

      // avanço concede invulnerabilidade
      B.startRun(13);
      w.pendingSpawns.length = 0; w.enemies.length = 0;
      B.press('dash'); B.step(1); B.release('dash');
      out.dashIframes = w.player.iframes > 0;
      const flameDash = w.player.flame;
      const hurt = w.player.hurt(30, w, 0, 0);
      out.dashImune = hurt === false && Math.abs(w.player.flame - flameDash) < 0.001;

      // buffer de comando: apertar antes da janela ainda executa
      B.startRun(14);
      w.player.atkCd = 0.09;                 // ainda em recarga
      B.press('attack'); B.step(1); B.release('attack');
      let swung = false;
      for (let i = 0; i < 14; i++) { B.step(1); if (w.player.swing) swung = true; }
      out.bufferFunciona = swung;

      // Sopro aplica modificador
      B.startRun(15);
      const dmg0 = w.mods.damage;
      w.offers = [{ id: 'x_teste', name: 'teste', rarity: 'comum', max: 9, desc: '', apply: (m) => { m.damage *= 2; } }];
      w.state = 'recompensa';
      w.chooseUpgrade(0);
      out.soproAplicou = w.mods.damage === dmg0 * 2;
      out.soproAvancouOnda = w.wave === 2;

      // Carvão bloqueia pela frente
      B.startRun(16);
      w.pendingSpawns.length = 0; w.enemies.length = 0;
      const c = w.spawnEnemyAt('carvao', w.player.x + 200, w.player.y);
      c.spawnT = 0; c.speed = 0; c.facing = Math.PI;   // virado para o jogador
      const chp = c.hp;
      w.damageEnemy(c, 100, w.player.x, w.player.y, {});
      const frontal = chp - c.hp;
      c.hp = chp;
      w.damageEnemy(c, 100, c.x + 300, c.y, {});
      const traseiro = chp - c.hp;
      out.armaduraFuncional = frontal < traseiro * 0.7;

      // chefe aparece na onda 8 e morre
      B.startRun(17);
      B.skipToWave(8);
      for (let i = 0; i < 300; i++) B.step(1);
      out.bossExiste = !!(w.boss && w.boss.alive);
      out.bossNome = w.boss ? w.boss.name : null;
      out.bossFases = w.boss ? w.boss.def.phases.length : 0;
      if (w.boss) {
        // força as transições de fase para exercitar os três repertórios
        const fases = new Set();
        for (let i = 0; i < 900; i++) {
          B.damageBoss(6);
          B.step(1);
          if (w.boss.alive) fases.add(w.boss.phase);
          if (!w.boss.alive) break;
        }
        out.bossFasesVistas = fases.size;
        out.bossMorreu = !w.boss.alive;
      }
      return { out, errors: B.errors };
    });
    const o = r.out;
    ok('golpe causa dano', o.meleeDano > 0, 'dano=' + (o.meleeDano || 0).toFixed(1));
    ok('golpe mata o inimigo', o.meleeMatou === true);
    ok('morte solta fagulhas', o.embersSpawn === true);
    ok('fagulha é recolhida', o.emberCura === true);
    ok('disparo custa chama', o.tiroCustou === true);
    ok('disparo acerta à distância', o.tiroAcertou === true);
    ok('avanço concede invulnerabilidade', o.dashIframes === true);
    ok('invulnerável não perde chama', o.dashImune === true);
    ok('buffer de comando de 130 ms funciona', o.bufferFunciona === true);
    ok('Sopro altera os modificadores', o.soproAplicou === true);
    ok('escolher Sopro avança a onda', o.soproAvancouOnda === true);
    ok('armadura frontal do Carvão reduz dano', o.armaduraFuncional === true);
    ok('chefe nasce na onda 8', o.bossExiste === true, 'nome=' + o.bossNome);
    ok('chefe percorre as três fases', o.bossFasesVistas >= 3, 'fases=' + o.bossFasesVistas);
    ok('chefe pode ser derrotado', o.bossMorreu === true);
    ok('nenhuma exceção na cobertura', r.errors.length === 0, r.errors.join(' | '));

    // ---- input real, não injetado: teclado de verdade movendo o jogador ----
    await page.evaluate(() => {
      const B = window.__BRASA__;
      B.settings.master = 0;
      B.startRun(21);
      B.clearInput();
      B.setTestMode(false);          // volta ao laço normal, com rAF
      B.world().pendingSpawns.length = 0;
      B.world().enemies.length = 0;
    });
    const antes = await page.evaluate(() => window.__BRASA__.snapshot().px);
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(400);
    await page.keyboard.up('ArrowRight');
    const depois = await page.evaluate(() => window.__BRASA__.snapshot().px);
    ok('teclado real move o jogador', depois - antes > 40, `Δx=${(depois - antes).toFixed(1)}`);

    // ---- toque real: manche virtual e botões ----
    const toque = await page.evaluate(async () => {
      const B = window.__BRASA__;
      const g = window.__game;
      const cv = document.getElementById('game');
      const W = window.innerWidth, H = window.innerHeight;
      const ev = (type, id, x, y) => cv.dispatchEvent(new PointerEvent(type, {
        pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, cancelable: true,
      }));
      B.startRun(22);
      B.world().pendingSpawns.length = 0;
      B.world().enemies.length = 0;
      const x0 = B.snapshot().px;
      ev('pointerdown', 1, 140, H - 140);
      window.dispatchEvent(new PointerEvent('pointermove', {
        pointerId: 1, pointerType: 'touch', clientX: 260, clientY: H - 140, bubbles: true,
      }));
      await new Promise((r) => setTimeout(r, 420));
      window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, pointerType: 'touch', bubbles: true }));
      const x1 = B.snapshot().px;

      // botão de golpe
      const l = g.input.touchLayout(W, H);
      ev('pointerdown', 2, l.attack.x, l.attack.y);
      await new Promise((r) => setTimeout(r, 120));
      const golpeou = g.input.isDown('attack');
      window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 2, pointerType: 'touch', bubbles: true }));
      await new Promise((r) => setTimeout(r, 60));
      return { modo: g.input.touchMode, dx: x1 - x0, golpeou, soltou: !g.input.isDown('attack') };
    });
    ok('toque ativa os controles na tela', toque.modo === true);
    ok('manche virtual move o jogador', toque.dx > 30, `Δx=${toque.dx.toFixed(1)}`);
    ok('botão de golpe registra e solta', toque.golpeou && toque.soltou);
    await page.evaluate(() => { window.__BRASA__.setTestMode(true); window.__game.input.touchMode = false; });
  }

  // === 5. progressão ==========================================================
  group('5 · progressão completa');
  {
    // linha de base: a política monótona precisa dar conta das primeiras ondas
    const mono = await runBot(page, { seed: 2026, frames: 5400, policy: 'monotona' });
    ok('política monótona sobrevive à onda 1', mono.final.wave >= 2 || mono.final.state === 'vitoria',
      `onda=${mono.final.wave} estado=${mono.final.state}`);
    ok('política monótona mata inimigos', mono.stats.kills > 5, 'kills=' + mono.stats.kills);

    const explor = await runBot(page, { seed: 2026, frames: 9000, policy: 'exploratoria' });
    ok('política exploratória avança pelo menos até a onda 5',
      explor.final.wave >= 5, `onda=${explor.final.wave} estado=${explor.final.state}`);
    ok('política exploratória vai além da monótona',
      explor.final.wave > mono.final.wave, `expl=${explor.final.wave} mono=${mono.final.wave}`);
    ok('bot recebe Sopros', explor.picks >= 4, 'sopros=' + explor.picks);
    ok('todas as ações são exercitadas',
      explor.stats.dashes > 0 && explor.stats.shots > 0 && explor.stats.kills > 30,
      `avanços=${explor.stats.dashes} tiros=${explor.stats.shots} mortes=${explor.stats.kills}`);
    ok('a economia de chama se sustenta', explor.stats.embers > explor.stats.shots,
      `fagulhas=${explor.stats.embers} tiros=${explor.stats.shots}`);
    ok('sem exceções nas partidas do bot', explor.errors.length === 0, explor.errors.join(' | '));
    console.log(`    exploratória: onda ${explor.final.wave} · ${explor.stats.kills} mortes · ${Math.round(explor.final.time)}s · ${explor.final.score} pts`);

    // A prova que importa: vencer jogando de verdade, sem trapaça nenhuma —
    // só input pelo mesmo caminho do jogador humano.
    const legit = await runBot(page, { seed: 606, frames: 40000, policy: 'exploratoria', assist: true });
    ok('o jogo é vencível jogando de verdade (sem trapaça)',
      legit.final.state === 'vitoria',
      `onda=${legit.final.wave} estado=${legit.final.state} t=${Math.round(legit.final.time)}s`);
    ok('a partida completa dura entre 3 e 8 minutos',
      legit.final.time > 170 && legit.final.time < 480, `${Math.round(legit.final.time)}s`);
    console.log(`    vitória legítima: ${Math.round(legit.final.time)}s · ${legit.stats.kills} mortes · ${legit.picks} Sopros · ${legit.final.score} pts`);

    // o jogo tem fim: com assistência e tempo, a vitória é alcançável
    const win = await page.evaluate(() => {
      const B = window.__BRASA__;
      const w = B.world();
      B.settings.master = 0;
      B.startRun(31337);
      B.settings.assist = true;
      let guard = 0;
      // percorre as 15 ondas limpando cada uma, exercitando a máquina de estados
      while (guard++ < 200) {
        if (B.mode === 'recompensa') { B.pick(0); continue; }
        if (w.state === 'vitoria' || w.state === 'derrota') break;
        w.player.flame = w.player.maxFlame;
        for (let i = 0; i < 200; i++) { B.step(1); if (B.mode === 'recompensa') break; }
        if (B.mode === 'recompensa') continue;
        B.killAll();
        for (let i = 0; i < 30; i++) B.step(1);
      }
      return { state: w.state, wave: w.wave, mode: B.mode, ui: B.ui(), score: w.score, errors: B.errors };
    });
    ok('as 15 ondas são completáveis', win.state === 'vitoria', `estado=${win.state} onda=${win.wave}`);
    ok('vitória mostra a tela final', win.ui === 'victory', 'ui=' + win.ui);
    ok('pontuação registrada', win.score > 0, 'score=' + win.score);
    ok('sem exceções na progressão', win.errors.length === 0, win.errors.join(' | '));

    // derrota também tem que funcionar
    const lose = await page.evaluate(() => {
      const B = window.__BRASA__;
      const w = B.world();
      B.startRun(555);
      w.mods.revive = 0;
      w.player.flame = 1;
      for (let i = 0; i < 240; i++) { B.step(1); if (w.state === 'derrota') break; }
      return { state: w.state, ui: B.ui(), mode: B.mode };
    });
    ok('chama zerada leva à derrota', lose.state === 'derrota');
    ok('derrota mostra a tela final', lose.ui === 'gameover', 'ui=' + lose.ui);
  }

  // === 6. desempenho ==========================================================
  group('6 · orçamento de quadro');
  {
    const perf = await page.evaluate(() => {
      const B = window.__BRASA__;
      const w = B.world();
      B.startRun(999);
      B.skipToWave(14);              // a onda mais cheia do jogo
      for (let i = 0; i < 260; i++) B.step(1);
      const before = performance.now();
      for (let i = 0; i < 600; i++) B.step(1);
      const ms = (performance.now() - before) / 600;
      return { ms, enemies: w.enemies.length, bullets: w.eShots.n + w.pShots.n, particles: w.particles.n };
    });
    ok('simulação abaixo de 4 ms por quadro em carga alta', perf.ms < 4,
      `${perf.ms.toFixed(2)} ms · ${perf.enemies} inimigos · ${perf.bullets} projéteis · ${perf.particles} partículas`);
    console.log(`    ${perf.ms.toFixed(2)} ms/quadro · ${perf.enemies} inimigos · ${perf.bullets} projéteis · ${perf.particles} partículas`);
  }

  // === 7. capturas ============================================================
  group('7 · capturas de tela');
  {
    const shots = [
      ['01-titulo', async () => { await page.evaluate(() => window.__BRASA__.click('menu')); }],
      ['02-como-jogar', async () => { await page.evaluate(() => window.__BRASA__.click('howto')); }],
      ['03-opcoes', async () => { await page.evaluate(() => { window.__BRASA__.click('menu'); window.__BRASA__.click('options'); }); }],
      ['04-jogo-onda3', async () => {
        await page.evaluate(() => {
          const B = window.__BRASA__, w = B.world();
          B.settings.master = 0;
          B.startRun(2468); B.skipToWave(3);
          for (let i = 0; i < 260; i++) B.step(1);
          // avança até um quadro sem clarão de dano, senão a captura mente
          for (let i = 0; i < 40 && w.player.hurtFlash > 0.02; i++) B.step(1);
        });
      }],
      ['05-sopros', async () => {
        await page.evaluate(() => {
          const B = window.__BRASA__, w = B.world();
          B.startRun(1357);
          w.pendingSpawns.length = 0; w.enemies.length = 0;
          for (let i = 0; i < 90; i++) B.step(1);
        });
      }],
      ['06-chefe-vigia', async () => {
        await page.evaluate(() => {
          const B = window.__BRASA__;
          B.startRun(8642); B.skipToWave(8);
          for (let i = 0; i < 420; i++) B.step(1);
        });
      }],
      ['07-chefe-noite', async () => {
        await page.evaluate(() => {
          const B = window.__BRASA__;
          B.startRun(1111); B.skipToWave(15);
          for (let i = 0; i < 520; i++) B.step(1);
        });
      }],
      ['08-chama-baixa', async () => {
        await page.evaluate(() => {
          const B = window.__BRASA__, w = B.world();
          B.startRun(2222); B.skipToWave(6);
          for (let i = 0; i < 200; i++) B.step(1);
          w.player.flame = w.player.maxFlame * 0.15;
          for (let i = 0; i < 20; i++) B.step(1);
        });
      }],
    ];
    for (const [name, setup] of shots) {
      await setup();
      await page.waitForTimeout(180);        // deixa dois quadros renderizarem
      await page.screenshot({ path: resolve(SHOTS, name + '.png') });
    }
    ok(`${shots.length} capturas geradas`, true);
  }

  // erros de console acumulados durante a sessão inteira
  group('console');
  ok('nenhum erro de console', logs.length === 0, logs.slice(0, 3).join(' | '));

} finally {
  await browser.close();
}

const secs = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n${'─'.repeat(56)}`);
console.log(`${pass} passaram · ${fail} falharam · ${secs}s`);
if (fail) {
  console.log('\nfalhas:');
  for (const f of failures) console.log('  · ' + f);
  process.exit(1);
}
