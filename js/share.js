// Wybór sposobu eksportu kopii. Okno udostępniania (mail, Pliki, AirDrop) działa na iPhonie lepiej
// niż pobranie linkiem, ale tylko gdy przeglądarka potwierdzi, że umie udostępnić plik.

/**
 * @param {{share?: Function, canShare?: Function} | null | undefined} nav zwykle `navigator`
 * @param {File} file plik kopii
 * @returns {'share' | 'download'}
 */
export function pickExportMethod(nav, file) {
  if (typeof nav?.share !== 'function' || typeof nav?.canShare !== 'function') return 'download';
  try {
    return nav.canShare({ files: [file] }) === true ? 'share' : 'download';
  } catch {
    return 'download';
  }
}

/** Zamknięcie okna udostępniania bez wyboru to decyzja użytkowniczki, nie błąd. */
export function isShareCancelled(error) {
  return error?.name === 'AbortError';
}
