import { expect, test } from "@playwright/test";

/**
 * The page must not move when the web fonts replace their fallbacks.
 *
 * On a real network the first frame can paint before the preloaded fonts
 * arrive, so text first renders in the fallback faces from globals.css and
 * then swaps. Holding the font responses back makes that order certain here.
 * If a fallback wraps a line differently from its web font, everything below
 * it jumps on the swap (the enterprise hero paragraph once took six lines
 * instead of five on a 412px phone: CLS 0.147).
 *
 * Which fallback a machine uses depends on its fonts (globals.css lists them).
 * CI installs Roboto, the one Android phones have, so the runs there measure
 * what a phone shows.
 */

const pages = [
  "/",
  "/models/",
  "/models/compare/",
  "/models/llama-3-3-70b/",
  "/pricing/",
  "/enterprise/",
  "/docs/quickstart/",
];

const FONT_DELAY_MS = 1000;

for (const path of pages) {
  test(`no layout shift when the fonts swap in on ${path}`, async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __shift: number };
      w.__shift = 0;
      // No input happens in this test, so every shift counts.
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) w.__shift += (entry as unknown as { value: number }).value;
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.route(/\.woff2$/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, FONT_DELAY_MS));
      await route.continue();
    });

    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    // The swap's layout and its layout-shift entry land a frame or two later.
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    await page.waitForTimeout(200);

    const result = await page.evaluate(() => {
      const fontEnds = performance
        .getEntriesByType("resource")
        .filter((e) => e.name.endsWith(".woff2"))
        .map((e) => (e as PerformanceResourceTiming).responseEnd);
      return {
        shift: (window as unknown as { __shift: number }).__shift,
        firstPaint: performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? Infinity,
        firstFont: Math.min(...fontEnds),
        webFonts: ["Funnel Display", "Funnel Sans", "Azeret Mono"].filter((f) =>
          document.fonts.check(`16px "${f}"`),
        ),
        // Each web font has a chain of local fallbacks; one of them must be on this machine.
        unmatchedFallbacks: ["Funnel Display", "Funnel Sans", "Azeret Mono"].filter(
          (family) =>
            ![...document.fonts].some(
              (f) => f.family.startsWith(`${family} Fallback`) && f.status === "loaded",
            ),
        ),
      };
    });

    // The test only means something if text painted before the fonts arrived.
    expect(result.firstPaint).toBeLessThan(result.firstFont);
    expect(result.webFonts).toEqual(["Funnel Display", "Funnel Sans", "Azeret Mono"]);
    expect(result.unmatchedFallbacks, "no local font matched these fallbacks").toEqual([]);
    expect(result.shift).toBeLessThan(0.01);
  });
}
