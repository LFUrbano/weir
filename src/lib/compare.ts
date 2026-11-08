import { snippetsFor } from "@/components/code/snippets";
import { getGpu, gpuShortName } from "@/data/gpus";
import { IMAGE_SIZE, getModel, isDedicatedModel, isTokenModel, models, type Model } from "@/data/models";
import {
  formatContext,
  formatLatency,
  formatPerImage,
  formatTokens,
  formatUsd,
} from "@/lib/format";
import {
  NOT_APPLICABLE,
  formatBreakEven,
  modelKind,
  shortModelName,
} from "@/lib/model-display";
import { blendedPrice, breakEvenMonthlyTokens } from "@/lib/pricing";
import { similarModels } from "@/lib/similar";

/** The pair /models/compare/ shows with no query, and in its static HTML. */
export const DEFAULT_PAIR = { a: "llama-3-3-70b", b: "qwen3-32b" } as const;

export type ComparePair = { a: Model; b: Model };

function defaultModel(slug: string): Model {
  const m = getModel(slug);
  if (!m) throw new Error(`Unknown model in DEFAULT_PAIR: ${slug}`);
  return m;
}

/**
 * What B becomes when the URL's B cannot be compared with A: the closest
 * similar model of the same kind, or else the first of that kind by name.
 */
function fallbackB(a: Model): Model {
  if (a.slug === DEFAULT_PAIR.a) return defaultModel(DEFAULT_PAIR.b);
  const kind = modelKind(a);
  const sameKind = (m: Model) => m.slug !== a.slug && modelKind(m) === kind;
  const similar = similarModels(a, models.length).find(sameKind);
  if (similar) return similar;
  const byName = models.filter(sameKind).sort((x, y) => x.name.localeCompare(y.name));
  if (byName.length === 0) throw new Error(`No model to compare with ${a.slug}`);
  return byName[0];
}

/**
 * The pair a URL asks for, always comparable: an unknown or missing A is the
 * default A; a B that is missing, unknown, the same as A or of another kind
 * (chat, embeddings, image) is replaced with a model of A's kind.
 */
export function parseComparePair(sp: URLSearchParams): ComparePair {
  const a = getModel(sp.get("a") ?? "") ?? defaultModel(DEFAULT_PAIR.a);
  const asked = getModel(sp.get("b") ?? "");
  const b = asked && asked.slug !== a.slug && modelKind(asked) === modelKind(a) ? asked : fallbackB(a);
  return { a, b };
}

/** "?a=llama-3-3-70b&b=qwen3-32b". */
export function compareSearch(a: string, b: string): string {
  return `?${new URLSearchParams({ a, b }).toString()}`;
}

export type CompareRow = {
  label: string;
  a: string;
  b: string;
  /** Which column has the better number; null on a tie or where better does not apply. */
  better: "a" | "b" | null;
  /** How much better, shown in the mark: "44% less", "62 ms faster". */
  note: string | null;
};

export type CompareGroup = {
  id: "price" | "speed" | "capacity" | "dedicated";
  title: string;
  rows: CompareRow[];
};

type Mark = Pick<CompareRow, "better" | "note">;
const NO_MARK: Mark = { better: null, note: null };

const percent = (ratio: number) => `${Math.round(ratio * 100)}%`;

/** Lower wins, by the share it saves off the higher value: "44% less". */
function lowerIsBetter(a: number, b: number): Mark {
  if (!(a > 0) || !(b > 0) || a === b) return NO_MARK;
  const [low, high] = a < b ? [a, b] : [b, a];
  return { better: a < b ? "a" : "b", note: `${percent(1 - low / high)} less` };
}

/** Higher wins, by how much more than the lower value: "35% faster". */
function higherIsBetter(a: number, b: number, word: string): Mark {
  if (!(a > 0) || !(b > 0) || a === b) return NO_MARK;
  const [low, high] = a < b ? [a, b] : [b, a];
  return { better: a > b ? "a" : "b", note: `${percent(high / low - 1)} ${word}` };
}

/** Lower latency wins, by the difference: "62 ms faster". */
function fasterLatency(a: number, b: number): Mark {
  if (!(a > 0) || !(b > 0) || a === b) return NO_MARK;
  return { better: a < b ? "a" : "b", note: `${formatLatency(Math.abs(a - b))} faster` };
}

/** A cheaper replica rate, said as "half the rate" when it is exactly half. */
function cheaperRate(a: number, b: number): Mark {
  const mark = lowerIsBetter(a, b);
  if (mark.better && Math.abs(Math.min(a, b) / Math.max(a, b) - 0.5) < 1e-9) {
    return { ...mark, note: "half the rate" };
  }
  return mark;
}

function plainRow(label: string, a: string, b: string): CompareRow {
  return { label, a, b, ...NO_MARK };
}

/** Serverless USD per 1M tokens as one number: embeddings bill input only, chat blends 50/50. */
function unitTokenPrice(m: Model): number {
  if (!isTokenModel(m)) return 0;
  return modelKind(m) === "embeddings" ? m.pricing.input : blendedPrice(m, 0.5);
}

function priceGroup(a: Model, b: Model): CompareGroup {
  if (a.pricing.unit === "image" && b.pricing.unit === "image") {
    const pa = a.pricing.perImage;
    const pb = b.pricing.perImage;
    return {
      id: "price",
      title: "Price · serverless, USD per image",
      rows: [
        {
          label: `Per image (${IMAGE_SIZE.label})`,
          a: formatPerImage(pa),
          b: formatPerImage(pb),
          ...lowerIsBetter(pa, pb),
        },
      ],
    };
  }
  if (!isTokenModel(a) || !isTokenModel(b)) throw new Error("Models of different kinds");
  const input: CompareRow = {
    label: "Input",
    a: formatUsd(a.pricing.input),
    b: formatUsd(b.pricing.input),
    ...lowerIsBetter(a.pricing.input, b.pricing.input),
  };
  const rows =
    modelKind(a) === "embeddings"
      ? [input]
      : [
          input,
          {
            label: "Output",
            a: formatUsd(a.pricing.output),
            b: formatUsd(b.pricing.output),
            ...lowerIsBetter(a.pricing.output, b.pricing.output),
          },
          {
            label: "Blended, half in and half out",
            a: formatUsd(unitTokenPrice(a)),
            b: formatUsd(unitTokenPrice(b)),
            ...lowerIsBetter(unitTokenPrice(a), unitTokenPrice(b)),
          },
        ];
  return { id: "price", title: "Price · serverless, USD per 1M tokens", rows };
}

const speedLabel = (m: Model) => `${Math.round(m.tokensPerSec ?? 0)} tok/s`;

function speedGroup(a: Model, b: Model): CompareGroup {
  const chat = modelKind(a) === "chat";
  const rows: CompareRow[] = [
    {
      label: chat ? "First token, p50" : "Response time, p50",
      a: formatLatency(a.p50Ms),
      b: formatLatency(b.p50Ms),
      ...fasterLatency(a.p50Ms, b.p50Ms),
    },
  ];
  if (chat && a.tokensPerSec !== null && b.tokensPerSec !== null) {
    rows.push({
      label: "Decode speed, one request",
      a: speedLabel(a),
      b: speedLabel(b),
      ...higherIsBetter(a.tokensPerSec, b.tokensPerSec, "faster"),
    });
  }
  return { id: "speed", title: "Speed · median, last 24 hours", rows };
}

const list = (items: readonly string[]) => items.join(" · ");

function capacityGroup(a: Model, b: Model): CompareGroup {
  const rows: CompareRow[] = [];
  if (modelKind(a) !== "image") {
    rows.push(
      plainRow("Served context", `${formatContext(a.contextK)} tokens`, `${formatContext(b.contextK)} tokens`),
    );
  }
  rows.push(
    plainRow("Quantization", a.quantization, b.quantization),
    plainRow("Tasks", list(a.tasks), list(b.tasks)),
    plainRow("Regions", list(a.regions), list(b.regions)),
  );
  return { id: "capacity", title: "Capacity", rows };
}

const SHARED_POOL_ONLY = "Shared pool only";

type Dedicated = { rate: number; replica: string; peak: number; breakEven: number | null };

function dedicatedFacts(m: Model): Dedicated | null {
  if (!isDedicatedModel(m)) return null;
  const { gpu, gpusPerReplica, replicaTokensPerSec } = m.dedicated;
  const g = getGpu(gpu);
  const rate = gpusPerReplica * g.hourly;
  // Embeddings bill input only, so their break-even uses the input price as is.
  const share = modelKind(m) === "embeddings" ? 1 : 0.5;
  return {
    rate,
    replica: `${gpusPerReplica}× ${gpuShortName(g)} · ${formatUsd(rate)} / hour`,
    peak: replicaTokensPerSec,
    breakEven: breakEvenMonthlyTokens(m, share),
  };
}

function dedicatedGroup(a: Model, b: Model): CompareGroup {
  const da = dedicatedFacts(a);
  const db = dedicatedFacts(b);
  const title = "Dedicated · one replica";
  if (!da && !db) {
    return { id: "dedicated", title, rows: [plainRow("Replica", SHARED_POOL_ONLY, SHARED_POOL_ONLY)] };
  }
  const peak = (d: Dedicated | null) => (d ? `${d.peak.toLocaleString("en-US")} tok/s` : NOT_APPLICABLE);
  const breakEven = (d: Dedicated | null) =>
    d?.breakEven != null ? formatBreakEven(d.breakEven) : NOT_APPLICABLE;
  const both = da && db;
  return {
    id: "dedicated",
    title,
    rows: [
      {
        label: "Replica",
        a: da?.replica ?? SHARED_POOL_ONLY,
        b: db?.replica ?? SHARED_POOL_ONLY,
        ...(both ? cheaperRate(da.rate, db.rate) : NO_MARK),
      },
      {
        label: "Peak throughput",
        a: peak(da),
        b: peak(db),
        ...(both ? higherIsBetter(da.peak, db.peak, "more") : NO_MARK),
      },
      {
        label: "Break-even vs serverless",
        a: breakEven(da),
        b: breakEven(db),
        ...(both && da.breakEven !== null && db.breakEven !== null
          ? lowerIsBetter(da.breakEven, db.breakEven)
          : NO_MARK),
      },
    ],
  };
}

/**
 * Every row of the comparison table, in the order the page shows them, with
 * the better value marked. Lower is better for prices, latency, the replica
 * rate and break-even; higher for decode speed and peak throughput. Capacity
 * rows (context, quantization, tasks, regions) are facts, never marked.
 */
export function compareRows(a: Model, b: Model): CompareGroup[] {
  return [priceGroup(a, b), speedGroup(a, b), capacityGroup(a, b), dedicatedGroup(a, b)];
}

/**
 * Serverless USD for one month at `volume`: tokens at the 50/50 blend (input
 * only for embeddings, which return no tokens), or images × the image price.
 */
export function monthlyAt(m: Model, volume: number): number {
  if (!Number.isFinite(volume) || volume <= 0) return 0;
  if (m.pricing.unit === "image") return m.pricing.perImage * volume;
  return (unitTokenPrice(m) * volume) / 1e6;
}

export type VolumePresets = { unit: "tokens" | "images"; values: number[]; initial: number };

/** The volumes the estimate offers: tokens per month, or images for image models. */
export function volumePresets(m: Model): VolumePresets {
  return m.pricing.unit === "image"
    ? { unit: "images", values: [1e4, 1e5, 1e6, 1e7], initial: 1e5 }
    : { unit: "tokens", values: [1e8, 1e9, 1e10, 1e11], initial: 1e9 };
}

/** "1B tokens", "100K images". */
export function volumeLabel(m: Model, volume: number): string {
  return `${formatTokens(volume)} ${volumePresets(m).unit}`;
}

const wholeDollars = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** A monthly amount: whole dollars from $100 ("$2,300"), cents below ("$4.50"). */
export function formatMonthly(v: number): string {
  if (Number.isFinite(v) && v >= 100) return `$${wholeDollars.format(Math.round(v))}`;
  return formatUsd(v);
}

/** "Qwen3 32B costs $230 less a month at 1B tokens." */
export function volumeSummary(a: Model, b: Model, volume: number): string {
  const ca = monthlyAt(a, volume);
  const cb = monthlyAt(b, volume);
  const at = volumeLabel(a, volume);
  const diff = Math.abs(ca - cb);
  // Both sides are rounded the same way on the page: a difference under a cent is a tie.
  if (diff < 0.005) return `They cost the same at ${at}.`;
  const cheaper = ca < cb ? a : b;
  return `${shortModelName(cheaper)} costs ${formatMonthly(diff)} less a month at ${at}.`;
}

export type DiffLine = { type: "same" | "removed" | "added"; text: string };

/**
 * The curl request for A turned into B's, line by line. Models of one kind
 * share the body, so only the "model" line changes.
 */
export function requestDiff(a: Model, b: Model): DiffLine[] {
  const from = snippetsFor(a).curl.split("\n");
  const to = snippetsFor(b).curl.split("\n");
  const out: DiffLine[] = [];
  for (let i = 0; i < Math.max(from.length, to.length); i++) {
    const x = from[i];
    const y = to[i];
    if (x === y) {
      out.push({ type: "same", text: x });
      continue;
    }
    if (x !== undefined) out.push({ type: "removed", text: x });
    if (y !== undefined) out.push({ type: "added", text: y });
  }
  return out;
}
