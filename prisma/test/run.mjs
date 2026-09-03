// ---------------------------------------------------------------------------
// run.mjs — escada de verificação do PRISMA.
//
//   0. óptica              (Node puro)
//   1. solucionador+gerador(Node puro)
//   2. saúde da página
//   3. input humano de verdade
//   4. as 30 fases jogadas até o fim
//   5. telas e acessibilidade
//   6. desempenho, com o bloom ligado
//   7. capturas
// ---------------------------------------------------------------------------

import { abrir, jogarCampanha } from './harness.mjs';
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

console.log('\n0 e 1 · óptica, solucionador e gerador (sem navegador)');
for (const arq of ['optica.test.mjs', 'solver.test.mjs']) {
  try {
    const saida = execFileSync(process.execPath, [resolve(aqui, arq)], { encoding: 'utf8' });
    const m = saida.match(/(\d+) passaram · (\d+) falharam/);
    const p = m ? +m[1] : 0, f = m ? +m[2] : 1;
    pass += p; fail += f;
    console.log(`  ✓ ${arq}: ${p} verificações`);
    if (f) falhas.push(arq + ': ' + f + ' falhas');
  } catch (e) {
    fail++; falhas.push(arq + ' quebrou');
    console.log(`  ✗ ${arq}\n` + String(e.stdout || e.message).split('\n').filter((l) => l.includes('✗')).join('\n'));
  }
}

const { browser, page, logs } = await abrir();
try {
  console.log('\n2 · saúde da página');
  {
    const i = await page.evaluate(() => ({
      pronto: window.__PRISMA__.pronto,
      modo: window.__PRISMA__.modo,
      tela: window.__PRISMA__.tela(),
      total: window.__PRISMA__.totalFases,
      canvas: !!document.getElementById('jogo').getContext('2d'),
      fundo: getComputedStyle(document.body).backgroundColor,
    }));
    ok('API exposta e canvas disponível', i.pronto && i.canvas);
    ok('abre no menu', i.modo === 'menu' && i.tela === 'titulo', `${i.modo}/${i.tela}`);
    ok('a campanha tem 30 jardins', i.total === 30, 'total=' + i.total);
    ok('a página pinta o próprio fundo', i.fundo !== 'rgba(0, 0, 0, 0)', i.fundo);

    const idle = await page.evaluate(() => {
      const P = window.__PRISMA__;
      P.opcoes.master = 0; P.abrir(0);
      for (let k = 0; k < 400; k++) P.passo(1);
      return { e: P.estado(), erros: P.erros };
    });
    ok('400 quadros sem exceção', idle.erros.length === 0, idle.erros.join(' | '));
    ok('a fase começa não resolvida', idle.e.completa === false && idle.e.acesas < idle.e.total);
  }

  console.log('\n3 · input humano de verdade');
  {
    await page.evaluate(() => { const P = window.__PRISMA__; P.abrir(0); P.modoTeste(false); });
    await page.waitForTimeout(120);
    const L = await page.evaluate(() => window.__PRISMA__.layout());
    const centro = (cel) => ({
      x: L.x + ((cel % L.cols) + 0.5) * L.cel,
      y: L.y + (((cel / L.cols) | 0) + 0.5) * L.cel,
    });
    // acha uma célula vazia
    const vazia = await page.evaluate(() => {
      const p = window.__PRISMA__.partida();
      for (let i = 0; i < p.tab.cel.length; i++) if (!p.tab.cel[i]) return i;
      return -1;
    });
    const c = centro(vazia);
    await page.mouse.click(c.x, c.y);
    await page.waitForTimeout(140);
    const depois = await page.evaluate(() => window.__PRISMA__.estado().usadas);
    ok('clicar numa casa vazia coloca a peça', depois === 1, 'usadas=' + depois);

    const rotAntes = await page.evaluate((i) => window.__PRISMA__.partida().itemEm(i).rot, vazia);
    await page.mouse.click(c.x, c.y);
    await page.waitForTimeout(140);
    const rotDepois = await page.evaluate((i) => {
      const it = window.__PRISMA__.partida().itemEm(i);
      return it ? it.rot : -1;
    }, vazia);
    ok('clicar de novo gira a peça', rotDepois !== rotAntes, `${rotAntes} → ${rotDepois}`);

    // segurar tira a peça
    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    await page.waitForTimeout(650);
    await page.mouse.up();
    await page.waitForTimeout(140);
    const usadas2 = await page.evaluate(() => window.__PRISMA__.estado().usadas);
    ok('segurar tira a peça', usadas2 === 0, 'usadas=' + usadas2);

    // teclado
    await page.evaluate(() => { window.__PRISMA__.abrir(0); document.getElementById('jogo').focus(); });
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    const cursor = await page.evaluate(() => window.__app.cursor);
    ok('as setas andam pelo tabuleiro', cursor > 0, 'cursor=' + cursor);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(120);
    const porTeclado = await page.evaluate(() => window.__PRISMA__.estado().usadas);
    ok('enter coloca a peça', porTeclado === 1, 'usadas=' + porTeclado);
    await page.keyboard.press('KeyZ');
    await page.waitForTimeout(120);
    ok('Z desfaz', (await page.evaluate(() => window.__PRISMA__.estado().usadas)) === 0);

    // botões da bandeja
    const alvos = await page.evaluate(() => window.__PRISMA__.alvos().map((a) => a.id));
    ok('a bandeja e os botões existem',
      alvos.includes('peca') && alvos.includes('dica') && alvos.includes('desfazer') && alvos.includes('menu'),
      JSON.stringify([...new Set(alvos)]));

    const dica = await page.evaluate(async () => {
      const P = window.__PRISMA__;
      P.abrir(3);
      const a = P.alvos().find((x) => x.id === 'dica');
      const cv = document.getElementById('jogo');
      cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 9, pointerType: 'touch', clientX: a.x, clientY: a.y, bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 120));
      const p = P.partida();
      return { temDica: !!p.dicaAtual, cel: p.dicaAtual && p.dicaAtual.jogada.cel };
    });
    ok('o botão de ajuda dá uma dica de verdade', dica.temDica === true, JSON.stringify(dica));
    await page.evaluate(() => window.__PRISMA__.modoTeste(true));
  }

  console.log('\n4 · as 30 fases, jogadas até o fim');
  {
    const r = await jogarCampanha(page);
    const feitas = r.linhas.filter((l) => l.completa).length;
    const noMinimo = r.linhas.filter((l) => l.completa && l.usadas <= l.minimo).length;
    ok('todas as 30 fases são concluídas jogando', feitas === 30,
      'feitas=' + feitas + ' · falhou em ' + r.linhas.filter((l) => !l.completa).map((l) => l.fase).join(','));
    ok('a solução usada é a mais curta em todas', noMinimo === 30, 'no mínimo=' + noMinimo);
    ok('todas as flores acordam', r.linhas.every((l) => l.acesas === l.total));
    ok('sem exceção durante a campanha', r.erros.length === 0, r.erros.join(' | '));
    const pior = Math.max(...r.linhas.map((l) => l.ms));
    ok('resolver a fase mais pesada leva menos de 2 s', pior < 2000, pior.toFixed(0) + ' ms');
    console.log(`    30 fases · ${noMinimo} no mínimo · pior busca ${pior.toFixed(0)} ms`);

    const semFim = await page.evaluate(() => {
      const P = window.__PRISMA__;
      const out = [];
      P.semFim();
      for (let k = 0; k < 6; k++) {
        const t0 = performance.now();
        const e = P.resolverAtual();
        out.push({ completa: e.completa, ms: performance.now() - t0, minimo: e.minimo });
        window.__app.acao('proximo');
      }
      return { out, erros: P.erros };
    });
    ok('o jardim sem fim gera fases jogáveis', semFim.out.every((o) => o.completa), JSON.stringify(semFim.out.map((o) => o.completa)));
    ok('gerar e resolver ao vivo leva menos de 1,5 s', Math.max(...semFim.out.map((o) => o.ms)) < 1500,
      Math.max(...semFim.out.map((o) => o.ms)).toFixed(0) + ' ms');
    console.log(`    sem fim: ${semFim.out.map((o) => o.minimo).join(' ')} peças de mínimo`);
  }

  console.log('\n5 · telas e acessibilidade');
  {
    const t = await page.evaluate(() => {
      const P = window.__PRISMA__;
      const r = {};
      P.clique('menu');
      for (const tela of ['mapa', 'comojoga', 'opcoes', 'marcas']) {
        P.clique(tela === 'mapa' ? 'jogar' : tela);
        const el = document.querySelector(`[data-tela="${tela}"]`);
        r[tela] = !!el && el.classList.contains('on') && el.textContent.trim().length > 20;
        P.clique(tela === 'mapa' ? 'menu' : 'voltar');
      }
      P.clique('jogar');
      r.jardins = document.querySelectorAll('[data-mapa] button.jardim').length;
      P.clique('menu');
      P.clique('comojoga');
      r.pecas = document.querySelectorAll('[data-pecas] canvas').length;
      r.cores = document.querySelectorAll('[data-cores] canvas').length;
      P.clique('voltar');
      r.controles = document.querySelectorAll('[data-tela="opcoes"] [data-set]').length;
      return r;
    });
    ok('o mapa lista os 30 jardins', t.jardins === 30, 'jardins=' + t.jardins);
    ok('a ajuda desenha as 4 peças', t.pecas === 4, 'peças=' + t.pecas);
    ok('a ajuda desenha as 7 cores com símbolo', t.cores === 7, 'cores=' + t.cores);
    ok('opções tem todos os controles', t.controles >= 8, 'controles=' + t.controles);
    ok('todas as telas abrem com conteúdo', t.mapa && t.comojoga && t.opcoes && t.marcas);

    await page.evaluate(() => window.__PRISMA__.clique('opcoes'));
    await page.waitForTimeout(120);
    const foco = await page.evaluate(() => !!document.activeElement && document.activeElement.hasAttribute('data-nav'));
    ok('o menu recebe foco de teclado sozinho', foco === true);
    await page.evaluate(() => window.__PRISMA__.clique('voltar'));

    const ac = await page.evaluate(() => {
      const P = window.__PRISMA__; const r = {};
      P.opcoes.paleta = 'contraste'; window.__app.aplicarOpcoes();
      r.paleta = document.documentElement.dataset.paleta === 'contraste';
      P.opcoes.tamanhoTexto = 1.5; window.__app.aplicarOpcoes();
      r.texto = getComputedStyle(document.documentElement).getPropertyValue('--te').trim() === '1.5';
      P.opcoes.brilhos = 0; P.opcoes.bloom = 0; window.__app.aplicarOpcoes();
      P.abrir(2);
      P.resolverAtual();
      for (let k = 0; k < 120; k++) P.passo(1);
      r.semEfeitos = window.__app.particulas.n === 0;
      r.resolveuSemEfeitos = P.estado().completa;
      P.opcoes.paleta = 'jardim'; P.opcoes.tamanhoTexto = 1; P.opcoes.brilhos = 1; P.opcoes.bloom = 1;
      window.__app.aplicarOpcoes();
      return r;
    });
    ok('alto contraste aplica', ac.paleta);
    ok('escala de texto aplica', ac.texto);
    ok('sem faíscas nenhuma partícula é criada', ac.semEfeitos, 'n=' + ac.semEfeitos);
    ok('o jogo continua jogável com todos os efeitos desligados', ac.resolveuSemEfeitos);
  }

  console.log('\n6 · desempenho (com bloom)');
  {
    const perf = await page.evaluate(async () => {
      const P = window.__PRISMA__;
      P.abrir(29);
      P.resolverAtual();
      for (let k = 0; k < 60; k++) P.passo(1);
      const t0 = performance.now();
      for (let k = 0; k < 600; k++) P.passo(1);
      const sim = (performance.now() - t0) / 600;
      P.modoTeste(false);
      const amostras = [];
      await new Promise((res) => {
        let ult = performance.now(), n = 0;
        const l = () => {
          const a = performance.now();
          amostras.push(a - ult); ult = a;
          if (++n < 80) requestAnimationFrame(l); else res();
        };
        requestAnimationFrame(l);
      });
      P.modoTeste(true);
      amostras.sort((a, b) => a - b);
      return { sim, quadro: amostras[Math.floor(amostras.length * 0.9)] };
    });
    ok('simulação abaixo de 1 ms', perf.sim < 1, perf.sim.toFixed(3) + ' ms');
    ok('quadro completo com bloom abaixo de 22 ms (90º pct)', perf.quadro < 22, perf.quadro.toFixed(1) + ' ms');
    console.log(`    simulação ${perf.sim.toFixed(3)} ms · quadro ${perf.quadro.toFixed(1)} ms`);
  }

  console.log('\n7 · capturas');
  {
    const fotos = [
      ['01-titulo', () => page.evaluate(() => window.__PRISMA__.clique('menu'))],
      ['02-mapa', () => page.evaluate(() => window.__PRISMA__.clique('jogar'))],
      ['03-como-joga', () => page.evaluate(() => { const P = window.__PRISMA__; P.clique('menu'); P.clique('comojoga'); })],
      ['04-fase-inicio', () => page.evaluate(() => { const P = window.__PRISMA__; P.clique('voltar'); P.abrir(21); for (let k = 0; k < 60; k++) P.passo(1); })],
      ['05-fase-resolvida', () => page.evaluate(() => { const P = window.__PRISMA__; P.abrir(27); P.resolverAtual(); for (let k = 0; k < 90; k++) P.passo(1); })],
      ['06-meio-do-caminho', () => page.evaluate(() => {
        const P = window.__PRISMA__; P.abrir(16);
        const p = P.partida(); const d = p.pedirDica();
        if (d && !d.recomecar) {
          const it = p.bandeja.find((b) => b.cel === null && b.tipo === d.jogada.tipo);
          if (it) p.colocar(it, d.jogada.cel);
        }
        for (let k = 0; k < 70; k++) P.passo(1);
      })],
      ['07-opcoes', () => page.evaluate(() => { const P = window.__PRISMA__; P.clique('menu'); P.clique('opcoes'); })],
    ];
    for (const [nome, prep] of fotos) {
      await prep();
      await page.waitForTimeout(220);
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
