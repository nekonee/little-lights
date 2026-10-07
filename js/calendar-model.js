// Czysta logika kalendarza wyboru daty: siatka miesiąca, przesuwanie widoku, cechy dni i reguły interfejsu.
// Bez DOM i bez localStorage. Zachowania K1–K20 opisuje docs/dokumentacja.md, sekcja „Kalendarz wyboru daty”.
import { addDaysKey, dateKey, formatDatePL, isValidKey, parseKey } from './dates.js';
import { strings } from './strings.js';

const DAYS_IN_WEEK = 7;
const GRID_ROWS = 6;
const GRID_CELLS = GRID_ROWS * DAYS_IN_WEEK;
const MONTHS_IN_YEAR = 12;
const FIRST_YEAR = 1000;
const LAST_YEAR = 9999;

/** @typedef {{key: string, day: number, inMonth: boolean}} GridCell */
/** @typedef {{year: number, month: number}} MonthView miesiąc liczony od 1 */
/** @typedef {{open: boolean, viewYear: number, viewMonth: number, selected: string}} CalendarState */

function assertMonth(year, month) {
  const validYear = Number.isInteger(year) && year >= FIRST_YEAR && year <= LAST_YEAR;
  const validMonth = Number.isInteger(month) && month >= 1 && month <= MONTHS_IN_YEAR;
  if (!validYear || !validMonth) {
    throw new RangeError(`Niepoprawny miesiąc kalendarza: ${year}-${month}`);
  }
}

/**
 * Siatka miesiąca: zawsze 6 wierszy po 7 komórek, tydzień od poniedziałku.
 * Dni sąsiednich miesięcy uzupełniają siatkę z obu stron.
 * @param {number} month 1–12
 * @returns {GridCell[]}
 */
export function monthGrid(year, month) {
  assertMonth(year, month);
  const weekdayOfFirst = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0 = niedziela
  const daysBeforeFirst = (weekdayOfFirst + DAYS_IN_WEEK - 1) % DAYS_IN_WEEK;
  const gridStart = addDaysKey(dateKey(year, month, 1), -daysBeforeFirst);
  return Array.from({ length: GRID_CELLS }, (_, index) => {
    const key = addDaysKey(gridStart, index);
    const { year: cellYear, month: cellMonth, day } = parseKey(key);
    return { key, day, inMonth: cellYear === year && cellMonth === month };
  });
}

/**
 * Widok przesunięty o `delta` miesięcy. Liczy na jednej liczbie (rok·12 + miesiąc), więc nie ma
 * w nim dnia, który mógłby przeskoczyć miesiąc, jak przy setMonth.
 * @param {MonthView} view
 * @returns {MonthView}
 */
export function shiftMonth(view, delta) {
  const index = view.year * MONTHS_IN_YEAR + (view.month - 1) + delta;
  const year = Math.floor(index / MONTHS_IN_YEAR);
  return { year, month: index - year * MONTHS_IN_YEAR + 1 };
}

/** Czy dzień jest po dzisiejszym. Klucze YYYY-MM-DD porównują się jak zwykły tekst. */
export function isFuture(key, today) {
  return key > today;
}

/** Strzałka „dalej” działa tylko we wcześniejszych miesiącach niż dzisiejszy. */
export function canGoNext(view, today) {
  const { year, month } = parseKey(today);
  return view.year * MONTHS_IN_YEAR + view.month < year * MONTHS_IN_YEAR + month;
}

/**
 * Cechy komórki potrzebne do narysowania i opisania jej dla czytnika ekranu.
 * @param {GridCell} cell
 * `marker` mówi, co narysować pod cyfrą: 'entry' (wpis, także gdy jest też szkic zmian), 'draft' (sam szkic) albo null.
 * @param {{today: string, selected: string, entries: Record<string, unknown>, drafts?: Record<string, unknown>}} context
 */
export function describeCell(cell, { today, selected, entries, drafts = {} }) {
  const hasEntry = Object.hasOwn(entries, cell.key);
  const hasDraft = Object.hasOwn(drafts, cell.key);
  return {
    key: cell.key,
    day: cell.day,
    inMonth: cell.inMonth,
    isToday: cell.key === today,
    isSelected: cell.key === selected,
    isFuture: isFuture(cell.key, today),
    hasEntry,
    hasDraft,
    marker: hasEntry ? 'entry' : hasDraft ? 'draft' : null,
    label: [formatDatePL(cell.key), ...spokenStatus(hasEntry, hasDraft)].join(', '),
  };
}

function spokenStatus(hasEntry, hasDraft) {
  if (hasEntry && hasDraft) return [strings.calendar.entrySaved, strings.calendar.draftOfEntry];
  if (hasEntry) return [strings.calendar.entrySaved];
  if (hasDraft) return [strings.calendar.draftUnsaved];
  return [];
}

function viewOf(key) {
  const { year, month } = parseKey(key);
  return { viewYear: year, viewMonth: month };
}

/** @returns {CalendarState} zamknięty kalendarz z widokiem na miesiącu wybranego dnia */
export function createCalendarState(selected) {
  if (!isValidKey(selected)) throw new RangeError(`Niepoprawny dzień: ${selected}`);
  return { open: false, ...viewOf(selected), selected };
}

function isSelectable(key, today) {
  return isValidKey(key) && !isFuture(key, today);
}

function withSelected(state, key) {
  return { ...state, ...viewOf(key), selected: key };
}

function withShiftedView(state, delta) {
  const { year, month } = shiftMonth({ year: state.viewYear, month: state.viewMonth }, delta);
  return { ...state, viewYear: year, viewMonth: month };
}

/**
 * Następny stan kalendarza. Czysta funkcja: nie zmienia `state`.
 * Akcje: toggle, close (dotknięcie poza panelem, Escape), prev, next, pickDay, goToToday, select.
 * Wybór dnia z przyszłości lub niepoprawnego jest ignorowany (zwraca ten sam stan).
 * @param {CalendarState} state
 * @param {{type: string, key?: string}} action
 * @param {{today: string}} context
 * @returns {CalendarState}
 */
export function calendarReducer(state, action, { today }) {
  switch (action.type) {
    case 'toggle':
      return state.open
        ? { ...state, open: false }
        : { ...state, ...viewOf(state.selected), open: true };
    case 'close':
      return { ...state, open: false };
    case 'prev':
      return withShiftedView(state, -1);
    case 'next':
      return canGoNext({ year: state.viewYear, month: state.viewMonth }, today)
        ? withShiftedView(state, 1)
        : state;
    case 'pickDay':
      return isSelectable(action.key, today)
        ? { ...withSelected(state, action.key), open: false }
        : state;
    case 'goToToday':
      return { ...withSelected(state, today), open: false };
    case 'select':
      return isSelectable(action.key, today) ? withSelected(state, action.key) : state;
    default:
      throw new Error(`Nieznana akcja kalendarza: ${action.type}`);
  }
}
