import { describe, expect, it } from "vitest";
import { metricsSeries } from "@/lib/metrics";

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
