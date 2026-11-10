import { describe, expect, it } from "vitest";
import {
  formatCount,
  formatContext,
  formatLatency,
  formatPerImage,
  formatTokens,
  formatUsd,
} from "@/lib/format";
import { formatMonthly } from "@/lib/compare";

describe("formatUsd", () => {
  it("uses two decimals and thousands separators from one cent up", () => {
    expect(formatUsd(68.4)).toBe("$68.40");
    expect(formatUsd(3635.4)).toBe("$3,635.40");
    expect(formatUsd(0.63)).toBe("$0.63");
    expect(formatUsd(0.01)).toBe("$0.01");
  });
  it("uses two significant digits below one cent", () => {
    expect(formatUsd(0.00041)).toBe("$0.00041");
    expect(formatUsd(0.0000012)).toBe("$0.0000012");
  });
  it("handles zero and bad values", () => {
    expect(formatUsd(0)).toBe("$0.00");
    expect(formatUsd(NaN)).toBe("$0.00");
    expect(formatUsd(Infinity)).toBe("$0.00");
  });
});

describe("formatTokens", () => {
  it("uses three significant digits with K, M, B suffixes", () => {
    expect(formatTokens(5_770_476_190)).toBe("5.77B");
    expect(formatTokens(120e6)).toBe("120M");
    expect(formatTokens(2500)).toBe("2.5K");
    expect(formatTokens(1_234_567)).toBe("1.23M");
  });
  it("prints small numbers as integers", () => {
    expect(formatTokens(0)).toBe("0");
    expect(formatTokens(999)).toBe("999");
  });
  it("rolls over at the unit boundary", () => {
    expect(formatTokens(999_600)).toBe("1M");
  });
  it("handles bad values", () => {
    expect(formatTokens(NaN)).toBe("0");
    expect(formatTokens(-5)).toBe("0");
  });
});

describe("formatLatency", () => {
  it("uses milliseconds below one second", () => {
    expect(formatLatency(212)).toBe("212 ms");
    expect(formatLatency(74.4)).toBe("74 ms");
  });
  it("uses seconds from one second up, one decimal, trailing zero stripped", () => {
    expect(formatLatency(1340)).toBe("1.3 s");
    expect(formatLatency(5560)).toBe("5.6 s");
    expect(formatLatency(1960)).toBe("2 s");
    expect(formatLatency(4200)).toBe("4.2 s");
    expect(formatLatency(2000)).toBe("2 s");
    expect(formatLatency(999.7)).toBe("1 s");
  });
});

describe("formatPerImage", () => {
  it("uses up to three decimals with trailing zeros stripped", () => {
    expect(formatPerImage(0.025)).toBe("$0.025");
    expect(formatPerImage(0.003)).toBe("$0.003");
    expect(formatPerImage(0.035)).toBe("$0.035");
    expect(formatPerImage(0.1)).toBe("$0.1");
    expect(formatPerImage(0.0304)).toBe("$0.03");
    expect(formatPerImage(1.2)).toBe("$1.2");
  });
  it("never prints NaN, Infinity or a negative price", () => {
    expect(formatPerImage(0)).toBe("$0");
    expect(formatPerImage(NaN)).toBe("$0");
    expect(formatPerImage(Infinity)).toBe("$0");
    expect(formatPerImage(-0.02)).toBe("$0");
  });
});

describe("formatContext", () => {
  it("prints thousands of tokens as K and millions as M", () => {
    expect(formatContext(128)).toBe("128K");
    expect(formatContext(8)).toBe("8K");
    expect(formatContext(1000)).toBe("1M");
    expect(formatContext(10000)).toBe("10M");
    expect(formatContext(1500)).toBe("1.5M");
  });
  it("prints a dash when the model has no context window", () => {
    expect(formatContext(null)).toBe("—");
    expect(formatContext(NaN)).toBe("—");
    expect(formatContext(0)).toBe("—");
  });
});

describe("formatCount", () => {
  it("writes whole counts with separators", () => {
    expect(formatCount(100e6)).toBe("100,000,000");
    expect(formatCount(100e9)).toBe("100,000,000,000");
    expect(formatCount(1.6)).toBe("2");
  });

  it("never prints NaN, Infinity or a negative", () => {
    for (const v of [NaN, Infinity, -Infinity, -5, 0]) expect(formatCount(v)).toBe("0");
  });
});

describe("equivalence with Intl.NumberFormat", () => {
  // The formatters used to be Intl.NumberFormat("en-US"). Node has Intl, so the
  // old implementation stays here as the reference and every value must match.
  const refUsd = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const refUsdSmall = new Intl.NumberFormat("en-US", { maximumSignificantDigits: 2 });
  const refWhole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

  const expectedUsd = (v: number): string => {
    if (!Number.isFinite(v) || v <= 0) return "$0.00";
    if (v >= 0.01) return `$${refUsd.format(v)}`;
    return `$${refUsdSmall.format(v)}`;
  };
  const expectedCount = (v: number): string => {
    if (!Number.isFinite(v) || v <= 0) return "0";
    return refWhole.format(Math.round(v));
  };
  const expectedMonthly = (v: number): string => {
    if (Number.isFinite(v) && v >= 100) return `$${refWhole.format(Math.round(v))}`;
    return expectedUsd(v);
  };

  // A small seeded generator (mulberry32), so a failure reproduces.
  function seeded(seed: number): () => number {
    let a = seed;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const edge = [
    0, -0, -1, -0.5, -1234.5, NaN, Infinity, -Infinity, 1e-9, 1e-7, 0.000004, 0.00041, 0.0049, 0.005, 0.0099,
    0.01, 0.015, 0.125, 0.995, 1, 1.005, 9.995, 68.4, 99.995, 99.5, 100, 100.4, 100.5, 999.995, 999.5, 1000,
    1234.565, 3635.4, 1e6, 123456789.5, 1e11, 1e15, 1e21, 1.5e21, 1e22, 5e-324, 2 ** 53, Number.MAX_SAFE_INTEGER,
    Number.MAX_VALUE, 0.0000095, 0.0000099, 0.00000995, 0.0099999, 0.00995, 0.0095, 0.00999, 0.009951,
  ];

  // 5,000 values from 1e-8 to 1e12, from a fixed seed.
  const random: number[] = [];
  const next = seeded(20261108);
  for (let i = 0; i < 5000; i += 1) {
    const scale = 10 ** (-8 + Math.floor(next() * 21));
    random.push(next() * 10 * scale);
  }
  // Ties and near-ties: thousandths and halves of a cent are where rounding rules show.
  const ties: number[] = [];
  for (let k = 0; k <= 4000; k += 1) ties.push(k / 1000, k / 200, k * 0.005, k + 0.5, 100 + k / 8);
  const small: number[] = [];
  for (let k = 1; k <= 1000; k += 1) small.push(k * 1e-5, k * 1e-6, k * 1.5e-7, k * 5e-8);

  const all = [...edge, ...random, ...ties, ...small];

  it("formatUsd gives the same text as Intl for every value", () => {
    for (const v of all) expect(formatUsd(v), `formatUsd(${v})`).toBe(expectedUsd(v));
  });

  it("formatCount gives the same text as Intl for every value", () => {
    for (const v of all) expect(formatCount(v), `formatCount(${v})`).toBe(expectedCount(v));
  });

  it("formatMonthly gives the same text as Intl for every value", () => {
    for (const v of all) expect(formatMonthly(v), `formatMonthly(${v})`).toBe(expectedMonthly(v));
  });

  it("never prints an exponent", () => {
    for (const v of all) {
      expect(formatUsd(v)).not.toMatch(/e/i);
      expect(formatCount(v)).not.toMatch(/e/i);
    }
  });

  it("rounds the shortest decimal, like Intl, not the binary value", () => {
    expect(formatUsd(1.005)).toBe("$1.01");
    expect(formatUsd(0.995)).toBe("$1.00");
    expect(formatUsd(9.995)).toBe("$10.00");
    expect(formatUsd(999.995)).toBe("$1,000.00");
    expect(formatUsd(0.0099999)).toBe("$0.01");
    expect(formatUsd(0.00995)).toBe("$0.01");
  });
});
