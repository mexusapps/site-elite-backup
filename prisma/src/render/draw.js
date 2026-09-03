// ---------------------------------------------------------------------------
// draw.js — o desenho do PRISMA.
//
// Duas coisas aqui são o salto de acabamento em relação a um canvas comum:
//
// 1. BLOOM DE VERDADE. Os feixes e os brilhos vão para uma tela auxiliar em
//    metade da resolução; ela é borrada em dois raios diferentes e composta de
//    volta em modo aditivo. É o mesmo pipeline de um shader de bloom, feito com
//    filtro de canvas — e é o que faz a luz parecer luz, e não linha colorida.
//
// 2. UM FEIXE, UMA LINHA POR COR. Luz amarela é desenhada como uma linha
//    vermelha e uma verde lado a lado, que se somam no meio. Além de bonito,
//    resolve o problema de acessibilidade: quem não distingue vermelho de verde
//    conta as linhas e lê os símbolos.
// ---------------------------------------------------------------------------

import { TAU, clamp, lerp, easeOutCubic, easeOutBack } from '../core/math.js';
import { TIPOS, CORES, R, G, B, BRANCO, DX, DY } from '../game/optica.js';

export const PALETAS = {
  jardim: {
    noite1: '#0b1026', noite2: '#141a3a', noite3: '#1e2450',
    dia1: '#ffd9a0', dia2: '#ffb96b', dia3: '#a8d8f0',
    morro: '#101a34', morroDia: '#4a7a4e',
    grade: 'rgba(255,255,255,0.07)', gradeForte: 'rgba(255,255,255,0.14)',
    pedra: '#2a3154', pedraTopo: '#3d4670',
    tinta: '#f2ecff', tintaFraca: '#a89ecb',
    painel: 'rgba(20,24,52,0.86)', painelClaro: 'rgba(255,250,240,0.92)',
    metal: '#cfd8ff', metalEsc: '#7a86b8',
  },
  contraste: {
    noite1: '#000000', noite2: '#0a0a0a', noite3: '#141414',
    dia1: '#ffffff', dia2: '#f0f0f0', dia3: '#e0e0e0',
    morro: '#101010', morroDia: '#2a6a2e',
    grade: 'rgba(255,255,255,0.22)', gradeForte: 'rgba(255,255,255,0.4)',
    pedra: '#333333', pedraTopo: '#555555',
    tinta: '#ffffff', tintaFraca: '#cccccc',
    painel: 'rgba(0,0,0,0.92)', painelClaro: 'rgba(255,255,255,0.96)',
    metal: '#ffffff', metalEsc: '#888888',
  },
};

const CANAIS = [
  { bit: R, hex: '#ff4152', simbolo: 'triangulo' },
  { bit: G, hex: '#4dff7a', simbolo: 'circulo' },
  { bit: B, hex: '#4da6ff', simbolo: 'quadrado' },
];

export function corDe(mask) {
  return (CORES[mask] && CORES[mask].hex) || '#ffffff';
}

/** Desenha o símbolo de um canal — a mesma marca que aparece no feixe e na flor. */
export function simbolo(ctx, tipo, x, y, r) {
  ctx.beginPath();
  if (tipo === 'triangulo') {
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r * 0.92, y + r * 0.72);
    ctx.lineTo(x - r * 0.92, y + r * 0.72);
    ctx.closePath();
  } else if (tipo === 'quadrado') {
    ctx.rect(x - r * 0.82, y - r * 0.82, r * 1.64, r * 1.64);
  } else {
    ctx.arc(x, y, r * 0.92, 0, TAU);
  }
}

/** Marca de cor: um símbolo por canal presente. É a leitura sem depender de cor. */
export function marcaDeCor(ctx, mask, x, y, r, opacidade = 1) {
  const presentes = CANAIS.filter((c) => mask & c.bit);
  const n = presentes.length;
  ctx.save();
  ctx.globalAlpha = opacidade;
  for (let i = 0; i < n; i++) {
    const c = presentes[i];
    const off = n === 1 ? 0 : (i - (n - 1) / 2) * r * 1.5;
    ctx.fillStyle = c.hex;
    simbolo(ctx, c.simbolo, x + off, y, r * (n === 3 ? 0.72 : 0.85));
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = Math.max(1, r * 0.16);
    ctx.stroke();
  }
  ctx.restore();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.luz = document.createElement('canvas');
    this.luzCtx = this.luz.getContext('2d');
    this.borr = document.createElement('canvas');
    this.borrCtx = this.borr.getContext('2d');
    this.fonte = "'Nunito', 'Trebuchet MS', system-ui, sans-serif";
    this.pal = PALETAS.jardim;
    this.t = 0;
    this.fundoCache = null;
    this.brilhoTotal = 1;
  }

  redimensionar(w, h, dpr) {
    this.w = w; this.h = h; this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    const lw = Math.max(2, Math.round(w / 2)), lh = Math.max(2, Math.round(h / 2));
    this.luz.width = lw; this.luz.height = lh;
    // O borrão acontece numa tela MUITO menor: reduzir e ampliar de volta com
    // interpolação é um desfoque quase de graça, enquanto filter:blur num
    // canvas grande custava 40 ms por quadro em máquina sem GPU.
    this.borr.width = Math.max(2, Math.round(w / 10));
    this.borr.height = Math.max(2, Math.round(h / 10));
    this.borr2 = this.borr2 || document.createElement('canvas');
    this.borr2Ctx = this.borr2.getContext('2d');
    this.borr2.width = Math.max(2, Math.round(w / 4));
    this.borr2.height = Math.max(2, Math.round(h / 4));
    this.escalaLuz = 0.5;
    this.fundoCache = null;
    this.fundoClaridade = -1;
    this._brilhoSprites = new Map();
  }

  usarPaleta(nome) {
    this.pal = PALETAS[nome] || PALETAS.jardim;
    this.fundoCache = null;
  }

  /** Onde o tabuleiro cabe, deixando espaço para a bandeja embaixo. */
  layout(cols, linhas, alturaBandeja) {
    const margem = 18;
    const topo = 74;
    const disp = { w: this.w - margem * 2, h: this.h - topo - alturaBandeja - margem };
    const cel = Math.floor(Math.min(disp.w / cols, disp.h / linhas));
    const w = cel * cols, h = cel * linhas;
    return {
      cel,
      x: Math.round((this.w - w) / 2),
      // um pouco acima do centro: em tela alta o tabuleiro colado no meio
      // deixava um vão estranho entre ele e a bandeja
      y: Math.round(topo + (disp.h - h) * 0.4),
      w, h, cols, linhas,
    };
  }

  cx(L, i) { return L.x + ((i % L.cols) + 0.5) * L.cel; }
  cy(L, i) { return L.y + (((i / L.cols) | 0) + 0.5) * L.cel; }

  celulaEm(L, px, py) {
    const x = Math.floor((px - L.x) / L.cel);
    const y = Math.floor((py - L.y) / L.cel);
    if (x < 0 || y < 0 || x >= L.cols || y >= L.linhas) return -1;
    return y * L.cols + x;
  }

  // =========================================================================
  // fundo: noite que vira amanhecer conforme as flores acordam
  // =========================================================================
  desenharFundo(ctx, claridade) {
    // O fundo (gradiente + estrelas + morros) é caro e muda pouco: fica em
    // cache e só é refeito quando a claridade anda de verdade.
    const q = Math.round(clamp(claridade, 0, 1) * 40) / 40;
    if (!this.fundoCache || this.fundoClaridade !== q) {
      if (!this.fundoCache) this.fundoCache = document.createElement('canvas');
      if (this.fundoCache.width !== this.w || this.fundoCache.height !== this.h) {
        this.fundoCache.width = this.w; this.fundoCache.height = this.h;
      }
      const g = this.fundoCache.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, this.w, this.h);
      this._pintarFundo(g, q);
      this.fundoClaridade = q;
    }
    ctx.drawImage(this.fundoCache, 0, 0);
    // só o cintilar das estrelas fica ao vivo, e é barato
    if (q < 0.98 && this._estrelas) {
      ctx.save();
      for (const [fx, fy, r, fase] of this._estrelas) {
        const pisca = Math.sin(this.t * 1.6 + fase);
        if (pisca < 0.86) continue;
        ctx.globalAlpha = (1 - q) * (pisca - 0.86) * 5;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(fx * this.w, fy * this.h, r * 1.8, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
  }

  _pintarFundo(ctx, claridade) {
    const p = this.pal;
    const c = clamp(claridade, 0, 1);
    const mix = (a, b2) => misturar(a, b2, easeOutCubic(c));
    const g = ctx.createLinearGradient(0, 0, 0, this.h);
    g.addColorStop(0, mix(p.noite1, p.dia3));
    g.addColorStop(0.55, mix(p.noite2, p.dia1));
    g.addColorStop(1, mix(p.noite3, p.dia2));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, this.h);

    // estrelas somem com a luz
    if (c < 0.98) {
      if (!this._estrelas) {
        this._estrelas = [];
        let s = 1234;
        const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
        for (let i = 0; i < 90; i++) this._estrelas.push([rnd(), rnd() * 0.7, rnd() * 1.6 + 0.5, rnd() * 6.3]);
      }
      ctx.save();
      for (const [fx, fy, r] of this._estrelas) {
        ctx.globalAlpha = (1 - c) * 0.75;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(fx * this.w, fy * this.h, r, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    // sol/lua a caminho
    const ax = this.w * (0.12 + c * 0.72);
    const ay = this.h * (0.3 - Math.sin(c * Math.PI) * 0.18);
    const ar = Math.min(this.w, this.h) * 0.055;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const halo = ctx.createRadialGradient(ax, ay, ar * 0.4, ax, ay, ar * 6);
    halo.addColorStop(0, c > 0.5 ? 'rgba(255,220,150,0.55)' : 'rgba(200,215,255,0.35)');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.restore();
    ctx.fillStyle = c > 0.5 ? '#fff0c0' : '#e8eeff';
    ctx.beginPath(); ctx.arc(ax, ay, ar, 0, TAU); ctx.fill();
    if (c <= 0.5) {                        // crescente: recorta a lua
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath(); ctx.arc(ax + ar * 0.42, ay - ar * 0.2, ar * 0.92, 0, TAU); ctx.fill();
      ctx.restore();
    }

    // morros
    const cm = misturar(p.morro, p.morroDia, easeOutCubic(c));
    ctx.fillStyle = cm;
    ctx.beginPath();
    const base = this.h * 0.82;
    ctx.moveTo(-10, this.h);
    ctx.lineTo(-10, base);
    for (let x = -10; x <= this.w + 10; x += 26) {
      ctx.lineTo(x, base - Math.sin(x * 0.004) * this.h * 0.04 - Math.sin(x * 0.0013 + 1) * this.h * 0.03);
    }
    ctx.lineTo(this.w + 10, this.h);
    ctx.closePath();
    ctx.fill();
  }

  // =========================================================================
  // tabuleiro
  // =========================================================================
  desenharTabuleiro(ctx, L, tab, destaque) {
    const p = this.pal;
    ctx.save();
    ctx.fillStyle = 'rgba(9,12,30,0.66)';
    this._rr(ctx, L.x - 8, L.y - 8, L.w + 16, L.h + 16, 16);
    ctx.fill();
    ctx.strokeStyle = p.grade;
    ctx.lineWidth = 1;
    for (let x = 0; x <= L.cols; x++) {
      ctx.beginPath();
      ctx.moveTo(L.x + x * L.cel, L.y);
      ctx.lineTo(L.x + x * L.cel, L.y + L.h);
      ctx.stroke();
    }
    for (let y = 0; y <= L.linhas; y++) {
      ctx.beginPath();
      ctx.moveTo(L.x, L.y + y * L.cel);
      ctx.lineTo(L.x + L.w, L.y + y * L.cel);
      ctx.stroke();
    }
    ctx.strokeStyle = p.gradeForte;
    ctx.lineWidth = 2;
    this._rr(ctx, L.x, L.y, L.w, L.h, 10);
    ctx.stroke();

    if (destaque >= 0) {
      const x = L.x + (destaque % L.cols) * L.cel;
      const y = L.y + ((destaque / L.cols) | 0) * L.cel;
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(this.t * 6) * 0.15;
      ctx.fillStyle = '#fff6c0';
      this._rr(ctx, x + 2, y + 2, L.cel - 4, L.cel - 4, 8);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // =========================================================================
  // feixes — vão para a tela de luz, não para a principal
  // =========================================================================
  desenharFeixes(L, res, tab) {
    const g = this.luzCtx;
    const s = this.escalaLuz;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, this.luz.width, this.luz.height);
    g.save();
    g.scale(s, s);
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round';

    const n = L.cols * L.linhas;
    const meia = L.cel / 2;
    const desloc = Math.max(1.6, L.cel * 0.055);

    const larg = Math.max(2.4, L.cel * 0.1);
    for (let i = 0; i < n; i++) {
      const cx = this.cx(L, i), cy = this.cy(L, i);
      for (let d = 0; d < 4; d++) {
        const px = -DY[d], py = DX[d];       // perpendicular, para separar canais
        // metade de dentro: a luz que chega por essa direção
        const mEnt = res.entrada[i * 4 + d];
        if (mEnt) {
          this._meio(g, mEnt, cx - DX[d] * meia, cy - DY[d] * meia, cx, cy, px, py, desloc, larg);
        }
        // metade de fora: a luz que sai por essa direção
        const mSai = res.seg[i * 4 + d];
        if (mSai) {
          const ex = cx + DX[d] * meia, ey = cy + DY[d] * meia;
          this._meio(g, mSai, cx, cy, ex, ey, px, py, desloc, larg);
          const fase = (this.t * 1.4 + i * 0.17) % 1;
          g.globalAlpha = 0.28;
          g.fillStyle = corDe(mSai);
          g.beginPath();
          g.arc(lerp(cx, ex, fase), lerp(cy, ey, fase), Math.max(1.4, L.cel * 0.042), 0, TAU);
          g.fill();
        }
      }
    }
    g.globalAlpha = 1;
    g.restore();
  }

  /** Meia travessia de uma casa, uma linha por canal de cor. */
  _meio(g, mask, x0, y0, x1, y1, px, py, desloc, larg) {
    const canais = CANAIS.filter((c) => mask & c.bit);
    // Abaixo de 1: o núcleo somado ao halo do bloom estourava para branco e a
    // luz perdia justamente a cor, que é a informação principal do jogo.
    g.globalAlpha = 0.82;
    g.lineWidth = larg;
    for (let k = 0; k < canais.length; k++) {
      const c = canais[k];
      const o = canais.length === 1 ? 0 : (k - (canais.length - 1) / 2) * desloc;
      g.strokeStyle = c.hex;
      g.beginPath();
      g.moveTo(x0 + px * o, y0 + py * o);
      g.lineTo(x1 + px * o, y1 + py * o);
      g.stroke();
    }
  }

  /** Acrescenta um brilho pontual na tela de luz (fontes, flores acesas). */
  /** Sprite de brilho por cor, gerado uma vez e só carimbado depois. */
  _sprite(cor) {
    let c = this._brilhoSprites.get(cor);
    if (c) return c;
    const S = 128;
    c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    grad.addColorStop(0, cor);
    grad.addColorStop(0.3, comAlfa(cor, 0.5));
    grad.addColorStop(1, comAlfa(cor, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, S, S);
    this._brilhoSprites.set(cor, c);
    return c;
  }

  brilho(x, y, r, cor, forca = 1) {
    const g = this.luzCtx;
    const s = this.escalaLuz;
    g.save();
    g.scale(s, s);
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = forca;
    const sp = this._sprite(cor);
    g.drawImage(sp, x - r, y - r, r * 2, r * 2);
    g.restore();
  }

  /**
   * Composição do bloom: dois borrões de raios diferentes somados por cima.
   * O raio pequeno dá o núcleo aceso, o grande dá o halo que sai do objeto.
   */
  /**
   * Bloom em UMA composição de tela cheia.
   *
   * A versão ingênua somava três camadas do tamanho da tela; em máquina sem
   * aceleração isso custava 65 ms por quadro. Aqui o halo é montado dentro da
   * própria tela de luz (que é metade da resolução), e só o resultado pronto
   * sobe para a tela principal — uma mistura de tela cheia em vez de três.
   */
  aplicarBloom(ctx) {
    const forca = this.brilhoTotal;
    const g = this.luzCtx;

    if (forca > 0.02) {
      const b = this.borrCtx;
      b.setTransform(1, 0, 0, 1, 0, 0);
      b.clearRect(0, 0, this.borr.width, this.borr.height);
      b.imageSmoothingEnabled = true;
      b.filter = 'blur(1.6px)';
      b.drawImage(this.luz, 0, 0, this.borr.width, this.borr.height);
      b.filter = 'none';

      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'lighter';
      g.imageSmoothingEnabled = true;
      // halo próximo
      g.globalAlpha = 0.42 * forca;
      g.drawImage(this.borr, 0, 0, this.luz.width, this.luz.height);
      // halo largo: a mesma imagem, um pouco maior — dá o segundo raio de graça
      const e = 0.09;
      g.globalAlpha = 0.2 * forca;
      g.drawImage(this.borr,
        -this.luz.width * e / 2, -this.luz.height * e / 2,
        this.luz.width * (1 + e), this.luz.height * (1 + e));
      g.restore();
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.luz, 0, 0, this.w, this.h);
    ctx.restore();
  }

  _rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

// --- utilidades de cor -------------------------------------------------------
function hexRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function misturar(a, b, t) {
  const A = hexRgb(a), B2 = hexRgb(b);
  const r = Math.round(lerp(A[0], B2[0], t));
  const g = Math.round(lerp(A[1], B2[1], t));
  const bb = Math.round(lerp(A[2], B2[2], t));
  return `rgb(${r},${g},${bb})`;
}
export function comAlfa(hex, a) {
  if (hex[0] !== '#') return hex;
  const [r, g, b] = hexRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
