import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { CodePanel } from "@/components/code/CodePanel";
import { snippetsFor } from "@/components/code/snippets";
import { MetricsChart, type MetricsChartProps } from "@/components/models/MetricsChart";
import { MetricsTable } from "@/components/models/MetricsTable";
import { ModelSpecs } from "@/components/models/ModelSpecs";
import { StatusDot } from "@/components/site/StatusDot";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { company, pct } from "@/data/company";
import { getGpu, gpuShortName } from "@/data/gpus";
import { getModel, isDedicatedModel, models, type Model } from "@/data/models";
import { contactHref } from "@/data/site";
import { formatLatency, formatUsd } from "@/lib/format";
import { pageMetadata, pageTitle } from "@/lib/metadata";
import { metricsSeries, percentile } from "@/lib/metrics";
import {
  BREAK_EVEN_LABEL,
  endpointFor,
  formatBreakEven,
  latencyName,
  modelPrice,
  requestShapeLine,
} from "@/lib/model-display";
import { breakEvenMonthlyTokens } from "@/lib/pricing";
import { similarModels } from "@/lib/similar";
import { cn } from "@/lib/utils";

// One HTML file per model at build time; any other slug is the static 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return models.map((m) => ({ slug: m.slug }));
}

function load(slug: string): Model {
  const m = getModel(slug);
  if (!m) notFound();
  return m;
}

export async function generateMetadata({ params }: PageProps<"/models/[slug]">): Promise<Metadata> {
  const m = load((await params).slug);
  const path = `/models/${m.slug}/`;
  return pageMetadata({
    title: pageTitle(m.name),
    description: m.summary,
    path,
    image: { url: `${path}og.png`, alt: `${m.name} on Weir: price and 24-hour latency` },
  });
}

/** A documentation-style band: the heading in a narrow column, the content beside it. */
function Band({
  id,
  eyebrow,
  title,
  lede,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lede?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="border-t border-line py-12 md:py-16">
      <div className="container-site grid grid-cols-12 gap-x-6 gap-y-8">
        <header className="col-span-12 lg:col-span-3">
          <p className="label-mono text-fg-2">{eyebrow}</p>
          <h2 id={`${id}-title`} className="mt-3 text-h3 text-fg">
            {title}
          </h2>
          {lede && <p className="mt-3 max-w-[34rem] text-small text-fg-2">{lede}</p>}
        </header>
        <div className="col-span-12 min-w-0 lg:col-span-9">{children}</div>
      </div>
    </section>
  );
}

function PricePanel({ model }: { model: Model }) {
  const price = modelPrice(model);
  const rows =
    price.unit === "image"
      ? [{ label: "Per image", value: price.perImage, note: "1024 × 1024, one image" }]
      : [
          { label: "Input", value: price.input, note: "per 1M tokens" },
          {
            label: "Output",
            value: price.output,
            note: price.output === "—" ? "returns vectors, not tokens" : "per 1M tokens",
          },
        ];
  return (
    <div data-testid="model-price" className="rounded-panel border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <span className="label-mono text-fg-2">Serverless price</span>
        <span className="label-mono text-fg-2">USD</span>
      </div>
      <dl className={cn("grid", rows.length === 2 && "grid-cols-2 divide-x divide-line")}>
        {rows.map((r) => (
          <div key={r.label} className="px-5 py-5">
            <dt className="label-mono text-fg-2">{r.label}</dt>
            <dd className="mt-2.5">
              <span
                className={cn(
                  "block font-mono text-price leading-none",
                  r.value === "—" ? "text-fg-2" : "text-fg",
                )}
              >
                {r.value}
              </span>
              <span className="mt-2.5 block text-small text-fg-2">{r.note}</span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-line px-5 py-3 text-small text-fg-2">
        Billed per {price.unit === "image" ? "image" : "token"}, no minimums.
      </p>
    </div>
  );
}

function chartData(m: Model): {
  chart: MetricsChartProps;
  table: { name: string; values: string[] }[];
} {
  const series = metricsSeries(m.slug, m.p50Ms, m.tokensPerSec);
  const latency = series.map((p) => p.latencyMs);
  const panels: MetricsChartProps["panels"] = [
    {
      key: "latency",
      name: latencyName(m),
      values: latency,
      median: percentile(latency, 50),
      tail: percentile(latency, 95),
      tailLabel: "p95",
    },
  ];
  const table: { name: string; values: string[] }[] = [
    { name: latencyName(m), values: latency.map(formatLatency) },
  ];
  if (m.tokensPerSec !== null) {
    const speed = series.map((p) => p.tokensPerSec ?? 0);
    panels.push({
      key: "speed",
      name: "Decode speed",
      values: speed,
      median: percentile(speed, 50),
      // For speed the slow tail is the low end.
      tail: percentile(speed, 5),
      tailLabel: "p5",
    });
    table.push({ name: "Decode speed", values: speed.map((v) => `${v} tok/s`) });
  }
  return { chart: { times: series.map((p) => p.t), panels }, table };
}

function Dedicated({ model }: { model: Model }) {
  if (!isDedicatedModel(model)) {
    return (
      <div className="flex flex-col gap-6 rounded-panel border border-line bg-surface p-5 md:flex-row md:items-center md:justify-between md:p-6">
        <p className="max-w-[36rem] text-small text-fg-2">
          {model.name} runs on the shared serverless pool. Dedicated replicas for it are set up on
          request, with the same API and the same model ID.
        </p>
        <Link
          href={contactHref}
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "self-start md:self-auto")}
        >
          Talk to an engineer
        </Link>
      </div>
    );
  }
  const { gpu, gpusPerReplica, replicaTokensPerSec } = model.dedicated;
  const g = getGpu(gpu);
  const breakEven = breakEvenMonthlyTokens(model, 0.5);
  const facts = [
    { label: "Replica", value: `${gpusPerReplica}× ${gpuShortName(g)}` },
    { label: "Replica rate", value: `${formatUsd(gpusPerReplica * g.hourly)} / hour` },
    { label: "Peak throughput", value: `${replicaTokensPerSec.toLocaleString("en-US")} tok/s` },
    ...(breakEven !== null ? [{ label: BREAK_EVEN_LABEL, value: formatBreakEven(breakEven) }] : []),
  ];
  return (
    <div className="overflow-hidden rounded-panel border border-line bg-surface">
      <dl className="grid grid-cols-2 gap-px bg-line lg:grid-cols-4">
        {facts.map((f) => (
          <div key={f.label} className="bg-surface px-5 py-5">
            <dt className="label-mono text-fg-2">{f.label}</dt>
            <dd className="mt-2 font-mono text-ui text-fg">{f.value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-5 border-t border-line p-5 md:p-6 xl:flex-row xl:items-center xl:justify-between">
        <p className="max-w-[34rem] text-small text-fg-2">
          Replicas reserved for you, billed {company.dedicatedBilling}, with a{" "}
          {pct(company.slaDedicatedPct)} monthly uptime SLA.
          {breakEven !== null &&
            " Break-even is where one replica costs the same as serverless, at half input and half output tokens."}
        </p>
        <div className="flex shrink-0 flex-wrap gap-3">
          <Link href="/enterprise/#capacity" className={buttonVariants({ variant: "default", size: "lg" })}>
            Run on dedicated GPUs
          </Link>
          <Link href="/pricing/" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Compare costs
          </Link>
        </div>
      </div>
    </div>
  );
}

function Similar({ model }: { model: Model }) {
  return (
    <ul className="border-t border-line">
      {similarModels(model).map((s) => {
        const price = modelPrice(s);
        return (
          <li
            key={s.slug}
            className="group relative grid grid-cols-1 gap-x-8 gap-y-2 border-b border-line py-4 hover:bg-surface sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:px-3"
          >
            <div className="min-w-0">
              <Link
                href={`/models/${s.slug}/`}
                className="font-medium text-fg outline-offset-4 after:absolute after:inset-0 after:content-['']"
              >
                {s.name}
              </Link>
              <p className="mt-1 text-small text-fg-2">
                {s.publisher}
                <span className="font-mono text-meta"> · {s.tasks.join(" · ")}</span>
              </p>
            </div>
            <p className="font-mono text-meta whitespace-nowrap text-fg">
              {price.unit === "image" ? (
                price.perImage
              ) : (
                <>
                  {price.input} <span className="text-fg-2">in</span> · {price.output}{" "}
                  <span className="text-fg-2">out</span>
                </>
              )}
            </p>
            <p className="flex items-center justify-between gap-4 font-mono text-meta whitespace-nowrap text-fg-2">
              <span>p50 {formatLatency(s.p50Ms)}</span>
              <span
                aria-hidden="true"
                className="transition-[color,translate] duration-150 group-hover:translate-x-0.5 group-hover:text-fg"
              >
                →
              </span>
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export default async function ModelPage({ params }: PageProps<"/models/[slug]">) {
  const m = load((await params).slug);
  const { chart, table } = chartData(m);
  const chat = latencyName(m) === "Time to first token";

  return (
    <article>
      <section aria-labelledby="model-title" className="pt-8 pb-12 md:pt-10 md:pb-16">
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
              <li aria-current="page" className="truncate text-fg">
                {m.slug}
              </li>
            </ol>
          </nav>

          <div className="mt-10 grid grid-cols-12 gap-x-6 gap-y-10 md:mt-12 lg:items-end">
            <div className="col-span-12 lg:col-span-7">
              <p className="label-mono flex items-center gap-2.5 text-fg-2">
                <StatusDot state="live" />
                Live · serverless · {m.regions.length} {m.regions.length === 1 ? "region" : "regions"}
              </p>
              <h1
                id="model-title"
                className="mt-6 text-h2 leading-[1.04] tracking-[-0.03em] text-fg sm:text-title"
              >
                {m.name}
              </h1>
              <p className="mt-4 font-mono text-small text-fg-2">by {m.publisher}</p>
              <p className="mt-6 max-w-[36rem] text-lede leading-relaxed text-fg-2">{m.summary}</p>
              <ul aria-label="Tags" className="mt-6 flex flex-wrap gap-2">
                {m.tasks.map((t) => (
                  <li key={t}>
                    <Badge variant="secondary">{t}</Badge>
                  </li>
                ))}
                <li>
                  <Badge>{m.quantization}</Badge>
                </li>
                {m.dedicated && (
                  <li>
                    <Badge variant="live">dedicated</Badge>
                  </li>
                )}
              </ul>
            </div>
            <div className="col-span-12 md:col-span-8 lg:col-span-5 xl:col-span-4 xl:col-start-9">
              <PricePanel model={m} />
            </div>
          </div>
        </div>
      </section>

      <Band id="specs" eyebrow="Reference" title="Specifications">
        <ModelSpecs model={m} />
      </Band>

      <Band
        id="metrics"
        eyebrow="Last 24 hours"
        title={chat ? "Latency and speed" : "Latency"}
        lede={
          chat
            ? "Median of each 15-minute step on the shared pool, measured at the API edge. Time to first token includes queueing; decode speed is for one request."
            : "Median of each 15-minute step on the shared pool, measured at the API edge, for the whole response: there is no token stream to time."
        }
      >
        <MetricsChart {...chart} />
        <MetricsTable times={chart.times} columns={table} />
      </Band>

      <Band
        id="request"
        eyebrow="API"
        title="Make a request"
        lede={requestShapeLine(m)}
      >
        <CodePanel
          snippets={snippetsFor(m)}
          footer={
            <span className="flex flex-wrap justify-between gap-x-6 gap-y-1">
              <span>{endpointFor(m)}</span>
              <span>api.weir.example</span>
            </span>
          }
        />
      </Band>

      <Band
        id="dedicated"
        eyebrow="Dedicated"
        title={isDedicatedModel(m) ? "Run it on GPUs reserved for you" : "Need reserved capacity?"}
      >
        <Dedicated model={m} />
      </Band>

      <Band id="similar" eyebrow="Compare" title="Similar models">
        <Similar model={m} />
      </Band>
    </article>
  );
}
