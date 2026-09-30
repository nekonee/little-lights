/** @param {string} id */
export function byId(id) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Brak elementu #${id} w index.html`);
  return element;
}

/**
 * Tworzy element DOM. Teksty trafiają do węzłów tekstowych, więc nie wymagają escape'owania.
 * Atrybuty: `class`, `dataset` (obiekt) i zwykłe atrybuty HTML; wartości null/undefined/false są pomijane,
 * podobnie jak puste dzieci (null/undefined/false), co pozwala pisać `warunek && h(...)`.
 * @param {string} tag
 * @param {Record<string, any>} [attributes]
 * @param {...(Node | string | null | undefined | false)} children
 */
export function h(tag, attributes = {}, ...children) {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (value === null || value === undefined || value === false) continue;
    if (name === 'class') element.className = value;
    else if (name === 'dataset') Object.assign(element.dataset, value);
    else element.setAttribute(name, value === true ? '' : value);
  }
  element.append(
    ...children.filter((child) => child !== null && child !== undefined && child !== false),
  );
  return element;
}
