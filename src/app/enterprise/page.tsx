import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ContactForm } from "@/components/enterprise/ContactForm";
import {
  CapacityTable,
  CreditTable,
  SecurityTable,
  SupportTable,
} from "@/components/enterprise/EnterpriseTables";
import { Section } from "@/components/site/Section";
import { buttonVariants } from "@/components/ui/button";
import {
  allowedDowntimeMinutes,
  billingTerms,
  businessHours,
  company,
  complianceLine,
  listAnd,
  lowerFirst,
  measuredUptimeLine,
  pct,
  regionLocations,
  sla,
  slaCoverage,
  slaLine,
  trustNotes,
} from "@/data/company";
import { gpuShortName, gpus } from "@/data/gpus";
import { formatUsd } from "@/lib/format";
import { pageMetadata, pageTitle } from "@/lib/metadata";

const cheapestGpu = Math.min(...gpus.map((g) => g.hourly));
const slaPct = pct(company.slaDedicatedPct);
const downtime = `${allowedDowntimeMinutes(company.slaDedicatedPct).toFixed(1)} min`;
const locations = listAnd(company.regions.map((r) => regionLocations[r]));
const euRegion = company.regions.find((r) => r.startsWith("eu"));

/**
 * Where each GPU can be reserved, from gpus.ts: "H100 and H200 in all 3
 * regions, B200 in us-east and us-west". Never implies a GPU runs where it does not.
 */
const everywhere = gpus.filter((g) => company.regions.every((r) => g.regions.includes(r)));
const gpuRegionLine = [
  ...(everywhere.length
    ? [`${listAnd(everywhere.map(gpuShortName))} in all ${company.regions.length} regions`]
    : []),
  ...gpus
    .filter((g) => !everywhere.includes(g))
    .map((g) => `${gpuShortName(g)} in ${listAnd(g.regions)}`),
].join(", ");
const euGpus = listAnd(gpus.filter((g) => euRegion && g.regions.includes(euRegion)).map(gpuShortName));

/** complianceLine, with each certification kept on one line ("ISO 27001" never splits). */
function ComplianceText(): ReactNode {
  const certs = company.certifications;
  return (
    <>
      {certs.map((c, i) => (
        <span key={c}>
          {i === 0 ? "" : i === certs.length - 1 ? " and " : ", "}
          <span className="whitespace-nowrap">{c}</span>
        </span>
      ))}
      , with a DPA
    </>
  );
}

export const metadata: Metadata = pageMetadata({
  title: pageTitle("Enterprise"),
  description: `Dedicated GPU replicas (${gpuRegionLine}), a ${slaPct} uptime SLA, ${complianceLine}. Support tiers and a contact form to size your capacity.`,
  path: "/enterprise/",
});

const facts = [
  { label: "SLA", value: [slaPct], note: "monthly uptime on dedicated" },
  { label: "GPUs", value: gpus.map(gpuShortName), note: `from ${formatUsd(cheapestGpu)} per GPU-hour` },
  { label: "Regions", value: [...company.regions], note: locations },
  { label: "Compliance", value: [...company.certifications], note: trustNotes.reports },
];

const capacityTerms = [
  { label: "Billing", value: `Hourly rates, billed ${company.dedicatedBilling}` },
  { label: "Throughput", value: billingTerms.dedicatedLimits },
  { label: "Contract", value: `${billingTerms.contractPricing}. ${billingTerms.contractBilling}.` },
  { label: "Other models", value: billingTerms.readyReplicas },
];

const slaTerms = [
  { label: "Commitment", value: slaLine },
  { label: "Scope", value: slaCoverage },
  { label: "Measured", value: sla.measured },
  { label: "Credits", value: sla.claim },
  { label: "Maintenance", value: sla.maintenance },
  { label: "Serverless", value: `No SLA. ${measuredUptimeLine}.` },
];

const firstCall = [
  { title: "Sizing", text: "Replicas and GPU type from your volume and latency target." },
  { title: "Regions and data", text: `Where your traffic runs, retention and the DPA.` },
  { title: "Security review", text: `Your questionnaire, with the ${company.certifications[0]} report under NDA.` },
  { title: "Contract", text: `${billingTerms.contractPricing}, ${lowerFirst(billingTerms.contractBilling)}.` },
];

const termRow = "grid grid-cols-1 gap-1 border-b border-line py-4 sm:grid-cols-[9rem_1fr] sm:gap-6";

function Terms({ items, label }: { items: { label: string; value: string }[]; label: string }) {
  return (
    <dl aria-label={label} className="border-t border-line-strong">
      {items.map((t) => (
        <div key={t.label} className={termRow}>
          <dt className="label-mono pt-[0.2rem] text-fg-2">{t.label}</dt>
          <dd className="text-small text-fg">{t.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function EnterprisePage() {
  return (
    <>
      <section
        data-testid="enterprise-hero"
        aria-labelledby="enterprise-title"
        className="pt-12 pb-12 md:pt-16 md:pb-16"
      >
        <div className="container-site">
          <p className="label-mono text-fg-2">Enterprise</p>
          <h1
            id="enterprise-title"
            className="mt-6 max-w-[50rem] text-[2.5rem] leading-[1.04] tracking-[-0.03em] text-fg sm:text-[3.25rem]"
          >
            GPUs reserved for you, <span className="text-fg-2">on terms procurement can sign.</span>
          </h1>
          <p className="mt-6 max-w-[40rem] text-[1.0625rem] leading-relaxed text-fg-2">
            The same API and model IDs you call today, on replicas reserved for you and pinned to a
            region: {gpuRegionLine}. A {slaPct} uptime SLA, SSO, and <ComplianceText />.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a href="#contact" className={buttonVariants({ size: "lg" })}>
              Talk to an engineer
            </a>
            <Link href="/pricing/#dedicated" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Compare GPU rates
            </Link>
          </div>

          <dl
            aria-label="At a glance"
            className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-2 md:mt-14 lg:grid-cols-4"
          >
            {facts.map((f) => (
              <div key={f.label} className="flex flex-col bg-surface p-5 md:p-6">
                <dt className="label-mono text-fg-2">{f.label}</dt>
                <dd className="mt-4 font-mono text-[0.9375rem] leading-snug text-fg">
                  {/* Each item stays whole ("eu-west" never breaks at its hyphen), and a line never starts with "·". */}
                  {f.value.map((v, i) => (
                    <span key={v}>
                      <span className="whitespace-nowrap">
                        {v}
                        {i < f.value.length - 1 && " ·"}
                      </span>{" "}
                    </span>
                  ))}
                </dd>
                <dd className="mt-2 text-small text-fg-2">{f.note}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <Section
        id="capacity"
        eyebrow="Capacity"
        title="Dedicated capacity, region by region"
        lede={`Replicas reserved for you: ${gpuRegionLine}. Pin each one to a region where its GPU runs; EU traffic can stay in ${euRegion} on ${euGpus}.`}
      >
        <div className="grid grid-cols-12 gap-x-6 gap-y-12">
          <div className="col-span-12 lg:col-span-8">
            <CapacityTable />
          </div>
          <div className="col-span-12 lg:col-span-4 lg:pl-2">
            <Terms label="Dedicated terms" items={capacityTerms} />
            <Link
              href="/pricing/#dedicated"
              className="group mt-6 inline-flex items-center gap-2 font-mono text-small text-fg underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-fg"
            >
              Break-even per model
              <span aria-hidden="true" className="transition-transform duration-150 group-hover:translate-x-0.5">
                →
              </span>
            </Link>
          </div>
        </div>
      </Section>

      <Section
        id="security"
        eyebrow="Security"
        title="Security and compliance"
        lede="What a security questionnaire asks, what you get, and the evidence behind each answer."
      >
        <SecurityTable />
      </Section>

      <Section
        id="sla"
        eyebrow="SLA"
        title={`${slaPct} uptime on every dedicated endpoint`}
        lede={`On dedicated endpoints, ${slaPct} a month allows about ${downtime} of downtime. Below that, a share of the month's dedicated bill comes back as credit.`}
      >
        <div className="grid grid-cols-12 gap-x-6 gap-y-12">
          <div className="col-span-12 md:col-span-6 lg:col-span-5">
            <CreditTable />
          </div>
          <div className="col-span-12 md:col-span-6 lg:col-span-6 lg:col-start-7">
            <Terms label="SLA terms" items={slaTerms} />
          </div>
        </div>
      </Section>

      <Section
        id="support"
        eyebrow="Support"
        title="Support that matches what you run"
        lede="First-response targets by tier. Production down means requests are failing or an endpoint is unreachable."
      >
        <SupportTable />
        <p className="mt-6 text-small text-fg-2">Business hours are {businessHours}.</p>
      </Section>

      <Section
        id="contact"
        eyebrow="Contact"
        title="Talk to an engineer"
        lede="Four questions, about a minute. Volume and use case are what dedicated capacity is sized from."
      >
        <ContactForm
          aside={
            <aside aria-labelledby="first-call-title" className="col-span-12 lg:col-span-4 lg:col-start-9">
              <h3 id="first-call-title" className="label-mono text-fg-2">
                What the first call covers
              </h3>
              <ol className="mt-5 border-t border-line">
                {firstCall.map((s, i) => (
                  <li key={s.title} className="grid grid-cols-[2rem_1fr] gap-2 border-b border-line py-4">
                    <span className="font-mono text-small text-fg-2">{String(i + 1).padStart(2, "0")}</span>
                    <p className="text-small text-fg-2">
                      <span className="block text-fg">{s.title}</span>
                      {s.text}
                    </p>
                  </li>
                ))}
              </ol>
              <dl className="mt-10 grid gap-4 text-small">
                <div>
                  <dt className="label-mono text-fg-2">Email</dt>
                  <dd className="mt-1.5 font-mono text-fg">enterprise@weir.example</dd>
                </div>
                <div>
                  <dt className="label-mono text-fg-2">Phone</dt>
                  <dd className="mt-1.5 font-mono text-fg">+1 (415) 555-0142</dd>
                </div>
              </dl>
            </aside>
          }
        />
      </Section>
    </>
  );
}
