import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_PATHS,
  LIGHTHOUSE,
  assertSafePath,
  diagnosticsOf,
  formatTable,
  median,
  normalizePath,
  summarize,
} from "../../scripts/lighthouse.mjs";

/** The parts of a Lighthouse JSON report the script reads. */
function report(scores: { performance: number; accessibility?: number; seo?: number }, lcpMs = 1200) {
  return {
    categories: {
      performance: {
        score: scores.performance / 100,
        auditRefs: [
          { id: "largest-contentful-paint" },
          { id: "unused-javascript" },
          { id: "render-blocking-resources" },
          { id: "dom-size" },
          { id: "font-display" },
        ],
      },
      accessibility: { score: (scores.accessibility ?? 100) / 100 },
      "best-practices": { score: 1 },
      seo: { score: (scores.seo ?? 100) / 100 },
    },
    audits: {
      "largest-contentful-paint": { id: "largest-contentful-paint", score: 0.8, numericValue: lcpMs },
      "first-contentful-paint": { numericValue: 900 },
      "total-blocking-time": { numericValue: 150 },
      "cumulative-layout-shift": { numericValue: 0 },
      "largest-contentful-paint-element": {
        details: { items: [{ items: [{ node: { selector: "h1#hero-title", snippet: "<h1>" } }] }] },
      },
      "unused-javascript": {
        id: "unused-javascript",
        title: "Reduce unused JavaScript",
        score: 0.5,
        displayValue: "Est savings of 50 KiB",
        details: { overallSavingsMs: 300 },
      },
      "render-blocking-resources": {
        id: "render-blocking-resources",
        title: "Eliminate render-blocking resources",
        score: 0.3,
        details: { overallSavingsMs: 600 },
      },
      "dom-size": { id: "dom-size", title: "Avoid an excessive DOM size", score: 1 },
      "font-display": { id: "font-display", title: "Font display", score: null },
    },
  };
}

describe("median", () => {
  it("takes the middle of an odd count, whatever the order", () => {
    expect(median([97, 88, 93])).toBe(93);
  });

  it("takes the lower middle of an even count", () => {
    expect(median([90, 100])).toBe(90);
  });

  it("refuses an empty list", () => {
    expect(() => median([])).toThrow();
  });
});

describe("normalizePath", () => {
  it("adds the slashes the static export uses, so no run goes through a redirect", () => {
    expect(normalizePath("models")).toBe("/models/");
    expect(normalizePath("/models/compare")).toBe("/models/compare/");
    expect(normalizePath("/")).toBe("/");
  });

  it("keeps a file path as it is", () => {
    expect(normalizePath("/og.png")).toBe("/og.png");
  });
});

describe("assertSafePath", () => {
  it("accepts the paths of the static export", () => {
    for (const p of ["/", "/models/", "/models/compare/", "/og.png", "/docs/quickstart/"]) {
      expect(assertSafePath(p)).toBe(p);
    }
  });

  it("rejects anything a shell would read", () => {
    for (const p of ['/models/"; echo hi', "/a b/", "/a&b/", "/$(id)/", "/a|b/", "/a?b=1"]) {
      expect(() => assertSafePath(p)).toThrow(/is not a page path/);
    }
  });
});

describe("summarize", () => {
  it("takes each category's median and the diagnostics of the median performance run", () => {
    const s = summarize([
      report({ performance: 91, accessibility: 100 }, 3000),
      report({ performance: 97, accessibility: 96 }, 1100),
      report({ performance: 95, accessibility: 100 }, 1500),
    ]);
    expect(s.scores).toEqual({ performance: 95, accessibility: 100, "best-practices": 100, seo: 100 });
    expect(s.runs).toEqual([91, 97, 95]);
    expect(s.diagnostics.lcpMs).toBe(1500);
  });
});

describe("diagnosticsOf", () => {
  it("lists failing performance audits, biggest saving first, without the metrics", () => {
    const d = diagnosticsOf(report({ performance: 90 }));
    expect(d.lcpElement).toBe("h1#hero-title");
    expect(d.top.map((a: { id: string }) => a.id)).toEqual(["render-blocking-resources", "unused-javascript"]);
  });
});

describe("formatTable", () => {
  it("prints one row per page with the four scores", () => {
    const table = formatTable([{ path: "/pricing/", summary: summarize([report({ performance: 96 })]) }]);
    expect(table).toMatch(/\/pricing\/\s+96\s+100\s+100\s+100 \|/);
    expect(table).toContain("Reduce unused JavaScript");
  });
});

describe("lighthouse script config", () => {
  it("measures the seven main pages by default", () => {
    expect(DEFAULT_PATHS).toEqual([
      "/",
      "/models/",
      "/models/llama-3-3-70b/",
      "/models/compare/",
      "/pricing/",
      "/enterprise/",
      "/docs/quickstart/",
    ]);
  });

  it("pins Lighthouse 12 and keeps it out of package.json", () => {
    expect(LIGHTHOUSE).toMatch(/^lighthouse@12\.\d+\.\d+$/);
    const pkg = readFileSync(join(process.cwd(), "package.json"), "utf8");
    const { dependencies, devDependencies, scripts } = JSON.parse(pkg);
    expect({ ...dependencies, ...devDependencies }).not.toHaveProperty("lighthouse");
    expect(scripts.lighthouse).toBe("node scripts/lighthouse.mjs");
  });

  it("is not part of CI", () => {
    const ci = readFileSync(join(process.cwd(), ".github/workflows/ci.yml"), "utf8");
    expect(ci).not.toMatch(/lighthouse/i);
  });
});
