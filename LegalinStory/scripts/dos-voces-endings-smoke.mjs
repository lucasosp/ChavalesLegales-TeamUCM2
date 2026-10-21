/**
 * Ending routing check for "Dos voces".
 *
 * Risky choices now show a warning and continue forward. This test plays four
 * different decision profiles and checks that the accumulated warnings and the
 * final quiz produce the four possible endings.
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { compileStory } from "../src/content/compileStory.js";
import { VisualNovelEngine } from "../src/core/VisualNovelEngine.js";

const contentRoot = new URL("../public/content/", import.meta.url);
const read = async (file) => JSON.parse(await readFile(new URL(file, contentRoot), "utf8"));

const [storyDoc, scenes, assets] = await Promise.all([
  read("stories/dos-voces/story.json"),
  read("stories/dos-voces/scene.json"),
  read("shared/assets.json"),
]);

const { nodes, startId } = compileStory({
  storyDoc,
  scenes,
  assets,
  defaultScene: "home-living-cold",
});

const nodeTypes = {
  chat: { present() {}, next: (node) => node.next },
  interstitial: { present() {}, next: (node) => node.next },
  minigame: { present() {}, next: (node) => node.next },
  quiz: { present() {}, next: (node) => node.next },
};

function play({ riskyChoices, correctAnswers }) {
  const engine = new VisualNovelEngine({ story: nodes, startId, nodeTypes });
  engine.start({ resume: false });

  let choicesSeen = 0;
  let riskyUsed = 0;

  for (let guard = 0; guard < 500; guard += 1) {
    if (engine.isFinished) break;
    const node = engine.currentNode;

    if (node.type === "ending") break;

    if (node.type === "choice") {
      const options = node.options.filter((option) => engine.flags[option.when?.flag] !== false);
      if (node.id === "modo") {
        engine.choose(options[0].id);
        continue;
      }

      choicesSeen += 1;
      const risky = options.find((option) => option.safe === false);
      if (risky && riskyUsed < riskyChoices) {
        riskyUsed += 1;
        engine.choose(risky.id);
      } else {
        const safe = options.find((option) => option.safe !== false);
        engine.choose(safe.id);
      }
      continue;
    }

    if (node.type === "quiz") {
      const answers = node.questions.map((question, index) => {
        const option = index < correctAnswers
          ? question.options.find((candidate) => candidate.correct)
          : question.options.find((candidate) => !candidate.correct);
        return { questionId: question.id, optionId: option.id };
      });
      engine.completeQuiz(answers);
      continue;
    }

    assert.notEqual(node.type, "reconduction", "reconduction must resolve through continueTo");
    engine.advance();
  }

  return engine;
}

try {
  const perfect = play({ riskyChoices: 0, correctAnswers: 2 });
  assert.equal(perfect.nodeId, "final1");
  assert.equal(perfect.flags.errores, 0);

  const mixed = play({ riskyChoices: 2, correctAnswers: 1 });
  assert.equal(mixed.nodeId, "final2");
  assert.equal(mixed.flags.errores, 2);

  const doubtful = play({ riskyChoices: 2, correctAnswers: 0 });
  assert.equal(doubtful.nodeId, "final3");
  assert.equal(doubtful.flags.errores, 2);

  const manyMistakes = play({ riskyChoices: 6, correctAnswers: 2 });
  assert.equal(manyMistakes.nodeId, "final4");
  assert.ok(manyMistakes.flags.errores >= 4);

  console.log("Dos voces ending routing smoke test passed: final1, final2, final3, final4");
} finally {
  // Nothing to dispose: the engine is headless.
}
