import { initBackupPanel } from './backup-panel.js';
import { initCalendar } from './calendar.js';
import { formatDatePL, todayKey } from './dates.js';
import { byId } from './dom.js';
import { createDraftSync } from './draft-sync.js';
import {
  afterImport,
  chooseFormSource,
  draftDecision,
  formMode,
  updateDrafts,
  withoutDraft,
} from './drafts.js';
import { initForm } from './form.js';
import { initGarlands } from './garland.js';
import { renderStreak, renderTodayLabel } from './header.js';
import { initHistory } from './history.js';
import { initNotice } from './notice.js';
import { initQuote } from './quote.js';
import { loadDrafts, loadEntries, saveDrafts, saveEntries } from './store.js';
import { strings } from './strings.js';
import { initSummary } from './summary.js';
import { initThemes } from './themes.js';
import { decideSync, findOtherDraft, msUntilNextDay } from './today-sync.js';

/**
 * selectedDate: dzień w formularzu. baseline: zapisany wpis, z którym formularz został wczytany
 * (null, gdy dnia jeszcze nie ma), czyli punkt odniesienia dla szkicu. hasDraft: czy dla tego dnia
 * jest szkic.
 */
const state = { selectedDate: todayKey(), baseline: null, hasDraft: false, notice: null };
const MIDNIGHT_MARGIN_MS = 1000;
let lastKnownToday = todayKey();
let hiddenAt = null;
let midnightTimer = null;

const form = initForm({
  onSave: saveEntry,
  onInput: () => draftSync.schedule(),
  onDiscard: discardDraft,
});
const draftSync = createDraftSync({ persist: persistDraft });
const calendar = initCalendar({ selected: state.selectedDate, onSelectDate: showDate });
const history = initHistory({ onEdit: editEntry, onDelete: deleteEntry });
const summary = initSummary();
const notice = initNotice({ onAction: handleNoticeAction });

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
  if (state.notice?.kind === 'draft') state.notice = null;
  loadFormForDate();
  refreshAll();
  renderNotice();
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

function formDirty() {
  return draftDecision(form.readRaw(), state.baseline) === 'save';
}

/** Baner: „Jest już nowy dzień” (do czasu przejścia na dziś) albo szkic z innego dnia (do czasu nawigacji). */
function renderNotice() {
  if (state.notice?.kind === 'newDay' && state.selectedDate === todayKey()) state.notice = null;
  if (!state.notice) {
    notice.hide();
  } else if (state.notice.kind === 'newDay') {
    notice.show({ message: strings.notice.newDay, actionLabel: strings.notice.goToToday });
  } else {
    const label = formatDatePL(state.notice.date);
    notice.show({
      message: strings.notice.otherDraft(label),
      actionLabel: strings.notice.openDraft,
    });
  }
}

function offerOtherDraft() {
  const date = findOtherDraft(loadDrafts(), loadEntries(), state.selectedDate);
  state.notice = date ? { kind: 'draft', date } : null;
}

function handleNoticeAction() {
  if (state.notice?.kind === 'newDay') {
    goToToday();
    offerOtherDraft();
    renderNotice();
  } else if (state.notice?.kind === 'draft') {
    editEntry(state.notice.date);
  }
}

/** Sprawdza, czy zmienił się dzień albo czy aplikacja długo była w tle, i w razie potrzeby przechodzi na dziś. */
function syncToday(reason, hiddenMs = 0) {
  const today = todayKey();
  const { action, refreshLabels } = decideSync({
    reason,
    today,
    lastKnownToday,
    selectedDate: state.selectedDate,
    formDirty: formDirty(),
    hiddenMs,
  });
  if (refreshLabels) {
    lastKnownToday = today;
    renderTodayLabel();
    renderMode();
    calendar.refresh();
    refreshAll();
  }
  if (action === 'goToToday') {
    goToToday();
    offerOtherDraft();
  } else if (action === 'offerToday') {
    state.notice = { kind: 'newDay' };
  }
  renderNotice();
}

/** iOS usypia timery w tle, więc timer tylko przypomina o północy, a źródłem są zdarzenia powrotu. */
function scheduleMidnightCheck() {
  clearTimeout(midnightTimer);
  midnightTimer = setTimeout(() => {
    syncToday('tick');
    scheduleMidnightCheck();
  }, msUntilNextDay() + MIDNIGHT_MARGIN_MS);
}

function handleHide() {
  hiddenAt = Date.now();
  draftSync.flush();
}

function handleReturn() {
  const hiddenMs = hiddenAt === null ? 0 : Date.now() - hiddenAt;
  hiddenAt = null;
  syncToday('return', hiddenMs);
  scheduleMidnightCheck();
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') handleHide();
  else handleReturn();
});
window.addEventListener('pagehide', handleHide);
window.addEventListener('pageshow', (event) => {
  if (event.persisted) handleReturn();
});

byId('todayBtn').addEventListener('click', goToToday);
renderTodayLabel();
initThemes();
initGarlands();
initQuote();
initBackupPanel({ onImported: handleImported });
loadFormForDate();
refreshAll();
offerOtherDraft();
renderNotice();
scheduleMidnightCheck();
