import Link from "next/link";
import { Section } from "@/components/site/Section";
import { getModel, isTokenModel, models, type TokenModel } from "@/data/models";
import { formatLatency, formatUsd } from "@/lib/format";

/** One per family and task, so the preview reads as range, not as a list of Llamas. */
const PREVIEW = [
  "llama-3-3-70b",
  "deepseek-v3-1",
  "qwen3-235b-a22b",
  "deepseek-r1-0528",
  "qwen3-coder-480b-a35b",
  "mistral-small-3-2",
];

function previewModels(): TokenModel[] {
  return PREVIEW.map((slug) => {
    const m = getModel(slug);
    if (!m || !isTokenModel(m)) throw new Error(`Catalog preview: ${slug} is not a token model`);
    return m;
  });
}

const th = "label-mono whitespace-nowrap px-3 pb-3 text-left font-[450] text-fg-2 first:pl-0 last:pr-0";
const num = "px-3 text-right font-mono text-small text-fg tabular-nums";

export function CatalogPreview() {
  const rows = previewModels();

  return (
    <Section
      id="models"
      eyebrow="Models"
      title={`${models.length} open models, one request format.`}
      lede="Switching models is a one-string change. Every price is per million tokens, with no minimums and nothing billed while you are idle."
    >
      <div data-testid="catalog-preview">
        <table className="w-full border-collapse">
          <caption className="sr-only">
            Six of the {models.length} models, with price per 1M tokens and median time to first token
          </caption>
          <thead>
            <tr className="border-b border-line-strong">
              <th scope="col" className={th}>
                Model
              </th>
              <th scope="col" className={`${th} hidden md:table-cell`}>
                Task
              </th>
              <th scope="col" className={`${th} hidden text-right lg:table-cell`}>
                Context
              </th>
              <th scope="col" className={`${th} hidden text-right md:table-cell`}>
                Input / 1M
              </th>
              <th scope="col" className={`${th} hidden text-right md:table-cell`}>
                Output / 1M
              </th>
              <th scope="col" className={`${th} text-right md:hidden`}>
                In / out
              </th>
              <th scope="col" className={`${th} text-right`}>
                p50
              </th>
              <th scope="col" className={`${th} hidden w-8 md:table-cell`}>
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr
                key={m.slug}
                className="group relative border-b border-line transition-colors duration-150 hover:bg-surface"
              >
                <td className="py-4 pr-3 md:py-5">
                  <Link
                    href={`/models/${m.slug}/`}
                    className="font-medium text-fg outline-offset-4 after:absolute after:inset-0 after:content-['']"
                  >
                    {m.name}
                  </Link>
                  <span className="mt-1 block text-small text-fg-2">
                    {m.publisher}
                    <span className="md:hidden"> · {m.tasks.join(" · ")}</span>
                  </span>
                </td>
                <td className="hidden px-3 font-mono text-small text-fg-2 md:table-cell">
                  {m.tasks.join(" · ")}
                </td>
                <td className={`${num} hidden lg:table-cell`}>{m.contextK}K</td>
                <td className={`${num} hidden md:table-cell`}>{formatUsd(m.pricing.input)}</td>
                <td className={`${num} hidden md:table-cell`}>{formatUsd(m.pricing.output)}</td>
                <td className={`${num} whitespace-nowrap md:hidden`}>
                  <span className="block">{formatUsd(m.pricing.input)}</span>
                  <span className="mt-1 block text-fg-2">{formatUsd(m.pricing.output)}</span>
                </td>
                <td className={`${num} whitespace-nowrap last:pr-0 md:pr-3`}>
                  {formatLatency(m.p50Ms)}
                </td>
                <td
                  aria-hidden="true"
                  className="hidden pl-3 text-right font-mono text-fg-2 transition-[color,translate] duration-150 group-hover:translate-x-0.5 group-hover:text-fg md:table-cell"
                >
                  →
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-baseline md:justify-between">
          <p className="max-w-[36rem] text-small text-fg-2">
            Prices in USD per 1M tokens. p50 is the median time to first token over the last 24
            hours.
          </p>
          <Link
            href="/models/"
            className="group inline-flex items-center gap-2 self-start font-mono text-small text-fg underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-fg"
          >
            Browse all {models.length} models
            <span aria-hidden="true" className="transition-transform duration-150 group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        </div>
      </div>
    </Section>
  );
}
