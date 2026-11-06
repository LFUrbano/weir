import { MAX_MONTHLY_TOKENS, clampMonthlyTokens } from "@/lib/pricing";

/**
 * The calculator's volume slider: a log scale from 1M to 100B tokens a month,
 * 20 steps per decade, each step a round number (two significant digits).
 * The numeric field next to it holds any value; the slider shows the nearest step.
 */
export const MIN_SLIDER_TOKENS = 1e6;
export const SLIDER_MAX_STEP = 100;

const MIN_EXP = Math.log10(MIN_SLIDER_TOKENS);
const STEPS_PER_DECADE = SLIDER_MAX_STEP / (Math.log10(MAX_MONTHLY_TOKENS) - MIN_EXP);

export function tokensAtStep(step: number): number {
  const s = Number.isFinite(step) ? Math.min(SLIDER_MAX_STEP, Math.max(0, Math.round(step))) : 0;
  return Number((10 ** (MIN_EXP + s / STEPS_PER_DECADE)).toPrecision(2));
}

/** Nearest slider step for a token count; values under 1M sit at the left end. */
export function stepForTokens(tokens: number): number {
  const t = clampMonthlyTokens(tokens);
  if (t <= MIN_SLIDER_TOKENS) return 0;
  return Math.min(SLIDER_MAX_STEP, Math.round((Math.log10(t) - MIN_EXP) * STEPS_PER_DECADE));
}

const SUFFIX: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9, t: 1e12 };

/**
 * What a person types in the volume field, as a token count: plain numbers
 * with separators ("2,500,000"), exponents ("1e9") or a K/M/B/T suffix ("1.5B").
 * Anything else goes through clampMonthlyTokens, so the result is always 0..100B.
 */
export function parseTokenText(text: string): number {
  const compact = text.replace(/[\s,_]/g, "");
  const match = /^(\d+(?:\.\d+)?|\.\d+)([kmbt])$/i.exec(compact);
  if (match) return clampMonthlyTokens(Number(match[1]) * SUFFIX[match[2].toLowerCase()]);
  return clampMonthlyTokens(compact);
}
