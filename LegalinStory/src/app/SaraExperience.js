import { App } from "./App.js";
import { LocalStorageSaveStore, MemorySaveStore } from "../services/saveStores.js";
import { personPortrait, illustrations, framePortrait } from "../content/characterImages.js";
import { DrawingCanvasModal } from "../ui/DrawingCanvasModal.js";
import { avatarStore } from "../services/avatarStore.js";
import { t, getLang, LANGS, LANG_LABELS, setLang } from "../i18n.js";

export const SARA_SAVE_KEY = "sara.save";
// Marca de sesión para retomar la partida tras recargar por cambio de idioma.
const LANG_SWITCH_KEY = "sara.langSwitch";
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
    this.novelTitle = t("storyTitles.sara");
    root.querySelector(".novel").setAttribute("aria-label", this.novelTitle);
    this.drawingModal = new DrawingCanvasModal({ container: root });
    this.phase1Triggered = false;
    this.phase2Triggered = false;
    this.phase3Triggered = false;
    this.referenceNode = null;
    root.classList.add("sara-mode");
    this.novel = root.querySelector(".novel");
    this.cast = element("div", "sara-cast");
    // En los chats se ilumina quien acaba de escribir; al terminar, todos en color.
    root.addEventListener("chat-message", ({ detail }) => {
      const name = detail.from?.split(" · ")[0];
      for (const frame of this.cast.children) frame.classList.toggle("is-speaking", frame.dataset.person === name);
    });
    root.addEventListener("chat-finished", () => {
      for (const frame of this.cast.children) frame.classList.remove("is-speaking");
      this.cast.classList.add("is-chat-done");
    });
    this.cast.setAttribute("aria-hidden", "true");
    this.cast.hidden = true;
    root.querySelector("[data-scene]").append(this.cast);
    root.classList.add("sara-has-cast");
    root.insertAdjacentHTML("beforeend", `
      <header class="sara-top" data-sara-chrome hidden>
        <div class="sara-top-nav">
          <button type="button" class="sara-back-button" data-sara-action="back" aria-label="${t("sara.previousLine")}" title="${t("sara.previousLine")}" disabled>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>
          </button>
          <div class="sara-chapter"><span class="sara-eyebrow" data-sara-chapter-number></span><span data-sara-chapter></span></div>
        </div>
        <button type="button" class="sara-menu-button" data-sara-action="pause" aria-label="${t("sara.menuAria")}">${t("sara.menu")}</button>
      </header>
      <section class="sara-overlay" data-sara-overlay hidden>
        <div class="sara-dialog" role="dialog" aria-modal="true" aria-labelledby="sara-dialog-title" tabindex="-1">
          <header class="sara-dialog-head"><span class="sara-eyebrow">CHAVALES LEGALES</span><button type="button" class="sara-close" data-sara-close aria-label="${t("sara.closeAria")}">${t("sara.close")}</button></header>
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
    // Clic en el fondo oscuro (fuera de la tarjeta) cierra el panel. Se escucha
    // `pointerdown` y no `click` para que arrastrar texto dentro y soltar fuera
    // no cuente como un clic en el fondo. En la portada no hay nada detrás y
    // `closePanel` ya ignora ese modo.
    this.overlay.addEventListener("pointerdown", (event) => {
      if (event.target === this.overlay) this.closePanel();
    });
    const personIds = {
      Irene: "irene",
      "Irene · abogada": "irene",
      "Irene · advocada": "irene",
      "Irene · avogada": "irene",
      "Irene · abokatua": "irene",
      Abogada: "irene",
      Advocada: "irene",
      Avogada: "irene",
      Abokatua: "irene",
      Abogado: "defence",
      Advocat: "defence",
      Avogado: "defence",
      "Abogado de Javier": "defence",
      Elena: "elena",
      "Elena · trabajadora social": "elena",
      "Trabajadora social": "elena",
      Jueza: "judge",
      Juez: "judge",
      Fiscal: "prosecutor",
      "Psicóloga": "psychologist",
      "Oficina de víctimas": "victimOffice",
      "Oficina judicial": "courtOffice",
      Letrada: "clerk",
      "Letrada (LAJ)": "clerk",
    };
    this.app.view.setLegalPersonReference(
      (speaker) => {
        if (!speaker) return null;
        const clean = speaker.split(" · ")[0].trim();
        const id = personIds[speaker] || personIds[clean] || (clean.toLowerCase().includes("irene") ? "irene" : null);
        return this.guide.peopleTable?.rows.find(
          (person) => (id && person.id === id) || person.id === speaker || person.id === clean || person.name === speaker || person.name === clean
        );
      },
      (personId) => this.openPerson(personId),
    );

    this.onRootClick = (event) => {
      const button = event.target.closest("[data-sara-action]");
      if (!button) return;
      const action = button.dataset.saraAction;
      if (action === "back") { if (this.engine.back()) this.app.view.skipTyping(); return; }
      if (["pause", "help", "restart", "people"].includes(action)) this.openPanel(action);
    };
    root.addEventListener("click", this.onRootClick);
    this.onKey = (event) => this.handleOverlayKey(event);
    document.addEventListener("keydown", this.onKey, true);
    this.unsubscribe = this.app.bus.on("state", () => this.sync());
    // The epilogue offers a real restart, using the same menu as mid-story pause.
    const restart = element("button", "ending-button", t("sara.restart"));
    restart.type = "button";
    restart.dataset.saraAction = "restart";
    root.querySelector(".ending-actions").append(restart);
    this.start();
  }

  start() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("avatar") === "1" || params.get("mode") === "avatar") {
      this.engine.saveStore = this.localStore;
      this.engine.initialFlags = { resolution: "conviction" };
      this.phase1Triggered = false;
    this.phase2Triggered = false;
      this.phase3Triggered = false;
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
    // Un cambio de idioma recarga la novela: si dejamos la partida apuntada,
    // seguimos en el mismo nodo en vez de volver a la portada.
    if (this.resumeAfterLanguageSwitch()) {
      this.begin(true);
      return;
    }
    this.showLanding();
  }

  /**
   * Recoge la partida que dejó `changeLanguage()`. La guarda en el store local
   * y devuelve true para que `start()` la retome.
   */
  resumeAfterLanguageSwitch() {
    let raw = null;
    try {
      raw = sessionStorage.getItem(LANG_SWITCH_KEY);
      sessionStorage.removeItem(LANG_SWITCH_KEY);
    } catch {
      return false;
    }
    if (!raw || raw === "1") return false;
    try {
      const snapshot = JSON.parse(raw);
      if (!snapshot || typeof snapshot.nodeId !== "string" || !this.engine.story[snapshot.nodeId]) return false;
      this.localStore.save(snapshot);
      return true;
    } catch {
      return false;
    }
  }

  validSave() {
    const saved = this.localStore.load();
    if (!saved || !this.engine.story[saved.nodeId]) return null;
    return saved;
  }

  showLanding() {
    this.engine.isRunning = false;
    this.referenceNode = null;
    this.openShell("start", "Sara");
    this.chrome.forEach((node) => { node.hidden = true; });
    this.overlay.classList.add("is-landing");
    this.close.hidden = true;
    const saved = this.validSave();
    this.body.innerHTML = `
      <div class="sara-landing-grid">
        <div class="sara-landing-copy">
          <p class="sara-tagline">${t("sara.tagline")}</p>
          <p class="sara-landing-intro">${t("sara.landingIntro")}</p>
          <button type="button" class="sara-primary" data-sara-start>${t("sara.startStory")} <span aria-hidden="true">→</span></button>
          ${saved ? `<button type="button" class="sara-secondary" data-sara-resume>${t("sara.resumeStory")}</button>` : ""}
          <button type="button" class="sara-text-button" data-sara-exit>${t("sara.backHome")}</button>
        </div>
        <div class="sara-hero" aria-hidden="true">
          <img src="${illustrations.saraHappy.src}" alt="" draggable="false"/>
        </div>
      </div>`;
    this.body.querySelector("[data-sara-start]").addEventListener("click", () => this.begin(false));
    this.body.querySelector("[data-sara-resume]")?.addEventListener("click", () => this.begin(true));
    this.body.querySelector("[data-sara-exit]")?.addEventListener("click", () => this.onExit?.());
    this.body.querySelector("[data-sara-start]").focus({ preventScroll: true });
  }

  begin(resume) {
    this.engine.saveStore = this.localStore;
    this.engine.initialFlags = { resolution: "conviction" };
    if (!resume) {
      this.localStore.clear();
      avatarStore.clear();
      this.phase1Triggered = false;
    this.phase2Triggered = false;
      this.phase3Triggered = false;
    }

    this.closePanel(true);
    this.engine.start({ resume });
    this.updateAvatarUI();
  }

  updateAvatarUI() {
    // Drawings belong to the child's profile; story characters keep their artwork.
    if (this.mode === "pause") this.renderPause();
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
    const label = isPhase1 ? t("drawing.drawing1Title") : t("drawing.drawing2Title");
    card.innerHTML = `
      <div class="sara-ending-avatar-wrap">
        <img src="${chosen}" alt="${t("sara.chosenAvatarAlt")}" class="sara-ending-avatar-img">
      </div>
      <div class="sara-ending-avatar-info">
        <strong>${t("sara.endingAvatarTitle")}</strong>
        <span>${label}</span>
      </div>
    `;
  }

  jumpToChapter(chapterId) {
    // Find the starting node for the given chapter id
    let targetNodeId = null;
    for (const [id, node] of Object.entries(this.engine.story)) {
      if (node.chapter === chapterId) {
        targetNodeId = id;
        break;
      }
    }
    if (!targetNodeId) return;

    // Adjust drawing phases flags based on chapter target so debug jumps won't block
    if (chapterId >= 3) {
      this.phase2Triggered = true;
    } else {
      this.phase2Triggered = false;
    }

    this.app.paused = false;
    this.app.view.resetTransientOverlays();
    this.closePanel(true);
    this.engine.jumpTo(targetNodeId);
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
    this.overlay.classList.toggle("is-people", mode === "people");
    this.overlay.classList.toggle("is-person", mode === "person");
    this.close.hidden = false;
    this.title.textContent = title;
    this.body.replaceChildren();
    delete this.body.dataset.personId;
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
    const titles = { help: t("sara.titleHelp"), pause: t("sara.titlePause"), restart: t("sara.titleRestart"), people: this.guide.peopleTable?.title };
    this.openShell(mode, titles[mode] ?? "Sara");
    if (mode === "people") this.renderPeople();
    else if (mode === "help") this.renderHelp();
    else if (mode === "restart") {
      this.body.append(element("p", "sara-panel-intro", t("sara.restartIntro")));
      this.button(t("sara.restartConfirm"), () => {
        this.localStore.clear();
        this.engine.saveStore?.clear();
        avatarStore.clear();
        this.app.view.seenLegalRoles.clear();
        this.showLanding();
      }, "sara-primary");
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
    this.body.replaceChildren();
    this.body.append(element("p", "sara-panel-intro", t("sara.pauseIntro")));
    const avatar = avatarStore.getActiveAvatar();
    if (avatar) {
      const profile = element("div", "sara-pause-profile");
      const image = element("img"); image.src = avatar; image.alt = t("sara.yourDrawing");
      profile.append(image, element("span", "", t("sara.drawingWithYou")));
      this.body.append(profile);
    }
    this.button(t("sara.keepGoing"), () => this.closePanel(), "sara-primary");
    const previous = this.button(t("sara.previousLine"), () => {
      this.closePanel();
      if (this.engine.back()) this.app.view.skipTyping();
    });
    previous.disabled = this.engine.history.length === 0 || this.engine.isFinished;
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
      status.textContent = input.checked ? t("sara.savedDeviceOnly") : t("sara.visitOnly");
    });
    label.append(input, document.createTextNode(t("sara.saveOnDevice")));
    this.body.append(label);
    const status = element("p", "sara-fineprint", input.checked ? t("sara.localSaveOn") : t("sara.visitOnly"));
    status.setAttribute("role", "status");
    this.body.append(status);
    // El selector de capítulo va justo antes de "Letra más grande": es la opción que
    // más se usa dentro del menú y empuja un escalón hacia abajo al resto.
    const chapterSelector = this.chapterSelector();
    if (chapterSelector) this.body.append(chapterSelector);
    this.body.append(this.languageSelector());
    this.toggleRow(t("sara.largeText"), this.root.classList.contains("sara-large-text"), (checked) => {
      this.root.classList.toggle("sara-large-text", checked);
    });
    this.toggleRow(t("sara.instantText"), Boolean(this.app.view.typewriter.instant), (checked) => {
      this.app.view.typewriter.instant = checked;
    });
    this.button(t("sara.restartStory"), () => this.openPanel("restart"));
    this.button(t("sara.exitStory"), () => this.onExit?.());
  }

  /** Fila con casilla: el estado se ve en el cuadrado con tick, no pintando el botón. */
  toggleRow(label, checked, onChange) {
    const row = element("label", "sara-toggle");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "sara-toggle-input";
    input.checked = checked;
    input.addEventListener("change", () => onChange(input.checked));
    const box = element("span", "sara-toggle-box");
    box.setAttribute("aria-hidden", "true");
    row.append(input, box, element("span", "sara-toggle-text", label));
    this.body.append(row);
    return input;
  }

  /** Selector de capítulo del menú de pausa. Null si la guía no trae capítulos. */
  chapterSelector() {
    if (!this.guide?.chapters?.length) return null;
    const currentChapter = this.engine.currentNode?.chapter;
    const initialCh = this.guide.chapters.find((c) => c.id === currentChapter) ?? this.guide.chapters[0];
    return this.dropdown({
      value: initialCh
        ? `${t("sara.chapterOf", { n: initialCh.id, total: this.guide.chapters.length })}: ${initialCh.title ?? ""}`
        : t("novel.chapterSelect"),
      ariaLabel: t("novel.chapterSelectTitle"),
      options: this.guide.chapters.map((ch) => ({
        value: ch.id,
        label: `${t("sara.chapterOf", { n: ch.id, total: this.guide.chapters.length })}: ${ch.title ?? ""}`,
        selected: ch.id === currentChapter,
      })),
      onSelect: (chapterId) => this.jumpToChapter(chapterId),
    });
  }

  /** Idioma de la novela, debajo del selector de capítulos. */
  languageSelector() {
    const current = getLang();
    return this.dropdown({
      value: `${t("sara.language")}: ${LANG_LABELS[current] ?? current}`,
      ariaLabel: t("sara.language"),
      options: LANGS.map((code) => ({
        value: code,
        label: LANG_LABELS[code] ?? code,
        selected: code === current,
      })),
      onSelect: (code) => this.changeLanguage(code),
    });
  }

  changeLanguage(code) {
    if (code === getLang()) return;
    // El contenido y las cadenas se resuelven al cargar: recargamos y retomamos
    // la partida en el mismo nodo para no devolver al alumno a la portada.
    try {
      const snapshot = this.engine.saveStore?.load();
      sessionStorage.setItem(LANG_SWITCH_KEY, snapshot ? JSON.stringify(snapshot) : "1");
    } catch {
      // Sin sessionStorage el idioma cambia igual; solo se pierde la posición.
    }
    setLang(code);
    location.reload();
  }

  /** Desplegable de la pausa (capítulos, idioma): trigger + listbox, sin `select` nativo. */
  dropdown({ value, ariaLabel, options, onSelect }) {
    const container = element("div", "sara-pause-dropdown");
    const trigger = element("button", "sara-pause-dropdown-trigger");
    trigger.type = "button";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-label", ariaLabel);

    const valueSpan = element("span", "sara-pause-dropdown-value", value);
    const arrowSpan = element("span", "sara-pause-dropdown-arrow", "▾");
    arrowSpan.setAttribute("aria-hidden", "true");
    trigger.append(valueSpan, arrowSpan);

    const list = element("ul", "sara-pause-dropdown-list");
    list.setAttribute("role", "listbox");
    list.setAttribute("aria-label", ariaLabel);
    list.hidden = true;

    // El listener de fuera solo vive mientras la lista está abierta: el panel
    // se vuelve a pintar cada vez que se abre y no debe acumular handlers.
    const onPointerDown = (event) => {
      if (!container.contains(event.target)) toggleList(false);
    };
    const toggleList = (open) => {
      const isOpen = open !== undefined ? open : list.hidden;
      list.hidden = !isOpen;
      trigger.setAttribute("aria-expanded", String(isOpen));
      container.classList.toggle("is-open", isOpen);
      if (isOpen) document.addEventListener("pointerdown", onPointerDown);
      else document.removeEventListener("pointerdown", onPointerDown);
    };

    trigger.addEventListener("click", () => toggleList());

    for (const option of options) {
      const item = element("li", "sara-pause-dropdown-item");
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", String(option.selected));
      if (option.selected) item.classList.add("is-selected");
      item.textContent = option.label;
      item.addEventListener("click", () => {
        toggleList(false);
        onSelect(option.value);
      });
      list.append(item);
    }

    container.append(trigger, list);
    return container;
  }

  link(title, href) {
    const link = element("a", "sara-resource-link", title + " ↗");
    link.href = href; link.target = "_blank"; link.rel = "noopener noreferrer"; link.referrerPolicy = "no-referrer";
    link.setAttribute("aria-label", t("sara.newTab", { title }));
    return link;
  }

  renderHelp() {
    this.body.append(element("p", "sara-panel-intro", t("sara.helpIntro")));
    for (const resource of this.legal.help) {
      const card = element("article", "sara-note");
      card.append(element("h2", "", resource.title), element("p", "", resource.text));
      if (resource.phone) { const phone = element("a", "sara-phone", t("sara.call", { phone: resource.phone === "112" ? "112" : "900 20 20 10" })); phone.href = `tel:${resource.phone}`; card.append(phone); }
      if (resource.url) card.append(this.link(t("sara.officialResource"), resource.url));
      this.body.append(card);
    }
    this.body.append(element("p", "sara-fineprint", t("sara.helpNote", { date: this.legal.checkedAt })));
  }

  openPerson(personId) {
    const person = this.guide.peopleTable?.rows.find((row) => row.id === personId);
    if (!person) return;
    this.openShell("person", person.name);
    this.body.dataset.personId = person.id;
    this.body.append(element("p", "sara-person-summary", person.summary), element("p", "sara-person-explanation", person.detail));
    this.button(this.guide.peopleTable.continueLabel, () => this.closePanel(), "sara-primary");
  }

  renderPeople() {
    const content = this.guide.peopleTable;
    this.body.append(element("p", "sara-panel-intro", content.intro));
    const table = element("table", "sara-people-table");
    table.setAttribute("aria-labelledby", this.title.id);
    const head = table.createTHead().insertRow();
    for (const label of [content.personColumn, content.taskColumn]) {
      const cell = element("th", "", label);
      cell.scope = "col";
      head.append(cell);
    }
    const rows = table.createTBody();
    for (const person of content.rows) {
      const row = rows.insertRow();
      const name = element("th");
      name.scope = "row";
      const toggle = element("button", "sara-person-toggle");
      toggle.type = "button";
      toggle.dataset.personId = person.id;
      toggle.append(element("span", "sara-person-name", person.name));
      const detail = rows.insertRow();
      detail.hidden = true;
      detail.id = `sara-person-detail-${person.id}`;
      detail.className = "sara-person-detail";
      const cell = detail.insertCell();
      cell.colSpan = 2;
      cell.textContent = person.detail;
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-controls", detail.id);
      toggle.addEventListener("click", () => {
        const expanded = toggle.getAttribute("aria-expanded") === "true";
        for (const other of table.querySelectorAll('[aria-expanded="true"]')) {
          other.setAttribute("aria-expanded", "false");
          document.getElementById(other.getAttribute("aria-controls")).hidden = true;
          other.closest("tr").classList.remove("is-open");
        }
        toggle.setAttribute("aria-expanded", String(!expanded));
        detail.hidden = expanded;
        row.classList.toggle("is-open", !expanded);
      });
      name.append(toggle);
      row.append(name, element("td", "", person.summary));
    }
    const scroll = element("div", "sara-people-scroll");
    scroll.append(table);
    this.body.append(scroll);
    const actions = element("div", "sara-people-actions");
    const continueButton = this.button(content.continueLabel, () => {
      this.closePanel();
      if (this.engine.currentNode.reference === "people") this.app.advance();
    }, "sara-primary", actions);
    continueButton.dataset.saraPeopleContinue = "";
    this.body.append(actions);
  }

  sync() {
    const node = this.engine.currentNode;
    this.root.dataset.saraNode = this.engine.nodeId;

    // Los dibujos cierran capítulo: el primero al acabar el 1 (antes de la
    // tarjeta del 2) y el segundo al acabar el 2 (antes de la del 3).
    if (this.engine.nodeId === "c2-card" && !avatarStore.isPhase1Completed() && !this.phase1Triggered) {
      this.phase1Triggered = true;
      this.engine.history = [];
      this.app.paused = true;
      this.drawingModal.open({
        phase: "phase1",
        onConfirm: () => {
          this.engine.history = [];
          this.updateAvatarUI();
          this.app.paused = false;
          this.sync();
        },
      });
      return;
    }

    if (this.engine.nodeId === "c3-card" && !avatarStore.isPhase2Completed() && !this.phase2Triggered) {
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
    this.root.querySelector("[data-sara-chapter-number]").textContent = t("sara.chapterOf", { n: node.chapter, total: this.guide.chapters.length });
    this.root.querySelector("[data-sara-chapter]").textContent = chapter?.title ?? t("sara.defaultChapter");
    this.renderCast(node);
    const backBtn = this.root.querySelector("[data-sara-action='back']");
    if (backBtn) backBtn.disabled = this.engine.history.length === 0 || this.engine.isFinished;
    // One opening per visit, including a restored save. Closing it does not reopen it.
    if (node.reference === "people" && this.referenceNode !== this.engine.nodeId) {
      this.referenceNode = this.engine.nodeId;
      this.openPanel("people");
    } else if (node.reference !== "people") this.referenceNode = null;
  }

  renderCast(node) {
    this.cast.hidden = !["dialogue", "choice", "chat"].includes(node.type);
    this.cast.classList.toggle("is-chat", node.type === "chat");
    this.cast.classList.remove("is-chat-done");
    if (this.cast.hidden) return;
    if (node.type === "chat") return this.renderChatCast(node);
    // Portraits are keyed by the untranslated speaker name.
    const speaker = (node.speakerKey ?? node.speaker)?.split(" · ")[0];
    let partner = speaker && speaker !== "Sara" ? speaker : null;
    let expression = this.engine.stage.character?.expression;
    for (const snapshot of [...this.engine.history].reverse()) {
      const previous = this.engine.story[snapshot.nodeId];
      if (previous.chapter !== node.chapter || previous.type === "interstitial" || snapshot.stage?.background !== this.engine.stage.background) break;
      const name = (previous.speakerKey ?? previous.speaker)?.split(" · ")[0];
      if (!partner && name && name !== "Sara" && personPortrait(name)) partner = name;
      if (!expression && snapshot.stage?.character?.id === "sara") expression = snapshot.stage.character.expression;
      if (partner && expression) break;
    }
    if (node.type === "dialogue" && (!speaker || node.tone === "thought")) partner = null;
    const names = partner ? ["Sara", partner] : ["Sara"];
    this.cast.dataset.count = String(names.length);
    const frames = new Map([...this.cast.children].map(frame => [frame.dataset.person, frame]));
    for (const [name, frame] of frames) {
      if (!names.includes(name)) frame.remove();
    }
    for (const name of names) {
      const art = personPortrait(name, { expression, nodeId: this.engine.nodeId });
      const source = art?.src;
      if (!source) continue;
      let frame = frames.get(name);
      if (!frame) {
        frame = element("div", "sara-cast-person");
        frame.dataset.person = name;
        frame.append(element("div", "sara-portrait-window"));
        this.cast.append(frame);
      }
      frame.classList.toggle("is-speaking", name === speaker);
      if (frame.dataset.source === source) continue;
      frame.dataset.source = source;
      const image = element("img");
      image.alt = "";
      image.draggable = false;
      const ready = () => {
        if (!this.cast.contains(frame) || frame.dataset.source !== source) return;
        const previous = [...frame.querySelectorAll("img")];
        frame.querySelector(".sara-cast-fallback")?.remove();
        framePortrait(image, art);
        image.classList.add("is-entering");
        frame.querySelector(".sara-portrait-window").append(image);
        previous.forEach(old => old.classList.add("is-leaving"));
        window.setTimeout(() => previous.forEach(old => old.remove()), 180);
      };
      const failed = () => {
        if (!this.cast.contains(frame) || frame.dataset.source !== source || frame.querySelector("img")) return;
        frame.querySelector(".sara-portrait-window").replaceChildren(element("span", "sara-cast-fallback", name));
      };
      image.src = source;
      if (typeof image.decode === "function") image.decode().then(ready, failed);
      else { image.onload = ready; image.onerror = failed; }
    }
  }

  // En un chat, quien escribe va a la izquierda del móvil y Sara a la derecha,
  // igual que sus burbujas. Se pintan en gris para no competir con la pantalla.
  renderChatCast(node) {
    const contact = (node.messages ?? []).map(m => (m.fromKey ?? m.from)?.split(" · ")[0]).find(name => name && name !== "Sara")
      ?? (node.chatTitle ?? "").split(" · ")[0];
    const names = [contact, "Sara"].filter(name => name && personPortrait(name));
    this.cast.dataset.count = String(names.length);
    this.cast.replaceChildren(...names.map(name => {
      const art = personPortrait(name);
      const frame = element("div", "sara-cast-person");
      frame.dataset.person = name;
      const windowEl = element("div", "sara-portrait-window");
      const image = element("img");
      image.alt = "";
      image.draggable = false;
      image.onload = () => framePortrait(image, art);
      image.src = art.src;
      windowEl.append(image);
      frame.append(windowEl);
      return frame;
    }));
  }

  handleOverlayKey(event) {
    if (this.drawingModal.modal) return;
    if (this.overlay.hidden) {
      if (event.key === "Escape" && this.engine.isRunning) {
        event.preventDefault(); event.stopImmediatePropagation(); this.openPanel("pause");
      }
      return;
    }
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
    this.root.classList.remove("sara-mode", "sara-large-text", "sara-has-cast");
  }
}
