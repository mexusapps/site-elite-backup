// ---------------------------------------------------------------------------
// hud.js — a interface durante o jogo, desenhada no canvas.
//
// Regra que segui: **o HUD não pode competir com a arte**. Ele é uma faixa só,
// no alto, com fundo de vidro escuro e borda quente; nada pisca sem motivo e
// nada fica no meio da tela. A força do salto não aparece em barra nenhuma —
// ela está no anel em volta da Bolota, dentro do mundo.
//
// Todo alvo de toque tem no mínimo 44 px, e a escala acompanha o tamanho da
// janela e a opção de tamanho de texto.
// ---------------------------------------------------------------------------

import { TAU, clamp, lerp, easeOutCubic } from '../core/math.js';

const FONTE = "'Baloo 2','Trebuchet MS',system-ui,sans-serif";

export class Hud {
  constructor() {
    this.alvos = [];
    this.t = 0;
    this.dica = null;
    this.aviso = null;
    this.pisca = 0;      // brilho quando uma gota entra
  }

  escala(W, H, o) {
    return clamp(Math.min(W / 900, H / 700), 0.68, 1.25) * ((o && o.tamanhoTexto) || 1);
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

  mostrarDica(txt, dur = 5.5) { this.dica = { txt, vida: dur, total: dur }; }
  mostrarAviso(txt, dur = 2.2) { this.aviso = { txt, vida: dur, total: dur }; }
  brilhar() { this.pisca = 1; }

  _rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  _painel(ctx, x, y, w, h, r) {
    this._rr(ctx, x, y, w, h, r);
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(24,38,32,0.80)');
    g.addColorStop(1, 'rgba(14,24,22,0.72)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,222,168,0.24)';
    ctx.lineWidth = Math.max(1, r * 0.09);
    ctx.stroke();
  }

  /** Uma gotinha de orvalho, cheia ou vazia. */
  _gota(ctx, x, y, r, cheia, brilho) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.3);
    ctx.quadraticCurveTo(r, -r * 0.15, 0, r);
    ctx.quadraticCurveTo(-r, -r * 0.15, 0, -r * 1.3);
    ctx.closePath();
    if (cheia) {
      const g = ctx.createLinearGradient(0, -r * 1.3, 0, r);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.45, '#a8ecff');
      g.addColorStop(1, '#5ec6e8');
      ctx.fillStyle = g;
      ctx.fill();
      if (brilho > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = brilho * 0.8;
        ctx.fillStyle = '#bff2ff';
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.ellipse(-r * 0.3, -r * 0.25, r * 0.18, r * 0.28, -0.5, 0, TAU);
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(168,236,255,0.45)';
      ctx.lineWidth = Math.max(1, r * 0.16);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * @param p {fase, indice, total, gotas, totalGotas, saltos, melhor, habilidades}
   */
  desenhar(ctx, p, W, H, dt, opcoes) {
    this.t += dt;
    this.alvos.length = 0;
    this.pisca = Math.max(0, this.pisca - dt * 2.2);
    const e = this.escala(W, H, opcoes);

    ctx.save();
    ctx.textBaseline = 'middle';

    // ---- faixa de cima -------------------------------------------------------
    const bx = 14 * e, by = 12 * e, bw = W - 28 * e - 56 * e, bh = 52 * e;
    this._painel(ctx, bx, by, bw, bh, 16 * e);

    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,224,176,0.62)';
    ctx.font = `700 ${11.5 * e}px ${FONTE}`;
    ctx.fillText((p.fase.capitulo || '').toUpperCase(), bx + 18 * e, by + 17 * e);
    ctx.fillStyle = '#fff3dc';
    ctx.font = `800 ${20 * e}px ${FONTE}`;
    ctx.fillText(p.fase.nome, bx + 18 * e, by + 35 * e);

    // gotas no centro da faixa
    const gr = 9.5 * e;
    const esp = 27 * e;
    const cx = bx + bw * 0.60;
    const gy = by + bh / 2;
    const total = p.totalGotas || 0;
    const x0 = cx - ((total - 1) * esp) / 2;
    for (let i = 0; i < total; i++) {
      const cheia = i < p.gotas;
      const b = cheia && i === p.gotas - 1 ? this.pisca : 0;
      this._gota(ctx, x0 + i * esp, gy + (cheia ? Math.sin(this.t * 2 + i) * 1.2 * e : 0), gr, cheia, b);
    }

    // saltos à direita
    ctx.textAlign = 'right';
    const dx = bx + bw - 18 * e;
    ctx.fillStyle = 'rgba(255,224,176,0.62)';
    ctx.font = `700 ${11.5 * e}px ${FONTE}`;
    ctx.fillText('SALTOS', dx, by + 17 * e);
    ctx.fillStyle = '#fff3dc';
    ctx.font = `800 ${20 * e}px ${FONTE}`;
    let txt = String(p.saltos);
    if (p.melhor) txt += `  ·  melhor ${p.melhor}`;
    ctx.fillText(txt, dx, by + 35 * e);

    // ---- botão de pausa -------------------------------------------------------
    const pr = 24 * e;
    const px = W - 14 * e - pr, py = by + bh / 2;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, TAU);
    const gp = ctx.createLinearGradient(0, py - pr, 0, py + pr);
    gp.addColorStop(0, 'rgba(24,38,32,0.86)');
    gp.addColorStop(1, 'rgba(14,24,22,0.78)');
    ctx.fillStyle = gp;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,222,168,0.30)';
    ctx.lineWidth = 1.6 * e;
    ctx.stroke();
    ctx.fillStyle = '#ffe6bd';
    const pw = 3.6 * e, ph = 13 * e;
    this._rr(ctx, px - pw * 2, py - ph / 2, pw, ph, pw * 0.5); ctx.fill();
    this._rr(ctx, px + pw, py - ph / 2, pw, ph, pw * 0.5); ctx.fill();
    this.alvos.push({ id: 'pausa', forma: 'circulo', x: px, y: py, r: Math.max(pr, 24) });

    // ---- habilidades (só quando existe mais de uma) ---------------------------
    const habs = p.habilidades || [];
    if (habs.length > 1) {
      const hy = H - 30 * e;
      let hx = 20 * e;
      for (const h of habs) {
        ctx.beginPath();
        ctx.arc(hx + 16 * e, hy, 16 * e, 0, TAU);
        ctx.fillStyle = 'rgba(24,38,32,0.72)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(163,217,107,0.55)';
        ctx.lineWidth = 1.6 * e;
        ctx.stroke();
        ctx.fillStyle = '#cdf0a0';
        ctx.font = `800 ${13 * e}px ${FONTE}`;
        ctx.textAlign = 'center';
        ctx.fillText(h.nome[0], hx + 16 * e, hy + 1 * e);
        hx += 38 * e;
      }
    }

    // ---- dica de entrada e avisos ---------------------------------------------
    if (this.dica) {
      this.dica.vida -= dt;
      if (this.dica.vida <= 0) this.dica = null;
      else {
        const v = this.dica.vida;
        const a = clamp(Math.min(v, this.dica.total - v + 0.4) * 2.2, 0, 1);
        ctx.globalAlpha = a;
        ctx.textAlign = 'center';
        ctx.font = `700 ${17 * e}px ${FONTE}`;
        const tw = ctx.measureText(this.dica.txt).width;
        const dw = tw + 44 * e, dh = 40 * e;
        this._painel(ctx, W / 2 - dw / 2, H - 96 * e, dw, dh, 14 * e);
        ctx.fillStyle = '#fff3dc';
        ctx.fillText(this.dica.txt, W / 2, H - 96 * e + dh / 2);
        ctx.globalAlpha = 1;
      }
    }
    if (this.aviso) {
      this.aviso.vida -= dt;
      if (this.aviso.vida <= 0) this.aviso = null;
      else {
        const k = easeOutCubic(clamp((this.aviso.total - this.aviso.vida) * 4, 0, 1));
        ctx.globalAlpha = clamp(this.aviso.vida * 2.4, 0, 1);
        ctx.textAlign = 'center';
        ctx.font = `800 ${lerp(20, 26, k) * e}px ${FONTE}`;
        ctx.lineWidth = 6 * e; ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(16,26,22,0.7)';
        ctx.strokeText(this.aviso.txt, W / 2, H * 0.30);
        ctx.fillStyle = '#ffe6bd';
        ctx.fillText(this.aviso.txt, W / 2, H * 0.30);
        ctx.globalAlpha = 1;
      }
    }

    ctx.restore();
  }
}
