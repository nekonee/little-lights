// Czysta geometria girlandy świetlnej: łuki sznurka, żarówki, kolory i rytm migotania.
// Bez DOM i bez zegara; wynik zależy tylko od szerokości i ziarna.
// Testy: tests/unit/garland-model.test.js.

// Jedyne kolory spoza motywu: mają wyglądać jak prawdziwe kolorowe lampki.
export const BULB_COLORS = ['#e2483f', '#3fae6a', '#e8c15a', '#5f9bc7', '#e28fc0'];
export const HEIGHT = 40;
export const ANCHOR_Y = 3;
export const SAG_MIN = 10;
export const SAG_MAX = 14;
export const BULB_RADIUS = 4.5;
export const GLOW_RADIUS = 9;
export const SOCKET_WIDTH = 3;
export const SOCKET_HEIGHT = 4;
export const TWINKLE_MIN_S = 2.2;
export const TWINKLE_MAX_S = 3.0;

const BULB_SPACING_PX = 30;
const MIN_BULBS = 3;
const SWAG_WIDTH_PX = 110;
const MIN_SWAGS = 2;
const MAX_SWAGS = 6;

/** Generator liczb z przedziału [0, 1) zależny tylko od ziarna (mulberry32). */
export function seededRandom(seed) {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isUsableWidth(width) {
  return Number.isFinite(width) && width > 0;
}

/** Ile żarówek zmieści się na szerokości (px): około jedna na 30 px, nigdy mniej niż 3. */
export function bulbCount(width) {
  if (!isUsableWidth(width)) return 0;
  return Math.max(MIN_BULBS, Math.round(width / BULB_SPACING_PX));
}

/** Ile zawieszeń (łuków sznurka) ma girlanda o danej szerokości: około jedno na 110 px, od 2 do 6. */
export function swagCount(width) {
  if (!isUsableWidth(width)) return 0;
  return Math.min(MAX_SWAGS, Math.max(MIN_SWAGS, Math.round(width / SWAG_WIDTH_PX)));
}

const round1 = (value) => Math.round(value * 10) / 10;
const round2 = (value) => Math.round(value * 100) / 100;

/** Kolejny kolor inny niż poprzedni, żeby sąsiednie żarówki nigdy nie były identyczne. */
function nextColorIndex(previous, random) {
  return (previous + 1 + Math.floor(random() * (BULB_COLORS.length - 1))) % BULB_COLORS.length;
}

/**
 * Układ girlandy dla szerokości w pikselach: łuki sznurka (krzywe Béziera od krawędzi do krawędzi)
 * i żarówki wiszące pod nimi na oprawkach. Żarówki leżą równo na łuku, pomijając punkty zaczepienia.
 * @returns {{width: number, height: number,
 *   swags: {x0: number, x1: number, cx: number, cy: number, path: string}[],
 *   bulbs: {swag: number, x: number, y: number, cx: number, cy: number,
 *     color: string, duration: number, delay: number}[]}}
 */
export function buildLayout(width, seed) {
  if (!isUsableWidth(width)) return { width: 0, height: HEIGHT, swags: [], bulbs: [] };
  const random = seededRandom(seed);
  const swagTotal = swagCount(width);
  const bulbTotal = bulbCount(width);

  const swags = [];
  for (let k = 0; k < swagTotal; k++) {
    const x0 = round1((width * k) / swagTotal);
    const x1 = round1((width * (k + 1)) / swagTotal);
    const sag = SAG_MIN + random() * (SAG_MAX - SAG_MIN);
    const cx = round1((x0 + x1) / 2);
    const cy = round1(ANCHOR_Y + 2 * sag);
    swags.push({ x0, x1, cx, cy, path: `M${x0},${ANCHOR_Y} Q${cx},${cy} ${x1},${ANCHOR_Y}` });
  }

  const bulbs = [];
  let colorIndex = Math.floor(random() * BULB_COLORS.length);
  swags.forEach((swag, k) => {
    const inThisSwag = Math.floor(bulbTotal / swagTotal) + (k < bulbTotal % swagTotal ? 1 : 0);
    for (let i = 0; i < inThisSwag; i++) {
      const t = (i + 0.5) / inThisSwag;
      const x = (1 - t) * (1 - t) * swag.x0 + 2 * (1 - t) * t * swag.cx + t * t * swag.x1;
      const y = (1 - t) * (1 - t) * ANCHOR_Y + 2 * (1 - t) * t * swag.cy + t * t * ANCHOR_Y;
      const duration = round2(TWINKLE_MIN_S + random() * (TWINKLE_MAX_S - TWINKLE_MIN_S));
      bulbs.push({
        swag: k,
        x: round1(x),
        y: round1(y),
        cx: round1(x),
        cy: round1(y + SOCKET_HEIGHT + BULB_RADIUS - 1),
        color: BULB_COLORS[colorIndex],
        duration,
        delay: -round2(random() * duration),
      });
      colorIndex = nextColorIndex(colorIndex, random);
    }
  });
  return { width, height: HEIGHT, swags, bulbs };
}
