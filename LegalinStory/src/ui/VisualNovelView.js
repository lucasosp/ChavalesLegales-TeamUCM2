import { appTemplate } from "./templates.js";
import { Typewriter } from "./Typewriter.js";
import { t } from "../i18n.js";
import { personImage } from "../content/characterImages.js";

// Un pensamiento no se pronuncia: si el texto llega entrecomillado se quitan
// las comillas al pintarlo. Así «lo que se dice» conserva sus comillas y lo que
// se piensa se lee en cursiva, sin comillas y con su propia placa.
const THOUGHT_QUOTES = /^\s*[«“"]([\s\S]*)[»”"]\s*$/;

function withoutQuotes(text) {
  const match = THOUGHT_QUOTES.exec(text ?? "");
  return match ? match[1].trim() : text;
}

/**
 * DOM presentation layer.
 *
 * The view receives already-resolved story events and turns them into pixels.
 * It never reads the story graph or mutates engine state; user gestures are
 * forwarded through the callbacks supplied by the composition root.
 */
export class VisualNovelView {
  #background = null;
  #characterKey = null;
  #activeBackgroundLayer = 0;
  #backgroundRequest = 0;
  #awaitingChoice = false;
  #endingVisible = false;
  #choiceReadyTimer = null;
  #onKeyDown;
  #chatRevealing = false;
  #chatTimer = null;
  #chatMessages = [];
  #chatIndex = 0;
  #chatSelf = null;
  #chatAdvanceBlockedUntil = 0;
  #interactionLocked = false;
  #interstitialComplete = null;
  #minigameComplete = null;
  #minigameCards = [];
  #minigameSelected = new Set();
  #minigameMode = "information";
  #minigameChecked = false;
  #rightsVisible = false;
  #rights = null;
  #lessonComplete = null;
  #quizComplete = null;
  #quizQuestions = [];
  #quizIndex = 0;
  #quizAnswers = [];
  #quizAnswered = false;
  #quizSummary = false;
  #quizTitle = "";
  #noticeTimer = null;
  #interactionLockBeforeNotice = false;
  #badgeTimer = null;

  /**
   * @param {HTMLElement} root
   * @param {{
   *   onAdvance: () => void,
   *   onChoose: (optionId: string) => void,
   *   onExit?: () => void,
   *   title?: string,
   *   resolveCharacter?: (character: { id: string, expression: string }) => string,
   *   resolveCharacterName?: (characterId: string) => string,
   *   resolveBackground?: (sceneId: string) => string | null,
   *   resolveSceneLabel?: (sceneId: string) => string,
   *   rights?: Record<string, any> | null,
   *   chapters?: Array<{ id: string, label: string }>,
   *   onJumpToChapter?: (nodeId: string) => void,
   * }} callbacks
   */
  constructor(
    root,
    {
      onAdvance,
      onChoose,
      onExit = null,
      title = t("novel.defaultTitle"),
      resolveCharacter = defaultCharacterSource,
      resolveCharacterName = defaultCharacterName,
      resolveBackground = null,
      resolveSceneLabel = defaultSceneLabel,
      rights = null,
      chapters = [],
      onJumpToChapter = null,
    },
  ) {
    if (!(root instanceof HTMLElement)) {
      throw new TypeError("VisualNovelView requires a root HTMLElement");
    }

    this.onAdvance = onAdvance;
    this.onChoose = onChoose;
    this.onExit = onExit;
    this.resolveCharacter = resolveCharacter;
    this.resolveCharacterName = resolveCharacterName;
    this.resolveBackground = resolveBackground;
    this.resolveSceneLabel = resolveSceneLabel;
    this.rights = rights;
    this.chapters = chapters;
    this.onJumpToChapter = onJumpToChapter;
    this.root = root;
    this.#onKeyDown = (event) => this.#handleKeyDown(event);
    this.seenLegalRoles = new Set();
    this.#badgeTimer = null;

    root.innerHTML = appTemplate();

    this.refs = {
      scene: root.querySelector("[data-scene]"),
      topbar: root.querySelector(".topbar"),
      welcome: root.querySelector("[data-welcome]"),
      welcomeStart: root.querySelector("[data-welcome-start]"),
      backgrounds: [...root.querySelectorAll("[data-bg-layer]")],
      character: root.querySelector("[data-character]"),
      sprite: root.querySelector("[data-sprite]"),
      brand: root.querySelector("[data-brand]"),
      perspectiveBadge: root.querySelector("[data-perspective-badge]"),
      notice: root.querySelector("[data-notice]"),
      noticeTitle: root.querySelector("[data-notice-title]"),
      noticeText: root.querySelector("[data-notice-text]"),
      noticeLesson: root.querySelector("[data-notice-lesson]"),
      noticeClose: root.querySelector("[data-notice-close]"),
      panel: root.querySelector("[data-panel]"),
      speaker: root.querySelector("[data-speaker-name]"),
      legalBadge: root.querySelector("[data-legal-badge]"),
      legalBadgeText: root.querySelector("[data-legal-badge-text]"),
      text: root.querySelector("[data-text]"),
      announcement: root.querySelector("[data-announcement]"),
      advance: root.querySelector("[data-advance]"),
      choices: root.querySelector("[data-choices]"),
      chat: root.querySelector("[data-chat]"),
      chatTitle: root.querySelector("[data-chat-title]"),
      chatAvatar: root.querySelector("[data-chat-avatar]"),
      chatSelf: root.querySelector("[data-chat-self]"),
      chatLog: root.querySelector("[data-chat-log]"),
      chatHint: root.querySelector("[data-chat-hint]"),
      chatSkip: root.querySelector("[data-chat-skip]"),
      interstitial: root.querySelector("[data-interstitial]"),
      interstitialKicker: root.querySelector("[data-interstitial-kicker]"),
      interstitialTitle: root.querySelector("[data-interstitial-title]"),
      interstitialText: root.querySelector("[data-interstitial-text]"),
      interstitialNext: root.querySelector("[data-interstitial-next]"),
      minigame: root.querySelector("[data-minigame]"),
      minigameTitle: root.querySelector("[data-minigame-title]"),
      minigamePrompt: root.querySelector("[data-minigame-prompt]"),
      minigameCards: root.querySelector("[data-minigame-cards]"),
      minigameFeedback: root.querySelector("[data-minigame-feedback]"),
      minigameCheck: root.querySelector("[data-minigame-check]"),
      minigameContinue: root.querySelector("[data-minigame-continue]"),
      quiz: root.querySelector("[data-quiz]"),
      quizKicker: root.querySelector("[data-quiz-kicker]"),
      quizTitle: root.querySelector("[data-quiz-title]"),
      quizPrompt: root.querySelector("[data-quiz-prompt]"),
      quizProgress: root.querySelector("[data-quiz-progress]"),
      quizOptions: root.querySelector("[data-quiz-options]"),
      quizFeedback: root.querySelector("[data-quiz-feedback]"),
      quizNext: root.querySelector("[data-quiz-next]"),
      lesson: root.querySelector("[data-lesson]"),
      lessonTitle: root.querySelector("[data-lesson-title]"),
      lessonChoice: root.querySelector("[data-lesson-choice]"),
      lessonConsequence: root.querySelector("[data-lesson-consequence]"),
      lessonTeach: root.querySelector("[data-lesson-teach]"),
      lessonClose: root.querySelector("[data-lesson-close]"),
      library: root.querySelector("[data-library]"),
      ending: root.querySelector("[data-ending]"),
      endingKicker: root.querySelector("[data-ending-kicker]"),
      endingTitle: root.querySelector("[data-ending-title]"),
      endingText: root.querySelector("[data-ending-text]"),
      endingRights: root.querySelector("[data-ending-rights]"),
      endingLibrary: root.querySelector("[data-ending-library]"),
      rights: root.querySelector("[data-rights]"),
      rightsTitle: root.querySelector("[data-rights-title]"),
      rightsBody: root.querySelector("[data-rights-body]"),
      rightsClose: root.querySelector("[data-rights-close]"),
      chapterSelect: root.querySelector("[data-chapter-select]"),
    };

    this.refs.brand.textContent = title;
    if (!onExit) {
      this.refs.library.hidden = true;
      this.refs.endingLibrary.hidden = true;
    }

    this.typewriter = new Typewriter(this.refs.text);
    this.#bindEvents();
  }

  destroy() {
    this.#backgroundRequest += 1;
    document.removeEventListener("keydown", this.#onKeyDown);
    clearTimeout(this.#choiceReadyTimer);
    clearInterval(this.#chatTimer);
    clearTimeout(this.#badgeTimer);
    this.#choiceReadyTimer = null;
    this.#chatTimer = null;
    this.#badgeTimer = null;
    this.#hideNotice();
    this.typewriter.stop();
  }

  showWelcome(onStart) {
    this.seenLegalRoles.clear();
    this.#hideLegalBadge(true);
    this.refs.welcome.hidden = false;
    this.refs.welcome.setAttribute("aria-hidden", "false");
    this.refs.welcomeStart.addEventListener("click", () => {
      this.refs.welcome.hidden = true;
      this.refs.welcome.setAttribute("aria-hidden", "true");
      this.refs.topbar.inert = false;
      for (const element of this.root.querySelectorAll("[inert]")) element.inert = false;
      onStart();
    }, { once: true });
    this.refs.topbar.inert = true;
    for (const selector of ["[data-panel]", "[data-choices]", "[data-chat]", "[data-interstitial]", "[data-minigame]", "[data-ending]", "[data-rights]"]) {
      const element = this.root.querySelector(selector);
      if (element) element.inert = true;
    }
    this.refs.welcomeStart.focus({ preventScroll: true });
  }

  /* ------------------------------------------------------------ story events */

  // Sara supplies the same short profiles used by its people table.
  setLegalPersonReference(resolvePerson, onOpen) {
    this.resolveLegalPerson = resolvePerson;
    const badge = document.createElement("button");
    badge.type = "button";
    badge.className = this.refs.legalBadge.className;
    badge.dataset.legalBadge = "";
    badge.hidden = true;
    badge.setAttribute("aria-haspopup", "dialog");
    badge.append(...this.refs.legalBadge.childNodes);
    this.refs.legalBadge.replaceWith(badge);
    this.refs.legalBadge = badge;
    this.refs.legalBadgeText = badge.querySelector("[data-legal-badge-text]");
    badge.addEventListener("click", (event) => {
      event.stopPropagation();
      if (badge.dataset.personId) onOpen(badge.dataset.personId);
    });
  }

  showDialogue({ speaker, speakerKey, remote, text, tone, stage }) {
    this.#resetTransientOverlays();
    this.#leaveEnding();
    this.#awaitingChoice = false;
    this.#clearChoices();
    this.#applyStage(stage);
    const isThought = tone === "thought";
    const voice = isThought
      ? (speaker ? t("novel.thoughtOf", { speaker }) : t("novel.thought"))
      : speaker ?? (tone === "narration" ? t("novel.narration") : null);
    // "pensamiento" es una clave de estilo estable para la placa, no un nombre:
    // así el CSS distingue la voz interna sin depender del idioma.
    this.#setSpeaker(voice, remote, isThought ? null : speakerKey, isThought ? "pensamiento" : null);
    const body = isThought ? withoutQuotes(text) : text;
    this.refs.announcement.textContent = `${voice ? `${voice}: ` : ""}${body}`;

    this.refs.panel.classList.toggle("is-narration", tone === "narration");
    this.refs.panel.classList.toggle("is-thought", isThought);
    this.refs.panel.classList.toggle("is-poem", tone === "poem");
    this.refs.text.scrollTop = 0;
    this.refs.advance.hidden = false;
    this.refs.advance.textContent = t("novel.seeFullLine");

    this.typewriter.play(body, () => {
      if (this.#awaitingChoice) return;
      this.refs.advance.hidden = false;
      this.refs.advance.textContent = t("novel.nextLine");
    });
    if (this.autoFocusStory && !this.root.querySelector('[data-sara-overlay]:not([hidden])')) {
      this.refs.advance.focus({ preventScroll: true });
    }
  }

  showChoices({ speaker, speakerKey, remote, prompt, tone, options, stage }) {
    this.#resetTransientOverlays();
    this.#leaveEnding();
    this.#awaitingChoice = false;
    this.#applyStage(stage);
    const voice = speaker ?? t("novel.yourTurn");
    this.#setSpeaker(voice, remote, speaker ? speakerKey : null);
    const body = tone === "thought" ? withoutQuotes(prompt) : prompt;
    this.refs.announcement.textContent = `${voice}: ${body}`;
    this.#clearChoices();

    this.refs.panel.classList.toggle("is-narration", tone === "narration");
    this.refs.panel.classList.toggle("is-thought", tone === "thought");
    this.refs.panel.classList.toggle("is-poem", tone === "poem");
    this.refs.advance.hidden = true;

    this.typewriter.play(body, () => {
      this.refs.text.scrollTop = 0;
      this.#awaitingChoice = true;
      this.#renderChoices(options);
    });
  }

  showEnding({ kicker, title, text, stage }) {
    this.#resetTransientOverlays();
    this.typewriter.stop();
    this.#awaitingChoice = false;
    this.#endingVisible = true;
    this.#clearChoices();
    this.#applyStage(stage);
    this.refs.advance.hidden = true;

    this.refs.endingKicker.textContent = kicker ?? "";
    this.refs.endingKicker.hidden = !kicker;
    this.refs.endingTitle.textContent = title ?? "";
    this.refs.endingText.textContent = text ?? "";
    this.refs.endingRights.hidden = !this.rights;

    this.refs.ending.classList.add("is-visible");
    this.refs.ending.setAttribute("aria-hidden", "false");
    (this.rights ? this.refs.endingRights : this.refs.endingLibrary).focus({ preventScroll: true });
  }

  /* --------------------------------------------------------------- typewriter */

  isTyping() {
    return this.typewriter.isTyping() || this.#chatRevealing;
  }

  skipTyping() {
    if (this.#chatRevealing) {
      this.#skipChat();
      return;
    }
    this.typewriter.skip();
  }

  /* ------------------------------------------------------------ chat scenes */

  showChat({ chatTitle, self, selfKey, messages, stage }) {
    this.#resetTransientOverlays();
    this.#applyStage(stage);
    this.refs.panel.hidden = true;
    this.refs.chat.hidden = false;
    this.refs.chatTitle.textContent = chatTitle ?? t("novel.messages");
    this.refs.chatAvatar.replaceChildren(chatAvatar(chatTitle?.split(" · ")[0] ?? ""));
    this.refs.chatSelf.textContent = self ? t("novel.fromPhoneOf", { name: self }) : "";
    this.refs.chatLog.replaceChildren();
    this.refs.chatHint.hidden = true;
    this.refs.chatSkip.hidden = false;
    this.#chatAdvanceBlockedUntil = 0;

    this.#chatSelf = selfKey ?? self ?? null;
    this.#chatMessages = Array.isArray(messages) ? messages : [];
    this.#chatIndex = 0;
    this.#chatRevealing = this.#chatMessages.length > 0;

    if (!this.#chatRevealing) {
      this.#finishChat();
      return;
    }

    if (this.typewriter.prefersReducedMotion) this.#skipChat();
    else this.#revealChatMessage();
  }

  #revealChatMessage() {
    if (!this.#chatRevealing) return;
    if (this.#chatIndex >= this.#chatMessages.length) {
      this.#finishChat();
      return;
    }

    const message = this.#chatMessages[this.#chatIndex];
    this.#chatIndex += 1;
    this.refs.chatLog.querySelector(".chat-typing")?.remove();
    this.refs.chatLog.append(this.#createChatBubble(message, this.#chatSelf));
    this.refs.chat.dispatchEvent(new this.refs.chat.ownerDocument.defaultView.CustomEvent("chat-message", { bubbles: true, detail: { from: message.fromKey ?? message.from } }));

    if (this.#chatIndex >= this.#chatMessages.length) this.#finishChat({ natural: true });
    else {
      // Mientras llega el siguiente, quien lo escribe aparece "escribiendo…".
      const upcoming = this.#chatMessages[this.#chatIndex];
      const upcomingFrom = upcoming.fromKey ?? upcoming.from;
      if (!upcoming.system && upcomingFrom && upcomingFrom !== this.#chatSelf) {
        const typing = document.createElement("div");
        typing.className = "chat-typing";
        typing.append(chatAvatar(upcomingFrom), Object.assign(document.createElement("div"), { className: "chat-bubble", innerHTML: "<i></i><i></i><i></i>" }));
        this.refs.chatLog.append(typing);
      }
      const delay = Math.min(4200, Math.max(1400, (message.text?.length ?? 0) * 45));
      this.#chatTimer = setTimeout(() => this.#revealChatMessage(), delay);
    }
    this.refs.chatLog.scrollTop = this.refs.chatLog.scrollHeight;
  }

  #skipChat() {
    clearInterval(this.#chatTimer);
    this.#chatTimer = null;
    this.refs.chatLog.querySelector(".chat-typing")?.remove();

    while (this.#chatIndex < this.#chatMessages.length) {
      const message = this.#chatMessages[this.#chatIndex];
      this.#chatIndex += 1;
      this.refs.chatLog.append(this.#createChatBubble(message, this.#chatSelf));
    }

    this.refs.chatLog.scrollTop = this.refs.chatLog.scrollHeight;
    this.#finishChat({ natural: false });
  }

  #finishChat({ natural = false } = {}) {
    clearInterval(this.#chatTimer);
    this.#chatTimer = null;
    this.#chatRevealing = false;
    this.refs.chat.dispatchEvent(new this.refs.chat.ownerDocument.defaultView.CustomEvent("chat-finished", { bubbles: true }));
    this.refs.chatHint.hidden = false;
    this.refs.chatSkip.hidden = true;

    // If the conversation ended on its own, protect the next beat from an
    // accidental space/Enter that was already on its way. Skipping the chat
    // explicitly does not add this delay, so the player can still spam past.
    this.#chatAdvanceBlockedUntil = natural ? performance.now() + 500 : 0;
  }

  #isAdvanceBuffered() {
    return performance.now() < this.#chatAdvanceBlockedUntil;
  }

  #clearChat() {
    clearInterval(this.#chatTimer);
    this.#chatTimer = null;
    this.#chatRevealing = false;
    this.#chatMessages = [];
    this.#chatIndex = 0;
    this.#chatSelf = null;
    this.#chatAdvanceBlockedUntil = 0;
    this.refs.chat.hidden = true;
    this.refs.chatLog.replaceChildren();
    this.refs.chatHint.hidden = true;
  }

  #createChatBubble(message, self) {
    const row = document.createElement("div");
    // Compare the untranslated author so localized names keep their role.
    const from = message.fromKey ?? message.from;
    const system = message.system === true || from === "Sistema";
    const side =
      message.side ?? (system ? "system" : from === self ? "out" : "in");
    row.className = `chat-row is-${side}`;
    // Mensajes seguidos del mismo autor van agrupados: un solo avatar y nombre.
    const previous = [...this.refs.chatLog.querySelectorAll(".chat-row:not(.chat-typing)")].at(-1);
    const continued = previous?.dataset.from === from && !system;
    row.dataset.from = from ?? "";
    if (continued) row.classList.add("is-continued");

    if (system) {
      const systemMessage = document.createElement("div");
      systemMessage.className = "chat-system";
      systemMessage.textContent = message.text ?? "";
      row.append(systemMessage);
      return row;
    }

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";
    if (message.deleted) bubble.classList.add("is-deleted");
    if (message.hidden) bubble.classList.add("is-hidden-content");

    if (side === "in") row.append(continued ? Object.assign(document.createElement("span"), { className: "chat-avatar is-spacer" }) : chatAvatar(from));

    if (message.from && !continued) {
      const author = document.createElement("span");
      author.className = "chat-author";
      author.textContent = message.from;
      bubble.append(author);
    }

    if (message.hidden) {
      const preview = document.createElement("div");
      preview.className = "censored-preview";
      preview.setAttribute("role", "img");
      preview.setAttribute("aria-label", t("novel.censoredAria"));
      const mosaic = document.createElement("img");
      mosaic.className = "censored-preview-art";
      mosaic.src = new URL("assets/censored-preview.svg", document.baseURI).href;
      mosaic.alt = "";
      mosaic.setAttribute("aria-hidden", "true");
      const label = document.createElement("span");
      label.className = "censored-preview-label";
      label.textContent = t("novel.censored");
      label.setAttribute("aria-hidden", "true");
      preview.append(mosaic, label);
      bubble.append(preview);
    } else {
      const text = document.createElement("p");
      text.className = "chat-text";
      text.textContent = message.text ?? "";
      bubble.append(text);
    }

    if (message.time) {
      const time = document.createElement("span");
      time.className = "chat-time";
      time.textContent = side === "out" ? `${message.time} ✓✓` : message.time;
      bubble.append(time);
    }

    row.append(bubble);
    return row;
  }

  /* ------------------------------------------------------ chapter cards */

  showInterstitial(payload, onComplete) {
    this.#resetTransientOverlays();
    this.#applyStage(payload.stage);
    this.refs.panel.hidden = true;
    this.#interactionLocked = true;
    this.#interstitialComplete = onComplete;

    this.refs.interstitial.hidden = false;
    this.refs.interstitial.setAttribute("aria-hidden", "false");
    this.refs.interstitialKicker.textContent = payload.kicker ?? "";
    this.refs.interstitialKicker.hidden = !payload.kicker;
    this.refs.interstitialTitle.textContent = payload.title ?? "";
    this.refs.interstitialText.textContent = payload.text ?? "";
    this.refs.interstitialNext.focus({ preventScroll: true });
  }

  #completeInterstitial() {
    const complete = this.#interstitialComplete;
    this.#interstitialComplete = null;
    this.refs.interstitial.hidden = true;
    this.refs.interstitial.setAttribute("aria-hidden", "true");
    this.#interactionLocked = false;
    this.refs.panel.hidden = false;
    complete?.();
  }

  /* ------------------------------------------------------ reconduction */

  showNotice(payload) {
    this.#hideNotice();
    this.refs.noticeTitle.textContent = payload.title ?? t("novel.notice");
    this.refs.noticeText.textContent = payload.text ?? "";
    this.refs.noticeText.hidden = !payload.text;
    this.refs.noticeLesson.textContent = payload.lesson ?? "";
    this.refs.noticeLesson.hidden = !payload.lesson;
    this.refs.notice.hidden = false;
    this.refs.notice.setAttribute("aria-hidden", "false");
    this.#interactionLockBeforeNotice = this.#interactionLocked;
    this.#interactionLocked = true;
    // The modal stays until the player reads the warning and continues.
    this.refs.noticeClose.focus({ preventScroll: true });
  }

  #hideNotice() {
    clearTimeout(this.#noticeTimer);
    this.#noticeTimer = null;
    this.refs.notice.hidden = true;
    this.refs.notice.setAttribute("aria-hidden", "true");
    this.#interactionLocked = this.#interactionLockBeforeNotice;
    this.#interactionLockBeforeNotice = false;
    if (document.activeElement === this.refs.noticeClose) this.refs.noticeClose.blur();
  }

  showLesson(payload, onComplete) {
    this.#resetTransientOverlays();
    this.#applyStage(payload.stage);
    this.refs.panel.hidden = true;
    this.#interactionLocked = true;
    this.#lessonComplete = onComplete;

    this.refs.lesson.hidden = false;
    this.refs.lesson.setAttribute("aria-hidden", "false");
    this.refs.lessonTitle.textContent = payload.title ?? t("novel.otherWay");
    this.refs.lessonChoice.textContent = payload.label ? t("novel.youChose", { label: payload.label }) : "";
    this.refs.lessonChoice.hidden = !payload.label;
    this.refs.lessonConsequence.textContent = payload.consequence ?? "";
    this.refs.lessonConsequence.hidden = !payload.consequence;
    this.refs.lessonTeach.textContent = payload.lesson ?? "";
    this.refs.lessonTeach.hidden = !payload.lesson;
    this.refs.lessonClose.focus({ preventScroll: true });
  }

  #closeLesson() {
    if (this.refs.lesson.hidden) return;
    this.refs.lesson.hidden = true;
    this.refs.lesson.setAttribute("aria-hidden", "true");
    this.refs.panel.hidden = false;
    this.#interactionLocked = false;
    const complete = this.#lessonComplete;
    this.#lessonComplete = null;
    complete?.();
  }

  /* ---------------------------------------------------------------- quiz */

  showQuiz(payload, onComplete) {
    this.#resetTransientOverlays();
    this.#applyStage(payload.stage);
    this.refs.panel.hidden = true;
    this.#interactionLocked = true;
    this.#quizComplete = onComplete;
    this.#quizQuestions = Array.isArray(payload.questions) ? payload.questions : [];
    this.#quizIndex = 0;
    this.#quizAnswers = [];
    this.#quizAnswered = false;
    this.#quizSummary = false;
    this.#quizTitle = payload.title ?? t("novel.quizDefaultTitle");

    this.refs.quiz.hidden = false;
    this.refs.quiz.setAttribute("aria-hidden", "false");
    this.refs.quizTitle.textContent = this.#quizTitle;
    this.refs.quizPrompt.textContent = payload.prompt ?? "";
    this.#renderQuizQuestion();
  }

  #renderQuizQuestion() {
    const question = this.#quizQuestions[this.#quizIndex];
    if (!question) {
      this.#renderQuizSummary();
      return;
    }

    this.#quizAnswered = false;
    this.refs.quizKicker.textContent = question.voice
      ? t("novel.quizKickerVoice", { voice: question.voice })
      : t("novel.quizKicker");
    this.refs.quizPrompt.textContent = question.question ?? "";
    this.refs.quizProgress.textContent = t("novel.questionOf", { n: this.#quizIndex + 1, total: this.#quizQuestions.length });
    this.refs.quizOptions.replaceChildren();
    this.refs.quizFeedback.hidden = true;
    this.refs.quizFeedback.replaceChildren();
    this.refs.quizNext.hidden = true;

    for (const option of question.options ?? []) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "quiz-option";
      button.dataset.optionId = option.id;
      button.textContent = option.label ?? "";
      button.addEventListener("click", () => this.#answerQuiz(question, option, button));
      this.refs.quizOptions.append(button);
    }

    this.refs.quizOptions.querySelector("button")?.focus({ preventScroll: true });
  }

  #answerQuiz(question, option, button) {
    if (this.#quizAnswered) return;
    this.#quizAnswered = true;
    this.#quizAnswers.push({ questionId: question.id, optionId: option.id });

    for (const candidate of this.refs.quizOptions.querySelectorAll(".quiz-option")) {
      candidate.disabled = true;
      const definition = question.options?.find(
        (item) => item.id === candidate.dataset.optionId,
      );
      if (definition?.correct) candidate.classList.add("is-correct");
    }

    if (!option.correct) button.classList.add("is-wrong");

    const feedback = this.refs.quizFeedback;
    feedback.replaceChildren();
    const result = document.createElement("p");
    result.className = option.correct ? "is-good" : "is-bad";
    result.textContent = option.correct
      ? t("novel.correct") + (option.feedback ?? question.explanation ?? "")
      : t("novel.notQuite") +
        (question.options?.find((item) => item.correct)?.label ?? "") +
        ". " +
        (question.explanation ?? "");
    feedback.append(result);
    if (option.feedback && !option.correct) {
      const nuance = document.createElement("p");
      nuance.textContent = option.feedback;
      feedback.append(nuance);
    }
    feedback.hidden = false;

    const last = this.#quizIndex >= this.#quizQuestions.length - 1;
    this.refs.quizNext.textContent = last ? t("novel.seeResult") : t("novel.nextQuestion");
    this.refs.quizNext.hidden = false;
    this.refs.quizNext.focus({ preventScroll: true });
  }

  #advanceQuiz() {
    if (!this.#quizAnswered) return;
    if (this.#quizSummary) {
      this.#completeQuiz();
      return;
    }
    if (this.#quizIndex >= this.#quizQuestions.length - 1) {
      this.#renderQuizSummary();
      return;
    }
    this.#quizIndex += 1;
    this.#renderQuizQuestion();
  }

  #renderQuizSummary() {
    const correct = this.#quizAnswers.filter((answer) => {
      const question = this.#quizQuestions.find((item) => item.id === answer.questionId);
      return Boolean(question?.options?.find((option) => option.id === answer.optionId)?.correct);
    }).length;

    this.#quizAnswered = true;
    this.#quizSummary = true;
    this.refs.quizKicker.textContent = t("novel.quizKickerClose");
    this.refs.quizPrompt.textContent = t("novel.quizSummaryPrompt");
    this.refs.quizProgress.textContent = t("novel.quizRecognized", { correct, total: this.#quizQuestions.length });
    this.refs.quizOptions.replaceChildren();

    const feedback = this.refs.quizFeedback;
    feedback.replaceChildren();
    const summary = document.createElement("p");
    summary.className = "is-good";
    summary.textContent =
      correct === this.#quizQuestions.length
        ? t("novel.quizAllRight")
        : t("novel.quizSomeWrong");
    feedback.append(summary);
    feedback.hidden = false;

    this.refs.quizNext.textContent = t("novel.continue");
    this.refs.quizNext.hidden = false;
    this.refs.quizNext.focus({ preventScroll: true });
  }

  #completeQuiz() {
    const complete = this.#quizComplete;
    this.#quizComplete = null;
    this.refs.quiz.hidden = true;
    this.refs.quiz.setAttribute("aria-hidden", "true");
    this.refs.panel.hidden = false;
    this.#interactionLocked = false;
    complete?.(this.#quizAnswers.map((answer) => ({ ...answer })));
  }

  /* ------------------------------------------------------------ minigame */

  showMinigame(payload, onComplete) {
    this.#resetTransientOverlays();
    this.#applyStage(payload.stage);
    this.refs.panel.hidden = true;
    this.#interactionLocked = true;
    this.#minigameComplete = onComplete;
    this.#minigameCards = Array.isArray(payload.cards) ? payload.cards : [];
    this.#minigameSelected = new Set();
    this.#minigameMode = payload.mode ?? "information";
    this.#minigameChecked = false;
    for (const card of this.#minigameCards) {
      if (card.flag && payload.flags?.[card.flag]) this.#minigameSelected.add(card.id);
    }

    this.refs.minigame.hidden = false;
    this.refs.minigame.setAttribute("aria-hidden", "false");
    this.refs.minigameTitle.textContent = payload.title ?? t("novel.activity");
    this.refs.minigamePrompt.textContent = payload.prompt ?? "";
    this.refs.minigameFeedback.hidden = true;
    this.refs.minigameFeedback.replaceChildren();
    this.refs.minigameContinue.hidden = true;
    this.refs.minigameCheck.hidden = false;
    this.refs.minigameCheck.textContent = this.#minigameMode === "support" ? t("novel.confirmSupports") : t("novel.checkSelection");
    this.refs.minigameCheck.disabled = this.#minigameSelected.size === 0;
    this.#renderMinigameCards();
    this.refs.minigameCards.querySelector("button")?.focus({ preventScroll: true });
  }

  #renderMinigameCards() {
    this.refs.minigameCards.replaceChildren();

    for (const card of this.#minigameCards) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "minigame-option";
      button.dataset.cardId = card.id;
      button.setAttribute("aria-pressed", String(this.#minigameSelected.has(card.id)));
      button.classList.toggle("is-selected", this.#minigameSelected.has(card.id));

      const marker = document.createElement("span");
      marker.className = "minigame-marker";
      marker.setAttribute("aria-hidden", "true");
      marker.textContent = this.#minigameSelected.has(card.id) ? "✓" : "○";

      const label = document.createElement("span");
      label.className = "minigame-label";
      label.textContent = card.text ?? "";

      button.append(marker, label);
      button.addEventListener("click", () => {
        if (this.#minigameSelected.has(card.id)) {
          this.#minigameSelected.delete(card.id);
          button.classList.remove("is-selected");
          button.setAttribute("aria-pressed", "false");
          marker.textContent = "○";
        } else {
          this.#minigameSelected.add(card.id);
          button.classList.add("is-selected");
          button.setAttribute("aria-pressed", "true");
          marker.textContent = "✓";
        }
        this.#minigameChecked = false;
        this.refs.minigameFeedback.hidden = true;
        this.refs.minigameContinue.hidden = true;
        this.refs.minigameCheck.disabled = this.#minigameSelected.size === 0;
      });

      this.refs.minigameCards.append(button);
    }
  }

  #checkMinigame() {
    if (!this.#minigameSelected.size) return;
    const support = this.#minigameMode === "support";
    const allCorrect = this.#minigameCards.every(
      (card) => Boolean(card.correct) === this.#minigameSelected.has(card.id),
    );

    const feedback = this.refs.minigameFeedback;
    feedback.replaceChildren();

    const summary = document.createElement("p");
    summary.className = support || allCorrect ? "is-good" : "is-bad";
    summary.textContent = support
      ? t("novel.supportFeedback")
      : allCorrect
      ? t("novel.infoGood")
      : t("novel.infoBad");
    feedback.append(summary);

    for (const card of this.#minigameCards) {
      const selected = this.#minigameSelected.has(card.id);
      if (support && !selected) continue;
      const line = document.createElement("p");
      const matched = support || Boolean(card.correct) === selected;
      line.className = matched ? "is-good" : "is-bad";
      line.textContent = `${support ? "✓" : selected ? t("novel.selected") : t("novel.notSelected")} ${card.text} — ${card.feedback ?? ""}`;
      feedback.append(line);
    }

    feedback.hidden = false;
    this.#minigameChecked = support || allCorrect;
    this.refs.minigameContinue.hidden = !this.#minigameChecked;
    feedback.scrollIntoView?.({ block: "nearest", behavior: "instant" });
  }

  #completeMinigame() {
    if (!this.#minigameChecked) return;
    const complete = this.#minigameComplete;
    this.#minigameComplete = null;
    this.refs.minigame.hidden = true;
    this.refs.minigame.setAttribute("aria-hidden", "true");
    this.refs.panel.hidden = false;
    this.#interactionLocked = false;
    complete?.([...this.#minigameSelected]);
  }

  /* --------------------------------------------------------------- rights */

  #openRights() {
    if (!this.rights || this.#rightsVisible) return;

    this.#rightsVisible = true;
    this.refs.rights.hidden = false;
    this.refs.rights.setAttribute("aria-hidden", "false");
    this.refs.rightsTitle.textContent = this.rights.title ?? t("novel.knowRights");

    const body = this.refs.rightsBody;
    body.replaceChildren();

    if (this.rights.intro) body.append(this.#rightsSection(null, this.rights.intro));

    for (const section of this.rights.sections ?? []) {
      body.append(this.#rightsSection(section.title, section.text));
    }

    if (Array.isArray(this.rights.resources) && this.rights.resources.length > 0) {
      const section = document.createElement("section");
      section.className = "rights-section";

      const heading = document.createElement("h3");
      heading.textContent = this.rights.resourcesTitle ?? t("novel.supportResources");
      section.append(heading);

      const list = document.createElement("ul");
      for (const resource of this.rights.resources) {
        const item = document.createElement("li");
        const name = document.createElement("strong");
        name.textContent = resource.name ?? "";
        item.append(name, document.createTextNode(` — ${resource.text ?? ""}`));
        if (resource.url?.startsWith("https://")) {
          const link = document.createElement("a");
          link.href = resource.url;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = t("novel.openResource", { name: resource.name });
          item.append(link);
        }
        list.append(item);
      }

      section.append(list);
      body.append(section);
    }

    if (this.rights.closing) {
      const closing = document.createElement("p");
      closing.className = "rights-closing";
      closing.textContent = this.rights.closing;
      body.append(closing);
    }

    this.refs.rightsClose.focus({ preventScroll: true });
  }

  #rightsSection(title, text) {
    const section = document.createElement("section");
    section.className = "rights-section";

    if (title) {
      const heading = document.createElement("h3");
      heading.textContent = title;
      section.append(heading);
    }

    if (text) {
      const paragraph = document.createElement("p");
      paragraph.textContent = text;
      section.append(paragraph);
    }

    return section;
  }

  #closeRights() {
    if (!this.#rightsVisible) return;

    this.#rightsVisible = false;
    this.refs.rights.hidden = true;
    this.refs.rights.setAttribute("aria-hidden", "true");
    this.refs.rightsBody.replaceChildren();

    if (this.#endingVisible) this.refs.endingRights.focus({ preventScroll: true });
  }

  resetTransientOverlays() {
    this.#resetTransientOverlays();
  }

  #resetTransientOverlays() {
    this.refs.announcement.textContent = "";
    this.typewriter.stop();
    this.#clearChoices();
    this.#awaitingChoice = false;
    this.#leaveEnding();
    this.refs.advance.hidden = true;
    this.#clearChat();
    this.refs.interstitial.hidden = true;
    this.refs.interstitial.setAttribute("aria-hidden", "true");
    this.refs.quiz.hidden = true;
    this.refs.quiz.setAttribute("aria-hidden", "true");
    this.refs.quizFeedback.hidden = true;
    this.refs.quizFeedback.replaceChildren();
    this.refs.quizOptions.replaceChildren();
    this.refs.quizNext.hidden = true;
    this.refs.lesson.hidden = true;
    this.refs.lesson.setAttribute("aria-hidden", "true");
    this.#lessonComplete = null;
    this.#quizComplete = null;
    this.#quizQuestions = [];
    this.#quizAnswers = [];
    this.#quizSummary = false;
    this.#hideNotice();
    this.refs.minigame.hidden = true;
    this.refs.minigame.setAttribute("aria-hidden", "true");
    this.refs.minigameFeedback.hidden = true;
    this.refs.minigameContinue.hidden = true;
    this.refs.minigameCards.replaceChildren();
    this.#interactionLocked = false;
    this.#interstitialComplete = null;
    this.#minigameComplete = null;
    this.#closeRights();
    this.refs.panel.hidden = false;
  }

  /* ------------------------------------------------------------------ helpers */

  #bindEvents() {
    this.refs.advance.addEventListener("click", (event) => {
      if (event.detail === 0 && this.#isAdvanceBuffered()) return;
      this.onAdvance();
    });
    this.refs.chatHint.addEventListener("click", (event) => {
      if (event.detail === 0 && this.#isAdvanceBuffered()) return;
      this.onAdvance();
    });
    this.refs.chatSkip.addEventListener("click", () => this.#skipChat());
    this.refs.scene.addEventListener("click", (event) => {
      if (event.target.closest("button, a, input, select, textarea")) return;
      if (globalThis.getSelection?.()?.toString()) return;
      if (!this.refs.welcome.hidden) return;
      if (this.#interactionLocked || this.#rightsVisible) return;
      if (this.#awaitingChoice || this.#endingVisible) return;
      this.onAdvance();
    });

    document.addEventListener("keydown", this.#onKeyDown);

    this.refs.library.addEventListener("click", (event) => {
      event.stopPropagation();
      this.refs.library.blur();
      this.onExit?.();
    });

    this.refs.endingLibrary.addEventListener("click", (event) => {
      event.stopPropagation();
      this.refs.endingLibrary.blur();
      this.onExit?.();
    });

    this.refs.interstitialNext.addEventListener("click", () => this.#completeInterstitial());
    this.refs.quizNext.addEventListener("click", () => this.#advanceQuiz());
    this.refs.lessonClose.addEventListener("click", () => this.#closeLesson());
    this.refs.noticeClose.addEventListener("click", () => {
      this.#hideNotice();
      const choice = this.refs.choices.querySelector(".choice");
      if (choice) choice.focus({ preventScroll: true });
      else if (!this.refs.advance.hidden) this.refs.advance.focus({ preventScroll: true });
      else if (!this.refs.chatHint.hidden) this.refs.chatHint.focus({ preventScroll: true });
      else if (!this.refs.interstitial.hidden) this.refs.interstitialNext.focus({ preventScroll: true });
    });
    this.refs.minigameCheck.addEventListener("click", () => this.#checkMinigame());
    this.refs.minigameContinue.addEventListener("click", () => this.#completeMinigame());
    this.refs.endingRights.addEventListener("click", () => this.#openRights());
    this.refs.rightsClose.addEventListener("click", () => this.#closeRights());

    if (this.refs.chapterSelect && Array.isArray(this.chapters) && this.chapters.length > 0) {
      this.refs.chapterSelect.hidden = false;
      for (const ch of this.chapters) {
        const option = document.createElement("option");
        option.value = ch.id;
        option.textContent = ch.label;
        this.refs.chapterSelect.append(option);
      }
      this.refs.chapterSelect.addEventListener("change", (e) => {
        const targetId = e.target.value;
        if (targetId && this.onJumpToChapter) {
          this.onJumpToChapter(targetId);
          this.refs.chapterSelect.blur();
        }
      });
    }
  }

  #handleKeyDown(event) {
    if (event.repeat && event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Down" && event.key !== "Up") return;
    if (!this.refs.welcome.hidden) {
      if (event.key === "Tab") {
        event.preventDefault();
        this.refs.welcomeStart.focus({ preventScroll: true });
      }
      return;
    }
    if (!this.refs.notice.hidden) {
      if (event.key === "Escape") {
        event.preventDefault();
        this.#hideNotice();
        this.refs.choices.querySelector(".choice")?.focus({ preventScroll: true });
      } else if (event.key === "Tab") {
        event.preventDefault();
        this.refs.noticeClose.focus({ preventScroll: true });
      }
      return;
    }
    if (!this.refs.lesson.hidden || !this.refs.quiz.hidden) {
      if (event.key === "Escape") event.preventDefault();
      if (!this.refs.quiz.hidden && !this.#quizAnswered) {
        const isDown = event.key === "ArrowDown" || event.key === "Down";
        const isUp = event.key === "ArrowUp" || event.key === "Up";
        if (isDown || isUp) {
          event.preventDefault();
          const buttons = [...this.refs.quizOptions.querySelectorAll("button.quiz-option:not(:disabled)")];
          if (buttons.length > 0) {
            const current = buttons.indexOf(document.activeElement);
            let next = 0;
            if (isDown) {
              next = current >= 0 ? (current + 1) % buttons.length : 0;
            } else {
              next = current >= 0 ? (current - 1 + buttons.length) % buttons.length : buttons.length - 1;
            }
            buttons[next].focus({ preventScroll: true });
          }
        }
      }
      return;
    }
    if (this.#rightsVisible && event.key === "Tab") {
      const controls = [...this.refs.rights.querySelectorAll("a, button")];
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || !this.refs.rights.contains(document.activeElement))) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !this.refs.rights.contains(document.activeElement))) {
        event.preventDefault();
        first?.focus();
      }
      return;
    }
    if (event.key === "Escape" && this.#rightsVisible) {
      event.preventDefault();
      this.#closeRights();
      return;
    }

    // Navegación con flechas arriba/abajo en las opciones de decisión
    if (this.#awaitingChoice && !this.refs.choices.hidden) {
      const isDown = event.key === "ArrowDown" || event.key === "Down";
      const isUp = event.key === "ArrowUp" || event.key === "Up";
      if (isDown || isUp) {
        event.preventDefault();
        const buttons = [...this.refs.choices.querySelectorAll("button.choice")];
        if (buttons.length > 0) {
          const enabled = buttons.filter((b) => !b.disabled);
          const list = enabled.length > 0 ? enabled : buttons;
          const current = list.indexOf(document.activeElement);
          let next = 0;
          if (isDown) {
            next = current >= 0 ? (current + 1) % list.length : 0;
          } else {
            next = current >= 0 ? (current - 1 + list.length) % list.length : list.length - 1;
          }
          list[next].focus({ preventScroll: true });
        }
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        const activeChoice = this.refs.choices.querySelector("button.choice:focus");
        if (!activeChoice) {
          event.preventDefault();
          const first = this.refs.choices.querySelector("button.choice:not(:disabled)") || this.refs.choices.querySelector("button.choice");
          first?.focus({ preventScroll: true });
          return;
        }
      }
    }

    if (event.key !== " " && event.key !== "Enter") return;
    if (event.target instanceof Element && event.target.closest("button, a, input, select, textarea, [contenteditable='true']")) return;
    if (this.#interactionLocked || this.#rightsVisible) return;

    event.preventDefault();

    if (this.#isAdvanceBuffered()) return;
    if (this.#awaitingChoice || this.#endingVisible) return;
    this.onAdvance();
  }

  // `style` fuerza una clave de estilo cuando la placa no es un personaje
  // (p. ej. "pensamiento"), sin tocar la resolución del cargo jurídico.
  #setSpeaker(name, remote = false, key = null, style = null) {
    if (!name) {
      this.#hideLegalBadge(true);
      this.refs.speaker.hidden = true;
      this.refs.speaker.textContent = "";
      this.refs.speaker.classList.remove("is-voice");
      delete this.refs.speaker.dataset.speaker;
      return;
    }

    this.refs.speaker.hidden = false;
    this.refs.speaker.textContent = name;
    // El estilo depende de un identificador estable, no del texto traducido
    const styleKey = style ?? key ?? (name === t("novel.narration") ? "narración" : name === t("novel.yourTurn") ? "decisión" : name);
    this.refs.speaker.dataset.speaker = styleKey.toLowerCase();
    const normalized = (key ?? name)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const onStage = new Set([
      "maya",
      "sofi",
      "lucia",
      "elena",
      "mama",
      "papa",
      "madre",
      "padre",
      "profesor",
      "companera",
      "companero",
    ]);
    this.refs.speaker.classList.toggle("is-voice", remote || (!this.root.classList.contains("sara-mode") && !onStage.has(normalized)));
    this.#checkLegalBadge(name, key);
  }

  #checkLegalBadge(name, key) {
    if (!this.refs.legalBadge || !this.refs.legalBadgeText) return;

    let roleTitle = null;
    let badgeKey = null;
    let personId = null;

    if (this.resolveLegalPerson) {
      const person = this.resolveLegalPerson(key ?? name);
      if (person) {
        personId = person.id;
        badgeKey = person.id;
        roleTitle = person.role || person.name;
        if (person.id === "irene") {
          roleTitle = person.role || t("novel.roles.abogada") || "Abogada";
        }
      }
    }

    if (!roleTitle || !badgeKey) {
      const raw = (key ?? name ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (!raw) {
        this.#hideLegalBadge();
        return;
      }

      let roleKey = null;
      let fallbackText = null;

      if (raw.includes("juez") || raw.includes("jutgess") || raw.includes("epaile") || raw.includes("xuiz")) {
        roleKey = raw.includes("jueza") || raw.includes("jutgess") || raw.includes("xuiz") ? "jueza" : "juez";
        fallbackText = "Juez o jueza";
      } else if (raw.includes("fiscal")) {
        roleKey = "fiscal";
        fallbackText = "Ministerio Fiscal";
      } else if (raw.includes("letrad") || raw.includes("laj")) {
        roleKey = "letrada";
        fallbackText = "Letrada de la Administración de Justicia";
      } else if (raw.includes("abogad") || raw.includes("advocat") || raw.includes("abokat") || raw.includes("avogad") || raw.includes("irene")) {
        roleKey = raw.includes("abogado") || raw.includes("advocat") || raw.includes("avogado") ? "abogado" : "abogada";
        fallbackText = "Abogada";
      } else if (raw.includes("trabajadora social") || raw.includes("treballadora social") || raw.includes("gizarte-langile") || raw.includes("traballadora social")) {
        roleKey = "trabajadoraSocial";
        fallbackText = "Trabajadora social";
      } else if (raw.includes("psicolog") || raw.includes("auzitegi-psikolog")) {
        roleKey = "psicologa";
        fallbackText = "Psicóloga forense";
      } else if (raw.includes("acogida") || raw.includes("acollida") || raw.includes("babes")) {
        roleKey = "equipoAcogida";
        fallbackText = "Equipo de acogida y protección";
      } else if (raw.includes("profesional")) {
        roleKey = "profesional";
        fallbackText = "Profesional especializado";
      }

      if (roleKey) {
        badgeKey = roleKey;
        roleTitle = t(`novel.roles.${roleKey}`) || fallbackText;
      }
    }

    if (!roleTitle || !badgeKey) {
      this.#hideLegalBadge();
      return;
    }

    // Solo mostrarlo la primera vez que aparece el cargo en la historia
    if (this.seenLegalRoles.has(badgeKey)) {
      if (this.refs.legalBadge.dataset.badgeKey && this.refs.legalBadge.dataset.badgeKey !== badgeKey) {
        this.#hideLegalBadge();
      }
      return;
    }
    this.seenLegalRoles.add(badgeKey);

    delete this.refs.legalBadge.dataset.personId;
    if (personId) {
      this.refs.legalBadge.dataset.personId = personId;
    }
    this.refs.legalBadge.dataset.badgeKey = badgeKey;

    this.refs.legalBadgeText.textContent = roleTitle;
    this.refs.legalBadge.hidden = false;
    this.refs.legalBadge.classList.remove("is-hiding");

    // Pequeño aria-label o announcement para accesibilidad
    const currentAnnounce = this.refs.announcement.textContent;
    this.refs.announcement.textContent = `[Cargo: ${roleTitle}] ${currentAnnounce}`;

    if (this.#badgeTimer) clearTimeout(this.#badgeTimer);
    this.#badgeTimer = setTimeout(() => {
      this.#hideLegalBadge();
    }, 4500);
  }

  #hideLegalBadge(immediate = false) {
    if (!this.refs.legalBadge) return;
    if (this.#badgeTimer) {
      clearTimeout(this.#badgeTimer);
      this.#badgeTimer = null;
    }
    if (immediate) {
      this.refs.legalBadge.hidden = true;
      this.refs.legalBadge.classList.remove("is-hiding");
      delete this.refs.legalBadge.dataset.badgeKey;
      return;
    }
    this.refs.legalBadge.classList.add("is-hiding");
    setTimeout(() => {
      if (this.refs.legalBadge) {
        this.refs.legalBadge.hidden = true;
        this.refs.legalBadge.classList.remove("is-hiding");
        delete this.refs.legalBadge.dataset.badgeKey;
      }
    }, 350);
  }

  #applyStage(stage) {
    if (!stage) return;

    this.#setBackground(stage.background);
    this.#setPerspective(stage.perspective, stage.mood);

    if (!stage.character) {
      this.#characterKey = null;
      this.refs.character.classList.remove("is-visible");
      delete this.refs.character.dataset.position;
      return;
    }

    const key = `${stage.character.id}:${stage.character.expression}:${stage.character.at ?? ""}`;
    if (key === this.#characterKey) return;

    this.#characterKey = key;
    this.refs.character.className =
      `character is-visible expression-${stage.character.expression}`;
    this.refs.character.dataset.character = stage.character.id;
    if (typeof stage.character.at === "string") {
      this.refs.character.dataset.position = stage.character.at;
    }

    const source = this.#resolveCharacterSource(stage.character);
    if (source) {
      if (this.refs.sprite.getAttribute("src") !== source) {
        this.refs.sprite.src = source;
        this.refs.sprite.classList.remove("sprite-swap");
        void this.refs.sprite.offsetWidth;
        this.refs.sprite.classList.add("sprite-swap");
      }
      this.refs.sprite.alt = "";
    } else {
      this.refs.character.classList.remove("is-visible");
    }
  }

  showSpeakerSprite(source, name) {
    this.#characterKey = null;
    this.refs.character.className = "character is-visible speaker-sprite";
    this.refs.character.dataset.character = name.toLowerCase();
    this.refs.character.dataset.position = "right";
    if (this.refs.sprite.getAttribute("src") !== source) {
      this.refs.sprite.src = source;
      this.refs.sprite.classList.remove("sprite-swap");
      void this.refs.sprite.offsetWidth;
      this.refs.sprite.classList.add("sprite-swap");
    }
    this.refs.sprite.alt = "";
  }

  #resolveCharacterSource(character) {
    try {
      return this.resolveCharacter(character);
    } catch (error) {
      console.warn(error);
      return null;
    }
  }

  #setPerspective(perspective, mood) {
    const labels = {
      maya: t("novel.perspectiveMaya"),
      sofi: t("novel.perspectiveSofi"),
      elena: t("novel.perspectiveElena"),
      red: t("novel.perspectiveRed"),
    };

    this.refs.scene.dataset.mood = mood ?? "neutral";
    if (perspective) this.refs.scene.dataset.perspective = perspective;
    else delete this.refs.scene.dataset.perspective;

    const label = perspective ? labels[perspective] : null;
    this.refs.perspectiveBadge.hidden = !label;
    this.refs.perspectiveBadge.textContent = label ?? "";
    this.refs.perspectiveBadge.dataset.perspective = perspective ?? "";
  }

  #setBackground(name) {
    if (!name || name === this.#background) return;

    this.#background = name;

    const image = this.resolveBackground?.(name) ?? null;
    const request = ++this.#backgroundRequest;
    const activate = (source) => {
      if (request !== this.#backgroundRequest) return;
      const nextIndex = 1 - this.#activeBackgroundLayer;
      const nextLayer = this.refs.backgrounds[nextIndex];
      const previousLayer = this.refs.backgrounds[this.#activeBackgroundLayer];
      nextLayer.className = source ? "scene-bg is-image" : `scene-bg bg-${name}`;
      nextLayer.style.backgroundImage = source ? `url("${source}")` : "";
      void nextLayer.offsetWidth;
      nextLayer.classList.add("is-active");
      previousLayer.classList.remove("is-active");
      this.#activeBackgroundLayer = nextIndex;
    };
    if (!image || typeof Image !== "function") { activate(image); return; }
    const preload = new Image();
    preload.src = image;
    if (typeof preload.decode === "function") preload.decode().then(() => activate(image), () => activate(null));
    else { preload.onload = () => activate(image); preload.onerror = () => activate(null); }
  }


  #renderChoices(options) {
    const fragment = document.createDocumentFragment();

    options.forEach((option, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice";
      button.disabled = this.autoFocusStory === true;
      button.style.setProperty("--i", String(index));

      const number = document.createElement("span");
      number.className = "choice-index";
      number.textContent = String(index + 1).padStart(2, "0");

      const label = document.createElement("span");
      label.className = "choice-label";
      label.textContent = option.label;

      button.append(number, label);
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        this.#awaitingChoice = false;
        this.#clearChoices();
        this.onChoose(option.id);
      });

      fragment.append(button);
    });

    this.refs.choices.replaceChildren(fragment);
    this.refs.choices.hidden = false;

    // A short guard prevents a double-click used to skip the prompt from
    // immediately selecting whichever option appeared under the cursor.
    this.refs.choices.classList.remove("is-ready");
    clearTimeout(this.#choiceReadyTimer);
    this.#choiceReadyTimer = setTimeout(() => {
      this.refs.choices.classList.add("is-ready");
      this.refs.choices.querySelectorAll("button").forEach(button => { button.disabled = false; });
      if (!this.root.querySelector('[data-sara-overlay]:not([hidden]), .sara-drawing-overlay')) {
        this.refs.choices.querySelector("button")?.focus({ preventScroll: true });
      }
    }, 200);
  }

  #clearChoices() {
    clearTimeout(this.#choiceReadyTimer);
    this.#choiceReadyTimer = null;
    this.refs.choices.classList.remove("is-ready");
    this.refs.choices.hidden = true;
    this.refs.choices.replaceChildren();
  }

  #leaveEnding() {
    if (!this.#endingVisible) return;

    this.#endingVisible = false;
    this.#closeRights();
    this.refs.endingRights.blur();
    this.refs.endingLibrary.blur();
    this.refs.ending.classList.remove("is-visible");
    this.refs.ending.setAttribute("aria-hidden", "true");
  }
}

function defaultCharacterSource({ id, expression }) {
  return `/assets/characters/${id}/${expression}.svg`;
}

function defaultCharacterName(characterId) {
  return characterId;
}

function defaultSceneLabel(sceneId) {
  return sceneId;
}

// Avatar redondo del chat: el retrato del personaje si existe, si no su inicial
// sobre un color estable derivado del nombre.
function chatAvatar(name = "") {
  const avatar = document.createElement("span");
  avatar.className = "chat-avatar";
  avatar.setAttribute("aria-hidden", "true");
  const src = name && personImage(name);
  if (src) {
    const img = document.createElement("img");
    img.src = src;
    img.alt = "";
    avatar.append(img);
  } else {
    let hash = 0;
    for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % 360;
    avatar.style.background = `hsl(${hash} 45% 42%)`;
    avatar.textContent = (name.trim()[0] ?? "?").toUpperCase();
  }
  return avatar;
}
