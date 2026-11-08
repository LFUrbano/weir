import { getGpu } from "@/data/gpus";
import {
  isDedicatedModel,
  isTokenModel,
  type DedicatedModel,
  type Model,
  type TokenModel,
} from "@/data/models";

export const HOURS_PER_MONTH = 730;
export const SECONDS_PER_MONTH = 2_628_000;
/** Dedicated capacity is sized for traffic at twice the monthly average. */
export const PEAK_FACTOR = 2;
export const MAX_MONTHLY_TOKENS = 100e9;

function finiteOrZero(v: number): number {
  return Number.isFinite(v) && v > 0 ? v : 0;
}

/**
 * Serverless price in USD per 1M tokens for a given share of input tokens (0..1).
 * Only token-priced models have one; image models bill per image, so callers
 * must narrow with `isTokenModel` first (the type enforces it).
 */
export function blendedPrice(m: TokenModel, inputShare: number): number {
  const share = Math.min(1, Math.max(0, Number.isFinite(inputShare) ? inputShare : 0));
  return m.pricing.input * share + m.pricing.output * (1 - share);
}

/**
 * The input share every page assumes when a model has no traffic of its own:
 * embeddings bill input only (1), chat splits evenly (0.5). One rule, so the
 * model page, the pricing tables and the comparison agree on break-even.
 */
export function defaultInputShare(m: Model): number {
  return m.tasks.includes("embeddings") ? 1 : 0.5;
}

/** Serverless cost in USD for a month with the given input and output token counts. */
export function serverlessMonthlyCost(
  m: TokenModel,
  inputTokens: number,
  outputTokens: number,
): number {
  return (
    (finiteOrZero(inputTokens) / 1e6) * m.pricing.input +
    (finiteOrZero(outputTokens) / 1e6) * m.pricing.output
  );
}

/** Tokens per month that one replica can serve while keeping headroom for peaks. */
function replicaMonthlyCapacity(m: DedicatedModel): number {
  return (m.dedicated.replicaTokensPerSec / PEAK_FACTOR) * SECONDS_PER_MONTH;
}

function replicaMonthlyCost(m: DedicatedModel): number {
  return m.dedicated.gpusPerReplica * getGpu(m.dedicated.gpu).hourly * HOURS_PER_MONTH;
}

/**
 * Input and output are each capped at MAX_MONTHLY_TOKENS, so the most a month
 * can carry through a replica is twice that.
 */
const MAX_MONTHLY_TOTAL = 2 * MAX_MONTHLY_TOKENS;

/** A month's total between 0 and MAX_MONTHLY_TOTAL: NaN and negatives are 0, Infinity is the max. */
function clampMonthlyTotal(v: number): number {
  if (Number.isNaN(v) || v <= 0) return 0;
  return Math.min(v, MAX_MONTHLY_TOTAL);
}

/** Replicas needed to serve the monthly volume (input plus output) at peak; always at least 1. */
export function replicasNeeded(m: DedicatedModel, monthlyTokens: number): number {
  const tokens = clampMonthlyTotal(monthlyTokens);
  const peakTokensPerSec = (tokens / SECONDS_PER_MONTH) * PEAK_FACTOR;
  // The epsilon keeps an exact multiple (e.g. 2.0000000001) from adding a replica.
  const needed = Math.ceil(peakTokensPerSec / m.dedicated.replicaTokensPerSec - 1e-9);
  return Math.max(1, needed);
}

/** Dedicated cost in USD: replicas x GPUs per replica x hourly rate x 730 hours. */
export function dedicatedMonthlyCost(m: DedicatedModel, monthlyTokens: number): number {
  return replicasNeeded(m, monthlyTokens) * replicaMonthlyCost(m);
}

/**
 * Monthly tokens above which one dedicated replica costs less than serverless:
 * replicaCost / blendedPrice x 1M. Returns null when the model has no dedicated
 * option, or when serverless stays cheaper even with one replica fully used
 * (the break-even volume would exceed what a replica can serve).
 */
export function breakEvenMonthlyTokens(m: Model, inputShare: number): number | null {
  if (!isTokenModel(m) || !isDedicatedModel(m)) return null;
  const blended = blendedPrice(m, inputShare);
  if (!(blended > 0)) return null;
  const breakEven = (replicaMonthlyCost(m) / blended) * 1e6;
  return breakEven <= replicaMonthlyCapacity(m) ? breakEven : null;
}

/** Turns any calculator input into a safe token count between 0 and 100 billion. */
export function clampMonthlyTokens(v: unknown): number {
  let n: number;
  if (typeof v === "number") n = v;
  else if (typeof v === "string") n = Number(v.replace(/[\s,_]/g, "") || "0");
  else n = 0;
  if (Number.isNaN(n) || n <= 0) return 0;
  return Math.min(n, MAX_MONTHLY_TOKENS);
}

export interface MonthlyComparison {
  /** The person's volumes after clamping, each 0..100B. */
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  /** Input as a share of all tokens (0..1); an even 0.5 when there is no traffic. */
  inputShare: number;
  /** Serverless USD per 1M tokens at that mix. */
  blended: number;
  serverless: number;
  /** Null for models that only run on the shared pool. */
  dedicated: { replicas: number; cost: number } | null;
  /** Monthly tokens at which one replica pays for itself, at this mix. */
  breakEven: number | null;
  /** Serverless wins a tie: it has no reserved capacity to manage. */
  cheaper: "serverless" | "dedicated";
  /** What the cheaper option saves per month; 0 without a dedicated option. */
  savings: number;
}

/**
 * Everything the pricing calculator shows for one model and one month,
 * from raw field values (any text or number is clamped first).
 */
export function compareMonthly(m: TokenModel, input: unknown, output: unknown): MonthlyComparison {
  const inputTokens = clampMonthlyTokens(input);
  const outputTokens = clampMonthlyTokens(output);
  const totalTokens = inputTokens + outputTokens;
  const inputShare = totalTokens > 0 ? inputTokens / totalTokens : 0.5;
  const serverless = serverlessMonthlyCost(m, inputTokens, outputTokens);
  const dedicated = isDedicatedModel(m)
    ? { replicas: replicasNeeded(m, totalTokens), cost: dedicatedMonthlyCost(m, totalTokens) }
    : null;
  const cheaper = dedicated && dedicated.cost < serverless ? "dedicated" : "serverless";
  return {
    inputTokens,
    outputTokens,
    totalTokens,
    inputShare,
    blended: blendedPrice(m, inputShare),
    serverless,
    dedicated,
    breakEven: breakEvenMonthlyTokens(m, inputShare),
    cheaper,
    savings: dedicated ? Math.abs(serverless - dedicated.cost) : 0,
  };
}
