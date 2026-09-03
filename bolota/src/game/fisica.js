// ---------------------------------------------------------------------------
// fisica.js — colisão de círculo contra polígonos convexos.
//
// Por que polígono e não caixa: o mundo da Bolota é feito de pedras cobertas de
// musgo, galhos tortos e barrancos. Com caixas o personagem escorrega em
// degraus invisíveis; com polígonos convexos a rampa é de verdade, o pouso
// acompanha a inclinação e o desenho orgânico por cima nunca mente sobre onde
// está o chão.
//
// Determinístico: nenhum Math.random aqui dentro. Mesma sequência de comandos =
// mesma trajetória, sempre — é o que permite testar o jogo de verdade.
// ---------------------------------------------------------------------------

import { clamp, TAU } from '../core/math.js';

export const GRAVIDADE = 2350;

/** Polígono convexo com normais pré-calculadas. */
export class Forma {
  constructor(pontos, opcoes = {}) {
    this.p = pontos;                   // [[x,y], ...] em sentido horário
    this.tipo = opcoes.tipo || 'pedra';
    // atrito = quanto a superfície SEGURA (0 = gelo, 1 = para na hora).
    // A versão anterior guardava o inverso e todo número de terreno saía
    // invertido — musgo virava gelo.
    this.atrito = opcoes.atrito ?? 0.34;
    this.quique = opcoes.quique ?? 0.12;
    this.grude = opcoes.grude ?? false;   // superfície que segura a Bolota
    this._calcular();
  }

  _calcular() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of this.p) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    this.aabb = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    this.cx = (minX + maxX) / 2;
    this.cy = (minY + maxY) / 2;
  }

  /** Ponto mais próximo da borda + se o centro está dentro. */
  maisProximo(px, py, out) {
    const n = this.p.length;
    let melhorD2 = Infinity, mx = 0, my = 0;
    let dentro = true;
    for (let i = 0; i < n; i++) {
      const a = this.p[i], b = this.p[(i + 1) % n];
      const ex = b[0] - a[0], ey = b[1] - a[1];
      const wx = px - a[0], wy = py - a[1];
      // sentido horário em tela (y para baixo): fora = produto vetorial < 0
      if (ex * wy - ey * wx < 0) dentro = false;
      const comp = ex * ex + ey * ey;
      let t = comp > 0 ? (wx * ex + wy * ey) / comp : 0;
      t = clamp(t, 0, 1);
      const qx = a[0] + ex * t, qy = a[1] + ey * t;
      const dx = px - qx, dy = py - qy;
      const d2 = dx * dx + dy * dy;
      if (d2 < melhorD2) { melhorD2 = d2; mx = qx; my = qy; }
    }
    out.x = mx; out.y = my; out.d2 = melhorD2; out.dentro = dentro;
    return out;
  }
}

export function caixa(x, y, w, h, o) {
  return new Forma([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], o);
}

/** Barranco/rampa: quatro cantos livres, prático para desenhar terreno. */
export function quad(a, b, c, d, o) { return new Forma([a, b, c, d], o); }

/** Colina arredondada aproximada por um leque de pontos. */
export function colina(cx, topo, larg, alt, base, n = 10, o) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = cx - larg / 2 + larg * t;
    const y = topo + alt * (1 - Math.sin(t * Math.PI) ** 0.85);
    pts.push([x, y]);
  }
  pts.push([cx + larg / 2, base], [cx - larg / 2, base]);
  return new Forma(pts, o);
}

// ---------------------------------------------------------------------------
export class Corpo {
  constructor(x, y, r) {
    this.x = x; this.y = y;
    this.px = x; this.py = y;
    this.vx = 0; this.vy = 0;
    this.r = r;
    this.noChao = false;
    this.normalX = 0; this.normalY = -1;
    this.tempoNoAr = 0;
    this.ultimoContato = null;
    this.impacto = 0;             // força do último pouso, para efeitos
  }
  get velocidade() { return Math.hypot(this.vx, this.vy); }
}

const _prox = { x: 0, y: 0, d2: 0, dentro: false };

/**
 * Um passo de física. Subpassos evitam atravessar parede em salto forte.
 * Devolve os contatos do quadro, que o jogo usa para fazer o mundo florescer.
 */
export function passo(corpo, formas, dt, opcoes = {}) {
  const sub = opcoes.sub || 4;
  const h = dt / sub;
  const contatos = [];
  corpo.noChao = false;

  for (let s = 0; s < sub; s++) {
    corpo.vy += GRAVIDADE * (opcoes.gravidade ?? 1) * h;
    if (opcoes.arrastoAr) {
      const k = Math.pow(opcoes.arrastoAr, h * 60);
      corpo.vx *= k; corpo.vy *= k;
    }
    corpo.px = corpo.x; corpo.py = corpo.y;
    corpo.x += corpo.vx * h;
    corpo.y += corpo.vy * h;

    for (const f of formas) {
      // descarte rápido pela caixa envolvente
      const a = f.aabb;
      if (corpo.x + corpo.r < a.x || corpo.x - corpo.r > a.x + a.w
        || corpo.y + corpo.r < a.y || corpo.y - corpo.r > a.y + a.h) continue;

      f.maisProximo(corpo.x, corpo.y, _prox);
      const r2 = corpo.r * corpo.r;
      if (!_prox.dentro && _prox.d2 >= r2) continue;

      let nx, ny, prof;
      const d = Math.sqrt(_prox.d2);
      if (_prox.dentro) {
        // centro dentro do polígono: empurra para a borda mais próxima
        nx = (corpo.x - _prox.x) / (d || 1);
        ny = (corpo.y - _prox.y) / (d || 1);
        if (d < 1e-6) { nx = 0; ny = -1; }
        nx = -nx; ny = -ny;
        prof = corpo.r + d;
      } else {
        nx = (corpo.x - _prox.x) / (d || 1);
        ny = (corpo.y - _prox.y) / (d || 1);
        prof = corpo.r - d;
      }

      corpo.x += nx * prof;
      corpo.y += ny * prof;

      const vn = corpo.vx * nx + corpo.vy * ny;
      if (vn < 0) {
        const forca = -vn;
        const quique = f.grude ? 0 : f.quique;
        corpo.vx -= (1 + quique) * vn * nx;
        corpo.vy -= (1 + quique) * vn * ny;
        // atrito na tangente
        const tx = -ny, ty = nx;
        const vt = corpo.vx * tx + corpo.vy * ty;
        const at = f.grude ? 0.95 : f.atrito;
        corpo.vx -= vt * at * tx;
        corpo.vy -= vt * at * ty;
        contatos.push({ forma: f, x: _prox.x, y: _prox.y, nx, ny, forca });
        if (forca > corpo.impacto) corpo.impacto = Math.min(1, forca / 900);
      }

      if (ny < -0.45) {                    // encostou por cima: é chão
        corpo.noChao = true;
        corpo.normalX = nx; corpo.normalY = ny;
        corpo.ultimoContato = f;
      }
    }
  }

  // parar de escorregar quando quase parado num chão plano
  if (corpo.noChao) {
    corpo.tempoNoAr = 0;
    const v = corpo.velocidade;
    if (v < 26) { corpo.vx *= 0.55; corpo.vy *= 0.55; }
    if (v < 8) { corpo.vx = 0; corpo.vy = 0; }
  } else {
    corpo.tempoNoAr += dt;
  }
  return contatos;
}

/** Traça a trajetória futura, para o jogador ver para onde vai. */
export function prever(x, y, vx, vy, formas, r, passos = 46, dt = 1 / 40) {
  const pts = [];
  const c = new Corpo(x, y, r);
  c.vx = vx; c.vy = vy;
  for (let i = 0; i < passos; i++) {
    const bateu = passo(c, formas, dt, { sub: 2 });
    pts.push(c.x, c.y);
    if (bateu.length && bateu.some((k) => k.forca > 120)) break;
  }
  return pts;
}
