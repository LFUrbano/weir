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

// Chromium on Linux hints glyphs to whole-pixel widths, which no phone or
// desktop browser the site targets does, so a line could wrap there and
// nowhere else. Without hinting it measures text like they do (other
// platforms ignore the switch).
test.use({ launchOptions: { args: ["--font-render-hinting=none"] } });

for (const path of pages) {
  test(`no layout shift when the fonts swap in on ${path}`, async ({ page }) => {
    await page.addInitScript(() => {
      type Rect = { y: number; height: number };
      type Shift = { value: number; sources: { node?: Node | null; previousRect: Rect; currentRect: Rect }[] };
      const w = window as unknown as { __shift: number; __moved: string[] };
      w.__shift = 0;
      w.__moved = [];
      // No input happens in this test, so every shift counts.
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as Shift[]) {
          w.__shift += entry.value;
          // What moved, for the failure message: "P.lede y 702->730 h 82->82".
          for (const s of entry.sources) {
            const el = s.node instanceof Element ? s.node : s.node?.parentElement;
            const name = el ? `${el.tagName}.${[...el.classList].slice(0, 3).join(".")}` : "?";
            const r = (n: number) => Math.round(n);
            w.__moved.push(
              `${name} y ${r(s.previousRect.y)}->${r(s.currentRect.y)} h ${r(s.previousRect.height)}->${r(s.currentRect.height)}`,
            );
          }
        }
      }).observe({ type: "layout-shift", buffered: true });
      // Heights of the text blocks in the fallbacks, to name the one that rewrapped.
      document.addEventListener("DOMContentLoaded", () =>
        requestAnimationFrame(() => {
          (window as unknown as { __before: number[] }).__before = [
            ...document.querySelectorAll("body *"),
          ].map((el) => el.getBoundingClientRect().height);
        }),
      );
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
        moved: (window as unknown as { __moved: string[] }).__moved,
        rewrapped: (() => {
          const before = (window as unknown as { __before?: number[] }).__before ?? [];
          return [...document.querySelectorAll("body *")]
            .map((el, i) => ({ el, from: before[i], to: el.getBoundingClientRect().height }))
            .filter(
              ({ el, from, to }) =>
                from !== undefined &&
                Math.abs(to - from) >= 5 &&
                [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim()),
            )
            .slice(0, 6)
            .map(
              ({ el, from, to }) =>
                `${el.tagName} (${getComputedStyle(el).fontFamily.split(",")[0]}) ${Math.round(from!)}->${Math.round(to)} "${el.textContent?.trim().slice(0, 40)}"`,
            );
        })(),
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
    expect(
      result.shift,
      `rewrapped: ${result.rewrapped.join("; ")} | moved: ${result.moved.join("; ")}`,
    ).toBeLessThan(0.01);
  });
}
