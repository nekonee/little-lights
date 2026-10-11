// Zachowania dokumentacji (L1): względne linki w README i w docs/*.md prowadzą do istniejących plików,
// więc zmiana nazwy pliku nie zostawia po sobie zepsutych odnośników.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';

const ROOT = new URL('..', import.meta.url).pathname;
const markdownFiles = [
  'README.md',
  ...readdirSync(join(ROOT, 'docs'))
    .filter((name) => name.endsWith('.md'))
    .map((name) => `docs/${name}`),
];

test('L1: względne linki w dokumentach prowadzą do istniejących plików', () => {
  let checked = 0;
  for (const file of markdownFiles) {
    const text = readFileSync(join(ROOT, file), 'utf8');
    for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^([a-z][a-z0-9+.-]*:|#)/i.test(target)) continue;
      const path = target.split('#')[0];
      const resolved = join(ROOT, dirname(file), path);
      assert.ok(existsSync(resolved), `${file}: zepsuty link do ${target}`);
      checked++;
    }
  }
  assert.ok(checked >= 8, `sprawdzono tylko ${checked} linków, wyszukiwanie nie działa`);
});
