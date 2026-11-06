import { expect, test } from "@playwright/test";
import { siteNav } from "../../src/data/site";

test.describe("site shell", () => {
  test("header nav links", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop navigation only");
    await page.goto("/");
    const header = page.getByRole("banner");

    for (const item of siteNav) {
      const link = header.getByRole("link", { name: item.label, exact: true });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", item.href);
    }

    const cta = header.getByRole("link", { name: "Get an API key" });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/docs/quickstart/");

    // "Sign in" is muted text with no destination, never a link.
    await expect(header.getByText("Sign in", { exact: true })).toBeVisible();
    await expect(header.getByRole("link", { name: "Sign in" })).toHaveCount(0);
  });

  test("mobile nav", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile navigation only");
    await page.goto("/");
    const header = page.getByRole("banner");

    for (const item of siteNav) {
      await expect(header.getByRole("link", { name: item.label, exact: true })).toBeHidden();
    }

    await header.getByRole("button", { name: "Menu" }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    for (const item of siteNav) {
      const link = sheet.getByRole("link", { name: item.label, exact: true });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", item.href);
    }

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    // Focus goes back to the Menu button (the sheet has no Radix trigger).
    await expect(header.getByRole("button", { name: "Menu" })).toBeFocused();
    await expect(header.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "false");
  });

  test("the mobile menu has an accessible description (no Radix warning)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile navigation only");
    const warnings: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "warning" || m.type() === "error") warnings.push(m.text());
    });
    await page.goto("/");
    await page.getByRole("banner").getByRole("button", { name: "Menu" }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await expect(sheet).toHaveAccessibleDescription("Links to every section of the site.");
    expect(warnings.filter((w) => /Description|aria-describedby/.test(w))).toEqual([]);
  });

  test("mobile nav closes on navigation", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile navigation only");

    // From another page: the logo inside the sheet navigates home, and the
    // sheet (which lives in the root layout) must not survive the navigation.
    await page.goto("/nao-existe/");
    await page.getByRole("banner").getByRole("button", { name: "Menu" }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await sheet.getByRole("link", { name: "Weir home" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(sheet).toBeHidden();

    // Same page: tapping the logo while already home also closes the sheet.
    await page.getByRole("banner").getByRole("button", { name: "Menu" }).click();
    await expect(sheet).toBeVisible();
    await sheet.getByRole("link", { name: "Weir home" }).click();
    await expect(sheet).toBeHidden();
  });

  test("footer note", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await expect(footer).toContainText("Fictional company. Concept project.");
    await expect(footer).toContainText("All systems normal");
  });

  test("no dead links", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('a[href="#"]')).toHaveCount(0);
    await expect(page.locator("a:not([href])")).toHaveCount(0);
  });

  test("404", async ({ page }) => {
    await page.goto("/nao-existe/");
    await expect(page.getByText("Page not found")).toBeVisible();
    const main = page.getByRole("main");
    // The dot next to "HTTP 404" is the error state, not a degraded service.
    await expect(main.locator('[data-state="error"]')).toHaveCount(1);
    await expect(main.locator('[data-state="degraded"]')).toHaveCount(0);
    await expect(main.locator('a[href="/"]')).toBeVisible();
  });
});
