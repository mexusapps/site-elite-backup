// ---------------------------------------------------------------------------
// main.js — a casca: laço de passo fixo, telas, persistência e a API que o
// harness de teste usa para jogar sozinho.
//
// A simulação roda a 60 Hz exatos, independente do monitor. Física de pilha
// depende disso: com passo variável a mesma jogada dá resultados diferentes em
// cada máquina, e aí não existe teste possível.
// ---------------------------------------------------------------------------

import { Jogo, FASE } from './game/game.js';
import { FRUTAS, MAX_TIER, CESTA, MODOS } from './game/fruits.js';
import { Renderer, PALETAS, desenharFruta, limparSprites } from './render/draw.js';
import { Hud } from './ui/hud.js';
import { Telas } from './ui/screens.js';
import { Input } from './core/input.js';
import { audio } from './core/audio.js';
import { Particulas, Textos, Tremor, P_GOTA } from './core/fx.js';
import { carregar, gravar, apagar } from './core/save.js';
import { clamp, lerp, TAU } from './core/math.js';

const DT = 1 / 60;
const MODO = { MENU: 'menu', JOGO: 'jogo', PAUSA: 'pausa', RESULTADO: 'resultado' };

class App {
  constructor() {
    this.canvas = document.getElementById('jogo');
    this.uiRoot = document.getElementById('ui');
    this.render = new Renderer(this.canvas);
    this.input = new Input(this.canvas);
    this.hud = new Hud();
    this.particulas = new Particulas(1200);
    this.textos = new Textos(70);
    this.tremor = new Tremor();
    this.audio = audio;

    this.dados = carregar();
    this.opcoes = this.dados.opcoes;

    this.jogo = new Jogo();
    this.ligarEventos();

    this.telas = new Telas(this.uiRoot, this);
    this.modo = MODO.MENU;
    this.telaAnterior = 'titulo';
    this.acumulador = 0;
    this.ultimo = 0;
    this.erros = [];
    this.modoTeste = false;
    this.fps = 60;

    this.aplicarOpcoes();
    this.redimensionar();
    window.addEventListener('resize', () => this.redimensionar());

    const acordar = () => this.audio.retomar();
    window.addEventListener('pointerdown', acordar);
    window.addEventListener('keydown', acordar);
    window.addEventListener('error', (e) => this.erros.push(String(e.message || e.error)));
    window.addEventListener('unhandledrejection', (e) => this.erros.push('promise: ' + e.reason));

    this.canvas.addEventListener('pointerdown', (e) => {
      const r = this.canvas.getBoundingClientRect();
      const id = this.hud.botaoEm(e.clientX - r.left, e.clientY - r.top);
      if (id) {
        this.botaoHud = id;
        this.input.apertado = false;      // não conta como mira
      }
    });

    this.jogo.comecar(this.novaSeed(), 'pomar');
    this.telas.mostrar('titulo');
    this.laco = this.laco.bind(this);
    requestAnimationFrame(this.laco);
  }

  novaSeed() { return (Math.random() * 0xffffffff) >>> 0; }

  // ==========================================================================
  ligarEventos() {
    const j = this.jogo;
    j.eventos.fusao = (e) => this.aoFundir(e);
    j.eventos.baque = (e) => this.aoBater(e);
    j.eventos.soltar = (e) => this.audio.tocar('soltar');
    j.eventos.tucano = () => this.audio.tocar('tucano');
    j.eventos.bolo = (e) => this.aoBolo(e);
    j.eventos.pedido = (e) => this.aoPedido(e);
    j.eventos.regar = (e) => this.aoRegar(e);
    j.eventos.descoberta = (e) => this.aoDescobrir(e);
    j.eventos.chacoalhar = () => { this.audio.tocar('chacoalhar'); this.tremor.bater(0.5); };
    j.eventos.ganhouRegador = () => this.textos.add(this.px(CESTA.w / 2), this.py(120), '+1 regador!', '#3f8f4a', 24, true);
  }

  px(x) { const L = this.L; return L ? L.x + x * L.e : x; }
  py(y) { const L = this.L; return L ? L.y + y * L.e : y; }

  aoFundir(e) {
    const f = FRUTAS[e.tier];
    const x = this.px(e.x), y = this.py(e.y);
    const escala = this.L ? this.L.e : 1;
    this.audio.tocar('fusao', { tier: e.tier, combo: e.combo });
    if (this.opcoes.brilhos > 0.02) {
      const k = this.opcoes.brilhos;
      this.particulas.esguicho(x, y, Math.round(8 + e.tier * 1.6) * k, f.cor2, 240 * escala, 0.6, 4 * escala);
      this.particulas.estrelas(x, y, Math.round(4 + e.tier) * k, '#fff6cf', 170 * escala, 0.7, 7 * escala);
      this.particulas.anel(x, y, f.r * 0.6 * escala, f.r * 2.4 * escala, f.cor2, 0.45);
    }
    this.textos.add(x, y - f.r * escala * 0.6, '+' + e.pontos,
      e.combo > 1 ? '#e0632a' : '#3f8f4a', (16 + e.tier * 1.5), e.combo > 2);
    this.tremor.bater(0.06 + e.tier * 0.022);
    if (e.corpo) { e.corpo.squash = 1.5; e.corpo.impact = 1; }
  }

  aoBater(e) {
    this.audio.tocar('baque', { forca: e.forca, tier: e.corpo ? e.corpo.tier : 0 });
    if (e.forca > 0.28 && this.opcoes.brilhos > 0.02) {
      this.particulas.poeira(this.px(e.x), this.py(e.y + (e.corpo ? e.corpo.r * 0.6 : 0)),
        2, '#d8b98a', 0.4, 6 * (this.L ? this.L.e : 1));
    }
    if (e.corpo) { e.corpo.squash = 1 + e.forca * 0.3; e.corpo.impact = e.forca; }
    if (e.forca > 0.5) this.tremor.bater(e.forca * 0.1);
  }

  aoBolo(e) {
    this.audio.tocar('bolo');
    const x = this.px(e.x), y = this.py(e.y);
    const k = this.opcoes.brilhos;
    if (k > 0.02) this.particulas.confete(x, y, Math.round(90 * k), ['#ff6b8a', '#ffd166', '#6be0a8', '#7fc8ff', '#ff9f5e', '#c88cff']);
    if (k > 0.02) this.particulas.anel(x, y, 20, 460, '#ffd166', 0.9);
    this.textos.add(x, y - 40, '+' + e.pontos, '#e0632a', 34, true);
    this.tremor.bater(0.7);
  }

  aoPedido(e) {
    this.audio.tocar('pedido');
    const x = this.px(e.x), y = this.py(e.y);
    const k = this.opcoes.brilhos;
    if (k > 0.02) this.particulas.confete(x, y, Math.round(34 * k), ['#ff6b8a', '#ffd166', '#6be0a8', '#7fc8ff']);
    this.textos.add(x, y - 30, '+500', '#e0632a', 24, true);
    this.tremor.bater(0.18);
    this.dados.marcas.pedidos++;
  }

  aoRegar(e) {
    this.audio.tocar('regar');
    const x = this.px(e.x), y = this.py(e.y);
    if (this.opcoes.brilhos > 0.02) {
      this.particulas.estrelas(x, y, 16, '#a8e6ff', 190, 0.9, 8);
      this.particulas.anel(x, y, 10, 150, '#7fd4ff', 0.6);
    }
    this.textos.add(x, y - 30, 'cresceu!', '#2f8fd0', 20, true);
  }

  aoDescobrir(e) {
    const nova = !this.dados.album.includes(e.tier);
    if (nova) {
      this.dados.album.push(e.tier);
      this.dados.album.sort((a, b) => a - b);
      this.guardar();
    }
    if (!e.festeja) return;
    this.audio.tocar('descoberta');
    if (nova) {
      this.textos.add(this.px(CESTA.w / 2), this.py(150),
        'nova no álbum: ' + FRUTAS[e.tier].nome, '#8a5cc4', 22, true);
    }
  }

  // ==========================================================================
  redimensionar() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.render.redimensionar(Math.max(320, window.innerWidth), Math.max(400, window.innerHeight), dpr);
  }

  aplicarOpcoes() {
    const o = this.opcoes;
    this.audio.setVolumes({ master: o.master, musica: o.musica, efeitos: o.efeitos });
    this.tremor.escala = o.tremor;
    this.render.usarPaleta(o.paleta);
    document.documentElement.style.setProperty('--te', String(o.tamanhoTexto));
    document.documentElement.dataset.paleta = o.paleta;
    this.guardar();
  }

  definirOpcao(k, v) {
    this.opcoes[k] = v;
    this.aplicarOpcoes();
  }

  guardar() {
    this.dados.opcoes = this.opcoes;
    gravar(this.dados);
  }

  // ==========================================================================
  acao(a) {
    this.audio.retomar();
    this.audio.tocar('ui', { forte: a === 'jogar' || a === 'tranquilo' });
    switch (a) {
      case 'jogar': this.comecar('pomar'); break;
      case 'tranquilo': this.comecar('tranquilo'); break;
      case 'comojoga':
        this.telaAnterior = this.telas.atual;
        this.dados.viuComoJoga = true; this.guardar();
        this.telas.mostrar('comojoga'); break;
      case 'album': this.telaAnterior = this.telas.atual; this.telas.mostrar('album'); break;
      case 'opcoes': this.telaAnterior = this.telas.atual; this.telas.mostrar('opcoes'); break;
      case 'marcas': this.telaAnterior = this.telas.atual; this.telas.mostrar('marcas'); break;
      case 'voltar':
        if (this.telaAnterior === 'pausa') { this.modo = MODO.PAUSA; this.telas.mostrar('pausa'); }
        else this.telas.mostrar('titulo');
        this.telaAnterior = 'titulo';
        break;
      case 'continuar': this.modo = MODO.JOGO; this.telas.mostrar(null); break;
      case 'terminar': this.terminar(); break;
      case 'menu': this.modo = MODO.MENU; this.telas.mostrar('titulo'); break;
      case 'apagar':
        this.dados = apagar();
        this.opcoes = this.dados.opcoes;
        this.aplicarOpcoes();
        this.telas.sincronizar();
        break;
      default: break;
    }
  }

  comecar(modoId) {
    this.audio.retomar();
    this.jogo.comecar(this.novaSeed(), modoId);
    this.particulas.limpar();
    this.textos.limpar();
    this.hud.pontosMostrados = 0;
    this.dados.marcas.partidas++;
    this.guardar();
    this.modo = MODO.JOGO;
    this.telas.mostrar(null);
  }

  terminar() {
    const j = this.jogo, m = this.dados.marcas;
    m.melhorPontos = Math.max(m.melhorPontos || 0, j.pontos);
    m.melhorFruta = Math.max(m.melhorFruta ?? -1, j.maiorTier);
    m.fusoes += j.fusoes;
    m.bolos += j.bolos;
    m.tempo = (m.tempo || 0) + j.tempo;
    this.guardar();
    this.telas.renderResultado(j);
    this.modo = MODO.RESULTADO;
    this.telas.mostrar('resultado');
  }

  // ==========================================================================
  laco(agora) {
    requestAnimationFrame(this.laco);
    if (!this.ultimo) this.ultimo = agora;
    let dt = (agora - this.ultimo) / 1000;
    this.ultimo = agora;
    if (dt > 0.25) dt = 0.25;
    this.fps = this.fps * 0.92 + (1 / Math.max(dt, 1e-4)) * 0.08;

    if (!this.modoTeste) {
      this.acumulador += dt;
      let n = 0;
      while (this.acumulador >= DT && n < 5) { this.passo(DT); this.acumulador -= DT; n++; }
      if (n === 5) this.acumulador = 0;
    }
    this.desenhar(dt);
  }

  passo(dt) {
    const cmd = this.input.consumir();
    const nx = this.input.passo(dt);

    if (this.modo === MODO.JOGO) {
      if (cmd.pausa) { this.pausar(); return; }
      this.jogo.mover(nx * CESTA.w);
      if (this.botaoHud === 'chacoalhar') { this.jogo.chacoalhar(); this.botaoHud = null; }
      else if (this.botaoHud === 'regar') { this.jogo.regar(); this.botaoHud = null; }
      else if (cmd.soltar) this.bufferSoltar = 0.25;   // janela de perdão
      // Sem esta janela, o clique dado durante a recarga simplesmente sumia —
      // e para quem está aprendendo a jogar parece que o jogo ignorou o toque.
      if (this.bufferSoltar > 0) {
        this.bufferSoltar -= dt;
        if (this.jogo.soltar()) this.bufferSoltar = 0;
      }
      if (cmd.chacoalhar) this.jogo.chacoalhar();
      if (cmd.regar) this.jogo.regar();
      this.jogo.passo(dt);
      this.dados.marcas.tempo = (this.dados.marcas.tempo || 0);
    } else if (this.modo === MODO.PAUSA) {
      if (cmd.pausa) this.acao('continuar');
    }
    this.botaoHud = null;
    this.particulas.passo(dt);
    this.textos.passo(dt);
    this.tremor.passo(dt);
  }

  pausar() {
    this.modo = MODO.PAUSA;
    this.telas.atualizarPausa(this.jogo);
    this.telas.mostrar('pausa');
  }

  // ==========================================================================
  desenhar(dt) {
    const r = this.render;
    const ctx = r.ctx;
    const j = this.jogo;
    const pal = r.pal;
    r.t += dt;

    ctx.setTransform(r.dpr, 0, 0, r.dpr, 0, 0);

    if (this.modo === MODO.MENU) {
      r.desenharMenu(ctx, r.t);
      this.audio.tick(dt, 0.05);
      return;
    }

    r.desenharFundo(ctx);
    const L = r.layout({ w: CESTA.w, h: j.fisica.bounds.h });
    this.L = L;

    ctx.save();
    ctx.translate(this.tremor.x, this.tremor.y);

    r.desenharCesta(ctx, L);
    r.desenharLinha(ctx, L, j.linhaSolY, j.avisoTransbordo);

    // frutas na cesta
    ctx.save();
    ctx.beginPath();
    ctx.rect(L.x - 60, L.y - 700, L.w + 120, L.h + 760);
    ctx.clip();
    for (const b of j.fisica.bodies) {
      const s = b.squash;
      desenharFruta(ctx, b.tier, L.x + b.x * L.e, L.y + b.y * L.e, b.r * L.e, b.angle,
        s, 1 / Math.max(0.4, s), r.t,
        { face: b.face, feliz: b.age < 0.6 ? 0.7 : 0, susto: b.impact });
      if (this.opcoes.numeros) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = 'rgba(40,24,12,0.85)';
        ctx.font = `800 ${Math.max(9, b.r * L.e * 0.42)}px ${r.fonte}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(b.tier + 1), L.x + b.x * L.e, L.y + (b.y + b.r * 0.62) * L.e);
        ctx.restore();
      }
    }
    ctx.restore();

    // fruta na mão + guia
    if (this.modo === MODO.JOGO || this.modo === MODO.PAUSA) this.desenharMao(ctx, L, j, r);

    if (j.tucanoVoo) r.desenharTucano(ctx, L, j.tucanoVoo);

    this.particulas.desenhar(ctx);
    this.textos.desenhar(ctx, r.fonte);
    ctx.restore();

    if (this.modo === MODO.JOGO || this.modo === MODO.PAUSA) {
      this.hud.desenhar(ctx, j, L, pal, dt, r.w, r.h, this.opcoes, this.dados.marcas.melhorPontos || 0);
    }

    if (this.modo !== MODO.JOGO) {
      ctx.fillStyle = 'rgba(255,240,214,0.62)';
      ctx.fillRect(0, 0, r.w, r.h);
    }

    const inten = this.modo === MODO.JOGO
      ? clamp(j.fisica.bodies.length / 34 + j.avisoTransbordo * 0.3, 0, 1) : 0.08;
    this.audio.tick(dt, inten);
  }

  desenharMao(ctx, L, j, r) {
    const f = FRUTAS[j.maoTier];
    const x = L.x + j.maoX * L.e;
    const y = L.y + j.maoY * L.e;
    const pronto = j.recarga <= 0;

    // linha guia até a pilha
    ctx.save();
    ctx.globalAlpha = pronto ? 0.35 : 0.12;
    ctx.strokeStyle = r.pal.cestaEsc;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([7, 9]);
    ctx.lineDashOffset = -r.t * 34;
    ctx.beginPath();
    ctx.moveTo(x, y + f.r * L.e);
    ctx.lineTo(x, L.y + L.h - 6 * L.e);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // balanço de espera
    const bal = pronto ? Math.sin(r.t * 3.4) * 0.05 : 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(bal);
    ctx.globalAlpha = pronto ? 1 : 0.45;
    desenharFruta(ctx, j.maoTier, 0, 0, f.r * L.e, 0, 1, 1, r.t,
      { face: 5, feliz: 0.5 });
    ctx.restore();
    if (this.opcoes.nomes && pronto) {
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = r.pal.tintaFraca;
      ctx.font = `700 ${13 * L.e}px ${r.fonte}`;
      ctx.textAlign = 'center';
      ctx.fillText(f.nome, x, y - (f.r + 16) * L.e);
      ctx.restore();
    }
  }
}

// ---------------------------------------------------------------------------
function iniciar() {
  const app = new App();
  window.__app = app;

  window.__POMAR__ = {
    pronto: true,
    versao: '1.0.0',
    get modo() { return app.modo; },
    get erros() { return app.erros.slice(); },
    get opcoes() { return app.opcoes; },
    get fps() { return Math.round(app.fps); },
    modoTeste(on) { app.modoTeste = !!on; return app.modoTeste; },
    comecar(seed, modoId) {
      app.jogo.comecar(seed >>> 0, modoId || 'pomar');
      app.particulas.limpar(); app.textos.limpar();
      app.modo = 'jogo'; app.telas.mostrar(null);
      return app.jogo.estado();
    },
    passo(n = 1) { for (let i = 0; i < n; i++) app.passo(DT); return app.jogo.estado(); },
    mirar(nx) { app.input.mirar(nx); },
    soltar() { app.input.soltar(); },
    chacoalhar() { app.input.chacoalhar(); },
    regar() { app.input.regar(); },
    estado() { return app.jogo.estado(); },
    jogo() { return app.jogo; },
    tela() { return app.telas.atual; },
    clique(a) { app.acao(a); },
    botoes() { return app.hud.botoes.map((b) => ({ id: b.id, x: b.x, y: b.y, r: b.r })); },
    layout() { return app.L; },
  };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
else iniciar();
