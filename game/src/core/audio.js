// ---------------------------------------------------------------------------
// audio.js — som 100% procedural (WebAudio). Nenhum arquivo externo: a página
// publicada não pode buscar mídia, e o jogo precisa soar completo mesmo assim.
//
// Regras aplicadas em cada efeito, tiradas da prática de sound design:
//   • três camadas por evento: transiente (ataque) + corpo + cauda;
//   • variação de afinação de ±5% a cada disparo, para nunca soar repetido;
//   • limite de vozes simultâneas por efeito, senão 20 mortes juntas estouram.
// A trilha é adaptativa: camadas entram e saem conforme a intensidade da onda.
// ---------------------------------------------------------------------------

const SCALE = [0, 3, 5, 7, 10, 12, 15];     // pentatônica menor
const ROOT = 55;                             // Lá1

export class Audio {
  constructor() {
    this.ok = false;
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.volumes = { master: 0.8, sfx: 0.9, music: 0.6 };
    this.intensity = 0;         // 0..1 — alimenta a trilha
    this.combat = 0;            // sobe ao levar/dar dano, decai sozinho
    this._voices = Object.create(null);
    this._nextNote = 0;
    this._step = 0;
    this._started = false;
  }

  init() {
    if (this.ok) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.knee.value = 22;
      comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.22;

      this.master = this.ctx.createGain();
      this.master.gain.value = this.volumes.master;
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = this.volumes.sfx;
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0;             // sobe no fade-in

      this.sfxBus.connect(comp);
      this.musicBus.connect(comp);
      comp.connect(this.master);
      this.master.connect(this.ctx.destination);

      // ruído branco reaproveitado por todos os efeitos percussivos
      const len = this.ctx.sampleRate * 2;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;

      this._buildMusic();
      this.ok = true;
      return true;
    } catch (_) {
      this.ok = false;
      return false;
    }
  }

  /** Navegadores exigem gesto do usuário para iniciar áudio. */
  resume() {
    if (!this.ok) this.init();
    if (this.ok && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    if (this.ok && !this._started) {
      this._started = true;
      this._nextNote = this.ctx.currentTime + 0.1;
      this.musicBus.gain.setTargetAtTime(this.volumes.music, this.ctx.currentTime, 1.5);
    }
  }

  setVolumes(v) {
    Object.assign(this.volumes, v);
    if (!this.ok) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.volumes.master, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.volumes.sfx, t, 0.05);
    if (this._started) this.musicBus.gain.setTargetAtTime(this.volumes.music, t, 0.2);
  }

  // --- utilidades de síntese ----------------------------------------------
  _t() { return this.ctx.currentTime; }

  _voiceOk(key, max) {
    const n = this._voices[key] || 0;
    if (n >= max) return false;
    this._voices[key] = n + 1;
    return true;
  }
  _voiceDone(key, after) {
    setTimeout(() => { this._voices[key] = Math.max(0, (this._voices[key] || 1) - 1); }, after * 1000);
  }

  _env(dest, t0, a, d, peak) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
    g.connect(dest);
    return g;
  }

  _osc(type, freq, t0, dur, gainNode, detune = 0) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (detune) o.detune.setValueAtTime(detune, t0);
    o.connect(gainNode);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
    return o;
  }

  _noise(t0, dur, gainNode, filterType, freq, q = 1) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    s.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = filterType; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
    s.connect(f); f.connect(gainNode);
    s.start(t0, Math.random() * 1.5);
    s.stop(t0 + dur + 0.02);
    return { src: s, filter: f };
  }

  /** ±5% de variação — o detalhe que impede a fadiga auditiva. */
  _vary(f) { return f * (0.95 + Math.random() * 0.1); }

  // --- efeitos -------------------------------------------------------------
  play(name, opts) {
    if (!this.enabled || !this.ok || this.ctx.state !== 'running') return;
    const fn = this['_sfx_' + name];
    if (fn) { try { fn.call(this, opts || {}); } catch (_) {} }
  }

  _sfx_swing() {
    if (!this._voiceOk('swing', 4)) return; this._voiceDone('swing', 0.3);
    const t = this._t();
    const g = this._env(this.sfxBus, t, 0.008, 0.16, 0.22);
    const n = this._noise(t, 0.18, g, 'bandpass', this._vary(1400), 1.4);
    n.filter.frequency.exponentialRampToValueAtTime(this._vary(380), t + 0.17);
  }

  _sfx_hit(o) {
    if (!this._voiceOk('hit', 6)) return; this._voiceDone('hit', 0.35);
    const t = this._t();
    const heavy = !!o.heavy;
    // transiente
    const gt = this._env(this.sfxBus, t, 0.002, heavy ? 0.09 : 0.05, heavy ? 0.5 : 0.34);
    this._noise(t, 0.09, gt, 'highpass', this._vary(2400));
    // corpo
    const gb = this._env(this.sfxBus, t, 0.004, heavy ? 0.22 : 0.12, heavy ? 0.42 : 0.26);
    const f = this._vary(heavy ? 130 : 210);
    const ob = this._osc('triangle', f, t, 0.3, gb);
    ob.frequency.exponentialRampToValueAtTime(f * 0.45, t + (heavy ? 0.22 : 0.12));
    // cauda
    const gc = this._env(this.sfxBus, t + 0.01, 0.01, heavy ? 0.4 : 0.2, 0.1);
    const n2 = this._noise(t + 0.01, 0.4, gc, 'lowpass', this._vary(900), 0.7);
    n2.filter.frequency.exponentialRampToValueAtTime(220, t + 0.35);
    this.combat = Math.min(1, this.combat + 0.16);
  }

  _sfx_shoot() {
    if (!this._voiceOk('shoot', 5)) return; this._voiceDone('shoot', 0.3);
    const t = this._t();
    const g = this._env(this.sfxBus, t, 0.003, 0.16, 0.3);
    const f = this._vary(760);
    const o = this._osc('sawtooth', f, t, 0.2, g);
    o.frequency.exponentialRampToValueAtTime(f * 0.35, t + 0.15);
    const g2 = this._env(this.sfxBus, t, 0.002, 0.06, 0.18);
    this._noise(t, 0.07, g2, 'highpass', 1800);
  }

  _sfx_dash() {
    if (!this._voiceOk('dash', 3)) return; this._voiceDone('dash', 0.4);
    const t = this._t();
    const g = this._env(this.sfxBus, t, 0.01, 0.3, 0.3);
    const n = this._noise(t, 0.34, g, 'bandpass', 420, 0.9);
    n.filter.frequency.exponentialRampToValueAtTime(2600, t + 0.16);
    n.filter.frequency.exponentialRampToValueAtTime(300, t + 0.33);
    const g2 = this._env(this.sfxBus, t, 0.004, 0.2, 0.14);
    const o = this._osc('sine', this._vary(180), t, 0.25, g2);
    o.frequency.exponentialRampToValueAtTime(90, t + 0.2);
  }

  _sfx_ember() {
    if (!this._voiceOk('ember', 5)) return; this._voiceDone('ember', 0.25);
    const t = this._t();
    const g = this._env(this.sfxBus, t, 0.004, 0.14, 0.16);
    const base = this._vary(880);
    const o = this._osc('sine', base, t, 0.18, g);
    o.frequency.exponentialRampToValueAtTime(base * 1.6, t + 0.1);
  }

  _sfx_hurt() {
    const t = this._t();
    const g = this._env(this.sfxBus, t, 0.004, 0.42, 0.5);
    const f = this._vary(320);
    const o = this._osc('square', f, t, 0.5, g);
    o.frequency.exponentialRampToValueAtTime(f * 0.28, t + 0.4);
    const g2 = this._env(this.sfxBus, t, 0.002, 0.18, 0.3);
    const n = this._noise(t, 0.2, g2, 'lowpass', 1200);
    n.filter.frequency.exponentialRampToValueAtTime(260, t + 0.18);
    this.combat = 1;
  }

  _sfx_die() {
    if (!this._voiceOk('die', 5)) return; this._voiceDone('die', 0.6);
    const t = this._t();
    const g = this._env(this.sfxBus, t, 0.004, 0.34, 0.3);
    const n = this._noise(t, 0.4, g, 'lowpass', this._vary(1500), 0.8);
    n.filter.frequency.exponentialRampToValueAtTime(160, t + 0.32);
    const g2 = this._env(this.sfxBus, t, 0.006, 0.3, 0.2);
    const o = this._osc('triangle', this._vary(200), t, 0.34, g2);
    o.frequency.exponentialRampToValueAtTime(60, t + 0.3);
  }

  _sfx_explode() {
    const t = this._t();
    const g = this._env(this.sfxBus, t, 0.005, 0.7, 0.55);
    const n = this._noise(t, 0.8, g, 'lowpass', 2200, 0.6);
    n.filter.frequency.exponentialRampToValueAtTime(120, t + 0.6);
    const g2 = this._env(this.sfxBus, t, 0.004, 0.5, 0.4);
    const o = this._osc('sine', 110, t, 0.6, g2);
    o.frequency.exponentialRampToValueAtTime(34, t + 0.5);
  }

  _sfx_block() {
    const t = this._t();
    const g = this._env(this.sfxBus, t, 0.002, 0.13, 0.32);
    const o = this._osc('square', this._vary(1500), t, 0.16, g);
    o.frequency.exponentialRampToValueAtTime(700, t + 0.11);
  }

  _sfx_wave() {
    const t = this._t();
    for (let i = 0; i < 3; i++) {
      const g = this._env(this.sfxBus, t + i * 0.09, 0.01, 0.4, 0.22);
      this._osc('triangle', ROOT * 4 * Math.pow(2, SCALE[i * 2] / 12), t + i * 0.09, 0.45, g);
    }
  }

  _sfx_boss() {
    const t = this._t();
    const g = this._env(this.sfxBus, t, 0.06, 1.6, 0.6);
    const o = this._osc('sawtooth', 58, t, 1.7, g);
    o.frequency.exponentialRampToValueAtTime(30, t + 1.5);
    const g2 = this._env(this.sfxBus, t, 0.2, 1.4, 0.3);
    const n = this._noise(t, 1.6, g2, 'lowpass', 400, 0.5);
    n.filter.frequency.exponentialRampToValueAtTime(90, t + 1.4);
  }

  _sfx_upgrade() {
    const t = this._t();
    const notes = [0, 5, 7, 12];
    notes.forEach((s, i) => {
      const g = this._env(this.sfxBus, t + i * 0.07, 0.008, 0.34, 0.2);
      this._osc('triangle', ROOT * 8 * Math.pow(2, s / 12), t + i * 0.07, 0.4, g);
    });
  }

  _sfx_victory() {
    const t = this._t();
    [0, 7, 12, 15, 19].forEach((s, i) => {
      const g = this._env(this.sfxBus, t + i * 0.14, 0.02, 0.9, 0.24);
      this._osc('triangle', ROOT * 4 * Math.pow(2, s / 12), t + i * 0.14, 1.0, g);
      const g2 = this._env(this.sfxBus, t + i * 0.14, 0.02, 0.7, 0.12);
      this._osc('sine', ROOT * 8 * Math.pow(2, s / 12), t + i * 0.14, 0.8, g2);
    });
  }

  _sfx_defeat() {
    const t = this._t();
    [12, 7, 3, 0].forEach((s, i) => {
      const g = this._env(this.sfxBus, t + i * 0.2, 0.02, 1.1, 0.24);
      const o = this._osc('sawtooth', ROOT * 2 * Math.pow(2, s / 12), t + i * 0.2, 1.2, g);
      o.frequency.exponentialRampToValueAtTime(ROOT * Math.pow(2, s / 12), t + i * 0.2 + 1.0);
    });
  }

  _sfx_ui(o) {
    const t = this._t();
    const g = this._env(this.sfxBus, t, 0.002, 0.07, o.strong ? 0.2 : 0.11);
    this._osc('square', o.strong ? 660 : 440, t, 0.09, g);
  }

  // --- trilha adaptativa ---------------------------------------------------
  _buildMusic() {
    const t = this.ctx.currentTime;
    this.layer = {};
    const mk = (gain) => {
      const g = this.ctx.createGain();
      g.gain.value = gain;
      g.connect(this.musicBus);
      return g;
    };
    this.layer.drone = mk(0.0);
    this.layer.pad = mk(0.0);
    this.layer.pulse = mk(0.0);
    this.layer.perc = mk(0.0);
    this.layer.tension = mk(0.0);

    // drone contínuo — o "chão" da mixagem
    const d1 = this.ctx.createOscillator(); d1.type = 'sawtooth'; d1.frequency.value = ROOT / 2;
    const d2 = this.ctx.createOscillator(); d2.type = 'sawtooth'; d2.frequency.value = ROOT / 2 * 1.005;
    const df = this.ctx.createBiquadFilter(); df.type = 'lowpass'; df.frequency.value = 180; df.Q.value = 3;
    d1.connect(df); d2.connect(df); df.connect(this.layer.drone);
    d1.start(t); d2.start(t);

    // camada de tensão — quinta diminuta acima, só no chefe
    const ts = this.ctx.createOscillator(); ts.type = 'sawtooth'; ts.frequency.value = ROOT * 1.4142;
    const tf = this.ctx.createBiquadFilter(); tf.type = 'lowpass'; tf.frequency.value = 400;
    const tl = this.ctx.createGain(); tl.gain.value = 0.06;
    ts.connect(tf); tf.connect(tl); tl.connect(this.layer.tension);
    ts.start(t);

    this._lfo = this.ctx.createOscillator(); this._lfo.frequency.value = 0.09;
    const lg = this.ctx.createGain(); lg.gain.value = 60;
    this._lfo.connect(lg); lg.connect(df.frequency);
    this._lfo.start(t);
  }

  /** Sequenciador com lookahead. Chamado a cada quadro renderizado. */
  tick(dt, intensity, boss) {
    if (!this.ok || !this._started || this.ctx.state !== 'running') return;
    this.intensity = intensity;
    this.combat = Math.max(0, this.combat - dt * 0.55);
    const t = this.ctx.currentTime;
    const heat = Math.min(1, intensity * 0.7 + this.combat * 0.5);

    const target = {
      drone: 0.5,
      pad: 0.28 * Math.min(1, intensity * 1.6),
      pulse: intensity > 0.2 ? 0.3 * heat : 0,
      perc: intensity > 0.38 ? 0.34 * heat : 0,
      tension: boss ? 0.5 : 0,
    };
    for (const k of Object.keys(target)) {
      this.layer[k].gain.setTargetAtTime(target[k], t, 1.2);
    }

    const spb = 60 / (78 + intensity * 26) / 2;      // colcheias
    let guard = 0;
    while (this._nextNote < t + 0.25 && guard++ < 32) {
      this._schedule(this._nextNote, this._step, heat, boss);
      this._nextNote += spb;
      this._step = (this._step + 1) % 32;
    }
  }

  _schedule(t, step, heat, boss) {
    // pad: acorde longo a cada 8 colcheias
    if (step % 16 === 0) {
      const deg = boss ? [0, 3, 7] : [0, 5, 7];
      for (const s of deg) {
        const g = this._env(this.layer.pad, t, 0.9, 2.4, 0.12);
        const o = this._osc('triangle', ROOT * 2 * Math.pow(2, s / 12), t, 3.4, g);
        o.detune.value = (Math.random() * 12 - 6);
      }
    }
    // pulso: arpejo
    if (heat > 0.15 && step % 2 === 0) {
      const s = SCALE[(step / 2 + (boss ? 2 : 0)) % SCALE.length];
      const g = this._env(this.layer.pulse, t, 0.006, 0.24, 0.16);
      const o = this._osc('square', ROOT * 4 * Math.pow(2, s / 12), t, 0.3, g);
      o.detune.value = -4;
    }
    // percussão: bumbo nos tempos, caixa de ruído no contratempo
    if (heat > 0.3) {
      if (step % 8 === 0) {
        const g = this._env(this.layer.perc, t, 0.004, 0.22, 0.5);
        const o = this._osc('sine', 120, t, 0.26, g);
        o.frequency.exponentialRampToValueAtTime(42, t + 0.2);
      }
      if (step % 8 === 4) {
        const g = this._env(this.layer.perc, t, 0.003, 0.13, 0.22);
        this._noise(t, 0.15, g, 'highpass', 1600);
      }
      if (heat > 0.6 && step % 4 === 2) {
        const g = this._env(this.layer.perc, t, 0.002, 0.06, 0.1);
        this._noise(t, 0.07, g, 'highpass', 5200);
      }
    }
  }

  duckForHitstop(on) {
    if (!this.ok || !this._started) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(on ? this.volumes.music * 0.55 : this.volumes.music, t, 0.03);
  }
}

export const audio = new Audio();
