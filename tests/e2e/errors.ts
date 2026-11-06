import type { Page, Request } from "@playwright/test";

/**
 * Pages that the header, the footer and the model pages already link to but
 * a later task builds. The Next router prefetches them with fetch() and gets
 * a 404 until they exist. Tasks 9 and 10 remove each entry as its page lands:
 * /docs/quickstart/ (Task 10). /pricing/ landed in Task 8, /enterprise/ in Task 9.
 */
export const NOT_YET_BUILT = ["/docs/quickstart/"];

/**
 * The only 404s tolerated are the Next router's own fetch() prefetches:
 * - segment payloads (`.txt`, or `_rsc`); in the static export some names, such
 *   as `/models/__next.models.__PAGE__.txt`, are never written (Task 11);
 * - the route paths in NOT_YET_BUILT (Ruling 1).
 * Any other 404, including a prefetch of a mistyped internal link such as
 * `/models/typo/`, and any script, stylesheet, font, image or document that
 * 404s, is reported.
 */
export function isTolerated404(request: Request): boolean {
  if (request.resourceType() !== "fetch") return false;
  const { pathname, searchParams } = new URL(request.url());
  return (
    pathname.endsWith(".txt") || searchParams.has("_rsc") || NOT_YET_BUILT.includes(pathname)
  );
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
