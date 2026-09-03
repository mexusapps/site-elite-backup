// ---------------------------------------------------------------------------
// regras.js — todos os números do jogo num lugar só.
//
// Um jogo de salto só fica gostoso depois de muitas dezenas de ajustes nestes
// valores. Se mexer neles for caro, o ajuste não acontece.
// ---------------------------------------------------------------------------

export const BOLOTA = {
  raio: 19,
  cargaMax: 0.78,          // segundos até a força máxima
  forcaMin: 430,
  forcaMax: 1180,
  freioCarga: 0.86,        // ela freia enquanto se prepara
  anguloMin: -Math.PI * 0.98,
  perdoaSaida: 0.12,       // ainda dá para saltar logo depois de sair da borda
  bufferComando: 0.16,     // e apertar um tico antes de pousar também vale
  arrastoAr: 0.9985,
  quedaMax: 1650,          // limite de velocidade de queda
};

// Habilidades ganhas ao longo dos capítulos. Todas planejadas de uma vez: em
// jogo de progressão, inventar poder no meio do caminho quebra as fases antigas.
export const HABILIDADES = {
  salto:    { id: 'salto',    nome: 'Salto',    desc: 'Segure para preparar, solte para pular.' },
  planar:   { id: 'planar',   nome: 'Folha',    desc: 'Segure no ar para planar devagar.' },
  grude:    { id: 'grude',    nome: 'Raiz',     desc: 'Gruda em paredes de musgo e salta de novo.' },
  gavinha:  { id: 'gavinha',  nome: 'Gavinha',  desc: 'Agarra ganchos por perto e se puxa.' },
  flor:     { id: 'flor',     nome: 'Flor',     desc: 'Um segundo salto no meio do ar.' },
};

export const PLANAR = { gravidade: 0.28, arrasto: 0.982, empuxoLateral: 320 };

export const MUNDO = {
  raioBroto: 74,           // distância para acordar um broto adormecido
  raioOrvalho: 34,
  raioMeta: 46,
  molaForca: 1250,
  molaLateral: 210,        // empurrão para o lado, conforme a inclinação da cúpula
  perdoaMola: 0.75,        // depois do impulso ela ainda pode mirar no ar
  respawnSuave: 0.9,       // segundos da volta quando cai fora
};

export const PONTOS = {
  porOrvalho: 1,
};
