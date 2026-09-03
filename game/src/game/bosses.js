// ---------------------------------------------------------------------------
// bosses.js — O VIGIA (onda 8) e A NOITE (onda 15).
//
// Todo ataque tem telegrafia visível antes do dano. A regra: o jogador precisa
// poder ler o que vem e reagir; morrer tem que ser culpa de leitura, não de
// informação escondida. Cada fase muda o repertório, não só os números.
// ---------------------------------------------------------------------------

import { clamp, damp, TAU, lerp } from '../core/math.js';
import { BOSSES, SCALE } from './balance.js';
import { P_SPARK, P_SMOKE, P_RING } from '../core/fx.js';
import { makeEnemy } from './entities.js';

let BOSS_ID = 90000;

export function makeBoss(kind, w) {
  const d = BOSSES[kind];
  const hp = d.hp * (w.assist ? 0.78 : 1);
  return {
    id: BOSS_ID++,
    boss: true, kind, def: { ...d, mass: 12, touch: true },
    name: d.name, title: d.title,
    x: w.arena.w / 2, y: 180,
    vx: 0, vy: 0,
    radius: d.radius,
    hp, maxHp: hp,
    damage: d.contactDamage,
    speed: d.speed,
    alive: true,
    facing: Math.PI / 2,
    phase: 0, phaseCount: d.phases.length,
    state: 'entrada', t: 0, cd: 2.2,
    actIndex: 0,
    hitFlash: 0, sx: 1, sy: 1,
    slowT: 0, slowAmt: 0, burnT: 0, burnDps: 0,
    spawnT: 0,
    kbx: 0, kby: 0,
    invuln: 2.0,
    angle: 0,
    scoreValue: 1200,
    telegraph: 0,
    telegraphKind: '',
    ring: 0,
  };
}

function fireRing(w, b, n, speed, dmg, offset, radius) {
  for (let i = 0; i < n; i++) {
    const a = offset + (TAU * i) / n;
    w.fireBossShot(b, Math.cos(a), Math.sin(a), speed, dmg, radius || 9);
  }
  w.audio.play('shoot');
}

function aimAt(b, w) {
  const dx = w.player.x - b.x, dy = w.player.y - b.y;
  const m = Math.hypot(dx, dy) || 1;
  return { x: dx / m, y: dy / m, d: m };
}

// ---------------------------------------------------------------------------
export function updateBoss(b, dt, w) {
  b.t += dt;
  if (b.hitFlash > 0) b.hitFlash -= dt * 4;
  b.sx = damp(b.sx, 1, 10, dt);
  b.sy = damp(b.sy, 1, 10, dt);
  if (b.invuln > 0) b.invuln -= dt;
  if (b.telegraph > 0) b.telegraph -= dt;
  if (b.burnT > 0) {
    b.burnT -= dt;
    w.damageEnemy(b, b.burnDps * dt, b.x, b.y, { silent: true, noStop: true, burn: true });
    if (!b.alive) return;
  }
  let slow = 1;
  if (b.slowT > 0) { b.slowT -= dt; slow = 1 - b.slowAmt; }

  const aim = aimAt(b, w);
  b.facing = Math.atan2(aim.y, aim.x);
  b.angle += dt * (0.6 + b.phase * 0.35);

  // transição de fase
  const pct = b.hp / b.maxHp;
  const thresholds = b.def.phases;
  let want = 0;
  for (let i = 0; i < thresholds.length; i++) if (pct <= thresholds[i]) want = i;
  if (want > b.phase) {
    b.phase = want;
    b.state = 'transicao'; b.t = 0; b.cd = 1.6; b.invuln = 1.4;
    w.bossPhaseShift(b);
  }

  const fn = b.kind === 'vigia' ? vigia : noite;
  fn(b, dt, w, aim, slow);

  b.x += (b.vx * slow + b.kbx) * dt;
  b.y += (b.vy * slow + b.kby) * dt;
  const kf = Math.pow(0.9, dt * 60);
  b.kbx *= kf; b.kby *= kf;
  w.collideArena(b, false);

  // contato
  const p = w.player;
  const rr = b.radius + p.radius;
  const dx = p.x - b.x, dy = p.y - b.y;
  if (dx * dx + dy * dy < rr * rr && b.state !== 'entrada') {
    if (p.hurt(b.damage, w, b.x, b.y)) {
      const m = Math.hypot(dx, dy) || 1;
      p.vx += (dx / m) * 300; p.vy += (dy / m) * 300;
    }
  }
}

// --- O VIGIA ----------------------------------------------------------------
// Fase 1: barragem radial e investida. Fase 2: espiral e invocação.
// Fase 3: espiral dupla contínua, mais rápido, e invocações maiores.
function vigia(b, dt, w, aim, slow) {
  const S = b.speed * slow;
  switch (b.state) {
    case 'entrada': {
      b.vx = damp(b.vx, 0, 4, dt);
      b.vy = damp(b.vy, 60, 4, dt);
      b.sx = 1 + Math.sin(b.t * 5) * 0.05;
      if (b.t > 2.0) { b.state = 'perseguir'; b.t = 0; b.cd = 1.0; }
      break;
    }
    case 'transicao': {
      b.vx = damp(b.vx, 0, 8, dt); b.vy = damp(b.vy, 0, 8, dt);
      if (b.t > 1.5) { b.state = 'perseguir'; b.t = 0; b.cd = 0.7; }
      break;
    }
    case 'perseguir': {
      const want = 250;
      const push = aim.d > want ? 1 : -0.5;
      b.vx = damp(b.vx, aim.x * S * push, 2.2, dt);
      b.vy = damp(b.vy, aim.y * S * push, 2.2, dt);
      b.cd -= dt;
      if (b.cd <= 0) {
        const acts = b.phase === 0 ? ['barragem', 'investida']
          : b.phase === 1 ? ['barragem', 'investida', 'espiral', 'invocar']
            : ['espiral', 'investida', 'barragem', 'invocar', 'espiral'];
        b.state = acts[b.actIndex % acts.length];
        b.actIndex++;
        b.t = 0; b.ring = 0;
        b.telegraph = 0.55; b.telegraphKind = b.state;
        if (b.state === 'investida') { b.chargeX = aim.x; b.chargeY = aim.y; }
        w.audio.play('ui', { strong: true });
      }
      break;
    }
    case 'barragem': {
      b.vx = damp(b.vx, 0, 7, dt); b.vy = damp(b.vy, 0, 7, dt);
      if (b.t > 0.55 && b.ring < 3) {
        const step = 0.55 + b.ring * 0.34;
        if (b.t >= step) {
          b.ring++;
          const n = 12 + b.phase * 4;
          fireRing(w, b, n, 190 + b.phase * 30, 12 * SCALE.dmg(w.wave), b.ring * 0.26);
          b.sx = 1.2; b.sy = 0.84;
          w.camera.shake(0.14);
        }
      }
      if (b.t > 1.9) { b.state = 'perseguir'; b.cd = 1.15 - b.phase * 0.22; b.t = 0; }
      break;
    }
    case 'investida': {
      if (b.t < 0.55) {
        b.vx = damp(b.vx, -b.chargeX * 90, 6, dt);
        b.vy = damp(b.vy, -b.chargeY * 90, 6, dt);
        b.sx = 1 - 0.16 * (b.t / 0.55); b.sy = 1 + 0.2 * (b.t / 0.55);
      } else if (b.t < 1.15) {
        const cs = 720 + b.phase * 130;
        b.vx = b.chargeX * cs; b.vy = b.chargeY * cs;
        if (w.rng.chance(dt * 30)) {
          w.particles.spawn(P_SPARK, b.x + w.rng.range(-30, 30), b.y + w.rng.range(-30, 30),
            0, 0, 0.3, 4, w.pal.flame, { drag: 0.9 });
        }
      } else {
        b.vx = damp(b.vx, 0, 6, dt); b.vy = damp(b.vy, 0, 6, dt);
        if (b.t > 1.6) { b.state = 'perseguir'; b.cd = 1.0 - b.phase * 0.2; b.t = 0; }
      }
      break;
    }
    case 'espiral': {
      b.vx = damp(b.vx, aim.x * S * 0.4, 2, dt);
      b.vy = damp(b.vy, aim.y * S * 0.4, 2, dt);
      if (b.t > 0.5) {
        b.spiralCd = (b.spiralCd || 0) - dt;
        if (b.spiralCd <= 0) {
          b.spiralCd = 0.085;
          const arms = b.phase >= 2 ? 3 : 2;
          for (let k = 0; k < arms; k++) {
            const a = b.angle * 2.4 + (TAU * k) / arms;
            w.fireBossShot(b, Math.cos(a), Math.sin(a), 230, 10 * SCALE.dmg(w.wave), 8);
          }
        }
      }
      if (b.t > (b.phase >= 2 ? 3.2 : 2.4)) { b.state = 'perseguir'; b.cd = 1.1 - b.phase * 0.2; b.t = 0; }
      break;
    }
    case 'invocar': {
      b.vx = damp(b.vx, 0, 8, dt); b.vy = damp(b.vy, 0, 8, dt);
      if (b.t > 0.6 && !b.summoned) {
        b.summoned = true;
        const n = b.phase >= 2 ? 5 : 3;
        for (let i = 0; i < n; i++) {
          const a = (TAU * i) / n + w.rng.angle();
          const r = b.radius + 70;
          w.spawnEnemyAt('cinza', b.x + Math.cos(a) * r, b.y + Math.sin(a) * r);
        }
        w.audio.play('boss');
        w.camera.shake(0.3);
        w.particles.ring(b.x, b.y, 20, 200, w.pal.accent, 0.55);
      }
      if (b.t > 1.5) { b.summoned = false; b.state = 'perseguir'; b.cd = 1.0; b.t = 0; }
      break;
    }
  }
}

// --- A NOITE -----------------------------------------------------------------
// Chefe final: teleporte, paredes de projéteis, pulso de escuridão que acelera
// o apagar da chama, e invocações de Véu na última fase.
function noite(b, dt, w, aim, slow) {
  const S = b.speed * slow;
  switch (b.state) {
    case 'entrada': {
      b.vy = damp(b.vy, 70, 4, dt);
      b.sx = 1 + Math.sin(b.t * 4) * 0.06;
      w.darknessBoost = lerp(0, 0.35, clamp(b.t / 2.5, 0, 1));
      if (b.t > 2.4) { b.state = 'perseguir'; b.t = 0; b.cd = 0.9; }
      break;
    }
    case 'transicao': {
      b.vx = damp(b.vx, 0, 8, dt); b.vy = damp(b.vy, 0, 8, dt);
      w.darknessBoost = 0.35 + b.phase * 0.12;
      if (b.t > 1.5) { b.state = 'perseguir'; b.t = 0; b.cd = 0.6; }
      break;
    }
    case 'perseguir': {
      const want = 230;
      const push = aim.d > want ? 1 : -0.6;
      b.vx = damp(b.vx, aim.x * S * push, 2.6, dt);
      b.vy = damp(b.vy, aim.y * S * push, 2.6, dt);
      b.cd -= dt;
      if (b.cd <= 0) {
        const acts = b.phase === 0 ? ['espiral', 'parede', 'investida']
          : b.phase === 1 ? ['parede', 'teleporte', 'espiral', 'pulso', 'investida']
            : ['teleporte', 'parede', 'espiral', 'pulso', 'invocar', 'investida'];
        b.state = acts[b.actIndex % acts.length];
        b.actIndex++;
        b.t = 0; b.ring = 0; b.summoned = false;
        b.telegraph = 0.5; b.telegraphKind = b.state;
        if (b.state === 'investida') { b.chargeX = aim.x; b.chargeY = aim.y; }
        w.audio.play('ui', { strong: true });
      }
      break;
    }
    case 'espiral': {
      b.vx = damp(b.vx, -aim.x * S * 0.3, 2, dt);
      b.vy = damp(b.vy, -aim.y * S * 0.3, 2, dt);
      b.spiralCd = (b.spiralCd || 0) - dt;
      if (b.t > 0.5 && b.spiralCd <= 0) {
        b.spiralCd = 0.07;
        const arms = 3 + b.phase;
        for (let k = 0; k < arms; k++) {
          const a = -b.angle * 2.9 + (TAU * k) / arms;
          w.fireBossShot(b, Math.cos(a), Math.sin(a), 245, 11 * SCALE.dmg(w.wave), 8);
        }
      }
      if (b.t > 3.0) { b.state = 'perseguir'; b.cd = 0.9 - b.phase * 0.18; b.t = 0; }
      break;
    }
    case 'parede': {
      b.vx = damp(b.vx, 0, 7, dt); b.vy = damp(b.vy, 0, 7, dt);
      if (b.t > 0.5 && b.ring < 3) {
        const step = 0.5 + b.ring * 0.42;
        if (b.t >= step) {
          b.ring++;
          // anel com brecha: existe sempre uma saída, mas ela se move
          const n = 20 + b.phase * 4;
          const gap = w.rng.int(0, n - 1);
          const gapW = 2;
          for (let i = 0; i < n; i++) {
            if (Math.abs(i - gap) <= gapW || Math.abs(i - gap) >= n - gapW) continue;
            const a = (TAU * i) / n;
            w.fireBossShot(b, Math.cos(a), Math.sin(a), 175, 12 * SCALE.dmg(w.wave), 9);
          }
          w.audio.play('shoot');
          w.camera.shake(0.12);
        }
      }
      if (b.t > 2.2) { b.state = 'perseguir'; b.cd = 1.0 - b.phase * 0.2; b.t = 0; }
      break;
    }
    case 'teleporte': {
      if (b.t < 0.5) {
        b.sx = damp(b.sx, 0.2, 8, dt); b.sy = damp(b.sy, 1.6, 8, dt);
      } else if (!b.ported) {
        b.ported = true;
        w.particles.burst(b.x, b.y, 26, '#7a4bd8', 300, 0.6, 4);
        const a = w.rng.angle();
        const r = 250;
        b.x = clamp(w.player.x + Math.cos(a) * r, 120, w.arena.w - 120);
        b.y = clamp(w.player.y + Math.sin(a) * r, 120, w.arena.h - 120);
        b.sx = 1.7; b.sy = 0.4;
        w.particles.burst(b.x, b.y, 30, '#a06bff', 340, 0.7, 4.4);
        w.particles.ring(b.x, b.y, 12, 160, '#a06bff', 0.5);
        w.audio.play('explode');
        fireRing(w, b, 10 + b.phase * 4, 210, 11 * SCALE.dmg(w.wave), w.rng.angle());
      } else if (b.t > 1.2) {
        b.ported = false; b.state = 'perseguir'; b.cd = 0.7; b.t = 0;
      }
      break;
    }
    case 'pulso': {
      b.vx = damp(b.vx, 0, 8, dt); b.vy = damp(b.vy, 0, 8, dt);
      if (b.t > 0.7 && !b.pulsed) {
        b.pulsed = true;
        w.darkPulse = 2.4;
        w.particles.ring(b.x, b.y, 30, 620, '#5b2f9e', 0.9);
        w.camera.shake(0.5);
        w.audio.play('boss');
        w.flash.hit(0.28, '#3a1a6b');
      }
      if (b.t > 2.0) { b.pulsed = false; b.state = 'perseguir'; b.cd = 0.9; b.t = 0; }
      break;
    }
    case 'invocar': {
      b.vx = damp(b.vx, 0, 8, dt); b.vy = damp(b.vy, 0, 8, dt);
      if (b.t > 0.6 && !b.summoned) {
        b.summoned = true;
        for (let i = 0; i < 3; i++) {
          const a = (TAU * i) / 3 + w.rng.angle();
          w.spawnEnemyAt(i === 0 ? 'veu' : 'fagulha', b.x + Math.cos(a) * 110, b.y + Math.sin(a) * 110);
        }
        w.audio.play('boss');
        w.particles.ring(b.x, b.y, 20, 220, '#a06bff', 0.6);
      }
      if (b.t > 1.5) { b.summoned = false; b.state = 'perseguir'; b.cd = 0.8; b.t = 0; }
      break;
    }
    case 'investida': {
      if (b.t < 0.5) {
        b.vx = damp(b.vx, -b.chargeX * 110, 6, dt);
        b.vy = damp(b.vy, -b.chargeY * 110, 6, dt);
      } else if (b.t < 1.05) {
        const cs = 780 + b.phase * 140;
        b.vx = b.chargeX * cs; b.vy = b.chargeY * cs;
        if (w.rng.chance(dt * 26)) {
          w.particles.spawn(P_SMOKE, b.x + w.rng.range(-36, 36), b.y + w.rng.range(-36, 36),
            0, 0, 0.6, 16, '#3a2060', { r2: 34, drag: 0.95 });
        }
      } else {
        b.vx = damp(b.vx, 0, 6, dt); b.vy = damp(b.vy, 0, 6, dt);
        if (b.t > 1.5) { b.state = 'perseguir'; b.cd = 0.8; b.t = 0; }
      }
      break;
    }
  }
}
