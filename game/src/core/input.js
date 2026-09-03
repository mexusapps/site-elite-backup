// ---------------------------------------------------------------------------
// input.js — teclado, mouse e gamepad unificados em ações nomeadas.
//
// Três coisas aqui existem por causa da sensação de jogo, não por conveniência:
//   1. BUFFER de comando (130 ms): o botão apertado logo antes da janela válida
//      ainda executa. Sem isso o jogo "come" input e a culpa parece do jogador.
//   2. Estado de borda por passo fixo (justPressed), não por evento — o loop é
//      determinístico e o input precisa ser amostrado junto com a simulação.
//   3. injeção virtual, para o harness de playtest dirigir o jogo sem browser
//      real de usuário. Mesmo caminho de código do input humano.
// ---------------------------------------------------------------------------

export const ACTIONS = [
  'up', 'down', 'left', 'right',
  'attack', 'shoot', 'dash',
  'pause', 'confirm', 'back',
];

export const ACTION_LABELS = {
  up: 'Cima', down: 'Baixo', left: 'Esquerda', right: 'Direita',
  attack: 'Golpe', shoot: 'Disparo', dash: 'Avanço',
  pause: 'Pausa', confirm: 'Confirmar', back: 'Voltar',
};

export const DEFAULT_BINDS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  attack: ['KeyJ', 'Mouse0'],
  shoot: ['KeyK', 'Mouse2'],
  dash: ['Space', 'ShiftLeft'],
  pause: ['Escape', 'KeyP'],
  confirm: ['Enter', 'KeyE'],
  back: ['Escape', 'Backspace'],
};

const GAMEPAD_MAP = {         // índices padrão do layout "standard"
  attack: [0, 2],             // A / X
  shoot: [3, 7],              // Y / RT
  dash: [1, 5],               // B / RB
  pause: [9],                 // Start
  confirm: [0],
  back: [1],
};

export const BUFFER_MS = 130;         // janela de perdão do comando

export function prettyKey(code) {
  if (!code) return '—';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Arrow')) return { Up: '↑', Down: '↓', Left: '←', Right: '→' }[code.slice(5)] || code;
  if (code === 'Mouse0') return 'Clique esq.';
  if (code === 'Mouse1') return 'Clique meio';
  if (code === 'Mouse2') return 'Clique dir.';
  const named = {
    Space: 'Espaço', ShiftLeft: 'Shift esq.', ShiftRight: 'Shift dir.',
    ControlLeft: 'Ctrl esq.', Escape: 'Esc', Enter: 'Enter',
    Backspace: 'Backspace', Tab: 'Tab',
  };
  return named[code] || code;
}

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.binds = JSON.parse(JSON.stringify(DEFAULT_BINDS));
    this.codeToAction = new Map();

    this.held = new Set();        // ações fisicamente pressionadas
    this.prev = new Set();        // estado no passo anterior (bordas)
    this.virtual = new Set();     // injeção do harness
    this.bufferedAt = Object.create(null);

    this.mouse = { x: 0, y: 0, inside: false, moved: false };
    this.aim = { x: 1, y: 0 };    // vetor unitário de mira
    this.aimFromPad = false;
    this.padIndex = null;
    this.lastDevice = 'teclado';  // teclado | gamepad
    this.now = 0;                 // relógio da simulação, em ms
    this.capture = null;          // callback do remapeamento

    // toque: só liga quando um dedo encosta de fato. Nada de adivinhar
    // pelo tamanho da tela — notebook com tela sensível existe.
    this.touchMode = false;
    this.touch = {
      stickId: null, ox: 0, oy: 0, x: 0, y: 0,
      buttons: { attack: null, shoot: null, dash: null },
      layout: null,
    };

    this.rebuild();
    this._attach();
  }

  /** Zonas dos controles de toque, em espaço de tela. */
  touchLayout(W, H) {
    const s = Math.min(Math.max(Math.min(W, H) / 720, 0.75), 1.4);
    const r = 44 * s;
    const pad = 30 * s;
    const l = {
      scale: s,
      stick: { x: pad + 84 * s, y: H - pad - 84 * s, r: 78 * s, knob: 34 * s },
      attack: { x: W - pad - r * 1.5, y: H - pad - r * 1.5, r: r * 1.35, label: 'golpe' },
      shoot: { x: W - pad - r * 1.5, y: H - pad - r * 4.4, r, label: 'tiro' },
      dash: { x: W - pad - r * 4.4, y: H - pad - r * 1.9, r, label: 'avanço' },
    };
    this.touch.layout = l;
    return l;
  }

  _hitCircle(c, x, y, slack = 1.25) {
    const dx = x - c.x, dy = y - c.y;
    return dx * dx + dy * dy <= (c.r * slack) * (c.r * slack);
  }

  _touchDown(id, x, y, W, H) {
    const l = this.touch.layout || this.touchLayout(W, H);
    for (const name of ['attack', 'shoot', 'dash']) {
      if (this._hitCircle(l[name], x, y)) {
        this.touch.buttons[name] = id;
        if (!this.held.has(name)) this.bufferedAt[name] = this.now;
        this.held.add(name);
        return true;
      }
    }
    if (this.touch.stickId === null && x < W * 0.55) {
      this.touch.stickId = id;
      this.touch.ox = x; this.touch.oy = y;
      this.touch.x = x; this.touch.y = y;
      return true;
    }
    return false;
  }

  _touchMove(id, x, y) {
    if (this.touch.stickId === id) { this.touch.x = x; this.touch.y = y; this._applyStick(); return true; }
    return false;
  }

  _touchUp(id) {
    if (this.touch.stickId === id) {
      this.touch.stickId = null;
      for (const d of ['up', 'down', 'left', 'right']) this.held.delete(d);
      return true;
    }
    for (const name of ['attack', 'shoot', 'dash']) {
      if (this.touch.buttons[name] === id) {
        this.touch.buttons[name] = null;
        this.held.delete(name);
        return true;
      }
    }
    return false;
  }

  _applyStick() {
    const t = this.touch;
    const l = t.layout;
    const max = l ? l.stick.r : 78;
    let dx = t.x - t.ox, dy = t.y - t.oy;
    const m = Math.hypot(dx, dy);
    if (m > max) { dx = (dx / m) * max; dy = (dy / m) * max; }
    const dz = max * 0.18;
    const on = (v) => Math.abs(v) > dz;
    const set = (a, v) => { if (v) { if (!this.held.has(a)) this.bufferedAt[a] = this.now; this.held.add(a); } else this.held.delete(a); };
    set('left', on(dx) && dx < 0);
    set('right', on(dx) && dx > 0);
    set('up', on(dy) && dy < 0);
    set('down', on(dy) && dy > 0);
    t.knobX = dx; t.knobY = dy;
  }

  rebuild() {
    this.codeToAction.clear();
    for (const a of ACTIONS) {
      for (const c of (this.binds[a] || [])) {
        if (!this.codeToAction.has(c)) this.codeToAction.set(c, []);
        this.codeToAction.get(c).push(a);
      }
    }
  }

  setBind(action, slot, code) {
    if (!this.binds[action]) this.binds[action] = [];
    this.binds[action][slot] = code;
    this.rebuild();
  }

  resetBinds() {
    this.binds = JSON.parse(JSON.stringify(DEFAULT_BINDS));
    this.rebuild();
  }

  _press(code, ev) {
    if (this.capture) {                 // modo remapeamento consome o evento
      const cb = this.capture; this.capture = null;
      cb(code);
      if (ev) ev.preventDefault();
      return;
    }
    const acts = this.codeToAction.get(code);
    if (!acts) return;
    for (const a of acts) {
      if (!this.held.has(a)) this.bufferedAt[a] = this.now;
      this.held.add(a);
    }
    if (ev && code === 'Space') ev.preventDefault();
  }

  _release(code) {
    const acts = this.codeToAction.get(code);
    if (!acts) return;
    for (const a of acts) this.held.delete(a);
  }

  _attach() {
    const el = this.canvas;
    this._onKeyDown = (e) => {
      if (e.repeat) return;
      this.lastDevice = 'teclado';
      this._press(e.code, e);
    };
    this._onKeyUp = (e) => this._release(e.code);
    this._onDown = (e) => {
      if (e.pointerType === 'touch') {
        this.touchMode = true;
        this.lastDevice = 'toque';
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) * (el.width / r.width || 1) / (window.devicePixelRatio || 1);
        const y = (e.clientY - r.top) * (el.height / r.height || 1) / (window.devicePixelRatio || 1);
        this._touchDown(e.pointerId, x, y, r.width, r.height);
        e.preventDefault();
        return;
      }
      this.lastDevice = 'teclado';
      this._press('Mouse' + e.button, e);
      if (e.button === 2) e.preventDefault();
    };
    this._onUp = (e) => {
      if (e.pointerType === 'touch') { this._touchUp(e.pointerId); return; }
      this._release('Mouse' + e.button);
    };
    this._onMove = (e) => {
      if (e.pointerType === 'touch') {
        const rr = el.getBoundingClientRect();
        const x = (e.clientX - rr.left) * (el.width / rr.width || 1) / (window.devicePixelRatio || 1);
        const y = (e.clientY - rr.top) * (el.height / rr.height || 1) / (window.devicePixelRatio || 1);
        this._touchMove(e.pointerId, x, y);
        return;
      }
      const r = el.getBoundingClientRect();
      this.mouse.x = (e.clientX - r.left) * (el.width / r.width || 1);
      this.mouse.y = (e.clientY - r.top) * (el.height / r.height || 1);
      this.mouse.inside = true;
      this.mouse.moved = true;
      this.aimFromPad = false;
    };
    this._onCtx = (e) => e.preventDefault();
    this._onBlur = () => { this.held.clear(); };

    window.addEventListener('keydown', this._onKeyDown, { passive: false });
    window.addEventListener('keyup', this._onKeyUp);
    el.addEventListener('pointerdown', this._onDown);
    window.addEventListener('pointerup', this._onUp);
    window.addEventListener('pointermove', this._onMove);
    el.addEventListener('contextmenu', this._onCtx);
    window.addEventListener('pointercancel', (e) => { if (e.pointerType === 'touch') this._touchUp(e.pointerId); });
    window.addEventListener('blur', this._onBlur);
    window.addEventListener('gamepadconnected', (e) => { this.padIndex = e.gamepad.index; });
    window.addEventListener('gamepaddisconnected', () => { this.padIndex = null; });
  }

  /** Lê o gamepad. Chamado uma vez por passo fixo, antes da lógica. */
  pollPad() {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    let pad = null;
    for (const p of pads) if (p && p.connected) { pad = p; break; }
    if (!pad) return;

    const DZ = 0.28;
    const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
    const mag = Math.hypot(ax, ay);
    const dirs = { left: ax < -DZ, right: ax > DZ, up: ay < -DZ, down: ay > DZ };
    for (const k of ['left', 'right', 'up', 'down']) {
      if (dirs[k]) { if (!this.held.has(k)) this.bufferedAt[k] = this.now; this.held.add(k); this.lastDevice = 'gamepad'; }
      else if (this.held.has(k) && !this._keyHeld(k)) this.held.delete(k);
    }
    if (mag > DZ) this.lastDevice = 'gamepad';

    const rx = pad.axes[2] || 0, ry = pad.axes[3] || 0;
    if (Math.hypot(rx, ry) > DZ) {
      const m = Math.hypot(rx, ry);
      this.aim.x = rx / m; this.aim.y = ry / m;
      this.aimFromPad = true;
      this.lastDevice = 'gamepad';
    }

    for (const a of Object.keys(GAMEPAD_MAP)) {
      let on = false;
      for (const i of GAMEPAD_MAP[a]) if (pad.buttons[i] && pad.buttons[i].pressed) on = true;
      if (on) {
        if (!this.held.has(a)) this.bufferedAt[a] = this.now;
        this.held.add(a);
        this.lastDevice = 'gamepad';
      } else if (this.held.has(a) && !this._keyHeld(a)) {
        this.held.delete(a);
      }
    }
  }

  _keyHeld(_a) { return false; }   // gamepad e teclado compartilham o mesmo Set

  /** Injeção do harness — mesmo caminho do input humano. */
  inject(action, down) {
    if (down) {
      if (!this.virtual.has(action)) this.bufferedAt[action] = this.now;
      this.virtual.add(action);
    } else {
      this.virtual.delete(action);
    }
  }
  clearInjected() { this.virtual.clear(); }

  /** Chamado no início de cada passo fixo. */
  beginFrame(nowMs) {
    this.now = nowMs;
    this.prev = new Set([...this.held, ...this.virtual]);
    this.pollPad();
  }

  isDown(a) { return this.held.has(a) || this.virtual.has(a); }
  justPressed(a) { return this.isDown(a) && !this.prev.has(a); }

  /** Consome um comando bufferizado; devolve true no máximo uma vez por toque. */
  consume(a, windowMs = BUFFER_MS) {
    const t = this.bufferedAt[a];
    if (t === undefined) return false;
    if (this.now - t <= windowMs) { this.bufferedAt[a] = undefined; return true; }
    return false;
  }
  hasBuffered(a, windowMs = BUFFER_MS) {
    const t = this.bufferedAt[a];
    return t !== undefined && this.now - t <= windowMs;
  }

  /** Vetor de movimento normalizado (diagonal não é mais rápida). */
  moveVector(out) {
    let x = 0, y = 0;
    if (this.isDown('left')) x -= 1;
    if (this.isDown('right')) x += 1;
    if (this.isDown('up')) y -= 1;
    if (this.isDown('down')) y += 1;
    const m = Math.hypot(x, y);
    if (m > 0) { x /= m; y /= m; }
    out.x = x; out.y = y;
    return m > 0;
  }

  /**
   * Mira: mouse quando há mouse, analógico direito quando há gamepad,
   * direção do movimento como último recurso — o jogo é jogável só com teclado.
   */
  updateAim(worldX, worldY, camera, moveX, moveY) {
    if (this.touchMode) {
      // com o dedo no vidro não dá para mirar: a mira segue o alvo mais
      // próximo e, sem alvo, a direção do movimento.
      if (this.autoAimX !== undefined) { this.aim.x = this.autoAimX; this.aim.y = this.autoAimY; }
      else if (moveX || moveY) {
        const m = Math.hypot(moveX, moveY);
        this.aim.x = moveX / m; this.aim.y = moveY / m;
      }
      return this.aim;
    }
    if (this.aimFromPad) return this.aim;
    if (this.mouse.moved && this.lastDevice === 'teclado') {
      const wx = camera.screenToWorldX(this.mouse.x);
      const wy = camera.screenToWorldY(this.mouse.y);
      const dx = wx - worldX, dy = wy - worldY;
      const m = Math.hypot(dx, dy);
      if (m > 1) { this.aim.x = dx / m; this.aim.y = dy / m; return this.aim; }
    }
    if (moveX || moveY) {
      const m = Math.hypot(moveX, moveY);
      this.aim.x = moveX / m; this.aim.y = moveY / m;
    }
    return this.aim;
  }
}
