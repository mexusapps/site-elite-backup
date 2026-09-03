// ---------------------------------------------------------------------------
// save.js — progresso e opções. Falha em silêncio: navegador com dados
// bloqueados não pode impedir ninguém de jogar.
//
// O progresso guarda por fase o melhor número de saltos e as gotas achadas,
// porque é isso que dá o "só mais uma vez": a fase termina rápido, mas termina
// mal, e o jogador sabe exatamente quanto faltou.
// ---------------------------------------------------------------------------

const CHAVE = 'bolota.save.v1';

const PADRAO = {
  opcoes: {
    master: 0.75, musica: 0.42, efeitos: 0.85,
    brilhos: 1, bloom: 1,
    tremor: 1,
    tamanhoTexto: 1,
    mira: 'auto',          // auto | sempre — mostra o arco previsto
    qualidade: 'auto',     // auto | alta | media | baixa
    animacao: 1,
  },
  fases: {},               // id -> {feita, melhorSaltos, gotas:[...], tempo}
  habilidades: [],         // desbloqueadas entre fases
  marcas: { fasesFeitas: 0, saltos: 0, gotas: 0, quedas: 0 },
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
