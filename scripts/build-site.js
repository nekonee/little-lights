// Składa folder strony: kopiuje tylko pliki aplikacji. Używa go workflow publikacji (.github/workflows/pages.yml)
// i test publikacji (tests/static/publication.test.js). Uruchomienie: node scripts/build-site.js _site
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Jedyna lista tego, co trafia na stronę. Wszystko spoza niej (docs, tests, tools, legacy, kopie) zostaje w repozytorium. */
export const PUBLISHED = [
  'index.html',
  'manifest.json',
  'apple-touch-icon.png',
  'css',
  'js',
  'assets/favicon.svg',
  'assets/icons',
];

/** @param {string} outDir nowy albo pusty katalog docelowy */
export function buildSite(outDir) {
  if (existsSync(outDir) && readdirSync(outDir).length > 0) {
    throw new Error(`Katalog docelowy nie jest pusty: ${outDir}`);
  }
  for (const path of PUBLISHED) {
    const target = join(outDir, path);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(join(ROOT, path), target, { recursive: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildSite(resolve(process.argv[2] ?? '_site'));
}
