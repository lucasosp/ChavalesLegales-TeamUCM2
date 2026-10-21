import { App } from "./App.js";
import { LocalStorageSaveStore, MemorySaveStore } from "../services/saveStores.js";
import { personImage, speakerSprite, imageUrl, hasCharacterImages } from "../content/characterImages.js";
import { DrawingCanvasModal } from "../ui/DrawingCanvasModal.js";
import { avatarStore } from "../services/avatarStore.js";

export const SARA_SAVE_KEY = "sara.save";
const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const element = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

/** Sara's chrome composes the existing view and graph; it contains no story routing. */
export class SaraExperience {
  constructor({ root, content, guide, legal, onExit }) {
    this.root = root;
    this.guide = guide;
    this.legal = legal;
    this.onExit = onExit;
    this.localStore = new LocalStorageSaveStore(SARA_SAVE_KEY);
    this.app = new App({ root, ...content, onExit, saveStore: new MemorySaveStore(), initialFlags: { resolution: "conviction" } });
    this.engine = this.app.engine;
    this.app.view.autoFocusStory = true;
    this.drawingModal = new DrawingCanvasModal({ container: root });
    this.phase2Triggered = false;
    this.phase3Triggered = false;
    root.classList.add("sara-mode");
    this.novel = root.querySelector(".novel");
    root.insertAdjacentHTML("beforeend", `
      <header class="sara-top" data-sara-chrome hidden>
        <button class="sara-wordmark" type="button" data-sara-action="pause" aria-label="Sara: abrir menú de pausa">SARA<span>mi historia sigue</span></button>
        <div class="sara-chapter"><span data-sara-chapter></span><progress data-sara-progress max="6" value="0" aria-label="Capítulos completados"></progress></div>
        <div class="sara-avatar-badge" data-sara-avatar-badge hidden title="Tu foto de perfil">
          <img data-sara-top-avatar alt="Foto de perfil del avatar" />
          <span class="sara-avatar-status" data-sara-avatar-status>Perfil</span>
        </div>
        <button type="button" class="sara-icon-button" data-sara-action="help">Ayuda real</button>
        <button type="button" class="sara-icon-button" data-sara-action="pause" aria-label="Pausar historia">Ⅱ <span class="sara-desktop">Pausa</span></button>
      </header>
      <p class="sara-location" data-sara-location hidden></p>
      <div class="sara-speaker-card" data-sara-portrait hidden aria-hidden="true"></div>
      <nav class="sara-bottom" data-sara-chrome hidden aria-label="Herramientas de la historia">
        <button type="button" data-sara-action="back" disabled><span aria-hidden="true">←</span> Volver</button>
        <button type="button" data-sara-action="map"><span aria-hidden="true">◎</span> Recorrido</button>
        <button type="button" data-sara-action="people"><span aria-hidden="true">♧</span> Personas</button>
        <button type="button" data-sara-action="notebook"><span aria-hidden="true">▤</span> Cuaderno <small data-sara-notes>0</small></button>
      </nav>
      <section class="sara-overlay" data-sara-overlay hidden>
        <div class="sara-dialog" role="dialog" aria-modal="true" aria-labelledby="sara-dialog-title" tabindex="-1">
          <header class="sara-dialog-head"><span class="sara-eyebrow">CHAVALES LEGALES</span><button type="button" class="sara-close" data-sara-close aria-label="Cerrar panel y volver a la historia">Cerrar ×</button></header>
          <h1 id="sara-dialog-title"></h1><div data-sara-body></div>
        </div>
      </section>`);
    this.chrome = [...root.querySelectorAll("[data-sara-chrome]")];
    this.overlay = root.querySelector("[data-sara-overlay]");
    this.dialog = this.overlay.querySelector(".sara-dialog");
    this.body = root.querySelector("[data-sara-body]");
    this.title = root.querySelector("#sara-dialog-title");
    this.close = root.querySelector("[data-sara-close]");
    this.close.addEventListener("click", () => this.closePanel());
    this.onRootClick = (event) => {
      const button = event.target.closest("[data-sara-action]");
      if (!button) return;
      const action = button.dataset.saraAction;
      if (action === "back") {
        if (this.engine.back()) {
          this.app.view.skipTyping();
          if (this.engine.currentNode.type === "dialogue") this.app.view.refs.advance.focus({ preventScroll: true });
        }
        return;
      }
      this.openPanel(action);
    };
    root.addEventListener("click", this.onRootClick);
    this.onKey = (event) => this.handleOverlayKey(event);
    document.addEventListener("keydown", this.onKey, true);
    this.unsubscribe = this.app.bus.on("state", () => this.sync());
    // The epilogue offers a real restart, using the same menu as mid-story pause.
    const restart = element("button", "ending-library", "Volver a empezar");
    restart.type = "button";
    restart.dataset.saraAction = "restart";
    root.querySelector(".ending-actions").append(restart);
    this.start();
  }

  start() { this.showLanding(); }

  validSave() {
    const saved = this.localStore.load();
    if (!saved || !this.engine.story[saved.nodeId]) return null;
    return saved;
  }

  showLanding() {
    this.engine.isRunning = false;
    this.openShell("start", "Sara");
    this.chrome.forEach((node) => { node.hidden = true; });
    this.overlay.classList.add("is-landing");
    this.close.hidden = true;
    const saved = this.validSave();
    this.body.innerHTML = `
      <div class="sara-landing-grid">
        <div class="sara-landing-copy">
          <p class="sara-tagline">Mi historia sigue.</p>
          <button type="button" class="sara-primary" data-sara-start>Acceder a la historia <span aria-hidden="true">→</span></button>
          ${saved ? '<button type="button" class="sara-secondary" data-sara-resume>Continuar partida guardada</button>' : ""}
          <div hidden>
            <button type="button" data-sara-action="help">Ayuda fuera de la historia</button>
            <input type="checkbox" data-sara-save checked>
            <select data-sara-resolution><option value="conviction" selected>Con condena</option><option value="no-conviction">Sin condena</option></select>
          </div>
        </div>
        <div class="sara-hero">
          <div class="sara-hero-orbit" aria-hidden="true">✦</div>
          <img src="${hasCharacterImages() ? imageUrl("sara_feliz.png") : "assets/characters/sara/smile.svg"}" alt="Sara, protagonista de la historia"/>
        </div>
      </div>`;
    this.body.querySelector("[data-sara-start]").addEventListener("click", () => this.begin(false));
    this.body.querySelector("[data-sara-resume]")?.addEventListener("click", () => this.begin(true));
    this.body.querySelector("[data-sara-exit]")?.addEventListener("click", () => this.onExit?.());
    this.body.querySelector("[data-sara-start]").focus({ preventScroll: true });
  }

  begin(resume) {
    const save = this.body.querySelector("[data-sara-save]")?.checked ?? true;
    this.engine.saveStore = save ? this.localStore : new MemorySaveStore();
    this.engine.initialFlags = { resolution: this.body.querySelector("[data-sara-resolution]")?.value ?? "conviction" };
    if (!resume || !save) {
      this.localStore.clear();
      avatarStore.clear();
      this.phase2Triggered = false;
      this.phase3Triggered = false;
    }

    if (!resume && !avatarStore.isPhase1Completed()) {
      this.closePanel(true);
      this.drawingModal.open({
        phase: "phase1",
        onConfirm: () => {
          this.engine.history = [];
          this.updateAvatarUI();
          this.engine.start({ resume: false });
        },
      });
      return;
    }

    this.closePanel(true);
    this.engine.start({ resume });
    this.updateAvatarUI();
  }

  updateAvatarUI() {
    const badge = this.root.querySelector("[data-sara-avatar-badge]");
    const img = this.root.querySelector("[data-sara-top-avatar]");
    const status = this.root.querySelector("[data-sara-avatar-status]");
    const activeAvatar = avatarStore.getActiveAvatar();

    if (badge && img) {
      if (activeAvatar) {
        badge.hidden = false;
        img.src = activeAvatar;
        if (status) {
          status.textContent = avatarStore.isPhase3Completed()
            ? "Definitivo"
            : avatarStore.isPhase2Completed()
            ? "Post-trauma"
            : "Inicio";
        }
      } else {
        badge.hidden = true;
      }
    }
  }

  renderEndingAvatarCard(choice, dataUrl) {
    const endingActions = this.root.querySelector(".ending-actions");
    if (!endingActions) return;
    let card = this.root.querySelector(".sara-ending-avatar-card");
    if (!card) {
      card = document.createElement("div");
      card.className = "sara-ending-avatar-card";
      endingActions.parentNode.insertBefore(card, endingActions);
    }
    const chosen = dataUrl || avatarStore.getActiveAvatar();
    const isPhase1 = (choice || avatarStore.getFinalChoice()) === "phase1";
    const label = isPhase1 ? "Dibujo 1 (Antes del evento)" : "Dibujo 2 (Post-trauma)";
    card.innerHTML = `
      <div class="sara-ending-avatar-wrap">
        <img src="${chosen}" alt="Avatar elegido" class="sara-ending-avatar-img">
      </div>
      <div class="sara-ending-avatar-info">
        <strong>Avatar elegido para el desenlace</strong>
        <span>${label}</span>
      </div>
    `;
  }

  openShell(mode, title) {
    if (this.overlay.hidden) this.returnFocus = document.activeElement;
    this.mode = mode;
    this.app.paused = true;
    this.app.view.skipTyping();
    this.novel.inert = true;
    this.chrome.forEach((node) => { node.inert = true; });
    this.overlay.hidden = false;
    this.overlay.classList.remove("is-landing");
    this.close.hidden = false;
    this.title.textContent = title;
    this.body.replaceChildren();
    this.dialog.scrollTop = 0;
    this.close.focus({ preventScroll: true });
  }

  closePanel(starting = false) {
    if (this.mode === "start" && !starting) return;
    if (this.helpFromLanding && !starting) { this.helpFromLanding = false; this.showLanding(); return; }
    this.overlay.hidden = true;
    this.mode = null;
    this.app.paused = false;
    this.novel.inert = false;
    this.chrome.forEach((node) => { node.inert = false; node.hidden = false; });
    if (!starting && this.returnFocus?.isConnected) this.returnFocus.focus({ preventScroll: true });
  }

  openPanel(mode) {
    if (this.mode === "start" && mode === "help") this.helpFromLanding = true;
    const titles = { map: "Un paso cada vez", people: "Personas que acompañan", notebook: "El cuaderno de Sara", help: "Ayuda fuera de la historia", pause: "Podemos parar aquí", restart: "Volver a empezar" };
    this.openShell(mode, titles[mode] ?? "Sara");
    if (mode === "map") this.renderMap();
    else if (mode === "people") this.renderPeople();
    else if (mode === "notebook") this.renderNotebook();
    else if (mode === "help") this.renderHelp();
    else if (mode === "restart") {
      this.body.append(element("p", "sara-panel-intro", "Empezar de nuevo borra el progreso de este caso en el dispositivo. Puedes elegir otra variante de demostración en la portada."));
      this.button("Borrar progreso y empezar", () => { this.localStore.clear(); this.engine.saveStore?.clear(); avatarStore.clear(); this.showLanding(); }, "sara-primary");
    } else this.renderPause();
  }

  button(label, onClick, className = "sara-secondary", parent = this.body) {
    const button = element("button", className, label);
    button.type = "button";
    button.addEventListener("click", onClick);
    parent.append(button);
    return button;
  }

  renderPause() {
    this.body.append(element("p", "sara-panel-intro", "La historia está en pausa. Puedes volver a ella cuando quieras."));
    this.button("Seguir con Sara", () => this.closePanel(), "sara-primary");
    const label = element("label", "sara-save-label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = this.engine.saveStore === this.localStore;
    input.addEventListener("change", () => {
      const snapshot = this.engine.saveStore?.load();
      if (input.checked) {
        this.engine.saveStore = this.localStore;
        if (snapshot) this.localStore.save(snapshot);
      } else { this.localStore.clear(); this.engine.saveStore = new MemorySaveStore(); if (snapshot) this.engine.saveStore.save(snapshot); }
      status.textContent = input.checked ? "Progreso guardado solo en este dispositivo." : "El progreso permanece solo durante esta visita.";
    });
    label.append(input, document.createTextNode(" Guardar en este dispositivo"));
    this.body.append(label);
    const status = element("p", "sara-fineprint", input.checked ? "Guardado local activado." : "El progreso permanece solo durante esta visita.");
    status.setAttribute("role", "status");
    this.body.append(status);
    this.button("Texto más grande / tamaño habitual", () => this.root.classList.toggle("sara-large-text"));
    this.button("Reiniciar historia…", () => this.openPanel("restart"));
    this.button("Borrar el guardado del dispositivo", () => {
      const snapshot = this.engine.saveStore?.load();
      this.localStore.clear(); this.engine.saveStore = new MemorySaveStore();
      if (snapshot) this.engine.saveStore.save(snapshot);
      input.checked = false;
      status.textContent = "Guardado eliminado. Puedes seguir jugando en memoria.";
    });
    this.button("Salir de la historia", () => this.onExit?.());
    this.body.append(element("p", "sara-fineprint", "Salir cambia de pantalla. No borra el historial del navegador. Aquí no se recogen nombres ni relatos personales."));
  }

  renderMap() {
    this.body.append(element("p", "sara-panel-intro", "Este es el recorrido de la historia de Sara. La protección y los apoyos pueden continuar mientras avanza el procedimiento. En la vida real, el orden y los tiempos pueden variar."));
    const list = element("ol", "sara-map");
    const current = this.engine.currentNode.chapter;
    for (const [index, step] of this.guide.steps.entries()) {
      const item = element("li", step.chapter < current || this.engine.isFinished ? "is-done" : step.chapter === current ? "is-current" : "");
      const details = element("details", "sara-map-step");
      const summary = element("summary");
      summary.append(element("span", "sara-step-number", String(index + 1)), element("strong", "", step.title));
      summary.append(element("small", "", step.chapter < current || this.engine.isFinished ? "Recorrido" : step.chapter === current ? "En este capítulo" : "Más adelante"));
      details.append(summary, element("p", "", step.text));
      item.append(details); list.append(item);
    }
    this.body.append(list, element("p", "sara-fineprint", "Abre cada etapa para entenderla. El mapa informa; no salta escenas ni cambia decisiones."));
  }

  renderPeople() {
    this.body.append(element("p", "sara-panel-intro", "Abre una ficha para recordar a quién puede preguntar Sara y qué hace cada persona."));
    const grid = element("div", "sara-people-grid");
    for (const person of this.guide.people) {
      const details = element("details", `sara-person ${person.color}`);
      const summary = element("summary");
      const avatar = element("span", "sara-avatar", person.initial);
      avatar.setAttribute("aria-hidden", "true");
      const portraitSource = personImage(person.name) ?? person.sprite;
      if (portraitSource) { avatar.textContent = ""; const image = document.createElement("img"); image.src = portraitSource; image.alt = ""; avatar.append(image); }
      const label = element("span"); label.append(element("strong", "", person.name), element("small", "", person.role));
      summary.append(avatar, label);
      details.append(summary, element("p", "", person.text));
      if (!portraitSource) details.append(element("small", "sara-placeholder-note", "Retrato provisional"));
      grid.append(details);
    }
    this.body.append(grid);
  }

  learned() {
    return [...new Set([...this.engine.seen].flatMap((id) => this.engine.story[id]?.learn ?? []))];
  }

  renderNotebook() {
    this.body.append(element("p", "sara-panel-intro", "Ideas que Sara ha ido encontrando. El cuaderno se completa con lo que lees y preguntas. No guarda experiencias personales."));
    const notes = this.learned();
    if (!notes.length) this.body.append(element("p", "sara-empty", "La primera página está en blanco. Las ideas aparecerán cuando Sara las descubra."));
    for (const id of notes) {
      const note = this.legal.notes[id];
      if (!note) continue;
      const card = element("article", "sara-note");
      card.append(element("h2", "", note.title), element("p", "", note.text));
      const sources = element("details", "sara-sources");
      sources.append(element("summary", "", "De dónde viene esta información"));
      for (const sourceId of note.sources) {
        const source = this.legal.sources[sourceId];
        sources.append(this.link(source.title, source.url));
      }
      card.append(sources); this.body.append(card);
    }
    this.body.append(element("p", "sara-fineprint", `Información educativa. Fuentes contrastadas: ${this.legal.checkedAt}. Las circunstancias y actuaciones cambian en cada caso.`));
  }

  link(title, href) {
    const link = element("a", "sara-resource-link", title + " ↗");
    link.href = href; link.target = "_blank"; link.rel = "noopener noreferrer"; link.referrerPolicy = "no-referrer";
    link.setAttribute("aria-label", `${title} (nueva pestaña)`);
    return link;
  }

  renderHelp() {
    this.body.append(element("p", "sara-panel-intro", "Esta sección habla de ayuda real en España. No hace falta contar nada personal en este juego."));
    for (const resource of this.legal.help) {
      const card = element("article", "sara-note");
      card.append(element("h2", "", resource.title), element("p", "", resource.text));
      if (resource.phone) { const phone = element("a", "sara-phone", `Llamar al ${resource.phone === "112" ? "112" : "900 20 20 10"}`); phone.href = `tel:${resource.phone}`; card.append(phone); }
      if (resource.url) card.append(this.link("Consultar el recurso oficial", resource.url));
      this.body.append(card);
    }
    this.body.append(element("p", "sara-fineprint", `Recursos comprobados el ${this.legal.checkedAt}. Esta demo no atiende emergencias ni presenta denuncias.`));
  }

  sync() {
    const node = this.engine.currentNode;
    this.root.dataset.saraNode = this.engine.nodeId;

    // Check for Phase 2 trigger (Post-Trauma: node c2-04, domestic crisis disclosure)
    if (this.engine.nodeId === "c2-04" && !avatarStore.isPhase2Completed() && !this.phase2Triggered) {
      this.phase2Triggered = true;
      this.engine.history = []; // Crucial: barrier to prevent rewinding before the trauma drawing
      this.app.paused = true;
      this.app.view.skipTyping();
      this.drawingModal.open({
        phase: "phase2",
        onConfirm: () => {
          this.engine.history = []; // Irreversible
          this.updateAvatarUI();
          this.app.paused = false;
          this.sync();
        },
      });
      return;
    }

    // Check for Phase 3 trigger (Ending / Epilogue: final integration & choice)
    if (node.type === "ending" && !avatarStore.isPhase3Completed() && !this.phase3Triggered) {
      this.phase3Triggered = true;
      this.engine.history = []; // Irreversible
      this.app.paused = true;
      this.drawingModal.open({
        phase: "phase3",
        onConfirm: (choice, dataUrl) => {
          this.engine.history = [];
          this.updateAvatarUI();
          this.app.paused = false;
          this.renderEndingAvatarCard(choice, dataUrl);
        },
      });
      return;
    }

    if (node.type === "ending" && avatarStore.isPhase3Completed()) {
      this.renderEndingAvatarCard();
    }

    const chapter = this.guide.chapters.find((c) => c.id === node.chapter);
    this.root.querySelector("[data-sara-chapter]").textContent = `${node.chapter}/6 · ${chapter.title}`;
    this.root.querySelector("[data-sara-progress]").value = this.engine.isFinished ? 6 : node.chapter - 1;
    this.root.querySelector('[data-sara-action="back"]').disabled = this.engine.history.length === 0;
    this.root.querySelector("[data-sara-notes]").textContent = String(this.learned().length);
    const location = this.root.querySelector("[data-sara-location]");
    location.hidden = node.type === "interstitial" || node.type === "ending";
    location.textContent = this.engine.stage.background === "quiet-room" ? "Entorno judicial · ilustración provisional" : node.chapter === 3 ? "Atención social · escenario reutilizado" : node.chapter === 4 || node.chapter === 6 ? "La vida de Sara continúa" : "Instituto · un lugar para hablar";
    const portrait = this.root.querySelector("[data-sara-portrait]");
    const speaker = node.type === "dialogue" ? node.speaker : null;
    const name = speaker?.split(" · ")[0];
    const source = name ? speakerSprite(name) : null;
    if (source && name !== "Sara") this.app.view.showSpeakerSprite(source, name);

    if (name === "Sara") {
      const activeAvatar = avatarStore.getActiveAvatar();
      if (activeAvatar) {
        portrait.hidden = false;
        portrait.className = "sara-speaker-card is-sara";
        const avatar = element("span", "sara-monogram");
        avatar.textContent = "";
        const image = document.createElement("img");
        image.src = activeAvatar;
        image.alt = "Tu avatar";
        avatar.append(image);
        portrait.replaceChildren(
          avatar,
          element("strong", "", "Sara"),
          element("span", "", avatarStore.isPhase2Completed() ? "Foto de perfil (Post-trauma)" : "Tu avatar (Fase 1)"),
          element("small", "", "Dibujo del usuario")
        );
      } else {
        portrait.hidden = true;
      }
    } else {
      portrait.hidden = !speaker || Boolean(source);
      if (!portrait.hidden) {
        const person = this.guide.people.find((p) => p.name === name);
        portrait.className = `sara-speaker-card ${person?.color ?? "green"}`;
        const portraitSource = personImage(name);
        const avatar = element("span", "sara-monogram", person?.initial ?? name[0]);
        if (portraitSource) {
          avatar.textContent = "";
          const image = document.createElement("img");
          image.src = portraitSource;
          image.alt = "";
          avatar.append(image);
        }
        portrait.replaceChildren(avatar, element("strong", "", name), element("span", "", person?.role ?? "Profesional de apoyo"));
        if (!portraitSource) portrait.append(element("small", "", "Retrato provisional"));
      }
    }
  }

  handleOverlayKey(event) {
    if (this.overlay.hidden) return;
    event.stopImmediatePropagation();
    if (event.key === "Escape" && this.mode !== "start") { event.preventDefault(); this.closePanel(); return; }
    if (event.key !== "Tab") return;
    const controls = [...this.overlay.querySelectorAll("button, a, input, select, summary")].filter((node) => !node.hidden && !node.disabled && !node.closest("[hidden]") && (!node.closest("details:not([open])") || node.tagName === "SUMMARY"));
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && (document.activeElement === first || !this.overlay.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !this.overlay.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
  }

  destroy() {
    this.drawingModal?.destroy();
    this.unsubscribe();
    document.removeEventListener("keydown", this.onKey, true);
    this.root.removeEventListener("click", this.onRootClick);
    this.app.destroy();
    this.root.classList.remove("sara-mode", "sara-large-text");
  }
}
