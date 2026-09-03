// ---------------------------------------------------------------------------
// harness.mjs — o agente que joga o jogo.
//
// Ideia central: um agente que escreve código de jogo mas nunca executa o jogo
// produz código plausível e jogabilidade ruim. Aqui o loop é fechado: o
// navegador roda a simulação em passo fixo, o bot injeta input pelo MESMO
// caminho do input humano, e o estado volta como JSON estruturado.
//
// Nada de "tirar print e olhar": as afirmações são sobre números.
// ---------------------------------------------------------------------------

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
export const PAGE = 'file://' + resolve(here, '../dist/brasa.html');
const CHROME = '/opt/pw-browsers/chromium';

export async function openGame({ headless = true, width = 1280, height = 720 } = {}) {
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--mute-audio',
      '--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage({ viewport: { width, height } });
  const logs = [];
  const ignora = (t) => /fonts\.(googleapis|gstatic)\.com/.test(t)
    || /Failed to load resource/.test(t)          // fonte remota: o sandbox de teste é offline
    || /AudioContext/.test(t);                     // política de autoplay do headless
  page.on('console', (m) => { if (m.type() === 'error' && !ignora(m.text())) logs.push(m.text()); });
  page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
  await page.goto(PAGE, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__BRASA__ && window.__BRASA__.ready, null, { timeout: 15000 });
  await page.evaluate(() => window.__BRASA__.setTestMode(true));
  return { browser, page, logs };
}

/**
 * Roda o bot dentro da página (uma única chamada por lote — atravessar a ponte
 * a cada quadro custaria mais que a simulação inteira).
 *
 * policy:
 *   'monotona'     — só anda para o inimigo mais próximo e golpeia. É a linha
 *                    de base: se ela não vence a onda 1, o jogo está quebrado.
 *   'exploratoria' — usa avanço, disparo e recuo. Exercita mais do sistema.
 *   'parada'       — não faz nada. Serve para medir o decaimento da chama.
 */
export async function runBot(page, {
  seed = 12345, frames = 3600, policy = 'exploratoria',
  assist = false, autoPick = true, startWave = 1, sampleEvery = 0, stopOnEnd = true,
} = {}) {
  return page.evaluate(async (cfg) => {
    const B = window.__BRASA__;
    const SIMDT = 1 / 60;
    B.setTestMode(true);
    B.clearInput();
    B.settings.assist = cfg.assist;
    B.settings.master = 0;                 // testes rodam mudos
    B.startRun(cfg.seed);
    if (cfg.startWave > 1) B.skipToWave(cfg.startWave);

    const held = new Set();
    const hold = (a, on) => {
      if (on && !held.has(a)) { held.add(a); B.press(a); }
      else if (!on && held.has(a)) { held.delete(a); B.release(a); }
    };

    const samples = [];
    const events = [];
    let picks = 0;
    let lastWave = 1;
    let atkPhase = 0;
    let t0 = performance.now();

    for (let f = 0; f < cfg.frames; f++) {
      const w = B.world();
      const p = w.player;

      // ---- escolha automática de Sopro -----------------------------------
      if (B.mode === 'recompensa') {
        if (!cfg.autoPick) break;
        // política determinística: sempre a primeira carta
        const ok = B.pick(0);
        picks++;
        events.push({ f, type: 'sopro', wave: w.wave, ok });
        continue;
      }
      if (B.mode === 'fim' || (cfg.stopOnEnd && (w.state === 'derrota' || w.state === 'vitoria'))) {
        events.push({ f, type: w.state, wave: w.wave, score: w.score });
        break;
      }
      if (w.wave !== lastWave) { events.push({ f, type: 'onda', wave: w.wave }); lastWave = w.wave; }

      // ---- percepção: alvo mais próximo -----------------------------------
      let best = null, bd = Infinity;
      for (const e of w.enemies) {
        if (!e.alive || e.spawnT > 0) continue;
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < bd) { bd = d; best = e; }
      }
      if (w.boss && w.boss.alive) {
        const d = Math.hypot(w.boss.x - p.x, w.boss.y - p.y);
        if (d < bd * 1.35) { bd = d; best = w.boss; }
      }

      // ---- ameaças: repulsão somada de tudo que vem na direção do jogador ---
      let danger = null, dd = Infinity, fugaX = 0, fugaY = 0, perto = 0;
      for (let i = 0; i < w.eShots.n; i++) {
        const b = w.eShots.a[i];
        if (!b.alive) continue;
        const dx = p.x - b.x, dy = p.y - b.y;
        const d = Math.hypot(dx, dy);
        if (d < dd) { dd = d; danger = b; }
        if (d < 190) {
          // só conta o que está de fato vindo na direção do jogador
          const aproxima = (b.vx * -dx + b.vy * -dy) > 0;
          if (aproxima) {
            const peso = (190 - d) / 190;
            fugaX += (dx / (d || 1)) * peso;
            fugaY += (dy / (d || 1)) * peso;
            perto++;
          }
        }
      }

      // ---- fagulha mais próxima -------------------------------------------
      let ember = null, ed = Infinity;
      for (let i = 0; i < w.embers.n; i++) {
        const e = w.embers.a[i];
        if (!e.alive) continue;
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < ed) { ed = d; ember = e; }
      }

      let tx = 0, ty = 0;
      const flamePct = p.flame / p.maxFlame;

      if (best) {
        const dx = best.x - p.x, dy = best.y - p.y;
        const m = Math.hypot(dx, dy) || 1;
        B.aim(dx / m, dy / m);
        // corpo a corpo é de graça; disparo custa chama. O bot fecha distância.
        const want = cfg.policy === 'monotona' ? 26 : (best.boss ? 130 : 44);
        const err = bd - want;
        const gain = Math.abs(err) > 26 ? 1 : 0;      // banda morta: sem tremer
        tx = (dx / m) * Math.sign(err) * gain;
        ty = (dy / m) * Math.sign(err) * gain;
        if (cfg.policy !== 'monotona' && bd < want) {
          // orbita em vez de recuar em linha reta
          tx += (-dy / m) * 0.8; ty += (dx / m) * 0.8;
        }
      } else if (ember && ed < 520) {
        const dx = ember.x - p.x, dy = ember.y - p.y;
        const m = Math.hypot(dx, dy) || 1;
        tx = dx / m; ty = dy / m;
        B.aim(dx / m, dy / m);
      }

      // fagulha no caminho vale desvio quando a chama está baixa
      if (cfg.policy !== 'monotona' && ember && flamePct < 0.6 && ed < 260) {
        const dx = ember.x - p.x, dy = ember.y - p.y;
        const m = Math.hypot(dx, dy) || 1;
        tx += (dx / m) * 1.2; ty += (dy / m) * 1.2;
      }

      if (cfg.policy !== 'monotona' && perto) {
        const m = Math.hypot(fugaX, fugaY) || 1;
        const peso = Math.min(2.6, 0.9 + perto * 0.45);
        tx += (fugaX / m) * peso;
        ty += (fugaY / m) * peso;
      }

      const M = 110;
      if (p.x < M) tx += 1.5; if (p.x > w.arena.w - M) tx -= 1.5;
      if (p.y < M) ty += 1.5; if (p.y > w.arena.h - M) ty -= 1.5;

      hold('left', tx < -0.2); hold('right', tx > 0.2);
      hold('up', ty < -0.2); hold('down', ty > 0.2);

      atkPhase++;
      if (cfg.policy === 'parada') {
        for (const a of ['up', 'down', 'left', 'right']) hold(a, false);
        B.release('attack'); B.release('shoot'); B.release('dash');
      } else {
        const naJanela = best && bd < 88 * w.mods.meleeRange + (best.radius || 0);
        if (naJanela && atkPhase % 5 === 0) B.press('attack'); else B.release('attack');
        // disparo só para o que não dá para alcançar, e só com chama sobrando
        const vaiAtirar = cfg.policy === 'exploratoria' && best && !naJanela
          && bd < 560 && flamePct > 0.72 && atkPhase % 20 === 0;
        if (vaiAtirar) B.press('shoot'); else B.release('shoot');
        // avanço: escapa de projétil colado, ou fecha distância grande
        const escapar = (danger && dd < 82) || perto >= 3;
        const fechar = best && bd > 260 && bd < 620 && !danger;
        if (cfg.policy === 'exploratoria' && p.dashCharges > 0 && (escapar || (fechar && atkPhase % 40 === 0))) {
          B.press('dash');
        } else B.release('dash');
      }

      B.step(1);

      if (cfg.sampleEvery && f % cfg.sampleEvery === 0) samples.push(B.snapshot());
    }

    const w = B.world();
    return {
      final: B.snapshot(),
      mode: B.mode,
      picks,
      events,
      samples,
      errors: B.errors,
      msPerFrame: (performance.now() - t0) / cfg.frames,
      taken: Object.assign({}, w.taken),
      stats: Object.assign({}, w.stats),
    };
  }, { seed, frames, policy, assist, autoPick, startWave, sampleEvery, stopOnEnd });
}

/** Executa uma sequência fixa de comandos — usado nos testes determinísticos. */
export async function scripted(page, { seed, script, frames }) {
  return page.evaluate(async (cfg) => {
    const B = window.__BRASA__;
    B.setTestMode(true);
    B.clearInput();
    B.settings.master = 0;
    B.startRun(cfg.seed);
    const trace = [];
    for (let f = 0; f < cfg.frames; f++) {
      const cmd = cfg.script[f % cfg.script.length];
      for (const a of ['up', 'down', 'left', 'right', 'attack', 'shoot', 'dash']) {
        if (cmd.includes(a)) B.press(a); else B.release(a);
      }
      if (B.mode === 'recompensa') B.pick(0);
      B.step(1);
      if (f % 60 === 0) trace.push(B.snapshot());
    }
    return { trace, final: B.snapshot(), errors: B.errors };
  }, { seed, script, frames });
}

export function hash(obj) {
  const s = JSON.stringify(obj);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16);
}
