// ---------------------------------------------------------------------------
// analise.js — o programa que joga a fase sozinho.
//
// Num jogo de salto, "a fase tem solução" não é opinião: ou existe uma sequência
// de saltos que chega à meta, ou a fase é um beco. Esta busca prova isso.
//
// Como funciona: de cada ponto de descanso, ela testa uma grade de ângulos e
// forças, simula o voo até a Bolota parar de novo, e trata cada pouso como um
// novo nó. Busca em largura, então o primeiro caminho encontrado é o de MENOS
// saltos — que vira o "par" mostrado ao jogador.
//
// O estado inclui quais brotos já floresceram, porque eles mudam o terreno: o
// mesmo lugar com uma plataforma nova é outro estado.
// ---------------------------------------------------------------------------

import { Mundo } from './mundo.js';
import { ESTADO } from './bolota.js';
import { BOLOTA } from './regras.js';
import { lerp, easeOutCubic, dist2 } from '../core/math.js';

// O mesmo passo do jogo: um caminho provado aqui tem que se reproduzir igual
// no navegador, e 1/50 contra 1/60 já basta para a trajetória divergir.
const DT = 1 / 60;

function chave(x, y, mascara) {
  return `${Math.round(x / 44)},${Math.round(y / 44)},${mascara}`;
}

function mascaraDe(mundo) {
  let m = 0;
  for (const b of mundo.brotos) if (b.aberto) m |= (1 << b.id);
  return m;
}

const PARADO = { segurando: false, mira: null };

/**
 * O jogo não começa com a Bolota parada: ela cai os últimos palmos e assenta.
 * A busca precisa partir EXATAMENTE do mesmo lugar que o jogador, senão o
 * caminho que ela encontra não se reproduz quadro a quadro no navegador —
 * um erro de meio pixel no primeiro salto já muda o resto da fase.
 */
export function assentar(fase, habilidades, quadros = 90) {
  const m = new Mundo().carregar(fase, habilidades || fase.habilidades);
  for (let i = 0; i < quadros; i++) m.passo(DT, PARADO);
  return m;
}

/** Recria o mundo num estado dado: posição, brotos abertos e orvalho pego. */
function montar(fase, habilidades, x, y, mascara, semMeta) {
  const m = new Mundo().carregar(fase, habilidades);
  m.semMeta = !!semMeta;
  for (const b of m.brotos) {
    if (mascara & (1 << b.id)) {
      const c = m.bolota.corpo;
      const gx = c.x, gy = c.y;
      c.x = b.x; c.y = b.y;
      m.verificarBrotos();
      c.x = gx; c.y = gy;
    }
  }
  m.bolota.reiniciar(x, y);
  m.bolota.corpo.noChao = true;
  return m;
}

/** Simula um salto e devolve onde a Bolota parou. */
function saltar(m, angulo, carga, maxPassos = 220, objetivo = null) {
  const b = m.bolota;
  b.angulo = angulo;
  b.carga = carga;
  b.lancar(m);
  let parada = 0;
  for (let i = 0; i < maxPassos; i++) {
    m.passo(DT, { segurando: false, mira: null });
    if (objetivo ? objetivo(m) : m.venceu) {
      return { venceu: true, x: m.bolota.corpo.x, y: m.bolota.corpo.y, m };
    }
    if (m.respawn > 0) return { fora: true, m };
    const c = m.bolota.corpo;
    if (c.noChao && c.velocidade < 14) {
      parada += DT;
      if (parada > 0.16) return { x: c.x, y: c.y, m };
    } else parada = 0;
  }
  const c = m.bolota.corpo;
  return { x: c.x, y: c.y, m, tempoEsgotado: true };
}

/**
 * @returns {resolvida, saltos, caminho[], nos, orvalhoAlcancavel[]}
 */
export function analisar(fase, opcoes = {}) {
  const habilidades = opcoes.habilidades || fase.habilidades;
  const nAng = opcoes.angulos || 14;
  const nCarga = opcoes.cargas || 4;
  const maxNos = opcoes.maxNos || 260;
  const maxSaltos = opcoes.maxSaltos || 9;
  const t0 = Date.now();

  const angulos = [];
  for (let i = 0; i < nAng; i++) {
    angulos.push(-Math.PI * 0.97 + (Math.PI * 0.94 * i) / (nAng - 1));
  }
  const cargas = [];
  for (let i = 0; i < nCarga; i++) cargas.push(0.34 + (0.66 * i) / (nCarga - 1));

  const objetivo = opcoes.objetivo || null;
  const semMeta = !!opcoes.semMeta;
  const m0 = assentar(fase, habilidades);
  const inicio = { x: m0.bolota.corpo.x, y: m0.bolota.corpo.y, mascara: mascaraDe(m0) };
  const vistos = new Set([chave(inicio.x, inicio.y, inicio.mascara)]);
  let borda = [{ ...inicio, caminho: [] }];
  let nos = 1;
  const orvalhoVisto = new Set();
  let melhorX = inicio.x;

  for (let prof = 1; prof <= maxSaltos; prof++) {
    const prox = [];
    for (const no of borda) {
      for (const ang of angulos) {
        for (const cg of cargas) {
          if (nos >= maxNos * 8) break;
          const m = montar(fase, habilidades, no.x, no.y, no.mascara, semMeta);
          const r = saltar(m, ang, cg, 220, objetivo);
          nos++;
          for (const o of r.m.orvalho) if (o.pego) orvalhoVisto.add(o.id);
          if (r.venceu) {
            return {
              resolvida: true, saltos: prof,
              caminho: no.caminho.concat([{ ang, carga: cg, x: r.x, y: r.y }]),
              nos, tempo: Date.now() - t0,
              orvalhoAlcancavel: [...orvalhoVisto].sort(),
            };
          }
          if (r.fora) continue;
          // Um voo que estourou o tempo não é um lugar onde o jogador possa
          // estar parado para mirar o próximo salto: guardar isso como nó
          // inventava caminhos que ninguém consegue repetir.
          if (r.tempoEsgotado) continue;
          const mask = mascaraDe(r.m);
          const k = chave(r.x, r.y, mask);
          if (vistos.has(k)) continue;
          vistos.add(k);
          melhorX = Math.max(melhorX, r.x);
          prox.push({
            x: r.x, y: r.y, mascara: mask,
            // guardamos onde cada salto termina: é o que permite conferir, na
            // hora de repetir o caminho, se o jogo reproduz a busca de verdade
            caminho: no.caminho.concat([{ ang, carga: cg, x: r.x, y: r.y }]),
          });
        }
      }
    }
    if (!prox.length) break;
    // Feixe com diversidade. Ordenar só por "quem está mais à direita" fazia a
    // busca encher de estados no fim do mapa e jogar fora o pouso do meio do
    // caminho que era justamente o único que levava a uma gota. Agora cada
    // faixa vertical do mapa guarda alguns representantes.
    prox.sort((a, b) => (b.x - a.x) || (a.y - b.y));
    const porFaixa = new Map();
    const escolhidos = [];
    const largura = opcoes.largura || 26;
    const porFaixaMax = opcoes.porFaixa || 3;
    for (const n of prox) {
      const faixa = Math.round(n.x / 220);
      const c = porFaixa.get(faixa) || 0;
      if (c >= porFaixaMax) continue;
      porFaixa.set(faixa, c + 1);
      escolhidos.push(n);
      if (escolhidos.length >= largura) break;
    }
    borda = escolhidos;
  }
  return {
    resolvida: false, saltos: -1, caminho: [], nos, tempo: Date.now() - t0,
    melhorX, orvalhoAlcancavel: [...orvalhoVisto].sort(),
  };
}

/**
 * Confere gota por gota. Cada uma vira o objetivo de uma busca própria, com a
 * meta desligada — senão a Bolota encosta na meta, a fase acaba e a gota que
 * ficava depois disso parecia inalcançável quando na verdade era só o teste que
 * terminava cedo demais.
 */
export function analisarOrvalho(fase, opcoes = {}) {
  const t0 = Date.now();
  const alcancaveis = [];
  const faltando = [];
  let nos = 0;
  for (let i = 0; i < fase.orvalho.length; i++) {
    const r = analisar(fase, {
      ...opcoes,
      semMeta: true,
      objetivo: (m) => m.orvalho[i].pego,
      maxSaltos: opcoes.maxSaltos || 8,
      largura: opcoes.largura || 30,
    });
    nos += r.nos;
    if (r.resolvida) alcancaveis.push(i); else faltando.push(i);
  }
  return { alcancaveis, faltando, nos, tempo: Date.now() - t0 };
}

/**
 * Repete um caminho encontrado pela busca, agora num mundo só, do jeito que o
 * jogo roda. Se isto não vencer, o caminho é ficção — e é justamente o que o
 * teste verifica.
 */
export function repetir(fase, caminho, opcoes = {}) {
  const m = assentar(fase, opcoes.habilidades);
  const desvios = [];
  for (const s of caminho) {
    m.bolota.angulo = s.ang;
    m.bolota.carga = s.carga;
    m.bolota.lancar(m);
    let parou = 0;
    for (let i = 0; i < 220; i++) {
      m.passo(DT, PARADO);
      if (m.venceu || m.respawn > 0) break;
      const c = m.bolota.corpo;
      if (c.noChao && c.velocidade < 14) { parou += DT; if (parou > 0.16) break; }
      else parou = 0;
    }
    if (s.x !== undefined && !m.venceu) {
      desvios.push(Math.hypot(m.bolota.corpo.x - s.x, m.bolota.corpo.y - s.y));
    }
    if (m.venceu || m.respawn > 0) break;
  }
  return { venceu: m.venceu, mundo: m, desvioMax: desvios.length ? Math.max(...desvios) : 0 };
}
