export interface MetricPoint {
  /** Minutes since the start of the 24-hour window (0, 15, 30, ...). */
  t: number;
  /** Median latency of the requests in this 15-minute step, in ms. */
  latencyMs: number;
  /** Median decode speed in this step; null for models that do not stream tokens. */
  tokensPerSec: number | null;
}

const POINTS = 96;
const STEP_MINUTES = 15;
const WINDOW_MINUTES = POINTS * STEP_MINUTES;

/**
 * Nearest-rank percentile: the smallest value with at least p% of the values
 * at or below it. Always a value from the list, never an interpolation.
 */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const share = Math.min(100, Math.max(0, Number.isFinite(p) ? p : 50)) / 100;
  const rank = Math.max(1, Math.ceil(share * sorted.length));
  return sorted[rank - 1];
}

/** "24h ago", "23h 45m ago", "15m ago" for a step that starts at minute t. */
export function minutesAgo(t: number): string {
  const ago = Math.max(0, WINDOW_MINUTES - t);
  const h = Math.floor(ago / 60);
  const m = ago % 60;
  if (h === 0) return `${m}m ago`;
  return m === 0 ? `${h}h ago` : `${h}h ${m}m ago`;
}

/**
 * Scales positive values so their nearest-rank median lands exactly on target.
 * Rounding is monotonic, so the value at the median rank rounds to target.
 */
function calibrate(raw: number[], target: number): number[] {
  const k = target / percentile(raw, 50);
  return raw.map((v) => Math.max(1, Math.round(v * k)));
}

/** FNV-1a hash of a string into an unsigned 32-bit seed. */
function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Small seeded PRNG returning floats in [0, 1). */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 24 hours of illustrative metrics in 15-minute steps, deterministic per slug.
 * Latency sits around the model's p50 with a gentle daily swell, noise and a
 * few short spikes; decode speed dips when latency rises, as both follow load.
 * Each series is scaled so its median is exactly the catalog figure (p50 and
 * tokens per second), so the chart and the tables never disagree.
 */
export function metricsSeries(
  slug: string,
  p50Ms: number,
  tokensPerSec: number | null = null,
): MetricPoint[] {
  const rand = mulberry32(hashSeed(slug));
  const base = Number.isFinite(p50Ms) && p50Ms > 0 ? p50Ms : 1;
  const speed = tokensPerSec !== null && Number.isFinite(tokensPerSec) && tokensPerSec > 0
    ? tokensPerSec
    : null;

  const load: number[] = [];
  const speedNoise: number[] = [];
  for (let i = 0; i < POINTS; i++) {
    const hour = (i * STEP_MINUTES) / 60;
    const swell = 1 + 0.04 * Math.sin(((hour - 15) / 24) * 2 * Math.PI);
    const noise = (rand() - 0.5) * 0.1;
    const spike = rand() < 0.04 ? 1.25 + rand() * 0.2 : 1;
    load.push((swell + noise) * spike);
    speedNoise.push((rand() - 0.5) * 0.06);
  }

  const latency = calibrate(load.map((l) => base * l), base);
  const speeds = speed === null
    ? null
    : calibrate(
        // Half the latency swing shows up as lost decode speed.
        load.map((l, i) => speed * Math.max(0.2, 1 - 0.5 * (l - 1) + speedNoise[i])),
        speed,
      );

  return latency.map((latencyMs, i) => ({
    t: i * STEP_MINUTES,
    latencyMs,
    tokensPerSec: speeds ? speeds[i] : null,
  }));
}
