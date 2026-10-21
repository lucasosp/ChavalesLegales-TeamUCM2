import { EventBus } from "../core/EventBus.js";
import { VisualNovelEngine } from "../core/VisualNovelEngine.js";
import { VisualNovelView } from "../ui/VisualNovelView.js";

/**
 * Composition root.
 *
 * Owns the object graph and translates input gestures into engine commands:
 * engine (domain) -> events -> view (presentation).
 *
 * Swapping the view, the save store, the story data, or the character asset
 * resolver only touches this file and the entry point.
 */
export class App {
  /**
   * @param {{
   *   root: HTMLElement,
   *   story: Record<string, any>,
   *   startId?: string,
   *   title?: string,
   *   saveStore?: { load(): any, save(data: any): void, clear(): void } | null,
   *   nodeTypes?: Record<string, { present: (node: any) => void, next?: (node: any) => string|null, auto?: boolean }>,
   *   onExit?: () => void,
   *   resolveCharacter?: (character: { id: string, expression: string }) => string,
   *   resolveCharacterName?: (characterId: string) => string,
   *   resolveBackground?: (sceneId: string) => string | null,
   *   resolveSceneLabel?: (sceneId: string) => string,
   *   rights?: Record<string, any> | null,
   * }} options
   */
  constructor({
    root,
    story,
    startId = "start",
    title = "Visual Novel",
    saveStore = null,
    nodeTypes = {},
    onExit = null,
    resolveCharacter,
    resolveCharacterName,
    resolveBackground,
    resolveSceneLabel,
    rights = null,
    initialFlags = {},
  }) {
    this.bus = new EventBus();
    this.paused = false;

    const storyNodeTypes = {
      chat: {
        present: (node) => this.bus.emit("chat", { ...node, stage: structuredClone(this.engine.stage) }),
        next: (node) => node.next,
      },
      interstitial: {
        present: (node) => this.bus.emit("interstitial", { ...node, stage: structuredClone(this.engine.stage) }),
        next: (node) => node.next,
      },
      minigame: {
        present: (node) => this.bus.emit("minigame", { ...node, stage: structuredClone(this.engine.stage), flags: { ...this.engine.flags } }),
        next: (node) => node.next,
      },
      // Minijuego alojado por la plataforma: la novela espera a que el contenedor avise de que ha terminado
      external: {
        present: (node) => this.#runExternal(node),
        next: (node) => node.next,
      },
      quiz: {
        present: (node) => this.bus.emit("quiz", { ...node, stage: structuredClone(this.engine.stage), flags: { ...this.engine.flags } }),
        next: (node) => node.next,
      },
      ...nodeTypes,
    };

    this.engine = new VisualNovelEngine({
      story,
      startId,
      bus: this.bus,
      saveStore,
      nodeTypes: storyNodeTypes,
      initialFlags,
    });

    this.view = new VisualNovelView(root, {
      onAdvance: () => this.advance(),
      onChoose: (optionId) => !this.paused && this.engine.choose(optionId),
      onExit,
      title,
      resolveCharacter,
      resolveCharacterName,
      resolveBackground,
      resolveSceneLabel,
      rights,
    });

    this.#wireEvents();
  }

  start() {
    const saved = this.engine.saveStore?.load();
    const canResume = saved && typeof saved.nodeId === "string" && Boolean(this.engine.story[saved.nodeId]);
    if (canResume) this.engine.start();
    else this.view.showWelcome(() => this.engine.start({ resume: false }));
  }

  advance() {
    if (this.paused) return;
    if (this.view.isTyping()) {
      this.view.skipTyping();
      return;
    }
    this.engine.advance();
  }

  restart() {
    this.engine.restart();
  }

  destroy() {
    this.engine.isRunning = false;
    this.view.destroy();
  }

  #runExternal(node) {
    this.paused = true;
    const resume = () => {
      window.removeEventListener("message", onMessage);
      this.paused = false;
      if (this.engine.currentNode === node) this.engine.advance();
    };
    const onMessage = (event) => {
      if (event.origin === location.origin && event.data?.type === "legalinstory:minigame-done" && event.data.game === node.game) resume();
    };
    if (window.parent === window) {
      setTimeout(resume, 0);
      return;
    }
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "legalinstory:minigame", game: node.game, text: node.text }, location.origin);
  }

  #wireEvents() {
    // Progreso para el informe del caso: la plataforma mide ritmo de lectura y relecturas
    this.bus.on("state", ({ nodeId }) => {
      if (window.parent === window) return;
      const node = this.engine.story[nodeId];
      window.parent.postMessage({ type: "legalinstory:progress", node_id: nodeId, chapter: node?.chapter ?? null, node_type: node?.type ?? null }, location.origin);
    });
    this.bus.on("dialogue", (payload) => this.view.showDialogue(payload));
    this.bus.on("choice", (payload) => this.view.showChoices(payload));
    this.bus.on("ending", (payload) => this.view.showEnding(payload));
    this.bus.on("chat", (payload) => this.view.showChat(payload));
    this.bus.on("interstitial", (payload) =>
      this.view.showInterstitial(payload, () => !this.paused && this.engine.advance()),
    );
    this.bus.on("minigame", (payload) =>
      this.view.showMinigame(payload, (selected) => !this.paused && this.engine.completeActivity(selected)),
    );
    this.bus.on("quiz", (payload) =>
      this.view.showQuiz(payload, (answers) => this.engine.completeQuiz(answers)),
    );
    this.bus.on("lesson", (payload) =>
      this.view.showLesson(payload, () => this.engine.dismissLesson()),
    );
    this.bus.on("notice", (payload) => this.view.showNotice(payload));
  }
}
