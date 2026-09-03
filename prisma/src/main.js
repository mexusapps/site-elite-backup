// ---------------------------------------------------------------------------
// main.js — a casca: laço, telas, entrada, persistência e a API de teste.
// ---------------------------------------------------------------------------

import { Partida } from './game/jogo.js';
import { FASES, CAPITULOS } from './game/fases.js';
import { gerarFase } from './game/gerador.js';
import { TIPOS, ROTACOES, CORES, BRANCO, R, G, B } from './game/optica.js';
import { Renderer, corDe, comAlfa, marcaDeCor } from './render/draw.js';
import { desenharPeca } from './render/pecas.js';
import { Hud } from './ui/hud.js';
import { Telas } from './ui/screens.js';
import { audio } from './core/audio.js';
import { Particulas, Textos, P_POEIRA } from './core/fx.js';
import { carregar, gravar, apagar } from './core/save.js';
import { Rng, visualRng } from './core/rng.js';
import { clamp, lerp, TAU, easeOutCubic } from './core/math.js';

const DT = 1 / 60;
const MODO = { MENU: 'menu', JOGO: 'jogo', PAUSA: 'pausa', FIM: 'fim' };

const CFG_SEM_FIM = [
  { cols: 8, linhas: 6, tipos: [TIPOS.espelho], maxPecas: 3, minPecas: 1, minFlores: 1, maxFlores: 2, pedras: 2, fonteBranca: true, minMovimentos: 2 },
  { cols: 9, linhas: 7, tipos: [TIPOS.espelho, TIPOS.divisor], maxPecas: 4, minPecas: 2, minFlores: 2, maxFlores: 3, pedras: 3, fonteBranca: true, minMovimentos: 3 },
  { cols: 9, linhas: 7, tipos: [TIPOS.espelho, TIPOS.vidro, TIPOS.divisor], maxPecas: 4, minPecas: 2, minFlores: 1, maxFlores: 3, pedras: 3, fonteBranca: true, minMovimentos: 3 },
  { cols: 10, linhas: 8, tipos: [TIPOS.espelho, TIPOS.divisor, TIPOS.vidro, TIPOS.prisma], maxPecas: 5, minPecas: 3, minFlores: 2, maxFlores: 4, pedras: 4, fonteBranca: true, minMovimentos: 4 },
];

class App {
  constructor() {
    this.canvas = document.getElementById('jogo');
    this.uiRoot = document.getElementById('ui');
    this.render = new Renderer(this.canvas);
    this.hud = new Hud();
    this.audio = audio;
    this.particulas = new Particulas(900);
    this.textos = new Textos(40);

    this.dados = carregar();
    this.opcoes = this.dados.opcoes;

    this.p = new Partida();
    this.ligarEventos();
    this.telas = new Telas(this.uiRoot, this);

    this.modo = MODO.MENU;
    this.telaAnterior = 'titulo';
    this.indice = 0;
    this.semFim = false;
    this.semFimNivel = 0;
    this.rngSemFim = new Rng((Math.random() * 1e9) | 0);
    this.acumulador = 0;
    this.ultimo = 0;
    this.erros = [];
    this.modoTeste = false;
    this.fps = 60;
    this.cursor = 0;
    this.usandoTeclado = false;
    this.poeira = [];

    this.aplicarOpcoes();
    this.redimensionar();
    window.addEventListener('resize', () => this.redimensionar());
    this.ligarEntrada();

    window.addEventListener('error', (e) => this.erros.push(String(e.message || e.error)));
    window.addEventListener('unhandledrejection', (e) => this.erros.push('promise: ' + e.reason));

    this.p.carregar(FASES[0]);
    this.telas.mostrar('titulo');
    this.laco = this.laco.bind(this);
    requestAnimationFrame(this.laco);
  }

  // =========================================================================
  ligarEventos() {
    const p = this.p;
    p.eventos.colocar = (e) => {
      this.audio.retomar();
      this.audio.tocar('colocar', { n: e.n });
      this.faiscasNaCelula(e.cel, '#ffe9a0', 8);
      this.dados.marcas.pecas++;
    };
    p.eventos.girar = (e) => { this.audio.tocar('girar'); this.faiscasNaCelula(e.cel, '#cfe6ff', 5); };
    p.eventos.tirar = () => this.audio.tocar('tirar');
    p.eventos.desfazer = () => this.audio.tocar('tirar');
    p.eventos.limpar = () => this.audio.tocar('tirar');
    p.eventos.flor = (e) => this.aoAcordarFlor(e);
    p.eventos.completa = (e) => this.aoCompletar(e);
    p.eventos.dica = (e) => {
      this.audio.tocar('dica');
      // acima da bandeja, nunca por cima do tabuleiro: o texto tapava
      // justamente a casa que a dica está apontando
      const alt = this.hud.alturaBandeja(this.render.w, this.render.h, this.opcoes);
      this.textos.add(this.render.w / 2, this.render.h - alt - 22,
        e.recomecar ? 'Assim não dá — experimente tirar uma peça' : 'Que tal aqui?', '#ffe9a0', 21);
    };
  }

  faiscasNaCelula(cel, cor, n) {
    if (!this.L || this.opcoes.brilhos < 0.02) return;
    const x = this.render.cx(this.L, cel), y = this.render.cy(this.L, cel);
    this.particulas.faiscas(x, y, Math.round(n * this.opcoes.brilhos), cor, 150, 0.7, this.L.cel * 0.1);
    this.particulas.anel(x, y, this.L.cel * 0.2, this.L.cel * 0.9, cor, 0.45);
  }

  aoAcordarFlor(e) {
    this.audio.tocar('flor', { mask: e.mask });
    this.dados.marcas.floresAcordadas++;
    if (!this.L || this.opcoes.brilhos < 0.02) return;
    const x = this.render.cx(this.L, e.cel), y = this.render.cy(this.L, e.cel);
    const cor = corDe(e.mask);
    const k = this.opcoes.brilhos;
    this.particulas.faiscas(x, y, Math.round(18 * k), cor, 230, 1.1, this.L.cel * 0.12);
    this.particulas.petalas(x, y, Math.round(10 * k), cor);
    this.particulas.anel(x, y, this.L.cel * 0.3, this.L.cel * 2.4, cor, 0.8);
  }

  aoCompletar(e) {
    this.audio.tocar('completo');
    const perfeita = e.movimentos <= e.minimo;
    if (!this.semFim) {
      const reg = this.dados.fases[this.p.fase.id] || {};
      this.dados.fases[this.p.fase.id] = {
        feita: true,
        movimentos: Math.min(reg.movimentos || 999, e.movimentos),
        dicas: (reg.dicas || 0) + this.p.dicasUsadas,
      };
      if (!reg.feita) this.dados.marcas.fasesFeitas++;
    } else {
      this.semFimNivel++;
      this.dados.semFim.melhor = Math.max(this.dados.semFim.melhor || 0, this.semFimNivel);
      this.dados.semFim.jogadas = (this.dados.semFim.jogadas || 0) + 1;
    }
    if (perfeita) this.dados.marcas.perfeitas++;
    this.dados.marcas.dicas += this.p.dicasUsadas;
    this.guardar();
    if (this.opcoes.brilhos > 0.02 && this.L) {
      for (const f of this.p.flores) {
        const x = this.render.cx(this.L, f.cel), y = this.render.cy(this.L, f.cel);
        this.particulas.petalas(x, y, Math.round(14 * this.opcoes.brilhos), corDe(f.mask));
      }
    }
    setTimeout(() => {
      if (this.p.completa) {
        this.telas.renderFim(this.p, perfeita, this.semFim ? this.semFimNivel : null);
        this.modo = MODO.FIM;
        this.telas.mostrar('fim');
      }
    }, 1500);
  }

  // =========================================================================
  redimensionar() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.render.redimensionar(Math.max(320, window.innerWidth), Math.max(420, window.innerHeight), dpr);
    this.poeira.length = 0;
  }

  aplicarOpcoes() {
    const o = this.opcoes;
    this.audio.setVolumes({ master: o.master, musica: o.musica, efeitos: o.efeitos });
    this.render.usarPaleta(o.paleta);
    this.render.brilhoTotal = o.bloom;
    document.documentElement.style.setProperty('--te', String(o.tamanhoTexto));
    document.documentElement.dataset.paleta = o.paleta;
    this.guardar();
  }
  definirOpcao(k, v) { this.opcoes[k] = v; this.aplicarOpcoes(); }

  /** Desenha uma peça de exemplo num canvas da tela de ajuda. */
  desenharPecaEm(canvas, tipo) {
    const g = canvas.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.save(); g.scale(2, 2);
    const peca = tipo === TIPOS.vidro ? { tipo, mask: R | G, rot: 0 } : { tipo, rot: 1 };
    desenharPeca(g, this.render, peca, 32, 32, 58, 1.2, null);
    g.restore();
  }

  /** Mostra uma cor com o símbolo que a identifica sem depender da cor. */
  desenharCorEm(canvas, mask) {
    const g = canvas.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.save(); g.scale(2, 2);
    const grad = g.createRadialGradient(20, 19, 2, 24, 24, 19);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.5, corDe(mask));
    grad.addColorStop(1, comAlfa(corDe(mask), 0.55));
    g.fillStyle = grad;
    g.beginPath(); g.arc(24, 24, 18, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(24, 24, 18, 0, TAU); g.stroke();
    marcaDeCor(g, mask, 24, 24, 6.2, 1);
    g.restore();
  }
  guardar() { this.dados.opcoes = this.opcoes; gravar(this.dados); }

  // =========================================================================
  ligarEntrada() {
    const el = this.canvas;
    const pos = (e) => {
      const r = el.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (this.render.w / r.width || 1), y: (e.clientY - r.top) * (this.render.h / r.height || 1) };
    };

    el.addEventListener('pointerdown', (e) => {
      this.audio.retomar();
      this.usandoTeclado = false;
      const q = pos(e);
      this.ponteiro = q;
      if (e.button === 2) { this.acaoCelula(q, 'remover'); e.preventDefault(); return; }
      const alvo = this.hud.alvoEm(q.x, q.y);
      if (alvo) { this.acaoAlvo(alvo); e.preventDefault(); return; }
      if (this.modo !== MODO.JOGO) return;
      const cel = this.render.celulaEm(this.L, q.x, q.y);
      if (cel < 0) return;
      this.pressT = performance.now();
      this.pressCel = cel;
      this.arrastando = !!this.hud.selecionado;
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
    });

    window.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      this.ponteiro = { x: (e.clientX - r.left) * (this.render.w / r.width || 1), y: (e.clientY - r.top) * (this.render.h / r.height || 1) };
    });

    window.addEventListener('pointerup', (e) => {
      if (this.pressCel === undefined || this.pressCel === null) return;
      const cel = this.pressCel;
      const dur = performance.now() - (this.pressT || 0);
      this.pressCel = null;
      if (this.modo !== MODO.JOGO) return;
      const q = this.ponteiro;
      const celAgora = this.render.celulaEm(this.L, q.x, q.y);
      if (dur > 480 && this.p.itemEm(cel)) { this.p.tirar(cel); return; }
      if (celAgora === cel || celAgora < 0) this.acaoCelula({ cel }, 'tocar');
      else this.acaoCelula({ cel: celAgora }, 'tocar');
    });

    el.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => {
      this.audio.retomar();
      if (this.modo !== MODO.JOGO) return;
      const L = this.L;
      if (!L) return;
      let usou = true;
      switch (e.code) {
        case 'ArrowLeft': this.moverCursor(-1, 0); break;
        case 'ArrowRight': this.moverCursor(1, 0); break;
        case 'ArrowUp': this.moverCursor(0, -1); break;
        case 'ArrowDown': this.moverCursor(0, 1); break;
        case 'Enter': case 'Space': this.acaoCelula({ cel: this.cursor }, 'tocar'); break;
        case 'Backspace': case 'Delete': this.p.tirar(this.cursor); break;
        case 'KeyZ': this.p.desfazer(); break;
        case 'KeyH': this.p.pedirDica(); break;
        case 'Tab': this.ciclarBandeja(e.shiftKey ? -1 : 1); break;
        case 'Escape': this.pausar(); break;
        default: usou = false;
      }
      if (usou) { this.usandoTeclado = true; e.preventDefault(); }
    });
  }

  moverCursor(dx, dy) {
    const L = this.L; if (!L) return;
    let x = (this.cursor % L.cols) + dx;
    let y = ((this.cursor / L.cols) | 0) + dy;
    x = clamp(x, 0, L.cols - 1); y = clamp(y, 0, L.linhas - 1);
    this.cursor = y * L.cols + x;
  }

  ciclarBandeja(d) {
    const tipos = [];
    const vistos = new Set();
    for (const b of this.p.bandeja) {
      if (b.cel !== null) continue;
      const k = `${b.tipo}:${b.mask || 0}`;
      if (vistos.has(k)) continue;
      vistos.add(k);
      tipos.push({ tipo: b.tipo, mask: b.mask });
    }
    if (!tipos.length) { this.hud.selecionado = null; return; }
    let i = tipos.findIndex((t) => this.hud.selecionado
      && t.tipo === this.hud.selecionado.tipo && (t.mask || 0) === (this.hud.selecionado.mask || 0));
    i = (i + d + tipos.length * 2) % tipos.length;
    this.hud.selecionado = tipos[i];
    this.audio.tocar('ui');
  }

  acaoAlvo(a) {
    if (a.id === 'peca') {
      this.hud.selecionado = { tipo: a.tipo, mask: a.mask };
      this.audio.tocar('ui');
    } else if (a.id === 'dica') this.p.pedirDica();
    else if (a.id === 'desfazer') this.p.desfazer();
    else if (a.id === 'limpar') this.p.limpar();
    else if (a.id === 'menu') this.pausar();
  }

  acaoCelula(q, tipo) {
    const cel = q.cel !== undefined ? q.cel : this.render.celulaEm(this.L, q.x, q.y);
    if (cel < 0 || this.modo !== MODO.JOGO) return;
    if (tipo === 'remover') { this.p.tirar(cel); return; }
    const item = this.p.itemEm(cel);
    if (item) {
      if ((ROTACOES[item.tipo] || 1) > 1) this.p.girar(cel);
      else this.p.tirar(cel);
      return;
    }
    if (!this.p.podeColocar(cel)) return;
    let escolha = null;
    if (this.hud.selecionado) {
      escolha = this.p.bandeja.find((b) => b.cel === null && b.tipo === this.hud.selecionado.tipo
        && (b.mask || 0) === (this.hud.selecionado.mask || 0));
    }
    if (!escolha) escolha = this.p.naBandeja()[0];
    if (!escolha) return;
    this.hud.selecionado = { tipo: escolha.tipo, mask: escolha.mask };
    this.p.colocar(escolha, cel);
    if (!this.p.bandeja.some((b) => b.cel === null && b.tipo === escolha.tipo
      && (b.mask || 0) === (escolha.mask || 0))) this.hud.selecionado = null;
  }

  // =========================================================================
  acao(a, arg) {
    this.audio.retomar();
    this.audio.tocar('ui', { forte: a === 'jogar' });
    switch (a) {
      case 'jogar': this.telaAnterior = 'titulo'; this.telas.mostrar('mapa'); break;
      case 'fase': this.abrirFase(parseInt(arg, 10)); break;
      case 'semfim': this.comecarSemFim(); break;
      case 'comojoga': this.telaAnterior = this.telas.atual; this.dados.viuComoJoga = true; this.guardar(); this.telas.mostrar('comojoga'); break;
      case 'opcoes': this.telaAnterior = this.telas.atual; this.telas.mostrar('opcoes'); break;
      case 'marcas': this.telaAnterior = this.telas.atual; this.telas.mostrar('marcas'); break;
      case 'voltar':
        if (this.telaAnterior === 'pausa') { this.modo = MODO.PAUSA; this.telas.mostrar('pausa'); }
        else if (this.telaAnterior === 'mapa') this.telas.mostrar('mapa');
        else this.telas.mostrar('titulo');
        this.telaAnterior = 'titulo';
        break;
      case 'continuar': this.modo = MODO.JOGO; this.telas.mostrar(null); break;
      case 'mapa': this.modo = MODO.MENU; this.semFim = false; this.telas.mostrar('mapa'); break;
      case 'menu': this.modo = MODO.MENU; this.semFim = false; this.telas.mostrar('titulo'); break;
      case 'repetir': this.p.carregar(this.p.fase); this.reiniciarCena(); break;
      case 'proximo':
        if (this.semFim) this.proximaSemFim();
        else this.abrirFase(Math.min(FASES.length - 1, this.indice + 1));
        break;
      case 'apagar':
        this.dados = apagar(); this.opcoes = this.dados.opcoes;
        this.aplicarOpcoes(); this.telas.sincronizar();
        break;
      default: break;
    }
  }

  abrirFase(i) {
    this.semFim = false;
    this.indice = clamp(i, 0, FASES.length - 1);
    this.p.carregar(FASES[this.indice]);
    this.reiniciarCena();
  }

  comecarSemFim() {
    this.semFim = true;
    this.semFimNivel = 0;
    this.proximaSemFim();
  }

  proximaSemFim() {
    const cfg = CFG_SEM_FIM[Math.min(CFG_SEM_FIM.length - 1, Math.floor(this.semFimNivel / 3))];
    const alvo = { ...cfg, minMovimentos: cfg.minMovimentos + Math.min(2, Math.floor(this.semFimNivel / 6)) };
    let f = gerarFase(this.rngSemFim, alvo, 90);
    if (!f) f = gerarFase(this.rngSemFim, { ...cfg, minMovimentos: 2 }, 140);
    if (!f) { this.acao('mapa'); return; }
    f.id = 'semfim-' + this.semFimNivel;
    f.capitulo = 'Jardim sem fim';
    this.p.carregar(f);
    this.reiniciarCena();
  }

  reiniciarCena() {
    this.particulas.limpar();
    this.textos.limpar();
    this.hud.selecionado = null;
    this.cursor = 0;
    this.poeira.length = 0;
    this.modo = MODO.JOGO;
    this.telas.mostrar(null);
  }

  pausar() {
    this.modo = MODO.PAUSA;
    this.telas.atualizarPausa(this.p);
    this.telas.mostrar('pausa');
  }

  // =========================================================================
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
    if (this.modo === MODO.JOGO || this.modo === MODO.FIM) this.p.passo(dt);
    this.particulas.passo(dt);
    this.textos.passo(dt);
    if (this.modo === MODO.JOGO && this.L && this.opcoes.brilhos > 0.02) this.atualizarPoeira(dt);
  }

  /** Poeira que só brilha quando está dentro de um feixe — dá volume à luz. */
  atualizarPoeira(dt) {
    const L = this.L;
    if (this.poeira.length < 90) {
      for (let i = this.poeira.length; i < 90; i++) {
        this.poeira.push({
          x: L.x + visualRng.next() * L.w, y: L.y + visualRng.next() * L.h,
          vx: visualRng.range(-6, 6), vy: visualRng.range(-14, -3),
          r: visualRng.range(0.7, 2.0), f: visualRng.angle(),
        });
      }
    }
    for (const d of this.poeira) {
      d.x += d.vx * dt; d.y += d.vy * dt;
      if (d.y < L.y - 6) { d.y = L.y + L.h + 4; d.x = L.x + visualRng.next() * L.w; }
      if (d.x < L.x - 6) d.x = L.x + L.w;
      if (d.x > L.x + L.w + 6) d.x = L.x;
    }
  }

  // =========================================================================
  desenhar(dt) {
    const r = this.render;
    const ctx = r.ctx;
    r.t += dt;
    ctx.setTransform(r.dpr, 0, 0, r.dpr, 0, 0);

    const claridade = this.modo === MODO.MENU ? 0.28 : this.p.claridade;
    r.desenharFundo(ctx, this.modo === MODO.MENU ? 0.45 : claridade);

    if (this.modo === MODO.MENU) {
      this.desenharVitrine(ctx, r, dt);
      this.audio.tick(dt, 0.3);
      return;
    }

    const alt = this.hud.alturaBandeja(r.w, r.h, this.opcoes);
    const L = r.layout(this.p.fase.cols, this.p.fase.linhas, alt);
    this.L = L;

    const destaque = this.p.dicaAtual ? this.p.dicaAtual.jogada.cel
      : (this.usandoTeclado ? this.cursor : -1);
    r.desenharTabuleiro(ctx, L, this.p.tab, destaque);

    // camada de luz: feixes + brilhos
    r.desenharFeixes(L, this.p.res, this.p.tab);
    const brilhos = [];
    for (let i = 0; i < this.p.tab.cel.length; i++) {
      const peca = this.p.tab.cel[i];
      if (!peca) continue;
      if (peca.tipo === TIPOS.fonte) {
        brilhos.push({ x: r.cx(L, i), y: r.cy(L, i), raio: L.cel * 0.75, cor: corDe(peca.mask), forca: 0.5 });
      } else if (peca.tipo === TIPOS.flor) {
        const a = this.p.aberturas.get(i) || 0;
        if (a > 0.05) brilhos.push({ x: r.cx(L, i), y: r.cy(L, i), raio: L.cel * (0.5 + a * 0.5), cor: corDe(peca.mask), forca: 0.3 + a * 0.35 });
      }
    }
    for (const b of brilhos) r.brilho(b.x, b.y, b.raio, b.cor, b.forca);
    r.aplicarBloom(ctx);

    // poeira dentro dos feixes
    if (this.opcoes.brilhos > 0.02 && this.poeira.length) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const d of this.poeira) {
        const cel = r.celulaEm(L, d.x, d.y);
        let mask = 0;
        if (cel >= 0) for (let k = 0; k < 4; k++) mask |= this.p.res.seg[cel * 4 + k];
        ctx.globalAlpha = mask ? 0.55 : 0.09;
        ctx.fillStyle = mask ? corDe(mask) : '#cfd8ff';
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r * (mask ? 1.7 : 1), 0, TAU); ctx.fill();
      }
      ctx.restore();
    }

    // peças por cima
    for (let i = 0; i < this.p.tab.cel.length; i++) {
      const peca = this.p.tab.cel[i];
      if (!peca) continue;
      const est = peca.tipo === TIPOS.flor ? { abertura: this.p.aberturas.get(i) || 0 } : null;
      desenharPeca(ctx, r, peca, r.cx(L, i), r.cy(L, i), L.cel, r.t, est);
    }

    // fantasma da peça escolhida seguindo o dedo
    if (this.modo === MODO.JOGO && this.hud.selecionado && this.ponteiro) {
      const cel = r.celulaEm(L, this.ponteiro.x, this.ponteiro.y);
      if (cel >= 0 && this.p.podeColocar(cel)) {
        ctx.save();
        ctx.globalAlpha = 0.45 + Math.sin(r.t * 6) * 0.1;
        desenharPeca(ctx, r, { ...this.hud.selecionado, rot: 0 }, r.cx(L, cel), r.cy(L, cel), L.cel, r.t, null);
        ctx.restore();
      }
    }

    this.particulas.desenhar(ctx);
    this.textos.desenhar(ctx, r.fonte);

    this.hud.desenhar(ctx, r, this.p, r.w, r.h, dt, this.opcoes,
      this.p.fase.capitulo || '', this.indice, this.semFim ? 0 : FASES.length);

    if (this.modo !== MODO.JOGO) {
      ctx.fillStyle = 'rgba(8,10,26,0.55)';
      ctx.fillRect(0, 0, r.w, r.h);
    }
    this.audio.tick(dt, this.p.claridade);
  }

  /** Fundo do menu: uma pequena cena de luz atravessando um prisma. */
  desenharVitrine(ctx, r, dt) {
    const cx = r.w / 2, cy = r.h * 0.72;
    const larg = Math.min(r.w * 0.7, 520);
    const g = r.luzCtx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, r.luz.width, r.luz.height);
    g.save();
    g.scale(r.escalaLuz, r.escalaLuz);
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round';
    g.strokeStyle = '#ffffff';
    g.lineWidth = 7; g.globalAlpha = 0.9;
    g.beginPath(); g.moveTo(cx - larg / 2, cy); g.lineTo(cx - 26, cy); g.stroke();
    g.lineWidth = 22; g.globalAlpha = 0.22; g.stroke();
    const cores = ['#ff4152', '#4dff7a', '#4da6ff'];
    for (let i = 0; i < 3; i++) {
      const ang = (i - 1) * 0.22 + Math.sin(r.t * 0.6 + i) * 0.02;
      g.strokeStyle = cores[i];
      g.globalAlpha = 0.95; g.lineWidth = 5;
      g.beginPath(); g.moveTo(cx + 20, cy);
      g.lineTo(cx + 20 + Math.cos(ang) * (larg / 2), cy + Math.sin(ang) * (larg / 2));
      g.stroke();
      g.globalAlpha = 0.22; g.lineWidth = 18; g.stroke();
    }
    g.restore();
    r.aplicarBloom(ctx);
    desenharPeca(ctx, r, { tipo: TIPOS.prisma }, cx, cy, 96, r.t, null);
  }
}

// ---------------------------------------------------------------------------
function iniciar() {
  const app = new App();
  window.__app = app;
  window.__PRISMA__ = {
    pronto: true,
    versao: '1.0.0',
    get modo() { return app.modo; },
    get erros() { return app.erros.slice(); },
    get opcoes() { return app.opcoes; },
    get fps() { return Math.round(app.fps); },
    totalFases: FASES.length,
    modoTeste(on) { app.modoTeste = !!on; return app.modoTeste; },
    abrir(i) { app.abrirFase(i); return app.p.estado(); },
    semFim() { app.comecarSemFim(); return app.p.estado(); },
    passo(n = 1) { for (let i = 0; i < n; i++) app.passo(DT); return app.p.estado(); },
    estado() { return app.p.estado(); },
    partida() { return app.p; },
    tela() { return app.telas.atual; },
    clique(a, arg) { app.acao(a, arg); },
    alvos() { return app.hud.alvos.map((a) => ({ ...a })); },
    layout() { return app.L; },
    /** Resolve a fase atual pelo mesmo caminho do jogador. */
    resolverAtual() {
      const p = app.p;
      let guarda = 0;
      while (!p.completa && guarda++ < 12) {
        const d = p.pedirDica();
        if (!d) break;
        const j = d.jogada;
        if (d.recomecar) { p.limpar(); continue; }
        const item = p.bandeja.find((b) => b.cel === null && b.tipo === j.tipo
          && (b.mask || 0) === (j.mask || 0));
        if (!item) break;
        p.colocar(item, j.cel);
        if (j.rot) for (let k = 0; k < j.rot; k++) p.girar(j.cel);
      }
      return p.estado();
    },
  };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
else iniciar();
