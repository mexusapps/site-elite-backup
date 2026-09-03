// ---------------------------------------------------------------------------
// fx.js — partículas, textos que sobem, confete e um tremor bem leve.
// Tudo respeita as opções de conforto: em 0, o jogo continua perfeito.
// ---------------------------------------------------------------------------

import { clamp, lerp, TAU, easeOutCubic } from './math.js';
import { visualRng as vr } from './rng.js';

export const P_GOTA = 0, P_BRILHO = 1, P_FOLHA = 2, P_CONFETE = 3, P_POEIRA = 4, P_ANEL = 5;

export class Particulas {
  constructor(max = 1100) {
    this.max = max; this.n = 0;
    this.p = new Array(max);
    for (let i = 0; i < max; i++) {
      this.p[i] = { x: 0, y: 0, vx: 0, vy: 0, vida: 0, total: 1, r: 1, r2: 1, tipo: 0, cor: '#fff', rot: 0, vr: 0, grav: 0, arrasto: 0.98 };
    }
  }
  limpar() { this.n = 0; }

  criar(tipo, x, y, vx, vy, vida, r, cor, o) {
    let q;
    if (this.n >= this.max) { q = this.p[(this._i = ((this._i | 0) + 1) % this.max)]; }
    else q = this.p[this.n++];
    q.tipo = tipo; q.x = x; q.y = y; q.vx = vx; q.vy = vy;
    q.vida = vida; q.total = vida; q.r = r; q.r2 = (o && o.r2) || r;
    q.cor = cor; q.rot = (o && o.rot) || 0; q.vr = (o && o.vr) || 0;
    q.grav = (o && o.grav) || 0;
    q.arrasto = (o && o.arrasto !== undefined) ? o.arrasto : 0.96;
    return q;
  }

  passo(dt) {
    for (let i = 0; i < this.n; i++) {
      const q = this.p[i];
      q.vida -= dt;
      if (q.vida <= 0) {
        const u = this.p[--this.n]; this.p[this.n] = q; this.p[i] = u; i--;
        continue;
      }
      q.x += q.vx * dt; q.y += q.vy * dt;
      q.vy += q.grav * dt;
      const d = Math.pow(q.arrasto, dt * 60);
      q.vx *= d; q.vy *= d;
      q.rot += q.vr * dt;
    }
  }

  desenhar(ctx) {
    for (let i = 0; i < this.n; i++) {
      const q = this.p[i];
      const t = clamp(q.vida / q.total, 0, 1);
      ctx.globalAlpha = t;
      switch (q.tipo) {
        case P_ANEL: {
          const rr = lerp(q.r, q.r2, 1 - t);
          ctx.globalAlpha = t * t;
          ctx.strokeStyle = q.cor; ctx.lineWidth = Math.max(1.5, 6 * t);
          ctx.beginPath(); ctx.arc(q.x, q.y, rr, 0, TAU); ctx.stroke();
          break;
        }
        case P_CONFETE: {
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
          ctx.fillStyle = q.cor;
          const w = q.r, h = q.r * 0.5 * (0.4 + Math.abs(Math.sin(q.rot * 2)) * 0.9);
          ctx.fillRect(-w / 2, -h / 2, w, h);
          ctx.restore();
          break;
        }
        case P_FOLHA: {
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
          ctx.fillStyle = q.cor;
          ctx.beginPath();
          ctx.ellipse(0, 0, q.r, q.r * 0.42, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
          break;
        }
        case P_BRILHO: {
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
          ctx.fillStyle = q.cor;
          const s = q.r * (0.4 + t * 0.8);
          ctx.beginPath();
          ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * 0.22, -s * 0.22, s, 0);
          ctx.quadraticCurveTo(s * 0.22, s * 0.22, 0, s);
          ctx.quadraticCurveTo(-s * 0.22, s * 0.22, -s, 0);
          ctx.quadraticCurveTo(-s * 0.22, -s * 0.22, 0, -s);
          ctx.fill(); ctx.restore();
          break;
        }
        case P_POEIRA: {
          ctx.globalAlpha = t * 0.4;
          ctx.fillStyle = q.cor;
          ctx.beginPath(); ctx.arc(q.x, q.y, lerp(q.r, q.r2, 1 - t), 0, TAU); ctx.fill();
          break;
        }
        default: {
          ctx.fillStyle = q.cor;
          const rr = q.r * (0.4 + t * 0.6);
          ctx.beginPath(); ctx.arc(q.x, q.y, rr, 0, TAU); ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  // receitas
  esguicho(x, y, n, cor, vel = 260, vida = 0.6, r = 4) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + vr.range(-1.5, 1.5);
      const s = vel * vr.range(0.35, 1.1);
      this.criar(P_GOTA, x, y, Math.cos(a) * s, Math.sin(a) * s,
        vida * vr.range(0.6, 1.3), r * vr.range(0.6, 1.3), cor, { grav: 900, arrasto: 0.99 });
    }
  }
  estrelas(x, y, n, cor, vel = 180, vida = 0.7, r = 7) {
    for (let i = 0; i < n; i++) {
      const a = vr.angle(); const s = vel * vr.range(0.3, 1);
      this.criar(P_BRILHO, x, y, Math.cos(a) * s, Math.sin(a) * s,
        vida * vr.range(0.7, 1.3), r * vr.range(0.6, 1.2), cor,
        { rot: vr.angle(), vr: vr.range(-5, 5), arrasto: 0.93 });
    }
  }
  anel(x, y, r0, r1, cor, vida = 0.5) {
    this.criar(P_ANEL, x, y, 0, 0, vida, r0, cor, { r2: r1 });
  }
  poeira(x, y, n, cor, vida = 0.5, r = 7) {
    for (let i = 0; i < n; i++) {
      const a = vr.range(-Math.PI, 0);
      const s = vr.range(20, 90);
      this.criar(P_POEIRA, x, y, Math.cos(a) * s, Math.sin(a) * s * 0.4,
        vida * vr.range(0.7, 1.3), r, cor, { r2: r * 2.4, arrasto: 0.93 });
    }
  }
  folhas(x, y, n, cores) {
    for (let i = 0; i < n; i++) {
      const a = vr.angle(); const s = vr.range(60, 220);
      this.criar(P_FOLHA, x, y, Math.cos(a) * s, Math.sin(a) * s - 60,
        vr.range(0.8, 1.6), vr.range(6, 11), cores[Math.floor(vr.next() * cores.length)],
        { rot: vr.angle(), vr: vr.range(-6, 6), grav: 420, arrasto: 0.985 });
    }
  }
  confete(x, y, n, cores, forca = 620) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + vr.range(-1.25, 1.25);
      const s = forca * vr.range(0.35, 1.15);
      this.criar(P_CONFETE, x, y, Math.cos(a) * s, Math.sin(a) * s,
        vr.range(1.4, 2.8), vr.range(7, 14), cores[Math.floor(vr.next() * cores.length)],
        { rot: vr.angle(), vr: vr.range(-9, 9), grav: 640, arrasto: 0.988 });
    }
  }
}

export class Textos {
  constructor(max = 60) {
    this.max = max; this.n = 0;
    this.a = new Array(max);
    for (let i = 0; i < max; i++) this.a[i] = { x: 0, y: 0, vy: 0, vida: 0, total: 1, txt: '', cor: '#fff', tam: 18, forte: false };
  }
  limpar() { this.n = 0; }
  add(x, y, txt, cor = '#fff', tam = 18, forte = false) {
    let q;
    if (this.n >= this.max) q = this.a[(this._i = ((this._i | 0) + 1) % this.max)];
    else q = this.a[this.n++];
    // Numa sequência de fusões os pontos saem todos no mesmo lugar e viram um
    // borrão. Cada novo número sobe um degrau acima do que já está ali.
    let desvio = 0;
    for (let i = 0; i < this.n; i++) {
      const o = this.a[i];
      if (o === q) continue;
      if (Math.abs(o.x - x) < 62 && Math.abs(o.y - (y - desvio)) < 26) {
        desvio += 28;
        if (desvio > 84) break;
        i = -1;                       // recomeça: o novo lugar pode colidir também
      }
    }
    q.x = x + vr.range(-5, 5); q.y = y - desvio; q.vy = forte ? -125 : -95;
    q.vida = forte ? 1.2 : 0.85; q.total = q.vida;
    q.txt = txt; q.cor = cor; q.tam = tam; q.forte = forte;
    return q;
  }
  passo(dt) {
    for (let i = 0; i < this.n; i++) {
      const q = this.a[i];
      q.vida -= dt;
      if (q.vida <= 0) { const u = this.a[--this.n]; this.a[this.n] = q; this.a[i] = u; i--; continue; }
      q.y += q.vy * dt; q.vy += 210 * dt;
    }
  }
  desenhar(ctx, fonte) {
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < this.n; i++) {
      const q = this.a[i];
      const t = q.vida / q.total;
      const cresce = q.forte ? 1.4 : 1.2;
      const k = t > 0.8 ? lerp(cresce, 1, easeOutCubic((1 - t) / 0.2)) : 1;
      ctx.globalAlpha = clamp(t * 1.7, 0, 1);
      ctx.font = `800 ${q.tam * k}px ${fonte}`;
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(58,38,22,0.55)';
      ctx.lineJoin = 'round';
      ctx.strokeText(q.txt, q.x, q.y);
      ctx.fillStyle = q.cor;
      ctx.fillText(q.txt, q.x, q.y);
    }
    ctx.restore();
  }
}

/** Tremor curtinho e opcional — aqui ele é tempero, não susto. */
export class Tremor {
  constructor() { this.v = 0; this.x = 0; this.y = 0; this.escala = 1; }
  bater(v) { this.v = Math.min(1, this.v + v); }
  passo(dt) {
    this.v = Math.max(0, this.v - dt * 2.4);
    const s = this.v * this.v * 13 * this.escala;
    if (s > 0.02) {
      const a = vr.angle();
      this.x = Math.cos(a) * s; this.y = Math.sin(a) * s;
    } else { this.x = 0; this.y = 0; }
  }
}
