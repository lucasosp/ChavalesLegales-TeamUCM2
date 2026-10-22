// End-to-end checks for the child-facing novel, including all drawing checkpoints.
import assert from "node:assert/strict";
import { createServer } from "vite";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const server = await createServer({ logLevel: "error", server: { host: "127.0.0.1", port: 0 } });
let browser;
try {
  await server.listen();
  const url = server.resolvedUrls.local[0];
  browser = await chromium.launch({ headless: true });
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
    const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
    const errors = [], decisions = [];
    await page.route('**/api/telemetria/**', async route => {
      if (route.request().url().endsWith('/decision')) decisions.push(route.request().postDataJSON());
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await page.goto(url);
    await page.getByRole("heading", { name: "Sara", exact: true }).waitFor();
    await page.screenshot({ path: `/tmp/sara-start-${viewport.width}.png` });
    assert.equal(await page.locator('.sara-bottom, [data-sara-action="map"], [data-sara-action="people"], [data-sara-action="notebook"]').count(), 0);
    await page.locator('[data-sara-start]').click();
    const draw = async () => {
      const canvas = page.locator('.sara-drawing-canvas');
      await canvas.scrollIntoViewIfNeeded();
      const bounds = await canvas.boundingBox();
      assert.ok(Math.abs(bounds.width-bounds.height)<1, 'The drawing canvas must stay square');
      const overflow = await page.locator('.sara-drawing-card').evaluate(card => card.scrollWidth > card.clientWidth);
      assert.equal(overflow,false,'Drawing tools overflow the card');
      await page.mouse.move(bounds.x + bounds.width * .4, bounds.y + bounds.height * .4);
      await page.mouse.down();
      await page.mouse.move(bounds.x + bounds.width * .6, bounds.y + bounds.height * .6, { steps: 8 });
      await page.mouse.up();
      // Focus must stay in the drawing, and the story must not advance behind it.
      const before = await page.locator('#app').getAttribute('data-sara-node');
      await page.keyboard.press('Tab');
      assert.ok(await page.evaluate(() => document.querySelector('.sara-drawing-overlay').contains(document.activeElement)));
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#app').getAttribute('data-sara-node'), before);
      await page.screenshot({ path: `/tmp/sara-drawing-${viewport.width}.png` });
      await page.locator('[data-action="confirm"]').click();
      await page.locator('.sara-drawing-overlay').waitFor({ state: 'hidden' });
    };
    await draw();
    await page.locator('[data-interstitial-next]').click();
    await page.locator('#app[data-sara-node="c1-01"]').waitFor();
    // A reload restores the scene and keeps the first drawing.
    await page.reload();
    await page.locator('[data-sara-resume]').click();
    await page.locator('#app[data-sara-node="c1-01"]').waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('heading', { name: 'Un pequeño descanso' }).waitFor();
    assert.ok(await page.locator('.sara-pause-profile img').isVisible());
    const atPause = await page.locator('#app').getAttribute('data-sara-node');
    await page.getByRole('checkbox', { name: 'Guardar en este dispositivo' }).focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('Space');
    assert.equal(await page.locator('#app').getAttribute('data-sara-node'), atPause);
    await page.getByRole('button', { name: 'Letra más grande' }).click();
    assert.equal(await page.getByRole('button', { name: 'Letra más grande' }).getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: 'Letra más grande' }).click();
    await page.getByRole('button', { name: 'Necesito ayuda' }).click();
    assert.ok(await page.locator('a[href="tel:112"]').isVisible());
    await page.keyboard.press('Escape');
    const visited = new Set();
    for (let guard = 0; guard < 170; guard++) {
      const id = await page.locator('#app').getAttribute('data-sara-node');
      visited.add(id);
      if (await page.locator('[data-sara-people-continue]').isVisible()) {
        await page.locator('[data-sara-people-continue]').click();
        continue;
      }
      if (await page.locator('.sara-drawing-canvas').count()) { await draw(); continue; }
      if (await page.locator('.sara-phase3-card').count()) {
        await page.locator('[data-choice="phase1"]').focus();
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('[data-choice="phase1"]').getAttribute('aria-pressed'), 'true');
        await page.locator('[data-action="confirm-choice"]').click();
        continue;
      }
      if (id === 'epilogue') break;
      if (await page.locator('[data-interstitial]').isVisible()) await page.locator('[data-interstitial-next]').click();
      else if (await page.locator('[data-choices]').isVisible()) {
        const boxes = await page.evaluate(() => {
          const p = document.querySelector('[data-panel]').getBoundingClientRect();
          const c = document.querySelector('[data-choices]').getBoundingClientRect();
          return { separated: c.top >= p.bottom || c.left >= p.right || c.right <= p.left, fits: c.bottom <= innerHeight && c.right <= innerWidth };
        });
        assert.ok(boxes.separated && boxes.fits, `Decision layout: ${id}`);
        await page.locator('.choice').first().click();
      } else await page.locator('[data-advance]').click();
    }
    assert.ok(visited.has('epilogue'), 'The full story must complete');
    assert.ok(visited.has('c5-06'), 'The judge scene must be reached');
    assert.ok(await page.locator('.sara-ending-avatar-card img').isVisible());
    await page.screenshot({ path: `/tmp/sara-epilogue-${viewport.width}.png` });
    assert.equal(await page.evaluate(() => localStorage.getItem('sara.save')), null);
    assert.equal(decisions.length, new Set(decisions.map(d => d.node_id)).size, 'A decision was sent twice');
    assert.ok(decisions.length >= 10);
    await page.getByRole('button', { name: 'Volver a empezar', exact: true }).click();
    await page.getByRole('button', { name: 'Sí, volver a empezar' }).click();
    await page.getByRole('heading', { name: 'Sara', exact: true }).waitFor();
    assert.equal(await page.locator('[data-sara-resume]').count(), 0);
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`Sara ${viewport.width}×${viewport.height}: complete story, three drawing checkpoints, keyboard, save/resume, pause/help, decisions and restart passed.`);
  }
} finally { await browser?.close(); await server.close(); }
