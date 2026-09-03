// ---------------------------------------------------------------------------
// imagens.js — o registro da arte ilustrada.
//
// O jogo passa a ter dois caminhos de desenho para cada elemento: se existe uma
// imagem para ele, usa a imagem; se não existe, desenha por código como antes.
// Isso é o que permite a arte chegar aos poucos — cada PNG novo melhora a tela
// sozinho, e nada quebra enquanto o resto não chega.
//
// Os arquivos de `arte/` viram data URI na hora de construir a página, então o
// jogo continua sendo um arquivo só, sem nenhuma requisição de rede.
// ---------------------------------------------------------------------------

import { ARTE } from './arte-gerada.js';

const cache = {};
let pendentes = 0;
let aviso = null;

/** Começa a carregar tudo. `pronto` é chamado quando a última imagem entra. */
export function carregarArte(pronto) {
  const nomes = Object.keys(ARTE);
  aviso = pronto;
  pendentes = nomes.length;
  if (!pendentes) { if (aviso) aviso(0); return 0; }
  for (const nome of nomes) {
    const im = new Image();
    im.onload = () => {
      cache[nome] = im;
      if (--pendentes === 0 && aviso) aviso(nomes.length);
    };
    // Uma imagem que não carrega não pode travar o jogo: ela simplesmente não
    // entra no registro, e o desenho por código assume o lugar dela.
    im.onerror = () => { if (--pendentes === 0 && aviso) aviso(nomes.length); };
    im.src = ARTE[nome];
  }
  return nomes.length;
}

export function tem(nome) { return !!cache[nome]; }
export function img(nome) { return cache[nome] || null; }
export function quantas() { return Object.keys(cache).length; }
export function catalogo() { return Object.keys(ARTE); }

/**
 * Desenha uma imagem com o ponto de giro num lugar escolhido.
 * `px`/`py` são frações da imagem (0.5,0.5 = centro; 0.5,0 = topo do meio).
 */
export function porPivo(ctx, nome, x, y, alturaAlvo, ang, px = 0.5, py = 0.5, espelhar = false) {
  const im = cache[nome];
  if (!im) return false;
  const k = alturaAlvo / im.height;
  const w = im.width * k, h = im.height * k;
  ctx.save();
  ctx.translate(x, y);
  if (ang) ctx.rotate(ang);
  if (espelhar) ctx.scale(-1, 1);
  ctx.drawImage(im, -w * px, -h * py, w, h);
  ctx.restore();
  return true;
}

/** Preenche um caminho já traçado com uma textura em ladrilho. */
export function ladrilho(ctx, nome, escala = 1) {
  const im = cache[nome];
  if (!im) return null;
  const p = ctx.createPattern(im, 'repeat');
  if (p && p.setTransform && typeof DOMMatrix !== 'undefined') {
    p.setTransform(new DOMMatrix([escala, 0, 0, escala, 0, 0]));
  }
  return p;
}
