// ---------------------------------------------------------------------------
// fx.js — faíscas, pétalas, poeira de luz e textos. Tudo obedece à opção de
// brilhos: em zero, nada é desenhado e o jogo continua inteiro.
// ---------------------------------------------------------------------------

import { TAU, clamp, lerp, easeOutCubic } from './math.js';
import { visualRng as vr } from './rng.js';

export const P_FAISCA = 0, P_PETALA = 1, P_POEIRA = 2, P_ANEL = 3;

export class Particulas {
  constructor(max = 900) {
    this.max = max; this.n = 0;
    this.p = new Array(max);
    for (let i = 0; i < max; i++) {
      this.p[i] = { x: 0, y: 0, vx: 0, vy: 0, vida: 0, total: 1, r: 1, r2: 1, tipo: 0, cor: '#fff', rot: 0, vr: 0, grav: 0, arrasto: 0.96 };
    }
  }
  limpar() { this.n = 0; }
  criar(tipo, x, y, vx, vy, vida, r, cor, o) {
    let q;
    if (this.n >= this.max) q = this.p[(this._i = ((this._i | 0) + 1) % this.max)];
    else q = this.p[this.n++];
    q.tipo = tipo; q.x = x; q.y = y; q.vx = vx; q.vy = vy;
    q.vida = vida; q.total = vida; q.r = r; q.r2 = (o && o.r2) || r;
    q.cor = cor; q.rot = (o && o.rot) || 0; q.vr = (o && o.vr) || 0;
    q.grav = (o && o.grav) || 0;
    q.arrasto = (o && o.arrasto !== undefined) ? o.arrasto : 0.95;
    return q;
  }
  passo(dt) {
    for (let i = 0; i < this.n; i++) {
      const q = this.p[i];
      q.vida -= dt;
      if (q.vida <= 0) { const u = this.p[--this.n]; this.p[this.n] = q; this.p[i] = u; i--; continue; }
      q.x += q.vx * dt; q.y += q.vy * dt;
      q.vy += q.grav * dt;
      const d = Math.pow(q.arrasto, dt * 60);
      q.vx *= d; q.vy *= d;
      q.rot += q.vr * dt;
    }
  }
  desenhar(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.n; i++) {
      const q = this.p[i];
      const t = clamp(q.vida / q.total, 0, 1);
      ctx.globalAlpha = t;
      ctx.fillStyle = q.cor;
      switch (q.tipo) {
        case P_ANEL: {
          const rr = lerp(q.r, q.r2, 1 - t);
          ctx.globalAlpha = t * t;
          ctx.strokeStyle = q.cor; ctx.lineWidth = Math.max(1.5, 5 * t);
          ctx.beginPath(); ctx.arc(q.x, q.y, rr, 0, TAU); ctx.stroke();
          break;
        }
        case P_PETALA: {
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = t * 0.9;
          ctx.beginPath(); ctx.ellipse(0, 0, q.r, q.r * 0.42, 0, 0, TAU); ctx.fill();
          ctx.restore();
          break;
        }
        case P_POEIRA: {
          ctx.globalAlpha = t * 0.5;
          ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, TAU); ctx.fill();
          break;
        }
        default: {
          const s = q.r * (0.3 + t * 0.9);
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
          ctx.beginPath();
          ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * 0.2, -s * 0.2, s, 0);
          ctx.quadraticCurveTo(s * 0.2, s * 0.2, 0, s);
          ctx.quadraticCurveTo(-s * 0.2, s * 0.2, -s, 0);
          ctx.quadraticCurveTo(-s * 0.2, -s * 0.2, 0, -s);
          ctx.fill(); ctx.restore();
        }
      }
    }
    ctx.restore();
  }

  faiscas(x, y, n, cor, vel = 200, vida = 0.8, r = 6) {
    for (let i = 0; i < n; i++) {
      const a = vr.angle(), s = vel * vr.range(0.3, 1);
      this.criar(P_FAISCA, x, y, Math.cos(a) * s, Math.sin(a) * s,
        vida * vr.range(0.6, 1.3), r * vr.range(0.6, 1.2), cor,
        { rot: vr.angle(), vr: vr.range(-4, 4), arrasto: 0.93 });
    }
  }
  petalas(x, y, n, cor) {
    for (let i = 0; i < n; i++) {
      const a = vr.angle(), s = vr.range(40, 170);
      this.criar(P_PETALA, x, y, Math.cos(a) * s, Math.sin(a) * s - 40,
        vr.range(1.2, 2.4), vr.range(4, 8), cor,
        { rot: vr.angle(), vr: vr.range(-3, 3), grav: 130, arrasto: 0.985 });
    }
  }
  anel(x, y, r0, r1, cor, vida = 0.6) { this.criar(P_ANEL, x, y, 0, 0, vida, r0, cor, { r2: r1 }); }
  poeira(x, y, cor, vida = 2.5) {
    this.criar(P_POEIRA, x, y, vr.range(-8, 8), vr.range(-14, -3),
      vida * vr.range(0.6, 1.4), vr.range(0.8, 2.1), cor, { arrasto: 0.998 });
  }
}

export class Textos {
  constructor(max = 40) {
    this.max = max; this.n = 0;
    this.a = new Array(max);
    for (let i = 0; i < max; i++) this.a[i] = { x: 0, y: 0, vy: 0, vida: 0, total: 1, txt: '', cor: '#fff', tam: 18 };
  }
  limpar() { this.n = 0; }
  add(x, y, txt, cor = '#fff', tam = 18) {
    let q;
    if (this.n >= this.max) q = this.a[(this._i = ((this._i | 0) + 1) % this.max)];
    else q = this.a[this.n++];
    q.x = x; q.y = y; q.vy = -70; q.vida = 1.4; q.total = 1.4;
    q.txt = txt; q.cor = cor; q.tam = tam;
    return q;
  }
  passo(dt) {
    for (let i = 0; i < this.n; i++) {
      const q = this.a[i];
      q.vida -= dt;
      if (q.vida <= 0) { const u = this.a[--this.n]; this.a[this.n] = q; this.a[i] = u; i--; continue; }
      q.y += q.vy * dt; q.vy *= Math.pow(0.94, dt * 60);
    }
  }
  desenhar(ctx, fonte) {
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < this.n; i++) {
      const q = this.a[i];
      const t = q.vida / q.total;
      const k = t > 0.82 ? lerp(1.3, 1, easeOutCubic((1 - t) / 0.18)) : 1;
      ctx.globalAlpha = clamp(t * 1.6, 0, 1);
      ctx.font = `800 ${q.tam * k}px ${fonte}`;
      ctx.lineWidth = 5; ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(10,14,34,0.6)';
      ctx.strokeText(q.txt, q.x, q.y);
      ctx.fillStyle = q.cor;
      ctx.fillText(q.txt, q.x, q.y);
    }
    ctx.restore();
  }
}
