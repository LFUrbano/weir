import { codePanes } from "@/components/code/CodePanel";
import { snippetsFor } from "@/components/code/snippets";
import { StatusDot } from "@/components/site/StatusDot";
import { company } from "@/data/company";
import { models, type TokenModel } from "@/data/models";
import { DualCta } from "./DualCta";
import { HeroTerminal } from "./HeroTerminal";

export function Hero({ model }: { model: TokenModel }) {
  const snippets = snippetsFor(model, { stream: true });
  const panes = codePanes(snippets);
  const codeLines = Math.max(...panes.map((p) => p.text.split("\n").length));

  return (
    <section data-testid="hero" aria-labelledby="hero-title" className="pt-12 pb-12 md:pt-16 md:pb-16 2xl:pt-24">
      <div className="container-site">
        <div className="grid grid-cols-12 gap-x-6 gap-y-14 lg:items-center">
          <div className="col-span-12 lg:col-span-5">
            <p className="label-mono flex items-center gap-2.5 text-fg-2">
              <StatusDot state="ok" />
              <span>
                {models.length} models live in{" "}
                <span className="hidden sm:inline">{company.regions.join(", ")}</span>
                <span className="sm:hidden">{company.regions.length} regions</span>
              </span>
            </p>
            <h1
              id="hero-title"
              className="mt-6 text-[2.75rem] leading-[1.02] tracking-[-0.03em] text-fg sm:text-[3.25rem] 2xl:text-[3.75rem]"
            >
              Open models in production, <span className="text-fg-2">billed by the token.</span>
            </h1>
            <p className="mt-6 max-w-[30rem] text-[1.0625rem] leading-relaxed text-fg-2">
              One API for {models.length} open-weight models. Pay per token on shared GPUs, then
              move to GPUs reserved for you when traffic grows, without changing a line of code.
            </p>
            <DualCta className="mt-10" />
          </div>

          <div className="col-span-12 min-w-0 lg:col-span-7">
            <HeroTerminal panes={panes} model={model} codeLines={codeLines} />
          </div>
        </div>
      </div>
    </section>
  );
}
