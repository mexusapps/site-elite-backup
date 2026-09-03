// ---------------------------------------------------------------------------
// entities.js — jogador, inimigos, projéteis e fagulhas.
//
// A camada 1 e 2 do game feel moram aqui: aceleração e atrito do movimento,
// janelas de ataque, invulnerabilidade do avanço, esmagamento e estiramento.
// Nada de "responder no próximo quadro" — tudo resolve no mesmo passo em que
// o comando é lido.
// ---------------------------------------------------------------------------

import { clamp, lerp, damp, dist, dist2, TAU, inArc, angleDelta, easeOutCubic } from '../core/math.js';
import { PLAYER, ENEMIES, SCALE, ARENA } from './balance.js';
import { P_SPARK, P_SMOKE, P_TRAIL, P_SHARD } from '../core/fx.js';

// --- jogador ---------------------------------------------------------------
export class Player {
  constructor() { this.reset(); }

  reset(mods) {
    const m = mods || { maxFlame: 0, dashCharges: 0 };
    this.x = ARENA.w / 2; this.y = ARENA.h / 2;
    this.vx = 0; this.vy = 0;
    this.radius = PLAYER.radius;
    this.maxFlame = PLAYER.maxFlame + (m.maxFlame || 0);
    this.flame = Math.min(PLAYER.startFlame + (m.maxFlame || 0), this.maxFlame);
    this.facing = -Math.PI / 2;
    this.aimX = 0; this.aimY = -1;
    this.alive = true;

    this.dashCharges = PLAYER.dash.charges + (m.dashCharges || 0);
    this.dashMax = this.dashCharges;
    this.dashTimer = 0;         // recarga da próxima carga
    this.dashing = 0;           // tempo restante do avanço
    this.dashDirX = 0; this.dashDirY = 0;
    this.iframes = 0;

    this.atkCd = 0;
    this.swing = null;
    this.shotCd = 0;

    this.sx = 1; this.sy = 1;   // esmagamento e estiramento
    this.hurtFlash = 0;
    this.invuln = 0;
    this.moving = 0;
    this.orbAngle = 0;
    this.trailT = 0;
    this.kills = 0;
    this.dmgDealt = 0;
    this.revives = 0;
  }

  get alivePct() { return this.flame / this.maxFlame; }

  squash(sx, sy) { this.sx = sx; this.sy = sy; }

  /** Chama consumida/ganha passa sempre por aqui — um só lugar para clampar. */
  addFlame(v) {
    this.flame = clamp(this.flame + v, 0, this.maxFlame);
    return this.flame;
  }

  update(dt, w) {
    const mods = w.mods;
    const inp = w.input;

    // --- mira ------------------------------------------------------------
    const mv = w._tmpVec;
    inp.moveVector(mv);
    const aim = inp.updateAim(this.x, this.y, w.camera, mv.x, mv.y);
    this.aimX = aim.x; this.aimY = aim.y;
    if (this.dashing <= 0) this.facing = Math.atan2(this.aimY, this.aimX);

    // --- movimento --------------------------------------------------------
    if (this.dashing > 0) {
      this.dashing -= dt;
      const s = PLAYER.dash.speed;
      this.vx = this.dashDirX * s;
      this.vy = this.dashDirY * s;
      this.trailT -= dt;
      if (this.trailT <= 0) {
        this.trailT = 0.012;
        w.particles.spawn(P_TRAIL, this.x, this.y, 0, 0, 0.32, 13, w.pal.flame, { drag: 1 });
      }
      if (this.dashing <= 0) this.squash(0.86, 1.18);
    } else {
      const targetVx = mv.x * PLAYER.speed * mods.moveSpeed;
      const targetVy = mv.y * PLAYER.speed * mods.moveSpeed;
      const a = PLAYER.accel * dt;
      this.vx += clamp(targetVx - this.vx, -a, a);
      this.vy += clamp(targetVy - this.vy, -a, a);
      if (mv.x === 0 && mv.y === 0) {
        const f = Math.pow(PLAYER.friction, dt * 60);
        this.vx *= f; this.vy *= f;
      }
      this.moving = Math.hypot(mv.x, mv.y);
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    w.collideArena(this, true);

    // --- avanço (com buffer de comando) -----------------------------------
    if (this.dashTimer > 0) {
      this.dashTimer -= dt * (1 / mods.dashCooldown);
      if (this.dashTimer <= 0 && this.dashCharges < this.dashMax) {
        this.dashCharges++;
        if (this.dashCharges < this.dashMax) this.dashTimer = PLAYER.dash.cooldown;
      }
    }
    if (this.dashing <= 0 && this.dashCharges > 0 && inp.consume('dash')) {
      this.dashCharges--;
      if (this.dashTimer <= 0) this.dashTimer = PLAYER.dash.cooldown;
      this.dashing = PLAYER.dash.duration;
      this.iframes = PLAYER.dash.iframes * mods.dashIframes;
      let dx = mv.x, dy = mv.y;
      if (!dx && !dy) { dx = this.aimX; dy = this.aimY; }
      const m = Math.hypot(dx, dy) || 1;
      this.dashDirX = dx / m; this.dashDirY = dy / m;
      this.squash(1.35, 0.7);
      this.dashHits = new Set();
      w.stats.dashes++;
      w.audio.play('dash');
      w.particles.cone(this.x, this.y, Math.atan2(-this.dashDirY, -this.dashDirX), 0.6, 12, w.pal.flame, 260, 0.35, 3);
      w.camera.shake(0.09, this.dashDirX, this.dashDirY);
    }
    if (this.iframes > 0) this.iframes -= dt;

    // --- golpe -------------------------------------------------------------
    if (this.atkCd > 0) this.atkCd -= dt * mods.attackSpeed;
    if (this.atkCd <= 0 && !this.swing && inp.consume('attack')) {
      this.atkCd = PLAYER.melee.cooldown;
      this.swing = {
        t: 0,
        windup: PLAYER.melee.windup / mods.attackSpeed,
        active: PLAYER.melee.active / mods.attackSpeed,
        ang: this.facing,
        hits: new Set(),
        dir: (this._swap = !this._swap) ? 1 : -1,
      };
      w.audio.play('swing');
      this.squash(1.18, 0.86);
    }
    if (this.swing) {
      const s = this.swing;
      s.t += dt;
      if (s.t >= s.windup && s.t < s.windup + s.active) w.meleeHit(this, s);
      if (s.t >= s.windup + s.active + 0.06) this.swing = null;
    }

    // --- disparo -----------------------------------------------------------
    if (this.shotCd > 0) this.shotCd -= dt * mods.attackSpeed;
    if (this.shotCd <= 0 && inp.consume('shoot')) {
      const cost = PLAYER.shot.cost * mods.shotCost;
      if (this.flame > cost + 1) {
        this.shotCd = PLAYER.shot.cooldown;
        this.addFlame(-cost);
        w.firePlayerShot(this);
        this.squash(0.86, 1.14);
        this.vx -= this.aimX * 46; this.vy -= this.aimY * 46;   // recuo
      } else {
        w.audio.play('ui', {});
        w.text.add(this.x, this.y - 26, 'sem chama', w.pal.uiDim, 13);
      }
    }

    // --- decaimento ---------------------------------------------------------
    let decay = (PLAYER.decayBase + PLAYER.decayPerWave * (w.wave - 1)) * mods.decay;
    if (w.assist) decay *= w.assistCfg.decayMul;
    decay *= w.drainMul;                 // Véus aceleram o apagar
    this.addFlame(-decay * dt);
    if (this.flame <= 0) w.playerDied();

    // --- estados visuais ----------------------------------------------------
    this.sx = damp(this.sx, 1, 13, dt);
    this.sy = damp(this.sy, 1, 13, dt);
    if (this.invuln > 0) this.invuln -= dt;
    if (this.hurtFlash > 0) this.hurtFlash -= dt * 5.5;

    // --- satélites ----------------------------------------------------------
    this.orbAngle += dt * 2.3;
    if (mods.orbitals > 0) w.updateOrbitals(this, dt);
  }

  hurt(amount, w, srcX, srcY) {
    if (this.invuln > 0 || this.iframes > 0 || !this.alive) return false;
    let dmg = amount;
    if (w.assist) dmg *= w.assistCfg.damageTaken;
    this.addFlame(-dmg);
    this.invuln = PLAYER.invuln;
    this.hurtFlash = 1;
    this.squash(0.75, 1.3);
    w.audio.play('hurt');
    w.hitstop.hit(105);
    w.flash.hit(0.34, w.pal.danger);
    const dx = this.x - (srcX ?? this.x), dy = this.y - (srcY ?? this.y);
    w.camera.shake(0.42, dx, dy);
    const m = Math.hypot(dx, dy) || 1;
    this.vx += (dx / m) * 210; this.vy += (dy / m) * 210;
    w.particles.burst(this.x, this.y, 16, w.pal.danger, 260, 0.5, 3.4);
    w.text.add(this.x, this.y - 30, '-' + Math.round(dmg), w.pal.danger, 18);
    w.stats.damageTaken += dmg;
    if (this.flame <= 0) w.playerDied();
    return true;
  }
}

// --- inimigos ---------------------------------------------------------------
let ENEMY_ID = 1;

export function makeEnemy(type, x, y, wave, opt) {
  const d = ENEMIES[type];
  const hpScale = SCALE.hp(wave) * ((opt && opt.hpMul) || 1);
  return {
    id: ENEMY_ID++,
    type, def: d,
    x, y, vx: 0, vy: 0,
    radius: d.radius * ((opt && opt.sizeMul) || 1),
    hp: d.hp * hpScale, maxHp: d.hp * hpScale,
    damage: d.damage * SCALE.dmg(wave),
    speed: d.speed * SCALE.speed(wave),
    alive: true,
    facing: 0,
    state: 'idle',
    t: 0, cd: (opt && opt.cd) || 0,
    hitFlash: 0,
    sx: 1, sy: 1,
    slowT: 0, slowAmt: 0,
    burnT: 0, burnDps: 0,
    spawnT: 0.42,               // materialização: não nasce batendo
    kbx: 0, kby: 0,
    orbitDir: (opt && opt.orbitDir) || 1,
    boss: false,
    scoreValue: d.score,
  };
}

export function updateEnemy(e, dt, w) {
  const p = w.player;
  e.t += dt;
  if (e.hitFlash > 0) e.hitFlash -= dt * 4.2;
  e.sx = damp(e.sx, 1, 12, dt);
  e.sy = damp(e.sy, 1, 12, dt);

  if (e.spawnT > 0) {
    e.spawnT -= dt;
    e.sx = 0.4 + 0.6 * easeOutCubic(1 - e.spawnT / 0.42);
    e.sy = e.sx;
    return;
  }

  // queimadura e lentidão (efeitos de Sopros)
  if (e.burnT > 0) {
    e.burnT -= dt;
    w.damageEnemy(e, e.burnDps * dt, e.x, e.y, { silent: true, noStop: true, burn: true });
    if (!e.alive) return;
    if (w.rng.chance(dt * 6)) {
      w.particles.spawn(P_SPARK, e.x + w.rng.range(-8, 8), e.y + w.rng.range(-8, 8),
        0, -w.rng.range(20, 60), 0.4, 2.2, w.pal.flame, { drag: 0.95 });
    }
  }
  let slow = 1;
  if (e.slowT > 0) { e.slowT -= dt; slow = 1 - e.slowAmt; }

  const dx = p.x - e.x, dy = p.y - e.y;
  const d = Math.hypot(dx, dy) || 1;
  const nx = dx / d, ny = dy / d;
  e.facing = Math.atan2(dy, dx);

  const spd = e.speed * slow;

  switch (e.type) {
    case 'cinza': {
      e.vx = damp(e.vx, nx * spd, 5, dt);
      e.vy = damp(e.vy, ny * spd, 5, dt);
      break;
    }
    case 'fagulha': {
      const def = e.def;
      if (e.state === 'idle') {
        e.vx = damp(e.vx, nx * spd * 0.55, 4, dt);
        e.vy = damp(e.vy, ny * spd * 0.55, 4, dt);
        e.cd -= dt;
        if (e.cd <= 0 && d < 420) { e.state = 'telegraph'; e.t = 0; }
      } else if (e.state === 'telegraph') {
        e.vx = damp(e.vx, 0, 9, dt); e.vy = damp(e.vy, 0, 9, dt);
        e.lungeX = nx; e.lungeY = ny;
        if (e.t >= def.telegraph) {
          e.state = 'lunge'; e.t = 0;
          w.particles.cone(e.x, e.y, Math.atan2(-e.lungeY, -e.lungeX), 0.5, 8, e.pal2 || w.enemyColor(e, 1), 220, 0.3, 2.6);
        }
      } else if (e.state === 'lunge') {
        e.vx = e.lungeX * def.lungeSpeed * slow;
        e.vy = e.lungeY * def.lungeSpeed * slow;
        if (e.t >= def.lungeTime) { e.state = 'idle'; e.cd = def.lungeCd; e.t = 0; }
      }
      break;
    }
    case 'fumaca': {
      const def = e.def;
      const want = def.keepDist;
      const push = d < want - 40 ? -1 : d > want + 40 ? 1 : 0;
      e.vx = damp(e.vx, nx * spd * push, 3.4, dt);
      e.vy = damp(e.vy, ny * spd * push, 3.4, dt);
      // deriva lateral para não virar alvo parado
      e.vx += -ny * spd * 0.35 * e.orbitDir * dt * 6;
      e.vy += nx * spd * 0.35 * e.orbitDir * dt * 6;
      e.cd -= dt;
      if (e.cd <= 0 && d < 560) {
        e.cd = def.shootCd * w.rng.range(0.85, 1.15);
        w.fireEnemyShot(e, nx, ny, def.bulletSpeed, def.bulletDamage, def.bulletRadius);
        e.sx = 1.25; e.sy = 0.8;
      }
      break;
    }
    case 'carvao': {
      e.vx = damp(e.vx, nx * spd, 2.6, dt);
      e.vy = damp(e.vy, ny * spd, 2.6, dt);
      break;
    }
    case 'veu': {
      const def = e.def;
      const want = def.orbit;
      const radial = d > want ? 1 : -0.6;
      e.vx = damp(e.vx, (nx * radial - ny * e.orbitDir * 1.15) * spd, 3.2, dt);
      e.vy = damp(e.vy, (ny * radial + nx * e.orbitDir * 1.15) * spd, 3.2, dt);
      if (d < def.drainRadius) w.drainTick += def.drain;
      if (w.rng.chance(dt * 3)) {
        w.particles.spawn(P_SMOKE, e.x + w.rng.range(-14, 14), e.y + w.rng.range(-14, 14),
          0, -w.rng.range(6, 22), 1.1, 12, '#2b2450', { r2: 26, drag: 0.97 });
      }
      break;
    }
  }

  // Sem isto os inimigos empurram a cara contra os pilares para sempre e a
  // onda nunca acaba — o jogador fica sem nada para matar e apaga de fome.
  avoidObstacles(e, w);

  // empurrão acumulado (knockback) some rápido
  e.x += (e.vx + e.kbx) * dt;
  e.y += (e.vy + e.kby) * dt;
  const kf = Math.pow(0.86, dt * 60);
  e.kbx *= kf; e.kby *= kf;

  w.collideArena(e, true);
  trackStuck(e, dt, d, w);

  // dano por contato
  if (e.def.touch && dist2(e.x, e.y, p.x, p.y) < Math.pow(e.radius + p.radius, 2)) {
    if (p.hurt(e.damage, w, e.x, e.y)) {
      if (w.mods.thorns > 0) {
        w.damageEnemy(e, e.damage * w.mods.thorns, p.x, p.y, { noStop: true });
      }
      // separa os corpos para não travar um dentro do outro
      const sep = (e.radius + p.radius) - dist(e.x, e.y, p.x, p.y);
      e.x -= nx * sep; e.y -= ny * sep;
      e.kbx -= nx * 240; e.kby -= ny * 240;
    }
  }
}

/**
 * Desvio de obstáculo por sondagem à frente. Não é pathfinding — é o
 * suficiente para nenhum inimigo travar contra um pilar, que é o que
 * transforma uma onda numa espera pela própria morte.
 */
function avoidObstacles(e, w) {
  const speed = Math.hypot(e.vx, e.vy);
  if (speed < 8) return;
  const look = e.radius + 30;
  const nx = e.vx / speed, ny = e.vy / speed;
  if (!w.blocked(e.x + nx * look, e.y + ny * look, e.radius)) return;
  for (const ang of [0.55, -0.55, 1.1, -1.1, 1.7, -1.7, 2.4, -2.4]) {
    const c = Math.cos(ang), s = Math.sin(ang);
    const dx = nx * c - ny * s, dy = nx * s + ny * c;
    if (!w.blocked(e.x + dx * look, e.y + dy * look, e.radius)) {
      e.vx = dx * speed; e.vy = dy * speed;
      return;
    }
  }
  // cercado: recua
  e.vx = -nx * speed * 0.5; e.vy = -ny * speed * 0.5;
}

/**
 * Rede de segurança: se um inimigo longe do jogador não anda há três segundos,
 * ele foi reposicionado. Nenhuma onda pode ficar impossível de terminar.
 */
function trackStuck(e, dt, distToPlayer, w) {
  if (e.px === undefined) { e.px = e.x; e.py = e.y; e.stuckT = 0; return; }
  const moved = Math.hypot(e.x - e.px, e.y - e.py);
  e.px = e.x; e.py = e.y;
  const quer = e.speed * dt * 0.3;
  if (distToPlayer > 420 && moved < quer) e.stuckT += dt;
  else e.stuckT = 0;
  if (e.stuckT > 3) { e.stuckT = 0; w.repositionEnemy(e); }
}

/** Separação entre inimigos: evita a "bola de carne" que come o jogador. */
export function separate(list, dt) {
  const n = list.length;
  for (let i = 0; i < n; i++) {
    const a = list[i];
    if (!a.alive || a.spawnT > 0) continue;
    for (let j = i + 1; j < n; j++) {
      const b = list[j];
      if (!b.alive || b.spawnT > 0) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const rr = a.radius + b.radius;
      const d2 = dx * dx + dy * dy;
      if (d2 > rr * rr || d2 < 0.0001) continue;
      const d = Math.sqrt(d2);
      const push = (rr - d) * 0.5;
      const ux = dx / d, uy = dy / d;
      const ma = b.def ? (b.def.mass || 1) : 1;
      const mb = a.def ? (a.def.mass || 1) : 1;
      const tot = ma + mb;
      a.x -= ux * push * (ma / tot) * 1.6;
      a.y -= uy * push * (ma / tot) * 1.6;
      b.x += ux * push * (mb / tot) * 1.6;
      b.y += uy * push * (mb / tot) * 1.6;
    }
  }
}

// --- projéteis --------------------------------------------------------------
export function makeBulletPool(n) {
  const a = new Array(n);
  for (let i = 0; i < n; i++) {
    a[i] = { x: 0, y: 0, vx: 0, vy: 0, r: 4, life: 0, dmg: 0, alive: false, friendly: true, pierce: 0, hits: null, crit: false, trail: 0 };
  }
  return { a, n: 0, max: n };
}

export function spawnBullet(pool, x, y, vx, vy, r, dmg, life, friendly, opt) {
  let b;
  if (pool.n >= pool.max) {
    b = pool.a[0];                       // recicla o mais antigo
  } else {
    b = pool.a[pool.n++];
  }
  b.x = x; b.y = y; b.vx = vx; b.vy = vy;
  b.r = r; b.dmg = dmg; b.life = life; b.alive = true; b.friendly = friendly;
  b.pierce = (opt && opt.pierce) || 0;
  b.crit = !!(opt && opt.crit);
  b.hits = b.pierce > 0 ? new Set() : null;
  b.trail = 0;
  b.homing = (opt && opt.homing) || 0;
  return b;
}

export function compactPool(pool) {
  let k = 0;
  for (let i = 0; i < pool.n; i++) {
    if (pool.a[i].alive) {
      if (k !== i) { const t = pool.a[k]; pool.a[k] = pool.a[i]; pool.a[i] = t; }
      k++;
    }
  }
  pool.n = k;
}

// --- fagulhas (recuperação de chama) ----------------------------------------
export function makeEmberPool(n) {
  const a = new Array(n);
  for (let i = 0; i < n; i++) a[i] = { x: 0, y: 0, vx: 0, vy: 0, life: 0, alive: false, t: 0, value: 0 };
  return { a, n: 0, max: n };
}

export function spawnEmber(pool, x, y, vx, vy, value) {
  let e;
  if (pool.n >= pool.max) e = pool.a[0];
  else e = pool.a[pool.n++];
  e.x = x; e.y = y; e.vx = vx; e.vy = vy;
  e.life = 11; e.alive = true; e.t = 0; e.value = value;
  return e;
}
