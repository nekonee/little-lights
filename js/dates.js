export const MONTHS_PL = [
  'styczeń',
  'luty',
  'marzec',
  'kwiecień',
  'maj',
  'czerwiec',
  'lipiec',
  'sierpień',
  'wrzesień',
  'październik',
  'listopad',
  'grudzień',
];

const LOCALE = 'pl-PL';

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Zachowanie z prototypu: klucz dnia liczony w UTC, nie w czasie lokalnym.
// Do zastąpienia w kroku „czas lokalny” (docs/plan.json, punkt 7).
/** @param {Date} date @returns {string} YYYY-MM-DD */
export function keyFromDate(date) {
  return date.toISOString().slice(0, 10);
}

export function todayKey(now = new Date()) {
  return keyFromDate(now);
}

export function formatTodayLabel(now = new Date()) {
  return now.toLocaleDateString(LOCALE, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** @param {string} dateKey YYYY-MM-DD */
export function formatDateLabel(dateKey) {
  const date = new Date(dateKey + 'T00:00:00');
  return capitalize(
    date.toLocaleDateString(LOCALE, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  );
}

export function formatMonthLabel(date) {
  return capitalize(date.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' }));
}
