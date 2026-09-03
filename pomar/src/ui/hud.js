// ---------------------------------------------------------------------------
// hud.js — o que precisa ser lido durante o jogo, desenhado ao redor da cesta.
// Os botões de chacoalhar e regar viram alvos de toque de verdade: a criança
// joga no celular sem depender de tecla nenhuma.
// ---------------------------------------------------------------------------

import { TAU, clamp, lerp, easeOutCubic, easeOutBack } from '../core/math.js';
import { FRUTAS, MAX_TIER } from '../game/fruits.js';
import { desenharFruta } from '../render/draw.js';

export class Hud {
  constructor() {
    this.fonte = "'Baloo 2', 'Trebuchet MS', system-ui, sans-serif";
    this.pontosMostrados = 0;
    this.botoes = [];
    this.t = 0;
  }

  /** Devolve o id do botão sob o ponto, ou null. */
  botaoEm(x, y) {
    for (const b of this.botoes) {
      const dx = x - b.x, dy = y - b.y;
      if (dx * dx + dy * dy <= b.r * b.r) return b.id;
    }
    return null;
  }

  desenhar(ctx, jogo, L, pal, dt, W, H, opcoes, recorde) {
    this.t += dt;
    this.botoes.length = 0;
    const e = clamp(Math.min(W / 900, H / 700), 0.62, 1.25) * (opcoes.tamanhoTexto || 1);
    ctx.save();
    ctx.textBaseline = 'middle';

    // ---- pontuação --------------------------------------------------------
    this.pontosMostrados = lerp(this.pontosMostrados, jogo.pontos, 1 - Math.pow(0.002, dt));
    if (Math.abs(this.pontosMostrados - jogo.pontos) < 1) this.pontosMostrados = jogo.pontos;
    const px = 20 * e, py = 24 * e;
    this._painel(ctx, pal, px, py, 200 * e, 62 * e, 14 * e);
    ctx.textAlign = 'left';
    ctx.fillStyle = pal.tintaFraca;
    ctx.font = `700 ${13 * e}px ${this.fonte}`;
    ctx.fillText('PONTOS', px + 16 * e, py + 18 * e);
    ctx.fillStyle = pal.tinta;
    ctx.font = `800 ${30 * e}px ${this.fonte}`;
    ctx.fillText(Math.round(this.pontosMostrados).toLocaleString('pt-BR'), px + 16 * e, py + 42 * e);
    if (recorde > 0) {
      ctx.fillStyle = pal.tintaFraca;
      ctx.font = `700 ${12 * e}px ${this.fonte}`;
      ctx.textAlign = 'left';
      ctx.fillText('recorde ' + recorde.toLocaleString('pt-BR'), px + 4 * e, py + 76 * e);
    }

    // ---- próxima fruta ----------------------------------------------------
    const nw = 108 * e, nh = 118 * e;
    const nx = W - nw - 20 * e, ny = 24 * e;
    this._painel(ctx, pal, nx, ny, nw, nh, 14 * e);
    ctx.textAlign = 'center';
    ctx.fillStyle = pal.tintaFraca;
    ctx.font = `700 ${13 * e}px ${this.fonte}`;
    ctx.fillText('PRÓXIMA', nx + nw / 2, ny + 18 * e);
    const fp = FRUTAS[jogo.proximoTier];
    const rp = (15 + Math.min(4, jogo.proximoTier) * 3.4) * e;
    desenharFruta(ctx, jogo.proximoTier, nx + nw / 2, ny + 58 * e, rp, 0, 1, 1, this.t, { face: 3 });
    if (opcoes.nomes) {
      ctx.fillStyle = pal.tinta;
      ctx.font = `700 ${14 * e}px ${this.fonte}`;
      ctx.fillText(fp.nome, nx + nw / 2, ny + 100 * e);
    }

    // ---- pedido do bichinho ------------------------------------------------
    if (jogo.pedido) {
      const pw = 150 * e, ph = 96 * e;
      const pxx = 20 * e, pyy = py + 96 * e;
      const pulo = jogo.pedido.feito > 0 ? Math.sin(jogo.pedido.feito * 22) * 5 * e : 0;
      this._painel(ctx, pal, pxx, pyy + pulo, pw, ph, 14 * e);
      ctx.textAlign = 'left';
      ctx.fillStyle = pal.tintaFraca;
      ctx.font = `700 ${12 * e}px ${this.fonte}`;
      ctx.fillText('PEDIDO', pxx + 14 * e, pyy + pulo + 17 * e);
      this._bichinho(ctx, pxx + 36 * e, pyy + pulo + 58 * e, 24 * e, jogo.pedido.bicho, this.t);
      const fr = FRUTAS[jogo.pedido.tier];
      const rr = Math.min(26 * e, fr.r * 0.5 * e);
      desenharFruta(ctx, jogo.pedido.tier, pxx + 106 * e, pyy + pulo + 52 * e, rr, 0, 1, 1, this.t, { face: 9, feliz: 0.4 });
      ctx.textAlign = 'center';
      ctx.fillStyle = pal.tinta;
      ctx.font = `700 ${12 * e}px ${this.fonte}`;
      ctx.fillText(fr.nome, pxx + 106 * e, pyy + pulo + 82 * e);
    }

    // ---- botões de ação ----------------------------------------------------
    // Se sobrar espaço embaixo da cesta (celular em pé), os botões vão para
    // lá — no canto da tela eles ficavam por cima das frutas.
    const br = 34 * e;
    const espacoAbaixo = L ? L.abaixo : 0;
    let bx1, bx2, by;
    if (espacoAbaixo > br * 2.3) {
      by = L.y + L.h + Math.min(espacoAbaixo / 2, br * 1.5);
      bx1 = W / 2 + br * 1.7;
      bx2 = W / 2 - br * 1.7;
    } else {
      by = H - br - 22 * e;
      bx1 = W - br - 24 * e;
      bx2 = W - br * 3.3 - 24 * e;
    }
    this._botaoRedondo(ctx, pal, 'chacoalhar', bx2, by, br, e, jogo.chacoalho >= 1, jogo.chacoalho,
      (c) => this._iconeChacoalho(c, br * 0.5));
    this._botaoRedondo(ctx, pal, 'regar', bx1, by, br, e, jogo.regadores > 0, 1,
      (c) => this._iconeRegador(c, br * 0.5), jogo.regadores);

    // ---- combo -------------------------------------------------------------
    // A sequência fica ao lado da pontuação, no céu — dentro da cesta ela
    // tapava justamente a fruta que o jogador precisa ver.
    if (jogo.combo > 1 && jogo.comboT > 0) {
      const a = clamp(jogo.comboT / 0.5, 0, 1);
      const cx = px + 200 * e + 14 * e;
      const cy = py + 31 * e;
      const k = 1 + Math.sin(this.t * 15) * 0.05;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(cx, cy);
      ctx.scale(k, k);
      ctx.fillStyle = pal.linha;
      this._rr(ctx, 0, -22 * e, 108 * e, 44 * e, 22 * e);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.font = `800 ${13 * e}px ${this.fonte}`;
      ctx.fillText('SEQUÊNCIA', 54 * e, -7 * e);
      ctx.font = `800 ${20 * e}px ${this.fonte}`;
      ctx.fillText('×' + jogo.combo, 54 * e, 11 * e);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // ---- recado ------------------------------------------------------------
    if (jogo.mensagemT > 0 && jogo.mensagem) {
      const a = clamp(jogo.mensagemT / 0.5, 0, 1);
      const sobe = (1 - clamp((2.2 - jogo.mensagemT) / 0.25, 0, 1)) * 18 * e;
      ctx.globalAlpha = a;
      ctx.textAlign = 'center';
      ctx.font = `800 ${26 * e}px ${this.fonte}`;
      ctx.lineWidth = 7 * e; ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(255,252,244,0.9)';
      ctx.strokeText(jogo.mensagem, W / 2, H * 0.24 + sobe);
      ctx.fillStyle = pal.linha;
      ctx.fillText(jogo.mensagem, W / 2, H * 0.24 + sobe);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  _painel(ctx, pal, x, y, w, h, r) {
    ctx.save();
    ctx.fillStyle = 'rgba(90,60,30,0.14)';
    this._rr(ctx, x + 2, y + 4, w, h, r); ctx.fill();
    ctx.fillStyle = pal.painel;
    this._rr(ctx, x, y, w, h, r); ctx.fill();
    ctx.strokeStyle = 'rgba(140,95,50,0.28)';
    ctx.lineWidth = 2;
    this._rr(ctx, x, y, w, h, r); ctx.stroke();
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

  _botaoRedondo(ctx, pal, id, x, y, r, e, pronto, carga, icone, contador) {
    this.botoes.push({ id, x, y, r: r * 1.15 });
    ctx.save();
    ctx.fillStyle = 'rgba(90,60,30,0.16)';
    ctx.beginPath(); ctx.arc(x + 2, y + 4, r, 0, TAU); ctx.fill();
    ctx.fillStyle = pronto ? pal.painel : 'rgba(240,232,218,0.7)';
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();

    if (carga < 1) {                    // anel de recarga
      ctx.strokeStyle = 'rgba(160,110,60,0.25)';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(x, y, r - 3, 0, TAU); ctx.stroke();
      ctx.strokeStyle = pal.linha;
      ctx.beginPath();
      ctx.arc(x, y, r - 3, -Math.PI / 2, -Math.PI / 2 + TAU * carga);
      ctx.stroke();
    } else {
      ctx.strokeStyle = pronto ? pal.linha : 'rgba(140,95,50,0.3)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, r - 2, 0, TAU); ctx.stroke();
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = pronto ? 1 : 0.4;
    ctx.strokeStyle = pal.tinta;
    ctx.fillStyle = pal.tinta;
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    icone(ctx);
    ctx.restore();

    if (contador !== undefined) {
      ctx.fillStyle = contador > 0 ? pal.linha : 'rgba(140,110,80,0.5)';
      ctx.beginPath(); ctx.arc(x + r * 0.72, y - r * 0.72, r * 0.4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `800 ${r * 0.5}px ${this.fonte}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(contador), x + r * 0.72, y - r * 0.7);
    }
    ctx.restore();
  }

  _iconeChacoalho(ctx, s) {
    // cesta com setinhas para os lados
    ctx.beginPath();
    ctx.moveTo(-s * 0.55, -s * 0.15); ctx.lineTo(-s * 0.4, s * 0.6);
    ctx.lineTo(s * 0.4, s * 0.6); ctx.lineTo(s * 0.55, -s * 0.15);
    ctx.closePath(); ctx.stroke();
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(d * s * 0.78, -s * 0.35);
      ctx.lineTo(d * s * 1.05, -s * 0.05);
      ctx.lineTo(d * s * 0.78, s * 0.25);
      ctx.stroke();
    }
  }

  _iconeRegador(ctx, s) {
    ctx.beginPath();
    ctx.moveTo(-s * 0.6, -s * 0.2); ctx.lineTo(-s * 0.45, s * 0.55);
    ctx.lineTo(s * 0.3, s * 0.55); ctx.lineTo(s * 0.45, -s * 0.2);
    ctx.closePath(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.45, -s * 0.05); ctx.lineTo(s * 0.95, -s * 0.45);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-s * 0.55, -s * 0.2); ctx.quadraticCurveTo(-s * 0.9, -s * 0.55, -s * 0.35, -s * 0.6);
    ctx.stroke();
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(s * 0.95 + i * s * 0.18, -s * 0.15 + Math.abs(i) * s * 0.12, s * 0.07, 0, TAU);
      ctx.fill();
    }
  }

  /** Bichinho do pedido: só formas simples, mas com olhinho e sorriso. */
  _bichinho(ctx, x, y, r, bicho, t) {
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 3) * r * 0.06);
    ctx.fillStyle = bicho.cor;
    ctx.beginPath(); ctx.ellipse(0, r * 0.35, r * 0.78, r * 0.6, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -r * 0.25, r * 0.62, 0, TAU); ctx.fill();
    ctx.fillStyle = bicho.cor2;
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.arc(s * r * 0.48, -r * 0.66, r * 0.24, 0, TAU); ctx.fill();
    }
    ctx.beginPath(); ctx.ellipse(0, -r * 0.05, r * 0.34, r * 0.26, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(52,30,16,0.9)';
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.arc(s * r * 0.24, -r * 0.34, r * 0.09, 0, TAU); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(0, -r * 0.1, r * 0.08, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(52,30,16,0.8)';
    ctx.lineWidth = Math.max(1.2, r * 0.06);
    ctx.beginPath(); ctx.arc(0, r * 0.02, r * 0.16, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
    ctx.restore();
  }
}
