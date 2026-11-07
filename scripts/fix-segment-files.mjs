import { readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Works around a Windows-only bug in `next build` with `output: "export"`
 * (Next 16.4.5, node_modules/next/dist/export/index.js).
 *
 * The client router prefetches a page's segment data from one flat file per
 * segment, `<route>/__next.models.__PAGE__.txt`: the segment path with dots
 * for slashes (convertSegmentPathToStaticExportFilename). The exporter builds
 * that name from `path.relative()`, which uses backslashes on Windows, and
 * only replaces forward slashes. So a nested segment such as
 * `models\__PAGE__` keeps its backslash and is written as a folder,
 * `models/__next.models/__PAGE__.txt`, and every prefetch of it 404s.
 *
 * This moves each file inside a `__next.*` folder to its flat name and
 * removes the folder. On Linux and macOS the export has no such folders, so
 * this does nothing.
 */

/** "__next.models" + "$d$slug/__PAGE__.txt" -> "__next.models.$d$slug.__PAGE__.txt" */
export function flatSegmentName(dirName, relPath) {
  return `${dirName}.${relPath.split(/[\\/]/).join(".")}`;
}

function filesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? filesUnder(join(dir, e.name)) : [join(dir, e.name)],
  );
}

/** Returns how many files were moved. */
export function flattenSegmentDirs(outDir) {
  let moved = 0;
  for (const entry of readdirSync(outDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = join(outDir, entry.name);
    if (!entry.name.startsWith("__next.")) {
      moved += flattenSegmentDirs(dir);
      continue;
    }
    for (const file of filesUnder(dir)) {
      renameSync(file, join(outDir, flatSegmentName(entry.name, relative(dir, file))));
      moved++;
    }
    rmSync(dir, { recursive: true, force: true });
  }
  return moved;
}

/**
 * Every `__next.*` folder still in out/, relative to it. Empty after
 * flattenSegmentDirs(); scripts/package.mjs refuses to zip otherwise.
 * @param {string} outDir
 * @param {string} [base]
 * @returns {string[]}
 */
export function leftoverSegmentDirs(outDir, base = outDir) {
  return readdirSync(outDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .flatMap((e) => {
      const dir = join(outDir, e.name);
      return e.name.startsWith("__next.") ? [relative(base, dir)] : leftoverSegmentDirs(dir, base);
    });
}

// import.meta.main (Node 22.18+ / 24.2+) is true only when this file is the
// entry point, whatever the path spelling (junctions, symlinks, drive-letter
// case): a path comparison could fail silently and leave the zip broken.
if (import.meta.main) {
  const outDir = join(fileURLToPath(new URL("..", import.meta.url)), "out");
  if (!statSync(outDir, { throwIfNoEntry: false })?.isDirectory()) {
    console.error("fix-segment-files: no out/ folder; run next build first");
    process.exit(1);
  }
  const moved = flattenSegmentDirs(outDir);
  const left = leftoverSegmentDirs(outDir);
  if (left.length > 0) {
    console.error(`fix-segment-files: ${left.length} __next.* folder(s) remain: ${left.join(", ")}`);
    process.exit(1);
  }
  console.log(`fix-segment-files: ${moved} segment file${moved === 1 ? "" : "s"} moved to flat names`);
}
