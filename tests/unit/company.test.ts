import { describe, expect, it } from "vitest";
import {
  billingTerms,
  company,
  complianceLine,
  dataRetention,
  freeCreditLabel,
  listAnd,
  pct,
} from "@/data/company";
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

describe("billing and contract terms", () => {
  it("lists the certifications and the DPA as separate things", () => {
    expect(complianceLine).toBe("SOC 2 Type II, ISO 27001 and GDPR, with a DPA");
    expect(complianceLine).not.toMatch(/GDPR DPA/);
  });

  it("states each shared term once, as a sentence or a value", () => {
    for (const v of Object.values(billingTerms)) {
      expect(v.trim()).toBe(v);
      expect(v.length).toBeGreaterThan(10);
    }
    expect(billingTerms.contractBilling).toBe("Invoiced monthly in USD");
  });
});
