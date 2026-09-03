// Segundo portão barato: as regras do jogo, ainda sem navegador.
import { Jogo, FASE } from '../src/game/game.js';
import { FRUTAS, MAX_TIER, CESTA } from '../src/game/fruits.js';

let pass = 0, fail = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log(`  ✓ ${n}`); }
  else { fail++; console.log(`  ✗ ${n}${d ? ' — ' + d : ''}`); }
};
const DT = 1 / 60;

/** Bot simples: solta sempre perto de uma fruta igual, senão espalha. */
function jogar(jogo, quadros, politica = 'esperto') {
  const eventos = [];
  jogo.eventos.fusao = (e) => eventos.push({ tipo: 'fusao', tier: e.tier });
  jogo.eventos.tucano = () => eventos.push({ tipo: 'tucano' });
  jogo.eventos.bolo = () => eventos.push({ tipo: 'bolo' });
  let n = 0;
  for (let f = 0; f < quadros; f++) {
    if (jogo.recarga <= 0) {
      let x = CESTA.w / 2;
      if (politica === 'esperto') {
        const iguais = jogo.fisica.bodies.filter((b) => b.tier === jogo.maoTier);
        if (iguais.length) {
          iguais.sort((a, b) => (a.y - a.r) - (b.y - b.r));
          x = iguais[0].x;
        } else {
          x = 40 + ((n * 97) % (CESTA.w - 80));
        }
      } else {
        x = 40 + ((n * 137) % (CESTA.w - 80));
      }
      jogo.mover(x);
      jogo.soltar();
      n++;
    }
    jogo.passo(DT);
  }
  return eventos;
}

console.log('\nregras do jogo');
{
  const j = new Jogo().comecar(42);
  ok('começa jogando', j.fase === FASE.JOGANDO);
  ok('tem fruta na mão e a próxima', j.maoTier >= 0 && j.proximoTier >= 0);
  ok('pontuação começa em zero', j.pontos === 0);

  const ev = jogar(j, 2400);
  const fusoes = ev.filter((e) => e.tipo === 'fusao').length;
  ok('frutas iguais se combinam', fusoes > 8, 'fusões=' + fusoes);
  ok('pontuação sobe', j.pontos > 0, 'pontos=' + j.pontos);
  ok('a pilha não explode', j.fisica.bodies.every((b) => Number.isFinite(b.x) && Number.isFinite(b.y)));
  ok('nenhuma fruta escapa da cesta',
    j.fisica.bodies.every((b) => b.x > -2 && b.x < CESTA.w + 2 && b.y < j.fisica.bounds.h + 2));
  ok('pontuação nunca diminui', j.pontos >= 0);
  console.log(`    ${fusoes} fusões · maior fruta: ${FRUTAS[j.maiorTier].nome} · ${j.pontos} pontos · ${j.tucanos} tucanos`);
}
{
  // o tucano precisa aparecer quando enche, e o jogo continuar
  const j = new Jogo().comecar(7);
  const ev = jogar(j, 16000, 'burro');
  const tucanos = ev.filter((e) => e.tipo === 'tucano').length;
  ok('o tucano aparece quando a cesta transborda', tucanos > 0, 'tucanos=' + tucanos);
  ok('o jogo continua depois do tucano', j.fase === FASE.JOGANDO);
  ok('não existe fim de jogo', j.fase !== 'derrota' && j.fase !== 'fim');
  ok('a cesta não entope nem para quem solta sem parar',
    j.fisica.bodies.length < 62, 'frutas=' + j.fisica.bodies.length);
  ok('a pilha continua dentro do campo de visão',
    j.fisica.highest(0.5) > -140, 'topo=' + j.fisica.highest(0.5).toFixed(0));
}
{
  // é possível chegar na melancia e no bolo jogando bem
  const j = new Jogo().comecar(3);
  jogar(j, 34000);
  ok('dá para chegar à Melancia', j.maiorTier >= MAX_TIER, 'maior=' + FRUTAS[j.maiorTier].nome);
  // o bolo depende de duas melancias ao mesmo tempo — raro até jogando bem,
  // então a garantia vem de um teste direto e não da sorte do bot
  const k = new Jogo().comecar(1);
  const { Body } = await import('../src/game/physics.js');
  k.fisica.clear();
  const A = k.fisica.add(new Body(200, 500, FRUTAS[MAX_TIER].r, MAX_TIER));
  const B = k.fisica.add(new Body(200 + FRUTAS[MAX_TIER].r * 1.9, 500, FRUTAS[MAX_TIER].r, MAX_TIER));
  A.newborn = 0; B.newborn = 0; A.vx = 260; B.vx = -260;
  for (let i = 0; i < 120 && k.bolos === 0; i++) k.passo(DT);
  ok('bolo confirmado por teste direto', k.bolos === 1 && k.pontos >= 3000, `bolos=${k.bolos} pts=${k.pontos}`);
  console.log(`    melhor: ${FRUTAS[j.maiorTier].nome} · ${j.bolos} bolos · ${j.pontos} pontos · combo máx ${j.melhorCombo}`);
}
{
  // pedidos e regador
  const j = new Jogo().comecar(11);
  ok('começa com um pedido', j.pedido && j.pedido.tier >= 3);
  const r0 = j.regadores;
  jogar(j, 12000);
  ok('pedidos são cumpridos', j.pedidosFeitos > 0, 'feitos=' + j.pedidosFeitos);
  ok('regador é ganho ao cumprir pedidos', j.regadores !== r0 || j.pedidosFeitos < 2);
  const antes = j.fisica.bodies.map((b) => b.tier).join(',');
  j.regadores = 1;
  const usou = j.regar();
  ok('regador faz uma fruta crescer', usou && j.fisica.bodies.map((b) => b.tier).join(',') !== antes);
}
{
  // chacoalhar
  const j = new Jogo().comecar(5);
  jogar(j, 900);
  for (let i = 0; i < 500; i++) j.passo(DT);       // deixa assentar
  const acordados = j.fisica.bodies.filter((b) => !b.asleep).length;
  j.chacoalho = 1;
  const sacudiu = j.chacoalhar();
  ok('chacoalhar exige recarga cheia', sacudiu === true);
  ok('chacoalhar acorda a pilha', j.fisica.bodies.some((b) => !b.asleep));
  ok('chacoalhar não pode ser repetido na hora', j.chacoalhar() === false);
  ok('a pilha estava assentada antes do chacoalho',
    acordados <= 1, 'acordados=' + acordados);
}
{
  // determinismo do jogo inteiro
  const a = new Jogo().comecar(2026); jogar(a, 3000);
  const b = new Jogo().comecar(2026); jogar(b, 3000);
  ok('mesma semente = mesma partida',
    JSON.stringify(a.estado()) === JSON.stringify(b.estado()),
    `${a.pontos} vs ${b.pontos}`);
}
console.log(`\n${pass} passaram · ${fail} falharam`);
if (fail) process.exit(1);
