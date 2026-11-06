import { expect, test, type Locator, type Page } from "@playwright/test";
import { isTokenModel, models } from "../../src/data/models";
import { blendedPrice } from "../../src/lib/pricing";

/** Rows on desktop and cards on phones both carry data-slug; only one set is visible. */
const rows = (page: Page): Locator => page.locator("[data-slug]").filter({ visible: true });

const slugs = (page: Page) =>
  rows(page).evaluateAll((els) => els.map((el) => el.getAttribute("data-slug")));

const taskFilter = (page: Page, label: string) =>
  page.getByRole("group", { name: "Filter by task" }).getByRole("button", {
    name: new RegExp(`^${label}\\b`),
  });

/** Fails the test on any uncaught error or console error. */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  return errors;
}

const byName = [...models].sort((a, b) => a.name.localeCompare(b.name)).map((m) => m.slug);

const cheapest = [...models]
  .filter(isTokenModel)
  .sort((a, b) => blendedPrice(a, 0.5) - blendedPrice(b, 0.5))[0];

test.describe("model catalog", () => {
  test("task filter from the URL", async ({ page }) => {
    await page.goto("/models/?task=code");
    await expect(taskFilter(page, "Code")).toHaveAttribute("aria-pressed", "true");
    await expect(taskFilter(page, "All")).toHaveAttribute("aria-pressed", "false");

    const expected = models.filter((m) => m.tasks.includes("code")).length;
    await expect(rows(page)).toHaveCount(expected);
    for (const row of await rows(page).all()) {
      await expect(row).toHaveAttribute("data-tasks", /\bcode\b/);
    }
  });

  test("sorting by price writes the URL and puts the cheapest model first", async ({ page }) => {
    await page.goto("/models/");
    await page.getByRole("combobox", { name: "Sort by" }).click();
    await page.getByRole("option", { name: /^Price/ }).click();

    await expect(page).toHaveURL(/[?&]sort=price\b/);
    await expect(rows(page).first()).toHaveAttribute("data-slug", cheapest.slug);
  });

  test("the back button restores the previous filter", async ({ page }) => {
    await page.goto("/models/?task=code");
    await taskFilter(page, "Vision").click();
    await expect(page).toHaveURL(/[?&]task=vision\b/);
    await expect(taskFilter(page, "Vision")).toHaveAttribute("aria-pressed", "true");

    await page.goBack();
    await expect(page).toHaveURL(/[?&]task=code\b/);
    await expect(taskFilter(page, "Code")).toHaveAttribute("aria-pressed", "true");
    for (const row of await rows(page).all()) {
      await expect(row).toHaveAttribute("data-tasks", /\bcode\b/);
    }
  });

  test("search updates the URL without a history entry per keystroke", async ({ page }) => {
    await page.goto("/models/");
    await expect(rows(page)).toHaveCount(models.length);
    const before = await page.evaluate(() => history.length);

    await page.getByRole("searchbox", { name: "Search models" }).pressSequentially("qwen");
    await expect(page).toHaveURL(/[?&]q=qwen\b/);
    const expected = models.filter((m) => /qwen/i.test(`${m.name} ${m.publisher}`)).length;
    await expect(rows(page)).toHaveCount(expected);
    expect(await page.evaluate(() => history.length)).toBe(before);
  });

  // Review Focus 2: special characters never throw; no result shows a designed empty state.
  test("special characters and the empty state", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/models/");
    const search = page.getByRole("searchbox", { name: "Search models" });

    for (const q of ["c++", "(", "[", "\\"]) {
      await search.fill(q);
      await expect(page.getByTestId("catalog-count")).toBeVisible();
    }
    await search.fill("   ");
    await expect(rows(page)).toHaveCount(models.length);

    await search.fill("zzzz");
    await expect(page.getByText("No models match")).toBeVisible();
    await expect(rows(page)).toHaveCount(0);

    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page).toHaveURL(/\/models\/$/);
    await expect(search).toHaveValue("");
    await expect(rows(page)).toHaveCount(models.length);
    expect(errors).toEqual([]);
  });

  // Review Focus 3: invalid params fall back to the defaults.
  test("invalid params show every model in name order", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/models/?task=foo&sort=bar");
    await expect(rows(page)).toHaveCount(models.length);
    expect(await slugs(page)).toEqual(byName);
    await expect(taskFilter(page, "All")).toHaveAttribute("aria-pressed", "true");
    expect(errors).toEqual([]);
  });

  test("prices: per image for image models, a dash where a value does not apply", async ({
    page,
  }) => {
    await page.goto("/models/");
    const flux = rows(page).and(page.locator('[data-slug="flux-1-dev"]'));
    await expect(flux).toContainText("$0.025 / image");
    const bge = rows(page).and(page.locator('[data-slug="bge-m3"]'));
    await expect(bge).toContainText("—");
    await expect(page.getByRole("main")).not.toContainText(/NaN|Infinity/);
  });

  test("the static HTML lists every model for readers without JavaScript", async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/models/");
    await expect(page.locator("[data-slug]")).toHaveCount(models.length * 2);
    await context.close();
  });

  test("phones get cards and no horizontal scroll", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "phone layout only");
    for (const width of [360, 412]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/models/");
      await expect(page.getByTestId("catalog-cards")).toBeVisible();
      await expect(page.getByTestId("catalog-table")).toBeHidden();
      await expect(rows(page)).toHaveCount(models.length);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    }
  });

  test("desktop gets the table", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop layout only");
    await page.goto("/models/");
    await expect(page.getByTestId("catalog-table")).toBeVisible();
    await expect(page.getByTestId("catalog-cards")).toBeHidden();
  });
});

test.describe("command menu", () => {
  for (const shortcut of ["Control+k", "Meta+k"]) {
    test(`${shortcut} opens it on any page`, async ({ page }) => {
      for (const path of ["/", "/models/"]) {
        await page.goto(path);
        await page.keyboard.press(shortcut);
        const menu = page.getByRole("dialog", { name: "Search Weir" });
        await expect(menu).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(menu).toBeHidden();
      }
    });
  }

  test("typing a model name and Enter opens its page", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Control+k");
    const menu = page.getByRole("dialog", { name: "Search Weir" });
    await expect(menu).toBeVisible();
    await page.keyboard.type("qwen");
    await expect(menu.getByRole("option").first()).toContainText("Qwen");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/models\/qwen[^/]*\/$/);
  });

  test("lists the site pages", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Control+k");
    const menu = page.getByRole("dialog", { name: "Search Weir" });
    for (const label of ["Models", "Pricing", "Enterprise", "Quickstart"]) {
      await expect(menu.getByRole("option", { name: new RegExp(`^${label}`) })).toBeVisible();
    }
    await page.keyboard.type("pricing");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/pricing\/$/);
  });

  test("the header search button opens it", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("banner").getByRole("button", { name: /Search/ }).click();
    await expect(page.getByRole("dialog", { name: "Search Weir" })).toBeVisible();
  });
});

test.describe("header", () => {
  test("Models is the current page on the catalog and on model pages", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop navigation only");
    for (const path of ["/models/", "/models/llama-3-3-70b/"]) {
      await page.goto(path);
      const nav = page.getByRole("banner").getByRole("navigation", { name: "Main" });
      await expect(nav.getByRole("link", { name: "Models" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      await expect(nav.getByRole("link", { name: "Pricing" })).not.toHaveAttribute(
        "aria-current",
      );
    }
  });
});
