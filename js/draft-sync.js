export const DRAFT_DELAY_MS = 500;

/**
 * Czas zapisu szkicu: opóźniony po ostatniej zmianie (`schedule`) albo wymuszony od razu (`flush`).
 * Reguł „co zapisać” tu nie ma, wykonuje je `persist`.
 * @param {{persist: () => void}} options
 */
export function createDraftSync({ persist }) {
  let handle = null;

  function cancel() {
    if (handle === null) return;
    clearTimeout(handle);
    handle = null;
  }

  return {
    schedule() {
      cancel();
      handle = setTimeout(() => {
        handle = null;
        persist();
      }, DRAFT_DELAY_MS);
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
