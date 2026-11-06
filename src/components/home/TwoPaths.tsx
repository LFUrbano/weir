import Link from "next/link";
import { Section } from "@/components/site/Section";
import { buttonVariants } from "@/components/ui/button";
import {
  company,
  complianceLine,
  freeCreditLabel,
  identityLine,
  listAnd,
  slaLine,
  supportLine,
} from "@/data/company";
import { gpuShortName, gpus } from "@/data/gpus";
import { contactHref } from "@/data/site";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Path {
  audience: string;
  title: string;
  summary: string;
  items: { label: string; value: string }[];
  cta: { label: string; href: "/docs/quickstart/" | typeof contactHref };
}

function paths(): Path[] {
  const cheapestGpu = Math.min(...gpus.map((g) => g.hourly));
  const gpuNames = listAnd(gpus.map(gpuShortName));
  return [
    {
      audience: "Self-serve",
      title: "Start building",
      summary: "A key, an SDK and a credit balance. Your first streamed reply takes about five minutes.",
      items: [
        { label: "Free credit", value: `${freeCreditLabel} to start. No card required.` },
        { label: "SDKs", value: `${listAnd(company.sdks)}, or plain HTTP with curl.` },
        { label: "Billing", value: "Per token, per model. No minimums." },
        {
          label: "Rate limit",
          value: `${company.rateLimitRpm} requests a minute, raised as you spend.`,
        },
        { label: "Docs", value: "Quickstart, streaming, model reference." },
      ],
      cta: { label: "Read the quickstart", href: "/docs/quickstart/" },
    },
    {
      audience: "Enterprise",
      title: "Run it at scale",
      summary: "The same API on GPUs reserved for you, with the contract terms procurement asks for.",
      items: [
        {
          label: "Dedicated",
          value: `${gpuNames} replicas, from ${formatUsd(cheapestGpu)} per GPU-hour.`,
        },
        { label: "SLA", value: `${slaLine}.` },
        { label: "Identity", value: `${identityLine}.` },
        { label: "Compliance", value: `${complianceLine}.` },
        { label: "Support", value: `${supportLine}.` },
      ],
      cta: { label: "Talk to an engineer", href: contactHref },
    },
  ];
}

export function TwoPaths() {
  return (
    <Section
      id="paths"
      eyebrow="Two ways in"
      title="Start alone. Scale without a rewrite."
      lede="Both paths use the same API, the same SDKs and the same model names. What changes is whose GPUs answer and what the contract says."
    >
      <div
        data-testid="two-paths"
        className="grid grid-cols-1 overflow-hidden rounded-panel border border-line md:grid-cols-2"
      >
        {paths().map((p, i) => (
          <article
            key={p.title}
            aria-labelledby={`path-${i}`}
            className={cn(
              "flex flex-col p-6 md:p-8 lg:p-10",
              i === 0 ? "bg-surface" : "border-t border-line bg-surface-2 md:border-t-0 md:border-l",
            )}
          >
            <p className="label-mono text-fg-2">{p.audience}</p>
            <h3 id={`path-${i}`} className="mt-4 text-h3 text-fg">
              {p.title}
            </h3>
            <p className="mt-3 max-w-[28rem] text-fg-2">{p.summary}</p>

            <dl className="mt-8 border-t border-line">
              {p.items.map((item) => (
                <div
                  key={item.label}
                  className="grid grid-cols-1 gap-1 border-b border-line py-3.5 sm:grid-cols-[8.5rem_1fr] sm:gap-4"
                >
                  <dt className="label-mono pt-[0.2rem] text-fg-2">{item.label}</dt>
                  <dd className="text-small text-fg">{item.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-auto pt-8">
              <Link
                href={p.cta.href}
                className={buttonVariants({ variant: i === 0 ? "secondary" : "outline", size: "lg" })}
              >
                {p.cta.label}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}
