import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const aqui = dirname(fileURLToPath(import.meta.url));
const out = resolve(aqui, 'dist');
mkdirSync(out, { recursive: true });
const r = await build({
  entryPoints: [resolve(aqui, 'src/main.js')],
  bundle: true, format: 'iife', target: ['es2020'],
  minify: !process.argv.includes('--dev'), write: false, legalComments: 'none',
});
const js = r.outputFiles[0].text;
const tpl = readFileSync(resolve(aqui, 'src/index.template.html'), 'utf8');
const inner = tpl.replace('__SCRIPT__', () => js);
writeFileSync(resolve(out, 'prisma.artifact.html'), inner);
writeFileSync(resolve(out, 'prisma.html'),
  '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
  '</head><body>' + inner + '</body></html>');
console.log(`js ${(js.length / 1024).toFixed(1)} KB · página ${(inner.length / 1024).toFixed(1)} KB`);
