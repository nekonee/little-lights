import {
  backupFilename,
  backupStatus,
  mergeEntries,
  parseBackup,
  sanitizeEntries,
  serializeEntries,
} from './backup.js';
import { todayKey } from './dates.js';
import { byId } from './dom.js';
import { isShareCancelled, pickExportMethod } from './share.js';
import { strings } from './strings.js';
import { loadEntries, loadLastBackup, saveEntries, saveLastBackup } from './store.js';

function downloadFile(file) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Prosi przeglądarkę o trwały magazyn (mniejsze ryzyko skasowania danych); odpowiedź nic nie zmienia. */
function requestPersistentStorage() {
  try {
    navigator.storage?.persist?.()?.catch(() => {});
  } catch {
    // brak wsparcia nie szkodzi
  }
}

/** Eksport wszystkich wpisów (okno udostępniania albo pobranie) i import ze scaleniem „nowszy wygrywa”. */
export function initBackupPanel({ onImported }) {
  const status = byId('backupStatus');
  const lastBackupLabel = byId('lastBackup');
  const fileInput = byId('importFile');

  function refresh(entries) {
    lastBackupLabel.textContent = strings.backup.lastBackup(
      backupStatus({
        entryCount: Object.keys(entries).length,
        lastBackup: loadLastBackup(),
        today: todayKey(),
      }),
    );
  }

  function markBackupDone() {
    try {
      saveLastBackup(todayKey());
    } catch {
      // licznik jest dodatkiem, brak zapisu nie może psuć eksportu
    }
    refresh(loadEntries());
  }

  function download(file) {
    downloadFile(file);
    status.textContent = strings.backup.exported;
    markBackupDone();
  }

  // iOS wymaga, by navigator.share ruszył synchronicznie z kliknięcia: przed nim nie wolno użyć await.
  byId('exportBtn').addEventListener('click', () => {
    const file = new File([serializeEntries(loadEntries())], backupFilename(todayKey()), {
      type: 'application/json',
    });
    if (pickExportMethod(navigator, file) === 'download') {
      download(file);
      return;
    }
    navigator
      .share({ files: [file] })
      .then(() => {
        status.textContent = strings.backup.shared;
        markBackupDone();
      })
      .catch((error) => {
        if (isShareCancelled(error)) status.textContent = '';
        else download(file);
      });
  });

  fileInput.addEventListener('change', () => {
    const [file] = fileInput.files;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let message;
      try {
        const { entries, skipped } = sanitizeEntries(parseBackup(reader.result));
        const merged = mergeEntries(loadEntries(), entries);
        saveEntries(merged.entries);
        message = strings.backup.imported({ ...merged, skipped });
      } catch {
        status.textContent = strings.backup.importFailed;
        return;
      }
      onImported();
      status.textContent = message;
    };
    reader.readAsText(file);
    fileInput.value = '';
  });

  requestPersistentStorage();
  return { refresh };
}
