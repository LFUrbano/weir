import type { Page } from "@playwright/test";

/**
 * Presses the command menu shortcut the page listens for: Cmd+K where
 * navigator.platform is Apple (a Mac, or an emulated one), Ctrl+K elsewhere.
 * Same test as CommandMenu's isApplePlatform().
 */
export async function pressMenuShortcut(page: Page): Promise<void> {
  const apple = await page.evaluate(() =>
    /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent),
  );
  await page.keyboard.press(apple ? "Meta+k" : "Control+k");
}
