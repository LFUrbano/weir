import type { Metadata } from "next";
import Link from "next/link";
import { Calculator } from "@/components/pricing/Calculator";
import { Faq } from "@/components/pricing/Faq";
import { GpuTable, ImageTable, ReplicaTable, ServerlessTable } from "@/components/pricing/PriceTables";
import { Section } from "@/components/site/Section";
import { buttonVariants } from "@/components/ui/button";
import {
  billingTerms,
  company,
  complianceLine,
  freeCreditLabel,
  identityLine,
  listAnd,
  pct,
  slaCoverage,
  slaLine,
  supportLine,
} from "@/data/company";
import { gpuShortName, gpus } from "@/data/gpus";
import { contactHref } from "@/data/site";
import { isTokenModel, models } from "@/data/models";
import { formatUsd } from "@/lib/format";
import { PEAK_FACTOR } from "@/lib/pricing";
import { cn } from "@/lib/utils";

const gpuNames = listAnd(gpus.map(gpuShortName));
const cheapestGpu = Math.min(...gpus.map((g) => g.hourly));
const cheapestToken = Math.min(...models.filter(isTokenModel).map((m) => m.pricing.input));

export const metadata: Metadata = {
  title: "Pricing",
  description: `Serverless prices per 1M tokens for all ${models.length} models, dedicated ${gpuNames} rates per GPU-hour, and a calculator that shows when reserved GPUs cost less than shared ones.`,
};

const modes = [
  {
    id: "serverless",
    name: "Serverless",
    price: `from ${formatUsd(cheapestToken)}`,
    unit: "per 1M tokens",
    summary: `Shared GPUs, billed per token. No minimums, ${freeCreditLabel} of credit to start.`,
    link: { href: "#serverless", label: "Token prices" },
  },
  {
    id: "dedicated",
    name: "Dedicated",
    price: `from ${formatUsd(cheapestGpu)}`,
    unit: "per GPU-hour",
    summary: `${gpuNames} replicas, billed ${company.dedicatedBilling}, with a ${pct(company.slaDedicatedPct)} SLA.`,
    link: { href: "#dedicated", label: "GPU rates" },
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Contract",
    unit: "committed volume",
    summary: "Invoiced billing, SSO and a security review, on either kind of capacity.",
    link: { href: contactHref, label: "Talk to an engineer" },
  },
] as const;

const arrowLink =
  "group inline-flex items-center gap-2 font-mono text-small text-fg underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-fg";

function Arrow() {
  return (
    <span aria-hidden="true" className="transition-transform duration-150 group-hover:translate-x-0.5">
      →
    </span>
  );
}

const enterpriseTerms = [
  { label: "Pricing", value: billingTerms.contractPricing },
  { label: "Billing", value: billingTerms.contractBilling },
  { label: "SLA", value: `${slaLine}. ${slaCoverage}` },
  { label: "Identity", value: identityLine },
  { label: "Compliance", value: complianceLine },
  { label: "Support", value: supportLine },
];

export default function PricingPage() {
  return (
    <>
      <section aria-labelledby="pricing-title" className="pt-12 pb-12 md:pt-16 md:pb-16">
        <div className="container-site">
          <p className="label-mono text-fg-2">Pricing</p>
          <h1
            id="pricing-title"
            className="mt-6 max-w-[48rem] text-[2.5rem] leading-[1.04] tracking-[-0.03em] text-fg sm:text-[3.25rem]"
          >
            Pay per token until reserved GPUs cost less.
          </h1>
          <p className="mt-6 max-w-[38rem] text-[1.0625rem] leading-relaxed text-fg-2">
            Serverless bills each token on shared GPUs. Dedicated reserves replicas by the GPU-hour.
            Same API, same model IDs, so the switch is a billing decision, not a rewrite.
          </p>

          <ul
            aria-label="Ways to pay"
            className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-panel border border-line bg-line md:mt-14 md:grid-cols-3"
          >
            {modes.map((m) => (
              <li key={m.id} className="flex flex-col bg-surface p-5 md:p-6">
                <p className="label-mono text-fg-2">{m.name}</p>
                <p className="mt-4 font-mono text-[1.375rem] leading-none text-fg">{m.price}</p>
                <p className="mt-2 font-mono text-[0.75rem] text-fg-2">{m.unit}</p>
                <p className="mt-4 max-w-[22rem] text-small text-fg-2">{m.summary}</p>
                <div className="mt-auto pt-5">
                  {m.link.href.startsWith("#") ? (
                    <a href={m.link.href} className={arrowLink}>
                      {m.link.label}
                      <Arrow />
                    </a>
                  ) : (
                    <Link href={m.link.href} className={arrowLink}>
                      {m.link.label}
                      <Arrow />
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Section
        id="calculator"
        eyebrow="Calculator"
        title="What will a month cost?"
        lede={`Pick a model and a month of traffic. Dedicated is sized for peaks at ${PEAK_FACTOR}× your average rate, so the replica count is what you would actually reserve.`}
      >
        <Calculator />
      </Section>

      <Section
        id="serverless"
        eyebrow="Serverless"
        title="Price per 1M tokens"
        lede="Shared GPUs, billed per token, with input and output priced separately. The same prices as the catalog and every model page."
      >
        <ServerlessTable />
        <div className="mt-14 grid grid-cols-12 gap-x-6 gap-y-6 md:mt-16">
          <div className="col-span-12 lg:col-span-4">
            <h3 className="text-h3 text-fg">Images</h3>
            <p className="mt-3 max-w-[30rem] text-small text-fg-2">
              Image models bill one price per generated image, whatever the prompt length.
            </p>
          </div>
          <div className="col-span-12 lg:col-span-8">
            <ImageTable />
          </div>
        </div>
      </Section>

      <Section
        id="dedicated"
        eyebrow="Dedicated"
        title={`GPU-hours, billed ${company.dedicatedBilling}`}
        lede={`Replicas reserved for you, with the same API and model IDs as serverless, and a ${pct(company.slaDedicatedPct)} monthly uptime SLA. ${billingTerms.readyReplicas}`}
      >
        <GpuTable />
        <div className="mt-14 md:mt-16">
          <h3 className="text-h3 text-fg">Ready replicas</h3>
          <p className="mt-3 max-w-[40rem] text-small text-fg-2">
            One replica per row, always on for a month. Break-even is the monthly volume where one
            replica costs the same as serverless, at an even input/output mix; the calculator uses
            yours.
          </p>
          <div className="mt-8">
            <ReplicaTable />
          </div>
        </div>
      </Section>

      <Section
        id="enterprise"
        eyebrow="Enterprise"
        title="Need a contract?"
        lede="For teams that buy through procurement: the same capacity, on terms your legal and security reviews ask for."
      >
        <div className="grid grid-cols-12 gap-x-6 gap-y-10">
          <dl className="col-span-12 border-t border-line-strong lg:col-span-8">
            {enterpriseTerms.map((t) => (
              <div
                key={t.label}
                className="grid grid-cols-1 gap-1 border-b border-line py-4 sm:grid-cols-[9rem_1fr] sm:gap-6"
              >
                <dt className="label-mono pt-[0.2rem] text-fg-2">{t.label}</dt>
                <dd className="text-small text-fg">{t.value}</dd>
              </div>
            ))}
          </dl>
          <div className="col-span-12 lg:col-span-4 lg:pl-8">
            <Link href={contactHref} className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
              Talk to an engineer
            </Link>
          </div>
        </div>
      </Section>

      <Section id="faq" eyebrow="FAQ" title="Before your first invoice">
        <div className="grid grid-cols-12 gap-x-6">
          <div className="col-span-12 lg:col-span-9">
            <Faq />
          </div>
        </div>
      </Section>
    </>
  );
}
