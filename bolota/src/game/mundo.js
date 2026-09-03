// ---------------------------------------------------------------------------
// mundo.js — o estado de uma fase.
//
// A ideia que sustenta o jogo: **onde a Bolota encosta, o mundo floresce**.
// Musgo e florzinhas nascem em cada pouso (só enfeite, e é o que dá a sensação
// de estar pintando o caminho), e os brotos adormecidos viram plataforma ou
// cogumelo de verdade — esses mudam a física e abrem o caminho.
//
// Nada aqui pune. Cair não mata: o vento traz a Bolota de volta ao último lugar
// que ela fez florescer.
// ---------------------------------------------------------------------------

import { Forma, caixa, quad, colina } from './fisica.js';
import { Bolota, ESTADO } from './bolota.js';
import { MUNDO, BOLOTA } from './regras.js';
import { clamp, lerp, dist2, TAU } from '../core/math.js';
import { Rng } from '../core/rng.js';

export class Mundo {
  constructor() {
    this.eventos = {};
    this.rng = new Rng(7);
    this.bolota = new Bolota();
  }
  emit(n, d) { const f = this.eventos[n]; if (f) f(d || {}); }

  carregar(fase, habilidades) {
    this.fase = fase;
    this.rng.seed(fase.id * 7919 + 13);
    this.formas = [];
    this.terrenoInfo = [];

    for (const t of fase.terreno) {
      let f;
      if (t.tipo === 'colina') {
        f = colina(t.cx, t.topo, t.larg, t.alt, t.base, 14,
          { atrito: 0.34 + (t.musgo || 0) * 0.2, quique: 0.1 });
      } else {
        f = quad(t.p[0], t.p[1], t.p[2], t.p[3],
          { atrito: 0.34 + (t.musgo || 0) * 0.2, quique: 0.1 });
      }
      f.musgo = t.musgo ?? 0.6;
      f.origem = t;
      this.formas.push(f);
      this.terrenoInfo.push(f);
    }

    this.brotos = fase.brotos.map((b, i) => ({
      ...b, id: i, aberto: false, t: 0, forma: null,
    }));
    this.orvalho = fase.orvalho.map((o, i) => ({
      ...o, id: i, pego: false, t: this.rng.range(0, 6),
    }));
    this.meta = { ...fase.meta, aberta: false, t: 0 };

    this.marcas = [];          // musgo e florzinhas onde a Bolota pousou
    this.tempo = 0;
    this.quadro = 0;
    this.saltos = 0;
    this.quedas = 0;
    this.venceu = false;
    this.tempoVitoria = 0;
    this.respawn = 0;
    this.checkpoint = { x: fase.inicio.x, y: fase.inicio.y };
    this.florescido = 0;

    this.bolota.habilidades = new Set(habilidades || fase.habilidades || ['salto']);
    this.bolota.reiniciar(fase.inicio.x, fase.inicio.y);
    this.bolota.corpo.vy = 10;
    return this;
  }

  // --------------------------------------------------------------------------
  passo(dt, entrada) {
    this.quadro++;
    if (this.venceu) { this.tempoVitoria += dt; this.bolota.animar(dt); return; }
    this.tempo += dt;

    if (this.respawn > 0) {
      this.respawn -= dt;
      const k = 1 - this.respawn / MUNDO.respawnSuave;
      const c = this.bolota.corpo;
      c.x = lerp(this.quedaDe.x, this.checkpoint.x, k * k * (3 - 2 * k));
      c.y = lerp(this.quedaDe.y, this.checkpoint.y - 90, k * k * (3 - 2 * k));
      c.vx = 0; c.vy = 0;
      this.bolota.animar(dt);
      if (this.respawn <= 0) { this.bolota.estado = ESTADO.VOANDO; c.vy = 20; }
      return;
    }

    const contatos = this.bolota.atualizar(dt, entrada, this);

    // cogumelo-mola
    for (const k of contatos) {
      if (k.forma && k.forma.mola && k.ny < -0.3) {
        const c = this.bolota.corpo;
        c.vy = -MUNDO.molaForca;
        c.vx += k.nx * MUNDO.molaLateral;
        this.bolota.estado = ESTADO.VOANDO;
        this.bolota.vsy -= 6;
        this.bolota.saltosNoAr = 0;
        // O impulso devolve o comando: por um tempo generoso a Bolota pode
        // preparar um salto no ar. Sem isso o cogumelo era um susto — ela subia
        // muito e o jogador só assistia à queda.
        this.bolota.coiote = Math.max(this.bolota.coiote, MUNDO.perdoaMola);
        this.emit('mola', { x: k.x, y: k.y });
      }
    }

    this.verificarBrotos();
    this.verificarOrvalho();
    this.verificarMeta();
    this.verificarQueda();

    for (const b of this.brotos) if (b.aberto) b.t += dt;
    for (const o of this.orvalho) o.t += dt;
    if (this.meta.aberta) this.meta.t += dt;
    for (let i = this.marcas.length - 1; i >= 0; i--) {
      const m = this.marcas[i];
      if (m.t < 1) m.t = Math.min(1, m.t + dt * 2.4);
    }
  }

  verificarBrotos() {
    const c = this.bolota.corpo;
    for (const b of this.brotos) {
      if (b.aberto) continue;
      if (dist2(c.x, c.y, b.x, b.y) > MUNDO.raioBroto * MUNDO.raioBroto) continue;
      b.aberto = true; b.t = 0;
      if (b.tipo === 'folha') {
        const larg = b.larg || 200;
        const f = quad([b.x - larg / 2, b.y], [b.x + larg / 2, b.y - 6],
          [b.x + larg / 2, b.y + 26], [b.x - larg / 2, b.y + 32],
          { atrito: 0.55, quique: 0.06 });
        f.musgo = 1; f.folha = true; f.broto = b;
        b.forma = f;
        this.formas.push(f);
      } else if (b.tipo === 'mola') {
        // Cúpula, não tampo reto: com o topo plano a Bolota caía sempre no
        // mesmo ponto, era arremessada para cima na vertical e voltava ali —
        // um pula-pula infinito de onde ninguém saía. Curvo, cada pouso fora
        // do centro tem uma normal inclinada e joga a Bolota para o lado.
        const f = new Forma([
          [b.x - 62, b.y + 10], [b.x - 34, b.y - 4], [b.x + 34, b.y - 4],
          [b.x + 62, b.y + 10], [b.x + 52, b.y + 30], [b.x - 52, b.y + 30],
        ], { atrito: 0.5, quique: 0.05 });
        f.mola = true; f.musgo = 1; f.broto = b;
        b.forma = f;
        this.formas.push(f);
      }
      this.checkpoint = { x: b.x, y: b.y - 60 };
      this.florescido++;
      this.emit('florescer', b);
    }
  }

  verificarOrvalho() {
    const c = this.bolota.corpo;
    for (const o of this.orvalho) {
      if (o.pego) continue;
      if (dist2(c.x, c.y, o.x, o.y) > Math.pow(MUNDO.raioOrvalho + c.r, 2)) continue;
      o.pego = true;
      this.emit('orvalho', o);
    }
  }

  verificarMeta() {
    if (this.venceu || this.semMeta) return;
    const c = this.bolota.corpo;
    if (dist2(c.x, c.y, this.meta.x, this.meta.y) > Math.pow(this.meta.raio + c.r, 2)) return;
    this.venceu = true;
    this.tempoVitoria = 0;
    this.meta.aberta = true;
    this.emit('vencer', {
      saltos: this.bolota.saltos,
      orvalho: this.orvalho.filter((o) => o.pego).length,
      total: this.orvalho.length,
      quedas: this.quedas,
      tempo: this.tempo,
    });
  }

  verificarQueda() {
    const c = this.bolota.corpo;
    if (c.y < this.fase.altura + 220) return;
    this.quedas++;
    this.quedaDe = { x: c.x, y: c.y };
    this.respawn = MUNDO.respawnSuave;
    this.emit('cair', { x: c.x, y: c.y });
  }

  // --- ganchos que o visual usa ---------------------------------------------
  aoPousar(bolota, forca) {
    const c = bolota.corpo;
    this.marcas.push({
      x: c.x, y: c.y + c.r * 0.7, nx: c.normalX, ny: c.normalY,
      t: 0, semente: (this.rng.next() * 1000) | 0,
      grande: forca > 0.45,
    });
    if (this.marcas.length > 90) this.marcas.shift();
    this.emit('pousar', { x: c.x, y: c.y, forca });
  }
  aoLancar(bolota) {
    this.saltos++;
    this.emit('lancar', { x: bolota.corpo.x, y: bolota.corpo.y, carga: bolota.carga });
  }

  estado() {
    const c = this.bolota.corpo;
    return {
      quadro: this.quadro,
      tempo: +this.tempo.toFixed(3),
      x: +c.x.toFixed(2), y: +c.y.toFixed(2),
      vx: +c.vx.toFixed(2), vy: +c.vy.toFixed(2),
      estado: this.bolota.estado,
      noChao: c.noChao,
      saltos: this.bolota.saltos,
      brotos: this.brotos.filter((b) => b.aberto).length,
      totalBrotos: this.brotos.length,
      orvalho: this.orvalho.filter((o) => o.pego).length,
      totalOrvalho: this.orvalho.length,
      quedas: this.quedas,
      venceu: this.venceu,
      formas: this.formas.length,
      marcas: this.marcas.length,
    };
  }
}
