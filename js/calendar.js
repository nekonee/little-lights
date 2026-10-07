import { byId, h } from './dom.js';
import { formatDatePL, formatMonthPL, monthKey, todayKey } from './dates.js';
import {
  calendarReducer,
  canGoNext,
  createCalendarState,
  describeCell,
  monthGrid,
} from './calendar-model.js';

/**
 * Wybór daty wpisu: przycisk z datą i panel z miesięcznym kalendarzem rozwijany w karcie.
 * Wszystkie reguły są w calendar-model.js; tu tylko rysowanie i zdarzenia.
 * @param {{selected: string, onSelectDate: (key: string) => void}} options
 */
export function initCalendar({ selected, onSelectDate }) {
  const trigger = byId('dateTrigger');
  const triggerLabel = byId('dateTriggerLabel');
  const panel = byId('calendarPanel');
  const monthLabel = byId('calMonthLabel');
  const previousButton = byId('calPrev');
  const nextButton = byId('calNext');
  const grid = byId('calGrid');
  let state = createCalendarState(selected);
  let entries = {};

  function buildCell(cell, today) {
    const info = describeCell(cell, { today, selected: state.selected, entries });
    const classes = ['cal-day'];
    if (!info.inMonth) classes.push('other-month');
    if (info.isToday) classes.push('today');
    if (info.isSelected) classes.push('selected');
    return h(
      'button',
      {
        type: 'button',
        class: classes.join(' '),
        dataset: { date: info.key },
        'aria-label': info.label,
        'aria-pressed': info.isSelected ? 'true' : 'false',
        'aria-current': info.isToday ? 'date' : null,
        disabled: info.isFuture,
      },
      String(info.day),
      info.hasEntry ? h('span', { class: 'dot', 'aria-hidden': 'true' }) : null,
    );
  }

  function render() {
    const today = todayKey();
    triggerLabel.textContent = formatDatePL(state.selected);
    trigger.setAttribute('aria-expanded', String(state.open));
    panel.hidden = !state.open;
    if (!state.open) return;
    const view = { year: state.viewYear, month: state.viewMonth };
    monthLabel.textContent = formatMonthPL(monthKey(view.year, view.month));
    nextButton.disabled = !canGoNext(view, today);
    grid.replaceChildren(...monthGrid(view.year, view.month).map((cell) => buildCell(cell, today)));
  }

  function dispatch(action) {
    const previousSelected = state.selected;
    state = calendarReducer(state, action, { today: todayKey() });
    render();
    const pickedByUser = action.type !== 'select';
    if (pickedByUser && state.selected !== previousSelected) onSelectDate(state.selected);
  }

  trigger.addEventListener('click', () => dispatch({ type: 'toggle' }));
  previousButton.addEventListener('click', () => dispatch({ type: 'prev' }));
  nextButton.addEventListener('click', () => dispatch({ type: 'next' }));
  grid.addEventListener('click', (event) => {
    const cell = event.target.closest('.cal-day');
    if (cell) dispatch({ type: 'pickDay', key: cell.dataset.date });
  });
  document.addEventListener('click', (event) => {
    // composedPath, bo komórka klikniętego dnia mogła już zniknąć z drzewa po przerysowaniu siatki
    const path = event.composedPath();
    const insideCalendar = path.includes(panel) || path.includes(trigger);
    if (state.open && !insideCalendar) dispatch({ type: 'close' });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !state.open) return;
    dispatch({ type: 'close' });
    trigger.focus();
  });

  render();

  return {
    /** Zewnętrzna zmiana dnia (np. „edytuj” w historii). Zwraca, czy dzień został przyjęty. */
    select(key) {
      dispatch({ type: 'select', key });
      return state.selected === key;
    },
    goToToday() {
      dispatch({ type: 'goToToday' });
    },
    setEntries(nextEntries) {
      entries = nextEntries;
      render();
    },
  };
}
