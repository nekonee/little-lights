import { byId, h } from './dom.js';
import { strings } from './strings.js';

function summarizeExtras(entry) {
  let extra = '';
  if (entry.person) extra += `${strings.history.person}${entry.person}. `;
  if (entry.proud) extra += `${strings.history.proud}${entry.proud}. `;
  if (entry.lesson) extra += `${strings.history.lesson}${entry.lesson}.`;
  return extra;
}

function buildEntryCard(date, entry) {
  const extra = summarizeExtras(entry);
  return h(
    'div',
    { class: 'entry' },
    h(
      'div',
      { class: 'entry-actions' },
      h('button', { class: 'edit', dataset: { date } }, strings.history.edit),
      h('button', { class: 'del', dataset: { date } }, strings.history.remove),
    ),
    h('div', { class: 'd' }, strings.history.datePrefix + date),
    h('ul', {}, ...(entry.grateful || []).map((text) => h('li', {}, text))),
    extra ? h('div', { class: 'extra' }, extra) : null,
  );
}

/** Lista poprzednich wpisów, od najnowszego, z przyciskami edycji i usuwania. */
export function initHistory({ onEdit, onDelete }) {
  const list = byId('historyList');

  list.addEventListener('click', (event) => {
    const editButton = event.target.closest('.edit');
    const deleteButton = event.target.closest('.del');
    if (editButton) onEdit(editButton.dataset.date);
    else if (deleteButton) onDelete(deleteButton.dataset.date);
  });

  return {
    render(entries) {
      const dates = Object.keys(entries).sort().reverse();
      if (!dates.length) {
        list.className = 'empty';
        list.textContent = strings.history.empty;
        return;
      }
      list.className = '';
      list.replaceChildren(...dates.map((date) => buildEntryCard(date, entries[date])));
    },
  };
}
