import type { ReactNode } from "react";
import { Section } from "@/components/site/Section";
import { StatusDot } from "@/components/site/StatusDot";

interface Row {
  label: string;
  value: ReactNode;
  note: string;
}

const rows: Row[] = [
  {
    label: "Compliance",
    value: "SOC 2 Type II · ISO 27001 · GDPR",
    note: "Reports shared under NDA. DPA with standard contractual clauses.",
  },
  {
    label: "Identity",
    value: "SSO with SAML 2.0 · SCIM",
    note: "Okta, Microsoft Entra ID and Google Workspace. Audit logs for every key.",
  },
  {
    label: "Uptime",
    value: "99.95% SLA on dedicated endpoints",
    note: "Measured monthly, with service credits when we miss it.",
  },
  {
    label: "Regions",
    value: (
      <span className="font-mono">
        us-east <span className="text-fg-2">·</span> us-west <span className="text-fg-2">·</span>{" "}
        eu-west
      </span>
    ),
    note: "Pin traffic to a region. EU requests can stay in eu-west.",
  },
  {
    label: "Data",
    value: "Prompts and outputs are not stored",
    note: "Never used for training. Optional request logs, kept 30 days.",
  },
  {
    label: "Status",
    value: (
      <span className="inline-flex items-center gap-2.5 font-mono">
        <StatusDot state="ok" />
        All systems normal
      </span>
    ),
    note: "99.99% API uptime over the last 90 days.",
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
