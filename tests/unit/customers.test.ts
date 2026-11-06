import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { customers } from "@/data/customers";

describe("customers", () => {
  it("lists 6 to 8 invented companies with unique names", () => {
    expect(customers.length).toBeGreaterThanOrEqual(6);
    expect(customers.length).toBeLessThanOrEqual(8);
    expect(new Set(customers.map((c) => c.name)).size).toBe(customers.length);
  });

  it("points every logo at a gray SVG whose viewBox matches the stored size", () => {
    for (const c of customers) {
      expect(c.logo).toMatch(/^\/logos\/[a-z0-9-]+\.svg$/);
      const svg = readFileSync(join(process.cwd(), "public", c.logo), "utf8");
      expect(svg).toContain(`viewBox="0 0 ${c.width} ${c.height}"`);
      expect(svg).toContain('fill="#6d7770"');
      // Paths only: no text that would fall back to a system font.
      expect(svg).not.toMatch(/<text|font-family/);
    }
  });
});
