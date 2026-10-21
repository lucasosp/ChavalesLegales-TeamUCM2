/**
 * Minimal synchronous event bus.
 *
 * It keeps the engine independent from the renderer: the engine emits
 * domain events and knows nothing about the DOM, CSS, or input devices.
 */
export class EventBus {
  #listeners = new Map();

  /**
   * @param {string} event
   * @param {(payload: unknown) => void} handler
   * @returns {() => void} unsubscribe function
   */
  on(event, handler) {
    if (typeof handler !== "function") {
      throw new TypeError("EventBus handler must be a function");
    }

    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set());
    }

    this.#listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  /**
   * @param {string} event
   * @param {(payload: unknown) => void} handler
   */
  off(event, handler) {
    this.#listeners.get(event)?.delete(handler);
  }

  /**
   * @param {string} event
   * @param {unknown} [payload]
   */
  emit(event, payload) {
    const handlers = this.#listeners.get(event);
    if (!handlers) return;

    // Copy so handlers can unsubscribe while the event is being dispatched.
    for (const handler of [...handlers]) {
      handler(payload);
    }
  }
}
