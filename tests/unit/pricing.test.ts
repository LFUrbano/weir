import { describe, expect, it } from "vitest";
import { getModel, isDedicatedModel, isTokenModel } from "@/data/models";
import {
  MAX_MONTHLY_TOKENS,
  blendedPrice,
  breakEvenMonthlyTokens,
  clampMonthlyTokens,
  dedicatedMonthlyCost,
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
});
