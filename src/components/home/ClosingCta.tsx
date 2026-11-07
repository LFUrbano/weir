import { sectionY } from "@/components/site/Section";
import { freeCreditLabel } from "@/data/company";
import { DualCta } from "./DualCta";

export function ClosingCta() {
  return (
    <section
      data-testid="closing-cta"
      aria-labelledby="closing-title"
      className={`border-t border-line ${sectionY}`}
    >
      <div className="container-site">
        <div className="grid grid-cols-12 gap-x-6 gap-y-10 lg:items-end">
          <div className="col-span-12 lg:col-span-7">
            <h2
              id="closing-title"
              className="text-h2-sm leading-[1.1] tracking-[-0.02em] text-fg md:text-h2 xl:text-title xl:leading-[1.05]"
            >
              Your first streamed reply is five minutes away.
            </h2>
            <p className="mt-5 max-w-[34rem] text-lede leading-relaxed text-fg-2">
              Start on shared GPUs with {freeCreditLabel} in credit. When you need capacity of
              your own, an engineer will size it with you.
            </p>
          </div>
          <div className="col-span-12 lg:col-span-5 lg:justify-self-end">
            <DualCta />
          </div>
        </div>
      </div>
    </section>
  );
}
