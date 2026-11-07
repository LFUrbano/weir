import type { Metadata } from "next";
import { models } from "@/data/models";

export const SITE_NAME = "Weir";

/** One separator between page and brand in every title. */
export const TITLE_SEPARATOR = " · ";

export const siteDescription =
  "Run open-weight models behind one API, billed by the token, and move to dedicated GPUs when your traffic outgrows shared capacity.";

export function pageTitle(page: string): string {
  return `${page}${TITLE_SEPARATOR}${SITE_NAME}`;
}

/** The home page leads with the brand; every other page ends with it. */
export const HOME_TITLE = `${SITE_NAME}${TITLE_SEPARATOR}Open models in production`;

export type ShareImage = { url: string; alt: string };

export const siteShareImage: ShareImage = { url: "/og.png", alt: "Weir: open models in production" };

/** Every page the site builds, with the trailing slash the export uses. */
export function sitePaths(): string[] {
  return [
    "/",
    "/models/",
    ...models.map((m) => `/models/${m.slug}/`),
    "/pricing/",
    "/enterprise/",
    "/docs/quickstart/",
  ];
}

/**
 * Title, description, canonical URL and share tags for one page. Next merges
 * `openGraph` and `twitter` shallowly, so a page that sets them must set all
 * of them, image included; this builds the whole set from one input.
 * Relative URLs resolve against metadataBase (SITE_URL) in the root layout.
 */
export function pageMetadata({
  title,
  description,
  path,
  image = siteShareImage,
}: {
  /** The full document title, e.g. pageTitle("Pricing"). */
  title: string;
  description: string;
  path: string;
  image?: ShareImage;
}): Metadata {
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      url: path,
      title,
      description,
      images: [{ ...image, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}
