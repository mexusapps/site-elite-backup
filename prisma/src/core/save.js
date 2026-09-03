// ---------------------------------------------------------------------------
// save.js — progresso e opções. Falha em silêncio: navegador com dados
// bloqueados não pode impedir ninguém de jogar.
// ---------------------------------------------------------------------------

const CHAVE = 'prisma.save.v1';

const PADRAO = {
  opcoes: {
    master: 0.75, musica: 0.45, efeitos: 0.85,
    brilhos: 1, bloom: 1,
    tamanhoTexto: 1,
    paleta: 'jardim',
    marcas: true,        // símbolos de cor nas peças e feixes
    animacao: 1,
  },
  fases: {},             // id -> {feita, movimentos, dicas}
  semFim: { melhor: 0, jogadas: 0 },
  marcas: { fasesFeitas: 0, floresAcordadas: 0, pecas: 0, dicas: 0, perfeitas: 0 },
  viuComoJoga: false,
};

function juntar(base, patch) {
  const out = Array.isArray(base) ? base.slice() : { ...base };
  if (!patch || typeof patch !== 'object') return out;
  for (const k of Object.keys(patch)) {
    const b = base ? base[k] : undefined, p = patch[k];
    out[k] = (b && typeof b === 'object' && p && typeof p === 'object' && !Array.isArray(b))
      ? juntar(b, p) : p;
  }
  return out;
}

export function carregar() {
  try {
    const raw = localStorage.getItem(CHAVE);
    return raw ? juntar(PADRAO, JSON.parse(raw)) : juntar(PADRAO, {});
  } catch (_) { return juntar(PADRAO, {}); }
}
export function gravar(d) {
  try { localStorage.setItem(CHAVE, JSON.stringify(d)); return true; } catch (_) { return false; }
}
export function apagar() {
  try { localStorage.removeItem(CHAVE); } catch (_) {}
  return juntar(PADRAO, {});
}
export { PADRAO };
