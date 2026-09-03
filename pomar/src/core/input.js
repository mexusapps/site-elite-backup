// ---------------------------------------------------------------------------
// input.js — mouse, toque e teclado com o mesmo comportamento.
//
// Regra: apontar e soltar. No mouse, o cursor mira e o clique solta; no toque,
// o dedo arrasta e soltar o dedo derruba a fruta — que é como uma criança
// espera que funcione. Pelo teclado, setas movem e espaço solta.
//
// O harness de teste injeta comandos por aqui, no mesmo caminho do humano.
// ---------------------------------------------------------------------------

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.x = 0.5;                 // posição de mira, 0..1 dentro da cesta
    this.temPonteiro = false;
    this.apertado = false;
    this.toque = false;
    this.pediuSoltar = false;
    this.pediuChacoalhar = false;
    this.pediuRegar = false;
    this.pediuPausa = false;
    this.teclas = new Set();
    this.mapear = null;           // (nx) => void, definido pelo jogo
    this._attach();
  }

  _nx(clientX) {
    const r = this.canvas.getBoundingClientRect();
    return (clientX - r.left) / (r.width || 1);
  }

  _attach() {
    const el = this.canvas;
    el.addEventListener('pointerdown', (e) => {
      this.apertado = true;
      this.toque = e.pointerType === 'touch';
      this.temPonteiro = true;
      this.px = this._nx(e.clientX);
      // pode lançar quando o ponteiro já foi liberado (ou é sintético):
      // capturar é conveniência, nunca motivo para derrubar o jogo
      try { el.setPointerCapture && el.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
    });
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch' && !this.apertado) return;
      this.temPonteiro = true;
      this.px = this._nx(e.clientX);
    });
    window.addEventListener('pointerup', (e) => {
      if (!this.apertado) return;
      this.apertado = false;
      this.pediuSoltar = true;
    });
    window.addEventListener('pointercancel', () => { this.apertado = false; });

    window.addEventListener('keydown', (e) => {
      if (e.repeat) { if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || e.code === 'KeyA' || e.code === 'KeyD') this.teclas.add(e.code); return; }
      this.teclas.add(e.code);
      switch (e.code) {
        case 'Space': case 'Enter': case 'ArrowDown': case 'KeyS':
          this.pediuSoltar = true; e.preventDefault(); break;
        case 'KeyC': case 'ArrowUp':
          this.pediuChacoalhar = true; e.preventDefault(); break;
        case 'KeyR':
          this.pediuRegar = true; break;
        case 'Escape': case 'KeyP':
          this.pediuPausa = true; break;
        default: break;
      }
    });
    window.addEventListener('keyup', (e) => this.teclas.delete(e.code));
    window.addEventListener('blur', () => { this.teclas.clear(); this.apertado = false; });
  }

  /** Move a mira pelo teclado; devolve a posição normalizada 0..1. */
  passo(dt) {
    let dx = 0;
    if (this.teclas.has('ArrowLeft') || this.teclas.has('KeyA')) dx -= 1;
    if (this.teclas.has('ArrowRight') || this.teclas.has('KeyD')) dx += 1;
    if (dx) {
      this.px = Math.max(0, Math.min(1, (this.px === undefined ? 0.5 : this.px) + dx * dt * 0.85));
      this.temPonteiro = true;
    }
    if (this.px !== undefined) this.x = this.px;
    return this.x;
  }

  // --- injeção para o harness ------------------------------------------------
  mirar(nx) { this.px = Math.max(0, Math.min(1, nx)); this.temPonteiro = true; }
  soltar() { this.pediuSoltar = true; }
  chacoalhar() { this.pediuChacoalhar = true; }
  regar() { this.pediuRegar = true; }

  consumir() {
    const r = {
      soltar: this.pediuSoltar,
      chacoalhar: this.pediuChacoalhar,
      regar: this.pediuRegar,
      pausa: this.pediuPausa,
    };
    this.pediuSoltar = false;
    this.pediuChacoalhar = false;
    this.pediuRegar = false;
    this.pediuPausa = false;
    return r;
  }
}
