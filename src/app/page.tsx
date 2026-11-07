import { Section } from "@/components/site/Section";
import { CatalogPreview } from "@/components/home/CatalogPreview";
import { ClosingCta } from "@/components/home/ClosingCta";
import { Hero } from "@/components/home/Hero";
import { LogoStrip } from "@/components/home/LogoStrip";
import { PriceLine } from "@/components/home/PriceLine";
import { RequestDiagram, type RequestStep } from "@/components/home/RequestDiagram";
import { TrustBand } from "@/components/home/TrustBand";
import { TwoPaths } from "@/components/home/TwoPaths";
import { heroDemo } from "@/components/home/hero-demo";
import { company } from "@/data/company";
import { getModel, isTokenModel, type TokenModel } from "@/data/models";
import { formatLatency } from "@/lib/format";
import { HOME_TITLE, pageMetadata, siteDescription } from "@/lib/metadata";
import { shortModelName } from "@/lib/model-display";

export const metadata = pageMetadata({
  title: HOME_TITLE,
  description: siteDescription,
  path: "/",
});

function referenceModel(): TokenModel {
  const m = getModel(heroDemo.modelSlug);
  if (!m || !isTokenModel(m)) throw new Error(`Home: ${heroDemo.modelSlug} must be a token model`);
  return m;
}

/** Hop times before the GPU are fixed overheads; the last stamp is the model's p50. */
function requestSteps(m: TokenModel): RequestStep[] {
  return [
    {
      name: "App",
      stamp: "t+0 ms",
      sentence:
        "Your code sends one HTTPS request with a model name and messages, in the same shape for every model on the chat endpoint.",
      detail: ["POST /v1/chat/completions"],
    },
    {
      name: "Edge",
      stamp: "t+14 ms",
      sentence: `The closest of ${company.regions.length} regions ends TLS, checks the key and the rate limit, and turns bad requests away before they reach a GPU.`,
      detail: [company.tls, "API key", "rate limit"],
    },
    {
      name: "Router",
      stamp: "t+19 ms",
      sentence:
        "Sends the request to the region you pinned, or to the one with free capacity, batches it with others on the same model, and reuses cached prompt prefixes.",
      detail: ["region", "batching", "prefix cache"],
    },
    {
      name: "GPUs",
      stamp: `t+${formatLatency(m.p50Ms)} · first token`,
      sentence:
        "Shared H100s by default, or replicas reserved for you. The first token streams back and the rest follow as they decode.",
      detail: ["shared pool", "dedicated replicas"],
    },
  ];
}

export default function Home() {
  const model = referenceModel();

  return (
    <>
      <Hero model={model} />
      <LogoStrip />
      <CatalogPreview />
      <Section
        id="how-it-runs"
        eyebrow="Architecture"
        title="How a request runs"
        lede={`Four hops between your code and the first token. On ${shortModelName(model)}, the median trip takes ${formatLatency(model.p50Ms)}.`}
      >
        <div data-testid="request-diagram">
          <RequestDiagram steps={requestSteps(model)} />
          <p className="mt-14 max-w-[44rem] border-l border-amber pl-4 text-small text-fg-2 md:mt-16">
            Moving to dedicated GPUs changes one hop: the router sends your requests to replicas
            reserved for you. The request, the SDK and your code stay the same.
          </p>
        </div>
      </Section>
      <TwoPaths />
      <PriceLine model={model} />
      <TrustBand />
      <ClosingCta />
    </>
  );
}
