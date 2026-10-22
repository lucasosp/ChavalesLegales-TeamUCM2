import { JSDOM } from "jsdom";
import { readFile } from "node:fs/promises";

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
const { MemorySaveStore } = await import("../src/services/saveStores.js");

const contentRoot = new URL("../public/content/", import.meta.url);
const readContent = async (file) =>
  JSON.parse(await readFile(new URL(file, contentRoot), "utf8"));

const [storyDoc, scenes, assets] = await Promise.all([
  readContent("stories/between-the-lines/story.json"),
  readContent("stories/between-the-lines/scene.json"),
  readContent("shared/assets.json"),
]);

const { nodes: story, startId } = compileStory({
  storyDoc,
  scenes,
  assets,
  defaultScene: "classroom-dusk",
});

const root = document.querySelector("#app");
const saveStore = new MemorySaveStore();
const app = new App({ root, story, startId, saveStore, title: "Between the Lines" });
const fail = (message) => {
  throw new Error(message);
};
app.start();
if (root.querySelector("[data-welcome]").hidden) fail("new story should show the introduction");
root.querySelector("[data-welcome-start]").click();

const text = root.querySelector("[data-text]");
const speaker = root.querySelector("[data-speaker-name]");
const choices = root.querySelector("[data-choices]");
const ending = root.querySelector("[data-ending]");
const endingTitle = root.querySelector("[data-ending-title]");
const panel = root.querySelector("[data-panel]");
const character = root.querySelector("[data-character]");
const background = root.querySelector(".scene-bg.is-active");

if (text.textContent.length === 0 && !app.view.isTyping()) fail("typewriter did not start");
app.view.skipTyping();
if (text.textContent !== story[startId].text) fail(`start text mismatch: ${text.textContent}`);
if (character.className !== "character is-visible expression-neutral") {
  fail(`character not rendered: ${character.className}`);
}
if (!background?.className.includes("bg-classroom-dusk")) fail("background not applied");
if (speaker.hidden || speaker.textContent !== "Narración") fail("narration should identify its voice");

let sawChoice = false;
let guard = 0;

while (!ending.classList.contains("is-visible") && guard < 300) {
  guard += 1;

  if (app.view.isTyping()) {
    app.view.skipTyping();
    continue;
  }

  if (!choices.hidden) {
    sawChoice = true;
    if (choices.querySelectorAll(".choice").length !== 2) fail("expected two choices");
    choices.querySelector(".choice").click();
    continue;
  }

  app.advance();
}

if (!sawChoice) fail("choice was never rendered");
if (!ending.classList.contains("is-visible")) fail("ending was never shown");
if (endingTitle.textContent !== "The First Page") fail(`unexpected ending: ${endingTitle.textContent}`);
if (saveStore.load() !== null) fail("save should be cleared after the ending");

if (root.querySelector("[data-restart], [data-ending-restart]")) fail("restart controls should not be present");
app.restart();
if (ending.classList.contains("is-visible")) fail("ending stayed visible after internal restart");
if (app.engine.nodeId !== "start") fail(`internal restart went to ${app.engine.nodeId}`);
app.view.skipTyping();
if (text.textContent !== story[startId].text) fail("restart did not render the first line");

// Choice prompt typing can be skipped by the same click path the UI uses.
app.advance();
app.view.skipTyping();
for (let i = 0; i < 12; i += 1) {
  if (app.view.isTyping()) app.view.skipTyping();
  if (!choices.hidden) break;
  app.advance();
}
if (choices.hidden) fail("choice prompt could not be skipped into options");
if (!choices.classList.contains("is-ready")) {
  await new Promise((resolve) => setTimeout(resolve, 240));
}
if (!choices.classList.contains("is-ready")) fail("choices never became clickable");

// Selecting an option should persist the next node and resume there in a
// freshly mounted app (same SaveStore, new DOM root).
choices.querySelector(".choice").click();
const saved = saveStore.load();
if (!saved) fail("choosing an option did not persist progress");

const secondRoot = document.createElement("div");
document.body.append(secondRoot);
const resumed = new App({
  root: secondRoot,
  story,
  startId,
  saveStore,
});
resumed.start();
if (resumed.engine.nodeId !== saved.nodeId) {
  fail(`resume went to ${resumed.engine.nodeId}, expected ${saved.nodeId}`);
}
if (!secondRoot.querySelector("[data-welcome]").hidden) fail("resumed story should skip the introduction");
if (resumed.engine.flags.acceptedInvitation !== true) {
  fail("resume lost choice flags");
}
resumed.view.skipTyping();
if (secondRoot.querySelector("[data-text]").textContent !== story[saved.nodeId].text) {
  fail("resumed view did not render the saved line");
}

// Voz interna y voz alta no se pintan igual: el pensamiento pierde las comillas,
// lleva placa propia y una caja tintada; lo hablado conserva sus comillas.
resumed.view.showDialogue({ speaker: "Sara", text: "«Esto lo pienso yo.»", tone: "thought" });
resumed.view.skipTyping();
const thoughtPanel = secondRoot.querySelector("[data-panel]");
const thoughtText = secondRoot.querySelector("[data-text]").textContent;
const thoughtPlate = secondRoot.querySelector("[data-speaker-name]");
if (!thoughtPanel.classList.contains("is-thought")) fail("thought line lost its is-thought class");
if (thoughtText !== "Esto lo pienso yo.") fail(`thought kept its quotation marks: ${thoughtText}`);
if (thoughtPlate.dataset.speaker !== "pensamiento") fail(`unexpected thought plate: ${thoughtPlate.dataset.speaker}`);

resumed.view.showDialogue({ speaker: "Sara", text: "«Esto lo digo en voz alta.»", tone: "spoken" });
resumed.view.skipTyping();
if (secondRoot.querySelector("[data-panel]").classList.contains("is-thought")) {
  fail("spoken line flagged as thought");
}
if (secondRoot.querySelector("[data-text]").textContent !== "«Esto lo digo en voz alta.»") {
  fail("spoken line lost its quotation marks");
}

console.log("UI smoke test passed");
console.log("final node:", app.engine.nodeId);
console.log("resumed at:", saved.nodeId);
console.log("dialogue nodes visited:", Object.keys(story).length);
