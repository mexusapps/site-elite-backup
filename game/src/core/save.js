// ---------------------------------------------------------------------------
// save.js — persistência tolerante a falhas. localStorage pode lançar exceção
// (aba anônima, dados de site bloqueados, captura de miniatura). Nunca deve
// derrubar o jogo: toda leitura e escrita é protegida e tem valor padrão.
// ---------------------------------------------------------------------------

const KEY = 'brasa.save.v1';

const DEFAULTS = {
  settings: {
    master: 0.8,
    music: 0.6,
    sfx: 0.9,
    shake: 1.0,
    flash: 1.0,
    darkness: 1.0,
    palette: 'padrao',       // padrao | daltonico | contraste
    textScale: 1.0,
    assist: false,           // decaimento reduzido e dano recebido menor
    showDamage: true,
    binds: null,             // preenchido por input.js
  },
  stats: {
    runs: 0,
    wins: 0,
    kills: 0,
    bestWave: 0,
    bestTime: 0,
    deaths: 0,
    embers: 0,
  },
  unlocks: {},               // relíquias liberadas por marcos
  seenTutorial: false,
};

function deepMerge(base, patch) {
  const out = Array.isArray(base) ? base.slice() : { ...base };
  if (!patch || typeof patch !== 'object') return out;
  for (const k of Object.keys(patch)) {
    const b = base ? base[k] : undefined;
    const p = patch[k];
    out[k] = (b && typeof b === 'object' && p && typeof p === 'object' && !Array.isArray(b))
      ? deepMerge(b, p) : p;
  }
  return out;
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return deepMerge(DEFAULTS, {});
    return deepMerge(DEFAULTS, JSON.parse(raw));
  } catch (_) {
    return deepMerge(DEFAULTS, {});
  }
}

export function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (_) {
    return false;   // jogo segue normalmente sem persistir
  }
}

export function wipe() {
  try { localStorage.removeItem(KEY); } catch (_) {}
  return deepMerge(DEFAULTS, {});
}

export { DEFAULTS };
