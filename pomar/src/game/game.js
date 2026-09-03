// ---------------------------------------------------------------------------
// game.js — as regras do POMAR.
//
// Uma decisão de design atravessa o arquivo inteiro: **nada aqui pode punir**.
// Não existe fim de jogo, não existe perder pontos, não existe errar. Quando a
// cesta transborda, um tucano vem e leva as frutas de cima — você perde o que
// *poderia* ter feito com elas, nunca o que já conquistou. A tensão vem de
// querer mais, não de medo.
// ---------------------------------------------------------------------------

import { World, Body } from './physics.js';
import { FRUTAS, MAX_TIER, CESTA, MODOS, REGRAS, BICHINHOS, sortearTier } from './fruits.js';
import { Rng } from '../core/rng.js';
import { clamp, lerp } from '../core/math.js';

export const FASE = { PREPARANDO: 'preparando', JOGANDO: 'jogando', FESTA: 'festa' };

export class Jogo {
  constructor() {
    this.rng = new Rng(1);
    this.fisica = new World({ x: 0, y: 0, w: CESTA.w, h: CESTA.h });
    this.eventos = {};                 // preenchido por quem consome (fx, som)
    this.fisica.onImpact = (b, f, x, y) => this.emit('baque', { corpo: b, forca: f, x, y });
  }

  emit(nome, dados) {
    const fn = this.eventos[nome];
    if (fn) fn(dados);
  }

  // ==========================================================================
  comecar(seed, modoId = 'pomar') {
    this.seed = seed >>> 0;
    this.rng.seed(this.seed);
    this.modo = MODOS[modoId] || MODOS.pomar;
    this.fisica.clear();
    this.fisica.bounds.h = this.modo.alturaCesta;
    this.fisica.shakeX = 0;

    this.fase = FASE.JOGANDO;
    this.tempo = 0;
    this.quadro = 0;
    this.pontos = 0;
    this.fusoes = 0;
    this.maiorTier = -1;
    this.combo = 0;
    this.comboT = 0;
    this.melhorCombo = 0;
    this.tucanos = 0;
    this.bolos = 0;
    this.transbordoT = 0;
    this.tucanoAnim = 0;

    this.maoTier = sortearTier(this.rng);
    this.proximoTier = sortearTier(this.rng);
    this.maoX = CESTA.w / 2;
    this.maoY = -46;
    this.recarga = 0;
    this.podeSoltar = true;

    this.chacoalho = 1;                // 0..1, cheio = pronto
    this.chacoalhoT = 0;

    this.regadores = 1;
    this.pedidosFeitos = 0;
    this.novoPedido();

    this.descobertas = new Set();
    this.ultimaFusao = null;
    this.mensagem = null;
    this.mensagemT = 0;
    this.tucanoVoo = null;
    return this;
  }

  get linhaSolY() { return this.modo.linhaSol; }

  // ==========================================================================
  // pedidos: um bichinho pede uma fruta. É o objetivo para quem não liga para
  // pontuação — e todo mundo entende sem ler nada.
  novoPedido() {
    const min = REGRAS.pedidoMin;
    const max = Math.min(REGRAS.pedidoMax, Math.max(min + 1, this.maiorTier + 2));
    const tier = min + Math.floor(this.rng.next() * (max - min + 1));
    const bicho = BICHINHOS[Math.floor(this.rng.next() * BICHINHOS.length)];
    this.pedido = { tier: Math.min(tier, MAX_TIER), bicho, t: 0, feito: 0 };
  }

  // ==========================================================================
  mover(x) {
    const r = FRUTAS[this.maoTier].r;
    this.maoX = clamp(x, r + 2, CESTA.w - r - 2);
  }

  soltar() {
    if (!this.podeSoltar || this.recarga > 0 || this.fase !== FASE.JOGANDO) return false;
    const f = FRUTAS[this.maoTier];
    const b = new Body(this.maoX, this.maoY, f.r, this.maoTier);
    b.face = Math.floor(this.rng.next() * 1000);
    b.vy = 90;
    this.fisica.add(b);
    this.fisica.wakeNear(b.x, b.y + 120, 220);
    this.emit('soltar', { tier: this.maoTier, x: b.x, y: b.y });
    this.marcarDescoberta(this.maoTier);

    this.maoTier = this.proximoTier;
    this.proximoTier = sortearTier(this.rng);
    this.recarga = 0.34;
    return true;
  }

  chacoalhar() {
    if (this.chacoalho < 1 || this.fase !== FASE.JOGANDO) return false;
    this.chacoalho = 0;
    this.chacoalhoT = 0.34;
    this.fisica.wakeAll();
    const forca = REGRAS.forcaChacoalho;
    for (const b of this.fisica.bodies) {
      b.vx += (this.rng.next() * 2 - 1) * forca;
      b.vy -= this.rng.next() * forca * 0.55;
    }
    this.emit('chacoalhar', {});
    return true;
  }

  /** Regador: faz uma fruta da pilha crescer um degrau. Sempre ajuda, nunca atrapalha. */
  regar() {
    if (this.regadores <= 0 || this.fase !== FASE.JOGANDO) return false;
    const alvos = this.fisica.bodies.filter((b) => b.tier < MAX_TIER - 1);
    if (!alvos.length) return false;
    // escolhe a maior que ainda cresce: é a que mais aproxima de uma fusão boa
    alvos.sort((a, b) => b.tier - a.tier || a.y - b.y);
    const pool = alvos.slice(0, Math.max(1, Math.ceil(alvos.length * 0.34)));
    const alvo = pool[Math.floor(this.rng.next() * pool.length)];
    this.regadores--;
    const novo = alvo.tier + 1;
    alvo.setTier(novo, FRUTAS[novo].r);
    alvo.squash = 1.45;
    alvo.wake();
    this.fisica.wakeNear(alvo.x, alvo.y, 260);
    this.marcarDescoberta(novo);
    this.emit('regar', { tier: novo, x: alvo.x, y: alvo.y });
    this.conferirPedido(novo, alvo.x, alvo.y);
    return true;
  }

  marcarDescoberta(tier) {
    if (!this.descobertas.has(tier)) {
      this.descobertas.add(tier);
      // toda fruta entra no álbum; só as maiores merecem fanfarra, senão o
      // começo da partida vira uma festa a cada três segundos
      this.emit('descoberta', { tier, festeja: tier > 2 });
    }
    if (tier > this.maiorTier) this.maiorTier = tier;
  }

  // ==========================================================================
  passo(dt) {
    this.quadro++;
    if (this.fase !== FASE.JOGANDO) return;
    this.tempo += dt;
    if (this.recarga > 0) this.recarga -= dt;
    if (this.mensagemT > 0) this.mensagemT -= dt;
    if (this.pedido) this.pedido.t += dt;
    if (this.pedido && this.pedido.feito > 0) this.pedido.feito -= dt;

    // chacoalho recarrega sozinho
    if (this.chacoalho < 1) this.chacoalho = Math.min(1, this.chacoalho + dt / REGRAS.recargaChacoalho);
    if (this.chacoalhoT > 0) {
      this.chacoalhoT -= dt;
      this.fisica.shakeX = Math.sin(this.chacoalhoT * 62) * 9 * (this.chacoalhoT / 0.34);
    } else this.fisica.shakeX = 0;

    // combo esfria
    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) this.combo = 0;
    }

    this.fisica.step(dt);

    for (const b of this.fisica.bodies) {
      if (b.squash > 1) b.squash = lerp(b.squash, 1, 1 - Math.pow(0.0001, dt));
      if (b.impact > 0) b.impact -= dt * 3;
    }

    this.resolverFusoes();
    this.cuidarDoTransbordo(dt);
    if (this.tucanoVoo) this.animarTucano(dt);
  }

  // ==========================================================================
  resolverFusoes() {
    const c = this.fisica.contacts;
    if (!c.length) return;
    const usados = new Set();
    let houve = 0;

    for (let i = 0; i < c.length; i += 2) {
      const a = c[i], b = c[i + 1];
      if (a.tier !== b.tier) continue;
      if (usados.has(a.id) || usados.has(b.id)) continue;
      if (a.newborn > 0 || b.newborn > 0) continue;
      usados.add(a.id); usados.add(b.id);
      this.fundir(a, b);
      houve++;
    }

    if (houve) {
      this.combo = Math.min(REGRAS.comboMax, this.combo + houve);
      this.comboT = REGRAS.comboJanela;
      this.melhorCombo = Math.max(this.melhorCombo, this.combo);
    }
  }

  fundir(a, b) {
    const tier = a.tier;
    const x = (a.x + b.x) / 2;
    const y = (a.y + b.y) / 2;
    const vx = (a.vx + b.vx) / 2;
    const vy = (a.vy + b.vy) / 2;
    this.fisica.remove(a);
    this.fisica.remove(b);
    this.fusoes++;

    // duas melancias viram bolo de festa: some tudo, chove confete, ponto alto
    if (tier >= MAX_TIER) {
      this.bolos++;
      this.pontos += REGRAS.bonusBolo;
      this.emit('bolo', { x, y, pontos: REGRAS.bonusBolo });
      this.dizer('BOLO DE FESTA!');
      this.fisica.wakeNear(x, y, 420);
      return;
    }

    const novo = tier + 1;
    const f = FRUTAS[novo];
    const nb = new Body(x, y, f.r, novo);
    nb.face = Math.floor(this.rng.next() * 1000);
    nb.vx = vx * 0.5; nb.vy = vy * 0.5 - 60;      // pulinho de alegria
    nb.squash = 1.5;
    nb.newborn = 0.12;
    this.fisica.add(nb);
    this.fisica.wakeNear(x, y, f.r * 4);

    const mult = 1 + Math.max(0, this.combo) * 0.35;
    const ganho = Math.round(f.pontos * mult);
    this.pontos += ganho;
    this.marcarDescoberta(novo);
    this.ultimaFusao = { tier: novo, x, y, t: this.tempo };

    this.emit('fusao', { tier: novo, x, y, pontos: ganho, combo: this.combo, corpo: nb });
    this.conferirPedido(novo, x, y);
  }

  conferirPedido(tier, x, y) {
    if (!this.pedido || tier !== this.pedido.tier) return;
    this.pontos += REGRAS.bonusPedido;
    this.pedidosFeitos++;
    this.pedido.feito = 1.4;
    this.emit('pedido', { tier, x, y, bicho: this.pedido.bicho });
    this.dizer(this.pedido.bicho.nome + ' adorou!');
    if (this.pedidosFeitos % REGRAS.regadorACada === 0) {
      this.regadores++;
      this.emit('ganhouRegador', {});
    }
    this.novoPedido();
  }

  dizer(txt) { this.mensagem = txt; this.mensagemT = 2.2; }

  // ==========================================================================
  // O tucano: a alternativa amigável ao "fim de jogo". Ele nunca tira pontos —
  // leva embora as frutas de cima e devolve espaço, com festa e agradecimento.
  cuidarDoTransbordo(dt) {
    if (this.tucanoVoo) return;
    const topo = this.fisica.highest(0.5);
    const transbordando = topo < this.linhaSolY;

    // Quanto pior o transbordo, mais rápido o tucano chega e mais ele leva.
    // Sem isso, quem solta fruta sem parar entope a cesta mais rápido do que
    // ele consegue esvaziar — e o jogo vira uma sopa que ninguém entende.
    const excesso = clamp((this.linhaSolY - topo) / 140, 0, 1);
    const lotado = this.fisica.bodies.length > 58;
    const espera = lotado ? 0.5 : this.modo.esperaTucano * (1 - excesso * 0.62);

    if (transbordando || lotado) {
      this.transbordoT += dt;
      if (this.transbordoT >= espera) this.chamarTucano(excesso, lotado);
    } else {
      this.transbordoT = Math.max(0, this.transbordoT - dt * 1.6);
    }
  }

  get avisoTransbordo() {
    return clamp(this.transbordoT / this.modo.esperaTucano, 0, 1);
  }

  chamarTucano(excesso = 0, lotado = false) {
    // O tucano come as frutinhas pequenas — é o que um pássaro faria, e é
    // também a escolha que ajuda de verdade: o que entope a cesta são as
    // miúdas que não acharam par. Levar a fruta grande que você acabou de
    // montar seria punição disfarçada de ajuda.
    const topo = this.fisica.highest(0.5);
    const perto = this.fisica.bodies.filter((b) => b.age > 0.4 && (b.y - b.r) < topo + 260);
    const alvo = (perto.length >= 3 ? perto : this.fisica.bodies.filter((b) => b.age > 0.4));
    const ordenadas = alvo.slice().sort((a, b) => (a.tier - b.tier) || ((a.y - a.r) - (b.y - b.r)));
    const quer = this.modo.levaTucano + Math.round(excesso * 2) + (lotado ? 2 : 0);
    const n = Math.min(quer, Math.max(1, ordenadas.length - 2));
    const levar = ordenadas.slice(0, n);
    if (!levar.length) { this.transbordoT = 0; return; }

    this.tucanos++;
    this.transbordoT = 0;
    this.tucanoVoo = {
      t: 0, dur: 1.5,
      frutas: levar.map((b) => ({
        tier: b.tier, x: b.x, y: b.y, r: b.r, face: b.face,
        x0: b.x, y0: b.y, angle: b.angle,
      })),
      x: -160, y: Math.max(20, levar[0].y - 90),
    };
    for (const b of levar) this.fisica.remove(b);
    this.fisica.wakeAll();
    this.emit('tucano', { frutas: this.tucanoVoo.frutas.length });
    this.dizer('O tucano levou um lanche!');
  }

  animarTucano(dt) {
    const v = this.tucanoVoo;
    v.t += dt;
    const k = v.t / v.dur;
    v.x = lerp(-160, CESTA.w + 200, k);
    for (let i = 0; i < v.frutas.length; i++) {
      const f = v.frutas[i];
      const atraso = i * 0.06;
      const kk = clamp((k - atraso) / (1 - atraso || 1), 0, 1);
      f.x = lerp(f.x0, v.x - 10 - i * 26, Math.min(1, kk * 1.8));
      f.y = lerp(f.y0, v.y + 34 + Math.sin(v.t * 8 + i) * 6, Math.min(1, kk * 1.8));
      f.angle += dt * 3;
    }
    if (v.t >= v.dur) this.tucanoVoo = null;
  }

  // ==========================================================================
  estado() {
    return {
      quadro: this.quadro,
      tempo: +this.tempo.toFixed(3),
      fase: this.fase,
      pontos: this.pontos,
      frutas: this.fisica.bodies.length,
      fusoes: this.fusoes,
      maiorTier: this.maiorTier,
      combo: this.combo,
      melhorCombo: this.melhorCombo,
      tucanos: this.tucanos,
      bolos: this.bolos,
      mao: this.maoTier,
      proximo: this.proximoTier,
      regadores: this.regadores,
      pedido: this.pedido ? this.pedido.tier : null,
      pedidosFeitos: this.pedidosFeitos,
      energia: +this.fisica.energy().toFixed(2),
      topo: +this.fisica.highest(0.5).toFixed(1),
      aviso: +this.avisoTransbordo.toFixed(2),
      descobertas: [...this.descobertas].sort((a, b) => a - b),
      rng: this.rng.snapshot(),
    };
  }
}
