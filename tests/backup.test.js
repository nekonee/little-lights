// Zachowania scalania kopii zapasowej (M1–M16). Numer M jest na początku nazwy testu, który go sprawdza.
//
//  M1:  Wpis z pliku z większym savedAt zastępuje obecny („zaktualizowano”).
//  M2:  Obecny wpis z większym savedAt zostaje („bez zmian”).
//  M3:  Remis savedAt (także 0 i 0): zostaje obecny, bez osobnej liczby w raporcie.
//  M4:  Brak, tekst albo NaN w savedAt liczy się jako 0, po obu stronach.
//  M5:  Wpis tylko w pliku jest dodawany („dodano”), wpis tylko lokalny zostaje.
//  M6:  Ta sama treść (5 pól) przy innym savedAt: „bez zmian”, obecny wpis zostaje, nawet gdy plik jest nowszy.
//  M7:  Raport {added, updated, unchanged} zgadza się z wynikiem; suma to liczba wpisów z pliku.
//  M8:  Scalanie nie zmienia argumentów i znosi uszkodzone wpisy lokalne (nie obiekt, zły savedAt).
//  M9:  Drugie wczytanie tego samego pliku nic nie zmienia: same „bez zmian”.
//  M10: Bez remisów wynik nie zależy od tego, która strona jest „obecna”, a która z pliku.
//  M11: Komunikat po imporcie: „Dodano X, zaktualizowano Y, bez zmian Z” (plus liczba pominiętych, gdy > 0).
//  M12: Plik bez żadnego poprawnego wpisu: komunikat „nic do wczytania” (plus pominięte).
//  M13: Zmiana czasu i strefa nie wpływają na liczbę dni od ostatniej kopii (testy w 4 strefach).
//  M14: Status kopii: bez wpisów brak licznika; wpisy bez kopii (albo z zepsutą datą) to „jeszcze nie”; data z przyszłości to „dziś”.
//  M15: Teksty licznika: dziś, wczoraj, „X dni temu”.
//  M16: Nazwa pliku zawiera lokalną datę.
// Wybór sposobu eksportu (M17, M18) jest w tests/share.test.js.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  backupFilename,
  backupStatus,
  mergeEntries,
  parseBackup,
  sanitizeEntries,
  serializeEntries,
} from '../js/backup.js';
import { strings } from '../js/strings.js';

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

function entry(date, savedAt, why = '') {
  return { date, grateful: ['kawa'], why, person: '', proud: '', lesson: '', savedAt };
}

function deepFreeze(value) {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

describe('mergeEntries', () => {
  test('M1: wpis z pliku z większym savedAt zastępuje obecny', () => {
    const current = { '2026-01-02': entry('2026-01-02', 100, 'stary') };
    const imported = { '2026-01-02': entry('2026-01-02', 200, 'nowy') };
    const result = mergeEntries(current, imported);
    assert.equal(result.entries['2026-01-02'].why, 'nowy');
    assert.equal(result.entries['2026-01-02'].savedAt, 200);
    assert.deepEqual([result.added, result.updated, result.unchanged], [0, 1, 0]);
  });

  test('M2: obecny wpis z większym savedAt zostaje', () => {
    const current = { '2026-01-02': entry('2026-01-02', 300, 'obecny') };
    const imported = { '2026-01-02': entry('2026-01-02', 200, 'z pliku') };
    const result = mergeEntries(current, imported);
    assert.equal(result.entries['2026-01-02'].why, 'obecny');
    assert.deepEqual([result.added, result.updated, result.unchanged], [0, 0, 1]);
  });

  test('M3: remis savedAt zostawia obecny wpis, także gdy oba mają 0', () => {
    for (const savedAt of [0, 5]) {
      const current = { '2026-01-02': entry('2026-01-02', savedAt, 'obecny') };
      const imported = { '2026-01-02': entry('2026-01-02', savedAt, 'z pliku') };
      const result = mergeEntries(current, imported);
      assert.equal(result.entries['2026-01-02'].why, 'obecny', `savedAt ${savedAt}`);
      assert.deepEqual(
        [result.added, result.updated, result.unchanged],
        [0, 0, 1],
        `savedAt ${savedAt}`,
      );
    }
  });

  test('M4: brak, tekst albo NaN w savedAt liczy się jako 0 po stronie obecnej', () => {
    for (const savedAt of [undefined, '999', NaN, null]) {
      const current = { '2026-01-02': { ...entry('2026-01-02', 0, 'obecny'), savedAt } };
      const imported = { '2026-01-02': entry('2026-01-02', 1, 'z pliku') };
      const result = mergeEntries(current, imported);
      assert.equal(result.entries['2026-01-02'].why, 'z pliku', String(savedAt));
      assert.equal(result.updated, 1, String(savedAt));
    }
  });

  test('M4: brak, tekst albo NaN w savedAt liczy się jako 0 po stronie pliku', () => {
    for (const savedAt of [undefined, '999', NaN, null]) {
      const current = { '2026-01-02': entry('2026-01-02', 1, 'obecny') };
      const imported = { '2026-01-02': { ...entry('2026-01-02', 0, 'z pliku'), savedAt } };
      const result = mergeEntries(current, imported);
      assert.equal(result.entries['2026-01-02'].why, 'obecny', String(savedAt));
      assert.equal(result.unchanged, 1, String(savedAt));
    }
  });

  test('M4: oba savedAt zepsute to remis, zostaje obecny', () => {
    const current = { '2026-01-02': { ...entry('2026-01-02', 0, 'obecny'), savedAt: 'x' } };
    const imported = { '2026-01-02': { ...entry('2026-01-02', 0, 'z pliku'), savedAt: NaN } };
    assert.equal(mergeEntries(current, imported).entries['2026-01-02'].why, 'obecny');
  });

  test('M5: wpis tylko w pliku jest dodawany, a tylko lokalny zostaje', () => {
    const current = { '2026-01-01': entry('2026-01-01', 10, 'lokalny') };
    const imported = { '2026-01-03': entry('2026-01-03', 20, 'z pliku') };
    const result = mergeEntries(current, imported);
    assert.deepEqual(Object.keys(result.entries).sort(), ['2026-01-01', '2026-01-03']);
    assert.equal(result.entries['2026-01-01'].why, 'lokalny');
    assert.equal(result.entries['2026-01-03'].why, 'z pliku');
    assert.deepEqual([result.added, result.updated, result.unchanged], [1, 0, 0]);
  });

  test('M6: ta sama treść przy innym savedAt to „bez zmian”, nawet gdy plik jest nowszy', () => {
    const current = { '2026-01-02': entry('2026-01-02', 10) };
    const imported = { '2026-01-02': entry('2026-01-02', 999) };
    const result = mergeEntries(current, imported);
    assert.equal(result.entries['2026-01-02'].savedAt, 10);
    assert.deepEqual([result.added, result.updated, result.unchanged], [0, 0, 1]);
  });

  test('M6: inna kolejność wdzięczności albo inne pole to inna treść', () => {
    const base = { ...entry('2026-01-02', 10), grateful: ['a', 'b'] };
    const variants = [
      { ...base, grateful: ['b', 'a'] },
      { ...base, grateful: ['a'] },
      { ...base, why: 'x' },
      { ...base, person: 'x' },
      { ...base, proud: 'x' },
      { ...base, lesson: 'x' },
    ];
    for (const variant of variants) {
      const result = mergeEntries(
        { '2026-01-02': base },
        { '2026-01-02': { ...variant, savedAt: 20 } },
      );
      assert.equal(result.updated, 1, JSON.stringify(variant));
    }
  });

  test('M6: plik z dodatkową wdzięcznością to inna treść, nawet gdy zaczyna się tak samo', () => {
    const current = { '2026-01-02': { ...entry('2026-01-02', 10), grateful: ['a'] } };
    const imported = { '2026-01-02': { ...entry('2026-01-02', 20), grateful: ['a', 'b'] } };
    assert.equal(mergeEntries(current, imported).updated, 1);
  });

  test('M4: ujemny savedAt liczy się jako 0', () => {
    const current = { '2026-01-02': { ...entry('2026-01-02', 0, 'obecny'), savedAt: -5 } };
    const imported = { '2026-01-02': entry('2026-01-02', 0, 'z pliku') };
    const result = mergeEntries(current, imported);
    assert.equal(result.entries['2026-01-02'].why, 'obecny');
    assert.equal(result.unchanged, 1);
  });

  test('M7: raport zgadza się z wynikiem, a suma to liczba wpisów z pliku', () => {
    const current = {
      '2026-01-01': entry('2026-01-01', 100, 'a-obecny'),
      '2026-01-02': entry('2026-01-02', 300, 'b-obecny'),
      '2026-01-03': entry('2026-01-03', 50, 'c-obecny'),
      '2026-01-05': entry('2026-01-05', 70, 'e-obecny'),
      '2026-01-07': entry('2026-01-07', 10),
    };
    const imported = {
      '2026-01-01': entry('2026-01-01', 200, 'a-plik'),
      '2026-01-02': entry('2026-01-02', 200, 'b-plik'),
      '2026-01-03': entry('2026-01-03', 50, 'c-plik'),
      '2026-01-04': entry('2026-01-04', 40, 'd-plik'),
      '2026-01-06': entry('2026-01-06', 60, 'f-plik'),
      '2026-01-07': entry('2026-01-07', 999),
    };
    const { entries, added, updated, unchanged } = mergeEntries(current, imported);
    assert.deepEqual([added, updated, unchanged], [2, 1, 3]);
    assert.equal(added + updated + unchanged, Object.keys(imported).length);
    assert.deepEqual(
      Object.fromEntries(Object.entries(entries).map(([key, value]) => [key, value.why])),
      {
        '2026-01-01': 'a-plik',
        '2026-01-02': 'b-obecny',
        '2026-01-03': 'c-obecny',
        '2026-01-04': 'd-plik',
        '2026-01-05': 'e-obecny',
        '2026-01-06': 'f-plik',
        '2026-01-07': '',
      },
    );
    assert.equal(entries['2026-01-07'].savedAt, 10);
  });

  test('M8: nie zmienia przekazanych obiektów', () => {
    const current = deepFreeze({
      '2026-01-01': entry('2026-01-01', 100, 'obecny'),
      '2026-01-02': entry('2026-01-02', 100, 'obecny'),
    });
    const imported = deepFreeze({
      '2026-01-01': entry('2026-01-01', 200, 'plik'),
      '2026-01-03': entry('2026-01-03', 200, 'plik'),
    });
    const before = JSON.stringify([current, imported]);
    const result = mergeEntries(current, imported);
    assert.equal(JSON.stringify([current, imported]), before);
    assert.notEqual(result.entries, current);
  });

  test('M8: uszkodzone wpisy lokalne nie wywracają scalania', () => {
    const current = {
      '2026-01-01': null,
      '2026-01-02': 'tekst',
      '2026-01-03': { grateful: 'kawa', savedAt: '9' },
      '2026-01-04': [],
    };
    const imported = {
      '2026-01-01': entry('2026-01-01', 5, 'a'),
      '2026-01-02': entry('2026-01-02', 5, 'b'),
      '2026-01-03': entry('2026-01-03', 5, 'c'),
      '2026-01-04': entry('2026-01-04', 5, 'd'),
    };
    const result = mergeEntries(current, imported);
    assert.deepEqual([result.added, result.updated, result.unchanged], [3, 1, 0]);
    for (const key of Object.keys(imported)) assert.deepEqual(result.entries[key], imported[key]);
  });

  test('M9: ponowne wczytanie tego samego pliku nic nie zmienia', () => {
    const current = {
      '2026-01-01': entry('2026-01-01', 100, 'obecny'),
      '2026-01-05': entry('2026-01-05', 70),
    };
    const imported = {
      '2026-01-01': entry('2026-01-01', 200, 'plik'),
      '2026-01-02': entry('2026-01-02', 40, 'plik'),
      '2026-01-03': entry('2026-01-03', 10, 'plik'),
    };
    const first = mergeEntries(current, imported);
    const second = mergeEntries(first.entries, imported);
    assert.deepEqual(second.entries, first.entries);
    assert.deepEqual([second.added, second.updated, second.unchanged], [0, 0, 3]);
  });

  test('M10: bez remisów wynik nie zależy od tego, która strona jest „obecna”', () => {
    const left = {
      '2026-01-01': entry('2026-01-01', 100, 'l1'),
      '2026-01-02': entry('2026-01-02', 300, 'l2'),
      '2026-01-03': entry('2026-01-03', 5, 'l3'),
    };
    const right = {
      '2026-01-01': entry('2026-01-01', 200, 'r1'),
      '2026-01-02': entry('2026-01-02', 250, 'r2'),
      '2026-01-04': entry('2026-01-04', 7, 'r4'),
    };
    assert.deepEqual(mergeEntries(left, right).entries, mergeEntries(right, left).entries);
  });
});

describe('strings.backup.imported', () => {
  test('M11: podaje liczby dodanych, zaktualizowanych i bez zmian', () => {
    assert.equal(
      strings.backup.imported({ added: 2, updated: 1, unchanged: 3, skipped: 0 }),
      'Wczytano kopię zapasową ✓ Dodano: 2, zaktualizowano: 1, bez zmian: 3',
    );
  });

  test('M11: dopisuje liczbę pominiętych wpisów tylko, gdy jest większa od zera', () => {
    assert.equal(
      strings.backup.imported({ added: 0, updated: 0, unchanged: 4, skipped: 2 }),
      'Wczytano kopię zapasową ✓ Dodano: 0, zaktualizowano: 0, bez zmian: 4. Pominięto nieprawidłowe wpisy: 2',
    );
  });

  test('M12: plik bez poprawnych wpisów to „nic do wczytania”', () => {
    assert.equal(
      strings.backup.imported({ added: 0, updated: 0, unchanged: 0, skipped: 0 }),
      'W pliku nie ma wpisów do wczytania',
    );
    assert.equal(
      strings.backup.imported({ added: 0, updated: 0, unchanged: 0, skipped: 3 }),
      'W pliku nie ma wpisów do wczytania. Pominięto nieprawidłowe wpisy: 3',
    );
  });
});

describe('backupStatus', () => {
  const TODAY = '2026-10-11';

  test('M13: liczy dni kalendarzowe od ostatniej kopii, także przez zmianę czasu', () => {
    const cases = [
      ['2026-10-11', 0],
      ['2026-10-10', 1],
      ['2026-09-26', 15],
      ['2025-10-11', 365],
    ];
    for (const [lastBackup, days] of cases) {
      assert.deepEqual(
        backupStatus({ entryCount: 3, lastBackup, today: TODAY }),
        { kind: 'done', days },
        lastBackup,
      );
    }
    assert.deepEqual(
      backupStatus({ entryCount: 3, lastBackup: '2026-03-28', today: '2026-03-30' }),
      { kind: 'done', days: 2 },
    );
    assert.deepEqual(
      backupStatus({ entryCount: 3, lastBackup: '2026-10-24', today: '2026-10-26' }),
      { kind: 'done', days: 2 },
    );
  });

  test('M14: bez wpisów nie ma licznika', () => {
    assert.deepEqual(backupStatus({ entryCount: 0, lastBackup: null, today: TODAY }), {
      kind: 'none',
    });
    assert.deepEqual(backupStatus({ entryCount: 0, lastBackup: '2026-10-01', today: TODAY }), {
      kind: 'none',
    });
  });

  test('M14: wpisy bez kopii albo z zepsutą datą kopii to „jeszcze nie”', () => {
    for (const lastBackup of [null, undefined, '', 'wczoraj', '2026-02-31', 20261011]) {
      assert.deepEqual(
        backupStatus({ entryCount: 1, lastBackup, today: TODAY }),
        { kind: 'never' },
        String(lastBackup),
      );
    }
  });

  test('M14: data kopii z przyszłości (przestawiony zegar) to „dziś”', () => {
    assert.deepEqual(backupStatus({ entryCount: 1, lastBackup: '2026-10-20', today: TODAY }), {
      kind: 'done',
      days: 0,
    });
  });
});

describe('strings.backup.lastBackup', () => {
  test('M15: dziś, wczoraj i „X dni temu”', () => {
    const text = (days) => strings.backup.lastBackup({ kind: 'done', days });
    assert.equal(text(0), 'Ostatnia kopia: dziś');
    assert.equal(text(1), 'Ostatnia kopia: wczoraj');
    assert.equal(text(2), 'Ostatnia kopia: 2 dni temu');
    assert.equal(text(5), 'Ostatnia kopia: 5 dni temu');
    assert.equal(text(21), 'Ostatnia kopia: 21 dni temu');
    assert.equal(text(22), 'Ostatnia kopia: 22 dni temu');
    assert.equal(text(365), 'Ostatnia kopia: 365 dni temu');
  });

  test('M15: brak kopii i brak wpisów', () => {
    assert.equal(
      strings.backup.lastBackup({ kind: 'never' }),
      'Jeszcze nie robiłaś kopii zapasowej',
    );
    assert.equal(strings.backup.lastBackup({ kind: 'none' }), '');
  });
});

test('M16: backupFilename zawiera datę', () => {
  assert.equal(backupFilename('2026-09-27'), 'kopia-dziennika-wdziecznosci-2026-09-27.json');
});
