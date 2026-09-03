// ---------------------------------------------------------------------------
// upgrades.js — os "Sopros": escolha de 1 entre 3 ao fim de cada onda.
//
// Cada um mexe num modificador da run. A regra de design: nenhum Sopro é um
// aumento puro de número sem mudar como você joga — ou muda o alcance, ou o
// risco, ou o ritmo. Números puros existem só como cola entre os interessantes.
// ---------------------------------------------------------------------------

export function newMods() {
  return {
    damage: 1,
    attackSpeed: 1,
    meleeRange: 1,
    shotSpeed: 1,
    shotCost: 1,
    multishot: 0,          // projéteis extras
    pierce: 0,
    dashCharges: 0,
    dashCooldown: 1,
    dashDamage: 1,
    dashIframes: 1,
    lifesteal: 0,          // fração do dano vira chama
    emberValue: 1,
    magnet: 1,
    maxFlame: 0,
    decay: 1,
    thorns: 0,
    crit: 0.04,
    critMul: 2,
    explodeOnKill: 0,      // raio
    burn: 0,               // dano por segundo aplicado no acerto
    slow: 0,               // fração de lentidão aplicada
    orbitals: 0,
    revive: 0,
    moveSpeed: 1,
    knockback: 1,
    scoreMul: 1,
  };
}

export const UPGRADES = [
  // --- comuns -------------------------------------------------------------
  { id: 'brasa_viva', name: 'Brasa Viva', rarity: 'comum', max: 5,
    desc: '+18% de dano em tudo.',
    apply: (m) => { m.damage *= 1.18; } },

  { id: 'sopro_curto', name: 'Sopro Curto', rarity: 'comum', max: 5,
    desc: '+16% de velocidade de ataque.',
    apply: (m) => { m.attackSpeed *= 1.16; } },

  { id: 'lingua_de_fogo', name: 'Língua de Fogo', rarity: 'comum', max: 4,
    desc: '+22% de alcance do golpe. Bater de longe é bater de graça.',
    apply: (m) => { m.meleeRange *= 1.22; } },

  { id: 'lenha_seca', name: 'Lenha Seca', rarity: 'comum', max: 5,
    desc: '+16 de chama máxima.',
    apply: (m) => { m.maxFlame += 16; } },

  { id: 'ascuas', name: 'Áscuas', rarity: 'comum', max: 4,
    desc: 'Fagulhas valem +35% de chama.',
    apply: (m) => { m.emberValue *= 1.35; } },

  { id: 'atracao', name: 'Atração', rarity: 'comum', max: 3,
    desc: 'Dobra o alcance que puxa as fagulhas até você.',
    apply: (m) => { m.magnet *= 2.0; } },

  { id: 'pes_de_vento', name: 'Pés de Vento', rarity: 'comum', max: 4,
    desc: '+12% de velocidade de movimento.',
    apply: (m) => { m.moveSpeed *= 1.12; } },

  { id: 'combustao_lenta', name: 'Combustão Lenta', rarity: 'comum', max: 4,
    desc: 'A chama apaga 18% mais devagar.',
    apply: (m) => { m.decay *= 0.82; } },

  // --- raros --------------------------------------------------------------
  { id: 'faisca_dupla', name: 'Faísca Dupla', rarity: 'raro', max: 3,
    desc: '+1 projétil por disparo, em leque.',
    apply: (m) => { m.multishot += 1; } },

  { id: 'perfurante', name: 'Perfurante', rarity: 'raro', max: 3,
    desc: 'Os disparos atravessam +1 inimigo.',
    apply: (m) => { m.pierce += 1; } },

  { id: 'passo_de_brasa', name: 'Passo de Brasa', rarity: 'raro', max: 2,
    desc: '+1 carga de avanço.',
    apply: (m) => { m.dashCharges += 1; } },

  { id: 'rastro_ardente', name: 'Rastro Ardente', rarity: 'raro', max: 4,
    desc: 'O avanço causa 90% mais dano ao atravessar.',
    apply: (m) => { m.dashDamage *= 1.9; } },

  { id: 'sangue_de_fogo', name: 'Sangue de Fogo', rarity: 'raro', max: 4,
    desc: '6% do dano causado volta como chama.',
    apply: (m) => { m.lifesteal += 0.06; } },

  { id: 'olho_certeiro', name: 'Olho Certeiro', rarity: 'raro', max: 4,
    desc: '+12% de chance de crítico.',
    apply: (m) => { m.crit += 0.12; } },

  { id: 'chama_persistente', name: 'Chama Persistente', rarity: 'raro', max: 4,
    desc: 'Acertos queimam: +9 de dano por segundo durante 3 s.',
    apply: (m) => { m.burn += 9; } },

  { id: 'frio_da_noite', name: 'Frio da Noite', rarity: 'raro', max: 3,
    desc: 'Acertos deixam o inimigo 22% mais lento por 2 s.',
    apply: (m) => { m.slow += 0.22; } },

  { id: 'casca_grossa', name: 'Casca Grossa', rarity: 'raro', max: 3,
    desc: 'Devolve 40% do dano de contato a quem encostar em você.',
    apply: (m) => { m.thorns += 0.4; } },

  { id: 'respiro', name: 'Respiro', rarity: 'raro', max: 3,
    desc: 'Avanço recarrega 24% mais rápido e dá mais tempo de invulnerabilidade.',
    apply: (m) => { m.dashCooldown *= 0.76; m.dashIframes *= 1.2; } },

  { id: 'economia', name: 'Economia', rarity: 'raro', max: 3,
    desc: 'Disparar custa 40% menos chama.',
    apply: (m) => { m.shotCost *= 0.6; } },

  // --- épicos --------------------------------------------------------------
  { id: 'detonacao', name: 'Detonação', rarity: 'epico', max: 3,
    desc: 'Inimigos explodem ao morrer, ferindo quem estiver perto.',
    apply: (m) => { m.explodeOnKill += 74; } },

  { id: 'satelites', name: 'Satélites', rarity: 'epico', max: 3,
    desc: '+1 brasa orbitando você, queimando o que encostar.',
    apply: (m) => { m.orbitals += 1; } },

  { id: 'segunda_chama', name: 'Segunda Chama', rarity: 'epico', max: 1, unique: true,
    desc: 'Ao apagar, você reacende uma vez com metade da chama.',
    apply: (m) => { m.revive += 1; } },

  { id: 'golpe_pesado', name: 'Golpe Pesado', rarity: 'epico', max: 2,
    desc: 'Críticos causam o triplo do dano e empurram muito mais.',
    apply: (m) => { m.critMul += 1; m.knockback *= 1.5; } },

  { id: 'fornalha', name: 'Fornalha', rarity: 'epico', max: 2,
    desc: '+30 de chama máxima e enche a chama agora.',
    apply: (m, run) => { m.maxFlame += 30; if (run) run.refill = true; } },

  { id: 'avareza', name: 'Avareza', rarity: 'epico', max: 2,
    desc: '+35% de pontuação, mas a chama apaga 15% mais rápido.',
    apply: (m) => { m.scoreMul *= 1.35; m.decay *= 1.15; } },
];

export const RARITY = {
  comum: { weight: 100, label: 'comum', color: '#c9bfb0' },
  raro: { weight: 46, label: 'raro', color: '#7fc8ff' },
  epico: { weight: 15, label: 'épico', color: '#ffab5e' },
};

export const byId = (id) => UPGRADES.find((u) => u.id === id);

/**
 * Sorteia 3 opções sem repetir, respeitando o limite de acúmulo.
 * Ondas mais altas empurram levemente a raridade para cima.
 */
export function offer(rng, taken, count = 3, wave = 1) {
  const pool = UPGRADES.filter((u) => (taken[u.id] || 0) < u.max);
  const out = [];
  const used = new Set();
  const lift = 1 + Math.min(1.1, (wave - 1) * 0.075);

  for (let k = 0; k < count && pool.length > used.size; k++) {
    let total = 0;
    for (const u of pool) {
      if (used.has(u.id)) continue;
      total += RARITY[u.rarity].weight * (u.rarity === 'comum' ? 1 : lift);
    }
    let r = rng.next() * total;
    for (const u of pool) {
      if (used.has(u.id)) continue;
      r -= RARITY[u.rarity].weight * (u.rarity === 'comum' ? 1 : lift);
      if (r <= 0) { out.push(u); used.add(u.id); break; }
    }
    if (out.length === k) {                 // proteção contra erro de arredondamento
      const rest = pool.filter((u) => !used.has(u.id));
      if (!rest.length) break;
      const u = rest[0]; out.push(u); used.add(u.id);
    }
  }
  return out;
}
