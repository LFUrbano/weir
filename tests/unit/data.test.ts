import { describe, expect, it } from "vitest";
import { getModel, models } from "@/data/models";
import { gpus } from "@/data/gpus";
import { breakEvenMonthlyTokens } from "@/lib/pricing";

describe("model data", () => {
  it("has between 22 and 26 models", () => {
    expect(models.length).toBeGreaterThanOrEqual(22);
    expect(models.length).toBeLessThanOrEqual(26);
  });

  it("has unique kebab-case slugs", () => {
    const slugs = models.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("holds the reference values for Llama 3.3 70B", () => {
    const m = getModel("llama-3-3-70b");
    expect(m).toBeDefined();
    expect(m?.pricing).toEqual({ unit: "tokens", input: 0.54, output: 0.72 });
    expect(m?.dedicated).toEqual({
      gpu: "h100",
      gpusPerReplica: 2,
      replicaTokensPerSec: 6000,
    });
  });

  it("returns undefined for an unknown slug", () => {
    expect(getModel("nope")).toBeUndefined();
  });

  it("lists the H100 at $2.49 per hour", () => {
    expect(gpus.find((g) => g.id === "h100")?.hourly).toBe(2.49);
  });

  it("gives image models no context and no token speed", () => {
    const images = models.filter((m) => m.tasks.includes("image"));
    expect(images.length).toBeGreaterThan(0);
    for (const m of images) {
      expect(m.pricing.unit).toBe("image");
      expect(m.tokensPerSec).toBeNull();
      expect(m.contextK).toBeNull();
    }
  });

  it("prices token models with output >= input, and embeddings output at zero", () => {
    for (const m of models) {
      if (m.pricing.unit !== "tokens") continue;
      if (m.tasks.includes("embeddings")) expect(m.pricing.output).toBe(0);
      else expect(m.pricing.output).toBeGreaterThanOrEqual(m.pricing.input);
    }
  });

  it("only gives dedicated endpoints to token models that are not embeddings", () => {
    for (const m of models) {
      if (!m.dedicated) continue;
      expect(m.pricing.unit).toBe("tokens");
      expect(m.tasks).not.toContain("embeddings");
      expect(gpus.some((g) => g.id === m.dedicated?.gpu)).toBe(true);
    }
  });

  it("lets every dedicated model pay off at a 50/50 input share", () => {
    const dedicated = models.filter((m) => m.dedicated);
    expect(dedicated.length).toBeGreaterThanOrEqual(4);
    for (const m of dedicated) {
      const be = breakEvenMonthlyTokens(m, 0.5);
      expect(be, m.slug).not.toBeNull();
      expect(Number.isFinite(be), m.slug).toBe(true);
    }
  });

  it("serves every model from at least one region, and some from fewer than three", () => {
    for (const m of models) expect(m.regions.length).toBeGreaterThan(0);
    expect(models.filter((m) => m.regions.length < 3).length).toBeGreaterThanOrEqual(3);
  });

  it("writes summaries as one plain sentence without marketing filler", () => {
    for (const m of models) {
      expect(m.summary.length, m.slug).toBeGreaterThan(30);
      expect(m.summary.trim().endsWith("."), m.slug).toBe(true);
      expect(m.summary, m.slug).not.toMatch(
        /unlock|supercharge|seamless|cutting-edge|revolutionize/i,
      );
    }
  });
});
