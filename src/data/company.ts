import type { Region } from "@/data/models";

/**
 * Company facts that more than one page states: the home, Pricing,
 * Enterprise and Docs all read them from here, so a number can only change in
 * one place. Model prices live in models.ts and GPU rates in gpus.ts.
 */
export const company = {
  /** Free credit for a new account, in USD. No card required. */
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
  /** Billing granularity for dedicated GPUs (hourly rates, metered by the second). */
  dedicatedBilling: "by the second",
} as const;

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
