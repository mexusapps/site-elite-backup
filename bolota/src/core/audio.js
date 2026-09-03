// ---------------------------------------------------------------------------
// audio.js — som procedural. Nenhum arquivo externo, nenhuma amostra.
//
// A paleta sonora da Bolota é MADEIRA e AR, não vidro: marimba (seno com queda
// rápida + um "toc" de ruído filtrado curtíssimo), assobios de pássaro (senoide
// com varredura de altura), vento em ruído passa-banda. A escala é pentatônica
// maior de Fá — não existe intervalo dissonante possível, então qualquer coisa
// que o jogador dispare por acaso soa bem.
//
// Três coisas fazem o som parecer "de estúdio" mesmo sendo gerado na hora:
//   1. TODO efeito tem três camadas (corpo, transiente e ar). Um som só de
//      oscilador soa barato; o transiente é o que dá presença.
//   2. Toda repetição varia ±6% de altura e ±12% de volume, então marteladas
//      seguidas nunca soam iguais (o "efeito metralhadora" some).
//   3. A CARGA é uma voz contínua: quanto mais o jogador segura, mais aguda e
//      mais aberta ela fica. O ouvido aprende a força do salto antes do olho.
// ---------------------------------------------------------------------------

// pentatônica maior de Fá: fá sol lá dó ré — a escala do "não tem nota errada"
export const ESCALA = [349.23, 392.00, 440.00, 523.25, 587.33];

const nota = (i) => {
  const n = ESCALA.length;
  const oit = Math.floor(i / n);
  return ESCALA[((i % n) + n) % n] * Math.pow(2, oit);
};

export class Audio {
  constructor() {
    this.ok = false;
    this.ctx = null;
    this.volumes = { master: 0.75, musica: 0.42, efeitos: 0.85 };
    this.ligado = true;
    this._comecou = false;
    this._proxPassaro = 0;
    this._proxNota = 0;
    this._passo = 0;
    this.intensidade = 0;   // 0..1 — quanto da fase já foi feito
    this.carga = null;
  }

  init() {
    if (this.ok) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();

      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 24;
      comp.ratio.value = 3.6; comp.attack.value = 0.004; comp.release.value = 0.28;

      this.master = this.ctx.createGain();
      this.master.gain.value = this.volumes.master;
      this.fx = this.ctx.createGain();
      this.fx.gain.value = this.volumes.efeitos;
      this.mus = this.ctx.createGain();
      this.mus.gain.value = 0;

      // reverb curto e escuro: clareira de mata, não catedral
      this.rev = this.ctx.createConvolver();
      this.rev.buffer = this._impulso(1.9, 3.0, 4200);
      this.revG = this.ctx.createGain();
      this.revG.gain.value = 0.26;
      this.rev.connect(this.revG); this.revG.connect(comp);

      this.fx.connect(comp); this.fx.connect(this.rev);
      this.mus.connect(comp); this.mus.connect(this.rev);
      comp.connect(this.master);
      this.master.connect(this.ctx.destination);

      const n = Math.floor(this.ctx.sampleRate * 2);
      const b = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      this.ruido = b;

      this._fundo();
      this.ok = true;
      return true;
    } catch (_) { return false; }
  }

  _impulso(dur, decai, corte) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * dur);
    const b = this.ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      let lp = 0;
      const k = Math.min(1, (corte || 6000) / (rate / 2));
      for (let i = 0; i < len; i++) {
        const v = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decai);
        lp += (v - lp) * k;            // um passa-baixa de um polo já basta
        d[i] = lp;
      }
    }
    return b;
  }

  retomar() {
    if (!this.ok) this.init();
    if (!this.ok) return;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    if (!this._comecou) {
      this._comecou = true;
      const t = this.ctx.currentTime;
      this._proxNota = t + 0.4;
      this._proxPassaro = t + 1.2;
      this.mus.gain.setTargetAtTime(this.volumes.musica, t, 2.2);
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

  /** Estouro de ruído filtrado: o transiente que dá matéria ao som. */
  _sopro(t0, dur, f0, f1, vol, tipo = 'bandpass', Q = 1.2, dest) {
    const g = this._env(dest || this.fx, t0, Math.min(0.02, dur * 0.2), dur, vol);
    const s = this.ctx.createBufferSource();
    s.buffer = this.ruido; s.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = tipo; f.Q.value = Q;
    f.frequency.setValueAtTime(Math.max(40, f0), t0);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t0 + dur);
    s.connect(f); f.connect(g);
    s.start(t0, Math.random() * 1.5); s.stop(t0 + dur + 0.05);
    return g;
  }

  /** Marimba: corpo senoidal com quinta e oitava, mais o "toc" da baqueta. */
  marimba(freq, t0, vol = 0.22, dur = 0.9, dest) {
    const d = dest || this.fx;
    const f = freq * (0.97 + Math.random() * 0.06);
    const v = vol * (0.88 + Math.random() * 0.24);

    const g = this._env(d, t0, 0.004, dur, v);
    const o = this.ctx.createOscillator();
    o.type = 'sine'; o.frequency.value = f;
    o.connect(g); o.start(t0); o.stop(t0 + dur + 0.05);

    // 4ª harmônica curta = a "madeira" da marimba de verdade
    const g2 = this._env(d, t0, 0.002, dur * 0.30, v * 0.30);
    const o2 = this.ctx.createOscillator();
    o2.type = 'sine'; o2.frequency.value = f * 3.99;
    o2.connect(g2); o2.start(t0); o2.stop(t0 + dur);

    const g3 = this._env(d, t0, 0.002, dur * 0.55, v * 0.16);
    const o3 = this.ctx.createOscillator();
    o3.type = 'triangle'; o3.frequency.value = f * 2;
    o3.connect(g3); o3.start(t0); o3.stop(t0 + dur);

    this._sopro(t0, 0.035, f * 6, f * 2.2, v * 0.28, 'bandpass', 2.2, d);
  }

  /** Assobio: uma senoide que varre a altura. Vira pássaro em cima disso. */
  assobio(t0, f0, f1, dur, vol, dest) {
    const g = this._env(dest || this.fx, t0, dur * 0.18, dur * 0.9, vol);
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(60, f1), t0 + dur);
    const vib = this.ctx.createOscillator();
    vib.frequency.value = 22 + Math.random() * 14;
    const vg = this.ctx.createGain(); vg.gain.value = f0 * 0.02;
    vib.connect(vg); vg.connect(o.frequency); vib.start(t0); vib.stop(t0 + dur + 0.05);
    o.connect(g); o.start(t0); o.stop(t0 + dur + 0.05);
  }

  tocar(nome, o) {
    if (!this.ligado || !this.ok || this.ctx.state !== 'running') return;
    const fn = this['_s_' + nome];
    if (fn) { try { fn.call(this, o || {}); } catch (_) {} }
  }

  // --- efeitos ---------------------------------------------------------------

  /** Voz contínua da carga: sobe de altura e abre o filtro enquanto segura. */
  iniciarCarga() {
    if (!this.ligado || !this.ok || this.ctx.state !== 'running') return;
    if (this.carga) this.pararCarga(true);
    try {
      const t = this._t();
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.1, t + 0.05);
      g.connect(this.fx);

      const o = this.ctx.createOscillator();
      o.type = 'triangle'; o.frequency.setValueAtTime(150, t);
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.setValueAtTime(500, t); f.Q.value = 3;
      o.connect(f); f.connect(g); o.start(t);

      // ar por cima: o "chiado" da tensão
      const gs = this.ctx.createGain(); gs.gain.value = 0.0;
      gs.connect(this.fx);
      const s = this.ctx.createBufferSource();
      s.buffer = this.ruido; s.loop = true;
      const fs = this.ctx.createBiquadFilter();
      fs.type = 'bandpass'; fs.frequency.setValueAtTime(700, t); fs.Q.value = 1.1;
      s.connect(fs); fs.connect(gs); s.start(t, Math.random());

      this.carga = { g, o, f, gs, s, fs };
    } catch (_) { this.carga = null; }
  }

  atualizarCarga(c) {
    if (!this.carga || !this.ok) return;
    try {
      const t = this._t();
      const k = 0.03;
      this.carga.o.frequency.setTargetAtTime(150 + c * 260, t, k);
      this.carga.f.frequency.setTargetAtTime(500 + c * 2400, t, k);
      this.carga.g.gain.setTargetAtTime(0.05 + c * 0.11, t, k);
      this.carga.gs.gain.setTargetAtTime(c * c * 0.055, t, k);
      this.carga.fs.frequency.setTargetAtTime(700 + c * 3200, t, k);
    } catch (_) {}
  }

  pararCarga(silencioso) {
    const v = this.carga;
    this.carga = null;
    if (!v || !this.ok) return;
    try {
      const t = this._t();
      v.g.gain.cancelScheduledValues(t);
      v.g.gain.setTargetAtTime(0.0001, t, silencioso ? 0.01 : 0.03);
      v.gs.gain.setTargetAtTime(0.0001, t, 0.02);
      v.o.stop(t + 0.25); v.s.stop(t + 0.25);
    } catch (_) {}
  }

  /** Lançar: "toing" de madeira, mais agudo e mais aberto conforme a força. */
  _s_lancar(o) {
    const t = this._t();
    const f = o.forca === undefined ? 0.6 : o.forca;
    const base = 190 + f * 210;

    const g = this._env(this.fx, t, 0.006, 0.30 + f * 0.2, 0.20 + f * 0.12);
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(base * 0.6, t);
    osc.frequency.exponentialRampToValueAtTime(base * 1.9, t + 0.07);
    osc.frequency.exponentialRampToValueAtTime(base * 1.1, t + 0.34);
    osc.connect(g); osc.start(t); osc.stop(t + 0.6);

    this.marimba(nota(Math.round(f * 5) + 5), t + 0.01, 0.13 + f * 0.08, 0.7);
    this._sopro(t, 0.22 + f * 0.16, 900 + f * 1400, 340, 0.05 + f * 0.05, 'bandpass', 0.9);
  }

  /** Pousar: baque abafado com folhagem. Grave e curto conforme o impacto. */
  _s_pousar(o) {
    const t = this._t();
    const i = Math.min(1, o.forca === undefined ? 0.5 : o.forca);

    const g = this._env(this.fx, t, 0.004, 0.13 + i * 0.10, 0.16 + i * 0.16);
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150 + i * 60, t);
    osc.frequency.exponentialRampToValueAtTime(58, t + 0.16 + i * 0.1);
    osc.connect(g); osc.start(t); osc.stop(t + 0.4);

    this._sopro(t, 0.09 + i * 0.08, 1500 + i * 1400, 420, 0.05 + i * 0.09, 'bandpass', 0.7);
    if (i > 0.45) this.marimba(nota(2), t + 0.02, 0.07 * i, 0.5);
  }

  /** Quicar numa parede: mais seco que o pouso. */
  _s_quique(o) {
    const t = this._t();
    const i = Math.min(1, o.forca === undefined ? 0.4 : o.forca);
    this._sopro(t, 0.06, 2200, 700, 0.04 + i * 0.07, 'bandpass', 1.4);
    const g = this._env(this.fx, t, 0.003, 0.10, 0.07 + i * 0.08);
    const osc = this.ctx.createOscillator();
    osc.type = 'sine'; osc.frequency.setValueAtTime(240 + i * 120, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.12);
    osc.connect(g); osc.start(t); osc.stop(t + 0.3);
  }

  /** Orvalho: sininho de água, subindo de altura a cada gota da sequência. */
  _s_orvalho(o) {
    const t = this._t();
    const n = (o.n || 0) % 5;
    const f = nota(n + 9);
    const g = this._env(this.fx, t, 0.002, 1.5, 0.20);
    const osc = this.ctx.createOscillator();
    osc.type = 'sine'; osc.frequency.value = f;
    const mod = this.ctx.createOscillator();
    mod.type = 'sine'; mod.frequency.value = f * 2.76;
    const mg = this.ctx.createGain();
    mg.gain.setValueAtTime(f * 1.6, t);
    mg.gain.exponentialRampToValueAtTime(f * 0.02, t + 0.6);
    mod.connect(mg); mg.connect(osc.frequency);
    osc.connect(g); osc.start(t); osc.stop(t + 1.7);
    mod.start(t); mod.stop(t + 1.7);
    this._sopro(t, 0.05, 5200, 2600, 0.05, 'bandpass', 2.6);
  }

  /** Broto que abre: acorde de madeira subindo mais um sopro de folhas. */
  _s_brotar(o) {
    const t = this._t();
    const graus = o.mola ? [0, 2, 4, 7] : [0, 1, 3, 5];
    graus.forEach((g, i) => this.marimba(nota(g + 5), t + i * 0.055, 0.17, 1.1));
    this._sopro(t, 0.9, 700, 3600, 0.055, 'bandpass', 0.8);
  }

  /** Mola de folha: um "poing" alegre. */
  _s_mola() {
    const t = this._t();
    const g = this._env(this.fx, t, 0.004, 0.34, 0.20);
    const o = this.ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(200, t);
    o.frequency.exponentialRampToValueAtTime(760, t + 0.10);
    o.frequency.exponentialRampToValueAtTime(430, t + 0.36);
    o.connect(g); o.start(t); o.stop(t + 0.55);
    this._sopro(t, 0.3, 2600, 900, 0.05, 'bandpass', 0.9);
  }

  /** Grudar numa superfície pegajosa. */
  _s_grude() {
    const t = this._t();
    this._sopro(t, 0.14, 400, 1600, 0.06, 'bandpass', 1.6);
    this.marimba(nota(1), t, 0.09, 0.4);
  }

  /** Fase completa: arpejo pentatônico subindo com sopro de amanhecer. */
  _s_vitoria() {
    const t = this._t();
    [0, 1, 2, 3, 4, 5, 6, 7].forEach((g, i) => {
      this.marimba(nota(g + 3), t + i * 0.10, 0.21, 1.7);
      if (i > 3) this.marimba(nota(g + 8), t + i * 0.10 + 0.02, 0.09, 1.4);
    });
    this._sopro(t, 2.4, 480, 3400, 0.07, 'bandpass', 0.7);
    this.assobio(t + 0.9, 1500, 2600, 0.22, 0.06);
    this.assobio(t + 1.2, 2400, 1700, 0.18, 0.05);
  }

  /** Nova habilidade aprendida — o momento de evolução do personagem. */
  _s_evoluir() {
    const t = this._t();
    [0, 2, 4, 7, 9, 11, 14].forEach((g, i) =>
      this.marimba(nota(g + 4), t + i * 0.07, 0.20, 2.2));
    this._sopro(t, 1.6, 900, 5200, 0.08, 'bandpass', 0.6);
  }

  /** Voltar ao ponto seguro: gentil, nunca punitivo. */
  _s_voltar() {
    const t = this._t();
    this.marimba(nota(4), t, 0.14, 0.9);
    this.marimba(nota(2), t + 0.09, 0.12, 1.1);
    this._sopro(t, 0.5, 2200, 700, 0.04, 'bandpass', 0.9);
  }

  _s_ui(o) {
    const t = this._t();
    this.marimba(nota(o.forte ? 6 : 3), t, o.forte ? 0.16 : 0.10, o.forte ? 0.8 : 0.45);
  }

  // --- fundo ------------------------------------------------------------------
  _fundo() {
    const t = this.ctx.currentTime;
    this.camadas = {};
    const mk = (v) => { const g = this.ctx.createGain(); g.gain.value = v; g.connect(this.mus); return g; };
    this.camadas.base = mk(0);
    this.camadas.aberta = mk(0);
    this.camadas.vento = mk(0);

    // colchão de madeira grave (fá + dó)
    const a = this.ctx.createOscillator(); a.type = 'triangle'; a.frequency.value = 87.31;
    const b = this.ctx.createOscillator(); b.type = 'sine'; b.frequency.value = 130.81;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380; f.Q.value = 1.1;
    a.connect(f); b.connect(f); f.connect(this.camadas.base);
    a.start(t); b.start(t);

    // camada que abre conforme a fase avança
    const c = this.ctx.createOscillator(); c.type = 'sine'; c.frequency.value = 349.23;
    const d = this.ctx.createOscillator(); d.type = 'sine'; d.frequency.value = 523.25;
    const f2 = this.ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 1500;
    const g2 = this.ctx.createGain(); g2.gain.value = 0.34;
    c.connect(f2); d.connect(f2); f2.connect(g2); g2.connect(this.camadas.aberta);
    c.start(t); d.start(t);

    // vento: ruído passa-banda com o corte respirando devagar
    const s = this.ctx.createBufferSource();
    s.buffer = this.ruido; s.loop = true;
    const fv = this.ctx.createBiquadFilter();
    fv.type = 'bandpass'; fv.frequency.value = 520; fv.Q.value = 0.6;
    s.connect(fv); fv.connect(this.camadas.vento); s.start(t);
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.055;
    const lg = this.ctx.createGain(); lg.gain.value = 320;
    lfo.connect(lg); lg.connect(fv.frequency); lfo.start(t);

    const lfo2 = this.ctx.createOscillator(); lfo2.frequency.value = 0.033;
    const lg2 = this.ctx.createGain(); lg2.gain.value = 110;
    lfo2.connect(lg2); lg2.connect(f.frequency); lfo2.start(t);
  }

  /** Um pássaro: duas ou três notinhas varridas, sempre diferentes. */
  _passaro(t0) {
    const n = 2 + (Math.random() < 0.4 ? 1 : 0);
    const base = 1500 + Math.random() * 1400;
    for (let i = 0; i < n; i++) {
      const sobe = Math.random() < 0.6;
      const f0 = base * (0.9 + Math.random() * 0.3);
      const f1 = f0 * (sobe ? 1.35 + Math.random() * 0.5 : 0.62 + Math.random() * 0.2);
      this.assobio(t0 + i * (0.07 + Math.random() * 0.08), f0, f1,
        0.05 + Math.random() * 0.07, 0.030 + Math.random() * 0.020, this.mus);
    }
  }

  /**
   * @param {number} intensidade 0..1 — progresso na fase; abre a música.
   */
  tick(dt, intensidade) {
    if (!this.ok || !this._comecou || this.ctx.state !== 'running') return;
    this.intensidade = intensidade;
    const t = this.ctx.currentTime;
    this.camadas.base.gain.setTargetAtTime(0.30, t, 2.0);
    this.camadas.aberta.gain.setTargetAtTime(0.04 + 0.30 * intensidade, t, 2.0);
    this.camadas.vento.gain.setTargetAtTime(0.055, t, 2.0);

    // marimba esparsa: nunca insistente, sempre dentro da pentatônica
    let guarda = 0;
    while (this._proxNota < t + 0.5 && guarda++ < 24) {
      if (this._passo % 4 === 0 && Math.random() < 0.30 + intensidade * 0.35) {
        const g = [0, 2, 4, 5, 7, 9][Math.floor(Math.random() * 6)];
        this.marimba(nota(g + (Math.random() < 0.3 ? 10 : 5)), this._proxNota,
          0.035 + intensidade * 0.025, 1.6, this.mus);
      }
      this._proxNota += 0.5;
      this._passo = (this._passo + 1) % 64;
    }

    if (t > this._proxPassaro) {
      this._passaro(t + 0.05);
      this._proxPassaro = t + 3.5 + Math.random() * 7.5;
    }
  }
}

export const audio = new Audio();
