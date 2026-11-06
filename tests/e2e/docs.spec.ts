import { expect, test, type Page } from "@playwright/test";
import { API_BASE_URL, snippetsFor } from "../../src/components/code/snippets";
import { company, freeCreditLabel, lowerFirst, noCardRequired } from "../../src/data/company";
import { getModel } from "../../src/data/models";
import { collectErrors } from "./errors";

const llama = getModel("llama-3-3-70b")!;

const STEPS = [
  { id: "create-a-key", title: "Create a key" },
  { id: "install-the-sdk", title: "Install the SDK" },
  { id: "make-your-first-call", title: "Make your first call" },
  { id: "stream-the-response", title: "Stream the response" },
  { id: "next-steps", title: "Next steps" },
];

const article = (page: Page) => page.getByRole("article");
const step = (page: Page, i: number) => page.locator(`[data-step="${i + 1}"]`);

/** The table of contents that is on screen: a sidebar on desktop, a disclosure on phones. */
async function openToc(page: Page) {
  const toc = page.getByRole("navigation", { name: "On this page" });
  await expect(toc).toBeVisible();
  const summary = toc.locator("summary");
  if ((await summary.count()) > 0 && (await summary.isVisible())) {
    if ((await toc.locator("details").getAttribute("open")) === null) await summary.click();
  }
  return toc;
}

test.describe("quickstart docs", () => {
  test("has the title, the lede and five numbered steps in order", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/docs/quickstart/");
    await expect(page).toHaveTitle(/^Quickstart · Weir$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Quickstart");

    const list = page.getByRole("list", { name: "Quickstart steps" });
    await expect(list.locator(":scope > li")).toHaveCount(STEPS.length);
    for (const [i, s] of STEPS.entries()) {
      const item = step(page, i);
      await expect(item.getByTestId("step-number")).toHaveText(String(i + 1));
      const heading = item.getByRole("heading", { level: 2, name: s.title, exact: true });
      await expect(heading).toBeVisible();
      await expect(heading).toHaveAttribute("id", s.id);
    }
    // Exactly five h2s: nothing else competes with the steps.
    await expect(article(page).getByRole("heading", { level: 2 })).toHaveCount(5);
    expect(errors).toEqual([]);
  });

  test("no two elements on the page share an id", async ({ page }) => {
    await page.goto("/docs/quickstart/");
    const dupes = await page.evaluate(() => {
      const seen = new Map<string, number>();
      for (const el of document.querySelectorAll("[id]")) {
        seen.set(el.id, (seen.get(el.id) ?? 0) + 1);
      }
      return [...seen].filter(([, n]) => n > 1).map(([id]) => id);
    });
    expect(dupes).toEqual([]);
  });

  test("the no-card note is the company module's text on the docs, home and pricing pages", async ({
    page,
  }) => {
    await page.goto("/docs/quickstart/");
    await expect(step(page, 0)).toContainText(`${freeCreditLabel} of credit. ${noCardRequired}`);

    await page.goto("/");
    await expect(page.getByTestId("two-paths")).toContainText(`${freeCreditLabel} to start. ${noCardRequired}`);
    // The home promises only what the docs have: a quickstart that covers streaming.
    await expect(page.getByTestId("two-paths")).toContainText("Quickstart, with streaming.");
    await expect(page.getByTestId("two-paths")).not.toContainText("model reference");

    await page.goto("/pricing/");
    await page.getByRole("button", { name: "How does billing work?" }).click();
    await expect(page.getByRole("region").filter({ hasText: lowerFirst(noCardRequired) }).first()).toBeVisible();
  });

  test("every heading is an anchor link to itself", async ({ page }) => {
    await page.goto("/docs/quickstart/");
    const headings = article(page).locator("h2, h3");
    const count = await headings.count();
    expect(count).toBeGreaterThanOrEqual(5);
    for (let i = 0; i < count; i++) {
      const h = headings.nth(i);
      const id = await h.getAttribute("id");
      expect(id, `heading ${i} has an id`).toBeTruthy();
      await expect(h.locator("a")).toHaveAttribute("href", `#${id}`);
    }
  });

  test("the table of contents lists the steps and jumps to their anchors", async ({ page }) => {
    await page.goto("/docs/quickstart/");
    const toc = await openToc(page);
    await expect(toc.getByRole("link")).toHaveCount(STEPS.length);
    for (const s of STEPS) {
      const link = toc.getByRole("link", { name: s.title, exact: true });
      await expect(link).toHaveAttribute("href", `#${s.id}`);
    }
    // Jump to the last step first, so the heading really has to move into view.
    for (const s of [...STEPS].reverse()) {
      const nav = await openToc(page);
      await nav.getByRole("link", { name: s.title, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`#${s.id}$`));
      const heading = page.getByRole("heading", { level: 2, name: s.title, exact: true });
      await expect(heading).toBeInViewport();
      // The sticky header must not cover it.
      const top = await heading.evaluate((el) => el.getBoundingClientRect().top);
      expect(top).toBeGreaterThanOrEqual(56);
    }
  });

  test("the table of contents marks the section being read", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the sidebar is a desktop feature");
    await page.goto("/docs/quickstart/");
    const toc = page.getByRole("navigation", { name: "On this page" });
    await expect(toc.getByRole("link", { name: "Create a key" })).toHaveAttribute(
      "aria-current",
      "location",
    );
    await page.evaluate(() => document.getElementById("stream-the-response")!.scrollIntoView());
    await expect(toc.getByRole("link", { name: "Stream the response" })).toHaveAttribute(
      "aria-current",
      "location",
    );
    await expect(toc.locator('[aria-current="location"]')).toHaveCount(1);
  });

  test("the sidebar stays in view while scrolling on desktop", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the sidebar is a desktop feature");
    await page.goto("/docs/quickstart/");
    const toc = page.getByRole("navigation", { name: "On this page" });
    await page.evaluate(() => window.scrollTo(0, 1600));
    await expect(toc).toBeInViewport();
  });

  test("states the key flow, the free credit and the default base URL", async ({ page }) => {
    await page.goto("/docs/quickstart/");
    const text = (await article(page).textContent()) ?? "";
    expect(text).toContain(freeCreditLabel);
    expect(text).toContain(`${company.rateLimitRpm} requests a minute`);
    expect(text).toContain("WEIR_API_KEY");
    // The SDKs point at the Weir API without being told to.
    await expect(step(page, 1)).toContainText(`${API_BASE_URL} by default`);
    // "Sign in" is not a destination on this site: no link may go to a dashboard.
    for (const href of await article(page).getByRole("link").evaluateAll((els) => els.map((e) => e.getAttribute("href")))) {
      expect(href).not.toMatch(/dashboard|sign-?in|login|^https?:\/\/(?!api\.weir\.example)/i);
      expect(href).not.toBe("#");
    }
  });

  test("code blocks use the code panel and copy exactly what they show", async ({ page }) => {
    await page.goto("/docs/quickstart/");

    // Install: Python and Node tabs.
    const install = step(page, 1).getByTestId("code-panel").first();
    await expect(install.getByRole("tab")).toHaveText(["Python", "Node"]);
    await expect(install.getByRole("tabpanel").locator("pre")).toHaveText("pip install weir");
    await install.getByRole("tab", { name: "Node" }).click();
    await expect(install.getByRole("tabpanel").locator("pre")).toHaveText("npm install weir");

    // First call: the same request the model page and the hero show.
    const first = snippetsFor(llama);
    const call = step(page, 2).getByTestId("code-panel").first();
    await expect(call.getByRole("tab")).toHaveText(["curl", "Python", "Node"]);
    for (const [name, key] of [
      ["curl", "curl"],
      ["Python", "python"],
      ["Node", "node"],
    ] as const) {
      await call.getByRole("tab", { name, exact: true }).click();
      await expect(call.getByRole("tabpanel").locator("pre")).toHaveText(first[key]);
    }

    // Streaming: the stream variant, with stream turned on.
    const streamed = snippetsFor(llama, { stream: true });
    const streaming = step(page, 3).getByTestId("code-panel").first();
    await streaming.getByRole("tab", { name: "curl", exact: true }).click();
    await expect(streaming.getByRole("tabpanel").locator("pre")).toHaveText(streamed.curl);
    expect(streamed.curl).toContain('"stream": true');

    // Copy puts the visible snippet on the clipboard.
    await streaming.getByRole("button", { name: "Copy", exact: true }).click();
    await expect(streaming.getByRole("button", { name: "Copied", exact: true })).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied.split(/\r?\n/).join("\n")).toBe(streamed.curl);
  });

  test("a language picked in one block is kept in the others", async ({ page }) => {
    await page.goto("/docs/quickstart/");
    await step(page, 2).getByRole("tab", { name: "Node", exact: true }).first().click();
    // Both panels in the install step (install, override) follow the pick.
    for (const tab of await step(page, 1).getByRole("tab", { name: "Node" }).all()) {
      await expect(tab).toHaveAttribute("aria-selected", "true");
    }
    await expect(step(page, 3).getByRole("tab", { name: "Node", exact: true }).first()).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("single blocks (key, response, event stream) have a copy button too", async ({ page }) => {
    await page.goto("/docs/quickstart/");
    const key = step(page, 0).getByTestId("code-block").first();
    await expect(key).toContainText("export WEIR_API_KEY=");
    await key.getByRole("button", { name: "Copy", exact: true }).click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain("export WEIR_API_KEY=");

    await expect(step(page, 2).getByTestId("code-block").first()).toContainText('"finish_reason": "stop"');
    await expect(step(page, 3).getByTestId("code-block").last()).toContainText("data: [DONE]");
  });

  test("the SDK default base URL is shown with its override", async ({ page }) => {
    await page.goto("/docs/quickstart/");
    const install = step(page, 1);
    const override = install.getByTestId("code-panel").nth(1);
    await expect(override.getByRole("tabpanel")).toContainText("base_url");
    await override.getByRole("tab", { name: "Node" }).click();
    await expect(override.getByRole("tabpanel")).toContainText("baseURL");
  });

  test("every Next steps link answers 200", async ({ page, request }) => {
    await page.goto("/docs/quickstart/");
    const links = step(page, 4).getByRole("list").getByRole("link");
    const hrefs = await links.evaluateAll((els) => els.map((e) => e.getAttribute("href") ?? ""));
    expect(hrefs.length).toBeGreaterThanOrEqual(4);
    expect(hrefs).toEqual(
      expect.arrayContaining(["/models/", `/models/${llama.slug}/`, "/pricing/", "/enterprise/#contact"]),
    );
    for (const href of hrefs) {
      expect(href).toMatch(/^\//);
      const res = await request.get(href.split("#")[0]);
      expect(res.status(), href).toBe(200);
    }
  });

  for (const width of [360, 1280, 1440]) {
    test(`never scrolls sideways at ${width}px; long code scrolls inside its panel`, async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop", "sets its own viewport");
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/docs/quickstart/");
      const overflow = () =>
        page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(await overflow()).toBeLessThanOrEqual(0);
      // Switch every panel to its widest tab and check again.
      for (const name of ["curl", "Python", "Node"]) {
        for (const tab of await page.getByRole("tab", { name, exact: true }).all()) {
          if (await tab.isVisible()) await tab.click();
        }
        expect(await overflow()).toBeLessThanOrEqual(0);
      }
      // Every scrollable code region can be reached with the keyboard.
      const unreachable = await page.evaluate(() =>
        [...document.querySelectorAll("article pre")]
          .map((pre) => pre.parentElement!)
          .filter((el) => el.scrollWidth > el.clientWidth && el.tabIndex < 0)
          .map((el) => el.outerHTML.slice(0, 80)),
      );
      expect(unreachable).toEqual([]);
    });
  }

  test("prose keeps a readable line length", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "wide viewport");
    await page.goto("/docs/quickstart/");
    const widest = await article(page)
      .locator("p:not(.label-mono)")
      .evaluateAll((ps) => Math.max(...ps.map((p) => p.getBoundingClientRect().width)));
    // ~70 characters of Funnel Sans at 16px is about 560px.
    expect(widest).toBeLessThanOrEqual(570);
  });
});
