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

export type ModelKind = "chat" | "embeddings" | "image";

/** What one request does: chat (and reasoning, code, vision), embeddings or images. */
export function modelKind(m: Model): ModelKind {
  if (m.pricing.unit === "image") return "image";
  if (m.tasks.includes("embeddings")) return "embeddings";
  return "chat";
}

const ENDPOINTS: Record<ModelKind, string> = {
  chat: "POST /v1/chat/completions",
  embeddings: "POST /v1/embeddings",
  image: "POST /v1/images/generations",
};

export function endpointFor(m: Model): string {
  return ENDPOINTS[modelKind(m)];
}

/**
 * What p50 measures: the first streamed token for chat models, the whole
 * response for embeddings and images (they return in one piece).
 */
export function latencyName(m: Model): "Time to first token" | "Response time" {
  return modelKind(m) === "chat" ? "Time to first token" : "Response time";
}
