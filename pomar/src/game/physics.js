// ---------------------------------------------------------------------------
// physics.js — motor de corpos rígidos circulares, escrito do zero.
//
// É o coração do jogo: uma pilha de frutas precisa PARAR de tremer, não pode
// afundar uma dentro da outra e não pode explodir quando ficam cinquenta na
// cesta. Três coisas garantem isso:
//
//   1. correção de posição com folga (slop) — resolve a penetração sem gerar
//      energia do nada, que é o que faz pilhas "ferverem";
//   2. impulsos de velocidade com restituição baixa — fruta quica pouco;
//   3. adormecimento: corpo parado congela e só acorda quando algo o encosta.
//
// Determinístico: nenhuma chamada a Math.random aqui dentro. Mesma sequência
// de quedas = mesma pilha, sempre. É o que permite testar de verdade.
// ---------------------------------------------------------------------------

export const GRAVITY = 2100;

let NEXT_ID = 1;

export class Body {
  constructor(x, y, r, tier) {
    this.id = NEXT_ID++;
    this.x = x; this.y = y;
    this.px = x; this.py = y;
    this.vx = 0; this.vy = 0;
    this.r = r;
    this.tier = tier;
    this.mass = Math.PI * r * r * 0.0016;
    this.invMass = 1 / this.mass;
    this.restitution = 0.08;
    this.friction = 0.42;
    this.angle = 0;
    this.spin = 0;
    this.rest = 0;
    this.asleep = false;
    this.merged = false;
    this.age = 0;
    this.squash = 1;
    this.impact = 0;
    this.newborn = 0.2;
    this.face = 0;
  }

  setTier(tier, r) {
    this.tier = tier;
    this.r = r;
    this.mass = Math.PI * r * r * 0.0016;
    this.invMass = 1 / this.mass;
  }

  get speed() { return Math.hypot(this.vx, this.vy); }

  wake() { this.asleep = false; this.rest = 0; }
}

export class World {
  constructor(bounds) {
    this.bounds = bounds;
    this.bodies = [];
    this.pairs = [];
    this.iterations = 14;
    this.substeps = 2;
    this.damping = 0.9992;
    this.maxSpeed = 2600;
    this.sleepSpeed = 9;
    this.sleepTime = 0.32;
    this.contacts = [];
    this.onImpact = null;
    this.shakeX = 0;
    this._order = [];
  }

  add(body) { this.bodies.push(body); return body; }

  remove(body) {
    const i = this.bodies.indexOf(body);
    if (i >= 0) this.bodies.splice(i, 1);
  }

  clear() { this.bodies.length = 0; this.contacts.length = 0; this.pairs.length = 0; }

  wakeAll() { for (const b of this.bodies) { b.asleep = false; b.rest = 0; } }

  /** Acorda só o que está perto — mais barato que sacudir a cesta inteira. */
  wakeNear(x, y, radius) {
    const r2 = radius * radius;
    for (const b of this.bodies) {
      const dx = b.x - x, dy = b.y - y;
      if (dx * dx + dy * dy < r2) { b.asleep = false; b.rest = 0; }
    }
  }

  step(dt) {
    const h = dt / this.substeps;
    for (let s = 0; s < this.substeps; s++) this._sub(h);
    this._sleep(dt);
    this._collectContacts();
  }

  _sub(h) {
    const bs = this.bodies;

    for (let i = 0; i < bs.length; i++) {
      const b = bs[i];
      b.age += h;
      if (b.newborn > 0) b.newborn -= h;
      if (b.asleep) continue;
      b.vy += GRAVITY * h;
      b.vx *= this.damping;
      b.vy *= this.damping;
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > this.maxSpeed) {
        const k = this.maxSpeed / sp;
        b.vx *= k; b.vy *= k;
      }
      b.px = b.x; b.py = b.y;
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.spin = b.vx / b.r;
      b.angle += b.spin * h;
    }

    this._broadphase();

    for (let it = 0; it < this.iterations; it++) {
      const last = it === this.iterations - 1;
      for (let k = 0; k < this.pairs.length; k += 2) {
        this._solvePair(bs[this.pairs[k]], bs[this.pairs[k + 1]], last);
      }
      for (let i = 0; i < bs.length; i++) this._solveWalls(bs[i], last);
    }

    // Velocidade fantasma: um corpo empilhado pode terminar o quadro com
    // velocidade guardada mesmo sem ter saído do lugar — as restrições
    // devolveram a posição, mas ninguém avisou a velocidade. O resultado era
    // uma torre que nunca dormia e tremia para sempre. A velocidade real é a
    // que o deslocamento permitiu; nunca mais do que isso.
    for (let i = 0; i < bs.length; i++) {
      const b = bs[i];
      if (b.asleep) continue;
      const dx = b.x - b.px, dy = b.y - b.py;
      // só onde o corpo praticamente não saiu do lugar: quem está rolando de
      // verdade continua rolando, e as frutas seguem se acomodando nos vãos
      if (dx * dx + dy * dy < 0.0625) { b.vx = dx / h; b.vy = dy / h; }
    }
  }

  /**
   * Varredura por faixa ordenada em x: com cinquenta frutas na cesta, testar
   * todas contra todas nove vezes por quadro é desperdício puro.
   */
  _broadphase() {
    const bs = this.bodies;
    this.pairs.length = 0;
    // Margem obrigatória: sem ela, duas frutas paradas exatamente encostadas
    // (distância == soma dos raios) falham no teste de caixa e NUNCA entram na
    // lista de contatos — ou seja, nunca se combinam. Bug de jogo, não de
    // física: a pilha trava com pares idênticos se olhando.
    const M = 3;
    const order = this._order;
    order.length = bs.length;
    for (let i = 0; i < bs.length; i++) order[i] = i;
    order.sort((a, b) => (bs[a].x - bs[a].r) - (bs[b].x - bs[b].r));

    for (let i = 0; i < order.length; i++) {
      const a = bs[order[i]];
      const aMax = a.x + a.r + M;
      for (let j = i + 1; j < order.length; j++) {
        const b = bs[order[j]];
        if (b.x - b.r > aMax) break;
        const dy = b.y - a.y;
        const rr = a.r + b.r + M;
        if (dy > rr || dy < -rr) continue;
        this.pairs.push(order[i], order[j]);
      }
    }
  }

  _solvePair(a, b, record) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const rr = a.r + b.r;
    const d2 = dx * dx + dy * dy;
    if (d2 >= rr * rr) return;
    let d = Math.sqrt(d2);
    let nx, ny;
    if (d < 1e-6) { nx = 0; ny = -1; d = 1e-6; }
    else { nx = dx / d; ny = dy / d; }
    const pen = rr - d;

    if (a.asleep && b.asleep) {
      // Tolera penetração residual numa pilha adormecida. Acordar por 1 px de
      // sobreposição criava um ciclo dorme-acorda-dorme: a pilha nunca parava
      // de tremer e o jogo parecia nervoso o tempo todo.
      if (pen > 2.6) { a.wake(); b.wake(); } else return;
    }

    const imA = a.asleep ? 0 : a.invMass;
    const imB = b.asleep ? 0 : b.invMass;
    const imSum = imA + imB;
    if (imSum <= 0) return;

    const slop = 0.08, percent = 0.85;
    const corr = (Math.max(pen - slop, 0) / imSum) * percent;
    a.x -= nx * corr * imA; a.y -= ny * corr * imA;
    b.x += nx * corr * imB; b.y += ny * corr * imB;

    const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
    const vn = rvx * nx + rvy * ny;
    if (vn < 0) {
      const e = Math.min(a.restitution, b.restitution);
      const j = (-(1 + e) * vn) / imSum;
      a.vx -= nx * j * imA; a.vy -= ny * j * imA;
      b.vx += nx * j * imB; b.vy += ny * j * imB;

      const tx = -ny, ty = nx;
      const vt = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty;
      const mu = (a.friction + b.friction) * 0.5;
      let jt = -vt / imSum;
      const lim = j * mu;
      if (jt > lim) jt = lim; else if (jt < -lim) jt = -lim;
      a.vx -= tx * jt * imA; a.vy -= ty * jt * imA;
      b.vx += tx * jt * imB; b.vy += ty * jt * imB;

      if (record && this.onImpact && -vn > 130) {
        this.onImpact(a.mass > b.mass ? b : a, Math.min(1, -vn / 900),
          (a.x + b.x) / 2, (a.y + b.y) / 2);
      }
    }
  }

  _solveWalls(b, record) {
    const B = this.bounds;
    const left = B.x + this.shakeX, right = B.x + B.w + this.shakeX;
    const bottom = B.y + B.h;
    let hit = 0;

    if (b.x - b.r < left) {
      b.x = left + b.r;
      if (b.vx < 0) { if (record) hit = Math.max(hit, -b.vx); b.vx *= -b.restitution; b.vy *= 0.94; }
    }
    if (b.x + b.r > right) {
      b.x = right - b.r;
      if (b.vx > 0) { if (record) hit = Math.max(hit, b.vx); b.vx *= -b.restitution; b.vy *= 0.94; }
    }
    if (b.y + b.r > bottom) {
      b.y = bottom - b.r;
      if (b.vy > 0) {
        if (record) hit = Math.max(hit, b.vy);
        b.vy *= -b.restitution;
        b.vx *= 0.88;
      }
    }
    // topo aberto de propósito: é dali que vem a tensão do jogo

    if (hit > 150 && this.onImpact && record) {
      this.onImpact(b, Math.min(1, hit / 900), b.x, b.y);
    }
  }

  _sleep(dt) {
    for (const b of this.bodies) {
      if (b.asleep) continue;
      if (b.speed < this.sleepSpeed) {
        b.rest += dt;
        if (b.rest > this.sleepTime) {
          b.asleep = true;
          b.vx = 0; b.vy = 0; b.spin = 0;
        }
      } else b.rest = 0;
    }
  }

  _collectContacts() {
    this.contacts.length = 0;
    const bs = this.bodies;
    for (let k = 0; k < this.pairs.length; k += 2) {
      const a = bs[this.pairs[k]], b = bs[this.pairs[k + 1]];
      if (!a || !b) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const rr = a.r + b.r + 1.5;
      if (dx * dx + dy * dy <= rr * rr) this.contacts.push(a, b);
    }
  }

  /** Energia cinética total — o teste usa isto para provar que a pilha assenta. */
  energy() {
    let e = 0;
    for (const b of this.bodies) e += 0.5 * b.mass * (b.vx * b.vx + b.vy * b.vy);
    return e;
  }

  /** Topo da pilha, ignorando o que ainda está caindo. */
  highest(minAge = 0.35) {
    let top = Infinity;
    for (const b of this.bodies) {
      if (b.age < minAge) continue;
      if (b.y - b.r < top) top = b.y - b.r;
    }
    return top === Infinity ? this.bounds.y + this.bounds.h : top;
  }
}
