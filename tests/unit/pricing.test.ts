import { describe, expect, it } from "vitest";
import { getModel, isDedicatedModel, isTokenModel, models } from "@/data/models";
import {
  MAX_MONTHLY_TOKENS,
  blendedPrice,
  breakEvenMonthlyTokens,
  clampMonthlyTokens,
  compareMonthly,
  dedicatedMonthlyCost,
  defaultInputShare,
  replicasNeeded,
  serverlessMonthlyCost,
} from "@/lib/pricing";

const found = getModel("llama-3-3-70b");
if (!found || !isTokenModel(found) || !isDedicatedModel(found)) {
  throw new Error("llama-3-3-70b must be a dedicated token model");
}
const llama = found;

describe("pricing", () => {
  it("blends input and output prices per 1M tokens", () => {
    expect(blendedPrice(llama, 0.5)).toBeCloseTo(0.63, 10);
    expect(blendedPrice(llama, 1)).toBeCloseTo(0.54, 10);
    expect(blendedPrice(llama, 0)).toBeCloseTo(0.72, 10);
  });

  it("computes the serverless monthly cost", () => {
    expect(serverlessMonthlyCost(llama, 100e6, 20e6)).toBeCloseTo(68.4, 10);
    expect(serverlessMonthlyCost(llama, 0, 0)).toBe(0);
  });

  it("charges one replica for light traffic", () => {
    expect(dedicatedMonthlyCost(llama, 1e9)).toBeCloseTo(3635.4, 6);
    expect(replicasNeeded(llama, 0)).toBe(1);
  });

  it("rounds replicas up using the peak factor", () => {
    expect(replicasNeeded(llama, 20e9)).toBe(3);
    expect(dedicatedMonthlyCost(llama, 20e9)).toBeCloseTo(3 * 3635.4, 6);
  });

  it("finds the break-even volume", () => {
    expect(breakEvenMonthlyTokens(llama, 0.5)).toBeCloseTo(5_770_476_190, -4);
  });

  it("returns null break-even when there is no dedicated option", () => {
    const noDedicated = getModel("deepseek-r1-0528");
    expect(noDedicated?.dedicated).toBeNull();
    expect(noDedicated && breakEvenMonthlyTokens(noDedicated, 0.5)).toBeNull();
    const image = getModel("flux-1-dev");
    expect(image && breakEvenMonthlyTokens(image, 0.5)).toBeNull();
  });

  it("returns null break-even when one replica can never pay off", () => {
    const cheap = {
      ...llama,
      pricing: { unit: "tokens" as const, input: 0.01, output: 0.01 },
    };
    expect(breakEvenMonthlyTokens(cheap, 0.5)).toBeNull();
  });

  it("clamps calculator input to 0..100B tokens", () => {
    expect(clampMonthlyTokens("")).toBe(0);
    expect(clampMonthlyTokens("   ")).toBe(0);
    expect(clampMonthlyTokens(-5)).toBe(0);
    expect(clampMonthlyTokens("abc")).toBe(0);
    expect(clampMonthlyTokens(NaN)).toBe(0);
    expect(clampMonthlyTokens(undefined)).toBe(0);
    expect(clampMonthlyTokens(null)).toBe(0);
    expect(clampMonthlyTokens(-Infinity)).toBe(0);
    expect(clampMonthlyTokens(1e30)).toBe(100e9);
    expect(clampMonthlyTokens(Infinity)).toBe(100e9);
    expect(clampMonthlyTokens("2500000")).toBe(2_500_000);
    expect(clampMonthlyTokens("2,500,000")).toBe(2_500_000);
    expect(clampMonthlyTokens(MAX_MONTHLY_TOKENS)).toBe(100e9);
  });

  it("never produces NaN or Infinity from hostile volumes", () => {
    for (const v of [NaN, Infinity, -1, 1e30]) {
      expect(Number.isFinite(replicasNeeded(llama, v))).toBe(true);
      expect(Number.isFinite(dedicatedMonthlyCost(llama, v))).toBe(true);
    }
    expect(Number.isFinite(serverlessMonthlyCost(llama, NaN, -3))).toBe(true);
  });

  it("sizes replicas for a month of up to 100B input plus 100B output", () => {
    // 200B tokens a month at twice the average rate needs 26 replicas of 6,000 tok/s.
    expect(replicasNeeded(llama, 200e9)).toBe(26);
    expect(replicasNeeded(llama, 1e30)).toBe(26);
    // Infinity is "as much as possible", not "nothing".
    expect(replicasNeeded(llama, Infinity)).toBe(26);
    expect(dedicatedMonthlyCost(llama, Infinity)).toBeCloseTo(26 * 3635.4, 6);
    // NaN and negatives are no traffic: the one-replica minimum.
    expect(replicasNeeded(llama, NaN)).toBe(1);
    expect(replicasNeeded(llama, -1)).toBe(1);
    expect(replicasNeeded(llama, -Infinity)).toBe(1);
  });
});

describe("defaultInputShare", () => {
  it("is 1 for embeddings, which bill input only", () => {
    const bge = getModel("bge-m3");
    if (!bge) throw new Error("no bge-m3");
    expect(defaultInputShare(bge)).toBe(1);
  });

  it("is an even split for chat and image models", () => {
    expect(defaultInputShare(llama)).toBe(0.5);
    const image = models.find((m) => m.pricing.unit === "image");
    if (!image) throw new Error("no image model");
    expect(defaultInputShare(image)).toBe(0.5);
  });
});

describe("compareMonthly", () => {
  it("prices the reference month on Llama 3.3 70B", () => {
    const c = compareMonthly(llama, 100e6, 20e6);
    expect(c.inputTokens).toBe(100e6);
    expect(c.outputTokens).toBe(20e6);
    expect(c.totalTokens).toBe(120e6);
    expect(c.inputShare).toBeCloseTo(5 / 6, 10);
    expect(c.blended).toBeCloseTo(0.57, 10);
    expect(c.serverless).toBeCloseTo(68.4, 10);
    expect(c.dedicated).toEqual({ replicas: 1, cost: expect.closeTo(3635.4, 6) });
    // 3,635.40 / 0.57 per 1M, from the person's own mix.
    expect(c.breakEven).toBeCloseTo(6_377_894_737, -3);
    expect(c.cheaper).toBe("serverless");
    expect(c.savings).toBeCloseTo(3567, 6);
  });

  it("names dedicated cheaper once one replica pays for itself", () => {
    const c = compareMonthly(llama, 6e9, 1e9);
    expect(c.serverless).toBeCloseTo(3960, 6);
    expect(c.dedicated?.replicas).toBe(1);
    expect(c.cheaper).toBe("dedicated");
    expect(c.savings).toBeCloseTo(324.6, 6);
  });

  it("sizes dedicated on input plus output", () => {
    const c = compareMonthly(llama, 100e9, 100e9);
    expect(c.totalTokens).toBe(200e9);
    expect(c.dedicated?.replicas).toBe(26);
    expect(c.serverless).toBeCloseTo(126_000, 6);
  });

  it("assumes an even mix when there is no traffic", () => {
    const c = compareMonthly(llama, 0, 0);
    expect(c.inputShare).toBe(0.5);
    expect(c.blended).toBeCloseTo(0.63, 10);
    expect(c.serverless).toBe(0);
    expect(c.dedicated?.replicas).toBe(1);
    expect(c.breakEven).toBeCloseTo(5_770_476_190, -4);
    expect(c.cheaper).toBe("serverless");
  });

  it("has no dedicated side for serverless-only models", () => {
    const m = getModel("deepseek-r1-0528");
    if (!m || !isTokenModel(m)) throw new Error("deepseek-r1-0528 must be a token model");
    const c = compareMonthly(m, 100e6, 20e6);
    expect(c.dedicated).toBeNull();
    expect(c.breakEven).toBeNull();
    expect(c.cheaper).toBe("serverless");
    expect(c.savings).toBe(0);
    expect(c.serverless).toBeCloseTo(100 * 0.7 + 20 * 2.4, 10);
  });

  it("stays finite and non-negative for hostile input", () => {
    for (const [i, o] of [
      ["abc", -5],
      [NaN, Infinity],
      ["", "1e30"],
      [-Infinity, undefined],
    ] as const) {
      const c = compareMonthly(llama, i, o);
      for (const v of [
        c.inputTokens,
        c.outputTokens,
        c.totalTokens,
        c.inputShare,
        c.blended,
        c.serverless,
        c.savings,
        c.dedicated?.cost ?? 0,
        c.dedicated?.replicas ?? 0,
        c.breakEven ?? 0,
      ]) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
      }
      expect(c.inputTokens).toBeLessThanOrEqual(100e9);
      expect(c.outputTokens).toBeLessThanOrEqual(100e9);
    }
  });
});
