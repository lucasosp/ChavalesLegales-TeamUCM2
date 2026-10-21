/**
 * Save stores share one contract (Liskov substitution principle):
 *
 *   load(): SaveData | null
 *   save(data: SaveData): void
 *   clear(): void
 *
 * The engine only depends on that contract, never on localStorage directly.
 */

const isQuotaError = (error) =>
  error instanceof DOMException &&
  (error.name === "QuotaExceededError" || error.name === "SecurityError");

export class LocalStorageSaveStore {
  /** @param {string} key */
  constructor(key = "visual-novel.save") {
    this.key = key;
  }

  load() {
    try {
      const raw = globalThis.localStorage?.getItem(this.key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  save(data) {
    try {
      globalThis.localStorage?.setItem(this.key, JSON.stringify(data));
    } catch (error) {
      if (!isQuotaError(error)) throw error;
    }
  }

  clear() {
    try {
      globalThis.localStorage?.removeItem(this.key);
    } catch {
      // Persistence is a convenience; the story must keep working without it.
    }
  }
}

export class MemorySaveStore {
  #data = null;

  load() {
    return this.#data ? structuredClone(this.#data) : null;
  }

  save(data) {
    this.#data = structuredClone(data);
  }

  clear() {
    this.#data = null;
  }
}
