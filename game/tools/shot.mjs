import { openGame } from '../test/harness.mjs';
const { browser, page } = await openGame();
await page.evaluate(() => {
  const B = window.__BRASA__, w = B.world();
  B.settings.master = 0;
  B.startRun(1357);
  w.pendingSpawns.length = 0; w.enemies.length = 0;
  for (let i = 0; i < 120; i++) B.step(1);
});
await page.waitForTimeout(250);
await page.screenshot({ path: 'dist/shots/05-sopros.png' });
await page.evaluate(() => { window.__BRASA__.click('menu'); window.__BRASA__.click('options'); });
await page.waitForTimeout(300);
await page.screenshot({ path: 'dist/shots/03-opcoes.png' });
await page.evaluate(() => { window.__BRASA__.click('back'); window.__BRASA__.click('howto'); });
await page.waitForTimeout(300);
await page.screenshot({ path: 'dist/shots/02-como-jogar.png' });
await browser.close();
