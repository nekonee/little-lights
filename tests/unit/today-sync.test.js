// Powrót do dzisiejszej daty (js/today-sync.js): powrót z tła, zmiana dnia przy otwartej aplikacji,
// czas do północy i szkic z innego dnia do pokazania w banerze.
// Czas w testach powstaje lokalnie (new Date(rok, miesiąc, dzień, godzina)), a testy idą w czterech strefach.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  RETURN_THRESHOLD_MS,
  decideSync,
  findOtherDraft,
  msUntilNextDay,
} from '../../js/today-sync.js';

const TODAY = '2026-10-07';
const YESTERDAY = '2026-10-06';
const MINUTE = 60 * 1000;

function sync(overrides = {}) {
  return decideSync({
    reason: 'return',
    today: TODAY,
    lastKnownToday: TODAY,
    selectedDate: TODAY,
    formDirty: false,
    hiddenMs: 0,
    ...overrides,
  });
}

describe('decideSync: powrót z tła', () => {
  test('próg to 10 minut', () => {
    assert.equal(RETURN_THRESHOLD_MS, 10 * MINUTE);
  });

  test('krótka przerwa bez zmiany dnia nic nie zmienia', () => {
    assert.deepEqual(sync({ selectedDate: YESTERDAY, hiddenMs: 9 * MINUTE + 59_999 }), {
      action: 'none',
      refreshLabels: false,
    });
    assert.deepEqual(sync({ selectedDate: YESTERDAY, hiddenMs: 0 }), {
      action: 'none',
      refreshLabels: false,
    });
  });

  test('dokładnie 10 minut w tle przechodzi na dziś', () => {
    assert.equal(sync({ selectedDate: YESTERDAY, hiddenMs: 10 * MINUTE }).action, 'goToToday');
    assert.equal(
      sync({ selectedDate: YESTERDAY, hiddenMs: 3 * 24 * 60 * MINUTE }).action,
      'goToToday',
    );
  });

  test('gdy wybrane jest już dziś, nie ma dokąd przechodzić', () => {
    assert.equal(sync({ selectedDate: TODAY, hiddenMs: 60 * MINUTE }).action, 'none');
  });

  test('zmiana dnia przechodzi na dziś nawet po krótkiej przerwie i odświeża etykiety', () => {
    const result = sync({
      today: TODAY,
      lastKnownToday: YESTERDAY,
      selectedDate: YESTERDAY,
      hiddenMs: 5_000,
    });
    assert.deepEqual(result, { action: 'goToToday', refreshLabels: true });
  });

  test('zmiana dnia z wybranym starszym dniem też wraca na dziś', () => {
    const result = sync({ lastKnownToday: YESTERDAY, selectedDate: '2026-09-20', hiddenMs: 1 });
    assert.equal(result.action, 'goToToday');
  });

  test('rozgrzebany formularz nie blokuje powrotu na dziś', () => {
    const result = sync({ selectedDate: YESTERDAY, hiddenMs: 30 * MINUTE, formDirty: true });
    assert.equal(result.action, 'goToToday');
  });

  test('nieznany albo ujemny czas w tle liczy się jak zero', () => {
    for (const hiddenMs of [undefined, null, NaN, -5 * MINUTE, -Infinity, Infinity]) {
      assert.equal(sync({ selectedDate: YESTERDAY, hiddenMs }).action, 'none', String(hiddenMs));
    }
  });
});

describe('decideSync: sprawdzenie w trakcie działania', () => {
  const tick = (overrides) => sync({ reason: 'tick', ...overrides });

  test('bez zmiany dnia nic się nie dzieje, także po długim czasie', () => {
    assert.deepEqual(tick({ selectedDate: YESTERDAY, hiddenMs: 999 * MINUTE }), {
      action: 'none',
      refreshLabels: false,
    });
  });

  test('była wybrana „dziś”, formularz nietknięty: przejście na nowy dzień', () => {
    const result = tick({ lastKnownToday: YESTERDAY, selectedDate: YESTERDAY });
    assert.deepEqual(result, { action: 'goToToday', refreshLabels: true });
  });

  test('była wybrana „dziś”, formularz rozgrzebany: tylko propozycja', () => {
    const result = tick({ lastKnownToday: YESTERDAY, selectedDate: YESTERDAY, formDirty: true });
    assert.deepEqual(result, { action: 'offerToday', refreshLabels: true });
  });

  test('wybrany był inny dzień: wybór zostaje, etykiety się odświeżają', () => {
    for (const formDirty of [false, true]) {
      const result = tick({ lastKnownToday: YESTERDAY, selectedDate: '2026-10-01', formDirty });
      assert.deepEqual(result, { action: 'none', refreshLabels: true }, String(formDirty));
    }
  });

  test('nieznany powód to błąd programisty', () => {
    assert.throws(() => sync({ reason: 'tock' }), RangeError);
    assert.throws(() => sync({ reason: undefined }), RangeError);
  });
});

describe('msUntilNextDay', () => {
  const DAY = 24 * 60 * MINUTE;

  test('z południa do północy zostaje 12 godzin', () => {
    assert.equal(msUntilNextDay(new Date(2026, 9, 7, 12, 0, 0, 0)), 12 * 60 * MINUTE);
  });

  test('pół minuty przed północą', () => {
    assert.equal(msUntilNextDay(new Date(2026, 9, 7, 23, 59, 30, 0)), 30_000);
  });

  test('ostatnia milisekunda dnia', () => {
    assert.equal(msUntilNextDay(new Date(2026, 9, 7, 23, 59, 59, 999)), 1);
  });

  test('dokładnie o północy zostaje cały nowy dzień, a nie zero', () => {
    const result = msUntilNextDay(new Date(2026, 9, 7, 0, 0, 0, 0));
    assert.ok(result >= 23 * 60 * MINUTE && result <= 25 * 60 * MINUTE, String(result));
  });

  test('wynik zawsze trafia dokładnie w północ następnego dnia (też przy zmianie czasu)', () => {
    const cases = [
      new Date(2026, 9, 7, 12), // zwykły dzień
      new Date(2026, 2, 28, 22), // przed zmianą czasu 29.03
      new Date(2026, 2, 29, 12), // dzień zmiany czasu na letni
      new Date(2026, 9, 24, 23), // przed zmianą czasu 25.10
      new Date(2026, 9, 25, 12), // dzień zmiany czasu na zimowy
      new Date(2028, 1, 28, 12), // luty w roku przestępnym
      new Date(2026, 11, 31, 23, 59), // granica roku
    ];
    for (const now of cases) {
      const next = new Date(now.getTime() + msUntilNextDay(now));
      const expected = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      assert.equal(next.getHours(), 0, now.toString());
      assert.equal(next.getMinutes(), 0, now.toString());
      assert.equal(next.getDate(), expected.getDate(), now.toString());
      assert.equal(next.getMonth(), expected.getMonth(), now.toString());
      assert.ok(
        msUntilNextDay(now) > 0 && msUntilNextDay(now) <= DAY + 60 * MINUTE,
        now.toString(),
      );
    }
  });
});

describe('findOtherDraft', () => {
  const draft = (grateful, updatedAt) => ({
    grateful: [grateful, '', ''],
    why: '',
    person: '',
    proud: '',
    lesson: '',
    updatedAt,
  });
  const entry = (grateful) => ({
    date: '',
    grateful: [grateful],
    why: '',
    person: '',
    proud: '',
    lesson: '',
  });

  test('zwraca dzień szkicu z innego dnia', () => {
    assert.equal(findOtherDraft({ '2026-10-03': draft('a', 1) }, {}, TODAY), '2026-10-03');
  });

  test('pomija szkic wybranego dnia', () => {
    assert.equal(findOtherDraft({ [TODAY]: draft('a', 1) }, {}, TODAY), null);
  });

  test('wybiera najnowszy, a przy remisie późniejszy dzień', () => {
    const drafts = {
      '2026-10-01': draft('a', 5),
      '2026-10-03': draft('b', 9),
      '2026-10-04': draft('c', 2),
    };
    assert.equal(findOtherDraft(drafts, {}, TODAY), '2026-10-03');
    const tie = { '2026-10-01': draft('a', 7), '2026-10-04': draft('b', 7) };
    assert.equal(findOtherDraft(tie, {}, TODAY), '2026-10-04');
  });

  test('pomija szkic pusty', () => {
    assert.equal(findOtherDraft({ '2026-10-03': draft('', 1) }, {}, TODAY), null);
    assert.equal(findOtherDraft({ '2026-10-03': draft('   ', 1) }, {}, TODAY), null);
  });

  test('pomija szkic równy zapisanemu wpisowi, ale nie szkic zmian', () => {
    const entries = { '2026-10-03': entry('kawa') };
    assert.equal(findOtherDraft({ '2026-10-03': draft('kawa', 1) }, entries, TODAY), null);
    assert.equal(
      findOtherDraft({ '2026-10-03': draft('kawa i herbata', 1) }, entries, TODAY),
      '2026-10-03',
    );
  });

  test('brak szkiców daje null i nie zmienia danych wejściowych', () => {
    assert.equal(findOtherDraft({}, {}, TODAY), null);
    const drafts = Object.freeze({ '2026-10-03': Object.freeze(draft('a', 1)) });
    assert.doesNotThrow(() => findOtherDraft(drafts, Object.freeze({}), TODAY));
  });
});
