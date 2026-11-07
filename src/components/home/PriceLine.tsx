import Link from "next/link";
import { sectionY } from "@/components/site/Section";
import { company } from "@/data/company";
import { getGpu, gpuShortName } from "@/data/gpus";
import type { TokenModel } from "@/data/models";
import { formatUsd } from "@/lib/format";
import { shortModelName } from "@/lib/model-display";
import { blendedPrice } from "@/lib/pricing";

/** The short name, with non-breaking spaces so it stays on one line when the heading wraps. */
function unbrokenName(m: TokenModel) {
  return shortModelName(m).replaceAll(" ", String.fromCharCode(0xa0));
}

/**
 * Pricing in one sentence, worked out from the data: a million tokens split
 * evenly between input and output, on the reference model.
 */
export function PriceLine({ model }: { model: TokenModel }) {
  const price = formatUsd(blendedPrice(model, 0.5));
  const h100 = getGpu("h100");

  return (
    <section
      data-testid="price-section"
      aria-labelledby="price-title"
      className={`border-t border-line ${sectionY}`}
    >
      <div className="container-site">
        <div className="grid grid-cols-12 gap-x-6 gap-y-10 lg:items-end">
          <div className="col-span-12 lg:col-span-8">
            <p className="label-mono mb-5 text-fg-2">Pricing</p>
            <h2
              id="price-title"
              data-testid="price-line"
              className="text-h2-sm leading-[1.1] tracking-[-0.02em] text-fg md:text-h2 xl:text-title xl:leading-[1.05]"
            >
              1M tokens on {unbrokenName(model)} costs <span className="text-amber">{price}</span>.
            </h2>
            <p className="mt-5 max-w-[38rem] font-mono text-small text-fg-2">
              Half input at {formatUsd(model.pricing.input)}, half output at{" "}
              {formatUsd(model.pricing.output)}, per 1M tokens. Billed per token, no minimums.
            </p>
          </div>
          <div className="col-span-12 lg:col-span-4 lg:border-l lg:border-line lg:pl-8">
            <p className="text-small text-fg-2">
              Dedicated {gpuShortName(h100)}s from {formatUsd(h100.hourly)} per
              GPU-hour, billed {company.dedicatedBilling}.
            </p>
            <Link
              href="/pricing/"
              className="group mt-4 inline-flex items-center gap-2 font-mono text-small text-fg underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-fg"
            >
              See all pricing
              <span aria-hidden="true" className="transition-transform duration-150 group-hover:translate-x-0.5">
                →
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
