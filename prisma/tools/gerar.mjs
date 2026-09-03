// ---------------------------------------------------------------------------
// gerar.mjs — monta a campanha e grava src/game/fases.js.
//
// Cada fase que sai daqui já passou pelo solucionador: tem solução provada e um
// número mínimo de peças conhecido. A curva de dificuldade não é palpite — é o
// mínimo medido, crescendo capítulo a capítulo.
// ---------------------------------------------------------------------------

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Rng } from '../src/core/rng.js';
import { TIPOS } from '../src/game/optica.js';
import { gerarFase, desserializar } from '../src/game/gerador.js';
import { resolver } from '../src/game/solver.js';

const aqui = dirname(fileURLToPath(import.meta.url));

const CAPITULOS = [
  {
    nome: 'Espelhos', dica: 'A luz bate no espelho e vira a esquina.',
    n: 6, cfg: { cols: 8, linhas: 6, tipos: [TIPOS.espelho], maxPecas: 3, minPecas: 1,
      minFlores: 1, maxFlores: 2, pedras: 2, fonteBranca: true },
    curva: [1, 1, 2, 2, 2, 3],
  },
  {
    nome: 'Divisores', dica: 'O divisor manda a luz para dois lados ao mesmo tempo.',
    n: 6, cfg: { cols: 9, linhas: 7, tipos: [TIPOS.espelho, TIPOS.divisor], maxPecas: 4, minPecas: 2,
      minFlores: 2, maxFlores: 3, pedras: 3, fonteBranca: true },
    curva: [2, 2, 3, 3, 3, 4],
  },
  {
    nome: 'Vidros coloridos', dica: 'O vidro tira uma cor da luz que passa por ele.',
    n: 6, cfg: { cols: 9, linhas: 7, tipos: [TIPOS.espelho, TIPOS.vidro], maxPecas: 4, minPecas: 2,
      minFlores: 1, maxFlores: 3, pedras: 3, fonteBranca: true },
    curva: [2, 2, 3, 3, 3, 4],
  },
  {
    nome: 'Prismas', dica: 'O prisma separa a luz branca em vermelho, verde e azul.',
    n: 6, cfg: { cols: 9, linhas: 8, tipos: [TIPOS.espelho, TIPOS.prisma], maxPecas: 4, minPecas: 2,
      minFlores: 2, maxFlores: 4, pedras: 3, fonteBranca: true },
    curva: [2, 2, 3, 3, 4, 4],
  },
  {
    nome: 'O jardim inteiro', dica: 'Tudo o que você aprendeu, junto.',
    n: 6, cfg: { cols: 10, linhas: 8, tipos: [TIPOS.espelho, TIPOS.divisor, TIPOS.vidro, TIPOS.prisma], maxPecas: 6, minPecas: 3,
      minFlores: 2, maxFlores: 4, pedras: 4, fonteBranca: true },
    curva: [3, 4, 4, 5, 5, 5],
  },
];

const rng = new Rng(20260903);
const fases = [];
let id = 0;

for (const cap of CAPITULOS) {
  const doCap = [];
  for (let k = 0; k < cap.n; k++) {
    const alvo = cap.curva[k];
    let escolhida = null;
    // procura uma fase com exatamente o mínimo pedido; várias tentativas,
    // porque o mínimo real só aparece depois de resolver
    for (let tent = 0; tent < 60 && !escolhida; tent++) {
      const f = gerarFase(rng, {
        ...cap.cfg, minMovimentos: alvo, maxMovimentos: alvo, maxNos: 90000,
      }, 60);
      if (!f) continue;
      const chave = JSON.stringify(f.celulas);
      if (doCap.some((o) => JSON.stringify(o.celulas) === chave)) continue;
      escolhida = f;
    }
    if (!escolhida) {
      // afrouxa: aceita um a mais
      escolhida = gerarFase(rng, {
        ...cap.cfg, minMovimentos: alvo, maxMovimentos: alvo + 1, maxNos: 90000,
      }, 120);
    }
    if (!escolhida) { console.error('não consegui gerar', cap.nome, k); process.exit(1); }
    doCap.push(escolhida);
  }
  doCap.sort((a, b) => a.movimentos - b.movimentos || a.flores - b.flores);
  for (const f of doCap) {
    fases.push({ id: id++, capitulo: cap.nome, ...f });
  }
}

// conferência final, do zero, fase por fase
let piorNos = 0;
for (const f of fases) {
  const tab = desserializar(f);
  const r = resolver(tab, f.bandeja, { maxNos: 150000 });
  if (!r.resolvido || r.movimentos !== f.movimentos) {
    console.error('FASE RUIM', f.id, r.resolvido, r.movimentos, f.movimentos);
    process.exit(1);
  }
  piorNos = Math.max(piorNos, r.nos);
}

const capitulos = CAPITULOS.map((c) => ({ nome: c.nome, dica: c.dica }));
const saida = `// GERADO por tools/gerar.mjs — não edite à mão.
// Cada fase aqui foi provada solúvel pelo solucionador, e "movimentos" é o
// número MÍNIMO de peças que resolve — medido, não estimado.
export const CAPITULOS = ${JSON.stringify(capitulos, null, 2)};

export const FASES = ${JSON.stringify(fases)};
`;
writeFileSync(resolve(aqui, '../src/game/fases.js'), saida);

console.log(`${fases.length} fases gravadas`);
for (const c of CAPITULOS) {
  const doCap = fases.filter((f) => f.capitulo === c.nome);
  console.log(`  ${c.nome.padEnd(20)} ${doCap.map((f) => f.movimentos).join(' ')}  · flores ${doCap.map((f) => f.flores).join('')}`);
}
console.log(`pior busca: ${piorNos} nós`);
