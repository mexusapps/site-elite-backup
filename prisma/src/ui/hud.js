// ---------------------------------------------------------------------------
// hud.js — barra de cima, bandeja de peças e botões, desenhados no canvas.
// Cada alvo de toque tem no mínimo 44 px: é para ser jogável com o dedo.
// ---------------------------------------------------------------------------

import { TAU, clamp, lerp, easeOutCubic } from '../core/math.js';
import { TIPOS, ROTACOES } from '../game/optica.js';
import { corDe, comAlfa, marcaDeCor } from '../render/draw.js';
import { desenharPeca } from '../render/pecas.js';

export const NOME_PECA = {
  espelho: 'Espelho', divisor: 'Divisor', prisma: 'Prisma', vidro: 'Vidro',
};

export class Hud {
  constructor() {
    this.fonte = "'Nunito', 'Trebuchet MS', system-ui, sans-serif";
    this.alvos = [];
    this.t = 0;
    this.selecionado = null;
  }

  alturaBandeja(W, H, opcoes) {
    const e = this.escala(W, H, opcoes);
    return 104 * e;
  }

  escala(W, H, opcoes) {
    return clamp(Math.min(W / 900, H / 760), 0.66, 1.2) * ((opcoes && opcoes.tamanhoTexto) || 1);
  }

  alvoEm(x, y) {
    for (const a of this.alvos) {
      if (a.forma === 'circulo') {
        const dx = x - a.x, dy = y - a.y;
        if (dx * dx + dy * dy <= a.r * a.r) return a;
      } else if (x >= a.x && y >= a.y && x <= a.x + a.w && y <= a.y + a.h) return a;
    }
    return null;
  }

  desenhar(ctx, r, p, W, H, dt, opcoes, cap, indice, total) {
    this.t += dt;
    this.alvos.length = 0;
    const e = this.escala(W, H, opcoes);
    const pal = r.pal;

    // ---- barra de cima ------------------------------------------------------
    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.fillStyle = pal.painel;
    this._rr(ctx, 12 * e, 12 * e, W - 24 * e, 48 * e, 14 * e);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.fillStyle = pal.tintaFraca;
    ctx.font = `700 ${12 * e}px ${this.fonte}`;
    ctx.fillText((cap || '').toUpperCase(), 26 * e, 27 * e);
    ctx.fillStyle = pal.tinta;
    ctx.font = `800 ${19 * e}px ${this.fonte}`;
    ctx.fillText(total ? `Jardim ${indice + 1} de ${total}` : 'Jardim sem fim', 26 * e, 46 * e);

    // flores acesas
    ctx.textAlign = 'center';
    const fx = W / 2;
    ctx.font = `700 ${12 * e}px ${this.fonte}`;
    ctx.fillStyle = pal.tintaFraca;
    ctx.fillText('FLORES', fx, 27 * e);
    ctx.font = `800 ${19 * e}px ${this.fonte}`;
    ctx.fillStyle = pal.tinta;
    ctx.fillText(`${p.acesas} / ${p.total}`, fx, 46 * e);

    // peças usadas contra o mínimo conhecido
    ctx.textAlign = 'right';
    ctx.font = `700 ${12 * e}px ${this.fonte}`;
    ctx.fillStyle = pal.tintaFraca;
    ctx.fillText('PEÇAS', W - 70 * e, 27 * e);
    ctx.font = `800 ${19 * e}px ${this.fonte}`;
    ctx.fillStyle = p.usadas() <= p.fase.movimentos ? '#8fe6a4' : pal.tinta;
    ctx.fillText(`${p.usadas()} · mínimo ${p.fase.movimentos}`, W - 70 * e, 46 * e);

    // botão de menu
    this._botao(ctx, pal, 'menu', W - 40 * e, 36 * e, 18 * e, e, (c) => {
      c.strokeStyle = pal.tinta; c.lineWidth = 2.4;
      for (let i = -1; i <= 1; i++) {
        c.beginPath(); c.moveTo(-8, i * 5); c.lineTo(8, i * 5); c.stroke();
      }
    });
    ctx.restore();

    // ---- bandeja ------------------------------------------------------------
    const alt = this.alturaBandeja(W, H, opcoes);
    const by = H - alt;
    ctx.save();
    ctx.fillStyle = pal.painel;
    this._rr(ctx, 12 * e, by, W - 24 * e, alt - 12 * e, 16 * e);
    ctx.fill();

    // agrupa por tipo+cor para não virar uma fileira gigante
    const grupos = new Map();
    for (const b of p.bandeja) {
      const k = `${b.tipo}:${b.mask || 0}`;
      if (!grupos.has(k)) grupos.set(k, { tipo: b.tipo, mask: b.mask, livres: [], usados: 0 });
      const g = grupos.get(k);
      if (b.cel === null) g.livres.push(b); else g.usados++;
    }
    const lista = [...grupos.values()];
    const cel = Math.min(62 * e, (W - 200 * e) / Math.max(1, lista.length) - 10 * e);
    const larg = lista.length * (cel + 12 * e);
    let sx = Math.max(24 * e, (W - larg) / 2 - 60 * e);
    const sy = by + (alt - 12 * e) / 2;

    for (const g of lista) {
      const disp = g.livres.length;
      const sel = this.selecionado && this.selecionado.tipo === g.tipo
        && (this.selecionado.mask || 0) === (g.mask || 0) && disp > 0;
      ctx.save();
      ctx.globalAlpha = disp ? 1 : 0.32;
      ctx.fillStyle = sel ? 'rgba(255,246,200,0.22)' : 'rgba(255,255,255,0.07)';
      this._rr(ctx, sx, sy - cel / 2, cel, cel, 12 * e);
      ctx.fill();
      ctx.strokeStyle = sel ? '#ffe9a0' : 'rgba(255,255,255,0.18)';
      ctx.lineWidth = sel ? 3 : 1.5;
      this._rr(ctx, sx, sy - cel / 2, cel, cel, 12 * e);
      ctx.stroke();
      desenharPeca(ctx, r, { tipo: g.tipo, mask: g.mask, rot: 1 }, sx + cel / 2, sy, cel * 0.92, this.t, null);
      ctx.restore();

      ctx.fillStyle = disp ? pal.tinta : pal.tintaFraca;
      ctx.font = `800 ${13 * e}px ${this.fonte}`;
      ctx.textAlign = 'center';
      ctx.fillText('×' + disp, sx + cel / 2, sy + cel * 0.66);

      this.alvos.push({ id: 'peca', tipo: g.tipo, mask: g.mask, x: sx, y: sy - cel / 2, w: cel, h: cel * 1.3 });
      sx += cel + 12 * e;
    }

    // botões de ação
    const br = 24 * e;
    const bx = W - 30 * e - br;
    this._botao(ctx, pal, 'dica', bx, sy, br, e, (c) => this._iconeDica(c, br * 0.6), '#ffe9a0');
    this._botao(ctx, pal, 'desfazer', bx - br * 2.6, sy, br, e, (c) => this._iconeVoltar(c, br * 0.6),
      p.historico.length ? null : 'apagado');
    this._botao(ctx, pal, 'limpar', bx - br * 5.2, sy, br, e, (c) => this._iconeLixo(c, br * 0.6),
      p.usadas() ? null : 'apagado');
    ctx.restore();
  }

  _botao(ctx, pal, id, x, y, r, e, icone, estado) {
    this.alvos.push({ id, forma: 'circulo', x, y, r: r * 1.2 });
    const apagado = estado === 'apagado';
    ctx.save();
    ctx.globalAlpha = apagado ? 0.3 : 1;
    ctx.fillStyle = 'rgba(255,255,255,0.09)';
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = typeof estado === 'string' && !apagado ? estado : 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = pal.tinta; ctx.fillStyle = pal.tinta;
    ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    icone(ctx);
    ctx.restore();
    ctx.restore();
  }

  _iconeDica(ctx, s) {
    ctx.beginPath(); ctx.arc(0, -s * 0.15, s * 0.55, Math.PI * 0.15, Math.PI * 0.85, true); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.25, s * 0.42); ctx.lineTo(s * 0.25, s * 0.42); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.16, s * 0.66); ctx.lineTo(s * 0.16, s * 0.66); ctx.stroke();
  }
  _iconeVoltar(ctx, s) {
    ctx.beginPath(); ctx.arc(0, 0, s * 0.6, 0.6, Math.PI * 1.7); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-s * 0.6, -s * 0.28); ctx.lineTo(-s * 0.62, s * 0.16); ctx.lineTo(-s * 0.16, s * 0.02);
    ctx.closePath(); ctx.fill();
  }
  _iconeLixo(ctx, s) {
    ctx.beginPath();
    ctx.moveTo(-s * 0.45, -s * 0.35); ctx.lineTo(-s * 0.32, s * 0.6);
    ctx.lineTo(s * 0.32, s * 0.6); ctx.lineTo(s * 0.45, -s * 0.35);
    ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.62, -s * 0.35); ctx.lineTo(s * 0.62, -s * 0.35); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.16, -s * 0.35); ctx.lineTo(-s * 0.16, -s * 0.6);
    ctx.lineTo(s * 0.16, -s * 0.6); ctx.lineTo(s * 0.16, -s * 0.35); ctx.stroke();
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
