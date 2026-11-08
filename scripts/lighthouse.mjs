import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Lighthouse on the production build, with the default mobile preset.
 *
 *   npm run build
 *   npm run lighthouse                          # the six main pages
 *   npm run lighthouse -- /models/ /pricing/    # only these
 *
 * Serves out/ on 127.0.0.1, runs Lighthouse three times per page (one run at a
 * time: parallel runs steal CPU from each other and skew the scores), prints
 * the median of each category and what holds performance back, and exits
 * with 1 if any page's median performance is under the target.
 *
 * Lighthouse comes from npx, not package.json: it is a big download that only
 * this script needs. Not run in CI: shared runners are too noisy for a score.
 */

export const LIGHTHOUSE = "lighthouse@12.8.2";
export const DEFAULT_PATHS = [
  "/",
  "/models/",
  "/models/llama-3-3-70b/",
  "/pricing/",
  "/enterprise/",
  "/docs/quickstart/",
];
export const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"];
export const RUNS = 3;
export const TARGET = 95;
const HOST = "127.0.0.1";
const PORT = 4195;

/** Middle value; for an even count, the lower of the two middle ones. */
export function median(values) {
  if (values.length === 0) throw new Error("median of nothing");
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)];
}

/**
 * "models" -> "/models/". The export has trailing slashes, and a path without
 * one would be measured through a redirect. A file path ("/og.png") is kept.
 */
export function normalizePath(path) {
  let p = path.startsWith("/") ? path : `/${path}`;
  const last = p.split("/").pop() ?? "";
  if (!p.endsWith("/") && !last.includes(".")) p += "/";
  return p;
}

/** Category scores of one report, 0-100. */
export function scoresOf(report) {
  return Object.fromEntries(
    CATEGORIES.map((id) => [id, Math.round((report.categories[id]?.score ?? 0) * 100)]),
  );
}

/**
 * Audits left out of the list of what to fix: the metrics themselves, the LCP
 * element (printed on its own line), and cache lifetimes, which only fail
 * because the local server sends no cache headers (public/_headers sets them
 * on the deploy).
 */
const NOT_ACTIONABLE = new Set([
  "first-contentful-paint",
  "largest-contentful-paint",
  "speed-index",
  "total-blocking-time",
  "cumulative-layout-shift",
  "interactive",
  "largest-contentful-paint-element",
  "uses-long-cache-ttl",
  "cache-insight",
]);

/** Estimated savings in ms across the metrics an audit says it would move. */
function savingsOf(audit) {
  const metric = Object.values(audit.metricSavings ?? {}).reduce((sum, ms) => sum + ms, 0);
  return Math.max(metric, audit.details?.overallSavingsMs ?? 0);
}

/**
 * What holds performance back in one report: the metrics, the LCP element,
 * the longest main-thread task and the failing performance audits, biggest
 * estimated saving first.
 */
export function diagnosticsOf(report) {
  const audits = report.audits;
  const lcpNode = audits["largest-contentful-paint-element"]?.details?.items?.[0]?.items?.[0]?.node;
  const longest = [...(audits["long-tasks"]?.details?.items ?? [])].sort((a, b) => b.duration - a.duration)[0];
  const failing = report.categories.performance.auditRefs
    .map((ref) => audits[ref.id])
    .filter((a) => a && !NOT_ACTIONABLE.has(a.id) && a.score !== null && a.score < 0.9)
    .map((a) => ({ id: a.id, title: a.title, displayValue: a.displayValue ?? "", savingsMs: savingsOf(a) }))
    .sort((a, b) => b.savingsMs - a.savingsMs);
  return {
    longestTask: longest ? { url: longest.url.replace(/^https?:\/\/[^/]+/, ""), ms: Math.round(longest.duration) } : null,
    lcpMs: audits["largest-contentful-paint"]?.numericValue ?? 0,
    fcpMs: audits["first-contentful-paint"]?.numericValue ?? 0,
    tbtMs: audits["total-blocking-time"]?.numericValue ?? 0,
    cls: audits["cumulative-layout-shift"]?.numericValue ?? 0,
    lcpElement: lcpNode ? lcpNode.selector || lcpNode.snippet || "" : "",
    top: failing.slice(0, 3),
  };
}

/**
 * Median of each category across the runs of one page, plus the diagnostics
 * of the run whose performance score is the median.
 */
export function summarize(reports) {
  const runs = reports.map((r) => ({ scores: scoresOf(r), report: r }));
  const scores = Object.fromEntries(
    CATEGORIES.map((id) => [id, median(runs.map((r) => r.scores[id]))]),
  );
  const medianRun = runs.find((r) => r.scores.performance === scores.performance);
  return { scores, runs: runs.map((r) => r.scores.performance), diagnostics: diagnosticsOf(medianRun.report) };
}

/** Columns padded to a width, joined by two spaces; groups split by " | ". */
function row(groups) {
  return groups.map((cells) => cells.map(([text, width]) => String(text).padEnd(width)).join("  ").trimEnd()).join(" | ");
}

export function formatTable(rows) {
  const w = Math.max(4, ...rows.map((r) => r.path.length));
  const header = row([
    [["Page", w], ["Perf", 4], ["A11y", 4], ["BP", 4], ["SEO", 4]],
    [["LCP", 6], ["TBT", 6], ["CLS", 5]],
    [["perf runs", 0]],
  ]);
  const lines = rows.map(({ path, summary: { scores, runs, diagnostics: d } }) =>
    row([
      [[path, w], [scores.performance, 4], [scores.accessibility, 4], [scores["best-practices"], 4], [scores.seo, 4]],
      [[`${(d.lcpMs / 1000).toFixed(2)}s`, 6], [`${Math.round(d.tbtMs)}ms`, 6], [d.cls.toFixed(3), 5]],
      [[runs.join(" "), 0]],
    ]),
  );
  const notes = rows.flatMap(({ path, summary: { diagnostics: d } }) => [
    path,
    `  LCP element: ${d.lcpElement || "(none reported)"}`,
    ...(d.longestTask ? [`  Longest task: ${d.longestTask.ms} ms, ${d.longestTask.url}`] : []),
    ...(d.top.length
      ? d.top.map((a) => `  - ${a.title}${a.displayValue ? `: ${a.displayValue}` : ""}`)
      : ["  - no failing performance audits"]),
  ]);
  return [header, "-".repeat(header.length), ...lines, "", ...notes].join("\n");
}

async function waitForServer(url, timeoutMs = 15_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`server at ${url} did not answer within ${timeoutMs / 1000}s`);
}

async function isUp(url) {
  try {
    await fetch(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * One Lighthouse run with its defaults: mobile preset, simulated throttling,
 * and a visible Chrome window. Headless Chrome on Windows gets a software GPU
 * and a background CPU priority, which roughly halves the benchmark index and
 * measures the machine more than the page.
 */
function runLighthouse(url, outputPath) {
  // npx is a .cmd on Windows, which Node only spawns through a shell.
  const command = [
    "npx --yes",
    LIGHTHOUSE,
    `"${url}"`,
    `--only-categories=${CATEGORIES.join(",")}`,
    "--output=json",
    `--output-path="${outputPath}"`,
    "--quiet",
  ].join(" ");
  // A run now and then dies on a DevTools protocol timeout; one retry covers it.
  for (let attempt = 1; ; attempt++) {
    const result = spawnSync(command, { shell: true, stdio: ["ignore", "ignore", "pipe"], encoding: "utf8" });
    if (result.status === 0) return JSON.parse(readFileSync(outputPath, "utf8"));
    if (attempt === 2) {
      process.stderr.write(result.stderr);
      throw new Error(`lighthouse failed on ${url} (exit ${result.status})`);
    }
  }
}

async function main() {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const outDir = join(root, "out");
  if (!statSync(outDir, { throwIfNoEntry: false })?.isDirectory()) {
    console.error("lighthouse: no out/ folder; run npm run build first");
    process.exit(1);
  }
  const args = process.argv.slice(2);
  // Git Bash turns "/models/" into "C:/Program Files/Git/models/" before Node sees it.
  const mangled = args.find((a) => /^[A-Za-z]:[\\/]/.test(a));
  if (mangled) {
    console.error(`lighthouse: "${mangled}" is a Windows path; in Git Bash write the page without the leading slash (models/) or set MSYS_NO_PATHCONV=1`);
    process.exit(1);
  }
  const paths = (args.length ? args : DEFAULT_PATHS).map(normalizePath);
  const origin = `http://${HOST}:${PORT}`;
  if (await isUp(origin)) {
    console.error(`lighthouse: something already listens on ${origin}; stop it first`);
    process.exit(1);
  }

  const serveBin = createRequire(import.meta.url).resolve("serve/build/main.js");
  const server = spawn(process.execPath, [serveBin, outDir, "-l", `tcp://${HOST}:${PORT}`, "--no-request-logging"], {
    stdio: "ignore",
  });
  const stop = () => server.kill();
  process.on("exit", stop);

  const reportDir = mkdtempSync(join(tmpdir(), "weir-lighthouse-"));
  const rows = [];
  try {
    await waitForServer(`${origin}/`);
    for (const path of paths) {
      const reports = [];
      for (let i = 1; i <= RUNS; i++) {
        console.error(`${path} run ${i}/${RUNS}`);
        const file = join(reportDir, `${path.replace(/[^a-z0-9]+/gi, "_")}${i}.json`);
        reports.push(runLighthouse(`${origin}${path}`, file));
      }
      rows.push({ path, summary: summarize(reports) });
    }
  } finally {
    stop();
  }

  console.log(`Lighthouse ${LIGHTHOUSE.split("@")[1]}, mobile preset, median of ${RUNS} runs\n`);
  console.log(formatTable(rows));
  console.log(`\nReports: ${reportDir}`);

  const below = rows.filter((r) => r.summary.scores.performance < TARGET);
  if (below.length) {
    console.error(`\nPerformance under ${TARGET}: ${below.map((r) => `${r.path} (${r.summary.scores.performance})`).join(", ")}`);
    process.exit(1);
  }
  console.log(`\nEvery page's median performance is ${TARGET} or more.`);
}

if (import.meta.main) {
  main().catch((err) => {
    console.error(`lighthouse: ${err.message}`);
    process.exit(1);
  });
}
