// ---------------------------------------------------------------------------
// audio.js — som procedural. Nenhum arquivo externo.
//
// A ideia central: **cada cor é uma nota**. Vermelho é dó, verde é mi, azul é
// sol. Então luz branca (as três juntas) toca um acorde maior, amarelo toca a
// terça, ciano toca a quinta. Quem não distingue as cores na tela distingue no
// ouvido — é a mesma informação, por outro canal.
//
// Instrumento: sino por FM (portadora + modulante em razão inarmônica, ataque
// instantâneo e cauda longa), que é o timbre de vidro e cristal.
// ---------------------------------------------------------------------------

export const NOTA_COR = { 1: 261.63, 2: 329.63, 4: 392.0 };   // dó, mi, sol

export class Audio {
  constructor() {
    this.ok = false;
    this.ctx = null;
    this.volumes = { master: 0.75, musica: 0.45, efeitos: 0.85 };
    this.ligado = true;
    this._comecou = false;
    this._proxima = 0;
    this._passo = 0;
    this.claridade = 0;          // 0 = noite, 1 = amanhecer
  }

  init() {
    if (this.ok) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -18; comp.knee.value = 26;
      comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.3;

      this.master = this.ctx.createGain();
      this.master.gain.value = this.volumes.master;
      this.fx = this.ctx.createGain();
      this.fx.gain.value = this.volumes.efeitos;
      this.mus = this.ctx.createGain();
      this.mus.gain.value = 0;

      // reverberação longa: sino em sala grande, que é o clima do jardim à noite
      this.rev = this.ctx.createConvolver();
      this.rev.buffer = this._impulso(3.2, 2.2);
      this.revG = this.ctx.createGain();
      this.revG.gain.value = 0.34;
      this.rev.connect(this.revG); this.revG.connect(comp);

      this.fx.connect(comp); this.fx.connect(this.rev);
      this.mus.connect(comp); this.mus.connect(this.rev);
      comp.connect(this.master);
      this.master.connect(this.ctx.destination);

      const n = this.ctx.sampleRate * 2;
      const b = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      this.ruido = b;

      this._pad();
      this.ok = true;
      return true;
    } catch (_) { return false; }
  }

  _impulso(dur, decai) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * dur);
    const b = this.ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decai);
    }
    return b;
  }

  retomar() {
    if (!this.ok) this.init();
    if (!this.ok) return;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    if (!this._comecou) {
      this._comecou = true;
      this._proxima = this.ctx.currentTime + 0.2;
      this.mus.gain.setTargetAtTime(this.volumes.musica, this.ctx.currentTime, 2.5);
    }
  }

  setVolumes(v) {
    Object.assign(this.volumes, v);
    if (!this.ok) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.volumes.master, t, 0.05);
    this.fx.gain.setTargetAtTime(this.volumes.efeitos, t, 0.05);
    if (this._comecou) this.mus.gain.setTargetAtTime(this.volumes.musica, t, 0.3);
  }

  _t() { return this.ctx.currentTime; }

  _env(dest, t0, a, d, pico) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(pico, 0.0002), t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
    g.connect(dest);
    return g;
  }

  /** Sino de vidro por FM. `brilho` mexe na razão inarmônica. */
  sino(freq, t0, vol = 0.25, dur = 2.4, brilho = 3.51, dest) {
    const d = dest || this.fx;
    const g = this._env(d, t0, 0.003, dur, vol);
    const port = this.ctx.createOscillator();
    port.type = 'sine';
    port.frequency.value = freq;

    const mod = this.ctx.createOscillator();
    mod.type = 'sine';
    mod.frequency.value = freq * brilho;
    const modG = this.ctx.createGain();
    modG.gain.setValueAtTime(freq * 2.4, t0);
    modG.gain.exponentialRampToValueAtTime(freq * 0.02, t0 + dur * 0.5);
    mod.connect(modG); modG.connect(port.frequency);

    port.connect(g);
    port.start(t0); port.stop(t0 + dur + 0.05);
    mod.start(t0); mod.stop(t0 + dur + 0.05);

    // um harmônico curtinho por cima dá o "tec" do vidro
    const g2 = this._env(d, t0, 0.001, 0.14, vol * 0.4);
    const o2 = this.ctx.createOscillator();
    o2.type = 'sine'; o2.frequency.value = freq * 5.4;
    o2.connect(g2); o2.start(t0); o2.stop(t0 + 0.2);
  }

  /** Toca a cor: cada bit da máscara vira uma nota do acorde. */
  acorde(mask, t0, vol = 0.24, dur = 2.4, oitava = 1) {
    let i = 0;
    for (const bit of [1, 2, 4]) {
      if (!(mask & bit)) continue;
      this.sino(NOTA_COR[bit] * oitava, t0 + i * 0.035, vol, dur, 3.51 + i * 0.4);
      i++;
    }
  }

  tocar(nome, o) {
    if (!this.ligado || !this.ok || this.ctx.state !== 'running') return;
    const fn = this['_s_' + nome];
    if (fn) { try { fn.call(this, o || {}); } catch (_) {} }
  }

  _s_flor(o) {
    const t = this._t();
    this.acorde(o.mask || 7, t, 0.26, 2.8, 2);
    const g = this._env(this.fx, t, 0.02, 0.9, 0.07);
    const s = this.ctx.createBufferSource();
    s.buffer = this.ruido; s.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.setValueAtTime(2600, t); f.Q.value = 1.4;
    f.frequency.exponentialRampToValueAtTime(7000, t + 0.7);
    s.connect(f); f.connect(g);
    s.start(t, Math.random()); s.stop(t + 1);
  }

  _s_colocar(o) {
    const t = this._t();
    this.sino(520 + (o.n || 0) * 40, t, 0.16, 0.7, 2.8);
    const g = this._env(this.fx, t, 0.001, 0.05, 0.09);
    const s = this.ctx.createBufferSource();
    s.buffer = this.ruido; s.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 3400;
    s.connect(f); f.connect(g);
    s.start(t, Math.random()); s.stop(t + 0.08);
  }

  _s_girar() {
    const t = this._t();
    this.sino(700, t, 0.12, 0.45, 4.2);
    this.sino(1050, t + 0.03, 0.07, 0.3, 5.1);
  }

  _s_tirar() {
    const t = this._t();
    this.sino(360, t, 0.12, 0.5, 2.4);
  }

  _s_completo() {
    const t = this._t();
    const graus = [0, 4, 7, 12, 16, 19, 24];
    graus.forEach((g, i) => {
      this.sino(261.63 * Math.pow(2, g / 12), t + i * 0.1, 0.22, 3.2, 3.2 + i * 0.15);
    });
    // sopro de amanhecer
    const g = this._env(this.fx, t, 0.6, 2.6, 0.09);
    const s = this.ctx.createBufferSource();
    s.buffer = this.ruido; s.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.setValueAtTime(500, t); f.Q.value = 0.8;
    f.frequency.exponentialRampToValueAtTime(3200, t + 2.4);
    s.connect(f); f.connect(g);
    s.start(t, Math.random()); s.stop(t + 3.2);
  }

  _s_dica() {
    const t = this._t();
    this.sino(587.33, t, 0.16, 1.1, 3.0);
    this.sino(783.99, t + 0.14, 0.14, 1.3, 3.0);
  }

  _s_ui(o) {
    const t = this._t();
    this.sino(o.forte ? 660 : 440, t, o.forte ? 0.16 : 0.1, 0.6, 3.0);
  }

  // --- fundo -----------------------------------------------------------------
  _pad() {
    const t = this.ctx.currentTime;
    this.camadas = {};
    const mk = (v) => { const g = this.ctx.createGain(); g.gain.value = v; g.connect(this.mus); return g; };
    this.camadas.noite = mk(0.0);
    this.camadas.dia = mk(0.0);

    // colchão grave contínuo
    const a = this.ctx.createOscillator(); a.type = 'triangle'; a.frequency.value = 65.4;
    const b = this.ctx.createOscillator(); b.type = 'triangle'; b.frequency.value = 98.0;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; f.Q.value = 1.2;
    a.connect(f); b.connect(f); f.connect(this.camadas.noite);
    a.start(t); b.start(t);

    // camada de dia: quinta acima, mais aberta
    const c = this.ctx.createOscillator(); c.type = 'triangle'; c.frequency.value = 196.0;
    const d = this.ctx.createOscillator(); d.type = 'sine'; d.frequency.value = 261.63;
    const f2 = this.ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 1200;
    const g2 = this.ctx.createGain(); g2.gain.value = 0.5;
    c.connect(f2); d.connect(f2); f2.connect(g2); g2.connect(this.camadas.dia);
    c.start(t); d.start(t);

    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lg = this.ctx.createGain(); lg.gain.value = 120;
    lfo.connect(lg); lg.connect(f.frequency); lfo.start(t);
  }

  /** `claridade` 0..1 é a fração de flores já acordadas na fase. */
  tick(dt, claridade) {
    if (!this.ok || !this._comecou || this.ctx.state !== 'running') return;
    this.claridade = claridade;
    const t = this.ctx.currentTime;
    this.camadas.noite.gain.setTargetAtTime(0.32 * (1 - claridade * 0.55), t, 1.5);
    this.camadas.dia.gain.setTargetAtTime(0.05 + 0.3 * claridade, t, 1.5);

    // sinos distantes, cada vez mais frequentes conforme amanhece
    const spb = 60 / 60;
    let guarda = 0;
    while (this._proxima < t + 0.4 && guarda++ < 16) {
      if ((this._passo % 8 === 0 && Math.random() < 0.35 + claridade * 0.4)) {
        const graus = [0, 4, 7, 12, 16];
        const g = graus[Math.floor(Math.random() * graus.length)];
        this.sino(261.63 * Math.pow(2, g / 12) * (Math.random() < 0.5 ? 1 : 2),
          this._proxima, 0.04 + claridade * 0.03, 3.4, 3.4, this.mus);
      }
      this._proxima += spb;
      this._passo = (this._passo + 1) % 64;
    }
  }
}

export const audio = new Audio();
