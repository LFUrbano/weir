import type { Metadata } from "next";
import Link from "next/link";
import { CompareStage } from "@/components/compare/CompareStage";
import { PairEndpoint, VolumeLede } from "@/components/compare/PairText";
import { RequestDiff } from "@/components/compare/RequestDiff";
import { VolumeEstimate } from "@/components/compare/VolumeEstimate";
import { Band } from "@/components/site/Band";
import { buttonVariants } from "@/components/ui/button";
import { getModel, type Model } from "@/data/models";
import { primaryCta } from "@/data/site";
import { COMMON_PAIRS, COMPARE_PATH, DEFAULT_PAIR, compareSearch } from "@/lib/compare";
import { pageMetadata, pageTitle } from "@/lib/metadata";
import { shortModelName } from "@/lib/model-display";

function model(slug: string): Model {
  const m = getModel(slug);
  if (!m) throw new Error(`Unknown model: ${slug}`);
  return m;
}

const defaultA = shortModelName(model(DEFAULT_PAIR.a));
const defaultB = shortModelName(model(DEFAULT_PAIR.b));

export const metadata: Metadata = pageMetadata({
  title: pageTitle("Compare models"),
  description: `${defaultA} and ${defaultB} side by side, or any two models of one kind: price, latency, decode speed, context, dedicated GPUs and the one-line change between them.`,
  path: COMPARE_PATH,
});

export default function ComparePage() {
  return (
    <>
      <section aria-labelledby="compare-title" className="pt-8 pb-12 md:pt-10 md:pb-16">
        <div className="container-site">
          <nav aria-label="Breadcrumb">
            <ol className="flex min-w-0 items-center gap-2 font-mono text-meta text-fg-2">
              <li>
                <Link
                  href="/models/"
                  className="underline decoration-line-strong underline-offset-4 hover:text-fg hover:decoration-fg"
                >
                  Models
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-fg">
                compare
              </li>
            </ol>
          </nav>

          <div className="mt-10 grid grid-cols-12 gap-x-6 gap-y-10 md:mt-12">
            <div className="col-span-12 lg:col-span-7">
              <p className="label-mono text-fg-2">Side by side · same API</p>
              <h1
                id="compare-title"
                className="mt-6 text-title-sm leading-[1.02] tracking-[-0.03em] text-fg sm:text-title xl:text-display"
              >
                Compare models
              </h1>
              <p className="mt-6 max-w-[38rem] text-lede leading-relaxed text-fg-2">
                Price, speed and capacity for two models on one page. Both take the same request on{" "}
                <PairEndpoint />, so switching between them is a change to one string.
              </p>
            </div>
            <div className="col-span-12 md:col-span-8 lg:col-span-5 xl:col-span-4 xl:col-start-9">
              <h2 id="common-pairs" className="label-mono text-fg-2">
                Common pairs
              </h2>
              <ul aria-labelledby="common-pairs" className="mt-4 border-t border-line">
                {COMMON_PAIRS.map(([a, b]) => (
                  <li key={`${a}-${b}`} className="border-b border-line">
                    <Link
                      href={`${COMPARE_PATH}${compareSearch(a, b)}`}
                      className="group flex items-center justify-between gap-4 py-3.5 text-ui text-fg"
                    >
                      <span>
                        {shortModelName(model(a))} vs {shortModelName(model(b))}
                      </span>
                      <span
                        aria-hidden="true"
                        className="text-fg-2 transition-[color,translate] duration-150 group-hover:translate-x-0.5 group-hover:text-fg"
                      >
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <CompareStage />

      <Band id="estimate" eyebrow="Estimate" title="At your volume" lede={<VolumeLede />}>
        <VolumeEstimate />
      </Band>

      <Band
        id="request"
        eyebrow="API"
        title="Same request, one string changed"
        lede={
          <>
            Both models take the same body on <PairEndpoint />. Moving from one to the other is a
            change to the model field.
          </>
        }
      >
        <RequestDiff />
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href={`${primaryCta.href}#create-a-key`} className={buttonVariants()}>
            {primaryCta.label}
          </Link>
          <Link href={primaryCta.href} className={buttonVariants({ variant: "ghost" })}>
            Read the quickstart
          </Link>
        </div>
      </Band>
    </>
  );
}
