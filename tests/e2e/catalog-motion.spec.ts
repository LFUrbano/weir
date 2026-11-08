import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { models } from "../../src/data/models";
import { collectErrors } from "./errors";

/** Rows on desktop and cards on phones both carry data-slug; only one set is visible. */
const rows = (page: Page): Locator => page.locator("[data-slug]").filter({ visible: true });

/** The layout on screen (table or cards); it says data-motion="on" once rows can animate. */
const list = (page: Page): Locator =>
  page.locator("[data-testid=catalog-table], [data-testid=catalog-cards]").filter({ visible: true });

const taskFilter = (page: Page, label: string) =>
  page.getByRole("group", { name: "Filter by task" }).getByRole("button", {
    name: new RegExp(`^${label}\\b`),
  });

const count = (page: Page) => page.getByTestId("catalog-count");
const countText = (n: number) => (n === models.length ? `All ${n} models` : `${n} of ${models.length} models`);

const embeddings = models.filter((m) => m.tasks.includes("embeddings")).length;
const matching = (q: string) =>
  models.filter((m) => `${m.name} ${m.publisher}`.toLowerCase().includes(q)).length;

interface Seen {
  frames: number;
  /** Row-frames where a visible row was see-through (opacity < 1). */
  faded: number;
  /** Row-frames where a visible row was moved by a transform. */
  moved: number;
  /** Row-frames where a row carried an inline opacity or transform. */
  styled: number;
}

/** Samples every visible row on every frame until stopWatching. */
async function startWatching(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __seen: Seen; __watching: boolean };
    w.__seen = { frames: 0, faded: 0, moved: 0, styled: 0 };
    w.__watching = true;
    const identity = new Set(["none", "matrix(1, 0, 0, 1, 0, 0)"]);
    const tick = () => {
      if (!w.__watching) return;
      w.__seen.frames++;
      for (const el of document.querySelectorAll<HTMLElement>("[data-slug]")) {
        if (el.style.opacity || el.style.transform) w.__seen.styled++;
        if (!el.checkVisibility()) continue;
        const cs = getComputedStyle(el);
        if (Number.parseFloat(cs.opacity) < 1) w.__seen.faded++;
        if (!identity.has(cs.transform)) w.__seen.moved++;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

async function stopWatching(page: Page): Promise<Seen> {
  return page.evaluate(() => {
    const w = window as unknown as { __seen: Seen; __watching: boolean };
    w.__watching = false;
    return w.__seen;
  });
}

/** One second after the last change: every row opaque and in place, the count right. */
async function expectSettled(page: Page, expected: number) {
  await page.waitForTimeout(1000);
  await expect(rows(page)).toHaveCount(expected);
  // No row left behind by an exit, in either layout.
  await expect(page.locator("[data-slug]")).toHaveCount(expected * 2);
  await expect(count(page)).toHaveText(countText(expected));
  const states = await rows(page).evaluateAll((els) =>
    els.map((el) => {
      const cs = getComputedStyle(el);
      return { opacity: cs.opacity, transform: cs.transform };
    }),
  );
  for (const s of states) {
    expect(s.opacity).toBe("1");
    expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(s.transform);
  }
}

/** A name only Motion's layout features (the chunk fetched after load) contain. */
const FEATURES_MARKER = "dragSnapToOrigin";

/** Script URLs the page fetched, to check later whether the features chunk was one. */
function recordScripts(page: Page): string[] {
  const urls: string[] = [];
  page.on("response", (r) => {
    if (r.request().resourceType() === "script") urls.push(r.url());
  });
  return urls;
}

async function fetchedFeatures(page: Page, urls: string[]): Promise<boolean> {
  for (const url of urls) {
    if ((await (await page.request.get(url)).text()).includes(FEATURES_MARKER)) return true;
  }
  return false;
}

async function openWithMotion(page: Page, path = "/models/") {
  await page.goto(path);
  await expect(page.getByRole("searchbox", { name: "Search models" })).toBeEditable();
  await expect(list(page)).toHaveAttribute("data-motion", "on");
}

test.describe("catalog motion", () => {
  test("the first render does not animate, before or after the motion code loads", async ({
    page,
  }) => {
    await page.goto("/models/");
    await startWatching(page);
    await expect(list(page)).toHaveAttribute("data-motion", "on");
    await page.waitForTimeout(500);
    const seen = await stopWatching(page);
    expect(seen.frames).toBeGreaterThan(10);
    expect(seen).toMatchObject({ faded: 0, moved: 0 });
  });

  test("the motion features are fetched after load, not with the page", async ({
    page,
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "bundle split, once");
    const html = await (await request.get("/models/")).text();
    const initial = [...html.matchAll(/src="(\/_next\/static\/[^"]+\.js)"/g)].map((m) => m[1]);
    expect(initial.length).toBeGreaterThan(0);
    for (const src of initial) {
      expect((await (await request.get(src)).text()).includes(FEATURES_MARKER), src).toBe(false);
    }
    const scripts = recordScripts(page);
    await openWithMotion(page);
    expect(await fetchedFeatures(page, scripts)).toBe(true);
  });

  test("filtering animates rows out and in, then settles on the right rows", async ({ page }) => {
    const errors = collectErrors(page);
    await openWithMotion(page);

    await startWatching(page);
    await taskFilter(page, "Embeddings").click();
    await expect(count(page)).toHaveText(countText(embeddings));
    await page.waitForTimeout(400);
    const out = await stopWatching(page);
    expect(out.faded, "rows fade out").toBeGreaterThan(0);
    await expectSettled(page, embeddings);
    for (const row of await rows(page).all()) {
      await expect(row).toHaveAttribute("data-tasks", /\bembeddings\b/);
    }

    await startWatching(page);
    await taskFilter(page, "All").click();
    await expect(count(page)).toHaveText(countText(models.length));
    await page.waitForTimeout(400);
    const back = await stopWatching(page);
    expect(back.faded, "rows fade in").toBeGreaterThan(0);
    expect(back.moved, "rows slide").toBeGreaterThan(0);
    await expectSettled(page, models.length);
    expect(errors).toEqual([]);
  });

  test("sorting slides rows to their new places", async ({ page }) => {
    await openWithMotion(page);
    await startWatching(page);
    await page.getByRole("combobox", { name: "Sort by" }).click();
    await page.getByRole("option", { name: /^Speed/ }).click();
    await expect(page).toHaveURL(/[?&]sort=speed\b/);
    await page.waitForTimeout(400);
    const seen = await stopWatching(page);
    expect(seen.moved).toBeGreaterThan(0);
    await expectSettled(page, models.length);
  });

  test("fast typing in the search leaves no ghost rows", async ({ page }) => {
    await openWithMotion(page);
    const search = page.getByRole("searchbox", { name: "Search models" });
    await search.pressSequentially("llama", { delay: 15 });
    for (let i = 0; i < 3; i++) await search.press("Backspace", { delay: 15 });
    await search.pressSequentially("ma", { delay: 15 });
    await search.fill("");
    await search.pressSequentially("qwen", { delay: 15 });
    await expectSettled(page, matching("qwen"));
    for (const row of await rows(page).all()) await expect(row).toContainText(/qwen/i);
  });

  test("animated rows keep the table and list accessible", async ({ page }) => {
    await openWithMotion(page);
    await taskFilter(page, "Chat").click();
    await taskFilter(page, "All").click();
    await expectSettled(page, models.length);
    const { violations } = await new AxeBuilder({ page })
      .include("[data-testid=catalog-table]")
      .include("[data-testid=catalog-cards]")
      .analyze();
    const blocking = violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => `${v.impact} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
    expect(blocking).toEqual([]);
  });
});

test.describe("catalog with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("rows never fade, move or carry motion styles, and the motion code is not loaded", async ({
    page,
  }) => {
    const scripts = recordScripts(page);
    await page.goto("/models/");
    await expect(page.getByRole("searchbox", { name: "Search models" })).toBeEditable();
    await startWatching(page);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await expect(list(page)).not.toHaveAttribute("data-motion", "on");

    await taskFilter(page, "Embeddings").click();
    await expect(rows(page)).toHaveCount(embeddings);
    await taskFilter(page, "All").click();
    await expect(rows(page)).toHaveCount(models.length);
    await page.getByRole("combobox", { name: "Sort by" }).click();
    await page.getByRole("option", { name: /^Price/ }).click();
    await page.waitForTimeout(400);
    expect(await stopWatching(page)).toMatchObject({ faded: 0, moved: 0, styled: 0 });
    await expect(list(page)).not.toHaveAttribute("data-motion", "on");
    expect(await fetchedFeatures(page, scripts)).toBe(false);
  });
});

test("the static HTML rows carry no motion styles", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/models/");
  const slugs = page.locator("[data-slug]");
  await expect(slugs).toHaveCount(models.length * 2);
  const styled = await slugs.evaluateAll((els) => els.filter((el) => el.hasAttribute("style")).length);
  expect(styled).toBe(0);
  await context.close();
});
