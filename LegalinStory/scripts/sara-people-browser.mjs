// Targeted browser coverage for the child-facing people reference, without telemetry.
import assert from "node:assert/strict";
import { createServer } from "vite";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const server = await createServer({ logLevel: "error", server: { host: "127.0.0.1", port: 0 } });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const cases = [
    ...[{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }].map((viewport) => ({ lang: "es", viewport })),
    ...["ca", "va", "gl", "eu", "oc"].map((lang) => ({ lang, viewport: { width: 390, height: 844 } })),
  ];
  for (const { lang, viewport } of cases) {
    const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/telemetria/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
    await page.addInitScript(() => {
      localStorage.setItem("sara.save", JSON.stringify({ nodeId: "c5-team", flags: { resolution: "conviction" }, seen: [], stage: { background: "quiet-room" } }));
    });
    await page.goto(`${server.resolvedUrls.local[0]}?lang=${lang}`);
    await page.locator("[data-sara-resume]").click();
    const dialog = page.locator(".is-people [role=dialog]");
    await dialog.waitFor({ state: "visible" });
    const title = await dialog.locator("h1").textContent();
    assert.equal(await dialog.locator(".sara-person-toggle").count(), 9);
    assert.equal(await dialog.evaluate((node) => node.scrollWidth > node.clientWidth), false, "Table overflows the dialog");
    assert.ok(await dialog.locator(".sara-people-scroll").evaluate((node) => node.clientHeight >= 120), "The table must leave enough height to read a full row");
    const person = dialog.locator('[data-person-id="irene"]');
    await person.focus();
    await page.keyboard.press("Enter");
    assert.equal(await person.getAttribute("aria-expanded"), "true");
    const other = dialog.locator('[data-person-id="elena"]');
    await other.focus();
    await page.keyboard.press("Enter");
    assert.equal(await person.getAttribute("aria-expanded"), "false", "Opening a row closes the previous one");
    assert.equal(await other.getAttribute("aria-expanded"), "true");
    await page.keyboard.press("Space");
    assert.equal(await other.getAttribute("aria-expanded"), "false");
    assert.equal(await page.locator("#app").getAttribute("data-sara-node"), "c5-team");
    await page.screenshot({ path: `/tmp/sara-people-${lang === "es" ? "" : lang + "-"}${viewport.width}.png` });
    await dialog.locator("[data-sara-people-continue]").click();
    await page.locator('#app[data-sara-node="c5-choice"]').waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: title, exact: true }).click();
    await dialog.waitFor({ state: "visible" });
    // The same reference opened from pause must not skip a line on close.
    await dialog.locator("[data-sara-people-continue]").click();
    assert.equal(await page.locator("#app").getAttribute("data-sara-node"), "c5-choice");
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`People table ${lang} ${viewport.width}×${viewport.height}: automatic opening, keyboard, layout, continue and menu passed.`);

    const judgePage = await browser.newPage({ viewport, reducedMotion: "reduce" });
    judgePage.on("pageerror", (error) => errors.push(error.message));
    await judgePage.route("**/api/telemetria/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
    await judgePage.addInitScript(() => {
      localStorage.setItem("sara.save", JSON.stringify({ nodeId: "c5-06", flags: { resolution: "conviction" }, seen: [], stage: { background: "court-friendly" } }));
    });
    await judgePage.goto(`${server.resolvedUrls.local[0]}?lang=${lang}`);
    await judgePage.locator("[data-sara-resume]").click();
    const badge = judgePage.locator('button[data-legal-badge][data-person-id="judge"]');
    await badge.waitFor({ state: "visible" });
    await judgePage.waitForFunction(() => document.querySelector('.sara-cast [data-person="Jueza"] img')?.dataset.bodyRegion);
    assert.equal(await judgePage.locator('.sara-cast [data-person="Jueza"] img').evaluate((image) => {
      const picture = image.getBoundingClientRect();
      const frame = image.parentElement.getBoundingClientRect();
      // Source landmarks: crown at y=10, hand and book at y=950.
      return picture.top + 10 / image.naturalHeight * picture.height >= frame.top &&
        picture.top + 950 / image.naturalHeight * picture.height <= frame.bottom;
    }), true, "The judge's crown, hand and book fit inside the portrait");
    await badge.click();
    const profile = judgePage.locator(".is-person [role=dialog]");
    await profile.waitFor({ state: "visible" });
    assert.equal(await profile.locator('[data-sara-body][data-person-id="judge"]').count(), 1);
    assert.equal(await profile.locator(".sara-person-explanation").count(), 1);
    assert.equal(await profile.locator("table").count(), 0, "The badge opens only that character's explanation");
    assert.equal(await profile.evaluate((node) => node.scrollWidth > node.clientWidth || node.scrollHeight > node.clientHeight), false, "The short explanation fits on screen");
    assert.equal(await judgePage.locator("#app").getAttribute("data-sara-node"), "c5-06");
    await judgePage.screenshot({ path: `/tmp/sara-judge-profile-${lang}-${viewport.width}.png` });
    await judgePage.keyboard.press("Escape");
    assert.equal(await profile.isVisible(), false);
    assert.equal(await badge.evaluate((node) => node === document.activeElement), true, "Closing restores focus to the badge");
    assert.equal(await judgePage.locator("#app").getAttribute("data-sara-node"), "c5-06");
    await badge.focus();
    await judgePage.keyboard.press("Enter");
    await profile.waitFor({ state: "visible" });
    await profile.locator(".sara-primary").click();
    assert.equal(await judgePage.locator("#app").getAttribute("data-sara-node"), "c5-06");
    await judgePage.screenshot({ path: `/tmp/sara-judge-${lang}-${viewport.width}.png` });
    await judgePage.locator("[data-advance]").click();
    await judgePage.locator('#app[data-sara-node="c5-07"]').waitFor();
    assert.equal(await badge.isVisible(), false, "The judge badge leaves with the judge");
    assert.deepEqual(errors, []);
    await judgePage.close();
    console.log(`Judge ${lang} ${viewport.width}×${viewport.height}: contextual explanation, keyboard, focus and return to scene passed.`);
  }
} finally {
  await browser?.close();
  await server.close();
}
