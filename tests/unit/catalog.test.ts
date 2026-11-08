import { describe, expect, it } from "vitest";
import { isTokenModel, models } from "@/data/models";
import {
  compareNames,
  filterModels,
  parseCatalogParams,
  sortModels,
  toSearchString,
} from "@/lib/catalog";
import { blendedPrice } from "@/lib/pricing";

const base = { q: "", task: "all", sort: "name" } as const;

describe("parseCatalogParams", () => {
  it("falls back to defaults for invalid values", () => {
    expect(parseCatalogParams(new URLSearchParams("task=foo&sort=bar"))).toEqual(base);
  });
  it("trims the query and accepts valid values", () => {
    expect(
      parseCatalogParams(new URLSearchParams("q=%20Qwen%20&task=code&sort=price")),
    ).toEqual({ q: "Qwen", task: "code", sort: "price" });
  });
  it("treats a blank query as empty", () => {
    expect(parseCatalogParams(new URLSearchParams("q=%20%20%20")).q).toBe("");
  });
});

describe("filterModels", () => {
  it("matches name or publisher, ignoring case", () => {
    const out = filterModels(models, { ...base, q: "llama" });
    expect(out.length).toBeGreaterThan(0);
    for (const m of out) {
      expect(`${m.name} ${m.publisher}`.toLowerCase()).toContain("llama");
    }
  });
  it("requires every word of the query to match", () => {
    const out = filterModels(models, { ...base, q: "llama 70b" });
    expect(out.length).toBeGreaterThan(0);
    for (const m of out) expect(m.name.toLowerCase()).toContain("70b");
  });
  it("filters by task", () => {
    const out = filterModels(models, { ...base, task: "embeddings" });
    expect(out.length).toBeGreaterThan(0);
    for (const m of out) expect(m.tasks).toContain("embeddings");
  });
  it("does not throw on special characters", () => {
    expect(() => filterModels(models, { ...base, q: "c++" })).not.toThrow();
    expect(() => filterModels(models, { ...base, q: "(" })).not.toThrow();
    expect(() => filterModels(models, { ...base, q: "[a-" })).not.toThrow();
  });
  it("returns an empty list when nothing matches", () => {
    expect(filterModels(models, { ...base, q: "zzzz" })).toEqual([]);
  });
  it("returns everything for a blank query", () => {
    expect(filterModels(models, { ...base, q: "   " })).toHaveLength(models.length);
  });
});

describe("sortModels", () => {
  it("does not mutate its input", () => {
    const copy = [...models];
    sortModels(models, "price");
    expect(models).toEqual(copy);
  });
  it("sorts by name", () => {
    const names = sortModels(models, "name").map((m) => m.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en")));
  });
  it("sorts by blended price ascending with image models last", () => {
    const sorted = sortModels(models, "price");
    const tokens = sorted.filter(isTokenModel);
    const images = sorted.filter((m) => !isTokenModel(m));
    expect(images.length).toBeGreaterThan(0);
    expect(sorted).toEqual([...tokens, ...images]);
    const prices = tokens.map((m) => blendedPrice(m, 0.5));
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    const perImage = images.map((m) =>
      m.pricing.unit === "image" ? m.pricing.perImage : NaN,
    );
    expect(perImage).toEqual([...perImage].sort((a, b) => a - b));
  });
  it("sorts by speed descending with nulls last", () => {
    const speeds = sortModels(models, "speed").map((m) => m.tokensPerSec);
    const firstNull = speeds.indexOf(null);
    expect(firstNull).toBeGreaterThan(0);
    expect(speeds.slice(firstNull).every((s) => s === null)).toBe(true);
    const nums = speeds.slice(0, firstNull) as number[];
    expect(nums).toEqual([...nums].sort((a, b) => b - a));
  });
  it("sorts by context descending with nulls last", () => {
    const ctx = sortModels(models, "context").map((m) => m.contextK);
    const firstNull = ctx.indexOf(null);
    expect(firstNull).toBeGreaterThan(0);
    expect(ctx.slice(firstNull).every((c) => c === null)).toBe(true);
    const nums = ctx.slice(0, firstNull) as number[];
    expect(nums).toEqual([...nums].sort((a, b) => b - a));
  });
});

describe("toSearchString", () => {
  it("omits defaults", () => {
    expect(toSearchString(base)).toBe("");
  });
  it("serializes non-default values in a fixed order", () => {
    expect(toSearchString({ q: "qwen", task: "code", sort: "price" })).toBe(
      "?q=qwen&task=code&sort=price",
    );
    expect(toSearchString({ q: "", task: "code", sort: "name" })).toBe("?task=code");
  });
  it("round-trips through parseCatalogParams", () => {
    const p = { q: "c++ (beta)", task: "vision", sort: "speed" } as const;
    expect(parseCatalogParams(new URLSearchParams(toSearchString(p)))).toEqual(p);
  });
});

describe("compareNames", () => {
  const names = models.map((m) => m.name);

  it("lists the model names in the same order as localeCompare('en')", () => {
    expect([...names].sort(compareNames)).toEqual([...names].sort((a, b) => a.localeCompare(b, "en")));
  });
  it("agrees with localeCompare('en') on every pair of model names", () => {
    for (const a of names) {
      for (const b of names) {
        expect(Math.sign(compareNames(a, b)), `${a} vs ${b}`).toBe(Math.sign(a.localeCompare(b, "en")));
      }
    }
  });
  it("ignores case and breaks ties by the original string", () => {
    expect(compareNames("alpha", "Beta")).toBeLessThan(0);
    expect(compareNames("Beta", "alpha")).toBeGreaterThan(0);
    expect(compareNames("Same", "Same")).toBe(0);
    expect(compareNames("same", "SAME")).not.toBe(0);
    expect(Math.sign(compareNames("same", "SAME"))).toBe(-Math.sign(compareNames("SAME", "same")));
  });
});
