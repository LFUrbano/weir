import { REFERENCE_MODEL_SLUG, type TokenModel } from "@/data/models";

/**
 * The call the hero terminal plays back. It is the request in the code panel
 * (the streaming chat snippet for Llama 3.3 70B), replayed at that model's
 * measured p50 time to first token and decode speed. Every number the
 * terminal shows is computed here from the model data, never typed in.
 */
export const heroDemo = {
  modelSlug: REFERENCE_MODEL_SLUG,
  /** The snippet's one user message with the Llama 3 chat template around it. */
  promptTokens: 17,
  response:
    "A KV cache keeps the attention keys and values already computed for earlier tokens, so the model does not recompute them every time it generates a new one. Each decoding step then reads stored state instead of reprocessing the whole sequence, which keeps long responses fast and cheap.",
} as const;

const PIECE = /\s*[A-Za-z0-9'’-]+|\s*[^\sA-Za-z0-9]|\s+/g;

/**
 * A stand-in for a subword tokenizer: words keep their leading space,
 * punctuation is its own token, and words of eight letters or more split in
 * two. Joining the result always gives back the input.
 */
export function splitTokens(text: string): string[] {
  const out: string[] = [];
  for (const [piece] of text.matchAll(PIECE)) {
    const lead = piece.length - piece.trimStart().length;
    const word = piece.slice(lead);
    if (/^[A-Za-z]{8,}$/.test(word)) {
      const cut = Math.ceil(word.length / 2);
      out.push(piece.slice(0, lead) + word.slice(0, cut), word.slice(cut));
    } else {
      out.push(piece);
    }
  }
  return out;
}

export const demoTokens = splitTokens(heroDemo.response);

/**
 * When each token arrives, in ms after the request was sent. The first lands
 * at the time to first token; the gaps wobble a little, as real decoding does,
 * but always add up to the model's tokens per second, so the throughput the
 * terminal ends on is exactly the catalog number.
 */
export function tokenArrivals(ttftMs: number, tokensPerSec: number, count: number): number[] {
  if (count <= 0) return [];
  const gaps = Array.from({ length: count - 1 }, (_, i) => 1 + 0.35 * Math.sin(i * 2.3) + 0.2 * Math.sin(i * 0.7));
  const total = gaps.reduce((a, b) => a + b, 0);
  const span = ((count - 1) * 1000) / tokensPerSec;
  const out = [ttftMs];
  for (let i = 0; i < gaps.length; i++) out.push(out[i] + (gaps[i] / total) * span);
  out[count - 1] = ttftMs + span;
  return out;
}

/** USD for the whole demo call: prompt tokens at the input rate, the response at the output rate. */
export function demoCost(m: TokenModel): number {
  return (heroDemo.promptTokens * m.pricing.input + demoTokens.length * m.pricing.output) / 1e6;
}

export type DemoPhase = "waiting" | "streaming" | "done";

export interface DemoFrame {
  phase: DemoPhase;
  /** Tokens received so far. */
  tokens: number;
  /** Counts up while waiting, then holds at the time the first token arrived. */
  ttftMs: number;
  /** Decode speed so far, in tokens per second; null until two tokens are in. */
  throughput: number | null;
  /** USD billed so far. */
  cost: number;
}

const arrivalsCache = new Map<string, number[]>();

function arrivalsFor(m: TokenModel): number[] {
  let a = arrivalsCache.get(m.slug);
  if (!a) {
    a = tokenArrivals(m.p50Ms, m.tokensPerSec ?? 1, demoTokens.length);
    arrivalsCache.set(m.slug, a);
  }
  return a;
}

/** Ms from sending the request to the last token. */
export function demoDuration(m: TokenModel): number {
  return arrivalsFor(m).at(-1) ?? 0;
}

/** The state of the demo call `elapsedMs` after the request was sent. */
export function demoFrame(m: TokenModel, elapsedMs: number): DemoFrame {
  const arrivals = arrivalsFor(m);
  let tokens = 0;
  while (tokens < arrivals.length && arrivals[tokens] <= elapsedMs) tokens++;

  const phase: DemoPhase =
    tokens === 0 ? "waiting" : tokens < arrivals.length ? "streaming" : "done";
  const ttftMs = tokens === 0 ? Math.max(0, Math.min(elapsedMs, m.p50Ms)) : m.p50Ms;
  const throughput =
    tokens >= 2 ? (tokens - 1) / ((arrivals[tokens - 1] - arrivals[0]) / 1000) : null;
  const cost =
    tokens === 0 ? 0 : (heroDemo.promptTokens * m.pricing.input + tokens * m.pricing.output) / 1e6;

  return { phase, tokens, ttftMs, throughput, cost };
}
