// ---------------------------------------------------------------------------
// draw.js — desenho do mundo. Tudo é gerado por código: nenhuma imagem externa
// (a página publicada não pode buscar mídia) e nenhum sprite escrito à mão.
//
// O brilho vem de gradientes radiais pré-renderizados em cache — muito mais
// barato que shadowBlur por objeto, que derruba o quadro com 300 partículas.
// ---------------------------------------------------------------------------

import { TAU, clamp, lerp, easeOutCubic } from '../core/math.js';
import { RUN } from '../game/world.js';

const glowCache = new Map();

/** Textura de brilho radial, uma por cor, reaproveitada em toda a cena. */
function glow(col, size = 128) {
  const key = col + '|' + size;
  let c = glowCache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const r = size / 2;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, col);
  grad.addColorStop(0.28, hexA(col, 0.55));
  grad.addColorStop(1, hexA(col, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  glowCache.set(key, c);
  return c;
}

function hexA(hex, a) {
  if (hex[0] !== '#') return hex;
  let h = hex.slice(1);
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function blob(ctx, x, y, r, sides, wobble, t, seed) {
  ctx.beginPath();
  for (let i = 0; i <= sides; i++) {
    const a = (TAU * i) / sides;
    const rr = r * (1 + Math.sin(a * 3 + t * 2.2 + seed) * wobble);
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.dark = document.createElement('canvas');
    this.darkCtx = this.dark.getContext('2d');
    this.floorPat = null;
    this.floorSeed = 0;
    this.font = "'Rajdhani', 'Segoe UI', system-ui, sans-serif";
    this.time = 0;
  }

  resize(w, h, dpr) {
    this.w = w; this.h = h; this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.dark.width = Math.max(2, Math.round(w / 2));
    this.dark.height = Math.max(2, Math.round(h / 2));
  }

  buildFloor(pal) {
    const S = 192;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    g.fillStyle = pal.floor;
    g.fillRect(0, 0, S, S);
    // grão: pedras e cinzas assentadas
    for (let i = 0; i < 340; i++) {
      const x = Math.random() * S, y = Math.random() * S;
      const r = Math.random() * 3.2 + 0.4;
      g.globalAlpha = 0.07 + Math.random() * 0.16;
      g.fillStyle = Math.random() < 0.55 ? pal.floorAlt : '#000';
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    // lascas maiores: dá escala ao chão quando a câmera está perto
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * S, y = Math.random() * S;
      g.globalAlpha = 0.05 + Math.random() * 0.06;
      g.fillStyle = pal.floorAlt;
      g.save(); g.translate(x, y); g.rotate(Math.random() * TAU);
      g.fillRect(-6, -1.6, 12, 3.2);
      g.restore();
    }
    g.globalAlpha = 0.055;
    g.strokeStyle = pal.floorAlt;
    g.lineWidth = 1;
    for (let i = 0; i <= S; i += 48) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, S); g.stroke();
      g.beginPath(); g.moveTo(0, i); g.lineTo(S, i); g.stroke();
    }
    this.floorPat = this.ctx.createPattern(c, 'repeat');
  }

  render(w, dt, alpha) {
    const ctx = this.ctx;
    this.time += dt;
    const pal = w.pal;
    if (!this.floorPat) this.buildFloor(pal);

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, this.w, this.h);

    ctx.save();
    w.camera.resize(this.w, this.h);
    w.camera.apply(ctx);

    this.drawFloor(ctx, w, pal);
    this.drawDecals(ctx, w);
    this.drawObstacles(ctx, w, pal);
    this.drawEmbers(ctx, w, pal);
    this.drawShadows(ctx, w);
    this.drawEnemies(ctx, w, pal);
    if (w.boss) this.drawBoss(ctx, w, w.boss, pal);
    this.drawPlayerBullets(ctx, w, pal);
    this.drawEnemyBullets(ctx, w, pal);
    this.drawPlayer(ctx, w, pal);
    this.drawOrbitals(ctx, w, pal);
    w.particles.draw(ctx);
    w.text.draw(ctx, this.font);

    ctx.restore();

    this.drawDarkness(ctx, w, pal);
    this.drawBossPointer(ctx, w, pal);
    this.drawVignette(ctx, pal);
    w.flash.draw(ctx, this.w, this.h);
  }

  /** Cena calma do menu: brasas subindo no escuro, sem nenhum resto de partida. */
  renderMenu(w, dt) {
    const ctx = this.ctx;
    this.time += dt;
    const pal = w.pal;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, this.w, this.h);

    // brasa distante pulsando no centro
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gi = glow(pal.flame, 128);
    const s = Math.min(this.w, this.h) * (0.42 + Math.sin(this.time * 0.7) * 0.02);
    ctx.globalAlpha = 0.16;
    ctx.drawImage(gi, this.w / 2 - s, this.h * 0.58 - s, s * 2, s * 2);
    ctx.restore();

    ctx.save();
    w.camera.resize(this.w, this.h);
    ctx.translate(this.w / 2 - w.camera.x, this.h / 2 - w.camera.y);
    w.particles.draw(ctx);
    ctx.restore();

    this.drawVignette(ctx, pal);
  }

  drawFloor(ctx, w, pal) {
    ctx.fillStyle = this.floorPat;
    ctx.fillRect(0, 0, w.arena.w, w.arena.h);
    // vinheta interna da arena: as bordas somem no escuro
    const g = ctx.createLinearGradient(0, 0, 0, w.arena.h);
    g.addColorStop(0, hexA(pal.bg, 0.9));
    g.addColorStop(0.18, hexA(pal.bg, 0));
    g.addColorStop(0.82, hexA(pal.bg, 0));
    g.addColorStop(1, hexA(pal.bg, 0.9));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w.arena.w, w.arena.h);
    ctx.strokeStyle = hexA(pal.accent, 0.22);
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, w.arena.w - 3, w.arena.h - 3);
  }

  drawDecals(ctx, w) {
    ctx.save();
    for (const d of w.decals) {
      ctx.globalAlpha = d.a * 0.5;
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r, d.r * 0.62, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  drawObstacles(ctx, w, pal) {
    const p = w.player;
    for (const o of w.arena.obstacles) {
      // sombra projetada para longe da luz do jogador: dá volume sem shader
      const cxo = o.x + o.w / 2, cyo = o.y + o.h / 2;
      let dx = cxo - p.x, dy = cyo - p.y;
      const m = Math.hypot(dx, dy) || 1;
      dx = (dx / m) * 12; dy = (dy / m) * 12;
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = '#000';
      ctx.fillRect(o.x + dx, o.y + dy, o.w, o.h);
      ctx.globalAlpha = 1;

      const g = ctx.createLinearGradient(o.x, o.y, o.x, o.y + o.h);
      g.addColorStop(0, pal.wall);
      g.addColorStop(1, hexA(pal.bg, 0.85));
      ctx.fillStyle = g;
      ctx.fillRect(o.x, o.y, o.w, o.h);

      // face superior, mais clara: lê como bloco em pé
      ctx.fillStyle = hexA(pal.accent, 0.14);
      ctx.fillRect(o.x, o.y, o.w, 7);
      // borda voltada para a luz recebe o brilho
      ctx.strokeStyle = hexA(pal.flame, 0.26);
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (Math.abs(dx) > Math.abs(dy)) {
        const ex = dx < 0 ? o.x + o.w : o.x;
        ctx.moveTo(ex, o.y); ctx.lineTo(ex, o.y + o.h);
      } else {
        const ey = dy < 0 ? o.y + o.h : o.y;
        ctx.moveTo(o.x, ey); ctx.lineTo(o.x + o.w, ey);
      }
      ctx.stroke();
      ctx.strokeStyle = hexA(pal.accent, 0.16);
      ctx.lineWidth = 1;
      ctx.strokeRect(o.x + 0.5, o.y + 0.5, o.w - 1, o.h - 1);
    }
  }

  drawShadows(ctx, w) {
    ctx.save();
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = '#000';
    for (const e of w.enemies) {
      if (!e.alive) continue;
      ctx.beginPath();
      ctx.ellipse(e.x, e.y + e.radius * 0.72, e.radius * 0.9, e.radius * 0.34, 0, 0, TAU);
      ctx.fill();
    }
    const p = w.player;
    if (p.alive) {
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + p.radius * 0.8, p.radius * 0.95, p.radius * 0.36, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  drawEmbers(ctx, w, pal) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gimg = glow(pal.ember, 64);
    for (let i = 0; i < w.embers.n; i++) {
      const e = w.embers.a[i];
      if (!e.alive) continue;
      const pulse = 0.75 + Math.sin(this.time * 7 + e.x * 0.05) * 0.25;
      const fade = clamp(e.life / 2.4, 0, 1);
      const s = 30 * pulse * fade;
      ctx.globalAlpha = 0.85 * fade;
      ctx.drawImage(gimg, e.x - s, e.y - s, s * 2, s * 2);
      ctx.globalAlpha = fade;
      ctx.fillStyle = pal.flameHot;
      ctx.beginPath(); ctx.arc(e.x, e.y, 3 * pulse, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  drawEnemies(ctx, w, pal) {
    for (const e of w.enemies) {
      if (!e.alive) continue;
      if (!w.camera.visible(e.x, e.y, e.radius + 60)) continue;
      const c0 = w.enemyColor(e, 0), c1 = w.enemyColor(e, 1);
      const flash = clamp(e.hitFlash, 0, 1);
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.scale(e.sx, e.sy);

      // aura fraca: separa o inimigo do chão escuro
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.30;
      const gi = glow(c1, 64);
      const gs = e.radius * 2.4;
      ctx.drawImage(gi, -gs, -gs, gs * 2, gs * 2);
      ctx.restore();

      switch (e.type) {
        case 'cinza': {
          ctx.rotate(Math.sin(this.time * 3 + e.id) * 0.12);
          ctx.fillStyle = flash > 0.1 ? '#fff' : c0;
          blob(ctx, 0, 0, e.radius, 7, 0.09, this.time, e.id);
          ctx.fill();
          ctx.fillStyle = flash > 0.1 ? '#fff' : c1;
          ctx.beginPath(); ctx.arc(0, -e.radius * 0.15, e.radius * 0.3, 0, TAU); ctx.fill();
          break;
        }
        case 'fagulha': {
          ctx.rotate(e.facing);
          const tele = e.state === 'telegraph';
          const k = tele ? 1 + Math.sin(e.t * 34) * 0.16 : 1;
          ctx.fillStyle = flash > 0.1 ? '#fff' : (tele ? c1 : c0);
          ctx.beginPath();
          ctx.moveTo(e.radius * 1.5 * k, 0);
          ctx.lineTo(-e.radius * 0.8, -e.radius * k);
          ctx.lineTo(-e.radius * 0.35, 0);
          ctx.lineTo(-e.radius * 0.8, e.radius * k);
          ctx.closePath(); ctx.fill();
          if (tele) {
            ctx.strokeStyle = hexA(c1, 0.55);
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 7]);
            ctx.beginPath(); ctx.moveTo(e.radius * 1.6, 0); ctx.lineTo(230, 0); ctx.stroke();
            ctx.setLineDash([]);
          }
          break;
        }
        case 'fumaca': {
          ctx.fillStyle = flash > 0.1 ? '#fff' : c0;
          blob(ctx, 0, 0, e.radius, 9, 0.16, this.time * 1.4, e.id);
          ctx.fill();
          ctx.strokeStyle = hexA(c1, 0.75);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, e.radius + 6 + Math.sin(this.time * 2.4 + e.id) * 2.5,
            this.time * 1.6, this.time * 1.6 + 4.2);
          ctx.stroke();
          ctx.fillStyle = c1;
          ctx.beginPath(); ctx.arc(0, 0, e.radius * 0.28, 0, TAU); ctx.fill();
          break;
        }
        case 'carvao': {
          ctx.rotate(Math.sin(this.time * 1.5 + e.id) * 0.06);
          ctx.fillStyle = flash > 0.1 ? '#fff' : c0;
          const r = e.radius;
          ctx.beginPath();
          ctx.roundRect ? ctx.roundRect(-r, -r, r * 2, r * 2, 7) : ctx.rect(-r, -r, r * 2, r * 2);
          ctx.fill();
          // rachaduras acesas
          ctx.strokeStyle = hexA(c1, 0.9);
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(-r * 0.6, -r * 0.5); ctx.lineTo(-r * 0.1, 0); ctx.lineTo(-r * 0.45, r * 0.55);
          ctx.moveTo(r * 0.5, -r * 0.6); ctx.lineTo(r * 0.15, -r * 0.05); ctx.lineTo(r * 0.6, r * 0.4);
          ctx.stroke();
          // escudo frontal — a informação de que bater de frente rende menos
          ctx.rotate(e.facing);
          ctx.strokeStyle = hexA('#9fd0ff', 0.5);
          ctx.lineWidth = 4;
          ctx.beginPath(); ctx.arc(0, 0, r + 8, -1.0, 1.0); ctx.stroke();
          break;
        }
        case 'veu': {
          ctx.rotate(this.time * 1.1 * e.orbitDir);
          ctx.fillStyle = flash > 0.1 ? '#fff' : c0;
          ctx.beginPath();
          ctx.moveTo(0, -e.radius * 1.25);
          ctx.lineTo(e.radius, 0);
          ctx.lineTo(0, e.radius * 1.25);
          ctx.lineTo(-e.radius, 0);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = hexA(c1, 0.6);
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(0, 0, e.radius * 1.7, 0, TAU); ctx.stroke();
          break;
        }
      }
      ctx.restore();

      // barra de vida só quando ferido: menos ruído na tela
      if (e.hp < e.maxHp - 0.01) {
        const bw = e.radius * 2.1;
        const t = clamp(e.hp / e.maxHp, 0, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(e.x - bw / 2, e.y - e.radius - 13, bw, 3.5);
        ctx.fillStyle = e.burnT > 0 ? pal.flame : c1;
        ctx.fillRect(e.x - bw / 2, e.y - e.radius - 13, bw * t, 3.5);
      }
      if (e.slowT > 0) {
        ctx.strokeStyle = 'rgba(140,200,255,0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.radius + 5, 0, TAU); ctx.stroke();
      }
    }
  }

  drawBoss(ctx, w, b, pal) {
    if (!b.alive) return;
    const r = b.radius;
    ctx.save();
    ctx.translate(b.x, b.y);

    // telegrafia: anel que fecha antes do ataque sair
    if (b.telegraph > 0) {
      const k = 1 - b.telegraph / 0.55;
      ctx.save();
      ctx.strokeStyle = hexA(b.def.accent, 0.5);
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, r + 40 * (1 - k) + 12, 0, TAU); ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.4 + Math.sin(this.time * 3) * 0.06;
    const gi = glow(b.def.accent, 128);
    const gs = r * 3.2;
    ctx.drawImage(gi, -gs, -gs, gs * 2, gs * 2);
    ctx.restore();

    ctx.scale(b.sx, b.sy);
    const flash = clamp(b.hitFlash, 0, 1);

    if (b.kind === 'vigia') {
      ctx.fillStyle = flash > 0.1 ? '#fff' : b.def.color;
      blob(ctx, 0, 0, r, 12, 0.055, this.time * 0.8, 3);
      ctx.fill();
      ctx.strokeStyle = hexA(b.def.accent, 0.55);
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.94, 0, TAU); ctx.stroke();
      // íris que segue o jogador
      const ex = Math.cos(b.facing) * r * 0.26, ey = Math.sin(b.facing) * r * 0.26;
      ctx.fillStyle = b.def.accent;
      ctx.beginPath(); ctx.arc(ex, ey, r * 0.42, 0, TAU); ctx.fill();
      ctx.fillStyle = '#140c04';
      ctx.beginPath(); ctx.arc(ex, ey, r * 0.2 * (1 + Math.sin(this.time * 2) * 0.08), 0, TAU); ctx.fill();
      // pás rotativas marcam a fase
      ctx.strokeStyle = hexA(b.def.accent, 0.4);
      ctx.lineWidth = 5;
      for (let i = 0; i <= b.phase; i++) {
        const a0 = b.angle * (i + 1) * 0.8;
        ctx.beginPath(); ctx.arc(0, 0, r + 16 + i * 11, a0, a0 + 1.5); ctx.stroke();
      }
    } else {
      ctx.fillStyle = flash > 0.1 ? '#fff' : b.def.color;
      blob(ctx, 0, 0, r, 14, 0.11, this.time * 1.3, 7);
      ctx.fill();
      // muitos olhos: quantidade cresce com a fase
      const eyes = 3 + b.phase * 3;
      for (let i = 0; i < eyes; i++) {
        const a = (TAU * i) / eyes + this.time * 0.5;
        const rr = r * 0.55;
        const ex = Math.cos(a) * rr, ey = Math.sin(a) * rr;
        const blink = Math.sin(this.time * 2.2 + i * 1.7);
        ctx.fillStyle = b.def.accent;
        ctx.beginPath();
        ctx.ellipse(ex, ey, r * 0.15, r * 0.15 * clamp(blink, 0.12, 1), a, 0, TAU);
        ctx.fill();
      }
      ctx.strokeStyle = hexA(b.def.accent, 0.35);
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, r + 18, b.angle, b.angle + 3.6); ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  }

  drawPlayerBullets(ctx, w, pal) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < w.pShots.n; i++) {
      const b = w.pShots.a[i];
      if (!b.alive) continue;
      const a = Math.atan2(b.vy, b.vx);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(a);
      const gi = glow(b.crit ? pal.flameHot : pal.shot, 64);
      const s = b.r * 4.6;
      ctx.globalAlpha = 0.85;
      ctx.drawImage(gi, -s, -s, s * 2, s * 2);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(0, 0, b.r * 2.1, b.r * 0.75, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  drawEnemyBullets(ctx, w, pal) {
    for (let i = 0; i < w.eShots.n; i++) {
      const b = w.eShots.a[i];
      if (!b.alive) continue;
      if (!w.camera.visible(b.x, b.y, 40)) continue;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.7;
      const gi = glow(pal.danger, 64);
      const s = b.r * 3.4;
      ctx.drawImage(gi, b.x - s, b.y - s, s * 2, s * 2);
      ctx.restore();
      // núcleo escuro com borda acesa: lê como perigo mesmo no escuro
      ctx.fillStyle = '#140811';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = pal.danger;
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke();
    }
  }

  drawPlayer(ctx, w, pal) {
    const p = w.player;
    if (!p.alive) return;
    const pct = clamp(p.flame / p.maxFlame, 0, 1);
    ctx.save();

    // halo: o tamanho da luz é a barra de vida diegética
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gi = glow(pal.flame, 128);
    const s = lerp(58, 190, pct) * (1 + Math.sin(this.time * 4.5) * 0.035);
    ctx.globalAlpha = lerp(0.35, 0.85, pct);
    ctx.drawImage(gi, p.x - s, p.y - s, s * 2, s * 2);
    // O clarão de dano fica no personagem, não na arena inteira: pintar todo o
    // chão de vermelho esconde justamente o que precisa ser lido no momento
    // em que você levou o golpe.
    if (p.hurtFlash > 0.02) {
      const gd = glow(pal.danger, 64);
      const sd = 54 * (0.8 + p.hurtFlash * 0.6);
      ctx.globalAlpha = clamp(p.hurtFlash, 0, 1) * 0.75;
      ctx.drawImage(gd, p.x - sd, p.y - sd, sd * 2, sd * 2);
    }
    ctx.restore();

    ctx.translate(p.x, p.y);

    // arco do golpe
    if (p.swing) {
      const sw = p.swing;
      const k = clamp(sw.t / (sw.windup + sw.active), 0, 1);
      const range = 84 * w.mods.meleeRange;
      const spread = 1.02;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const a0 = sw.ang - spread * sw.dir;
      const a1 = sw.ang + spread * sw.dir;
      const cur = lerp(a0, a1, easeOutCubic(k));
      const grad = ctx.createRadialGradient(0, 0, range * 0.3, 0, 0, range);
      grad.addColorStop(0, hexA(pal.flameHot, 0));
      grad.addColorStop(0.7, hexA(pal.flame, 0.5 * (1 - k)));
      grad.addColorStop(1, hexA(pal.flameHot, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, range, Math.min(a0, cur), Math.max(a0, cur));
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = hexA(pal.flameHot, 0.85 * (1 - k));
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, range * 0.96, Math.min(a0, cur), Math.max(a0, cur)); ctx.stroke();
      ctx.restore();
    }

    ctx.rotate(p.facing);
    ctx.scale(p.sx, p.sy);

    // corpo: gota apontando para a mira
    const flick = 1 + Math.sin(this.time * 13) * 0.07;
    const R = p.radius;
    // gradiente do rabo para a ponta: a brasa é mais quente onde ela aponta
    const body = ctx.createLinearGradient(-R * 1.2, 0, R * 1.5, 0);
    body.addColorStop(0, pal.flame);
    body.addColorStop(0.45, pal.player);
    body.addColorStop(1, pal.playerCore);
    ctx.fillStyle = p.invuln > 0 && Math.floor(this.time * 22) % 2 === 0 ? '#ffffff' : body;
    ctx.beginPath();
    ctx.moveTo(R * 1.45 * flick, 0);
    ctx.quadraticCurveTo(R * 0.3, -R * 1.05, -R * 0.85, -R * 0.62);
    ctx.quadraticCurveTo(-R * 1.25, 0, -R * 0.85, R * 0.62);
    ctx.quadraticCurveTo(R * 0.3, R * 1.05, R * 1.45 * flick, 0);
    ctx.fill();

    ctx.fillStyle = pal.playerCore;
    ctx.beginPath();
    ctx.ellipse(R * 0.12, 0, R * 0.62 * flick, R * 0.55, 0, 0, TAU);
    ctx.fill();

    ctx.restore();

    // cargas de avanço, como pequenas marcas ao redor
    ctx.save();
    for (let i = 0; i < p.dashMax; i++) {
      const a = -Math.PI / 2 + (i - (p.dashMax - 1) / 2) * 0.42;
      const rx = p.x + Math.cos(a) * 30, ry = p.y + Math.sin(a) * 30;
      const ready = i < p.dashCharges;
      ctx.globalAlpha = ready ? 0.95 : 0.25;
      ctx.fillStyle = ready ? pal.flameHot : pal.uiDim;
      ctx.beginPath(); ctx.arc(rx, ry, ready ? 3.2 : 2.2, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  drawOrbitals(ctx, w, pal) {
    if (!w.orbitals.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gi = glow(pal.flame, 64);
    for (const o of w.orbitals) {
      if (o.x === undefined) continue;
      const s = 26;
      ctx.globalAlpha = 0.8;
      ctx.drawImage(gi, o.x - s, o.y - s, s * 2, s * 2);
      ctx.globalAlpha = 1;
      ctx.fillStyle = pal.flameHot;
      ctx.beginPath(); ctx.arc(o.x, o.y, 5.5, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Escuridão: o raio de visão encolhe junto com a chama. É a mecânica central
   * lida como imagem — e é desligável nas opções, porque para alguns jogadores
   * a perda de visão é barreira, não tensão.
   */
  drawDarkness(ctx, w, pal) {
    const strength = w.settings.darkness;
    if (strength <= 0.01) return;
    const p = w.player;
    const dc = this.darkCtx;
    const W = this.dark.width, H = this.dark.height;
    const sx = W / this.w, sy = H / this.h;

    const pct = clamp(p.flame / p.maxFlame, 0, 1);
    const boost = clamp(w.darknessBoost + (w.darkPulse > 0 ? 0.3 : 0), 0, 0.7);
    const alpha = clamp((0.30 + (1 - pct) * 0.58 + boost) * strength, 0, 0.95);

    dc.setTransform(1, 0, 0, 1, 0, 0);
    dc.clearRect(0, 0, W, H);
    dc.fillStyle = pal.bg;
    dc.globalAlpha = alpha;
    dc.fillRect(0, 0, W, H);

    dc.globalCompositeOperation = 'destination-out';
    dc.globalAlpha = 1;
    const cx = w.camera.worldToScreenX(p.x) * sx;
    const cy = w.camera.worldToScreenY(p.y) * sy;
    const r = lerp(115, 330, pct) * w.camera.zoom * sx;
    const g = dc.createRadialGradient(cx, cy, r * 0.18, cx, cy, r);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.82)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    dc.fillStyle = g;
    dc.beginPath(); dc.arc(cx, cy, r, 0, TAU); dc.fill();

    // cada fonte de luz abre um buraco no escuro
    const punch = (wx, wy, rad, str) => {
      const x = w.camera.worldToScreenX(wx) * sx;
      const y = w.camera.worldToScreenY(wy) * sy;
      if (x < -rad || y < -rad || x > W + rad || y > H + rad) return;
      const gg = dc.createRadialGradient(x, y, 0, x, y, rad);
      gg.addColorStop(0, `rgba(0,0,0,${str})`);
      gg.addColorStop(1, 'rgba(0,0,0,0)');
      dc.fillStyle = gg;
      dc.beginPath(); dc.arc(x, y, rad, 0, TAU); dc.fill();
    };
    for (let i = 0; i < w.embers.n; i++) {
      const e = w.embers.a[i];
      if (e.alive) punch(e.x, e.y, 46 * w.camera.zoom * sx, 0.55);
    }
    for (let i = 0; i < w.pShots.n; i++) {
      const b = w.pShots.a[i];
      if (b.alive) punch(b.x, b.y, 60 * w.camera.zoom * sx, 0.6);
    }
    for (const o of w.orbitals) if (o.x !== undefined) punch(o.x, o.y, 70 * w.camera.zoom * sx, 0.7);
    if (w.boss && w.boss.alive) punch(w.boss.x, w.boss.y, w.boss.radius * 3 * w.camera.zoom * sx, 0.5);

    dc.globalCompositeOperation = 'source-over';

    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.dark, 0, 0, this.w, this.h);
    ctx.restore();
  }

  /** O chefe pode sair do enquadramento; sem isto o jogador perde a referência. */
  drawBossPointer(ctx, w, pal) {
    const b = w.boss;
    if (!b || !b.alive) return;
    const sx = w.camera.worldToScreenX(b.x), sy = w.camera.worldToScreenY(b.y);
    const pad = 54;
    if (sx > pad && sx < this.w - pad && sy > pad && sy < this.h - pad) return;
    const cx = this.w / 2, cy = this.h / 2;
    const a = Math.atan2(sy - cy, sx - cx);
    const rx = Math.min(cx - pad, Math.abs(Math.cos(a)) > 0.001 ? Math.abs((cx - pad) / Math.cos(a)) : 1e9);
    const ry = Math.min(cy - pad, Math.abs(Math.sin(a)) > 0.001 ? Math.abs((cy - pad) / Math.sin(a)) : 1e9);
    const r = Math.min(rx, ry);
    const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(a);
    const pulse = 0.65 + Math.sin(this.time * 6) * 0.25;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = b.def.accent;
    ctx.beginPath();
    ctx.moveTo(16, 0); ctx.lineTo(-9, -11); ctx.lineTo(-4, 0); ctx.lineTo(-9, 11);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  drawVignette(ctx, pal) {
    if (!this._vig || this._vigW !== this.w || this._vigH !== this.h) {
      const c = document.createElement('canvas');
      c.width = this.w; c.height = this.h;
      const g = c.getContext('2d');
      const grad = g.createRadialGradient(
        this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.35,
        this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.78);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.62)');
      g.fillStyle = grad;
      g.fillRect(0, 0, this.w, this.h);
      this._vig = c; this._vigW = this.w; this._vigH = this.h;
    }
    ctx.drawImage(this._vig, 0, 0, this.w, this.h);
  }
}

export { hexA, glow };
