import { byId, h } from './dom.js';
import {
  BULB_COLORS,
  BULB_RADIUS,
  GLOW_RADIUS,
  SOCKET_HEIGHT,
  SOCKET_WIDTH,
  buildLayout,
} from './garland-model.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgElement(tag, attributes = {}) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  return element;
}

/** Poświata żarówki: miękki gradient w kolorze żarówki (bez filtrów SVG, które są ciężkie na iOS). */
function glowGradients(instance) {
  const defs = svgElement('defs');
  BULB_COLORS.forEach((color, index) => {
    const gradient = svgElement('radialGradient', { id: `glow-${instance}-${index}` });
    gradient.append(
      svgElement('stop', { offset: '0%', 'stop-color': color, 'stop-opacity': 0.6 }),
      svgElement('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': 0 }),
    );
    defs.append(gradient);
  });
  return defs;
}

function buildBulb(bulb, instance) {
  const group = svgElement('g', { class: 'bulb-light' });
  group.style.setProperty('--twinkle-duration', `${bulb.duration}s`);
  group.style.setProperty('--twinkle-delay', `${bulb.delay}s`);
  const colorIndex = BULB_COLORS.indexOf(bulb.color);
  group.append(
    svgElement('circle', {
      cx: bulb.cx,
      cy: bulb.cy,
      r: GLOW_RADIUS,
      fill: `url(#glow-${instance}-${colorIndex})`,
    }),
    svgElement('circle', { cx: bulb.cx, cy: bulb.cy, r: BULB_RADIUS, fill: bulb.color }),
  );
  return group;
}

/** SVG o rozmiarze równym szerokości w pikselach, więc żarówki są kółkami, a nie owalami. */
function buildGarland(layout, instance) {
  const svg = svgElement('svg', { viewBox: `0 0 ${layout.width} ${layout.height}` });
  svg.append(glowGradients(instance));
  for (const swag of layout.swags)
    svg.append(svgElement('path', { class: 'garland-cord', d: swag.path }));
  for (const bulb of layout.bulbs) {
    svg.append(
      svgElement('rect', {
        class: 'garland-socket',
        x: bulb.x - SOCKET_WIDTH / 2,
        y: bulb.y,
        width: SOCKET_WIDTH,
        height: SOCKET_HEIGHT,
        rx: 0.6,
      }),
    );
  }
  for (const bulb of layout.bulbs) svg.append(buildBulb(bulb, instance));
  return svg;
}

function render(container, width) {
  if (width === Number(container.dataset.builtWidth)) return;
  container.dataset.builtWidth = String(width);
  const layout = buildLayout(width, Number(container.dataset.seed));
  container.replaceChildren(
    ...(layout.width ? [buildGarland(layout, container.dataset.seed)] : []),
  );
}

/**
 * Girlanda nad nagłówkiem oraz nad każdym cytatem, kartą i historią. Widoczność steruje CSS motywu.
 * Szerokość jest mierzona w pikselach, więc girlanda przebudowuje się przy obrocie ekranu i zmianie okna,
 * a po przełączeniu na motyw zimowy (z width 0 na właściwą) sama się rysuje. Poza ekranem animacja jest wstrzymana.
 */
export function initGarlands() {
  const containers = [byId('lightsDecor')];
  document.querySelectorAll('.quote, .card, .history').forEach((section) => {
    const container = h('div', { class: 'lights-decor', 'aria-hidden': 'true' });
    section.before(container);
    containers.push(container);
  });
  containers.forEach((container, index) => {
    container.dataset.seed = String(index);
  });

  const sizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) render(entry.target, Math.round(entry.contentRect.width));
  });
  const visibilityObserver = new IntersectionObserver((entries) => {
    for (const entry of entries)
      entry.target.classList.toggle('is-offscreen', !entry.isIntersecting);
  });
  for (const container of containers) {
    sizeObserver.observe(container);
    visibilityObserver.observe(container);
  }
}
