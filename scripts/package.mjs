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

/**
 * Share images and canonical URLs are absolute, built from
 * SITE_URL (src/data/site.ts). Without it they would point at the fictional
 * weir.example, so the deploy zip is refused until the live address is set.
 */
function siteUrlOrExit() {
  const raw = process.env.SITE_URL?.trim();
  let url;
  try {
    url = raw ? new URL(raw) : null;
  } catch {
    url = null;
  }
  if (!url || !/^https?:$/.test(url.protocol) || url.hostname === "weir.example") {
    console.error(
      `SITE_URL is ${raw ? `"${raw}"` : "not set"}: set SITE_URL to the live address before packaging,` +
        ` e.g. SITE_URL=https://your-site.netlify.app npm run package`,
    );
    process.exit(1);
  }
  return url.origin;
}

const siteUrl = siteUrlOrExit();
console.log(`Packaging for ${siteUrl}`);

execSync("npx next build", { cwd: root, stdio: "inherit", env: { ...process.env, SITE_URL: siteUrl } });

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
