// Czysta logika szkiców niezapisanych formularzy. Bez DOM i bez localStorage.
// Zachowania S1–S23 wypisane są na początku tests/drafts.test.js.
import { isValidKey } from './dates.js';
import { strings } from './strings.js';

const GRATEFUL_SLOTS = 3;
const TEXT_FIELDS = ['why', 'person', 'proud', 'lesson'];

/** @typedef {{grateful: string[], why: string, person: string, proud: string, lesson: string}} FormFields */
/** @typedef {FormFields & {updatedAt: number}} Draft */

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asText(value) {
  return typeof value === 'string' ? value : '';
}

function asRawGrateful(value) {
  const list = Array.isArray(value) ? value.map(asText) : [];
  return Array.from({ length: GRATEFUL_SLOTS }, (_, index) => list[index] ?? '');
}

function rawFieldsOf(source) {
  const fields = { grateful: asRawGrateful(source?.grateful) };
  for (const name of TEXT_FIELDS) fields[name] = asText(source?.[name]);
  return fields;
}

/**
 * Pola do porównań: przycięte, bez pustych wdzięczności, w kolejności. Nie służy do zapisu szkicu.
 * @param {Partial<FormFields> | null | undefined} fields wpis z magazynu albo pola formularza
 * @returns {FormFields}
 */
export function normalizeFields(fields) {
  const grateful = (Array.isArray(fields?.grateful) ? fields.grateful : [])
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
  const normalized = { grateful };
  for (const name of TEXT_FIELDS) normalized[name] = asText(fields?.[name]).trim();
  return normalized;
}

/** Brak wpisu (null) liczy się jak pusty formularz. */
export function fieldsEqual(a, b) {
  return JSON.stringify(normalizeFields(a)) === JSON.stringify(normalizeFields(b));
}

function isEmpty(fields) {
  return fieldsEqual(fields, null);
}

/**
 * Czy formularz ma być zapisany jako szkic. Pusty formularz albo równy bazie (zapisanemu wpisowi
 * lub pustej bazie) szkicu nie tworzy.
 * @returns {'save' | 'remove'}
 */
export function draftDecision(formFields, baseline) {
  if (isEmpty(formFields)) return 'remove';
  return fieldsEqual(formFields, baseline) ? 'remove' : 'save';
}

/** Nowy obiekt szkiców ze szkicem dnia: wartości surowe, 3 pola wdzięczności na swoich miejscach. */
export function withDraft(drafts, key, rawFields, now) {
  return { ...drafts, [key]: { ...rawFieldsOf(rawFields), updatedAt: now } };
}

/** Nowy obiekt szkiców bez szkicu dnia (ten sam obiekt, gdy szkicu nie było). */
export function withoutDraft(drafts, key) {
  if (!Object.hasOwn(drafts, key)) return drafts;
  const { [key]: removed, ...rest } = drafts;
  void removed;
  return rest;
}

/**
 * Stan szkiców po zmianie formularza dnia. Zwraca ten sam obiekt, gdy nic się nie zmienia.
 * Szkice innych dni zostają nietknięte.
 */
export function updateDrafts(drafts, key, rawFields, baseline, now) {
  return draftDecision(rawFields, baseline) === 'save'
    ? withDraft(drafts, key, rawFields, now)
    : withoutDraft(drafts, key);
}

/**
 * Co pokazać w formularzu po wczytaniu dnia: szkic, zapisany wpis albo pusty formularz.
 * Szkic pusty albo równy zapisanemu wpisowi jest nieaktualny (`staleDraft`) i nie jest pokazywany.
 * @returns {{source: 'draft' | 'saved' | 'empty', fields: FormFields, staleDraft: boolean}}
 */
export function chooseFormSource(saved, draft) {
  const hasDraft = draft !== undefined && draft !== null;
  const useDraft = hasDraft && !isEmpty(draft) && !fieldsEqual(draft, saved ?? null);
  if (useDraft) return { source: 'draft', fields: rawFieldsOf(draft), staleDraft: false };
  const staleDraft = hasDraft;
  return saved
    ? { source: 'saved', fields: rawFieldsOf(saved), staleDraft }
    : { source: 'empty', fields: rawFieldsOf(null), staleDraft };
}

/** Teksty wskaźnika i przycisku zapisu oraz to, czy pokazać „Odrzuć szkic”. */
export function formMode({ hasSaved, hasDraft, isToday }) {
  const text = strings.form;
  const indicatorText = hasDraft
    ? hasSaved
      ? text.draftOfExisting
      : text.draftNew
    : hasSaved
      ? text.editingExisting
      : isToday
        ? text.newForToday
        : text.newForOtherDay;
  return {
    indicatorText,
    saveLabel: hasSaved ? text.saveExisting : text.saveNew,
    showDiscard: hasDraft,
  };
}

/**
 * Co zrobić z formularzem po imporcie kopii. `baseline` to wpis, z którym formularz był wczytany.
 * Nietknięty formularz odświeżamy, a rozgrzebany zostawiamy z ostrzeżeniem, żeby zapis nie
 * nadpisał po cichu zaimportowanego wpisu.
 * @returns {{action: 'reload' | 'keep' | 'unchanged', warn: boolean}}
 */
export function afterImport({ formFields, baseline, newSaved }) {
  if (fieldsEqual(baseline ?? null, newSaved ?? null)) return { action: 'unchanged', warn: false };
  return fieldsEqual(formFields, baseline ?? null)
    ? { action: 'reload', warn: false }
    : { action: 'keep', warn: true };
}

/** Czyści szkice z magazynu: odrzuca złe klucze i kształty, uzupełnia pola do trzech. */
export function sanitizeDrafts(raw) {
  const drafts = {};
  if (!isPlainObject(raw)) return drafts;
  for (const [key, value] of Object.entries(raw)) {
    if (!isValidKey(key) || !isPlainObject(value)) continue;
    const updatedAt = Number.isFinite(value.updatedAt) && value.updatedAt > 0 ? value.updatedAt : 0;
    drafts[key] = { ...rawFieldsOf(value), updatedAt };
  }
  return drafts;
}
