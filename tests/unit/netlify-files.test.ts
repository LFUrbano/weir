import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (name: string) => readFileSync(join(process.cwd(), "public", name), "utf8");

/** Netlify `_headers`: a path line, then indented `Name: value` lines. */
function parseHeaders(text: string): Map<string, Map<string, string>> {
  const rules = new Map<string, Map<string, string>>();
  let current: Map<string, string> | null = null;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      current = new Map();
      rules.set(line.trim(), current);
      continue;
    }
    const [, name, value] = line.match(/^\s+([A-Za-z-]+):\s*(.+)$/) ?? [];
    expect(current, `header line before any path: ${line}`).not.toBeNull();
    expect(name, `malformed header line: ${line}`).toBeTruthy();
    current!.set(name.toLowerCase(), value.trim());
  }
  return rules;
}

describe("public/_headers", () => {
  const rules = parseHeaders(read("_headers"));

  it("caches hashed build assets for a year", () => {
    expect(rules.get("/_next/static/*")?.get("cache-control")).toBe(
      "public, max-age=31536000, immutable",
    );
  });

  it("sends the security headers on every path", () => {
    const all = rules.get("/*");
    expect(all?.get("x-content-type-options")).toBe("nosniff");
    expect(all?.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    // Only standard features: an unknown one (interest-cohort) logs a console warning.
    expect(all?.get("permissions-policy")).toMatch(/^([a-z-]+=\(\)(, )?)+$/);
    expect(all?.get("permissions-policy")).not.toContain("interest-cohort");
  });

  it("never asks search engines to skip the site", () => {
    expect(read("_headers").toLowerCase()).not.toContain("noindex");
  });
});

describe("public/_redirects", () => {
  it("sends the bare docs path to the quickstart, and nothing else", () => {
    const lines = read("_redirects")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));
    expect(lines).toEqual(["/docs/ /docs/quickstart/ 301"]);
  });
});
