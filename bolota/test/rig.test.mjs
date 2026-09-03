// ---------------------------------------------------------------------------
// rig.test.mjs — o esqueleto e a animação procedural, em Node puro.
//
// Animação não tem "resultado certo" para conferir, mas tem coisas que NUNCA
// podem acontecer: um membro esticar além do próprio comprimento, um pé
// afundar no chão, um número virar NaN e sumir com o personagem da tela, ou a
// Bolota fechar numa bola — que é justamente o que ela não deve ser.
// ---------------------------------------------------------------------------

import { Rig, CORPO, ik2, chaoAbaixo } from '../src/render/rig.js';
import { Mundo } from '../src/game/mundo.js';
import { FASE1 } from '../src/game/niveis.js';

let pass = 0, fail = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log(`  ✓ ${n}`); }
  else { fail++; console.log(`  ✗ ${n}${d !== undefined ? ' — ' + d : ''}`); }
};
const DT = 1 / 60;
const parado = { segurando: false, mira: null };

console.log('\ncinemática inversa');
{
  const o = { x: 0, y: 0, fx: 0, fy: 0 };
  // alvo alcançável: a ponta tem que cair exatamente nele
  ik2(0, 0, 12, 9, 10, 10, 1, o);
  ok('a ponta alcança um alvo que está ao alcance',
    Math.hypot(o.fx - 12, o.fy - 9) < 0.02, Math.hypot(o.fx - 12, o.fy - 9).toFixed(4));
  ok('e a articulação fica à distância certa dos dois ossos',
    Math.abs(Math.hypot(o.x, o.y) - 10) < 0.02
    && Math.abs(Math.hypot(o.fx - o.x, o.fy - o.y) - 10) < 0.02);

  // alvo longe demais: o membro estica na direção dele, sem passar do tamanho
  ik2(0, 0, 100, 0, 10, 10, 1, o);
  ok('um alvo longe demais deixa o membro esticado, não elástico',
    Math.abs(o.fx - 20) < 0.05 && Math.abs(o.fy) < 0.05, `${o.fx.toFixed(2)},${o.fy.toFixed(2)}`);

  // alvo colado na raiz: continua sem NaN e sem dobra impossível
  ik2(0, 0, 0.001, 0, 10, 10, 1, o);
  ok('um alvo em cima da raiz não gera NaN',
    Number.isFinite(o.x) && Number.isFinite(o.y) && Number.isFinite(o.fx));

  // o lado da dobra decide para onde o joelho aponta
  const a = { x: 0, y: 0, fx: 0, fy: 0 }, b = { x: 0, y: 0, fx: 0, fy: 0 };
  ik2(0, 0, 0, 16, 10, 10, 1, a);
  ik2(0, 0, 0, 16, 10, 10, -1, b);
  ok('o sinal da dobra espelha a articulação', Math.sign(a.x) === -Math.sign(b.x) && a.x !== 0);
}

console.log('\ntraçado do chão');
{
  const m = new Mundo().carregar(FASE1, FASE1.habilidades);
  const y = chaoAbaixo(m.formas, 210, 900);
  ok('acha o chão embaixo do ponto de partida', isFinite(y) && y > 1000 && y < 1200, y);
  ok('e não acha chão nenhum no meio do céu',
    !isFinite(chaoAbaixo(m.formas, 210, -800, 200)));
}

console.log('\nrig em uma partida inteira');
{
  const m = new Mundo().carregar(FASE1, ['salto', 'planar']);
  const rig = new Rig();
  let finito = true, maiorNovelo = 0, peFundo = 0, membroEsticado = 0;
  let virouParaDireita = false, virouParaEsquerda = false;
  let mexeu = 0;
  let anterior = null;

  const conferir = () => {
    const p = rig.pose;
    const nums = [p.quadril.x, p.quadril.y, p.peito.x, p.peito.y, p.cabeca.x, p.cabeca.y,
      p.giroTronco, p.giroCabeca, p.giroCorpo, p.escalaX, p.escalaY, p.novelo];
    for (let k = 0; k < 2; k++) {
      nums.push(p.mao[k].x, p.mao[k].y, p.pe[k].x, p.pe[k].y,
        p.cotovelo[k].x, p.cotovelo[k].y, p.joelho[k].x, p.joelho[k].y, p.giroPe[k]);
    }
    for (const n of nums) if (!Number.isFinite(n)) finito = false;
    maiorNovelo = Math.max(maiorNovelo, p.novelo);
    if (p.dir > 0) virouParaDireita = true; else virouParaEsquerda = true;

    // nenhum membro pode passar do comprimento dos dois ossos somados
    for (let k = 0; k < 2; k++) {
      const braco = Math.hypot(p.mao[k].x - p.ombro[k].x, p.mao[k].y - p.ombro[k].y);
      const perna = Math.hypot(p.pe[k].x - p.anca[k].x, p.pe[k].y - p.anca[k].y);
      if (braco > CORPO.braco + CORPO.antebraco + 0.5) membroEsticado++;
      if (perna > CORPO.coxa + CORPO.canela + 0.5) membroEsticado++;
    }

    // com ela parada no chão, o pé não pode afundar na pedra
    const c = m.bolota.corpo;
    if (c.noChao && Math.abs(c.vx) < 30 && m.respawn <= 0) {
      for (let k = 0; k < 2; k++) {
        const chao = chaoAbaixo(m.formas, c.x + p.pe[k].x, c.y - CORPO.raio * 0.4);
        if (isFinite(chao) && c.y + p.pe[k].y > chao + 6) peFundo++;
      }
    }
    if (anterior !== null) {
      mexeu += Math.abs(p.mao[0].x - anterior[0]) + Math.abs(p.mao[0].y - anterior[1])
        + Math.abs(p.cabeca.y - anterior[2]) + Math.abs(p.quadril.x - anterior[3]);
    }
    anterior = [p.mao[0].x, p.mao[0].y, p.cabeca.y, p.quadril.x];
  };

  // 240 quadros parada (quatro segundos), depois saltos para os dois lados.
  // Descartamos o primeiro segundo: nele o rig ainda está se acomodando, e o
  // que interessa medir é se a pose de descanso continua viva DEPOIS disso.
  for (let i = 0; i < 60; i++) { m.passo(DT, parado); rig.atualizar(DT, m.bolota, m); conferir(); }
  mexeu = 0; anterior = null;
  for (let i = 0; i < 240; i++) { m.passo(DT, parado); rig.atualizar(DT, m.bolota, m); conferir(); }
  const paradaMexeu = mexeu;
  for (const [ang, cg] of [[-1.0, 0.9], [-2.3, 0.7], [-0.8, 1], [-2.6, 0.5], [-1.4, 0.8]]) {
    m.bolota.angulo = ang; m.bolota.carga = cg; m.bolota.lancar(m);
    for (let i = 0; i < 140; i++) { m.passo(DT, parado); rig.atualizar(DT, m.bolota, m); conferir(); }
  }
  // e um trecho carregando, que é a pose de antecipação
  for (let i = 0; i < 90; i++) {
    m.passo(DT, { segurando: true, mira: null });
    rig.atualizar(DT, m.bolota, m);
    conferir();
  }

  ok('nenhum número da pose vira NaN em ~900 quadros', finito);
  ok('nenhum membro estica além do próprio comprimento', membroEsticado === 0, membroEsticado);
  ok('nenhum pé afunda no chão com ela parada', peFundo === 0, peFundo);
  ok('ela vira para os dois lados conforme se move', virouParaDireita && virouParaEsquerda);
  ok('ela NUNCA se fecha numa bola', maiorNovelo <= 0.31, maiorNovelo.toFixed(3));
  ok('e mesmo parada ela respira, troca o peso e olha em volta',
    paradaMexeu > 12, 'movimento acumulado: ' + paradaMexeu.toFixed(1) + ' px');
}

console.log('\nbroto');
{
  const m = new Mundo().carregar(FASE1, FASE1.habilidades);
  const rig = new Rig();
  for (let i = 0; i < 200; i++) { m.passo(DT, parado); rig.atualizar(DT, m.bolota, m); }
  const br = rig.broto;
  let finito = true;
  for (let i = 0; i < br.n; i++) {
    if (!Number.isFinite(br.px[i]) || !Number.isFinite(br.py[i])) finito = false;
  }
  ok('a correntinha do broto continua finita', finito);
  ok('e ela fica EM PÉ, acima da cabeça',
    br.py[br.n - 1] < br.py[0] - br.comp * 1.5,
    `base ${br.py[0].toFixed(1)} · ponta ${br.py[br.n - 1].toFixed(1)}`);
  let comp = 0;
  for (let i = 0; i < br.n - 1; i++) {
    comp += Math.abs(Math.hypot(br.px[i + 1] - br.px[i], br.py[i + 1] - br.py[i]) - br.comp);
  }
  ok('os segmentos guardam o comprimento', comp / (br.n - 1) < 0.9, (comp / (br.n - 1)).toFixed(3));
}

console.log(`\n${pass} passaram · ${fail} falharam\n`);
process.exit(fail ? 1 : 0);
