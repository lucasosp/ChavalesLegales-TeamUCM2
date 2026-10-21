import { avatarStore } from "../services/avatarStore.js";
import { DrawingMetricsCollector } from "../services/DrawingMetricsCollector.js";

/**
 * Interactive projective drawing modal supporting 3 sequential phases:
 * - Phase 1: Pre-trauma avatar drawing with stylus pressure & cursor support.
 * - Phase 2: Post-trauma re-drawing (cleared canvas, replaces profile picture).
 * - Phase 3: Final comparison & integration (choice between Avatar 1 and Avatar 2).
 */
export class DrawingCanvasModal {
  constructor({ container = document.body, onComplete } = {}) {
    this.container = container;
    this.onComplete = onComplete;
    this.modal = null;
    this.canvas = null;
    this.ctx = null;
    this.collector = null;
    this.isDrawing = false;
    this.lastX = 0;
    this.lastY = 0;
    this.currentColor = "#1e1b26";
    this.baseWidth = 6;
    this.isEraser = false;
    this.undoStack = [];
    this.maxUndo = 20;
    this.hasDrawn = false;
  }

  open({ phase, onConfirm }) {
    this.destroy();
    this.returnFocus = document.activeElement;
    this.currentColor = "#1e1b26";
    this.baseWidth = 6;
    this.isEraser = false;

    const overlay = document.createElement("div");
    overlay.className = "sara-drawing-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "sara-drawing-title");
    overlay.addEventListener("keydown", event => event.stopPropagation());

    if (phase !== "phase3") {
      this.collector = new DrawingMetricsCollector({ canvasWidth: 400, canvasHeight: 400 });
    }

    if (phase === "phase3") {
      this.#renderPhase3(overlay, onConfirm);
    } else {
      this.#renderCanvasPhase(overlay, phase, onConfirm);
    }

    this.modal = overlay;
    this.blockedElements = [...this.container.children].map(element => ({ element, inert: element.inert }));
    this.blockedElements.forEach(({ element }) => { element.inert = true; });
    this.container.append(overlay);
    this.onModalKey = event => {
      if (!this.modal) return;
      if (event.key !== "Tab") return;
      event.stopImmediatePropagation();
      const controls = [...this.modal.querySelectorAll("button, [tabindex='0']")].filter(control => !control.disabled);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || !this.modal.contains(document.activeElement))) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !this.modal.contains(document.activeElement))) {
        event.preventDefault(); first?.focus();
      }
    };
    document.addEventListener("keydown", this.onModalKey, true);
    overlay.querySelector("button, [tabindex='0']")?.focus({ preventScroll: true });

    if (phase !== "phase3") {
      this.#setupCanvas();
    }
  }

  #renderCanvasPhase(overlay, phase, onConfirm) {
    const isPhase1 = phase === "phase1";
    const titleText = isPhase1 ? "Tu historia empieza con un dibujo" : "Una pausa para dibujar";
    const introText = isPhase1
      ? "¿Cómo te imaginas a Sara? Dibújala a tu manera. Puedes usar el dedo, el ratón o un lápiz digital."
      : "Sara ha dado un paso importante. Si te apetece, dibújala otra vez como te la imaginas ahora. Tómate el tiempo que necesites.";
    const confirmLabel = isPhase1 ? "Guardar y empezar →" : "Guardar y seguir →";

    overlay.innerHTML = `
      <div class="sara-drawing-card">
        <header class="sara-drawing-header">
          <span class="sara-eyebrow">UN MOMENTO PARA CREAR</span>
          <h2 id="sara-drawing-title" class="sara-drawing-title">${titleText}</h2>
          <p class="sara-drawing-instruction">${introText}</p>
        </header>

        <div class="sara-drawing-workspace">
          <div class="sara-canvas-container">
            <canvas class="sara-drawing-canvas" width="400" height="400"></canvas>
            <div class="sara-canvas-hint" data-canvas-hint>Tu dibujo empieza aquí</div>
          </div>

          <aside class="sara-drawing-controls" aria-label="Herramientas de dibujo">
            <div class="sara-control-group">
              <span class="sara-control-label">Color</span>
              <div class="sara-palette-grid">
                <button type="button" class="sara-color-btn is-active" data-color="#1e1b26" style="background:#1e1b26" aria-label="Negro grafito"></button>
                <button type="button" class="sara-color-btn" data-color="#2b4c7e" style="background:#2b4c7e" aria-label="Azul pizarra"></button>
                <button type="button" class="sara-color-btn" data-color="#b93b3b" style="background:#b93b3b" aria-label="Rojo terracota"></button>
                <button type="button" class="sara-color-btn" data-color="#d9822b" style="background:#d9822b" aria-label="Ocre cálido"></button>
                <button type="button" class="sara-color-btn" data-color="#2d6a4f" style="background:#2d6a4f" aria-label="Verde bosque"></button>
                <button type="button" class="sara-color-btn sara-eraser-btn" data-action="eraser" aria-label="Goma de borrar">⌫</button>
              </div>
            </div>

            <div class="sara-control-group">
              <span class="sara-control-label">Tamaño del lápiz</span>
              <div class="sara-size-grid">
                <button type="button" class="sara-size-btn" data-size="3" aria-label="Fino"><span style="width:4px;height:4px;"></span></button>
                <button type="button" class="sara-size-btn is-active" data-size="6" aria-label="Medio"><span style="width:8px;height:8px;"></span></button>
                <button type="button" class="sara-size-btn" data-size="14" aria-label="Grueso"><span style="width:14px;height:14px;"></span></button>
              </div>
              <small class="sara-pressure-note">Prueba el tamaño que más te guste</small>
            </div>

            <div class="sara-control-group sara-action-buttons">
              <button type="button" class="sara-tool-btn" data-action="undo" aria-label="Deshacer último trazo">↺ Deshacer</button>
              <button type="button" class="sara-tool-btn" data-action="clear" aria-label="Limpiar lienzo">🗑 Limpiar</button>
            </div>
          </aside>
        </div>

        <footer class="sara-drawing-footer">
          <p class="sara-lock-warning" aria-live="polite">
            No tiene que quedar perfecto. Este dibujo es tuyo.
          </p>
          <button type="button" class="sara-primary sara-confirm-draw" data-action="confirm">${confirmLabel}</button>
        </footer>
      </div>
    `;

    // Tool events
    const card = overlay.querySelector(".sara-drawing-card");
    card.querySelectorAll("[data-color]").forEach((btn) => {
      btn.addEventListener("click", () => {
        card.querySelectorAll(".sara-color-btn").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        this.currentColor = btn.dataset.color;
        this.isEraser = false;
        this.collector?.recordToolChange({ color: this.currentColor, isEraser: false });
      });
    });

    const eraserBtn = card.querySelector('[data-action="eraser"]');
    eraserBtn.addEventListener("click", () => {
      card.querySelectorAll(".sara-color-btn").forEach((b) => b.classList.remove("is-active"));
      eraserBtn.classList.add("is-active");
      this.isEraser = true;
      this.collector?.recordToolChange({ isEraser: true });
    });

    card.querySelectorAll("[data-size]").forEach((btn) => {
      btn.addEventListener("click", () => {
        card.querySelectorAll(".sara-size-btn").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        this.baseWidth = Number(btn.dataset.size);
        this.collector?.recordToolChange({ size: this.baseWidth });
      });
    });

    card.querySelector('[data-action="undo"]').addEventListener("click", () => {
      this.collector?.recordUndo();
      this.#undo();
    });
    card.querySelector('[data-action="clear"]').addEventListener("click", () => {
      this.collector?.recordClear();
      this.#clear();
    });

    card.querySelector('[data-action="confirm"]').addEventListener("click", () => {
      const dataUrl = this.canvas.toDataURL("image/png");
      const metrics = this.collector ? this.collector.finalize(phase) : null;
      if (isPhase1) {
        avatarStore.savePhase1(dataUrl, metrics);
      } else {
        avatarStore.savePhase2(dataUrl, metrics);
      }
      this.destroy();
      onConfirm?.(dataUrl, metrics);
      this.onComplete?.(phase, dataUrl, metrics);
    });
  }

  #renderPhase3(overlay, onConfirm) {
    const avatar1 = avatarStore.getPhase1();
    const avatar2 = avatarStore.getPhase2();
    let selected = "phase2"; // default recommendation

    overlay.innerHTML = `
      <div class="sara-drawing-card sara-phase3-card">
        <header class="sara-drawing-header">
          <span class="sara-eyebrow">UN RECUERDO DE TU HISTORIA</span>
          <h2 id="sara-drawing-title" class="sara-drawing-title">¿Cuál de los dos dibujos prefieres?</h2>
          <p class="sara-drawing-instruction">
            Has acompañado a Sara hasta aquí. Mira tus dibujos y elige el que quieres guardar como recuerdo.
          </p>
        </header>

        <div class="sara-comparison-grid">
          <div class="sara-choice-option" data-choice="phase1" tabindex="0" role="button" aria-pressed="false">
            <div class="sara-choice-preview">
              ${avatar1 ? `<img src="${avatar1}" alt="Tu primer dibujo">` : '<div class="sara-empty-avatar">Sin dibujo</div>'}
            </div>
            <strong class="sara-choice-title">Mi primer dibujo</strong>
            <p class="sara-choice-desc">Así imaginabas a Sara al empezar.</p>
            <span class="sara-choice-tag">Seleccionar</span>
          </div>

          <div class="sara-choice-option is-selected" data-choice="phase2" tabindex="0" role="button" aria-pressed="true">
            <div class="sara-choice-preview">
              ${avatar2 ? `<img src="${avatar2}" alt="Tu segundo dibujo">` : '<div class="sara-empty-avatar">Sin dibujo</div>'}
            </div>
            <strong class="sara-choice-title">Mi segundo dibujo</strong>
            <p class="sara-choice-desc">Así imaginabas a Sara más adelante.</p>
            <span class="sara-choice-tag">Seleccionar</span>
          </div>
        </div>

        <footer class="sara-drawing-footer">
          <p class="sara-lock-warning">
            Elige el que más te guste. Los dos forman parte de tu historia.
          </p>
          <button type="button" class="sara-primary sara-confirm-choice" data-action="confirm-choice">Guardar mi recuerdo →</button>
        </footer>
      </div>
    `;

    const card = overlay.querySelector(".sara-phase3-card");
    const options = card.querySelectorAll(".sara-choice-option");

    options.forEach((opt) => {
      const select = () => {
        options.forEach((o) => {
          o.classList.remove("is-selected");
          o.setAttribute("aria-pressed", "false");
        });
        opt.classList.add("is-selected");
        opt.setAttribute("aria-pressed", "true");
        selected = opt.dataset.choice;
      };
      opt.addEventListener("click", select);
      opt.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          select();
        }
      });
    });

    card.querySelector('[data-action="confirm-choice"]').addEventListener("click", () => {
      avatarStore.saveFinalChoice(selected);
      const chosenData = selected === "phase1" ? avatar1 : avatar2;
      this.destroy();
      onConfirm?.(selected, chosenData);
      this.onComplete?.("phase3", chosenData);
    });
  }

  #setupCanvas() {
    this.canvas = this.modal.querySelector(".sara-drawing-canvas");
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    this.undoStack = [];
    this.hasDrawn = false;

    // High DPI scaling
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = 400;
    const height = 400;

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.ctx.scale(dpr, dpr);

    // Initial white paper background
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(0, 0, width, height);
    this.#saveSnapshot();

    // Pointer Events with stylus pressure
    const hint = this.modal.querySelector("[data-canvas-hint]");

    const getPos = (e) => {
      const r = this.canvas.getBoundingClientRect();
      return {
        x: (e.clientX - r.left) * 400 / r.width,
        y: (e.clientY - r.top) * 400 / r.height,
        pressure: typeof e.pressure === "number" ? e.pressure : 0.5,
      };
    };

    const onPointerDown = (e) => {
      this.isDrawing = true;
      this.canvas.setPointerCapture?.(e.pointerId);
      const pos = getPos(e);
      this.lastX = pos.x;
      this.lastY = pos.y;
      if (hint) hint.style.display = "none";
      this.collector?.onPointerDown({ x: pos.x, y: pos.y, pressure: pos.pressure, width: this.baseWidth });
      this.#drawStroke(pos.x, pos.y, pos.pressure, true);
    };

    const onPointerMove = (e) => {
      if (!this.isDrawing) return;
      const pos = getPos(e);
      this.collector?.onPointerMove({ x: pos.x, y: pos.y, pressure: pos.pressure, width: this.baseWidth });
      this.#drawStroke(pos.x, pos.y, pos.pressure, false);
      this.lastX = pos.x;
      this.lastY = pos.y;
    };

    const onPointerEnd = (e) => {
      if (!this.isDrawing) return;
      this.isDrawing = false;
      this.hasDrawn = true;
      this.collector?.onPointerUp();
      this.canvas.releasePointerCapture?.(e.pointerId);
      this.#saveSnapshot();
    };

    this.canvas.addEventListener("pointerdown", onPointerDown);
    this.canvas.addEventListener("pointermove", onPointerMove);
    this.canvas.addEventListener("pointerup", onPointerEnd);
    this.canvas.addEventListener("pointercancel", onPointerEnd);
  }

  #drawStroke(x, y, pressure, isStart) {
    if (!this.ctx) return;
    this.ctx.beginPath();
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";

    if (this.isEraser) {
      this.ctx.strokeStyle = "#ffffff";
      this.ctx.lineWidth = this.baseWidth * 2.5;
    } else {
      this.ctx.strokeStyle = this.currentColor;
      // Pressure modulation: if stylus with variable pressure, scale linearly
      const pressureFactor = pressure > 0 && pressure !== 0.5 ? Math.max(0.35, pressure * 2.2) : 1;
      this.ctx.lineWidth = Math.max(1.5, this.baseWidth * pressureFactor);
    }

    if (isStart) {
      this.ctx.arc(x, y, this.ctx.lineWidth / 2, 0, Math.PI * 2);
      this.ctx.fillStyle = this.ctx.strokeStyle;
      this.ctx.fill();
    } else {
      this.ctx.moveTo(this.lastX, this.lastY);
      this.ctx.lineTo(x, y);
      this.ctx.stroke();
    }
  }

  #saveSnapshot() {
    if (!this.ctx || !this.canvas) return;
    try {
      const imgData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      this.undoStack.push(imgData);
      if (this.undoStack.length > this.maxUndo) this.undoStack.shift();
    } catch {
      // ignore
    }
  }

  #undo() {
    if (this.undoStack.length <= 1 || !this.ctx) return;
    this.undoStack.pop(); // remove current state
    const previous = this.undoStack[this.undoStack.length - 1];
    if (previous) {
      this.ctx.putImageData(previous, 0, 0);
    }
  }

  #clear() {
    if (!this.ctx || !this.canvas) return;
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(0, 0, 400, 400);
    this.#saveSnapshot();
    const hint = this.modal?.querySelector("[data-canvas-hint]");
    if (hint) hint.style.display = "block";
  }

  destroy() {
    if (this.onModalKey) document.removeEventListener("keydown", this.onModalKey, true);
    this.blockedElements?.forEach(({ element, inert }) => { element.inert = inert; });
    this.blockedElements = [];
    const returnFocus = this.returnFocus;
    this.returnFocus = null;
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
    this.canvas = null;
    this.ctx = null;
    this.isDrawing = false;
    this.undoStack = [];
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  }
}
