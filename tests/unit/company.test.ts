import { describe, expect, it } from "vitest";
import {
  allowedDowntimeMinutes,
  billingTerms,
  company,
  complianceLine,
  dataRetention,
  freeCreditLabel,
  identityLine,
  listAnd,
  pct,
  regionLocations,
  sla,
  slaCoverage,
  slaLine,
  supportLine,
  supportTiers,
} from "@/data/company";
import { getGpu, gpus } from "@/data/gpus";
import { isDedicatedModel, models } from "@/data/models";

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

describe("enterprise facts", () => {
  it("offers each dedicated model's GPU in every region the model runs in", () => {
    for (const m of models) {
      if (!isDedicatedModel(m)) continue;
      const gpu = getGpu(m.dedicated.gpu);
      for (const r of m.regions) expect(gpu.regions, `${m.slug} on ${gpu.id} in ${r}`).toContain(r);
    }
  });

  it("only offers GPUs in regions the company serves, each with a location", () => {
    for (const g of gpus) {
      expect(g.regions.length).toBeGreaterThan(0);
      for (const r of g.regions) expect(company.regions).toContain(r);
    }
    expect(Object.keys(regionLocations).sort()).toEqual([...company.regions].sort());
  });

  it("says the SLA comes with dedicated, not with a contract", () => {
    expect(slaCoverage).toBe("Every dedicated endpoint is covered, self-serve or under contract.");
  });

  it("states the SLA, identity and support lines once", () => {
    expect(slaLine).toBe("99.95% monthly uptime, with service credits");
    expect(identityLine).toBe("SSO with SAML 2.0 and SCIM, with audit logs");
    expect(supportLine).toBe("A named engineer and a shared Slack channel");
  });

  it("starts service credits at the SLA and raises them as uptime falls", () => {
    const { credits } = sla;
    expect(credits[0].below).toBe(company.slaDedicatedPct);
    for (let i = 1; i < credits.length; i++) {
      expect(credits[i].below).toBeLessThan(credits[i - 1].below);
      expect(credits[i].creditPct).toBeGreaterThan(credits[i - 1].creditPct);
    }
  });

  it("allows 21.9 minutes of downtime a month at 99.95%", () => {
    expect(allowedDowntimeMinutes(company.slaDedicatedPct)).toBeCloseTo(21.9, 10);
  });

  it("lists three support tiers, the contract one with the named engineer", () => {
    expect(supportTiers.map((t) => t.name)).toEqual(["Standard", "Dedicated", "Enterprise"]);
    expect(supportTiers.at(-1)?.channel).toBe(supportLine);
    for (const t of supportTiers) {
      expect(t.urgent.time).toMatch(/^\d+ (min|h)$/);
      expect(t.normal).toMatch(/business (day|hours)$/);
    }
  });
});
