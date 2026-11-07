import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { flatSegmentName, flattenSegmentDirs, leftoverSegmentDirs } from "../../scripts/fix-segment-files.mjs";

describe("flatSegmentName", () => {
  it("joins a nested segment path with dots, like the client router asks for it", () => {
    expect(flatSegmentName("__next.models", "__PAGE__.txt")).toBe("__next.models.__PAGE__.txt");
    expect(flatSegmentName("__next.models", "$d$slug/__PAGE__.txt")).toBe(
      "__next.models.$d$slug.__PAGE__.txt",
    );
    expect(flatSegmentName("__next.docs", "quickstart\\__PAGE__.txt")).toBe(
      "__next.docs.quickstart.__PAGE__.txt",
    );
  });
});

describe("flattenSegmentDirs", () => {
  let out: string;
  const put = (rel: string, body = rel) => {
    mkdirSync(dirname(join(out, rel)), { recursive: true });
    writeFileSync(join(out, rel), body);
  };
  afterEach(() => rmSync(out, { recursive: true, force: true }));

  it("moves files out of __next.* folders to the flat names and removes the folders", () => {
    out = mkdtempSync(join(tmpdir(), "weir-out-"));
    put("__next.__PAGE__.txt");
    put("models/__next._tree.txt");
    put("models/__next.models/__PAGE__.txt", "catalog");
    put("models/phi-4/__next.models/$d$slug/__PAGE__.txt", "phi");
    put("docs/quickstart/__next.docs/quickstart/__PAGE__.txt", "docs");

    const moved = flattenSegmentDirs(out);

    expect(moved).toBe(3);
    expect(readFileSync(join(out, "models/__next.models.__PAGE__.txt"), "utf8")).toBe("catalog");
    expect(readFileSync(join(out, "models/phi-4/__next.models.$d$slug.__PAGE__.txt"), "utf8")).toBe("phi");
    expect(readFileSync(join(out, "docs/quickstart/__next.docs.quickstart.__PAGE__.txt"), "utf8")).toBe(
      "docs",
    );
    expect(existsSync(join(out, "models/__next.models"))).toBe(false);
    expect(existsSync(join(out, "models/phi-4/__next.models"))).toBe(false);
    // Files already at their flat names are left alone.
    expect(existsSync(join(out, "__next.__PAGE__.txt"))).toBe(true);
    expect(existsSync(join(out, "models/__next._tree.txt"))).toBe(true);
  });

  it("does nothing on a correct (POSIX) export", () => {
    out = mkdtempSync(join(tmpdir(), "weir-out-"));
    put("models/__next.models.__PAGE__.txt");
    expect(flattenSegmentDirs(out)).toBe(0);
    expect(existsSync(join(out, "models/__next.models.__PAGE__.txt"))).toBe(true);
  });
});

describe("leftoverSegmentDirs (the packaging guard)", () => {
  let out: string;
  afterEach(() => rmSync(out, { recursive: true, force: true }));

  it("finds every __next.* folder left anywhere in out/", () => {
    out = mkdtempSync(join(tmpdir(), "weir-out-"));
    mkdirSync(join(out, "models/phi-4/__next.models/$d$slug"), { recursive: true });
    mkdirSync(join(out, "docs/quickstart/__next.docs"), { recursive: true });
    writeFileSync(join(out, "models/__next.models.__PAGE__.txt"), "");
    expect(leftoverSegmentDirs(out).map((d) => d.split("\\").join("/")).sort()).toEqual([
      "docs/quickstart/__next.docs",
      "models/phi-4/__next.models",
    ]);
  });

  it("is empty once the folders are flattened", () => {
    out = mkdtempSync(join(tmpdir(), "weir-out-"));
    mkdirSync(join(out, "models/__next.models"), { recursive: true });
    writeFileSync(join(out, "models/__next.models/__PAGE__.txt"), "");
    flattenSegmentDirs(out);
    expect(leftoverSegmentDirs(out)).toEqual([]);
  });
});
