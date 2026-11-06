import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { getModel, models, type Model } from "../../src/data/models";
import { formatLatency } from "../../src/lib/format";
import { collectErrors } from "./errors";

function model(slug: string): Model {
  const m = getModel(slug);
  if (!m) throw new Error(`No model ${slug}`);
  return m;
}

const llama = model("llama-3-3-70b");
const flux = model("flux-1-dev");
const bge = model("bge-m3");

const latencyChart = (page: Page) => page.getByRole("img", { name: /^Time to first token/ });
const responseChart = (page: Page) => page.getByRole("img", { name: /^Response time/ });
const speedChart = (page: Page) => page.getByRole("img", { name: /^Decode speed/ });

/** Width and height from a PNG's IHDR chunk. */
function pngSize(body: Buffer): { width: number; height: number } {
  return { width: body.readUInt32BE(16), height: body.readUInt32BE(20) };
}

/** Fetches a share image by its path on the local server (og:image is absolute). */
async function fetchShareImage(request: APIRequestContext, content: string | null) {
  expect(content, "og:image is set").toBeTruthy();
  const url = new URL(content!);
  const res = await request.get(url.pathname);
  expect(res.status(), url.pathname).toBe(200);
  expect(res.headers()["content-type"]).toMatch(/^image\/png/);
  const body = await res.body();
  expect(pngSize(body)).toEqual({ width: 1200, height: 630 });
  return url;
}

test.describe("model page", () => {
  test("token model: header, prices, specs and code", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(`/models/${llama.slug}/`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(llama.name);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Llama 3.3 70B");

    const price = page.getByTestId("model-price");
    await expect(price).toContainText("$0.54");
    await expect(price).toContainText("$0.72");

    const specs = page.getByTestId("model-specs");
    await expect(specs).toContainText("128K");
    await expect(specs).toContainText(llama.quantization);
    for (const r of llama.regions) await expect(specs).toContainText(r);

    const code = page.getByRole("tabpanel");
    await expect(code).toContainText(`"model": "${llama.slug}"`);
    await expect(code).toContainText("/v1/chat/completions");

    await expect(page.getByRole("main")).not.toContainText(/NaN|Infinity|undefined/);
    expect(errors).toEqual([]);
  });

  test("the chart states the median and has a data table", async ({ page }) => {
    await page.goto(`/models/${llama.slug}/`);
    await expect(latencyChart(page)).toHaveAttribute(
      "aria-label",
      new RegExp(`median ${formatLatency(llama.p50Ms)}`),
    );
    await expect(speedChart(page)).toHaveAttribute(
      "aria-label",
      new RegExp(`median ${llama.tokensPerSec} tok/s`),
    );

    await page.getByText("Show the data").click();
    const table = page.getByRole("table", { name: /15-minute/ });
    await expect(table).toBeVisible();
    // A header row plus one row per 15-minute step.
    await expect(table.getByRole("row")).toHaveCount(97);
  });

  test("hover and the arrow keys read values off the chart", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "pointer and keyboard on desktop");
    const errors = collectErrors(page);
    await page.goto(`/models/${llama.slug}/`);
    const plot = page.getByTestId("metrics-plot").first();
    const tooltip = page.getByTestId("metrics-tooltip");
    await expect(tooltip).toBeHidden();

    const box = await plot.boundingBox();
    if (!box) throw new Error("plot has no box");
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText(/\d+ ms/);
    await expect(tooltip).toContainText(/\d+ tok\/s/);
    await page.mouse.move(box.x + box.width * 0.5, box.y - 200);
    await expect(tooltip).toBeHidden();

    const group = page.getByRole("group", { name: /Last 24 hours/ });
    await group.focus();
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText("15m ago");
    await page.keyboard.press("Home");
    await expect(tooltip).toContainText("24h ago");
    await page.keyboard.press("ArrowRight");
    await expect(tooltip).toContainText("23h 45m ago");
    expect(errors).toEqual([]);
  });

  test("dedicated CTA and three similar models", async ({ page, request }) => {
    await page.goto(`/models/${llama.slug}/`);
    const cta = page.getByRole("link", { name: "Run on dedicated GPUs" });
    await expect(cta).toHaveAttribute("href", "/enterprise/");

    const similar = page.getByRole("region", { name: "Similar models" }).getByRole("link");
    await expect(similar).toHaveCount(3);
    const slugs = models.map((m) => m.slug);
    for (const href of await similar.evaluateAll((els) => els.map((el) => el.getAttribute("href")))) {
      const slug = href?.match(/^\/models\/([^/]+)\/$/)?.[1];
      expect(slug && slugs.includes(slug), String(href)).toBeTruthy();
      expect(slug).not.toBe(llama.slug);
      expect((await request.get(href!)).status(), href!).toBe(200);
    }
  });

  test("title, description and share image", async ({ page, request }) => {
    await page.goto(`/models/${llama.slug}/`);
    await expect(page).toHaveTitle(`${llama.name} — Weir`);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", llama.summary);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      `${llama.name} — Weir`,
    );
    const og = page.locator('meta[property="og:image"]');
    await expect(og).toHaveCount(1);
    const url = await fetchShareImage(request, await og.getAttribute("content"));
    expect(url.pathname).toContain(llama.slug);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary_large_image",
    );
  });

  test("the home page has its own share image", async ({ page, request }) => {
    await page.goto("/");
    const og = page.locator('meta[property="og:image"]');
    await expect(og).toHaveCount(1);
    await fetchShareImage(request, await og.getAttribute("content"));
  });

  test("image model: price per image, latency only", async ({ page }) => {
    await page.goto(`/models/${flux.slug}/`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(flux.name);
    await expect(page.getByTestId("model-price")).toContainText("$0.025 / image");
    await expect(page.getByTestId("model-specs")).not.toContainText("Context");
    await expect(responseChart(page)).toHaveAttribute(
      "aria-label",
      new RegExp(`median ${formatLatency(flux.p50Ms)}`),
    );
    await expect(speedChart(page)).toHaveCount(0);
    await expect(page.getByRole("tabpanel")).toContainText("/v1/images/generations");
    // No dedicated option for this model: the CTA says so instead.
    await expect(page.getByRole("link", { name: "Run on dedicated GPUs" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Talk to an engineer" }).last()).toHaveAttribute(
      "href",
      "/enterprise/",
    );
    await expect(page.getByRole("main")).not.toContainText(/NaN|Infinity|undefined/);
  });

  test("embedding model: no output price, latency only", async ({ page }) => {
    await page.goto(`/models/${bge.slug}/`);
    const price = page.getByTestId("model-price");
    await expect(price).toContainText("$0.01");
    await expect(price).toContainText("—");
    await expect(responseChart(page)).toHaveCount(1);
    await expect(speedChart(page)).toHaveCount(0);
    await expect(page.getByRole("tabpanel")).toContainText("/v1/embeddings");
  });

  test("every model has a page and a share image", async ({ request }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "HTTP only, once");
    for (const m of models) {
      const res = await request.get(`/models/${m.slug}/`);
      expect(res.status(), m.slug).toBe(200);
      const html = await res.text();
      const og = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1] ?? null;
      const url = await fetchShareImage(request, og);
      expect(url.pathname, m.slug).toContain(m.slug);
    }
  });

  // Review Focus 3: a slug that is not in the data is a static 404.
  test("an unknown slug is a 404", async ({ page }) => {
    const res = await page.goto("/models/nao-existe/");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
  });

  test("phones: no horizontal scroll", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "phone layout only");
    for (const slug of [llama.slug, flux.slug]) {
      for (const width of [360, 412]) {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(`/models/${slug}/`);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(overflow, `${slug} at ${width}`).toBeLessThanOrEqual(0);
      }
    }
  });
});
