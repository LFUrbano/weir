import { expect, test } from "@playwright/test";

/**
 * The client router prefetches each link's segment data (`__next.*.txt`) as
 * the link scrolls into view. Every one of those files must exist in the
 * export, so a prefetch never 404s (and a navigation never falls back to a
 * full page load).
 */
const pages = ["/", "/models/", "/models/llama-3-3-70b/", "/pricing/", "/enterprise/", "/docs/quickstart/"];

for (const path of pages) {
  test(`no prefetch 404s on ${path}`, async ({ page }) => {
    const failed: string[] = [];
    const prefetched: string[] = [];
    page.on("response", (r) => {
      const { pathname } = new URL(r.url());
      if (pathname.endsWith(".txt")) prefetched.push(pathname);
      if (r.status() >= 400) failed.push(`${r.status()} ${pathname}`);
    });

    await page.goto(path);
    // Bring every link into view so the router prefetches all of them.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight / 2) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 50));
      }
    });
    await page.waitForLoadState("networkidle");

    expect(prefetched.length, "the router prefetched segment files").toBeGreaterThan(0);
    expect(failed).toEqual([]);
  });
}
