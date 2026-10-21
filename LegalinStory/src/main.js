import { App } from "./app/App.js";
import { SaraExperience } from "./app/SaraExperience.js";
import {
  loadStory,
  loadStoryIndex,
  localizeDocument,
  localizeGuide,
  resolveCharacterAsset,
} from "./content/contentLoader.js";
import { getLang, hasKey, t } from "./i18n.js";
import { LocalStorageSaveStore } from "./services/saveStores.js";
import "./styles/main.css";
import "./styles/sara.css";
import "./styles/stage.css";

const root = document.querySelector("#app");
document.documentElement.lang = getLang();

let index = null;
let app = null;
let session = 0;

// Story names from the index are Spanish; show the localized name when known.
const storyTitle = (entry) => (getLang() !== "es" && hasKey(`storyTitles.${entry.id}`) ? t(`storyTitles.${entry.id}`) : entry.title);

async function init() {
  showLoading(t("storyTitles.sara"));

  try {
    index = await loadStoryIndex();

    const requestedId = new URLSearchParams(location.search).get("story");
    const requested = requestedId
      ? index.stories.find((story) => story.id === requestedId)
      : null;

    if (requested) {
      history.replaceState({}, "", location.pathname);
      await startStory(requested);
    } else {
      await startStory(index.stories[0]);
    }
  } catch (error) {
    showError(error, { retry: true });
  }
}

function showLibrary() {
  session += 1;
  app?.destroy();
  app = null;

  // When embedded, the host owns navigation. Standalone use returns to the platform.
  if (window.parent !== window) window.parent.postMessage({ type: "legalinstory:exit" }, location.origin);
  else {
    const local = ["localhost", "127.0.0.1"].includes(location.hostname);
    location.assign(import.meta.env.VITE_PLATFORM_URL || (local ? `${location.protocol}//${location.hostname}:3000/` : "/"));
  }
}

async function startStory(entry) {
  const token = ++session;

  app?.destroy();
  app = null;

  const url = new URL(location.href);
  url.searchParams.set("story", entry.id);
  history.replaceState({}, "", url);

  showLoading(storyTitle(entry));

  try {
    const content = await loadStory(entry);
    if (token !== session) return;
    if (getLang() !== "es" && !content.overlay?.title) content.title = storyTitle(entry);

    document.title = `${content.title} — LegalinStory`;
    preloadCharacterArt(content.assets);

    if (entry.id === "sara") {
      const [rawGuide, rawLegal] = await Promise.all(["guide", "legal"].map(async (name) => {
        const response = await fetch(new URL(`content/stories/sara/${name}.json`, document.baseURI));
        if (!response.ok) throw new Error(t("load.saraInfoError", { name }));
        return response.json();
      }));
      // Translated guide/legal come from the same optional overlay as the story.
      const guide = localizeGuide(rawGuide, content.overlay?.guide);
      const legal = localizeDocument(rawLegal, content.overlay?.legal);
      if (token !== session) return;
      app = new SaraExperience({ root, content, guide, legal, onExit: showLibrary });
      return;
    }

    const saveStore = new LocalStorageSaveStore(`${entry.id}.save`);
    // The platform launches the novel in a fresh iframe each time. Start a
    // clean run on entry while preserving save/resume for standalone use.
    if (window.parent !== window) saveStore.clear();

    app = new App({
      root,
      story: content.story,
      startId: content.startId,
      title: content.title,
      saveStore,
      resolveCharacter: content.resolveCharacter,
      resolveCharacterName: content.resolveCharacterName,
      resolveBackground: content.resolveBackground,
      resolveSceneLabel: content.resolveSceneLabel,
      rights: content.rights,
      onExit: showLibrary,
    });
    app.start();
  } catch (error) {
    if (token !== session) return;
    showError(error, { retry: false });
  }
}

function showLoading(title) {
  root.innerHTML = `
    <main class="load-screen" aria-busy="true">
      <p class="library-kicker">Chavales Legales</p>
      <h1 class="load-title" data-load-title></h1>
      <span class="load-pulse" aria-hidden="true"></span>
    </main>
  `;
  document.title = t("load.opening", { title });
  root.querySelector("[data-load-title]").textContent = title;
}

function showError(error, { retry }) {
  console.error(error);
  document.title = t("load.errorDocTitle");

  root.innerHTML = `
    <main class="load-screen">
      <p class="library-kicker">${t("load.errorKicker")}</p>
      <h1 class="load-title">${t("load.errorTitle")}</h1>
      <p class="load-message" data-error></p>
      <button class="load-button" type="button" data-retry></button>
    </main>
  `;

  root.querySelector("[data-error]").textContent =
    error instanceof Error ? error.message : String(error);

  const button = root.querySelector("[data-retry]");
  button.textContent = t("load.retry");
  button.addEventListener("click", () => init());
}

function preloadCharacterArt(assets) {
  if (typeof Image !== "function") return;

  for (const [id, character] of Object.entries(assets.characters ?? {})) {
    for (const expression of Object.keys(character.expressions ?? {})) {
      const image = new Image();
      image.src = resolveCharacterAsset(assets, { id, expression });
    }
  }
}

init();
