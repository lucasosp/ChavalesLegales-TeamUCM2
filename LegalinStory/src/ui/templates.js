/**
 * Static markup for the novel shell, including the optional overlays used by
 * the JSON content: messaging scenes, chapter cards, an educational minigame,
 * and the rights panel.
 */
import { t } from "../i18n.js";

export function appTemplate() {
  return `
    <main class="novel" aria-label="${t("novel.ariaLabel")}">
      <div class="scene" data-scene>
        <div class="scene-bg" data-bg-layer="0" aria-hidden="true"></div>
        <div class="scene-bg" data-bg-layer="1" aria-hidden="true"></div>
        <div class="scene-vignette" aria-hidden="true"></div>

        <div class="character" data-character aria-hidden="true">
          <img class="sprite" data-sprite alt="" draggable="false" />
        </div>

        <header class="topbar">
          <span class="brand" data-brand></span>
          <span class="perspective-badge" data-perspective-badge hidden></span>
          <div class="topbar-actions">
            <select class="chapter-debug-select" data-chapter-select hidden aria-label="${t("novel.chapterSelectTitle")}">
              <option value="" disabled selected>${t("novel.chapterSelect")}</option>
            </select>
            <button class="library" type="button" data-library>${t("novel.exit")}</button>
          </div>
        </header>

        <section class="welcome" data-welcome hidden aria-hidden="true" aria-labelledby="welcome-title">
          <div class="welcome-card" role="dialog" aria-modal="true">
            <p class="welcome-kicker">${t("novel.welcomeKicker")}</p>
            <h1 class="welcome-title" id="welcome-title">${t("novel.welcomeTitle")}</h1>
            <ul class="welcome-instructions">
              <li>${t("novel.welcome1")}</li>
              <li>${t("novel.welcome2")}</li>
              <li>${t("novel.welcome3")}</li>
              <li>${t("novel.welcome4")}</li>
            </ul>
            <button class="welcome-button" type="button" data-welcome-start>${t("novel.welcomeStart")}</button>
          </div>
        </section>

        <section class="notice" data-notice hidden aria-hidden="true">
          <div class="notice-card" role="alertdialog" aria-modal="true" aria-labelledby="notice-title">
            <p class="notice-kicker">${t("novel.notice")}</p>
            <h2 class="notice-title" id="notice-title" data-notice-title></h2>
            <p class="notice-text" data-notice-text></p>
            <div class="notice-teach">
              <p class="notice-teach-label">${t("novel.nextTime")}</p>
              <p class="notice-lesson" data-notice-lesson></p>
            </div>
            <button class="notice-close" type="button" data-notice-close>
              ${t("novel.continue")}
            </button>
          </div>
        </section>

        <div class="choices" data-choices hidden></div>

        <p class="sr-only" data-announcement role="status"></p>
        <section class="dialogue" data-panel>
          <div class="nameplate" data-speaker-name hidden></div>
          <p class="dialogue-text" data-text aria-hidden="true"></p>
          <button class="advance" type="button" data-advance hidden>${t("novel.continueArrow")}</button>
        </section>

        <section class="chat" data-chat hidden aria-label="${t("novel.chatAria")}">
          <header class="chat-head">
            <span class="chat-dot" aria-hidden="true"></span>
            <span class="chat-heading"><span data-chat-title></span><span class="chat-self" data-chat-self></span></span>
          </header>
          <div class="chat-log" data-chat-log role="log" aria-label="${t("novel.chatLogAria")}"></div>
          <button class="chat-hint" type="button" data-chat-skip>${t("novel.chatSkip")}</button>
          <button class="chat-hint" type="button" data-chat-hint hidden>${t("novel.continueArrow")}</button>
        </section>

        <section class="interstitial" data-interstitial hidden aria-hidden="true">
          <div class="interstitial-card">
            <p class="interstitial-kicker" data-interstitial-kicker></p>
            <h2 class="interstitial-title" data-interstitial-title></h2>
            <p class="interstitial-text" data-interstitial-text></p>
            <button class="interstitial-button" type="button" data-interstitial-next>
              ${t("novel.continue")}
            </button>
          </div>
        </section>

        <section class="minigame" data-minigame hidden aria-hidden="true">
          <div class="minigame-card">
            <p class="minigame-kicker">${t("novel.minigameKicker")}</p>
            <h2 class="minigame-title" data-minigame-title></h2>
            <p class="minigame-prompt" data-minigame-prompt></p>
            <div class="minigame-cards" data-minigame-cards></div>
            <div class="minigame-feedback" data-minigame-feedback role="status" hidden></div>
            <div class="minigame-actions">
              <button class="minigame-button" type="button" data-minigame-check>
                ${t("novel.check")}
              </button>
              <button class="minigame-button is-primary" type="button" data-minigame-continue hidden>
                ${t("novel.continue")}
              </button>
            </div>
          </div>
        </section>

        <section class="quiz" data-quiz hidden aria-hidden="true">
          <div class="quiz-card">
            <p class="quiz-kicker" data-quiz-kicker>${t("novel.quizKicker")}</p>
            <h2 class="quiz-title" data-quiz-title></h2>
            <p class="quiz-prompt" data-quiz-prompt></p>
            <div class="quiz-progress" data-quiz-progress></div>
            <div class="quiz-options" data-quiz-options></div>
            <div class="quiz-feedback" data-quiz-feedback role="status" hidden></div>
            <div class="quiz-actions">
              <button class="minigame-button is-primary" type="button" data-quiz-next hidden>
                ${t("novel.nextQuestion")}
              </button>
            </div>
          </div>
        </section>

        <section class="lesson" data-lesson hidden aria-hidden="true">
          <div class="lesson-card" role="dialog" aria-modal="true" aria-labelledby="lesson-title">
            <p class="lesson-kicker">${t("novel.lessonKicker")}</p>
            <h2 class="lesson-title" id="lesson-title" data-lesson-title></h2>
            <p class="lesson-choice" data-lesson-choice></p>
            <div class="lesson-consequence" data-lesson-consequence></div>
            <div class="lesson-teach">
              <p class="lesson-teach-label">${t("novel.nextTime")}</p>
              <p class="lesson-teach-text" data-lesson-teach></p>
            </div>
            <button class="lesson-button" type="button" data-lesson-close>
              ${t("novel.decideAgain")}
            </button>
          </div>
        </section>

        <section class="ending" data-ending aria-hidden="true">
          <div class="ending-card">
            <p class="ending-kicker" data-ending-kicker></p>
            <h1 class="ending-title" data-ending-title></h1>
            <p class="ending-text" data-ending-text></p>
            <div class="ending-actions">
              <button class="ending-rights" type="button" data-ending-rights hidden>
                ${t("novel.knowRights")}
              </button>
              <button class="ending-library" type="button" data-ending-library>
                ${t("novel.backToPlatform")}
              </button>
            </div>
          </div>
        </section>

        <section class="rights-panel" data-rights hidden aria-hidden="true">
          <div class="rights-card" role="dialog" aria-modal="true" aria-labelledby="rights-title">
            <p class="rights-kicker">Chavales Legales</p>
            <h2 class="rights-title" id="rights-title" data-rights-title></h2>
            <div class="rights-body" data-rights-body></div>
            <button class="rights-close" type="button" data-rights-close>${t("novel.back")}</button>
          </div>
        </section>
      </div>
    </main>
  `;
}
