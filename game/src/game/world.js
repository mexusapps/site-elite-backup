// ---------------------------------------------------------------------------
// world.js — a simulação. Passo fixo, determinística dada a semente e a
// sequência de input. Tudo que decide algo (dano, morte, onda, pontuação)
// passa por aqui, para que o harness de playtest tenha um único lugar de onde
// ler o estado e afirmar invariantes.
// ---------------------------------------------------------------------------

import { clamp, damp, dist, dist2, TAU, inArc, circleRect, lerp } from '../core/math.js';
import { Rng, visualRng } from '../core/rng.js';
import { Camera, HitStop, Particles, FloatingText, Flash, P_SPARK, P_SMOKE, P_TRAIL, P_SHARD } from '../core/fx.js';
import {
  Player, makeEnemy, updateEnemy, separate,
  makeBulletPool, spawnBullet, compactPool, makeEmberPool, spawnEmber,
} from './entities.js';
import { makeBoss, updateBoss } from './bosses.js';
import { newMods, offer, byId, UPGRADES } from './upgrades.js';
import {
  ARENA, PLAYER, ENEMIES, WAVES, BOSSES, SCALE, PALETTES, ENEMY_PALETTE,
  ASSIST, SCORE, TOTAL_WAVES, SIM_DT, ZOOM,
} from './balance.js';

export const RUN = {
  PREPARANDO: 'preparando',
  LUTANDO: 'lutando',
  RECOMPENSA: 'recompensa',
  VITORIA: 'vitoria',
  DERROTA: 'derrota',
};

export class World {
  constructor(input, audio, settings) {
    this.input = input;
    this.audio = audio;
    this.settings = settings;

    this.rng = new Rng(1);
    this.camera = new Camera();
    this.hitstop = new HitStop();
    this.particles = new Particles(1500);
    this.text = new FloatingText(110);
    this.flash = new Flash();

    this.player = new Player();
    this.enemies = [];
    this.boss = null;
    this.pShots = makeBulletPool(340);
    this.eShots = makeBulletPool(900);
    this.embers = makeEmberPool(420);
    this.orbitals = [];
    this.decals = [];

    this.arena = { w: ARENA.w, h: ARENA.h, obstacles: [] };
    this._tmpVec = { x: 0, y: 0 };
    this._hit = { nx: 0, ny: 0, depth: 0 };
    this.assistCfg = ASSIST;

    this.pal = PALETTES.padrao;
    this.paletteName = 'padrao';
    this.onEvent = () => {};
  }

  // ==========================================================================
  // ciclo de vida da partida
  // ==========================================================================
  start(seed, opts = {}) {
    this.seed = seed >>> 0;
    this.rng.seed(this.seed);
    // a fonte visual também é resemeada: sem isso o número de partículas vivas
    // difere entre duas partidas com a mesma semente e o teste de determinismo
    // acusa uma divergência que é só enfeite
    visualRng.seed(this.seed ^ 0x5bf03635);
    this.assist = !!opts.assist;
    this.mods = newMods();
    this.taken = Object.create(null);
    this.wave = 1;
    this.state = RUN.PREPARANDO;
    this.stateT = 0;
    this.time = 0;
    this.score = 0;
    this.frame = 0;
    this.refill = false;
    this.drainMul = 1;
    this.drainTick = 0;
    this.darknessBoost = 0;
    this.darkPulse = 0;
    this.offers = null;
    this.offerIndex = 0;
    this.lastBanner = null;
    this.bannerT = 0;
    this.pendingSpawns = [];
    this.spawnTimer = 0;
    this.enemies.length = 0;
    this.orbitals.length = 0;
    this.decals.length = 0;
    this.boss = null;
    this.pShots.n = 0; this.eShots.n = 0; this.embers.n = 0;
    for (const b of this.pShots.a) b.alive = false;
    for (const b of this.eShots.a) b.alive = false;
    for (const e of this.embers.a) e.alive = false;
    this.particles.clear();
    this.text.clear();
    this.hitstop.clear();
    this.stats = { kills: 0, damageTaken: 0, damageDealt: 0, embers: 0, dashes: 0, shots: 0, hits: 0, waves: 0 };
    this.lastProgress = 0;

    this.buildArena();
    this.player.reset(this.mods);
    this.player.x = this.arena.w / 2;
    this.player.y = this.arena.h / 2;
    this.camera.x = this.player.x;
    this.camera.y = this.player.y;
    this.camera.bounds = { x: 0, y: 0, w: this.arena.w, h: this.arena.h };
    this.camera.targetZoom = ZOOM.base;
    this.camera.zoom = ZOOM.base;
    this.applyPalette(this.settings.palette);
    this.beginWave(1);
    return this;
  }

  applyPalette(name) {
    this.pal = PALETTES[name] || PALETTES.padrao;
    this.paletteName = PALETTES[name] ? name : 'padrao';
  }

  enemyColor(e, idx) {
    const map = ENEMY_PALETTE[this.paletteName];
    if (map && map[e.type]) return map[e.type][idx];
    return idx === 0 ? e.def.color : e.def.accent;
  }

  /** Arena com pilares: cobertura contra projéteis e geometria para o avanço. */
  buildArena() {
    const obs = [];
    const W = this.arena.w, H = this.arena.h;
    const cx = W / 2, cy = H / 2;
    const cand = [
      { x: 200, y: 190, w: 104, h: 104 },
      { x: W - 304, y: 190, w: 104, h: 104 },
      { x: 200, y: H - 294, w: 104, h: 104 },
      { x: W - 304, y: H - 294, w: 104, h: 104 },
      { x: cx - 232, y: cy - 30, w: 66, h: 60 },
      { x: cx + 166, y: cy - 30, w: 66, h: 60 },
      { x: cx - 33, y: 250, w: 66, h: 160 },
      { x: cx - 33, y: H - 410, w: 66, h: 160 },
    ];
    for (const c of cand) {
      if (dist(c.x + c.w / 2, c.y + c.h / 2, cx, cy) < 130) continue;
      obs.push(c);
    }
    this.arena.obstacles = obs;
  }

  beginWave(n) {
    this.wave = n;
    this.state = RUN.PREPARANDO;
    this.stateT = 0;
    const cfg = WAVES[n - 1];
    this.waveCfg = cfg;
    this.pendingSpawns = [];
    this.spawnTimer = 0;

    if (cfg.boss) {
      this.banner(BOSSES[cfg.boss].name, BOSSES[cfg.boss].title, 'boss');
    } else {
      const total = Object.values(cfg.spawn).reduce((a, b) => a + b, 0);
      this.banner('ONDA ' + n, total + ' cinzas se aproximam', 'wave');
      const list = [];
      for (const [type, count] of Object.entries(cfg.spawn)) {
        for (let i = 0; i < count; i++) list.push(type);
      }
      this.rng.shuffle(list);
      let t = 0;
      for (const type of list) {
        this.pendingSpawns.push({ type, at: t });
        t += this.rng.range(0.11, 0.3);
      }
    }
    this.audio.play('wave');
  }

  banner(title, sub, kind) {
    this.lastBanner = { title, sub, kind };
    this.bannerT = kind === 'boss' ? 3.2 : 2.2;
  }

  spawnPoint() {
    // fora da vista do jogador, dentro da arena, longe de obstáculos
    const p = this.player;
    for (let tries = 0; tries < 30; tries++) {
      const a = this.rng.angle();
      const r = this.rng.range(380, 540);
      const x = clamp(p.x + Math.cos(a) * r, 70, this.arena.w - 70);
      const y = clamp(p.y + Math.sin(a) * r, 70, this.arena.h - 70);
      if (dist2(x, y, p.x, p.y) < 330 * 330) continue;
      let bad = false;
      for (const o of this.arena.obstacles) {
        if (x > o.x - 40 && x < o.x + o.w + 40 && y > o.y - 40 && y < o.y + o.h + 40) { bad = true; break; }
      }
      if (!bad) return { x, y };
    }
    return { x: clamp(p.x + 420, 70, this.arena.w - 70), y: clamp(p.y, 70, this.arena.h - 70) };
  }

  /** Traz de volta ao jogo um inimigo que ficou preso na geometria. */
  repositionEnemy(e) {
    const pt = this.spawnPoint();
    this.particles.smoke(e.x, e.y, 4, '#241a2e', 40, 0.7, 10);
    e.x = pt.x; e.y = pt.y;
    e.vx = 0; e.vy = 0; e.kbx = 0; e.kby = 0;
    e.px = undefined; e.stuckT = 0;
    e.spawnT = 0.3;
    this.particles.ring(e.x, e.y, 6, e.radius * 3, this.enemyColor(e, 1), 0.4);
  }

  spawnEnemyAt(type, x, y) {
    const e = makeEnemy(type, x, y, this.wave, { orbitDir: this.rng.sign(), cd: this.rng.range(0, 1.2) });
    this.enemies.push(e);
    this.particles.ring(x, y, 6, e.radius * 3.4, this.enemyColor(e, 1), 0.42);
    this.particles.burst(x, y, 7, this.enemyColor(e, 1), 130, 0.4, 2.4);
    return e;
  }

  // ==========================================================================
  // passo da simulação
  // ==========================================================================
  step(dt) {
    this.frame++;

    if (this.hitstop.active) {
      this.hitstop.step();
      this.audio.duckForHitstop(true);
      // durante o congelamento só o cosmético anda — é o que vende o impacto
      this.particles.update(dt * 0.12);
      this.text.update(dt * 0.25);
      this.camera.update(dt);
      this.flash.update(dt);
      return;
    }
    this.audio.duckForHitstop(false);

    this.time += dt;
    this.stateT += dt;
    if (this.bannerT > 0) this.bannerT -= dt;
    if (this.darkPulse > 0) this.darkPulse -= dt;

    // dreno dos Véus, acumulado por quadro e suavizado
    this.drainMul = damp(this.drainMul, 1 + this.drainTick * 0.5 + (this.darkPulse > 0 ? 1.1 : 0), 6, dt);
    this.drainTick = 0;

    switch (this.state) {
      case RUN.PREPARANDO:
        if (this.stateT > (this.waveCfg.boss ? 2.4 : 1.1)) {
          this.state = RUN.LUTANDO;
          this.stateT = 0;
          this.lastProgress = this.time;
          if (this.waveCfg.boss) {
            this.boss = makeBoss(this.waveCfg.boss, this);
            this.audio.play('boss');
            this.camera.shake(0.5);
            this.camera.targetZoom = ZOOM.chefe;
          }
        }
        break;

      case RUN.LUTANDO:
        this.updateSpawns(dt);
        break;

      case RUN.RECOMPENSA:
      case RUN.VITORIA:
      case RUN.DERROTA:
        break;
    }

    if (this.input.touchMode) this.updateAutoAim();
    if (this.state !== RUN.DERROTA) this.player.update(dt, this);

    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (e.alive) updateEnemy(e, dt, this);
    }
    if (this.boss && this.boss.alive) updateBoss(this.boss, dt, this);

    separate(this.enemies, dt);
    this.updateBullets(dt);
    this.updateEmbers(dt);
    this.updateOrbitalsHit(dt);

    // limpeza dos mortos
    if (this.enemies.length) {
      let k = 0;
      for (let i = 0; i < this.enemies.length; i++) {
        if (this.enemies[i].alive) this.enemies[k++] = this.enemies[i];
      }
      this.enemies.length = k;
    }

    // Guarda anti-impasse: se ninguém tomou dano por 18 s com a onda em
    // andamento, alguma coisa ficou inalcançável. Traz todo mundo de volta.
    if (this.state === RUN.LUTANDO && !this.pendingSpawns.length
        && this.enemies.length && this.time - this.lastProgress > 14) {
      for (const e of this.enemies) if (e.alive) this.repositionEnemy(e);
      this.lastProgress = this.time;
      this.text.add(this.player.x, this.player.y - 50, 'as cinzas se aproximam', this.pal.uiDim, 15);
    }

    // condição de fim de onda
    if (this.state === RUN.LUTANDO && this.stateT > 0.6) {
      const bossDone = !this.waveCfg.boss || (this.boss && !this.boss.alive);
      if (!this.pendingSpawns.length && !this.enemies.length && bossDone) this.waveCleared();
    }

    // câmera segue com antecipação na direção da mira
    const p = this.player;
    const aheadX = (p.vx / PLAYER.speed) * 0.5 + p.aimX * 0.28;
    const aheadY = (p.vy / PLAYER.speed) * 0.5 + p.aimY * 0.28;
    this.camera.follow(p.x, p.y, clamp(aheadX, -1, 1), clamp(aheadY, -1, 1), dt);
    this.camera.update(dt);
    this.particles.update(dt);
    this.text.update(dt);
    this.flash.update(dt);

    // zoom sutil com a velocidade — reforça a sensação de correr
    const spd = Math.hypot(p.vx, p.vy);
    const wantZoom = this.boss && this.boss.alive
      ? ZOOM.chefe
      : lerp(ZOOM.base, ZOOM.corrida, clamp(spd / 700, 0, 1));
    this.camera.targetZoom = damp(this.camera.targetZoom, wantZoom, 3, dt);
  }

  /** Mira assistida do modo toque: alvo vivo mais próximo dentro do alcance. */
  updateAutoAim() {
    const p = this.player;
    let best = null, bd = 620 * 620;
    for (const e of this.targets()) {
      if (!e.alive || e.spawnT > 0) continue;
      const d = dist2(e.x, e.y, p.x, p.y);
      if (d < bd) { bd = d; best = e; }
    }
    if (best) {
      const dx = best.x - p.x, dy = best.y - p.y;
      const m = Math.hypot(dx, dy) || 1;
      this.input.autoAimX = dx / m; this.input.autoAimY = dy / m;
    } else {
      this.input.autoAimX = undefined;
    }
  }

  updateSpawns(dt) {
    if (!this.pendingSpawns.length) return;
    this.spawnTimer += dt;
    while (this.pendingSpawns.length && this.pendingSpawns[0].at <= this.spawnTimer) {
      const s = this.pendingSpawns.shift();
      const pt = this.spawnPoint();
      this.spawnEnemyAt(s.type, pt.x, pt.y);
    }
  }

  waveCleared() {
    this.stats.waves = this.wave;
    const isBoss = !!this.waveCfg.boss;
    this.score += Math.round((isBoss ? SCORE.bossClear : SCORE.waveClear) * this.wave * this.mods.scoreMul);
    this.camera.targetZoom = ZOOM.base;
    this.darknessBoost = 0;

    if (this.wave >= TOTAL_WAVES) {
      this.state = RUN.VITORIA;
      this.stateT = 0;
      this.score += Math.round(this.player.flame * SCORE.perFlameLeft);
      this.score += Math.round(SCORE.timeBonus * TOTAL_WAVES / Math.max(60, this.time) * 10);
      this.audio.play('victory');
      this.onEvent('vitoria');
      return;
    }

    this.state = RUN.RECOMPENSA;
    this.stateT = 0;
    this.bannerT = 0;
    this.offers = offer(this.rng, this.taken, 3, this.wave);
    this.offerIndex = 0;
    this.audio.play('upgrade');
    this.onEvent('recompensa');
  }

  chooseUpgrade(i) {
    if (this.state !== RUN.RECOMPENSA || !this.offers) return false;
    const u = this.offers[i];
    if (!u) return false;
    this.taken[u.id] = (this.taken[u.id] || 0) + 1;
    u.apply(this.mods, this);
    this.player.maxFlame = PLAYER.maxFlame + this.mods.maxFlame;
    this.player.dashMax = PLAYER.dash.charges + this.mods.dashCharges;
    this.player.dashCharges = Math.max(this.player.dashCharges, Math.min(this.player.dashMax, this.player.dashCharges + 1));
    if (this.refill) { this.player.flame = this.player.maxFlame; this.refill = false; }
    this.player.flame = Math.min(this.player.flame, this.player.maxFlame);
    this.offers = null;
    this.audio.play('upgrade');
    this.particles.ring(this.player.x, this.player.y, 10, 190, this.pal.flame, 0.6);
    this.particles.burst(this.player.x, this.player.y, 22, this.pal.flameHot, 260, 0.7, 3.4);
    this.beginWave(this.wave + 1);
    return true;
  }

  playerDied() {
    if (!this.player.alive || this.state === RUN.DERROTA) return;
    if (this.mods.revive > 0) {
      this.mods.revive--;
      this.player.revives++;
      this.player.flame = this.player.maxFlame * 0.5;
      this.player.invuln = 2.2;
      this.player.iframes = 1.2;
      this.flash.hit(0.7, this.pal.flameHot);
      this.camera.shake(0.7);
      this.hitstop.hit(180);
      this.particles.ring(this.player.x, this.player.y, 10, 420, this.pal.flameHot, 0.9);
      this.particles.burst(this.player.x, this.player.y, 50, this.pal.flame, 420, 1.0, 4.5);
      this.text.add(this.player.x, this.player.y - 46, 'REACENDEU', this.pal.flameHot, 24, true);
      this.audio.play('victory');
      // limpa projéteis inimigos como respiro
      for (let i = 0; i < this.eShots.n; i++) this.eShots.a[i].alive = false;
      compactPool(this.eShots);
      return;
    }
    this.player.alive = false;
    this.state = RUN.DERROTA;
    this.stateT = 0;
    this.hitstop.hit(320);
    this.camera.shake(1);
    this.flash.hit(0.6, this.pal.danger);
    this.particles.burst(this.player.x, this.player.y, 60, this.pal.flame, 380, 1.1, 5);
    this.particles.smoke(this.player.x, this.player.y, 18, '#2a1e30', 60, 1.6, 14);
    this.audio.play('defeat');
    this.onEvent('derrota');
  }

  // ==========================================================================
  // colisão com a arena
  // ==========================================================================
  collideArena(ent, isPlayer) {
    const r = ent.radius;
    const W = this.arena.w, H = this.arena.h;
    if (ent.x < r) { ent.x = r; if (isPlayer) ent.vx = Math.max(0, ent.vx); }
    if (ent.x > W - r) { ent.x = W - r; if (isPlayer) ent.vx = Math.min(0, ent.vx); }
    if (ent.y < r) { ent.y = r; if (isPlayer) ent.vy = Math.max(0, ent.vy); }
    if (ent.y > H - r) { ent.y = H - r; if (isPlayer) ent.vy = Math.min(0, ent.vy); }

    for (const o of this.arena.obstacles) {
      if (circleRect(ent.x, ent.y, r, o.x, o.y, o.w, o.h, this._hit)) {
        ent.x += this._hit.nx * this._hit.depth;
        ent.y += this._hit.ny * this._hit.depth;
        if (isPlayer) {
          // desliza pela parede em vez de grudar
          const dot = ent.vx * this._hit.nx + ent.vy * this._hit.ny;
          if (dot < 0) { ent.vx -= this._hit.nx * dot; ent.vy -= this._hit.ny * dot; }
        }
      }
    }
  }

  blocked(x, y, r) {
    if (x < r || y < r || x > this.arena.w - r || y > this.arena.h - r) return true;
    for (const o of this.arena.obstacles) {
      if (circleRect(x, y, r, o.x, o.y, o.w, o.h, this._hit)) return true;
    }
    return false;
  }

  // ==========================================================================
  // combate
  // ==========================================================================
  targets() {
    // iterador simples: inimigos + chefe
    if (this.boss && this.boss.alive) {
      this._tg = this._tg || [];
      this._tg.length = 0;
      for (const e of this.enemies) this._tg.push(e);
      this._tg.push(this.boss);
      return this._tg;
    }
    return this.enemies;
  }

  rollCrit() {
    return this.rng.next() < this.mods.crit;
  }

  meleeHit(p, swing) {
    const M = PLAYER.melee;
    const range = M.range * this.mods.meleeRange;
    const list = this.targets();
    let any = false;
    for (const e of list) {
      if (!e.alive || swing.hits.has(e.id) || e.spawnT > 0) continue;
      if (!inArc(e.x, e.y, p.x, p.y, range + e.radius, swing.ang, M.halfArc)) continue;
      swing.hits.add(e.id);
      const crit = this.rollCrit();
      const dmg = M.damage * this.mods.damage * (crit ? this.mods.critMul : 1);
      this.damageEnemy(e, dmg, p.x, p.y, {
        knockback: M.knockback * this.mods.knockback,
        hitstop: M.hitstop, crit, melee: true,
      });
      any = true;
    }
    if (any) {
      this.stats.hits++;
      const a = swing.ang;
      this.particles.cone(p.x + Math.cos(a) * range * 0.6, p.y + Math.sin(a) * range * 0.6,
        a, 0.7, 9, this.pal.flameHot, 300, 0.32, 3.2);
      this.camera.shake(0.17, Math.cos(a), Math.sin(a));
    }
  }

  firePlayerShot(p) {
    const S = PLAYER.shot;
    const n = 1 + this.mods.multishot;
    const spread = n > 1 ? 0.14 : 0;
    const base = Math.atan2(p.aimY, p.aimX);
    for (let i = 0; i < n; i++) {
      const off = n === 1 ? 0 : (i - (n - 1) / 2) * spread;
      const a = base + off;
      const crit = this.rollCrit();
      const dmg = S.damage * this.mods.damage * (crit ? this.mods.critMul : 1);
      spawnBullet(this.pShots, p.x + Math.cos(a) * 16, p.y + Math.sin(a) * 16,
        Math.cos(a) * S.speed, Math.sin(a) * S.speed, S.radius, dmg, S.life, true,
        { pierce: this.mods.pierce, crit });
    }
    this.stats.shots++;
    this.audio.play('shoot');
    this.camera.shake(0.07, -p.aimX, -p.aimY);
    this.particles.cone(p.x + p.aimX * 18, p.y + p.aimY * 18, base, 0.3, 6, this.pal.shot, 260, 0.24, 2.6);
  }

  fireEnemyShot(e, nx, ny, speed, dmg, r) {
    spawnBullet(this.eShots, e.x + nx * (e.radius + 4), e.y + ny * (e.radius + 4),
      nx * speed, ny * speed, r, dmg * SCALE.dmg(this.wave), 5.5, false, {});
    this.audio.play('shoot');
  }

  fireBossShot(b, nx, ny, speed, dmg, r) {
    spawnBullet(this.eShots, b.x + nx * (b.radius * 0.7), b.y + ny * (b.radius * 0.7),
      nx * speed, ny * speed, r, dmg, 7, false, {});
  }

  bossPhaseShift(b) {
    this.hitstop.hit(220);
    this.camera.shake(0.8);
    this.flash.hit(0.4, this.pal.flameHot);
    this.particles.ring(b.x, b.y, 20, 520, b.def.accent, 0.9);
    this.particles.burst(b.x, b.y, 44, b.def.accent, 420, 0.9, 4.5);
    this.audio.play('boss');
    this.text.add(b.x, b.y - b.radius - 30, 'FASE ' + (b.phase + 1), b.def.accent, 26, true);
    // limpa a tela de projéteis: a transição é um respiro, não uma emboscada
    for (let i = 0; i < this.eShots.n; i++) this.eShots.a[i].alive = false;
    compactPool(this.eShots);
  }

  damageEnemy(e, amount, srcX, srcY, opt = {}) {
    if (!e.alive) return;
    if (e.invuln > 0 && !opt.burn) {
      if (!opt.silent) this.audio.play('block');
      return;
    }
    let dmg = amount;
    // Carvão bloqueia parte do dano vindo de frente — mudar de lado é a resposta
    if (e.def.armorFront && !opt.burn) {
      const ang = Math.atan2(srcY - e.y, srcX - e.x);
      const d = Math.abs(((ang - e.facing + Math.PI * 3) % TAU) - Math.PI);
      if (d < 1.0) {
        dmg *= 1 - e.def.armorFront;
        if (!opt.silent) {
          this.audio.play('block');
          this.text.add(e.x, e.y - e.radius - 8, 'bloqueou', this.pal.uiDim, 13);
        }
      }
    }

    e.hp -= dmg;
    this.lastProgress = this.time;
    this.stats.damageDealt += dmg;
    this.player.dmgDealt += dmg;

    if (this.mods.lifesteal > 0 && !opt.burn) {
      this.player.addFlame(dmg * this.mods.lifesteal);
    }

    // Durante a luta de chefe não há inimigos comuns para matar — sem isto a
    // chama só desce e a luta vira um teste de dano puro contra um cronômetro.
    // Ferir o chefe solta fagulhas: bater continua sendo como se acende.
    if (e.boss) {
      e.emberAcc = (e.emberAcc || 0) + dmg;
      const passo = e.maxHp * 0.028;
      let guarda = 0;
      while (e.emberAcc >= passo && guarda++ < 6) {
        e.emberAcc -= passo;
        const a = this.rng.angle();
        const sp = this.rng.range(120, 280);
        spawnEmber(this.embers, e.x + Math.cos(a) * e.radius * 0.8, e.y + Math.sin(a) * e.radius * 0.8,
          Math.cos(a) * sp, Math.sin(a) * sp,
          PLAYER.emberValue * this.mods.emberValue * (this.assist ? ASSIST.emberMul : 1));
      }
    }
    if (this.mods.burn > 0 && !opt.burn) {
      e.burnT = 3; e.burnDps = this.mods.burn;
    }
    if (this.mods.slow > 0 && !opt.burn) {
      e.slowT = 2; e.slowAmt = Math.min(0.65, this.mods.slow);
    }

    if (!opt.silent) {
      e.hitFlash = 1;
      e.sx = 1.28; e.sy = 0.76;
      const dx = e.x - srcX, dy = e.y - srcY;
      const m = Math.hypot(dx, dy) || 1;
      const kb = (opt.knockback || 0) / (e.def.mass || 1);
      e.kbx += (dx / m) * kb; e.kby += (dy / m) * kb;
      if (this.settings.showDamage) {
        this.text.add(e.x, e.y - e.radius - 6, String(Math.round(dmg)),
          opt.crit ? this.pal.flameHot : this.pal.ui, opt.crit ? 22 : 15, !!opt.crit);
      }
      this.particles.cone(e.x - (dx / m) * e.radius * 0.6, e.y - (dy / m) * e.radius * 0.6,
        Math.atan2(dy, dx), 0.9, opt.crit ? 12 : 7, this.pal.flameHot, 240, 0.3, 2.8);
      if (!opt.noStop) this.hitstop.hit((opt.hitstop || 40) * (opt.crit ? 1.6 : 1));
      this.audio.play('hit', { heavy: !!opt.crit || (e.boss === true) });
      this.flash.hit(opt.crit ? 0.1 : 0.045, this.pal.flameHot);
    }

    if (e.hp <= 0) this.killEnemy(e, srcX, srcY);
  }

  killEnemy(e, srcX, srcY) {
    if (!e.alive) return;
    e.alive = false;
    this.stats.kills++;
    this.player.kills++;
    this.score += Math.round((e.scoreValue || 10) * this.mods.scoreMul * (1 + this.wave * 0.06));

    const col = e.boss ? e.def.accent : this.enemyColor(e, 1);
    const n = e.boss ? 90 : 14;
    this.particles.burst(e.x, e.y, n, col, e.boss ? 480 : 280, e.boss ? 1.2 : 0.55, e.boss ? 5 : 3.2);
    this.particles.shards(e.x, e.y, e.boss ? 26 : 6, this.enemyColor(e, 0), e.boss ? 380 : 240, 0.75, e.boss ? 12 : 6);
    this.particles.smoke(e.x, e.y, e.boss ? 14 : 4, '#241a2e', 50, 1.2, e.boss ? 26 : 10);
    this.particles.ring(e.x, e.y, e.radius * 0.5, e.radius * (e.boss ? 9 : 3.6), col, e.boss ? 0.9 : 0.4);
    this.decals.push({ x: e.x, y: e.y, r: e.radius * (e.boss ? 3.2 : 1.5), a: e.boss ? 0.5 : 0.28 });
    if (this.decals.length > 90) this.decals.shift();

    // fagulhas: o motor econômico do jogo — matar é como se recupera chama
    const emberN = e.boss ? e.def.embers : (e.def.embers || 2);
    for (let i = 0; i < emberN; i++) {
      const a = this.rng.angle();
      const s = this.rng.range(60, 230);
      spawnEmber(this.embers, e.x, e.y, Math.cos(a) * s, Math.sin(a) * s,
        PLAYER.emberValue * this.mods.emberValue * (this.assist ? ASSIST.emberMul : 1));
    }

    if (this.mods.explodeOnKill > 0) {
      const R = this.mods.explodeOnKill;
      this.particles.ring(e.x, e.y, 8, R * 1.1, this.pal.flame, 0.4);
      this.audio.play('explode');
      this.camera.shake(0.16);
      for (const o of this.targets()) {
        if (!o.alive || o === e) continue;
        if (dist2(o.x, o.y, e.x, e.y) < R * R) {
          this.damageEnemy(o, 24 * this.mods.damage, e.x, e.y, { noStop: true, knockback: 200 });
        }
      }
    }

    if (e.def.splits && !e.boss) {
      for (let i = 0; i < e.def.splits; i++) {
        const a = (TAU * i) / e.def.splits + this.rng.angle();
        const c = makeEnemy('cinza', e.x + Math.cos(a) * 34, e.y + Math.sin(a) * 34, this.wave, { orbitDir: this.rng.sign() });
        c.hp *= 0.6; c.maxHp *= 0.6; c.radius *= 0.82;
        c.scoreValue = 5;
        this.enemies.push(c);
      }
    }

    if (e.boss) {
      this.boss = e;
      this.hitstop.hit(420);
      this.camera.shake(1);
      this.flash.hit(0.55, this.pal.flameHot);
      this.audio.play('explode');
      this.audio.play('victory');
      this.text.add(e.x, e.y - 60, e.name + ' APAGOU', this.pal.flameHot, 30, true);
    } else {
      this.audio.play('die');
      this.hitstop.hit(52);
      this.camera.shake(0.1, e.x - srcX, e.y - srcY);
    }
  }

  // ==========================================================================
  // projéteis, fagulhas, satélites
  // ==========================================================================
  updateBullets(dt) {
    const p = this.player;

    for (let i = 0; i < this.pShots.n; i++) {
      const b = this.pShots.a[i];
      if (!b.alive) continue;
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.life -= dt;
      b.trail -= dt;
      if (b.trail <= 0) {
        b.trail = 0.02;
        this.particles.spawn(P_TRAIL, b.x, b.y, 0, 0, 0.22, b.r * 1.5, this.pal.shot, { drag: 1 });
      }
      if (b.life <= 0 || this.blocked(b.x, b.y, b.r)) {
        if (this.blocked(b.x, b.y, b.r)) {
          this.particles.burst(b.x, b.y, 5, this.pal.shot, 130, 0.25, 2.2);
        }
        b.alive = false; continue;
      }
      for (const e of this.targets()) {
        if (!e.alive || e.spawnT > 0) continue;
        if (b.hits && b.hits.has(e.id)) continue;
        const rr = b.r + e.radius;
        if (dist2(b.x, b.y, e.x, e.y) > rr * rr) continue;
        this.damageEnemy(e, b.dmg, b.x - b.vx * 0.02, b.y - b.vy * 0.02, {
          knockback: PLAYER.shot.knockback * this.mods.knockback,
          hitstop: PLAYER.shot.hitstop, crit: b.crit,
        });
        this.stats.hits++;
        if (b.hits) { b.hits.add(e.id); if (b.hits.size > b.pierce) b.alive = false; }
        else b.alive = false;
        if (!b.alive) break;
      }
    }
    compactPool(this.pShots);

    for (let i = 0; i < this.eShots.n; i++) {
      const b = this.eShots.a[i];
      if (!b.alive) continue;
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || this.blocked(b.x, b.y, b.r)) { b.alive = false; continue; }
      const rr = b.r + p.radius;
      if (p.alive && dist2(b.x, b.y, p.x, p.y) < rr * rr) {
        if (p.hurt(b.dmg, this, b.x, b.y)) {
          b.alive = false;
          this.particles.burst(b.x, b.y, 8, this.pal.danger, 200, 0.35, 2.6);
        } else if (p.iframes > 0 || p.invuln > 0) {
          // atravessa durante a invulnerabilidade, sem sumir de graça
        }
      }
    }
    compactPool(this.eShots);
  }

  updateEmbers(dt) {
    const p = this.player;
    const magnet = PLAYER.emberMagnet * this.mods.magnet;
    for (let i = 0; i < this.embers.n; i++) {
      const e = this.embers.a[i];
      if (!e.alive) continue;
      e.t += dt;
      e.life -= dt;
      if (e.life <= 0) { e.alive = false; continue; }
      const d = dist(e.x, e.y, p.x, p.y);
      if (d < magnet) {
        const pull = lerp(1500, 300, d / magnet);
        const nx = (p.x - e.x) / (d || 1), ny = (p.y - e.y) / (d || 1);
        e.vx += nx * pull * dt; e.vy += ny * pull * dt;
      }
      const f = Math.pow(0.93, dt * 60);
      e.vx *= f; e.vy *= f;
      e.x += e.vx * dt; e.y += e.vy * dt;
      if (d < p.radius + 9) {
        e.alive = false;
        p.addFlame(e.value);
        this.stats.embers++;
        this.audio.play('ember');
        this.particles.spawn(P_SPARK, e.x, e.y, 0, -60, 0.3, 3, this.pal.ember, { drag: 0.9 });
        if (this.settings.showDamage) {
          this.text.add(p.x, p.y - 34, '+' + Math.round(e.value), this.pal.good, 13);
        }
      }
    }
    compactPool(this.embers);
  }

  updateOrbitals(p, dt) {
    const want = this.mods.orbitals;
    while (this.orbitals.length < want) this.orbitals.push({ a: this.orbitals.length * 2, r: 62, hit: new Map() });
    while (this.orbitals.length > want) this.orbitals.pop();
    for (let i = 0; i < this.orbitals.length; i++) {
      const o = this.orbitals[i];
      o.a = p.orbAngle + (TAU * i) / this.orbitals.length;
      o.x = p.x + Math.cos(o.a) * o.r;
      o.y = p.y + Math.sin(o.a) * o.r;
      if (this.rng.chance(dt * 8)) {
        this.particles.spawn(P_SPARK, o.x, o.y, 0, 0, 0.28, 2.4, this.pal.flame, { drag: 0.9 });
      }
    }
  }

  updateOrbitalsHit(dt) {
    if (!this.orbitals.length) return;
    for (const o of this.orbitals) {
      for (const e of this.targets()) {
        if (!e.alive || e.spawnT > 0) continue;
        const last = o.hit.get(e.id) || -99;
        if (this.time - last < 0.45) continue;
        const rr = 13 + e.radius;
        if (dist2(o.x, o.y, e.x, e.y) < rr * rr) {
          o.hit.set(e.id, this.time);
          this.damageEnemy(e, 16 * this.mods.damage, o.x, o.y, { knockback: 120, hitstop: 0, noStop: true });
        }
      }
    }
  }

  // ==========================================================================
  // leitura de estado — usada pelo HUD e pelo harness de playtest
  // ==========================================================================
  snapshot() {
    return {
      frame: this.frame,
      time: +this.time.toFixed(3),
      state: this.state,
      wave: this.wave,
      score: this.score,
      flame: +this.player.flame.toFixed(2),
      maxFlame: this.player.maxFlame,
      px: +this.player.x.toFixed(2),
      py: +this.player.y.toFixed(2),
      enemies: this.enemies.length,
      pending: this.pendingSpawns.length,
      bossHp: this.boss ? +Math.max(0, this.boss.hp).toFixed(1) : null,
      bossAlive: !!(this.boss && this.boss.alive),
      eShots: this.eShots.n,
      pShots: this.pShots.n,
      embers: this.embers.n,
      particles: this.particles.n,
      dashCharges: this.player.dashCharges,
      kills: this.stats.kills,
      rng: this.rng.snapshot(),
      upgrades: Object.assign({}, this.taken),
    };
  }
}
