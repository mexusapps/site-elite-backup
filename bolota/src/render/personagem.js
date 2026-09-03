// ---------------------------------------------------------------------------
// personagem.js — a Bolota, pintada sobre o esqueleto do rig.js.
//
// Aqui não há regra nem estado: entra uma pose, sai tinta. As decisões de arte:
//
//   • MEMBROS EM DUAS CAMADAS. Cada braço e cada perna é desenhado primeiro
//     como um traço escuro mais grosso e depois como um traço claro por dentro:
//     é o contorno que separa o membro do corpo em qualquer fundo. Os membros
//     do lado de trás saem dessaturados e mais escuros — profundidade sem
//     precisar de sombra.
//   • A CABEÇA É A BOLOTA. Casca pintada em camadas (base, barriga, veios,
//     sombra fria, oclusão do chapéu, luz de borda quente, especular duro) e um
//     chapéu com escamas desenhadas uma a uma.
//   • O ROSTO é pequeno e alto, com a íris em dois tons e um reflexo preso à
//     fonte de luz, que não acompanha o olhar. A sobrancelha faz quase toda a
//     expressão; a boca só confirma.
//   • O BROTO é a correntinha de Verlet do modelo, virando caule que afina até
//     a ponta e termina numa folha que gira conforme o chicote.
// ---------------------------------------------------------------------------

import { TAU, clamp, lerp, easeOutCubic } from '../core/math.js';
import { fbm, comAlfa, mistura } from './arte.js';
import { Rig, CORPO } from './rig.js';
import * as Arte from './imagens.js';

export const CORES = {
  cascaEscura: '#7d4a22',
  cascaMeia: '#b9793c',
  cascaClara: '#e0a663',
  cascaTopo: '#f2cd92',
  barriga: '#f6dcaf',
  veio: '#9a6231',
  chapeu: '#6b4023',
  chapeuClaro: '#95602f',
  chapeuEscuro: '#3f2413',
  chapeuBorda: '#c08a4a',
  corpo: '#e4bc86',
  corpoClaro: '#fbe6c0',
  corpoEscuro: '#b0824c',
  membro: '#a0693a',
  membroClaro: '#c9905a',
  membroEscuro: '#4b2b13',
  extremidade: '#c9945c',
  extremidadeClara: '#f2cf9d',
  caule: '#54823c',
  cauleClaro: '#7cb455',
  folha: '#68ad46',
  folhaClara: '#a8de6d',
  folhaVeio: '#3d6d2c',
  olhoBranco: '#fffaf0',
  iris: '#2f6f63',
  irisClara: '#4fa08c',
  pupila: '#1c1410',
  boca: '#5a2f1c',
  lingua: '#e08b7a',
  blush: '#f0947c',
  sombra: '#3a2a3e',
};

const R = CORPO.raio;

// --- utilitários locais ------------------------------------------------------

function elipse(ctx, x, y, rx, ry, giro = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), giro, 0, TAU);
}

/** Contorno da noz: quase redonda em cima, afinando num biquinho embaixo. */
function caminhoNoz(ctx, r) {
  const w = r * 0.98, h = r * 1.0;
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.98);
  ctx.bezierCurveTo(w * 0.72, -h * 0.96, w * 1.02, -h * 0.38, w * 0.98, h * 0.10);
  ctx.bezierCurveTo(w * 0.94, h * 0.62, w * 0.46, h * 0.98, 0, h * 1.06);
  ctx.bezierCurveTo(-w * 0.46, h * 0.98, -w * 0.94, h * 0.62, -w * 0.98, h * 0.10);
  ctx.bezierCurveTo(-w * 1.02, -h * 0.38, -w * 0.72, -h * 0.96, 0, -h * 0.98);
  ctx.closePath();
}

/**
 * Um membro: dois ossos, traço que afina da raiz para a ponta, contorno escuro
 * por baixo e um fio de luz por cima. Desenhar em três passadas custa quase
 * nada e é a diferença entre "linha" e "braço".
 */
function membro(ctx, ax, ay, bx, by, cx, cy, esp, cor, corLuz, corEscura, fundo) {
  const w = esp * (fundo ? 0.92 : 1);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.strokeStyle = corEscura;
  ctx.lineWidth = w + 2.2;
  ctx.beginPath();
  ctx.moveTo(ax, ay); ctx.quadraticCurveTo(bx, by, cx, cy);
  ctx.stroke();

  // dois ossos com espessuras diferentes: o braço afina do ombro para o pulso,
  // e é esse afinamento que tira o aspecto de salsicha de espessura única
  const g = ctx.createLinearGradient(ax, ay, cx, cy);
  g.addColorStop(0, cor);
  g.addColorStop(1, corLuz);
  ctx.strokeStyle = g;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
  ctx.stroke();
  ctx.lineWidth = w * 0.74;
  ctx.beginPath();
  ctx.moveTo(bx, by); ctx.lineTo(cx, cy);
  ctx.stroke();

  if (!fundo) {
    ctx.strokeStyle = comAlfa('#ffffff', 0.16);
    ctx.lineWidth = Math.max(1, w * 0.3);
    ctx.beginPath();
    ctx.moveTo(ax, ay - w * 0.24); ctx.lineTo(bx, by - w * 0.24);
    ctx.stroke();
  }
}

/** Mão: uma folhinha de três lóbulos. */
function mao(ctx, x, y, ang, esc, fundo) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.scale(esc, esc);
  ctx.beginPath();
  ctx.moveTo(-3.4, 0);
  ctx.bezierCurveTo(-3.6, -4.6, 3.2, -5.2, 4.4, -1.4);
  ctx.bezierCurveTo(5.6, 1.4, 1.8, 4.8, -1.2, 4.0);
  ctx.bezierCurveTo(-2.8, 3.6, -3.4, 2.0, -3.4, 0);
  ctx.closePath();
  const g = ctx.createLinearGradient(-4, -5, 5, 5);
  g.addColorStop(0, fundo ? CORES.membroClaro : CORES.extremidadeClara);
  g.addColorStop(1, fundo ? CORES.membro : CORES.extremidade);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = comAlfa(CORES.membroEscuro, 0.85);
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ctx.restore();
}

/** Pé: uma raizinha achatada, com dois dedos. */
function pe(ctx, x, y, ang, dir, fundo) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang * 0.5);
  ctx.beginPath();
  ctx.moveTo(-4.2 * dir, -2.6);
  ctx.bezierCurveTo(2 * dir, -4.4, 8.4 * dir, -2.2, 8.6 * dir, 1.2);
  ctx.bezierCurveTo(8.8 * dir, 3.4, 2 * dir, 4.0, -4.0 * dir, 3.2);
  ctx.bezierCurveTo(-6.2 * dir, 2.6, -6.2 * dir, -1.4, -4.2 * dir, -2.6);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -4, 0, 4);
  g.addColorStop(0, fundo ? CORES.membroClaro : CORES.extremidadeClara);
  g.addColorStop(1, fundo ? CORES.membro : CORES.extremidade);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = comAlfa(CORES.membroEscuro, 0.9);
  ctx.lineWidth = 1.1;
  ctx.stroke();
  if (!fundo) {
    ctx.strokeStyle = comAlfa(CORES.membroEscuro, 0.5);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(4.2 * dir, -2.2); ctx.lineTo(5.0 * dir, 2.6);
    ctx.moveTo(1.0 * dir, -3.0); ctx.lineTo(1.4 * dir, 3.2);
    ctx.stroke();
  }
  ctx.restore();
}

/** Tronco: uma bolota pequena e macia, com barriga clara e luz de borda. */
function tronco(ctx, pose, pal) {
  const qx = pose.quadril.x, qy = pose.quadril.y;
  const px = pose.peito.x, py = pose.peito.y;
  const cx = (qx + px) / 2, cy = (qy + py) / 2;
  const alt = Math.max(8, Math.hypot(px - qx, py - qy) * 0.42 + 6.5);
  const larg = lerp(10.2, 13, pose.novelo);
  const ang = Math.atan2(py - qy, px - qx) + Math.PI / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ang);

  elipse(ctx, 0, 0, larg, alt);
  const g = ctx.createLinearGradient(-larg, -alt, larg * 0.8, alt);
  g.addColorStop(0, CORES.corpoClaro);
  g.addColorStop(0.5, CORES.corpo);
  g.addColorStop(1, CORES.corpoEscuro);
  ctx.fillStyle = g;
  ctx.fill();

  ctx.save();
  elipse(ctx, 0, 0, larg, alt);
  ctx.clip();
  const gb = ctx.createRadialGradient(-larg * 0.15, alt * 0.30, 1, -larg * 0.15, alt * 0.2, larg * 1.5);
  gb.addColorStop(0, comAlfa(CORES.barriga, 0.72));
  gb.addColorStop(1, comAlfa(CORES.barriga, 0));
  ctx.fillStyle = gb;
  ctx.fillRect(-larg, -alt, larg * 2, alt * 2);
  ctx.globalCompositeOperation = 'lighter';
  const gl = ctx.createRadialGradient(larg * 0.6, -alt * 0.5, 1, larg * 0.5, -alt * 0.4, larg * 1.6);
  gl.addColorStop(0, comAlfa(pal.luzBorda, 0.42));
  gl.addColorStop(1, comAlfa(pal.luzQuente, 0));
  ctx.fillStyle = gl;
  ctx.fillRect(-larg, -alt, larg * 2, alt * 2);
  ctx.restore();

  elipse(ctx, 0, 0, larg, alt);
  ctx.strokeStyle = comAlfa(CORES.membroEscuro, 0.55);
  ctx.lineWidth = 1.3;
  ctx.stroke();
  ctx.restore();
}

// --- peças do ambiente do personagem -----------------------------------------

function desenharTrilha(ctx, b, pal) {
  const tr = b.trilha;
  if (tr.length < 6) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < tr.length; i += 3) {
    const v = tr[i + 2] / 0.34;
    if (v <= 0) continue;
    const r = R * (0.30 + v * 0.52);
    const g = ctx.createRadialGradient(tr[i], tr[i + 1], 0, tr[i], tr[i + 1], r);
    g.addColorStop(0, comAlfa(pal.luzBorda, 0.20 * v));
    g.addColorStop(1, comAlfa(pal.luzQuente, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(tr[i], tr[i + 1], r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function desenharSombra(ctx, b, mundo, chao) {
  if (!isFinite(chao)) return;
  const c = b.corpo;
  const queda = chao - (c.y + R);
  if (queda > 300) return;
  const t = clamp(1 - queda / 300, 0, 1);
  const rx = R * (1.08 - t * 0.10) * lerp(1.35, 1, t) * b.sx;
  const ry = rx * 0.30;
  ctx.save();
  ctx.translate(c.x, chao - 1.5);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(18,26,18,${(0.10 + t * 0.34).toFixed(3)})`);
  g.addColorStop(0.62, `rgba(18,26,18,${(0.05 + t * 0.18).toFixed(3)})`);
  g.addColorStop(1, 'rgba(18,26,18,0)');
  ctx.fillStyle = g;
  elipse(ctx, 0, 0, rx, ry);
  ctx.fill();
  ctx.restore();
}

/** O broto: correntinha de Verlet virando caule + folha. Em coordenadas de mundo. */
function desenharBroto(ctx, br, t, planando) {

  if (!br.iniciado) return;
  const n = br.n;
  const esc = planando ? 1.9 : 1;

  const esq = [], dir = [];
  for (let i = 0; i < n; i++) {
    const px = br.px[i], py = br.py[i];
    const jx = i < n - 1 ? br.px[i + 1] : br.px[i] * 2 - br.px[i - 1];
    const jy = i < n - 1 ? br.py[i + 1] : br.py[i] * 2 - br.py[i - 1];
    let dx = jx - px, dy = jy - py;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    const w = lerp(2.5, 0.8, i / (n - 1));
    esq.push([px - dy * w, py + dx * w]);
    dir.push([px + dy * w, py - dx * w]);
  }
  ctx.beginPath();
  ctx.moveTo(esq[0][0], esq[0][1]);
  for (let i = 1; i < n; i++) ctx.lineTo(esq[i][0], esq[i][1]);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(dir[i][0], dir[i][1]);
  ctx.closePath();
  const gc = ctx.createLinearGradient(br.px[0], br.py[0], br.px[n - 1], br.py[n - 1]);
  gc.addColorStop(0, CORES.caule);
  gc.addColorStop(1, CORES.cauleClaro);
  ctx.fillStyle = gc;
  ctx.fill();

  ctx.strokeStyle = comAlfa(CORES.cauleClaro, 0.75);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(dir[0][0], dir[0][1]);
  for (let i = 1; i < n; i++) ctx.lineTo(dir[i][0], dir[i][1]);
  ctx.stroke();

  const ax = br.px[n - 1] - br.px[n - 2];
  const ay = br.py[n - 1] - br.py[n - 2];
  const ang = Math.atan2(ay, ax);
  const balanco = Math.sin(t * 2.3) * 0.10;
  ctx.save();
  ctx.translate(br.px[n - 1], br.py[n - 1]);
  ctx.rotate(ang + balanco);
  ctx.scale(esc, esc);
  for (const lado of [-1, 1]) {
    const comp = lado < 0 ? 9 : 7;
    const larg = lado < 0 ? 4.4 : 3.4;
    ctx.save();
    ctx.rotate(lado * 0.62);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(comp * 0.5, -larg, comp, 0);
    ctx.quadraticCurveTo(comp * 0.5, larg, 0, 0);
    ctx.closePath();
    const gf = ctx.createLinearGradient(0, -larg, comp, larg);
    gf.addColorStop(0, CORES.folhaClara);
    gf.addColorStop(1, CORES.folha);
    ctx.fillStyle = gf;
    ctx.fill();
    ctx.strokeStyle = comAlfa(CORES.folhaVeio, 0.55);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0.5, 0);
    ctx.lineTo(comp * 0.92, 0);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

/** Casca da cabeça: base, veios, sombra fria, oclusão do chapéu, luz de borda. */
function pintarCasca(ctx, r, pal) {
  caminhoNoz(ctx, r);
  const g = ctx.createLinearGradient(-r * 0.5, -r, r * 0.6, r * 1.1);
  g.addColorStop(0, CORES.cascaClara);
  g.addColorStop(0.42, CORES.cascaMeia);
  g.addColorStop(1, CORES.cascaEscura);
  ctx.fillStyle = g;
  ctx.fill();

  ctx.save();
  caminhoNoz(ctx, r);
  ctx.clip();

  const gb = ctx.createRadialGradient(-r * 0.10, r * 0.30, r * 0.06, -r * 0.10, r * 0.30, r * 1.05);
  gb.addColorStop(0, comAlfa(CORES.barriga, 0.62));
  gb.addColorStop(0.55, comAlfa(CORES.barriga, 0.20));
  gb.addColorStop(1, comAlfa(CORES.barriga, 0));
  ctx.fillStyle = gb;
  ctx.fillRect(-r * 1.2, -r * 1.2, r * 2.4, r * 2.6);

  ctx.strokeStyle = comAlfa(CORES.veio, 0.30);
  ctx.lineWidth = 0.9;
  for (let i = 0; i < 7; i++) {
    const x0 = -r * 0.92 + (i / 6) * r * 1.84;
    ctx.beginPath();
    for (let k = 0; k <= 8; k++) {
      const ty = -0.95 + (k / 8) * 2.0;
      const on = fbm(x0 * 0.09 + i * 3.7, ty * 1.6 + i, 2) - 0.5;
      const x = x0 * (1 - Math.abs(ty) * 0.20) + on * r * 0.20;
      const y = ty * r;
      if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const gs = ctx.createRadialGradient(r * 0.42, -r * 0.30, r * 0.15, -r * 0.30, r * 0.55, r * 1.7);
  gs.addColorStop(0, 'rgba(40,32,58,0)');
  gs.addColorStop(0.62, 'rgba(40,32,58,0.16)');
  gs.addColorStop(1, 'rgba(28,22,46,0.46)');
  ctx.fillStyle = gs;
  ctx.fillRect(-r * 1.2, -r * 1.2, r * 2.4, r * 2.6);

  const go = ctx.createLinearGradient(0, -r * 0.62, 0, -r * 0.06);
  go.addColorStop(0, 'rgba(48,26,12,0.55)');
  go.addColorStop(1, 'rgba(48,26,12,0)');
  ctx.fillStyle = go;
  ctx.fillRect(-r * 1.2, -r * 1.1, r * 2.4, r * 0.9);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const gl = ctx.createRadialGradient(r * 0.60, -r * 0.62, r * 0.05, r * 0.55, -r * 0.55, r * 1.25);
  gl.addColorStop(0, comAlfa(pal.luzBorda, 0.55));
  gl.addColorStop(0.5, comAlfa(pal.luzQuente, 0.16));
  gl.addColorStop(1, comAlfa(pal.luzQuente, 0));
  ctx.fillStyle = gl;
  ctx.fillRect(-r * 1.2, -r * 1.2, r * 2.4, r * 2.6);
  ctx.restore();
  ctx.restore();

  caminhoNoz(ctx, r);
  ctx.lineWidth = 1.5;
  const gc = ctx.createLinearGradient(-r, r, r, -r);
  gc.addColorStop(0, comAlfa(CORES.cascaEscura, 0.9));
  gc.addColorStop(0.55, comAlfa(CORES.cascaMeia, 0.35));
  gc.addColorStop(1, comAlfa(pal.luzBorda, 0.9));
  ctx.strokeStyle = gc;
  ctx.stroke();

  ctx.save();
  caminhoNoz(ctx, r);
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = comAlfa('#ffffff', 0.32);
  elipse(ctx, r * 0.50, -r * 0.12, r * 0.15, r * 0.26, -0.5);
  ctx.fill();
  ctx.fillStyle = comAlfa('#ffffff', 0.16);
  elipse(ctx, r * 0.30, r * 0.42, r * 0.10, r * 0.16, -0.6);
  ctx.fill();
  ctx.restore();
}

/** Chapéu (cúpula) com escamas em duas fileiras. */
function pintarChapeu(ctx, r) {
  const topo = -r * 1.06, baixo = -r * 0.34, larg = r * 1.06;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-larg, baixo);
  ctx.bezierCurveTo(-larg * 0.98, topo * 1.02, larg * 0.98, topo * 1.02, larg, baixo);
  ctx.closePath();
  const g = ctx.createLinearGradient(-larg * 0.4, topo, larg * 0.5, baixo);
  g.addColorStop(0, CORES.chapeuClaro);
  g.addColorStop(0.55, CORES.chapeu);
  g.addColorStop(1, CORES.chapeuEscuro);
  ctx.fillStyle = g;
  ctx.fill();

  ctx.save();
  ctx.clip();
  for (let fila = 0; fila < 2; fila++) {
    const y = baixo - (r * 0.20) - fila * r * 0.30;
    const n = fila === 0 ? 7 : 5;
    for (let i = 0; i < n; i++) {
      const x = lerp(-larg * 0.86, larg * 0.86, n === 1 ? 0.5 : i / (n - 1))
        * (1 - fila * 0.16) + (fila ? larg * 0.04 : 0);
      const rx = r * (0.20 - fila * 0.02), ry = r * (0.16 - fila * 0.02);
      elipse(ctx, x, y, rx, ry);
      ctx.fillStyle = comAlfa(CORES.chapeuEscuro, 0.30);
      ctx.fill();
      elipse(ctx, x, y - ry * 0.26, rx * 0.86, ry * 0.72);
      ctx.fillStyle = comAlfa(CORES.chapeuBorda, 0.24);
      ctx.fill();
    }
  }
  ctx.globalCompositeOperation = 'lighter';
  const gl = ctx.createRadialGradient(larg * 0.42, topo * 0.86, r * 0.05, larg * 0.36, topo * 0.8, r * 1.0);
  gl.addColorStop(0, comAlfa(CORES.chapeuBorda, 0.55));
  gl.addColorStop(1, comAlfa(CORES.chapeuBorda, 0));
  ctx.fillStyle = gl;
  ctx.fillRect(-larg * 1.2, topo * 1.2, larg * 2.4, r * 1.6);
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(-larg, baixo);
  ctx.quadraticCurveTo(0, baixo + r * 0.30, larg, baixo);
  ctx.quadraticCurveTo(0, baixo - r * 0.10, -larg, baixo);
  ctx.closePath();
  const ga = ctx.createLinearGradient(-larg, baixo, larg, baixo);
  ga.addColorStop(0, CORES.chapeuEscuro);
  ga.addColorStop(0.6, CORES.chapeu);
  ga.addColorStop(1, CORES.chapeuBorda);
  ctx.fillStyle = ga;
  ctx.fill();
  ctx.restore();
}

/** Rosto: olhos com íris em dois tons, sobrancelhas e boca por estado. */
function pintarRosto(ctx, b, r, pose) {
  const olhoY = -r * 0.02;
  const olhoX = r * 0.40;
  const ox = clamp(pose.olhoX, -1, 1) * r * 0.11;
  const oy = clamp(pose.olhoY, -1, 1) * r * 0.09;
  const piscar = b.piscando > 0 ? clamp(b.piscando / 0.13, 0, 1) : 0;
  const abertura = 1 - easeOutCubic(Math.sin(piscar * Math.PI));
  const carga = b.carga || 0;
  const voando = b.estado === 'voando';
  const carregando = b.estado === 'carregando';

  for (const lado of [-1, 1]) {
    const ex = olhoX * lado;
    const rx = r * 0.235 * (carregando ? 0.92 : 1);
    const ry = r * 0.275 * abertura * (voando ? 1.10 : 1);

    if (abertura < 0.08) {
      ctx.strokeStyle = CORES.pupila;
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ex - rx * 0.8, olhoY);
      ctx.quadraticCurveTo(ex, olhoY + r * 0.06, ex + rx * 0.8, olhoY);
      ctx.stroke();
      continue;
    }

    elipse(ctx, ex, olhoY, rx, ry);
    ctx.fillStyle = CORES.olhoBranco;
    ctx.fill();
    ctx.save();
    elipse(ctx, ex, olhoY, rx, ry);
    ctx.clip();
    const gs = ctx.createLinearGradient(0, olhoY - ry, 0, olhoY + ry * 0.4);
    gs.addColorStop(0, 'rgba(120,86,60,0.34)');
    gs.addColorStop(1, 'rgba(120,86,60,0)');
    ctx.fillStyle = gs;
    ctx.fillRect(ex - rx, olhoY - ry, rx * 2, ry * 2);

    const ix = ex + ox, iy = olhoY + oy;
    const ir = Math.min(rx, ry) * 0.86;
    const gi = ctx.createRadialGradient(ix, iy - ir * 0.3, ir * 0.1, ix, iy, ir);
    gi.addColorStop(0, CORES.irisClara);
    gi.addColorStop(0.7, CORES.iris);
    gi.addColorStop(1, '#1d4a42');
    ctx.fillStyle = gi;
    ctx.beginPath();
    ctx.arc(ix, iy, ir, 0, TAU);
    ctx.fill();
    ctx.fillStyle = CORES.pupila;
    ctx.beginPath();
    ctx.arc(ix, iy, ir * (carregando ? 0.40 : 0.50), 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.arc(ex + rx * 0.34, olhoY - ry * 0.38, ir * 0.30, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(ex - rx * 0.30, olhoY + ry * 0.34, ir * 0.15, 0, TAU);
    ctx.fill();

    elipse(ctx, ex, olhoY, rx, ry);
    ctx.strokeStyle = comAlfa('#4a2c18', 0.45);
    ctx.lineWidth = 0.9;
    ctx.stroke();

    const alt = carregando ? -ry * (1.55 + carga * 0.30) : voando ? -ry * 2.05 : -ry * 1.75;
    const incl = carregando ? lado * 0.30 * (0.4 + carga) : voando ? -lado * 0.18 : lado * 0.06;
    ctx.strokeStyle = mistura(CORES.chapeuEscuro, CORES.cascaEscura, 0.4);
    ctx.lineWidth = 1.9;
    ctx.lineCap = 'round';
    ctx.save();
    ctx.translate(ex, olhoY + alt);
    ctx.rotate(incl);
    ctx.beginPath();
    ctx.moveTo(-rx * 0.85, r * 0.03);
    ctx.quadraticCurveTo(0, -r * 0.05, rx * 0.85, r * 0.02);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = 0.30 + carga * 0.22;
  for (const lado of [-1, 1]) {
    const cx = lado * r * 0.72, cy = r * 0.30;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.24);
    g.addColorStop(0, comAlfa(CORES.blush, 0.8));
    g.addColorStop(1, comAlfa(CORES.blush, 0));
    ctx.fillStyle = g;
    elipse(ctx, cx, cy, r * 0.24, r * 0.15);
    ctx.fill();
  }
  ctx.restore();

  const by = r * 0.42;
  ctx.strokeStyle = CORES.boca;
  ctx.lineWidth = 1.7;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (carregando) {
    const w = r * (0.16 - carga * 0.04);
    ctx.fillStyle = CORES.boca;
    elipse(ctx, 0, by, w, r * (0.10 + carga * 0.05));
    ctx.fill();
  } else if (voando) {
    const h = r * 0.22;
    ctx.beginPath();
    ctx.moveTo(-r * 0.24, by - h * 0.35);
    ctx.quadraticCurveTo(0, by + h * 1.25, r * 0.24, by - h * 0.35);
    ctx.quadraticCurveTo(0, by - h * 0.05, -r * 0.24, by - h * 0.35);
    ctx.closePath();
    ctx.fillStyle = CORES.boca;
    ctx.fill();
    ctx.fillStyle = CORES.lingua;
    elipse(ctx, 0, by + h * 0.52, r * 0.11, r * 0.07);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(-r * 0.20, by - r * 0.02);
    ctx.quadraticCurveTo(0, by + r * 0.16, r * 0.20, by - r * 0.02);
    ctx.stroke();
  }
}

/** Anéis de tensão e faíscas enquanto carrega. */
function pintarCarga(ctx, b, pal, t) {
  const carga = b.carga;
  if (b.estado !== 'carregando' || carga <= 0.02) return;
  const c = b.corpo;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.globalCompositeOperation = 'lighter';

  const g = ctx.createRadialGradient(0, 0, R * 0.5, 0, 0, R * (1.5 + carga * 1.5));
  g.addColorStop(0, comAlfa(pal.luzQuente, 0.10 * carga));
  g.addColorStop(1, comAlfa(pal.luzQuente, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, R * (1.5 + carga * 1.5), 0, TAU);
  ctx.fill();

  const raio = lerp(R * 2.6, R * 1.32, easeOutCubic(carga));
  ctx.strokeStyle = comAlfa(carga > 0.94 ? '#fff3d0' : pal.luzBorda, 0.26 + carga * 0.44);
  ctx.lineWidth = 1.2 + carga * 1.6;
  ctx.beginPath();
  ctx.arc(0, 0, raio, -Math.PI / 2, -Math.PI / 2 + TAU * carga);
  ctx.stroke();

  const n = 7;
  for (let i = 0; i < n; i++) {
    const fase = (t * 1.5 + i / n) % 1;
    const a = i * 2.399 + t * 0.9;
    const d = lerp(R * 3.0, R * 1.05, easeOutCubic(fase));
    const al = Math.sin(fase * Math.PI) * carga * 0.85;
    ctx.fillStyle = comAlfa(pal.luzBorda, al);
    ctx.beginPath();
    ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 1.1 + carga, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// --- caminho com arte ilustrada ------------------------------------------------
//
// Quando existem os recortes, a Bolota deixa de ser desenhada por código e passa
// a ser um boneco articulado: cada peça é uma imagem que o mesmo esqueleto move.
// É o mecanismo de "paper doll" que os jogos 2D ilustrados usam — e é por isso
// que o trabalho do rig continua valendo inteiro.

/** Desenha uma fatia vertical da imagem esticada ao longo de um osso. */
function osso(ctx, im, t0, t1, ax, ay, bx, by, larg) {
  const d = Math.hypot(bx - ax, by - ay);
  if (d < 0.01) return;
  const ang = Math.atan2(by - ay, bx - ax) - Math.PI / 2;
  const sy = im.height * t0, sh = im.height * (t1 - t0);
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(ang);
  ctx.drawImage(im, 0, sy, im.width, sh, -larg / 2, 0, larg, d);
  ctx.restore();
}

/** Um membro de dois ossos, a partir de uma imagem única esticada para baixo. */
function membroImagem(ctx, nome, a, b, c, larg) {
  const im = Arte.img(nome);
  if (!im) return false;
  osso(ctx, im, 0, 0.52, a.x, a.y, b.x, b.y, larg);
  osso(ctx, im, 0.48, 1, b.x, b.y, c.x, c.y, larg * 0.94);
  return true;
}

function desenharComRecortes(ctx, b, pal, p, dir) {
  const frente = dir >= 0 ? 1 : 0, fundo = 1 - frente;
  const bracoAtras = (k) => k === fundo || (p.mao[k].x - p.ombro[k].x) * dir < -1.5;
  const larguraBraco = 13, larguraPerna = 15;

  // lado de trás: mais escuro e um tico deslocado
  ctx.save();
  ctx.globalAlpha = 0.96;
  ctx.filter = 'brightness(0.72) saturate(0.85)';
  ctx.translate(-dir * 2.2, 0);
  membroImagem(ctx, 'bolota_perna', p.anca[fundo], p.joelho[fundo], p.pe[fundo], larguraPerna);
  for (let k = 0; k < 2; k++) {
    if (bracoAtras(k)) membroImagem(ctx, 'bolota_braco', p.ombro[k], p.cotovelo[k], p.mao[k], larguraBraco);
  }
  ctx.filter = 'none';
  ctx.restore();

  const cx = (p.quadril.x + p.peito.x) / 2, cy = (p.quadril.y + p.peito.y) / 2;
  Arte.porPivo(ctx, 'bolota_tronco', cx, cy, 30, p.giroTronco, 0.5, 0.5);

  membroImagem(ctx, 'bolota_perna', p.anca[frente], p.joelho[frente], p.pe[frente], larguraPerna);

  // broto atrás da cabeça, saindo do alto do chapéu
  const topoCabeca = p.cabeca.y - CORPO.cabecaR * 0.92;
  Arte.porPivo(ctx, 'bolota_broto', p.cabeca.x + 1, topoCabeca, 22,
    p.giroCabeca + Math.sin(b.tempo * 2.1) * 0.06, 0.5, 1);

  const piscando = b.piscando > 0 && Arte.tem('bolota_rosto_piscando');
  Arte.porPivo(ctx, piscando ? 'bolota_rosto_piscando' : 'bolota_cabeca',
    p.cabeca.x, p.cabeca.y, CORPO.cabecaR * 2.35,
    p.giroCabeca + b.inclinacao * 0.25, 0.5, 0.5);

  for (let k = 0; k < 2; k++) {
    if (!bracoAtras(k)) membroImagem(ctx, 'bolota_braco', p.ombro[k], p.cotovelo[k], p.mao[k], larguraBraco);
  }
}

// --- o personagem inteiro -----------------------------------------------------

export class Personagem {
  constructor() {
    this.rig = new Rig();
    this.t = 0;
  }

  reiniciar() { this.rig.reiniciar(); }

  atualizar(dt, b, mundo) {
    this.t += dt;
    this.rig.atualizar(dt, b, mundo);
  }

  /** Desenha em coordenadas de mundo (a câmera já está aplicada). */
  desenhar(ctx, b, pal, mundo) {
    if (!b) return;
    const c = b.corpo;
    const p = this.rig.pose;
    const t = this.t;

    desenharTrilha(ctx, b, pal);
    const chao = mundo && mundo.formas ? chaoDoCorpo(mundo, c) : Infinity;
    desenharSombra(ctx, b, mundo, chao);
    pintarCarga(ctx, b, pal, t);
    desenharBroto(ctx, this.rig.broto, t, b.planando);

    const dir = p.dir >= 0 ? 1 : -1;
    const frente = dir >= 0 ? 1 : 0;     // membro do lado da câmera
    const fundo = 1 - frente;
    // Um braço que aponta para trás passa ATRÁS do corpo. Sem este teste, a
    // mão da Bolota cruzava o rosto toda vez que ela armava o salto.
    const bracoAtras = (k) => k === fundo || (p.mao[k].x - p.ombro[k].x) * dir < -1.5;

    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(p.giroCorpo);
    ctx.scale(p.escalaX, p.escalaY);
    if (dir < 0) ctx.scale(-1, 1);      // as peças são desenhadas olhando à direita

    if (Arte.tem('bolota_cabeca')) {
      desenharComRecortes(ctx, b, pal, espelharPose(p, dir), 1);
      ctx.restore();
      this.brilhoFinal(ctx, b, pal);
      return;
    }
    if (dir < 0) ctx.scale(-1, 1);      // desfaz: o caminho por código já espelha

    // --- membros de trás ------------------------------------------------------
    const escuro = mistura(CORES.membroEscuro, CORES.sombra, 0.5);
    const desenharBraco = (k, atras) => {
      membro(ctx, p.ombro[k].x, p.ombro[k].y, p.cotovelo[k].x, p.cotovelo[k].y,
        p.mao[k].x, p.mao[k].y, atras ? 3.9 : 4.2,
        atras ? CORES.membroEscuro : CORES.membro,
        atras ? CORES.membro : CORES.membroClaro,
        atras ? escuro : CORES.membroEscuro, atras);
      mao(ctx, p.mao[k].x, p.mao[k].y,
        Math.atan2(p.mao[k].y - p.cotovelo[k].y, p.mao[k].x - p.cotovelo[k].x),
        atras ? 1.15 : 1.28, atras);
    };

    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.translate(-dir * 2.2, 0);      // o lado de trás fica um tico atrás
    membro(ctx, p.anca[fundo].x, p.anca[fundo].y, p.joelho[fundo].x, p.joelho[fundo].y,
      p.pe[fundo].x, p.pe[fundo].y, 5.0,
      CORES.membroEscuro, CORES.membro, escuro, true);
    pe(ctx, p.pe[fundo].x, p.pe[fundo].y, p.giroPe[fundo], dir, true);
    for (let k = 0; k < 2; k++) if (bracoAtras(k)) desenharBraco(k, true);
    ctx.restore();

    // --- tronco ---------------------------------------------------------------
    tronco(ctx, p, pal);

    // --- membros da frente ----------------------------------------------------
    membro(ctx, p.anca[frente].x, p.anca[frente].y, p.joelho[frente].x, p.joelho[frente].y,
      p.pe[frente].x, p.pe[frente].y, 5.4,
      CORES.membro, CORES.membroClaro, CORES.membroEscuro, false);
    pe(ctx, p.pe[frente].x, p.pe[frente].y, p.giroPe[frente], dir, false);

    // --- cabeça ---------------------------------------------------------------
    const rc = CORPO.cabecaR;
    ctx.save();
    ctx.translate(p.cabeca.x, p.cabeca.y);
    ctx.rotate(p.giroCabeca + b.inclinacao * 0.25);
    pintarCasca(ctx, rc, pal);
    pintarChapeu(ctx, rc);
    ctx.save();
    ctx.translate(clamp(p.olhoX, -1, 1) * rc * 0.06, clamp(p.olhoY, -1, 1) * rc * 0.05);
    pintarRosto(ctx, b, rc, p);
    ctx.restore();
    ctx.restore();

    // braços que apontam para a frente ficam por cima de tudo
    for (let k = 0; k < 2; k++) if (!bracoAtras(k)) desenharBraco(k, false);

    ctx.restore();

    this.brilhoFinal(ctx, b, pal);
  }

  /** Clarão curto no pouso e no lançamento. */
  brilhoFinal(ctx, b, pal) {
    const c = b.corpo;
    const flash = Math.max(b.pousouAgora / 0.34, b.lancouAgora / 0.3);
    if (flash > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const r = R * (1.4 + (1 - flash) * 2.2);
      const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
      g.addColorStop(0, comAlfa(pal.luzBorda, 0.30 * flash));
      g.addColorStop(1, comAlfa(pal.luzQuente, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c.x, c.y, r, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }
}

/** Espelha a pose para o espaço "olhando à direita" das peças ilustradas. */
function espelharPose(p, dir) {
  if (dir >= 0) return p;
  const e = (v) => ({ x: -v.x, y: v.y });
  return {
    ...p,
    quadril: e(p.quadril), peito: e(p.peito), cabeca: e(p.cabeca),
    giroTronco: -p.giroTronco, giroCabeca: -p.giroCabeca,
    ombro: [e(p.ombro[1]), e(p.ombro[0])],
    anca: [e(p.anca[1]), e(p.anca[0])],
    mao: [e(p.mao[1]), e(p.mao[0])],
    cotovelo: [e(p.cotovelo[1]), e(p.cotovelo[0])],
    pe: [e(p.pe[1]), e(p.pe[0])],
    joelho: [e(p.joelho[1]), e(p.joelho[0])],
  };
}

function chaoDoCorpo(mundo, c) {
  let melhor = Infinity;
  for (const f of mundo.formas) {
    const a = f.aabb;
    if (c.x < a.x - 2 || c.x > a.x + a.w + 2) continue;
    const n = f.p.length;
    for (let i = 0; i < n; i++) {
      const p = f.p[i], q = f.p[(i + 1) % n];
      if ((p[0] - c.x) * (q[0] - c.x) > 0) continue;
      const dx = q[0] - p[0];
      if (Math.abs(dx) < 1e-6) continue;
      const t = (c.x - p[0]) / dx;
      const sy = p[1] + (q[1] - p[1]) * t;
      if (sy >= c.y - 4 && sy < melhor) melhor = sy;
    }
  }
  return melhor;
}
