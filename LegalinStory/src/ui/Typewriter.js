/**
 * Text reveal with skip support.
 *
 * Kept separate from the view so the dialogue renderer does not need to know
 * how text is animated (single responsibility).
 */
export class Typewriter {
  #frame = null;
  #fullText = "";
  #shown = 0;
  #startedAt = 0;
  #onComplete = null;

  /**
   * @param {HTMLElement} element
   * @param {{ charsPerSecond?: number }} [options]
   */
  constructor(element, { charsPerSecond = 55 } = {}) {
    this.element = element;
    this.charsPerSecond = charsPerSecond;
    this.prefersReducedMotion = globalThis.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches ?? false;
  }

  /**
   * @param {string} text
   * @param {() => void} [onComplete]
   */
  play(text, onComplete = () => {}) {
    this.stop();

    this.#fullText = String(text ?? "");
    this.#shown = 0;
    this.#onComplete = onComplete;
    this.element.scrollTop = 0;
    // The dialogue frame has a stable height; the text scrolls within its row.
    this.element.textContent = "";
    this.element.classList.add("is-typing");

    if (this.prefersReducedMotion || this.instant) {
      this.skip();
      return;
    }

    this.#startedAt = performance.now();

    const tick = (now) => {
      const target = Math.min(
        this.#fullText.length,
        Math.floor(((now - this.#startedAt) / 1000) * this.charsPerSecond),
      );

      if (target !== this.#shown) {
        this.#shown = target;
        this.element.textContent = this.#fullText.slice(0, target);
      }

      if (this.#shown < this.#fullText.length) {
        this.#frame = requestAnimationFrame(tick);
      } else {
        this.#finish();
      }
    };

    this.#frame = requestAnimationFrame(tick);
  }

  isTyping() {
    return this.#onComplete !== null;
  }

  /** Reveal the rest of the current line immediately. */
  skip() {
    if (!this.isTyping()) return;

    this.#shown = this.#fullText.length;
    this.element.textContent = this.#fullText;
    this.element.scrollTop = 0;
    this.#finish();
  }

  stop() {
    if (this.#frame !== null) {
      cancelAnimationFrame(this.#frame);
      this.#frame = null;
    }
    this.#onComplete = null;
    this.element.classList.remove("is-typing");
  }

  #finish() {
    if (this.#frame !== null) {
      cancelAnimationFrame(this.#frame);
      this.#frame = null;
    }

    this.element.classList.remove("is-typing");

    const complete = this.#onComplete;
    this.#onComplete = null;
    complete?.();
  }
}
