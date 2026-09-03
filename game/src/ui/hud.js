// ---------------------------------------------------------------------------
// hud.js — informação de combate desenhada no canvas, em espaço de tela.
// Regra: só entra aqui o que o jogador precisa ler no meio da briga.
// ---------------------------------------------------------------------------

import { clamp, lerp, TAU, easeOutCubic, easeOutBack } from '../core/math.js';
import { hexA } from '../render/draw.js';
import { RUN } from '../game/world.js';
import { TOTAL_WAVES } from '../game/balance.js';
import { byId } from '../game/upgrades.js';

export class Hud {
  constructor() {
    this.font = "'Rajdhani', 'Segoe UI', system-ui, sans-serif";
    this.shownFlame = 1;
    this.shownBoss = 1;
    this.t = 0;
  }

  draw(ctx, w, dt, W, H, scale) {
    this.t += dt;
    const pal = w.pal;
    const s = scale;
    ctx.save();
    ctx.textBaseline = 'middle';

    const pct = clamp(w.player.flame / w.player.maxFlame, 0, 1);
    // a barra corre atrás do valor real: dá leitura do golpe que acabou de sair
    this.shownFlame = this.shownFlame > pct
      ? Math.max(pct, this.shownFlame - dt * 0.6)
      : lerp(this.shownFlame, pct, 1 - Math.pow(0.001, dt));

    // ---- chama -------------------------------------------------------------
    const bx = 26 * s, by = 26 * s, bw = 300 * s, bh = 22 * s;
    ctx.fillStyle = 'rgba(8,5,12,0.72)';
    ctx.fillRect(bx - 3 * s, by - 3 * s, bw + 6 * s, bh + 6 * s);
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(bx, by, bw, bh);
    // rastro do dano
    ctx.fillStyle = hexA(pal.danger, 0.55);
    ctx.fillRect(bx, by, bw * this.shownFlame, bh);
    const grad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    grad.addColorStop(0, pal.flame);
    grad.addColorStop(1, pal.flameHot);
    ctx.fillStyle = grad;
    ctx.fillRect(bx, by, bw * pct, bh);
    // pulso de alerta com chama baixa
    if (pct < 0.28) {
      ctx.globalAlpha = 0.35 + Math.sin(this.t * 9) * 0.25;
      ctx.fillStyle = pal.danger;
      ctx.fillRect(bx, by, bw * pct, bh);
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = hexA(pal.ui, 0.25);
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 0.5, by + 0.5, bw, bh);
    // marcas a cada 25 de chama, para ler o valor sem número
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    for (let v = 25; v < w.player.maxFlame; v += 25) {
      const x = bx + bw * (v / w.player.maxFlame);
      ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(x, by + bh); ctx.stroke();
    }
    ctx.font = `700 ${13 * s}px ${this.font}`;
    ctx.fillStyle = pal.ui;
    ctx.textAlign = 'left';
    ctx.fillText('CHAMA', bx, by + bh + 13 * s);
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.ceil(w.player.flame)} / ${Math.round(w.player.maxFlame)}`, bx + bw, by + bh + 13 * s);

    // ---- onda e pontuação ---------------------------------------------------
    ctx.textAlign = 'right';
    ctx.font = `700 ${30 * s}px ${this.font}`;
    ctx.fillStyle = pal.ui;
    ctx.fillText(String(w.score).padStart(6, '0'), W - 26 * s, 34 * s);
    ctx.font = `600 ${13 * s}px ${this.font}`;
    ctx.fillStyle = pal.uiDim;
    ctx.fillText('PONTOS', W - 26 * s, 56 * s);

    ctx.textAlign = 'center';
    ctx.font = `700 ${17 * s}px ${this.font}`;
    ctx.fillStyle = pal.uiDim;
    const restantes = w.enemies.length + w.pendingSpawns.length;
    ctx.fillText(`ONDA ${w.wave} / ${TOTAL_WAVES}`, W / 2, 28 * s);
    if (w.state === RUN.LUTANDO && !w.waveCfg.boss) {
      ctx.font = `600 ${13 * s}px ${this.font}`;
      ctx.fillStyle = hexA(pal.ui, 0.7);
      ctx.fillText(`${restantes} restantes`, W / 2, 48 * s);
    }

    // ---- Sopros acumulados ---------------------------------------------------
    const ids = Object.keys(w.taken);
    if (ids.length) {
      ctx.textAlign = 'left';
      let x = 26 * s;
      const y = H - 26 * s;
      ctx.font = `700 ${12 * s}px ${this.font}`;
      for (const id of ids) {
        const u = byId(id);
        if (!u) continue;
        const label = u.name.split(' ')[0].slice(0, 11).toUpperCase();
        const n = w.taken[id];
        const txt = n > 1 ? `${label}×${n}` : label;
        const tw = ctx.measureText(txt).width + 14 * s;
        ctx.fillStyle = 'rgba(10,6,16,0.7)';
        ctx.fillRect(x, y - 9 * s, tw, 18 * s);
        ctx.fillStyle = u.rarity === 'epico' ? pal.flame : u.rarity === 'raro' ? '#7fc8ff' : pal.uiDim;
        ctx.fillText(txt, x + 7 * s, y);
        x += tw + 6 * s;
        if (x > W - 200 * s) break;
      }
    }

    // ---- barra do chefe -------------------------------------------------------
    if (w.boss && w.boss.alive) {
      const b = w.boss;
      const t = clamp(b.hp / b.maxHp, 0, 1);
      this.shownBoss = this.shownBoss > t ? Math.max(t, this.shownBoss - dt * 0.35) : t;
      const cw = Math.min(W * 0.62, 640 * s), ch = 15 * s;
      const cx = (W - cw) / 2, cy = H - 74 * s;
      ctx.fillStyle = 'rgba(8,5,12,0.8)';
      ctx.fillRect(cx - 3 * s, cy - 3 * s, cw + 6 * s, ch + 6 * s);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(cx, cy, cw, ch);
      ctx.fillStyle = hexA(pal.danger, 0.5);
      ctx.fillRect(cx, cy, cw * this.shownBoss, ch);
      ctx.fillStyle = b.def.accent;
      ctx.fillRect(cx, cy, cw * t, ch);
      // divisórias de fase: dá para prever quando ele muda o repertório
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 2;
      for (let i = 1; i < b.def.phases.length; i++) {
        const x = cx + cw * b.def.phases[i];
        ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x, cy + ch); ctx.stroke();
      }
      ctx.textAlign = 'center';
      ctx.font = `700 ${16 * s}px ${this.font}`;
      ctx.fillStyle = pal.ui;
      ctx.fillText(b.name, W / 2, cy - 14 * s);
      if (b.invuln > 0) {
        ctx.font = `600 ${12 * s}px ${this.font}`;
        ctx.fillStyle = pal.uiDim;
        ctx.fillText('protegido', W / 2, cy + ch + 14 * s);
      }
    } else {
      this.shownBoss = 1;
    }

    // ---- aviso de chama baixa --------------------------------------------------
    if (pct < 0.22 && w.state !== RUN.DERROTA) {
      const a = 0.3 + Math.sin(this.t * 7) * 0.2;
      ctx.save();
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, hexA(pal.danger, a * 0.5));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
      ctx.textAlign = 'center';
      ctx.font = `700 ${20 * s}px ${this.font}`;
      ctx.fillStyle = hexA(pal.danger, 0.55 + Math.sin(this.t * 7) * 0.3);
      ctx.fillText('A CHAMA ESTÁ APAGANDO', W / 2, H - 40 * s);
    }

    // ---- faixa de onda / chefe --------------------------------------------------
    if (w.bannerT > 0 && w.lastBanner) {
      const b = w.lastBanner;
      const total = b.kind === 'boss' ? 3.2 : 2.2;
      const k = 1 - w.bannerT / total;
      const inA = clamp(k / 0.18, 0, 1);
      const outA = clamp((1 - k) / 0.25, 0, 1);
      const a = Math.min(inA, outA);
      const slide = (1 - easeOutBack(inA)) * 40 * s;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.textAlign = 'center';
      const cy = H * 0.3 + slide;
      ctx.fillStyle = 'rgba(8,5,12,0.55)';
      ctx.fillRect(0, cy - 44 * s, W, 92 * s);
      ctx.font = `800 ${(b.kind === 'boss' ? 54 : 40) * s}px ${this.font}`;
      ctx.fillStyle = b.kind === 'boss' ? pal.danger : pal.ui;
      ctx.fillText(b.title, W / 2, cy - 8 * s);
      ctx.font = `600 ${16 * s}px ${this.font}`;
      ctx.fillStyle = pal.uiDim;
      ctx.fillText(b.sub, W / 2, cy + 26 * s);
      ctx.restore();
    }

    if (w.input.touchMode) this.drawTouch(ctx, w.input, W, H, pal);

    ctx.restore();
  }

  /**
   * Controles de toque. Desenhados no canvas para acompanharem o tremor de
   * tela zero — botões em DOM ficariam parados enquanto o mundo balança.
   */
  drawTouch(ctx, input, W, H, pal) {
    const l = input.touchLayout(W, H);
    const t = input.touch;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // manche
    const st = l.stick;
    const ativo = t.stickId !== null;
    const ox = ativo ? t.ox : st.x, oy = ativo ? t.oy : st.y;
    ctx.globalAlpha = ativo ? 0.5 : 0.26;
    ctx.strokeStyle = pal.ui;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ox, oy, st.r, 0, TAU); ctx.stroke();
    ctx.globalAlpha = ativo ? 0.85 : 0.4;
    ctx.fillStyle = pal.flame;
    ctx.beginPath();
    ctx.arc(ox + (t.knobX || 0), oy + (t.knobY || 0), st.knob, 0, TAU);
    ctx.fill();

    // botões
    for (const name of ['attack', 'shoot', 'dash']) {
      const b = l[name];
      const on = input.touch.buttons[name] !== null;
      ctx.globalAlpha = on ? 0.9 : 0.34;
      ctx.fillStyle = 'rgba(12,8,18,0.6)';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = name === 'attack' ? pal.flame : pal.ui;
      ctx.lineWidth = on ? 3 : 2;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke();
      ctx.globalAlpha = on ? 1 : 0.6;
      ctx.fillStyle = name === 'attack' ? pal.flameHot : pal.ui;
      ctx.font = `700 ${12 * l.scale}px ${this.font}`;
      ctx.fillText(b.label, b.x, b.y);
    }
    ctx.restore();
  }
}
