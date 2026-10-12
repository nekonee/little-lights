// Publikacja na GitHub Pages: co trafia na stronę (scripts/build-site.js) i jak działa workflow (.github/workflows/pages.yml).
// Zawartość strony sprawdzamy na prawdziwym wyniku skryptu w katalogu tymczasowym, a nie na tekście workflow.
import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, posix } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { buildSite } from '../../scripts/build-site.js';

const ROOT = new URL('../..', import.meta.url).pathname;
const readRepo = (path) => readFileSync(join(ROOT, path), 'utf8');
const workflow = readRepo('.github/workflows/pages.yml');

/** Co ma być na najwyższym poziomie strony: wpisane wprost, niezależnie od listy w skrypcie. */
const EXPECTED_TOP_LEVEL = [
  'apple-touch-icon.png',
  'assets',
  'css',
  'index.html',
  'js',
  'manifest.json',
];
const ALLOWED_EXTENSIONS = /\.(js|css|svg|png|html|json)$/;

function filesUnder(dir, base = dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(path, base) : [path.slice(base.length + 1)];
  });
}

/** Treść zadania z workflow (zadania zaczynają się od dwóch spacji pod `jobs:`). */
function job(name) {
  const match = workflow.match(new RegExp(`^  ${name}:\\n((?:    .*\\n|\\n)*)`, 'm'));
  assert.ok(match, `brak zadania ${name} w workflow`);
  return match[1];
}

describe('strona zbudowana przez scripts/build-site.js', () => {
  let workdir;
  let site;
  const read = (path) => readFileSync(join(site, path), 'utf8');

  before(() => {
    workdir = mkdtempSync(join(tmpdir(), 'little-lights-site-'));
    site = join(workdir, 'site');
    buildSite(site);
  });
  after(() => rmSync(workdir, { recursive: true, force: true }));

  /** Lokalne pliki, do których odwołuje się opublikowana aplikacja. */
  function referencedFiles() {
    const refs = new Set();
    for (const [, url] of read('index.html').matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (!/^([a-z][a-z0-9+.-]*:|\/|#)/i.test(url)) refs.add(url.split('?')[0]);
    }
    for (const icon of JSON.parse(read('manifest.json')).icons) refs.add(icon.src);
    for (const file of filesUnder(site).filter((name) => /^(css|js)\//.test(name))) {
      const text = read(file);
      for (const [, path] of text.matchAll(/['"(](assets\/[A-Za-z0-9_./-]+)/g)) refs.add(path);
      for (const [, spec] of text.matchAll(/from '(\.\.?\/[^']+)'/g)) {
        refs.add(posix.join(posix.dirname(file), spec));
      }
    }
    return [...refs];
  }

  test('na najwyższym poziomie są tylko pliki aplikacji, bez dokumentacji, testów, narzędzi, prototypu i kopii', () => {
    assert.deepEqual(readdirSync(site).sort(), EXPECTED_TOP_LEVEL);
    assert.deepEqual(readdirSync(join(site, 'assets')).sort(), ['favicon.svg', 'icons']);
  });

  test('nie ma plików ukrytych, kopii zapasowych ani plików obcego typu', () => {
    const files = filesUnder(site);
    assert.ok(files.length > 20, 'strona wygląda na pustą');
    for (const file of files) {
      assert.equal(
        file.split('/').some((part) => part.startsWith('.')),
        false,
        `plik ukryty: ${file}`,
      );
      assert.equal(/(^|\/)backups\//.test(file), false, `katalog z kopiami: ${file}`);
      assert.match(file, ALLOWED_EXTENSIONS, `niedozwolony typ: ${file}`);
    }
    assert.deepEqual(
      files.filter((file) => file.endsWith('.json')),
      ['manifest.json'],
    );
  });

  test('pliki na stronie są takie same jak w repozytorium', () => {
    for (const file of filesUnder(site)) {
      assert.deepEqual(readFileSync(join(site, file)), readFileSync(join(ROOT, file)), file);
    }
  });

  test('jest na niej wszystko, czego aplikacja potrzebuje (strona, skrypty, style, ikony, manifest)', () => {
    const refs = referencedFiles();
    assert.ok(
      refs.includes('js/app.js') && refs.includes('manifest.json'),
      'zbieranie odwołań nie działa',
    );
    assert.ok(refs.includes('js/dates.js') && refs.includes('assets/icons/icon-192.png'));
    for (const ref of refs) assert.ok(existsSync(join(site, ref)), `na stronie brakuje: ${ref}`);
    for (const required of [
      'index.html',
      'manifest.json',
      'apple-touch-icon.png',
      'css/base.css',
    ]) {
      assert.ok(existsSync(join(site, required)), `brak: ${required}`);
    }
  });

  test('odmawia zapisu do niepustego katalogu, żeby nie mieszać starej i nowej strony', () => {
    const occupied = join(workdir, 'occupied');
    mkdirSync(occupied);
    writeFileSync(join(occupied, 'stary.txt'), 'x');
    assert.throws(() => buildSite(occupied), /nie jest pusty/);
    assert.deepEqual(readdirSync(occupied), ['stary.txt']);
  });
});

describe('workflow publikacji', () => {
  test('publikuje po wypchnięciu na main i można go uruchomić ręcznie', () => {
    assert.match(workflow, /on:\s*\n\s+push:\s*\n\s+branches:\s*\[main\]/);
    assert.match(workflow, /workflow_dispatch:/);
  });

  test('publikacja zależy od testów', () => {
    assert.match(job('test'), /run:\s*npm test/);
    assert.match(job('deploy'), /needs:\s*test/);
    assert.match(job('deploy'), /actions\/upload-pages-artifact@/);
    assert.match(job('deploy'), /actions\/deploy-pages@/);
  });

  test('testy idą w tych samych czterech strefach czasowych co lokalnie (npm run test:tz)', () => {
    const inWorkflow = job('test').match(/matrix:\s*\n\s+tz:\s*\[([^\]]*)\]/);
    assert.ok(inWorkflow, 'brak macierzy stref czasowych w zadaniu test');
    const ciZones = inWorkflow[1].split(',').map((zone) => zone.trim());
    assert.match(job('test'), /TZ:\s*\$\{\{\s*matrix\.tz\s*\}\}/);

    const script = JSON.parse(readRepo('package.json')).scripts['test:tz'];
    const localZones = script.match(/for tz in ([^;]+);/)[1].split(/\s+/);
    assert.deepEqual([...ciZones].sort(), [...localZones].sort());
    for (const zone of ['Europe/Warsaw', 'America/Los_Angeles', 'Pacific/Kiritimati', 'UTC']) {
      assert.ok(ciZones.includes(zone), `brak strefy ${zone}`);
    }
  });

  test('stronę składa skrypt scripts/build-site.js, a wynik trafia do artefaktu', () => {
    assert.match(job('deploy'), /run:\s*node scripts\/build-site\.js _site/);
    assert.match(job('deploy'), /path:\s*_site/);
  });

  test('wersja Node pochodzi z .nvmrc i zgadza się z wymaganiem w package.json', () => {
    assert.match(job('test'), /node-version-file:\s*\.nvmrc/);
    const major = Number(readRepo('.nvmrc').trim());
    assert.ok(
      Number.isInteger(major) && major >= 20,
      '.nvmrc powinien zawierać numer wersji głównej',
    );
    assert.equal(JSON.parse(readRepo('package.json')).engines.node, `>=${major}`);
  });

  test('uprawnienia są minimalne: odczyt kodu, a zapis tylko do Pages i token OIDC w zadaniu publikacji', () => {
    const beforeJobs = workflow.slice(0, workflow.indexOf('jobs:'));
    assert.match(
      beforeJobs,
      /permissions:\s*\n\s+contents:\s*read/,
      'domyślny token bez ograniczenia',
    );
    assert.equal(/write-all|contents:\s*write/.test(workflow), false);
    assert.match(job('deploy'), /pages:\s*write/);
    assert.match(job('deploy'), /id-token:\s*write/);
    assert.equal(
      /write/.test(job('test')),
      false,
      'zadanie testów nie powinno mieć uprawnień zapisu',
    );
  });

  test('używa tylko oficjalnych akcji GitHuba z numerem wersji głównej i bez sekretów', () => {
    const uses = [...workflow.matchAll(/uses:\s*(\S+)/g)].map((match) => match[1]);
    assert.ok(uses.length >= 4);
    for (const action of uses) assert.match(action, /^actions\/[a-z-]+@v\d+$/, action);
    assert.equal(/secrets\./.test(workflow), false);
  });
});

describe('.gitignore', () => {
  test('wyklucza prywatne kopie zapasowe wpisów i wynik budowania strony', () => {
    const lines = readRepo('.gitignore')
      .split('\n')
      .map((line) => line.trim());
    for (const pattern of [
      'backups/',
      'kopia-dziennika-*.json',
      'little-lights-kopia-*.json',
      '_site/',
    ]) {
      assert.ok(lines.includes(pattern), `brak wzorca ${pattern}`);
    }
  });
});
