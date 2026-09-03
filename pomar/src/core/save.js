// ---------------------------------------------------------------------------
// save.js — guarda recordes, álbum e opções. Falha em silêncio: aba anônima e
// navegador com dados bloqueados não podem derrubar o jogo de uma criança.
// ---------------------------------------------------------------------------

const CHAVE = 'pomar.save.v1';

const PADRAO = {
  opcoes: {
    master: 0.75, musica: 0.5, efeitos: 0.85,
    tremor: 1, brilhos: 1,
    tamanhoTexto: 1,
    numeros: false,           // rótulo com o número do degrau, para daltonismo
    nomes: true,             // nome da fruta na mão
    paleta: 'pomar',
  },
  marcas: {
    partidas: 0, melhorPontos: 0, melhorFruta: -1, fusoes: 0,
    bolos: 0, pedidos: 0, tempo: 0,
  },
  album: [],                 // tiers já descobertos alguma vez
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
  try { localStorage.setItem(CHAVE, JSON.stringify(d)); return true; }
  catch (_) { return false; }
}

export function apagar() {
  try { localStorage.removeItem(CHAVE); } catch (_) {}
  return juntar(PADRAO, {});
}

export { PADRAO };
