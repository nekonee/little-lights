// Zachowania szkiców (S1–S23). Numer S jest na początku nazwy testu, który go sprawdza.
//
//  S1: Szkic dotyczy jednego dnia, ma pola formularza i `updatedAt`, leży w osobnym kluczu.
//  S2: Wartości surowe i pozycyjne (3 pola wdzięczności).
//  S3: Porównanie po normalizacji: różnica tylko w spacjach lub w polu wdzięczności nie tworzy szkicu.
//  S4: Szkic powstaje tylko, gdy formularz różni się od stanu bazowego.
//  S5: Pusty formularz nigdy nie jest szkicem, nawet gdy wpis istnieje.
//  S6: Formularz równy stanowi bazowemu usuwa szkic.
//  S7: Zapis 500 ms po ostatnim znaku.
//  S8: Zapis od razu przy zmianie dnia (też „Dziś” i „edytuj”), `visibilitychange` (ukryta) i `pagehide`.
//  S9: Zapis zmienia tylko szkic bieżącego dnia.
//  S10: Awaria zapisu nie blokuje pisania, pokazuje komunikat.
//  S11: Wczytanie dnia: szkic, potem wpis, potem pusty formularz.
//  S12: Szkic pusty albo równy wpisowi jest ignorowany i usuwany.
//  S13: Przy szkicu wskaźnik „📝 Szkic — jeszcze niezapisany” (dzień bez wpisu) albo „📝 Szkic zmian — wpis z tego dnia nie jest jeszcze zaktualizowany” oraz przycisk „Odrzuć szkic”.
//  S14: Zmiana dnia i powrót przywraca wpisany tekst.
//  S15: Po odświeżeniu szkic wraca.
//  S16: Zapis wpisu usuwa szkic i anuluje oczekujący zapis.
//  S17: Odmowa zapisu (brak wdzięczności) nie usuwa szkicu.
//  S18: „Odrzuć szkic” (z potwierdzeniem) usuwa szkic i wczytuje wpis albo pusty formularz.
//  S19: Usunięcie wpisu usuwa jego szkic i odświeża formularz, jeśli to wybrany dzień.
//  S20: Po imporcie nietknięty formularz odświeża się, a z wpisanym tekstem zostaje z ostrzeżeniem, że zapis nadpisze zaimportowany wpis.
//  S21: Szkice nie wchodzą do eksportu, serii, podsumowania ani historii.
//  S22: Uszkodzone dane szkiców nie wywracają aplikacji.
//  S23: Dzień ze szkicem bez wpisu ma w kalendarzu pustą kropkę.
//
// S7 i S8 (czas zapisu) sprawdza draft-sync.test.js.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  afterImport,
  chooseFormSource,
  draftDecision,
  fieldsEqual,
  formMode,
  normalizeFields,
  sanitizeDrafts,
  updateDrafts,
  withDraft,
  withoutDraft,
} from '../js/drafts.js';

const DAY = '2026-10-05';
const NOW = 1790000000000;

/** Pola jak w formularzu: zawsze 3 pola wdzięczności na swoich miejscach. */
function rawFields(overrides = {}) {
  return { grateful: ['', '', ''], why: '', person: '', proud: '', lesson: '', ...overrides };
}

/** Zapisany wpis, jak w magazynie. */
function savedEntry(overrides = {}) {
  return {
    date: DAY,
    grateful: ['kawa', 'spacer'],
    why: 'spokój',
    person: 'Ala',
    proud: '',
    lesson: '',
    savedAt: 1,
    ...overrides,
  };
}

function storedDraft(overrides = {}) {
  return { ...rawFields({ grateful: ['kawa', '', ''] }), updatedAt: 5, ...overrides };
}

function deepFreeze(value) {
  for (const inner of Object.values(value)) {
    if (typeof inner === 'object' && inner !== null) deepFreeze(inner);
  }
  return Object.freeze(value);
}

describe('normalizeFields', () => {
  test('S3: przycina spacje i pomija puste wdzięczności, zachowując kolejność', () => {
    const result = normalizeFields(
      rawFields({ grateful: ['  a ', '', 'b  '], why: ' x ', person: '\ty\n' }),
    );
    assert.deepEqual(result, {
      grateful: ['a', 'b'],
      why: 'x',
      person: 'y',
      proud: '',
      lesson: '',
    });
  });

  test('S3: pole wdzięczności złożone tylko ze spacji jest puste', () => {
    assert.deepEqual(normalizeFields(rawFields({ grateful: ['   ', '\t', ''] })).grateful, []);
  });

  test('wpis z magazynu i pola z formularza normalizują się do tego samego kształtu', () => {
    const fromEntry = normalizeFields(savedEntry());
    const fromForm = normalizeFields(
      rawFields({ grateful: ['kawa', 'spacer', ''], why: 'spokój', person: 'Ala' }),
    );
    assert.deepEqual(fromEntry, fromForm);
  });

  test('brakujące i niepoprawne pola stają się puste, a obce pola są pomijane', () => {
    const result = normalizeFields({ grateful: 'tekst', why: 5, person: null, extra: 'x' });
    assert.deepEqual(result, { grateful: [], why: '', person: '', proud: '', lesson: '' });
  });

  test('nie zmienia przekazanych danych', () => {
    const input = deepFreeze(rawFields({ grateful: [' a ', '', ''] }));
    assert.doesNotThrow(() => normalizeFields(input));
    assert.deepEqual(input.grateful, [' a ', '', '']);
  });
});

describe('fieldsEqual', () => {
  test('S3: różnica tylko w spacjach nie jest różnicą', () => {
    assert.equal(
      fieldsEqual(rawFields({ grateful: ['a ', '', ''] }), rawFields({ grateful: [' a', '', ''] })),
      true,
    );
  });

  test('S3: ten sam tekst w innym polu wdzięczności nie jest różnicą', () => {
    assert.equal(
      fieldsEqual(rawFields({ grateful: ['', 'a', ''] }), rawFields({ grateful: ['a', '', ''] })),
      true,
    );
  });

  test('inny tekst, inna wielkość liter i inna kolejność to różnice', () => {
    const base = rawFields({ grateful: ['a', 'b', ''] });
    assert.equal(fieldsEqual(base, rawFields({ grateful: ['a', 'c', ''] })), false);
    assert.equal(fieldsEqual(base, rawFields({ grateful: ['A', 'b', ''] })), false);
    assert.equal(fieldsEqual(base, rawFields({ grateful: ['b', 'a', ''] })), false);
  });

  test('różnica w którymkolwiek polu tekstowym jest różnicą', () => {
    for (const field of ['why', 'person', 'proud', 'lesson']) {
      assert.equal(fieldsEqual(rawFields(), rawFields({ [field]: 'x' })), false, field);
    }
  });

  test('brak wpisu (null) jest równy pustemu formularzowi', () => {
    assert.equal(fieldsEqual(rawFields(), null), true);
    assert.equal(fieldsEqual(null, rawFields({ why: 'x' })), false);
  });

  test('wpis zapisany jest równy swojemu formularzowi', () => {
    const entry = savedEntry();
    assert.equal(
      fieldsEqual(
        rawFields({ grateful: ['kawa', 'spacer', ''], why: 'spokój', person: 'Ala' }),
        entry,
      ),
      true,
    );
  });
});

describe('draftDecision', () => {
  test('S4: formularz różny od pustej bazy daje zapis szkicu', () => {
    assert.equal(draftDecision(rawFields({ grateful: ['a', '', ''] }), null), 'save');
    assert.equal(draftDecision(rawFields({ lesson: 'coś' }), null), 'save');
  });

  test('S4: formularz różny od zapisanego wpisu daje zapis szkicu', () => {
    const form = rawFields({ grateful: ['kawa', 'spacer', 'nowe'], why: 'spokój', person: 'Ala' });
    assert.equal(draftDecision(form, savedEntry()), 'save');
  });

  test('S5: pusty formularz usuwa szkic, także gdy wpis istnieje', () => {
    assert.equal(draftDecision(rawFields(), null), 'remove');
    assert.equal(draftDecision(rawFields(), savedEntry()), 'remove');
  });

  test('S5: formularz ze samych spacji jest pusty', () => {
    assert.equal(
      draftDecision(rawFields({ grateful: ['  ', '', ''], why: '   ' }), null),
      'remove',
    );
  });

  test('S6: formularz równy zapisanemu wpisowi usuwa szkic', () => {
    const form = rawFields({ grateful: ['kawa', 'spacer', ''], why: 'spokój', person: 'Ala' });
    assert.equal(draftDecision(form, savedEntry()), 'remove');
  });

  test('S3: formularz różniący się od wpisu tylko spacjami i pozycją pola usuwa szkic', () => {
    const form = rawFields({ grateful: [' kawa ', '', 'spacer'], why: 'spokój ', person: 'Ala' });
    assert.equal(draftDecision(form, savedEntry()), 'remove');
  });
});

describe('withDraft i withoutDraft', () => {
  test('S1, S2: szkic ma 3 pola wdzięczności na swoich miejscach, wartości surowe i updatedAt', () => {
    const drafts = withDraft({}, DAY, rawFields({ grateful: ['', ' b ', ''], why: ' x ' }), NOW);
    assert.deepEqual(drafts[DAY], {
      grateful: ['', ' b ', ''],
      why: ' x ',
      person: '',
      proud: '',
      lesson: '',
      updatedAt: NOW,
    });
  });

  test('S2: krótką listę wdzięczności uzupełnia do trzech, a dłuższą obcina do trzech', () => {
    assert.deepEqual(withDraft({}, DAY, { grateful: ['a'] }, NOW)[DAY].grateful, ['a', '', '']);
    assert.deepEqual(withDraft({}, DAY, { grateful: ['a', 'b', 'c', 'd'] }, NOW)[DAY].grateful, [
      'a',
      'b',
      'c',
    ]);
  });

  test('zastępuje szkic tego samego dnia i nie rusza szkiców innych dni', () => {
    const other = storedDraft({ updatedAt: 1 });
    const drafts = { '2026-10-01': other, [DAY]: storedDraft({ updatedAt: 2 }) };
    const next = withDraft(drafts, DAY, rawFields({ why: 'nowy' }), NOW);
    assert.equal(next['2026-10-01'], other);
    assert.equal(next[DAY].why, 'nowy');
    assert.equal(next[DAY].updatedAt, NOW);
  });

  test('withoutDraft usuwa tylko wskazany dzień', () => {
    const drafts = { '2026-10-01': storedDraft(), [DAY]: storedDraft() };
    const next = withoutDraft(drafts, DAY);
    assert.deepEqual(Object.keys(next), ['2026-10-01']);
  });

  test('withoutDraft dla nieistniejącego dnia zwraca ten sam obiekt', () => {
    const drafts = { '2026-10-01': storedDraft() };
    assert.equal(withoutDraft(drafts, DAY), drafts);
  });

  test('nie zmieniają przekazanego obiektu', () => {
    const drafts = deepFreeze({ [DAY]: storedDraft() });
    assert.doesNotThrow(() => withDraft(drafts, '2026-10-02', rawFields({ why: 'x' }), NOW));
    assert.doesNotThrow(() => withoutDraft(drafts, DAY));
    assert.deepEqual(Object.keys(drafts), [DAY]);
  });
});

describe('updateDrafts', () => {
  const others = { '2026-10-01': storedDraft({ updatedAt: 1 }) };

  test('S4: zapisuje szkic, gdy formularz różni się od bazy', () => {
    const next = updateDrafts(others, DAY, rawFields({ why: 'x' }), null, NOW);
    assert.equal(next[DAY].why, 'x');
    assert.equal(next[DAY].updatedAt, NOW);
  });

  test('S9: szkice innych dni zostają nietknięte przy zapisie i przy usunięciu', () => {
    const saved = updateDrafts(others, DAY, rawFields({ why: 'x' }), null, NOW);
    assert.equal(saved['2026-10-01'], others['2026-10-01']);
    const removed = updateDrafts(saved, DAY, rawFields(), null, NOW);
    assert.deepEqual(Object.keys(removed), ['2026-10-01']);
  });

  test('S5, S6: usuwa istniejący szkic, gdy formularz jest pusty albo równy bazie', () => {
    const drafts = { ...others, [DAY]: storedDraft() };
    assert.equal(DAY in updateDrafts(drafts, DAY, rawFields(), null, NOW), false);
    const same = rawFields({ grateful: ['kawa', 'spacer', ''], why: 'spokój', person: 'Ala' });
    assert.equal(DAY in updateDrafts(drafts, DAY, same, savedEntry(), NOW), false);
  });

  test('gdy nic się nie zmienia, zwraca ten sam obiekt (nie ma po co zapisywać)', () => {
    assert.equal(updateDrafts(others, DAY, rawFields(), null, NOW), others);
  });

  test('nie zmienia przekazanego obiektu', () => {
    const drafts = deepFreeze({ ...others });
    assert.doesNotThrow(() => updateDrafts(drafts, DAY, rawFields({ why: 'x' }), null, NOW));
    assert.deepEqual(Object.keys(drafts), ['2026-10-01']);
  });
});

describe('chooseFormSource', () => {
  const saved = savedEntry();

  test('S11: szkic ma pierwszeństwo przed zapisanym wpisem', () => {
    const draft = storedDraft({ grateful: ['kawa', 'spacer', 'szkic'] });
    const result = chooseFormSource(saved, draft);
    assert.equal(result.source, 'draft');
    assert.deepEqual(result.fields.grateful, ['kawa', 'spacer', 'szkic']);
  });

  test('S11: bez szkicu pokazuje zapisany wpis', () => {
    const result = chooseFormSource(saved, undefined);
    assert.equal(result.source, 'saved');
    assert.deepEqual(result.fields.grateful, ['kawa', 'spacer', '']);
    assert.equal(result.fields.why, 'spokój');
  });

  test('S11: bez szkicu i bez wpisu pokazuje pusty formularz', () => {
    const result = chooseFormSource(undefined, undefined);
    assert.equal(result.source, 'empty');
    assert.deepEqual(result.fields, rawFields());
  });

  test('S11: szkic bez wpisu jest pokazywany', () => {
    const result = chooseFormSource(undefined, storedDraft());
    assert.equal(result.source, 'draft');
  });

  test('S2: szkic wraca do formularza surowy i pozycyjny', () => {
    const draft = storedDraft({ grateful: ['', ' b ', ''] });
    assert.deepEqual(chooseFormSource(undefined, draft).fields.grateful, ['', ' b ', '']);
  });

  test('S12: szkic równy zapisanemu wpisowi jest nieaktualny i ignorowany', () => {
    const draft = storedDraft({ grateful: ['kawa', 'spacer', ''], why: 'spokój', person: 'Ala' });
    const result = chooseFormSource(saved, draft);
    assert.equal(result.source, 'saved');
    assert.equal(result.staleDraft, true);
  });

  test('S12: pusty szkic jest ignorowany, także gdy nie ma wpisu', () => {
    const empty = storedDraft({ grateful: ['', '', ''] });
    assert.equal(chooseFormSource(undefined, empty).source, 'empty');
    assert.equal(chooseFormSource(undefined, empty).staleDraft, true);
    assert.equal(chooseFormSource(saved, empty).source, 'saved');
  });

  test('staleDraft jest fałszem, gdy szkic jest używany albo go nie ma', () => {
    assert.equal(chooseFormSource(saved, storedDraft()).staleDraft, false);
    assert.equal(chooseFormSource(saved, undefined).staleDraft, false);
    assert.equal(chooseFormSource(undefined, undefined).staleDraft, false);
  });
});

describe('formMode', () => {
  const texts = (mode) => [mode.indicatorText, mode.saveLabel, mode.showDiscard];

  test('S13: szkic dnia bez wpisu', () => {
    const mode = formMode({ hasSaved: false, hasDraft: true, isToday: true });
    assert.deepEqual(texts(mode), ['📝 Szkic — jeszcze niezapisany', 'Zapisz wpis', true]);
  });

  test('S13: szkic zmian dnia z wpisem', () => {
    const mode = formMode({ hasSaved: true, hasDraft: true, isToday: false });
    assert.deepEqual(texts(mode), [
      '📝 Szkic zmian — wpis z tego dnia nie jest jeszcze zaktualizowany',
      'Zapisz zmiany',
      true,
    ]);
  });

  test('bez szkicu: istniejący wpis', () => {
    const mode = formMode({ hasSaved: true, hasDraft: false, isToday: true });
    assert.deepEqual(texts(mode), [
      '✏️ Edytujesz istniejący wpis z tego dnia',
      'Zapisz zmiany',
      false,
    ]);
  });

  test('bez szkicu: nowy wpis na dziś i na inny dzień', () => {
    const today = formMode({ hasSaved: false, hasDraft: false, isToday: true });
    assert.deepEqual(texts(today), ['🆕 Nowy wpis na dziś', 'Zapisz wpis', false]);
    const other = formMode({ hasSaved: false, hasDraft: false, isToday: false });
    assert.deepEqual(texts(other), ['🆕 Nowy wpis na wybrany dzień', 'Zapisz wpis', false]);
  });

  test('przycisk „Odrzuć szkic” jest tylko przy szkicu', () => {
    for (const hasSaved of [true, false]) {
      for (const isToday of [true, false]) {
        assert.equal(formMode({ hasSaved, hasDraft: true, isToday }).showDiscard, true);
        assert.equal(formMode({ hasSaved, hasDraft: false, isToday }).showDiscard, false);
      }
    }
  });
});

describe('afterImport', () => {
  const baseline = savedEntry();
  const imported = savedEntry({ grateful: ['z importu'], savedAt: 9 });
  const untouched = rawFields({ grateful: ['kawa', 'spacer', ''], why: 'spokój', person: 'Ala' });

  test('S20: nietknięty formularz i zmieniony wpis: przeładuj, bez ostrzeżenia', () => {
    assert.deepEqual(afterImport({ formFields: untouched, baseline, newSaved: imported }), {
      action: 'reload',
      warn: false,
    });
  });

  test('S20: nietknięty pusty formularz i nowy wpis z importu: przeładuj', () => {
    assert.deepEqual(afterImport({ formFields: rawFields(), baseline: null, newSaved: imported }), {
      action: 'reload',
      warn: false,
    });
  });

  test('S20: formularz z niezapisanym tekstem zostaje, a zmieniony wpis daje ostrzeżenie', () => {
    const typed = rawFields({
      grateful: ['kawa', 'spacer', 'pisałam'],
      why: 'spokój',
      person: 'Ala',
    });
    assert.deepEqual(afterImport({ formFields: typed, baseline, newSaved: imported }), {
      action: 'keep',
      warn: true,
    });
  });

  test('S20: rozgrzebany pusty dzień i nowy wpis z importu: zostaje z ostrzeżeniem', () => {
    const typed = rawFields({ grateful: ['coś', '', ''] });
    assert.deepEqual(afterImport({ formFields: typed, baseline: null, newSaved: imported }), {
      action: 'keep',
      warn: true,
    });
  });

  test('S20: wpis tego dnia się nie zmienił, więc nic nie trzeba robić', () => {
    assert.deepEqual(afterImport({ formFields: untouched, baseline, newSaved: baseline }), {
      action: 'unchanged',
      warn: false,
    });
    const typed = rawFields({ grateful: ['coś', '', ''] });
    assert.deepEqual(afterImport({ formFields: typed, baseline, newSaved: baseline }), {
      action: 'unchanged',
      warn: false,
    });
    assert.deepEqual(
      afterImport({ formFields: rawFields(), baseline: null, newSaved: undefined }),
      {
        action: 'unchanged',
        warn: false,
      },
    );
  });

  test('S20: wpis tego dnia zniknął z magazynu, a formularz był nietknięty: przeładuj', () => {
    assert.deepEqual(afterImport({ formFields: untouched, baseline, newSaved: undefined }), {
      action: 'reload',
      warn: false,
    });
  });
});

describe('sanitizeDrafts', () => {
  test('S22: poprawne szkice przechodzą bez zmian', () => {
    const drafts = { [DAY]: storedDraft(), '2026-10-06': storedDraft({ updatedAt: 7 }) };
    assert.deepEqual(sanitizeDrafts(drafts), drafts);
  });

  test('S22: pomija klucze, które nie są prawdziwymi dniami', () => {
    const result = sanitizeDrafts({
      '2026-02-31': storedDraft(),
      jutro: storedDraft(),
      '2026-9-5': storedDraft(),
      [DAY]: storedDraft(),
    });
    assert.deepEqual(Object.keys(result), [DAY]);
  });

  test('S22: pomija wartości, które nie są obiektami', () => {
    const result = sanitizeDrafts({
      '2026-10-01': 'tekst',
      '2026-10-02': null,
      '2026-10-03': [],
      '2026-10-04': 5,
      [DAY]: storedDraft(),
    });
    assert.deepEqual(Object.keys(result), [DAY]);
  });

  test('S22: uzupełnia wdzięczności do trzech i zamienia nie-teksty na puste', () => {
    const result = sanitizeDrafts({
      [DAY]: { grateful: ['a', 5, null, 'd'], why: 7, person: null, updatedAt: 'x' },
    });
    assert.deepEqual(result[DAY], {
      grateful: ['a', '', ''],
      why: '',
      person: '',
      proud: '',
      lesson: '',
      updatedAt: 0,
    });
  });

  test('S22: grateful, które nie jest tablicą, daje trzy puste pola', () => {
    const result = sanitizeDrafts({ [DAY]: { grateful: 'tekst', why: 'x', updatedAt: 1 } });
    assert.deepEqual(result[DAY].grateful, ['', '', '']);
    assert.equal(result[DAY].why, 'x');
  });

  test('S22: updatedAt, który nie jest dodatnią liczbą, staje się zerem', () => {
    for (const updatedAt of [-5, 0, NaN, Infinity, '5', null, undefined]) {
      const result = sanitizeDrafts({ [DAY]: { ...storedDraft(), updatedAt } });
      assert.equal(result[DAY].updatedAt, 0, String(updatedAt));
    }
    assert.equal(sanitizeDrafts({ [DAY]: { ...storedDraft(), updatedAt: 12 } })[DAY].updatedAt, 12);
  });

  test('S22: pomija obce pola', () => {
    const result = sanitizeDrafts({ [DAY]: { ...storedDraft(), extra: 'x' } });
    assert.equal('extra' in result[DAY], false);
  });

  test('S22: wszystko, co nie jest obiektem, daje zero szkiców', () => {
    for (const raw of [null, undefined, 'tekst', 5, [], true]) {
      assert.deepEqual(sanitizeDrafts(raw), {}, String(raw));
    }
  });

  test('nie zmienia przekazanych danych', () => {
    const raw = deepFreeze({ [DAY]: storedDraft() });
    assert.doesNotThrow(() => sanitizeDrafts(raw));
  });
});
