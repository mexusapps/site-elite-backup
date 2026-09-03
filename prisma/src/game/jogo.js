// ---------------------------------------------------------------------------
// jogo.js — o estado de uma partida: a fase, a bandeja, o que já foi colocado,
// o desfazer e a ajudinha.
//
// Nada aqui pode punir. Não existe erro, não existe limite de tentativas, não
// existe contagem de tempo. A única contagem é quantas peças você usou — e ela
// serve para elogiar quem acha a solução mais curta, nunca para cobrar.
// ---------------------------------------------------------------------------

import { Tabuleiro, propagar, TIPOS, ROTACOES, BRANCO } from './optica.js';
import { desserializar } from './gerador.js';
import { resolver } from './solver.js';
import { clamp, lerp } from '../core/math.js';

let PROX = 1;

export class Partida {
  constructor() {
    this.eventos = {};
    this.aberturas = new Map();
  }

  emit(n, d) { const f = this.eventos[n]; if (f) f(d || {}); }

  carregar(fase) {
    this.fase = fase;
    this.base = desserializar(fase);
    this.tab = this.base.clonar();
    this.bandeja = fase.bandeja.map((p) => ({
      id: PROX++, tipo: p.tipo, mask: p.mask, cel: null, rot: 0,
    }));
    this.historico = [];
    this.movimentos = 0;
    this.completa = false;
    this.tempoCompleta = 0;
    this.dicaAtual = null;
    this.dicasUsadas = 0;
    this.aberturas = new Map();
    this.destaque = -1;
    this.atualizar(true);
    return this;
  }

  // --- consultas -------------------------------------------------------------
  itemEm(cel) { return this.bandeja.find((b) => b.cel === cel) || null; }
  naBandeja() { return this.bandeja.filter((b) => b.cel === null); }
  usadas() { return this.bandeja.filter((b) => b.cel !== null).length; }
  get flores() {
    const out = [];
    for (let i = 0; i < this.tab.cel.length; i++) {
      const p = this.tab.cel[i];
      if (p && p.tipo === TIPOS.flor) out.push({ cel: i, mask: p.mask });
    }
    return out;
  }

  // --- ações -----------------------------------------------------------------
  podeColocar(cel) {
    return !this.completa && cel >= 0 && cel < this.tab.cel.length && !this.tab.cel[cel];
  }

  colocar(item, cel) {
    if (!item || item.cel !== null || !this.podeColocar(cel)) return false;
    item.cel = cel;
    item.rot = 0;
    this.tab.colocar(cel, this._peca(item));
    this.historico.push({ acao: 'colocar', id: item.id, cel });
    this.movimentos++;
    this.dicaAtual = null;
    this.emit('colocar', { cel, tipo: item.tipo, n: this.usadas() });
    this.atualizar();
    return true;
  }

  girar(cel) {
    const item = this.itemEm(cel);
    if (!item || this.completa) return false;
    const rots = ROTACOES[item.tipo] || 1;
    if (rots < 2) return false;
    item.rot = (item.rot + 1) % rots;
    this.tab.colocar(cel, this._peca(item));
    this.historico.push({ acao: 'girar', id: item.id, cel });
    this.dicaAtual = null;
    this.emit('girar', { cel });
    this.atualizar();
    return true;
  }

  tirar(cel) {
    const item = this.itemEm(cel);
    if (!item || this.completa) return false;
    const rotAntes = item.rot;
    item.cel = null; item.rot = 0;
    this.tab.tirar(cel);
    this.historico.push({ acao: 'tirar', id: item.id, cel, rot: rotAntes });
    this.dicaAtual = null;
    this.emit('tirar', { cel });
    this.atualizar();
    return true;
  }

  desfazer() {
    const h = this.historico.pop();
    if (!h || this.completa) return false;
    const item = this.bandeja.find((b) => b.id === h.id);
    if (!item) return false;
    if (h.acao === 'colocar') {
      item.cel = null; item.rot = 0;
      this.tab.tirar(h.cel);
      this.movimentos = Math.max(0, this.movimentos - 1);
    } else if (h.acao === 'girar') {
      const rots = ROTACOES[item.tipo] || 1;
      item.rot = (item.rot + rots - 1) % rots;
      this.tab.colocar(h.cel, this._peca(item));
    } else if (h.acao === 'tirar') {
      item.cel = h.cel; item.rot = h.rot;
      this.tab.colocar(h.cel, this._peca(item));
    }
    this.dicaAtual = null;
    this.emit('desfazer', {});
    this.atualizar();
    return true;
  }

  limpar() {
    for (const b of this.bandeja) {
      if (b.cel !== null) { this.tab.tirar(b.cel); b.cel = null; b.rot = 0; }
    }
    this.historico.length = 0;
    this.movimentos = 0;
    this.dicaAtual = null;
    this.emit('limpar', {});
    this.atualizar();
  }

  _peca(item) {
    const p = { tipo: item.tipo, rot: item.rot };
    if (item.mask !== undefined) p.mask = item.mask;
    return p;
  }

  // --- ajudinha ---------------------------------------------------------------
  /**
   * A dica não é escrita à mão: é o próximo passo de uma solução que o
   * solucionador acabou de encontrar a partir do tabuleiro atual. Se o caminho
   * em que o jogador está não leva a lugar nenhum, ela avisa e sugere recomeçar.
   */
  pedirDica() {
    if (this.completa) return null;
    const restante = this.naBandeja().map((b) => ({ tipo: b.tipo, mask: b.mask }));
    let r = resolver(this.tab, restante, { maxNos: 60000 });
    let recomecar = false;
    if (!r.resolvido || !r.solucao.length) {
      const cheia = this.bandeja.map((b) => ({ tipo: b.tipo, mask: b.mask }));
      r = resolver(this.base, cheia, { maxNos: 90000 });
      recomecar = true;
    }
    if (!r.resolvido || !r.solucao.length) return null;
    this.dicasUsadas++;
    this.dicaAtual = { jogada: r.solucao[0], recomecar };
    this.destaque = r.solucao[0].cel;
    this.emit('dica', this.dicaAtual);
    return this.dicaAtual;
  }

  // --- luz --------------------------------------------------------------------
  atualizar(inicial = false) {
    this.res = propagar(this.tab);
    const antes = this.acesas || 0;
    this.acesas = this.res.acesas;
    this.total = this.res.total;

    for (const f of this.flores) {
      const ok = (this.res.flores.get(f.cel) || 0) === f.mask;
      const a = this.aberturas.get(f.cel) || 0;
      if (ok && a < 0.02 && !inicial) this.emit('flor', { cel: f.cel, mask: f.mask });
      if (!this.aberturas.has(f.cel)) this.aberturas.set(f.cel, ok && inicial ? 1 : 0);
      this.aberturas.set(f.cel, this.aberturas.get(f.cel));
    }

    if (!this.completa && this.total > 0 && this.acesas === this.total) {
      this.completa = true;
      this.tempoCompleta = 0;
      this.emit('completa', { movimentos: this.movimentos, minimo: this.fase.movimentos });
    }
  }

  passo(dt) {
    if (this.completa) this.tempoCompleta += dt;
    for (const f of this.flores) {
      const ok = (this.res.flores.get(f.cel) || 0) === f.mask;
      const a = this.aberturas.get(f.cel) || 0;
      const alvo = ok ? 1 : 0;
      const v = ok ? lerp(a, alvo, 1 - Math.pow(0.0006, dt)) : lerp(a, alvo, 1 - Math.pow(0.02, dt));
      this.aberturas.set(f.cel, Math.abs(v - alvo) < 0.002 ? alvo : v);
    }
  }

  get claridade() {
    return this.total ? this.acesas / this.total : 0;
  }

  estado() {
    return {
      fase: this.fase.id,
      cols: this.fase.cols,
      linhas: this.fase.linhas,
      movimentos: this.movimentos,
      minimo: this.fase.movimentos,
      usadas: this.usadas(),
      naBandeja: this.naBandeja().length,
      acesas: this.acesas,
      total: this.total,
      completa: this.completa,
      dicas: this.dicasUsadas,
      claridade: +this.claridade.toFixed(3),
      historico: this.historico.length,
    };
  }
}
