import { describe, expect, it } from "vitest";
import { getModel, isTokenModel, type TokenModel } from "@/data/models";
import {
  demoCost,
  demoFrame,
  heroDemo,
  splitTokens,
  tokenArrivals,
} from "@/components/home/hero-demo";

function llama(): TokenModel {
  const m = getModel("llama-3-3-70b");
  if (!m || !isTokenModel(m)) throw new Error("missing llama-3-3-70b");
  return m;
}

describe("splitTokens", () => {
  it("joins back to the exact text", () => {
    const text = "A KV cache stores keys, values and positions.";
    expect(splitTokens(text).join("")).toBe(text);
    expect(splitTokens(heroDemo.response).join("")).toBe(heroDemo.response);
  });

  it("splits punctuation and long words like a subword tokenizer would", () => {
    expect(splitTokens("cache, recomputes.")).toEqual(["cache", ",", " recom", "putes", "."]);
  });

  it("returns nothing for empty text", () => {
    expect(splitTokens("")).toEqual([]);
  });
});

describe("tokenArrivals", () => {
  it("starts at the time to first token and ends at the measured throughput", () => {
    const t = tokenArrivals(212, 96, 60);
    expect(t).toHaveLength(60);
    expect(t[0]).toBe(212);
    expect(t[59]).toBeCloseTo(212 + (59 * 1000) / 96, 6);
  });

  it("is strictly increasing and the same on every call", () => {
    const a = tokenArrivals(212, 96, 60);
    for (let i = 1; i < a.length; i++) expect(a[i]).toBeGreaterThan(a[i - 1]);
    expect(tokenArrivals(212, 96, 60)).toEqual(a);
  });

  it("handles zero and one token", () => {
    expect(tokenArrivals(212, 96, 0)).toEqual([]);
    expect(tokenArrivals(212, 96, 1)).toEqual([212]);
  });
});

describe("demo numbers", () => {
  it("prices the demo call from the model's per-token rates", () => {
    const m = llama();
    const expected =
      (heroDemo.promptTokens * m.pricing.input +
        splitTokens(heroDemo.response).length * m.pricing.output) /
      1e6;
    expect(demoCost(m)).toBeCloseTo(expected, 12);
  });

  it("waits, streams, then settles on the model's numbers", () => {
    const m = llama();
    const n = splitTokens(heroDemo.response).length;

    const start = demoFrame(m, 0);
    expect(start.phase).toBe("waiting");
    expect(start.tokens).toBe(0);
    expect(start.cost).toBe(0);
    expect(start.throughput).toBeNull();

    const waiting = demoFrame(m, 100);
    expect(waiting.phase).toBe("waiting");
    expect(waiting.ttftMs).toBe(100);

    const first = demoFrame(m, m.p50Ms);
    expect(first.phase).toBe("streaming");
    expect(first.tokens).toBe(1);
    expect(first.ttftMs).toBe(m.p50Ms);

    const mid = demoFrame(m, m.p50Ms + 250);
    expect(mid.tokens).toBeGreaterThan(1);
    expect(mid.tokens).toBeLessThan(n);
    expect(mid.throughput).not.toBeNull();

    const end = demoFrame(m, Number.POSITIVE_INFINITY);
    expect(end.phase).toBe("done");
    expect(end.tokens).toBe(n);
    expect(end.ttftMs).toBe(m.p50Ms);
    expect(end.throughput).toBeCloseTo(m.tokensPerSec ?? 0, 6);
    expect(end.cost).toBeCloseTo(demoCost(m), 12);
  });

  it("finishes well inside six seconds for the reference model", () => {
    const m = llama();
    const n = splitTokens(heroDemo.response).length;
    const last = tokenArrivals(m.p50Ms, m.tokensPerSec ?? 1, n).at(-1) ?? 0;
    expect(last).toBeLessThan(3000);
  });
});
