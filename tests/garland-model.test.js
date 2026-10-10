// Zachowania girlandy (G1–G12). Numer G jest na początku nazwy testu, który go sprawdza.
//
//  G1: Liczba żarówek zależy od szerokości (ok. jedna na 30 px, minimum 3), a dla szerokości 0 jest zerem.
//  G2: Liczba zawieszeń zależy od szerokości (ok. jedno na 110 px, od 2 do 6).
//  G3: Sznurek wisi od krawędzi do krawędzi: pierwszy łuk zaczyna się w x=0, ostatni kończy w x=szerokość,
//      a kolejne łuki łączą się w tym samym punkcie zaczepienia.
//  G4: Każdy łuk to krzywa Béziera (Q) ze zwisem od 10 do 14 px.
//  G5: Żarówki wiszą na łukach: równomiernie, symetrycznie i nigdy dokładnie na punkcie zaczepienia.
//  G6: Żarówki są rozdzielone między łuki po równo (różnica najwyżej o jedną).
//  G7: Żarówka z poświatą mieści się w obszarze girlandy (poziomo i pionowo).
//  G8: Sąsiednie żarówki mają różne kolory, wszystkie z pięciu stałych kolorów.
//  G9: Migotanie trwa 2,2–3,0 s, opóźnienie jest ujemne (start w środku cyklu), a rytm się nie powtarza.
//  G10: Ta sama szerokość i ziarno dają ten sam układ, różne ziarna dają różne girlandy.
//  G11: Szerokość 0, ujemna albo niepoprawna daje pusty układ.
//  G12: Generator liczb losowych z ziarnem jest deterministyczny i zwraca liczby z przedziału [0, 1).
//
// Wartości kontrolne generatora policzone niezależnie (osobna implementacja w Pythonie).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  BULB_COLORS,
  TWINKLE_MAX_S,
  TWINKLE_MIN_S,
  buildLayout,
  bulbCount,
  seededRandom,
  swagCount,
} from '../js/garland-model.js';

// Wymiary wpisane wprost (nie importowane z testowanego modułu), żeby zepsucie stałej nie psuło też oczekiwania.
const HEIGHT = 40;
const ANCHOR_Y = 3;
const SAG_MIN = 10;
const SAG_MAX = 14;
const BULB_RADIUS = 4.5;
const GLOW_RADIUS = 9;
const WIDTHS = [150, 200, 320, 350, 375, 390, 430, 600, 640, 900, 1280];
const SEEDS = [0, 1, 2, 3, 7, 42];
const EPSILON = 0.06; // współrzędne są zaokrąglane do 0,1
const DIFF_EPSILON = 0.21; // różnica dwóch zaokrąglonych współrzędnych (a w odstępach: różnica różnic)

function close(actual, expected, message, tolerance = EPSILON) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} != ${expected}`);
}

describe('seededRandom', () => {
  test('G12: wartości zgodne z niezależną implementacją', () => {
    const expected = {
      0: [0.26642920868471265, 0.0003297457005828619, 0.2232720274478197],
      1: [0.6270739405881613, 0.002735721180215478, 0.5274470399599522],
      42: [0.6011037519201636, 0.44829055899754167, 0.8524657934904099],
    };
    for (const [seed, values] of Object.entries(expected)) {
      const random = seededRandom(Number(seed));
      for (const value of values) assert.ok(Math.abs(random() - value) < 1e-13, `ziarno ${seed}`);
    }
  });

  test('G12: to samo ziarno daje tę samą serię, inne ziarno inną', () => {
    const take = (seed) => {
      const random = seededRandom(seed);
      return Array.from({ length: 10 }, () => random());
    };
    assert.deepEqual(take(5), take(5));
    assert.notDeepEqual(take(5), take(6));
  });

  test('G12: wartości są w przedziale [0, 1) i nie są stałe', () => {
    const random = seededRandom(123);
    const values = Array.from({ length: 2000 }, () => random());
    assert.ok(values.every((value) => value >= 0 && value < 1));
    assert.ok(new Set(values).size > 1990);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    assert.ok(mean > 0.45 && mean < 0.55, String(mean));
  });
});

describe('bulbCount i swagCount', () => {
  test('G1: żarówek jest około jedna na 30 px', () => {
    assert.equal(bulbCount(300), 10);
    assert.equal(bulbCount(350), 12);
    assert.equal(bulbCount(390), 13);
    assert.equal(bulbCount(640), 21);
  });

  test('G1: nigdy mniej niż 3 dla dodatniej szerokości, zero dla zerowej', () => {
    assert.equal(bulbCount(10), 3);
    assert.equal(bulbCount(1), 3);
    assert.equal(bulbCount(0), 0);
  });

  test('G1: liczba żarówek rośnie razem z szerokością', () => {
    let previous = 0;
    for (let width = 90; width <= 1400; width += 7) {
      const count = bulbCount(width);
      assert.ok(count >= previous, `${width}`);
      previous = count;
    }
  });

  test('G2: zawieszeń jest około jedno na 110 px, od 2 do 6', () => {
    assert.equal(swagCount(350), 3);
    assert.equal(swagCount(390), 4);
    assert.equal(swagCount(100), 2);
    assert.equal(swagCount(5000), 6);
    assert.equal(swagCount(0), 0);
  });

  test('G11: niepoprawne szerokości dają zero', () => {
    for (const width of [0, -10, NaN, undefined, null, Infinity, '300']) {
      assert.equal(bulbCount(width), 0, String(width));
      assert.equal(swagCount(width), 0, String(width));
    }
  });
});

describe('buildLayout: sznurek i łuki', () => {
  test('G3: łuki zaczynają się w x=0, kończą w x=szerokość i łączą się w punktach zaczepienia', () => {
    for (const width of WIDTHS) {
      const { swags } = buildLayout(width, 3);
      assert.equal(swags.length, swagCount(width), String(width));
      assert.equal(swags[0].x0, 0);
      close(swags.at(-1).x1, width, `szerokość ${width}`);
      for (let i = 1; i < swags.length; i++) assert.equal(swags[i].x0, swags[i - 1].x1);
      for (const swag of swags) {
        assert.ok(swag.x1 > swag.x0);
        close(swag.x1 - swag.x0, width / swags.length, `równe łuki ${width}`, DIFF_EPSILON);
      }
    }
  });

  test('G4: łuk to krzywa Béziera z punktem sterującym w środku i zwisem 10–14 px', () => {
    for (const seed of SEEDS) {
      for (const swag of buildLayout(390, seed).swags) {
        close(swag.cx, (swag.x0 + swag.x1) / 2, 'punkt sterujący w środku');
        const sag = (swag.cy - ANCHOR_Y) / 2; // środek krzywej Béziera wisi o połowę niżej niż punkt sterujący
        assert.ok(sag >= SAG_MIN - EPSILON && sag <= SAG_MAX + EPSILON, `zwis ${sag}`);
        assert.match(swag.path, /^M[\d.]+,3 Q[\d.]+,[\d.]+ [\d.]+,3$/);
      }
    }
  });

  test('G4: ścieżka zawiera dokładnie współrzędne łuku', () => {
    const [swag] = buildLayout(390, 1).swags;
    assert.equal(
      swag.path,
      `M${swag.x0},${ANCHOR_Y} Q${swag.cx},${swag.cy} ${swag.x1},${ANCHOR_Y}`,
    );
  });

  test('G4: zwisy różnią się między łukami i ziarnami (girlanda nie jest idealnie regularna)', () => {
    const sags = new Set();
    for (const seed of SEEDS) for (const swag of buildLayout(390, seed).swags) sags.add(swag.cy);
    assert.ok(sags.size > 10, String(sags.size));
  });
});

describe('buildLayout: żarówki', () => {
  test('G1: liczba żarówek zgadza się z bulbCount', () => {
    for (const width of WIDTHS) assert.equal(buildLayout(width, 2).bulbs.length, bulbCount(width));
  });

  test('G6: żarówki są rozdzielone po równo między łuki', () => {
    for (const width of WIDTHS) {
      const { swags, bulbs } = buildLayout(width, 4);
      const perSwag = swags.map((_, index) => bulbs.filter((bulb) => bulb.swag === index).length);
      assert.equal(
        perSwag.reduce((sum, n) => sum + n, 0),
        bulbs.length,
      );
      assert.ok(Math.max(...perSwag) - Math.min(...perSwag) <= 1, `${width}: ${perSwag}`);
    }
  });

  test('G5: żarówki leżą w obrębie swojego łuku, nie na punkcie zaczepienia i niżej niż punkt zaczepienia', () => {
    for (const width of WIDTHS) {
      const { swags, bulbs } = buildLayout(width, 5);
      for (const bulb of bulbs) {
        const swag = swags[bulb.swag];
        assert.ok(bulb.x > swag.x0 && bulb.x < swag.x1, `x ${bulb.x} w łuku ${swag.x0}–${swag.x1}`);
        assert.ok(bulb.y > ANCHOR_Y, `y ${bulb.y}`);
        assert.ok(bulb.y <= ANCHOR_Y + SAG_MAX + EPSILON, `y ${bulb.y}`);
      }
    }
  });

  test('G5: wzdłuż łuku żarówki są równomiernie rozstawione poziomo', () => {
    for (const width of WIDTHS) {
      const { swags, bulbs } = buildLayout(width, 6);
      swags.forEach((_, index) => {
        const xs = bulbs.filter((bulb) => bulb.swag === index).map((bulb) => bulb.x);
        for (let i = 2; i < xs.length; i++) {
          close(xs[i] - xs[i - 1], xs[i - 1] - xs[i - 2], `odstępy ${width}`, DIFF_EPSILON);
        }
      });
    }
  });

  test('G5: układ w łuku jest symetryczny (żarówki równo oddalone od końców wiszą na tej samej wysokości)', () => {
    for (const width of WIDTHS) {
      const { swags, bulbs } = buildLayout(width, 7);
      swags.forEach((swag, index) => {
        const row = bulbs.filter((bulb) => bulb.swag === index);
        row.forEach((bulb, i) => {
          const mirror = row[row.length - 1 - i];
          close(bulb.x - swag.x0, swag.x1 - mirror.x, `symetria x ${width}`, DIFF_EPSILON);
          close(bulb.y, mirror.y, `symetria y ${width}`);
        });
      });
    }
  });

  test('G5: najniżej wisi żarówka najbliżej środka łuku', () => {
    for (const width of WIDTHS) {
      const { swags, bulbs } = buildLayout(width, 8);
      swags.forEach((swag, index) => {
        const mid = (swag.x0 + swag.x1) / 2;
        const row = bulbs.filter((bulb) => bulb.swag === index);
        const nearest = row.reduce((best, bulb) =>
          Math.abs(bulb.x - mid) < Math.abs(best.x - mid) ? bulb : best,
        );
        for (const bulb of row) assert.ok(bulb.y <= nearest.y + EPSILON, `${width}`);
      });
    }
  });

  test('G7: żarówka z poświatą mieści się w obszarze girlandy', () => {
    for (const width of WIDTHS) {
      for (const seed of SEEDS) {
        const layout = buildLayout(width, seed);
        assert.equal(layout.width, width);
        assert.equal(layout.height, HEIGHT);
        for (const bulb of layout.bulbs) {
          assert.ok(bulb.cx - GLOW_RADIUS >= 0, `lewa krawędź ${width}/${seed}: ${bulb.cx}`);
          assert.ok(bulb.cx + GLOW_RADIUS <= width, `prawa krawędź ${width}/${seed}: ${bulb.cx}`);
          assert.ok(bulb.cy - GLOW_RADIUS >= 0, `góra ${width}/${seed}`);
          assert.ok(bulb.cy + GLOW_RADIUS <= HEIGHT, `dół ${width}/${seed}: ${bulb.cy}`);
        }
      }
    }
  });

  test('żarówka wisi pod sznurkiem na oprawce: środek żarówki poniżej punktu na sznurku', () => {
    for (const bulb of buildLayout(390, 1).bulbs) {
      assert.ok(bulb.cy - bulb.y >= BULB_RADIUS, `${bulb.cy - bulb.y}`);
      assert.equal(bulb.cx, bulb.x);
    }
  });

  test('G8: sąsiednie żarówki mają różne kolory, wszystkie spośród pięciu stałych', () => {
    for (const width of WIDTHS) {
      for (const seed of SEEDS) {
        const { bulbs } = buildLayout(width, seed);
        for (const bulb of bulbs) assert.ok(BULB_COLORS.includes(bulb.color), bulb.color);
        for (let i = 1; i < bulbs.length; i++) {
          assert.notEqual(bulbs[i].color, bulbs[i - 1].color, `${width}/${seed} żarówka ${i}`);
        }
      }
    }
  });

  test('G8: w girlandzie występuje więcej niż jeden kolor, a stałych kolorów jest pięć', () => {
    assert.equal(BULB_COLORS.length, 5);
    assert.deepEqual(BULB_COLORS, ['#e2483f', '#3fae6a', '#e8c15a', '#5f9bc7', '#e28fc0']);
    const colors = new Set(buildLayout(390, 0).bulbs.map((bulb) => bulb.color));
    assert.ok(colors.size >= 3, String(colors.size));
  });
});

describe('buildLayout: migotanie', () => {
  test('G9: czas 2,2–3,0 s, opóźnienie ujemne i mniejsze co do modułu niż czas', () => {
    assert.equal(TWINKLE_MIN_S, 2.2);
    assert.equal(TWINKLE_MAX_S, 3.0);
    for (const seed of SEEDS) {
      for (const bulb of buildLayout(640, seed).bulbs) {
        assert.ok(
          bulb.duration >= TWINKLE_MIN_S && bulb.duration <= TWINKLE_MAX_S,
          `${bulb.duration}`,
        );
        assert.ok(
          bulb.delay <= 0 && bulb.delay > -bulb.duration - 0.011,
          `${bulb.delay} / ${bulb.duration}`,
        );
      }
    }
  });

  test('G9: rytm nie powtarza się mechanicznie (opóźnienia nie mają krótkiego okresu)', () => {
    const { bulbs } = buildLayout(720, 0);
    const delays = bulbs.map((bulb) => bulb.delay);
    assert.ok(new Set(delays).size >= delays.length - 3, 'opóźnienia są prawie wszystkie różne');
    for (const period of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const repeats = delays.every((delay, i) => i < period || delay === delays[i - period]);
      assert.equal(repeats, false, `okres ${period}`);
    }
    const durations = new Set(bulbs.map((bulb) => bulb.duration));
    assert.ok(durations.size > bulbs.length / 2, 'czasy trwania też się różnią');
  });
});

describe('buildLayout: powtarzalność i skrajne wejścia', () => {
  test('G10: ta sama szerokość i ziarno dają ten sam układ', () => {
    for (const width of [320, 390, 640]) {
      assert.deepEqual(buildLayout(width, 4), buildLayout(width, 4));
    }
  });

  test('G10: różne ziarna dają różne girlandy (ścieżki, kolory i opóźnienia)', () => {
    const layouts = [0, 1, 2, 3, 4, 5].map((seed) => buildLayout(390, seed));
    const paths = new Set(layouts.map((layout) => layout.swags.map((swag) => swag.path).join('|')));
    const colors = new Set(
      layouts.map((layout) => layout.bulbs.map((bulb) => bulb.color).join('')),
    );
    const delays = new Set(
      layouts.map((layout) => layout.bulbs.map((bulb) => bulb.delay).join(',')),
    );
    assert.equal(paths.size, layouts.length);
    assert.equal(colors.size, layouts.length);
    assert.equal(delays.size, layouts.length);
  });

  test('G10: układ nie zależy od wcześniejszych wywołań (brak ukrytego stanu)', () => {
    const first = buildLayout(390, 2);
    buildLayout(500, 9);
    buildLayout(390, 3);
    assert.deepEqual(buildLayout(390, 2), first);
  });

  test('G11: szerokość 0, ujemna lub niepoprawna daje pusty układ', () => {
    for (const width of [0, -5, NaN, undefined, null, Infinity]) {
      const layout = buildLayout(width, 1);
      assert.deepEqual(
        [layout.width, layout.swags.length, layout.bulbs.length],
        [0, 0, 0],
        String(width),
      );
    }
  });

  test('bardzo wąska szerokość nie psuje układu', () => {
    for (const width of [1, 20, 60, 90]) {
      const layout = buildLayout(width, 1);
      assert.equal(layout.bulbs.length, bulbCount(width));
      assert.ok(layout.bulbs.every((bulb) => Number.isFinite(bulb.cx) && Number.isFinite(bulb.cy)));
    }
  });
});
