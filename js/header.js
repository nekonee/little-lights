import { byId } from './dom.js';
import { formatDatePL, todayKey } from './dates.js';
import { strings } from './strings.js';
import { computeStreak } from './streak-summary.js';

export function renderTodayLabel() {
  byId('todayLabel').textContent = formatDatePL(todayKey());
}

export function renderStreak(entries) {
  byId('streakBadge').textContent = strings.streak(computeStreak(entries));
}
