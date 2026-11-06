import { execSync } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ZipArchive } from "archiver";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "out");
const distDir = join(root, "dist");
const date = new Date().toISOString().slice(0, 10);
const zipPath = join(distDir, `weir-${date}.zip`);

execSync("npx next build", { cwd: root, stdio: "inherit" });

await mkdir(distDir, { recursive: true });
await rm(zipPath, { force: true });

await new Promise((resolve, reject) => {
  const output = createWriteStream(zipPath);
  const archive = new ZipArchive({ zlib: { level: 9 } });
  output.on("close", resolve);
  archive.on("error", reject);
  archive.pipe(output);
  // false = put the contents of out/ at the zip root, not inside an out/ folder.
  archive.directory(outDir, false);
  archive.finalize();
});

const { size } = await stat(zipPath);
console.log(`Created dist/weir-${date}.zip (${(size / 1024).toFixed(0)} KB)`);
