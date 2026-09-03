// ---------------------------------------------------------------------------
// pecas.js — o desenho de cada peça. Tudo gerado por código.
//
// A flor é o centro emocional do jogo: fechada é um botão escuro que só deixa
// escapar a cor com que ela sonha; acesa, as pétalas abrem com mola e ela
// solta faíscas. Toda a promessa do jogo cabe nessa animação.
// ---------------------------------------------------------------------------

import { TAU, clamp, lerp, easeOutCubic, easeOutBack } from '../core/math.js';
import { TIPOS, R, G, B, DX, DY } from '../game/optica.js';
import { corDe, comAlfa, marcaDeCor } from './draw.js';

export function desenharPeca(ctx, r, peca, x, y, cel, t, est) {
  switch (peca.tipo) {
    case TIPOS.fonte: return fonte(ctx, r, peca, x, y, cel, t);
    case TIPOS.flor: return flor(ctx, r, peca, x, y, cel, t, est);
    case TIPOS.pedra: return pedra(ctx, r, x, y, cel, t);
    case TIPOS.espelho: return espelho(ctx, r, peca, x, y, cel, t, est);
    case TIPOS.divisor: return divisor(ctx, r, peca, x, y, cel, t, est);
    case TIPOS.prisma: return prisma(ctx, r, x, y, cel, t, est);
    case TIPOS.vidro: return vidro(ctx, r, peca, x, y, cel, t, est);
    default: return null;
  }
}

// --- fonte ------------------------------------------------------------------
function fonte(ctx, r, p, x, y, cel, t) {
  const s = cel * 0.34;
  const cor = corDe(p.mask);
  const ang = Math.atan2(DY[p.dir], DX[p.dir]);
  ctx.save();
  ctx.translate(x, y);

  // base de pedra
  ctx.fillStyle = r.pal.pedra;
  ctx.strokeStyle = r.pal.pedraTopo;
  ctx.lineWidth = Math.max(1.5, cel * 0.035);
  ctx.beginPath();
  ctx.arc(0, 0, s * 1.15, 0, TAU);
  ctx.fill(); ctx.stroke();

  ctx.rotate(ang);
  // bocal
  ctx.fillStyle = r.pal.metalEsc;
  ctx.beginPath();
  ctx.moveTo(s * 0.2, -s * 0.62);
  ctx.lineTo(s * 1.12, -s * 0.42);
  ctx.lineTo(s * 1.12, s * 0.42);
  ctx.lineTo(s * 0.2, s * 0.62);
  ctx.closePath();
  ctx.fill();
  // lente
  const g = ctx.createRadialGradient(0, 0, s * 0.1, 0, 0, s * 0.8);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.4, cor);
  g.addColorStop(1, comAlfa(cor, 0.2));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, s * 0.72, 0, TAU); ctx.fill();
  ctx.strokeStyle = r.pal.metal;
  ctx.lineWidth = Math.max(1.5, cel * 0.03);
  ctx.beginPath(); ctx.arc(0, 0, s * 0.72, 0, TAU); ctx.stroke();
  ctx.restore();

  marcaDeCor(ctx, p.mask, x, y + cel * 0.4, cel * 0.09, 0.95);
  return null;
}

// --- flor -------------------------------------------------------------------
function flor(ctx, r, p, x, y, cel, t, est) {
  const abertura = est ? est.abertura : 0;
  const a = easeOutBack(clamp(abertura, 0, 1));
  const cor = corDe(p.mask);
  const s = cel * 0.36;
  ctx.save();
  ctx.translate(x, y + cel * 0.06);

  // caule
  ctx.strokeStyle = abertura > 0.2 ? '#5fbf6a' : '#2f4a44';
  ctx.lineWidth = Math.max(2, cel * 0.05);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, s * 1.5);
  ctx.quadraticCurveTo(s * 0.12, s * 0.7, 0, s * 0.2);
  ctx.stroke();
  // folhinha
  ctx.fillStyle = abertura > 0.2 ? '#5fbf6a' : '#2f4a44';
  ctx.save();
  ctx.translate(0, s * 1.0); ctx.rotate(-0.6 + a * 0.25);
  ctx.beginPath(); ctx.ellipse(s * 0.3, 0, s * 0.32, s * 0.14, 0, 0, TAU); ctx.fill();
  ctx.restore();

  const petalas = 6;
  for (let i = 0; i < petalas; i++) {
    const base = -Math.PI / 2 + (TAU * i) / petalas;
    // fechada: pétalas juntas apontando para cima; aberta: abrem em roda
    const ang = lerp(-Math.PI / 2 + (i - (petalas - 1) / 2) * 0.16, base, a);
    const comp = lerp(s * 0.72, s * 1.0, a);
    const larg = lerp(s * 0.2, s * 0.44, a);
    ctx.save();
    ctx.rotate(ang + Math.PI / 2);
    const g = ctx.createLinearGradient(0, 0, 0, -comp);
    // Fechada, a flor guarda um fio da cor que sonha: é a única pista de
    // longe, e sem ela o botão some no escuro do tabuleiro.
    g.addColorStop(0, abertura > 0.05 ? comAlfa(cor, 0.85) : '#33405e');
    g.addColorStop(1, abertura > 0.05 ? '#ffffff' : comAlfa(cor, 0.42));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(larg, -comp * 0.55, 0, -comp);
    ctx.quadraticCurveTo(-larg, -comp * 0.55, 0, 0);
    ctx.fill();
    ctx.strokeStyle = abertura > 0.05 ? comAlfa(cor, 0.5) : 'rgba(120,140,200,0.35)';
    ctx.lineWidth = Math.max(1, cel * 0.02);
    ctx.stroke();
    ctx.restore();
  }

  // miolo
  ctx.fillStyle = abertura > 0.05 ? '#fff4c8' : '#222c48';
  ctx.beginPath(); ctx.arc(0, 0, s * lerp(0.24, 0.34, a), 0, TAU); ctx.fill();
  ctx.strokeStyle = abertura > 0.05 ? comAlfa(cor, 0.8) : comAlfa(cor, 0.55);
  ctx.lineWidth = Math.max(1.2, cel * 0.025);
  ctx.stroke();
  ctx.restore();

  // a marca da cor sonhada: é ela que diz o que a flor quer, sem depender de cor
  marcaDeCor(ctx, p.mask, x, y + cel * 0.06, cel * 0.1, abertura > 0.05 ? 1 : 0.85);

  return null;
}

// --- pedra -------------------------------------------------------------------
function pedra(ctx, r, x, y, cel, t) {
  const s = cel * 0.36;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = r.pal.pedra;
  ctx.beginPath();
  ctx.moveTo(-s, s * 0.5);
  ctx.lineTo(-s * 0.75, -s * 0.55);
  ctx.lineTo(0, -s * 0.85);
  ctx.lineTo(s * 0.8, -s * 0.45);
  ctx.lineTo(s * 0.95, s * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = r.pal.pedraTopo;
  ctx.beginPath();
  ctx.moveTo(-s * 0.75, -s * 0.55);
  ctx.lineTo(0, -s * 0.85);
  ctx.lineTo(s * 0.8, -s * 0.45);
  ctx.lineTo(s * 0.2, -s * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  return null;
}

// --- espelho -----------------------------------------------------------------
function espelho(ctx, r, p, x, y, cel, t, est) {
  const s = cel * 0.40;
  const ang = p.rot === 0 ? -Math.PI / 4 : Math.PI / 4;
  const gira = est && est.girando ? est.girando : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang + gira);
  const esp = cel * 0.13;
  // costas
  ctx.fillStyle = r.pal.metalEsc;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(-s, -esp / 2, s * 2, esp, esp / 2)
    : ctx.rect(-s, -esp / 2, s * 2, esp);
  ctx.fill();
  // face espelhada
  const g = ctx.createLinearGradient(0, -esp / 2, 0, esp / 2);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.4, r.pal.metal);
  g.addColorStop(1, r.pal.metalEsc);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(-s * 0.94, -esp * 0.34, s * 1.88, esp * 0.5, esp * 0.25)
    : ctx.rect(-s * 0.94, -esp * 0.34, s * 1.88, esp * 0.5);
  ctx.fill();
  // reflexo correndo
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = '#fff';
  const bx = -s * 0.9 + ((t * 0.5) % 1) * s * 1.8;
  ctx.beginPath(); ctx.ellipse(bx, -esp * 0.1, s * 0.16, esp * 0.14, 0, 0, TAU); ctx.fill();
  ctx.restore();
  return null;
}

// --- divisor -----------------------------------------------------------------
function divisor(ctx, r, p, x, y, cel, t, est) {
  const s = cel * 0.40;
  const ang = p.rot === 0 ? -Math.PI / 4 : Math.PI / 4;
  const gira = est && est.girando ? est.girando : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang + gira);
  const esp = cel * 0.15;
  ctx.fillStyle = 'rgba(190,225,255,0.30)';
  ctx.strokeStyle = 'rgba(220,245,255,0.85)';
  ctx.lineWidth = Math.max(1.5, cel * 0.028);
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(-s, -esp / 2, s * 2, esp, esp / 2)
    : ctx.rect(-s, -esp / 2, s * 2, esp);
  ctx.fill(); ctx.stroke();
  // marcas de "metade passa, metade vira"
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = '#eaf7ff';
  ctx.lineWidth = Math.max(1, cel * 0.02);
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * s * 0.34, -esp * 0.34);
    ctx.lineTo(i * s * 0.34 + esp * 0.3, esp * 0.34);
    ctx.stroke();
  }
  ctx.restore();
  return null;
}

// --- prisma ------------------------------------------------------------------
function prisma(ctx, r, x, y, cel, t, est) {
  const s = cel * 0.42;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 0.5) * 0.05);
  const g = ctx.createLinearGradient(-s, -s, s, s);
  g.addColorStop(0, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.5, 'rgba(200,230,255,0.28)');
  g.addColorStop(1, 'rgba(255,255,255,0.5)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(s * 0.92, s * 0.62);
  ctx.lineTo(-s * 0.92, s * 0.62);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = Math.max(1.6, cel * 0.03);
  ctx.stroke();
  // arestas em arco-íris
  const cores = ['#ff4152', '#4dff7a', '#4da6ff'];
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = comAlfa(cores[i], 0.75);
    ctx.lineWidth = Math.max(1.4, cel * 0.022);
    ctx.beginPath();
    const off = (i - 1) * cel * 0.045;
    ctx.moveTo(0 + off, -s * 0.72);
    ctx.lineTo(s * 0.62 + off, s * 0.42);
    ctx.stroke();
  }
  ctx.restore();
  return null;
}

// --- vidro colorido ------------------------------------------------------------
function vidro(ctx, r, p, x, y, cel, t, est) {
  const s = cel * 0.36;
  const cor = corDe(p.mask);
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = comAlfa(cor, 0.34);
  ctx.strokeStyle = comAlfa(cor, 0.95);
  ctx.lineWidth = Math.max(2, cel * 0.045);
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(-s, -s, s * 2, s * 2, cel * 0.1)
    : ctx.rect(-s, -s, s * 2, s * 2);
  ctx.fill(); ctx.stroke();
  // brilho diagonal de vidraça
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = Math.max(1.5, cel * 0.03);
  ctx.beginPath();
  ctx.moveTo(-s * 0.6, s * 0.75); ctx.lineTo(s * 0.75, -s * 0.6);
  ctx.moveTo(-s * 0.1, s * 0.8); ctx.lineTo(s * 0.8, -s * 0.1);
  ctx.stroke();
  ctx.restore();
  marcaDeCor(ctx, p.mask, x, y, cel * 0.105, 1);
  return null;
}
