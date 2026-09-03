import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve, extname, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const aqui = dirname(fileURLToPath(import.meta.url));
const out = resolve(aqui, 'dist');
mkdirSync(out, { recursive: true });

// ---------------------------------------------------------------------------
// A arte ilustrada de bolota/arte/ vira um módulo com data URIs, para a página
// continuar sendo um arquivo só. O que não existir simplesmente não entra, e o
// jogo desenha aquele elemento por código.
// ---------------------------------------------------------------------------
const pastaArte = resolve(aqui, 'arte');
const TIPO = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
const arquivos = [];
if (existsSync(pastaArte)) {
  for (const arq of readdirSync(pastaArte).sort()) {
    const ext = extname(arq).toLowerCase();
    if (!TIPO[ext]) continue;
    const caminho = resolve(pastaArte, arq);
    if (!statSync(caminho).isFile()) continue;
    arquivos.push({ nome: basename(arq, ext), ext, caminho, dados: readFileSync(caminho) });
  }
}

/**
 * PNG de ilustração é enorme: seis fundos de 2560 px passam de 15 MB, que é o
 * teto de uma página publicada. WebP com alfa entrega a mesma imagem em um
 * quinto do tamanho. Não há biblioteca de imagem aqui — mas há um Chromium, e
 * ele sabe recodificar. O resultado fica em cache por conteúdo, então só a
 * primeira construção depois de trocar um arquivo paga o custo.
 */
const cache = resolve(pastaArte, '.cache');
async function paraWebp(lista) {
  const pendentes = lista.filter((a) => {
    a.chave = createHash('sha1').update(a.dados).digest('hex').slice(0, 16);
    a.destino = resolve(cache, a.chave + '.webp');
    if (existsSync(a.destino)) { a.webp = readFileSync(a.destino); return false; }
    return true;
  });
  if (!pendentes.length) return;
  mkdirSync(cache, { recursive: true });
  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch (_) { console.warn('  (playwright ausente: mantendo PNG)'); return; }
  const navegador = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const pagina = await navegador.newPage();
  await pagina.setContent('<canvas id=c></canvas>');
  for (const a of pendentes) {
    const url = `data:${TIPO[a.ext]};base64,${a.dados.toString('base64')}`;
    const saida = await pagina.evaluate(async (u) => {
      const im = new Image();
      await new Promise((ok, erro) => { im.onload = ok; im.onerror = erro; im.src = u; });
      const c = document.getElementById('c');
      c.width = im.width; c.height = im.height;
      c.getContext('2d').drawImage(im, 0, 0);
      return c.toDataURL('image/webp', 0.88);
    }, url);
    if (saida.startsWith('data:image/webp')) {
      a.webp = Buffer.from(saida.split(',')[1], 'base64');
      writeFileSync(a.destino, a.webp);
    }
  }
  await navegador.close();
}

await paraWebp(arquivos);

let entradas = [], bytesArte = 0;
for (const a of arquivos) {
  // só troca por WebP quando ele realmente for menor
  const usaWebp = a.webp && a.webp.length < a.dados.length;
  const dados = usaWebp ? a.webp : a.dados;
  const tipo = usaWebp ? 'image/webp' : TIPO[a.ext];
  bytesArte += dados.length;
  entradas.push(`  ${JSON.stringify(a.nome)}: `
    + JSON.stringify(`data:${tipo};base64,${dados.toString('base64')}`) + ',');
}
writeFileSync(resolve(aqui, 'src/render/arte-gerada.js'),
  '// GERADO POR build.mjs — não edite à mão.\n'
  + '// Cada imagem de bolota/arte/ vira uma entrada aqui, como data URI.\n'
  + 'export const ARTE = {\n' + entradas.join('\n') + (entradas.length ? '\n' : '') + '};\n');
const r = await build({
  entryPoints: [resolve(aqui, 'src/main.js')],
  bundle: true, format: 'iife', target: ['es2020'],
  minify: !process.argv.includes('--dev'), write: false, legalComments: 'none',
});
const js = r.outputFiles[0].text;
const tpl = readFileSync(resolve(aqui, 'src/index.template.html'), 'utf8');
const inner = tpl.replace('__SCRIPT__', () => js);
writeFileSync(resolve(out, 'bolota.artifact.html'), inner);
writeFileSync(resolve(out, 'bolota.html'),
  '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
  '</head><body>' + inner + '</body></html>');
console.log(`js ${(js.length / 1024).toFixed(1)} KB · página ${(inner.length / 1024).toFixed(1)} KB`
  + ` · arte: ${entradas.length} imagem(ns), ${(bytesArte / 1024).toFixed(0)} KB`);
