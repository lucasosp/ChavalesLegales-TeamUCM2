/**
 * Content validator.
 *
 * Runs before the dev server starts and before a production build. It checks
 * the registry, manifests, story graph, scenes, cast references, and every
 * asset path on disk. All problems are collected so one run reports everything
 * that needs fixing, not just the first failure.
 *
 *   node scripts/validate-content.mjs
 */
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CONTENT_DIR = "public/content";
const PUBLIC_DIR = "public";
const NODE_TYPES = new Set([
  "dialogue",
  "choice",
  "branch",
  "ending",
  "chat",
  "interstitial",
  "minigame",
  "quiz",
  "reconduction",
]);
const COMPARISONS = new Set(["eq", "neq", "gt", "gte", "lt", "lte"]);
const LAYER_TYPES = new Set(["image", "character", "group", "effect", "text"]);
const IMAGE_FITS = new Set(["cover", "contain", "stretch"]);
const PERSPECTIVES = new Set(["maya", "sofi", "elena", "red"]);
const MOODS = new Set(["neutral", "cold", "tense", "warm", "safe", "hope"]);

const COMMON_NODE_KEYS = [
  "type",
  "scene",
  "cast",
  "flags",
  "effects",
  "transition",
  "audio",
  "tone",
  "perspective",
  "mood",
  "remote",
  "chapter",
  "learn",
  "a11y",
];
const NODE_KEYS = {
  dialogue: [...COMMON_NODE_KEYS, "speaker", "text", "next"],
  choice: [...COMMON_NODE_KEYS, "speaker", "prompt", "options"],
  branch: [...COMMON_NODE_KEYS, "when", "then", "else"],
  ending: [...COMMON_NODE_KEYS, "kicker", "title", "text"],
  chat: [...COMMON_NODE_KEYS, "chatTitle", "self", "messages", "next"],
  interstitial: [...COMMON_NODE_KEYS, "kicker", "title", "text", "next"],
  minigame: [...COMMON_NODE_KEYS, "title", "prompt", "cards", "next", "mode"],
  quiz: [...COMMON_NODE_KEYS, "title", "prompt", "questions", "next"],
  reconduction: [...COMMON_NODE_KEYS, "title", "text", "lesson", "returnTo", "continueTo"],
};

export async function validateContent({ root = process.cwd() } = {}) {
  const ctx = {
    root,
    contentDir: path.join(root, CONTENT_DIR),
    publicDir: path.join(root, PUBLIC_DIR),
    errors: [],
    warnings: [],
    stats: { stories: 0, nodes: 0, scenes: 0, assets: 0 },
    assetKeys: new Set(),
  };

  const indexPath = path.join(ctx.contentDir, "index.json");
  const index = await readJson(indexPath, "content/index.json", ctx);
  if (!index) return result(ctx);

  const stories = await validateIndex(index, ctx);

  for (const entry of stories) {
    await validateStoryEntry(entry, ctx);
  }

  return result(ctx);
}

async function validateStoryEntry(entry, ctx) {
  const tag = `[${entry.id}]`;
  const manifestPath = resolveContentPath(entry.manifest, ctx.contentDir, ctx.contentDir);
  if (!manifestPath) {
    ctx.errors.push(`${tag} registry manifest escapes ${CONTENT_DIR}: ${entry.manifest}`);
    return;
  }

  const manifest = await readJson(manifestPath, `${tag} manifest`, ctx);
  if (!manifest) return;

  validateManifest(manifest, entry, tag, ctx);
  if (!isObject(manifest.content)) return;

  const manifestDir = path.dirname(manifestPath);
  const storyPath = resolveContentPath(manifest.content.story, manifestDir, ctx.contentDir);
  const scenesPath = resolveContentPath(manifest.content.scenes, manifestDir, ctx.contentDir);
  const assetsPath = resolveContentPath(manifest.content.assets, manifestDir, ctx.contentDir);
  const rightsPath = manifest.content.rights
    ? resolveContentPath(manifest.content.rights, manifestDir, ctx.contentDir)
    : null;

  if (!storyPath || !scenesPath || !assetsPath) {
    ctx.errors.push(`${tag} manifest content paths must stay inside ${CONTENT_DIR}`);
    return;
  }

  if (manifest.content.rights && !rightsPath) {
    ctx.errors.push(`${tag} manifest rights path must stay inside ${CONTENT_DIR}`);
  }

  const [storyDoc, scenesDoc, assetsDoc] = await Promise.all([
    readJson(storyPath, `${tag} story`, ctx),
    readJson(scenesPath, `${tag} scenes`, ctx),
    readJson(assetsPath, `${tag} assets`, ctx),
  ]);
  const rightsDoc = rightsPath
    ? await readJson(rightsPath, `${tag} rights`, ctx)
    : null;

  if (rightsDoc) validateRights(rightsDoc, tag, ctx);

  if (!assetsDoc) return;

  const catalog = await validateAssets(assetsDoc, tag, ctx);
  const sceneIndex = validateScenes(scenesDoc, tag, catalog, ctx);

  if (storyDoc) {
    validateStory(storyDoc, tag, catalog, sceneIndex, ctx);

    if (manifest.start?.node && !storyDoc.nodes?.[manifest.start.node]) {
      ctx.errors.push(
        `${tag} novel.json: start.node "${manifest.start.node}" does not exist in story.json`,
      );
    }
    if (manifest.start?.scene && !sceneIndex.has(manifest.start.scene)) {
      ctx.errors.push(
        `${tag} novel.json: start.scene "${manifest.start.scene}" does not exist in scene.json`,
      );
    }

    const startNodeId = manifest.start?.node ?? storyDoc.start;
    const startNode = startNodeId ? storyDoc.nodes?.[startNodeId] : null;
    if (startNode && !startNode.scene && !manifest.start?.scene) {
      ctx.warnings.push(
        `${tag} start node "${startNodeId}" has no scene; the story will start without a background`,
      );
    }
    if (
      typeof storyDoc.start === "string" &&
      typeof manifest.start?.node === "string" &&
      storyDoc.start !== manifest.start.node
    ) {
      ctx.warnings.push(
        `${tag} start.node "${manifest.start.node}" differs from story.start "${storyDoc.start}"`,
      );
    }
  }

  ctx.stats.stories += 1;
}

async function validateIndex(index, ctx) {
  const where = "content/index.json";

  if (!isObject(index)) {
    ctx.errors.push(`${where}: expected an object`);
    return [];
  }
  if (typeof index.version !== "number") {
    ctx.errors.push(`${where}.version must be a number`);
  }
  rejectUnknownKeys(index, ["version", "stories"], where, ctx);

  if (!Array.isArray(index.stories) || index.stories.length === 0) {
    ctx.errors.push(`${where}.stories must be a non-empty array`);
    return [];
  }

  const seen = new Set();
  const entries = [];

  for (const [i, entry] of index.stories.entries()) {
    const at = `${where}.stories[${i}]`;

    if (!isObject(entry)) {
      ctx.errors.push(`${at}: expected an object`);
      continue;
    }

    rejectUnknownKeys(entry, ["id", "title", "subtitle", "manifest", "cover"], at, ctx);
    requireString(entry.id, `${at}.id`, ctx);
    requireString(entry.title, `${at}.title`, ctx);
    requireString(entry.manifest, `${at}.manifest`, ctx);
    if (entry.subtitle !== undefined) requireString(entry.subtitle, `${at}.subtitle`, ctx);
    if (entry.cover !== undefined) requireString(entry.cover, `${at}.cover`, ctx);

    if (typeof entry.id === "string") {
      if (seen.has(entry.id)) {
        ctx.errors.push(`${at}.id duplicates story id "${entry.id}"`);
      }
      seen.add(entry.id);
    }

    if (typeof entry.cover === "string") {
      const coverPath = resolvePublicPath(entry.cover, ctx.publicDir);
      if (!coverPath) {
        ctx.errors.push(`${at}.cover escapes ${PUBLIC_DIR}: ${entry.cover}`);
      } else {
        await checkFile(ctx, coverPath, `${at}.cover`);
      }
    }

    entries.push(entry);
  }

  return entries;
}

function validateManifest(manifest, entry, tag, ctx) {
  const where = `${tag} novel.json`;

  rejectUnknownKeys(
    manifest,
    ["version", "id", "title", "content", "stage", "start", "save"],
    where,
    ctx,
  );

  if (typeof manifest.version !== "number") {
    ctx.errors.push(`${where}.version must be a number`);
  }
  requireString(manifest.id, `${where}.id`, ctx);
  requireString(manifest.title, `${where}.title`, ctx);

  if (typeof manifest.id === "string" && typeof entry.id === "string" && manifest.id !== entry.id) {
    ctx.errors.push(`${where}.id "${manifest.id}" does not match registry id "${entry.id}"`);
  }

  if (!isObject(manifest.content)) {
    ctx.errors.push(`${where}.content must be an object`);
  } else {
    rejectUnknownKeys(
      manifest.content,
      ["story", "assets", "scenes", "rights"],
      `${where}.content`,
      ctx,
    );
    for (const key of ["story", "assets", "scenes"]) {
      requireString(manifest.content[key], `${where}.content.${key}`, ctx);
    }
    if (manifest.content.rights !== undefined) {
      requireString(manifest.content.rights, `${where}.content.rights`, ctx);
    }
  }

  if (!isObject(manifest.stage)) {
    ctx.errors.push(`${where}.stage must be an object`);
  } else {
    rejectUnknownKeys(manifest.stage, ["width", "height"], `${where}.stage`, ctx);
    requirePositiveNumber(manifest.stage.width, `${where}.stage.width`, ctx);
    requirePositiveNumber(manifest.stage.height, `${where}.stage.height`, ctx);
  }

  if (!isObject(manifest.start)) {
    ctx.errors.push(`${where}.start must be an object`);
  } else {
    rejectUnknownKeys(manifest.start, ["node", "scene"], `${where}.start`, ctx);
    requireString(manifest.start.node, `${where}.start.node`, ctx);
    if (manifest.start.scene !== undefined) {
      requireString(manifest.start.scene, `${where}.start.scene`, ctx);
    }
  }

  if (!isObject(manifest.save)) {
    ctx.errors.push(`${where}.save must be an object`);
  } else {
    rejectUnknownKeys(manifest.save, ["key", "version"], `${where}.save`, ctx);
    requireString(manifest.save.key, `${where}.save.key`, ctx);
    if (typeof manifest.save.version !== "number") {
      ctx.errors.push(`${where}.save.version must be a number`);
    }
    if (
      typeof manifest.save.key === "string" &&
      typeof entry.id === "string" &&
      manifest.save.key !== `${entry.id}.save`
    ) {
      ctx.warnings.push(
        `${where}.save.key is "${manifest.save.key}"; the library currently uses "${entry.id}.save"`,
      );
    }
  }
}

function validateRights(rights, tag, ctx) {
  const where = `${tag} rights.json`;

  if (!isObject(rights)) {
    ctx.errors.push(`${where}: expected an object`);
    return;
  }

  rejectUnknownKeys(
    rights,
    ["version", "title", "intro", "sections", "resourcesTitle", "resources", "closing"],
    where,
    ctx,
  );

  if (typeof rights.version !== "number") {
    ctx.errors.push(`${where}.version must be a number`);
  }
  requireString(rights.title, `${where}.title`, ctx);
  if (rights.intro !== undefined) requireString(rights.intro, `${where}.intro`, ctx);
  if (rights.closing !== undefined) requireString(rights.closing, `${where}.closing`, ctx);
  if (rights.resourcesTitle !== undefined) {
    requireString(rights.resourcesTitle, `${where}.resourcesTitle`, ctx);
  }

  if (!Array.isArray(rights.sections) || rights.sections.length === 0) {
    ctx.errors.push(`${where}.sections must be a non-empty array`);
  } else {
    rights.sections.forEach((section, index) => {
      const at = `${where}.sections[${index}]`;
      if (!isObject(section)) {
        ctx.errors.push(`${at} must be an object`);
        return;
      }
      rejectUnknownKeys(section, ["title", "text"], at, ctx);
      requireString(section.title, `${at}.title`, ctx);
      requireString(section.text, `${at}.text`, ctx);
    });
  }

  if (rights.resources !== undefined) {
    if (!Array.isArray(rights.resources)) {
      ctx.errors.push(`${where}.resources must be an array`);
    } else {
      rights.resources.forEach((resource, index) => {
        const at = `${where}.resources[${index}]`;
        if (!isObject(resource)) {
          ctx.errors.push(`${at} must be an object`);
          return;
        }
        rejectUnknownKeys(resource, ["name", "text", "url"], at, ctx);
        if (resource.url !== undefined && (typeof resource.url !== "string" || !/^https:\/\//.test(resource.url))) {
          ctx.errors.push(`${at}.url must be an HTTPS link`);
        }
        requireString(resource.name, `${at}.name`, ctx);
        requireString(resource.text, `${at}.text`, ctx);
      });
    }
  }
}

async function validateAssets(assets, tag, ctx) {
  const catalog = {
    assets: new Set(),
    characters: new Map(),
    backgrounds: new Set(),
    audio: new Set(),
    fonts: new Set(),
  };

  if (!isObject(assets)) {
    ctx.errors.push(`${tag} assets.json: expected an object`);
    return catalog;
  }

  rejectUnknownKeys(
    assets,
    ["version", "basePath", "characters", "backgrounds", "audio", "fonts"],
    `${tag} assets.json`,
    ctx,
  );

  if (typeof assets.version !== "number") {
    ctx.errors.push(`${tag} assets.json.version must be a number`);
  }
  const basePath = typeof assets.basePath === "string" ? assets.basePath : "/assets";
  if (assets.basePath !== undefined && typeof assets.basePath !== "string") {
    ctx.errors.push(`${tag} assets.json.basePath must be a string`);
  }

  if (!isObject(assets.characters)) {
    ctx.errors.push(`${tag} assets.json.characters must be an object`);
  } else {
    for (const [id, character] of Object.entries(assets.characters)) {
      const where = `${tag} assets.json.characters.${id}`;
      if (!isObject(character)) {
        ctx.errors.push(`${where} must be an object`);
        continue;
      }

      rejectUnknownKeys(
        character,
        ["displayName", "size", "pivot", "defaultExpression", "expressions"],
        where,
        ctx,
      );
      if (character.displayName !== undefined) {
        requireString(character.displayName, `${where}.displayName`, ctx);
      }
      validateSize(character.size, `${where}.size`, ctx);
      validatePivot(character.pivot, `${where}.pivot`, ctx);

      if (!isObject(character.expressions) || Object.keys(character.expressions).length === 0) {
        ctx.errors.push(`${where}.expressions must be a non-empty object`);
        continue;
      }

      const expressions = new Set(Object.keys(character.expressions));
      if (
        character.defaultExpression !== undefined &&
        (typeof character.defaultExpression !== "string" ||
          !expressions.has(character.defaultExpression))
      ) {
        ctx.errors.push(`${where}.defaultExpression must name an existing expression`);
      }

      for (const [expression, value] of Object.entries(character.expressions)) {
        const sources = expressionSources(value);
        if (sources.length === 0) {
          ctx.errors.push(
            `${where}.expressions.${expression} must be a path or { layers: [...] }`,
          );
          continue;
        }
        for (const source of sources) {
          const file = resolveAssetPath(basePath, source, ctx.publicDir);
          if (!file) {
            ctx.errors.push(
              `${where}.expressions.${expression} escapes ${PUBLIC_DIR}: ${source}`,
            );
          } else {
            await checkFile(
              ctx,
              file,
              `${tag} asset "characters/${id}/${expression}"`,
            );
          }
        }
      }

      catalog.characters.set(id, { expressions, defaultExpression: character.defaultExpression });
      catalog.assets.add(`characters/${id}`);
      ctx.assetKeys.add(`characters/${id}`);
    }
  }

  if (!isObject(assets.backgrounds)) {
    ctx.errors.push(`${tag} assets.json.backgrounds must be an object`);
  } else {
    for (const [id, background] of Object.entries(assets.backgrounds)) {
      const where = `${tag} assets.json.backgrounds.${id}`;
      if (!isObject(background)) {
        ctx.errors.push(`${where} must be an object`);
        continue;
      }
      rejectUnknownKeys(background, ["src", "size"], where, ctx);
      requireString(background.src, `${where}.src`, ctx);
      validateSize(background.size, `${where}.size`, ctx);

      if (typeof background.src === "string") {
        const file = resolveAssetPath(basePath, background.src, ctx.publicDir);
        if (!file) {
          ctx.errors.push(`${where}.src escapes ${PUBLIC_DIR}: ${background.src}`);
        } else {
          await checkFile(ctx, file, `${tag} asset "backgrounds/${id}"`);
        }
      }

      catalog.backgrounds.add(id);
      catalog.assets.add(`backgrounds/${id}`);
      ctx.assetKeys.add(`backgrounds/${id}`);
    }
  }

  if (assets.audio !== undefined) {
    if (!isObject(assets.audio)) {
      ctx.errors.push(`${tag} assets.json.audio must be an object`);
    } else {
      for (const [id, audio] of Object.entries(assets.audio)) {
        const where = `${tag} assets.json.audio.${id}`;
        if (!isObject(audio)) {
          ctx.errors.push(`${where} must be an object`);
          continue;
        }
        rejectUnknownKeys(audio, ["src", "kind", "loop", "volume"], where, ctx);
        requireString(audio.src, `${where}.src`, ctx);
        if (audio.kind !== undefined && !["music", "sfx"].includes(audio.kind)) {
          ctx.errors.push(`${where}.kind must be "music" or "sfx"`);
        }
        if (audio.loop !== undefined && typeof audio.loop !== "boolean") {
          ctx.errors.push(`${where}.loop must be a boolean`);
        }
        if (audio.volume !== undefined) {
          if (typeof audio.volume !== "number" || audio.volume < 0 || audio.volume > 1) {
            ctx.errors.push(`${where}.volume must be a number between 0 and 1`);
          }
        }
        if (typeof audio.src === "string") {
          const file = resolveAssetPath(basePath, audio.src, ctx.publicDir);
          if (!file) {
            ctx.errors.push(`${where}.src escapes ${PUBLIC_DIR}: ${audio.src}`);
          } else {
            await checkFile(ctx, file, `${tag} asset "audio/${id}"`);
          }
        }
        catalog.audio.add(id);
        catalog.assets.add(`audio/${id}`);
        ctx.assetKeys.add(`audio/${id}`);
      }
    }
  }

  if (assets.fonts !== undefined) {
    if (!isObject(assets.fonts)) {
      ctx.errors.push(`${tag} assets.json.fonts must be an object`);
    } else {
      for (const [id, font] of Object.entries(assets.fonts)) {
        const where = `${tag} assets.json.fonts.${id}`;
        if (!isObject(font)) {
          ctx.errors.push(`${where} must be an object`);
          continue;
        }
        rejectUnknownKeys(font, ["src", "weight", "style"], where, ctx);
        requireString(font.src, `${where}.src`, ctx);
        if (typeof font.src === "string") {
          const file = resolveAssetPath(basePath, font.src, ctx.publicDir);
          if (!file) {
            ctx.errors.push(`${where}.src escapes ${PUBLIC_DIR}: ${font.src}`);
          } else {
            await checkFile(ctx, file, `${tag} asset "fonts/${id}"`);
          }
        }
        catalog.fonts.add(id);
        catalog.assets.add(`fonts/${id}`);
        ctx.assetKeys.add(`fonts/${id}`);
      }
    }
  }

  return catalog;
}

function validateScenes(scenesDoc, tag, catalog, ctx) {
  const sceneIndex = new Map();

  if (!isObject(scenesDoc)) {
    ctx.errors.push(`${tag} scene.json: expected an object`);
    return sceneIndex;
  }

  rejectUnknownKeys(scenesDoc, ["version", "stage", "presets", "scenes"], `${tag} scene.json`, ctx);
  if (typeof scenesDoc.version !== "number") {
    ctx.errors.push(`${tag} scene.json.version must be a number`);
  }

  if (scenesDoc.stage !== undefined) {
    if (!isObject(scenesDoc.stage)) {
      ctx.errors.push(`${tag} scene.json.stage must be an object`);
    } else {
      rejectUnknownKeys(
        scenesDoc.stage,
        ["width", "height", "safeArea"],
        `${tag} scene.json.stage`,
        ctx,
      );
      requirePositiveNumber(scenesDoc.stage.width, `${tag} scene.json.stage.width`, ctx);
      requirePositiveNumber(scenesDoc.stage.height, `${tag} scene.json.stage.height`, ctx);
    }
  }

  const positions = new Set();
  const transitions = new Set();
  catalog.positions = positions;
  catalog.transitions = transitions;

  if (scenesDoc.presets !== undefined) {
    if (!isObject(scenesDoc.presets)) {
      ctx.errors.push(`${tag} scene.json.presets must be an object`);
    } else {
      rejectUnknownKeys(
        scenesDoc.presets,
        ["positions", "transitions"],
        `${tag} scene.json.presets`,
        ctx,
      );

      if (scenesDoc.presets.positions !== undefined) {
        if (!isObject(scenesDoc.presets.positions)) {
          ctx.errors.push(`${tag} scene.json.presets.positions must be an object`);
        } else {
          for (const [id, position] of Object.entries(scenesDoc.presets.positions)) {
            const where = `${tag} scene.json.presets.positions.${id}`;
            positions.add(id);
            if (!isObject(position)) {
              ctx.errors.push(`${where} must be an object`);
              continue;
            }
            rejectUnknownKeys(position, ["x", "y", "scale"], where, ctx);
            requireNumber(position.x, `${where}.x`, ctx);
            requireNumber(position.y, `${where}.y`, ctx);
            if (position.scale !== undefined) {
              requirePositiveNumber(position.scale, `${where}.scale`, ctx);
            }
          }
        }
      }

      if (scenesDoc.presets.transitions !== undefined) {
        if (!isObject(scenesDoc.presets.transitions)) {
          ctx.errors.push(`${tag} scene.json.presets.transitions must be an object`);
        } else {
          for (const [id, transition] of Object.entries(scenesDoc.presets.transitions)) {
            const where = `${tag} scene.json.presets.transitions.${id}`;
            transitions.add(id);
            if (!isObject(transition)) {
              ctx.errors.push(`${where} must be an object`);
            } else {
              validateTransition(transition, where, transitions, ctx);
            }
          }
        }
      }
    }
  }

  if (!isObject(scenesDoc.scenes) || Object.keys(scenesDoc.scenes).length === 0) {
    ctx.errors.push(`${tag} scene.json.scenes must be a non-empty object`);
    return sceneIndex;
  }

  for (const [id, scene] of Object.entries(scenesDoc.scenes)) {
    const where = `${tag} scene.json.scenes.${id}`;

    if (!isObject(scene)) {
      ctx.errors.push(`${where} must be an object`);
      continue;
    }

    rejectUnknownKeys(scene, ["label", "layers"], where, ctx);
    if (scene.label !== undefined) requireString(scene.label, `${where}.label`, ctx);

    if (!Array.isArray(scene.layers) || scene.layers.length === 0) {
      ctx.errors.push(`${where}.layers must be a non-empty array`);
      continue;
    }

    const layerIds = new Set();
    let characterLayers = 0;
    let imageLayers = 0;

    const walk = (layers, at) => {
      layers.forEach((layer, index) => {
        const layerPath = `${at}[${index}]`;

        if (!isObject(layer)) {
          ctx.errors.push(`${layerPath} must be an object`);
          return;
        }

        requireString(layer.id, `${layerPath}.id`, ctx);
        if (typeof layer.id === "string") {
          if (layerIds.has(layer.id)) {
            ctx.errors.push(`${layerPath}.id duplicates layer id "${layer.id}"`);
          }
          layerIds.add(layer.id);
        }

        if (!LAYER_TYPES.has(layer.type)) {
          ctx.errors.push(`${layerPath}.type must be one of ${[...LAYER_TYPES].join(", ")}`);
          return;
        }

        if (layer.type === "character") characterLayers += 1;
        if (layer.type === "image") imageLayers += 1;

        validateLayerCommon(layer, layerPath, positions, transitions, ctx);

        switch (layer.type) {
          case "image":
            rejectUnknownKeys(layer, layerAllowed("image"), layerPath, ctx);
            requireString(layer.asset, `${layerPath}.asset`, ctx);
            if (typeof layer.asset === "string") {
              if (!catalog.assets.has(layer.asset)) {
                ctx.errors.push(`${layerPath}.asset references unknown asset "${layer.asset}"`);
              } else if (!layer.asset.startsWith("backgrounds/")) {
                ctx.errors.push(`${layerPath}.asset must be a background asset`);
              }
            }
            if (layer.fit !== undefined && !IMAGE_FITS.has(layer.fit)) {
              ctx.errors.push(`${layerPath}.fit must be one of ${[...IMAGE_FITS].join(", ")}`);
            }
            break;

          case "character": {
            rejectUnknownKeys(layer, layerAllowed("character"), layerPath, ctx);
            requireString(layer.asset, `${layerPath}.asset`, ctx);
            if (typeof layer.asset === "string") {
              const characterId = layer.asset.replace(/^characters\//, "");
              const character = catalog.characters.get(characterId);
              if (!character || !layer.asset.startsWith("characters/")) {
                ctx.errors.push(
                  `${layerPath}.asset references unknown character "${layer.asset}"`,
                );
              } else if (layer.expression !== undefined) {
                if (
                  typeof layer.expression !== "string" ||
                  !character.expressions.has(layer.expression)
                ) {
                  ctx.errors.push(
                    `${layerPath}.expression "${layer.expression}" is not defined for "${characterId}"`,
                  );
                }
              }
            }
            if (layer.flip !== undefined && typeof layer.flip !== "boolean") {
              ctx.errors.push(`${layerPath}.flip must be a boolean`);
            }
            break;
          }

          case "group":
            rejectUnknownKeys(layer, layerAllowed("group"), layerPath, ctx);
            if (!Array.isArray(layer.children)) {
              ctx.errors.push(`${layerPath}.children must be an array`);
            } else {
              walk(layer.children, `${layerPath}.children`);
            }
            break;

          case "effect":
            rejectUnknownKeys(layer, layerAllowed("effect"), layerPath, ctx);
            requireString(layer.effect, `${layerPath}.effect`, ctx);
            break;

          case "text":
            rejectUnknownKeys(layer, layerAllowed("text"), layerPath, ctx);
            requireString(layer.text, `${layerPath}.text`, ctx);
            if (layer.font !== undefined) {
              if (typeof layer.font !== "string" || !catalog.fonts.has(layer.font)) {
                ctx.errors.push(`${layerPath}.font references unknown font "${layer.font}"`);
              }
            }
            break;
        }
      });
    };

    walk(scene.layers, `${where}.layers`);

    if (imageLayers === 0) {
      ctx.errors.push(`${where}.layers must include an image layer for the background`);
    }

    if (characterLayers > 1) {
      ctx.warnings.push(
        `${where} has ${characterLayers} character layers; the current runtime uses the first one for scene defaults`,
      );
    }

    sceneIndex.set(id, scene);
    ctx.stats.scenes += 1;
  }

  return sceneIndex;
}

function validateLayerCommon(layer, where, positions, transitions, ctx) {
  if (layer.z !== undefined) requireNumber(layer.z, `${where}.z`, ctx);
  if (layer.opacity !== undefined) {
    if (typeof layer.opacity !== "number" || layer.opacity < 0 || layer.opacity > 1) {
      ctx.errors.push(`${where}.opacity must be a number between 0 and 1`);
    }
  }
  if (layer.rotation !== undefined) requireNumber(layer.rotation, `${where}.rotation`, ctx);
  if (layer.scale !== undefined) requirePositiveNumber(layer.scale, `${where}.scale`, ctx);
  if (layer.visible !== undefined && typeof layer.visible !== "boolean") {
    ctx.errors.push(`${where}.visible must be a boolean`);
  }
  if (layer.at !== undefined) validateAt(layer.at, `${where}.at`, positions, ctx);
  if (layer.transition !== undefined) {
    validateTransition(layer.transition, `${where}.transition`, transitions, ctx);
  }
}

function layerAllowed(type) {
  const common = ["id", "type", "z", "opacity", "rotation", "scale", "visible", "at", "transition"];
  const specific = {
    image: ["asset", "fit"],
    character: ["asset", "expression", "flip"],
    group: ["children"],
    effect: ["effect"],
    text: ["text", "font"],
  }[type] ?? [];

  return [...common, ...specific];
}

function validateAt(at, where, positions, ctx) {
  if (typeof at === "string") {
    if (!positions.has(at)) ctx.errors.push(`${where} references unknown position preset "${at}"`);
    return;
  }

  if (!isObject(at)) {
    ctx.errors.push(`${where} must be a preset name or { x, y }`);
    return;
  }

  rejectUnknownKeys(at, ["x", "y"], where, ctx);
  requireNumber(at.x, `${where}.x`, ctx);
  requireNumber(at.y, `${where}.y`, ctx);
}

function validateTransition(transition, where, transitions, ctx) {
  if (typeof transition === "string") {
    if (!transitions.has(transition)) {
      ctx.errors.push(`${where} references unknown transition preset "${transition}"`);
    }
    return;
  }

  if (!isObject(transition)) {
    ctx.errors.push(`${where} must be a preset name or { type, duration }`);
    return;
  }

  rejectUnknownKeys(transition, ["type", "duration"], where, ctx);
  requireString(transition.type, `${where}.type`, ctx);
  if (transition.duration !== undefined) {
    requirePositiveNumber(transition.duration, `${where}.duration`, ctx);
  }
}

function validateStory(storyDoc, tag, catalog, sceneIndex, ctx) {
  const where = `${tag} story.json`;

  if (!isObject(storyDoc)) {
    ctx.errors.push(`${where}: expected an object`);
    return;
  }

  rejectUnknownKeys(storyDoc, ["version", "start", "initialFlags", "nodes"], where, ctx);
  if (typeof storyDoc.version !== "number") {
    ctx.errors.push(`${where}.version must be a number`);
  }

  if (!isObject(storyDoc.nodes) || Object.keys(storyDoc.nodes).length === 0) {
    ctx.errors.push(`${where}.nodes must be a non-empty object`);
    return;
  }

  const nodes = storyDoc.nodes;
  const nodeIds = new Set(Object.keys(nodes));

  if (typeof storyDoc.start !== "string" || !nodeIds.has(storyDoc.start)) {
    ctx.errors.push(`${where}.start must name an existing node`);
  }

  const readFlags = new Set();
  const setFlags = new Set();
  validateFlags(storyDoc.initialFlags, `${where}.initialFlags`, ctx, setFlags);
  const edges = new Map();

  for (const [id, node] of Object.entries(nodes)) {
    const at = `${where}.nodes.${id}`;

    if (!isObject(node)) {
      ctx.errors.push(`${at} must be an object`);
      continue;
    }

    if (!NODE_TYPES.has(node.type)) {
      ctx.errors.push(`${at}.type must be one of ${[...NODE_TYPES].join(", ")}`);
      continue;
    }

    rejectUnknownKeys(node, NODE_KEYS[node.type], at, ctx);
    validateCommonNode(node, at, catalog, sceneIndex, ctx, setFlags);

    const outgoing = [];

    if (node.type === "dialogue") {
      requireText(node.text, `${at}.text`, ctx);
      requireRef(node.next, `${at}.next`, nodeIds, ctx);
      if (node.next) outgoing.push(node.next);
      if (node.speaker !== undefined) validateSpeaker(node.speaker, `${at}.speaker`, ctx);
    }

    if (node.type === "choice") {
      requireText(node.prompt, `${at}.prompt`, ctx);
      if (!Array.isArray(node.options) || node.options.length === 0) {
        ctx.errors.push(`${at}.options must be a non-empty array`);
      } else {
        const optionIds = new Set();
        let forwardOptions = 0;
        node.options.forEach((option, index) => {
          const optionAt = `${at}.options[${index}]`;
          if (!isObject(option)) {
            ctx.errors.push(`${optionAt} must be an object`);
            return;
          }

          rejectUnknownKeys(
            option,
            [
              "id",
              "label",
              "next",
              "flags",
              "effects",
              "when",
              "safe",
              "rewind",
              "lesson",
              "lessonTitle",
              "consequence",
            ],
            optionAt,
            ctx,
          );
          requireString(option.id, `${optionAt}.id`, ctx);
          requireText(option.label, `${optionAt}.label`, ctx);

          if (typeof option.id === "string") {
            if (optionIds.has(option.id)) {
              ctx.errors.push(`${optionAt}.id duplicates option id "${option.id}"`);
            }
            optionIds.add(option.id);
          }

          validateFlags(option.flags, `${optionAt}.flags`, ctx, setFlags);
          validateEffects(option.effects, `${optionAt}.effects`, ctx, setFlags);
          if (option.when !== undefined) {
            validateCondition(option.when, `${optionAt}.when`, nodeIds, readFlags, ctx);
          }

          for (const key of ["safe", "rewind"]) {
            if (option[key] !== undefined && typeof option[key] !== "boolean") {
              ctx.errors.push(`${optionAt}.${key} must be a boolean`);
            }
          }
          for (const key of ["lesson", "lessonTitle", "consequence"]) {
            if (option[key] !== undefined) {
              requireText(option[key], `${optionAt}.${key}`, ctx);
            }
          }

          const isRewind =
            option.safe === false || option.rewind === true || typeof option.lesson === "string";

          if (isRewind) {
            if (typeof option.lesson !== "string" && typeof option.consequence !== "string") {
              ctx.errors.push(
                `${optionAt} is a rewind option and needs a consequence or a lesson`,
              );
            }
            // A rewind option may open a short consequence story; the
            // reconduction node at its end returns to this decision.
            if (option.next !== undefined) {
              requireRef(option.next, `${optionAt}.next`, nodeIds, ctx);
              if (option.next) outgoing.push(option.next);
            }
          } else {
            forwardOptions += 1;
            requireRef(option.next, `${optionAt}.next`, nodeIds, ctx);
            if (option.next) outgoing.push(option.next);
          }
        });

        if (forwardOptions === 0) {
          ctx.errors.push(`${at}.options needs at least one option that moves the story forward`);
        }
      }
    }

    if (node.type === "branch") {
      if (node.when === undefined) {
        ctx.errors.push(`${at}.when is required`);
      } else {
        validateCondition(node.when, `${at}.when`, nodeIds, readFlags, ctx);
      }
      requireRef(node.then, `${at}.then`, nodeIds, ctx);
      requireRef(node.else, `${at}.else`, nodeIds, ctx);
      if (node.then) outgoing.push(node.then);
      if (node.else) outgoing.push(node.else);
    }

    if (node.type === "ending") {
      requireText(node.title, `${at}.title`, ctx);
      if (node.text !== undefined) requireText(node.text, `${at}.text`, ctx);
      if (node.kicker !== undefined && typeof node.kicker !== "string") {
        ctx.errors.push(`${at}.kicker must be a string`);
      }
    }

    if (node.type === "chat") {
      if (node.chatTitle !== undefined) requireString(node.chatTitle, `${at}.chatTitle`, ctx);
      if (node.self !== undefined) requireString(node.self, `${at}.self`, ctx);

      if (!Array.isArray(node.messages) || node.messages.length === 0) {
        ctx.errors.push(`${at}.messages must be a non-empty array`);
      } else {
        node.messages.forEach((message, index) => {
          const messageAt = `${at}.messages[${index}]`;
          if (!isObject(message)) {
            ctx.errors.push(`${messageAt} must be an object`);
            return;
          }

          rejectUnknownKeys(
            message,
            ["from", "text", "time", "system", "deleted", "hidden", "side"],
            messageAt,
            ctx,
          );
          requireString(message.text, `${messageAt}.text`, ctx);
          if (message.from !== undefined) requireString(message.from, `${messageAt}.from`, ctx);
          if (message.time !== undefined) requireString(message.time, `${messageAt}.time`, ctx);
          for (const key of ["system", "deleted", "hidden"]) {
            if (message[key] !== undefined && typeof message[key] !== "boolean") {
              ctx.errors.push(`${messageAt}.${key} must be a boolean`);
            }
          }
          if (message.side !== undefined && !["in", "out", "system"].includes(message.side)) {
            ctx.errors.push(`${messageAt}.side must be "in", "out" or "system"`);
          }
        });
      }

      requireRef(node.next, `${at}.next`, nodeIds, ctx);
      if (node.next) outgoing.push(node.next);
    }

    if (node.type === "interstitial") {
      requireText(node.title, `${at}.title`, ctx);
      if (node.text !== undefined) requireText(node.text, `${at}.text`, ctx);
      if (node.kicker !== undefined) requireString(node.kicker, `${at}.kicker`, ctx);
      requireRef(node.next, `${at}.next`, nodeIds, ctx);
      if (node.next) outgoing.push(node.next);
    }

    if (node.type === "minigame") {
      if (node.mode !== undefined && !["support", "information"].includes(node.mode)) {
        ctx.errors.push(`${at}.mode must be support or information`);
      }
      requireText(node.title, `${at}.title`, ctx);
      requireText(node.prompt, `${at}.prompt`, ctx);

      if (!Array.isArray(node.cards) || node.cards.length === 0) {
        ctx.errors.push(`${at}.cards must be a non-empty array`);
      } else {
        const cardIds = new Set();
        node.cards.forEach((card, index) => {
          const cardAt = `${at}.cards[${index}]`;
          if (!isObject(card)) {
            ctx.errors.push(`${cardAt} must be an object`);
            return;
          }

          rejectUnknownKeys(card, ["id", "text", "correct", "feedback", "flag"], cardAt, ctx);
          if (card.flag !== undefined) {
            requireString(card.flag, `${cardAt}.flag`, ctx);
            setFlags.add(card.flag);
          }
          requireString(card.id, `${cardAt}.id`, ctx);
          requireString(card.text, `${cardAt}.text`, ctx);
          if (node.mode !== "support" && typeof card.correct !== "boolean") {
            ctx.errors.push(`${cardAt}.correct must be a boolean`);
          }
          if (card.feedback !== undefined) {
            requireString(card.feedback, `${cardAt}.feedback`, ctx);
          }
          if (typeof card.id === "string") {
            if (cardIds.has(card.id)) {
              ctx.errors.push(`${cardAt}.id duplicates card id "${card.id}"`);
            }
            cardIds.add(card.id);
          }
        });
      }

      requireRef(node.next, `${at}.next`, nodeIds, ctx);
      if (node.next) outgoing.push(node.next);
    }

    if (node.type === "reconduction") {
      requireText(node.title, `${at}.title`, ctx);
      if (node.text !== undefined) requireText(node.text, `${at}.text`, ctx);
      if (node.lesson !== undefined) requireText(node.lesson, `${at}.lesson`, ctx);
      if (node.returnTo !== undefined) requireRef(node.returnTo, `${at}.returnTo`, nodeIds, ctx);
      if (node.continueTo !== undefined) requireRef(node.continueTo, `${at}.continueTo`, nodeIds, ctx);
    }

    if (node.type === "quiz") {
      requireText(node.title, `${at}.title`, ctx);
      if (node.prompt !== undefined) requireText(node.prompt, `${at}.prompt`, ctx);

      if (!Array.isArray(node.questions) || node.questions.length === 0) {
        ctx.errors.push(`${at}.questions must be a non-empty array`);
      } else {
        const questionIds = new Set();
        node.questions.forEach((question, index) => {
          const questionAt = `${at}.questions[${index}]`;
          if (!isObject(question)) {
            ctx.errors.push(`${questionAt} must be an object`);
            return;
          }

          rejectUnknownKeys(
            question,
            ["id", "question", "voice", "explanation", "flag", "options"],
            questionAt,
            ctx,
          );
          requireString(question.id, `${questionAt}.id`, ctx);
          requireText(question.question, `${questionAt}.question`, ctx);
          if (question.voice !== undefined) requireString(question.voice, `${questionAt}.voice`, ctx);
          if (question.explanation !== undefined) {
            requireText(question.explanation, `${questionAt}.explanation`, ctx);
          }
          if (question.flag !== undefined) {
            requireString(question.flag, `${questionAt}.flag`, ctx);
            setFlags.add(question.flag);
          }
          if (typeof question.id === "string") {
            if (questionIds.has(question.id)) {
              ctx.errors.push(`${questionAt}.id duplicates question id "${question.id}"`);
            }
            questionIds.add(question.id);
          }

          if (!Array.isArray(question.options) || question.options.length < 2) {
            ctx.errors.push(`${questionAt}.options must have at least two options`);
            return;
          }

          const optionIds = new Set();
          let correct = 0;
          question.options.forEach((option, optionIndex) => {
            const optionAt = `${questionAt}.options[${optionIndex}]`;
            if (!isObject(option)) {
              ctx.errors.push(`${optionAt} must be an object`);
              return;
            }
            rejectUnknownKeys(option, ["id", "label", "correct", "feedback"], optionAt, ctx);
            requireString(option.id, `${optionAt}.id`, ctx);
            requireText(option.label, `${optionAt}.label`, ctx);
            if (typeof option.correct !== "boolean") {
              ctx.errors.push(`${optionAt}.correct must be a boolean`);
            } else if (option.correct) {
              correct += 1;
            }
            if (option.feedback !== undefined) {
              requireText(option.feedback, `${optionAt}.feedback`, ctx);
            }
            if (typeof option.id === "string") {
              if (optionIds.has(option.id)) {
                ctx.errors.push(`${optionAt}.id duplicates option id "${option.id}"`);
              }
              optionIds.add(option.id);
            }
          });

          if (correct !== 1) {
            ctx.errors.push(`${questionAt} must mark exactly one correct option`);
          }
        });
      }

      requireRef(node.next, `${at}.next`, nodeIds, ctx);
      if (node.next) outgoing.push(node.next);
    }

    edges.set(id, outgoing);
  }

  for (const flag of readFlags) {
    if (!setFlags.has(flag)) {
      ctx.warnings.push(
        `${where}: condition reads flag "${flag}" but no node or option sets it`,
      );
    }
  }

  if (typeof storyDoc.start === "string" && nodeIds.has(storyDoc.start)) {
    const reachable = new Set([storyDoc.start]);
    const queue = [storyDoc.start];

    while (queue.length > 0) {
      const current = queue.shift();
      for (const next of edges.get(current) ?? []) {
        if (!reachable.has(next)) {
          reachable.add(next);
          queue.push(next);
        }
      }
    }

    for (const id of nodeIds) {
      if (!reachable.has(id)) {
        ctx.warnings.push(`${where}: node "${id}" is unreachable from "${storyDoc.start}"`);
      }
    }

    const endings = [...reachable].filter((id) => nodes[id]?.type === "ending");
    const canFinish = new Set(endings);
    // A reconduction loops back to a decision that can still reach an ending.
    for (const id of reachable) {
      if (nodes[id]?.type === "reconduction") canFinish.add(id);
    }
    let changed = true;
    while (changed) {
      changed = false;
      for (const id of reachable) {
        if (!canFinish.has(id) && (edges.get(id) ?? []).some((next) => canFinish.has(next))) {
          canFinish.add(id);
          changed = true;
        }
      }
    }
    for (const id of reachable) {
      if (!canFinish.has(id)) ctx.errors.push(`${where}: node "${id}" has no path to an ending`);
    }
    if (endings.length === 0) {
      ctx.warnings.push(`${where}: no ending is reachable from "${storyDoc.start}"`);
    }
  }

  ctx.stats.nodes += nodeIds.size;
}

function validateCommonNode(node, where, catalog, sceneIndex, ctx, setFlags) {
  if (node.scene !== undefined) {
    if (typeof node.scene !== "string" || !sceneIndex.has(node.scene)) {
      ctx.errors.push(`${where}.scene references unknown scene "${node.scene}"`);
    }
  }

  if (node.cast !== undefined) {
    validateCast(node.cast, `${where}.cast`, catalog, ctx);
  }

  if (node.flags !== undefined) {
    validateFlags(node.flags, `${where}.flags`, ctx, setFlags);
  }

  if (node.effects !== undefined) {
    validateEffects(node.effects, `${where}.effects`, ctx, setFlags);
  }

  if (node.perspective !== undefined) {
    if (typeof node.perspective !== "string" || !PERSPECTIVES.has(node.perspective)) {
      ctx.errors.push(`${where}.perspective must be one of ${[...PERSPECTIVES].join(", ")}`);
    }
  }

  if (node.mood !== undefined) {
    if (typeof node.mood !== "string" || !MOODS.has(node.mood)) {
      ctx.errors.push(`${where}.mood must be one of ${[...MOODS].join(", ")}`);
    }
  }

  if (node.remote !== undefined && typeof node.remote !== "boolean") {
    ctx.errors.push(`${where}.remote must be a boolean`);
  }

  if (node.transition !== undefined) {
    validateTransition(
      node.transition,
      `${where}.transition`,
      catalog.transitions ?? new Set(),
      ctx,
    );
  }

  if (node.audio !== undefined) {
    validateAudio(node.audio, `${where}.audio`, catalog, ctx);
  }

  if (node.tone !== undefined) {
    requireString(node.tone, `${where}.tone`, ctx);
  }

  if (node.chapter !== undefined && (!Number.isInteger(node.chapter) || node.chapter < 1)) {
    ctx.errors.push(`${where}.chapter must be a positive integer`);
  }
  if (node.learn !== undefined && !(
    (typeof node.learn === "string" && node.learn.trim().length > 0)
    || (Array.isArray(node.learn) && node.learn.length > 0 && node.learn.every((item) => typeof item === "string" && item.trim().length > 0))
  )) {
    ctx.errors.push(`${where}.learn must be a non-empty string or an array of them`);
  }
  if (node.a11y !== undefined && !isObject(node.a11y)) {
    ctx.errors.push(`${where}.a11y must be an object`);
  }
}

function validateCast(cast, where, catalog, ctx) {
  if (!isObject(cast)) {
    ctx.errors.push(`${where} must be an object`);
    return;
  }

  let visible = 0;

  for (const [id, value] of Object.entries(cast)) {
    const at = `${where}.${id}`;
    const character = catalog.characters.get(id);

    if (!character) {
      ctx.errors.push(`${at} references unknown character "${id}"`);
      continue;
    }

    if (value === null) continue;

    if (typeof value === "string") {
      if (!character.expressions.has(value)) {
        ctx.errors.push(`${at} references unknown expression "${value}"`);
      }
      visible += 1;
      continue;
    }

    if (!isObject(value)) {
      ctx.errors.push(`${at} must be an expression name, null, or an object`);
      continue;
    }

    rejectUnknownKeys(value, ["expression", "at", "flip", "z"], at, ctx);
    const expression =
      value.expression ?? character.defaultExpression ?? [...character.expressions][0];
    if (!character.expressions.has(expression)) {
      ctx.errors.push(`${at}.expression references unknown expression "${expression}"`);
    }
    if (value.at !== undefined) {
      if (
        typeof value.at !== "string" ||
        !(catalog.positions instanceof Set) ||
        !catalog.positions.has(value.at)
      ) {
        ctx.errors.push(`${at}.at references unknown position preset "${value.at}"`);
      }
    }
    if (value.flip !== undefined && typeof value.flip !== "boolean") {
      ctx.errors.push(`${at}.flip must be a boolean`);
    }
    if (value.z !== undefined) requireNumber(value.z, `${at}.z`, ctx);
    visible += 1;
  }

  if (visible > 1) {
    ctx.errors.push(
      `${where} casts ${visible} characters; the current runtime renders one character per beat`,
    );
  }
}

function validateFlags(flags, where, ctx, setFlags) {
  if (flags === undefined) return;

  if (!isObject(flags)) {
    ctx.errors.push(`${where} must be an object`);
    return;
  }

  for (const [key, value] of Object.entries(flags)) {
    if (
      value !== null &&
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean"
    ) {
      ctx.errors.push(`${where}.${key} must be a string, number, boolean, or null`);
    }
    setFlags.add(key);
  }
}

function validateEffects(effects, where, ctx, setFlags) {
  if (effects === undefined) return;

  if (!isObject(effects)) {
    ctx.errors.push(`${where} must be an object`);
    return;
  }

  for (const [key, value] of Object.entries(effects)) {
    setFlags.add(key);
    if (isObject(value)) {
      rejectUnknownKeys(value, ["add"], `${where}.${key}`, ctx);
      requireNumber(value.add, `${where}.${key}.add`, ctx);
      continue;
    }
    if (
      value !== null &&
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean"
    ) {
      ctx.errors.push(
        `${where}.${key} must be a primitive or { add: number }`,
      );
    }
  }
}

function validateAudio(audio, where, catalog, ctx) {
  if (!isObject(audio)) {
    ctx.errors.push(`${where} must be an object`);
    return;
  }

  rejectUnknownKeys(audio, ["music", "sfx", "volume", "fade"], where, ctx);

  for (const key of ["music", "sfx"]) {
    if (audio[key] !== undefined) {
      if (typeof audio[key] !== "string" || !catalog.audio.has(audio[key])) {
        ctx.errors.push(`${where}.${key} references unknown audio "${audio[key]}"`);
      }
    }
  }

  if (audio.volume !== undefined) {
    if (typeof audio.volume !== "number" || audio.volume < 0 || audio.volume > 1) {
      ctx.errors.push(`${where}.volume must be a number between 0 and 1`);
    }
  }
  if (audio.fade !== undefined) requirePositiveNumber(audio.fade, `${where}.fade`, ctx);

  if (audio.music === undefined && audio.sfx === undefined) {
    ctx.warnings.push(`${where} does not select music or sfx`);
  }
}

function validateCondition(condition, where, nodeIds, readFlags, ctx) {
  if (!isObject(condition)) {
    ctx.errors.push(`${where} must be a condition object`);
    return;
  }

  const operators = Object.keys(condition);
  if (operators.length !== 1) {
    ctx.errors.push(`${where} must contain exactly one operator`);
    return;
  }

  const operator = operators[0];
  const value = condition[operator];

  if (operator === "flag") {
    if (typeof value !== "string" || value.length === 0) {
      ctx.errors.push(`${where}.flag must be a non-empty string`);
    } else {
      readFlags.add(value);
    }
    return;
  }

  if (operator === "seen") {
    if (typeof value !== "string" || !nodeIds.has(value)) {
      ctx.errors.push(`${where}.seen references unknown node "${value}"`);
    }
    return;
  }

  if (operator === "not") {
    validateCondition(value, `${where}.not`, nodeIds, readFlags, ctx);
    return;
  }

  if (operator === "all" || operator === "any") {
    if (!Array.isArray(value) || value.length === 0) {
      ctx.errors.push(`${where}.${operator} must be a non-empty array`);
      return;
    }
    value.forEach((item, index) => {
      validateCondition(item, `${where}.${operator}[${index}]`, nodeIds, readFlags, ctx);
    });
    return;
  }

  if (COMPARISONS.has(operator)) {
    if (!Array.isArray(value) || value.length !== 2) {
      ctx.errors.push(`${where}.${operator} must have exactly two operands`);
      return;
    }
    value.forEach((operand, index) => {
      validateOperand(operand, `${where}.${operator}[${index}]`, nodeIds, readFlags, ctx);
    });
    return;
  }

  ctx.errors.push(`${where} uses unknown operator "${operator}"`);
}

function validateOperand(operand, where, nodeIds, readFlags, ctx) {
  if (!isObject(operand)) {
    if (Array.isArray(operand)) {
      ctx.errors.push(`${where} must be a literal, { flag }, or { seen }`);
    }
    return;
  }

  const keys = Object.keys(operand);
  if (keys.length !== 1) {
    ctx.errors.push(`${where} must be a literal, { flag }, or { seen }`);
    return;
  }

  if (keys[0] === "flag") {
    if (typeof operand.flag !== "string" || operand.flag.length === 0) {
      ctx.errors.push(`${where}.flag must be a non-empty string`);
    } else {
      readFlags.add(operand.flag);
    }
    return;
  }

  if (keys[0] === "seen") {
    if (typeof operand.seen !== "string" || !nodeIds.has(operand.seen)) {
      ctx.errors.push(`${where}.seen references unknown node "${operand.seen}"`);
    }
    return;
  }

  ctx.errors.push(`${where} must be a literal, { flag }, or { seen }`);
}

function validateSpeaker(value, where, ctx) {
  if (value !== null && typeof value !== "string") {
    ctx.errors.push(`${where} must be a string or null`);
  }
}

function validateSize(size, where, ctx) {
  if (size === undefined) return;
  if (!isObject(size)) {
    ctx.errors.push(`${where} must be an object`);
    return;
  }
  rejectUnknownKeys(size, ["width", "height"], where, ctx);
  requirePositiveNumber(size.width, `${where}.width`, ctx);
  requirePositiveNumber(size.height, `${where}.height`, ctx);
}

function validatePivot(pivot, where, ctx) {
  if (pivot === undefined) return;
  if (!isObject(pivot)) {
    ctx.errors.push(`${where} must be an object`);
    return;
  }
  rejectUnknownKeys(pivot, ["x", "y"], where, ctx);
  for (const key of ["x", "y"]) {
    if (typeof pivot[key] !== "number" || pivot[key] < 0 || pivot[key] > 1) {
      ctx.errors.push(`${where}.${key} must be a number between 0 and 1`);
    }
  }
}

function expressionSources(value) {
  if (typeof value === "string") return [value];
  if (!isObject(value) || !Array.isArray(value.layers)) return [];

  return value.layers.map((layer) => (typeof layer === "string" ? layer : layer?.src)).filter(Boolean);
}

function resolveContentPath(reference, baseDir, contentDir) {
  if (typeof reference !== "string") return null;
  const resolved = path.resolve(baseDir, reference);
  return isWithin(contentDir, resolved) ? resolved : null;
}

function isWithin(baseDir, resolved) {
  const relative = path.relative(baseDir, resolved);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function resolvePublicPath(reference, publicDir) {
  if (typeof reference !== "string") return null;
  const clean = reference.replace(/^\/+/, "");
  const resolved = path.resolve(publicDir, clean);
  return isWithin(publicDir, resolved) ? resolved : null;
}

function resolveAssetPath(basePath, source, publicDir) {
  if (typeof source !== "string" || source.length === 0) return null;
  if (/^(?:https?:)?\/\//.test(source) || source.startsWith("data:")) return null;

  if (source.startsWith("/")) {
    return resolvePublicPath(source, publicDir);
  }

  const cleanBase = basePath.replace(/^\/+/, "");
  return resolvePublicPath(path.posix.join(cleanBase, source), publicDir);
}

async function checkFile(ctx, file, label) {
  try {
    await access(file);
  } catch {
    ctx.errors.push(`${label}: missing file ${path.relative(ctx.root, file)}`);
  }
}

async function readJson(file, label, ctx) {
  try {
    const text = await readFile(file, "utf8");
    return JSON.parse(text);
  } catch (error) {
    if (error?.code === "ENOENT") {
      ctx.errors.push(`${label}: file not found (${path.relative(ctx.root, file)})`);
    } else if (error instanceof SyntaxError) {
      ctx.errors.push(`${label}: invalid JSON (${error.message})`);
    } else {
      ctx.errors.push(`${label}: ${error.message}`);
    }
    return null;
  }
}

function rejectUnknownKeys(object, allowed, where, ctx) {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(object)) {
    if (!allowedSet.has(key)) {
      ctx.errors.push(`${where}.${key} is not a recognized field`);
    }
  }
}

function requireString(value, where, ctx) {
  if (typeof value !== "string" || value.trim().length === 0) {
    ctx.errors.push(`${where} must be a non-empty string`);
  }
}

function requireText(value, where, ctx) {
  if (typeof value !== "string" || value.trim().length === 0) {
    ctx.errors.push(`${where} must be a non-empty string`);
  }
}

function requireNumber(value, where, ctx) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    ctx.errors.push(`${where} must be a number`);
  }
}

function requirePositiveNumber(value, where, ctx) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    ctx.errors.push(`${where} must be a positive number`);
  }
}

function requireRef(value, where, nodeIds, ctx) {
  if (typeof value !== "string" || !nodeIds.has(value)) {
    ctx.errors.push(`${where} points to missing node "${value}"`);
  }
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function result(ctx) {
  ctx.stats.assets = ctx.assetKeys.size;
  return {
    ok: ctx.errors.length === 0,
    errors: ctx.errors,
    warnings: ctx.warnings,
    stats: ctx.stats,
  };
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const report = await validateContent();

  for (const warning of report.warnings) {
    console.warn(`warning: ${warning}`);
  }

  if (!report.ok) {
    console.error(`\nContent validation failed with ${report.errors.length} error(s):`);
    for (const error of report.errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  const { stories, nodes, scenes, assets } = report.stats;
  console.log(
    `Content is valid: ${stories} stories, ${nodes} nodes, ${scenes} scenes, ${assets} assets.`,
  );
}
