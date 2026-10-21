/**
 * End-to-end smoke test for "No lo reenvíes".
 *
 * Exercises the new content node types: chapter cards, messaging scenes, the
 * perspective switch, the educational information cards,
 * the interview, the ending router, and the rights panel.
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
const { VisualNovelEngine } = await import("../src/core/VisualNovelEngine.js");
const { EventBus } = await import("../src/core/EventBus.js");

const contentRoot = new URL("../public/content/", import.meta.url);
const readContent = async (file) =>
  JSON.parse(await readFile(new URL(file, contentRoot), "utf8"));

const [storyDoc, sceneDoc, assets, rights] = await Promise.all([
  readContent("stories/no-lo-reenvies/story.json"),
  readContent("stories/no-lo-reenvies/scene.json"),
  readContent("shared/assets.json"),
  readContent("stories/no-lo-reenvies/rights.json"),
]);

const { nodes: story, startId } = compileStory({
  storyDoc,
  scenes: sceneDoc,
  assets,
  defaultScene: "hallway-day",
});

const root = document.querySelector("#app");
const saveStore = new MemorySaveStore();
const app = new App({
  root,
  story,
  startId,
  title: "No lo reenvíes",
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
  const title = el("[data-interstitial-title]").textContent;
  if (expectedTitle) assert.equal(title, expectedTitle);
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

try {
  app.start();
  el("[data-welcome-start]").click();

  assert.equal(pump(), "interstitial");
  handleInterstitial("No lo reenvíes");

  assert.equal(pump(), "choice");
  assert.match(el("[data-sprite]").src, /sara_normal\.png/);
  choose("Intervenir");

  assert.equal(pump(), "interstitial");
  handleInterstitial("Capítulo 1");

  assert.equal(pump({ stopAtChat: true }), "chat");
  assert.equal(el("[data-chat-title]").textContent, "4.º ESO | Los de siempre");
  app.view.skipTyping();
  assert.match(el("[data-chat-log]").textContent, /alguien ha visto lo de Sara/);
  assert.equal(el(".censored-preview").getAttribute("role"), "img");
  assert.match(el(".censored-preview-art").src, /censored-preview\.svg/);
  assert.equal(el(".censored-preview-art").alt, "");
  assert.equal(el(".is-hidden-content").parentElement.classList.contains("is-in"), true);
  app.advance();

  assert.equal(pump(), "choice");
  choose("Pedir a Julia");

  assert.equal(pump(), "interstitial");
  handleInterstitial("Capítulo 2");

  assert.equal(pump({ stopAtChat: true }), "chat");
  assert.equal(el("[data-character]").dataset.character, "julia");
  app.view.skipTyping();
  assert.equal(el(".censored-preview").getAttribute("aria-label"), "Imagen censurada; el contenido no se muestra");
  app.advance();

  assert.equal(pump(), "choice");
  choose("Negarse a reenviarlo");

  assert.equal(pump(), "interstitial");
  handleInterstitial("Capítulo 3");

  assert.equal(pump(), "choice");
  choose("Ir con Sergio");

  assert.equal(pump(), "interstitial");
  handleInterstitial("Capítulo 4");

  assert.equal(pump(), "interstitial");
  handleInterstitial("Hablar con apoyo");

  assert.equal(pump(), "interstitial");
  handleInterstitial("Capítulo 5");

  assert.equal(pump(), "interstitial");
  handleInterstitial("Qué información conviene guardar");

  assert.equal(pump(), "interstitial");
  handleInterstitial("Capítulo 6");

  assert.equal(pump(), "choice");
  choose("No recuerdo la hora exacta");

  assert.equal(pump(), "ending");
  assert.equal(el("[data-ending-title]").textContent, "Ya no estamos solos");
  assert.equal(el("[data-ending-rights]").hidden, false, "rights button should be visible");

  el("[data-ending-rights]").click();
  assert.equal(shown("[data-rights]"), true, "rights panel should be visible");
  assert.equal(el("[data-rights-title]").textContent, "Conoce tus derechos");
  assert.match(el("[data-rights-body]").textContent, /INCIBE 017/);
  assert.match(el("[data-rights-body]").textContent, /Conocer tus derechos es el primer paso/);

  el("[data-rights-close]").click();
  assert.equal(shown("[data-rights]"), false, "rights panel should close");

  assert.equal(app.engine.flags.juliaHelped, true);
  assert.equal(app.engine.flags.helpRoute, true);
  assert.equal(saveStore.load(), null, "ending should clear the save");

  function routeEnding(flags, startNode = "ending-router-forward") {
    const bus = new EventBus();
    let title = null;
    bus.on("ending", (payload) => {
      title = payload.title;
    });

    const store = new MemorySaveStore();
    store.save({
      nodeId: startNode,
      flags,
      stage: { background: "quiet-room", character: null },
      seen: [],
    });

    const nodeTypes = {
      chat: { present: () => {}, next: (node) => node.next },
      interstitial: { present: () => {}, next: (node) => node.next },
      minigame: { present: () => {}, next: (node) => node.next },
    };

    const engine = new VisualNovelEngine({
      story,
      startId: startNode,
      bus,
      saveStore: store,
      nodeTypes,
    });

    engine.start();
    for (let i = 0; i < 120 && !engine.isFinished; i += 1) engine.advance();
    assert.equal(engine.isFinished, true, `ending did not finish for ${JSON.stringify(flags)}`);
    return title;
  }

  assert.equal(routeEnding({ juliaForwarded: true }), "Un reenvío más");
  assert.equal(
    routeEnding({ juliaHelped: true, helpRoute: true }),
    "Ya no estamos solos",
  );
  assert.equal(
    routeEnding({ juliaDisengaged: true, helpRoute: true }),
    "Ya no estamos solos",
  );
  assert.equal(routeEnding({ delayedHelp: true }), "Aún estamos a tiempo");
  assert.equal(routeEnding({}), "El mensaje sin enviar");
  assert.equal(
    routeEnding({ juliaForwarded: true }, "late-not-send-router"),
    "Un reenvío más",
  );
  assert.equal(routeEnding({}, "late-not-send-router"), "El mensaje sin enviar");

  console.log("No lo reenvíes smoke test passed");
  console.log("ending:", el("[data-ending-title]").textContent);
  console.log("flags:", JSON.stringify(app.engine.flags));
} finally {
  app.destroy();
}
