import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cn, fontSizeTokens } from "@/lib/utils";

const root = process.cwd();
const css = readFileSync(join(root, "src/app/globals.css"), "utf8");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(tsx?|mdx?|css)$/.test(name) ? [path] : [];
  });
}

describe("type scale", () => {
  it("has no arbitrary font size anywhere in src/ (Ruling 20)", () => {
    // text-[0.8125rem], md:text-[2rem], [&_p]:text-[17px], text-[length:…], text-[clamp(…)]
    const arbitrarySize = /text-\[(?:length:|[\d.]|clamp|calc|min\(|max\(|var\()/;
    const offenders = sourceFiles(join(root, "src")).flatMap((file) =>
      readFileSync(file, "utf8")
        .split("\n")
        .flatMap((line, i) => (arbitrarySize.test(line) ? [`${file.slice(root.length + 1)}:${i + 1}`] : [])),
    );
    expect(offenders).toEqual([]);
  });

  it("tailwind-merge knows every --text-* token in globals.css", () => {
    const theme = css.slice(css.indexOf("@theme static"), css.indexOf("@theme inline"));
    const tokens = [...theme.matchAll(/--text-([a-z0-9]+(?:-[a-z0-9]+)*):/g)].map((m) => m[1]);
    expect(tokens.length).toBeGreaterThan(7);
    expect([...fontSizeTokens].sort()).toEqual([...tokens].sort());
  });

  it("keeps every token next to a color class", () => {
    for (const t of fontSizeTokens) expect(cn(`text-${t}`, "text-fg-2")).toBe(`text-${t} text-fg-2`);
  });
});
