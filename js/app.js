import { initBackupPanel } from './backup-panel.js';
import { initCalendar } from './calendar.js';
import { formatDatePL, todayKey } from './dates.js';
import { byId } from './dom.js';
import { createDraftSync } from './draft-sync.js';
import { afterImport, chooseFormSource, formMode, updateDrafts, withoutDraft } from './drafts.js';
import { initForm } from './form.js';
import { initGarlands } from './garland.js';
import { renderStreak, renderTodayLabel } from './header.js';
import { initHistory } from './history.js';
import { initQuote } from './quote.js';
import { loadDrafts, loadEntries, saveDrafts, saveEntries } from './store.js';
import { strings } from './strings.js';
import { initSummary } from './summary.js';
import { initThemes } from './themes.js';

/**
 * selectedDate: dzień w formularzu. baseline: zapisany wpis, z którym formularz został wczytany
 * (null, gdy dnia jeszcze nie ma), czyli punkt odniesienia dla szkicu. hasDraft: czy dla tego dnia
 * jest szkic.
 */
const state = { selectedDate: todayKey(), baseline: null, hasDraft: false };

const form = initForm({
  onSave: saveEntry,
  onInput: () => draftSync.schedule(),
  onDiscard: discardDraft,
});
const draftSync = createDraftSync({ persist: persistDraft });
const calendar = initCalendar({ selected: state.selectedDate, onSelectDate: showDate });
const history = initHistory({ onEdit: editEntry, onDelete: deleteEntry });
const summary = initSummary();

function refreshAll() {
  const entries = loadEntries();
  calendar.setEntries(entries, loadDrafts());
  history.render(entries);
  renderStreak(entries);
  summary.refresh(entries);
}

function renderMode() {
  form.setMode(
    formMode({
      hasSaved: state.baseline !== null,
      hasDraft: state.hasDraft,
      isToday: state.selectedDate === todayKey(),
    }),
  );
}

/** Zapisuje albo usuwa szkic wybranego dnia, zależnie od tego, czy formularz różni się od wpisu. */
function persistDraft() {
  const drafts = loadDrafts();
  const next = updateDrafts(drafts, state.selectedDate, form.readRaw(), state.baseline, Date.now());
  if (next !== drafts) {
    try {
      saveDrafts(next);
    } catch {
      form.setStatus(strings.form.draftSaveFailed);
      return;
    }
  }
  state.hasDraft = Object.hasOwn(next, state.selectedDate);
  renderMode();
  calendar.setEntries(loadEntries(), next);
}

function removeDraftOf(dateKey) {
  const drafts = loadDrafts();
  const next = withoutDraft(drafts, dateKey);
  if (next === drafts) return;
  try {
    saveDrafts(next);
  } catch {
    form.setStatus(strings.form.draftSaveFailed);
  }
}

function loadFormForDate() {
  const saved = loadEntries()[state.selectedDate];
  const { source, fields, staleDraft } = chooseFormSource(saved, loadDrafts()[state.selectedDate]);
  if (staleDraft) removeDraftOf(state.selectedDate);
  state.baseline = saved ?? null;
  state.hasDraft = source === 'draft';
  form.fill(fields);
  renderMode();
  form.setStatus('');
}

function showDate(dateKey) {
  draftSync.flush();
  state.selectedDate = dateKey;
  loadFormForDate();
  refreshAll();
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
  draftSync.cancel();
  removeDraftOf(state.selectedDate);
  form.setStatus(strings.form.saved);
  loadFormForDate();
  refreshAll();
}

function discardDraft() {
  if (!confirm(strings.form.confirmDiscard)) return;
  draftSync.cancel();
  removeDraftOf(state.selectedDate);
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
  if (date === state.selectedDate) draftSync.cancel();
  removeDraftOf(date);
  if (date === state.selectedDate) loadFormForDate();
  refreshAll();
}

function handleImported() {
  const { action, warn } = afterImport({
    formFields: form.readRaw(),
    baseline: state.baseline,
    newSaved: loadEntries()[state.selectedDate],
  });
  if (action === 'reload') {
    draftSync.cancel();
    loadFormForDate();
  } else if (warn) {
    form.setStatus(strings.backup.importKeptForm);
  }
  refreshAll();
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') draftSync.flush();
});
window.addEventListener('pagehide', () => draftSync.flush());

byId('todayBtn').addEventListener('click', goToToday);
renderTodayLabel();
initThemes();
initGarlands();
initQuote();
initBackupPanel({ onImported: handleImported });
loadFormForDate();
refreshAll();
