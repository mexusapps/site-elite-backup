// ---------------------------------------------------------------------------
// rng.js — PRNG com semente. Determinismo é requisito do harness de playtest:
// mesma seed + mesma sequência de input = mesma partida, frame a frame.
// ---------------------------------------------------------------------------

export class Rng {
  constructor(seed = 1) { this.seed(seed); }

  seed(s) {
    this._s = (s >>> 0) || 1;
    this._calls = 0;
    return this;
  }

  /** mulberry32 */
  next() {
    this._calls++;
    let t = (this._s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(a, b) { return a + this.next() * (b - a); }
  int(a, b) { return Math.floor(this.range(a, b + 1)); }
  chance(p) { return this.next() < p; }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  sign() { return this.next() < 0.5 ? -1 : 1; }
  angle() { return this.next() * Math.PI * 2; }

  /** Fisher-Yates in-place, determinístico. */
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  /** Estado serializável — usado para comparar divergência entre execuções. */
  snapshot() { return { s: this._s, calls: this._calls }; }
}

/** Fonte visual (partículas, tremor). Fora da simulação para não afetar o determinismo. */
export const visualRng = new Rng(0xC0FFEE);
