import { byId } from './dom.js';

/** Baner nad formularzem: jeden komunikat z jednym przyciskiem akcji. */
export function initNotice({ onAction }) {
  const box = byId('notice');
  const text = byId('noticeText');
  const button = byId('noticeAction');
  button.addEventListener('click', onAction);

  return {
    show({ message, actionLabel }) {
      text.textContent = message;
      button.textContent = actionLabel;
      box.hidden = false;
    },
    hide() {
      box.hidden = true;
    },
  };
}
