/**
 * Compiles the JSON content format into the engine's story graph.
 *
 * This is the runtime half of the content pipeline: the startup validator
 * guarantees references are sound, while this module resolves scene templates
 * and cast patches into the flat stage state the current view understands.
 */

const DEFAULT_EXPRESSION = "neutral";

export function compileStory({
  storyDoc,
  scenes,
  assets,
  startId = storyDoc?.start,
  defaultScene = null,
}) {
  if (!storyDoc || typeof storyDoc !== "object" || !storyDoc.nodes) {
    throw new Error("Story data is missing a nodes object");
  }
  if (!startId || !storyDoc.nodes[startId]) {
    throw new Error(`Start node "${startId}" does not exist`);
  }

  const sceneIndex = scenes?.scenes ?? {};
  const nodes = {};

  for (const [id, node] of Object.entries(storyDoc.nodes)) {
    nodes[id] = compileNode(id, node, { assets, sceneIndex });
  }

  const start = nodes[startId];
  if (defaultScene && !start.background) {
    start.background = defaultScene;
    if (start.character === undefined) {
      applySceneCharacter(start, sceneIndex[defaultScene], assets);
    }
  }

  return { startId, nodes, initialFlags: { ...(storyDoc.initialFlags ?? {}) } };
}

function compileNode(id, node, context) {
  if (!node || typeof node !== "object") {
    throw new Error(`Node "${id}" must be an object`);
  }

  const compiled = { id, type: node.type };
  for (const key of ["chapter", "learn", "a11y"]) {
    if (node[key] !== undefined) compiled[key] = structuredClone(node[key]);
  }

  if (node.scene) {
    compiled.background = node.scene;
    applySceneCharacter(compiled, context.sceneIndex[node.scene], context.assets);
  }

  if (node.cast) {
    const character = resolveCast(id, node.cast, context.assets);
    if (character === null) {
      compiled.character = null;
    } else if (character !== undefined) {
      compiled.character = { ...(compiled.character ?? {}), ...character };
    }
  }

  if (node.flags && typeof node.flags === "object") {
    compiled.flags = { ...node.flags };
  }

  if (node.effects && typeof node.effects === "object") {
    compiled.effects = structuredClone(node.effects);
  }

  if (node.perspective !== undefined) compiled.perspective = node.perspective;
  if (node.mood !== undefined) compiled.mood = node.mood;
  if (node.remote !== undefined) compiled.remote = node.remote;
  if (node.tone !== undefined) compiled.tone = node.tone;
  if (node.speaker !== undefined) compiled.speaker = node.speaker;
  if (node.kicker !== undefined) compiled.kicker = node.kicker;
  if (node.title !== undefined) compiled.title = node.title;
  if (node.text !== undefined) compiled.text = node.text;
  if (node.next !== undefined) compiled.next = node.next;

  if (node.type === "choice") {
    compiled.prompt = node.prompt;
    compiled.options = (node.options ?? []).map((option) => ({
      id: option.id,
      label: option.label,
      next: option.next,
      ...(option.flags ? { flags: { ...option.flags } } : {}),
      ...(option.effects ? { effects: structuredClone(option.effects) } : {}),
      ...(option.when ? { when: option.when } : {}),
      ...(option.safe !== undefined ? { safe: option.safe } : {}),
      ...(option.rewind !== undefined ? { rewind: option.rewind } : {}),
      ...(option.consequence ? { consequence: option.consequence } : {}),
      ...(option.lesson ? { lesson: option.lesson } : {}),
      ...(option.lessonTitle ? { lessonTitle: option.lessonTitle } : {}),
    }));
  }

  if (node.type === "branch") {
    compiled.when = node.when;
    compiled.then = node.then;
    compiled.else = node.else;
  }

  if (node.type === "chat") {
    compiled.chatTitle = node.chatTitle;
    compiled.self = node.self;
    compiled.messages = (node.messages ?? []).map((message) => ({ ...message }));
  }

  if (node.type === "minigame") {
    compiled.mode = node.mode;
    compiled.prompt = node.prompt;
    compiled.cards = (node.cards ?? []).map((card) => ({ ...card }));
  }

  if (node.type === "reconduction") {
    compiled.lesson = node.lesson;
    compiled.returnTo = node.returnTo;
    compiled.continueTo = node.continueTo;
  }

  if (node.type === "quiz") {
    compiled.title = node.title;
    compiled.prompt = node.prompt;
    compiled.questions = (node.questions ?? []).map((question) => ({
      ...question,
      options: (question.options ?? []).map((option) => ({ ...option })),
    }));
  }

  return compiled;
}

function resolveCast(nodeId, cast, assets) {
  const entries = Object.entries(cast);
  const visible = entries.filter(([, value]) => value !== null);

  if (visible.length === 0) {
    return entries.length > 0 ? null : undefined;
  }

  if (visible.length > 1) {
    throw new Error(
      `Node "${nodeId}" casts ${visible.length} characters; this runtime renders one character per beat`,
    );
  }

  const [characterId, value] = visible[0];
  const character = {
    id: characterId,
    expression: resolveExpression(characterId, value, assets),
  };

  if (isObject(value) && typeof value.at === "string") {
    character.at = value.at;
  }

  return character;
}

function resolveExpression(characterId, value, assets) {
  const character = assets?.characters?.[characterId];
  if (!character) {
    throw new Error(`Unknown character "${characterId}"`);
  }

  const expressions = character.expressions ?? {};
  const fallback =
    character.defaultExpression ??
    Object.keys(expressions)[0] ??
    DEFAULT_EXPRESSION;

  const requested =
    typeof value === "string" ? value : value?.expression ?? fallback;

  if (!expressions[requested]) {
    throw new Error(
      `Character "${characterId}" has no expression "${requested}"`,
    );
  }

  return requested;
}

function applySceneCharacter(node, scene, assets) {
  if (!scene) return;

  const layer = findFirstCharacterLayer(scene.layers ?? []);
  if (!layer) {
    node.character = null;
    return;
  }

  const characterId = layer.asset?.replace(/^characters\//, "");
  if (!characterId || !assets?.characters?.[characterId]) {
    node.character = null;
    return;
  }

  node.character = {
    id: characterId,
    expression: resolveExpression(characterId, layer.expression, assets),
  };

  if (typeof layer.at === "string") {
    node.character.at = layer.at;
  }
}

function findFirstCharacterLayer(layers) {
  for (const layer of layers) {
    if (layer?.type === "character") return layer;
    if (layer?.type === "group" && Array.isArray(layer.children)) {
      const found = findFirstCharacterLayer(layer.children);
      if (found) return found;
    }
  }
  return null;
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
