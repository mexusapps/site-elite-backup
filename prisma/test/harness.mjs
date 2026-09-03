// ---------------------------------------------------------------------------
// harness.mjs — o agente que joga o PRISMA no navegador.
//
// A óptica, o solucionador e o gerador já foram provados em Node puro. Aqui a
// pergunta é: a página monta, o toque e o teclado chegam até o jogo, o desenho
// aguenta o bloom, e as trinta fases realmente terminam quando jogadas.
// ---------------------------------------------------------------------------

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const aqui = dirname(fileURLToPath(import.meta.url));
export const PAGINA = 'file://' + resolve(aqui, '../dist/prisma.html');
const CHROME = '/opt/pw-browsers/chromium';

export async function abrir({ width = 1280, height = 860 } = {}) {
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
  await page.waitForFunction(() => window.__PRISMA__ && window.__PRISMA__.pronto, null, { timeout: 15000 });
  await page.evaluate(() => window.__PRISMA__.modoTeste(true));
  return { browser, page, logs };
}

/** Joga todas as fases da campanha pelo mesmo caminho do jogador humano. */
export async function jogarCampanha(page) {
  return page.evaluate(() => {
    const P = window.__PRISMA__;
    P.modoTeste(true);
    P.opcoes.master = 0;
    const linhas = [];
    for (let i = 0; i < P.totalFases; i++) {
      P.abrir(i);
      const t0 = performance.now();
      const e = P.resolverAtual();
      for (let k = 0; k < 120; k++) P.passo(1);
      linhas.push({
        fase: i, completa: e.completa, usadas: e.usadas, minimo: e.minimo,
        acesas: e.acesas, total: e.total, ms: performance.now() - t0,
      });
    }
    return { linhas, erros: P.erros };
  });
}
