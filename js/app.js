import { initBackupPanel } from './backup-panel.js';
import { initCalendar } from './calendar.js';
import { formatDatePL, todayKey } from './dates.js';
import { byId } from './dom.js';
import { initForm } from './form.js';
import { initGarlands } from './garland.js';
import { renderStreak, renderTodayLabel } from './header.js';
import { initHistory } from './history.js';
import { initQuote } from './quote.js';
import { loadEntries, saveEntries } from './store.js';
import { strings } from './strings.js';
import { initSummary } from './summary.js';
import { initThemes } from './themes.js';

const state = { selectedDate: todayKey() };

const form = initForm({ onSave: saveEntry });
const calendar = initCalendar({ selected: state.selectedDate, onSelectDate: showDate });
const history = initHistory({ onEdit: editEntry, onDelete: deleteEntry });
const summary = initSummary();

function refreshAll() {
  const entries = loadEntries();
  calendar.setEntries(entries);
  history.render(entries);
  renderStreak(entries);
  summary.refresh(entries);
}

function loadFormForDate() {
  const existing = loadEntries()[state.selectedDate];
  if (existing) form.fill(existing);
  else form.clear();

  const isToday = state.selectedDate === todayKey();
  form.setMode({
    indicatorText: existing
      ? strings.form.editingExisting
      : isToday
        ? strings.form.newForToday
        : strings.form.newForOtherDay,
    saveLabel: existing ? strings.form.saveExisting : strings.form.saveNew,
  });
  form.setStatus('');
}

function showDate(dateKey) {
  state.selectedDate = dateKey;
  loadFormForDate();
}

function goToToday() {
  calendar.goToToday();
}

function saveEntry() {
  const fields = form.read();
  if (fields.grateful.length === 0) {
    form.setStatus(strings.form.needOneGratitude);
    return;
  }
  const entries = loadEntries();
  entries[state.selectedDate] = { date: state.selectedDate, ...fields, savedAt: Date.now() };
  try {
    saveEntries(entries);
  } catch {
    form.setStatus(strings.form.saveFailed);
    return;
  }
  form.setStatus(strings.form.saved);
  loadFormForDate();
  refreshAll();
}

function editEntry(date) {
  if (!calendar.select(date)) return;
  showDate(date);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteEntry(date) {
  if (!confirm(strings.history.confirmDelete(formatDatePL(date)))) return;
  const entries = loadEntries();
  delete entries[date];
  saveEntries(entries);
  refreshAll();
}

byId('todayBtn').addEventListener('click', goToToday);
renderTodayLabel();
initThemes();
initGarlands();
initQuote();
initBackupPanel({ onImported: refreshAll });
loadFormForDate();
refreshAll();
