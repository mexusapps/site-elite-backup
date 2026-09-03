// ---------------------------------------------------------------------------
// main.js — a casca: laço de tempo fixo, câmera, entrada, telas, progresso e
// a API de teste que o navegador expõe para o robô jogar sozinho.
//
// O laço é de passo fixo em 60 Hz e a simulação não usa Math.random: a mesma
// sequência de comandos dá sempre a mesma trajetória. É o que permite ter um
// teste que joga a fase inteira de verdade e falha quando o jogo quebra.
// ---------------------------------------------------------------------------

import { Mundo } from './game/mundo.js';
import { FASES } from './game/niveis.js';
import { HABILIDADES, BOLOTA } from './game/regras.js';
import { Cena, Camera, PALETA } from './render/cena.js';
import { Hud } from './ui/hud.js';
import { Telas } from './ui/screens.js';
import { audio } from './core/audio.js';
import { Particulas, Textos } from './core/fx.js';
import { carregar, gravar, apagar } from './core/save.js';
import { carregarArte, quantas, catalogo } from './render/imagens.js';
import { clamp, lerp, damp, TAU } from './core/math.js';

const DT = 1 / 60;
const MODO = { MENU: 'menu', JOGO: 'jogo', PAUSA: 'pausa', FIM: 'fim' };

class App {
  constructor() {
    this.canvas = document.getElementById('jogo');
    this.canvasHud = document.getElementById('hud');
    this.uiRoot = document.getElementById('ui');
    this.cena = new Cena(this.canvas, this.canvasHud,
      { forcar: /[?&]glsempre/.test(location.search) });
    this.cam = new Camera();
    this.hud = new Hud();
    this.audio = audio;
    this.particulas = new Particulas(700);
    this.textos = new Textos(24);

    this.dados = carregar();
    this.opcoes = this.dados.opcoes;

    this.mundo = new Mundo();
    this.ligarEventos();
    this.telas = new Telas(this.uiRoot, this);

    this.modo = MODO.MENU;
    this.telaAnterior = 'titulo';
    this.indice = 0;
    this.acumulador = 0;
    this.ultimo = 0;
    this.erros = [];
    this.modoTeste = false;
    this.fps = 60;
    this.segurando = false;
    this.ponteiro = null;
    this.usandoTeclado = false;
    this.anguloTeclado = -Math.PI / 3;
    this.giroTeclado = 0;
    this.esperaFim = 0;
    this.entradaInjetada = null;

    this.aplicarOpcoes();
    this.redimensionar();
    window.addEventListener('resize', () => this.redimensionar());
    this.ligarEntrada();

    window.addEventListener('error', (e) => this.erros.push(String(e.message || e.error)));
    window.addEventListener('unhandledrejection', (e) => this.erros.push('promise: ' + e.reason));

    // A arte ilustrada entra assim que carrega. Enquanto não carrega — ou
    // quando não existe — o jogo desenha por código e roda igual; por isso o
    // carregamento não bloqueia nada nem tem tela de espera.
    this.arteCarregada = 0;
    carregarArte(() => {
      this.arteCarregada = quantas();
      if (this.mundo.fase) this.cena.prepararFase(this.mundo, this.mundo.fase);
      this.cena.camadas = null;
    });

    this.abrirFase(0, true);
    this.telas.mostrar('titulo');
    this.laco = this.laco.bind(this);
    requestAnimationFrame(this.laco);
  }

  // =========================================================================
  // EVENTOS DO MUNDO → som, partículas, câmera, progresso
  // =========================================================================
  ligarEventos() {
    const e = this.mundo.eventos;
    const vivo = () => this.modo === MODO.JOGO || this.modo === MODO.FIM;
    const k = () => this.opcoes.brilhos;

    e.lancar = (d) => {
      if (!vivo()) return;
      this.audio.retomar();
      this.audio.pararCarga();
      this.audio.tocar('lancar', { forca: d.carga });
      this.dados.marcas.saltos++;
      if (k() > 0.02) {
        const b = this.mundo.bolota;
        const a = b.angulo + Math.PI;
        for (let i = 0; i < Math.round(9 * k()); i++) {
          const ang = a + (Math.random() - 0.5) * 1.1;
          const s = 90 + Math.random() * 210 * (0.4 + d.carga);
          this.particulas.criar(2, d.x, d.y, Math.cos(ang) * s, Math.sin(ang) * s,
            0.5 + Math.random() * 0.4, 2 + Math.random() * 3, '#ffe0ac',
            { grav: 300, arrasto: 0.94 });
        }
        this.particulas.anel(d.x, d.y, 16, 52 + d.carga * 40, '#ffe6bd', 0.4);
      }
    };

    e.pousar = (d) => {
      if (!vivo()) return;
      this.audio.tocar('pousar', { forca: d.forca });
      this.cam.bater(clamp(d.forca, 0, 1) * 0.42 * this.opcoes.tremor);
      if (k() > 0.02 && d.forca > 0.12) {
        const n = Math.round((4 + d.forca * 12) * k());
        for (let i = 0; i < n; i++) {
          const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
          const s = 60 + Math.random() * 220 * d.forca;
          this.particulas.criar(2, d.x + (Math.random() - 0.5) * 22, d.y + BOLOTA.raio * 0.7,
            Math.cos(ang) * s, Math.sin(ang) * s * 0.5,
            0.4 + Math.random() * 0.5, 2 + Math.random() * 4, '#c9b08a',
            { grav: 420, arrasto: 0.9 });
        }
      }
    };

    e.mola = (d) => {
      if (!vivo()) return;
      this.audio.tocar('mola');
      this.cam.bater(0.3 * this.opcoes.tremor);
      if (k() > 0.02) {
        this.particulas.anel(d.x, d.y, 20, 130, '#ffd0e2', 0.55);
        this.particulas.faiscas(d.x, d.y, Math.round(12 * k()), '#ffe1f0', 260, 0.8, 5);
      }
    };

    e.florescer = (b) => {
      if (!vivo()) return;
      this.audio.tocar('brotar', { mola: b.tipo === 'mola' });
      this.cam.bater(0.22 * this.opcoes.tremor);
      if (k() > 0.02) {
        this.particulas.petalas(b.x, b.y, Math.round(14 * k()), '#cdf0a0');
        this.particulas.anel(b.x, b.y, 18, 190, '#c8ff9a', 0.8);
        this.particulas.faiscas(b.x, b.y, Math.round(16 * k()), '#eaffd0', 260, 1.1, 6);
      }
      this.textos.add(b.x, b.y - 60, b.tipo === 'mola' ? 'Cogumelo!' : 'Folha!', '#dcffb0', 20);
    };

    e.orvalho = (o) => {
      if (!vivo()) return;
      const n = this.mundo.orvalho.filter((g) => g.pego).length;
      this.audio.tocar('orvalho', { n: n - 1 });
      this.hud.brilhar();
      this.dados.marcas.gotas++;
      if (k() > 0.02) {
        this.particulas.faiscas(o.x, o.y, Math.round(16 * k()), '#bff2ff', 240, 0.9, 5);
        this.particulas.anel(o.x, o.y, 12, 96, '#a8ecff', 0.5);
      }
      this.textos.add(o.x, o.y - 34, `Orvalho ${n}/${this.mundo.orvalho.length}`, '#bff2ff', 19);
    };

    e.cair = (d) => {
      if (!vivo()) return;
      this.audio.pararCarga();
      this.audio.tocar('voltar');
      this.dados.marcas.quedas++;
      this.hud.mostrarAviso('O vento te trouxe de volta');
      if (k() > 0.02) this.particulas.faiscas(d.x, d.y - 40, Math.round(10 * k()), '#cfe6ff', 160, 0.9, 4);
    };

    e.vencer = (r) => {
      if (!vivo()) return;
      this.audio.pararCarga();
      this.audio.tocar('vitoria');
      this.cam.bater(0.3 * this.opcoes.tremor);
      this.modo = MODO.FIM;
      this.esperaFim = 1.9;
      this.hud.dica = null;      // a dica de entrada não fica por cima da festa
      this.hud.aviso = null;
      const m = this.mundo.meta;
      if (k() > 0.02) {
        this.particulas.petalas(m.x, m.y, Math.round(30 * k()), '#ffe6a8');
        this.particulas.anel(m.x, m.y, 24, 170, '#fff0c0', 0.8);
        this.particulas.faiscas(m.x, m.y, Math.round(26 * k()), '#fff6de', 320, 1.6, 7);
      }
      this.registrarVitoria(r);
    };
  }

  /** Guarda o progresso e decide se houve evolução. */
  registrarVitoria(r) {
    const fase = this.mundo.fase;
    const antes = this.dados.fases[fase.id] || { feita: false, melhorSaltos: 0, gotas: [] };
    const gotasAgora = this.mundo.orvalho.filter((o) => o.pego).map((o) => o.id);
    const juntas = Array.from(new Set([...(antes.gotas || []), ...gotasAgora])).sort();
    const recorde = !!antes.melhorSaltos && r.saltos < antes.melhorSaltos;

    let nova = null;
    if (fase.recompensa && !this.dados.habilidades.includes(fase.recompensa)) {
      nova = fase.recompensa;
      this.dados.habilidades = Array.from(new Set([...this.dados.habilidades, 'salto', nova]));
      this.audio.tocar('evoluir');
    }
    if (!antes.feita) this.dados.marcas.fasesFeitas++;

    this.dados.fases[fase.id] = {
      feita: true,
      melhorSaltos: antes.melhorSaltos ? Math.min(antes.melhorSaltos, r.saltos) : r.saltos,
      gotas: juntas,
      tempo: antes.tempo && antes.tempo < r.tempo ? antes.tempo : +r.tempo.toFixed(2),
    };
    this.guardar();

    this.resultado = {
      saltos: r.saltos,
      gotas: gotasAgora.length,
      totalGotas: this.mundo.orvalho.length,
      quedas: r.quedas,
      tempo: r.tempo,
      melhor: antes.melhorSaltos || 0,
      recorde,
      novaHabilidade: nova,
    };
  }

  // =========================================================================
  redimensionar() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(320, window.innerWidth);
    const h = Math.max(400, window.innerHeight);
    this.cena.redimensionar(w, h, dpr);
    if (this.mundo.fase) this.cena.prepararFase(this.mundo, this.mundo.fase);
    this.ajustarZoom();
  }

  ajustarZoom() {
    const base = clamp(this.cena.w / 1060, 0.5, 1.5);
    this.zoomBase = base;
    this.cam.zoomAlvo = base;
  }

  aplicarOpcoes() {
    const o = this.opcoes;
    this.audio.setVolumes({ master: o.master, musica: o.musica, efeitos: o.efeitos });
    this.cena.brilho = o.bloom;
    this.cam.escalaTremor = o.tremor;
    const fixa = { alta: 1, media: 0.5, baixa: 0 };
    if (o.qualidade in fixa) this.cena.definirQualidade(fixa[o.qualidade]);
    this.quadrosLentos = 0; this.quadrosRapidos = 0;
    document.documentElement.style.setProperty('--te', String(o.tamanhoTexto));
    this.guardar();
  }
  definirOpcao(k, v) { this.opcoes[k] = v; this.aplicarOpcoes(); }
  guardar() { this.dados.opcoes = this.opcoes; gravar(this.dados); }

  habilidadesAtuais(fase) {
    const s = new Set(fase.habilidades || ['salto']);
    for (const h of this.dados.habilidades) s.add(h);
    s.add('salto');
    return Array.from(s);
  }

  // =========================================================================
  abrirFase(i, soCarregar) {
    this.indice = clamp(i, 0, FASES.length - 1);
    const fase = FASES[this.indice];
    this.mundo.carregar(fase, this.habilidadesAtuais(fase));
    this.cena.prepararFase(this.mundo, fase);
    this.cam.limites = { x: 0, y: 0, w: fase.largura, h: fase.altura };
    this.cam.x = fase.inicio.x; this.cam.y = fase.inicio.y - 80;
    this.cam.zoom = this.zoomBase || 1;
    this.particulas.limpar();
    this.textos.limpar();
    this.resultado = null;
    this.esperaFim = 0;
    this.segurando = false;
    this.anguloTeclado = -Math.PI / 3.2;
    if (soCarregar) return;
    this.modo = MODO.JOGO;
    this.telas.mostrar(null);
    const reg = this.dados.fases[fase.id];
    this.hud.mostrarDica(reg && reg.feita
      ? (this.dados.habilidades.includes('planar')
        ? 'Segure no ar para planar com a folha'
        : fase.dica)
      : fase.dica, 6.5);
  }

  pausar() {
    if (this.modo !== MODO.JOGO) return;
    this.modo = MODO.PAUSA;
    this.audio.pararCarga();
    this.segurando = false;
    this.telas.atualizarPausa(this.progresso());
    this.telas.mostrar('pausa');
  }

  progresso() {
    const m = this.mundo;
    const reg = this.dados.fases[m.fase.id];
    return {
      fase: m.fase,
      indice: this.indice,
      total: FASES.length,
      gotas: m.orvalho.filter((o) => o.pego).length,
      totalGotas: m.orvalho.length,
      saltos: m.bolota.saltos,
      melhor: reg ? reg.melhorSaltos : 0,
      habilidades: this.habilidadesAtuais(m.fase).map((h) => HABILIDADES[h]).filter(Boolean),
    };
  }

  // =========================================================================
  ligarEntrada() {
    const el = this.canvas;
    const pos = (ev) => {
      const r = el.getBoundingClientRect();
      return {
        x: (ev.clientX - r.left) * (this.cena.w / (r.width || 1)),
        y: (ev.clientY - r.top) * (this.cena.h / (r.height || 1)),
      };
    };

    el.addEventListener('pointerdown', (ev) => {
      this.audio.retomar();
      this.usandoTeclado = false;
      const q = pos(ev);
      this.ponteiro = q;
      const alvo = this.hud.alvoEm(q.x, q.y);
      if (alvo) { if (alvo.id === 'pausa') this.pausar(); ev.preventDefault(); return; }
      if (this.modo !== MODO.JOGO) return;
      this.segurando = true;
      try { el.setPointerCapture(ev.pointerId); } catch (_) {}
      ev.preventDefault();
    });

    window.addEventListener('pointermove', (ev) => {
      const r = el.getBoundingClientRect();
      this.ponteiro = {
        x: (ev.clientX - r.left) * (this.cena.w / (r.width || 1)),
        y: (ev.clientY - r.top) * (this.cena.h / (r.height || 1)),
      };
    });

    const soltar = () => { this.segurando = false; };
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);
    el.addEventListener('contextmenu', (ev) => ev.preventDefault());

    window.addEventListener('keydown', (ev) => {
      this.audio.retomar();
      if (ev.code === 'Escape' || ev.code === 'KeyP') {
        if (this.modo === MODO.JOGO) this.pausar();
        else if (this.modo === MODO.PAUSA) this.acao('continuar');
        ev.preventDefault();
        return;
      }
      if (this.modo !== MODO.JOGO) return;
      let usou = true;
      switch (ev.code) {
        case 'ArrowLeft': case 'KeyA': this.giroTeclado = -1; break;
        case 'ArrowRight': case 'KeyD': this.giroTeclado = 1; break;
        case 'Space': case 'Enter': this.segurando = true; break;
        case 'KeyR': this.acao('repetir'); break;
        default: usou = false;
      }
      if (usou) { this.usandoTeclado = true; ev.preventDefault(); }
    });

    window.addEventListener('keyup', (ev) => {
      if (ev.code === 'ArrowLeft' || ev.code === 'KeyA' || ev.code === 'ArrowRight' || ev.code === 'KeyD') {
        this.giroTeclado = 0;
      }
      if (ev.code === 'Space' || ev.code === 'Enter') this.segurando = false;
    });
  }

  /** Monta o comando deste quadro, seja de mouse, dedo, teclado ou teste. */
  entrada(dt) {
    if (this.entradaInjetada) {
      const e = this.entradaInjetada;
      if (e.giro) this.anguloTeclado += e.giro * 2.2 * dt;
      return { segurando: !!e.segurando, anguloDireto: e.angulo !== undefined ? e.angulo : this.anguloTeclado };
    }
    if (this.modo !== MODO.JOGO) return { segurando: false };
    if (this.usandoTeclado) {
      if (this.giroTeclado) this.anguloTeclado += this.giroTeclado * 2.4 * dt;
      // Limite útil, não limite geométrico. Com o teto anterior (-0.03 rad) a
      // seta da direita levava a mira a rasar o chão: o salto saía na
      // horizontal, batia no barranco e a Bolota não saía do lugar. Ninguém
      // quer mirar ali, então a mira não vai mais até lá.
      this.anguloTeclado = clamp(this.anguloTeclado, -Math.PI * 0.94, -Math.PI * 0.06);
      return { segurando: this.segurando, anguloDireto: this.anguloTeclado };
    }
    let mira = null;
    if (this.ponteiro) {
      const m = this.cam.paraMundo(this.ponteiro.x, this.ponteiro.y, this.cena.w, this.cena.h);
      mira = m;
      const c = this.mundo.bolota.corpo;
      this.anguloTeclado = Math.atan2(m.y - c.y, m.x - c.x);
    }
    return { segurando: this.segurando, mira };
  }

  // =========================================================================
  acao(a, arg) {
    this.audio.retomar();
    this.audio.tocar('ui', { forte: a === 'jogar' || a === 'proximo' });
    switch (a) {
      case 'jogar': this.abrirFase(this.indice); break;
      case 'fase': this.abrirFase(parseInt(arg, 10)); break;
      case 'mapa': this.modo = MODO.MENU; this.telas.mostrar('mapa'); break;
      case 'menu': this.modo = MODO.MENU; this.abrirFase(this.indice, true); this.telas.mostrar('titulo'); break;
      case 'comojoga':
        this.telaAnterior = this.telas.atual;
        this.dados.viuComoJoga = true; this.guardar();
        this.telas.mostrar('comojoga');
        break;
      case 'opcoes': this.telaAnterior = this.telas.atual; this.telas.mostrar('opcoes'); break;
      case 'marcas': this.telaAnterior = this.telas.atual; this.telas.mostrar('marcas'); break;
      case 'voltar':
        if (this.telaAnterior === 'pausa') { this.modo = MODO.PAUSA; this.telas.mostrar('pausa'); }
        else if (this.telaAnterior === 'mapa') this.telas.mostrar('mapa');
        else if (this.telaAnterior === 'fim') this.telas.mostrar('fim');
        else this.telas.mostrar('titulo');
        this.telaAnterior = 'titulo';
        break;
      case 'continuar': this.modo = MODO.JOGO; this.telas.mostrar(null); break;
      case 'repetir': this.abrirFase(this.indice); break;
      case 'proximo':
        if (this.indice + 1 < FASES.length) this.abrirFase(this.indice + 1);
        else { this.modo = MODO.MENU; this.abrirFase(this.indice, true); this.telas.mostrar('titulo'); }
        break;
      case 'apagar':
        this.dados = apagar(); this.opcoes = this.dados.opcoes;
        this.aplicarOpcoes(); this.telas.sincronizar();
        break;
      default: break;
    }
  }

  // =========================================================================
  laco(agora) {
    requestAnimationFrame(this.laco);
    if (!this.ultimo) this.ultimo = agora;
    let dt = (agora - this.ultimo) / 1000;
    this.ultimo = agora;
    if (dt > 0.25) dt = 0.25;
    this.fps = this.fps * 0.92 + (1 / Math.max(dt, 1e-4)) * 0.08;
    this.ajustarQualidade(dt);
    if (!this.modoTeste) {
      this.acumulador += dt;
      let n = 0;
      while (this.acumulador >= DT && n < 5) { this.passo(DT); this.acumulador -= DT; n++; }
      if (n === 5) this.acumulador = 0;
    }
    this.desenhar(dt);
  }

  /**
   * Qualidade automática. Não existe uma máquina "média": o mesmo jogo roda num
   * desktop com placa dedicada e num tablet velho. Em vez de escolher um nível
   * e torcer, o jogo mede o próprio quadro e desce um degrau quando está
   * pesado — e volta a subir quando sobra folga, com histerese para não ficar
   * piscando entre dois níveis.
   */
  ajustarQualidade(dt) {
    if (this.opcoes.qualidade !== 'auto' || this.modoTeste) return;
    const ms = dt * 1000;
    if (ms > 24) { this.quadrosLentos++; this.quadrosRapidos = 0; }
    else if (ms < 13) { this.quadrosRapidos++; this.quadrosLentos = 0; }
    if (this.quadrosLentos > 45 && this.cena.qualidade > 0) {
      this.cena.definirQualidade(this.cena.qualidade > 0.67 ? 0.5 : 0);
      this.quadrosLentos = 0; this.quadrosRapidos = 0;
    } else if (this.quadrosRapidos > 300 && this.cena.qualidade < 1) {
      this.cena.definirQualidade(this.cena.qualidade < 0.34 ? 0.5 : 1);
      this.quadrosLentos = 0; this.quadrosRapidos = 0;
    }
  }

  passo(dt) {
    const b = this.mundo.bolota;
    if (this.modo === MODO.JOGO) {
      this.mundo.passo(dt, this.entrada(dt));
      if (b.estado === 'carregando') {
        if (!this._cargaSoando) { this.audio.iniciarCarga(); this._cargaSoando = true; }
        this.audio.atualizarCarga(b.carga);
      } else if (this._cargaSoando) { this.audio.pararCarga(); this._cargaSoando = false; }
    } else if (this.modo === MODO.FIM) {
      this.mundo.passo(dt, { segurando: false });
      if (this.esperaFim > 0) {
        this.esperaFim -= dt;
        if (this.esperaFim <= 0) {
          this.telas.renderFim(this.resultado);
          this.telas.mostrar('fim');
        }
      }
    } else if (this.modo === MODO.MENU) {
      // o mundo continua respirando atrás do menu
      this.mundo.bolota.animar(dt);
    }

    this.particulas.passo(dt);
    this.textos.passo(dt);
    this.moverCamera(dt);
  }

  moverCamera(dt) {
    const c = this.mundo.bolota.corpo;
    const b = this.mundo.bolota;
    if (this.modo === MODO.MENU) {
      // panorâmica lenta pela clareira, para o menu ter vida
      this._pan = (this._pan || 0) + dt * 0.055;
      const f = this.mundo.fase;
      const t = 0.5 - Math.cos(this._pan) * 0.5;
      this.cam.zoomAlvo = (this.zoomBase || 1) * 0.86;
      this.cam.seguir(lerp(f.inicio.x, f.meta.x, t), lerp(f.inicio.y - 120, f.meta.y, t) - 40,
        0, 0, dt, this.cena.w, this.cena.h);
      this.cam.passo(dt);
      return;
    }
    const vel = Math.hypot(c.vx, c.vy);
    const adiantaX = clamp(c.vx * 0.17, -230, 230);
    const adiantaY = clamp(c.vy * 0.11, -170, 210);
    let z = this.zoomBase || 1;
    if (b.estado === 'carregando') z *= lerp(1, 0.90, b.carga);
    else if (vel > 400) z *= lerp(1, 0.84, clamp((vel - 400) / 800, 0, 1));
    if (this.mundo.venceu) z *= 1.12;
    this.cam.zoomAlvo = z;
    this.cam.seguir(c.x, c.y - 30, adiantaX, adiantaY, dt, this.cena.w, this.cena.h);
    this.cam.passo(dt);
  }

  // =========================================================================
  desenhar(dt) {
    const mostrarMira = this.opcoes.mira === 'sempre' || this.modo === MODO.JOGO;
    this.cena.desenhar(this.mundo, this.cam, dt, {
      mira: mostrarMira && this.modo !== MODO.MENU,
      extra: (g) => {
        this.particulas.desenhar(g);
        this.textos.desenhar(g, this.cena.fonte);
      },
    });

    // A interface é desenhada numa camada própria, por cima do acabamento: se
    // ela passasse pelo bloom e pela gradação, o texto ficaria lavado e o
    // grão apareceria em cima da tipografia.
    const hud = this.cena.limparHud();
    if (hud) {
      if (this.modo === MODO.JOGO || this.modo === MODO.FIM) {
        this.hud.desenhar(hud, this.progresso(), this.cena.w, this.cena.h, dt, this.opcoes);
      }
      if (this.modo === MODO.PAUSA || this.modo === MODO.MENU) {
        hud.fillStyle = 'rgba(10,18,16,0.45)';
        hud.fillRect(0, 0, this.cena.w, this.cena.h);
      }
    }
    this.audio.tick(dt, this.modo === MODO.MENU ? 0.25 : this.intensidade());
  }

  intensidade() {
    const m = this.mundo;
    if (!m.fase) return 0;
    const total = m.brotos.length + m.orvalho.length;
    if (!total) return 0;
    const feitos = m.brotos.filter((b) => b.aberto).length + m.orvalho.filter((o) => o.pego).length;
    return clamp(feitos / total, 0, 1);
  }
}

// ---------------------------------------------------------------------------
function iniciar() {
  const app = new App();
  window.__app = app;

  /** Roda a simulação até a Bolota parar de novo (ou vencer). */
  const esperarParada = (maxQuadros) => {
    const c = app.mundo.bolota.corpo;
    let parada = 0;
    for (let n = 0; n < maxQuadros; n++) {
      app.passo(DT);
      if (app.mundo.venceu) break;
      if (app.mundo.respawn > 0) break;
      if (c.noChao && c.velocidade < 14) {   // o mesmo limiar do solucionador
        parada += DT;
        if (parada > 0.16) break;
      } else parada = 0;
    }
    return app.mundo.estado();
  };

  window.__BOLOTA__ = {
    pronto: true,
    versao: '1.0.0',
    get modo() { return app.modo; },
    get erros() { return app.erros.slice(); },
    get opcoes() { return app.opcoes; },
    get fps() { return Math.round(app.fps); },
    totalFases: FASES.length,
    modoTeste(on) { app.modoTeste = !!on; return app.modoTeste; },
    abrir(i) { app.abrirFase(i); return app.mundo.estado(); },
    /** Injeta comandos direto na simulação: é assim que o teste "joga". */
    comando(e) { app.entradaInjetada = e; },
    limparComando() { app.entradaInjetada = null; },
    passo(n = 1) { for (let i = 0; i < n; i++) app.passo(DT); return app.mundo.estado(); },
    estado() { return app.mundo.estado(); },
    progresso() { return app.progresso(); },
    dados() { return JSON.parse(JSON.stringify(app.dados)); },
    tela() { return app.telas.atual; },
    clique(a, arg) { app.acao(a, arg); },
    alvos() { return app.hud.alvos.map((a) => ({ ...a })); },
    camera() { return { x: app.cam.x, y: app.cam.y, zoom: app.cam.zoom }; },
    qualidade(q) { if (q !== undefined) app.cena.definirQualidade(q); return app.cena.qualidade; },
    arte() { return { carregadas: app.arteCarregada, catalogo: catalogo() }; },
    posfx() {
      const p = app.cena.pos;
      return { ok: p.ok, motivo: p.motivo, placa: p.placa || '' };
    },
    /** Segura, mira e solta como um humano — só que com a carga exata. */
    saltar(angulo, carga, maxQuadros = 700) {
      const quadros = Math.max(1, Math.round(carga * BOLOTA.cargaMax * 60) + 1);
      app.entradaInjetada = { segurando: true, angulo };
      for (let i = 0; i < quadros; i++) app.passo(DT);
      app.mundo.bolota.carga = carga;   // tira o erro de arredondamento do tempo
      app.entradaInjetada = { segurando: false, angulo };
      const r = esperarParada(maxQuadros);
      app.entradaInjetada = null;
      return r;
    },

    /**
     * Lança direto, sem passar pela carga — é exatamente o que o solucionador
     * simula, então um caminho provado por ele se reproduz aqui quadro a quadro.
     */
    lancarDireto(angulo, carga, maxQuadros = 220) {   // o mesmo teto da busca
      const b = app.mundo.bolota;
      b.angulo = angulo;
      b.carga = carga;
      b.lancar(app.mundo);
      return esperarParada(maxQuadros);
    },
  };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
else iniciar();
