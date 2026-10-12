// Czas zapisu szkicu (js/draft-sync.js): zapis po 500 ms od ostatniej zmiany, od razu przy flush, nigdy po cancel.
// Czas płynie tylko przez tick() z wbudowanego mock.timers, więc test nie czeka naprawdę.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { DRAFT_DELAY_MS, createDraftSync } from '../../js/draft-sync.js';

function setup(t) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const persist = t.mock.fn();
  const sync = createDraftSync({ persist });
  const saves = () => persist.mock.callCount();
  const wait = (ms) => t.mock.timers.tick(ms);
  return { sync, saves, wait };
}

describe('createDraftSync', () => {
  test('opóźnienie wynosi 500 ms', () => {
    assert.equal(DRAFT_DELAY_MS, 500);
  });

  test('zapisuje dopiero po upływie opóźnienia od ostatniej zmiany', (t) => {
    const { sync, saves, wait } = setup(t);
    sync.schedule();
    wait(499);
    assert.equal(saves(), 0);
    wait(1);
    assert.equal(saves(), 1);
  });

  test('kolejna zmiana przed upływem czasu odsuwa zapis (zapis raz, nie po każdym znaku)', (t) => {
    const { sync, saves, wait } = setup(t);
    sync.schedule();
    wait(300);
    sync.schedule();
    wait(300);
    assert.equal(saves(), 0);
    wait(200);
    assert.equal(saves(), 1);
    wait(5000);
    assert.equal(saves(), 1);
  });

  test('flush zapisuje natychmiast i anuluje oczekujący zapis', (t) => {
    const { sync, saves, wait } = setup(t);
    sync.schedule();
    wait(100);
    sync.flush();
    assert.equal(saves(), 1);
    wait(5000);
    assert.equal(saves(), 1);
  });

  test('flush bez oczekującej zmiany nic nie zapisuje', (t) => {
    const { sync, saves } = setup(t);
    sync.flush();
    assert.equal(saves(), 0);
  });

  test('flush po już wykonanym zapisie nie zapisuje drugi raz', (t) => {
    const { sync, saves, wait } = setup(t);
    sync.schedule();
    wait(500);
    sync.flush();
    assert.equal(saves(), 1);
  });

  test('cancel usuwa oczekujący zapis bez zapisywania', (t) => {
    const { sync, saves, wait } = setup(t);
    sync.schedule();
    sync.cancel();
    wait(5000);
    assert.equal(saves(), 0);
  });

  test('po flush i po cancel można znowu planować zapis', (t) => {
    const { sync, saves, wait } = setup(t);
    sync.schedule();
    sync.flush();
    sync.schedule();
    wait(500);
    assert.equal(saves(), 2);
    sync.schedule();
    sync.cancel();
    sync.schedule();
    wait(500);
    assert.equal(saves(), 3);
  });
});
