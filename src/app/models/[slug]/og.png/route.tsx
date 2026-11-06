import { notFound } from "next/navigation";
import { getModel, models } from "@/data/models";
import { formatLatency } from "@/lib/format";
import { metricsSeries } from "@/lib/metrics";
import { modelPrice } from "@/lib/model-display";
import { modelShareImage } from "@/lib/share-image";

// Rendered once per model at build time; the export writes /models/<slug>/og.png.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return models.map((m) => ({ slug: m.slug }));
}

export async function GET(_req: Request, { params }: RouteContext<"/models/[slug]/og.png">) {
  const { slug } = await params;
  const m = getModel(slug);
  if (!m) notFound();

  const price = modelPrice(m);
  const prices =
    price.unit === "image"
      ? [{ name: "Per image", value: price.perImage.replace(/ \/ image$/, "") }]
      : [
          { name: "Input / 1M", value: price.input },
          ...(price.output === "—" ? [] : [{ name: "Output / 1M", value: price.output }]),
        ];

  return modelShareImage({
    name: m.name,
    publisher: m.publisher,
    tasks: m.tasks,
    stats: [...prices, { name: "p50", value: formatLatency(m.p50Ms) }],
    series: metricsSeries(m.slug, m.p50Ms, m.tokensPerSec),
    median: m.p50Ms,
  });
}
