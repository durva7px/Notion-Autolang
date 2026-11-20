/**
 * Remembers what AutoLang last saw and did for each code block:
 *   { hash, language, manual }
 * - hash: SHA-256 of the block's code text when last processed
 * - language: the block's language when AutoLang last looked, including any change it made
 * - manual: true once the user picked a language by hand; AutoLang then leaves the block alone
 *
 * Every store has the same async interface (get/set), so the in-memory store
 * used locally and in tests can be swapped for a DynamoDB one on Lambda.
 */
export function createMemoryBlockStateStore() {
  const states = new Map();
  return {
    async get(blockId) {
      const state = states.get(blockId);
      return state ? { ...state } : null;
    },
    async set(blockId, state) {
      states.set(blockId, { ...state });
    }
  };
}
