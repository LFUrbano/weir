import { expect, test } from "@playwright/test";
import { models } from "../../src/data/models";

/**
 * Crawls the whole site from the home page and the 404 page, through every
 * internal <a href> in the rendered DOM (client components included), and
 * checks that each destination is a page that answers 200 and that each
 * #fragment names an element on that page.
 */
test("every internal link leads to a page that exists, and every anchor to an id on it", async ({
  page,
  baseURL,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "one crawl is enough");
  test.setTimeout(180_000);
  const origin = new URL(baseURL!).origin;

  const status = new Map<string, number>();
  const ids = new Map<string, Set<string>>();
  // destination ("/path/#id" or "/path/") -> pages that link to it
  const linkedFrom = new Map<string, Set<string>>();
  const queue = ["/", "/nao-existe/"];
  const sameProblems: string[] = [];

  while (queue.length) {
    const path = queue.shift()!;
    if (status.has(path)) continue;
    const res = await page.goto(path, { waitUntil: "load" });
    status.set(path, res?.status() ?? 0);

    const found = await page.evaluate(() => ({
      hrefs: [...document.querySelectorAll("a[href]")].map((a) => (a as HTMLAnchorElement).href),
      ids: [...document.querySelectorAll("[id]")].map((el) => el.id),
    }));
    ids.set(path, new Set(found.ids));

    for (const href of found.hrefs) {
      const url = new URL(href);
      if (url.origin !== origin) continue;
      // Same-page anchors (the skip link, a table of contents) are checked
      // on this page, whatever its status: the 404 page has one too.
      if (url.pathname === path && url.hash) {
        const id = decodeURIComponent(url.hash.slice(1));
        if (!found.ids.includes(id)) sameProblems.push(`no #${id} on ${path} (same-page link)`);
        continue;
      }
      const key = url.pathname + url.hash;
      if (!linkedFrom.has(key)) linkedFrom.set(key, new Set());
      linkedFrom.get(key)!.add(path);
      if (!status.has(url.pathname) && !queue.includes(url.pathname)) queue.push(url.pathname);
    }
  }

  const problems: string[] = [...sameProblems];
  for (const [dest, from] of linkedFrom) {
    const [path, hash] = dest.split("#");
    const where = `${dest} (linked from ${[...from].join(", ")})`;
    if (status.get(path) !== 200) problems.push(`${status.get(path)} ${where}`);
    else if (hash && !ids.get(path)!.has(decodeURIComponent(hash))) problems.push(`no #${hash} on ${where}`);
  }
  expect(problems).toEqual([]);

  // The crawl reached every model page and the 404 page answered 404.
  for (const m of models) expect(status.get(`/models/${m.slug}/`), m.slug).toBe(200);
  expect(status.get("/nao-existe/")).toBe(404);
});
