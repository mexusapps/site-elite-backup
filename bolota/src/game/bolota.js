// ---------------------------------------------------------------------------
// bolota.js — o personagem e tudo que faz ele parecer vivo.
//
// A parte de jogo é pequena: segurar carrega, soltar lança. O que dá vida é a
// camada de animação procedural em cima disso:
//   • esmagamento e estiramento com mola (antecipação ao carregar, alongamento
//     no voo, achatamento no pouso com volta em excesso);
//   • o broto da cabeça é uma correntinha de Verlet — ele atrasa, chicoteia na
//     virada e balança sozinho quando ela está parada;
//   • os olhos olham para onde ela vai mirar, e piscam de vez em quando.
// Nada disso muda uma regra do jogo, e é tudo que faz o boneco ter alma.
// ---------------------------------------------------------------------------

import { Corpo, passo as passoFisica, prever } from './fisica.js';
import { BOLOTA, PLANAR, HABILIDADES } from './regras.js';
import { clamp, lerp, damp, TAU, easeOutCubic } from '../core/math.js';

export const ESTADO = {
  PARADO: 'parado', CARREGANDO: 'carregando', VOANDO: 'voando', GRUDADO: 'grudado',
};

/** Correntinha de Verlet: o broto que sai da cabeça. */
class Broto {
  constructor(n, comp) {
    this.n = n; this.comp = comp;
    this.px = new Float32Array(n); this.py = new Float32Array(n);
    this.ox = new Float32Array(n); this.oy = new Float32Array(n);
    this.iniciado = false;
  }
  reposicionar(x, y) {
    for (let i = 0; i < this.n; i++) {
      this.px[i] = x; this.py[i] = y - i * this.comp;
      this.ox[i] = this.px[i]; this.oy[i] = this.py[i];
    }
    this.iniciado = true;
  }
  passo(dt, baseX, baseY, ventoX, ventoY) {
    if (!this.iniciado) this.reposicionar(baseX, baseY);
    const amort = 0.86;
    for (let i = 1; i < this.n; i++) {
      const vx = (this.px[i] - this.ox[i]) * amort;
      const vy = (this.py[i] - this.oy[i]) * amort;
      this.ox[i] = this.px[i]; this.oy[i] = this.py[i];
      this.px[i] += vx + ventoX * dt;
      this.py[i] += vy + (900 + ventoY) * dt * dt * 60;
    }
    this.px[0] = baseX; this.py[0] = baseY;
    this.ox[0] = baseX; this.oy[0] = baseY;
    for (let k = 0; k < 6; k++) {
      for (let i = 0; i < this.n - 1; i++) {
        const dx = this.px[i + 1] - this.px[i], dy = this.py[i + 1] - this.py[i];
        const d = Math.hypot(dx, dy) || 1e-6;
        const dif = (d - this.comp) / d;
        const mx = dx * dif * 0.5, my = dy * dif * 0.5;
        if (i > 0) { this.px[i] += mx; this.py[i] += my; }
        else { this.px[i + 1] -= mx * 2; this.py[i + 1] -= my * 2; continue; }
        this.px[i + 1] -= mx; this.py[i + 1] -= my;
      }
    }
  }
}

export class Bolota {
  constructor() {
    this.corpo = new Corpo(0, 0, BOLOTA.raio);
    this.broto = new Broto(4, 13);
    this.habilidades = new Set(['salto']);
    this.reiniciar(0, 0);
  }

  reiniciar(x, y) {
    const c = this.corpo;
    c.x = x; c.y = y; c.px = x; c.py = y;
    c.vx = 0; c.vy = 0; c.noChao = false; c.impacto = 0;
    this.estado = ESTADO.PARADO;
    this.carga = 0;
    this.angulo = -Math.PI / 4;
    this.sx = 1; this.sy = 1;
    this.vsx = 0; this.vsy = 0;
    this.inclinacao = 0;
    this.tempo = 0;
    this.piscarT = 2.2;
    this.piscando = 0;
    this.olharX = 0.4; this.olharY = -0.3;
    this.saltos = 0;
    this.saltosNoAr = 0;
    this.coiote = 0;
    this.buffer = 0;
    this.planando = false;
    this.pousouAgora = 0;
    this.lancouAgora = 0;
    this.broto.reposicionar(x, y - BOLOTA.raio);
    this.trilha = [];
  }

  tem(h) { return this.habilidades.has(h); }
  aprender(h) { this.habilidades.add(h); }

  get podeCarregar() {
    // CARREGANDO precisa estar aqui: sem ele, o segundo quadro de um toque já
    // deixava de "poder carregar" e o jogo soltava o salto sozinho — segurar o
    // botão virava uma metralhadora de pulinhos. Uma vez que a preparação
    // começou de um jeito legítimo, ela continua válida até o jogador soltar.
    return this.estado === ESTADO.CARREGANDO
      || this.estado === ESTADO.PARADO
      || this.estado === ESTADO.GRUDADO
      || (this.coiote > 0 && this.estado === ESTADO.VOANDO)
      || (this.tem('flor') && this.estado === ESTADO.VOANDO && this.saltosNoAr < 1);
  }

  /**
   * @param entrada {segurando, mira:{x,y}, soltou}
   */
  atualizar(dt, entrada, mundo) {
    const c = this.corpo;
    this.tempo += dt;
    if (this.pousouAgora > 0) this.pousouAgora -= dt;
    if (this.lancouAgora > 0) this.lancouAgora -= dt;

    // --- mira ---------------------------------------------------------------
    if (entrada.mira) {
      const dx = entrada.mira.x - c.x, dy = entrada.mira.y - c.y;
      if (Math.hypot(dx, dy) > 6) this.angulo = Math.atan2(dy, dx);
    }
    if (entrada.anguloDireto !== undefined) this.angulo = entrada.anguloDireto;

    // --- carga --------------------------------------------------------------
    const podia = this.podeCarregar;
    if (entrada.segurando && podia) {
      if (this.estado !== ESTADO.CARREGANDO) {
        this.estado = ESTADO.CARREGANDO;
        this.carga = 0;
      }
      this.carga = Math.min(1, this.carga + dt / BOLOTA.cargaMax);
      if (c.noChao) { c.vx *= BOLOTA.freioCarga; c.vy *= BOLOTA.freioCarga; }
    } else if (this.estado === ESTADO.CARREGANDO) {
      this.lancar(mundo);
    }

    // buffer: apertou pouco antes de pousar
    if (entrada.segurando && !podia) this.buffer = BOLOTA.bufferComando;
    else if (this.buffer > 0) this.buffer -= dt;

    // --- planar --------------------------------------------------------------
    this.planando = false;
    if (this.tem('planar') && this.estado === ESTADO.VOANDO
      && entrada.segurando && c.vy > 60 && !this.podeCarregar) {
      this.planando = true;
    }

    // --- física ---------------------------------------------------------------
    const op = {
      gravidade: this.planando ? PLANAR.gravidade : 1,
      arrastoAr: this.planando ? PLANAR.arrasto : BOLOTA.arrastoAr,
      sub: 4,
    };
    if (this.estado === ESTADO.CARREGANDO && c.noChao) op.gravidade = 1;
    const antesNoChao = c.noChao;
    const contatos = passoFisica(c, mundo.formas, dt, op);
    if (c.vy > BOLOTA.quedaMax) c.vy = BOLOTA.quedaMax;

    // --- estados --------------------------------------------------------------
    if (c.noChao) {
      if (!antesNoChao && this.estado === ESTADO.VOANDO) this.pousar(c.impacto, mundo);
      this.coiote = BOLOTA.perdoaSaida;
      this.saltosNoAr = 0;
      if (this.estado !== ESTADO.CARREGANDO) this.estado = ESTADO.PARADO;
    } else {
      if (this.coiote > 0) this.coiote -= dt;
      if (this.estado === ESTADO.PARADO) this.estado = ESTADO.VOANDO;
    }
    if (this.buffer > 0 && this.podeCarregar && entrada.segurando) {
      this.buffer = 0;
    }

    this.animar(dt);
    return contatos;
  }

  lancar(mundo) {
    const c = this.corpo;
    const forca = lerp(BOLOTA.forcaMin, BOLOTA.forcaMax, easeOutCubic(this.carga));
    c.vx = Math.cos(this.angulo) * forca;
    c.vy = Math.sin(this.angulo) * forca;
    c.noChao = false;
    this.estado = ESTADO.VOANDO;
    this.saltos++;
    if (!(this.coiote > 0) && !c.noChao) this.saltosNoAr++;
    this.coiote = 0;
    this.lancouAgora = 0.3;
    // estica na direção do salto
    this.vsx += Math.abs(Math.cos(this.angulo)) * 4.5;
    this.vsy += Math.abs(Math.sin(this.angulo)) * 4.5;
    this.carga = 0;
    if (mundo && mundo.aoLancar) mundo.aoLancar(this);
  }

  pousar(forca, mundo) {
    this.pousouAgora = 0.34;
    this.vsy -= 4.2 * (0.35 + forca);
    this.vsx += 3.4 * (0.35 + forca);
    this.corpo.impacto = 0;
    if (mundo && mundo.aoPousar) mundo.aoPousar(this, forca);
  }

  /** Molas de esmagamento, inclinação no voo, piscada e o broto. */
  animar(dt) {
    const c = this.corpo;
    const alvoX = this.estado === ESTADO.CARREGANDO ? lerp(1, 1.26, this.carga) : 1;
    const alvoY = this.estado === ESTADO.CARREGANDO ? lerp(1, 0.72, this.carga) : 1;

    const k = 240, amort = 17;
    this.vsx += (alvoX - this.sx) * k * dt - this.vsx * amort * dt;
    this.vsy += (alvoY - this.sy) * k * dt - this.vsy * amort * dt;
    this.sx = clamp(this.sx + this.vsx * dt, 0.55, 1.75);
    this.sy = clamp(this.sy + this.vsy * dt, 0.55, 1.75);

    // no ar, ela se alonga no sentido do movimento
    const v = c.velocidade;
    if (this.estado === ESTADO.VOANDO && v > 200) {
      const t = clamp((v - 200) / 900, 0, 1) * 0.3;
      const ang = Math.atan2(c.vy, c.vx);
      this.inclinacao = damp(this.inclinacao, ang * 0.32, 9, dt);
      this.sx = lerp(this.sx, 1 + t, 0.35);
      this.sy = lerp(this.sy, 1 - t * 0.7, 0.35);
    } else {
      this.inclinacao = damp(this.inclinacao, 0, 8, dt);
    }

    // respiração quando parada
    if (this.estado === ESTADO.PARADO && v < 6) {
      const r = Math.sin(this.tempo * 2.1) * 0.018;
      this.sx += r; this.sy -= r;
    }

    // piscada
    this.piscarT -= dt;
    if (this.piscarT <= 0) { this.piscando = 0.13; this.piscarT = 2.2 + Math.random() * 3.4; }
    if (this.piscando > 0) this.piscando -= dt;

    // o olhar segue a mira; carregando, ela encara o alvo
    const ox = Math.cos(this.angulo), oy = Math.sin(this.angulo);
    const forcaOlhar = this.estado === ESTADO.CARREGANDO ? 1 : 0.55;
    this.olharX = damp(this.olharX, ox * forcaOlhar, 11, dt);
    this.olharY = damp(this.olharY, oy * forcaOlhar, 11, dt);

    // o broto atrasa e chicoteia
    const bx = c.x, by = c.y - BOLOTA.raio * this.sy * 0.72;
    this.broto.passo(dt, bx, by, -c.vx * 0.016, -c.vy * 0.004);

    // rastro curto durante o voo, para leitura do arco
    if (this.estado === ESTADO.VOANDO && v > 260) {
      this.trilha.push(c.x, c.y, 0.34);
      if (this.trilha.length > 90) this.trilha.splice(0, 3);
    }
    for (let i = 2; i < this.trilha.length; i += 3) {
      this.trilha[i] -= dt;
      if (this.trilha[i] <= 0) { this.trilha.splice(i - 2, 3); i -= 3; }
    }
  }

  /** Arco previsto do salto, para o jogador mirar. */
  previsao(mundo) {
    const c = this.corpo;
    const forca = lerp(BOLOTA.forcaMin, BOLOTA.forcaMax, easeOutCubic(this.carga));
    return prever(c.x, c.y, Math.cos(this.angulo) * forca, Math.sin(this.angulo) * forca,
      mundo.formas, c.r, 52, 1 / 40);
  }
}
