import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { numCell } from "@/components/models/table-styles";
import { readyCount } from "@/components/pricing/PriceTables";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  billingTerms,
  company,
  dataRetention,
  identityLine,
  listAnd,
  regionLocations,
  sla,
  supportTiers,
  trustNotes,
} from "@/data/company";
import { gpuShortName, gpus } from "@/data/gpus";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

/*
 * The procurement checklist as plain server-rendered tables. Every value comes
 * from company.ts, gpus.ts and models.ts, the same files the home and Pricing
 * read, so a fact cannot say one thing here and another there.
 */

const num = cn(numCell, "whitespace-nowrap py-4");
const rowHead = "py-4 pr-3 text-left align-top font-medium text-fg";
const euRegion = company.regions.find((r) => r.startsWith("eu"));


/** GPUs down the side, regions across the top: where each one can be reserved. */
export function CapacityTable() {
  return (
    <Table data-testid="capacity-table">
      <caption className="sr-only">
        Dedicated GPUs: memory, rate per GPU-hour, and the regions where each can be reserved
      </caption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">GPU</TableHead>
          <TableHead scope="col" className="hidden text-right md:table-cell">
            Memory
          </TableHead>
          <TableHead scope="col" className="text-right max-md:px-2">
            <span className="md:hidden">$ / hr</span>
            <span className="hidden md:inline">Per GPU-hour</span>
          </TableHead>
          <TableHead scope="col" className="hidden text-right lg:table-cell">
            Ready replicas
          </TableHead>
          {company.regions.map((r) => (
            <TableHead key={r} scope="col" className="h-auto py-2.5 text-center max-md:px-1">
              <span className="block">{r}</span>
              <span className="mt-1 hidden font-sans text-caption tracking-normal normal-case md:block">
                {regionLocations[r]}
              </span>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {gpus.map((g) => (
          <TableRow key={g.id} data-gpu={g.id} className="hover:bg-surface">
            <th scope="row" className={cn(rowHead, "border-b border-line align-middle")}>
              {gpuShortName(g)}
              <span className="mt-0.5 block font-mono text-meta font-normal whitespace-nowrap text-fg-2 md:hidden">
                {g.memoryGb} GB
              </span>
            </th>
            <TableCell className={cn(num, "hidden text-fg-2 md:table-cell")}>{g.memoryGb} GB</TableCell>
            <TableCell className={cn(num, "max-md:px-2")}>
              {formatUsd(g.hourly)}
              {/* The header says "$ / hr" on phones; the unit stays for screen readers. */}
              <span className="max-md:sr-only">/hr</span>
            </TableCell>
            <TableCell className={cn(num, "hidden text-fg-2 lg:table-cell")}>{readyCount(g)}</TableCell>
            {company.regions.map((r) => {
              const available = g.regions.includes(r);
              return (
                <TableCell
                  key={r}
                  data-region={r}
                  data-available={String(available)}
                  className="py-4 text-center max-md:px-1"
                >
                  {available ? (
                    <Check aria-hidden="true" className="mx-auto size-4 text-ok" strokeWidth={2.25} />
                  ) : (
                    <span aria-hidden="true" className="font-mono text-fg-2">
                      —
                    </span>
                  )}
                  <span className="sr-only">{available ? "Available" : "Not offered"}</span>
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

interface SecurityRow {
  area: string;
  what: ReactNode;
  evidence: ReactNode;
}

const [soc2, iso, gdpr] = company.certifications;

const securityRows: SecurityRow[] = [
  { area: soc2, what: "Audited every year by an independent firm.", evidence: trustNotes.reports },
  {
    area: iso,
    what: "Certified information security management, covering every region.",
    evidence: "Certificate on request.",
  },
  {
    area: gdpr,
    what: (
      <>
        EU traffic can stay in{" "}
        <span className="font-mono text-meta whitespace-nowrap">{euRegion}</span>
        {euRegion ? ` (${regionLocations[euRegion]})` : ""}.
      </>
    ),
    evidence: billingTerms.dpa,
  },
  {
    area: "SSO and SCIM",
    what: `${identityLine}.`,
    evidence: `Works with ${listAnd(company.sso.idps)}.`,
  },
  { area: "Audit logs", what: trustNotes.auditLogs, evidence: "Exported as JSON or streamed to your SIEM." },
  { area: "Data retention", what: `${dataRetention.headline}.`, evidence: dataRetention.detail },
  {
    area: "Encryption",
    what: `${company.tls} in transit, ${company.encryptionAtRest} at rest.`,
    evidence: `Covered by the ${soc2} report.`,
  },
];

/** What a security questionnaire asks, what Weir does, and what backs it up. */
export function SecurityTable() {
  return (
    <Table data-testid="security-table" className="table-fixed">
      <caption className="sr-only">Security and compliance controls, and the evidence for each</caption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col" className="w-[7.5rem] sm:w-[11rem] lg:w-[14rem]">
            Area
          </TableHead>
          <TableHead scope="col">What you get</TableHead>
          <TableHead scope="col" className="hidden md:table-cell md:w-[38%]">
            Evidence
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {securityRows.map((r) => (
          <TableRow key={r.area} className="hover:bg-surface">
            <th scope="row" className={cn(rowHead, "border-b border-line font-mono text-meta font-normal")}>
              {r.area}
            </th>
            <TableCell className="py-4 align-top text-fg">
              {r.what}
              {/* On phones the evidence folds in under the answer. */}
              <span className="mt-1 block text-fg-2 md:hidden">{r.evidence}</span>
            </TableCell>
            <TableCell className="hidden py-4 align-top text-fg-2 md:table-cell">{r.evidence}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Service credits by monthly uptime, as a share of that month's dedicated bill. */
export function CreditTable() {
  return (
    <Table data-testid="credit-table">
      <caption className="sr-only">
        Service credits by monthly uptime, as a percentage of the month&rsquo;s dedicated bill
      </caption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Monthly uptime</TableHead>
          <TableHead scope="col" className="text-right">
            Service credit
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sla.credits.map((c) => (
          <TableRow key={c.below} className="hover:bg-surface">
            <TableCell className="py-4 font-mono text-small text-fg">Below {c.below}%</TableCell>
            <TableCell className={num}>{c.creditPct}%</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Support tiers: who gets each, how to reach it, and how fast the first reply comes. */
export function SupportTable() {
  return (
    <Table data-testid="support-table">
      <caption className="sr-only">
        Support tiers: what includes each, the channel, and first-response targets
      </caption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Tier</TableHead>
          <TableHead scope="col" className="hidden md:table-cell">
            Channel
          </TableHead>
          <TableHead scope="col" className="text-right">
            <span className="md:hidden">Outage</span>
            <span className="hidden md:inline">Production down</span>
          </TableHead>
          <TableHead scope="col" className="text-right">
            <span className="md:hidden">Other</span>
            <span className="hidden md:inline">Everything else</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {supportTiers.map((t) => (
          <TableRow key={t.id} data-tier={t.id} className="hover:bg-surface">
            <th scope="row" className={cn(rowHead, "border-b border-line")}>
              {t.name}
              <span className="mt-1 block text-small font-normal text-fg-2">{t.includedWith}</span>
              <span className="mt-1 block text-small font-normal text-fg-2 md:hidden">{t.channel}</span>
            </th>
            <TableCell className="hidden py-4 align-top text-fg md:table-cell">{t.channel}</TableCell>
            <TableCell className={cn(num, "align-top whitespace-normal")}>
              {t.urgent.time}
              <span className="mt-1 block text-caption text-fg-2">{t.urgent.hours}</span>
            </TableCell>
            <TableCell className={cn(num, "align-top whitespace-normal max-md:text-meta")}>
              {t.normal}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
