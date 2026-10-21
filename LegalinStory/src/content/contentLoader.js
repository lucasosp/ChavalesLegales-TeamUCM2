import { compileStory } from "./compileStory.js";
import { characterImage } from "./characterImages.js";
import { photoBackground } from "./backgroundImages.js";

const CONTENT_BASE = new URL("content/", document.baseURI);

export async function loadStoryIndex() {
  const index = await fetchJson(new URL("index.json", CONTENT_BASE), "story index");

  if (!Array.isArray(index.stories) || index.stories.length === 0) {
    throw new Error("Story index does not list any stories");
  }

  return index;
}

export async function loadStory(entry) {
  const manifestUrl = new URL(entry.manifest, CONTENT_BASE);
  const manifest = await fetchJson(manifestUrl, `manifest for "${entry.id}"`);

  const content = manifest.content ?? {};
  const rightsPromise = content.rights
    ? fetchJson(new URL(content.rights, manifestUrl), `rights for "${entry.id}"`)
    : Promise.resolve(null);

  const [storyDoc, scenes, assets, rights] = await Promise.all([
    fetchJson(new URL(content.story, manifestUrl), `story for "${entry.id}"`),
    fetchJson(new URL(content.scenes, manifestUrl), `scenes for "${entry.id}"`),
    fetchJson(new URL(content.assets, manifestUrl), `assets for "${entry.id}"`),
    rightsPromise,
  ]);

  const startId = manifest.start?.node ?? storyDoc.start;
  const compiled = compileStory({
    storyDoc,
    scenes,
    assets,
    startId,
    defaultScene: manifest.start?.scene ?? null,
  });

  return {
    story: compiled.nodes,
    startId: compiled.startId,
    initialFlags: compiled.initialFlags,
    title: manifest.title ?? entry.title,
    manifest,
    scenes,
    assets,
    rights,
    resolveCharacter: (character) => resolveCharacterAsset(assets, character),
    resolveCharacterName: (characterId) =>
      assets?.characters?.[characterId]?.displayName ?? characterId,
    resolveBackground: (sceneId) => resolveBackgroundAsset(scenes, assets, sceneId),
    resolveSceneLabel: (sceneId) => scenes?.scenes?.[sceneId]?.label ?? sceneId,
  };
}

export function resolveCharacterAsset(assets, character) {
  const illustration = characterImage(character);
  if (illustration) return illustration;
  const definition = assets?.characters?.[character.id];
  if (!definition) {
    throw new Error(`Unknown character "${character.id}"`);
  }

  const expressions = definition.expressions ?? {};
  const fallback = definition.defaultExpression ?? Object.keys(expressions)[0];
  const requested = character.expression ?? fallback;
  const source = expressions[requested] ?? expressions[fallback];

  if (!source) {
    throw new Error(
      `Character "${character.id}" has no expression "${requested}"`,
    );
  }

  return joinAssetPath(assets.basePath ?? "/assets", source);
}

export function resolveBackgroundAsset(scenes, assets, sceneId) {
  const photo = photoBackground(sceneId);
  if (photo) return photo;
  const scene = scenes?.scenes?.[sceneId];
  const layer = findImageLayer(scene?.layers ?? []);
  if (!layer) return null;

  const backgroundId = layer.asset?.replace(/^backgrounds\//, "");
  const source = assets?.backgrounds?.[backgroundId]?.src;
  return source ? joinAssetPath(assets.basePath ?? "/assets", source) : null;
}

export function resolveStoryCover(entry) {
  return new URL(entry.cover, document.baseURI).href;
}

function joinAssetPath(basePath, source) {
  if (/^(?:https?:)?\/\//.test(source) || source.startsWith("data:")) {
    return source;
  }
  if (source.startsWith("/")) return source;

  return `${basePath.replace(/\/+$/, "")}/${source.replace(/^\/+/, "")}`;
}

async function fetchJson(url, label) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load ${label} (${response.status} ${response.statusText})`);
  }

  try {
    return await response.json();
  } catch {
    throw new Error(`Invalid JSON in ${label}: ${url.pathname}`);
  }
}

function findImageLayer(layers) {
  for (const layer of layers) {
    if (layer?.type === "image") return layer;
    if (layer?.type === "group" && Array.isArray(layer.children)) {
      const found = findImageLayer(layer.children);
      if (found) return found;
    }
  }
  return null;
}
