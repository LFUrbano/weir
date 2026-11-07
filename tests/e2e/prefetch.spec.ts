import { expect, test } from "@playwright/test";

/**
 * The client router prefetches each link's segment data (`__next.*.txt`) as
 * the link scrolls into view. Every one of those files must exist in the
 * export, so a prefetch never 404s (and a navigation never falls back to a
 * full page load).
 */
const pages = ["/", "/models/", "/models/llama-3-3-70b/", "/pricing/", "/enterprise/", "/docs/quickstart/"];

/** How long the started and settled counts must agree before the check runs. */
const SETTLE_MS = 750;

for (const path of pages) {
  test(`no prefetch 404s on ${path}`, async ({ page }) => {
    const failed: string[] = [];
    let started = 0;
    let settled = 0;
    let lastChange = Date.now();
    const isSegment = (url: string) => new URL(url).pathname.endsWith(".txt");
    page.on("request", (r) => {
      if (!isSegment(r.url())) return;
      started++;
      lastChange = Date.now();
    });
    const settle = () => {
      settled++;
      lastChange = Date.now();
    };
    page.on("requestfinished", (r) => {
      if (isSegment(r.url())) settle();
    });
    page.on("requestfailed", (r) => {
      if (!isSegment(r.url())) return;
      failed.push(`failed ${new URL(r.url()).pathname}`);
      settle();
    });
    page.on("response", (r) => {
      if (r.status() >= 400) failed.push(`${r.status()} ${new URL(r.url()).pathname}`);
    });

    await page.goto(path);
    // Bring every link into view so the router prefetches all of them.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight / 2) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 50));
      }
    });
    // The router prefetches from idle callbacks, in waves: wait until every
    // segment request that started has settled, and nothing new has started
    // for a moment. networkidle alone can return before the first wave.
    await expect
      .poll(() => started > 0 && settled === started && Date.now() - lastChange >= SETTLE_MS, {
        message: "segment prefetches started and all settled",
        timeout: 15_000,
      })
      .toBe(true);
    expect(failed).toEqual([]);
  });
}
