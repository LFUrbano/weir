import { expect, test, type Page } from "@playwright/test";

/**
 * The page must not move when the web fonts load, and must show them when
 * they load in time.
 *
 * On a real network the first frame can paint before the preloaded fonts
 * arrive. With display: swap the text then re-rendered in the web font, and
 * any line the fallback wrapped differently moved everything below it (the
 * enterprise hero paragraph took six lines instead of five on a 412px phone:
 * CLS 0.147). With display: optional a font that misses the first render is
 * not swapped in; the next page load gets it from the cache.
 *
 * Holding the font responses back makes the late case certain. Each page runs
 * with next/font's own fallback (Arial where the machine has it) and again
 * with the system font forced in, which is what a phone without Arial shows.
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

const fallbacks = {
  "its own fallback": "",
  "the system font": `html{--font-funnel-display:"Funnel Display",system-ui,sans-serif!important;--font-funnel-sans:"Funnel Sans",system-ui,sans-serif!important;--font-azeret-mono:"Azeret Mono",monospace!important}`,
};

/** Adds `css` to the page's <head>, so it applies from the first frame. */
async function injectCss(page: Page, css: string) {
  if (!css) return;
  await page.route(
    (url) => url.pathname.endsWith("/"),
    async (route) => {
      if (route.request().resourceType() !== "document") return route.continue();
      const response = await route.fetch();
      const body = (await response.text()).replace("</head>", `<style>${css}</style></head>`);
      await route.fulfill({ response, body });
    },
  );
}

for (const path of pages) {
  for (const [name, css] of Object.entries(fallbacks)) {
    test(`no layout shift when the fonts arrive late on ${path}, with ${name}`, async ({ page }) => {
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
              const label = el ? `${el.tagName}.${[...el.classList].slice(0, 3).join(".")}` : "?";
              const r = (n: number) => Math.round(n);
              w.__moved.push(
                `${label} y ${r(s.previousRect.y)}->${r(s.currentRect.y)} h ${r(s.previousRect.height)}->${r(s.currentRect.height)}`,
              );
            }
          }
        }).observe({ type: "layout-shift", buffered: true });
      });
      await injectCss(page, css);
      await page.route(/\.woff2$/, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, FONT_DELAY_MS));
        await route.continue();
      });

      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      // A swap's layout and its layout-shift entry would land a frame or two later.
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      );
      await page.waitForTimeout(200);

      const result = await page.evaluate(() => ({
        shift: (window as unknown as { __shift: number }).__shift,
        moved: (window as unknown as { __moved: string[] }).__moved,
        firstPaint: performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? Infinity,
        firstFont: Math.min(
          ...performance
            .getEntriesByType("resource")
            .filter((e) => e.name.endsWith(".woff2"))
            .map((e) => (e as PerformanceResourceTiming).responseEnd),
        ),
      }));

      // The test only means something if text painted before the fonts arrived.
      expect(result.firstPaint).toBeLessThan(result.firstFont);
      expect(result.shift, `moved: ${result.moved.join("; ")}`).toBeLessThan(0.01);
    });
  }

  test(`the web fonts render on a repeat visit to ${path}`, async ({ page }) => {
    // A first visit gets the fonts in time on a normal connection, but only
    // when they beat the first render (about 100 ms), which a busy test
    // machine can miss. A repeat visit loads them from the cache: they must
    // render then.
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    await page.reload();
    await page.evaluate(() => document.fonts.ready);
    // Tag the first visible text set in each face (computed style), then ask
    // the renderer which font it actually drew with: a late optional font is
    // "loaded" in document.fonts but not drawn.
    const tagged = await page.evaluate(() => {
      const found: string[] = [];
      for (const family of ["Funnel Display", "Funnel Sans", "Azeret Mono"]) {
        const el = [...document.querySelectorAll("main *")].find(
          (e) =>
            getComputedStyle(e).fontFamily.startsWith(`"${family}"`) &&
            e.checkVisibility({ visibilityProperty: true, opacityProperty: true }) &&
            e.getBoundingClientRect().top < innerHeight &&
            [...e.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && /[a-z]/i.test(n.textContent ?? "")),
        );
        if (el) {
          el.setAttribute("data-font-probe", family);
          found.push(family);
        }
      }
      return found;
    });
    expect(tagged).toContain("Funnel Display");
    expect(tagged).toContain("Funnel Sans");

    const cdp = await page.context().newCDPSession(page);
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");
    const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
    for (const family of tagged) {
      const { nodeId } = await cdp.send("DOM.querySelector", {
        nodeId: root.nodeId,
        selector: `[data-font-probe="${family}"]`,
      });
      const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
      // Variable fonts report their default instance ("Funnel Sans Light").
      const drawn = fonts.filter((f) => f.familyName.startsWith(family) && f.isCustomFont);
      expect(drawn.length, `${family} drawn with ${fonts.map((f) => f.familyName).join(", ")}`).toBeGreaterThan(0);
    }
  });
}
