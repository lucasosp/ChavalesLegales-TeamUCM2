import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { JSDOM } from "jsdom";
import { VisualNovelEngine } from "../src/core/VisualNovelEngine.js";
import { MemorySaveStore } from "../src/services/saveStores.js";
import { compileStory } from "../src/content/compileStory.js";
import { applyOverlay } from "../src/i18n.js";

const read = async (name) => JSON.parse(await readFile(new URL(`../public/content/stories/sara/${name}.json`, import.meta.url), "utf8"));
const [storyDoc, scenes, assets, legal, guide] = await Promise.all(["story", "scene", "assets", "legal", "guide"].map(read));
const compiled = compileStory({ storyDoc, scenes, assets });
const story = compiled.nodes;
// "external" hace falta: sara tiene los minijuegos c3-mesa y c4-perros, y sin su handler
// el motor rechaza el story con "unsupported type". Sin él esta suite no arrancaba.
const nodeTypes = Object.fromEntries(["interstitial", "chat", "minigame", "external"].map((type) => [type, { present() {}, next: (node) => node.next }]));
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

// Protection and procedural explanations must survive every choice, in every locale.
// Reachability without a required beat detects a branch that accidentally bypasses it.
const requiredBeats = {
  "c2-05": "immediate notification to social services and police",
  "c3-measures": "judicial safety measures, separate from staying with an aunt",
  "c3-safety-plan": "school collection, reporting contact and emergencies",
  "c3-representation": "a suitable legal representative distinct from the lawyer",
  "c3-defender": "a judicial defender if parental representation is inadequate",
  "c3-party": "participation as private prosecution without deciding punishment",
  "c3-party-warning": "understanding the consequences before joining the prosecution",
  "c3-party-confirmed": "formal participation after explaining options and hearing Sara",
  "c5-investigation": "the purpose of the investigation",
  "c5-family-rule": "attendance versus testimony and the family exemption",
  "c5-family-case": "the reason Sara must testify in this particular case",
  "c5-supports": "avoiding contact and individually assessed supports",
  "c5-company": "chosen accompaniment and a reasoned exception",
  "c5-recording": "recording versus preconstituted evidence",
  "c5-age-rule": "the under-14 threshold without losing protection at 14",
  "c5-recording-case": "what this investigation recording does in Sara's case",
  "c5-communication": "clarification, memory gaps and requesting a pause",
  "c6-investigation-end": "possible closure instead of a trial",
  "c6-trial-notice": "an accusation, a defence and a separate trial court",
  "c6-trial-supports": "advance notice and supports for a further declaration",
  "c6-trial": "the trial before the verdict",
  "c6-after-trial": "what a judgment and acquittal mean",
  "c6-appeal": "appeals and a final judgment",
  "c6-protection-after": "reviewing judicial measures and continuing needs-based support",
};
const targetsOf = (node) => node.type === "choice" ? node.options.map((option) => option.next)
  : node.type === "branch" ? [node.then, node.else] : node.next ? [node.next] : [];
function reaches(doc, target, blocked) {
  const pending = [doc.start], seen = new Set();
  while (pending.length) {
    const id = pending.pop();
    if (id === blocked || seen.has(id)) continue;
    if (id === target) return true;
    seen.add(id);
    assert.ok(doc.nodes[id], `Missing localized node ${id}`);
    pending.push(...targetsOf(doc.nodes[id]));
  }
  return false;
}
const localeDir = new URL("../public/content/stories/sara/i18n/", import.meta.url);
const overlays = await Promise.all((await readdir(localeDir)).filter((file) => file.endsWith(".json")).map(async (file) => [file, JSON.parse(await readFile(new URL(file, localeDir), "utf8"))]));
for (const [locale, overlay] of [["es", null], ...overlays]) {
  const doc = overlay ? applyOverlay(storyDoc, overlay.story) : storyDoc;
  for (const [id, explanation] of Object.entries(requiredBeats)) {
    assert.ok(doc.nodes[id]?.text, `${locale}: missing ${explanation}`);
    assert.equal(reaches(doc, "epilogue", id), false, `${locale}: a route bypasses ${explanation}`);
    if (overlay) assert.ok(overlay.story.nodes[id]?.text, `${locale}: untranslated ${explanation}`);
  }
  // Explicit phase ordering prevents an investigation declaration from becoming a verdict.
  for (const [before, after] of [["c3-party-warning", "c3-party-confirmed"], ["c3-party-confirmed", "c5-family-case"], ["c5-recording-case", "c5-07"], ["c5-07", "c6-trial"], ["c6-trial", "c6-msg"]]) {
    assert.equal(reaches(doc, after, before), false, `${locale}: ${after} precedes ${before}`);
  }
  const localizedGuide = overlay ? applyOverlay(guide, overlay.guide) : guide;
  assert.equal(localizedGuide.steps.length, guide.steps.length, `${locale}: outdated process map`);
  assert.deepEqual(localizedGuide.steps.map((step) => step.chapter), guide.steps.map((step) => step.chapter));
  assert.equal(localizedGuide.people.length, guide.people.length, `${locale}: outdated professional profiles`);
  assert.match(localizedGuide.people[0].role, /^14\b/, `${locale}: Sara must be 14`);
  assert.equal(localizedGuide.people[3].name, "Elena", `${locale}: Elena is the social worker`);
  assert.equal(localizedGuide.people[4].name, "Irene", `${locale}: Irene is the lawyer`);
  const localizedLegal = overlay ? applyOverlay(legal, overlay.legal) : legal;
  for (const node of Object.values(doc.nodes)) {
    for (const key of node.learn ?? []) {
      assert.ok(localizedLegal.notes[key], `${locale}: missing legal note ${key}`);
      for (const source of localizedLegal.notes[key].sources) assert.ok(localizedLegal.sources[source]?.url, `${locale}: missing legal source ${source}`);
    }
  }
}
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

// Exercise the clean UI, saving, pause and restart. Canvas behavior is covered in Chromium.
const dom = new JSDOM('<!doctype html><html lang="es"><body><div id="app"></div></body></html>', { url: "http://localhost/", pretendToBeVisual: true });
for (const key of ["window", "document", "HTMLElement", "Element", "localStorage"]) globalThis[key] = key === "window" ? dom.window : dom.window[key];
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.matchMedia = () => ({ matches: true });
const { SaraExperience, SARA_SAVE_KEY } = await import("../src/app/SaraExperience.js");
const { resolveCharacterAsset, resolveBackgroundAsset } = await import("../src/content/contentLoader.js");
const root = document.querySelector("#app");
const experience = new SaraExperience({ root, content: { story, startId: "start", title: "Sara", resolveCharacter: (c) => resolveCharacterAsset(assets, c), resolveBackground: (s) => resolveBackgroundAsset(scenes, assets, s) }, guide, legal, onExit() {} });
experience.drawingModal.open = ({ onConfirm }) => onConfirm?.();
const click = (selector) => { const node = root.querySelector(selector); assert.ok(node, selector); node.click(); };
try {
  assert.equal(localStorage.getItem(SARA_SAVE_KEY), null);
  assert.equal(root.querySelector('[data-sara-action="map"], [data-sara-action="people"], [data-sara-action="notebook"], .sara-bottom'), null);
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
      await new Promise(resolve => setTimeout(resolve, 220));
      root.querySelectorAll(".choice")[optionIndex].click();
    } else if (node.type === "interstitial") click("[data-interstitial-next]");
    // Los nodos "external" pausan el motor y se reanudan con un setTimeout
    // (en jsdom window.parent === window, así que no hay postMessage). Sin ceder
    // el event loop aquí, la partida se queda pausada para siempre.
    else if (node.type === "external") await new Promise((resolve) => setTimeout(resolve, 0));
    else experience.app.advance();
  }
  assert.equal(experience.engine.isFinished, true);
  for (const id of ["c4-dani", "c5-privacy", "c5-short", "c6-conviction", "c6-dani", "epilogue-volley"]) assert.ok(played.has(id), id);
  assert.equal(localStorage.getItem(SARA_SAVE_KEY), null, "Completion removes the local save");
  experience.openPanel("pause");
  const toggles = [...root.querySelectorAll('button[aria-pressed]')];
  assert.equal(toggles.length, 2);
  toggles[0].click(); assert.ok(root.classList.contains('sara-large-text'));
  toggles[1].click(); assert.equal(experience.app.view.typewriter.instant, true);
  experience.openPanel("help");
  assert.ok(root.querySelector('[href="tel:112"]'));
  experience.closePanel();
  assert.equal(experience.engine.back(), false, "The final drawing checkpoint clears rewind history");
  experience.openPanel("restart");
  root.querySelector(".sara-primary").click();
  assert.equal(experience.mode, "start");
  click("[data-sara-start]");
  assert.equal(experience.engine.nodeId, "start");
  assert.deepEqual(experience.engine.flags, { resolution: "conviction" });
  assert.equal(experience.engine.history.length, 0);
} finally { experience.destroy(); dom.window.close(); }
console.log(`Sara passed: ${reached.size} reachable nodes, ${choices.size} valid choices, ${seenStates.size} distinct future-relevant states; pause, back, save, restart and deferred consequences.`);
