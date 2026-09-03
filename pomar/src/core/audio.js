// ---------------------------------------------------------------------------
// audio.js — som procedural, warm e sem nenhum arquivo externo.
//
// A ideia boa deste jogo está aqui: **cada fusão toca a próxima nota de uma
// escala**. Combinar semente com semente dá a nota mais grave; a melancia dá a
// mais aguda. Uma sequência de fusões vira uma melodiazinha que sobe, e é isso
// que faz a criança querer combinar de novo — a recompensa é musical, não só
// numérica.
//
// Instrumento: marimba sintetizada (senoide com harmônico e decaimento rápido),
// que é o timbre mais "de brinquedo bom" que dá para fazer com dois osciladores.
// ---------------------------------------------------------------------------

// pentatônica maior em Dó, três oitavas — nunca soa errado, toque o que tocar
const ESCALA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31, 33, 36];
const BASE = 261.63;   // dó central

export class Audio {
  constructor() {
    this.ok = false;
    this.ctx = null;
    this.volumes = { master: 0.75, musica: 0.5, efeitos: 0.85 };
    this.ligado = true;
    this._vozes = Object.create(null);
    this._proxima = 0;
    this._passo = 0;
    this._comecou = false;
    this.intensidade = 0;
  }

  init() {
    if (this.ok) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 24;
      comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.25;

      this.master = this.ctx.createGain();
      this.master.gain.value = this.volumes.master;
      this.fx = this.ctx.createGain();
      this.fx.gain.value = this.volumes.efeitos;
      this.mus = this.ctx.createGain();
      this.mus.gain.value = 0;

      // uma reverberação curta deixa a marimba menos seca e mais "de sala"
      this.rev = this.ctx.createConvolver();
      this.rev.buffer = this._impulso(1.6, 2.6);
      this.revG = this.ctx.createGain();
      this.revG.gain.value = 0.22;
      this.rev.connect(this.revG); this.revG.connect(comp);

      this.fx.connect(comp); this.fx.connect(this.rev);
      this.mus.connect(comp); this.mus.connect(this.rev);
      comp.connect(this.master);
      this.master.connect(this.ctx.destination);

      const n = this.ctx.sampleRate * 2;
      const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      this.ruido = buf;

      this.ok = true;
      return true;
    } catch (_) { return false; }
  }

  _impulso(dur, decay) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * dur);
    const b = this.ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
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
      this._proxima = this.ctx.currentTime + 0.2;
      this.mus.gain.setTargetAtTime(this.volumes.musica, this.ctx.currentTime, 2);
    }
  }

  setVolumes(v) {
    Object.assign(this.volumes, v);
    if (!this.ok) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.volumes.master, t, 0.05);
    this.fx.gain.setTargetAtTime(this.volumes.efeitos, t, 0.05);
    if (this._comecou) this.mus.gain.setTargetAtTime(this.volumes.musica, t, 0.2);
  }

  _t() { return this.ctx.currentTime; }
  _pode(chave, max) {
    const n = this._vozes[chave] || 0;
    if (n >= max) return false;
    this._vozes[chave] = n + 1;
    setTimeout(() => { this._vozes[chave] = Math.max(0, (this._vozes[chave] || 1) - 1); }, 260);
    return true;
  }

  _env(dest, t0, a, d, pico) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(pico, 0.0002), t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
    g.connect(dest);
    return g;
  }

  _osc(tipo, f, t0, dur, g, detune = 0) {
    const o = this.ctx.createOscillator();
    o.type = tipo;
    o.frequency.setValueAtTime(f, t0);
    if (detune) o.detune.setValueAtTime(detune, t0);
    o.connect(g); o.start(t0); o.stop(t0 + dur + 0.03);
    return o;
  }

  _ruido(t0, dur, g, tipo, freq, q = 1) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.ruido; s.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = tipo; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
    s.connect(f); f.connect(g);
    s.start(t0, Math.random() * 1.5); s.stop(t0 + dur + 0.03);
    return { s, f };
  }

  /** Marimba: fundamental + harmônico curto. O ataque é o que dá o "toque". */
  marimba(freq, t0, vol = 0.3, dur = 0.9, dest) {
    const d = dest || this.fx;
    const g = this._env(d, t0, 0.004, dur, vol);
    this._osc('sine', freq, t0, dur + 0.1, g);
    const g2 = this._env(d, t0, 0.003, dur * 0.35, vol * 0.42);
    this._osc('sine', freq * 4.02, t0, dur * 0.4, g2);
    const g3 = this._env(d, t0, 0.001, 0.035, vol * 0.55);
    this._ruido(t0, 0.04, g3, 'bandpass', freq * 5, 2.2);
  }

  nota(grau, t0, vol, dur, dest) {
    const semi = ESCALA[Math.max(0, Math.min(ESCALA.length - 1, grau))];
    this.marimba(BASE * Math.pow(2, semi / 12), t0, vol, dur, dest);
  }

  tocar(nome, o) {
    if (!this.ligado || !this.ok || this.ctx.state !== 'running') return;
    const fn = this['_s_' + nome];
    if (fn) { try { fn.call(this, o || {}); } catch (_) {} }
  }

  // --- efeitos -------------------------------------------------------------

  /** A estrela do jogo: a nota sobe com o tamanho da fruta e com o combo. */
  _s_fusao(o) {
    const t = this._t();
    const grau = Math.min(ESCALA.length - 1, (o.tier || 1) + Math.min(4, o.combo || 0));
    this.nota(grau, t, 0.34, 1.1);
    this.nota(grau + 2, t + 0.055, 0.16, 0.7);
    // "plop" de bolha, que dá o corpo físico da fusão
    const g = this._env(this.fx, t, 0.002, 0.1, 0.2);
    const f = 220 + (o.tier || 0) * 24;
    const os = this._osc('sine', f, t, 0.14, g);
    os.frequency.exponentialRampToValueAtTime(f * 2.6, t + 0.09);
  }

  _s_soltar() {
    if (!this._pode('soltar', 3)) return;
    const t = this._t();
    const g = this._env(this.fx, t, 0.002, 0.09, 0.14);
    const o = this._osc('sine', 300, t, 0.12, g);
    o.frequency.exponentialRampToValueAtTime(150, t + 0.08);
  }

  /** Baque de madeira: quanto mais pesada a fruta, mais grave e mais alto. */
  _s_baque(o) {
    if (!this._pode('baque', 5)) return;
    const f = Math.max(0.05, Math.min(1, o.forca || 0.3));
    const t = this._t();
    const grave = 190 - (o.tier || 0) * 9;
    const g = this._env(this.fx, t, 0.002, 0.1 + f * 0.12, 0.06 + f * 0.20);
    const os = this._osc('triangle', grave, t, 0.25, g);
    os.frequency.exponentialRampToValueAtTime(grave * 0.55, t + 0.1);
    const g2 = this._env(this.fx, t, 0.001, 0.045, 0.03 + f * 0.09);
    this._ruido(t, 0.05, g2, 'bandpass', 900 + f * 700, 1.4);
  }

  _s_pedido() {
    const t = this._t();
    [4, 6, 8, 11].forEach((d, i) => this.nota(d, t + i * 0.075, 0.3, 0.8));
    const g = this._env(this.fx, t + 0.05, 0.01, 0.5, 0.1);
    this._ruido(t + 0.05, 0.5, g, 'highpass', 5200);
  }

  _s_bolo() {
    const t = this._t();
    [0, 2, 4, 7, 9, 11, 12, 14].forEach((d, i) => {
      this.nota(d, t + i * 0.065, 0.34, 1.2);
      this.nota(d + 5, t + i * 0.065 + 0.02, 0.16, 0.9);
    });
    const g = this._env(this.fx, t, 0.02, 1.4, 0.14);
    this._ruido(t, 1.4, g, 'highpass', 4200);
  }

  /** Tucano: assobio com vibrato, alegre — ele está ajudando, não punindo. */
  _s_tucano() {
    const t = this._t();
    const g = this._env(this.fx, t, 0.03, 0.55, 0.2);
    const o = this._osc('sine', 900, t, 0.6, g);
    o.frequency.setValueAtTime(760, t);
    o.frequency.exponentialRampToValueAtTime(1500, t + 0.16);
    o.frequency.exponentialRampToValueAtTime(1050, t + 0.36);
    o.frequency.exponentialRampToValueAtTime(1400, t + 0.52);
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 13;
    const lg = this.ctx.createGain(); lg.gain.value = 45;
    lfo.connect(lg); lg.connect(o.frequency);
    lfo.start(t); lfo.stop(t + 0.62);
  }

  _s_chacoalhar() {
    const t = this._t();
    for (let i = 0; i < 5; i++) {
      const g = this._env(this.fx, t + i * 0.045, 0.002, 0.05, 0.12);
      this._ruido(t + i * 0.045, 0.06, g, 'bandpass', 2400 + Math.random() * 1800, 2);
    }
  }

  _s_regar() {
    const t = this._t();
    const g = this._env(this.fx, t, 0.02, 0.7, 0.14);
    const n = this._ruido(t, 0.75, g, 'bandpass', 900, 3);
    n.f.frequency.exponentialRampToValueAtTime(4200, t + 0.6);
    [7, 9, 12, 14, 16].forEach((d, i) => this.nota(d, t + 0.08 + i * 0.06, 0.16, 0.6));
  }

  _s_descoberta() {
    const t = this._t();
    [7, 11, 14].forEach((d, i) => this.nota(d, t + i * 0.09, 0.26, 1.0));
  }

  _s_ui(o) {
    const t = this._t();
    this.marimba(o.forte ? 620 : 420, t, o.forte ? 0.2 : 0.12, 0.32);
  }

  // --- fundo musical --------------------------------------------------------
  // Um violãozinho preguiçoso: baixo no tempo, acorde a cada dois compassos e
  // um chocalho leve. Sobe de camada conforme a cesta enche — a tensão fica no
  // som, não numa ameaça de perder.
  tick(dt, intensidade) {
    if (!this.ok || !this._comecou || this.ctx.state !== 'running') return;
    this.intensidade = intensidade;
    const t = this.ctx.currentTime;
    const spb = 60 / 96 / 2;
    let guarda = 0;
    while (this._proxima < t + 0.3 && guarda++ < 24) {
      this._agendar(this._proxima, this._passo, intensidade);
      this._proxima += spb;
      this._passo = (this._passo + 1) % 64;
    }
  }

  _agendar(t, passo, inten) {
    const acordes = [[0, 4, 7], [-3, 2, 5], [-5, 0, 4], [-1, 2, 7]];
    const acorde = acordes[Math.floor(passo / 16) % acordes.length];

    if (passo % 16 === 0) {
      for (const s of acorde) {
        const g = this._env(this.mus, t, 0.5, 2.6, 0.075);
        this._osc('triangle', BASE / 2 * Math.pow(2, s / 12), t, 3.2, g, 5);
      }
    }
    if (passo % 4 === 0) {
      const g = this._env(this.mus, t, 0.01, 0.5, 0.13);
      const o = this._osc('sine', BASE / 4 * Math.pow(2, acorde[0] / 12), t, 0.6, g);
      o.frequency.exponentialRampToValueAtTime(BASE / 4 * Math.pow(2, acorde[0] / 12) * 0.98, t + 0.4);
    }
    if (inten > 0.15 && passo % 2 === 1) {
      const g = this._env(this.mus, t, 0.002, 0.05, 0.035 + inten * 0.03);
      this._ruido(t, 0.06, g, 'highpass', 6000);
    }
    if (inten > 0.45 && passo % 8 === 4) {
      const g = this._env(this.mus, t, 0.004, 0.16, 0.09);
      const o = this._osc('sine', 150, t, 0.2, g);
      o.frequency.exponentialRampToValueAtTime(70, t + 0.14);
    }
    // um floreio de marimba de vez em quando, bem baixinho
    if (inten > 0.25 && passo % 32 === 20) {
      [4, 7, 9].forEach((d, i) => this.nota(d + 5, t + i * 0.14, 0.055, 0.7, this.mus));
    }
  }
}

export const audio = new Audio();
