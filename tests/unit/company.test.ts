import { describe, expect, it } from "vitest";
import { company, dataRetention, freeCreditLabel, listAnd, pct } from "@/data/company";
import { models } from "@/data/models";

describe("company facts", () => {
  it("lists every region a model runs in, and no others", () => {
    const used = new Set(models.flatMap((m) => m.regions));
    expect(new Set(company.regions)).toEqual(used);
  });

  it("formats the shared labels", () => {
    expect(freeCreditLabel).toBe("$5");
    expect(pct(company.slaDedicatedPct)).toBe("99.95%");
    expect(listAnd(["H100", "H200", "B200"])).toBe("H100, H200 and B200");
    expect(listAnd(["Okta"])).toBe("Okta");
    expect(listAnd([])).toBe("");
  });

  it("states data retention once, consistently", () => {
    expect(dataRetention.headline).toBe("Zero retention by default");
    expect(dataRetention.detail).toContain("opt-in");
    expect(dataRetention.detail).toContain(`${company.logRetentionDays} days`);
  });
});
