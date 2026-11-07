import type { MetadataRoute } from "next";
import { siteUrl } from "@/data/site";
import { sitePaths } from "@/lib/metadata";

// Written once at build time to /sitemap.xml.
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return sitePaths().map((path) => ({ url: new URL(path, siteUrl).href }));
}
