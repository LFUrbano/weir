import { company, pct } from "@/data/company";
import { models } from "@/data/models";
import { siteShareImage } from "@/lib/share-image";

// The site-wide share image, rendered at build time to /og.png.
export const dynamic = "force-static";

export async function GET() {
  return siteShareImage({
    headline: "Open models in production,",
    muted: "billed by the token.",
    facts: [
      { name: "Models", value: String(models.length) },
      { name: "Regions", value: String(company.regions.length) },
      { name: "Uptime · 90d", value: pct(company.uptime90dPct) },
    ],
  });
}
