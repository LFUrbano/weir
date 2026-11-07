import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { install } from "@/components/docs/quickstart-data";

/**
 * "weir" is a real, unrelated package on both npm and PyPI. Every install
 * command the site shows names Weir's own index on the reserved .example
 * domain, which can never resolve, so a pasted command installs nothing.
 */
const RESERVED_INDEX = /--(?:index-url|registry)[ =]https:\/\/[a-z0-9.-]+\.example(?:[/:\s]|$)/;
const PUBLIC_REGISTRY = /pypi\.org|pythonhosted\.org|registry\.npmjs\.org|registry\.yarnpkg\.com|npmjs\.com/;
/** pip, pip3, uv pip, npm, pnpm, yarn or bun, followed by install, add or i. */
const INSTALL = /\b(?:pip3?|uv pip|npm|pnpm|yarn|bun)\s+(?:install|add|i)\b[^\n"'`]*/g;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(tsx?|mdx?)$/.test(name) ? [path] : [];
  });
}

describe("install commands", () => {
  it("point the quickstart's commands at a reserved .example index", () => {
    expect(Object.keys(install)).toEqual(["python", "node"]);
    for (const command of Object.values(install)) {
      expect(command).toMatch(RESERVED_INDEX);
      expect(command).not.toMatch(PUBLIC_REGISTRY);
      // The package keeps its readable name: the imports still say "weir".
      expect(command).toMatch(/\sweir(?:\s|$)/);
    }
  });

  it("never target a public registry anywhere in src/", () => {
    const root = process.cwd();
    const found = sourceFiles(join(root, "src")).flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(INSTALL)].map((m) => ({
        where: file.slice(root.length + 1),
        command: m[0],
      })),
    );
    expect(found.length).toBeGreaterThanOrEqual(2);
    for (const { where, command } of found) {
      expect(command, where).toMatch(RESERVED_INDEX);
      expect(command, where).not.toMatch(PUBLIC_REGISTRY);
    }
  });
});
