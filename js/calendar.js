import { byId, h } from './dom.js';
import { formatMonthPL, keyFromLocalDate, monthKey, parseKey, todayKey } from './dates.js';
import { loadEntries } from './store.js';

const GRID_CELLS = 42;

/**
 * Wybór daty wpisu: przycisk z datą, przycisk „Dziś” i miesięczny kalendarz z kropkami
 * pod dniami, które mają wpis.
 */
export function initCalendar({ getSelectedDate, onSelectDate }) {
  const trigger = byId('dateTrigger');
  const triggerLabel = byId('dateTriggerLabel');
  const popover = byId('calendarPopover');
  const monthLabel = byId('calMonthLabel');
  const grid = byId('calGrid');
  let viewDate = new Date();

  function buildCell(cellDate, entries) {
    const cellKey = keyFromLocalDate(cellDate);
    const classes = ['cal-day'];
    if (cellDate.getMonth() !== viewDate.getMonth()) classes.push('other-month');
    if (cellKey === todayKey()) classes.push('today');
    if (cellKey === getSelectedDate()) classes.push('selected');
    return h(
      'div',
      { class: classes.join(' '), dataset: { date: cellKey } },
      String(cellDate.getDate()),
      entries[cellKey] && h('span', { class: 'dot' }),
    );
  }

  function renderGrid() {
    const entries = loadEntries();
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    monthLabel.textContent = formatMonthPL(monthKey(year, month + 1));

    const mondayFirstOffset = (new Date(year, month, 1).getDay() + 6) % 7;
    const gridStart = new Date(year, month, 1 - mondayFirstOffset);
    const cells = [];
    for (let i = 0; i < GRID_CELLS; i++) {
      const cellDate = new Date(gridStart);
      cellDate.setDate(gridStart.getDate() + i);
      cells.push(buildCell(cellDate, entries));
    }
    grid.replaceChildren(...cells);
  }

  function open() {
    renderGrid();
    popover.hidden = false;
  }

  function close() {
    popover.hidden = true;
  }

  function shiftMonth(delta) {
    viewDate.setMonth(viewDate.getMonth() + delta);
    renderGrid();
  }

  trigger.addEventListener('click', (event) => {
    event.stopPropagation();
    if (popover.hidden) open();
    else close();
  });
  popover.addEventListener('click', (event) => event.stopPropagation());
  document.addEventListener('click', close);
  byId('calPrev').addEventListener('click', () => shiftMonth(-1));
  byId('calNext').addEventListener('click', () => shiftMonth(1));
  grid.addEventListener('click', (event) => {
    const cell = event.target.closest('.cal-day');
    if (cell) onSelectDate(cell.dataset.date);
  });
  byId('todayBtn').addEventListener('click', () => onSelectDate(todayKey()));

  return {
    close,
    setLabel(text) {
      triggerLabel.textContent = text;
    },
    showMonthOf(key) {
      const { year, month, day } = parseKey(key);
      viewDate = new Date(year, month - 1, day);
    },
  };
}
