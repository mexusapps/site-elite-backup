// ---------------------------------------------------------------------------
// rig.js — o esqueleto da Bolota e a animação procedural que o move.
//
// A física continua sendo um círculo (é o que se pode provar e testar), mas o
// que aparece na tela não é uma bola: é uma criaturinha com quadril, tronco,
// cabeça, dois braços e duas pernas, resolvidos por CINEMÁTICA INVERSA de dois
// ossos. O corpo se move, e os pés e as mãos vão atrás.
//
// Três decisões que fazem esse rig funcionar:
//
//   1. TUDO É ALVO + AMORTECIMENTO. Cada estado (parada, preparando, voando,
//      planando, pousando) escreve uma POSE ALVO, e a pose real persegue o alvo
//      com molas de constantes diferentes por parte do corpo. Não existe
//      máquina de transição nenhuma: a mistura entre poses sai de graça, e o
//      atraso de cada parte em relação ao quadril é o que dá o "follow through".
//
//   2. OS PÉS VIVEM NO MUNDO, NÃO NO CORPO. Enquanto ela está no chão, cada pé
//      procura o terreno abaixo de si por traçado vertical e fica plantado ali.
//      É por isso que ela se apoia certo numa rampa, com uma perna mais dobrada
//      que a outra, em vez de flutuar paralela ao chão.
//
//   3. ELA SE ENCOLHE PARA VOAR. No ar, o rig interpola para uma bola (o mesmo
//      círculo da física); no chão, ele se desdobra numa figura em pé, mais
//      alta que o círculo. A forma de bola não é preguiça de desenho — é a
//      própria explicação de por que a física dela é um círculo.
// ---------------------------------------------------------------------------

import { TAU, clamp, lerp, damp } from '../core/math.js';

/** Medidas do boneco, em pixels, com origem no centro do círculo da física. */
export const CORPO = {
  raio: 19,              // o mesmo de BOLOTA.raio
  chao: 19,              // onde os pés encostam quando ela está de pé
  quadrilY: 3,
  peitoY: -13,
  cabecaY: -28,
  cabecaR: 16,
  ombroX: 9,
  ombroY: -16,
  quadrilX: 5.5,
  braco: 9.5, antebraco: 8.5,
  coxa: 10, canela: 9,
  passo: 26,             // comprimento de uma passada
  alturaPasso: 7,
};

/** Cinemática inversa de dois ossos. Devolve a articulação do meio. */
export function ik2(ax, ay, bx, by, l1, l2, lado, out) {
  let dx = bx - ax, dy = by - ay;
  let d = Math.hypot(dx, dy);
  const min = Math.abs(l1 - l2) + 0.01;
  const max = l1 + l2 - 0.01;
  if (d < min) { const k = min / (d || 1e-6); dx *= k; dy *= k; d = min; }
  if (d > max) { const k = max / d; dx *= k; dy *= k; d = max; }
  const base = Math.atan2(dy, dx);
  const cos = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const a = Math.acos(cos) * lado;
  out.x = ax + Math.cos(base + a) * l1;
  out.y = ay + Math.sin(base + a) * l1;
  out.fx = ax + dx; out.fy = ay + dy;      // ponta corrigida, sempre alcançável
  return out;
}

/** Onde está o chão logo abaixo de (x, y)? Infinity se não houver. */
export function chaoAbaixo(formas, x, y, limite = 260) {
  let melhor = Infinity;
  for (const f of formas) {
    const a = f.aabb;
    if (x < a.x - 2 || x > a.x + a.w + 2) continue;
    const n = f.p.length;
    for (let i = 0; i < n; i++) {
      const p = f.p[i], q = f.p[(i + 1) % n];
      if ((p[0] - x) * (q[0] - x) > 0) continue;
      const dx = q[0] - p[0];
      if (Math.abs(dx) < 1e-6) continue;
      const t = (x - p[0]) / dx;
      const sy = p[1] + (q[1] - p[1]) * t;
      if (sy >= y - 6 && sy < melhor) melhor = sy;
    }
  }
  return melhor - y > limite ? Infinity : melhor;
}

const v = () => ({ x: 0, y: 0 });

/** Espelha um ângulo escrito para "olhando para a direita". */
const espelha = (a, dir) => (dir > 0 ? a : Math.PI - a);

/**
 * O broto da cabeça: correntinha de Verlet que fica EM PÉ.
 *
 * Uma corrente de Verlet comum cai — foi o que aconteceu na primeira versão: o
 * broto pendia por cima do rosto como um cabelo molhado. Aqui a gravidade é
 * pequena, existe um empuxo para cima (a planta cresce contra o peso) e, acima
 * de tudo, uma RESISTÊNCIA A DOBRAR: cada nó é puxado para a posição que
 * continuaria em linha reta o segmento anterior. É isso que faz o caule ficar
 * ereto e ainda assim chicotear na virada.
 */
export class Broto {
  constructor(n = 5, comp = 11) {
    this.n = n; this.comp = comp;
    this.px = new Float32Array(n); this.py = new Float32Array(n);
    this.ox = new Float32Array(n); this.oy = new Float32Array(n);
    this.iniciado = false;
  }
  reposicionar(x, y) {
    for (let i = 0; i < this.n; i++) {
      this.px[i] = x; this.py[i] = y - i * this.comp;
      this.ox[i] = this.px[i]; this.oy[i] = this.py[i];
    }
    this.iniciado = true;
  }
  passo(dt, baseX, baseY, ventoX, ventoY) {
    if (!this.iniciado) this.reposicionar(baseX, baseY);
    const n = this.n;
    const amort = 0.88;
    for (let i = 1; i < n; i++) {
      const vx = (this.px[i] - this.ox[i]) * amort;
      const vy = (this.py[i] - this.oy[i]) * amort;
      this.ox[i] = this.px[i]; this.oy[i] = this.py[i];
      this.px[i] += vx + ventoX * dt;
      this.py[i] += vy + (150 + ventoY) * dt * dt * 60;
    }
    this.px[0] = baseX; this.py[0] = baseY;
    this.ox[0] = baseX; this.oy[0] = baseY;

    for (let k = 0; k < 5; k++) {
      // comprimento dos segmentos
      for (let i = 0; i < n - 1; i++) {
        const dx = this.px[i + 1] - this.px[i], dy = this.py[i + 1] - this.py[i];
        const d = Math.hypot(dx, dy) || 1e-6;
        const dif = (d - this.comp) / d;
        const mx = dx * dif * 0.5, my = dy * dif * 0.5;
        if (i > 0) { this.px[i] += mx; this.py[i] += my; this.px[i + 1] -= mx; this.py[i + 1] -= my; }
        else { this.px[i + 1] -= mx * 2; this.py[i + 1] -= my * 2; }
      }
      // resistência a dobrar: continua a direção do segmento anterior
      let dirX = 0, dirY = -1;
      for (let i = 0; i < n - 1; i++) {
        if (i > 0) {
          const ax = this.px[i] - this.px[i - 1], ay = this.py[i] - this.py[i - 1];
          const d = Math.hypot(ax, ay) || 1e-6;
          dirX = ax / d; dirY = ay / d;
        }
        const ix = this.px[i] + dirX * this.comp;
        const iy = this.py[i] + dirY * this.comp;
        const rigidez = i === 0 ? 0.5 : 0.28;
        this.px[i + 1] += (ix - this.px[i + 1]) * rigidez;
        this.py[i + 1] += (iy - this.py[i + 1]) * rigidez;
      }
    }
  }
}

export class Rig {
  constructor() {
    this.pose = {
      novelo: 0,                 // 0 = de pé, 1 = enrolada em bola
      quadril: v(), peito: v(), cabeca: v(),
      giroTronco: 0, giroCabeca: 0,
      mao: [v(), v()], cotovelo: [v(), v()],
      pe: [v(), v()], joelho: [v(), v()],
      ombro: [v(), v()], anca: [v(), v()],
      pisada: [0, 0],            // 0 = no ar, 1 = plantado (para a sombrinha)
      giroPe: [0, 0],
      escalaX: 1, escalaY: 1,
      olhoX: 0, olhoY: 0,
    };
    this.broto = new Broto(4, 6.5);
    this.fase = 0;               // fase do ciclo de passada
    this.balanco = 0;
    this.olhada = 0;
    this.olhadaAlvo = 0;
    this.iniciado = false;
    this._t = 0;
    this._j = { x: 0, y: 0, fx: 0, fy: 0 };
  }

  /** Reposiciona sem interpolar: usado ao (re)começar a fase e no respawn. */
  reiniciar() { this.iniciado = false; }

  /**
   * @param {number} dt
   * @param {object} b     a Bolota simulada
   * @param {object} mundo para achar o chão sob cada pé
   */
  atualizar(dt, b, mundo) {
    const c = b.corpo;
    const p = this.pose;
    this._t += dt;
    const formas = mundo && mundo.formas ? mundo.formas : [];

    // ---- leitura de estado ---------------------------------------------------
    const vel = Math.hypot(c.vx, c.vy);
    const noChao = c.noChao;
    const carregando = b.estado === 'carregando';
    const planando = !!b.planando;
    const voando = b.estado === 'voando' && !noChao;
    const pousou = clamp(b.pousouAgora / 0.34, 0, 1);
    const lancou = clamp(b.lancouAgora / 0.3, 0, 1);
    const carga = carregando ? b.carga : 0;
    const dir = Math.abs(c.vx) > 12 ? Math.sign(c.vx) : (Math.cos(b.angulo) >= 0 ? 1 : -1);

    // Encolher — mas SÓ UM POUCO. A primeira versão fechava a Bolota numa bola
    // no ar, e o resultado era exatamente o que ela não é: uma bola que pula.
    // Agora o encolhimento é um recolher de ombros, não uma metamorfose: ela
    // continua sendo uma figura com braços e pernas o voo inteiro.
    let alvoNovelo = 0;
    if (voando) alvoNovelo = planando ? 0.04 : clamp((vel - 240) / 700, 0.06, 0.3);
    if (carregando) alvoNovelo = 0;
    if (!this.iniciado) p.novelo = alvoNovelo;
    p.novelo = damp(p.novelo, alvoNovelo, voando ? 13 : 9, dt);
    const nv = p.novelo;

    // ---- quadril, tronco e cabeça --------------------------------------------
    const agacha = carga * 9 + pousou * 7;              // desce ao preparar e ao pousar
    // Troca de peso: parada, ela transfere o corpo de um pé para o outro bem
    // devagar. Sem isso a pose de descanso ficava literalmente congelada — e
    // personagem congelado é boneco, não personagem.
    const ocioso = noChao && !carregando && vel < 30;
    const peso = ocioso ? Math.sin(this._t * 0.62) : 0;
    const alvoQuadrilY = lerp(CORPO.quadrilY + agacha - Math.abs(peso) * 0.8, 0, nv);
    const alvoQuadrilX = lerp(dir * (carga * -3.5 + lancou * 2.5) + peso * 1.6, 0, nv);

    // giro do corpo inteiro: no ar ela mergulha na direção do voo. É o que
    // transforma "objeto seguindo uma parábola" em "alguém saltando".
    let alvoGiroCorpo = 0;
    if (planando) {
      // planando ela fica ERETA: é a folha que segura o corpo, e um corpo
      // inclinado ali lia como tombo, não como voo
      alvoGiroCorpo = dir * 0.05;
    } else if (voando && vel > 120) {
      let a = Math.atan2(c.vy, c.vx);
      if (dir < 0) a = Math.PI - a;
      alvoGiroCorpo = clamp(a * 0.28, -0.42, 0.42) * dir;
    } else if (carregando) {
      alvoGiroCorpo = dir * carga * 0.12;
    }
    if (p.giroCorpo === undefined || !this.iniciado) p.giroCorpo = alvoGiroCorpo;
    p.giroCorpo = damp(p.giroCorpo, alvoGiroCorpo, voando ? 8 : 11, dt);

    // inclinação do tronco: para o alvo ao carregar, para a frente no voo
    let alvoTronco = 0;
    if (carregando) alvoTronco = dir * (0.10 + carga * 0.30);
    else if (voando) alvoTronco = clamp(c.vx / 1400, -0.34, 0.34);
    else alvoTronco = clamp(c.vx / 900, -0.16, 0.16);
    alvoTronco *= (1 - nv * 0.7);

    const alvoPeitoY = lerp(CORPO.peitoY + agacha * 0.55, -2, nv);
    const alvoCabecaY = lerp(CORPO.cabecaY + agacha * 0.30, -6, nv);

    if (!this.iniciado) {
      p.quadril.x = alvoQuadrilX; p.quadril.y = alvoQuadrilY;
      p.peito.x = 0; p.peito.y = alvoPeitoY;
      p.cabeca.x = 0; p.cabeca.y = alvoCabecaY;
      p.giroTronco = alvoTronco;
    }

    p.quadril.x = damp(p.quadril.x, alvoQuadrilX, 14, dt);
    p.quadril.y = damp(p.quadril.y, alvoQuadrilY, 15, dt);
    p.giroTronco = damp(p.giroTronco, alvoTronco, 10, dt);

    // O peito e a cabeça perseguem o quadril com molas cada vez mais moles: é
    // esse atraso em cadeia que dá a sensação de peso e de continuidade.
    const respira = noChao && !carregando ? Math.sin(this._t * 1.9) * 1.7 : 0;
    p.peito.x = damp(p.peito.x, p.quadril.x * 0.55, 11, dt);
    p.peito.y = damp(p.peito.y, alvoPeitoY + respira, 12, dt);
    p.cabeca.x = damp(p.cabeca.x, p.peito.x * 0.75 + Math.sin(this._t * 1.3) * 1.1 * (1 - nv), 8.5, dt);
    p.cabeca.y = damp(p.cabeca.y, alvoCabecaY + respira * 0.6, 9.5, dt);

    // a cabeça olha para onde ela vai mirar; no ar acompanha a queda
    // parada, ela olha em volta de vez em quando
    if (ocioso) {
      this.olhada -= dt;
      if (!(this.olhada > 0)) {
        this.olhada = 2.4 + Math.abs(Math.sin(this._t * 7.3)) * 3.2;
        this.olhadaAlvo = (Math.sin(this._t * 11.1) > 0 ? 1 : -1) * (0.10 + Math.abs(Math.sin(this._t * 3.7)) * 0.16);
      }
    } else { this.olhadaAlvo = 0; }
    const alvoGiroCabeca = carregando
      ? clamp(Math.sin(b.angulo) * 0.30 + dir * 0.10, -0.4, 0.4)
      : voando ? clamp(c.vy / 2600, -0.25, 0.3) * dir
        : (this.olhadaAlvo || 0) + Math.sin(this._t * 0.9) * 0.05;
    p.giroCabeca = damp(p.giroCabeca, alvoGiroCabeca * (1 - nv * 0.6), 9, dt);

    // ---- ombros e ancas, já girados com o tronco --------------------------------
    const gt = p.giroTronco, cg = Math.cos(gt), sg = Math.sin(gt);
    const abre = 1 - nv * 0.65;
    for (let k = 0; k < 2; k++) {
      const lx = (k === 0 ? -1 : 1) * CORPO.ombroX * abre;
      const ly = lerp(CORPO.ombroY, -3, nv) - p.peito.y + p.peito.y;
      p.ombro[k].x = p.peito.x + lx * cg - (ly - p.peito.y) * sg;
      p.ombro[k].y = p.peito.y + lx * sg + (ly - p.peito.y) * cg;
      const hx = (k === 0 ? -1 : 1) * CORPO.quadrilX * abre;
      p.anca[k].x = p.quadril.x + hx * cg;
      p.anca[k].y = p.quadril.y + hx * sg;
    }

    // ---- pernas ---------------------------------------------------------------
    // ciclo de passada: avança com a distância percorrida, não com o tempo
    const andando = noChao && Math.abs(c.vx) > 26 && !carregando;
    if (andando) this.fase = (this.fase + (Math.abs(c.vx) * dt) / CORPO.passo) % 1;
    else this.fase = damp(this.fase % 1, Math.round(this.fase % 1), 8, dt);

    for (let k = 0; k < 2; k++) {
      const lado = k === 0 ? -1 : 1;
      let alvoX, alvoY, plantado = 0;

      if (nv > 0.82) {
        // enrolada: os pés recolhem para dentro da bola
        alvoX = lado * 5; alvoY = 6;
      } else if (noChao && !voando) {
        const ph = (this.fase + (k === (dir > 0 ? 1 : 0) ? 0 : 0.5)) % 1;
        const balanco = andando ? -Math.cos(ph * TAU) * CORPO.passo * 0.5 * dir : 0;
        const ergue = andando ? Math.max(0, Math.sin(ph * TAU)) * CORPO.alturaPasso : 0;
        const abertura = lado * (7.5 + carga * 4.5);
        const px = c.x + abertura + balanco;
        const chao = chaoAbaixo(formas, px, c.y - CORPO.raio * 0.4);
        const solo = isFinite(chao) ? chao - c.y : CORPO.chao;
        alvoX = abertura + balanco;
        alvoY = Math.min(CORPO.chao + 3, solo - 1) - ergue;
        plantado = ergue < 0.6 ? 1 : 0;
      } else if (planando) {
        alvoX = lado * 7; alvoY = 15 + Math.sin(this._t * 3 + k) * 1.5;
      } else {
        // Salto de verdade: uma perna à frente, a outra atrás, e as duas vindo
        // para a frente quando a queda acelera, para receber o chão.
        //
        // Os alvos são POLARES em volta da anca, não pontos soltos no espaço: um
        // alvo perto demais faz a CI dobrar o joelho até a perna virar um coto,
        // e foi exatamente o que aconteceu na primeira versão. Em polar o
        // comprimento do membro é escolhido, não sobra do cálculo.
        const caindo = clamp(c.vy / 700, 0, 1);
        const frente = lado === dir;
        const ang = espelha(lerp(frente ? 0.60 : 2.58, frente ? 0.95 : 1.30, caindo), dir);
        const r = lerp(16.5, 18, caindo);
        alvoX = p.anca[k].x + Math.cos(ang) * r;
        alvoY = p.anca[k].y + Math.sin(ang) * r + Math.sin(this._t * 7 + k * 2) * 0.7;
      }

      if (!this.iniciado) { p.pe[k].x = alvoX; p.pe[k].y = alvoY; }
      const rapido = plantado ? 26 : 13;
      p.pe[k].x = damp(p.pe[k].x, alvoX, rapido, dt);
      p.pe[k].y = damp(p.pe[k].y, alvoY, rapido, dt);
      p.pisada[k] = damp(p.pisada[k], plantado, 12, dt);

      ik2(p.anca[k].x, p.anca[k].y, p.pe[k].x, p.pe[k].y,
        lerp(CORPO.coxa, 7, nv), lerp(CORPO.canela, 6.5, nv), dir >= 0 ? 1 : -1, this._j);
      p.joelho[k].x = this._j.x; p.joelho[k].y = this._j.y;
      p.pe[k].x = lerp(p.pe[k].x, this._j.fx, 0.6);
      p.pe[k].y = lerp(p.pe[k].y, this._j.fy, 0.6);
      p.giroPe[k] = damp(p.giroPe[k], Math.atan2(p.pe[k].y - p.joelho[k].y,
        p.pe[k].x - p.joelho[k].x) - Math.PI / 2, 12, dt);
    }

    // ---- braços ----------------------------------------------------------------
    for (let k = 0; k < 2; k++) {
      const lado = k === 0 ? -1 : 1;
      // Também polares, em volta do ombro: assim a pose escolhe a ABERTURA do
      // braço, e a mão nunca acaba encolhida junto ao peito.
      const frente = lado === dir;
      let ang, r;
      if (nv > 0.6) { ang = espelha(1.5, dir) + lado * 0.5; r = 9; }
      else if (carregando) {
        // para trás e para baixo, como quem arma um salto — e não para cima,
        // que jogava a mão na frente do rosto
        ang = espelha(Math.PI - 0.50 - carga * 0.22, dir) + lado * dir * 0.16;
        r = 13 + carga * 3;
      } else if (planando) {
        // braços bem abertos, segurando a folha — fechados demais, eles
        // desapareciam atrás da própria cabeça
        ang = -Math.PI / 2 + lado * dir * 0.95;
        r = 17 + Math.sin(this._t * 2.6 + k) * 0.9;
      } else if (voando) {
        const caindo = clamp(c.vy / 700, 0, 1);
        ang = espelha(frente ? -0.62 + caindo * 0.5 : 2.55 - caindo * 0.5, dir)
          + Math.sin(this._t * 9 + k * 2.1) * 0.06;
        r = 15.5;
      } else if (pousou > 0.05) {
        ang = -Math.PI / 2 + lado * dir * (0.75 + pousou * 0.35);
        r = 15;
      } else {
        const sw = andando ? Math.cos((this.fase + (k ? 0 : 0.5)) * TAU) * 0.35 * dir : 0;
        ang = Math.PI / 2 + lado * dir * 0.26 + sw
          + Math.sin(this._t * 1.5 + k * 2) * 0.07 + peso * lado * 0.05;
        r = 14.5 + Math.sin(this._t * 1.9 + k * 1.7) * 1.5;
      }
      const alvoX = p.ombro[k].x + Math.cos(ang) * r;
      const alvoY = p.ombro[k].y + Math.sin(ang) * r;

      if (!this.iniciado) { p.mao[k].x = alvoX; p.mao[k].y = alvoY; }
      p.mao[k].x = damp(p.mao[k].x, alvoX, carregando ? 16 : 11, dt);
      p.mao[k].y = damp(p.mao[k].y, alvoY, carregando ? 16 : 11, dt);

      ik2(p.ombro[k].x, p.ombro[k].y, p.mao[k].x, p.mao[k].y,
        lerp(CORPO.braco, 6.5, nv), lerp(CORPO.antebraco, 6, nv), lado, this._j);
      p.cotovelo[k].x = this._j.x; p.cotovelo[k].y = this._j.y;
      p.mao[k].x = lerp(p.mao[k].x, this._j.fx, 0.6);
      p.mao[k].y = lerp(p.mao[k].y, this._j.fy, 0.6);
    }

    // o broto sai do alto do chapéu, em coordenadas de mundo
    const rc = lerp(CORPO.cabecaR, CORPO.raio * 0.94, nv);
    const bx = c.x + p.cabeca.x * lerp(1, b.sx, 0.55);
    const by = c.y + (p.cabeca.y - rc * 1.02) * lerp(1, b.sy, 0.55);
    if (!this.iniciado) this.broto.reposicionar(bx, by);
    this.broto.passo(dt, bx, by, -c.vx * 0.020, -c.vy * 0.006);

    // esmagamento: metade do que o modelo pede, senão os membros distorcem
    p.cabecaR = CORPO.cabecaR;
    p.escalaX = lerp(1, b.sx, 0.55);
    p.escalaY = lerp(1, b.sy, 0.55);
    p.olhoX = b.olharX; p.olhoY = b.olharY;
    p.dir = dir;
    this.iniciado = true;
    return p;
  }
}
