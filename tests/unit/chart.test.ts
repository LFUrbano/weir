import { describe, expect, it } from "vitest";
import { niceTicks } from "@/lib/chart";

describe("niceTicks", () => {
  it("starts at zero and steps by 1, 2 or 5 times a power of ten", () => {
    expect(niceTicks(301)).toEqual([0, 100, 200, 300, 400]);
    expect(niceTicks(268)).toEqual([0, 100, 200, 300]);
    expect(niceTicks(6100)).toEqual([0, 2000, 4000, 6000, 8000]);
    expect(niceTicks(23)).toEqual([0, 10, 20, 30]);
    expect(niceTicks(110)).toEqual([0, 50, 100, 150]);
  });
  it("always ends at or above the maximum", () => {
    for (const max of [1, 7, 18, 96, 212, 999, 4200, 5600]) {
      const t = niceTicks(max);
      expect(t[0]).toBe(0);
      expect(t[t.length - 1]).toBeGreaterThanOrEqual(max);
      expect(t.length).toBeGreaterThanOrEqual(3);
      expect(t.length).toBeLessThanOrEqual(6);
    }
  });
  it("survives bad input", () => {
    expect(niceTicks(0)).toEqual([0, 1]);
    expect(niceTicks(Number.NaN)).toEqual([0, 1]);
    expect(niceTicks(-5)).toEqual([0, 1]);
  });
});
