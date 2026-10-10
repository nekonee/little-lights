// Zachowania kalendarza (K1–K23). Numer K jest na początku nazwy testu, który go sprawdza.
//
//  K1: Siatka ma zawsze 42 komórki (6×7), także gdy miesiąc mieści się w 5 wierszach.
//  K2: Tydzień zaczyna się w poniedziałek.
//  K3: Pierwszy dzień miesiąca leży w kolumnie swojego dnia tygodnia (też przesunięcia 0 i 6).
//  K4: Kolejne dni bez dziur i powtórzeń; dni „w miesiącu” to dokładnie 1…N (28/29/30/31).
//  K5: Dni sąsiednich miesięcy dopełniają siatkę, także przez granicę roku.
//  K6: Przesunięcie miesiąca działa z każdego miesiąca w obie strony; +1 i −1 wraca na miejsce.
//  K7: „Dziś” to dzień lokalny; dziś nie jest przyszłością, jutro jest.
//  K8: „Dalej” jest wyłączone w bieżącym miesiącu. Wstecz bez limitu.
//  K9: Cechy komórki (dziś, wybrany, wpis) są przypisane dokładnie do jej dnia, bez przesunięć.
//  K10: Opis dla czytnika ekranu: „Piątek, 25 września 2026[, wpis zapisany]”.
//  K11: Otwarcie panelu pokazuje miesiąc wybranego dnia.
//  K12: Zamknięcie (przycisk daty, dotknięcie poza panelem, Escape) nie zmienia dnia ani widoku.
//  K13: Wybór dnia zaznacza go i zamyka panel; dzień z sąsiedniego miesiąca przełącza widok.
//  K14: Dzień z przyszłości i niepoprawny klucz są ignorowane.
//  K15: „Dziś” wybiera dziś, ustawia bieżący miesiąc i zamyka panel.
//  K16: Zmiana z zewnątrz synchronizuje dzień i widok, bez otwierania i zamykania panelu.
//  K17: Reduktor nie zmienia stanu wejściowego.
//  K18: Przesuwanie miesięcy nie zmienia wybranego dnia.
//  K19: Niepoprawny rok lub miesiąc → `RangeError`.
//  K20: Nieznana akcja → wyjątek (literówka nie może udawać, że działa).
//  K21: Dzień ze szkicem, bez wpisu: znacznik `draft` (pusta kropka).
//  K22: Dzień z wpisem i szkicem: wygrywa znacznik `entry` (kafelek i pełna kropka).
//  K23: Opis dla czytnika uwzględnia szkic („…, szkic niezapisany”, „…, wpis zapisany, szkic zmian”).
//
// Oczekiwane wartości (układy siatek, liczby dni) zostały sprawdzone w niezależnym źródle
// (moduł calendar z Pythona), a nie policzone algorytmem z kodu, który testują.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { todayKey } from '../js/dates.js';
import {
  calendarReducer,
  canGoNext,
  createCalendarState,
  describeCell,
  isFuture,
  monthGrid,
  shiftMonth,
} from '../js/calendar-model.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const TODAY = '2026-10-07'; // środa

function utcDayNumber(key) {
  const [year, month, day] = key.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

function weekdayOf(key) {
  return new Date(utcDayNumber(key) * DAY_MS).getUTCDay(); // 0 = niedziela, 1 = poniedziałek
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function everyMonth(fromYear, toYear) {
  const months = [];
  for (let year = fromYear; year <= toYear; year++) {
    for (let month = 1; month <= 12; month++) months.push({ year, month });
  }
  return months;
}

function deepFreeze(value) {
  for (const inner of Object.values(value)) {
    if (typeof inner === 'object' && inner !== null) deepFreeze(inner);
  }
  return Object.freeze(value);
}

describe('monthGrid: kształt siatki', () => {
  test('K1: zawsze 42 komórki, także w miesiącach mieszczących się w 5 wierszach', () => {
    for (const { year, month } of everyMonth(2020, 2035)) {
      assert.equal(monthGrid(year, month).length, 42, `${year}-${month}`);
    }
    // wrzesień 2026 (od wtorku, 30 dni) mieści się w 5 wierszach, a siatka i tak ma 6
    assert.equal(monthGrid(2026, 9).length, 42);
  });

  test('K2: tydzień zaczyna się od poniedziałku w każdym miesiącu', () => {
    for (const { year, month } of everyMonth(2020, 2035)) {
      const first = monthGrid(year, month)[0];
      assert.equal(weekdayOf(first.key), 1, `${year}-${month} zaczyna się od ${first.key}`);
    }
  });

  test('K3: pierwszy dzień miesiąca leży w kolumnie swojego dnia tygodnia (przesunięcia 0 i 6 też)', () => {
    const expected = [
      // [rok, miesiąc, pierwsza komórka siatki, kolumna 1. dnia, dzień tygodnia 1. dnia]
      [2026, 6, '2026-06-01', 0, 'poniedziałek'],
      [2026, 9, '2026-08-31', 1, 'wtorek'],
      [2028, 2, '2028-01-31', 1, 'wtorek'],
      [2026, 12, '2026-11-30', 1, 'wtorek'],
      [2026, 10, '2026-09-28', 3, 'czwartek'],
      [2027, 1, '2026-12-28', 4, 'piątek'],
      [2026, 2, '2026-01-26', 6, 'niedziela'],
      [2026, 3, '2026-02-23', 6, 'niedziela'],
    ];
    for (const [year, month, firstKey, column, weekday] of expected) {
      const grid = monthGrid(year, month);
      const firstOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
      const label = `${year}-${month} (1. dnia: ${weekday})`;
      assert.equal(grid[0].key, firstKey, label);
      assert.equal(grid[column].key, firstOfMonth, label);
      assert.equal(grid[column].inMonth, true, label);
      assert.ok(
        grid.slice(0, column).every((cell) => !cell.inMonth),
        label,
      );
    }
  });

  test('K3: wrzesień 2026 ma dokładnie taki układ jak w kalendarzu', () => {
    const grid = monthGrid(2026, 9);
    const days = [
      ...[31],
      ...Array.from({ length: 30 }, (_, i) => i + 1),
      ...Array.from({ length: 11 }, (_, i) => i + 1),
    ];
    assert.deepEqual(
      grid.map((cell) => cell.day),
      days,
    );
    assert.equal(grid[0].key, '2026-08-31');
    assert.equal(grid[41].key, '2026-10-11');
    assert.deepEqual(
      grid.map((cell) => cell.inMonth),
      grid.map((_, index) => index >= 1 && index <= 30),
    );
  });

  test('K4: komórki to kolejne dni, bez dziur i powtórzeń', () => {
    for (const { year, month } of everyMonth(2020, 2035)) {
      const grid = monthGrid(year, month);
      assert.equal(new Set(grid.map((cell) => cell.key)).size, 42, `${year}-${month}`);
      for (let i = 1; i < grid.length; i++) {
        assert.equal(
          utcDayNumber(grid[i].key) - utcDayNumber(grid[i - 1].key),
          1,
          `${year}-${month}: ${grid[i - 1].key} -> ${grid[i].key}`,
        );
      }
    }
  });

  test('K4: dni „w miesiącu” to dokładnie 1…N, a pole day zgadza się z kluczem', () => {
    for (const { year, month } of everyMonth(2020, 2035)) {
      const inMonth = monthGrid(year, month).filter((cell) => cell.inMonth);
      assert.deepEqual(
        inMonth.map((cell) => cell.day),
        Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1),
        `${year}-${month}`,
      );
      for (const cell of monthGrid(year, month)) {
        assert.equal(cell.day, Number(cell.key.slice(8)), cell.key);
      }
    }
  });

  test('K4: liczba dni w miesiącu: 28, 29 (rok przestępny), 30 i 31', () => {
    const expected = [
      [2026, 2, 28],
      [2028, 2, 29],
      [2100, 2, 28], // rok podzielny przez 100 nie jest przestępny
      [2000, 2, 29], // ale podzielny przez 400 jest
      [2026, 4, 30],
      [2026, 1, 31],
    ];
    for (const [year, month, count] of expected) {
      const inMonth = monthGrid(year, month).filter((cell) => cell.inMonth);
      assert.equal(inMonth.length, count, `${year}-${month}`);
    }
    assert.ok(monthGrid(2028, 2).some((cell) => cell.key === '2028-02-29' && cell.inMonth));
    assert.ok(!monthGrid(2026, 2).some((cell) => cell.key === '2026-02-29'));
  });

  test('K4: marzec 2026 potrzebuje pełnych 6 wierszy i kończy się w kwietniu', () => {
    const grid = monthGrid(2026, 3);
    assert.equal(grid[36].key, '2026-03-31'); // 6. wiersz zaczyna się od indeksu 35
    assert.equal(grid[36].inMonth, true);
    assert.equal(grid[41].key, '2026-04-05');
  });

  test('K5: grudzień dopełnia siatkę dniami stycznia następnego roku', () => {
    const grid = monthGrid(2026, 12);
    assert.equal(grid[41].key, '2027-01-10');
    const tail = grid.slice(32);
    assert.deepEqual(
      tail.map((cell) => cell.key),
      Array.from({ length: 10 }, (_, i) => `2027-01-${String(i + 1).padStart(2, '0')}`),
    );
    assert.ok(tail.every((cell) => !cell.inMonth));
  });

  test('K5: styczeń zaczyna siatkę dniami grudnia poprzedniego roku', () => {
    const grid = monthGrid(2027, 1);
    assert.deepEqual(
      grid.slice(0, 4).map((cell) => cell.key),
      ['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31'],
    );
    assert.ok(grid.slice(0, 4).every((cell) => !cell.inMonth));
    assert.equal(grid[4].key, '2027-01-01');
  });

  test('K19: niepoprawny miesiąc lub rok kończy się RangeError', () => {
    for (const [year, month] of [
      [2026, 0],
      [2026, 13],
      [2026, -1],
      [2026, 1.5],
      [2026, '9'],
      [2026, NaN],
      [2026, undefined],
      [2026.5, 1],
      ['2026', 1],
      [NaN, 1],
    ]) {
      assert.throws(
        () => monthGrid(year, month),
        { name: 'RangeError', message: /Niepoprawny miesiąc kalendarza/ },
        `${year} / ${month}`,
      );
    }
  });
});

describe('shiftMonth', () => {
  test('K6: przesuwa miesiąc, także przez granice roku', () => {
    const expected = [
      [{ year: 2026, month: 9 }, 1, { year: 2026, month: 10 }],
      [{ year: 2026, month: 12 }, 1, { year: 2027, month: 1 }],
      [{ year: 2026, month: 1 }, -1, { year: 2025, month: 12 }],
      [{ year: 2026, month: 9 }, 12, { year: 2027, month: 9 }],
      [{ year: 2026, month: 9 }, -9, { year: 2025, month: 12 }],
      [{ year: 2026, month: 9 }, 16, { year: 2028, month: 1 }],
      [{ year: 2026, month: 3 }, 0, { year: 2026, month: 3 }],
    ];
    for (const [view, delta, result] of expected) {
      assert.deepEqual(shiftMonth(view, delta), result, `${view.year}-${view.month} ${delta}`);
    }
  });

  test('K6: dwa lata kolejnych kroków +1 odwiedzają każdy miesiąc po kolei, bez przeskoków', () => {
    // Regresja: setMonth(+1) ze stanu „31 stycznia” przeskakiwał z stycznia na marzec.
    let view = { year: 2026, month: 1 };
    for (let step = 0; step < 24; step++) {
      assert.deepEqual(view, { year: 2026 + Math.floor(step / 12), month: (step % 12) + 1 });
      view = shiftMonth(view, 1);
    }
  });

  test('K6: krok w przód i z powrotem wraca dokładnie na to samo miejsce', () => {
    for (const view of everyMonth(2024, 2028)) {
      for (let delta = -30; delta <= 30; delta++) {
        assert.deepEqual(shiftMonth(shiftMonth(view, delta), -delta), view);
      }
    }
  });

  test('K6: wynik ma zawsze miesiąc 1–12 i nie zmienia przekazanego obiektu', () => {
    const view = Object.freeze({ year: 2026, month: 12 });
    const result = shiftMonth(view, 25);
    assert.deepEqual(view, { year: 2026, month: 12 });
    assert.deepEqual(result, { year: 2029, month: 1 });
    for (let delta = -50; delta <= 50; delta++) {
      const { month } = shiftMonth({ year: 2026, month: 7 }, delta);
      assert.ok(Number.isInteger(month) && month >= 1 && month <= 12, `delta ${delta}`);
    }
  });
});

describe('isFuture i canGoNext', () => {
  test('K7: dziś nie jest przyszłością, jutro jest', () => {
    assert.equal(isFuture('2026-10-07', TODAY), false);
    assert.equal(isFuture('2026-10-08', TODAY), true);
    assert.equal(isFuture('2026-10-06', TODAY), false);
  });

  test('K7: granice miesiąca i roku', () => {
    assert.equal(isFuture('2026-11-01', '2026-10-31'), true);
    assert.equal(isFuture('2027-01-01', '2026-12-31'), true);
    assert.equal(isFuture('2026-12-31', '2027-01-01'), false);
    assert.equal(isFuture('2026-09-30', '2026-10-01'), false);
    assert.equal(isFuture('2028-02-29', '2028-02-28'), true);
  });

  test('K7: dzień jest liczony lokalnie, więc tuż po północy „dziś” to już nowy dzień', () => {
    const justAfterMidnight = todayKey(new Date(2026, 9, 7, 0, 30));
    assert.equal(justAfterMidnight, '2026-10-07');
    assert.equal(isFuture('2026-10-07', justAfterMidnight), false);
    assert.equal(isFuture('2026-10-08', justAfterMidnight), true);
    const justBeforeMidnight = todayKey(new Date(2026, 9, 7, 23, 59));
    assert.equal(isFuture('2026-10-08', justBeforeMidnight), true);
    assert.equal(isFuture('2026-10-07', justBeforeMidnight), false);
  });

  test('K8: strzałka „dalej” jest wyłączona w bieżącym i późniejszych miesiącach', () => {
    assert.equal(canGoNext({ year: 2026, month: 10 }, TODAY), false);
    assert.equal(canGoNext({ year: 2026, month: 11 }, TODAY), false);
    assert.equal(canGoNext({ year: 2027, month: 1 }, TODAY), false);
  });

  test('K8: strzałka „dalej” jest włączona we wcześniejszych miesiącach, także przez granicę roku', () => {
    assert.equal(canGoNext({ year: 2026, month: 9 }, TODAY), true);
    assert.equal(canGoNext({ year: 2025, month: 12 }, TODAY), true);
    assert.equal(canGoNext({ year: 2026, month: 12 }, '2027-01-05'), true);
    assert.equal(canGoNext({ year: 2027, month: 1 }, '2027-01-05'), false);
  });

  test('K8: ostatni dzień miesiąca nie odblokowuje następnego, pierwszy dzień go odblokowuje', () => {
    assert.equal(canGoNext({ year: 2026, month: 10 }, '2026-10-31'), false);
    assert.equal(canGoNext({ year: 2026, month: 10 }, '2026-11-01'), true);
  });
});

describe('describeCell', () => {
  const entries = { '2026-09-30': { date: '2026-09-30' }, '2026-10-05': { date: '2026-10-05' } };
  const context = { today: TODAY, selected: '2026-09-30', entries };
  const described = () => monthGrid(2026, 10).map((cell) => describeCell(cell, context));

  test('K9: dokładnie jedna komórka jest „dziś” i jest to właściwy dzień', () => {
    const todays = described().filter((cell) => cell.isToday);
    assert.deepEqual(
      todays.map((cell) => cell.key),
      ['2026-10-07'],
    );
  });

  test('K9: „dziś” wymaga zgodności całego dnia, a nie samego numeru ani miesiąca', () => {
    const sameDayNumberOtherMonth = describeCell(
      { key: '2026-09-07', day: 7, inMonth: true },
      context,
    );
    assert.equal(sameDayNumberOtherMonth.isToday, false);
    const sameMonthOtherYear = describeCell({ key: '2025-10-07', day: 7, inMonth: true }, context);
    assert.equal(sameMonthOtherYear.isToday, false);
  });

  test('K9: dokładnie jedna komórka jest wybrana, także gdy należy do sąsiedniego miesiąca', () => {
    const selected = described().filter((cell) => cell.isSelected);
    assert.deepEqual(
      selected.map((cell) => cell.key),
      ['2026-09-30'],
    );
    assert.equal(selected[0].inMonth, false);
  });

  test('K9: dzisiejszy dzień może być jednocześnie wybrany', () => {
    const cell = describeCell(
      { key: TODAY, day: 7, inMonth: true },
      { ...context, selected: TODAY },
    );
    assert.equal(cell.isToday, true);
    assert.equal(cell.isSelected, true);
  });

  test('K9: kropkę mają tylko dni z wpisem, bez przesunięcia o dzień', () => {
    const withEntry = described()
      .filter((cell) => cell.hasEntry)
      .map((cell) => cell.key);
    assert.deepEqual(withEntry, ['2026-09-30', '2026-10-05']);
    const byKey = Object.fromEntries(described().map((cell) => [cell.key, cell]));
    assert.equal(byKey['2026-09-29'].hasEntry, false);
    assert.equal(byKey['2026-10-01'].hasEntry, false);
    assert.equal(byKey['2026-10-04'].hasEntry, false);
    assert.equal(byKey['2026-10-06'].hasEntry, false);
  });

  test('K9: dni po dzisiejszym są przyszłością, dzisiejszy i wcześniejsze nie', () => {
    const future = described()
      .filter((cell) => cell.isFuture)
      .map((cell) => cell.key);
    assert.equal(future.length, 32); // 8–31 października (24 dni) i 1–8 listopada (8 dni)
    assert.equal(future[0], '2026-10-08');
    assert.equal(future.at(-1), '2026-11-08');
    const byKey = Object.fromEntries(described().map((cell) => [cell.key, cell]));
    assert.equal(byKey['2026-10-07'].isFuture, false);
    assert.equal(byKey['2026-10-06'].isFuture, false);
  });

  test('K9: dni sąsiednich miesięcy są oznaczone jako nienależące do widoku', () => {
    const outside = described()
      .filter((cell) => !cell.inMonth)
      .map((cell) => cell.key);
    assert.deepEqual(outside.slice(0, 3), ['2026-09-28', '2026-09-29', '2026-09-30']);
    assert.equal(outside.length, 11); // 3 dni września i 8 dni listopada
    assert.equal(described().filter((cell) => cell.inMonth).length, 31);
  });

  test('K10: opis dla czytnika ekranu zawiera dzień tygodnia, datę i informację o wpisie', () => {
    const cell = { key: '2026-09-25', day: 25, inMonth: true };
    const withEntry = describeCell(cell, {
      today: TODAY,
      selected: TODAY,
      entries: { '2026-09-25': {} },
    });
    const without = describeCell(cell, { today: TODAY, selected: TODAY, entries: {} });
    assert.equal(withEntry.label, 'Piątek, 25 września 2026, wpis zapisany');
    assert.equal(without.label, 'Piątek, 25 września 2026');
    const wednesday = describeCell(
      { key: '2026-10-07', day: 7, inMonth: true },
      { today: TODAY, selected: TODAY, entries: {} },
    );
    assert.equal(wednesday.label, 'Środa, 7 października 2026');
  });

  test('describeCell nie zmienia przekazanych danych', () => {
    const cell = Object.freeze({ key: '2026-10-05', day: 5, inMonth: true });
    const frozenContext = deepFreeze({ today: TODAY, selected: TODAY, entries: { ...entries } });
    assert.doesNotThrow(() => describeCell(cell, frozenContext));
  });
});

describe('describeCell: szkice (K21–K23)', () => {
  const base = { today: TODAY, selected: TODAY };
  const cell = { key: '2026-10-05', day: 5, inMonth: true };
  const entry = { date: '2026-10-05' };
  const draft = { grateful: ['a', '', ''], updatedAt: 1 };

  test('K21: dzień ze szkicem i bez wpisu ma znacznik „draft”', () => {
    const info = describeCell(cell, { ...base, entries: {}, drafts: { '2026-10-05': draft } });
    assert.equal(info.marker, 'draft');
    assert.equal(info.hasDraft, true);
    assert.equal(info.hasEntry, false);
  });

  test('K21: dzień bez szkicu i bez wpisu nie ma znacznika', () => {
    const info = describeCell(cell, { ...base, entries: {}, drafts: { '2026-10-06': draft } });
    assert.equal(info.marker, null);
    assert.equal(info.hasDraft, false);
  });

  test('K21: szkic dotyczy tylko swojego dnia, bez przesunięcia o dzień', () => {
    const drafts = { '2026-10-05': draft };
    const markers = monthGrid(2026, 10)
      .map((c) => describeCell(c, { ...base, entries: {}, drafts }))
      .filter((info) => info.marker === 'draft')
      .map((info) => info.key);
    assert.deepEqual(markers, ['2026-10-05']);
  });

  test('K22: dzień z wpisem i szkicem zmian ma znacznik wpisu', () => {
    const info = describeCell(cell, {
      ...base,
      entries: { '2026-10-05': entry },
      drafts: { '2026-10-05': draft },
    });
    assert.equal(info.marker, 'entry');
    assert.equal(info.hasEntry, true);
    assert.equal(info.hasDraft, true);
  });

  test('K22: dzień z samym wpisem ma znacznik wpisu', () => {
    const info = describeCell(cell, { ...base, entries: { '2026-10-05': entry }, drafts: {} });
    assert.equal(info.marker, 'entry');
    assert.equal(info.hasDraft, false);
  });

  test('K23: opis dla czytnika ekranu wymienia szkic', () => {
    const context = { ...base, entries: {}, drafts: { '2026-10-05': draft } };
    assert.equal(
      describeCell(cell, context).label,
      'Poniedziałek, 5 października 2026, szkic niezapisany',
    );
    const both = { ...context, entries: { '2026-10-05': entry } };
    assert.equal(
      describeCell(cell, both).label,
      'Poniedziałek, 5 października 2026, wpis zapisany, szkic zmian',
    );
  });

  test('K23: brak przekazanych szkiców działa jak brak szkiców', () => {
    const info = describeCell(cell, { ...base, entries: { '2026-10-05': entry } });
    assert.equal(info.hasDraft, false);
    assert.equal(info.marker, 'entry');
    assert.equal(describeCell(cell, { ...base, entries: {} }).marker, null);
  });

  test('szkic o nazwie zgodnej z właściwością obiektu nie daje fałszywego znacznika', () => {
    const proto = describeCell(
      { key: 'constructor', day: 1, inMonth: true },
      { ...base, entries: {}, drafts: {} },
    );
    assert.equal(proto.marker, null);
  });
});

describe('calendarReducer', () => {
  const closedState = () => createCalendarState('2026-09-30');
  const openedState = () => calendarReducer(closedState(), { type: 'toggle' }, { today: TODAY });

  function reduce(state, action, today = TODAY) {
    return calendarReducer(state, action, { today });
  }

  test('stan początkowy: zamknięty, widok na miesiącu wybranego dnia', () => {
    assert.deepEqual(closedState(), {
      open: false,
      viewYear: 2026,
      viewMonth: 9,
      selected: '2026-09-30',
    });
  });

  test('K11: otwarcie pokazuje miesiąc wybranego dnia', () => {
    assert.equal(openedState().open, true);
    assert.equal(openedState().viewYear, 2026);
    assert.equal(openedState().viewMonth, 9);
  });

  test('K11: po przewinięciu miesięcy, zamknięciu i ponownym otwarciu widok wraca do miesiąca wybranego dnia', () => {
    let state = reduce(openedState(), { type: 'prev' });
    state = reduce(state, { type: 'prev' });
    assert.equal(state.viewMonth, 7);
    state = reduce(state, { type: 'toggle' });
    assert.equal(state.open, false);
    state = reduce(state, { type: 'toggle' });
    assert.equal(state.open, true);
    assert.deepEqual([state.viewYear, state.viewMonth], [2026, 9]);
    assert.equal(state.selected, '2026-09-30');
  });

  test('K12: ponowne dotknięcie przycisku daty zamyka panel, nie zmieniając dnia ani widoku', () => {
    const moved = reduce(openedState(), { type: 'prev' });
    const result = reduce(moved, { type: 'toggle' });
    assert.deepEqual(result, { ...moved, open: false });
  });

  test('K12: dotknięcie poza panelem i Escape (akcja close) zamykają panel bez innych zmian', () => {
    const moved = reduce(openedState(), { type: 'prev' });
    assert.deepEqual(reduce(moved, { type: 'close' }), { ...moved, open: false });
    assert.deepEqual(reduce(closedState(), { type: 'close' }), closedState());
  });

  test('K13: wybór dnia z widocznego miesiąca zaznacza go i zamyka panel', () => {
    const result = reduce(openedState(), { type: 'pickDay', key: '2026-09-12' });
    assert.deepEqual(result, {
      open: false,
      viewYear: 2026,
      viewMonth: 9,
      selected: '2026-09-12',
    });
  });

  test('K13: wybór dnia z poprzedniego miesiąca przełącza widok na ten miesiąc', () => {
    const result = reduce(openedState(), { type: 'pickDay', key: '2026-08-31' });
    assert.equal(result.selected, '2026-08-31');
    assert.deepEqual([result.viewYear, result.viewMonth], [2026, 8]);
    assert.equal(result.open, false);
  });

  test('K13: wybór dnia z następnego miesiąca (nie z przyszłości) przełącza widok', () => {
    const result = reduce(openedState(), { type: 'pickDay', key: '2026-10-01' });
    assert.equal(result.selected, '2026-10-01');
    assert.deepEqual([result.viewYear, result.viewMonth], [2026, 10]);
  });

  test('K13: wybór dnia z przeszłego roku zmienia rok widoku', () => {
    const result = reduce(openedState(), { type: 'pickDay', key: '2025-12-31' });
    assert.deepEqual([result.viewYear, result.viewMonth], [2025, 12]);
  });

  test('K13: dzisiejszy dzień można wybrać', () => {
    const result = reduce(openedState(), { type: 'pickDay', key: TODAY });
    assert.equal(result.selected, TODAY);
    assert.equal(result.open, false);
  });

  test('K14: wybór dnia z przyszłości jest ignorowany, a panel zostaje otwarty', () => {
    assert.deepEqual(reduce(openedState(), { type: 'pickDay', key: '2026-10-08' }), openedState());
    assert.deepEqual(reduce(openedState(), { type: 'pickDay', key: '2030-01-01' }), openedState());
  });

  test('K14: granica roku: ostatni dzień starego roku wolno, pierwszy po dzisiejszym nie', () => {
    const state = createCalendarState('2026-12-30');
    const open = reduce(state, { type: 'toggle' }, '2027-01-01');
    assert.equal(
      reduce(open, { type: 'pickDay', key: '2026-12-31' }, '2027-01-01').selected,
      '2026-12-31',
    );
    assert.deepEqual(reduce(open, { type: 'pickDay', key: '2027-01-02' }, '2027-01-01'), open);
  });

  test('K14: niepoprawny klucz dnia jest ignorowany', () => {
    for (const key of ['2026-02-31', 'abc', '', undefined, null, 20260912]) {
      assert.deepEqual(reduce(openedState(), { type: 'pickDay', key }), openedState(), String(key));
    }
  });

  test('K8: „dalej” w bieżącym miesiącu nic nie zmienia, a we wcześniejszym przesuwa widok', () => {
    const inCurrentMonth = reduce(createCalendarState(TODAY), { type: 'toggle' });
    assert.deepEqual(reduce(inCurrentMonth, { type: 'next' }), inCurrentMonth);
    const next = reduce(openedState(), { type: 'next' });
    assert.deepEqual([next.viewYear, next.viewMonth], [2026, 10]);
    assert.deepEqual(reduce(next, { type: 'next' }), next);
  });

  test('K8: „wstecz” nie ma ograniczenia i przechodzi przez granicę roku', () => {
    let state = createCalendarState('2026-01-15');
    state = reduce(state, { type: 'toggle' });
    state = reduce(state, { type: 'prev' });
    assert.deepEqual([state.viewYear, state.viewMonth], [2025, 12]);
    for (let i = 0; i < 300; i++) state = reduce(state, { type: 'prev' });
    assert.deepEqual([state.viewYear, state.viewMonth], [2000, 12]);
  });

  test('K18: przesuwanie miesięcy nie zmienia wybranego dnia ani stanu otwarcia', () => {
    let state = openedState();
    for (const type of ['prev', 'prev', 'next', 'prev', 'prev', 'prev']) {
      state = reduce(state, { type });
      assert.equal(state.selected, '2026-09-30');
      assert.equal(state.open, true);
    }
  });

  test('K15: „Dziś” z przeszłego miesiąca przy otwartym panelu wybiera dziś i zamyka panel', () => {
    let state = reduce(openedState(), { type: 'pickDay', key: '2025-03-10' });
    state = reduce(state, { type: 'toggle' });
    assert.equal(state.open, true);
    const result = reduce(state, { type: 'goToToday' });
    assert.deepEqual(result, { open: false, viewYear: 2026, viewMonth: 10, selected: TODAY });
  });

  test('K15: „Dziś” przy zamkniętym panelu zmienia wybrany dzień i widok', () => {
    const past = reduce(openedState(), { type: 'pickDay', key: '2026-09-12' });
    const result = reduce(past, { type: 'goToToday' });
    assert.deepEqual(result, { open: false, viewYear: 2026, viewMonth: 10, selected: TODAY });
  });

  test('K15: „Dziś” korzysta z przekazanego dnia, więc po zmianie dnia wskazuje nowy', () => {
    const result = reduce(openedState(), { type: 'goToToday' }, '2027-01-01');
    assert.deepEqual(result, { open: false, viewYear: 2027, viewMonth: 1, selected: '2027-01-01' });
  });

  test('K16: zewnętrzna zmiana dnia synchronizuje wybór i widok, bez zmiany stanu otwarcia', () => {
    const fromClosed = reduce(closedState(), { type: 'select', key: '2026-08-15' });
    assert.deepEqual(fromClosed, {
      open: false,
      viewYear: 2026,
      viewMonth: 8,
      selected: '2026-08-15',
    });
    const fromOpen = reduce(openedState(), { type: 'select', key: '2026-08-15' });
    assert.deepEqual(fromOpen, {
      open: true,
      viewYear: 2026,
      viewMonth: 8,
      selected: '2026-08-15',
    });
  });

  test('K16: zewnętrzna zmiana na dzień z przyszłości lub niepoprawny jest ignorowana', () => {
    assert.deepEqual(reduce(closedState(), { type: 'select', key: '2026-10-08' }), closedState());
    assert.deepEqual(reduce(closedState(), { type: 'select', key: 'oops' }), closedState());
  });

  test('K17: reduktor nie zmienia stanu wejściowego (zamrożony stan nie powoduje błędu)', () => {
    const frozen = deepFreeze({ open: true, viewYear: 2026, viewMonth: 9, selected: '2026-09-30' });
    const snapshot = structuredClone(frozen);
    const actions = [
      { type: 'toggle' },
      { type: 'close' },
      { type: 'prev' },
      { type: 'next' },
      { type: 'pickDay', key: '2026-09-12' },
      { type: 'pickDay', key: '2026-10-08' },
      { type: 'goToToday' },
      { type: 'select', key: '2026-08-15' },
    ];
    for (const action of actions) {
      assert.doesNotThrow(() => reduce(frozen, action), action.type);
      assert.deepEqual(frozen, snapshot, action.type);
    }
  });

  test('K6: stan ma wyłącznie pola open, viewYear, viewMonth i selected, czyli nie zawiera dnia widoku', () => {
    // To odróżnia model od starego kalendarza, w którym ukryty dzień powodował przeskoki miesięcy (setMonth).
    const expectedKeys = ['open', 'selected', 'viewMonth', 'viewYear'];
    let state = closedState();
    const actions = [
      { type: 'toggle' },
      { type: 'prev' },
      { type: 'prev' },
      { type: 'next' },
      { type: 'pickDay', key: '2026-08-31' },
      { type: 'select', key: '2026-09-12' },
      { type: 'close' },
      { type: 'goToToday' },
      { type: 'pickDay', key: '2026-10-08' },
    ];
    assert.deepEqual(Object.keys(state).sort(), expectedKeys);
    for (const action of actions) {
      state = reduce(state, action);
      assert.deepEqual(Object.keys(state).sort(), expectedKeys, action.type);
    }
  });

  test('K17: kolejne wywołania z tym samym stanem dają ten sam wynik (brak ukrytego stanu)', () => {
    const action = { type: 'pickDay', key: '2026-08-31' };
    assert.deepEqual(reduce(openedState(), action), reduce(openedState(), action));
  });

  test('K20: nieznana akcja kończy się błędem zamiast cichego pominięcia', () => {
    assert.throws(() => reduce(openedState(), { type: 'toogle' }));
    assert.throws(() => reduce(openedState(), { type: undefined }));
  });
});
