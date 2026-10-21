/**
 * Regression check for the post-chat input buffer.
 *
 * When a chat finishes on its own, a keyboard advance (space/Enter) is ignored
 * for 500 ms so a held key cannot skip the next dialogue by accident. When the
 * player skips the chat explicitly, the buffer is not applied and the next
 * press advances immediately.
 */
import { JSDOM } from "jsdom";
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
globalThis.matchMedia = () => ({
  matches: false,
  addEventListener() {},
  removeEventListener() {},
});
window.matchMedia = globalThis.matchMedia;
globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window);
globalThis.cancelAnimationFrame = window.cancelAnimationFrame.bind(window);

const { App } = await import("../src/app/App.js");

const story = {
  start: { type: "dialogue", text: "Antes", next: "chat" },
  chat: {
    type: "chat",
    chatTitle: "Test",
    self: "A",
    messages: [{ from: "A", text: "hola" }],
    next: "after",
  },
  chat2: {
    type: "chat",
    chatTitle: "Test",
    self: "A",
    messages: [
      { from: "A", text: "uno" },
      { from: "A", text: "dos" },
    ],
    next: "after2",
  },
  after: { type: "dialogue", text: "Después", next: "end" },
  after2: { type: "dialogue", text: "Después 2", next: "end" },
  end: { type: "ending", title: "Fin" },
};

const root = document.querySelector("#app");
const app = new App({ root, story, startId: "start" });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pressSpace = () => {
  document.dispatchEvent(
    new window.KeyboardEvent("keydown", {
      key: " ",
      bubbles: true,
      cancelable: true,
    }),
  );
};

try {
  app.start();
  root.querySelector("[data-welcome-start]").click();
  app.view.skipTyping();
  app.advance(); // start -> single-message chat, which ends immediately
  assert.equal(app.engine.nodeId, "chat", "the chat should be current");

  pressSpace();
  assert.equal(
    app.engine.nodeId,
    "chat",
    "space must not advance during the natural-end buffer",
  );

  await sleep(550);
  pressSpace();
  assert.equal(
    app.engine.nodeId,
    "after",
    "space must advance again once the buffer expires",
  );

  // Explicitly skipping a multi-message chat must not add the buffer.
  app.view.showChat({
    self: "A",
    messages: [
      { from: "A", text: "uno" },
      { from: "A", text: "dos" },
    ],
  });
  app.engine.nodeId = "chat2";

  pressSpace();
  assert.equal(app.engine.nodeId, "chat2", "the first space should skip the chat");

  pressSpace();
  assert.equal(
    app.engine.nodeId,
    "after2",
    "after an explicit skip the next space should advance immediately",
  );

  console.log("Post-chat input buffer smoke test passed");
} finally {
  app.destroy();
  dom.window.close();
}
