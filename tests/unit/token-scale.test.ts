import { describe, expect, it } from "vitest";
import { MAX_MONTHLY_TOKENS } from "@/lib/pricing";
import {
  MIN_SLIDER_TOKENS,
  SLIDER_MAX_STEP,
  parseTokenText,
  stepForTokens,
  tokensAtStep,
} from "@/lib/token-scale";

describe("token slider scale", () => {
  it("runs from 1M to 100B on a log scale, 20 steps per decade", () => {
    expect(SLIDER_MAX_STEP).toBe(100);
    expect(tokensAtStep(0)).toBe(MIN_SLIDER_TOKENS);
    expect(tokensAtStep(0)).toBe(1e6);
    expect(tokensAtStep(20)).toBe(10e6);
    expect(tokensAtStep(40)).toBe(100e6);
    expect(tokensAtStep(60)).toBe(1e9);
    expect(tokensAtStep(SLIDER_MAX_STEP)).toBe(MAX_MONTHLY_TOKENS);
  });

  it("rounds each step to two significant digits", () => {
    expect(tokensAtStep(41)).toBe(110e6);
    expect(tokensAtStep(46)).toBe(200e6);
    expect(tokensAtStep(56)).toBe(630e6);
  });

  it("only grows from one step to the next", () => {
    for (let s = 1; s <= SLIDER_MAX_STEP; s++) {
      expect(tokensAtStep(s)).toBeGreaterThan(tokensAtStep(s - 1));
    }
  });

  it("finds the step of every step value (field and slider agree)", () => {
    for (let s = 0; s <= SLIDER_MAX_STEP; s++) expect(stepForTokens(tokensAtStep(s))).toBe(s);
  });

  it("puts free-typed values on the nearest step and clamps the ends", () => {
    expect(stepForTokens(120e6)).toBe(42);
    expect(stepForTokens(0)).toBe(0);
    expect(stepForTokens(500)).toBe(0);
    expect(stepForTokens(1e30)).toBe(SLIDER_MAX_STEP);
    expect(stepForTokens(NaN)).toBe(0);
    expect(stepForTokens(-5)).toBe(0);
    expect(stepForTokens(Infinity)).toBe(SLIDER_MAX_STEP);
  });

  it("keeps out-of-range steps on the scale", () => {
    expect(tokensAtStep(-3)).toBe(1e6);
    expect(tokensAtStep(250)).toBe(MAX_MONTHLY_TOKENS);
    expect(tokensAtStep(NaN)).toBe(1e6);
    expect(tokensAtStep(40.4)).toBe(100e6);
  });
});

describe("parseTokenText", () => {
  it("reads plain numbers, separators and K/M/B/T suffixes", () => {
    expect(parseTokenText("100000000")).toBe(100e6);
    expect(parseTokenText("100,000,000")).toBe(100e6);
    expect(parseTokenText(" 2 500 000 ")).toBe(2.5e6);
    expect(parseTokenText("100M")).toBe(100e6);
    expect(parseTokenText("1.5b")).toBe(1.5e9);
    expect(parseTokenText("250k")).toBe(250e3);
    expect(parseTokenText("0.05T")).toBe(50e9);
  });

  it("turns hostile text into a safe count between 0 and 100B", () => {
    expect(parseTokenText("")).toBe(0);
    expect(parseTokenText("   ")).toBe(0);
    expect(parseTokenText("-5")).toBe(0);
    expect(parseTokenText("-5M")).toBe(0);
    expect(parseTokenText("abc")).toBe(0);
    expect(parseTokenText("12abc")).toBe(0);
    expect(parseTokenText("1e30")).toBe(MAX_MONTHLY_TOKENS);
    expect(parseTokenText("5T")).toBe(MAX_MONTHLY_TOKENS);
    expect(parseTokenText("Infinity")).toBe(MAX_MONTHLY_TOKENS);
    expect(parseTokenText("NaN")).toBe(0);
    expect(parseTokenText("1.2.3M")).toBe(0);
  });
});
