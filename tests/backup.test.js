import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  backupFilename,
  mergeEntries,
  parseBackup,
  sanitizeEntries,
  serializeEntries,
} from '../js/backup.js';

const ENTRY = {
  date: '2026-01-02',
  grateful: ['kawa'],
  why: '',
  person: '',
  proud: '',
  lesson: '',
  savedAt: 1,
};

describe('serializeEntries i parseBackup', () => {
  test('kopia zapasowa wraca do tych samych danych po zapisie i odczycie', () => {
    const entries = { '2026-01-02': ENTRY };
    assert.deepEqual(parseBackup(serializeEntries(entries)), entries);
  });

  test('serializacja używa wcięcia dwóch spacji', () => {
    assert.match(serializeEntries({ a: 1 }), /^{\n {2}"a": 1\n}$/);
  });

  test('odrzuca tablicę', () => {
    assert.throws(() => parseBackup('[]'));
  });

  test('odrzuca wartość, która nie jest obiektem', () => {
    assert.throws(() => parseBackup('"tekst"'));
    assert.throws(() => parseBackup('42'));
  });

  test('odrzuca null', () => {
    assert.throws(() => parseBackup('null'));
  });

  test('odrzuca niepoprawny JSON', () => {
    assert.throws(() => parseBackup('{'));
  });
});

describe('sanitizeEntries', () => {
  test('poprawna kopia przechodzi bez żadnej zmiany', () => {
    const entries = { '2026-01-02': ENTRY, '2028-02-29': { ...ENTRY, date: '2028-02-29' } };
    assert.deepEqual(sanitizeEntries(entries), { entries, skipped: 0 });
  });

  test('pomija klucze, które nie są prawdziwymi dniami', () => {
    const imported = {
      '2026-02-31': { ...ENTRY, date: '2026-02-31' },
      '2026-9-5': ENTRY,
      '2026-01-02': ENTRY,
    };
    const { entries, skipped } = sanitizeEntries(imported);
    assert.deepEqual(Object.keys(entries), ['2026-01-02']);
    assert.equal(skipped, 2);
  });

  test('klucz wygrywa z polem date', () => {
    const { entries } = sanitizeEntries({ '2026-01-02': { ...ENTRY, date: '1999-12-31' } });
    assert.equal(entries['2026-01-02'].date, '2026-01-02');
  });

  test('brak lub zły savedAt to 0', () => {
    for (const savedAt of [undefined, '123', null, NaN, -5]) {
      const { entries } = sanitizeEntries({ '2026-01-02': { ...ENTRY, savedAt } });
      assert.equal(entries['2026-01-02'].savedAt, 0, String(savedAt));
    }
  });

  test('grateful: zostawia najwyżej trzy niepuste teksty, bez spacji z brzegów', () => {
    const grateful = [' a ', '', 5, 'b', 'c', 'd'];
    const { entries } = sanitizeEntries({ '2026-01-02': { ...ENTRY, grateful } });
    assert.deepEqual(entries['2026-01-02'].grateful, ['a', 'b', 'c']);
  });

  test('pomija wpis bez żadnej wdzięczności i wpis, który nie jest obiektem', () => {
    const imported = {
      '2026-01-01': { ...ENTRY, grateful: [] },
      '2026-01-02': { ...ENTRY, grateful: 'tekst' },
      '2026-01-03': 'tekst',
      '2026-01-04': null,
      '2026-01-05': [],
    };
    assert.deepEqual(sanitizeEntries(imported), { entries: {}, skipped: 5 });
  });

  test('pola tekstowe, które nie są tekstem, stają się puste', () => {
    const { entries } = sanitizeEntries({ '2026-01-02': { ...ENTRY, why: 5, person: null } });
    assert.equal(entries['2026-01-02'].why, '');
    assert.equal(entries['2026-01-02'].person, '');
  });

  test('odrzuca nieznane pola', () => {
    const { entries } = sanitizeEntries({ '2026-01-02': { ...ENTRY, extra: 'x' } });
    assert.equal('extra' in entries['2026-01-02'], false);
  });
});

describe('mergeEntries', () => {
  test('łączy wpisy z różnych dni', () => {
    const merged = mergeEntries({ a: ENTRY }, { b: ENTRY });
    assert.deepEqual(Object.keys(merged).sort(), ['a', 'b']);
  });

  test('wpis z pliku zastępuje obecny z tą samą datą (zachowanie z prototypu)', () => {
    const older = { ...ENTRY, why: 'stary' };
    const newer = { ...ENTRY, why: 'nowy' };
    assert.equal(mergeEntries({ a: newer }, { a: older }).a.why, 'stary');
  });

  test('nie modyfikuje przekazanych obiektów', () => {
    const current = { a: ENTRY };
    mergeEntries(current, { b: ENTRY });
    assert.deepEqual(Object.keys(current), ['a']);
  });
});

test('backupFilename zawiera datę', () => {
  assert.equal(backupFilename('2026-09-27'), 'kopia-dziennika-wdziecznosci-2026-09-27.json');
});
