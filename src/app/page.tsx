import { CodePanel } from "@/components/code/CodePanel";
import { snippetsFor } from "@/components/code/snippets";
import { getModel } from "@/data/models";

// Placeholder home. The full home page (hero terminal, catalog preview,
// request diagram) replaces this in a later change.
export default function Home() {
  const model = getModel("llama-3-3-70b");
  return (
    <div className="container-site py-24 md:py-36">
      <div className="grid grid-cols-12 gap-x-6">
        <div className="col-span-12 lg:col-span-8">
          <p className="label-mono text-fg-2">Inference platform</p>
          <h1 className="mt-6 text-[2.75rem] leading-[1.02] tracking-[-0.03em] text-fg md:text-display">
            Open models in production, <span className="text-amber">billed by the token.</span>
          </h1>
          <p className="mt-6 max-w-[34rem] text-[1.0625rem] leading-relaxed text-fg-2">
            One API for open-weight models. Move to dedicated GPUs when your traffic outgrows
            shared capacity, without changing a line of code.
          </p>
        </div>
        {model && model.pricing.unit === "tokens" ? (
          <div className="col-span-12 mt-14 lg:col-span-7">
            <CodePanel
              snippets={snippetsFor(model)}
              footer={`${model.slug} · $${model.pricing.input.toFixed(2)} in / $${model.pricing.output.toFixed(2)} out per 1M tokens`}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
