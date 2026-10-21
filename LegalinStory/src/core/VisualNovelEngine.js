import { EventBus } from "./EventBus.js";
import { evaluateCondition } from "./conditions.js";

/**
 * @typedef {Object} CharacterState
 * @property {string} id
 * @property {string} expression
 * @property {string} [at]
 */

/**
 * @typedef {Object} Stage
 * @property {string|null} background
 * @property {CharacterState|null} character
 * @property {string|null} perspective
 * @property {string|null} mood
 */

/**
 * @typedef {Object} SaveData
 * @property {string} nodeId
 * @property {Record<string, unknown>} flags
 * @property {Stage} stage
 * @property {string[]} [seen]
 * @property {number} [rewinds]
 */

/**
 * Graph-based visual novel engine.
 *
 * Responsibilities:
 *  - walk the story graph;
 *  - own flags and the current stage;
 *  - persist progress through an injected SaveStore;
 *  - emit render-agnostic events.
 *
 * It deliberately knows nothing about DOM, CSS, or input devices.
 *
 * Node types are registered through a map, so new kinds of beats can be
 * introduced without editing the engine's control flow (open/closed).
 */
export class VisualNovelEngine {
  /**
   * @param {Object} options
   * @param {Record<string, any>} options.story
   * @param {string} [options.startId]
   * @param {EventBus} [options.bus]
   * @param {{ load(): SaveData|null, save(data: SaveData): void, clear(): void }|null} [options.saveStore]
   * @param {Record<string, { present: (node: any) => void, next?: (node: any) => string|null, auto?: boolean }>} [options.nodeTypes]
   */
  constructor({
    story,
    startId = "start",
    bus = new EventBus(),
    saveStore = null,
    nodeTypes = {},
    initialFlags = {},
  }) {
    if (!story || typeof story !== "object") {
      throw new TypeError("VisualNovelEngine requires a story object");
    }

    this.story = story;
    this.startId = startId;
    this.bus = bus;
    this.saveStore = saveStore;
    this.initialFlags = { ...initialFlags };
    this.history = [];

    this.nodeId = startId;
    this.flags = {};
    this.seen = new Set();
    this.stage = { background: null, character: null, perspective: null, mood: null };
    this.rewinds = 0;
    /** @type {null | { nodeId: string, flags: Record<string, unknown>, stage: Stage, seen: string[], rewinds: number }} */
    this.checkpoint = null;
    this.isRunning = false;
    this.isFinished = false;
    this._choicePresentedAt = null;

    /** @type {Map<string, { present: (node: any) => void, next?: (node: any) => string|null, auto?: boolean }>} */
    this.nodeHandlers = new Map();

    this.registerNodeType("dialogue", {
      present: (node) => this.#presentDialogue(node),
      next: (node) => node.next,
    });
    this.registerNodeType("choice", {
      present: (node) => this.#presentChoice(node),
    });
    this.registerNodeType("branch", {
      present: () => {},
      next: (node) => (this.#matches(node.when) ? node.then : node.else),
      auto: true,
    });
    this.registerNodeType("ending", {
      present: (node) => this.#presentEnding(node),
    });
    this.registerNodeType("reconduction", {
      present: (node) => this.#presentReconduction(node),
    });

    // Custom node types must be available before validation inspects the story.
    for (const [type, handler] of Object.entries(nodeTypes)) {
      this.registerNodeType(type, handler);
    }

    this.#validateStory();
  }

  get currentNode() {
    return this.story[this.nodeId];
  }

  /**
   * Register a presentation strategy for a node type.
   *
   * `next` lets a custom beat participate in the normal flow without changing
   * the engine. Return a node id to advance, or null to wait for another
   * interaction (as choices do). `auto: true` routes immediately without
   * waiting for input, which is how branch nodes work.
   *
   * @param {string} type
   * @param {{ present: (node: any) => void, next?: (node: any) => string|null, auto?: boolean }} handler
   */
  registerNodeType(type, handler) {
    if (this.nodeHandlers.has(type)) {
      throw new Error(`Node type "${type}" is already registered`);
    }
    if (!handler || typeof handler.present !== "function") {
      throw new TypeError(`Node type "${type}" needs a present function`);
    }
    this.nodeHandlers.set(type, handler);
  }

  /** @param {{ resume?: boolean }} [options] */
  start({ resume = true } = {}) {
    const saved = resume ? this.saveStore?.load() : null;
    const canResume =
      saved &&
      typeof saved === "object" &&
      typeof saved.nodeId === "string" &&
      Boolean(this.story[saved.nodeId]);

    if (canResume) {
      const savedFlags =
        saved.flags && typeof saved.flags === "object" && !Array.isArray(saved.flags)
          ? saved.flags
          : {};
      const savedStage = saved.stage ?? {};

      this.nodeId = saved.nodeId;
      this.flags = { ...savedFlags };
      this.seen = new Set(Array.isArray(saved.seen) ? saved.seen : []);
      this.history = Array.isArray(saved.history)
        ? saved.history.filter((item) => item && this.story[item.nodeId]
          && item.flags && typeof item.flags === "object" && !Array.isArray(item.flags)
          && item.stage && typeof item.stage === "object" && !Array.isArray(item.stage)
          && Array.isArray(item.seen)).slice(-150)
        : [];
      this.rewinds = Number.isFinite(saved.rewinds) ? saved.rewinds : 0;
      this.checkpoint = normalizeCheckpoint(saved.checkpoint, this.story);
      this.stage = {
        background:
          typeof savedStage.background === "string" ? savedStage.background : null,
        character:
          savedStage.character && typeof savedStage.character === "object"
            ? savedStage.character
            : null,
        perspective:
          typeof savedStage.perspective === "string" ? savedStage.perspective : null,
        mood: typeof savedStage.mood === "string" ? savedStage.mood : null,
      };
    } else {
      this.#resetState();
    }

    this.isRunning = true;
    this.isFinished = false;
    this.#presentCurrentNode();
    return this;
  }

  restart() {
    this.saveStore?.clear();
    this.#resetState();
    this.isRunning = true;
    this.isFinished = false;
    this.#presentCurrentNode();
    return this;
  }

  back() {
    if (!this.isRunning) return false;
    const previous = this.history.pop();
    if (!previous) return false;
    this.nodeId = previous.nodeId;
    this.flags = { ...previous.flags };
    this.stage = structuredClone(previous.stage);
    this.seen = new Set(previous.seen);
    this.isRunning = true;
    this.isFinished = false;
    this.#presentCurrentNode();
    return true;
  }

  #remember() {
    this.history.push({ nodeId: this.nodeId, flags: { ...this.flags }, stage: this.#stageSnapshot(), seen: [...this.seen] });
    if (this.history.length > 150) this.history.shift();
  }

  /**
   * Advance the current beat when its handler exposes a next node.
   * Choice, ending, and other waiting beats return false.
   * @returns {boolean} true when the story moved forward
   */
  advance() {
    if (!this.isRunning || this.isFinished) return false;

    const handler = this.nodeHandlers.get(this.currentNode.type);
    const nextId = handler?.next?.(this.currentNode) ?? null;
    if (!nextId) return false;

    this.#goTo(nextId);
    return true;
  }

  /**
   * Pick an option on the current choice node.
   *
   * Pedagogical consequence: options marked as risky (`safe: false`,
   * `rewind: true`, or with a `lesson`) open a short consequence story and
   * move forward. The engine records the mistake in `errores`, and the
   * reconduction node at the end shows a warning before continuing.
   *
   * @param {string} optionId
   * @returns {boolean}
   */
  choose(optionId) {
    if (!this.isRunning || this.isFinished) return false;

    const node = this.currentNode;
    if (node.type !== "choice") return false;

    const option = node.options.find((candidate) => candidate.id === optionId);
    if (!option || !this.#matches(option.when)) return false;

    // Telemetria de tiempos de eleccion para asistentes sociales
    let elapsedSec = 6.0;
    let elapsedMs = 6000;
    if (this._choicePresentedAt) {
      const now = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
      elapsedMs = Math.max(400, Math.round(now - this._choicePresentedAt));
      elapsedSec = Number((elapsedMs / 1000).toFixed(1));
      this._choicePresentedAt = null;
    }
    if (typeof window !== "undefined") {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const storyId = urlParams.get("story") || "sara";
        const telemetryPayload = {
          type: "legalinstory:decision",
          story_id: storyId,
          node_id: node.id || this.nodeId,
          chapter: node.chapter || 1,
          prompt: node.prompt,
          option_id: option.id,
          option_label: option.label,
          all_options: (node.options || []).map((o) => ({ id: o.id, label: o.label })),
          time_seconds: elapsedSec,
          time_ms: elapsedMs,
          timestamp: Date.now() / 1000,
        };
        if (window.parent && window.parent !== window) {
          window.parent.postMessage(telemetryPayload, window.location.origin);
        } else fetch("/api/telemetria/decision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(telemetryPayload),
        }).catch(() => {});
      } catch (_) {}
    }

    this.#remember();
    if (isRewindOption(option)) {
      this.rewinds += 1;
      this.flags = {
        ...this.flags,
        errores: Number(this.flags.errores ?? 0) + 1,
      };

      // Risky choices open a short consequence story and keep moving
      // forward. The reconduction node at the end shows the warning and then
      // continues to the next beat; it does not send the player back.
      this.flags = { ...this.flags, ...(option.flags ?? {}) };
      this.#applyEffects(option.effects);
      if (option.next) {
        this.checkpoint = null;
        this.#goTo(option.next, false);
        return true;
      }

      // Legacy authoring shortcut: a risky option without a mini-story still
      // shows the lesson immediately.
      this.#persist();
      this.bus.emit("lesson", {
        choiceId: this.nodeId,
        optionId: option.id,
        label: option.label,
        title: option.lessonTitle ?? "Hay otra forma de hacerlo",
        consequence: option.consequence ?? "",
        lesson: option.lesson ?? "",
        rewinds: this.rewinds,
        stage: this.#stageSnapshot(),
        flags: { ...this.flags },
      });
      return true;
    }

    this.flags = { ...this.flags, ...(option.flags ?? {}) };
    this.#applyEffects(option.effects);
    this.#goTo(option.next, false);
    return true;
  }

  /** Legacy: close a lesson card and re-present the same decision. */
  dismissLesson() {
    if (!this.isRunning || this.isFinished) return false;
    if (this.currentNode.type !== "choice") return false;
    this.#presentChoice(this.currentNode);
    return true;
  }

  /**
   * Finish a quiz with the answers the player chose. The quiz always continues;
   * it records the score so endings and teachers can reflect on it.
   *
   * @param {Array<{ questionId: string, optionId: string }>} answers
   */
  completeQuiz(answers) {
    if (!this.isRunning || this.isFinished || this.currentNode.type !== "quiz") return false;
    if (!Array.isArray(answers)) return false;

    const node = this.currentNode;
    const questions = Array.isArray(node.questions) ? node.questions : [];
    const answerMap = new Map(answers.map((answer) => [answer?.questionId, answer?.optionId]));
    let score = 0;

    for (const question of questions) {
      const option = question.options?.find(
        (candidate) => candidate.id === answerMap.get(question.id),
      );
      const correct = Boolean(option?.correct);
      if (correct) score += 1;
      if (question.flag) this.flags[question.flag] = correct;
    }

    this.flags = {
      ...this.flags,
      quizScore: score,
      quizTotal: questions.length,
      quizPerfect: questions.length > 0 && score === questions.length,
    };

    this.#goTo(node.next);
    return true;
  }

  completeActivity(selectedIds) {
    if (!this.isRunning || this.isFinished || this.currentNode.type !== "minigame") return false;
    if (!Array.isArray(selectedIds)) return false;
    const node = this.currentNode;
    const selected = new Set(selectedIds);
    if (!selected.size || [...selected].some((id) => !node.cards.some((card) => card.id === id))) return false;
    if (node.mode !== "support" && !node.cards.every((card) => Boolean(card.correct) === selected.has(card.id))) return false;
    this.#remember();
    for (const card of node.cards) {
      if (card.flag) this.flags[card.flag] = selected.has(card.id);
    }
    this.#goTo(node.next, false);
    return true;
  }

  /** @param {string} nextId */
  #goTo(nextId, remember = true) {
    if (!this.story[nextId]) {
      throw new Error(`Story node "${nextId}" does not exist`);
    }
    if (remember) this.#remember();
    this.nodeId = nextId;
    this.#presentCurrentNode();
  }

  #presentCurrentNode() {
    // Branch nodes route immediately. Loop instead of recursing so a chain of
    // branches cannot overflow the stack.
    for (let guard = 0; guard < 100; guard += 1) {
      const node = this.currentNode;

      // Stage state is inherited: a node only needs to declare what changes.
      if (node.background) this.stage.background = node.background;
      if (node.character !== undefined) {
        this.stage.character =
          node.character === null
            ? null
            : { ...(this.stage.character ?? {}), ...node.character };
      }
      if (typeof node.perspective === "string") {
        this.stage.perspective = node.perspective;
      }
      if (typeof node.mood === "string") {
        this.stage.mood = node.mood;
      }
      if (node.flags && typeof node.flags === "object") {
        this.flags = { ...this.flags, ...node.flags };
      }
      if (!this.seen.has(this.nodeId)) this.#applyEffects(node.effects);
      this.seen.add(this.nodeId);

      const handler = this.nodeHandlers.get(node.type);
      if (!handler) {
        throw new Error(`No handler registered for node type "${node.type}"`);
      }

      if (handler.auto) {
        const nextId = handler.next?.(node) ?? null;
        if (!nextId) {
          throw new Error(`Node "${this.nodeId}" could not resolve its next node`);
        }
        if (!this.story[nextId]) {
          throw new Error(`Story node "${nextId}" does not exist`);
        }
        this.nodeId = nextId;
        continue;
      }

      if (node.type !== "ending") this.#persist();
      handler.present(node);
      this.bus.emit("state", { nodeId: this.nodeId, finished: this.isFinished });
      return;
    }

    throw new Error("Auto-advance loop exceeded 100 nodes");
  }

  #presentDialogue(node) {
    this.bus.emit("dialogue", {
      id: node.id,
      speaker: node.speaker ?? null,
      remote: node.remote === true,
      text: node.text,
      tone: node.tone ?? (node.speaker ? "spoken" : "narration"),
      stage: this.#stageSnapshot(),
      flags: { ...this.flags },
    });
  }

  #presentChoice(node) {
    const options = node.options.filter((option) => this.#matches(option.when));
    if (options.length === 0) {
      throw new Error(`Choice node "${this.nodeId}" has no available options`);
    }

    this._choicePresentedAt = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
    this.bus.emit("choice", {
      id: node.id,
      speaker: node.speaker ?? null,
      remote: node.remote === true,
      prompt: node.prompt,
      tone: node.tone ?? "narration",
      options: options.map(({ id, label }) => ({ id, label })),
      stage: this.#stageSnapshot(),
      flags: { ...this.flags },
    });
  }

  #presentEnding(node) {
    this.isFinished = true;
    this.saveStore?.clear();

    this.bus.emit("ending", {
      kicker: node.kicker ?? null,
      title: node.title,
      text: node.text,
      stage: this.#stageSnapshot(),
      flags: { ...this.flags },
    });
  }

  /**
   * End of an unsafe mini-story: show the warning over the next beat. New
   * content uses `continueTo` so the story moves forward. The old checkpoint
   * fallback is kept for saves created before this behaviour changed.
   */
  #presentReconduction(node) {
    const checkpoint = this.checkpoint;
    const notice = {
      title: node.title ?? "Aviso",
      text: node.text ?? "",
      lesson: node.lesson ?? "",
      rewinds: this.rewinds,
      kind: "reconduction",
    };

    const continueTo =
      typeof node.continueTo === "string" && this.story[node.continueTo]
        ? node.continueTo
        : null;

    if (continueTo) {
      this.checkpoint = null;
      this.nodeId = continueTo;
      this.#presentCurrentNode();
      this.bus.emit("notice", notice);
      return;
    }

    if (!checkpoint) {
      const returnTo =
        typeof node.returnTo === "string" && this.story[node.returnTo]
          ? node.returnTo
          : null;
      if (returnTo) {
        this.nodeId = returnTo;
        this.#presentCurrentNode();
        this.bus.emit("notice", notice);
        return;
      }

      // Defensive fallback: never trap the player in a dead end.
      this.bus.emit("notice", notice);
      this.bus.emit("lesson", {
        choiceId: this.nodeId,
        optionId: null,
        label: "",
        title: notice.title,
        consequence: notice.text,
        lesson: notice.lesson,
        rewinds: this.rewinds,
        stage: this.#stageSnapshot(),
        flags: { ...this.flags },
      });
      return;
    }

    this.nodeId = checkpoint.nodeId;
    this.flags = { ...checkpoint.flags };
    this.stage = cloneStage(checkpoint.stage);
    this.seen = new Set(checkpoint.seen);
    this.rewinds = checkpoint.rewinds;
    this.checkpoint = null;

    // Present the original decision first, then raise the notice on top of it.
    this.#presentCurrentNode();
    this.bus.emit("notice", notice);
  }

  #persist() {
    this.saveStore?.save({
      nodeId: this.nodeId,
      flags: this.flags,
      stage: this.stage,
      seen: [...this.seen],
      rewinds: this.rewinds,
      checkpoint: this.checkpoint,
      history: this.history,
    });
  }

  #stageSnapshot() {
    return {
      background: this.stage.background,
      character: this.stage.character ? { ...this.stage.character } : null,
      perspective: this.stage.perspective,
      mood: this.stage.mood,
    };
  }

  #resetState() {
    this.nodeId = this.startId;
    this.flags = { ...this.initialFlags };
    this.history = [];
    this.seen = new Set();
    this.stage = { background: null, character: null, perspective: null, mood: null };
    this.rewinds = 0;
    this.checkpoint = null;
  }

  /**
   * Apply a small declarative effect DSL: `{ flag: value }` replaces a flag and
   * `{ flag: { add: 1 } }` increments a numeric flag. Content stays data-only.
   */
  #applyEffects(effects) {
    if (!effects || typeof effects !== "object" || Array.isArray(effects)) return;

    for (const [key, value] of Object.entries(effects)) {
      if (value && typeof value === "object" && !Array.isArray(value) && "add" in value) {
        const delta = Number(value.add);
        if (Number.isFinite(delta)) {
          this.flags[key] = Number(this.flags[key] ?? 0) + delta;
        }
        continue;
      }
      this.flags[key] = value;
    }
  }

  #matches(condition) {
    return evaluateCondition(condition, { flags: this.flags, seen: this.seen });
  }

  #validateStory() {
    if (!this.story[this.startId]) {
      throw new Error(`Start node "${this.startId}" does not exist`);
    }

    for (const [key, node] of Object.entries(this.story)) {
      const where = `story["${key}"]`;

      if (!node || typeof node !== "object") {
        throw new Error(`${where} must be an object`);
      }

      if (!node.type || !this.nodeHandlers.has(node.type)) {
        throw new Error(`${where} has an unsupported type: ${node.type}`);
      }

      if (node.type === "dialogue") {
        if (typeof node.text !== "string" || node.text.trim().length === 0) {
          throw new Error(`${where}.text must be a non-empty string`);
        }
        if (!node.next || !this.story[node.next]) {
          throw new Error(`${where}.next points to a missing node`);
        }
      }

      if (node.type === "choice") {
        if (typeof node.prompt !== "string" || node.prompt.trim().length === 0) {
          throw new Error(`${where}.prompt must be a non-empty string`);
        }
        if (!Array.isArray(node.options) || node.options.length === 0) {
          throw new Error(`${where}.options must be a non-empty array`);
        }

        const optionIds = new Set();
        let hasForwardOption = false;
        for (const option of node.options) {
          if (!option.id) throw new Error(`${where} has an option without id`);
          if (optionIds.has(option.id)) {
            throw new Error(`${where} has a duplicate option id: ${option.id}`);
          }
          optionIds.add(option.id);

          if (typeof option.label !== "string" || option.label.trim().length === 0) {
            throw new Error(`${where} option "${option.id}" needs a label`);
          }
          if (isRewindOption(option)) {
            if (!option.next) continue;
          } else {
            hasForwardOption = true;
          }
          if (!option.next || !this.story[option.next]) {
            throw new Error(`${where} option "${option.id}" points to a missing node`);
          }
        }

        if (!hasForwardOption) {
          throw new Error(`${where} needs at least one option that moves the story forward`);
        }
      }

      if (node.type === "branch") {
        if (!node.when) throw new Error(`${where}.when is required`);
        if (!node.then || !this.story[node.then]) {
          throw new Error(`${where}.then points to a missing node`);
        }
        if (!node.else || !this.story[node.else]) {
          throw new Error(`${where}.else points to a missing node`);
        }
      }

      if (node.type === "ending") {
        if (!node.title) throw new Error(`${where}.title is required`);
      }
    }
  }
}

function isRewindOption(option) {
  return (
    option?.safe === false ||
    option?.rewind === true ||
    typeof option?.lesson === "string"
  );
}

function cloneStage(stage) {
  if (!stage || typeof stage !== "object") {
    return { background: null, character: null, perspective: null, mood: null };
  }
  return {
    background: typeof stage.background === "string" ? stage.background : null,
    character:
      stage.character && typeof stage.character === "object"
        ? { ...stage.character }
        : null,
    perspective: typeof stage.perspective === "string" ? stage.perspective : null,
    mood: typeof stage.mood === "string" ? stage.mood : null,
  };
}

function normalizeCheckpoint(checkpoint, story) {
  if (!checkpoint || typeof checkpoint !== "object") return null;
  if (typeof checkpoint.nodeId !== "string" || !story[checkpoint.nodeId]) return null;
  return {
    nodeId: checkpoint.nodeId,
    flags:
      checkpoint.flags && typeof checkpoint.flags === "object" && !Array.isArray(checkpoint.flags)
        ? { ...checkpoint.flags }
        : {},
    stage: cloneStage(checkpoint.stage),
    seen: Array.isArray(checkpoint.seen) ? checkpoint.seen.filter((id) => typeof id === "string") : [],
    rewinds: Number.isFinite(checkpoint.rewinds) ? checkpoint.rewinds : 0,
  };
}
