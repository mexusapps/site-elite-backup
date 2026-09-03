// ---------------------------------------------------------------------------
// arte.js — pintura procedural. Nenhuma imagem externa: tudo é desenhado por
// código, mas com as técnicas de ilustração e não de "vetor limpo".
//
// O que separa um desenho de canvas comum de algo que parece pintado:
//   • borda irregular — nada de círculo perfeito; todo contorno recebe ruído;
//   • luz com TEMPERATURA — o lado do sol esquenta, a sombra esfria em azul,
//     em vez de simplesmente escurecer;
//   • camadas: base, sombra própria, oclusão de contato, meio-tom, luz direta,
//     e por último uma linha de luz na borda virada para o sol;
//   • grão por cima de tudo, para tirar o aspecto de plástico.
// ---------------------------------------------------------------------------

import { TAU, clamp, lerp } from '../core/math.js';
import * as Img from './imagens.js';

// --- ruído -------------------------------------------------------------------
const PERM = new Uint8Array(512);
(function () {
  let s = 1337;
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
})();

const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
function grad(h, x, y) {
  switch (h & 3) {
    case 0: return x + y; case 1: return -x + y; case 2: return x - y; default: return -x - y;
  }
}
export function ruido(x, y) {
  const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x), yf = y - Math.floor(y);
  const u = fade(xf), v = fade(yf);
  const aa = PERM[PERM[xi] + yi], ab = PERM[PERM[xi] + yi + 1];
  const ba = PERM[PERM[xi + 1] + yi], bb = PERM[PERM[xi + 1] + yi + 1];
  const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
  const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
  return lerp(x1, x2, v) * 0.5;
}
export function fbm(x, y, oitavas = 4) {
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < oitavas; i++) { v += ruido(x * f, y * f) * a; f *= 2; a *= 0.5; }
  return v;
}

// --- cor ----------------------------------------------------------------------
export function hsl(h, s, l, a = 1) {
  return `hsla(${h},${s}%,${l}%,${a})`;
}
export function rgb(r, g, b, a = 1) {
  return `rgba(${r | 0},${g | 0},${b | 0},${a})`;
}
/**
 * Lê uma cor em qualquer das formas que circulam por aqui: '#rgb', '#rrggbb',
 * 'rgb(...)', 'rgba(...)' ou já um array [r,g,b].
 *
 * A versão anterior só entendia hexadecimal, e devolvia lixo para o resto. O
 * estrago era invisível no código e enorme na tela: misturar uma cor que já
 * tinha passado por outra mistura dava 'rgba(NaN,…)', o canvas recusava o valor
 * e mantinha o preenchimento anterior — a mata inteira do fundo saía PRETA em
 * vez de esverdeada pela névoa. Um parser tolerante conserta a floresta.
 */
export function paraRgb(c) {
  if (Array.isArray(c)) return c;
  if (typeof c !== 'string') return [0, 0, 0];
  if (c[0] === '#') {
    if (c.length === 4) {
      const n = parseInt(c.slice(1), 16);
      const r = (n >> 8) & 15, g = (n >> 4) & 15, b = n & 15;
      return [r * 17, g * 17, b * 17];
    }
    const n = parseInt(c.slice(1, 7), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = c.match(/-?[\d.]+/g);
  if (m && m.length >= 3) return [+m[0], +m[1], +m[2]];
  return [0, 0, 0];
}

export function mistura(a, b, t) {
  const A = paraRgb(a), B = paraRgb(b);
  return rgb(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t));
}
export function comAlfa(h, a) {
  const [r, g, b] = paraRgb(h);
  return `rgba(${r | 0},${g | 0},${b | 0},${a})`;
}
/** Afasta a cor na direção do céu: é assim que distância vira névoa. */
export function nevoar(cor, corCeu, t) { return mistura(cor, corCeu, t); }

// --- formas com borda viva -----------------------------------------------------
/** Traça um polígono com a borda amassada por ruído — nada fica "de régua". */
export function contornoVivo(ctx, pontos, amplitude, escala, semente = 0) {
  ctx.beginPath();
  const n = pontos.length;
  let primeiro = true;
  for (let i = 0; i < n; i++) {
    const a = pontos[i], b = pontos[(i + 1) % n];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const comp = Math.hypot(dx, dy);
    const passos = Math.max(2, Math.min(26, Math.round(comp / 26)));
    const nx = -dy / (comp || 1), ny = dx / (comp || 1);
    for (let k = 0; k < passos; k++) {
      const t = k / passos;
      const px = a[0] + dx * t, py = a[1] + dy * t;
      const d = fbm((px + semente * 91) * escala, (py + semente * 57) * escala, 3) * amplitude;
      const qx = px + nx * d, qy = py + ny * d;
      if (primeiro) { ctx.moveTo(qx, qy); primeiro = false; } else ctx.lineTo(qx, qy);
    }
  }
  ctx.closePath();
}

/** Mancha macia com borda irregular — o tijolo de toda folhagem. */
export function mancha(ctx, x, y, r, semente, achatar = 1, ondas = 0.2) {
  ctx.beginPath();
  const n = 22;
  for (let i = 0; i <= n; i++) {
    const a = (TAU * i) / n;
    const rr = r * (1 + Math.sin(a * 3 + semente) * ondas * 0.5
      + Math.sin(a * 5 + semente * 2.3) * ondas * 0.3);
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * achatar;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/**
 * Moita: uma mancha com a borda em LOBOS, e não lisa.
 *
 * A copa das árvores era feita de manchas macias, e de longe a mata inteira
 * virava um monte de bolhas verdes. Uma folhagem de verdade tem a silhueta
 * recortada: são os tufos de folhas que criam saliências e reentrâncias. Cada
 * lobo aqui é um arco quadrático que sai para fora e volta — mesmo custo de
 * desenho, silhueta completamente diferente.
 */
export function moita(ctx, x, y, r, semente, achatar = 1, lobos = 11) {
  const raioEm = (a) => r * (0.84 + 0.22 * Math.abs(Math.sin(a * 2.7 + semente)));
  ctx.beginPath();
  for (let i = 0; i < lobos; i++) {
    const a0 = (TAU * i) / lobos;
    const a1 = (TAU * (i + 1)) / lobos;
    const am = (a0 + a1) / 2;
    const r0 = raioEm(a0), r1 = raioEm(a1);
    const rm = r * (1.10 + 0.30 * Math.abs(Math.sin(am * 1.9 + semente * 1.3)));
    if (i === 0) ctx.moveTo(x + Math.cos(a0) * r0, y + Math.sin(a0) * r0 * achatar);
    ctx.quadraticCurveTo(
      x + Math.cos(am) * rm, y + Math.sin(am) * rm * achatar,
      x + Math.cos(a1) * r1, y + Math.sin(a1) * r1 * achatar);
  }
  ctx.closePath();
}

/** Grão fino por cima de uma área — tira o aspecto de plástico. */
export function grao(ctx, x, y, w, h, forca = 0.05, passo = 3) {
  ctx.save();
  for (let j = 0; j < h; j += passo) {
    for (let i = 0; i < w; i += passo) {
      const v = fbm((x + i) * 0.09, (y + j) * 0.09, 2);
      const a = Math.abs(v) * forca;
      if (a < 0.006) continue;
      ctx.fillStyle = v > 0 ? `rgba(255,246,220,${a})` : `rgba(20,26,40,${a})`;
      ctx.fillRect(x + i, y + j, passo, passo);
    }
  }
  ctx.restore();
}

// =============================================================================
// TERRENO
// =============================================================================
/**
 * Pinta uma forma de terreno em várias passadas. `luz` é o vetor do sol.
 */
/**
 * Terreno com textura ilustrada: a mesma pilha de luz, oclusão e borda da
 * versão por código, só que a base deixa de ser gradiente e manchas e passa a
 * ser um ladrilho pintado. A luz continua sendo aplicada aqui, e não assada na
 * imagem — é o que mantém a textura utilizável em qualquer fase e hora do dia.
 */
function pintarTerrenoIlustrado(ctx, forma, pal, luz, semente) {
  const p = forma.p, a = forma.aabb;
  const padrao = Img.ladrilho(ctx, 'terra', 0.5);
  ctx.save();
  contornoVivo(ctx, p, 9, 0.02, semente);
  ctx.clip();
  ctx.fillStyle = padrao;
  ctx.fillRect(a.x - 12, a.y - 12, a.w + 24, a.h + 24);

  // luz direta do lado do sol
  const lg = ctx.createLinearGradient(
    a.x + a.w / 2 - luz.x * a.w, a.y + a.h / 2 - luz.y * a.h,
    a.x + a.w / 2 + luz.x * a.w * 0.6, a.y + a.h / 2 + luz.y * a.h * 0.6);
  lg.addColorStop(0, comAlfa(pal.luzQuente, 0.002));
  lg.addColorStop(1, comAlfa(pal.luzQuente, 0.22));
  ctx.fillStyle = lg;
  ctx.fillRect(a.x - 12, a.y - 12, a.w + 24, a.h + 24);

  const alt = Math.min(340, a.h);
  const og = ctx.createLinearGradient(0, a.y + a.h - alt, 0, a.y + a.h);
  og.addColorStop(0, 'rgba(12,18,30,0)');
  og.addColorStop(1, 'rgba(9,14,26,0.62)');
  ctx.fillStyle = og;
  ctx.fillRect(a.x - 12, a.y + a.h - alt, a.w + 24, alt + 12);
  ctx.restore();

  // faixa de grama ilustrada nas arestas viradas para cima
  if (Img.tem('borda_grama')) {
    const im = Img.img('borda_grama');
    for (let i = 0; i < p.length; i++) {
      const A = p[i], B = p[(i + 1) % p.length];
      const dx = B[0] - A[0], dy = B[1] - A[1];
      const comp = Math.hypot(dx, dy);
      if (comp < 20) continue;
      const nx = dy / comp, ny = -dx / comp;
      if (ny > -0.42) continue;
      const altura = 46;
      ctx.save();
      ctx.translate(A[0], A[1]);
      ctx.rotate(Math.atan2(dy, dx));
      const larg = im.width * (altura / im.height);
      for (let x = 0; x < comp; x += larg) {
        ctx.drawImage(im, x, -altura * 0.72, Math.min(larg, comp - x + 2), altura);
      }
      ctx.restore();
      void nx; void ny;
    }
  } else if ((forma.musgo ?? 0.6) > 0.05) {
    capaDeMusgo(ctx, forma, pal, forma.musgo ?? 0.6, semente);
  }

  ctx.save();
  ctx.lineJoin = 'round';
  contornoVivo(ctx, p, 9, 0.02, semente);
  ctx.clip();
  contornoVivo(ctx, p, 9, 0.02, semente);
  ctx.strokeStyle = comAlfa(pal.luzBorda, 0.42);
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.restore();
}

export function pintarTerreno(ctx, forma, pal, luz, semente = 0) {
  if (Img.tem('terra')) return pintarTerrenoIlustrado(ctx, forma, pal, luz, semente);
  const p = forma.p;
  const a = forma.aabb;
  const musgo = forma.musgo ?? 0.6;
  const R = (n) => {                      // ruído determinístico por índice
    const v = Math.sin(n * 12.9898 + semente * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };

  // 0) saliências de rocha em cima da própria silhueta. O polígono da física é
  //    reto; o desenho não pode ser. Estas manchas ficam FORA do recorte, meio
  //    dentro e meio fora da borda, e é o que transforma um bloco de papelão
  //    num barranco de pedra.
  ctx.save();
  for (let i = 0; i < p.length; i++) {
    const A = p[i], B = p[(i + 1) % p.length];
    const dx = B[0] - A[0], dy = B[1] - A[1];
    const comp = Math.hypot(dx, dy);
    if (comp < 60) continue;
    const nx = dy / comp, ny = -dx / comp;
    const n = Math.min(6, Math.max(2, Math.round(comp / 150)));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.28 + R(i * 13 + k) * 0.45) / n;
      const px = A[0] + dx * t, py = A[1] + dy * t;
      const r = 14 + R(i * 31 + k + 7) * 22;
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = mistura(pal.terraMeio, pal.pedraClara, 0.25 + R(i + k) * 0.45);
      mancha(ctx, px - nx * r * 0.58, py - ny * r * 0.58, r, i * 5 + k, 0.78, 0.34);
      ctx.fill();
      // um respingo de luz no topo da saliência, do lado do sol
      if (ny < -0.3) {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = mistura(pal.pedraClara, pal.luzQuente, 0.3);
        mancha(ctx, px - nx * r * 0.1, py - ny * r * 0.1, r * 0.52, i + k * 3, 0.7, 0.3);
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  ctx.save();
  contornoVivo(ctx, p, 9, 0.02, semente);
  ctx.clip();

  // 1) base: terra clara em cima, escura e fria no fundo
  const g = ctx.createLinearGradient(a.x, a.y - 12, a.x, a.y + a.h);
  g.addColorStop(0, pal.terraClara || pal.terraTopo);
  g.addColorStop(0.12, pal.terraTopo);
  g.addColorStop(0.45, pal.terraMeio);
  g.addColorStop(1, pal.terraFundo);
  ctx.fillStyle = g;
  ctx.fillRect(a.x - 10, a.y - 10, a.w + 20, a.h + 20);

  // 2) placas de rocha: poucas manchas GRANDES fazem o barranco parecer feito
  //    de pedra empilhada. Muitas manchas pequenas só sujam a superfície.
  for (let i = 0; i < 14; i++) {
    const x = a.x + (0.1 + R(i) * 0.85) * a.w;
    const y = a.y + (0.05 + R(i + 40) * 0.9) * a.h;
    const r = (0.16 + R(i + 80) * 0.26) * Math.min(a.w, Math.max(a.h, 220));
    ctx.globalAlpha = 0.34 + R(i + 120) * 0.24;
    ctx.fillStyle = i % 2 ? pal.pedraClara : pal.pedraEscura;
    mancha(ctx, x, y, r, i + semente, 0.72, 0.30);
    ctx.fill();
    // fresta escura no pé de cada placa: é a sombra que dá volume
    ctx.globalAlpha = 0.30;
    ctx.fillStyle = pal.terraFundo;
    mancha(ctx, x + r * 0.1, y + r * 0.62, r * 0.9, i * 3 + semente, 0.34, 0.36);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 3) estrias de sedimento, quase horizontais
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = pal.pedraEscura;
  for (let i = 0; i < 9; i++) {
    const y0 = a.y + ((i + 0.5) / 9) * a.h;
    ctx.lineWidth = 1.5 + R(i + 200) * 4;
    ctx.beginPath();
    for (let k = 0; k <= 10; k++) {
      const x = a.x - 10 + (a.w + 20) * (k / 10);
      const y = y0 + fbm(x * 0.006 + i * 7, y0 * 0.01, 3) * 42;
      if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // 4) seixos: pedrinha com luz em cima e sombra embaixo, o detalhe que faz
  //    o olho aceitar a superfície como matéria e não como cor chapada
  for (let i = 0; i < 22; i++) {
    const x = a.x + R(i + 300) * a.w;
    const y = a.y + (0.06 + R(i + 340) * 0.9) * a.h;
    const r = 4 + R(i + 380) * 11;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = pal.terraFundo;
    mancha(ctx, x + 1.5, y + 2.5, r, i, 0.72, 0.3); ctx.fill();
    ctx.globalAlpha = 0.62;
    ctx.fillStyle = mistura(pal.pedraClara, pal.luzQuente, 0.18);
    mancha(ctx, x, y, r, i, 0.72, 0.3); ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = mistura(pal.pedraClara, '#ffffff', 0.4);
    mancha(ctx, x - r * 0.18, y - r * 0.28, r * 0.5, i + 9, 0.7, 0.3); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 5) faixa de terra viva logo abaixo das arestas viradas para cima —
  //    é ela que faz um bloco de pedra virar "chão"
  for (let i = 0; i < p.length; i++) {
    const A = p[i], B = p[(i + 1) % p.length];
    const dx = B[0] - A[0], dy = B[1] - A[1];
    const comp = Math.hypot(dx, dy);
    if (comp < 24) continue;
    const nx = dy / comp, ny = -dx / comp;
    if (ny > -0.42) continue;
    const esp = 34;
    ctx.beginPath();
    ctx.moveTo(A[0], A[1]);
    ctx.lineTo(B[0], B[1]);
    ctx.lineTo(B[0] - nx * esp, B[1] - ny * esp);
    ctx.lineTo(A[0] - nx * esp, A[1] - ny * esp);
    ctx.closePath();
    const fg = ctx.createLinearGradient(A[0] + nx * 4, A[1] + ny * 4,
      A[0] - nx * esp, A[1] - ny * esp);
    fg.addColorStop(0, comAlfa(pal.terraClara || pal.terraTopo, 0.85));
    fg.addColorStop(1, comAlfa(pal.terraTopo, 0));
    ctx.fillStyle = fg;
    ctx.fill();
  }

  // 6) luz direta pelo lado do sol
  const lg = ctx.createLinearGradient(
    a.x + a.w / 2 - luz.x * a.w, a.y + a.h / 2 - luz.y * a.h,
    a.x + a.w / 2 + luz.x * a.w * 0.6, a.y + a.h / 2 + luz.y * a.h * 0.6);
  lg.addColorStop(0, comAlfa(pal.luzQuente, 0.002));
  lg.addColorStop(1, comAlfa(pal.luzQuente, 0.17));
  ctx.fillStyle = lg;
  ctx.fillRect(a.x - 10, a.y - 10, a.w + 20, a.h + 20);

  // 7) oclusão: o pé da forma some no escuro frio
  const alt = Math.min(340, a.h);
  const og = ctx.createLinearGradient(0, a.y + a.h - alt, 0, a.y + a.h);
  og.addColorStop(0, 'rgba(12,18,30,0)');
  og.addColorStop(1, 'rgba(9,14,26,0.62)');
  ctx.fillStyle = og;
  ctx.fillRect(a.x - 10, a.y + a.h - alt, a.w + 20, alt + 10);

  ctx.restore();

  // 8) capa de musgo nas arestas viradas para cima
  if (musgo > 0.05) capaDeMusgo(ctx, forma, pal, musgo, semente);

  // 9) fio de luz na borda do lado do sol
  ctx.save();
  ctx.lineJoin = 'round';
  contornoVivo(ctx, p, 9, 0.02, semente);
  ctx.clip();
  contornoVivo(ctx, p, 9, 0.02, semente);
  ctx.strokeStyle = comAlfa(pal.luzBorda, 0.42);
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.restore();
}

/** Musgo: só nas arestas cujo normal aponta para cima. */
function capaDeMusgo(ctx, forma, pal, forca, semente) {
  const p = forma.p;
  ctx.save();
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const comp = Math.hypot(dx, dy);
    if (comp < 8) continue;
    const nx = dy / comp, ny = -dx / comp;   // normal para fora (sentido horário)
    if (ny > -0.42) continue;                // não é uma aresta virada para cima

    const passos = Math.max(3, Math.round(comp / 13));
    // corpo do musgo
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    for (let k = 0; k <= passos; k++) {
      const t = k / passos;
      const px = a[0] + dx * t, py = a[1] + dy * t;
      const esp = (11 + fbm(px * 0.03 + semente, py * 0.03, 3) * 22) * forca;
      ctx.lineTo(px + nx * esp, py + ny * esp);
    }
    ctx.lineTo(b[0], b[1]);
    ctx.closePath();
    const g = ctx.createLinearGradient(
      (a[0] + b[0]) / 2 + nx * 30, (a[1] + b[1]) / 2 + ny * 30,
      (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    g.addColorStop(0, pal.musgoClaro);
    g.addColorStop(0.6, pal.musgo);
    g.addColorStop(1, pal.musgoEscuro);
    ctx.fillStyle = g;
    ctx.fill();

    // fiapos de grama saindo do musgo
    ctx.strokeStyle = comAlfa(pal.musgoClaro, 0.85);
    ctx.lineCap = 'round';
    for (let k = 0; k < passos * 2; k++) {
      const t = (k + 0.5) / (passos * 2);
      const px = a[0] + dx * t, py = a[1] + dy * t;
      const n = fbm(px * 0.11 + semente * 3, py * 0.11, 2);
      const h = (7 + Math.abs(n) * 20) * forca;
      const inc = n * 0.9;
      ctx.lineWidth = 1.6 + Math.abs(n) * 1.4;
      ctx.beginPath();
      ctx.moveTo(px + nx * 4, py + ny * 4);
      ctx.quadraticCurveTo(
        px + nx * h * 0.6 + inc * 6, py + ny * h * 0.6,
        px + nx * h + inc * 13, py + ny * h);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// =============================================================================
// VEGETAÇÃO
// =============================================================================
/** Árvore em camadas: tronco com casca, galhos e copa de manchas sobrepostas. */
export function arvore(ctx, x, base, alt, escala, semente, pal, nevoa = 0) {
  const larguraTronco = 26 * escala;
  const topo = base - alt;
  const cor = (c) => (nevoa > 0 ? nevoar(c, pal.ceuMedio, nevoa) : c);

  // tronco
  ctx.save();
  const inclina = Math.sin(semente * 1.7) * 0.06;
  ctx.beginPath();
  ctx.moveTo(x - larguraTronco * 0.62, base + 10);
  ctx.quadraticCurveTo(
    x - larguraTronco * 0.3 + inclina * alt * 0.3, base - alt * 0.5,
    x - larguraTronco * 0.16 + inclina * alt, topo + alt * 0.1);
  ctx.lineTo(x + larguraTronco * 0.16 + inclina * alt, topo + alt * 0.1);
  ctx.quadraticCurveTo(
    x + larguraTronco * 0.34 + inclina * alt * 0.3, base - alt * 0.5,
    x + larguraTronco * 0.68, base + 10);
  ctx.closePath();
  const gt = ctx.createLinearGradient(x - larguraTronco, 0, x + larguraTronco, 0);
  gt.addColorStop(0, cor(pal.troncoEscuro));
  gt.addColorStop(0.42, cor(pal.tronco));
  gt.addColorStop(1, cor(pal.troncoLuz));
  ctx.fillStyle = gt;
  ctx.fill();
  // casca
  ctx.save();
  ctx.clip();
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = cor(pal.troncoEscuro);
  for (let i = 0; i < 9; i++) {
    const fx = x - larguraTronco * 0.6 + (i / 8) * larguraTronco * 1.2;
    ctx.lineWidth = 1 + (i % 3);
    ctx.beginPath();
    ctx.moveTo(fx, base);
    ctx.quadraticCurveTo(fx + inclina * alt * 0.5 + Math.sin(i) * 5, base - alt * 0.5,
      fx + inclina * alt, topo + alt * 0.12);
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();

  // galhos
  ctx.save();
  ctx.strokeStyle = cor(pal.tronco);
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const t = 0.34 + i * 0.16;
    const gy = base - alt * t;
    const lado = i % 2 ? 1 : -1;
    const comp = alt * (0.16 + (i % 3) * 0.045) * escala;
    ctx.lineWidth = (9 - i * 1.4) * escala;
    ctx.beginPath();
    ctx.moveTo(x + inclina * alt * t, gy);
    ctx.quadraticCurveTo(x + lado * comp * 0.6, gy - comp * 0.2,
      x + lado * comp, gy - comp * 0.55);
    ctx.stroke();
  }
  ctx.restore();

  // copa: manchas de trás para a frente, cada vez mais claras
  const cxs = [];
  const nb = Math.round(16 + (semente % 5));
  for (let i = 0; i < nb; i++) {
    const ang = (i / nb) * TAU + semente;
    const raio = alt * (0.16 + 0.16 * Math.abs(Math.sin(ang * 1.7 + semente)));
    const cx = x + inclina * alt + Math.cos(ang) * alt * 0.26 * (0.6 + (i % 3) * 0.2);
    const cy = topo + alt * 0.16 + Math.sin(ang) * alt * 0.13 * (0.7 + (i % 4) * 0.14);
    cxs.push([cx, cy, raio, i]);
  }
  cxs.sort((a, b) => b[1] - a[1]);
  for (const [cx, cy, r, i] of cxs) {
    const luzT = clamp(1 - (cy - topo) / (alt * 0.45), 0, 1);
    const c1 = mistura(pal.folhaEscura, pal.folhaClara, luzT * 0.85);
    ctx.fillStyle = cor(c1);
    moita(ctx, cx, cy, r, i + semente, 0.84, 9 + (i % 4));
    ctx.fill();
  }
  // luz direta nas manchas de cima
  for (const [cx, cy, r, i] of cxs) {
    const luzT = clamp(1 - (cy - topo) / (alt * 0.3), 0, 1);
    if (luzT < 0.45) continue;
    ctx.globalAlpha = (luzT - 0.45) * 1.1;
    ctx.fillStyle = cor(pal.folhaLuz);
    moita(ctx, cx - r * 0.16, cy - r * 0.22, r * 0.60, i * 1.7 + semente, 0.8, 8);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Samambaia: folhas em leque com folíolos. */
export function samambaia(ctx, x, y, escala, semente, pal, vento = 0) {
  const n = 7;
  ctx.save();
  ctx.translate(x, y);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const ang = lerp(-2.5, -0.6, t) + Math.sin(semente + i) * 0.12 + vento * (0.2 + t * 0.4);
    const comp = (52 + Math.sin(semente * 2 + i * 1.7) * 16) * escala;
    ctx.save();
    ctx.rotate(ang);
    const g = ctx.createLinearGradient(0, 0, comp, 0);
    g.addColorStop(0, pal.fernEscura);
    g.addColorStop(1, pal.fernClara);
    ctx.strokeStyle = g;
    ctx.lineWidth = 2.4 * escala;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(comp * 0.5, -comp * 0.18, comp, -comp * 0.1);
    ctx.stroke();
    // folíolos
    ctx.lineWidth = 1.5 * escala;
    for (let k = 1; k < 9; k++) {
      const u = k / 9;
      const px = comp * u, py = -comp * 0.1 * u * u - comp * 0.12 * u * (1 - u) * 2;
      const tam = comp * 0.17 * (1 - u * 0.7);
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.quadraticCurveTo(px + tam * 0.4, py + s * tam * 0.7, px + tam * 0.9, py + s * tam * 0.5);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  ctx.restore();
}

/** Tufo de grama que se inclina com o vento e foge quando algo passa perto. */
export function tufo(ctx, x, y, escala, semente, pal, vento, empurrao = 0) {
  const n = 5 + (semente % 4);
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1) - 0.5) * 2;
    const h = (18 + Math.abs(Math.sin(semente + i * 2.3)) * 26) * escala;
    const inc = t * 0.4 + vento * (0.7 + Math.sin(semente + i) * 0.3) + empurrao;
    ctx.strokeStyle = mistura(pal.gramaEscura, pal.gramaClara,
      0.25 + Math.abs(Math.sin(semente * 3 + i)) * 0.75);
    ctx.lineWidth = (1.7 + Math.abs(t) * 0.8) * escala;
    ctx.beginPath();
    ctx.moveTo(x + t * 5 * escala, y);
    ctx.quadraticCurveTo(
      x + t * 6 * escala + inc * h * 0.4, y - h * 0.6,
      x + t * 7 * escala + inc * h, y - h);
    ctx.stroke();
  }
  ctx.restore();
}

/** Florzinha de cinco pétalas, usada nas marcas que a Bolota deixa. */
export function florzinha(ctx, x, y, r, cor, miolo, abertura = 1, giro = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(giro);
  const a = clamp(abertura, 0, 1);
  for (let i = 0; i < 5; i++) {
    const ang = (TAU * i) / 5;
    ctx.save();
    ctx.rotate(ang);
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.62 * a, r * 0.36 * a, r * 0.6 * a, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = miolo;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.3 * a, 0, TAU); ctx.fill();
  ctx.restore();
}

/** Cogumelo-mola: chapéu turgido com lamelas embaixo. */
export function cogumelo(ctx, x, y, larg, alt, comp, pal, semente = 0) {
  const k = clamp(comp, 0, 1);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1 + (1 - k) * 0.14, k * 0.55 + 0.45);
  // pé
  ctx.fillStyle = pal.cogumeloPe;
  ctx.beginPath();
  ctx.moveTo(-larg * 0.17, 0);
  ctx.quadraticCurveTo(-larg * 0.13, -alt * 0.55, -larg * 0.2, -alt * 0.8);
  ctx.lineTo(larg * 0.2, -alt * 0.8);
  ctx.quadraticCurveTo(larg * 0.13, -alt * 0.55, larg * 0.17, 0);
  ctx.closePath();
  ctx.fill();
  // lamelas
  ctx.fillStyle = pal.cogumeloLamela;
  ctx.beginPath();
  ctx.ellipse(0, -alt * 0.78, larg * 0.52, alt * 0.16, 0, 0, TAU);
  ctx.fill();
  // chapéu
  const g = ctx.createLinearGradient(0, -alt * 1.35, 0, -alt * 0.7);
  g.addColorStop(0, pal.cogumeloClaro);
  g.addColorStop(1, pal.cogumeloEscuro);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-larg * 0.56, -alt * 0.8);
  ctx.quadraticCurveTo(-larg * 0.5, -alt * 1.42, 0, -alt * 1.42);
  ctx.quadraticCurveTo(larg * 0.5, -alt * 1.42, larg * 0.56, -alt * 0.8);
  ctx.quadraticCurveTo(0, -alt * 0.62, -larg * 0.56, -alt * 0.8);
  ctx.closePath();
  ctx.fill();
  // pintinhas
  ctx.fillStyle = pal.cogumeloPinta;
  for (let i = 0; i < 5; i++) {
    const t = (i * 0.618 + semente * 0.3) % 1;
    const px = (t - 0.5) * larg * 0.82;
    const py = -alt * (0.98 + Math.cos((t - 0.5) * 3) * 0.22);
    ctx.beginPath();
    ctx.ellipse(px, py, larg * (0.05 + (i % 3) * 0.017), alt * 0.05, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
