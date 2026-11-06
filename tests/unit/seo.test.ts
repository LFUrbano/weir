import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { models } from "@/data/models";
import { siteUrl } from "@/data/site";
import { pageMetadata, pageTitle, sitePaths } from "@/lib/metadata";

const abs = (path: string) => new URL(path, siteUrl).href;

describe("site paths", () => {
  it("lists every page once, with a trailing slash", () => {
    const paths = sitePaths();
    expect(paths).toEqual(
      expect.arrayContaining(["/", "/models/", "/pricing/", "/enterprise/", "/docs/quickstart/"]),
    );
    for (const m of models) expect(paths).toContain(`/models/${m.slug}/`);
    expect(paths).toHaveLength(5 + models.length);
    expect(new Set(paths).size).toBe(paths.length);
    for (const p of paths) expect(p).toMatch(/^\/([a-z0-9-]+\/)*$/);
  });
});

describe("sitemap.xml", () => {
  it("has one absolute URL per page, on the same origin as metadataBase", () => {
    const entries = sitemap();
    expect(entries.map((e) => e.url)).toEqual(sitePaths().map(abs));
    for (const e of entries) expect(new URL(e.url).origin).toBe(siteUrl.origin);
  });
});

describe("robots.txt", () => {
  it("allows every crawler and points to the sitemap (no noindex anywhere)", () => {
    const r = robots();
    expect(r.rules).toEqual({ userAgent: "*", allow: "/" });
    expect(r.sitemap).toBe(abs("/sitemap.xml"));
  });
});

describe("page metadata", () => {
  it("uses one title separator everywhere", () => {
    expect(pageTitle("Pricing")).toBe("Pricing · Weir");
  });

  it("sets title, description, canonical, Open Graph and Twitter from one input", () => {
    const meta = pageMetadata({ title: "Pricing · Weir", description: "Prices.", path: "/pricing/" });
    expect(meta.title).toEqual({ absolute: "Pricing · Weir" });
    expect(meta.description).toBe("Prices.");
    expect(meta.alternates?.canonical).toBe("/pricing/");
    expect(meta.openGraph).toMatchObject({
      title: "Pricing · Weir",
      description: "Prices.",
      url: "/pricing/",
      siteName: "Weir",
      images: [{ url: "/og.png", width: 1200, height: 630 }],
    });
    expect(meta.twitter).toMatchObject({
      card: "summary_large_image",
      title: "Pricing · Weir",
      description: "Prices.",
      images: ["/og.png"],
    });
  });

  it("takes a page's own share image", () => {
    const image = { url: "/models/phi-4/og.png", alt: "Phi-4" };
    const meta = pageMetadata({ title: "Phi-4 · Weir", description: "d", path: "/models/phi-4/", image });
    expect(meta.openGraph).toMatchObject({ images: [{ ...image, width: 1200, height: 630 }] });
    expect(meta.twitter).toMatchObject({ images: [image.url] });
  });
});
