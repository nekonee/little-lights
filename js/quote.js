import { byId } from './dom.js';
import { pickQuote } from './quotes.js';
import { strings } from './strings.js';

export function initQuote() {
  const text = byId('quoteText');
  const show = () => {
    text.textContent = strings.quote(pickQuote());
  };
  show();
  byId('newQuoteBtn').addEventListener('click', show);
}
