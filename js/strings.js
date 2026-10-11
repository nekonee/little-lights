export const APP_TITLE = 'Dziennik Wdzięczności';

function pluralize(count, one, many) {
  return count === 1 ? one : many;
}

export const strings = {
  quote: (text) => `„${text}”`,

  streak: (days) =>
    days > 0
      ? `🔥 ${days} ${pluralize(days, 'dzień', 'dni')} z rzędu`
      : '🌱 zacznij dziś swoją serię',

  calendar: {
    entrySaved: 'wpis zapisany',
    draftUnsaved: 'szkic niezapisany',
    draftOfEntry: 'szkic zmian',
  },

  notice: {
    newDay: '🌅 Jest już nowy dzień.',
    goToToday: 'Przejdź do dziś',
    otherDraft: (dateLabel) => `📝 Masz niezapisany szkic z dnia ${dateLabel}.`,
    openDraft: 'Otwórz',
  },

  form: {
    editingExisting: '✏️ Edytujesz istniejący wpis z tego dnia',
    newForToday: '🆕 Nowy wpis na dziś',
    newForOtherDay: '🆕 Nowy wpis na wybrany dzień',
    saveNew: 'Zapisz wpis',
    saveExisting: 'Zapisz zmiany',
    needOneGratitude: 'Wpisz przynajmniej jedną rzecz, za którą jesteś wdzięczna 🌱',
    saved: 'Zapisano ✓',
    saveFailed: 'Nie udało się zapisać w tej przeglądarce.',
    draftNew: '📝 Szkic — jeszcze niezapisany',
    draftOfExisting: '📝 Szkic zmian — wpis z tego dnia nie jest jeszcze zaktualizowany',
    discardDraft: 'Odrzuć szkic',
    confirmDiscard: 'Odrzucić szkic? Wpisany tekst zostanie usunięty.',
    draftSaveFailed: 'Nie udało się zapisać szkicu w tej przeglądarce.',
  },

  summary: {
    empty: 'Brak wpisów w tym miesiącu.',
    headline: (count, longestStreak) =>
      `📝 ${count} ${pluralize(count, 'wpis', 'wpisów')}` +
      ` • 🔥 najdłuższa seria: ${longestStreak} ${pluralize(longestStreak, 'dzień', 'dni')}`,
    topPeople: 'Najczęściej doceniani:',
    highlights: 'Kilka chwil z tego miesiąca:',
  },

  history: {
    empty: 'Brak wpisów — Twój pierwszy wpis pojawi się tutaj po zapisaniu.',
    datePrefix: '🍁 ',
    person: 'Doceniam: ',
    proud: 'Duma: ',
    lesson: 'Lekcja: ',
    edit: 'edytuj',
    remove: 'usuń',
    confirmDelete: (dateLabel) => `Usunąć wpis?\n${dateLabel}`,
  },

  backup: {
    exported: 'Pobrano kopię zapasową ✓',
    shared: 'Kopia zapasowa gotowa ✓',
    imported: ({ added, updated, unchanged, skipped }) =>
      (added + updated + unchanged === 0
        ? 'W pliku nie ma wpisów do wczytania'
        : `Wczytano kopię zapasową ✓ Dodano: ${added}, zaktualizowano: ${updated}, bez zmian: ${unchanged}`) +
      (skipped > 0 ? `. Pominięto nieprawidłowe wpisy: ${skipped}` : ''),
    lastBackup: (status) => {
      if (status.kind === 'never') return 'Jeszcze nie robiłaś kopii zapasowej';
      if (status.kind !== 'done') return '';
      if (status.days === 0) return 'Ostatnia kopia: dziś';
      if (status.days === 1) return 'Ostatnia kopia: wczoraj';
      return `Ostatnia kopia: ${status.days} dni temu`;
    },
    importKeptForm:
      'Import zmienił wpis z tego dnia, a w formularzu masz niezapisane zmiany. Zapis nadpisze zaimportowany wpis.',
    importFailed: 'Nie udało się wczytać pliku — sprawdź, czy to poprawna kopia zapasowa.',
  },
};
