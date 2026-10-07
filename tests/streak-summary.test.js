import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { computeStreak, listMonths, summarizeMonth } from '../js/streak-summary.js';

const NOON = new Date(2026, 8, 27, 12);

function entriesFor(dates, overrides = {}) {
  return Object.fromEntries(
    dates.map((date) => [date, { date, grateful: ['a'], person: '', ...overrides[date] }]),
  );
}

describe('computeStreak', () => {
  test('bez wpisów seria wynosi 0', () => {
    assert.equal(computeStreak({}, NOON), 0);
  });

  test('liczy kolejne dni wstecz od dziś', () => {
    const entries = entriesFor(['2026-09-25', '2026-09-26', '2026-09-27']);
    assert.equal(computeStreak(entries, NOON), 3);
  });

  test('gdy dziś nie ma wpisu, liczy od wczoraj', () => {
    const entries = entriesFor(['2026-09-25', '2026-09-26']);
    assert.equal(computeStreak(entries, NOON), 2);
  });

  test('przerwa w dniach kończy serię', () => {
    const entries = entriesFor(['2026-09-23', '2026-09-26', '2026-09-27']);
    assert.equal(computeStreak(entries, NOON), 2);
  });

  test('seria przechodzi przez zmianę czasu i granicę roku', () => {
    const autumn = entriesFor(['2026-10-24', '2026-10-25', '2026-10-26']);
    assert.equal(computeStreak(autumn, new Date(2026, 9, 26, 12)), 3);
    const newYear = entriesFor(['2026-12-31', '2027-01-01']);
    assert.equal(computeStreak(newYear, new Date(2027, 0, 1, 0, 30)), 2);
  });

  test('tuż po północy dzień jest już nowy, więc wczorajszy wpis liczy się jako wczoraj', () => {
    const entries = entriesFor(['2026-09-26', '2026-09-27']);
    assert.equal(computeStreak(entries, new Date(2026, 8, 28, 0, 30)), 2);
  });

  test('brak wpisu dziś i wczoraj zeruje serię', () => {
    const entries = entriesFor(['2026-09-20']);
    assert.equal(computeStreak(entries, NOON), 0);
  });
});

describe('listMonths', () => {
  test('zawiera miesiące z wpisami i bieżący, od najnowszego', () => {
    const entries = entriesFor(['2026-07-01', '2026-09-10', '2026-07-20']);
    assert.deepEqual(listMonths(entries, '2026-10'), ['2026-10', '2026-09', '2026-07']);
  });

  test('pomija wpisy z niepoprawnym kluczem', () => {
    const entries = entriesFor(['2026-07-01', '2026-02-31']);
    assert.deepEqual(listMonths(entries, '2026-09'), ['2026-09', '2026-07']);
  });

  test('bieżący miesiąc jest dostępny nawet bez wpisów', () => {
    assert.deepEqual(listMonths({}, '2026-09'), ['2026-09']);
  });
});

describe('summarizeMonth', () => {
  const constant = () => 0.5;

  test('zwraca null, gdy w miesiącu nie ma wpisów', () => {
    assert.equal(summarizeMonth(entriesFor(['2026-08-01']), '2026-09', constant), null);
  });

  test('liczy wpisy i najdłuższą serię w obrębie miesiąca', () => {
    const entries = entriesFor([
      '2026-09-01',
      '2026-09-02',
      '2026-09-05',
      '2026-09-06',
      '2026-09-07',
      '2026-08-31',
    ]);
    const summary = summarizeMonth(entries, '2026-09', constant);
    assert.equal(summary.count, 5);
    assert.equal(summary.longestStreak, 3);
  });

  test('zwraca do trzech najczęściej wymienianych osób', () => {
    const person = (name) => ({ person: name });
    const entries = entriesFor(
      ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06'],
      {
        '2026-09-01': person('Ala'),
        '2026-09-02': person('Ala'),
        '2026-09-03': person('Ola'),
        '2026-09-04': person('Ola'),
        '2026-09-05': person('Ala'),
        '2026-09-06': person(' Ewa '),
      },
    );
    const { topPeople } = summarizeMonth(entries, '2026-09', constant);
    assert.deepEqual(topPeople, [
      ['Ala', 3],
      ['Ola', 2],
      ['Ewa', 1],
    ]);
  });

  test('osoba o nazwie zgodnej z właściwością obiektu jest liczona poprawnie', () => {
    const entries = entriesFor(['2026-09-01'], { '2026-09-01': { person: 'constructor' } });
    assert.deepEqual(summarizeMonth(entries, '2026-09', constant).topPeople, [['constructor', 1]]);
  });

  test('wybiera najwyżej trzy chwile wdzięczności', () => {
    const entries = {
      '2026-09-01': { date: '2026-09-01', grateful: ['a', 'b', 'c', 'd'] },
      '2026-09-02': { date: '2026-09-02', grateful: ['e', ''] },
    };
    const { highlights } = summarizeMonth(entries, '2026-09', constant);
    assert.equal(highlights.length, 3);
    assert.ok(highlights.every((text) => text !== ''));
  });
});
