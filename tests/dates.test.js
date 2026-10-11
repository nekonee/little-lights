import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  addDaysKey,
  dateKey,
  daysBetween,
  formatDatePL,
  formatMonthPL,
  isValidKey,
  keyFromLocalDate,
  monthKey,
  monthOf,
  parseKey,
  todayKey,
} from '../js/dates.js';

describe('dateKey i monthKey', () => {
  test('składają klucze z liczb z zerami wiodącymi', () => {
    assert.equal(dateKey(2026, 9, 5), '2026-09-05');
    assert.equal(monthKey(2026, 1), '2026-01');
  });

  test('keyFromLocalDate bierze składniki lokalne, nie UTC', () => {
    assert.equal(keyFromLocalDate(new Date(2026, 0, 31, 0, 30)), '2026-01-31');
    assert.equal(keyFromLocalDate(new Date(2026, 11, 31, 23, 30)), '2026-12-31');
  });
});

describe('todayKey', () => {
  test('tuż po północy lokalnej wraca bieżący dzień', () => {
    assert.equal(todayKey(new Date(2026, 8, 27, 0, 30)), '2026-09-27');
  });

  test('tuż przed północą lokalną wraca bieżący dzień', () => {
    assert.equal(todayKey(new Date(2026, 8, 27, 23, 30)), '2026-09-27');
  });

  test('granica roku', () => {
    assert.equal(todayKey(new Date(2027, 0, 1, 0, 5)), '2027-01-01');
  });
});

describe('parseKey i isValidKey', () => {
  test('rozkłada poprawny klucz na liczby', () => {
    assert.deepEqual(parseKey('2026-09-25'), { year: 2026, month: 9, day: 25 });
  });

  test('akceptuje 29 lutego tylko w roku przestępnym', () => {
    assert.equal(isValidKey('2028-02-29'), true);
    assert.equal(isValidKey('2026-02-29'), false);
  });

  test('odrzuca nieistniejące daty', () => {
    for (const key of ['2026-02-31', '2026-13-01', '2026-00-10', '2026-04-31', '2026-01-00']) {
      assert.equal(isValidKey(key), false, key);
    }
  });

  test('odrzuca zły format i typy', () => {
    for (const key of [
      '2026-9-25',
      '25-09-2026',
      '2026-09-25T00:00',
      '',
      null,
      undefined,
      20260925,
    ]) {
      assert.equal(parseKey(key), null, String(key));
    }
  });
});

describe('monthOf', () => {
  test('zwraca miesiąc dnia', () => {
    assert.equal(monthOf('2026-09-25'), '2026-09');
  });

  test('dla niepoprawnego klucza zwraca null', () => {
    assert.equal(monthOf('2026-02-31'), null);
  });
});

describe('addDaysKey', () => {
  test('dodaje i odejmuje dni', () => {
    assert.equal(addDaysKey('2026-09-25', 1), '2026-09-26');
    assert.equal(addDaysKey('2026-09-25', -25), '2026-08-31');
    assert.equal(addDaysKey('2026-09-25', 0), '2026-09-25');
  });

  test('przechodzi przez granice miesięcy i roku', () => {
    assert.equal(addDaysKey('2026-01-31', 1), '2026-02-01');
    assert.equal(addDaysKey('2026-12-31', 1), '2027-01-01');
    assert.equal(addDaysKey('2027-01-01', -1), '2026-12-31');
  });

  test('obsługuje luty w roku przestępnym', () => {
    assert.equal(addDaysKey('2028-02-28', 1), '2028-02-29');
    assert.equal(addDaysKey('2028-02-29', 1), '2028-03-01');
    assert.equal(addDaysKey('2026-02-28', 1), '2026-03-01');
  });

  test('zmiana czasu nie gubi ani nie dubluje dnia', () => {
    assert.equal(addDaysKey('2026-03-28', 1), '2026-03-29');
    assert.equal(addDaysKey('2026-03-29', 1), '2026-03-30');
    assert.equal(addDaysKey('2026-10-24', 1), '2026-10-25');
    assert.equal(addDaysKey('2026-10-25', 1), '2026-10-26');
    assert.equal(addDaysKey('2026-10-26', -2), '2026-10-24');
  });

  test('rzuca błąd dla niepoprawnego klucza', () => {
    assert.throws(() => addDaysKey('2026-02-31', 1), RangeError);
  });
});

describe('daysBetween', () => {
  test('ten sam dzień to 0, następny to 1', () => {
    assert.equal(daysBetween('2026-10-11', '2026-10-11'), 0);
    assert.equal(daysBetween('2026-10-10', '2026-10-11'), 1);
  });

  test('liczy dni kalendarzowe przez granice miesięcy i lat', () => {
    assert.equal(daysBetween('2026-09-26', '2026-10-11'), 15);
    assert.equal(daysBetween('2026-12-31', '2027-01-01'), 1);
    assert.equal(daysBetween('2026-01-01', '2027-01-01'), 365);
    assert.equal(daysBetween('2024-01-01', '2025-01-01'), 366);
    assert.equal(daysBetween('2028-02-28', '2028-03-01'), 2);
  });

  test('zmiana czasu nie skraca ani nie wydłuża różnicy', () => {
    assert.equal(daysBetween('2026-03-28', '2026-03-29'), 1);
    assert.equal(daysBetween('2026-03-28', '2026-03-30'), 2);
    assert.equal(daysBetween('2026-10-24', '2026-10-25'), 1);
    assert.equal(daysBetween('2026-10-24', '2026-10-26'), 2);
  });

  test('dzień, którego w strefie nie było (Kiritimati, 31.12.1994), nadal liczy się jako dzień', () => {
    assert.equal(daysBetween('1994-12-29', '1995-01-02'), 4);
    assert.equal(daysBetween('1994-12-30', '1995-01-01'), 2);
  });

  test('dla późniejszego dnia „od” wynik jest ujemny', () => {
    assert.equal(daysBetween('2026-10-11', '2026-10-10'), -1);
    assert.equal(daysBetween('2027-01-01', '2026-01-01'), -365);
  });

  test('rzuca błąd dla niepoprawnego klucza', () => {
    assert.throws(() => daysBetween('2026-02-31', '2026-03-01'), RangeError);
    assert.throws(() => daysBetween('2026-03-01', 'jutro'), RangeError);
  });
});

describe('formatDatePL', () => {
  test('zwraca długą datę po polsku z wielką literą', () => {
    assert.equal(formatDatePL('2026-09-25'), 'Piątek, 25 września 2026');
    assert.equal(formatDatePL('2026-01-01'), 'Czwartek, 1 stycznia 2026');
    assert.equal(formatDatePL('2028-02-29'), 'Wtorek, 29 lutego 2028');
  });

  test('niepoprawny klucz wraca bez zmian', () => {
    assert.equal(formatDatePL('2026-02-31'), '2026-02-31');
  });
});

describe('formatMonthPL', () => {
  test('zwraca miesiąc w mianowniku z wielką literą', () => {
    assert.equal(formatMonthPL('2026-09'), 'Wrzesień 2026');
    assert.equal(formatMonthPL('2027-01'), 'Styczeń 2027');
  });

  test('niepoprawny klucz wraca bez zmian', () => {
    assert.equal(formatMonthPL('2026-13'), '2026-13');
    assert.equal(formatMonthPL('abc'), 'abc');
  });
});
