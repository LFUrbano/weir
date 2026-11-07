import type { Metadata } from "next";
import { CatalogClient } from "@/components/models/CatalogClient";
import { StatusDot } from "@/components/site/StatusDot";
import { company } from "@/data/company";
import { isDedicatedModel, models } from "@/data/models";
import { pageMetadata, pageTitle } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: pageTitle("Models"),
  description: `${models.length} open-weight models for chat, reasoning, code, embeddings, vision and images, with price per 1M tokens, context window, speed and latency for each.`,
  path: "/models/",
});

const publishers = new Set(models.map((m) => m.publisher)).size;
const dedicated = models.filter(isDedicatedModel).length;

const facts = [
  { label: "Live models", value: `${models.length} from ${publishers} publishers` },
  { label: "Regions", value: company.regions.join(" · ") },
  { label: "Billing", value: "Usage-based, no minimums" },
  { label: "Dedicated GPUs", value: `${dedicated} models` },
];

export default function ModelsPage() {
  return (
    <>
      <section aria-labelledby="catalog-title" className="pt-12 pb-10 md:pt-16 md:pb-14">
        <div className="container-site">
          <div className="grid grid-cols-12 gap-x-6 gap-y-10 lg:items-end">
            <div className="col-span-12 lg:col-span-7">
              <p className="label-mono flex items-center gap-2.5 text-fg-2">
                <StatusDot state="ok" />
                Catalog
              </p>
              <h1
                id="catalog-title"
                className="mt-6 text-title-sm leading-[1.02] tracking-[-0.03em] text-fg sm:text-title"
              >
                Models
              </h1>
              <p className="mt-6 max-w-[36rem] text-lede leading-relaxed text-fg-2">
                Open-weight models for chat, reasoning, code, embeddings, vision and images, all
                behind the same request format. Switching models is a one-string change.
              </p>
            </div>
            <dl className="col-span-12 hidden border-t border-line md:block lg:col-span-5 lg:col-start-8 xl:col-span-4 xl:col-start-9">
              {facts.map((f) => (
                <div
                  key={f.label}
                  className="flex items-baseline justify-between gap-6 border-b border-line py-3"
                >
                  <dt className="label-mono shrink-0 text-fg-2">{f.label}</dt>
                  <dd className="text-right font-mono text-meta whitespace-nowrap text-fg">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section aria-label="Model catalog" className="pb-20 md:pb-28">
        <div className="container-site">
          <CatalogClient />
          <p className="mt-8 max-w-[44rem] text-small text-fg-2">
            Prices in USD: token models per 1M tokens, image models per image. Price order blends
            input and output tokens 50/50, with image models after. p50 is the median time to first
            token (full response for embeddings and images) over the last 24 hours; speed is decode
            tokens per second for one request.
          </p>
        </div>
      </section>
    </>
  );
}
