import type { Page } from "@playwright/test";

/**
 * Uncaught errors, console errors and failed responses on the page. Nothing
 * is tolerated: every page the site links to is built, and every segment file
 * the router prefetches exists (scripts/fix-segment-files.mjs), so any script,
 * stylesheet, font, image, document or prefetch that fails is reported.
 */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    // The browser logs each failed request as "Failed to load resource";
    // those are judged by request in the response handler below.
    if (m.text().startsWith("Failed to load resource")) return;
    errors.push(m.text());
  });
  page.on("response", (r) => {
    if (r.status() < 400) return;
    errors.push(`${r.status()} ${r.request().resourceType()} ${r.url()}`);
  });
  return errors;
}
