/**
 * End-to-end smoke test for "No soy yo".
 *
 * Exercises the cyberbullying story: chat discovery, evidence handling,
 * platform reporting, the bystander perspective, the proof guidance, the
 * ending router, and the rights panel.
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
  readContent("stories/no-soy-yo/story.json"),
  readContent("stories/no-soy-yo/scene.json"),
  readContent("shared/assets.json"),
  readContent("stories/no-soy-yo/rights.json"),
]);

const { nodes: story, startId } = compileStory({
  storyDoc,
  scenes: sceneDoc,
  assets,
  defaultScene: "bedroom-evening",
});

const root = document.querySelector("#app");
const saveStore = new MemorySaveStore();
const app = new App({
  root,
  story,
  startId,
  title: "No soy yo",
  saveStore,
  rights,
  resolveCharacter: (character) => resolveCharacterAsset(assets, character),
  resolveBackground: (sceneId) => resolveBackgroundAsset(sceneDoc, assets, sceneId),
});

const el = (selector) => root.querySelector(selector);
const shown = (selector) => {
  const element = el(selector);
  return Boolean(element && !element.hidden);
};

function pump({ stopAtChat = false, limit = 600 } = {}) {
  for (let i = 0; i < limit; i += 1) {
    if (el("[data-ending]").classList.contains("is-visible")) return "ending";
    if (shown("[data-interstitial]")) return "interstitial";
    if (shown("[data-minigame]")) return "minigame";

    if (shown("[data-chat]")) {
      if (stopAtChat) return "chat";
      if (app.view.isTyping()) {
        app.view.skipTyping();
        continue;
      }
      app.advance();
      continue;
    }

    if (shown("[data-choices]")) return "choice";

    if (app.view.isTyping()) {
      app.view.skipTyping();
      continue;
    }

    app.advance();
  }

  throw new Error("pump limit reached");
}

function handleInterstitial(expectedTitle) {
  assert.equal(shown("[data-interstitial]"), true, "interstitial should be visible");
  assert.equal(el("[data-interstitial-title]").textContent, expectedTitle);
  el("[data-interstitial-next]").click();
}

function choose(labelPart) {
  assert.equal(shown("[data-choices]"), true, "choices should be visible");
  const buttons = [...el("[data-choices]").querySelectorAll(".choice")];
  const button = buttons.find((candidate) => candidate.textContent.includes(labelPart));
  assert.ok(
    button,
    `choice "${labelPart}" not found. Available: ${buttons
      .map((candidate) => candidate.textContent.trim())
      .join(" | ")}`,
  );
  button.click();
}

function finishChat(expectedTitle) {
  assert.equal(shown("[data-chat]"), true, "chat should be visible");
  assert.equal(el("[data-chat-title]").textContent, expectedTitle);
  app.view.skipTyping();
  app.advance();
}

try {
  app.start();
  el("[data-welcome-start]").click();

  assert.equal(pump(), "interstitial");
  handleInterstitial("No soy yo");

  assert.equal(pump({ stopAtChat: true }), "chat");
  assert.equal(el("[data-chat-title]").textContent, "4.º ESO | Los de siempre");
  assert.equal(el("[data-chat-self]").textContent, "Desde el móvil de Sergio");
  app.view.skipTyping();
  assert.match(el("[data-chat-log]").textContent, /una que se ha hecho con tu nombre/);
  assert.ok([...root.querySelectorAll(".chat-row.is-out .chat-author")].some((author) => author.textContent === "Sergio"));
  assert.equal(el(".censored-preview").getAttribute("role"), "img");
  assert.match(el(".censored-preview-art").src, /censored-preview\.svg/);
  app.advance();

  assert.equal(pump({ stopAtChat: true }), "chat");
  finishChat("Julia");

  assert.equal(pump(), "choice");
  assert.match(el("[data-sprite]").src, /characters\/sergio\/sad\.svg/);
  choose("Guardar capturas");

  assert.equal(pump(), "interstitial");
  handleInterstitial("Capítulo 1");

  assert.equal(pump(), "choice");
  choose("Reportar la cuenta");

  assert.equal(pump(), "interstitial");
  handleInterstitial("Capítulo 2");

  assert.equal(pump({ stopAtChat: true }), "chat");
  assert.equal(el("[data-character]").dataset.character, "hugo");
  finishChat("Dani");

  assert.equal(pump(), "choice");
  choose("No reenviarlo y escribir");

  assert.equal(pump({ stopAtChat: true }), "chat");
  finishChat("Sergio");

  assert.equal(pump(), "interstitial");
  handleInterstitial("Capítulo 3");

  assert.equal(pump(), "choice");
  choose("Ir con Julia");

  assert.equal(pump(), "interstitial");
  handleInterstitial("Qué hago con las pruebas");

  assert.equal(pump(), "interstitial");
  handleInterstitial("Capítulo 4");

  assert.equal(pump(), "ending");
  assert.equal(el("[data-ending-title]").textContent, "No estás solo");
  assert.equal(el("[data-ending-rights]").hidden, false, "rights button should be visible");

  el("[data-ending-rights]").click();
  assert.equal(shown("[data-rights]"), true, "rights panel should be visible");
  assert.equal(el("[data-rights-title]").textContent, "Conoce tus derechos");
  assert.match(el("[data-rights-body]").textContent, /INCIBE 017/);
  assert.match(el("[data-rights-body]").textContent, /Pedir ayuda no es exagerar/);

  el("[data-rights-close]").click();
  assert.equal(shown("[data-rights]"), false, "rights panel should close");

  assert.equal(app.engine.flags.savedEvidence, true);
  assert.equal(app.engine.flags.reportedPlatform, true);
  assert.equal(app.engine.flags.hugoSupport, true);
  assert.equal(saveStore.load(), null, "ending should clear the save");

  app.restart();
  handleInterstitial("No soy yo");
  assert.equal(pump({ stopAtChat: true }), "chat");
  finishChat("4.º ESO | Los de siempre");
  assert.equal(pump({ stopAtChat: true }), "chat");
  finishChat("Julia");
  assert.equal(pump(), "choice");
  choose("Guardar capturas");
  assert.equal(pump(), "interstitial");
  handleInterstitial("Capítulo 1");
  assert.equal(pump(), "choice");
  choose("Investigar por su cuenta");
  assert.equal(pump(), "interstitial");
  handleInterstitial("Capítulo 2");
  assert.equal(pump({ stopAtChat: true }), "chat");
  finishChat("Dani");
  assert.equal(pump(), "choice");
  choose("No reenviarlo y escribir");
  assert.equal(pump({ stopAtChat: true }), "chat");
  finishChat("Sergio");
  assert.equal(pump(), "interstitial");
  handleInterstitial("Capítulo 3");
  assert.equal(pump(), "choice");
  choose("Todavía no se siente");
  assert.equal(pump(), "interstitial");
  handleInterstitial("Capítulo 4");
  assert.equal(pump(), "ending");
  assert.equal(el("[data-ending-title]").textContent, "El primer paso");
  assert.equal(app.engine.seen.has("ch3-1"), false, "Sergio should not visit Marina in this route");

  console.log("No soy yo smoke test passed");
  console.log("ending:", el("[data-ending-title]").textContent);
  console.log("flags:", JSON.stringify(app.engine.flags));
} finally {
  app.destroy();
}
