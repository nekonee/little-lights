// Numery S odnoszą się do zachowań wypisanych na początku tests/drafts.test.js (tu głównie S7, S8, S16).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { DRAFT_DELAY_MS, createDraftSync } from '../js/draft-sync.js';

/** Zegar ręczny: czas płynie tylko przez advance(), więc test nie czeka naprawdę. */
function fakeClock() {
  let now = 0;
  let nextId = 1;
  const pending = new Map();
  return {
    timers: {
      set(callback, delay) {
        const id = nextId++;
        pending.set(id, { callback, at: now + delay });
        return id;
      },
      clear(id) {
        pending.delete(id);
      },
    },
    advance(ms) {
      now += ms;
      for (const [id, timer] of [...pending]) {
        if (timer.at <= now) {
          pending.delete(id);
          timer.callback();
        }
      }
    },
    pendingCount: () => pending.size,
  };
}

function setup(delayMs = DRAFT_DELAY_MS) {
  const clock = fakeClock();
  const calls = [];
  const sync = createDraftSync({
    persist: () => calls.push('persist'),
    timers: clock.timers,
    delayMs,
  });
  return { clock, calls, sync };
}

describe('createDraftSync', () => {
  test('S7: opóźnienie wynosi 500 ms', () => {
    assert.equal(DRAFT_DELAY_MS, 500);
  });

  test('S7: zapisuje dopiero po upływie opóźnienia od ostatniej zmiany', () => {
    const { clock, calls, sync } = setup();
    sync.schedule();
    clock.advance(499);
    assert.equal(calls.length, 0);
    clock.advance(1);
    assert.equal(calls.length, 1);
  });

  test('S7: kolejna zmiana przed upływem czasu odsuwa zapis (zapis raz, nie po każdym znaku)', () => {
    const { clock, calls, sync } = setup();
    sync.schedule();
    clock.advance(300);
    sync.schedule();
    clock.advance(300);
    assert.equal(calls.length, 0);
    clock.advance(200);
    assert.equal(calls.length, 1);
    clock.advance(5000);
    assert.equal(calls.length, 1);
  });

  test('S8: flush zapisuje natychmiast i anuluje oczekujący zapis', () => {
    const { clock, calls, sync } = setup();
    sync.schedule();
    clock.advance(100);
    sync.flush();
    assert.equal(calls.length, 1);
    assert.equal(clock.pendingCount(), 0);
    clock.advance(5000);
    assert.equal(calls.length, 1);
  });

  test('S8: flush bez oczekującej zmiany nic nie zapisuje', () => {
    const { calls, sync } = setup();
    sync.flush();
    assert.equal(calls.length, 0);
  });

  test('S8: flush po już wykonanym zapisie nie zapisuje drugi raz', () => {
    const { clock, calls, sync } = setup();
    sync.schedule();
    clock.advance(500);
    sync.flush();
    assert.equal(calls.length, 1);
  });

  test('S16: cancel usuwa oczekujący zapis bez zapisywania', () => {
    const { clock, calls, sync } = setup();
    sync.schedule();
    sync.cancel();
    assert.equal(clock.pendingCount(), 0);
    clock.advance(5000);
    assert.equal(calls.length, 0);
  });

  test('po flush i po cancel można znowu planować zapis', () => {
    const { clock, calls, sync } = setup();
    sync.schedule();
    sync.flush();
    sync.schedule();
    clock.advance(500);
    assert.equal(calls.length, 2);
    sync.schedule();
    sync.cancel();
    sync.schedule();
    clock.advance(500);
    assert.equal(calls.length, 3);
  });

  test('własne opóźnienie jest respektowane', () => {
    const { clock, calls, sync } = setup(50);
    sync.schedule();
    clock.advance(49);
    assert.equal(calls.length, 0);
    clock.advance(1);
    assert.equal(calls.length, 1);
  });
});
