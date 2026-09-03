// ---------------------------------------------------------------------------
// jogo.test.mjs — as regras da fase, em Node puro, sem navegador.
//
// Aqui está a pergunta que mais importa num jogo de fases: **a fase 1 tem
// solução, e ela é justa?** Não é opinião: a busca de analise.js joga a fase de
// verdade e ou acha um caminho até a meta ou não acha. E como as gotas de
// orvalho são a razão de repetir a fase, cada uma também é provada alcançável.
// ---------------------------------------------------------------------------

import { Mundo } from '../src/game/mundo.js';
import { FASE1, FASES } from '../src/game/niveis.js';
import { BOLOTA, MUNDO, HABILIDADES } from '../src/game/regras.js';
import { analisar, analisarOrvalho, assentar, repetir } from '../src/game/analise.js';

let pass = 0, fail = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log(`  ✓ ${n}`); }
  else { fail++; console.log(`  ✗ ${n}${d !== undefined ? ' — ' + d : ''}`); }
};
const DT = 1 / 60;
const parado = { segurando: false, mira: null };

function novo(fase = FASE1, habs) {
  return new Mundo().carregar(fase, habs || fase.habilidades);
}
function correr(m, n, entrada = parado) { for (let i = 0; i < n; i++) m.passo(DT, entrada); return m; }

console.log('\nfase e regras');

// --- estrutura ---------------------------------------------------------------
{
  ok('a fase 1 declara tudo que o motor precisa',
    !!(FASE1.terreno.length && FASE1.brotos.length && FASE1.orvalho.length
      && FASE1.meta && FASE1.inicio && FASE1.largura && FASE1.altura));
  ok('a recompensa da fase é uma habilidade que existe',
    !FASE1.recompensa || !!HABILIDADES[FASE1.recompensa], FASE1.recompensa);
  ok('todas as fases têm id único',
    new Set(FASES.map((f) => f.id)).size === FASES.length);
  const dentro = FASE1.orvalho.every((o) => o.x > 0 && o.x < FASE1.largura && o.y > 0 && o.y < FASE1.altura)
    && FASE1.brotos.every((b) => b.x > 0 && b.x < FASE1.largura);
  ok('gotas e brotos ficam dentro do mapa', dentro);
}

// --- a Bolota assenta e fica parada ------------------------------------------
{
  const m = novo();
  correr(m, 180);
  const c = m.bolota.corpo;
  ok('a Bolota pousa e fica parada no começo',
    c.noChao && c.velocidade < 20 && m.bolota.estado === 'parado',
    `chao=${c.noChao} v=${c.velocidade.toFixed(1)} est=${m.bolota.estado}`);
  ok('ela não começa dentro do chão', c.y < FASE1.altura, c.y.toFixed(0));
  ok('nenhuma gota é pega sem sair do lugar', m.orvalho.every((o) => !o.pego));
}

// --- o salto ------------------------------------------------------------------
{
  const m = novo();
  correr(m, 120);
  const antes = m.bolota.corpo.x;
  const b = m.bolota;
  b.angulo = -Math.PI / 4;
  b.carga = 1;
  b.lancar(m);
  correr(m, 6);
  ok('soltar com carga cheia joga a Bolota para cima e para a direita',
    m.bolota.corpo.vx > 200 && m.bolota.corpo.vy < -200);
  correr(m, 200);
  ok('e ela avança de verdade', m.bolota.corpo.x > antes + 120,
    (m.bolota.corpo.x - antes).toFixed(0));
  ok('o contador de saltos conta', m.bolota.saltos === 1, m.bolota.saltos);
}

{
  // Carga fraca contra carga cheia: mais carga = mais longe, sempre.
  // Medimos o ALCANCE do voo, não onde ela parou: com carga média ela cai no
  // riacho, o vento a devolve ao começo e a distância final vira zero — o que
  // diz mais sobre o resgate do que sobre a força do salto.
  const dist = (cg) => {
    const m = novo();
    correr(m, 120);
    const x0 = m.bolota.corpo.x;
    m.bolota.angulo = -Math.PI / 4;
    m.bolota.carga = cg;
    m.bolota.lancar(m);
    let max = x0;
    for (let i = 0; i < 220 && m.respawn <= 0; i++) {
      m.passo(DT, parado);
      max = Math.max(max, m.bolota.corpo.x);
    }
    return max - x0;
  };
  const d = [0.1, 0.4, 0.7, 1].map(dist);
  ok('mais carga leva mais longe, sem exceção',
    d.every((v, i) => i === 0 || v > d[i - 1]), d.map((v) => v.toFixed(0)).join(' < '));
}

// --- brotos: eles mudam o terreno de verdade ---------------------------------
{
  const m = novo();
  correr(m, 60);
  const formasAntes = m.formas.length;
  const b = m.brotos[0];
  m.bolota.corpo.x = b.x; m.bolota.corpo.y = b.y;
  m.passo(DT, parado);
  ok('encostar num broto o faz florescer', b.aberto);
  ok('e a folha vira plataforma nova de verdade', m.formas.length === formasAntes + 1,
    `${formasAntes} → ${m.formas.length}`);
  ok('o broto aberto vira ponto de volta',
    Math.abs(m.checkpoint.x - b.x) < 1 && m.checkpoint.y < b.y);
}

{
  const m = novo();
  correr(m, 60);
  const mola = m.brotos.find((b) => b.tipo === 'mola');
  m.bolota.corpo.x = mola.x; m.bolota.corpo.y = mola.y;
  m.passo(DT, parado);
  const f = m.formas.find((x) => x.mola);
  ok('o cogumelo-mola entra no mundo com a marca de mola', !!f);
  // cair em cima dele tem que arremessar
  const c = m.bolota.corpo;
  c.x = mola.x; c.y = mola.y + 6; c.vx = 0; c.vy = 300;
  let maxSubida = 0;
  for (let i = 0; i < 40; i++) { m.passo(DT, parado); maxSubida = Math.min(maxSubida, c.vy); }
  ok('e ele arremessa a Bolota para cima', maxSubida < -900, maxSubida.toFixed(0));
}

// --- orvalho ------------------------------------------------------------------
{
  const m = novo();
  correr(m, 60);
  const o = m.orvalho[0];
  m.bolota.corpo.x = o.x; m.bolota.corpo.y = o.y;
  m.passo(DT, parado);
  ok('passar pela gota pega a gota', o.pego);
  const n = m.orvalho.filter((g) => g.pego).length;
  m.passo(DT, parado);
  ok('e ela não conta duas vezes', m.orvalho.filter((g) => g.pego).length === n);
}

// --- cair não machuca ---------------------------------------------------------
{
  const m = novo();
  correr(m, 60);
  const b = m.brotos[0];
  m.bolota.corpo.x = b.x; m.bolota.corpo.y = b.y;
  m.passo(DT, parado);                       // abre o broto = novo checkpoint
  const c = m.bolota.corpo;
  c.x = 1000; c.y = FASE1.altura + 400; c.vy = 900;
  m.passo(DT, parado);
  ok('cair fora do mapa não acaba o jogo', !m.venceu && m.quedas === 1);
  correr(m, Math.ceil(MUNDO.respawnSuave * 60) + 4);
  ok('o vento devolve a Bolota ao último broto',
    Math.abs(c.x - m.checkpoint.x) < 60 && c.y < FASE1.altura,
    `x=${c.x.toFixed(0)} y=${c.y.toFixed(0)}`);
  ok('e ela volta jogável, não travada', m.respawn <= 0);
}

// --- meta ---------------------------------------------------------------------
{
  const m = novo();
  correr(m, 30);
  let venceu = null;
  m.eventos.vencer = (r) => { venceu = r; };
  m.bolota.corpo.x = FASE1.meta.x; m.bolota.corpo.y = FASE1.meta.y;
  m.passo(DT, parado);
  ok('encostar na meta vence a fase', m.venceu && !!venceu);
  ok('e o resultado traz os números da partida',
    venceu && typeof venceu.saltos === 'number' && typeof venceu.tempo === 'number');
  const q = m.quadro;
  m.passo(DT, parado);
  ok('depois de vencer o mundo não simula mais física', m.quadro === q + 1 && m.venceu);
}

// --- determinismo --------------------------------------------------------------
{
  const rodar = () => {
    const m = novo();
    correr(m, 40);
    const saidas = [];
    for (const [ang, cg] of [[-1.1, 0.9], [-0.7, 1], [-1.4, 0.6]]) {
      m.bolota.angulo = ang; m.bolota.carga = cg; m.bolota.lancar(m);
      correr(m, 150);
      saidas.push(m.bolota.corpo.x.toFixed(4) + ',' + m.bolota.corpo.y.toFixed(4));
    }
    return saidas.join('|');
  };
  const a = rodar(), b = rodar();
  ok('a mesma sequência de saltos dá sempre o mesmo resultado', a === b, a + ' vs ' + b);
}

// --- planar (a habilidade que a fase 1 entrega) -------------------------------
{
  const queda = (habs, segurando) => {
    const m = novo(FASE1, habs);
    correr(m, 40);
    const c = m.bolota.corpo;
    c.x = 1000; c.y = 300; c.vx = 0; c.vy = 400;
    m.bolota.estado = 'voando';
    m.bolota.coiote = 0;      // longe de qualquer borda: aqui só a folha ajuda
    for (let i = 0; i < 40; i++) m.passo(DT, { segurando, mira: null });
    return c.vy;
  };
  const semFolha = queda(['salto'], true);
  const comFolha = queda(['salto', 'planar'], true);
  ok('a folha faz a Bolota cair bem mais devagar', comFolha < semFolha * 0.6,
    `${comFolha.toFixed(0)} contra ${semFolha.toFixed(0)}`);
  const comFolhaSolto = queda(['salto', 'planar'], false);
  ok('e só funciona enquanto o jogador segura', comFolhaSolto > comFolha * 1.4,
    `${comFolhaSolto.toFixed(0)} contra ${comFolha.toFixed(0)}`);
}

// --- a fase tem solução --------------------------------------------------------
console.log('\nprojeto da fase (o solucionador joga a fase)');
{
  const r = analisar(FASE1);
  ok('a fase 1 tem solução', r.resolvida, `nós=${r.nos}`);
  ok('e ela se resolve em poucos saltos', r.resolvida && r.saltos >= 2 && r.saltos <= 8, r.saltos);
  console.log(`      caminho mínimo: ${r.saltos} saltos · ${r.nos} nós · ${r.tempo} ms`);

  // o caminho encontrado tem que funcionar quando repetido num mundo só
  if (r.resolvida) {
    const q = repetir(FASE1, r.caminho);
    ok('o caminho do solucionador vence quando repetido no jogo', q.venceu);
    ok('e cada salto cai no mesmo lugar que a busca previu, no pixel',
      q.desvioMax < 0.01, q.desvioMax.toFixed(4) + ' px');
  }
}

{
  const r = analisarOrvalho(FASE1);
  ok('todas as gotas de orvalho são alcançáveis',
    r.faltando.length === 0, 'faltando: ' + JSON.stringify(r.faltando));
  console.log(`      gotas: [${r.alcancaveis}] · ${r.nos} nós · ${r.tempo} ms`);
}

// --- desempenho da simulação ----------------------------------------------------
{
  const m = novo();
  correr(m, 60);
  const t0 = performance.now();
  const N = 6000;
  for (let i = 0; i < N; i++) {
    if (i % 400 === 0) { m.bolota.angulo = -1 + Math.sin(i) * 0.5; m.bolota.carga = 0.8; m.bolota.lancar(m); }
    m.passo(DT, parado);
  }
  const ms = (performance.now() - t0) / N;
  ok('um quadro de mundo custa bem menos de 1 ms', ms < 0.35, ms.toFixed(4) + ' ms');
  console.log(`      ${ms.toFixed(4)} ms por quadro`);
}

console.log(`\n${pass} passaram · ${fail} falharam\n`);
process.exit(fail ? 1 : 0);
