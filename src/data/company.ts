import type { Region } from "@/data/models";
import { HOURS_PER_MONTH } from "@/lib/pricing";

/**
 * Company facts that more than one page states: the home, Pricing,
 * Enterprise and Docs all read them from here, so a number can only change in
 * one place. Model prices live in models.ts and GPU rates in gpus.ts.
 */
export const company = {
  /** Free credit for a new account, in USD. */
  freeCreditUsd: 5,
  /** Requests per minute a new key starts with; raised as the account spends. */
  rateLimitRpm: 600,
  /** Monthly uptime the dedicated-endpoint SLA commits to, in percent. */
  slaDedicatedPct: 99.95,
  /** Measured API uptime over the last 90 days, in percent. */
  uptime90dPct: 99.99,
  /** How long opt-in request logs are kept, in days. */
  logRetentionDays: 30,
  certifications: ["SOC 2 Type II", "ISO 27001", "GDPR"],
  /** Serving regions, in display order. Every model runs in a subset of these. */
  regions: ["us-east", "us-west", "eu-west"] as readonly Region[],
  sso: {
    protocols: ["SAML 2.0", "SCIM"],
    idps: ["Okta", "Microsoft Entra ID", "Google Workspace"],
  },
  sdks: ["Python", "Node"],
  /** Transport encryption at the edge, and encryption at rest. */
  tls: "TLS 1.3",
  encryptionAtRest: "AES-256",
  /** Billing granularity for dedicated GPUs (hourly rates, metered by the second). */
  dedicatedBilling: "by the second",
} as const;

/** What a new account needs to start: stated on the home, Pricing and Docs pages. */
export const noCardRequired = "No card required.";

/** "$5" (whole dollars, no cents). */
export const freeCreditLabel = `$${company.freeCreditUsd}`;

/** "99.95%". */
export function pct(v: number): string {
  return `${v}%`;
}

/**
 * Data handling, stated once. Prompts and outputs are not kept unless the
 * customer turns request logging on.
 */
export const dataRetention = {
  headline: "Zero retention by default",
  detail: `Never used for training. Request logging is opt-in, kept ${company.logRetentionDays} days.`,
} as const;

/** "A, B and C". */
export function listAnd(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** "Invoiced monthly in USD" → "invoiced monthly in USD", for use mid-sentence. */
export function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/** "SOC 2 Type II, ISO 27001 and GDPR, with a DPA". */
export const complianceLine = `${listAnd(company.certifications)}, with a DPA`;

/**
 * Billing and contract terms that Pricing and Enterprise both state, kept here
 * so the two pages use the same words.
 */
export const billingTerms = {
  /** How serverless usage turns into a bill. */
  serverlessBilling:
    "Usage is added up across your keys and charged monthly, with no minimums and no seat fees.",
  /** What a contract changes about price. */
  contractPricing: "Committed-volume rates on serverless and dedicated",
  /** How a contract is billed. */
  contractBilling: "Invoiced monthly in USD",
  /** The data processing agreement. */
  dpa: "A DPA with standard contractual clauses is available on every plan.",
  /** Why dedicated has no request-rate cap. */
  dedicatedLimits:
    "Dedicated endpoints have no per-key request limit: throughput is set by the replicas you reserve.",
  /** Models outside the replica table. */
  readyReplicas: "Models without a ready replica are set up on request.",
} as const;

/** "99.99% API uptime over the last 90 days". */
export const measuredUptimeLine = `${pct(company.uptime90dPct)} API uptime over the last 90 days`;

/** Where each serving region runs. */
export const regionLocations: Record<Region, string> = {
  "us-east": "Virginia",
  "us-west": "Oregon",
  "eu-west": "Ireland",
};

/** "99.95% monthly uptime, with service credits": the SLA in the words every page uses. */
export const slaLine = `${pct(company.slaDedicatedPct)} monthly uptime, with service credits`;

/**
 * Who the SLA covers, stated once: it comes with dedicated capacity itself,
 * not with a contract.
 */
export const slaCoverage = "Every dedicated endpoint is covered, self-serve or under contract.";

/** "SSO with SAML 2.0 and SCIM, with audit logs". */
export const identityLine = `SSO with ${listAnd(company.sso.protocols)}, with audit logs`;

/** What the Enterprise support tier adds, stated the same way on every page. */
export const supportLine = "A named engineer and a shared Slack channel";

/** Trust notes the home band and the Enterprise page both state. */
export const trustNotes = {
  reports: "Reports shared under NDA.",
  auditLogs: "Audit logs for every key.",
  slaCredits: "Measured monthly, with service credits when we miss it.",
} as const;

/** The dedicated-endpoint SLA in detail. Credits are a share of that month's dedicated bill. */
export const sla = {
  measured: "Per endpoint, each calendar month, from our edge in every region",
  credits: [
    { below: company.slaDedicatedPct, creditPct: 10 },
    { below: 99.5, creditPct: 25 },
    { below: 99, creditPct: 50 },
  ],
  claim: "Applied to the next invoice, with no ticket to file",
  maintenance: "Announced 7 days ahead and run one region at a time",
} as const;

/** Minutes of downtime a month that an uptime percentage allows (730-hour month). */
export function allowedDowntimeMinutes(uptimePct: number): number {
  return ((100 - uptimePct) / 100) * HOURS_PER_MONTH * 60;
}

export interface SupportTier {
  id: "standard" | "dedicated" | "enterprise";
  name: string;
  includedWith: string;
  channel: string;
  /** First response when production is down. */
  urgent: { time: string; hours: string };
  /** First response to everything else. */
  normal: string;
}

/** Support tiers. Business hours are 9:00 to 18:00 Pacific, Monday to Friday. */
export const supportTiers: SupportTier[] = [
  {
    id: "standard",
    name: "Standard",
    includedWith: "Every account",
    channel: "Email, at support@weir.example",
    urgent: { time: "4 h", hours: "business hours" },
    normal: "1 business day",
  },
  {
    id: "dedicated",
    name: "Dedicated",
    includedWith: "Any dedicated endpoint",
    channel: "Email, plus an on-call page for outages",
    urgent: { time: "1 h", hours: "24/7" },
    normal: "8 business hours",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    includedWith: "A contract",
    channel: supportLine,
    urgent: { time: "15 min", hours: "24/7" },
    normal: "4 business hours",
  },
];

export const businessHours = "9:00 to 18:00 Pacific, Monday to Friday";
