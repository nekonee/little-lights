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

  form: {
    editingExisting: '✏️ Edytujesz istniejący wpis z tego dnia',
    newForToday: '🆕 Nowy wpis na dziś',
    newForOtherDay: '🆕 Nowy wpis na wybrany dzień',
    saveNew: 'Zapisz wpis',
    saveExisting: 'Zapisz zmiany',
    needOneGratitude: 'Wpisz przynajmniej jedną rzecz, za którą jesteś wdzięczna 🌱',
    saved: 'Zapisano ✓',
    saveFailed: 'Nie udało się zapisać w tej przeglądarce.',
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
    confirmDelete: (date) => `Usunąć wpis z ${date}?`,
  },

  backup: {
    exported: 'Pobrano kopię zapasową ✓',
    imported: 'Wczytano kopię zapasową ✓ (wpisy scalone z obecnymi)',
    importFailed: 'Nie udało się wczytać pliku — sprawdź, czy to poprawna kopia zapasowa.',
  },
};
