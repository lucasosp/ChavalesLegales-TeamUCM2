import { App } from "./App.js";
import { LocalStorageSaveStore, MemorySaveStore } from "../services/saveStores.js";
import { personImage, personPortrait, illustrations, framePortrait } from "../content/characterImages.js";
import { DrawingCanvasModal } from "../ui/DrawingCanvasModal.js";
import { avatarStore } from "../services/avatarStore.js";
import { t } from "../i18n.js";

const ART_EXPRESSIONS = { "neutral": "neutral", "alegre": "happy", "triste": "sad", "llorando": "crying", "tímida": "shy", "tímida, variante": "shyAlt", "tímida, variante 2": "shyAlt2" };
/** Illustration labels are authored in Spanish; translate the expression part when shown. */
const artLabel = (label) => {
  if (label === "Jueza") return t("sara.art.judge");
  const [name, expression] = label.split(" · ");
  return expression && ART_EXPRESSIONS[expression] ? `${name} · ${t(`sara.art.${ART_EXPRESSIONS[expression]}`)}` : label;
};

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
    this.cast = element("div", "sara-cast");
    this.cast.setAttribute("aria-hidden", "true");
    this.cast.hidden = true;
    root.querySelector("[data-scene]").append(this.cast);
    root.classList.add("sara-has-cast");
    root.insertAdjacentHTML("beforeend", `
      <header class="sara-top" data-sara-chrome hidden>
        <button class="sara-wordmark" type="button" data-sara-action="pause" aria-label="${t("sara.wordmarkAria")}">SARA<span>${t("sara.wordmarkTagline")}</span></button>
        <div class="sara-chapter"><span data-sara-chapter></span><progress data-sara-progress max="6" value="0" aria-label="${t("sara.chaptersAria")}"></progress></div>
        <div class="sara-avatar-badge" data-sara-avatar-badge hidden title="${t("sara.profilePhoto")}">
          <img data-sara-top-avatar alt="${t("sara.avatarAlt")}" />
          <span class="sara-avatar-status" data-sara-avatar-status>${t("sara.profile")}</span>
        </div>
        <button type="button" class="sara-icon-button" data-sara-action="help">${t("sara.realHelp")}</button>
        <button type="button" class="sara-icon-button" data-sara-action="pause" aria-label="${t("sara.pauseAria")}">Ⅱ <span class="sara-desktop">${t("sara.pause")}</span></button>
      </header>
      <p class="sara-location" data-sara-location hidden></p>
      <div class="sara-speaker-card" data-sara-portrait hidden aria-hidden="true"></div>
      <nav class="sara-bottom" data-sara-chrome hidden aria-label="${t("sara.toolsAria")}">
        <button type="button" data-sara-action="back" disabled><span aria-hidden="true">←</span> ${t("sara.back")}</button>
        <button type="button" data-sara-action="map"><span aria-hidden="true">◎</span> ${t("sara.map")}</button>
        <button type="button" data-sara-action="people"><span aria-hidden="true">♧</span> ${t("sara.people")}</button>
        <button type="button" data-sara-action="notebook"><span aria-hidden="true">▤</span> ${t("sara.notebook")} <small data-sara-notes>0</small></button>
      </nav>
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
    const restart = element("button", "ending-library", t("sara.restart"));
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
          <p class="sara-tagline">${t("sara.tagline")}</p>
          <button type="button" class="sara-primary" data-sara-start>${t("sara.access")} <span aria-hidden="true">→</span></button>
          ${saved ? `<button type="button" class="sara-secondary" data-sara-resume>${t("sara.resume")}</button>` : ""}
          <div hidden>
            <button type="button" data-sara-action="help">${t("sara.helpOutside")}</button>
            <input type="checkbox" data-sara-save checked>
            <select data-sara-resolution><option value="conviction" selected>${t("sara.withConviction")}</option><option value="no-conviction">${t("sara.withoutConviction")}</option></select>
          </div>
        </div>
        <div class="sara-hero">
          <div class="sara-hero-orbit" aria-hidden="true">✦</div>
          <img src="${illustrations.saraHappy.src}" alt="${t("sara.heroAlt")}"/>
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
            ? t("sara.statusFinal")
            : avatarStore.isPhase2Completed()
            ? t("sara.statusPost")
            : t("sara.statusStart");
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
    const label = isPhase1 ? t("sara.drawing1Label") : t("sara.drawing2Label");
    card.innerHTML = `
      <div class="sara-ending-avatar-wrap">
        <img src="${chosen}" alt="${t("sara.chosenAvatarAlt")}" class="sara-ending-avatar-img">
      </div>
      <div class="sara-ending-avatar-info">
        <strong>${t("sara.chosenAvatarTitle")}</strong>
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
    const titles = { map: t("sara.titleMap"), people: t("sara.titlePeople"), notebook: t("sara.titleNotebook"), help: t("sara.titleHelp"), pause: t("sara.titlePause"), restart: t("sara.titleRestart") };
    this.openShell(mode, titles[mode] ?? "Sara");
    if (mode === "map") this.renderMap();
    else if (mode === "people") this.renderPeople();
    else if (mode === "notebook") this.renderNotebook();
    else if (mode === "help") this.renderHelp();
    else if (mode === "restart") {
      this.body.append(element("p", "sara-panel-intro", t("sara.restartIntro")));
      this.button(t("sara.restartConfirm"), () => { this.localStore.clear(); this.engine.saveStore?.clear(); avatarStore.clear(); this.showLanding(); }, "sara-primary");
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
    this.body.append(element("p", "sara-panel-intro", t("sara.pauseIntro")));
    this.button(t("sara.keepGoing"), () => this.closePanel(), "sara-primary");
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
    this.button(t("sara.textSize"), () => this.root.classList.toggle("sara-large-text"));
    this.button(t("sara.restartStory"), () => this.openPanel("restart"));
    this.button(t("sara.deleteSave"), () => {
      const snapshot = this.engine.saveStore?.load();
      this.localStore.clear(); this.engine.saveStore = new MemorySaveStore();
      if (snapshot) this.engine.saveStore.save(snapshot);
      input.checked = false;
      status.textContent = t("sara.saveDeleted");
    });
    this.button(t("sara.exitStory"), () => this.onExit?.());
    this.body.append(element("p", "sara-fineprint", t("sara.exitNote")));
  }

  renderMap() {
    this.body.append(element("p", "sara-panel-intro", t("sara.mapIntro")));
    const list = element("ol", "sara-map");
    const current = this.engine.currentNode.chapter;
    for (const [index, step] of this.guide.steps.entries()) {
      const item = element("li", step.chapter < current || this.engine.isFinished ? "is-done" : step.chapter === current ? "is-current" : "");
      const details = element("details", "sara-map-step");
      const summary = element("summary");
      summary.append(element("span", "sara-step-number", String(index + 1)), element("strong", "", step.title));
      summary.append(element("small", "", step.chapter < current || this.engine.isFinished ? t("sara.stepDone") : step.chapter === current ? t("sara.stepCurrent") : t("sara.stepLater")));
      details.append(summary, element("p", "", step.text));
      item.append(details); list.append(item);
    }
    this.body.append(list, element("p", "sara-fineprint", t("sara.mapNote")));
  }

  renderPeople() {
    this.body.append(element("p", "sara-panel-intro", t("sara.peopleIntro")));
    const grid = element("div", "sara-people-grid");
    for (const person of this.guide.people) {
      const details = element("details", `sara-person ${person.color}`);
      const summary = element("summary");
      const avatar = element("span", "sara-avatar", person.initial);
      avatar.setAttribute("aria-hidden", "true");
      const portraitSource = personImage(person.key ?? person.name) ?? person.sprite;
      if (portraitSource) { avatar.textContent = ""; const image = document.createElement("img"); image.src = portraitSource; image.alt = ""; avatar.append(image); }
      const label = element("span"); label.append(element("strong", "", person.name), element("small", "", person.role));
      summary.append(avatar, label);
      details.append(summary, element("p", "", person.text));
      if (!portraitSource) details.append(element("small", "sara-placeholder-note", t("sara.provisionalPortrait")));
      grid.append(details);
    }
    this.body.append(grid);
    const gallery = element("details", "sara-art-gallery");
    gallery.append(element("summary", "", t("sara.gallery")));
    const images = element("div", "sara-art-grid");
    for (const art of Object.values(illustrations)) {
      const figure = element("figure");
      const viewport = element("div", "sara-portrait-window");
      const image = element("img");
      image.addEventListener("load", () => framePortrait(image, art));
      image.src = art.src;
      image.alt = artLabel(art.label);
      image.loading = "lazy";
      viewport.append(image);
      figure.append(viewport, element("figcaption", "", artLabel(art.label)));
      images.append(figure);
    }
    gallery.append(images);
    this.body.append(gallery);
  }

  learned() {
    return [...new Set([...this.engine.seen].flatMap((id) => this.engine.story[id]?.learn ?? []))];
  }

  renderNotebook() {
    this.body.append(element("p", "sara-panel-intro", t("sara.notebookIntro")));
    const notes = this.learned();
    if (!notes.length) this.body.append(element("p", "sara-empty", t("sara.notebookEmpty")));
    for (const id of notes) {
      const note = this.legal.notes[id];
      if (!note) continue;
      const card = element("article", "sara-note");
      card.append(element("h2", "", note.title), element("p", "", note.text));
      const sources = element("details", "sara-sources");
      sources.append(element("summary", "", t("sara.sourcesSummary")));
      for (const sourceId of note.sources) {
        const source = this.legal.sources[sourceId];
        sources.append(this.link(source.title, source.url));
      }
      card.append(sources); this.body.append(card);
    }
    this.body.append(element("p", "sara-fineprint", t("sara.notebookNote", { date: this.legal.checkedAt })));
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
    location.textContent = this.engine.stage.background === "court-friendly" ? t("sara.locCourt") : this.engine.stage.background === "quiet-room" ? t("sara.locQuietRoom") : node.chapter === 3 ? t("sara.locSocial") : node.chapter === 4 || node.chapter === 6 ? t("sara.locLife") : t("sara.locSchool");
    this.root.querySelector("[data-sara-portrait]").hidden = true;
    this.renderCast(node);
  }

  renderCast(node) {
    this.cast.hidden = !["dialogue", "choice"].includes(node.type);
    if (this.cast.hidden) return;
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
    const activeAvatar = avatarStore.getActiveAvatar();
    const frames = new Map([...this.cast.children].map(frame => [frame.dataset.person, frame]));
    for (const [name, frame] of frames) {
      if (!names.includes(name)) frame.remove();
    }
    for (const name of names) {
      const art = personPortrait(name, { expression, nodeId: this.engine.nodeId });
      const customAvatar = name === "Sara" ? activeAvatar : null;
      const source = customAvatar || art?.src;
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
        if (customAvatar) {
          // A user's drawing is an arbitrary canvas, not a photographed body.
          image.style.cssText = "width:100%;height:100%;left:0;top:0;object-fit:contain;object-position:center bottom";
          image.dataset.bodyRegion = "custom-drawing";
        } else {
          framePortrait(image, art);
        }
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
    this.root.classList.remove("sara-mode", "sara-large-text", "sara-has-cast");
  }
}
