export const DRAFT_DELAY_MS = 500;

const browserTimers = {
  set: (callback, delay) => setTimeout(callback, delay),
  clear: (handle) => clearTimeout(handle),
};

/**
 * Czas zapisu szkicu: opóźniony po ostatniej zmianie (`schedule`) albo wymuszony od razu (`flush`).
 * Reguł „co zapisać” tu nie ma, wykonuje je `persist`.
 * @param {{persist: () => void, delayMs?: number, timers?: typeof browserTimers}} options
 */
export function createDraftSync({ persist, delayMs = DRAFT_DELAY_MS, timers = browserTimers }) {
  let handle = null;

  function cancel() {
    if (handle === null) return;
    timers.clear(handle);
    handle = null;
  }

  return {
    schedule() {
      cancel();
      handle = timers.set(() => {
        handle = null;
        persist();
      }, delayMs);
    },
    /** Zapisuje od razu, ale tylko wtedy, gdy czeka niezapisana zmiana. */
    flush() {
      if (handle === null) return;
      cancel();
      persist();
    },
    cancel,
  };
}
