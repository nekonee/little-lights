// Czysta logika powrotu do dzisiejszej daty. Bez DOM, bez zegara systemowego i bez localStorage.
// Zachowania T1–T12 wypisane są na początku tests/today-sync.test.js.
import { draftDecision } from './drafts.js';

export const RETURN_THRESHOLD_MS = 10 * 60 * 1000;

/**
 * Co zrobić po powrocie do aplikacji ('return') albo przy sprawdzeniu w trakcie działania ('tick').
 * - 'goToToday': przejdź na dzisiejszy dzień,
 * - 'offerToday': formularz jest rozgrzebany, więc tylko zaproponuj przejście,
 * - 'none': zostaw wybór bez zmian.
 * `refreshLabels` mówi, że dzień się zmienił i trzeba odświeżyć napisy zależne od „dziś”.
 * Powrót z tła przechodzi na dziś także przy rozgrzebanym formularzu, bo szkic zapisał się przy ukryciu aplikacji.
 * @param {{reason: 'return' | 'tick', today: string, lastKnownToday: string, selectedDate: string,
 *   formDirty?: boolean, hiddenMs?: number | null}} input
 * @returns {{action: 'none' | 'goToToday' | 'offerToday', refreshLabels: boolean}}
 */
export function decideSync({
  reason,
  today,
  lastKnownToday,
  selectedDate,
  formDirty = false,
  hiddenMs = 0,
}) {
  if (reason !== 'return' && reason !== 'tick') {
    throw new RangeError(`Nieznany powód sprawdzenia dnia: ${reason}`);
  }
  const dayChanged = today !== lastKnownToday;
  const awayMs = Number.isFinite(hiddenMs) ? hiddenMs : 0;
  let action = 'none';
  if (reason === 'return') {
    const longAway = awayMs >= RETURN_THRESHOLD_MS;
    if ((dayChanged || longAway) && selectedDate !== today) action = 'goToToday';
  } else if (dayChanged && selectedDate === lastKnownToday) {
    action = formDirty ? 'offerToday' : 'goToToday';
  }
  return { action, refreshLabels: dayChanged };
}

/** Milisekundy do następnej północy lokalnej. Dokładnie o północy zwraca cały nowy dzień, nie zero. */
export function msUntilNextDay(now = new Date()) {
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return nextMidnight.getTime() - now.getTime();
}

/**
 * Dzień najnowszego szkicu z innego dnia niż wybrany, do pokazania w banerze, albo null.
 * Szkic pusty albo równy zapisanemu wpisowi nie liczy się. Przy remisie wygrywa późniejszy dzień.
 */
export function findOtherDraft(drafts, entries, selectedDate) {
  let best = null;
  for (const [key, draft] of Object.entries(drafts)) {
    if (key === selectedDate) continue;
    if (draftDecision(draft, entries[key] ?? null) !== 'save') continue;
    const updatedAt = draft.updatedAt ?? 0;
    const better =
      best === null ||
      updatedAt > best.updatedAt ||
      (updatedAt === best.updatedAt && key > best.key);
    if (better) best = { key, updatedAt };
  }
  return best ? best.key : null;
}
