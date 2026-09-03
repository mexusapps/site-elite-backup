// ---------------------------------------------------------------------------
// cena.js — o desenho do mundo.
//
// A qualidade vem de assar o que não muda e desenhar ao vivo só o que respira:
//
//   • CÉU, MORROS e MATA DISTANTE viram três telas largas, pintadas uma vez e
//     roladas em velocidades diferentes (parallaxe). Cada camada mais distante
//     recebe mais névoa e menos contraste — é assim que profundidade aparece.
//   • O TERRENO inteiro da fase é pintado uma vez numa tela do tamanho do
//     mapa, com todas as passadas caras (veios, musgo, oclusão, luz de borda).
//     Em jogo, só se recorta o pedaço visível: custo zero por quadro.
//   • Ao vivo ficam só a grama que balança, os bichinhos de luz, o personagem,
//     as partículas e os raios de sol — e no fim, bloom, vinheta e gradação.
// ---------------------------------------------------------------------------

import { TAU, clamp, lerp, damp, easeOutCubic } from '../core/math.js';
import {
  fbm, mancha, moita, contornoVivo, pintarTerreno, arvore, samambaia, tufo,
  florzinha, cogumelo, mistura, comAlfa, nevoar, grao,
} from './arte.js';
import { Personagem } from './personagem.js';
import { PosFX } from './posfx.js';

export const PALETA = {
  amanhecer: {
    ceuAlto: '#36597f', ceuMedio: '#8aa9ae', ceuBaixo: '#f5c187', ceuHorizonte: '#ffdfae',
    sol: '#fff2cf', solHalo: '#ffca7a',
    morroLonge: '#4a6a78', morroMeio: '#3b5a60', morroPerto: '#2d474a',
    mataLonge: '#33565a', mataMeio: '#28474b',
    terraClara: '#6e5942', terraTopo: '#4e3f31', terraMeio: '#382c24', terraFundo: '#1d1712',
    pedraClara: '#74604e', pedraEscura: '#282019',
    musgoClaro: '#96cf6c', musgo: '#5f9c46', musgoEscuro: '#3a6630',
    tronco: '#4c3829', troncoEscuro: '#2d2119', troncoLuz: '#75563c',
    folhaEscura: '#27512f', folhaClara: '#4f9243', folhaLuz: '#a3d96b',
    gramaClara: '#a6d76e', gramaEscura: '#4a7c3a',
    fernClara: '#78b85a', fernEscura: '#3a6b34',
    luzQuente: '#ffd9a0', luzBorda: '#ffeccb',
    cogumeloClaro: '#ffbe86', cogumeloEscuro: '#dd7c4c',
    cogumeloPe: '#f8e8d2', cogumeloLamela: '#e6cba7', cogumeloPinta: '#fff6e4',
    orvalho: '#a8ecff', orvalhoNucleo: '#ffffff',
    frente: '#16241f',
  },
};

// ---------------------------------------------------------------------------
export class Camera {
  constructor() {
    this.x = 0; this.y = 0; this.zoom = 1; this.zoomAlvo = 1;
    this.tremor = 0; this.tx = 0; this.ty = 0;
    this.escalaTremor = 1;
    this.limites = null;
  }
  seguir(alvoX, alvoY, adiantaX, adiantaY, dt, w, h) {
    const gx = alvoX + adiantaX, gy = alvoY + adiantaY;
    this.x = damp(this.x, gx, 5.2, dt);
    this.y = damp(this.y, gy, 4.4, dt);
    this.zoom = damp(this.zoom, this.zoomAlvo, 3.4, dt);
    if (this.limites) {
      const hw = w / (2 * this.zoom), hh = h / (2 * this.zoom);
      const L = this.limites;
      this.x = L.w > hw * 2 ? clamp(this.x, L.x + hw, L.x + L.w - hw) : L.x + L.w / 2;
      this.y = L.h > hh * 2 ? clamp(this.y, L.y + hh, L.y + L.h - hh) : L.y + L.h / 2;
    }
  }
  passo(dt) {
    this.tremor = Math.max(0, this.tremor - dt * 2.6);
    const s = this.tremor * this.tremor * 16 * this.escalaTremor;
    if (s > 0.02) {
      const a = Math.random() * TAU;
      this.tx = Math.cos(a) * s; this.ty = Math.sin(a) * s;
    } else { this.tx = 0; this.ty = 0; }
  }
  bater(v) { this.tremor = Math.min(1, this.tremor + v); }
  get ox() { return this.x + this.tx; }
  get oy() { return this.y + this.ty; }
  aplicar(ctx, w, h) {
    ctx.translate(w / 2, h / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.ox, -this.oy);
  }
  paraTela(x, y, w, h) {
    return { x: (x - this.ox) * this.zoom + w / 2, y: (y - this.oy) * this.zoom + h / 2 };
  }
  paraMundo(sx, sy, w, h) {
    return { x: (sx - w / 2) / this.zoom + this.ox, y: (sy - h / 2) / this.zoom + this.oy };
  }
}

// ---------------------------------------------------------------------------
export class Cena {
  /**
   * @param {HTMLCanvasElement} saida  onde o quadro final aparece
   * @param {HTMLCanvasElement} hud    camada de interface, fora do acabamento
   */
  constructor(saida, hud, op = {}) {
    this.saida = saida;
    this.hudCanvas = hud;
    this.hudCtx = hud ? hud.getContext('2d') : null;

    // Com WebGL a cena é pintada numa tela fora do ecrã e vira textura; sem
    // WebGL a mesma pintura vai direto para a tela visível e o acabamento
    // volta a ser feito em 2D. O jogo é idêntico nos dois caminhos.
    this.pos = new PosFX(saida, op);
    if (this.pos.ok) {
      this.canvas = document.createElement('canvas');
    } else {
      this.canvas = saida;
    }
    this.ctx = this.canvas.getContext('2d');
    this.luz = document.createElement('canvas');
    this.luzCtx = this.luz.getContext('2d');
    this.borr = document.createElement('canvas');
    this.borrCtx = this.borr.getContext('2d');
    this.pal = PALETA.amanhecer;
    this.boneco = new Personagem();
    this.t = 0;
    this.brilho = 1;
    this.qualidade = 1;
    this.fonte = "'Baloo 2','Trebuchet MS',system-ui,sans-serif";
  }

  /**
   * Qualidade 1 · 0.5 · 0 — alta, média, baixa.
   *
   * Um jogo que só roda liso na máquina de quem o fez não está pronto. Os três
   * níveis mexem exatamente onde a conta dói: o tamanho da tela de luz, quantos
   * raios de sol são desenhados, quantas passadas o bloom faz e se a camada da
   * frente entra. A jogabilidade não muda em nenhum deles.
   */
  definirQualidade(q) {
    if (this.qualidade === q) return;
    this.qualidade = q;
    if (this.w) this.redimensionar(this.w, this.h, this.dpr);
  }

  /** Limpa a camada de interface para o quadro. */
  limparHud() {
    if (!this.hudCtx) return null;
    this.hudCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.hudCtx.clearRect(0, 0, this.w, this.h);
    return this.hudCtx;
  }

  redimensionar(w, h, dpr) {
    this.w = w; this.h = h; this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.saida.style.width = w + 'px';
    this.saida.style.height = h + 'px';
    if (this.canvas !== this.saida) {
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
    }
    if (this.pos.ok) {
      this.pos.redimensionar(Math.round(w * dpr), Math.round(h * dpr),
        this.qualidade > 0.67 ? 1 : 0.7);
    }
    if (this.hudCanvas) {
      this.hudCanvas.width = Math.round(w * dpr);
      this.hudCanvas.height = Math.round(h * dpr);
      this.hudCanvas.style.width = w + 'px';
      this.hudCanvas.style.height = h + 'px';
    }
    this.escalaLuz = this.qualidade > 0.67 ? 0.5 : 0.38;
    this.luz.width = Math.max(2, Math.round(w * this.escalaLuz));
    this.luz.height = Math.max(2, Math.round(h * this.escalaLuz));
    this.borr.width = Math.max(2, Math.round(this.luz.width / 5));
    this.borr.height = Math.max(2, Math.round(this.luz.height / 5));
    this.camadas = null;
    this._grade = null;
  }

  // =========================================================================
  // ASSAR
  // =========================================================================
  prepararFase(mundo, fase) {
    this.fase = fase;
    this.boneco.reiniciar();
    this.pal = PALETA[fase.hora] || PALETA.amanhecer;
    this.assarTerreno(mundo, fase);
    this.gerarTufos(mundo, fase);
    this.camadas = null;   // camadas de fundo dependem do tamanho da janela
  }

  /** Pinta a fase inteira uma vez. É aqui que mora o custo, e ele é pago uma vez. */
  assarTerreno(mundo, fase) {
    const m = 200;
    const w = fase.largura + m * 2, h = fase.altura + m * 2;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.translate(m, m);
    const luz = { x: fase.sol.x * 2 - 1, y: -0.7 };

    // sombra de contato debaixo de cada forma, antes das formas
    g.save();
    for (const f of mundo.terrenoInfo) {
      const a = f.aabb;
      g.globalAlpha = 0.28;
      g.fillStyle = '#0b1218';
      g.filter = 'blur(18px)';
      contornoVivo(g, f.p, 5, 0.01, 1);
      g.translate(10, 16); g.fill(); g.translate(-10, -16);
    }
    g.filter = 'none';
    g.restore();

    let i = 0;
    for (const f of mundo.terrenoInfo) pintarTerreno(g, f, this.pal, luz, i++);

    // decoração fixa: árvores e samambaias que não se mexem
    for (const d of fase.decoracao) {
      if (d.tipo === 'arvore') {
        arvore(g, d.x, d.y, d.alt, d.escala, d.x * 0.013, this.pal, 0);
      }
    }

    // grão geral, bem sutil
    g.globalAlpha = 1;
    grao(g, -m, -m, w, h, 0.045, 4);

    this.terreno = c;
    this.terrenoOff = m;
  }

  /** Distribui tufos de grama pelas arestas viradas para cima. */
  gerarTufos(mundo, fase) {
    const tufos = [];
    for (const f of mundo.terrenoInfo) {
      const p = f.p;
      for (let i = 0; i < p.length; i++) {
        const a = p[i], b = p[(i + 1) % p.length];
        const dx = b[0] - a[0], dy = b[1] - a[1];
        const comp = Math.hypot(dx, dy);
        if (comp < 30) continue;
        const nx = dy / comp, ny = -dx / comp;
        if (ny > -0.5) continue;
        const n = Math.max(1, Math.round(comp / 44));
        for (let k = 0; k < n; k++) {
          const t = (k + 0.5) / n;
          const x = a[0] + dx * t, y = a[1] + dy * t;
          const esp = 9 + fbm(x * 0.03, y * 0.03, 3) * 18;
          tufos.push({
            x: x + nx * esp * (f.musgo ?? 0.6),
            y: y + ny * esp * (f.musgo ?? 0.6),
            e: 0.7 + Math.abs(fbm(x * 0.05, y * 0.05, 2)) * 1.1,
            s: (x * 7.3 + y * 3.1) % 100,
            empurrao: 0,
          });
        }
      }
    }
    this.tufos = tufos;
  }

  /** Camadas largas de fundo, pintadas uma vez por tamanho de janela. */
  assarCamadas() {
    const w = Math.ceil(this.w * 1.6), h = this.h;
    const p = this.pal;
    const nova = () => {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      return c;
    };

    // céu
    const ceu = nova();
    {
      const g = ceu.getContext('2d');
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, p.ceuAlto);
      gr.addColorStop(0.42, p.ceuMedio);
      gr.addColorStop(0.78, p.ceuBaixo);
      gr.addColorStop(1, p.ceuHorizonte);
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      // sol com halo
      const sx = w * this.fase.sol.x, sy = h * this.fase.sol.y;
      const halo = g.createRadialGradient(sx, sy, 0, sx, sy, h * 0.52);
      halo.addColorStop(0, comAlfa(p.solHalo, 0.85));
      halo.addColorStop(0.12, comAlfa(p.solHalo, 0.42));
      halo.addColorStop(0.42, comAlfa(p.solHalo, 0.12));
      halo.addColorStop(1, comAlfa(p.solHalo, 0));
      g.fillStyle = halo;
      g.fillRect(0, 0, w, h);
      const disco = g.createRadialGradient(sx, sy, 0, sx, sy, h * 0.062);
      disco.addColorStop(0, '#fffaea');
      disco.addColorStop(0.34, p.sol);
      disco.addColorStop(0.68, comAlfa(p.solHalo, 0.75));
      disco.addColorStop(1, comAlfa(p.solHalo, 0));
      g.fillStyle = disco;
      g.beginPath(); g.arc(sx, sy, h * 0.062, 0, TAU); g.fill();
      // nuvens macias
      for (let i = 0; i < 9; i++) {
        const cx = ((i * 0.37 + 0.1) % 1) * w;
        const cy = h * (0.1 + ((i * 0.23) % 1) * 0.34);
        g.globalAlpha = 0.16 + (i % 3) * 0.05;
        g.fillStyle = i % 2 ? p.ceuHorizonte : '#ffffff';
        for (let k = 0; k < 4; k++) {
          mancha(g, cx + k * 44 - 66, cy + Math.sin(i + k) * 9, 54 + (k % 3) * 22, i * 3 + k, 0.36, 0.3);
          g.fill();
        }
      }
      g.globalAlpha = 1;
    }

    // morros distantes
    const morros = nova();
    {
      const g = morros.getContext('2d');
      const faixas = [
        { cor: p.morroLonge, base: h * 0.70, amp: h * 0.10, freq: 0.0016, nevoa: 0.62 },
        { cor: p.morroMeio, base: h * 0.79, amp: h * 0.08, freq: 0.0026, nevoa: 0.4 },
      ];
      for (const f of faixas) {
        g.fillStyle = nevoar(f.cor, p.ceuBaixo, f.nevoa);
        g.beginPath();
        g.moveTo(0, h);
        g.lineTo(0, f.base);
        for (let x = 0; x <= w; x += 14) {
          g.lineTo(x, f.base - Math.sin(x * f.freq) * f.amp - Math.sin(x * f.freq * 2.7 + 1) * f.amp * 0.4);
        }
        g.lineTo(w, h);
        g.closePath(); g.fill();
      }
    }

    // mata distante, em duas fileiras: a de trás menor, mais alta na tela e
    // mais lavada pela névoa; a da frente maior e mais saturada. Uma fileira só
    // dava uma parede de brócolis — é a diferença entre as duas que o olho lê
    // como "tem floresta continuando lá atrás".
    const mata = nova();
    {
      const g = mata.getContext('2d');
      const base = h * 0.88;
      for (let i = 0; i < 22; i++) {
        const x = (i / 22) * w + ((i * 211) % 90) - 30;
        const alt = h * (0.13 + ((i * 0.43) % 1) * 0.13);
        arvore(g, x, base - h * 0.06, alt, 0.42 + ((i * 0.29) % 1) * 0.2, i * 2.3 + 11,
          this.pal, 0.66);
      }
      for (let i = 0; i < 26; i++) {
        const x = (i / 26) * w + ((i * 137) % 60);
        const alt = h * (0.17 + ((i * 0.37) % 1) * 0.22);
        arvore(g, x, base + 30, alt, 0.6 + ((i * 0.19) % 1) * 0.34, i * 1.7,
          this.pal, 0.4);
      }
      // névoa densa no pé da mata: sem ela os troncos continuavam descendo
      // como postes cinzentos por baixo do chão da fase
      const nv = g.createLinearGradient(0, base - h * 0.10, 0, base + h * 0.10);
      nv.addColorStop(0, comAlfa(nevoar(p.mataLonge, p.ceuBaixo, 0.55), 0));
      nv.addColorStop(0.5, comAlfa(nevoar(p.mataLonge, p.ceuBaixo, 0.42), 0.92));
      nv.addColorStop(1, '#2a3a32');     // chão de mata no fundo: escuro, não claro
      g.fillStyle = nv;
      g.fillRect(0, base - h * 0.10, w, h);
    }

    // frente: folhagem escura e desfocada
    // Camada da frente: folhagem desfocada AGARRADA às bordas de cima e de
    // baixo. Antes as manchas entravam 160 px pela tela e ficavam boiando no
    // meio do cenário como borrões — moldura vira sujeira quando invade a área
    // de jogo. Agora o miolo fica sempre limpo.
    const frente = nova();
    {
      const g = frente.getContext('2d');
      g.filter = 'blur(9px)';
      for (const [borda, sentido] of [[-22, 1], [h + 22, -1]]) {
        for (let i = 0; i < 9; i++) {
          const x = (i / 8) * w + ((i * 97) % 70);
          g.fillStyle = comAlfa(p.frente, sentido > 0 ? 0.92 : 0.8);
          for (let k = 0; k < 3; k++) {
            const dy = sentido * (16 + k * 20);
            mancha(g, x + k * 46 - 60, borda + dy, 60 + k * 16, i * 5 + k, 0.42, 0.36);
            g.fill();
          }
        }
      }
      g.filter = 'none';
    }

    this.camadas = { ceu, morros, mata, frente, w, h };
  }

  // =========================================================================
  // QUADRO
  // =========================================================================
  desenhar(mundo, cam, dt, opcoes) {
    const ctx = this.ctx;
    this.t += dt;
    this.boneco.atualizar(dt, mundo.bolota, mundo);
    if (!this.camadas) this.assarCamadas();
    const p = this.pal;
    const C = this.camadas;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;

    // --- fundo em parallaxe --------------------------------------------------
    const px = cam.ox, py = cam.oy;
    const desl = (fator, canvas) => {
      const dx = -(px * fator) % C.w;
      const dy = clamp(-(py - this.fase.altura * 0.5) * fator * 0.35, -this.h * 0.25, this.h * 0.25);
      ctx.drawImage(canvas, dx, dy, C.w, C.h);
      ctx.drawImage(canvas, dx + C.w, dy, C.w, C.h);
      if (dx > 0) ctx.drawImage(canvas, dx - C.w, dy, C.w, C.h);
    };
    desl(0.04, C.ceu);
    desl(0.12, C.morros);
    desl(0.26, C.mata);

    // --- mundo ----------------------------------------------------------------
    ctx.save();
    cam.aplicar(ctx, this.w, this.h);

    // o riacho vai ANTES do terreno: o barranco assado o recorta sozinho, e é
    // por isso que ele só aparece nas frestas entre as pedras
    if (this.fase.agua) this.desenharAgua(ctx, cam);

    // terreno assado
    ctx.drawImage(this.terreno, -this.terrenoOff, -this.terrenoOff);

    this.desenharTufos(ctx, cam, mundo);
    this.desenharMarcas(ctx, mundo);
    this.desenharBrotos(ctx, mundo);
    this.desenharOrvalho(ctx, mundo);
    this.desenharMeta(ctx, mundo);
    this.desenharSamambaias(ctx, mundo);

    if (opcoes.mira && !mundo.venceu) this.desenharMira(ctx, mundo, opcoes);

    this.boneco.desenhar(ctx, mundo.bolota, this.pal, mundo);

    // partículas e o que mais o jogo quiser, ainda em coordenadas de mundo
    if (opcoes.extra) opcoes.extra(ctx);

    ctx.restore();

    // --- luz: raios de sol e brilhos ------------------------------------------
    this.pintarLuz(mundo, cam);
    this.aplicarBloom(ctx);

    // --- frente ----------------------------------------------------------------
    if (this.qualidade > 0.34) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    const fdx = -(px * 1.25) % C.w;
    ctx.drawImage(C.frente, fdx, 0, C.w, C.h);
    ctx.drawImage(C.frente, fdx + C.w, 0, C.w, C.h);
    if (fdx > 0) ctx.drawImage(C.frente, fdx - C.w, 0, C.w, C.h);
    ctx.restore();
    }

    if (this.pos.ok) {
      const q = this.qualidade;
      const feito = this.pos.render(this.canvas, {
        tempo: this.t,
        bloom: q > 0.1 ? this.brilho : 0,
        forcaBloom: 0.55,
        limiar: 0.78,
        exposicao: 0.90,
        contraste: 1.16,
        vinheta: 0.45,
        grao: q > 0.34 ? 0.028 : 0,
        aberracao: q > 0.34 ? 0.006 : 0,
        saturacao: 1.10,
        sombraCor: [0.84, 0.93, 1.13],
        luzCor: [1.12, 1.02, 0.86],
      });
      if (!feito) this.acabamento(ctx);   // WebGL caiu: volta para o 2D
    } else {
      this.acabamento(ctx);
    }
  }

  /**
   * O riacho. Três camadas: fundo escuro, um reflexo do céu que vem de cima, e
   * a superfície — faixas claras que deslizam em velocidades diferentes. É a
   * diferença de velocidade entre as faixas que o olho lê como água correndo;
   * uma faixa só, por mais bonita, parece um piso de vidro.
   */
  desenharAgua(ctx, cam) {
    const a = this.fase.agua;
    const p = this.pal;
    const x0 = cam.ox - this.w / (2 * cam.zoom) - 60;
    const larg = this.w / cam.zoom + 120;
    const fundo = this.fase.altura + 200;

    const g = ctx.createLinearGradient(0, a.y - 30, 0, fundo);
    g.addColorStop(0, comAlfa(p.ceuHorizonte, 0.55));
    g.addColorStop(0.10, a.cor);
    g.addColorStop(1, a.fundo);
    ctx.fillStyle = g;
    ctx.fillRect(x0, a.y, larg, fundo - a.y);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, a.y - 26, larg, fundo - a.y + 26);
    ctx.clip();

    // ondulação da superfície
    for (let k = 0; k < 3; k++) {
      const vel = 26 + k * 34;
      const amp = 3.2 - k * 0.7;
      const yy = a.y + k * 5;
      ctx.beginPath();
      ctx.moveTo(x0, fundo);
      for (let x = x0; x <= x0 + larg; x += 12) {
        const o = Math.sin((x + this.t * vel) * 0.021 + k * 2.1) * amp
          + Math.sin((x - this.t * vel * 0.6) * 0.009 + k) * amp * 0.8;
        ctx.lineTo(x, yy + o);
      }
      ctx.lineTo(x0 + larg, fundo);
      ctx.closePath();
      ctx.fillStyle = comAlfa(k === 0 ? p.ceuHorizonte : a.cor, k === 0 ? 0.30 : 0.22);
      ctx.fill();
    }

    // brilhos que correm na superfície
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) {
      const bx = x0 + ((i * 137.7 + this.t * 42) % larg);
      const by = a.y + 4 + ((i * 53) % 26);
      const w = 12 + ((i * 31) % 26);
      const al = 0.10 + Math.abs(Math.sin(this.t * 1.3 + i)) * 0.16;
      ctx.fillStyle = comAlfa(p.luzBorda, al);
      ctx.fillRect(bx, by, w, 1.6);
    }
    ctx.restore();

    // linha de superfície, mais clara do lado do sol
    ctx.strokeStyle = comAlfa(p.luzBorda, 0.5);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let x = x0; x <= x0 + larg; x += 10) {
      const o = Math.sin((x + this.t * 26) * 0.021) * 3.2;
      if (x === x0) ctx.moveTo(x, a.y + o); else ctx.lineTo(x, a.y + o);
    }
    ctx.stroke();
  }

  /**
   * Poeira de pólen em suspensão. Vive em coordenadas de mundo e dá a volta em
   * torno da câmera, então nunca acaba e nunca aparece do nada. Vai na tela de
   * luz para que o bloom a pegue: é o que faz o ar parecer ter matéria.
   */
  desenharPoeira(g, cam) {
    const lw = this.w / cam.zoom, lh = this.h / cam.zoom;
    const ox = cam.ox - lw / 2, oy = cam.oy - lh / 2;
    if (!this.poeira) {
      this.poeira = [];
      for (let i = 0; i < 70; i++) {
        this.poeira.push({
          x: ox + Math.random() * lw, y: oy + Math.random() * lh,
          r: 0.7 + Math.random() * 1.8,
          v: 5 + Math.random() * 16,
          f: Math.random() * TAU,
        });
      }
    }
    for (const d of this.poeira) {
      // sobe devagar; quando sai de vista, reaparece do outro lado. Como as
      // posições são de MUNDO, a poeira fica para trás quando a câmera anda —
      // se fossem de tela, os pontinhos pareceriam colados no monitor.
      d.y -= d.v * (1 / 60);
      if (d.y < oy - 20) { d.y = oy + lh + 10; d.x = ox + Math.random() * lw; }
      if (d.x < ox - 30) d.x += lw + 60;
      else if (d.x > ox + lw + 30) d.x -= lw + 60;
      const wx = d.x + Math.sin(this.t * 0.5 + d.f) * 12;
      const s = cam.paraTela(wx, d.y, this.w, this.h);
      if (s.x < -8 || s.y < -8 || s.x > this.w + 8 || s.y > this.h + 8) continue;
      // mais discreta no céu, mais viva perto do chão e dentro dos raios
      const fundo = clamp(s.y / this.h, 0, 1);
      const al = (0.05 + fundo * 0.16) * (0.55 + Math.abs(Math.sin(this.t * 1.6 + d.f)) * 0.65);
      g.fillStyle = comAlfa(this.pal.luzBorda, al);
      g.beginPath();
      g.arc(s.x, s.y, d.r, 0, TAU);
      g.fill();
    }
  }

  desenharTufos(ctx, cam, mundo) {
    const hw = this.w / (2 * cam.zoom) + 90, hh = this.h / (2 * cam.zoom) + 90;
    const bx = mundo.bolota.corpo.x, by = mundo.bolota.corpo.y;
    const vento = Math.sin(this.t * 0.7) * 0.12 + Math.sin(this.t * 1.9) * 0.05;
    for (const t of this.tufos) {
      if (Math.abs(t.x - cam.ox) > hw || Math.abs(t.y - cam.oy) > hh) continue;
      const d = Math.hypot(t.x - bx, t.y - by);
      const alvo = d < 90 ? clamp((90 - d) / 90, 0, 1) * Math.sign(t.x - bx) * 0.9 : 0;
      t.empurrao = damp(t.empurrao, alvo, 9, 1 / 60);
      tufo(ctx, t.x, t.y, t.e, t.s, this.pal, vento, t.empurrao);
    }
  }

  desenharSamambaias(ctx, mundo) {
    const vento = Math.sin(this.t * 0.6) * 0.1;
    for (const d of this.fase.decoracao) {
      if (d.tipo === 'samambaia') samambaia(ctx, d.x, d.y, d.escala, d.x * 0.02, this.pal, vento);
      else if (d.tipo === 'pedrinha') {
        ctx.fillStyle = this.pal.pedraClara;
        mancha(ctx, d.x, d.y, 13 * d.escala, d.x * 0.1, 0.6, 0.3);
        ctx.fill();
        ctx.fillStyle = comAlfa(this.pal.musgo, 0.7);
        mancha(ctx, d.x - 3, d.y - 5 * d.escala, 9 * d.escala, d.x * 0.2, 0.5, 0.4);
        ctx.fill();
      }
    }
  }

  /** As florzinhas que nascem onde a Bolota pousou. */
  desenharMarcas(ctx, mundo) {
    for (const m of mundo.marcas) {
      const a = easeOutCubic(clamp(m.t, 0, 1));
      const n = m.grande ? 5 : 3;
      for (let i = 0; i < n; i++) {
        const ang = ((m.semente + i * 71) % 100) / 100 * TAU;
        const r = (11 + ((m.semente + i * 37) % 17)) * (m.grande ? 1.5 : 1);
        const fx = m.x + Math.cos(ang) * r;
        const fy = m.y + Math.sin(ang) * r * 0.35;
        const cores = ['#ffd9e6', '#fff1b8', '#d8f0ff', '#ffc9de'];
        florzinha(ctx, fx, fy, (4 + ((m.semente + i) % 4)) * a,
          cores[(m.semente + i) % cores.length], '#ffe9a0', a, ang);
      }
      ctx.globalAlpha = a * 0.5;
      ctx.fillStyle = comAlfa(this.pal.musgoClaro, 0.7);
      mancha(ctx, m.x, m.y, 15 * a, m.semente, 0.35, 0.4);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  desenharBrotos(ctx, mundo) {
    for (const b of mundo.brotos) {
      if (!b.aberto) {
        // adormecido: um botão fechado com um leve pulso
        const pulso = 0.9 + Math.sin(this.t * 2.2 + b.id) * 0.1;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.fillStyle = comAlfa(this.pal.musgoEscuro, 0.95);
        mancha(ctx, 0, 6, 15 * pulso, b.id * 3, 0.7, 0.25);
        ctx.fill();
        ctx.fillStyle = this.pal.musgo;
        mancha(ctx, 0, -2, 11 * pulso, b.id * 5, 0.85, 0.3);
        ctx.fill();
        ctx.fillStyle = comAlfa(this.pal.folhaLuz, 0.9);
        mancha(ctx, -2, -7, 6 * pulso, b.id * 7, 0.9, 0.3);
        ctx.fill();
        ctx.restore();
      } else if (b.tipo === 'folha') {
        this.desenharFolha(ctx, b);
      } else if (b.tipo === 'mola') {
        const comp = clamp(b.t * 2.4, 0, 1);
        cogumelo(ctx, b.x, b.y + 30, 130, 46, comp, this.pal, b.id);
      }
    }
  }

  /** A folha-plataforma se desenrola: cresce da direita para a esquerda. */
  desenharFolha(ctx, b) {
    const k = easeOutCubic(clamp(b.t * 1.9, 0, 1));
    const larg = (b.larg || 210) * k;
    const x0 = b.x + (b.larg || 210) / 2;
    ctx.save();
    ctx.translate(x0, b.y + 12);
    // caule
    ctx.strokeStyle = this.pal.musgoEscuro;
    ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.quadraticCurveTo(-larg * 0.5, -6, -larg, 4);
    ctx.stroke();
    // lâmina
    const g = ctx.createLinearGradient(0, -22, 0, 22);
    g.addColorStop(0, this.pal.folhaLuz);
    g.addColorStop(0.55, this.pal.folhaClara);
    g.addColorStop(1, this.pal.folhaEscura);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.quadraticCurveTo(-larg * 0.45, -30, -larg, 2);
    ctx.quadraticCurveTo(-larg * 0.45, 26, 0, 4);
    ctx.closePath();
    ctx.fill();
    // nervuras
    ctx.strokeStyle = comAlfa(this.pal.musgoEscuro, 0.4);
    ctx.lineWidth = 1.6;
    for (let i = 1; i < 7; i++) {
      const t = i / 7;
      ctx.beginPath();
      ctx.moveTo(-larg * t, lerp(4, 2, t));
      ctx.lineTo(-larg * t + larg * 0.09, lerp(4, 2, t) - 16 * Math.sin(t * Math.PI));
      ctx.stroke();
    }
    ctx.restore();
  }

  desenharOrvalho(ctx, mundo) {
    for (const o of mundo.orvalho) {
      if (o.pego) continue;
      const flut = Math.sin(this.t * 1.8 + o.t) * 5;
      const r = 13 + Math.sin(this.t * 3 + o.t) * 1.2;
      ctx.save();
      ctx.translate(o.x, o.y + flut);
      const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, 1, 0, 0, r);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.5, this.pal.orvalho);
      g.addColorStop(1, comAlfa(this.pal.orvalho, 0.35));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.35);
      ctx.quadraticCurveTo(r, -r * 0.2, 0, r);
      ctx.quadraticCurveTo(-r, -r * 0.2, 0, -r * 1.35);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.3, r * 0.2, r * 0.3, -0.5, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  desenharMeta(ctx, mundo) {
    const m = mundo.meta;
    const pulso = 1 + Math.sin(this.t * 1.5) * 0.05;
    ctx.save();
    ctx.translate(m.x, m.y);
    // um ninho de raízes que espera a Bolota
    ctx.strokeStyle = this.pal.tronco;
    ctx.lineWidth = 8; ctx.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + (i / 6) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 46, Math.sin(a) * 20 + 24);
      ctx.quadraticCurveTo(Math.cos(a) * 30, -18, Math.cos(a) * 12, -34);
      ctx.stroke();
    }
    ctx.fillStyle = comAlfa(this.pal.musgo, 0.9);
    mancha(ctx, 0, 20, 46, 3, 0.42, 0.22);
    ctx.fill();
    // pétalas da flor-meta
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a = (TAU * i) / n + this.t * 0.14;
      ctx.save();
      ctx.rotate(a);
      const g = ctx.createLinearGradient(0, 0, 0, -46 * pulso);
      g.addColorStop(0, '#ffd98a');
      g.addColorStop(1, '#fff6de');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, -30 * pulso, 13, 30 * pulso, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#ffb44e';
    ctx.beginPath(); ctx.arc(0, 0, 17 * pulso, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff0c0';
    ctx.beginPath(); ctx.arc(-4, -4, 7, 0, TAU); ctx.fill();
    ctx.restore();
  }

  desenharMira(ctx, mundo, opcoes) {
    const b = mundo.bolota;
    if (b.estado !== 'carregando') return;
    const pts = b.previsao(mundo);
    ctx.save();
    for (let i = 0; i < pts.length; i += 2) {
      const t = i / pts.length;
      const r = lerp(6, 2.2, t);
      ctx.globalAlpha = (1 - t) * 0.8 * (0.5 + b.carga * 0.5);
      ctx.fillStyle = i % 8 === 0 ? '#fff6d8' : this.pal.luzQuente;
      ctx.beginPath(); ctx.arc(pts[i], pts[i + 1], r, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // =========================================================================
  pintarLuz(mundo, cam) {
    const g = this.luzCtx;
    const s = this.escalaLuz;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, this.luz.width, this.luz.height);
    g.save();
    g.scale(s, s);
    g.globalCompositeOperation = 'lighter';

    // raios de sol atravessando a copa
    const sx = this.w * this.fase.sol.x, sy = this.h * this.fase.sol.y * 0.4;
    const nRaios = this.qualidade > 0.67 ? 7 : this.qualidade > 0.34 ? 4 : 0;
    for (let i = 0; i < nRaios; i++) {
      const fase = i * 1.7;
      const larg = 58 + Math.sin(this.t * 0.3 + fase) * 26 + i * 16;
      const desloc = (i - 3) * 130 + Math.sin(this.t * 0.17 + fase) * 40;
      const alfa = 0.032 + Math.abs(Math.sin(this.t * 0.24 + fase)) * 0.036;
      const grad = g.createLinearGradient(sx, sy, sx + desloc - 260, this.h + 120);
      grad.addColorStop(0, comAlfa(this.pal.luzQuente, alfa * 1.5));
      grad.addColorStop(0.55, comAlfa(this.pal.luzQuente, alfa * 0.6));
      grad.addColorStop(1, comAlfa(this.pal.luzQuente, 0));
      g.fillStyle = grad;
      g.beginPath();
      g.moveTo(sx - larg * 0.2, sy);
      g.lineTo(sx + larg * 0.2, sy);
      g.lineTo(sx + desloc + larg, this.h + 140);
      g.lineTo(sx + desloc - larg, this.h + 140);
      g.closePath();
      g.fill();
    }

    // brilho das gotas e da meta, em espaço de tela
    const brilhar = (wx, wy, raio, cor, forca) => {
      const p = cam.paraTela(wx, wy, this.w, this.h);
      if (p.x < -raio || p.y < -raio || p.x > this.w + raio || p.y > this.h + raio) return;
      const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, raio);
      gr.addColorStop(0, comAlfa(cor, 0.85 * forca));
      gr.addColorStop(0.4, comAlfa(cor, 0.3 * forca));
      gr.addColorStop(1, comAlfa(cor, 0));
      g.fillStyle = gr;
      g.beginPath(); g.arc(p.x, p.y, raio, 0, TAU); g.fill();
    };
    for (const o of mundo.orvalho) {
      if (!o.pego) brilhar(o.x, o.y, 52 * cam.zoom, this.pal.orvalho, 0.7);
    }
    brilhar(mundo.meta.x, mundo.meta.y, 120 * cam.zoom, '#ffd98a', 0.42);
    const b = mundo.bolota;
    if (b.estado === 'carregando') {
      // discreto de propósito: com o brilho antigo a Bolota sumia dentro da
      // própria luz justo no momento em que o jogador está mirando nela
      brilhar(b.corpo.x, b.corpo.y, (34 + b.carga * 46) * cam.zoom,
        this.pal.luzQuente, 0.16 + b.carga * 0.22);
    }
    for (const br of mundo.brotos) {
      if (br.aberto && br.t < 1.4) {
        brilhar(br.x, br.y, 130 * cam.zoom * (1 - br.t / 1.4), '#c8ff9a', 0.4 * (1 - br.t / 1.4));
      }
    }
    if (this.qualidade > 0.34) this.desenharPoeira(g, cam);

    if (mundo.venceu) {
      // Forte o bastante para ser uma comemoração, fraco o bastante para ainda
      // se ver a flor e a Bolota: a primeira versão estourava a tela inteira em
      // branco justo no momento que o jogador quer olhar.
      brilhar(mundo.meta.x, mundo.meta.y,
        (150 + Math.sin(this.t * 3) * 22) * cam.zoom, '#fff0c0', 0.55);
    }
    g.restore();
  }

  aplicarBloom(ctx) {
    const forca = this.brilho;
    const g = this.luzCtx;
    if (this.pos.ok) {
      // O halo vem do shader, a partir do brilho real da imagem: borrar aqui
      // seria pagar duas vezes por um resultado pior.
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(this.luz, 0, 0, this.w, this.h);
      ctx.restore();
      return;
    }
    if (forca > 0.02) {
      const b = this.borrCtx;
      b.setTransform(1, 0, 0, 1, 0, 0);
      b.clearRect(0, 0, this.borr.width, this.borr.height);
      b.imageSmoothingEnabled = true;
      // Sem filter:'blur' de propósito. Reduzir para 1/10 e voltar com
      // interpolação bilinear já é um borrão gaussiano barato; o blur do canvas
      // custava 7 ms por quadro em rasterização por software, sozinho mais que
      // todo o resto do bloom, e a diferença na tela não aparece.
      b.drawImage(this.luz, 0, 0, this.borr.width, this.borr.height);
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'lighter';
      if (this.qualidade > 0.67) {
        g.globalAlpha = 0.62 * forca;
        g.drawImage(this.borr, 0, 0, this.luz.width, this.luz.height);
        const e = 0.1;
        g.globalAlpha = 0.34 * forca;
        g.drawImage(this.borr, -this.luz.width * e / 2, -this.luz.height * e / 2,
          this.luz.width * (1 + e), this.luz.height * (1 + e));
      } else {
        g.globalAlpha = 0.8 * forca;
        g.drawImage(this.borr, 0, 0, this.luz.width, this.luz.height);
      }
      g.restore();
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 1;
    ctx.drawImage(this.luz, 0, 0, this.w, this.h);
    ctx.restore();
  }

  /**
   * Acabamento: gradação de cor (sombra para o azul, luz para o âmbar) e
   * vinheta, numa passada só.
   *
   * Antes eram três varreduras de tela cheia — multiply, overlay e a vinheta
   * por cima. Como multiplicar é associativo, dá para assar as três numa única
   * imagem opaca e multiplicar o quadro por ela uma vez. Mesmo resultado, um
   * terço do custo de preenchimento.
   */
  acabamento(ctx) {
    if (!this._grade || this._gw !== this.w || this._gh !== this.h) {
      const c = document.createElement('canvas');
      c.width = this.w; c.height = this.h;
      const g = c.getContext('2d');
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, this.w, this.h);

      const lin = g.createLinearGradient(0, 0, 0, this.h);
      lin.addColorStop(0, '#c6dcff');      // sombra fria em cima
      lin.addColorStop(0.55, '#ffe8c8');
      lin.addColorStop(1, '#ffcf9a');      // calor do chão
      g.globalCompositeOperation = 'multiply';
      g.globalAlpha = 0.17;
      g.fillStyle = lin;
      g.fillRect(0, 0, this.w, this.h);

      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
      const gr = g.createRadialGradient(
        this.w / 2, this.h * 0.48, Math.min(this.w, this.h) * 0.34,
        this.w / 2, this.h * 0.5, Math.max(this.w, this.h) * 0.78);
      gr.addColorStop(0, 'rgba(0,0,0,0)');
      gr.addColorStop(1, 'rgba(14,20,28,0.5)');
      g.fillStyle = gr;
      g.fillRect(0, 0, this.w, this.h);

      this._grade = c; this._gw = this.w; this._gh = this.h;
    }
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 1;
    ctx.drawImage(this._grade, 0, 0);
    ctx.restore();
  }
}
