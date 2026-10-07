// Dzień to tekst YYYY-MM-DD w czasie lokalnym urządzenia (bez strefy), miesiąc to YYYY-MM.
// Miesiące w kluczach i w tym module liczymy od 1 (styczeń = 1), tak jak w zapisie.
// Wszystkie obliczenia na dniach idą przez Date.UTC, więc nie zależą od strefy ani zmiany czasu.
// Nigdzie nie używamy toISOString() do dat: zamienia czas lokalny na UTC i przesuwa dzień.

const LOCALE = 'pl-PL';
const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_KEY_PATTERN = /^(\d{4})-(\d{2})$/;

const dateFormat = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const monthFormat = new Intl.DateTimeFormat(LOCALE, {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

function pad(number, length) {
  return String(number).padStart(length, '0');
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Południe UTC danego dnia: bezpieczny moment do formatowania, bez przeskoków na sąsiedni dzień. */
function utcNoon(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day, 12));
}

/** @param {number} month 1–12 @returns {string} YYYY-MM-DD */
export function dateKey(year, month, day) {
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

/** @param {number} month 1–12 @returns {string} YYYY-MM */
export function monthKey(year, month) {
  return `${pad(year, 4)}-${pad(month, 2)}`;
}

/** Dzień z lokalnych składników daty (rok, miesiąc, dzień na urządzeniu). */
export function keyFromLocalDate(date) {
  return dateKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function todayKey(now = new Date()) {
  return keyFromLocalDate(now);
}

/**
 * Rozkłada klucz dnia na liczby. Zwraca null, gdy tekst nie ma formatu YYYY-MM-DD
 * albo nie jest prawdziwą datą (np. 2026-02-31).
 * @returns {{year: number, month: number, day: number} | null}
 */
export function parseKey(key) {
  const match = typeof key === 'string' ? DAY_KEY_PATTERN.exec(key) : null;
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  const isReal =
    check.getUTCFullYear() === year &&
    check.getUTCMonth() === month - 1 &&
    check.getUTCDate() === day;
  return isReal ? { year, month, day } : null;
}

export function isValidKey(key) {
  return parseKey(key) !== null;
}

/** Miesiąc (YYYY-MM), do którego należy dzień, albo null dla niepoprawnego klucza. */
export function monthOf(key) {
  const parsed = parseKey(key);
  return parsed ? monthKey(parsed.year, parsed.month) : null;
}

/** @param {string} key poprawny klucz dnia @param {number} days może być ujemne */
export function addDaysKey(key, days) {
  const parsed = parseKey(key);
  if (!parsed) throw new RangeError(`Niepoprawny klucz dnia: ${key}`);
  const shifted = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day) + days * DAY_MS);
  return dateKey(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

/** „Piątek, 25 września 2026”. Niepoprawny klucz wraca bez zmian, żeby widok się nie wywrócił. */
export function formatDatePL(key) {
  const parsed = parseKey(key);
  if (!parsed) return String(key);
  return capitalize(dateFormat.format(utcNoon(parsed.year, parsed.month, parsed.day)));
}

/** „Wrzesień 2026” z klucza YYYY-MM. Niepoprawny klucz wraca bez zmian. */
export function formatMonthPL(key) {
  const match = typeof key === 'string' ? MONTH_KEY_PATTERN.exec(key) : null;
  const [year, month] = match ? match.slice(1).map(Number) : [];
  if (!match || month < 1 || month > 12) return String(key);
  return capitalize(monthFormat.format(utcNoon(year, month, 1)));
}
