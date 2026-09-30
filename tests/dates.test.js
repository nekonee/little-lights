import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MONTHS_PL,
  formatDateLabel,
  formatMonthKey,
  formatMonthLabel,
  formatTodayLabel,
  keyFromDate,
  todayKey,
} from '../js/dates.js';

const NOON = new Date('2026-09-25T12:00:00Z');

test('keyFromDate zwraca dzień w formacie YYYY-MM-DD', () => {
  assert.equal(keyFromDate(NOON), '2026-09-25');
});

test('todayKey korzysta z przekazanego czasu', () => {
  assert.equal(todayKey(NOON), '2026-09-25');
});

test('formatDateLabel zwraca długą datę po polsku z wielką literą', () => {
  assert.equal(formatDateLabel('2026-09-25'), 'Piątek, 25 września 2026');
});

test('formatTodayLabel zwraca dzień tygodnia, dzień, miesiąc i rok po polsku', () => {
  assert.equal(formatTodayLabel(new Date(2026, 8, 25, 12)), 'piątek, 25 września 2026');
});

test('formatMonthLabel zwraca miesiąc w mianowniku z wielką literą', () => {
  assert.equal(formatMonthLabel(new Date(2026, 8, 15)), 'Wrzesień 2026');
});

test('formatMonthKey zamienia YYYY-MM na nazwę miesiąca i rok', () => {
  assert.equal(formatMonthKey('2026-09'), 'wrzesień 2026');
  assert.equal(formatMonthKey('2027-01'), 'styczeń 2027');
});

test('MONTHS_PL ma dwanaście nazw', () => {
  assert.equal(MONTHS_PL.length, 12);
  assert.equal(MONTHS_PL[8], 'wrzesień');
});
