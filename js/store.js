// Jedyne miejsce, które dotyka localStorage.
import { sanitizeDrafts } from './drafts.js';

const ENTRIES_KEY = 'gratitude_journal_entries_v1';
const DRAFTS_KEY = 'gratitude_journal_drafts_v1';
const THEME_KEY = 'gratitude_journal_theme';

/** @returns {Record<string, any>} wpisy kluczowane datą YYYY-MM-DD */
export function loadEntries() {
  try {
    const raw = localStorage.getItem(ENTRIES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** @throws gdy przeglądarka odmówi zapisu (np. pełny magazyn) */
export function saveEntries(entries) {
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}

/** @returns {Record<string, any>} szkice niezapisanych formularzy kluczowane dniem, już oczyszczone */
export function loadDrafts() {
  try {
    return sanitizeDrafts(JSON.parse(localStorage.getItem(DRAFTS_KEY) || '{}'));
  } catch {
    return {};
  }
}

/** @throws gdy przeglądarka odmówi zapisu (np. pełny magazyn) */
export function saveDrafts(drafts) {
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

export function loadTheme() {
  return localStorage.getItem(THEME_KEY);
}

export function saveTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}
