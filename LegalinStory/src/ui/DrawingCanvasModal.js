import { avatarStore } from "../services/avatarStore.js";

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

    const overlay = document.createElement("div");
    overlay.className = "sara-drawing-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "sara-drawing-title");

    if (phase === "phase3") {
      this.#renderPhase3(overlay, onConfirm);
    } else {
      this.#renderCanvasPhase(overlay, phase, onConfirm);
    }

    this.modal = overlay;
    this.container.append(overlay);

    if (phase !== "phase3") {
      this.#setupCanvas();
    }
  }

  #renderCanvasPhase(overlay, phase, onConfirm) {
    const isPhase1 = phase === "phase1";
    const titleText = isPhase1 ? "Fase 1 · Dibuja tu avatar (Antes)" : "Fase 2 · Tu foto de perfil (Post-trauma)";
    const introText = isPhase1
      ? "Antes de comenzar la historia, dibuja en el lienzo tu avatar o cómo te imaginas al personaje protagonista. Puedes usar lápiz digital o el ratón."
      : "Ha ocurrido el momento más difícil. Tómate un momento y vuelve a dibujar el avatar de tu personaje ahora. Este nuevo dibujo pasará a ser tu foto de perfil activa en la historia.";
    const confirmLabel = isPhase1 ? "Guardar avatar y empezar historia →" : "Actualizar foto de perfil y continuar →";

    overlay.innerHTML = `
      <div class="sara-drawing-card">
        <header class="sara-drawing-header">
          <span class="sara-eyebrow">CHAVALES LEGALES · EXPRESIÓN PROYECTIVA</span>
          <h2 id="sara-drawing-title" class="sara-drawing-title">${titleText}</h2>
          <p class="sara-drawing-instruction">${introText}</p>
        </header>

        <div class="sara-drawing-workspace">
          <div class="sara-canvas-container">
            <canvas class="sara-drawing-canvas" width="400" height="400"></canvas>
            <div class="sara-canvas-hint" data-canvas-hint>Dibuja aquí con el lápiz o el cursor</div>
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
              <span class="sara-control-label">Grosor de trazo</span>
              <div class="sara-size-grid">
                <button type="button" class="sara-size-btn" data-size="3" aria-label="Fino"><span style="width:4px;height:4px;"></span></button>
                <button type="button" class="sara-size-btn is-active" data-size="6" aria-label="Medio"><span style="width:8px;height:8px;"></span></button>
                <button type="button" class="sara-size-btn" data-size="14" aria-label="Grueso"><span style="width:14px;height:14px;"></span></button>
              </div>
              <small class="sara-pressure-note">Sensible a la presión si usas lápiz táctil</small>
            </div>

            <div class="sara-control-group sara-action-buttons">
              <button type="button" class="sara-tool-btn" data-action="undo" aria-label="Deshacer último trazo">↺ Deshacer</button>
              <button type="button" class="sara-tool-btn" data-action="clear" aria-label="Limpiar lienzo">🗑 Limpiar</button>
            </div>
          </aside>
        </div>

        <footer class="sara-drawing-footer">
          <p class="sara-lock-warning" aria-live="polite">
            🔒 <em>Una vez confirmado, no podrás retroceder para preservar la validez del dibujo.</em>
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
      });
    });

    const eraserBtn = card.querySelector('[data-action="eraser"]');
    eraserBtn.addEventListener("click", () => {
      card.querySelectorAll(".sara-color-btn").forEach((b) => b.classList.remove("is-active"));
      eraserBtn.classList.add("is-active");
      this.isEraser = true;
    });

    card.querySelectorAll("[data-size]").forEach((btn) => {
      btn.addEventListener("click", () => {
        card.querySelectorAll(".sara-size-btn").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        this.baseWidth = Number(btn.dataset.size);
      });
    });

    card.querySelector('[data-action="undo"]').addEventListener("click", () => this.#undo());
    card.querySelector('[data-action="clear"]').addEventListener("click", () => this.#clear());

    card.querySelector('[data-action="confirm"]').addEventListener("click", () => {
      const dataUrl = this.canvas.toDataURL("image/png");
      if (isPhase1) {
        avatarStore.savePhase1(dataUrl);
      } else {
        avatarStore.savePhase2(dataUrl);
      }
      this.destroy();
      onConfirm?.(dataUrl);
      this.onComplete?.(phase, dataUrl);
    });
  }

  #renderPhase3(overlay, onConfirm) {
    const avatar1 = avatarStore.getPhase1();
    const avatar2 = avatarStore.getPhase2();
    let selected = "phase2"; // default recommendation

    overlay.innerHTML = `
      <div class="sara-drawing-card sara-phase3-card">
        <header class="sara-drawing-header">
          <span class="sara-eyebrow">CHAVALES LEGALES · FASE 3 (INTEGRACIÓN)</span>
          <h2 id="sara-drawing-title" class="sara-drawing-title">¿Cuál de los dos dibujos prefieres?</h2>
          <p class="sara-drawing-instruction">
            Has llegado al final de tu recorrido. A lo largo de la historia has representado a tu personaje en dos momentos muy distintos. Elige con cuál de los dos te quedas para tu avatar definitivo.
          </p>
        </header>

        <div class="sara-comparison-grid">
          <div class="sara-choice-option" data-choice="phase1" tabindex="0" role="button" aria-pressed="false">
            <div class="sara-choice-preview">
              ${avatar1 ? `<img src="${avatar1}" alt="Avatar dibujado en Fase 1 (Antes del evento)">` : '<div class="sara-empty-avatar">Sin dibujo</div>'}
            </div>
            <strong class="sara-choice-title">Dibujo 1: Antes</strong>
            <p class="sara-choice-desc">Tu avatar al inicio de la historia, antes de los acontecimientos.</p>
            <span class="sara-choice-tag">Seleccionar</span>
          </div>

          <div class="sara-choice-option is-selected" data-choice="phase2" tabindex="0" role="button" aria-pressed="true">
            <div class="sara-choice-preview">
              ${avatar2 ? `<img src="${avatar2}" alt="Avatar dibujado en Fase 2 (Post-trauma)">` : '<div class="sara-empty-avatar">Sin dibujo</div>'}
            </div>
            <strong class="sara-choice-title">Dibujo 2: Post-trauma</strong>
            <p class="sara-choice-desc">Tu avatar tras el momento difícil y la foto de perfil en tu camino.</p>
            <span class="sara-choice-tag">Seleccionar</span>
          </div>
        </div>

        <footer class="sara-drawing-footer">
          <p class="sara-lock-warning">
            🔒 <em>Esta elección cerrará la historia y se conservará en tu despedida y cuaderno.</em>
          </p>
          <button type="button" class="sara-primary sara-confirm-choice" data-action="confirm-choice">Conservar dibujo seleccionado →</button>
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
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width || 400;
    const height = rect.height || 400;

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
        x: e.clientX - r.left,
        y: e.clientY - r.top,
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
      this.#drawStroke(pos.x, pos.y, pos.pressure, true);
    };

    const onPointerMove = (e) => {
      if (!this.isDrawing) return;
      const pos = getPos(e);
      this.#drawStroke(pos.x, pos.y, pos.pressure, false);
      this.lastX = pos.x;
      this.lastY = pos.y;
    };

    const onPointerEnd = (e) => {
      if (!this.isDrawing) return;
      this.isDrawing = false;
      this.hasDrawn = true;
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
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(0, 0, rect.width, rect.height);
    this.#saveSnapshot();
    const hint = this.modal?.querySelector("[data-canvas-hint]");
    if (hint) hint.style.display = "block";
  }

  destroy() {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
    this.canvas = null;
    this.ctx = null;
    this.isDrawing = false;
    this.undoStack = [];
  }
}
