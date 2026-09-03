// ---------------------------------------------------------------------------
// harness.mjs — o robô que joga BOLOTA num Chromium de verdade.
//
// A física, as regras e o projeto da fase já foram provados em Node puro. O que
// só o navegador responde: a página monta, o dedo e o teclado chegam até a
// simulação, o desenho aguenta o bloom em 60 Hz e a fase termina quando jogada.
// ---------------------------------------------------------------------------

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const aqui = dirname(fileURLToPath(import.meta.url));
export const PAGINA = 'file://' + resolve(aqui, '../dist/bolota.html');
const CHROME = '/opt/pw-browsers/chromium';

export async function abrir({ width = 1280, height = 800, query = '' } = {}) {
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
  await page.goto(PAGINA + query, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__BOLOTA__ && window.__BOLOTA__.pronto, null, { timeout: 20000 });
  await page.evaluate(() => { window.__BOLOTA__.modoTeste(true); window.__BOLOTA__.opcoes.master = 0; });
  return { browser, page, logs };
}

/** Joga a fase inteira repetindo o caminho que o solucionador provou. */
export async function jogarFase(page, indice, caminho) {
  return page.evaluate(({ indice, caminho }) => {
    const B = window.__BOLOTA__;
    B.modoTeste(true);
    B.opcoes.master = 0;
    B.abrir(indice);
    B.passo(90);                      // a Bolota assenta, igual ao solucionador
    const t0 = performance.now();
    const saltos = [];
    for (const s of caminho) {
      const e = B.lancarDireto(s.ang, s.carga);
      saltos.push({ x: e.x, y: e.y, venceu: e.venceu, gotas: e.orvalho, brotos: e.brotos });
      if (e.venceu) break;
    }
    B.passo(140);                     // deixa a tela de fim aparecer
    return {
      saltos,
      estado: B.estado(),
      tela: B.tela(),
      modo: B.modo,
      dados: B.dados(),
      ms: performance.now() - t0,
      erros: B.erros,
    };
  }, { indice, caminho });
}
