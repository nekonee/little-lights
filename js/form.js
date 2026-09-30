import { byId } from './dom.js';

const GRATEFUL_IDS = ['g1', 'g2', 'g3'];
const TEXT_FIELD_IDS = ['why', 'person', 'proud', 'lesson'];

/** Formularz wpisu: odczyt i wypełnianie pól oraz wskaźnik trybu, przycisk i status. */
export function initForm({ onSave }) {
  const gratefulInputs = GRATEFUL_IDS.map(byId);
  const textInputs = Object.fromEntries(TEXT_FIELD_IDS.map((id) => [id, byId(id)]));
  const indicator = byId('entryIndicator');
  const saveButton = byId('saveBtn');
  const status = byId('status');

  saveButton.addEventListener('click', onSave);

  return {
    /** Wartości z przyciętymi spacjami; puste rzeczy wdzięczności są pomijane. */
    read() {
      return {
        grateful: gratefulInputs.map((input) => input.value.trim()).filter(Boolean),
        why: textInputs.why.value.trim(),
        person: textInputs.person.value.trim(),
        proud: textInputs.proud.value.trim(),
        lesson: textInputs.lesson.value.trim(),
      };
    },

    fill(entry) {
      gratefulInputs.forEach((input, index) => {
        input.value = (entry.grateful && entry.grateful[index]) || '';
      });
      for (const id of TEXT_FIELD_IDS) textInputs[id].value = entry[id] || '';
    },

    clear() {
      gratefulInputs.forEach((input) => {
        input.value = '';
      });
      for (const id of TEXT_FIELD_IDS) textInputs[id].value = '';
    },

    setMode({ indicatorText, saveLabel }) {
      indicator.textContent = indicatorText;
      saveButton.textContent = saveLabel;
    },

    setStatus(text) {
      status.textContent = text;
    },
  };
}
