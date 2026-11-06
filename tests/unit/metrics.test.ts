import { describe, expect, it } from "vitest";
import { models } from "@/data/models";
import { metricsSeries, minutesAgo, percentile } from "@/lib/metrics";

describe("metricsSeries", () => {
  it("returns 96 points at 15-minute steps", () => {
    const s = metricsSeries("llama-3-3-70b", 212);
    expect(s).toHaveLength(96);
    expect(s[0].t).toBe(0);
    expect(s[1].t - s[0].t).toBe(15);
  });
  it("is deterministic", () => {
    expect(metricsSeries("llama-3-3-70b", 212)).toEqual(
      metricsSeries("llama-3-3-70b", 212),
    );
  });
  it("differs between models", () => {
    expect(metricsSeries("llama-3-3-70b", 212)).not.toEqual(
      metricsSeries("qwen3-32b", 212),
    );
  });
  it("keeps the median near the p50", () => {
    const sorted = metricsSeries("llama-3-3-70b", 212)
      .map((p) => p.latencyMs)
      .sort((a, b) => a - b);
    const median = (sorted[47] + sorted[48]) / 2;
    expect(median).toBeGreaterThanOrEqual(190);
    expect(median).toBeLessThanOrEqual(234);
  });
  it("only produces positive finite values", () => {
    for (const slug of ["a", "flux-1-dev", "bge-m3"]) {
      for (const p of metricsSeries(slug, 18)) {
        expect(Number.isFinite(p.latencyMs)).toBe(true);
        expect(p.latencyMs).toBeGreaterThan(0);
      }
    }
  });
});

describe("percentile (nearest rank)", () => {
  it("picks the value at rank ceil(p/100 * n)", () => {
    const v = Array.from({ length: 100 }, (_, i) => 100 - i);
    expect(percentile(v, 50)).toBe(50);
    expect(percentile(v, 95)).toBe(95);
    expect(percentile(v, 100)).toBe(100);
    expect(percentile([7], 50)).toBe(7);
  });
  it("does not reorder the input", () => {
    const v = [3, 1, 2];
    percentile(v, 50);
    expect(v).toEqual([3, 1, 2]);
  });
  it("returns 0 for an empty list and clamps p", () => {
    expect(percentile([], 50)).toBe(0);
    expect(percentile([1, 2, 3], -5)).toBe(1);
    expect(percentile([1, 2, 3], 500)).toBe(3);
  });
});

describe("series agree with the catalog", () => {
  it("the 24-hour median latency is the model's p50", () => {
    for (const m of models) {
      const s = metricsSeries(m.slug, m.p50Ms, m.tokensPerSec);
      expect(percentile(s.map((p) => p.latencyMs), 50), m.slug).toBe(m.p50Ms);
    }
  });
  it("the median decode speed is the model's tokens per second", () => {
    for (const m of models) {
      const s = metricsSeries(m.slug, m.p50Ms, m.tokensPerSec);
      if (m.tokensPerSec === null) {
        expect(s.every((p) => p.tokensPerSec === null), m.slug).toBe(true);
        continue;
      }
      const speeds = s.map((p) => p.tokensPerSec as number);
      expect(percentile(speeds, 50), m.slug).toBe(m.tokensPerSec);
      for (const v of speeds) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThan(0);
      }
    }
  });
  it("speed dips when latency spikes (same load)", () => {
    const s = metricsSeries("llama-3-3-70b", 212, 96);
    const slowest = s.reduce((a, b) => (b.latencyMs > a.latencyMs ? b : a));
    expect(slowest.tokensPerSec as number).toBeLessThan(96);
  });
});

describe("minutesAgo", () => {
  it("labels each 15-minute step by how long ago it started", () => {
    expect(minutesAgo(0)).toBe("24h ago");
    expect(minutesAgo(15)).toBe("23h 45m ago");
    expect(minutesAgo(1380)).toBe("1h ago");
    expect(minutesAgo(1425)).toBe("15m ago");
  });
});
