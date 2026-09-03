// ---------------------------------------------------------------------------
// fx.js — câmera, tremor, hit-stop, partículas, números de dano e flashes.
//
// É a "camada 3" do modelo de game feel. Tudo aqui é cosmético e obedece às
// opções de acessibilidade: shake e flash têm escala 0..1 e o jogo continua
// perfeitamente jogável com ambos zerados.
// ---------------------------------------------------------------------------

import { clamp, damp, lerp, TAU, easeOutCubic } from './math.js';
import { visualRng as vr } from './rng.js';

// --- câmera ----------------------------------------------------------------
export class Camera {
  constructor() {
    this.x = 0; this.y = 0;
    this.w = 960; this.h = 540;
    this.zoom = 1; this.targetZoom = 1;
    this.trauma = 0;              // 0..1, decai; o tremor é trauma²
    this.shakeX = 0; this.shakeY = 0;
    this.dirX = 0; this.dirY = 0; // tremor direcional
    this.scale = 1;               // shake habilitado pelas opções
    this._t = 0;
    this.deadzone = 42;
    this.lookahead = 88;
    this.bounds = null;
  }

  resize(w, h) { this.w = w; this.h = h; }

  /** Tremor direcional e curto — nunca contínuo. */
  shake(amount, dx = 0, dy = 0) {
    this.trauma = clamp(this.trauma + amount, 0, 1);
    if (dx || dy) {
      const m = Math.hypot(dx, dy) || 1;
      this.dirX = dx / m; this.dirY = dy / m;
    } else { this.dirX = 0; this.dirY = 0; }
  }

  follow(tx, ty, aheadX, aheadY, dt) {
    const gx = tx + aheadX * this.lookahead;
    const gy = ty + aheadY * this.lookahead;
    const dx = gx - this.x, dy = gy - this.y;
    const d = Math.hypot(dx, dy);
    if (d > this.deadzone) {
      const ex = dx - (dx / d) * this.deadzone;
      const ey = dy - (dy / d) * this.deadzone;
      // suavização diferente nos eixos: vertical mais firme
      this.x = damp(this.x, this.x + ex, 7.5, dt);
      this.y = damp(this.y, this.y + ey, 9.0, dt);
    }
    this.zoom = damp(this.zoom, this.targetZoom, 4, dt);

    if (this.bounds) {
      const hw = this.w / (2 * this.zoom), hh = this.h / (2 * this.zoom);
      const b = this.bounds;
      if (b.w > hw * 2) this.x = clamp(this.x, b.x + hw, b.x + b.w - hw);
      else this.x = b.x + b.w / 2;
      if (b.h > hh * 2) this.y = clamp(this.y, b.y + hh, b.y + b.h - hh);
      else this.y = b.y + b.h / 2;
    }
  }

  update(dt) {
    this._t += dt;
    this.trauma = Math.max(0, this.trauma - dt * 1.9);
    const s = this.trauma * this.trauma * 26 * this.scale;
    if (s > 0.01) {
      const a = vr.angle();
      const ox = Math.cos(a) * s, oy = Math.sin(a) * s;
      // 60% na direção do impacto, 40% aleatório — lê como pancada, não ruído
      this.shakeX = lerp(ox, this.dirX * s, 0.6);
      this.shakeY = lerp(oy, this.dirY * s, 0.6);
    } else { this.shakeX = 0; this.shakeY = 0; }
  }

  get ox() { return this.x + this.shakeX; }
  get oy() { return this.y + this.shakeY; }

  apply(ctx) {
    ctx.translate(this.w / 2, this.h / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.ox, -this.oy);
  }
  screenToWorldX(sx) { return (sx - this.w / 2) / this.zoom + this.ox; }
  screenToWorldY(sy) { return (sy - this.h / 2) / this.zoom + this.oy; }
  worldToScreenX(wx) { return (wx - this.ox) * this.zoom + this.w / 2; }
  worldToScreenY(wy) { return (wy - this.oy) * this.zoom + this.h / 2; }

  visible(x, y, r) {
    const hw = this.w / (2 * this.zoom) + r, hh = this.h / (2 * this.zoom) + r;
    return Math.abs(x - this.ox) < hw && Math.abs(y - this.oy) < hh;
  }
}

// --- hit-stop ---------------------------------------------------------------
// Congela a simulação por 50–120 ms no impacto. É o truque isolado de maior
// retorno em jogos de ação: vende o peso da pancada sem tocar no dano.
export class HitStop {
  constructor() { this.frames = 0; this.total = 0; }
  hit(ms) {
    const f = Math.round(ms / 16.6667);
    if (f > this.frames) { this.frames = f; this.total = f; }
  }
  get active() { return this.frames > 0; }
  step() { if (this.frames > 0) this.frames--; }
  clear() { this.frames = 0; }
}

// --- partículas -------------------------------------------------------------
export const P_SPARK = 0, P_SMOKE = 1, P_EMBER = 2, P_RING = 3, P_SHARD = 4, P_DUST = 5, P_TRAIL = 6;

export class Particles {
  constructor(max = 1400) {
    this.max = max;
    this.n = 0;
    this.p = new Array(max);
    for (let i = 0; i < max; i++) {
      this.p[i] = { x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, r: 1, r2: 1, type: 0, col: '#fff', rot: 0, vr: 0, drag: 0.98, grav: 0 };
    }
  }
  clear() { this.n = 0; }

  spawn(type, x, y, vx, vy, life, r, col, opt) {
    if (this.n >= this.max) {
      // substitui a partícula mais antiga em vez de ignorar o pedido
      let oldest = 0, lo = Infinity;
      for (let i = 0; i < 24; i++) {
        const k = (this._rr = ((this._rr | 0) + 7) % this.max);
        if (this.p[k].life < lo) { lo = this.p[k].life; oldest = k; }
      }
      this._init(this.p[oldest], type, x, y, vx, vy, life, r, col, opt);
      return this.p[oldest];
    }
    const q = this.p[this.n++];
    this._init(q, type, x, y, vx, vy, life, r, col, opt);
    return q;
  }

  _init(q, type, x, y, vx, vy, life, r, col, opt) {
    q.type = type; q.x = x; q.y = y; q.vx = vx; q.vy = vy;
    q.life = life; q.max = life; q.r = r; q.r2 = (opt && opt.r2) || r;
    q.col = col; q.rot = (opt && opt.rot) || 0;
    q.vr = (opt && opt.vr) || 0;
    q.drag = (opt && opt.drag !== undefined) ? opt.drag : 0.94;
    q.grav = (opt && opt.grav) || 0;
  }

  update(dt) {
    for (let i = 0; i < this.n; i++) {
      const q = this.p[i];
      q.life -= dt;
      if (q.life <= 0) {
        const last = this.p[--this.n];
        this.p[this.n] = q; this.p[i] = last; i--;
        continue;
      }
      q.x += q.vx * dt; q.y += q.vy * dt;
      q.vy += q.grav * dt;
      const d = Math.pow(q.drag, dt * 60);
      q.vx *= d; q.vy *= d;
      q.rot += q.vr * dt;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.n; i++) {
      const q = this.p[i];
      const t = q.life / q.max;
      ctx.globalAlpha = clamp(t, 0, 1);
      ctx.fillStyle = q.col;
      switch (q.type) {
        case P_RING: {
          const rr = lerp(q.r, q.r2, 1 - t);
          ctx.globalAlpha = clamp(t * t, 0, 1);
          ctx.strokeStyle = q.col;
          ctx.lineWidth = Math.max(1, 4 * t);
          ctx.beginPath(); ctx.arc(q.x, q.y, rr, 0, TAU); ctx.stroke();
          break;
        }
        case P_SHARD: {
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
          const s = q.r * (0.4 + t * 0.6);
          ctx.fillRect(-s, -s * 0.32, s * 2, s * 0.64);
          ctx.restore();
          break;
        }
        case P_SMOKE: {
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = clamp(t * 0.35, 0, 1);
          const rr = lerp(q.r, q.r2, 1 - t);
          ctx.beginPath(); ctx.arc(q.x, q.y, rr, 0, TAU); ctx.fill();
          ctx.globalCompositeOperation = 'lighter';
          break;
        }
        case P_TRAIL: {
          const rr = q.r * t;
          ctx.beginPath(); ctx.arc(q.x, q.y, rr, 0, TAU); ctx.fill();
          break;
        }
        default: {
          const rr = q.r * (0.35 + t * 0.65);
          ctx.beginPath(); ctx.arc(q.x, q.y, rr, 0, TAU); ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  // --- receitas prontas ----------------------------------------------------
  burst(x, y, n, col, speed = 240, life = 0.5, r = 3) {
    for (let i = 0; i < n; i++) {
      const a = vr.angle(), s = speed * vr.range(0.35, 1);
      this.spawn(P_SPARK, x, y, Math.cos(a) * s, Math.sin(a) * s,
        life * vr.range(0.6, 1.25), r * vr.range(0.7, 1.3), col, { drag: 0.9 });
    }
  }
  cone(x, y, ang, spread, n, col, speed = 320, life = 0.4, r = 3) {
    for (let i = 0; i < n; i++) {
      const a = ang + vr.range(-spread, spread), s = speed * vr.range(0.4, 1.1);
      this.spawn(P_SPARK, x, y, Math.cos(a) * s, Math.sin(a) * s,
        life * vr.range(0.6, 1.2), r * vr.range(0.7, 1.2), col, { drag: 0.9 });
    }
  }
  ring(x, y, r0, r1, col, life = 0.4) {
    this.spawn(P_RING, x, y, 0, 0, life, r0, col, { r2: r1 });
  }
  smoke(x, y, n, col, speed = 40, life = 0.9, r = 8) {
    for (let i = 0; i < n; i++) {
      const a = vr.angle(), s = speed * vr.range(0.2, 1);
      this.spawn(P_SMOKE, x, y, Math.cos(a) * s, Math.sin(a) * s,
        life * vr.range(0.7, 1.4), r * vr.range(0.6, 1.2), col,
        { r2: r * 2.6, drag: 0.96 });
    }
  }
  shards(x, y, n, col, speed = 300, life = 0.7, r = 6) {
    for (let i = 0; i < n; i++) {
      const a = vr.angle(), s = speed * vr.range(0.4, 1);
      this.spawn(P_SHARD, x, y, Math.cos(a) * s, Math.sin(a) * s,
        life * vr.range(0.7, 1.3), r * vr.range(0.6, 1.2), col,
        { rot: vr.angle(), vr: vr.range(-9, 9), drag: 0.93 });
    }
  }
}

// --- números de dano e texto flutuante -------------------------------------
export class FloatingText {
  constructor(max = 90) {
    this.max = max; this.n = 0;
    this.a = new Array(max);
    for (let i = 0; i < max; i++) this.a[i] = { x: 0, y: 0, vy: 0, life: 0, maxLife: 1, txt: '', col: '#fff', size: 16, crit: false };
  }
  clear() { this.n = 0; }
  add(x, y, txt, col = '#ffd9a0', size = 16, crit = false) {
    let q;
    if (this.n >= this.max) q = this.a[(this._i = ((this._i | 0) + 1) % this.max)];
    else q = this.a[this.n++];
    q.x = x + vr.range(-6, 6); q.y = y; q.vy = crit ? -108 : -80;
    q.life = crit ? 0.95 : 0.72; q.maxLife = q.life;
    q.txt = txt; q.col = col; q.size = size; q.crit = crit;
    return q;
  }
  update(dt) {
    for (let i = 0; i < this.n; i++) {
      const q = this.a[i];
      q.life -= dt;
      if (q.life <= 0) {
        const last = this.a[--this.n]; this.a[this.n] = q; this.a[i] = last; i--;
        continue;
      }
      q.y += q.vy * dt;
      q.vy += 190 * dt;
    }
  }
  draw(ctx, fontFamily) {
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < this.n; i++) {
      const q = this.a[i];
      const t = q.life / q.maxLife;
      // "pop": cresce rápido e assenta
      const grow = q.crit ? 1.35 : 1.15;
      const k = t > 0.82 ? lerp(grow, 1, easeOutCubic((1 - t) / 0.18)) : 1;
      ctx.globalAlpha = clamp(t * 1.6, 0, 1);
      ctx.font = `700 ${q.size * k}px ${fontFamily}`;
      ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(6,4,10,0.85)';
      ctx.strokeText(q.txt, q.x, q.y);
      ctx.fillStyle = q.col;
      ctx.fillText(q.txt, q.x, q.y);
    }
    ctx.restore();
  }
}

// --- flash de tela ----------------------------------------------------------
export class Flash {
  constructor() { this.a = 0; this.col = '#fff'; this.scale = 1; }
  hit(alpha, col = '#fff') {
    const v = alpha * this.scale;
    if (v > this.a) { this.a = v; this.col = col; }
  }
  update(dt) { this.a = Math.max(0, this.a - dt * 3.6); }
  draw(ctx, w, h) {
    if (this.a <= 0.002) return;
    ctx.save();
    ctx.globalAlpha = clamp(this.a, 0, 1);
    ctx.fillStyle = this.col;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}
