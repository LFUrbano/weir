import { describe, expect, it } from "vitest";
import { getModel, models, type Model } from "@/data/models";
import {
  DEFAULT_PAIR,
  compareRows,
  compareSearch,
  formatMonthly,
  monthlyAt,
  parseComparePair,
  requestDiff,
  volumePresets,
  volumeSummary,
  type CompareGroup,
  type CompareRow,
} from "@/lib/compare";
import { modelKind } from "@/lib/model-display";

const model = (slug: string): Model => {
  const m = getModel(slug);
  if (!m) throw new Error(`no model ${slug}`);
  return m;
};

const llama = model("llama-3-3-70b");
const qwen = model("qwen3-32b");

const pair = (search: string) => parseComparePair(new URLSearchParams(search));

function row(groups: CompareGroup[], label: string): CompareRow {
  const found = groups.flatMap((g) => g.rows).find((r) => r.label === label);
  if (!found) throw new Error(`no row "${label}" in ${groups.flatMap((g) => g.rows.map((r) => r.label)).join(", ")}`);
  return found;
}

const labels = (groups: CompareGroup[], id: CompareGroup["id"]) =>
  groups.find((g) => g.id === id)?.rows.map((r) => r.label);

describe("compareSearch", () => {
  it("writes both slugs in a fixed order", () => {
    expect(compareSearch("llama-3-3-70b", "qwen3-32b")).toBe("?a=llama-3-3-70b&b=qwen3-32b");
  });
});

describe("parseComparePair", () => {
  it("is the default pair with no query", () => {
    const p = pair("");
    expect(p.a.slug).toBe(DEFAULT_PAIR.a);
    expect(p.b.slug).toBe(DEFAULT_PAIR.b);
    expect(DEFAULT_PAIR).toEqual({ a: "llama-3-3-70b", b: "qwen3-32b" });
  });

  it("falls back to the default pair for an unknown A", () => {
    const p = pair("?a=nope");
    expect([p.a.slug, p.b.slug]).toEqual([DEFAULT_PAIR.a, DEFAULT_PAIR.b]);
  });

  it("keeps a valid pair as given", () => {
    const p = pair("a=deepseek-v3-1&b=qwen3-235b-a22b");
    expect([p.a.slug, p.b.slug]).toEqual(["deepseek-v3-1", "qwen3-235b-a22b"]);
  });

  it("never compares a model with itself", () => {
    const p = pair("?a=qwen3-32b&b=qwen3-32b");
    expect(p.a.slug).toBe("qwen3-32b");
    expect(p.b.slug).not.toBe("qwen3-32b");
    expect(modelKind(p.b)).toBe("chat");
  });

  it("replaces a B of another kind with one of A's kind", () => {
    const p = pair("?a=llama-3-3-70b&b=flux-1-dev");
    expect(p.a.slug).toBe("llama-3-3-70b");
    expect(modelKind(p.b)).toBe("chat");
    expect(p.b.slug).not.toBe("llama-3-3-70b");
  });

  it("picks an embedding model for an embedding A", () => {
    const p = pair("?a=bge-m3");
    expect(p.a.slug).toBe("bge-m3");
    expect(modelKind(p.b)).toBe("embeddings");
    expect(p.b.slug).not.toBe("bge-m3");
  });

  it("picks an image model for an image A, and an unknown B is replaced", () => {
    const p = pair("?a=flux-1-dev&b=nope");
    expect(modelKind(p.b)).toBe("image");
    expect(p.b.slug).not.toBe("flux-1-dev");
  });

  it("returns a valid pair of one kind for every A and every B", () => {
    for (const a of models) {
      for (const b of [...models.map((m) => m.slug), "", "x"]) {
        const p = pair(compareSearch(a.slug, b));
        expect(p.a.slug).toBe(a.slug);
        expect(p.b.slug, `${a.slug} / ${b}`).not.toBe(a.slug);
        expect(modelKind(p.b), `${a.slug} / ${b}`).toBe(modelKind(a));
      }
    }
  });
});

describe("compareRows, default pair", () => {
  const groups = compareRows(llama, qwen);

  it("has the four groups in order", () => {
    expect(groups.map((g) => g.id)).toEqual(["price", "speed", "capacity", "dedicated"]);
    expect(groups.map((g) => g.title)).toEqual([
      "Price · serverless, USD per 1M tokens",
      "Speed · median, last 24 hours",
      "Capacity",
      "Dedicated · one replica",
    ]);
    expect(labels(groups, "price")).toEqual(["Input", "Output", "Blended, half in and half out"]);
    expect(labels(groups, "speed")).toEqual(["First token, p50", "Decode speed, one request"]);
    expect(labels(groups, "capacity")).toEqual(["Served context", "Quantization", "Tasks", "Regions"]);
    expect(labels(groups, "dedicated")).toEqual([
      "Replica",
      "Peak throughput",
      "Break-even vs serverless",
    ]);
  });

  it("prices: lower is better, by how much less", () => {
    expect(row(groups, "Input")).toEqual({ label: "Input", a: "$0.54", b: "$0.30", better: "b", note: "44% less" });
    expect(row(groups, "Output")).toMatchObject({ a: "$0.72", b: "$0.50", better: "b", note: "31% less" });
    expect(row(groups, "Blended, half in and half out")).toMatchObject({
      a: "$0.63",
      b: "$0.40",
      better: "b",
      note: "37% less",
    });
  });

  it("speed: lower latency and higher decode speed are better", () => {
    expect(row(groups, "First token, p50")).toMatchObject({
      a: "212 ms",
      b: "150 ms",
      better: "b",
      note: "62 ms faster",
    });
    expect(row(groups, "Decode speed, one request")).toMatchObject({
      a: "96 tok/s",
      b: "130 tok/s",
      better: "b",
      note: "35% faster",
    });
  });

  it("capacity rows are never marked", () => {
    expect(row(groups, "Served context")).toEqual({
      label: "Served context",
      a: "128K tokens",
      b: "128K tokens",
      better: null,
      note: null,
    });
    expect(row(groups, "Quantization")).toMatchObject({ a: "FP8", b: "FP8", better: null });
    expect(row(groups, "Tasks")).toMatchObject({ a: "chat", b: "chat · reasoning", better: null });
    expect(row(groups, "Regions")).toMatchObject({
      a: "us-east · us-west · eu-west",
      b: "us-east · us-west · eu-west",
      better: null,
      note: null,
    });
    for (const r of groups.find((g) => g.id === "capacity")!.rows) expect(r.better).toBeNull();
  });

  it("dedicated: replica rate, peak throughput and break-even", () => {
    expect(row(groups, "Replica")).toMatchObject({
      a: "2× H100 · $4.98 / hour",
      b: "1× H100 · $2.49 / hour",
      better: "b",
      note: "half the rate",
    });
    expect(row(groups, "Peak throughput")).toMatchObject({
      a: "6,000 tok/s",
      b: "5,000 tok/s",
      better: "a",
      note: "20% more",
    });
    expect(row(groups, "Break-even vs serverless")).toMatchObject({
      a: "5.77B tok/mo",
      b: "4.54B tok/mo",
      better: "b",
      note: "21% less",
    });
  });

  it("swapping the models swaps the columns and the marks", () => {
    const swapped = compareRows(qwen, llama);
    expect(row(swapped, "Input")).toMatchObject({ a: "$0.30", b: "$0.54", better: "a", note: "44% less" });
    expect(row(swapped, "Peak throughput")).toMatchObject({ better: "b", note: "20% more" });
  });
});

describe("compareRows, other kinds and edge cases", () => {
  it("an exact tie has no mark", () => {
    const groups = compareRows(llama, { ...llama, slug: "twin" });
    for (const r of groups.flatMap((g) => g.rows)) {
      expect(r.better, r.label).toBeNull();
      expect(r.note, r.label).toBeNull();
    }
  });

  it("a replica rate that is not exactly half reads as a percentage", () => {
    const scout = model("llama-4-scout"); // 1× H200, $3.39
    expect(row(compareRows(llama, scout), "Replica")).toMatchObject({ better: "b", note: "32% less" });
  });

  it("a model on the shared pool only has no dedicated mark", () => {
    const maverick = model("llama-4-maverick");
    const groups = compareRows(llama, maverick);
    expect(row(groups, "Replica")).toMatchObject({
      a: "2× H100 · $4.98 / hour",
      b: "Shared pool only",
      better: null,
      note: null,
    });
    expect(row(groups, "Peak throughput")).toMatchObject({ b: "—", better: null });
    expect(row(groups, "Break-even vs serverless")).toMatchObject({ b: "—", better: null });
  });

  it("two models on the shared pool show one dedicated row", () => {
    const groups = compareRows(model("llama-4-maverick"), model("qwen3-235b-a22b"));
    expect(labels(groups, "dedicated")).toEqual(["Replica"]);
    expect(row(groups, "Replica")).toMatchObject({
      a: "Shared pool only",
      b: "Shared pool only",
      better: null,
    });
  });

  it("embeddings: input price only, response time, no decode speed", () => {
    const groups = compareRows(model("bge-m3"), model("qwen3-embedding-8b"));
    expect(groups.find((g) => g.id === "price")!.title).toBe("Price · serverless, USD per 1M tokens");
    expect(labels(groups, "price")).toEqual(["Input"]);
    expect(labels(groups, "speed")).toEqual(["Response time, p50"]);
    expect(row(groups, "Input")).toMatchObject({ a: "$0.01", b: "$0.02", better: "a", note: "50% less" });
    expect(row(groups, "Response time, p50")).toMatchObject({
      a: "18 ms",
      b: "41 ms",
      better: "a",
      note: "23 ms faster",
    });
    expect(row(groups, "Served context")).toMatchObject({ a: "8K tokens", b: "32K tokens", better: null });
  });

  it("images: price per image, response time, no context", () => {
    const groups = compareRows(model("flux-1-dev"), model("flux-1-schnell"));
    expect(groups.find((g) => g.id === "price")!.title).toBe("Price · serverless, USD per image");
    expect(labels(groups, "price")).toEqual(["Per image (1024 × 1024)"]);
    expect(labels(groups, "speed")).toEqual(["Response time, p50"]);
    expect(labels(groups, "capacity")).toEqual(["Quantization", "Tasks", "Regions"]);
    expect(row(groups, "Per image (1024 × 1024)")).toMatchObject({
      a: "$0.025",
      b: "$0.003",
      better: "b",
      note: "88% less",
    });
    expect(row(groups, "Response time, p50")).toMatchObject({
      a: "4.2 s",
      b: "900 ms",
      better: "b",
      note: "3.3 s faster",
    });
  });
});

describe("monthlyAt", () => {
  it("blends token prices half and half", () => {
    expect(monthlyAt(llama, 1e9)).toBeCloseTo(630, 9);
    expect(monthlyAt(qwen, 1e9)).toBeCloseTo(400, 9);
  });

  it("charges embeddings for input only: no halving of a zero output price", () => {
    expect(monthlyAt(model("bge-m3"), 1e9)).toBeCloseTo(10, 9);
  });

  it("charges image models per image", () => {
    expect(monthlyAt(model("flux-1-dev"), 100_000)).toBeCloseTo(2500, 9);
  });

  it("is 0 for no volume or a broken one", () => {
    expect(monthlyAt(llama, 0)).toBe(0);
    expect(monthlyAt(llama, Number.NaN)).toBe(0);
    expect(monthlyAt(llama, -5)).toBe(0);
  });
});

describe("volume presets and summary", () => {
  it("offers tokens for token models and images for image models, 1B or 100K first selected", () => {
    expect(volumePresets(llama)).toEqual({
      unit: "tokens",
      values: [1e8, 1e9, 1e10, 1e11],
      initial: 1e9,
    });
    expect(volumePresets(model("bge-m3")).unit).toBe("tokens");
    expect(volumePresets(model("flux-1-dev"))).toEqual({
      unit: "images",
      values: [1e4, 1e5, 1e6, 1e7],
      initial: 1e5,
    });
  });

  it("names the cheaper model and the monthly difference", () => {
    expect(volumeSummary(llama, qwen, 1e9)).toBe("Qwen3 32B costs $230 less a month at 1B tokens.");
    expect(volumeSummary(qwen, llama, 1e10)).toBe("Qwen3 32B costs $2,300 less a month at 10B tokens.");
    expect(volumeSummary(model("flux-1-dev"), model("flux-1-schnell"), 1e5)).toBe(
      "FLUX.1 [schnell] costs $2,200 less a month at 100K images.",
    );
  });

  it("says when they cost the same", () => {
    expect(volumeSummary(llama, { ...llama, slug: "twin" }, 1e9)).toBe("They cost the same at 1B tokens.");
  });

  it("formats a month in whole dollars from $100, cents below", () => {
    expect(formatMonthly(630)).toBe("$630");
    expect(formatMonthly(2300)).toBe("$2,300");
    expect(formatMonthly(10)).toBe("$10.00");
    expect(formatMonthly(0.8)).toBe("$0.80");
  });
});

describe("requestDiff", () => {
  it("changes only the model line, removed then added", () => {
    const lines = requestDiff(llama, qwen);
    const changed = lines.filter((l) => l.type !== "same");
    expect(changed).toEqual([
      { type: "removed", text: '    "model": "llama-3-3-70b",' },
      { type: "added", text: '    "model": "qwen3-32b",' },
    ]);
    expect(lines[0]).toEqual({ type: "same", text: "curl https://api.weir.example/v1/chat/completions \\" });
    expect(lines.findIndex((l) => l.type === "added")).toBe(lines.findIndex((l) => l.type === "removed") + 1);
  });

  it("uses the endpoint of the pair's kind", () => {
    const lines = requestDiff(model("bge-m3"), model("nomic-embed-text-v1-5"));
    expect(lines[0].text).toBe("curl https://api.weir.example/v1/embeddings \\");
    expect(lines.filter((l) => l.type !== "same")).toHaveLength(2);
  });
});
