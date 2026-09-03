// ---------------------------------------------------------------------------
// gerador.js — fases criadas jogando de trás para frente.
//
// A técnica é a que a literatura de geração procedural chama de "gerar pelo
// jogo": em vez de sortear um tabuleiro e torcer para ter solução, o gerador
// CONSTRÓI uma solução — acende a fonte, caminha com o feixe colocando peças e
// planta uma flor onde a luz termina. Depois recolhe as peças móveis para a
// bandeja. Assim a fase já nasce com solução garantida; o solucionador entra
// depois só para medir a dificuldade real (o menor número de peças que resolve)
// e descartar o que ficou trivial ou grande demais.
// ---------------------------------------------------------------------------

import {
  Tabuleiro, propagar, TIPOS, R, G, B, BRANCO,
  DX, DY, refletir, direita, esquerda,
} from './optica.js';
import { resolver } from './solver.js';

const MASCARAS_VIDRO = [R, G, B, R | G, G | B, R | B];

function bits(m) { return ((m & 1) ? 1 : 0) + ((m & 2) ? 1 : 0) + ((m & 4) ? 1 : 0); }

/** Uma tentativa de construção. Pode falhar; quem chama tenta de novo. */
function construir(rng, cfg) {
  const t = new Tabuleiro(cfg.cols, cfg.linhas);
  const moveis = [];
  const flores = [];

  // fonte numa borda, apontando para dentro
  const lado = rng.int(0, 3);
  let fx, fy, fd;
  if (lado === 0) { fx = 0; fy = rng.int(1, cfg.linhas - 2); fd = 0; }
  else if (lado === 1) { fx = cfg.cols - 1; fy = rng.int(1, cfg.linhas - 2); fd = 2; }
  else if (lado === 2) { fx = rng.int(1, cfg.cols - 2); fy = 0; fd = 1; }
  else { fx = rng.int(1, cfg.cols - 2); fy = cfg.linhas - 1; fd = 3; }
  const corFonte = cfg.fonteBranca ? BRANCO : rng.pick([BRANCO, BRANCO, R | G, G | B, R | B]);
  t.colocar(t.idx(fx, fy), { tipo: TIPOS.fonte, dir: fd, mask: corFonte });

  const ramos = [{ x: fx, y: fy, d: fd, mask: corFonte, passos: 0 }];
  let orcamento = cfg.maxPecas;
  let guarda = 0;

  const livre = (x, y) => t.dentro(x, y) && !t.em(x, y);
  const cabe = (x, y, d, n) => {
    for (let k = 1; k <= n; k++) if (!t.dentro(x + DX[d] * k, y + DY[d] * k)) return false;
    return true;
  };

  while (ramos.length && guarda++ < 400) {
    const r = ramos.shift();
    let { x, y, d, mask } = r;
    let andou = 0;
    let fechou = false;

    while (guarda++ < 400) {
      const nx = x + DX[d], ny = y + DY[d];
      if (!t.dentro(nx, ny)) break;              // saiu do tabuleiro: ramo morre
      if (t.em(nx, ny)) break;                   // esbarrou em algo já posto
      x = nx; y = ny; andou++;

      const podeFlor = andou >= 2 && flores.length < cfg.maxFlores;
      const chanceFlor = podeFlor ? 0.16 + andou * 0.07 + (orcamento <= 0 ? 0.6 : 0) : 0;
      if (podeFlor && rng.next() < chanceFlor) {
        t.colocar(t.idx(x, y), { tipo: TIPOS.flor, mask });
        flores.push({ cel: t.idx(x, y), mask });
        fechou = true;
        break;
      }

      if (orcamento > 0 && andou >= 1 && rng.next() < 0.45) {
        const escolha = escolherPeca(rng, cfg, mask, x, y, d, cabe);
        if (escolha) {
          orcamento--;
          t.colocar(t.idx(x, y), escolha.peca);
          moveis.push({ cel: t.idx(x, y), ...escolha.peca });
          for (const s of escolha.saidas) {
            ramos.push({ x, y, d: s.d, mask: s.mask, passos: r.passos + 1 });
          }
          fechou = true;
          break;
        }
      }
    }

    // ramo que morreu sem flor: planta uma na última célula livre, se der
    if (!fechou && flores.length < cfg.maxFlores && andou >= 1 && livre(x, y)) {
      t.colocar(t.idx(x, y), { tipo: TIPOS.flor, mask });
      flores.push({ cel: t.idx(x, y), mask });
    }
  }

  if (flores.length < cfg.minFlores || moveis.length < cfg.minPecas) return null;

  // pedras decorativas só onde a luz nunca passa — nunca atrapalham a solução
  const res = propagar(t);
  const escuras = [];
  for (let i = 0; i < t.cel.length; i++) {
    if (t.cel[i]) continue;
    let luz = 0;
    for (let k = 0; k < 4; k++) luz |= res.seg[i * 4 + k];
    if (!luz) escuras.push(i);
  }
  rng.shuffle(escuras);
  const nPedras = Math.min(cfg.pedras, escuras.length);
  for (let k = 0; k < nPedras; k++) t.colocar(escuras[k], { tipo: TIPOS.pedra });

  // confere que a construção realmente acende tudo
  const conf = propagar(t);
  if (conf.total === 0 || conf.acesas !== conf.total) return null;

  // recolhe as peças móveis para a bandeja
  const base = t.clonar();
  const bandeja = [];
  for (const m of moveis) {
    base.tirar(m.cel);
    bandeja.push(m.mask !== undefined && m.tipo === TIPOS.vidro
      ? { tipo: m.tipo, mask: m.mask } : { tipo: m.tipo });
  }
  return { base, bandeja, solucaoConstruida: moveis, flores: flores.length };
}

function escolherPeca(rng, cfg, mask, x, y, d, cabe) {
  const tipos = rng.shuffle(cfg.tipos.slice());
  for (const tipo of tipos) {
    if (tipo === TIPOS.espelho) {
      const rots = rng.shuffle([0, 1]);
      for (const rot of rots) {
        const nd = refletir(d, rot);
        if (cabe(x, y, nd, 2)) {
          return { peca: { tipo, rot }, saidas: [{ d: nd, mask }] };
        }
      }
    } else if (tipo === TIPOS.divisor) {
      const rots = rng.shuffle([0, 1]);
      for (const rot of rots) {
        const nd = refletir(d, rot);
        if (cabe(x, y, nd, 2) && cabe(x, y, d, 2)) {
          return { peca: { tipo, rot }, saidas: [{ d, mask }, { d: nd, mask }] };
        }
      }
    } else if (tipo === TIPOS.prisma) {
      if (bits(mask) < 2) continue;
      const saidas = [];
      if (mask & R) saidas.push({ d: esquerda(d), mask: R });
      if (mask & G) saidas.push({ d, mask: G });
      if (mask & B) saidas.push({ d: direita(d), mask: B });
      if (saidas.every((s) => cabe(x, y, s.d, 2))) {
        return { peca: { tipo, rot: 0 }, saidas };
      }
    } else if (tipo === TIPOS.vidro) {
      const cands = rng.shuffle(MASCARAS_VIDRO.slice());
      for (const fm of cands) {
        const nova = mask & fm;
        if (!nova || nova === mask) continue;         // precisa mudar a cor
        if (!cabe(x, y, d, 2)) continue;
        return { peca: { tipo, mask: fm }, saidas: [{ d, mask: nova }] };
      }
    }
  }
  return null;
}

/**
 * Gera uma fase com dificuldade dentro da faixa pedida.
 * Devolve null se não conseguir dentro do número de tentativas.
 */
export function gerarFase(rng, cfg, tentativas = 120) {
  for (let n = 0; n < tentativas; n++) {
    const c = construir(rng, cfg);
    if (!c) continue;
    const r = resolver(c.base, c.bandeja, { maxNos: cfg.maxNos || 60000 });
    if (!r.resolvido) continue;
    if (r.movimentos < cfg.minMovimentos) continue;
    if (cfg.maxMovimentos && r.movimentos > cfg.maxMovimentos) continue;
    return {
      cols: cfg.cols,
      linhas: cfg.linhas,
      celulas: serializar(c.base),
      bandeja: c.bandeja,
      movimentos: r.movimentos,
      flores: c.flores,
      nos: r.nos,
    };
  }
  return null;
}

export function serializar(tab) {
  const out = [];
  for (let i = 0; i < tab.cel.length; i++) {
    const p = tab.cel[i];
    if (!p) continue;
    const o = { i, t: p.tipo };
    if (p.dir !== undefined) o.d = p.dir;
    if (p.rot) o.r = p.rot;
    if (p.mask !== undefined) o.m = p.mask;
    out.push(o);
  }
  return out;
}

export function desserializar(fase) {
  const t = new Tabuleiro(fase.cols, fase.linhas);
  for (const c of fase.celulas) {
    const p = { tipo: c.t };
    if (c.d !== undefined) p.dir = c.d;
    if (c.r !== undefined) p.rot = c.r;
    if (c.m !== undefined) p.mask = c.m;
    t.colocar(c.i, p);
  }
  return t;
}
