import { byId, h } from './dom.js';
import { formatMonthPL, monthOf, todayKey } from './dates.js';
import { strings } from './strings.js';
import { listMonths, summarizeMonth } from './streak-summary.js';

function buildSummary(summary) {
  const blocks = [
    h(
      'div',
      { class: 'hint summary-stats' },
      strings.summary.headline(summary.count, summary.longestStreak),
    ),
  ];
  if (summary.topPeople.length) {
    const people = summary.topPeople.map(([name, count]) => `${name} (${count})`).join(', ');
    blocks.push(
      h(
        'div',
        { class: 'summary-people' },
        h('strong', {}, strings.summary.topPeople),
        ` ${people}`,
      ),
    );
  }
  if (summary.highlights.length) {
    blocks.push(
      h(
        'div',
        {},
        h('strong', {}, strings.summary.highlights),
        h('ul', { class: 'summary-list' }, ...summary.highlights.map((text) => h('li', {}, text))),
      ),
    );
  }
  return blocks;
}

/** Podsumowanie wybranego miesiąca: liczba wpisów, seria, osoby i losowe chwile. */
export function initSummary() {
  const monthSelect = byId('monthSelect');
  const content = byId('summaryContent');
  let entries = {};

  function renderMonthOptions() {
    const currentMonth = monthOf(todayKey());
    const options = listMonths(entries, currentMonth).map((month) =>
      h('option', { value: month }, formatMonthPL(month)),
    );
    monthSelect.replaceChildren(...options);
    monthSelect.value = currentMonth;
  }

  function renderSummary() {
    const summary = summarizeMonth(entries, monthSelect.value);
    content.replaceChildren(
      ...(summary
        ? buildSummary(summary)
        : [h('div', { class: 'empty empty--compact' }, strings.summary.empty)]),
    );
  }

  monthSelect.addEventListener('change', renderSummary);

  return {
    refresh(nextEntries) {
      entries = nextEntries;
      renderMonthOptions();
      renderSummary();
    },
  };
}
