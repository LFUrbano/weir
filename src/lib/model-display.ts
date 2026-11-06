import type { Model } from "@/data/models";
import { formatPerImage, formatUsd } from "@/lib/format";

/** Shown where a value does not apply (embedding output, image throughput). */
export const NOT_APPLICABLE = "—";

export type PriceDisplay =
  | { unit: "tokens"; input: string; output: string }
  | { unit: "image"; perImage: string };

/**
 * Display strings for a model's serverless price. Token models show input and
 * output per 1M tokens (embeddings produce no output tokens, so "—"); image
 * models show one price per image.
 */
export function modelPrice(m: Model): PriceDisplay {
  if (m.pricing.unit === "image") {
    return { unit: "image", perImage: `${formatPerImage(m.pricing.perImage)} / image` };
  }
  const { input, output } = m.pricing;
  return {
    unit: "tokens",
    input: formatUsd(input),
    output: output > 0 ? formatUsd(output) : NOT_APPLICABLE,
  };
}

/** Decode speed per request, or "—" for models that do not stream tokens. */
export function modelSpeed(m: Model): string {
  const v = m.tokensPerSec;
  return v !== null && Number.isFinite(v) && v > 0 ? `${Math.round(v)} tok/s` : NOT_APPLICABLE;
}
