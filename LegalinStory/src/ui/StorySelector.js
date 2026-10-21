import { resolveStoryCover } from "../content/contentLoader.js";
import { t } from "../i18n.js";

/**
 * Library screen. Lists every story from the content index and starts the
 * selected one. Kept deliberately small: no routing, no state beyond local
 * storage save detection.
 */
export class StorySelector {
  /**
   * @param {HTMLElement} root
   * @param {{
   *   stories: Array<{ id: string, title: string, subtitle?: string, manifest: string, cover?: string }>,
   *   onSelect: (story: any) => void,
   * }} options
   */
  constructor(root, { stories, onSelect }) {
    this.root = root;
    this.onSelect = onSelect;

    root.innerHTML = `
      <main class="library-screen">
        <div class="library-shell">
          <header class="library-header">
            <p class="library-kicker">LegalinStory</p>
            <h1 class="library-title">${t("library.title")}</h1>
            <p class="library-intro">
              ${t("library.intro")}
            </p>
          </header>

          <section class="story-grid" data-stories aria-label="${t("library.storiesAria")}"></section>

          <footer class="library-footer">
            <span data-story-count></span>
            <span>${t("library.savedLocally")}</span>
          </footer>
        </div>
      </main>
    `;

    const grid = root.querySelector("[data-stories]");
    for (const story of stories) {
      grid.append(this.#createCard(story));
    }

    root.querySelector("[data-story-count]").textContent =
      t(stories.length === 1 ? "library.countOne" : "library.countMany", { count: stories.length });
  }

  #createCard(story) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "story-card";

    const cover = document.createElement("img");
    cover.className = "story-cover";
    cover.alt = "";
    cover.loading = "lazy";
    if (story.cover) cover.src = resolveStoryCover(story);

    const body = document.createElement("span");
    body.className = "story-body";

    const meta = document.createElement("span");
    meta.className = "story-meta";
    meta.textContent = this.#hasSave(story.id) ? t("library.continue") : t("library.newStory");

    const title = document.createElement("span");
    title.className = "story-title";
    title.textContent = story.title;

    const subtitle = document.createElement("span");
    subtitle.className = "story-subtitle";
    subtitle.textContent = story.subtitle ?? "";

    body.append(meta, title, subtitle);

    if (this.#hasSave(story.id)) {
      const progress = document.createElement("span");
      progress.className = "story-progress";
      progress.textContent = t("library.savedProgress");
      body.append(progress);
    }

    button.append(cover, body);
    button.addEventListener("click", () => this.onSelect(story));

    return button;
  }

  #hasSave(storyId) {
    try {
      return Boolean(globalThis.localStorage?.getItem(`${storyId}.save`));
    } catch {
      return false;
    }
  }
}
