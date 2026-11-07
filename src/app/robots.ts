import type { MetadataRoute } from "next";
import { siteUrl } from "@/data/site";

// Written once at build time to /robots.txt. Every page is open to crawlers.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: new URL("/sitemap.xml", siteUrl).href,
  };
}
