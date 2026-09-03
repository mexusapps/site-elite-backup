// ---------------------------------------------------------------------------
// draw.js — o desenho do POMAR. Nenhuma imagem: cada fruta é gerada uma vez
// num canvas próprio (gradiente, textura, brilho) e depois só carimbada. O
// rosto é desenhado ao vivo por cima, porque ele pisca, sorri e faz careta no
// impacto — e é o rosto que faz a fruta virar personagem.
// ---------------------------------------------------------------------------

import { TAU, clamp, lerp, easeOutCubic } from '../core/math.js';
import { FRUTAS, MAX_TIER } from '../game/fruits.js';

const SS = 2;             // supersampling do sprite

export const PALETAS = {
  pomar: {
    ceu1: '#ffeccc', ceu2: '#ffd9a8', ceu3: '#f6c98d',
    morro1: '#a8cf7c', morro2: '#8dbb68',
    cesta: '#b5793f', cestaEsc: '#8a5527', cestaClara: '#d29a5e',
    fundoCesta: '#f6e3c4',
    tinta: '#4a3020', tintaFraca: '#8a6a4e',
    sol: '#ffe9a8', linha: '#e08b3a',
    painel: 'rgba(255,248,232,0.92)',
  },
  suave: {   // menos contraste, cores mais lavadas
    ceu1: '#f2f0ea', ceu2: '#e6e2d6', ceu3: '#dcd6c6',
    morro1: '#c3cfae', morro2: '#adbb95',
    cesta: '#b9a184', cestaEsc: '#93795c', cestaClara: '#d2c0a6',
    fundoCesta: '#f4efe4',
    tinta: '#4c463c', tintaFraca: '#8b8375',
    sol: '#efe4c2', linha: '#b08a55',
    painel: 'rgba(252,250,245,0.94)',
  },
  forte: {   // alto contraste
    ceu1: '#ffffff', ceu2: '#f2f2f2', ceu3: '#e4e4e4',
    morro1: '#3f8f4a', morro2: '#2c6f36',
    cesta: '#5a3a1c', cestaEsc: '#2e1c0c', cestaClara: '#8a5a2c',
    fundoCesta: '#ffffff',
    tinta: '#000000', tintaFraca: '#3a3a3a',
    sol: '#ffd400', linha: '#c00000',
    painel: 'rgba(255,255,255,0.97)',
  },
};

const spriteCache = new Map();

function claro(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(Math.round(((n >> 16) & 255) + 255 * k), 0, 255);
  const g = clamp(Math.round(((n >> 8) & 255) + 255 * k), 0, 255);
  const b = clamp(Math.round((n & 255) + 255 * k), 0, 255);
  return `rgb(${r},${g},${b})`;
}

/** Gera (uma vez) o corpo de cada fruta: gradiente, textura e brilho. */
function sprite(tier) {
  const chave = 't' + tier;
  let c = spriteCache.get(chave);
  if (c) return c;
  const f = FRUTAS[tier];
  const R = f.r * SS;
  const pad = 10 * SS;
  const size = Math.ceil(R * 2 + pad * 2);
  c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const cx = size / 2, cy = size / 2;

  g.save();
  g.translate(cx, cy);

  // corpo
  const grad = g.createRadialGradient(-R * 0.32, -R * 0.36, R * 0.12, 0, 0, R);
  grad.addColorStop(0, claro(f.cor2, 0.16));
  grad.addColorStop(0.55, f.cor2);
  grad.addColorStop(1, f.cor);
  g.fillStyle = grad;
  g.beginPath();
  if (f.forma === 'limao') g.ellipse(0, 0, R, R * 0.88, 0, 0, TAU);
  else if (f.forma === 'pessego') g.ellipse(0, 0, R * 0.98, R, 0, 0, TAU);
  else g.arc(0, 0, R, 0, TAU);
  g.fill();

  // textura por fruta — o que faz cada uma ser reconhecível de longe
  g.save();
  g.beginPath(); g.arc(0, 0, R, 0, TAU); g.clip();
  switch (f.forma) {
    case 'semente':
      g.strokeStyle = claro(f.cor, -0.12); g.lineWidth = R * 0.13;
      g.beginPath(); g.moveTo(0, -R * 0.55); g.lineTo(0, R * 0.55); g.stroke();
      break;
    case 'amora':
      g.fillStyle = claro(f.cor, -0.08);
      for (let i = 0; i < 9; i++) {
        const a = (TAU * i) / 9, rr = R * 0.52;
        g.beginPath(); g.arc(Math.cos(a) * rr, Math.sin(a) * rr, R * 0.3, 0, TAU); g.fill();
      }
      g.beginPath(); g.arc(0, 0, R * 0.34, 0, TAU); g.fill();
      break;
    case 'uva':
      g.fillStyle = claro(f.cor2, 0.14);
      for (let i = 0; i < 6; i++) {
        const a = (TAU * i) / 6 + 0.4;
        g.beginPath(); g.arc(Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5, R * 0.14, 0, TAU); g.fill();
      }
      break;
    case 'cereja':
      g.strokeStyle = claro(f.cor, 0.2); g.lineWidth = R * 0.09;
      g.beginPath(); g.arc(-R * 0.2, R * 0.1, R * 0.58, -0.9, 0.7); g.stroke();
      break;
    case 'limao':
      g.strokeStyle = claro(f.cor, -0.1); g.lineWidth = R * 0.06;
      for (let i = 0; i < 5; i++) {
        g.beginPath();
        g.ellipse(0, 0, R * (0.3 + i * 0.17), R * (0.26 + i * 0.15), 0, 0, TAU);
        g.stroke();
      }
      break;
    case 'laranja':
      g.fillStyle = claro(f.cor, -0.07);
      for (let i = 0; i < 22; i++) {
        const a = (TAU * i) / 22 + i * 0.7, rr = R * (0.25 + (i % 4) * 0.18);
        g.beginPath(); g.arc(Math.cos(a) * rr, Math.sin(a) * rr, R * 0.045, 0, TAU); g.fill();
      }
      break;
    case 'maca':
      g.fillStyle = claro(f.cor2, 0.1);
      g.beginPath(); g.ellipse(-R * 0.34, R * 0.1, R * 0.3, R * 0.5, -0.3, 0, TAU); g.fill();
      break;
    case 'pessego':
      g.strokeStyle = claro(f.cor, -0.12); g.lineWidth = R * 0.07;
      g.beginPath(); g.moveTo(0, -R); g.quadraticCurveTo(R * 0.2, 0, 0, R); g.stroke();
      break;
    case 'abacaxi':
      g.strokeStyle = claro(f.cor, -0.16); g.lineWidth = R * 0.05;
      for (let i = -6; i <= 6; i++) {
        g.beginPath(); g.moveTo(-R, i * R * 0.22 - R * 0.4); g.lineTo(R, i * R * 0.22 + R * 0.4); g.stroke();
        g.beginPath(); g.moveTo(-R, i * R * 0.22 + R * 0.4); g.lineTo(R, i * R * 0.22 - R * 0.4); g.stroke();
      }
      break;
    case 'melao':
      g.strokeStyle = claro(f.cor, -0.22); g.lineWidth = R * 0.05;
      for (let i = 0; i < 7; i++) {
        g.beginPath();
        g.ellipse(0, 0, R * 0.95, R * (0.2 + i * 0.13), i * 0.45, 0, TAU);
        g.stroke();
      }
      break;
    case 'melancia': {
      // faixas verticais que acompanham a curvatura da bola
      g.fillStyle = claro(f.cor, -0.2);
      for (let i = -2; i <= 2; i++) {
        const cx2 = i * R * 0.42;
        const larg = R * 0.13 * (1 - Math.abs(i) * 0.16);
        const curva = cx2 * 0.45;
        g.beginPath();
        g.moveTo(cx2 - larg, -R * 1.05);
        g.quadraticCurveTo(cx2 - larg + curva, 0, cx2 - larg, R * 1.05);
        g.lineTo(cx2 + larg, R * 1.05);
        g.quadraticCurveTo(cx2 + larg + curva, 0, cx2 + larg, -R * 1.05);
        g.closePath();
        g.fill();
      }
      g.fillStyle = claro(f.cor, 0.1);
      for (let i = -2; i < 2; i++) {
        const cx2 = i * R * 0.42 + R * 0.21;
        g.beginPath();
        g.ellipse(cx2, 0, R * 0.03, R * 0.95, cx2 * 0.004, 0, TAU);
        g.fill();
      }
      break;
    }
    default: break;
  }
  g.restore();

  // brilho especular
  g.globalAlpha = 0.55;
  g.fillStyle = '#fff';
  g.beginPath();
  g.ellipse(-R * 0.36, -R * 0.4, R * 0.22, R * 0.14, -0.7, 0, TAU);
  g.fill();
  g.globalAlpha = 1;

  // contorno suave
  g.strokeStyle = 'rgba(60,36,18,0.28)';
  g.lineWidth = Math.max(1.5, R * 0.045);
  g.beginPath();
  if (f.forma === 'limao') g.ellipse(0, 0, R, R * 0.88, 0, 0, TAU);
  else if (f.forma === 'pessego') g.ellipse(0, 0, R * 0.98, R, 0, 0, TAU);
  else g.arc(0, 0, R, 0, TAU);
  g.stroke();

  // cabinho e folha, para as maiores
  if (tier >= 3) {
    g.strokeStyle = '#7a5a2c'; g.lineWidth = Math.max(2, R * 0.075);
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, -R * 0.92); g.quadraticCurveTo(R * 0.1, -R * 1.14, R * 0.02, -R * 1.24); g.stroke();
    g.fillStyle = '#6fae4e';
    g.save(); g.translate(R * 0.12, -R * 1.1); g.rotate(-0.5);
    g.beginPath(); g.ellipse(R * 0.2, 0, R * 0.26, R * 0.12, 0, 0, TAU); g.fill();
    g.strokeStyle = '#4e8434'; g.lineWidth = Math.max(1, R * 0.02);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(R * 0.42, 0); g.stroke();
    g.restore();
  }
  if (f.forma === 'abacaxi') {
    g.fillStyle = '#5f9c3a';
    for (let i = -2; i <= 2; i++) {
      g.save(); g.translate(0, -R * 0.95); g.rotate(i * 0.32);
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(R * 0.1, -R * 0.4, 0, -R * 0.62);
      g.quadraticCurveTo(-R * 0.1, -R * 0.4, 0, 0); g.fill(); g.restore();
    }
  }
  g.restore();
  spriteCache.set(chave, { canvas: c, size, escala: 1 / SS, pad });
  return spriteCache.get(chave);
}

export function limparSprites() { spriteCache.clear(); }

/**
 * Desenha uma fruta completa (corpo carimbado + rosto ao vivo).
 * `estado` traz piscada, careta de impacto e sorriso de fusão.
 */
export function desenharFruta(ctx, tier, x, y, r, angulo, esx, esy, t, estado) {
  const sp = sprite(tier);
  const f = FRUTAS[tier];
  const k = r / f.r;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(esx, esy);
  ctx.rotate(angulo);
  const s = sp.size * sp.escala * k;
  ctx.drawImage(sp.canvas, -s / 2, -s / 2, s, s);
  ctx.rotate(-angulo * 0.86);            // o rosto quase não gira: fica legível
  desenharRosto(ctx, r, t, estado);
  ctx.restore();
}

function desenharRosto(ctx, r, t, estado) {
  const semente = (estado && estado.face) || 0;
  const piscada = Math.sin(t * 1.6 + semente * 0.37);
  const piscando = piscada > 0.985;
  const feliz = (estado && estado.feliz) || 0;
  const susto = (estado && estado.susto) || 0;

  const olhoY = -r * 0.1;
  const olhoX = r * 0.31;
  const olhoR = r * 0.115;

  ctx.fillStyle = 'rgba(52,30,16,0.92)';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    if (piscando) {
      ctx.ellipse(sx * olhoX, olhoY, olhoR * 1.15, olhoR * 0.16, 0, 0, TAU);
    } else if (susto > 0.15) {
      ctx.ellipse(sx * olhoX, olhoY, olhoR * 1.25, olhoR * 1.25, 0, 0, TAU);
    } else {
      ctx.ellipse(sx * olhoX, olhoY, olhoR, olhoR * (feliz > 0.2 ? 0.55 : 1), 0, 0, TAU);
    }
    ctx.fill();
    if (!piscando && susto <= 0.15) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(sx * olhoX + olhoR * 0.3, olhoY - olhoR * 0.34, olhoR * 0.3, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(52,30,16,0.92)';
    }
  }

  // boca
  ctx.strokeStyle = 'rgba(52,30,16,0.82)';
  ctx.lineWidth = Math.max(1.4, r * 0.055);
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (susto > 0.15) {
    ctx.ellipse(0, r * 0.3, r * 0.13, r * 0.16, 0, 0, TAU);
    ctx.fillStyle = 'rgba(52,30,16,0.7)'; ctx.fill();
  } else {
    const ab = r * (0.19 + feliz * 0.1);
    ctx.arc(0, r * 0.13, ab, 0.35 * Math.PI, 0.65 * Math.PI);
    ctx.stroke();
  }

  // bochechas rosadas, só nas frutas grandes (nas pequenas viram sujeira)
  if (r > 26) {
    ctx.globalAlpha = 0.3 + feliz * 0.35;
    ctx.fillStyle = '#ff8a8a';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sx * r * 0.52, r * 0.16, r * 0.15, r * 0.1, 0, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------------------
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.fonte = "'Baloo 2', 'Trebuchet MS', system-ui, sans-serif";
    this.t = 0;
    this.pal = PALETAS.pomar;
    this.fundo = null;
  }

  redimensionar(w, h, dpr) {
    this.w = w; this.h = h; this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.fundo = null;
  }

  usarPaleta(nome) {
    this.pal = PALETAS[nome] || PALETAS.pomar;
    this.fundo = null;
  }

  /**
   * Onde a cesta fica na tela. Em celular em pé sobra muita altura: nesse caso
   * a cesta é centralizada em vez de ficar colada embaixo, e sobra espaço sob
   * ela para os botões — que antes caíam em cima da pilha de frutas.
   */
  layout(cesta) {
    const margemTopo = 96, margemBase = 20, margemLado = 16;
    const alturaTotal = cesta.h + margemTopo + margemBase;
    const esc = Math.min(
      (this.w - margemLado * 2) / (cesta.w + 24),
      (this.h - 8) / alturaTotal,
    );
    const e = clamp(esc, 0.25, 1.35);
    const largura = cesta.w * e;
    const altura = cesta.h * e;
    const usado = alturaTotal * e;
    const sobra = Math.max(0, this.h - usado);
    // a folga vai 40% para cima e 60% para baixo: o espaço de baixo vira área
    // de botões, e o de cima deixa a fruta da mão respirar
    const topo = margemTopo * e + sobra * 0.58;
    return {
      e,
      x: (this.w - largura) / 2,
      y: topo,
      w: largura, h: altura,
      abaixo: this.h - (topo + altura),
    };
  }

  _construirFundo() {
    const c = document.createElement('canvas');
    c.width = this.w; c.height = this.h;
    const g = c.getContext('2d');
    const p = this.pal;
    const grad = g.createLinearGradient(0, 0, 0, this.h);
    grad.addColorStop(0, p.ceu1);
    grad.addColorStop(0.55, p.ceu2);
    grad.addColorStop(1, p.ceu3);
    g.fillStyle = grad;
    g.fillRect(0, 0, this.w, this.h);

    // sol
    const sx = this.w * 0.16, sy = this.h * 0.14, sr = Math.min(this.w, this.h) * 0.1;
    const sg = g.createRadialGradient(sx, sy, sr * 0.2, sx, sy, sr * 2.6);
    sg.addColorStop(0, p.sol);
    sg.addColorStop(1, 'rgba(255,233,168,0)');
    g.fillStyle = sg;
    g.beginPath(); g.arc(sx, sy, sr * 2.6, 0, TAU); g.fill();
    g.fillStyle = p.sol;
    g.beginPath(); g.arc(sx, sy, sr * 0.62, 0, TAU); g.fill();

    // morros
    const base = this.h * 0.72;
    g.fillStyle = p.morro1;
    g.beginPath();
    g.moveTo(-20, this.h);
    g.lineTo(-20, base);
    for (let x = -20; x <= this.w + 20; x += 24) {
      g.lineTo(x, base - Math.sin(x * 0.0042) * this.h * 0.05 - Math.sin(x * 0.0011) * this.h * 0.04);
    }
    g.lineTo(this.w + 20, this.h);
    g.closePath(); g.fill();

    g.fillStyle = p.morro2;
    const base2 = this.h * 0.83;
    g.beginPath();
    g.moveTo(-20, this.h);
    g.lineTo(-20, base2);
    for (let x = -20; x <= this.w + 20; x += 24) {
      g.lineTo(x, base2 - Math.sin(x * 0.0031 + 2) * this.h * 0.035);
    }
    g.lineTo(this.w + 20, this.h);
    g.closePath(); g.fill();
    this.fundo = c;
  }

  desenharFundo(ctx) {
    if (!this.fundo) this._construirFundo();
    ctx.drawImage(this.fundo, 0, 0);
  }

  /**
   * Cesta de madeira. O topo é ABERTO: desenhar a borda de cima fechava a
   * cesta e as frutas pareciam atravessar uma tábua. Só existem as duas
   * laterais, o fundo e dois montantes nos cantos.
   */
  desenharCesta(ctx, L) {
    const p = this.pal;
    const r = 18 * L.e;
    ctx.save();

    // sombra no chão
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#4a3020';
    ctx.beginPath();
    ctx.ellipse(L.x + L.w / 2, L.y + L.h + 10 * L.e, L.w * 0.56, 16 * L.e, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;

    // interior (cantos arredondados só embaixo)
    this._cestaPath(ctx, L, r);
    ctx.fillStyle = p.fundoCesta;
    ctx.fill();

    ctx.save();
    this._cestaPath(ctx, L, r);
    ctx.clip();
    const n = 7;
    for (let i = 0; i < n; i++) {
      ctx.globalAlpha = i % 2 ? 0.09 : 0.04;
      ctx.fillStyle = p.cesta;
      ctx.fillRect(L.x + (L.w / n) * i, L.y, L.w / n, L.h);
    }
    ctx.globalAlpha = 1;
    const sh = ctx.createLinearGradient(L.x, 0, L.x + L.w, 0);
    sh.addColorStop(0, 'rgba(120,80,40,0.28)');
    sh.addColorStop(0.13, 'rgba(120,80,40,0)');
    sh.addColorStop(0.87, 'rgba(120,80,40,0)');
    sh.addColorStop(1, 'rgba(120,80,40,0.28)');
    ctx.fillStyle = sh;
    ctx.fillRect(L.x, L.y, L.w, L.h);
    const sv = ctx.createLinearGradient(0, L.y + L.h - 80 * L.e, 0, L.y + L.h);
    sv.addColorStop(0, 'rgba(120,80,40,0)');
    sv.addColorStop(1, 'rgba(120,80,40,0.24)');
    ctx.fillStyle = sv;
    ctx.fillRect(L.x, L.y + L.h - 80 * L.e, L.w, 80 * L.e);
    // um pouco de sol entrando por cima
    const luz = ctx.createLinearGradient(0, L.y, 0, L.y + 120 * L.e);
    luz.addColorStop(0, 'rgba(255,240,200,0.5)');
    luz.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = luz;
    ctx.fillRect(L.x, L.y, L.w, 120 * L.e);
    ctx.restore();

    // madeira das laterais e do fundo, sem tampa em cima
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = p.cesta;
    ctx.lineWidth = 14 * L.e;
    this._cestaU(ctx, L, r);
    ctx.stroke();
    ctx.strokeStyle = p.cestaEsc;
    ctx.lineWidth = 4 * L.e;
    this._cestaU(ctx, L, r);
    ctx.stroke();

    // montantes dos cantos
    const aro = 20 * L.e;
    for (const sx of [L.x, L.x + L.w]) {
      ctx.fillStyle = p.cestaClara;
      this._roundRect(ctx, sx - aro / 2, L.y - aro * 0.62, aro, aro * 1.7, aro * 0.42);
      ctx.fill();
      ctx.strokeStyle = p.cestaEsc; ctx.lineWidth = 2.5 * L.e;
      this._roundRect(ctx, sx - aro / 2, L.y - aro * 0.62, aro, aro * 1.7, aro * 0.42);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Caminho fechado do interior: reto em cima, arredondado embaixo. */
  _cestaPath(ctx, L, r) {
    ctx.beginPath();
    ctx.moveTo(L.x, L.y);
    ctx.lineTo(L.x + L.w, L.y);
    ctx.lineTo(L.x + L.w, L.y + L.h - r);
    ctx.quadraticCurveTo(L.x + L.w, L.y + L.h, L.x + L.w - r, L.y + L.h);
    ctx.lineTo(L.x + r, L.y + L.h);
    ctx.quadraticCurveTo(L.x, L.y + L.h, L.x, L.y + L.h - r);
    ctx.closePath();
  }

  /** Só as três bordas de madeira, em forma de U. */
  _cestaU(ctx, L, r) {
    ctx.beginPath();
    ctx.moveTo(L.x, L.y - 4 * L.e);
    ctx.lineTo(L.x, L.y + L.h - r);
    ctx.quadraticCurveTo(L.x, L.y + L.h, L.x + r, L.y + L.h);
    ctx.lineTo(L.x + L.w - r, L.y + L.h);
    ctx.quadraticCurveTo(L.x + L.w, L.y + L.h, L.x + L.w, L.y + L.h - r);
    ctx.lineTo(L.x + L.w, L.y - 4 * L.e);
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /**
   * Cena do menu: só o pomar, sem cesta e sem os restos da última partida.
   * O tabuleiro aparecendo por trás do título deixava tudo confuso.
   */
  desenharMenu(ctx, t) {
    this.desenharFundo(ctx);
    const e = clamp(Math.min(this.w / 1100, this.h / 760), 0.5, 1.15);
    const y = this.h - 40 * e;
    const enfeite = [
      [10, 0.06, 0.0], [6, 0.17, 0.35], [3, 0.26, 0.7], [8, 0.37, 0.15],
      [5, 0.5, 0.55], [9, 0.63, 0.25], [4, 0.74, 0.8], [7, 0.85, 0.4], [2, 0.94, 0.1],
    ];
    for (const [tier, fx, fase] of enfeite) {
      const f = FRUTAS[tier];
      const r = f.r * 0.72 * e;
      const bob = Math.sin(t * 1.5 + fase * 6.3) * 5 * e;
      desenharFruta(ctx, tier, this.w * fx, y - r * 0.55 + bob, r,
        Math.sin(t * 0.7 + fase * 4) * 0.08, 1, 1, t, { face: tier * 13, feliz: 0.55 });
    }
    // duas frutinhas boiando lá em cima, para o céu não ficar vazio
    for (const [tier, fx, fy, fase] of [[1, 0.12, 0.3, 0.2], [3, 0.9, 0.22, 0.7]]) {
      const f = FRUTAS[tier];
      ctx.save();
      ctx.globalAlpha = 0.55;
      desenharFruta(ctx, tier, this.w * fx, this.h * fy + Math.sin(t * 1.1 + fase * 5) * 10 * e,
        f.r * 0.6 * e, Math.sin(t * 0.6) * 0.2, 1, 1, t, { face: tier * 3, feliz: 0.4 });
      ctx.restore();
    }
  }

  /** Linha do sol: o aviso amigável de que a cesta está enchendo. */
  desenharLinha(ctx, L, y, aviso) {
    const p = this.pal;
    const yy = L.y + y * L.e;
    ctx.save();
    ctx.globalAlpha = 0.35 + aviso * 0.6;
    ctx.strokeStyle = aviso > 0.5 ? p.linha : p.cestaEsc;
    ctx.lineWidth = (aviso > 0.5 ? 3.5 : 2) * L.e;
    ctx.setLineDash([12 * L.e, 10 * L.e]);
    ctx.lineDashOffset = -this.t * 26;
    ctx.beginPath();
    ctx.moveTo(L.x + 4 * L.e, yy);
    ctx.lineTo(L.x + L.w - 4 * L.e, yy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  /** O tucano: chega alegre, leva as frutinhas e vai embora. */
  desenharTucano(ctx, L, voo) {
    const x = L.x + voo.x * L.e;
    const y = L.y + voo.y * L.e;
    const e = L.e;
    const bate = Math.sin(voo.t * 16);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(e, e);

    // asa de trás
    ctx.fillStyle = '#1f2430';
    ctx.save(); ctx.rotate(bate * 0.5);
    ctx.beginPath(); ctx.ellipse(-8, -6, 34, 13, -0.35, 0, TAU); ctx.fill();
    ctx.restore();

    // corpo
    ctx.fillStyle = '#2b3040';
    ctx.beginPath(); ctx.ellipse(0, 0, 30, 21, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffd75e';
    ctx.beginPath(); ctx.ellipse(8, 4, 16, 12, 0, 0, TAU); ctx.fill();

    // cabeça e bico
    ctx.fillStyle = '#2b3040';
    ctx.beginPath(); ctx.arc(24, -10, 15, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff8a2b';
    ctx.beginPath();
    ctx.moveTo(34, -13); ctx.quadraticCurveTo(70, -8, 36, 2);
    ctx.quadraticCurveTo(34, -6, 34, -13); ctx.fill();
    ctx.fillStyle = '#ffd75e';
    ctx.beginPath();
    ctx.moveTo(36, -12); ctx.quadraticCurveTo(60, -9, 37, -3); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(27, -13, 5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#221';
    ctx.beginPath(); ctx.arc(28.5, -13, 2.6, 0, TAU); ctx.fill();

    // asa da frente
    ctx.fillStyle = '#3a4152';
    ctx.save(); ctx.rotate(-bate * 0.6);
    ctx.beginPath(); ctx.ellipse(-2, -4, 32, 12, -0.4, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.restore();

    // frutas carregadas
    for (const f of voo.frutas) {
      desenharFruta(ctx, f.tier, L.x + f.x * L.e, L.y + f.y * L.e, f.r * L.e,
        f.angle, 1, 1, this.t, { face: f.face, feliz: 0.6 });
    }
  }
}
