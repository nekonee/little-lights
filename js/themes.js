import { byId } from './dom.js';
import { loadTheme, saveTheme } from './store.js';
import { APP_TITLE } from './strings.js';

const DEFAULT_THEME = 'jesien-jasny';
const DEFAULT_EMOJI = '🍂';
const SEASON_EMOJI = { jesien: '🍂', zima: '❄️', wiosna: '🌿', lato: '🌊' };

export function initThemes() {
  const select = byId('themeSelect');
  const heading = document.querySelector('h1');

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    select.value = theme;
    const season = theme.split('-')[0];
    const emoji = SEASON_EMOJI[season] || DEFAULT_EMOJI;
    heading.textContent = `${emoji} ${APP_TITLE}`;
    document.title = `${emoji} ${APP_TITLE}`;
  }

  applyTheme(loadTheme() || DEFAULT_THEME);
  select.addEventListener('change', () => {
    saveTheme(select.value);
    applyTheme(select.value);
  });
}
