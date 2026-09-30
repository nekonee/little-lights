import { keyFromDate } from './dates.js';

const TOP_PEOPLE_LIMIT = 3;
const HIGHLIGHTS_LIMIT = 3;

/**
 * Liczy dni z rzędu z wpisem, cofając się od dziś. Gdy dziś nie ma jeszcze wpisu,
 * seria liczona jest od wczoraj, żeby nie zerować jej przed napisaniem dzisiejszego.
 */
export function computeStreak(entries, now = new Date()) {
  const dates = new Set(Object.keys(entries));
  const cursor = new Date(now);
  if (!dates.has(keyFromDate(cursor))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (dates.has(keyFromDate(cursor))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

/** Miesiące (YYYY-MM) z wpisami plus bieżący, od najnowszego. */
export function listMonths(entries, currentMonth) {
  const months = new Set(Object.keys(entries).map((date) => date.slice(0, 7)));
  months.add(currentMonth);
  return Array.from(months).sort().reverse();
}

function longestRunOfDays(sortedDates) {
  let longest = 0;
  let run = 0;
  let previousDay = null;
  for (const date of sortedDates) {
    const day = parseInt(date.slice(8, 10), 10);
    run = previousDay !== null && day === previousDay + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    previousDay = day;
  }
  return longest;
}

function countPeople(entries, dates) {
  const counts = new Map();
  for (const date of dates) {
    const person = (entries[date].person || '').trim();
    if (person) counts.set(person, (counts.get(person) || 0) + 1);
  }
  return Array.from(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_PEOPLE_LIMIT);
}

function pickHighlights(entries, dates, random) {
  const gratitudes = dates.flatMap((date) => (entries[date].grateful || []).filter(Boolean));
  return gratitudes.sort(() => random() - 0.5).slice(0, HIGHLIGHTS_LIMIT);
}

/**
 * Podsumowanie miesiąca (YYYY-MM) albo null, gdy nie ma w nim wpisów.
 * @returns {{count: number, longestStreak: number, topPeople: [string, number][], highlights: string[]} | null}
 */
export function summarizeMonth(entries, month, random = Math.random) {
  const dates = Object.keys(entries)
    .filter((date) => date.startsWith(month))
    .sort();
  if (!dates.length) return null;
  return {
    count: dates.length,
    longestStreak: longestRunOfDays(dates),
    topPeople: countPeople(entries, dates),
    highlights: pickHighlights(entries, dates, random),
  };
}
