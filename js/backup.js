import { daysBetween, isValidKey } from './dates.js';

const MAX_GRATEFUL = 3;
const TEXT_FIELDS = ['why', 'person', 'proud', 'lesson'];

export function serializeEntries(entries) {
  return JSON.stringify(entries, null, 2);
}

export function backupFilename(dateKey) {
  return `little-lights-kopia-${dateKey}.json`;
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Zamienia tekst pliku kopii zapasowej na obiekt wpisów kluczowany datą.
 * @throws {Error} gdy tekst nie jest poprawnym JSON-em albo nie jest obiektem
 */
export function parseBackup(text) {
  const imported = JSON.parse(text);
  if (!isPlainObject(imported)) {
    throw new Error('Kopia zapasowa musi być obiektem wpisów');
  }
  return imported;
}

function sanitizeEntry(key, raw) {
  if (!isValidKey(key) || !isPlainObject(raw)) return null;
  const grateful = (Array.isArray(raw.grateful) ? raw.grateful : [])
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, MAX_GRATEFUL);
  if (grateful.length === 0) return null;
  const entry = { date: key, grateful };
  for (const field of TEXT_FIELDS) entry[field] = typeof raw[field] === 'string' ? raw[field] : '';
  entry.savedAt = Number.isFinite(raw.savedAt) && raw.savedAt > 0 ? raw.savedAt : 0;
  return entry;
}

/**
 * Sprawdza wpisy z pliku. Klucz musi być prawdziwym dniem YYYY-MM-DD (i wygrywa z polem `date`),
 * `grateful` ma 1–3 niepuste teksty, `savedAt` to liczba (inaczej 0). Reszta jest pomijana.
 * @returns {{entries: Record<string, object>, skipped: number}}
 */
export function sanitizeEntries(imported) {
  const entries = {};
  let skipped = 0;
  for (const [key, raw] of Object.entries(imported)) {
    const entry = sanitizeEntry(key, raw);
    if (entry) entries[key] = entry;
    else skipped++;
  }
  return { entries, skipped };
}

function savedAtOf(entry) {
  return Number.isFinite(entry.savedAt) && entry.savedAt > 0 ? entry.savedAt : 0;
}

function sameContent(a, b) {
  return (
    Array.isArray(a.grateful) &&
    Array.isArray(b.grateful) &&
    a.grateful.length === b.grateful.length &&
    a.grateful.every((item, index) => item === b.grateful[index]) &&
    TEXT_FIELDS.every((field) => a[field] === b[field])
  );
}

/**
 * Scala wpisy z pliku z obecnymi. Dla każdej daty zostaje wpis z większym `savedAt`
 * (brak lub zła wartość to 0); przy remisie i przy tej samej treści zostaje obecny.
 * Wpisy obecne tylko lokalnie zostają, usunięcia nie są synchronizowane.
 * Obecny wpis, który nie jest obiektem, traktujemy jak nieistniejący.
 * @returns {{entries: Record<string, object>, added: number, updated: number, unchanged: number}}
 */
export function mergeEntries(current, imported) {
  const entries = { ...current };
  let added = 0;
  let updated = 0;
  let unchanged = 0;
  for (const [key, incoming] of Object.entries(imported)) {
    const existing = current[key];
    if (!isPlainObject(existing)) {
      entries[key] = incoming;
      added++;
    } else if (!sameContent(existing, incoming) && savedAtOf(incoming) > savedAtOf(existing)) {
      entries[key] = incoming;
      updated++;
    } else {
      unchanged++;
    }
  }
  return { entries, added, updated, unchanged };
}

/**
 * Stan licznika „Ostatnia kopia”. Bez wpisów nie ma czego kopiować, więc licznika nie ma;
 * zepsuta data kopii liczy się jak brak kopii, a data z przyszłości (przestawiony zegar) jak „dziś”.
 * @param {{entryCount: number, lastBackup: unknown, today: string}} input daty to klucze YYYY-MM-DD
 * @returns {{kind: 'none'} | {kind: 'never'} | {kind: 'done', days: number}}
 */
export function backupStatus({ entryCount, lastBackup, today }) {
  if (entryCount === 0) return { kind: 'none' };
  if (!isValidKey(lastBackup)) return { kind: 'never' };
  return { kind: 'done', days: Math.max(0, daysBetween(lastBackup, today)) };
}
