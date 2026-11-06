import type { ReactNode } from "react";
import { Section } from "@/components/site/Section";
import { StatusDot } from "@/components/site/StatusDot";
import { company, dataRetention, listAnd, pct } from "@/data/company";

interface Row {
  label: string;
  value: ReactNode;
  note: ReactNode;
}

const rows: Row[] = [
  {
    label: "Compliance",
    value: company.certifications.join(" · "),
    note: "Reports shared under NDA. DPA with standard contractual clauses.",
  },
  {
    label: "Identity",
    value: `SSO with ${company.sso.protocols.join(" · ")}`,
    note: `${listAnd(company.sso.idps)}. Audit logs for every key.`,
  },
  {
    label: "Uptime",
    value: `${pct(company.slaDedicatedPct)} SLA on dedicated endpoints`,
    note: "Measured monthly, with service credits when we miss it.",
  },
  {
    label: "Regions",
    value: (
      <span className="font-mono">{company.regions.join(" · ")}</span>
    ),
    note: (
      <>
        Pin traffic to a region. EU requests can stay in{" "}
        <span className="whitespace-nowrap">{company.regions.find((r) => r.startsWith("eu"))}</span>.
      </>
    ),
  },
  {
    label: "Data",
    value: dataRetention.headline,
    note: dataRetention.detail,
  },
  {
    label: "Status",
    value: (
      <span className="inline-flex items-center gap-2.5 font-mono">
        <StatusDot state="ok" />
        All systems normal
      </span>
    ),
    note: `${pct(company.uptime90dPct)} API uptime over the last 90 days.`,
  },
];

/** What a security review asks for, as a spec sheet rather than a wall of badges. */
export function TrustBand() {
  return (
    <Section
      id="trust"
      eyebrow="Trust"
      title="Ready for your security review."
      lede="The answers procurement asks for, in one place. Reports and the DPA go out under NDA, usually the same day."
    >
      <dl className="border-t border-line-strong">
        {rows.map((r) => (
          <div
            key={r.label}
            className="grid grid-cols-12 gap-x-6 gap-y-1.5 border-b border-line py-5 md:py-6"
          >
            <dt className="label-mono col-span-12 pt-[0.3rem] text-fg-2 md:col-span-3">{r.label}</dt>
            <dd className="col-span-12 text-fg md:col-span-5">{r.value}</dd>
            <dd className="col-span-12 text-small text-fg-2 md:col-span-4 md:pt-[0.1rem]">{r.note}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
