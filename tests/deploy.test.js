// Zachowania publikacji na GitHub Pages (W1–W6). Numer W jest na początku nazwy testu, który go sprawdza.
// Testy czytają workflow `.github/workflows/pages.yml` i sprawdzają, co trafia na stronę.
//
//  W1: Na stronę trafiają tylko wskazane pliki aplikacji, bez żadnych wzorców (`*`, `.`): nigdy docs, tests, tools,
//      legacy, backups, .git, .github, node_modules ani pliki główne projektu poza index.html, manifest.json i ikoną.
//  W2: Opublikowane jest wszystko, czego aplikacja potrzebuje: każdy lokalny plik z index.html, manifestu, CSS i JS istnieje
//      i jest objęty publikacją.
//  W3: Opublikowane katalogi zawierają tylko pliki kodu i obrazów (żadnego przypadkowego .json z danymi, .md ani kopii).
//  W4: Workflow publikuje po wypchnięciu na main, najpierw uruchamia testy, a publikacja od nich zależy.
//  W5: Uprawnienia są minimalne (odczyt kodu, zapis Pages, token OIDC), bez sekretów i bez cudzych akcji (tylko `actions/`),
//      z numerem wersji głównej przy każdej akcji.
//  W6: .gitignore wyklucza prywatne kopie zapasowe wpisów.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { describe, test } from 'node:test';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const text = (path) => readFileSync(join(ROOT, path), 'utf8');
const workflow = text('.github/workflows/pages.yml');

const FORBIDDEN_ROOTS = [
  'docs',
  'tests',
  'tools',
  'legacy',
  'backups',
  '.git',
  '.github',
  'node_modules',
  'README.md',
  'package.json',
  '.gitignore',
  '.editorconfig',
  '.prettierrc.json',
];

/** Źródła z poleceń `cp` w workflow (bez flag i bez miejsca docelowego). */
function publishedSources() {
  const sources = [];
  for (const line of workflow.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('cp ')) continue;
    const args = trimmed
      .split(/\s+/)
      .slice(1)
      .filter((arg) => !arg.startsWith('-'));
    sources.push(...args.slice(0, -1));
  }
  return sources;
}

const isPublished = (path, published) =>
  published.some((source) => path === source || path.startsWith(`${source}/`));

function filesUnder(dir) {
  return readdirSync(join(ROOT, dir)).flatMap((name) => {
    const path = `${dir}/${name}`;
    return statSync(join(ROOT, path)).isDirectory() ? filesUnder(path) : [path];
  });
}

/** Lokalne pliki, do których odwołuje się aplikacja. */
function referencedFiles() {
  const refs = new Set();
  const html = text('index.html');
  for (const [, url] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (!/^([a-z][a-z0-9+.-]*:|\/|#)/i.test(url)) refs.add(url.split('?')[0]);
  }
  for (const icon of JSON.parse(text('manifest.json')).icons) refs.add(icon.src);
  for (const dir of ['css', 'js']) {
    for (const file of filesUnder(dir)) {
      for (const [, path] of text(file).matchAll(/['"(](assets\/[A-Za-z0-9_./-]+)/g))
        refs.add(path);
    }
  }
  return [...refs];
}

describe('co trafia na stronę', () => {
  test('W1: tylko pliki aplikacji, bez wzorców i bez prywatnych katalogów', () => {
    const sources = publishedSources();
    assert.ok(sources.length > 0, 'workflow nie kopiuje żadnych plików');
    for (const source of sources) {
      assert.equal(/[*?]/.test(source), false, `wzorzec w źródle: ${source}`);
      assert.notEqual(source, '.', 'kopiowanie całego repozytorium');
      assert.equal(source.startsWith('/') || source.includes('..'), false, source);
      const first = source.split('/')[0];
      assert.equal(FORBIDDEN_ROOTS.includes(first), false, `na stronę trafiłoby: ${source}`);
      assert.ok(existsSync(join(ROOT, source)), `brak pliku: ${source}`);
    }
  });

  test('W2: opublikowane jest wszystko, czego aplikacja potrzebuje', () => {
    const published = publishedSources();
    const refs = referencedFiles();
    assert.ok(
      refs.includes('js/app.js') && refs.includes('manifest.json'),
      'zbieranie odwołań nie działa',
    );
    for (const ref of refs) {
      assert.ok(existsSync(join(ROOT, ref)), `odwołanie do nieistniejącego pliku: ${ref}`);
      assert.ok(isPublished(ref, published), `nieopublikowany plik potrzebny aplikacji: ${ref}`);
    }
    for (const required of [
      'index.html',
      'manifest.json',
      'apple-touch-icon.png',
      'css/base.css',
      'js/app.js',
    ]) {
      assert.ok(isPublished(required, published), `nieopublikowany: ${required}`);
    }
  });

  test('W3: opublikowane katalogi zawierają tylko kod i obrazy', () => {
    const allowed = /\.(js|css|svg|png)$/;
    for (const source of publishedSources()) {
      if (!statSync(join(ROOT, source)).isDirectory()) continue;
      for (const file of filesUnder(source))
        assert.match(file, allowed, `niedozwolony plik: ${file}`);
    }
  });
});

describe('workflow', () => {
  test('W4: publikacja po wypchnięciu na main, najpierw testy', () => {
    assert.match(workflow, /on:\s*\n\s+push:\s*\n\s+branches:\s*\[main\]/);
    assert.match(workflow, /run:\s*npm test/);
    assert.match(workflow, /deploy:[\s\S]*?needs:\s*test/);
    assert.match(workflow, /actions\/deploy-pages@/);
    assert.match(workflow, /actions\/upload-pages-artifact@/);
  });

  test('W5: minimalne uprawnienia, bez sekretów, tylko oficjalne akcje z wersją główną', () => {
    const beforeJobs = workflow.slice(0, workflow.indexOf('jobs:'));
    assert.match(
      beforeJobs,
      /permissions:\s*\n\s+contents:\s*read/,
      'zadanie test bez ograniczonego tokenu',
    );
    assert.match(workflow, /contents:\s*read/);
    assert.match(workflow, /pages:\s*write/);
    assert.match(workflow, /id-token:\s*write/);
    assert.equal(/write-all|contents:\s*write/.test(workflow), false);
    assert.equal(/secrets\./.test(workflow), false);
    const uses = [...workflow.matchAll(/uses:\s*(\S+)/g)].map((m) => m[1]);
    assert.ok(uses.length >= 4);
    for (const action of uses) assert.match(action, /^actions\/[a-z-]+@v\d+$/, action);
  });

  test('W6: .gitignore wyklucza prywatne kopie zapasowe', () => {
    const lines = text('.gitignore')
      .split('\n')
      .map((line) => line.trim());
    assert.ok(lines.includes('backups/'));
    assert.ok(lines.includes('kopia-dziennika-*.json'), 'stary wzorzec nazwy kopii');
    assert.ok(lines.includes('little-lights-kopia-*.json'), 'obecny wzorzec nazwy kopii');
  });
});
