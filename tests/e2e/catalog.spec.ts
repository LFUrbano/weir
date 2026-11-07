import { expect, test, type Locator, type Page } from "@playwright/test";
import { isTokenModel, models } from "../../src/data/models";
import { blendedPrice } from "../../src/lib/pricing";
import { collectErrors } from "./errors";
import { pressMenuShortcut } from "./shortcut";

/** Rows on desktop and cards on phones both carry data-slug; only one set is visible. */
const rows = (page: Page): Locator => page.locator("[data-slug]").filter({ visible: true });

const slugs = (page: Page) =>
  rows(page).evaluateAll((els) => els.map((el) => el.getAttribute("data-slug")));

const taskFilter = (page: Page, label: string) =>
  page.getByRole("group", { name: "Filter by task" }).getByRole("button", {
    name: new RegExp(`^${label}\\b`),
  });

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
    // The page's data is already in the browser: typing must not refetch it.
    const rsc: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("_rsc=")) rsc.push(r.url());
    });

    const search = page.getByRole("searchbox", { name: "Search models" });
    await expect(search).toBeEditable();
    await search.pressSequentially("qwen");
    await expect(page).toHaveURL(/[?&]q=qwen\b/);
    const expected = models.filter((m) => /qwen/i.test(`${m.name} ${m.publisher}`)).length;
    await expect(rows(page)).toHaveCount(expected);
    expect(await page.evaluate(() => history.length)).toBe(before);
    expect(rsc.filter((u) => u.includes("/models/index.txt"))).toEqual([]);
  });

  // Special characters never throw; no result shows a designed empty state.
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

  // Invalid params fall back to the defaults.
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
    // Wait until only one layout (table or cards) is showing.
    await expect(rows(page)).toHaveCount(models.length);
    const flux = rows(page).and(page.locator('[data-slug="flux-1-dev"]'));
    await expect(flux).toContainText("$0.025 / image");
    const bge = rows(page).and(page.locator('[data-slug="bge-m3"]'));
    await expect(bge).toContainText("—");
    await expect(page.getByRole("main")).not.toContainText(/NaN|Infinity/);
  });

  test("the lede shares a request shape per endpoint, not across every model", async ({ page }) => {
    await page.goto("/models/");
    const lede = page.locator("section[aria-labelledby=catalog-title] p").nth(1);
    await expect(lede).not.toContainText(/all behind the same request format/i);
    await expect(lede).toContainText("same endpoint");
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

  test("the static catalog is hydrated, not rebuilt on the client", async ({ request }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "static HTML, once");
    const html = await (await request.get("/models/")).text();
    // "<!--$!-->" marks a Suspense boundary React must render on the client
    // only (useSearchParams in a static export): ~250 ms of work on a phone.
    expect(html).not.toContain("<!--$!-->");
    expect(html.match(/data-slug="/g)).toHaveLength(models.length * 2);
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

  test("search, sort and task filters work from the keyboard", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "keyboard flow on desktop");
    await page.goto("/models/");
    const search = page.getByRole("searchbox", { name: "Search models" });
    // The static HTML's search box is read-only until the catalog hydrates.
    await expect(search).toBeEditable();
    await search.focus();
    await page.keyboard.type("llama");
    await expect(page).toHaveURL(/[?&]q=llama\b/);

    await page.keyboard.press("Tab");
    const sort = page.getByRole("combobox", { name: "Sort by" });
    await expect(sort).toBeFocused();
    await page.keyboard.press("Enter");
    // Radix focuses the checked option once the list is open.
    await expect(page.getByRole("option", { name: /^Name/ })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("option", { name: /^Price/ })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("option", { name: /^Speed/ })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/[?&]sort=speed\b/);
    await expect(sort).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(taskFilter(page, "All")).toBeFocused();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect(taskFilter(page, "Chat")).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveURL(/[?&]task=chat\b/);
    // The search text survives filter changes.
    await expect(page).toHaveURL(/[?&]q=llama\b/);
  });

  test("desktop gets the table", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop layout only");
    await page.goto("/models/");
    await expect(page.getByTestId("catalog-table")).toBeVisible();
    await expect(page.getByTestId("catalog-cards")).toBeHidden();
  });

  test("one header carries the sort; the arrow column is not announced", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop table only");
    const table = page.getByTestId("catalog-table");
    const sorted = table.locator("th[aria-sort]");
    const cases = [
      { sort: "", header: /^Model/, state: "ascending" },
      { sort: "price", header: /^Input \/ 1M/, state: "other" },
      { sort: "speed", header: /^Speed/, state: "descending" },
      { sort: "context", header: /^Context/, state: "descending" },
    ];
    for (const c of cases) {
      await page.goto(c.sort ? `/models/?sort=${c.sort}` : "/models/");
      await expect(sorted).toHaveCount(1);
      await expect(sorted).toHaveText(c.header);
      await expect(sorted).toHaveAttribute("aria-sort", c.state);
    }
    // Model, Task, Context, Input, Output, Speed, p50; the arrow column is hidden.
    await expect(table.getByRole("columnheader")).toHaveCount(7);
  });

  test("links to /models/ reset the search box and the list", async ({ page }, testInfo) => {
    const search = page.getByRole("searchbox", { name: "Search models" });
    const typeLlama = async () => {
      await page.goto("/models/?task=chat");
      await expect(search).toBeEditable();
      await search.fill("llama");
      await expect(page).toHaveURL(/[?&]q=llama\b/);
    };
    const expectReset = async () => {
      await expect(page).toHaveURL(/\/models\/$/);
      await expect(search).toHaveValue("");
      await expect(rows(page)).toHaveCount(models.length);
      await expect(taskFilter(page, "All")).toHaveAttribute("aria-pressed", "true");
    };

    // Footer link (both layouts).
    await typeLlama();
    await page.getByRole("contentinfo").getByRole("link", { name: "Models", exact: true }).click();
    await expectReset();

    // Command menu "Models" page item.
    await typeLlama();
    await pressMenuShortcut(page);
    await expect(page.getByRole("combobox", { name: "Search models and pages" })).toBeFocused();
    await page.keyboard.type("models");
    await page.getByRole("dialog", { name: "Search Weir" }).getByRole("option", { name: /^Models/ }).click();
    await expectReset();

    // Header link (desktop navigation).
    if (testInfo.project.name === "desktop") {
      await typeLlama();
      await page.getByRole("banner").getByRole("link", { name: "Models", exact: true }).click();
      await expectReset();
    }

    // Back still restores the typed search.
    await page.goBack();
    await expect(page).toHaveURL(/[?&]q=llama\b/);
    await expect(search).toHaveValue("llama");
  });
});

test.describe("command menu", () => {
  for (const { platform, shortcut, other } of [
    { platform: "Win32", shortcut: "Control+k", other: "Meta+k" },
    { platform: "MacIntel", shortcut: "Meta+k", other: "Control+k" },
  ]) {
    test(`${shortcut} opens it on any page (${platform}), ${other} does not`, async ({ page }) => {
      await page.addInitScript((p) => {
        Object.defineProperty(Navigator.prototype, "platform", { get: () => p });
      }, platform);
      for (const path of ["/", "/models/"]) {
        await page.goto(path);
        const menu = page.getByRole("dialog", { name: "Search Weir" });
        // On a Mac, Ctrl+K deletes to the end of the line in text fields; it must not open the menu.
        await page.keyboard.press(other);
        await page.waitForTimeout(300);
        await expect(menu).toBeHidden();
        await page.keyboard.press(shortcut);
        await expect(menu).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(menu).toBeHidden();
      }
    });
  }

  test("its code is fetched on intent, not with the page", async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "hover and keyboard on desktop");
    const scripts = new Set<string>();
    page.on("request", (r) => {
      if (r.resourceType() === "script") scripts.add(r.url());
    });
    const menuLoaded = async () => {
      for (const url of scripts) if ((await (await request.get(url)).text()).includes("cmdk-list")) return true;
      return false;
    };
    await page.goto("/pricing/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    expect(await menuLoaded()).toBe(false);
    await page.getByRole("banner").getByRole("button", { name: /Search/ }).hover();
    await expect.poll(menuLoaded).toBe(true);
  });

  test("Escape returns focus to the header button that opened it", async ({ page }) => {
    await page.goto("/");
    const trigger = page.getByRole("banner").getByRole("button", { name: /Search/ });
    await trigger.click();
    await expect(page.getByRole("dialog", { name: "Search Weir" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
  });

  test("typing a model name and Enter opens its page", async ({ page }) => {
    await page.goto("/");
    await pressMenuShortcut(page);
    const menu = page.getByRole("dialog", { name: "Search Weir" });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("combobox", { name: "Search models and pages" })).toBeFocused();
    await page.keyboard.type("qwen");
    await expect(menu.getByRole("option").first()).toContainText("Qwen");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/models\/qwen[^/]*\/$/);
  });

  test("lists the site pages", async ({ page }) => {
    await page.goto("/");
    await pressMenuShortcut(page);
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
      const response = await page.goto(path);
      // The 404 page would also mark Models current (its path is under /models).
      expect(response?.status(), path).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Page not found");
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

test.describe("error collector", () => {
  test("a missing script or font fails", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "once is enough");
    const errors = collectErrors(page);
    let broken = "";
    await page.route(/\/_next\/static\/.*\.(js|woff2)$/, async (route) => {
      if (broken) return route.continue();
      broken = route.request().url();
      await route.fulfill({ status: 404, body: "" });
    });
    await page.goto("/models/");
    await expect.poll(() => errors.some((e) => e.includes(broken))).toBe(true);
  });

  test("a prefetch of a mistyped internal link fails", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "once is enough");
    await page.goto("/models/");
    const errors = collectErrors(page);
    // fetch() from the page is how the router prefetches a route path.
    const statuses = await page.evaluate(async () =>
      Promise.all(
        ["/models/typo/", "/docs/quickstart/"].map(async (path) => (await fetch(path)).status),
      ),
    );
    // The built page answers; the mistyped one is the only failure reported.
    expect(statuses).toEqual([404, 200]);
    await expect.poll(() => errors).toEqual([expect.stringContaining("/models/typo/")]);
  });

  test("a missing segment file fails too (no .txt tolerance)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "once is enough");
    await page.goto("/models/");
    const errors = collectErrors(page);
    const status = await page.evaluate(async () => (await fetch("/models/__next.typo.__PAGE__.txt")).status);
    expect(status).toBe(404);
    await expect.poll(() => errors).toEqual([expect.stringContaining("__next.typo.__PAGE__.txt")]);
  });
});
