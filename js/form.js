import { byId } from './dom.js';

const GRATEFUL_IDS = ['g1', 'g2', 'g3'];
const TEXT_FIELD_IDS = ['why', 'person', 'proud', 'lesson'];

/** Formularz wpisu: odczyt i wypełnianie pól oraz wskaźnik trybu, przycisk i status. */
export function initForm({ onSave, onInput, onDiscard }) {
  const gratefulInputs = GRATEFUL_IDS.map(byId);
  const textInputs = Object.fromEntries(TEXT_FIELD_IDS.map((id) => [id, byId(id)]));
  const indicator = byId('entryIndicator');
  const saveButton = byId('saveBtn');
  const status = byId('status');
  const discardButton = byId('discardDraftBtn');

  saveButton.addEventListener('click', onSave);
  discardButton.addEventListener('click', onDiscard);
  for (const input of [...gratefulInputs, ...Object.values(textInputs)]) {
    input.addEventListener('input', onInput);
  }

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

    /** Surowe wartości pól na swoich miejscach (bez przycinania), do szkicu. */
    readRaw() {
      return {
        grateful: gratefulInputs.map((input) => input.value),
        why: textInputs.why.value,
        person: textInputs.person.value,
        proud: textInputs.proud.value,
        lesson: textInputs.lesson.value,
      };
    },

    fill(fields) {
      gratefulInputs.forEach((input, index) => {
        input.value = (fields.grateful && fields.grateful[index]) || '';
      });
      for (const id of TEXT_FIELD_IDS) textInputs[id].value = fields[id] || '';
    },

    setMode({ indicatorText, saveLabel, showDiscard }) {
      indicator.textContent = indicatorText;
      saveButton.textContent = saveLabel;
      discardButton.hidden = !showDiscard;
    },

    setStatus(text) {
      status.textContent = text;
    },
  };
}
