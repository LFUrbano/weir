import { expect, test, type Page } from "@playwright/test";
import { snippetsFor } from "../../src/components/code/snippets";
import { getModel } from "../../src/data/models";

const llama = getModel("llama-3-3-70b")!;
const snippets = snippetsFor(llama);

async function visibleSnippet(page: Page) {
  const panel = page.getByRole("tabpanel");
  await expect(panel).toHaveCount(1);
  return (await panel.locator("pre").textContent()) ?? "";
}

test.describe("code panel", () => {
  test("shows curl first with the Llama 3.3 70B request", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("tab", { name: "curl" })).toHaveAttribute("aria-selected", "true");
    expect(await visibleSnippet(page)).toBe(snippets.curl);
    expect(snippets.curl).toContain("https://api.weir.example/v1/chat/completions");
  });

  test("switches tabs with a click", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Python" }).click();
    await expect(page.getByRole("tab", { name: "Python" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(await visibleSnippet(page)).toBe(snippets.python);
    await page.getByRole("tab", { name: "Node" }).click();
    expect(await visibleSnippet(page)).toBe(snippets.node);
  });

  test("switches tabs with the arrow keys", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "curl" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Python" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByRole("tab", { name: "Python" })).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Node" })).toHaveAttribute("aria-selected", "true");
    expect(await visibleSnippet(page)).toBe(snippets.node);
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByRole("tab", { name: "Python" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("copies exactly the visible snippet and confirms it", async ({ page }) => {
    await page.goto("/");
    for (const name of ["curl", "Python", "Node"]) {
      await page.getByRole("tab", { name }).click();
      const shown = await visibleSnippet(page);
      await page.getByRole("button", { name: "Copy", exact: true }).click();
      await expect(page.getByRole("button", { name: "Copied", exact: true })).toBeVisible();
      await expect(page.getByRole("status")).toHaveText(/Copied/);
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(shown);
      // The label returns to "Copy" after about two seconds.
      await expect(page.getByRole("button", { name: "Copy", exact: true })).toBeVisible({
        timeout: 4000,
      });
    }
  });

  test("highlights strings and keys with the theme colors", async ({ page }) => {
    await page.goto("/");
    const panel = page.getByRole("tabpanel");
    await expect(panel.locator('[data-token="string"]').first()).toHaveCSS(
      "color",
      "rgb(143, 209, 168)",
    );
    await expect(panel.locator('[data-token="key"]').first()).toHaveCSS(
      "color",
      "rgb(255, 181, 71)",
    );
  });

  test("never makes the page scroll sideways", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/");
    await page.getByRole("tab", { name: "Node" }).click();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
