import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("CI workflow", () => {
  const ci = read(".github/workflows/ci.yml");

  it("gives the job's token read access to the code and nothing else", () => {
    // Top level, before `jobs:`: applies to every job in the workflow.
    const top = ci.slice(0, ci.indexOf("\njobs:"));
    expect(top).toMatch(/^permissions:\r?\n {2}contents: read\s*$/m);
    expect(ci).not.toMatch(/write-all|: write\b/);
  });
});

describe("Node version", () => {
  const ciNode = read(".github/workflows/ci.yml").match(/node-version:\s*(\d+)/)?.[1];

  it("pins the same major in .nvmrc as CI", () => {
    expect(ciNode).toBeTruthy();
    expect(read(".nvmrc").trim()).toBe(ciNode);
  });

  it("requires the Node that has import.meta.main (the segment-file fix relies on it)", () => {
    const pkg = JSON.parse(read("package.json")) as { engines?: { node?: string } };
    expect(pkg.engines?.node).toBe(">=22.18");
  });
});
