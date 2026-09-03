// ---------------------------------------------------------------------------
// main.js — casca do jogo: laço de passo fixo, máquina de estados das telas,
// persistência e a API de depuração que o harness de playtest usa.
//
// O laço roda a simulação a 60 Hz exatos, independente da taxa de quadros do
// monitor. Sem isso a física muda de comportamento em cada máquina e nenhum
// teste determinístico é possível.
// ---------------------------------------------------------------------------

import { Input, DEFAULT_BINDS } from './core/input.js';
import { audio } from './core/audio.js';
import { load as loadSave, save as writeSave, wipe as wipeSave } from './core/save.js';
import { Renderer } from './render/draw.js';
import { Hud } from './ui/hud.js';
import { Screens } from './ui/screens.js';
import { World, RUN } from './game/world.js';
import { SIM_DT, PALETTES, TOTAL_WAVES } from './game/balance.js';
import { clamp } from './core/math.js';
import { visualRng } from './core/rng.js';
import { P_SPARK } from './core/fx.js';

const MODE = { MENU: 'menu', JOGO: 'jogo', PAUSA: 'pausa', RECOMPENSA: 'recompensa', FIM: 'fim' };

class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.uiRoot = document.getElementById('ui');
    this.renderer = new Renderer(this.canvas);
    this.input = new Input(this.canvas);
    this.audio = audio;
    this.hud = new Hud();

    this.save = loadSave();
    this.settings = this.save.settings;
    if (this.settings.binds) {
      this.input.binds = { ...DEFAULT_BINDS, ...this.settings.binds };
      this.input.rebuild();
    }

    this.world = new World(this.input, this.audio, this.settings);
    this.world.onEvent = (e) => this.onWorldEvent(e);
    this.screens = new Screens(this.uiRoot, this);

    this.mode = MODE.MENU;
    this.prevScreen = 'title';
    this.acc = 0;
    this.last = 0;
    this.simTime = 0;
    this.fps = 60;
    this.testMode = false;
    this.errors = [];
    this.menuT = 0;

    this.applySettings();
    this.resize();
    window.addEventListener('resize', () => this.resize());

    const kick = () => { this.audio.resume(); };
    window.addEventListener('pointerdown', kick, { once: false });
    window.addEventListener('keydown', kick, { once: false });

    window.addEventListener('error', (e) => {
      this.errors.push(String(e.message || e.error));
    });
    window.addEventListener('unhandledrejection', (e) => {
      this.errors.push('promise: ' + String(e.reason));
    });

    this.world.start(this.newSeed());   // mundo válido já no menu, para o fundo
    this.seedMenuEmbers();              // a primeira imagem já tem atmosfera
    this.setMode(MODE.MENU, 'title');
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  newSeed() { return (Math.random() * 0xffffffff) >>> 0; }

  /** Preenche o fundo do menu antes do primeiro quadro, em vez de esperar. */
  seedMenuEmbers() {
    const w = this.world, c = w.camera;
    for (let i = 0; i < 55; i++) {
      w.particles.spawn(P_SPARK,
        c.x + visualRng.range(-c.w, c.w) / 2,
        c.y + visualRng.range(-c.h, c.h) / 2,
        visualRng.range(-14, 14), -visualRng.range(24, 70),
        visualRng.range(0.4, 3.4), visualRng.range(1.4, 3), w.pal.ember, { drag: 0.995 });
    }
  }

  // ==========================================================================
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(320, window.innerWidth);
    const h = Math.max(240, window.innerHeight);
    this.renderer.resize(w, h, dpr);
    this.world.camera.resize(w, h);
    this.hudScale = clamp(Math.min(w / 1280, h / 720), 0.68, 1.35) * (this.settings.textScale > 1 ? 1.08 : 1);
  }

  applySettings() {
    const s = this.settings;
    this.audio.setVolumes({ master: s.master, music: s.music, sfx: s.sfx });
    this.world.camera.scale = s.shake;
    this.world.flash.scale = s.flash;
    this.world.applyPalette(s.palette);
    this.renderer.floorPat = null;
    document.documentElement.style.setProperty('--tscale', String(s.textScale));
    document.documentElement.dataset.palette = s.palette;
    this.persist();
  }

  setSetting(key, value) {
    this.settings[key] = value;
    this.applySettings();
    if (key === 'textScale') this.resize();
  }

  persist() {
    this.save.settings = this.settings;
    this.settings.binds = this.input.binds;
    writeSave(this.save);
  }

  captureBind(action, slot, done) {
    this.input.capture = (code) => {
      this.input.setBind(action, slot, code);
      this.persist();
      done();
    };
  }

  // ==========================================================================
  setMode(mode, screen) {
    this.mode = mode;
    this.screens.show(screen || null);
    document.body.classList.toggle('playing', mode === MODE.JOGO);
  }

  uiAction(act) {
    this.audio.resume();
    this.audio.play('ui', { strong: act === 'play' || act === 'retry' });
    switch (act) {
      case 'play':
      case 'retry':
        this.startRun(this.newSeed());
        break;
      case 'howto': this.prevScreen = this.screens.current; this.setMode(MODE.MENU, 'howto'); break;
      case 'options': this.prevScreen = this.screens.current; this.setMode(this.mode, 'options'); break;
      case 'stats': this.prevScreen = this.screens.current; this.setMode(MODE.MENU, 'stats'); break;
      case 'credits': this.prevScreen = this.screens.current; this.setMode(MODE.MENU, 'credits'); break;
      case 'back':
        if (this.prevScreen === 'pause') this.setMode(MODE.PAUSA, 'pause');
        else this.setMode(MODE.MENU, this.prevScreen === 'title' ? 'title' : 'title');
        this.prevScreen = 'title';
        break;
      case 'resume': this.setMode(MODE.JOGO, null); break;
      case 'quit': this.endRun(false); this.setMode(MODE.MENU, 'title'); break;
      case 'menu': this.setMode(MODE.MENU, 'title'); break;
      case 'resetbinds': this.input.resetBinds(); this.persist(); this.screens.renderBinds(); break;
      case 'wipe':
        this.save = wipeSave();
        this.settings = this.save.settings;
        this.world.settings = this.settings;
        this.input.resetBinds();
        this.applySettings();
        this.screens.syncOutputs();
        this.screens.renderBinds();
        break;
      case 'pick': break;
      default: break;
    }
  }

  startRun(seed) {
    this.audio.resume();
    // O estado do input precisa zerar junto com a partida: mira herdada e
    // comandos ainda no buffer quebram o determinismo entre duas execuções
    // com a mesma semente — e o determinismo é a base de todo o teste.
    this.input.clearInjected();
    this.input.held.clear();
    this.input.prev.clear();
    this.input.bufferedAt = Object.create(null);
    this.input.aim.x = 0; this.input.aim.y = -1;
    this.input.aimFromPad = false;
    this.input.mouse.moved = false;
    this.simTime = 0;
    this.world.settings = this.settings;
    this.world.start(seed, { assist: this.settings.assist });
    this.save.stats.runs++;
    this.persist();
    this.setMode(MODE.JOGO, null);
  }

  onWorldEvent(ev) {
    if (ev === 'recompensa') {
      this.screens.renderUpgrades(this.world.offers, this.world.taken);
      this.setMode(MODE.RECOMPENSA, 'upgrade');
    } else if (ev === 'derrota') {
      this.endRun(false);
      this.screens.renderRun('gameover', this.world, this.save);
      this.setMode(MODE.FIM, 'gameover');
    } else if (ev === 'vitoria') {
      this.endRun(true);
      this.screens.renderRun('victory', this.world, this.save);
      this.setMode(MODE.FIM, 'victory');
    }
  }

  endRun(won) {
    const w = this.world, st = this.save.stats;
    st.kills += w.stats.kills;
    st.embers += w.stats.embers;
    st.bestWave = Math.max(st.bestWave || 0, w.wave);
    st.bestScore = Math.max(st.bestScore || 0, w.score);
    if (won) {
      st.wins++;
      if (!st.bestTime || w.time < st.bestTime) st.bestTime = w.time;
    } else {
      st.deaths++;
    }
    this.persist();
  }

  pickUpgrade(i) {
    if (this.mode !== MODE.RECOMPENSA) return false;
    if (!this.world.offers || !this.world.offers[i]) return false;
    this.world.chooseUpgrade(i);
    this.setMode(MODE.JOGO, null);
    return true;
  }

  // ==========================================================================
  loop(now) {
    requestAnimationFrame(this.loop);
    if (!this.last) this.last = now;
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.25) dt = 0.25;              // janela minimizada não deve acumular
    this.fps = this.fps * 0.92 + (1 / Math.max(dt, 0.0001)) * 0.08;

    if (!this.testMode) {
      this.acc += dt;
      let steps = 0;
      while (this.acc >= SIM_DT && steps < 5) {
        this.tick(SIM_DT);
        this.acc -= SIM_DT;
        steps++;
      }
      if (steps === 5) this.acc = 0;
    }
    this.render(dt);
  }

  /** Um passo fixo da simulação. Único ponto de avanço do tempo do jogo. */
  tick(dt) {
    this.simTime += dt * 1000;
    this.input.beginFrame(this.simTime);

    if (this.mode === MODE.JOGO) {
      if (this.input.justPressed('pause')) {
        this.setMode(MODE.PAUSA, 'pause');
        this.updatePauseInfo();
        this.input.consume('pause');
      } else {
        this.world.step(dt);
      }
    } else if (this.mode === MODE.PAUSA) {
      if (this.input.justPressed('pause') && this.screens.current === 'pause') {
        this.setMode(MODE.JOGO, null);
      }
    } else if (this.mode === MODE.RECOMPENSA) {
      for (let i = 0; i < 3; i++) {
        if (this.input.isDown('confirm') && i === 0) break;
      }
    } else if (this.mode === MODE.MENU) {
      this.menuT += dt;
      // fagulhas subindo no fundo do menu
      if (visualRng.chance(dt * 12)) {
        const w = this.world;
        this.world.particles.spawn(P_SPARK,
          w.camera.x + visualRng.range(-w.camera.w / 2, w.camera.w / 2),
          w.camera.y + w.camera.h / 2 + 20,
          visualRng.range(-14, 14), -visualRng.range(24, 70),
          visualRng.range(1.6, 3.4), visualRng.range(1.4, 3), w.pal.ember, { drag: 0.995 });
      }
      this.world.particles.update(dt);
      this.world.camera.update(dt);
    }
  }

  updatePauseInfo() {
    const el = this.uiRoot.querySelector('[data-pauseinfo]');
    if (el) {
      const w = this.world;
      el.textContent = `Onda ${w.wave} de ${TOTAL_WAVES} · ${w.score.toLocaleString('pt-BR')} pontos · ${w.stats.kills} apagados`;
    }
  }

  render(dt) {
    const r = this.renderer;
    const w = this.world;

    if (this.mode === MODE.MENU) {
      r.renderMenu(w, dt);
      this.audio.tick(dt, 0.06, false);
      return;
    }

    r.render(w, dt, 0);
    const ctx = r.ctx;
    ctx.setTransform(r.dpr, 0, 0, r.dpr, 0, 0);
    this.hud.draw(ctx, w, dt, r.w, r.h, this.hudScale);
    if (this.mode !== MODE.JOGO) {
      ctx.fillStyle = 'rgba(6,4,10,0.62)';
      ctx.fillRect(0, 0, r.w, r.h);
    }
    this.audio.tick(dt, this.intensity(), !!(w.boss && w.boss.alive && this.mode === MODE.JOGO));
  }

  intensity() {
    if (this.mode !== MODE.JOGO) return 0.06;
    const w = this.world;
    const pressure = clamp((w.enemies.length + (w.boss && w.boss.alive ? 8 : 0)) / 16, 0, 1);
    const waveK = clamp(w.wave / TOTAL_WAVES, 0, 1);
    const danger = 1 - clamp(w.player.flame / w.player.maxFlame, 0, 1);
    return clamp(pressure * 0.5 + waveK * 0.3 + danger * 0.3, 0, 1);
  }
}

// --- atalhos globais que não passam pelo mapa de ações -----------------------
window.addEventListener('keydown', (e) => {
  const g = window.__game;
  if (!g || g.input.capture) return;
  if (g.mode === MODE.RECOMPENSA && ['1', '2', '3'].includes(e.key)) {
    g.pickUpgrade(parseInt(e.key, 10) - 1);
    e.preventDefault();
  }
  if (e.key === 'Escape') {
    if (g.mode === MODE.MENU && g.screens.current !== 'title') { g.uiAction('back'); e.preventDefault(); }
    else if (g.mode === MODE.PAUSA && g.screens.current === 'options') { g.setMode(MODE.PAUSA, 'pause'); e.preventDefault(); }
  }
});

function boot() {
  const g = new Game();
  window.__game = g;

  // ---- API de depuração: é por ela que o harness dirige o jogo -------------
  window.__BRASA__ = {
    ready: true,
    version: '1.0.0',
    get mode() { return g.mode; },
    get errors() { return g.errors.slice(); },
    get settings() { return g.settings; },
    get fps() { return Math.round(g.fps); },

    setTestMode(on) { g.testMode = !!on; return g.testMode; },
    startRun(seed, opts) {
      g.startRun(seed >>> 0);
      if (opts && opts.assist !== undefined) g.settings.assist = opts.assist;
      return g.world.snapshot();
    },
    /** Avança N passos fixos de simulação, sem depender de rAF. */
    step(n = 1) {
      for (let i = 0; i < n; i++) g.tick(SIM_DT);
      return g.world.snapshot();
    },
    press(a) { g.input.inject(a, true); },
    release(a) { g.input.inject(a, false); },
    tap(a) { g.input.inject(a, true); g.tick(SIM_DT); g.input.inject(a, false); },
    clearInput() { g.input.clearInjected(); },
    aim(x, y) { g.input.aimFromPad = true; const m = Math.hypot(x, y) || 1; g.input.aim.x = x / m; g.input.aim.y = y / m; },

    snapshot() { return g.world.snapshot(); },
    world() { return g.world; },
    ui() { return g.screens.current; },
    click(act) { g.uiAction(act); },
    pick(i) { return g.pickUpgrade(i); },

    // atalhos de teste
    setFlame(v) { g.world.player.flame = v; },
    god(on) { g.world.player.iframes = on ? 1e9 : 0; },
    killAll() {
      for (const e of g.world.enemies) g.world.killEnemy(e, e.x, e.y);
      g.world.pendingSpawns.length = 0;
      if (g.world.boss && g.world.boss.alive) { g.world.boss.hp = 0; g.world.killEnemy(g.world.boss, 0, 0); }
    },
    skipToWave(n) {
      g.world.wave = Math.max(1, Math.min(n, TOTAL_WAVES) - 1);
      g.world.chooseUpgradeSkip = true;
      g.world.beginWave(Math.max(1, Math.min(n, TOTAL_WAVES)));
      return g.world.snapshot();
    },
    damageBoss(v) {
      const b = g.world.boss;
      if (!b || !b.alive) return;
      b.hp -= v;
      if (b.hp <= 0) g.world.killEnemy(b, b.x, b.y);
    },
  };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
