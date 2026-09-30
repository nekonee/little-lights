import { byId } from './dom.js';
import { formatTodayLabel } from './dates.js';
import { strings } from './strings.js';
import { computeStreak } from './streak-summary.js';

export function renderTodayLabel() {
  byId('todayLabel').textContent = formatTodayLabel();
}

export function renderStreak(entries) {
  byId('streakBadge').textContent = strings.streak(computeStreak(entries));
}
