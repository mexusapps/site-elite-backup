// ---------------------------------------------------------------------------
// optica.js — propagação da luz.
//
// Coração do jogo. Um feixe é (célula, direção, cor). A cor é uma máscara de
// três bits: vermelho, verde, azul. Somar luz é OR de bits — é assim que
// vermelho + verde vira amarelo, exatamente como luz de verdade.
//
// O algoritmo não é "seguir o raio": é ponto fixo sobre o estado
// (célula × direção) → máscara acumulada. Cada passo só ACRESCENTA bits, então
// o processo termina sempre, mesmo com espelhos formando um laço fechado —
// e, de quebra, dois feixes que entram na mesma célula na mesma direção se
// fundem sozinhos, que é o comportamento correto e o mais bonito de ver.
// ---------------------------------------------------------------------------

export const R = 1, G = 2, B = 4;
export const BRANCO = R | G | B;

export const CORES = {
  1: { id: 'vermelho', nome: 'vermelho', hex: '#ff4d5e', simbolo: 'triangulo' },
  2: { id: 'verde', nome: 'verde', hex: '#5fe07a', simbolo: 'circulo' },
  4: { id: 'azul', nome: 'azul', hex: '#4db4ff', simbolo: 'quadrado' },
  3: { id: 'amarelo', nome: 'amarelo', hex: '#ffd94d', simbolo: 'triangulo+circulo' },
  6: { id: 'ciano', nome: 'ciano', hex: '#4de3e0', simbolo: 'circulo+quadrado' },
  5: { id: 'magenta', nome: 'magenta', hex: '#ff6bd6', simbolo: 'triangulo+quadrado' },
  7: { id: 'branco', nome: 'branco', hex: '#fff6e0', simbolo: 'todos' },
};

// direções: 0 leste, 1 sul, 2 oeste, 3 norte
export const DX = [1, 0, -1, 0];
export const DY = [0, 1, 0, -1];
export const NOMES_DIR = ['leste', 'sul', 'oeste', 'norte'];
export const direita = (d) => (d + 1) & 3;
export const esquerda = (d) => (d + 3) & 3;
export const tras = (d) => (d + 2) & 3;

/** Espelho "/" (rot 0) e "\" (rot 1). */
export function refletir(d, rot) {
  // "/" : leste→norte, norte→leste, oeste→sul, sul→oeste
  if (rot === 0) return [3, 2, 1, 0][d];
  // "\" : leste→sul, sul→leste, oeste→norte, norte→oeste
  return [1, 0, 3, 2][d];
}

export const TIPOS = {
  vazio: 'vazio',
  fonte: 'fonte',
  flor: 'flor',
  pedra: 'pedra',
  espelho: 'espelho',
  divisor: 'divisor',
  prisma: 'prisma',
  vidro: 'vidro',
};

/** Peças que o jogador pode colocar, com quantas rotações cada uma tem. */
export const ROTACOES = { espelho: 2, divisor: 2, prisma: 1, vidro: 1 };

export class Tabuleiro {
  constructor(cols, linhas) {
    this.cols = cols;
    this.linhas = linhas;
    this.cel = new Array(cols * linhas);
    for (let i = 0; i < this.cel.length; i++) this.cel[i] = null;
  }

  idx(x, y) { return y * this.cols + x; }
  dentro(x, y) { return x >= 0 && y >= 0 && x < this.cols && y < this.linhas; }
  em(x, y) { return this.dentro(x, y) ? this.cel[this.idx(x, y)] : undefined; }
  por(i) { return this.cel[i]; }

  por2(i) { return { x: i % this.cols, y: (i / this.cols) | 0 }; }

  colocar(i, peca) { this.cel[i] = peca; }
  tirar(i) { const p = this.cel[i]; this.cel[i] = null; return p; }

  clonar() {
    const t = new Tabuleiro(this.cols, this.linhas);
    for (let i = 0; i < this.cel.length; i++) {
      t.cel[i] = this.cel[i] ? { ...this.cel[i] } : null;
    }
    return t;
  }
}

/**
 * Calcula toda a luz do tabuleiro.
 * Devolve:
 *   segmentos — o que desenhar: por célula e direção, a máscara de cor
 *   flores    — máscara que chegou em cada flor
 *   acesas    — quantas flores estão com a cor certa
 */
export function propagar(tab, limite = 4000) {
  const n = tab.cols * tab.linhas;
  const seg = new Uint8Array(n * 4);        // [celula*4 + dir] = máscara
  const entrada = new Uint8Array(n * 4);    // luz que ENTRA na célula por essa direção
  const flores = new Map();
  const fila = [];
  let passos = 0;

  const empurrar = (x, y, d, mask) => {
    if (!mask) return;
    if (!tab.dentro(x, y)) return;
    const alvo = tab.cel[tab.idx(x, y)];
    // pedra e lanterna param o feixe na borda da casa, não no meio dela
    if (alvo && (alvo.tipo === TIPOS.pedra || alvo.tipo === TIPOS.fonte)) return;
    const k = (tab.idx(x, y)) * 4 + d;
    if ((entrada[k] & mask) === mask) return;   // nada de novo
    entrada[k] |= mask;
    fila.push(x, y, d, entrada[k]);
  };

  // acende as fontes
  for (let i = 0; i < n; i++) {
    const p = tab.cel[i];
    if (p && p.tipo === TIPOS.fonte) {
      const { x, y } = tab.por2(i);
      empurrar(x + DX[p.dir], y + DY[p.dir], p.dir, p.mask);
    }
  }

  let qi = 0;
  while (qi < fila.length && passos++ < limite) {
    const x = fila[qi++], y = fila[qi++], d = fila[qi++], mask = fila[qi++];
    const i = tab.idx(x, y);
    const p = tab.cel[i];

    if (!p || p.tipo === TIPOS.vazio) {
      seg[i * 4 + d] |= mask;                 // atravessa
      empurrar(x + DX[d], y + DY[d], d, mask);
      continue;
    }

    switch (p.tipo) {
      case TIPOS.flor: {
        flores.set(i, (flores.get(i) || 0) | mask);
        break;                                  // a flor absorve
      }
      case TIPOS.pedra:
      case TIPOS.fonte:
        break;                                  // bloqueia
      case TIPOS.espelho: {
        const nd = refletir(d, p.rot);
        seg[i * 4 + nd] |= mask;
        empurrar(x + DX[nd], y + DY[nd], nd, mask);
        break;
      }
      case TIPOS.divisor: {
        const nd = refletir(d, p.rot);
        seg[i * 4 + d] |= mask;
        seg[i * 4 + nd] |= mask;
        empurrar(x + DX[d], y + DY[d], d, mask);
        empurrar(x + DX[nd], y + DY[nd], nd, mask);
        break;
      }
      case TIPOS.prisma: {
        // separa as cores: vermelho para a esquerda, verde em frente, azul à direita
        const saidas = [
          [esquerda(d), mask & R],
          [d, mask & G],
          [direita(d), mask & B],
        ];
        for (const [nd, m] of saidas) {
          if (!m) continue;
          seg[i * 4 + nd] |= m;
          empurrar(x + DX[nd], y + DY[nd], nd, m);
        }
        break;
      }
      case TIPOS.vidro: {
        const m = mask & p.mask;
        if (m) {
          seg[i * 4 + d] |= m;                  // só a parte filtrada sai
          empurrar(x + DX[d], y + DY[d], d, m);
        }
        break;
      }
      default:
        break;
    }
  }

  // conta as flores satisfeitas
  let acesas = 0, total = 0;
  for (let i = 0; i < n; i++) {
    const p = tab.cel[i];
    if (!p || p.tipo !== TIPOS.flor) continue;
    total++;
    if ((flores.get(i) || 0) === p.mask) acesas++;
  }

  return { seg, entrada, flores, acesas, total, estourou: passos >= limite };
}

/** Todas as flores com a cor exata que sonharam. */
export function venceu(tab) {
  const r = propagar(tab);
  return r.total > 0 && r.acesas === r.total;
}

/** Células vazias tocadas pela luz — é onde faz sentido pôr uma peça. */
export function celulasIluminadas(tab, res) {
  const r = res || propagar(tab);
  const out = [];
  const n = tab.cols * tab.linhas;
  for (let i = 0; i < n; i++) {
    if (tab.cel[i]) continue;
    let luz = 0;
    for (let d = 0; d < 4; d++) luz |= r.seg[i * 4 + d];
    if (luz) out.push(i);
  }
  return out;
}
