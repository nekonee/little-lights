import { isValidKey } from './dates.js';

const MAX_GRATEFUL = 3;
const TEXT_FIELDS = ['why', 'person', 'proud', 'lesson'];

export function serializeEntries(entries) {
  return JSON.stringify(entries, null, 2);
}

export function backupFilename(dateKey) {
  return `kopia-dziennika-wdziecznosci-${dateKey}.json`;
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

// Zachowanie z prototypu: wpis z pliku zawsze zastępuje obecny z tą samą datą.
// Do zastąpienia zasadą „nowszy wygrywa” (docs/plan.json, punkt 14).
export function mergeEntries(current, imported) {
  return Object.assign({}, current, imported);
}
