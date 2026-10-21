import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import { VisualNovelEngine } from "../src/core/VisualNovelEngine.js";
import { EventBus } from "../src/core/EventBus.js";
import { MemorySaveStore } from "../src/services/saveStores.js";
import { compileStory } from "../src/content/compileStory.js";

const read = async (path) => JSON.parse(await readFile(new URL(`../public/content/${path}`, import.meta.url), "utf8"));
const [storyDoc, scenes, assets] = await Promise.all([
  read("stories/no-lo-reenvies/story.json"), read("stories/no-lo-reenvies/scene.json"), read("shared/assets.json"),
]);
const { nodes: story, startId } = compileStory({ storyDoc, scenes, assets });
const nodeTypes = Object.fromEntries(["chat", "interstitial", "minigame"].map((type) => [type, { present() {}, next: (node) => node.next }]));

// Enumerate real decisions from the start, evaluating branches with real flags.
const pending = [[]];
const endings = new Set();
const visited = new Set();
let completed = 0;
while (pending.length) {
  const path = pending.pop();
  const bus = new EventBus();
  let options = [];
  bus.on("choice", (payload) => { options = payload.options; });
  const engine = new VisualNovelEngine({ story, startId, bus, nodeTypes });
  engine.start({ resume: false });
  let step = 0;
  let choices = 0;
  while (!engine.isFinished) {
    assert.ok(step++ < 250, `route stalled: ${path}`);
    for (const id of engine.seen) visited.add(id);
    const node = engine.currentNode;
    if (node.type === "choice") {
      if (choices === path.length) {
        for (const option of options) pending.push([...path, option.id]);
        break;
      }
      assert.equal(engine.choose(path[choices++]), true);
    } else if (node.type === "minigame") {
      const selected = node.mode === "support" ? node.cards.map((card) => card.id) : node.cards.filter((card) => card.correct).map((card) => card.id);
      assert.equal(engine.completeActivity(selected), true);
    } else assert.equal(engine.advance(), true);
  }
  if (engine.isFinished) {
    endings.add(engine.nodeId);
    for (const id of engine.seen) visited.add(id);
    completed++;
  }
}
assert.deepEqual([...endings].sort(), ["final1", "final2", "final3", "final4"]);
assert.deepEqual(Object.keys(story).filter((id) => !visited.has(id)), [], "all nodes must be reachable with valid flag combinations");
console.log(`All ${completed} complete decision routes passed; ${visited.size} nodes, four endings`);

const dom = new JSDOM('<div id="app"></div>', { url: "http://localhost/", pretendToBeVisual: true });
for (const key of ["window", "document", "Element", "HTMLElement"]) globalThis[key] = key === "window" ? dom.window : dom.window[key];
globalThis.matchMedia = () => ({ matches: false });
const frames = new Map();
let frameId = 0;
globalThis.requestAnimationFrame = (callback) => { frames.set(++frameId, callback); return frameId; };
globalThis.cancelAnimationFrame = (id) => frames.delete(id);
const { App } = await import("../src/app/App.js");
const store = new MemorySaveStore();
const root = document.querySelector("#app");
const app = new App({ root, story, startId, saveStore: store });
try {
  app.start();
  root.querySelector("[data-welcome-start]").click();
  root.querySelector("[data-interstitial-next]").click();
  assert.equal(frames.size, 1);
  app.view.showChat({ self: "Sara", messages: [{ from: "Julia", text: "uno" }, { from: "Julia", text: "dos" }] });
  assert.equal(frames.size, 0, "switching to chat cancels the old typewriter");
  assert.equal(root.querySelectorAll(".chat-row").length, 1, "chat must reveal progressively");
  app.restart();
  assert.equal(app.engine.nodeId, "start");
  assert.deepEqual(app.engine.flags, {});
  assert.equal(root.querySelector("[data-chat]").hidden, true);
  assert.equal(frames.size, 0);

  // Old saves on the former activity recover into the new explanatory card.
  store.save({ nodeId: "needs-menu", flags: { needCompanion: true }, seen: [], stage: { background: "orientation-office", character: null } });
  app.engine.start();
  assert.equal(root.querySelector("[data-interstitial]").hidden, false);
  root.querySelector("[data-interstitial-next]").click();
  assert.equal(store.load().nodeId, "needs-response");
  app.restart();
  assert.deepEqual(app.engine.flags, {});
  assert.equal(root.querySelector("[data-minigame]").hidden, true);
  assert.equal(frames.size, 0);
} finally { app.destroy(); dom.window.close(); }
assert.equal(frames.size, 0, "destroy must cancel all animation frames");
console.log("Animation cleanup, restart and saved-menu migration regressions passed");
