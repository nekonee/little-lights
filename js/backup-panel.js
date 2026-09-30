import { backupFilename, mergeEntries, parseBackup, serializeEntries } from './backup.js';
import { todayKey } from './dates.js';
import { byId } from './dom.js';
import { strings } from './strings.js';
import { loadEntries, saveEntries } from './store.js';

function downloadJson(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Eksport wszystkich wpisów do pliku JSON i import z scaleniem z obecnymi. */
export function initBackupPanel({ onImported }) {
  const status = byId('backupStatus');
  const fileInput = byId('importFile');

  byId('exportBtn').addEventListener('click', () => {
    downloadJson(backupFilename(todayKey()), serializeEntries(loadEntries()));
    status.textContent = strings.backup.exported;
  });

  fileInput.addEventListener('change', () => {
    const [file] = fileInput.files;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        saveEntries(mergeEntries(loadEntries(), parseBackup(reader.result)));
      } catch {
        status.textContent = strings.backup.importFailed;
        return;
      }
      onImported();
      status.textContent = strings.backup.imported;
    };
    reader.readAsText(file);
    fileInput.value = '';
  });
}
