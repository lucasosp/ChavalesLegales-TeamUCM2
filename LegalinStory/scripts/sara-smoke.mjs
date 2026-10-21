import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import { VisualNovelEngine } from "../src/core/VisualNovelEngine.js";
import { MemorySaveStore } from "../src/services/saveStores.js";
import { compileStory } from "../src/content/compileStory.js";

const read = async (name) => JSON.parse(await readFile(new URL(`../public/content/stories/sara/${name}.json`, import.meta.url), "utf8"));
const [storyDoc, scenes, assets, legal, guide] = await Promise.all(["story", "scene", "assets", "legal", "guide"].map(read));
const compiled = compileStory({ storyDoc, scenes, assets });
const story = compiled.nodes;
const nodeTypes = Object.fromEntries(["interstitial", "chat", "minigame"].map((type) => [type, { present() {}, next: (node) => node.next }]));
const makeEngine = (saveStore = null, resolution = "conviction") => new VisualNovelEngine({ story, startId: compiled.startId, nodeTypes, saveStore, initialFlags: { resolution } });

// An acyclic graph with an ending and no dead ends guarantees finite paths.
const walking = new Set(), finished = new Set();
function visit(id) {
  if (finished.has(id)) return;
  assert.ok(!walking.has(id), `Unexpected cycle at ${id}`);
  walking.add(id);
  const node = story[id];
  assert.ok(node, `Missing ${id}`);
  assert.ok(node.chapter >= 1 && node.chapter <= 6);
  for (const note of node.learn ?? []) assert.ok(legal.notes[note], `Missing legal note ${note}`);
  const targets = node.type === "choice" ? node.options.map((o) => o.next) : node.type === "branch" ? [node.then, node.else] : node.next ? [node.next] : [];
  assert.ok(node.type === "ending" || targets.length, `${id} is a dead end`);
  for (const target of targets) visit(target);
  walking.delete(id); finished.add(id);
}
visit(compiled.startId);
assert.equal(finished.size, Object.keys(story).length, "Every authored node must be reachable");
const futureFlags = ["resolution", "concernDani", "concernPrivacy", "concernHome", "shortExplanations", "everyday"];
const seenStates = new Set(), reached = new Set(), choices = new Set();
const queue = ["conviction", "no-conviction"].map((resolution) => ({ nodeId: "start", flags: { resolution }, seen: [], stage: { background: null, character: null } }));
let cursor = 0;
while (cursor < queue.length) {
  const state = queue[cursor++];
  const store = new MemorySaveStore(); store.save(state);
  const engine = makeEngine(store); engine.start();
  const key = `${engine.nodeId}|${JSON.stringify(futureFlags.map((f) => engine.flags[f] ?? null))}`;
  if (seenStates.has(key)) continue;
  seenStates.add(key);
  for (const id of engine.seen) reached.add(id);
  const node = engine.currentNode;
  if (engine.isFinished) continue;
  const snapshot = { nodeId: engine.nodeId, flags: engine.flags, stage: engine.stage, seen: [] };
  const options = node.type === "choice" ? node.options : [null];
  for (const option of options) {
    store.save(snapshot);
    const fork = makeEngine(store); fork.start();
    if (option) {
      assert.ok(!("resolution" in option.flags), "Player choices cannot set the verdict");
      choices.add(`${engine.nodeId}:${option.id}`);
      assert.equal(fork.choose(option.id), true);
    } else assert.equal(fork.advance(), true);
    for (const id of fork.seen) reached.add(id);
    if (!fork.isFinished) queue.push({ nodeId: fork.nodeId, flags: fork.flags, stage: fork.stage, seen: [] });
  }
}
assert.equal(reached.size, Object.keys(story).length, "Conditions must allow every scene to run");
assert.equal(choices.size, Object.values(story).filter((n) => n.type === "choice").reduce((n, c) => n + c.options.length, 0));
assert.ok(reached.has("c4-dani") && reached.has("c5-privacy") && reached.has("c6-home"));

// Back, branching again, persistence and restart restore the whole narrative state.
const store = new MemorySaveStore();
let engine = makeEngine(store, "no-conviction"); engine.start({ resume: false });
while (engine.currentNode.type !== "choice") engine.advance();
const before = { flags: { ...engine.flags }, stage: structuredClone(engine.stage), seen: [...engine.seen] };
engine.choose("partial");
assert.equal(engine.flags.opening, "partial");
engine = makeEngine(store); engine.start();
assert.equal(engine.back(), true);
assert.deepEqual(engine.flags, before.flags);
assert.deepEqual(engine.stage, before.stage);
assert.deepEqual([...engine.seen], before.seen);
engine.choose("time");
assert.equal(engine.flags.opening, "time");
assert.equal(engine.flags.resolution, "no-conviction");
engine.restart();
assert.deepEqual(engine.flags, { resolution: "conviction" });
assert.equal(engine.history.length, 0);
assert.equal(engine.back(), false);

// Exercise the actual UI container, opt-in saving, pause and both epilogues.
const dom = new JSDOM('<!doctype html><html lang="es"><body><div id="app"></div></body></html>', { url: "http://localhost/", pretendToBeVisual: true });
for (const key of ["window", "document", "HTMLElement", "Element", "localStorage"]) globalThis[key] = key === "window" ? dom.window : dom.window[key];
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.matchMedia = () => ({ matches: true });
const { SaraExperience, SARA_SAVE_KEY } = await import("../src/app/SaraExperience.js");
const { resolveCharacterAsset, resolveBackgroundAsset } = await import("../src/content/contentLoader.js");
const root = document.querySelector("#app");
const experience = new SaraExperience({ root, content: { story, startId: "start", title: "Sara", resolveCharacter: (c) => resolveCharacterAsset(assets, c), resolveBackground: (s) => resolveBackgroundAsset(scenes, assets, s) }, guide, legal, onExit() {} });
const click = (selector) => { const node = root.querySelector(selector); assert.ok(node, selector); node.click(); };
try {
  assert.equal(localStorage.getItem(SARA_SAVE_KEY), null);
  click('[data-sara-action="help"]');
  assert.ok(root.querySelector('[href="tel:112"]'));
  experience.closePanel();
  assert.equal(experience.mode, "start");
  root.querySelector("[data-sara-save]").checked = true;
  root.querySelector("[data-sara-resolution]").value = "no-conviction";
  click("[data-sara-start]");
  assert.ok(localStorage.getItem(SARA_SAVE_KEY));
  const pausedAt = experience.engine.nodeId;
  experience.openPanel("pause");
  experience.app.advance();
  document.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  assert.equal(experience.engine.nodeId, pausedAt);
  experience.closePanel();
  const route = { "c3-choice": "dani", "c2-choice": "privacy", "c2-choice2": "short", "c4-choice": "volleyball", "c5-choice2": "pause" };
  const played = new Set();
  for (let guard = 0; guard < 200 && !experience.engine.isFinished; guard++) {
    const node = experience.engine.currentNode; played.add(experience.engine.nodeId);
    if (node.type === "choice") {
      const selected = node.options.find((o) => o.id === route[experience.engine.nodeId]) ?? node.options[0];
      const optionIndex = node.options.indexOf(selected);
      root.querySelectorAll(".choice")[optionIndex].click();
    } else if (node.type === "interstitial") click("[data-interstitial-next]");
    else experience.app.advance();
  }
  assert.equal(experience.engine.isFinished, true);
  for (const id of ["c4-dani", "c5-privacy", "c5-short", "c6-no-conviction", "c6-dani", "epilogue-volley"]) assert.ok(played.has(id), id);
  assert.equal(localStorage.getItem(SARA_SAVE_KEY), null, "Completion removes the local save");
  experience.openPanel("map");
  assert.equal(root.querySelectorAll(".sara-map-step").length, 8);
  experience.closePanel();
  experience.openPanel("people");
  assert.equal(root.querySelectorAll(".sara-person").length, guide.people.length);
  experience.closePanel();
  experience.openPanel("notebook");
  assert.ok(root.querySelectorAll(".sara-note").length >= 5);
  assert.ok(root.querySelectorAll('.sara-sources a[href^="https://www.boe.es/"]').length >= 5);
  experience.closePanel();
  assert.equal(experience.engine.back(), true, "Back from the epilogue restores the story");
  experience.openPanel("restart");
  root.querySelector(".sara-primary").click();
  assert.equal(experience.mode, "start");
  click("[data-sara-start]");
  assert.equal(experience.engine.nodeId, "start");
  assert.deepEqual(experience.engine.flags, { resolution: "conviction" });
  assert.equal(experience.engine.history.length, 0);
} finally { experience.destroy(); dom.window.close(); }
console.log(`Sara passed: ${reached.size} reachable nodes, ${choices.size} valid choices, ${seenStates.size} distinct future-relevant states; pause, back, save, restart and deferred consequences.`);
