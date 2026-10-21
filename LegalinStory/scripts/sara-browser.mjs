import assert from "node:assert/strict";
import { createServer } from "vite";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const server = await createServer({ logLevel: "silent", server: { host: "127.0.0.1", port: 0 } });
let browser;
try {
  await server.listen();
  const url = server.resolvedUrls.local[0];
  browser = await chromium.launch({ channel: "chromium", headless: true });
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
    const errors = [], external = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
    page.on("request", (r) => { if (!r.url().startsWith(url) && !r.url().startsWith("data:")) external.push(r.url()); });
    await page.goto(url);
    await page.getByRole("heading", { name: "Sara", exact: true }).waitFor();
    await page.screenshot({ path: `/tmp/sara-start-${viewport.width}.png` });
    const variant = viewport.width === 390 ? "no-conviction" : "conviction";
    if (variant === "no-conviction") {
      await page.getByText("Opciones de la demostración", { exact: true }).click();
      await page.locator("[data-sara-resolution]").selectOption(variant);
    }
    await page.getByRole("button", { name: "Acompañar a Sara" }).click();
    await page.locator("[data-interstitial-next]").waitFor({ state: "visible" });
    await page.keyboard.press("Enter");
    await page.locator('#app[data-sara-node="c1-01"]').waitFor();
    await page.getByRole("button", { name: "Pausar historia", exact: true }).click();
    await page.getByRole("heading", { name: "Podemos parar aquí" }).waitFor();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#app").getAttribute("data-sara-node"), "c1-01");
    const visited = new Set();
    const route = { "c1-choice": "time", "c2-choice": "privacy", "c2-choice2": "short", "c3-choice": "dani", "c4-choice": "volleyball", "c5-choice": "people", "c5-choice2": "pause" };
    let checkedBack = false;
    for (let guard = 0; guard < 170; guard++) {
      const id = await page.locator("#app").getAttribute("data-sara-node");
      visited.add(id);
      if (id === "epilogue") break;
      if (await page.locator("[data-interstitial]").isVisible()) {
        await page.locator("[data-interstitial-next]").click();
      } else if (await page.locator("[data-choices]").isVisible()) {
        const bounds = await page.evaluate(() => {
          const prompt = document.querySelector("[data-panel]").getBoundingClientRect();
          const choices = document.querySelector("[data-choices]").getBoundingClientRect();
          const nav = document.querySelector(".sara-bottom").getBoundingClientRect();
          const horizontalSeparation = choices.left >= prompt.right || choices.right <= prompt.left;
          return { separated: horizontalSeparation || choices.top >= prompt.bottom, aboveNav: choices.bottom <= nav.top, overflow: document.documentElement.scrollWidth > innerWidth };
        });
        assert.ok(bounds.separated && bounds.aboveNav && !bounds.overflow, `Decision layout at ${id}: ${JSON.stringify(bounds)}`);
        if (id === "c1-choice") {
          await page.screenshot({ path: `/tmp/sara-choice-${viewport.width}.png` });
          if (!checkedBack) {
            await page.locator(".choice").first().click();
            await page.locator('#app[data-sara-node="c1-partial"]').waitFor();
            await page.getByRole("button", { name: "Volver", exact: true }).click();
            await page.locator('#app[data-sara-node="c1-choice"]').waitFor();
            checkedBack = true;
          }
        }
        const optionIds = {
          "c1-choice": ["partial", "time", "what"], "c1-choice2": ["door", "company"],
          "c2-choice": ["privacy", "dad", "alone"], "c2-choice2": ["short", "overview"],
          "c3-choice": ["dani", "privacy", "home"], "c3-choice2": ["contact", "school"],
          "c4-choice": ["volleyball", "school", "friends"], "c4-choice2": ["boundary", "laura"],
          "c5-choice": ["people", "room", "rights"], "c5-choice2": ["repeat", "memory", "pause"],
          "c6-choice": ["news", "dad", "privacy"], "c6-choice2": ["play", "quiet"],
        };
        const index = Math.max(0, optionIds[id].indexOf(route[id]));
        await page.locator(".choice").nth(index).click();
      } else {
        if (id === "c2-07") await page.screenshot({ path: `/tmp/sara-irene-${viewport.width}.png` });
        await page.locator("[data-advance]").click();
      }
    }
    assert.ok(visited.has("epilogue"), "The story must complete");
    for (const id of ["c4-dani", "c5-privacy", "c5-short", "epilogue-volley", variant === "conviction" ? "c6-conviction" : "c6-no-conviction"]) assert.ok(visited.has(id), `Missing ${id}`);
    await page.screenshot({ path: `/tmp/sara-epilogue-${viewport.width}.png` });
    await page.getByRole("button", { name: /Recorrido/ }).click();
    await page.locator(".sara-map-step summary").first().click();
    assert.equal(await page.locator(".sara-map-step").count(), 8);
    await page.screenshot({ path: `/tmp/sara-map-${viewport.width}.png` });
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /Personas/ }).click();
    await page.locator(".sara-person summary").filter({ hasText: "Fiscalía" }).click();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /Cuaderno/ }).click();
    assert.ok(await page.locator(".sara-note").count() >= 5);
    await page.keyboard.press("Tab");
    assert.ok(await page.evaluate(() => document.querySelector("[data-sara-overlay]").contains(document.activeElement)));
    await page.keyboard.press("Escape");
    assert.equal(await page.evaluate(() => localStorage.getItem("sara.save")), null, "Default play stays in memory");
    await page.getByRole("button", { name: "Volver a empezar", exact: true }).click();
    await page.getByRole("button", { name: "Borrar progreso y empezar" }).click();
    await page.getByRole("heading", { name: "Sara", exact: true }).waitFor();
    assert.deepEqual(errors, []);
    assert.deepEqual(external, [], "Story choices and assets must remain on the same origin");
    await page.close();
    console.log(`Sara browser passed ${viewport.width}×${viewport.height}: complete story, ${variant}, back, keyboard, panels, layout and no third-party requests.`);
  }
  const page = await browser.newPage({ reducedMotion: "reduce" });
  await page.goto(url);
  await page.locator("[data-sara-save]").check();
  await page.getByRole("button", { name: "Acompañar a Sara" }).click();
  await page.locator("[data-interstitial-next]").click();
  const savedNode = await page.locator("#app").getAttribute("data-sara-node");
  await page.reload();
  await page.getByRole("button", { name: "Continuar mi recorrido guardado" }).click();
  assert.equal(await page.locator("#app").getAttribute("data-sara-node"), savedNode);
  await page.getByRole("button", { name: "Volver", exact: true }).click();
  assert.equal(await page.locator("#app").getAttribute("data-sara-node"), "start");
  await page.getByRole("button", { name: "Pausar historia", exact: true }).click();
  await page.getByRole("button", { name: "Borrar el guardado del dispositivo" }).click();
  assert.equal(await page.evaluate(() => localStorage.getItem("sara.save")), null);
  await page.close();
  if (process.env.PLATFORM_URL) {
    const page = await browser.newPage({ reducedMotion: "reduce", viewport: { width: 390, height: 844 } });
    await page.goto(process.env.PLATFORM_URL + "/novela");
    const frame = page.frameLocator("#novela-frame");
    await frame.getByRole("heading", { name: "Sara", exact: true }).waitFor();
    await frame.getByRole("button", { name: "Acompañar a Sara" }).click();
    await frame.locator("[data-interstitial-next]").click();
    await frame.getByRole("button", { name: "Pausar historia", exact: true }).click();
    await frame.getByRole("button", { name: "Salir de la historia", exact: true }).click();
    await page.waitForURL(process.env.PLATFORM_URL.replace(/\/$/, "") + "/");
    await page.close();
    console.log("Sara Next.js iframe entry and exit passed.");
  }
} finally { await browser?.close(); await server.close(); }
