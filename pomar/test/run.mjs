// ---------------------------------------------------------------------------
// run.mjs — escada de verificação do POMAR.
//
//   0. física   (Node puro, sem navegador)
//   1. regras   (Node puro)
//   2. saúde da página
//   3. input humano de verdade: teclado, toque e os botões da tela
//   4. o jogo jogado do começo ao fim pelo bot
//   5. telas e acessibilidade
//   6. desempenho de quadro
//   7. capturas
//
// As duas primeiras rodam em milissegundos e pegam a maior parte dos defeitos.
// ---------------------------------------------------------------------------

import { abrir, jogarBot, hash } from './harness.mjs';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const FOTOS = resolve(aqui, '../dist/fotos');
mkdirSync(FOTOS, { recursive: true });

let pass = 0, fail = 0;
const falhas = [];
const ok = (n, c, d) => {
  if (c) { pass++; console.log(`  ✓ ${n}`); }
  else { fail++; falhas.push(n + (d ? ` — ${d}` : '')); console.log(`  ✗ ${n}${d ? ' — ' + d : ''}`); }
};

const t0 = Date.now();

// === 0 e 1: portões baratos em Node puro ====================================
console.log('\n0 e 1 · física e regras (sem navegador)');
for (const arq of ['physics.test.mjs', 'logica.test.mjs']) {
  try {
    const saida = execFileSync(process.execPath, [resolve(aqui, arq)], { encoding: 'utf8' });
    const m = saida.match(/(\d+) passaram · (\d+) falharam/);
    const p = m ? parseInt(m[1], 10) : 0, f = m ? parseInt(m[2], 10) : 1;
    pass += p; fail += f;
    console.log(`  ✓ ${arq}: ${p} verificações`);
    if (f) falhas.push(arq + ': ' + f + ' falhas');
  } catch (e) {
    fail++; falhas.push(arq + ' quebrou');
    console.log(`  ✗ ${arq}\n${String(e.stdout || e.message).split('\n').filter((l) => l.includes('✗')).join('\n')}`);
  }
}

const { browser, page, logs } = await abrir();
try {
  // === 2. saúde ==============================================================
  console.log('\n2 · saúde da página');
  {
    const info = await page.evaluate(() => ({
      pronto: window.__POMAR__.pronto,
      modo: window.__POMAR__.modo,
      tela: window.__POMAR__.tela(),
      canvas: !!document.getElementById('jogo').getContext('2d'),
      fundo: getComputedStyle(document.body).backgroundColor,
    }));
    ok('API exposta e canvas disponível', info.pronto && info.canvas);
    ok('abre no menu principal', info.modo === 'menu' && info.tela === 'titulo', `${info.modo}/${info.tela}`);
    ok('fundo pintado pela própria página', info.fundo !== 'rgba(0, 0, 0, 0)', info.fundo);

    const idle = await page.evaluate(() => {
      const P = window.__POMAR__;
      P.opcoes.master = 0;
      P.comecar(9);
      for (let i = 0; i < 600; i++) P.passo(1);
      return { e: P.estado(), erros: P.erros };
    });
    ok('600 quadros sem exceção', idle.erros.length === 0, idle.erros.join(' | '));
    ok('o tempo anda', idle.e.tempo > 9, 't=' + idle.e.tempo);
  }

  // === 3. input humano =======================================================
  console.log('\n3 · input humano de verdade');
  {
    await page.evaluate(() => {
      const P = window.__POMAR__;
      P.opcoes.master = 0; P.comecar(31); P.modoTeste(false);
    });
    const antesX = await page.evaluate(() => window.__POMAR__.jogo().maoX);
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(320);
    await page.keyboard.up('ArrowRight');
    const depoisX = await page.evaluate(() => window.__POMAR__.jogo().maoX);
    ok('teclado move a fruta da mão', depoisX - antesX > 40, `Δ=${(depoisX - antesX).toFixed(0)}`);

    const antesN = await page.evaluate(() => window.__POMAR__.jogo().fisica.bodies.length);
    await page.keyboard.press('Space');
    await page.waitForTimeout(220);
    const depoisN = await page.evaluate(() => window.__POMAR__.jogo().fisica.bodies.length);
    ok('espaço solta a fruta', depoisN > antesN, `${antesN} → ${depoisN}`);

    // mouse: mover e clicar
    const antes2 = await page.evaluate(() => window.__POMAR__.jogo().fisica.bodies.length);
    await page.waitForTimeout(420);          // respeita a recarga entre quedas
    await page.mouse.move(400, 300);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(320);
    const depois2 = await page.evaluate(() => window.__POMAR__.jogo().fisica.bodies.length);
    ok('clique do mouse solta a fruta', depois2 > antes2, `${antes2} → ${depois2}`);

    // toque
    const toque = await page.evaluate(async () => {
      const P = window.__POMAR__;
      const cv = document.getElementById('jogo');
      const n0 = P.jogo().fisica.bodies.length;
      const x0 = P.jogo().maoX;
      cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, pointerType: 'touch', clientX: 300, clientY: 400, bubbles: true, cancelable: true }));
      window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, pointerType: 'touch', clientX: 760, clientY: 400, bubbles: true }));
      await new Promise((r) => setTimeout(r, 120));
      const x1 = P.jogo().maoX;
      window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, pointerType: 'touch', bubbles: true }));
      await new Promise((r) => setTimeout(r, 220));
      return { moveu: x1 - x0, soltou: P.jogo().fisica.bodies.length > n0 };
    });
    ok('arrastar o dedo move a fruta', toque.moveu > 40, `Δ=${toque.moveu.toFixed(0)}`);
    ok('soltar o dedo derruba a fruta', toque.soltou === true);

    // botões da tela (chacoalhar e regar)
    const bot = await page.evaluate(async () => {
      const P = window.__POMAR__;
      const j = P.jogo();
      j.chacoalho = 1; j.regadores = 2;
      const bs = P.botoes();
      const cv = document.getElementById('jogo');
      const alvo = bs.find((b) => b.id === 'chacoalhar');
      if (!alvo) return { erro: 'sem botão' };
      const antes = j.chacoalho;
      cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 2, pointerType: 'touch', clientX: alvo.x, clientY: alvo.y, bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 160));
      window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 2, pointerType: 'touch', bubbles: true }));
      return { botoes: bs.map((b) => b.id), usou: j.chacoalho < antes };
    });
    ok('os botões da tela existem', bot.botoes && bot.botoes.includes('chacoalhar') && bot.botoes.includes('regar'),
      JSON.stringify(bot.botoes));
    ok('tocar no botão chacoalha a cesta', bot.usou === true);
    await page.evaluate(() => window.__POMAR__.modoTeste(true));
  }

  // === 4. o jogo, jogado ======================================================
  console.log('\n4 · o jogo jogado do começo ao fim');
  {
    const esperto = await jogarBot(page, { seed: 2026, quadros: 9000, politica: 'esperto' });
    ok('o bot combina frutas', esperto.estado.fusoes > 40, 'fusões=' + esperto.estado.fusoes);
    ok('a pontuação sobe', esperto.estado.pontos > 5000, 'pontos=' + esperto.estado.pontos);
    ok('chega em frutas grandes', esperto.estado.maiorTier >= 6, 'maior=' + esperto.estado.maiorTier);
    ok('atende pedidos', esperto.estado.pedidosFeitos > 0, 'pedidos=' + esperto.estado.pedidosFeitos);
    ok('sem exceção durante a partida', esperto.erros.length === 0, esperto.erros.join(' | '));
    console.log(`    esperto: ${esperto.estado.fusoes} fusões · maior ${esperto.estado.maiorTier + 1}/11 · ${esperto.estado.pontos} pts · ${esperto.estado.tucanos} tucanos`);

    const bagunca = await jogarBot(page, { seed: 77, quadros: 9000, politica: 'aleatorio' });
    ok('jogando de qualquer jeito também funciona', bagunca.estado.fusoes > 15, 'fusões=' + bagunca.estado.fusoes);
    ok('o tucano socorre quem enche a cesta', bagunca.estado.tucanos > 0, 'tucanos=' + bagunca.estado.tucanos);
    ok('nunca existe fim de jogo', bagunca.estado.fase === 'jogando');
    ok('a pontuação nunca fica negativa', bagunca.estado.pontos >= 0);
    console.log(`    aleatório: ${bagunca.estado.fusoes} fusões · ${bagunca.estado.tucanos} tucanos · ${bagunca.estado.frutas} na cesta`);

    const tranquilo = await jogarBot(page, { seed: 5, quadros: 4000, politica: 'aleatorio', modo: 'tranquilo' });
    ok('modo tranquilo funciona', tranquilo.estado.fusoes > 5 && tranquilo.erros.length === 0);

    // determinismo através da página
    const a = await jogarBot(page, { seed: 4242, quadros: 2400, politica: 'esperto' });
    const b = await jogarBot(page, { seed: 4242, quadros: 2400, politica: 'esperto' });
    ok('mesma semente = mesma partida', hash(a.estado) === hash(b.estado),
      `${a.estado.pontos} vs ${b.estado.pontos}`);
  }

  // === 5. telas ================================================================
  console.log('\n5 · telas e acessibilidade');
  {
    const t = await page.evaluate(() => {
      const P = window.__POMAR__;
      const r = {};
      P.clique('menu');
      for (const tela of ['comojoga', 'album', 'opcoes', 'marcas']) {
        P.clique(tela);
        const el = document.querySelector(`[data-tela="${tela}"]`);
        r[tela] = !!el && el.classList.contains('on') && el.textContent.trim().length > 20;
        P.clique('voltar');
      }
      P.clique('album');
      r.albumItens = document.querySelectorAll('[data-album] .fruta').length;
      r.albumCanvas = document.querySelectorAll('[data-album] canvas').length;
      P.clique('voltar');
      r.controles = document.querySelectorAll('[data-tela="opcoes"] [data-set]').length;
      return r;
    });
    // o foco é dado no quadro seguinte, então precisa de uma espera de verdade
    await page.evaluate(() => window.__POMAR__.clique('opcoes'));
    await page.waitForTimeout(120);
    t.foco = await page.evaluate(() => !!document.activeElement && document.activeElement.hasAttribute('data-nav'));
    await page.evaluate(() => window.__POMAR__.clique('voltar'));
    ok('tela "como joga" tem conteúdo', t.comojoga);
    ok('álbum lista as 11 frutas', t.albumItens === 11, 'itens=' + t.albumItens);
    ok('álbum desenha as frutas de verdade', t.albumCanvas === 11, 'canvas=' + t.albumCanvas);
    ok('opções tem todos os controles', t.controles >= 9, 'controles=' + t.controles);
    ok('menu recebe foco de teclado sozinho', t.foco === true);
    ok('marcas e opções abrem', t.marcas && t.opcoes);

    const acess = await page.evaluate(() => {
      const P = window.__POMAR__;
      const r = {};
      P.opcoes.paleta = 'forte'; window.__app.aplicarOpcoes();
      r.paleta = document.documentElement.dataset.paleta === 'forte';
      P.opcoes.tamanhoTexto = 1.5; window.__app.aplicarOpcoes();
      r.texto = getComputedStyle(document.documentElement).getPropertyValue('--te').trim() === '1.5';
      P.opcoes.tremor = 0; P.opcoes.brilhos = 0; window.__app.aplicarOpcoes();
      P.comecar(1);
      for (let i = 0; i < 240; i++) { if (i % 25 === 0) { P.mirar(0.5); P.soltar(); } P.passo(1); }
      r.particulas = window.__app.particulas.n;
      r.semEfeitos = window.__app.particulas.n === 0 && P.erros.length === 0;
      P.opcoes.paleta = 'pomar'; P.opcoes.tamanhoTexto = 1; P.opcoes.tremor = 1; P.opcoes.brilhos = 1;
      window.__app.aplicarOpcoes();
      return r;
    });
    ok('paleta de alto contraste aplica', acess.paleta);
    ok('escala de texto aplica', acess.texto);
    ok('brilhos em zero não desenha nenhuma partícula', acess.semEfeitos,
      'partículas=' + acess.particulas);
  }

  // === 6. desempenho ============================================================
  console.log('\n6 · desempenho');
  {
    const perf = await page.evaluate(async () => {
      const P = window.__POMAR__;
      P.comecar(3);
      for (let i = 0; i < 2600; i++) { if (i % 22 === 0) { P.mirar((i % 17) / 17); P.soltar(); } P.passo(1); }
      const frutas = P.jogo().fisica.bodies.length;
      const t0 = performance.now();
      for (let i = 0; i < 600; i++) P.passo(1);
      const sim = (performance.now() - t0) / 600;
      // e agora o desenho de verdade, medido por quadros de animação
      P.modoTeste(false);
      const amostras = [];
      await new Promise((res) => {
        let ultimo = performance.now(), n = 0;
        const laco = () => {
          const agora = performance.now();
          amostras.push(agora - ultimo); ultimo = agora;
          if (++n < 70) requestAnimationFrame(laco); else res();
        };
        requestAnimationFrame(laco);
      });
      P.modoTeste(true);
      amostras.sort((a, b) => a - b);
      return { sim, frutas, quadro: amostras[Math.floor(amostras.length * 0.9)] };
    });
    ok('simulação abaixo de 2 ms com a cesta cheia', perf.sim < 2, `${perf.sim.toFixed(2)} ms · ${perf.frutas} frutas`);
    ok('quadro real abaixo de 22 ms (90º percentil)', perf.quadro < 22, `${perf.quadro.toFixed(1)} ms`);
    console.log(`    ${perf.frutas} frutas · simulação ${perf.sim.toFixed(2)} ms · quadro ${perf.quadro.toFixed(1)} ms`);
  }

  // === 7. capturas ===============================================================
  console.log('\n7 · capturas');
  {
    const fotos = [
      ['01-titulo', () => page.evaluate(() => window.__POMAR__.clique('menu'))],
      ['02-como-joga', () => page.evaluate(() => { const P = window.__POMAR__; P.clique('menu'); P.clique('comojoga'); })],
      ['03-jogo', () => page.evaluate(() => {
        const P = window.__POMAR__;
        P.clique('voltar'); P.opcoes.master = 0; P.comecar(2468);
        for (let i = 0; i < 2000; i++) { if (i % 24 === 0) { const j = P.jogo(); const ig = j.fisica.bodies.filter((b) => b.tier === j.maoTier); P.mirar(ig.length ? ig[0].x / 520 : ((i * 7) % 460 + 30) / 520); P.soltar(); } P.passo(1); }
      })],
      ['04-cheia', () => page.evaluate(() => {
        const P = window.__POMAR__;
        P.comecar(99);
        for (let i = 0; i < 3200; i++) { if (i % 22 === 0) { P.mirar(((i * 11) % 440 + 40) / 520); P.soltar(); } P.passo(1); }
      })],
      ['05-album', () => page.evaluate(() => { const P = window.__POMAR__; P.clique('menu'); P.clique('album'); })],
      ['06-opcoes', () => page.evaluate(() => { const P = window.__POMAR__; P.clique('voltar'); P.clique('opcoes'); })],
    ];
    for (const [nome, prep] of fotos) {
      await prep();
      await page.waitForTimeout(200);
      await page.screenshot({ path: resolve(FOTOS, nome + '.png') });
    }
    ok(`${fotos.length} capturas geradas`, true);
  }

  console.log('\nconsole');
  ok('nenhum erro de console', logs.length === 0, logs.slice(0, 3).join(' | '));
} finally {
  await browser.close();
}

console.log(`\n${'─'.repeat(52)}`);
console.log(`${pass} passaram · ${fail} falharam · ${((Date.now() - t0) / 1000).toFixed(1)}s`);
if (fail) {
  console.log('\nfalhas:');
  for (const f of falhas) console.log('  · ' + f);
  process.exit(1);
}
