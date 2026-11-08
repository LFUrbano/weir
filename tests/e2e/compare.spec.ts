import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { getModel, models } from "../../src/data/models";
import { similarModels } from "../../src/lib/similar";
import { modelKind } from "../../src/lib/model-display";
import { collectErrors } from "./errors";

const PATH = "/models/compare/";
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

const llama = getModel("llama-3-3-70b")!;
const qwen = getModel("qwen3-32b")!;

const picker = (page: Page, side: "A" | "B") => page.getByRole("combobox", { name: `Model ${side}` });

/** The two value cells of a table row, by its label. */
function cells(page: Page, label: string) {
  const row = page.getByRole("row").filter({ has: page.getByRole("rowheader", { name: label, exact: true }) });
  return { a: row.locator('[data-side="a"]'), b: row.locator('[data-side="b"]') };
}

/** Controls come alive after hydration. */
async function ready(page: Page) {
  await expect(page.getByRole("button", { name: "Swap A and B" })).toBeEnabled();
}

test.describe("compare page without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the static HTML is the default pair, complete", async ({ page }) => {
    await page.goto(PATH);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Compare models");
    await expect(picker(page, "A")).toContainText(llama.name);
    await expect(picker(page, "B")).toContainText(qwen.name);
    await expect(cells(page, "Input").b).toContainText("$0.30");
    await expect(cells(page, "Input").b).toContainText("44% less");
    // Break-even is a threshold, not ranked.
    await expect(cells(page, "Break-even vs serverless").b).toHaveText("4.54B tok/mo");
    await expect(page.getByTestId("volume-summary")).toHaveText("Qwen3 32B costs $230 less a month at 1B tokens.");
    await expect(page.getByTestId("request-diff")).toContainText('"model": "qwen3-32b"');
  });
});

test.describe("compare page", () => {
  test("the raw HTML names both models and the price difference", async ({ request }) => {
    const html = await (await request.get(PATH)).text();
    for (const text of ["Llama 3.3 70B", "Qwen3 32B", "44% less"]) expect(html).toContain(text);
  });

  test("changing B writes the URL and the rows, and Back returns", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(PATH);
    await ready(page);
    await picker(page, "B").click();
    // B lists only chat models, never A itself.
    await expect(page.getByRole("option", { name: "BGE-M3" })).toHaveCount(0);
    await expect(page.getByRole("option", { name: llama.name })).toHaveCount(0);
    await page.getByRole("option", { name: "Llama 3.1 8B Instruct" }).click();

    await expect(page).toHaveURL(/\/models\/compare\/\?a=llama-3-3-70b&b=llama-3-1-8b$/);
    await expect(picker(page, "B")).toContainText("Llama 3.1 8B Instruct");
    await expect(cells(page, "Input").b).toContainText("$0.10");
    await expect(page.getByTestId("request-diff")).toContainText('"model": "llama-3-1-8b"');

    await page.goBack();
    await expect(page).toHaveURL(/\/models\/compare\/$/);
    await expect(picker(page, "B")).toContainText(qwen.name);
    await expect(cells(page, "Input").b).toContainText("$0.30");
    expect(errors).toEqual([]);
  });

  test("Swap reverses the pair and its marks", async ({ page }) => {
    await page.goto(PATH);
    await ready(page);
    await page.getByRole("button", { name: "Swap A and B" }).click();
    await expect(page).toHaveURL(/\?a=qwen3-32b&b=llama-3-3-70b$/);
    await expect(picker(page, "A")).toContainText(qwen.name);
    await expect(cells(page, "Input").a).toContainText("44% less");
    await expect(cells(page, "Input").b).not.toContainText("less");
    await page.goBack();
    await expect(picker(page, "A")).toContainText(llama.name);
  });

  test("changing A to another kind brings a B of that kind", async ({ page }) => {
    await page.goto(PATH);
    await ready(page);
    await picker(page, "A").click();
    await page.getByRole("option", { name: "BGE-M3" }).click();

    await expect(page).toHaveURL(/\?a=bge-m3&b=[a-z0-9-]+$/);
    const b = page.url().match(/[?&]b=([^&]+)/)![1];
    expect(modelKind(getModel(b)!)).toBe("embeddings");
    expect(b).not.toBe("bge-m3");
    await expect(picker(page, "A")).toContainText("BGE-M3");
    await expect(picker(page, "B")).toContainText(getModel(b)!.name);
    await expect(page.getByTestId("compare-group-price").getByRole("rowheader")).toHaveText(["Input"]);
  });

  test("picking B's model as A swaps the two", async ({ page }) => {
    await page.goto(PATH);
    await ready(page);
    await picker(page, "A").click();
    await page.getByRole("option", { name: qwen.name, exact: true }).click();
    await expect(page).toHaveURL(/\?a=qwen3-32b&b=llama-3-3-70b$/);
    await expect(picker(page, "B")).toContainText(llama.name);
  });

  test("a pair of two kinds in the URL is corrected to one kind", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(`${PATH}?a=llama-3-3-70b&b=flux-1-dev`);
    await ready(page);
    await expect(picker(page, "A")).toContainText(llama.name);
    await expect(picker(page, "B")).not.toContainText("FLUX");
    const b = page.url().match(/[?&]b=([^&]+)/)?.[1];
    expect(b && modelKind(getModel(b)!)).toBe("chat");
    await expect(page).toHaveURL(/\?a=llama-3-3-70b&b=/);
    await expect(page.getByRole("rowheader", { name: "Decode speed, one request" })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("an unknown or repeated slug falls back to a valid pair", async ({ page }) => {
    await page.goto(`${PATH}?a=nope&b=nope`);
    await ready(page);
    await expect(picker(page, "A")).toContainText(llama.name);
    await expect(picker(page, "B")).toContainText(qwen.name);

    await page.goto(`${PATH}?a=qwen3-32b&b=qwen3-32b`);
    await ready(page);
    await expect(picker(page, "A")).toContainText(qwen.name);
    await expect(picker(page, "B")).not.toContainText(qwen.name);
    await expect(page).not.toHaveURL(/b=qwen3-32b/);
  });

  test("embeddings: input price only, and the estimate bills input only", async ({ page }) => {
    await page.goto(`${PATH}?a=bge-m3`);
    await ready(page);
    const expected = similarModels(getModel("bge-m3")!, models.length).find(
      (m) => modelKind(m) === "embeddings",
    )!;
    await expect(picker(page, "B")).toContainText(expected.name);
    const price = page.getByTestId("compare-group-price");
    await expect(price.getByRole("rowheader")).toHaveText(["Input"]);
    await expect(page.getByRole("rowheader", { name: "Decode speed, one request" })).toHaveCount(0);
    await expect(page.getByTestId("volume-estimate")).toContainText("$10.00 / month");
    await expect(page.getByTestId("request-diff")).toContainText("/v1/embeddings");
  });

  test("volume presets change the estimate but not the URL", async ({ page }) => {
    await page.goto(PATH);
    await ready(page);
    const group = page.getByRole("group", { name: "Monthly tokens" });
    await expect(group.getByRole("button", { name: "1B" })).toHaveAttribute("aria-pressed", "true");
    await group.getByRole("button", { name: "10B" }).click();
    await expect(group.getByRole("button", { name: "10B" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("volume-summary")).toHaveText(
      "Qwen3 32B costs $2,300 less a month at 10B tokens.",
    );
    await expect(page).toHaveURL(/\/models\/compare\/$/);
    await expect(page.getByRole("link", { name: "Open the calculator" })).toHaveAttribute(
      "href",
      "/pricing/#calculator",
    );
  });

  test("Copy link copies the address and says so", async ({ page }) => {
    await page.goto(`${PATH}?a=llama-4-scout&b=llama-4-maverick`);
    await ready(page);
    await page.getByRole("button", { name: "Copy link" }).click();
    await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Link copied" })).toHaveCount(1);
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(page.url());
    await expect(page.getByRole("button", { name: "Copy link" })).toBeVisible({ timeout: 4000 });
  });

  test("the Compare link on a model page opens that pair", async ({ page }) => {
    const similar = similarModels(llama)[0];
    await page.goto(`/models/${llama.slug}/`);
    await page
      .getByRole("region", { name: "Similar models" })
      .getByRole("link", { name: `Compare with ${similar.name}` })
      .click();
    await expect(page).toHaveURL(new RegExp(`/models/compare/\\?a=${llama.slug}&b=${similar.slug}$`));
    await expect(picker(page, "A")).toContainText(llama.name);
    await expect(picker(page, "B")).toContainText(similar.name);
  });

  test("no axe violations and no sideways scroll at 1440 and 390", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "sets its own viewport sizes");
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(PATH);
      await ready(page);
      const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
      expect(
        violations
          .filter((v) => v.impact === "serious" || v.impact === "critical")
          .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
        `${width}px`,
      ).toEqual([]);
      const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(scrollWidth, `${width}px`).toBeLessThanOrEqual(innerWidth);
    }
  });
});
