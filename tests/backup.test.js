import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { backupFilename, mergeEntries, parseBackup, serializeEntries } from '../js/backup.js';

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

  test('odrzuca niepoprawny JSON', () => {
    assert.throws(() => parseBackup('{'));
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
