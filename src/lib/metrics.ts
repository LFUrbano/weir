export interface MetricPoint {
  /** Minutes since the start of the 24-hour window (0, 15, 30, ...). */
  t: number;
  latencyMs: number;
}

const POINTS = 96;
const STEP_MINUTES = 15;

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
 * 24 hours of illustrative latency in 15-minute steps, deterministic per slug.
 * Values sit around the model's p50 with a gentle daily swell, noise and a few
 * short spikes, so the median stays close to p50.
 */
export function metricsSeries(slug: string, p50Ms: number): MetricPoint[] {
  const rand = mulberry32(hashSeed(slug));
  const base = Number.isFinite(p50Ms) && p50Ms > 0 ? p50Ms : 1;
  const points: MetricPoint[] = [];
  for (let i = 0; i < POINTS; i++) {
    const hour = (i * STEP_MINUTES) / 60;
    const swell = 1 + 0.04 * Math.sin(((hour - 15) / 24) * 2 * Math.PI);
    const noise = (rand() - 0.5) * 0.1;
    const spike = rand() < 0.04 ? 1.25 + rand() * 0.2 : 1;
    points.push({
      t: i * STEP_MINUTES,
      latencyMs: Math.max(1, Math.round(base * (swell + noise) * spike)),
    });
  }
  return points;
}
