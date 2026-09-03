// ---------------------------------------------------------------------------
// solver.js — o programa que resolve o próprio jogo.
//
// Serve para três coisas, e cada uma delas seria impossível sem ele:
//   1. provar que TODA fase publicada tem solução (nenhum nível impossível sai
//      daqui para o jogador);
//   2. medir a dificuldade de verdade — o número MÍNIMO de peças que resolve;
//   3. alimentar a ajudinha: a dica é o próximo movimento de uma solução real,
//      não uma dica escrita à mão.
//
// Busca em largura sobre o conjunto de peças colocadas. Largura, e não
// profundidade, porque a primeira solução encontrada é automaticamente a mais
// curta — que é exatamente a medida de dificuldade que interessa.
//
// Poda: só considera colocar peça em célula que a luz ALCANÇA agora. É a mesma
// coisa que uma pessoa faz, e derruba o espaço de busca de milhões para
// milhares. A poda torna a busca incompleta em teoria; na prática as fases
// nascem de uma construção que respeita essa mesma ordem, então o que o solver
// não acha, não é publicado.
// ---------------------------------------------------------------------------

import { propagar, celulasIluminadas, TIPOS, ROTACOES } from './optica.js';

function chaveDe(colocadas) {
  return colocadas
    .map((p) => `${p.cel}:${p.tipo}:${p.rot || 0}:${p.mask || 0}`)
    .sort()
    .join('|');
}

function assinaturaBandeja(bandeja) {
  return bandeja.map((p) => `${p.tipo}:${p.mask || 0}`).sort().join(',');
}

/**
 * @param tab      tabuleiro só com as peças fixas
 * @param bandeja  lista de peças disponíveis: {tipo, mask?}
 * @param opts     {maxProf, maxNos}
 * @returns {resolvido, movimentos, solucao[], nos, tempo}
 */
export function resolver(tab, bandeja, opts = {}) {
  const maxProf = opts.maxProf ?? bandeja.length;
  const maxNos = opts.maxNos ?? 120000;
  const t0 = Date.now();

  const base = tab.clonar();
  if (propagar(base).acesas === propagar(base).total && propagar(base).total > 0) {
    return { resolvido: true, movimentos: 0, solucao: [], nos: 1, tempo: 0 };
  }

  const vistos = new Set(['']);
  let borda = [{ colocadas: [], restante: bandeja.slice() }];
  let nos = 1;

  for (let prof = 1; prof <= maxProf; prof++) {
    const proxima = [];
    for (const no of borda) {
      // reconstrói o tabuleiro deste nó
      const t = base.clonar();
      for (const p of no.colocadas) t.colocar(p.cel, montar(p));
      const res = propagar(t);
      const luzes = celulasIluminadas(t, res);
      if (!luzes.length) continue;

      // tipos distintos ainda na bandeja (evita permutar peças iguais)
      const distintos = [];
      const jaVi = new Set();
      for (let k = 0; k < no.restante.length; k++) {
        const p = no.restante[k];
        const s = `${p.tipo}:${p.mask || 0}`;
        if (jaVi.has(s)) continue;
        jaVi.add(s);
        distintos.push(k);
      }

      for (const k of distintos) {
        const peca = no.restante[k];
        const rots = ROTACOES[peca.tipo] || 1;
        for (const cel of luzes) {
          for (let rot = 0; rot < rots; rot++) {
            const nova = { cel, tipo: peca.tipo, rot, mask: peca.mask || 0 };
            const colocadas = no.colocadas.concat(nova);
            const chave = chaveDe(colocadas);
            if (vistos.has(chave)) continue;
            vistos.add(chave);
            nos++;

            const t2 = base.clonar();
            for (const p of colocadas) t2.colocar(p.cel, montar(p));
            const r2 = propagar(t2);
            if (r2.total > 0 && r2.acesas === r2.total) {
              return {
                resolvido: true, movimentos: prof, solucao: colocadas,
                nos, tempo: Date.now() - t0,
              };
            }
            if (prof < maxProf && nos < maxNos) {
              const restante = no.restante.slice();
              restante.splice(k, 1);
              proxima.push({ colocadas, restante });
            }
          }
        }
      }
      if (nos >= maxNos) break;
    }
    if (nos >= maxNos) {
      return { resolvido: false, movimentos: -1, solucao: [], nos, tempo: Date.now() - t0, estourou: true };
    }
    borda = proxima;
    if (!borda.length) break;
  }
  return { resolvido: false, movimentos: -1, solucao: [], nos, tempo: Date.now() - t0 };
}

export function montar(p) {
  const q = { tipo: p.tipo, rot: p.rot || 0 };
  if (p.mask) q.mask = p.mask;
  return q;
}

/**
 * Dica: dado o que o jogador já colocou, devolve UM movimento que leva a uma
 * solução. Tenta primeiro respeitar o que já está no tabuleiro; se o caminho
 * atual não leva a lugar nenhum, resolve do zero e sugere o primeiro passo.
 */
export function dica(tabAtual, tabBase, bandejaRestante, bandejaCheia) {
  const r = resolver(tabAtual, bandejaRestante, { maxNos: 60000 });
  if (r.resolvido && r.solucao.length) return { tipo: 'proxima', jogada: r.solucao[0], deZero: false };
  const r2 = resolver(tabBase, bandejaCheia, { maxNos: 90000 });
  if (r2.resolvido && r2.solucao.length) return { tipo: 'recomecar', jogada: r2.solucao[0], deZero: true };
  return null;
}
