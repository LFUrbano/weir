import { expect, test } from "@playwright/test";
import { models } from "../../src/data/models";

/**
 * Head tags of every page, read from the static HTML. The origin is whatever
 * SITE_URL the build used (weir.example by default), so only the path and the
 * fact that every absolute URL shares one origin are asserted.
 */
const pages = [
  { path: "/", title: "Weir · Open models in production" },
  { path: "/models/", title: "Models · Weir" },
  ...models.map((m) => ({ path: `/models/${m.slug}/`, title: `${m.name} · Weir` })),
  { path: "/pricing/", title: "Pricing · Weir" },
  { path: "/enterprise/", title: "Enterprise · Weir" },
  { path: "/docs/quickstart/", title: "Quickstart · Weir" },
];

function meta(html: string, attr: "name" | "property", key: string): string | null {
  const tag = html.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`));
  return tag ? tag[1].replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"') : null;
}

test.describe("SEO", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "static HTML, once");
  });

  test("every page has its title, description, canonical, Open Graph and Twitter tags", async ({
    request,
  }) => {
    let origin: string | null = null;
    for (const { path, title } of pages) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
      const html = await res.text();

      expect(html.match(/<title>([^<]*)<\/title>/)?.[1], path).toBe(title);
      const description = meta(html, "name", "description");
      expect(description?.length ?? 0, `${path} description`).toBeGreaterThan(50);

      const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
      expect(canonical, `${path} canonical`).toBeTruthy();
      const url = new URL(canonical!);
      expect(url.pathname, `${path} canonical`).toBe(path);
      origin ??= url.origin;
      expect(url.origin, `${path} canonical origin`).toBe(origin);

      expect(meta(html, "property", "og:title"), path).toBe(title);
      expect(meta(html, "property", "og:description"), path).toBe(description);
      expect(meta(html, "property", "og:url"), path).toBe(canonical);
      expect(meta(html, "property", "og:site_name"), path).toBe("Weir");
      expect(meta(html, "property", "og:type"), path).toBe("website");
      const image = meta(html, "property", "og:image");
      expect(image, `${path} og:image`).toBeTruthy();
      expect(new URL(image!).origin, `${path} og:image origin`).toBe(origin);
      expect((await request.get(new URL(image!).pathname)).status(), image!).toBe(200);

      expect(meta(html, "name", "twitter:card"), path).toBe("summary_large_image");
      expect(meta(html, "name", "twitter:title"), path).toBe(title);
      expect(meta(html, "name", "twitter:image"), path).toBe(image);

      // No noindex anywhere (user decision).
      expect(html, path).not.toMatch(/noindex/i);
    }
  });

  test("descriptions price image models per image, not per token", async ({ request }) => {
    for (const path of ["/pricing/", "/models/"]) {
      const description = meta(await (await request.get(path)).text(), "name", "description") ?? "";
      expect(description, path).not.toMatch(new RegExp(`per 1M tokens for all ${models.length}`));
      expect(description, path).not.toMatch(/with price per 1M tokens/);
      expect(description, path).toMatch(/per image/);
    }
  });

  test("the 404 page has a title and keeps out of the canonical set", async ({ request }) => {
    const res = await request.get("/nao-existe/");
    expect(res.status()).toBe(404);
    const html = await res.text();
    expect(html.match(/<title>([^<]*)<\/title>/)?.[1]).toBe("Page not found · Weir");
    expect(html).not.toContain('rel="canonical"');
  });

  test("sitemap.xml lists every page, robots.txt allows all and points to it", async ({ request }) => {
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    expect(sitemap.headers()["content-type"]).toMatch(/xml/);
    const xml = await sitemap.text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
    expect(locs.sort()).toEqual(pages.map((p) => p.path).sort());

    const robots = await request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    const txt = await robots.text();
    expect(txt).toMatch(/User-Agent: \*/i);
    expect(txt).toMatch(/^Allow: \/$/m);
    expect(txt).not.toMatch(/Disallow: \//);
    const sitemapUrl = txt.match(/^Sitemap: (.+)$/m)?.[1];
    expect(new URL(sitemapUrl!).pathname).toBe("/sitemap.xml");
  });
});
