// ---------------------------------------------------------------------------
// harness.mjs — o agente que joga o POMAR dentro do navegador.
//
// A física e as regras já foram provadas em Node puro (physics.test.mjs e
// logica.test.mjs). Aqui a pergunta é outra: a página monta, o input humano
// chega até o jogo, a tela desenha e nada quebra.
// ---------------------------------------------------------------------------

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const aqui = dirname(fileURLToPath(import.meta.url));
export const PAGINA = 'file://' + resolve(aqui, '../dist/pomar.html');
const CHROME = '/opt/pw-browsers/chromium';

export async function abrir({ width = 1280, height = 800 } = {}) {
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--mute-audio',
      '--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage({ viewport: { width, height } });
  const logs = [];
  const ignora = (t) => /fonts\.(googleapis|gstatic)\.com/.test(t)
    || /Failed to load resource/.test(t) || /AudioContext/.test(t);
  page.on('console', (m) => { if (m.type() === 'error' && !ignora(m.text())) logs.push(m.text()); });
  page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
  await page.goto(PAGINA, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__POMAR__ && window.__POMAR__.pronto, null, { timeout: 15000 });
  await page.evaluate(() => window.__POMAR__.modoTeste(true));
  return { browser, page, logs };
}

/**
 * Bot jogador. Duas políticas, para comparar comportamento:
 *   'esperto' — procura uma fruta igual e solta em cima dela;
 *   'aleatorio' — solta em qualquer lugar (é o que uma criança de 4 anos faz).
 */
export async function jogarBot(page, { seed = 1, quadros = 3600, politica = 'esperto', modo = 'pomar' } = {}) {
  return page.evaluate(async (cfg) => {
    const P = window.__POMAR__;
    P.modoTeste(true);
    P.opcoes.master = 0;
    P.comecar(cfg.seed, cfg.modo);
    const j = P.jogo();
    let n = 0;
    const t0 = performance.now();
    const eventos = [];
    const antes = { fusoes: 0, tucanos: 0 };

    for (let f = 0; f < cfg.quadros; f++) {
      if (j.recarga <= 0) {
        let nx;
        if (cfg.politica === 'esperto') {
          const iguais = j.fisica.bodies.filter((b) => b.tier === j.maoTier);
          if (iguais.length) {
            iguais.sort((a, b) => (a.y - a.r) - (b.y - b.r));
            nx = iguais[0].x / 520;
          } else nx = (40 + ((n * 97) % 440)) / 520;
        } else {
          nx = ((n * 137) % 460 + 30) / 520;
        }
        P.mirar(nx);
        P.soltar();
        n++;
      }
      if (f % 900 === 400) P.chacoalhar();
      if (f % 1500 === 700) P.regar();
      P.passo(1);
      if (j.fusoes !== antes.fusoes) { antes.fusoes = j.fusoes; }
      if (j.tucanos !== antes.tucanos) { antes.tucanos = j.tucanos; eventos.push({ f, tipo: 'tucano' }); }
    }
    return {
      estado: P.estado(),
      eventos,
      erros: P.erros,
      msPorQuadro: (performance.now() - t0) / cfg.quadros,
      album: [...j.descobertas],
    };
  }, { seed, quadros, politica, modo });
}

export function hash(o) {
  const s = JSON.stringify(o);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16);
}
