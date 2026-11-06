import { expect, test, type Locator } from "@playwright/test";
import { getModel, isTokenModel } from "../../src/data/models";
import { formatUsd } from "../../src/lib/format";

/**
 * Every page reads prices from src/data/models.ts, so one model must show the
 * same input and output price everywhere it appears.
 */
const llama = getModel("llama-3-3-70b");
if (!llama || !isTokenModel(llama)) throw new Error("llama-3-3-70b must be a token model");
const input = formatUsd(llama.pricing.input);
const output = formatUsd(llama.pricing.output);

async function expectPrices(where: Locator) {
  await expect(where).toBeVisible();
  await expect(where).toContainText(input);
  await expect(where).toContainText(output);
}

test.describe("price consistency: Llama 3.3 70B", () => {
  test("the data says $0.54 in and $0.72 out", () => {
    expect([input, output]).toEqual(["$0.54", "$0.72"]);
  });

  test("home catalog preview", async ({ page }) => {
    await page.goto("/");
    const row = page.getByTestId("catalog-preview").locator("tr").filter({ hasText: llama.name });
    await expectPrices(row);
  });

  test("models catalog", async ({ page, isMobile }) => {
    await page.goto("/models/");
    const row = isMobile
      ? page.locator(`[data-testid="catalog-cards"] li[data-slug="${llama.slug}"]`)
      : page.locator(`[data-testid="catalog-table"] tr[data-slug="${llama.slug}"]`);
    await expectPrices(row);
  });

  test("model page", async ({ page }) => {
    await page.goto(`/models/${llama.slug}/`);
    await expectPrices(page.getByTestId("model-price"));
  });

  test("pricing table", async ({ page }) => {
    await page.goto("/pricing/");
    const row = page.locator(`[data-testid="serverless-table"] tr[data-slug="${llama.slug}"]`);
    await expect(row.locator('[data-col="input"]')).toHaveText(input);
    await expect(row.locator('[data-col="output"]')).toHaveText(output);
  });
});
