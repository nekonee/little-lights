// Instalowalna aplikacja (PWA): manifest, ikony, tagi w <head> index.html, nazwa aplikacji i wcięcie na notch.
// Testy czytają prawdziwe pliki aplikacji.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { APP_TITLE } from '../../js/strings.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url));
const text = (path) => read(path).toString('utf8');

const manifest = JSON.parse(text('manifest.json'));
const html = text('index.html');
const head = html.slice(html.indexOf('<head>'), html.indexOf('</head>'));

function pngInfo(path) {
  const bytes = read(path);
  const signature = bytes.subarray(0, 8).toString('hex');
  return {
    signature,
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    colorType: bytes[25],
  };
}

function metaContent(name) {
  const tag = head.match(new RegExp(`<meta\\s+name="${name}"\\s+content="([^"]*)"`));
  return tag ? tag[1] : null;
}

const isRelative = (path) => !/^([a-z][a-z0-9+.-]*:|\/)/i.test(path);

describe('manifest.json', () => {
  test('nazwa, język i tryb aplikacji', () => {
    assert.equal(manifest.name, 'Little Lights');
    assert.equal(manifest.short_name, 'Little Lights');
    assert.equal(manifest.lang, 'pl');
    assert.equal(manifest.display, 'standalone');
  });

  test('start_url i scope są względne', () => {
    assert.equal(manifest.start_url, './');
    assert.equal(manifest.scope, './');
  });

  test('kolory z motywu domyślnego', () => {
    const defaultBg = text('css/tokens.css')
      .match(/--bg:\s*(#[0-9a-f]{6})/i)[1]
      .toLowerCase();
    assert.equal(defaultBg, '#fbf0e2');
    assert.equal(manifest.background_color.toLowerCase(), defaultBg);
    assert.equal(manifest.theme_color.toLowerCase(), defaultBg);
  });

  test('ikony 192 i 512, PNG, względne ścieżki, istniejące pliki o deklarowanym wymiarze', () => {
    const sizes = manifest.icons.map((icon) => icon.sizes).sort();
    assert.deepEqual(sizes, ['192x192', '512x512']);
    for (const icon of manifest.icons) {
      assert.equal(icon.type, 'image/png', icon.src);
      assert.ok(isRelative(icon.src), `ścieżka musi być względna: ${icon.src}`);
      const info = pngInfo(icon.src);
      assert.equal(info.signature, '89504e470d0a1a0a', `${icon.src} nie jest PNG`);
      assert.equal(`${info.width}x${info.height}`, icon.sizes, icon.src);
    }
  });

  test('ikony są pełnymi, nieprzezroczystymi kwadratami', () => {
    const paths = [
      ...manifest.icons.map((icon) => icon.src),
      'apple-touch-icon.png',
      'assets/icons/icon-120.png',
      'assets/icons/icon-152.png',
      'assets/icons/icon-167.png',
      'assets/icons/icon-180.png',
    ];
    for (const path of paths) {
      const { width, height, colorType } = pngInfo(path);
      assert.equal(width, height, `${path} nie jest kwadratem`);
      assert.equal(colorType, 2, `${path}: oczekiwano RGB bez alfa (typ 2), jest ${colorType}`);
    }
  });
});

describe('index.html', () => {
  test('statyczne tagi aplikacji w <head>', () => {
    assert.match(head, /<link\s+rel="manifest"\s+href="manifest\.json"/);
    assert.equal(metaContent('apple-mobile-web-app-capable'), 'yes');
    assert.equal(metaContent('apple-mobile-web-app-title'), 'Little Lights');
    assert.equal(metaContent('apple-mobile-web-app-status-bar-style'), 'black-translucent');
    assert.equal(metaContent('format-detection'), 'telephone=no');
  });

  test('apple-touch-icon 180×180 z wersją i kopia w katalogu głównym', () => {
    const link = head.match(/<link\s+rel="apple-touch-icon"\s+sizes="180x180"\s+href="([^"]+)"/);
    assert.ok(link, 'brak linku apple-touch-icon 180x180');
    assert.equal(link[1], 'apple-touch-icon.png?v=1');
    const info = pngInfo('apple-touch-icon.png');
    assert.equal(`${info.width}x${info.height}`, '180x180');
    assert.deepEqual(read('apple-touch-icon.png'), read('assets/icons/icon-180.png'));
  });

  test('nazwa aplikacji jest wszędzie ta sama', () => {
    assert.equal(APP_TITLE, 'Little Lights');
    assert.equal(manifest.name, APP_TITLE);
    assert.equal(metaContent('apple-mobile-web-app-title'), APP_TITLE);
    assert.match(head, new RegExp(`<title>[^<]*${APP_TITLE}</title>`));
    assert.match(html, new RegExp(`<h1>[^<]*${APP_TITLE}</h1>`));
    assert.equal(/Dziennik Wdzięczności/.test(html), false, 'stara nazwa w index.html');
  });

  test('viewport-fit=cover i brak blokady powiększania', () => {
    const viewport = metaContent('viewport');
    assert.match(viewport, /viewport-fit=cover/);
    assert.equal(/maximum-scale|user-scalable/.test(viewport), false);
  });
});

describe('css/base.css', () => {
  test('kontener odsuwa treść o safe-area-inset na górze i na dole', () => {
    const wrap = text('css/base.css').match(/\.wrap\s*\{([^}]*)\}/)[1];
    assert.match(wrap, /safe-area-inset-top/);
    assert.match(wrap, /safe-area-inset-bottom/);
  });
});

describe('package.json', () => {
  test('nazwa pakietu zgadza się z nazwą aplikacji i repozytorium', () => {
    const pkg = JSON.parse(text('package.json'));
    assert.equal(pkg.name, 'little-lights');
    assert.match(pkg.description, /^Little Lights/);
  });
});
