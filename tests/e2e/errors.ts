import type { Page, Request } from "@playwright/test";

/**
 * The only 404s tolerated are the Next router's own prefetches, which it makes
 * with fetch() and falls back from with a full navigation:
 * - segment payloads (`.txt`); in the static export some names, such as
 *   `/models/__next.models.__PAGE__.txt`, are never written (Task 11);
 * - route paths (`/pricing/`) of pages later tasks build (Ruling 1).
 * A script, stylesheet, font, image or document that 404s is never tolerated.
 */
export function isTolerated404(request: Request): boolean {
  if (request.resourceType() !== "fetch") return false;
  const { pathname, searchParams } = new URL(request.url());
  return pathname.endsWith(".txt") || pathname.endsWith("/") || searchParams.has("_rsc");
}

/** Uncaught errors, console errors and failed responses on the page. */
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
    if (r.status() === 404 && isTolerated404(r.request())) return;
    errors.push(`${r.status()} ${r.request().resourceType()} ${r.url()}`);
  });
  return errors;
}
