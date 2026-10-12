// Wybór sposobu eksportu kopii (js/share.js): okno udostępniania albo zwykłe pobranie.
// Samo działanie okna udostępniania w Safari na iPhonie trzeba sprawdzić ręcznie na telefonie.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { isShareCancelled, pickExportMethod } from '../../js/share.js';

const FILE = { name: 'kopia.json' };

describe('pickExportMethod', () => {
  test('udostępnianie, gdy przeglądarka umie udostępnić plik', () => {
    const asked = [];
    const nav = {
      share: () => {},
      canShare: (data) => {
        asked.push(data);
        return true;
      },
    };
    assert.equal(pickExportMethod(nav, FILE), 'share');
    assert.deepEqual(asked, [{ files: [FILE] }]);
  });

  test('pobranie, gdy canShare odmawia dla pliku', () => {
    const nav = { share: () => {}, canShare: () => false };
    assert.equal(pickExportMethod(nav, FILE), 'download');
  });

  test('pobranie, gdy brakuje share albo canShare', () => {
    assert.equal(pickExportMethod({ canShare: () => true }, FILE), 'download');
    assert.equal(pickExportMethod({ share: () => {} }, FILE), 'download');
    assert.equal(pickExportMethod({}, FILE), 'download');
  });

  test('pobranie, gdy canShare rzuca błąd', () => {
    const nav = {
      share: () => {},
      canShare: () => {
        throw new TypeError('nieobsługiwane');
      },
    };
    assert.equal(pickExportMethod(nav, FILE), 'download');
  });

  test('pobranie, gdy nie ma obiektu navigator', () => {
    assert.equal(pickExportMethod(undefined, FILE), 'download');
    assert.equal(pickExportMethod(null, FILE), 'download');
  });

  test('canShare musi zwrócić dokładnie true', () => {
    assert.equal(pickExportMethod({ share: () => {}, canShare: () => 1 }, FILE), 'download');
    assert.equal(
      pickExportMethod({ share: () => {}, canShare: () => undefined }, FILE),
      'download',
    );
  });
});

describe('isShareCancelled', () => {
  test('AbortError to anulowanie', () => {
    assert.equal(isShareCancelled(new DOMException('anulowano', 'AbortError')), true);
    assert.equal(isShareCancelled({ name: 'AbortError' }), true);
  });

  test('inne błędy i dziwne wartości to nie anulowanie', () => {
    assert.equal(isShareCancelled(new DOMException('brak gestu', 'NotAllowedError')), false);
    assert.equal(isShareCancelled(new TypeError('x')), false);
    assert.equal(isShareCancelled(undefined), false);
    assert.equal(isShareCancelled(null), false);
    assert.equal(isShareCancelled('AbortError'), false);
  });
});
