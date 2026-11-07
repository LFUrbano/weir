import { expect, test, type Locator, type Page } from "@playwright/test";
import { dataRetention } from "../../src/data/company";
import { gpus } from "../../src/data/gpus";
import { getModel, isDedicatedModel, isTokenModel, models } from "../../src/data/models";
import { formatPerImage } from "../../src/lib/format";
import { BREAK_EVEN_LABEL, formatBreakEven, modelPrice } from "../../src/lib/model-display";
import { breakEvenMonthlyTokens } from "../../src/lib/pricing";
import { collectErrors } from "./errors";

const tokenModels = models.filter(isTokenModel);
const imageModels = models.filter((m) => m.pricing.unit === "image");

const calculator = (page: Page) => page.getByTestId("calculator");
const inputField = (page: Page) => page.getByRole("textbox", { name: "Input tokens per month" });
const outputField = (page: Page) => page.getByRole("textbox", { name: "Output tokens per month" });
const inputSlider = (page: Page) => page.getByRole("slider", { name: "Input tokens per month" });
const serverlessCost = (page: Page) => page.getByTestId("cost-serverless");
const dedicatedCost = (page: Page) => page.getByTestId("cost-dedicated");

async function pickModel(page: Page, name: string) {
  await page.getByRole("combobox", { name: "Model" }).click();
  await page.getByRole("option", { name: new RegExp(`^${name}`) }).click();
  await expect(page.getByRole("combobox", { name: "Model" })).toContainText(name);
}

async function type(field: Locator, text: string) {
  await field.fill(text);
  await field.blur();
}

/** Every amount the calculator shows is a plain dollar figure: no NaN, Infinity or minus sign. */
async function expectSaneResult(page: Page) {
  await expect(calculator(page)).not.toContainText(/NaN|Infinity|undefined|-\$|\$-|−/);
  await expect(serverlessCost(page)).toHaveText(/^\$\d{1,3}(,\d{3})*\.\d{2}$/);
}

test.describe("pricing page", () => {
  test("serverless table: one row per token model, at the data file's prices", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/pricing/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const table = page.getByTestId("serverless-table");
    await expect(table.locator("tbody tr")).toHaveCount(tokenModels.length);
    for (const m of tokenModels) {
      const price = modelPrice(m);
      if (price.unit !== "tokens") throw new Error(`${m.slug} is a token model`);
      const row = table.locator(`tr[data-slug="${m.slug}"]`);
      await expect(row.getByRole("link", { name: m.name })).toHaveAttribute("href", `/models/${m.slug}/`);
      await expect(row.locator('[data-col="input"]')).toHaveText(price.input);
      await expect(row.locator('[data-col="output"]')).toHaveText(price.output);
      if (!isDedicatedModel(m)) await expect(row).toContainText("Serverless only");
    }

    const images = page.getByTestId("image-table");
    await expect(images.locator("tbody tr")).toHaveCount(imageModels.length);
    for (const m of imageModels) {
      if (m.pricing.unit !== "image") continue;
      await expect(images.locator(`tr[data-slug="${m.slug}"]`)).toContainText(
        formatPerImage(m.pricing.perImage),
      );
    }
    await expect(page.getByRole("main")).not.toContainText(/NaN|Infinity|undefined/);
    expect(errors).toEqual([]);
  });

  test("dedicated table: H100 at $2.49/hr, H200 and B200", async ({ page }) => {
    await page.goto("/pricing/");
    const table = page.getByTestId("gpu-table");
    await expect(table.locator("tbody tr")).toHaveCount(gpus.length);
    await expect(table.locator('tr[data-gpu="h100"]')).toContainText("$2.49/hr");
    for (const g of gpus) {
      const row = table.locator(`tr[data-gpu="${g.id}"]`);
      await expect(row).toContainText(g.name);
      await expect(row).toContainText(`$${g.hourly.toFixed(2)}/hr`);
    }
  });

  test("calculator: Llama 3.3 70B, 100M in and 20M out", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/pricing/");
    await pickModel(page, "Llama 3.3 70B");
    await type(inputField(page), "100000000");
    await type(outputField(page), "20000000");

    await expect(serverlessCost(page)).toHaveText("$68.40");
    await expect(dedicatedCost(page)).toHaveText("$3,635.40");
    await expect(calculator(page)).toHaveAttribute("data-cheaper", "serverless");
    const breakEven = page.getByTestId("break-even");
    // The mix comes from the person's own numbers: 100M of 120M is input.
    await expect(breakEven).toContainText("6.38B");
    await expect(breakEven).toContainText("$0.57");
    await expect(inputField(page)).toHaveValue("100,000,000");
    expect(errors).toEqual([]);
  });

  test("calculator: dedicated wins once a replica pays for itself", async ({ page }) => {
    await page.goto("/pricing/");
    await pickModel(page, "Llama 3.3 70B");
    await type(inputField(page), "6000000000");
    await type(outputField(page), "1000000000");
    await expect(serverlessCost(page)).toHaveText("$3,960.00");
    await expect(dedicatedCost(page)).toHaveText("$3,635.40");
    await expect(calculator(page)).toHaveAttribute("data-cheaper", "dedicated");
    await expect(page.getByTestId("verdict")).toContainText("$324.60");
  });

  test("calculator: serverless-only models say so", async ({ page }) => {
    await page.goto("/pricing/");
    await pickModel(page, "DeepSeek R1 0528");
    await expect(dedicatedCost(page)).toHaveText("Serverless only");
    // Nothing to compare against, so nothing is marked cheaper.
    await expect(calculator(page).getByText("Cheaper")).toHaveCount(0);
    await expectSaneResult(page);
  });

  test("one change makes one announcement, after the result settles", async ({ page }) => {
    await page.goto("/pricing/");
    const calc = calculator(page);
    // The volume readouts are not live regions; only the summary is.
    await expect(calc.locator("output")).toHaveCount(0);
    await expect(calc.locator('[aria-live]:not([aria-live="off"]), [role="status"]')).toHaveCount(1);
    const live = page.getByTestId("calc-announcement");
    await expect(live).toHaveAttribute("aria-live", "polite");

    await pickModel(page, "Llama 3.3 70B");
    await type(inputField(page), "100000000");
    await type(outputField(page), "20000000");
    // The visible numbers update at once; the announcement waits for the input to settle.
    await expect(serverlessCost(page)).toHaveText("$68.40");
    await expect(live).toContainText("Serverless $68.40");
    await expect(live).toContainText("dedicated $3,635.40");
    await expect(live).toContainText("Serverless saves $3,567.00 a month");

    // Holding an arrow key down: many steps, then one announcement for the last one.
    await inputSlider(page).focus();
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");
    const settled = await serverlessCost(page).textContent();
    await expect(live).toContainText(`Serverless ${settled}`);
  });

  test("volume fields offer a text keypad, so K, M and B can be typed", async ({ page }) => {
    await page.goto("/pricing/");
    for (const field of [inputField(page), outputField(page)]) {
      await expect(field).toHaveAttribute("inputmode", "text");
    }
    await type(inputField(page), "250M");
    await expect(inputField(page)).toHaveValue("250,000,000");
  });

  test("empty, negative, huge and pasted text never break the result", async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await page.goto("/pricing/");
    await pickModel(page, "Llama 3.3 70B");
    await type(outputField(page), "20000000");
    const field = inputField(page);

    await type(field, "");
    await expect(field).toHaveValue("0");
    await expect(serverlessCost(page)).toHaveText("$14.40");
    await expectSaneResult(page);

    await type(field, "-5");
    await expect(field).toHaveValue("0");
    await expectSaneResult(page);

    await type(field, "1e30");
    await expect(field).toHaveValue("100,000,000,000");
    await expect(page.getByTestId("volume-input")).toHaveText("100B");
    await expect(serverlessCost(page)).toHaveText("$54,014.40");
    await expectSaneResult(page);

    // Paste through the clipboard, the way a person would.
    await page.evaluate(() => navigator.clipboard.writeText("abc"));
    await field.click();
    await field.press("ControlOrMeta+a");
    await field.press("ControlOrMeta+v");
    await expect(field).toHaveValue("abc");
    await expectSaneResult(page);
    await field.blur();
    await expect(field).toHaveValue("0");
    await expectSaneResult(page);
    expect(errors).toEqual([]);
  });

  test("slider and field stay in sync, and the slider takes the arrow keys", async ({ page }) => {
    await page.goto("/pricing/");
    const slider = inputSlider(page);
    const field = inputField(page);

    await type(field, "1000000000");
    await expect(slider).toHaveAttribute("aria-valuenow", "60");
    await expect(slider).toHaveAttribute("aria-valuetext", "1B tokens");

    await slider.focus();
    await page.keyboard.press("ArrowRight");
    await expect(slider).toHaveAttribute("aria-valuenow", "61");
    await expect(field).toHaveValue("1,100,000,000");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(field).toHaveValue("890,000,000");
    await page.keyboard.press("Home");
    await expect(field).toHaveValue("1,000,000");
    await page.keyboard.press("End");
    await expect(field).toHaveValue("100,000,000,000");
    await expectSaneResult(page);
  });

  test("the FAQ opens and closes from the keyboard, with answers in the HTML", async ({
    page,
    request,
  }) => {
    const html = await (await request.get("/pricing/")).text();
    expect(html).toContain(dataRetention.headline);
    expect(html).toContain(dataRetention.detail);

    await page.goto("/pricing/");
    const faq = page.getByTestId("faq");
    const triggers = faq.getByRole("button");
    await expect(triggers).toHaveCount(5);

    const data = faq.getByRole("button", { name: /data/i });
    const answer = faq.getByText(dataRetention.detail);
    await expect(data).toHaveAttribute("aria-expanded", "false");
    await expect(answer).toBeHidden();

    await data.focus();
    await page.keyboard.press("Enter");
    await expect(data).toHaveAttribute("aria-expanded", "true");
    await expect(answer).toBeVisible();
    await expect(faq).toContainText(dataRetention.headline);

    await page.keyboard.press("Space");
    await expect(data).toHaveAttribute("aria-expanded", "false");
    await expect(answer).toBeHidden();
  });

  test("no horizontal scroll", async ({ page }, testInfo) => {
    const widths = testInfo.project.name === "mobile" ? [360, 412] : [1280, 1440];
    for (const width of widths) {
      await page.setViewportSize({ width, height: testInfo.project.name === "mobile" ? 800 : 720 });
      await page.goto("/pricing/");
      // The widest result the calculator can show.
      await pickModel(page, "Llama 3.3 70B");
      await type(inputField(page), "1e30");
      await type(outputField(page), "1e30");
      await expect(serverlessCost(page)).toHaveText("$126,000.00");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${width}px`).toBeLessThanOrEqual(0);
    }
  });
});

test.describe("break-even across pages", () => {
  test("the model page and the pricing page make the same claim with the same number", async ({
    page,
  }) => {
    const llama = getModel("llama-3-3-70b");
    if (!llama) throw new Error("llama-3-3-70b must exist");
    const value = formatBreakEven(breakEvenMonthlyTokens(llama, 0.5) ?? 0);
    expect(value).toBe("5.77B tok/mo");

    await page.goto(`/models/${llama.slug}/`);
    const dedicated = page.locator("#dedicated");
    await expect(dedicated).toContainText(BREAK_EVEN_LABEL);
    await expect(dedicated).toContainText(value);
    await expect(dedicated).not.toContainText(/pays off above/i);

    await page.goto("/pricing/");
    const table = page.getByTestId("replica-table");
    await expect(table.locator("thead")).toContainText(BREAK_EVEN_LABEL);
    await expect(table.locator(`tr[data-slug="${llama.slug}"]`)).toContainText(value);
    await expect(page.getByRole("main")).not.toContainText(/pays off above/i);
  });
});
