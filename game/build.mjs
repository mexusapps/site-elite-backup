// Compila os módulos em um único arquivo HTML autossuficiente.
// Duas saídas: uma para publicar como Artifact (sem doctype/head/body, que o
// serviço adiciona) e uma página completa para abrir no navegador e testar.
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, 'dist');
mkdirSync(out, { recursive: true });

const result = await build({
  entryPoints: [resolve(here, 'src/main.js')],
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  minify: !process.argv.includes('--dev'),
  write: false,
  legalComments: 'none',
});

const js = result.outputFiles[0].text;
const tpl = readFileSync(resolve(here, 'src/index.template.html'), 'utf8');
const inner = tpl.replace('__SCRIPT__', () => js);

writeFileSync(resolve(out, 'brasa.artifact.html'), inner);
writeFileSync(resolve(out, 'brasa.html'),
  '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
  '</head><body>' + inner + '</body></html>');

const kb = (s) => (s.length / 1024).toFixed(1) + ' KB';
console.log(`js ${kb(js)} · página ${kb(inner)}`);
