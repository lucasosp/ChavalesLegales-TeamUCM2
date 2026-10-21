/** Verify the published experience using the browser's HTTP content pipeline. */
import { createServer } from "vite";
import { JSDOM } from "jsdom";
import assert from "node:assert/strict";

const server = await createServer({ logLevel: "silent", server: { host: "127.0.0.1", port: 0 } });
try {
  await server.listen();
  const url = server.resolvedUrls.local[0];
  const dom = new JSDOM('<div id="app"></div>', { url, pretendToBeVisual: true });
  for (const key of ["window", "document", "HTMLElement", "Element", "localStorage"]) {
    globalThis[key] = key === "window" ? dom.window : dom.window[key];
  }
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
  globalThis.matchMedia = () => ({ matches: true });
  const { loadStoryIndex, loadStory } = await import("../src/content/contentLoader.js");
  const { App } = await import("../src/app/App.js");
  const index = await loadStoryIndex();
  assert.equal(index.stories[0]?.id, "sara", "Sara is the primary experience");
  assert.ok(index.stories.length >= 2, "the registry must contain the primary experience");
  const content = await loadStory(index.stories.find((story) => story.id === "dos-voces"));
  assert.ok(content.rights);
  const root = document.querySelector("#app");
  const app = new App({ root, ...content });
  try {
    app.start();
    assert.equal(root.querySelector("[data-welcome]").hidden, false, "new game should show intro");
    root.querySelector("[data-welcome-start]").click();
    assert.equal(root.querySelector("[data-interstitial-title]").textContent, "Dos voces");
    root.querySelector("[data-interstitial-next]").click();
    assert.equal(app.engine.nodeId, "modo");
    assert.ok(root.querySelector(".scene-bg.is-active").style.backgroundImage.includes("home-living-cold.svg"));
    assert.ok(root.querySelector("[data-text]").textContent.length > 0);
  } finally { app.destroy(); dom.window.close(); }
  console.log("Published experience HTTP smoke test passed");
} finally { await server.close(); }
