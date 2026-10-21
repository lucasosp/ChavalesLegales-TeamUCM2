// Optional real-browser checks. Set PLAYWRIGHT_MODULE_PATH when installed outside this project.
import assert from "node:assert/strict";
import { createServer } from "vite";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const server = await createServer({ logLevel: "silent", server: { host: "127.0.0.1", port: 0 } });
let browser;
try {
  await server.listen();
  const url = server.resolvedUrls.local[0];
  const legacyUrl = `${url}?story=no-lo-reenvies`;
  browser = await chromium.launch({ channel: "chromium", headless: true });
  if (process.env.PLATFORM_URL) {
    const page = await browser.newPage({ reducedMotion: "reduce", viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    page.on("console", (message) => { if (message.type() === "error") errors.push(`${message.text()} ${message.location().url}`); });
    await page.goto(process.env.PLATFORM_URL);
    await page.locator('a[href="/novela"]').first().click();
    const frame = page.frameLocator("#novela-frame");
    await frame.getByRole("heading", { name: "Sara", exact: true }).waitFor();
    assert.equal(await page.locator("#novela-frame").count(), 1);
    await frame.getByRole("button", { name: "Acompañar a Sara" }).click();
    await frame.getByRole("button", { name: "Continuar", exact: true }).click();
    await frame.locator("[data-text]").filter({ hasText: "Sara" }).waitFor();
    await frame.getByRole("button", { name: "Pausar historia", exact: true }).click();
    await frame.getByRole("button", { name: "Salir de la historia", exact: true }).click();
    await page.waitForURL(process.env.PLATFORM_URL.replace(/\/$/, "") + "/");
    assert.deepEqual(errors, []);
    await page.close();
    console.log("Production Next.js integration, relative assets, help link and exit passed");
  }
  for (const viewport of [{ width: 1920, height: 1080 }, { width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1280, height: 720 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 844, height: 390 }]) {
    const page = await browser.newPage({ reducedMotion: "reduce" });
    await page.setViewportSize(viewport);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.goto(legacyUrl);
    await page.getByRole("heading", { name: "Antes de empezar...", exact: true }).waitFor();
    await page.getByRole("button", { name: "Comenzar historia" }).click();
    assert.equal(await page.locator("[data-restart], [data-ending-restart]").count(), 0, "no restart controls should be present");
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    assert.equal(await page.locator("[data-speaker-name]").isVisible(), false);
    await page.keyboard.press("Enter");

    const resume = async (nodeId) => {
      await page.evaluate((id) => localStorage.setItem("no-lo-reenvies.save", JSON.stringify({ nodeId: id, flags: {}, seen: [], stage: { background: "orientation-office", character: { id: "sara", expression: "neutral" } } })), nodeId);
      await page.reload();
    };
    await resume("ch4-11");
    const text = page.locator("[data-text]");
    await text.filter({ hasText: "compañeros" }).waitFor();
    await page.locator("[data-advance]").waitFor({ state: "visible" });
    const panel = await page.locator("[data-panel]").boundingBox();
    const textBox = await text.boundingBox();
    const advanceBox = await page.locator("[data-advance]").boundingBox();
    assert.ok(panel.y >= 0 && panel.y + panel.height <= viewport.height, "dialogue must fit the viewport");
    assert.ok(textBox.y + textBox.height <= advanceBox.y, "text and continue control must have separate rows");
    assert.equal(await text.evaluate((el) => el.scrollWidth > el.clientWidth + 1), false);
    assert.ok(await text.evaluate((el) => parseFloat(getComputedStyle(el).fontSize) >= 20), "dialogue text must be at least 20px");
    assert.ok(await text.evaluate((el) => el.scrollHeight <= el.clientHeight + 1), "dialogue text must fit without clipping or inner scrolling");
    await page.screenshot({ path: `/tmp/novela-dialogue-${viewport.width}.png` });

    await resume("ch4-2");
    const shortPanel = await page.locator("[data-panel]").boundingBox();
    assert.equal(Math.round(shortPanel.height), Math.round(panel.height), "dialogue frame must keep the same height between lines");

    await resume("decision-2");
    const choices = page.locator("[data-choices]");
    await choices.waitFor({ state: "visible" });
    await page.waitForTimeout(220);
    const promptBox = await page.locator("[data-panel]").boundingBox();
    const choicesBox = await choices.boundingBox();
    const promptStyle = await page.locator("[data-panel]").evaluate((el) => ({ minHeight: getComputedStyle(el).minHeight, maxHeight: getComputedStyle(el).maxHeight, height: getComputedStyle(el).height, viewport: innerHeight }));
    assert.ok(promptBox.y + promptBox.height <= choicesBox.y, `prompt and decisions must not overlap: ${JSON.stringify({ promptBox, choicesBox, promptStyle })}`);
    await page.getByRole("button", { name: /Pedir a Julia/ }).click();

    await resume("needs-menu");
    await page.locator("[data-interstitial]").waitFor();
    assert.equal(await page.locator("[data-interstitial-title]").textContent(), "¿Qué necesita Sara para hablar?");
    await page.screenshot({ path: `/tmp/novela-support-${viewport.width}.png` });
    await page.locator("[data-interstitial-next]").click();

    await resume("ch5-minigame");
    assert.equal(await page.locator("[data-interstitial-title]").textContent(), "Organiza la información");
    await page.locator("[data-interstitial-next]").click();
    await resume("final1");
    await page.getByRole("button", { name: "Conoce tus derechos" }).click();
    await page.getByRole("link", { name: /INCIBE/ }).waitFor();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("[data-rights]").isVisible(), false);
    await resume("ch1-chat-1");
    const preview = page.locator(".censored-preview").first();
    await preview.waitFor();
    assert.equal(await preview.getAttribute("aria-label"), "Imagen censurada; el contenido no se muestra");
    assert.ok(await preview.locator("img").evaluate((img) => img.complete && img.naturalWidth > 0), "pixelated preview must load");
    assert.ok(await page.locator(".chat-text").first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize) >= 17), "chat text must be larger");
    await preview.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `/tmp/novela-censored-${viewport.width}.png` });
    assert.deepEqual(errors, []);
    console.log(`Browser checks passed at ${viewport.width}×${viewport.height}`);
    await page.close();
  }
  const embeddedPage = await browser.newPage({ reducedMotion: "reduce" });
  await embeddedPage.goto(url);
  await embeddedPage.evaluate(() => localStorage.setItem("no-lo-reenvies.save", JSON.stringify({ nodeId: "final1", flags: { stale: true }, seen: [] })));
  await embeddedPage.evaluate((src) => { document.body.innerHTML = `<iframe id="fresh-entry-frame" src="${src}"></iframe>`; }, url);
  const embeddedNovel = embeddedPage.frameLocator("#fresh-entry-frame");
  await embeddedNovel.getByRole("heading", { name: "Antes de empezar...", exact: true }).waitFor();
  assert.equal(await embeddedPage.evaluate(() => localStorage.getItem("no-lo-reenvies.save")), null, "embedded entry should clear an earlier save");
  assert.equal(await embeddedNovel.locator(".topbar-actions > *").count(), 1, "only the exit control should remain in the embedded top bar");
  await embeddedPage.close();

  const page = await browser.newPage({ reducedMotion: "no-preference" });
  await page.goto(legacyUrl);
  await page.evaluate(() => localStorage.setItem("no-lo-reenvies.save", JSON.stringify({ nodeId: "ch1-chat-1", flags: {}, seen: [], stage: {} })));
  await page.reload();
  await page.locator("[data-chat]").waitFor({ state: "visible" });
  await page.locator("[data-chat-skip]").click();
  assert.equal(await page.locator(".is-hidden-content").count(), 1);
  assert.equal(await page.locator("[data-restart], [data-ending-restart]").count(), 0, "restart controls should stay removed");
  await page.close();
} finally { await browser?.close(); await server.close(); }
