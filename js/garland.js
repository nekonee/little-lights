import { byId, h } from './dom.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const WIDTH = 640;
const HEIGHT = 34;
const BULB_COUNT = 14;
const BULB_RADIUS = 4.5;
const WAVE_AMPLITUDE = 10;
const WAVE_PHASE = 1.15;
const TWINKLE_STEP_SECONDS = 0.18;
const TWINKLE_STEPS = 8;
// Jedyne kolory spoza motywu — mają wyglądać jak prawdziwe kolorowe lampki.
const BULB_COLORS = ['#e2483f', '#3fae6a', '#e8c15a', '#5f9bc7', '#e28fc0'];

function svgElement(tag, attributes) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  return element;
}

/** @param {number} seed przesuwa fazę fali i kolory, żeby girlandy nie były identyczne */
function buildGarland(seed) {
  const svg = svgElement('svg', {
    viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
    preserveAspectRatio: 'none',
  });
  let pathData = `M0,${HEIGHT / 2}`;
  const bulbs = [];
  for (let i = 0; i <= BULB_COUNT; i++) {
    const x = (WIDTH / BULB_COUNT) * i;
    const y = HEIGHT / 2 + Math.sin(i * WAVE_PHASE + seed) * WAVE_AMPLITUDE;
    pathData += ` L${x.toFixed(1)},${y.toFixed(1)}`;
    if (i < BULB_COUNT) {
      const bulb = svgElement('circle', {
        class: 'bulb',
        cx: x.toFixed(1),
        cy: y.toFixed(1),
        r: BULB_RADIUS,
        fill: BULB_COLORS[(i + seed) % BULB_COLORS.length],
      });
      bulb.style.animationDelay = `${((i + seed) % TWINKLE_STEPS) * TWINKLE_STEP_SECONDS}s`;
      bulbs.push(bulb);
    }
  }
  svg.append(
    svgElement('path', {
      d: pathData,
      fill: 'none',
      stroke: 'var(--border)',
      'stroke-width': 1.5,
      opacity: 0.6,
    }),
    ...bulbs,
  );
  return svg;
}

function garlandContainer(seed) {
  return h('div', { class: 'lights-decor', 'aria-hidden': 'true' }, buildGarland(seed));
}

/** Girlanda nad nagłówkiem oraz nad każdym cytatem, kartą i historią. Widoczność steruje CSS motywu. */
export function initGarlands() {
  byId('lightsDecor').append(buildGarland(0));
  document.querySelectorAll('.quote, .card, .history').forEach((section, index) => {
    section.before(garlandContainer(index + 1));
  });
}
