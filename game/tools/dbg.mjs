import { openGame, runBot } from '../test/harness.mjs';
const { browser, page } = await openGame();
const r = await runBot(page, { seed: 2026, frames: 9000, policy: 'exploratoria', sampleEvery: 300 });
console.log('final:', JSON.stringify(r.final).slice(0, 400));
console.log('events:', JSON.stringify(r.events));
console.log('stats:', JSON.stringify(r.stats));
for (const s of r.samples) console.log(`  f=${s.frame} w=${s.wave} flame=${s.flame} en=${s.enemies} pend=${s.pending} kills=${s.kills} st=${s.state} px=${s.px} py=${s.py}`);
await browser.close();
