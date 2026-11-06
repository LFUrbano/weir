import { describe, expect, it } from "vitest";
import {
  formatContext,
  formatLatency,
  formatPerImage,
  formatTokens,
  formatUsd,
} from "@/lib/format";

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
  it("uses seconds from one second up, trailing zeros stripped", () => {
    expect(formatLatency(1340)).toBe("1.34 s");
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
