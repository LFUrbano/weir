import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/** One rule set for every axe run in this file. */
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

const pages = ["/", "/models/", "/models/llama-3-3-70b/", "/pricing/", "/enterprise/", "/docs/quickstart/"];

/** Final state of every animation, so axe judges the colors a reader ends up seeing. */
test.use({ reducedMotion: "reduce" });

for (const path of pages) {
  test(`no serious or critical axe violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const { violations } = await new AxeBuilder({ page })
      .withTags(AXE_TAGS)
      .analyze();
    const blocking = violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => `${v.impact} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
    expect(blocking).toEqual([]);
  });

  test(`no sideways scroll at 360 px on ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(scrollWidth, path).toBeLessThanOrEqual(innerWidth);
  });
}

test("no serious or critical axe violations with the break-even tooltip open", async ({ page }) => {
  await page.goto("/pricing/");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("replica-table").locator("thead").getByRole("button", { name: /^Break-even/ }).focus();
  await expect(page.getByRole("tooltip")).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  expect(
    violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id),
  ).toEqual([]);
});

test("no serious or critical axe violations on the 404 page, or with the menus open", async ({ page }, testInfo) => {
  await page.goto("/nao-existe/");
  const axe = () =>
    new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  const blocking = (v: Awaited<ReturnType<typeof axe>>["violations"]) =>
    v.filter((x) => x.impact === "serious" || x.impact === "critical").map((x) => x.id);

  expect(blocking((await axe()).violations)).toEqual([]);

  // The command menu (both projects) and the mobile sheet (phones).
  await page.getByRole("banner").getByRole("button", { name: /Search/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(blocking((await axe()).violations)).toEqual([]);
  await page.keyboard.press("Escape");

  if (testInfo.project.name === "mobile") {
    await page.getByRole("banner").getByRole("button", { name: "Menu" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(blocking((await axe()).violations)).toEqual([]);
  }
});
