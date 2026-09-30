export function serializeEntries(entries) {
  return JSON.stringify(entries, null, 2);
}

export function backupFilename(dateKey) {
  return `kopia-dziennika-wdziecznosci-${dateKey}.json`;
}

/**
 * Zamienia tekst pliku kopii zapasowej na obiekt wpisów kluczowany datą.
 * @throws {Error} gdy tekst nie jest poprawnym JSON-em albo nie jest obiektem
 */
export function parseBackup(text) {
  const imported = JSON.parse(text);
  if (typeof imported !== 'object' || Array.isArray(imported)) {
    throw new Error('Kopia zapasowa musi być obiektem wpisów');
  }
  return imported;
}

// Zachowanie z prototypu: wpis z pliku zawsze zastępuje obecny z tą samą datą.
// Do zastąpienia zasadą „nowszy wygrywa” (docs/plan.json, punkt 14).
export function mergeEntries(current, imported) {
  return Object.assign({}, current, imported);
}
