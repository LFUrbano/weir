import { CopyButton } from "@/components/code/CopyButton";
import { getGpu } from "@/data/gpus";
import type { Model } from "@/data/models";
import { formatContext, formatLatency } from "@/lib/format";
import { endpointFor, latencyName, modelSpeed } from "@/lib/model-display";

interface Row {
  label: string;
  value: string;
  note?: string;
  copy?: boolean;
}

/**
 * Rows that apply to this model. Image models have no context window and no
 * token rate, so those rows are left out rather than shown empty.
 */
function rows(m: Model): Row[] {
  const list: Row[] = [
    { label: "Model ID", value: m.slug, copy: true },
    { label: "Endpoint", value: endpointFor(m) },
    { label: "Publisher", value: m.publisher },
    { label: "Tasks", value: m.tasks.join(" · ") },
  ];
  if (m.contextK !== null) {
    list.push({ label: "Served context", value: `${formatContext(m.contextK)} tokens` });
  }
  list.push({ label: "Quantization", value: m.quantization });
  if (m.tokensPerSec !== null) {
    list.push({ label: "Decode speed", value: modelSpeed(m), note: "median, one request" });
  }
  list.push({
    label: latencyName(m) === "Time to first token" ? "p50 first token" : "p50 response",
    value: formatLatency(m.p50Ms),
    note: "last 24 hours",
  });
  list.push({ label: "Regions", value: m.regions.join(" · ") });
  list.push({
    label: "Dedicated",
    value: m.dedicated
      ? `${m.dedicated.gpusPerReplica}× ${getGpu(m.dedicated.gpu).name} per replica`
      : "On request",
  });
  return list;
}

/** The model's facts as a two-column definition list, one hairline per row. */
export function ModelSpecs({ model }: { model: Model }) {
  return (
    <dl
      data-testid="model-specs"
      className="grid grid-cols-1 border-t border-line md:grid-cols-2 md:gap-x-10"
    >
      {rows(model).map((r) => (
        <div
          key={r.label}
          className="grid min-h-13 grid-cols-1 items-center gap-1 border-b border-line py-2.5 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-4"
        >
          <dt className="label-mono text-fg-2">{r.label}</dt>
          <dd className="flex min-w-0 items-center justify-between gap-3 font-mono text-meta text-fg">
            <span className="min-w-0 break-words">
              {r.value}
              {r.note && <span className="ml-2 text-fg-2">{r.note}</span>}
            </span>
            {r.copy && <CopyButton text={r.value} what="model ID" className="-my-1 shrink-0" />}
          </dd>
        </div>
      ))}
    </dl>
  );
}
