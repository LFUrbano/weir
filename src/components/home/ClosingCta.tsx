import { DualCta } from "./DualCta";

export function ClosingCta() {
  return (
    <section
      data-testid="closing-cta"
      aria-labelledby="closing-title"
      className="border-t border-line py-24 md:py-32"
    >
      <div className="container-site">
        <div className="grid grid-cols-12 gap-x-6 gap-y-10 lg:items-end">
          <div className="col-span-12 lg:col-span-7">
            <h2
              id="closing-title"
              className="text-[2rem] leading-[1.1] tracking-[-0.02em] text-fg md:text-h2 xl:text-[3.25rem] xl:leading-[1.05]"
            >
              Your first streamed reply is five minutes away.
            </h2>
            <p className="mt-5 max-w-[34rem] text-[1.0625rem] leading-relaxed text-fg-2">
              Start on shared GPUs with $5 in credit. When you need capacity of your own, an
              engineer will size it with you.
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
