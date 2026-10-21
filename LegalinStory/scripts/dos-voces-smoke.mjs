/**
 * End-to-end smoke test for "Dos voces".
 *
 * Exercises the dual perspective, the pedagogical consequence notice, the message scenes,
 * the final quiz, mood/perspective presentation and the rights panel.
 */
import { JSDOM } from "jsdom";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
  url: "http://localhost/",
  pretendToBeVisual: true,
});

const { window } = dom;
globalThis.window = window;
globalThis.document = window.document;
globalThis.HTMLElement = window.HTMLElement;
globalThis.Element = window.Element;
globalThis.localStorage = window.localStorage;
globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window);
globalThis.cancelAnimationFrame = window.cancelAnimationFrame.bind(window);
globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
window.matchMedia = globalThis.matchMedia;

const { App } = await import("../src/app/App.js");
const { compileStory } = await import("../src/content/compileStory.js");
const { resolveCharacterAsset, resolveBackgroundAsset } = await import(
  "../src/content/contentLoader.js"
);
const { MemorySaveStore } = await import("../src/services/saveStores.js");

const contentRoot = new URL("../public/content/", import.meta.url);
const readContent = async (file) =>
  JSON.parse(await readFile(new URL(file, contentRoot), "utf8"));

const [storyDoc, sceneDoc, assets, rights] = await Promise.all([
  readContent("stories/dos-voces/story.json"),
  readContent("stories/dos-voces/scene.json"),
  readContent("shared/assets.json"),
  readContent("stories/dos-voces/rights.json"),
]);

const { nodes: story, startId } = compileStory({
  storyDoc,
  scenes: sceneDoc,
  assets,
  defaultScene: "home-living-cold",
});

const root = document.querySelector("#app");
const saveStore = new MemorySaveStore();
const app = new App({
  root,
  story,
  startId,
  title: "Dos voces",
  saveStore,
  rights,
  resolveCharacter: (character) => resolveCharacterAsset(assets, character),
  resolveCharacterName: (characterId) => assets.characters?.[characterId]?.displayName ?? characterId,
  resolveBackground: (sceneId) => resolveBackgroundAsset(sceneDoc, assets, sceneId),
  resolveSceneLabel: (sceneId) => sceneDoc.scenes?.[sceneId]?.label ?? sceneId,
});

const el = (selector) => root.querySelector(selector);
const shown = (selector) => {
  const element = el(selector);
  return Boolean(element && !element.hidden);
};

function stopState() {
  if (el("[data-ending]").classList.contains("is-visible")) return "ending";
  if (shown("[data-notice]")) return "notice";
  if (shown("[data-lesson]")) return "lesson";
  if (shown("[data-quiz]")) return "quiz";
  if (shown("[data-minigame]")) return "minigame";
  if (shown("[data-chat]")) return "chat";
  if (shown("[data-interstitial]")) return "interstitial";
  if (shown("[data-choices]")) return "choice";
  return null;
}

function pump({ limit = 900 } = {}) {
  for (let index = 0; index < limit; index += 1) {
    const state = stopState();
    if (state) return state;
    if (app.view.isTyping()) {
      app.view.skipTyping();
      continue;
    }
    app.advance();
  }
  throw new Error("pump limit reached");
}

function clickText(selector, text) {
  const button = [...root.querySelectorAll(selector)].find((candidate) =>
    candidate.textContent.includes(text),
  );
  assert.ok(button, `button with text "${text}" not found in ${selector}`);
  button.click();
}

function handleInterstitial(expectedTitle) {
  assert.equal(shown("[data-interstitial]"), true, "interstitial should be visible");
  if (expectedTitle) assert.equal(el("[data-interstitial-title]").textContent, expectedTitle);
  el("[data-interstitial-next]").click();
}

function chooseFirstSafe() {
  assert.equal(shown("[data-choices]"), true, "choices should be visible");
  const button = el("[data-choices]").querySelector(".choice");
  assert.ok(button, "expected a choice button");
  const before = app.engine.nodeId;
  button.click();
  return before;
}

function handleChat() {
  assert.equal(shown("[data-chat]"), true, "WhatsApp scene should be visible");
  const title = el("[data-chat-title]").textContent;
  assert.ok(title.length > 0, "chat title should be visible");
  app.view.skipTyping();
  const text = el("[data-chat-log]").textContent;
  assert.ok(text.length > 20, "WhatsApp messages must be visible as text");
  app.advance();
}

function handleQuiz() {
  assert.equal(shown("[data-quiz]"), true, "quiz should be visible");
  const questions = app.engine.currentNode.questions;
  for (const question of questions) {
    const correct = question.options.find((option) => option.correct);
    const optionButton = [...el("[data-quiz-options]").querySelectorAll(".quiz-option")].find(
      (button) => button.textContent === correct.label,
    );
    assert.ok(optionButton, `quiz option "${correct.label}" not rendered`);
    optionButton.click();
    assert.equal(shown("[data-quiz-next]"), true, "quiz next should appear after answering");
    el("[data-quiz-next]").click();
  }
  assert.match(el("[data-quiz-progress]").textContent, /2 de 2/);
  el("[data-quiz-next]").click();
}

const speakerMap = {
  Maya: "maya",
  Sofi: "sofi",
  Lucía: "lucia",
  Elena: "elena",
  Mamá: "madre",
  Papá: "padre",
  Profesor: "profesor",
  Compañera: "companera",
  Compañero: "companero",
};
const misalignedSpeakers = Object.entries(story).filter(([, node]) => {
  if (node.type !== "dialogue" || !node.speaker || node.remote) return false;
  const expected = speakerMap[node.speaker];
  if (!expected) return false;
  return !node.character || node.character.id !== expected;
});
assert.equal(misalignedSpeakers.length, 0, "visible sprite must match the speaking character");
assert.equal(root.querySelector("[data-cast-caption]"), null, "entrances must not use a floating chip");
for (const id of ["c1-s2-risk2-3", "c2-m4-risk1-3", "c4-m2-risk2-4"]) {
  assert.equal(story[id].remote, true, "phone/message voices must be marked remote");
}

try {
  app.start();
  assert.equal(shown("[data-welcome]"), true, "new game should show the welcome screen");
  el("[data-welcome-start]").click();
  assert.equal(el("[data-scene]").dataset.mood, "cold");
  assert.equal(el("[data-perspective-badge]").textContent, "Maya · en casa");
  assert.equal(el("[data-character]").dataset.position, "center", "sprites should use the same centered position as No lo reenvíes");
  assert.match(
    el(".scene-bg.is-active").style.backgroundImage,
    /home-living-cold\.svg/,
    "the room background should match the starting location",
  );

  assert.equal(pump(), "interstitial");
  handleInterstitial("Dos voces");

  assert.equal(pump(), "choice");
  clickText("[data-choices] .choice", "12 y 16");

  let afterPrologue = pump();
  while (afterPrologue === "interstitial") {
    handleInterstitial();
    afterPrologue = pump();
  }
  assert.equal(afterPrologue, "choice");
  assert.equal(app.engine.currentNode.type, "choice");
  const choiceId = app.engine.nodeId;

  // Consequence notice: a risky option opens a short consequence story, shows
  // the warning, and then continues forward to the next decision.
  clickText("[data-choices] .choice", "Ponerse delante");
  assert.match(app.engine.nodeId, /-risk1-1$/, "the unsafe option should open its mini-story");
  const midStorySave = saveStore.load();
  assert.equal(midStorySave.nodeId, app.engine.nodeId);
  assert.equal(midStorySave.checkpoint, null, "risky choices must not keep a rewind checkpoint");
  assert.equal(pump(), "notice", "the consequence story should end in a warning notice");
  assert.match(el("[data-notice-title]").textContent, /escudo|Otra forma/i);
  assert.match(el("[data-notice-lesson]").textContent, /riesgo|adulto/i);
  const noticeDialog = el("[data-notice]").querySelector(".notice-card");
  assert.equal(noticeDialog.getAttribute("role"), "alertdialog");
  assert.equal(noticeDialog.getAttribute("aria-modal"), "true");
  assert.match(el("[data-notice-close]").textContent, /Continuar/);
  const spokenMiniLines = Object.entries(story)
    .filter(([id]) => id.startsWith(`${choiceId}-risk1-`))
    .map(([, node]) => node)
    .filter((node) => node?.type === "dialogue" && node.speaker);
  assert.ok(spokenMiniLines.length >= 2, "the mini-story must include spoken dialogue, not only thoughts");
  assert.match(el("[data-notice-text]").textContent, /discusión|miedo/i);
  assert.equal(app.engine.nodeId, "c1-m2", "the consequence must continue to the next decision");
  assert.equal(app.engine.checkpoint, null, "no rewind checkpoint should survive");
  assert.equal(app.engine.flags.errores, 1);
  assert.equal(app.engine.flags.nivel_seguridad, 0, "unsafe option must not grant progress flags");

  el("[data-notice-close]").click();
  assert.equal(pump(), "choice", "dismissing the notice should leave the next decision visible");

  chooseFirstSafe();
  assert.equal(pump(), "choice");
  assert.match(
    el(".scene-bg.is-active").style.backgroundImage,
    /home-kitchen-cold\.svg/,
    "the background must change when the room changes",
  );

  // Play all remaining safe options. The safe path is the first option.
  let guard = 0;
  let sawSofiPerspective = false;
  let sawQuiz = false;
  let sawChats = 0;
  while (guard < 200) {
    guard += 1;
    const state = pump();
    if (state === "ending") break;

    if (state === "interstitial") {
      if (el("[data-perspective-badge]").textContent.includes("Sofi")) {
        sawSofiPerspective = true;
      }
      if (el("[data-interstitial-title]").textContent === "Capítulo 5") {
        assert.equal(el("[data-perspective-badge]").textContent, "Elena · taller");
      }
      handleInterstitial();
      continue;
    }

    if (state === "choice") {
      chooseFirstSafe();
      continue;
    }

    if (state === "chat") {
      sawChats += 1;
      handleChat();
      continue;
    }

    if (state === "quiz") {
      sawQuiz = true;
      handleQuiz();
      continue;
    }

    if (state === "lesson") {
      throw new Error("safe route should never open a lesson");
    }
  }

  assert.ok(sawSofiPerspective, "Sofi perspective should be visible");
  assert.ok(sawQuiz, "final quiz should run");
  assert.ok(sawChats >= 2, "the message scenes should be played and show their text");
  assert.equal(stopState(), "ending");
  assert.equal(el("[data-ending-title]").textContent, "Una red que sostiene");
  assert.equal(app.engine.flags.quizScore, 2);
  assert.equal(app.engine.flags.quizPerfect, true);
  assert.ok(app.engine.flags.banderas_rojas > 0);
  assert.ok(app.engine.flags.apoyo_emocional > 0);
  assert.equal(saveStore.load(), null, "ending should clear the save");

  el("[data-ending-rights]").click();
  assert.equal(shown("[data-rights]"), true);
  assert.match(el("[data-rights-body]").textContent, /116 111/);
  assert.match(el("[data-rights-body]").textContent, /Cámara Gesell/);
  el("[data-rights-close]").click();

  assert.equal(app.engine.rewinds, 1);

  console.log("Dos voces smoke test passed");
  console.log("ending:", el("[data-ending-title]").textContent);
  console.log("flags:", JSON.stringify(app.engine.flags));
} finally {
  app.destroy();
  dom.window.close();
}
