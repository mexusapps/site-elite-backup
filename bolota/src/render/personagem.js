// ---------------------------------------------------------------------------
// personagem.js — a Bolota, pintada.
//
// Tudo aqui é desenho: nenhuma regra, nenhum estado. A função recebe o
// personagem já simulado e o transforma em tinta. As decisões de arte:
//
//   • A CASCA é pintada em camadas, como uma ilustração: base em degradê,
//     veios de madeira em ruído, sombra fria embaixo à esquerda, luz quente de
//     borda em cima à direita e um brilho especular pequeno e duro. É essa
//     pilha (e não um gradiente só) que tira o cheiro de "círculo de canvas".
//   • O CHAPÉU da bolota tem escamas de verdade, desenhadas uma a uma em duas
//     fileiras, com a aba projetando sombra na casca.
//   • O BROTO é a correntinha de Verlet do modelo, desenhada como um caule que
//     afina até a ponta e termina numa folha que gira conforme o chicote.
//   • O ROSTO é pequeno e fica alto: olho grande, íris com dois tons, reflexo
//     que não acompanha o olhar (fica preso à fonte de luz) e uma boca que
//     muda com o estado. A sobrancelha faz quase todo o trabalho de expressão.
//   • O desenho inteiro vive dentro do esmagamento (sx, sy) e da inclinação do
//     modelo, então a animação procedural aparece de graça em cada camada.
// ---------------------------------------------------------------------------

import { TAU, clamp, lerp, easeOutCubic } from '../core/math.js';
import { fbm, comAlfa, mistura } from './arte.js';

const R = 19; // raio nominal — o mesmo de BOLOTA.raio

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
};

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

/** Onde está o chão logo abaixo de (x, y)? Devolve Infinity se não houver. */
function chaoAbaixo(formas, x, y) {
  let melhor = Infinity;
  for (const f of formas) {
    const a = f.aabb;
    if (x < a.x - 2 || x > a.x + a.w + 2) continue;
    const n = f.p.length;
    for (let i = 0; i < n; i++) {
      const p = f.p[i], q = f.p[(i + 1) % n];
      if ((p[0] - x) * (q[0] - x) > 0) continue;
      const dx = q[0] - p[0];
      if (Math.abs(dx) < 1e-6) continue;
      const t = (x - p[0]) / dx;
      const sy = p[1] + (q[1] - p[1]) * t;
      if (sy >= y - 4 && sy < melhor) melhor = sy;
    }
  }
  return melhor;
}

// --- peças -------------------------------------------------------------------

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

function desenharSombra(ctx, b, mundo) {
  const c = b.corpo;
  const chao = mundo && mundo.formas ? chaoAbaixo(mundo.formas, c.x, c.y) : Infinity;
  if (!isFinite(chao)) return;
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

/** O broto: correntinha de Verlet virando caule + folha. Mundo, não local. */
function desenharBroto(ctx, b, pal, t) {
  const br = b.broto;
  if (!br.iniciado) return;
  const n = br.n;

  // caule afinando, desenhado como polígono (largura variável)
  const esq = [], dir = [];
  for (let i = 0; i < n; i++) {
    const px = br.px[i], py = br.py[i];
    const jx = i < n - 1 ? br.px[i + 1] : br.px[i] * 2 - br.px[i - 1];
    const jy = i < n - 1 ? br.py[i + 1] : br.py[i] * 2 - br.py[i - 1];
    let dx = jx - px, dy = jy - py;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    const w = lerp(3.6, 1.0, i / (n - 1));
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

  // fio de luz do lado do sol
  ctx.strokeStyle = comAlfa(CORES.cauleClaro, 0.75);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(dir[0][0], dir[0][1]);
  for (let i = 1; i < n; i++) ctx.lineTo(dir[i][0], dir[i][1]);
  ctx.stroke();

  // folha na ponta: gira conforme o chicote da correntinha
  const ax = br.px[n - 1] - br.px[n - 2];
  const ay = br.py[n - 1] - br.py[n - 2];
  const ang = Math.atan2(ay, ax);
  const balanco = Math.sin(t * 2.3) * 0.10;
  ctx.save();
  ctx.translate(br.px[n - 1], br.py[n - 1]);
  ctx.rotate(ang + balanco);
  for (const lado of [-1, 1]) {
    const comp = lado < 0 ? 15 : 11.5;
    const larg = lado < 0 ? 7.4 : 5.6;
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
  void pal;
}

/** Casca: base, veios, sombra fria, oclusão do chapéu, luz de borda quente. */
function pintarCasca(ctx, b, pal) {
  const r = R;

  // base
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

  // barriga clara: a bolota é mais pálida na frente-baixo
  const gb = ctx.createRadialGradient(-r * 0.10, r * 0.30, r * 0.06, -r * 0.10, r * 0.30, r * 1.05);
  gb.addColorStop(0, comAlfa(CORES.barriga, 0.62));
  gb.addColorStop(0.55, comAlfa(CORES.barriga, 0.20));
  gb.addColorStop(1, comAlfa(CORES.barriga, 0));
  ctx.fillStyle = gb;
  ctx.fillRect(-r * 1.2, -r * 1.2, r * 2.4, r * 2.6);

  // veios de madeira: linhas curvas seguindo o eixo da noz
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

  // sombra fria: baixo-esquerda
  const gs = ctx.createRadialGradient(r * 0.42, -r * 0.30, r * 0.15, -r * 0.30, r * 0.55, r * 1.7);
  gs.addColorStop(0, 'rgba(40,32,58,0)');
  gs.addColorStop(0.62, 'rgba(40,32,58,0.16)');
  gs.addColorStop(1, 'rgba(28,22,46,0.46)');
  ctx.fillStyle = gs;
  ctx.fillRect(-r * 1.2, -r * 1.2, r * 2.4, r * 2.6);

  // oclusão sob a aba do chapéu
  const go = ctx.createLinearGradient(0, -r * 0.62, 0, -r * 0.06);
  go.addColorStop(0, 'rgba(48,26,12,0.55)');
  go.addColorStop(1, 'rgba(48,26,12,0)');
  ctx.fillStyle = go;
  ctx.fillRect(-r * 1.2, -r * 1.1, r * 2.4, r * 0.9);

  // luz de borda quente: cima-direita
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

  // fio de borda: escuro embaixo-esquerda, claro em cima-direita
  caminhoNoz(ctx, r);
  ctx.lineWidth = 1.5;
  const gc = ctx.createLinearGradient(-r, r, r, -r);
  gc.addColorStop(0, comAlfa(CORES.cascaEscura, 0.9));
  gc.addColorStop(0.55, comAlfa(CORES.cascaMeia, 0.35));
  gc.addColorStop(1, comAlfa(pal.luzBorda, 0.9));
  ctx.strokeStyle = gc;
  ctx.stroke();

  // especular pequeno e duro
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
function pintarChapeu(ctx) {
  const r = R;
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
  // escamas
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
  // luz no alto-direita do chapéu
  ctx.globalCompositeOperation = 'lighter';
  const gl = ctx.createRadialGradient(larg * 0.42, topo * 0.86, r * 0.05, larg * 0.36, topo * 0.8, r * 1.0);
  gl.addColorStop(0, comAlfa(CORES.chapeuBorda, 0.55));
  gl.addColorStop(1, comAlfa(CORES.chapeuBorda, 0));
  ctx.fillStyle = gl;
  ctx.fillRect(-larg * 1.2, topo * 1.2, larg * 2.4, r * 1.6);
  ctx.restore();

  // aba com volume
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
function pintarRosto(ctx, b) {
  const r = R;
  const olhoY = -r * 0.02;
  const olhoX = r * 0.40;
  const ox = clamp(b.olharX, -1, 1) * r * 0.11;
  const oy = clamp(b.olharY, -1, 1) * r * 0.09;
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

    // branco do olho, com sombra suave em cima
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

    // íris
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

    // reflexo: preso à luz, não ao olhar
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.arc(ex + rx * 0.34, olhoY - ry * 0.38, ir * 0.30, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(ex - rx * 0.30, olhoY + ry * 0.34, ir * 0.15, 0, TAU);
    ctx.fill();

    // contorno do olho
    elipse(ctx, ex, olhoY, rx, ry);
    ctx.strokeStyle = comAlfa('#4a2c18', 0.45);
    ctx.lineWidth = 0.9;
    ctx.stroke();

    // sobrancelha: onde mora a expressão
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

  // bochechas
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

  // boca
  const by = r * 0.42;
  ctx.strokeStyle = CORES.boca;
  ctx.lineWidth = 1.7;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (carregando) {
    // boquinha apertada, concentrada
    const w = r * (0.16 - carga * 0.04);
    ctx.fillStyle = CORES.boca;
    elipse(ctx, 0, by, w, r * (0.10 + carga * 0.05));
    ctx.fill();
  } else if (voando) {
    // "uhuuu": boca aberta arredondada com linguinha
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
    // sorrisinho tranquilo
    ctx.beginPath();
    ctx.moveTo(-r * 0.20, by - r * 0.02);
    ctx.quadraticCurveTo(0, by + r * 0.16, r * 0.20, by - r * 0.02);
    ctx.stroke();
  }
}

/** Anéis de tensão e faíscas enquanto carrega — leitura de força sem HUD. */
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

  // anel que fecha conforme carrega
  const raio = lerp(R * 2.6, R * 1.32, easeOutCubic(carga));
  ctx.strokeStyle = comAlfa(carga > 0.94 ? '#fff3d0' : pal.luzBorda, 0.26 + carga * 0.44);
  ctx.lineWidth = 1.2 + carga * 1.6;
  ctx.beginPath();
  ctx.arc(0, 0, raio, -Math.PI / 2, -Math.PI / 2 + TAU * carga);
  ctx.stroke();

  // faíscas puxadas para dentro
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

// --- entrada -----------------------------------------------------------------

/**
 * Desenha a Bolota em coordenadas de mundo (a câmera já está aplicada).
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} b     instância de Bolota já simulada
 * @param {object} pal   paleta da cena (usa luzQuente / luzBorda)
 * @param {number} t     tempo contínuo da cena, em segundos
 * @param {object} mundo para achar o chão da sombra de contato
 */
export function desenharBolota(ctx, b, pal, t, mundo) {
  if (!b) return;
  const c = b.corpo;

  desenharTrilha(ctx, b, pal);
  desenharSombra(ctx, b, mundo);
  pintarCarga(ctx, b, pal, t);
  desenharBroto(ctx, b, pal, t);

  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(b.inclinacao);
  ctx.scale(b.sx, b.sy);

  pintarCasca(ctx, b, pal);
  pintarChapeu(ctx);
  // o rosto acompanha o olhar de leve, para dar volume à cabeça
  ctx.save();
  ctx.translate(clamp(b.olharX, -1, 1) * R * 0.06, clamp(b.olharY, -1, 1) * R * 0.05);
  pintarRosto(ctx, b);
  ctx.restore();

  ctx.restore();

  // clarão curto no pouso e no lançamento
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
