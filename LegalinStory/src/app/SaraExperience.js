import { App } from "./App.js";
import { LocalStorageSaveStore, MemorySaveStore } from "../services/saveStores.js";
import { personPortrait, illustrations, framePortrait } from "../content/characterImages.js";
import { DrawingCanvasModal } from "../ui/DrawingCanvasModal.js";
import { avatarStore } from "../services/avatarStore.js";
import { t } from "../i18n.js";

export const SARA_SAVE_KEY = "sara.save";
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
          <select class="sara-chapter-select" data-sara-chapter-select aria-label="${t("novel.chapterSelectTitle")}">
            <option value="" disabled selected>${t("novel.chapterSelect")}</option>
          </select>
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

    this.chapterSelect = root.querySelector("[data-sara-chapter-select]");
    if (this.chapterSelect && this.guide?.chapters) {
      for (const ch of this.guide.chapters) {
        const option = document.createElement("option");
        option.value = ch.id;
        option.textContent = t("sara.chapterOf", { n: ch.id, total: this.guide.chapters.length }) + (ch.title ? `: ${ch.title}` : "");
        this.chapterSelect.append(option);
      }
      this.chapterSelect.addEventListener("change", (e) => {
        const chId = Number(e.target.value);
        if (chId) {
          this.jumpToChapter(chId);
          this.chapterSelect.blur();
        }
      });
    }

    this.onRootClick = (event) => {
      const button = event.target.closest("[data-sara-action]");
      if (!button) return;
      const action = button.dataset.saraAction;
      if (action === "back") { if (this.engine.back()) this.app.view.skipTyping(); return; }
      if (["pause", "help", "restart"].includes(action)) this.openPanel(action);
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
    this.showLanding();
  }

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
    const titles = { help: t("sara.titleHelp"), pause: t("sara.titlePause"), restart: t("sara.titleRestart") };
    this.openShell(mode, titles[mode] ?? "Sara");
    if (mode === "help") this.renderHelp();
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
    const largeText = this.button(t("sara.largeText"), () => {
      const enabled = this.root.classList.toggle("sara-large-text");
      largeText.setAttribute("aria-pressed", String(enabled));
    });
    largeText.setAttribute("aria-pressed", String(this.root.classList.contains("sara-large-text")));
    const instant = this.button(t("sara.instantText"), () => {
      this.app.view.typewriter.instant = !this.app.view.typewriter.instant;
      instant.setAttribute("aria-pressed", String(this.app.view.typewriter.instant));
    });
    instant.setAttribute("aria-pressed", String(Boolean(this.app.view.typewriter.instant)));
    this.button(t("sara.needHelp"), () => this.openPanel("help"));
    this.button(t("sara.restartStory"), () => this.openPanel("restart"));
    this.button(t("sara.exitStory"), () => this.onExit?.());

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
    if (this.chapterSelect && node.chapter) {
      this.chapterSelect.value = String(node.chapter);
    }
    this.renderCast(node);
    const backBtn = this.root.querySelector("[data-sara-action='back']");
    if (backBtn) backBtn.disabled = this.engine.history.length === 0 || this.engine.isFinished;
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
