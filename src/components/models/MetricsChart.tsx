"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode, type Ref } from "react";
import { niceTicks } from "@/lib/chart";
import { formatLatency } from "@/lib/format";
import { minutesAgo } from "@/lib/metrics";
import { cn } from "@/lib/utils";

/** One small multiple: a single measure on its own zero-based axis. */
export interface MetricPanel {
  key: "latency" | "speed";
  /** "Time to first token", "Response time" or "Decode speed". */
  name: string;
  values: number[];
  median: number;
  /** The slow tail: p95 for latency, p5 for speed. */
  tail: number;
  tailLabel: "p95" | "p5";
  /** Full value with unit, e.g. "212 ms", "4.2 s", "96 tok/s". */
  format: (v: number) => string;
  /** Axis unit, printed once beside the measure's name. */
  unit: (top: number) => string;
  /** Axis tick, a bare number in that unit. */
  tick: (v: number, top: number) => string;
}

type Serializable = Omit<MetricPanel, "format" | "unit" | "tick">;

/** Plain-data props (functions cannot cross the server/client boundary). */
export interface MetricsChartProps {
  times: number[];
  panels: Serializable[];
}

const WINDOW = 24 * 60;
const VIEW_W = 1000;
const VIEW_H = 100;

const FORMAT: Record<MetricPanel["key"], MetricPanel["format"]> = {
  latency: formatLatency,
  speed: (v) => `${Math.round(v)} tok/s`,
};
// Seconds once the axis reaches 1 s ("0 2 4 6"), milliseconds below.
const UNIT: Record<MetricPanel["key"], MetricPanel["unit"]> = {
  latency: (top) => (top >= 1000 ? "s" : "ms"),
  speed: () => "tok/s",
};
const TICK: Record<MetricPanel["key"], MetricPanel["tick"]> = {
  latency: (v, top) => String(top >= 1000 ? Number((v / 1000).toFixed(2)) : v),
  speed: (v) => String(v),
};

/** x position, 0..1, of a step that starts at minute t; the right edge is now. */
const xAt = (t: number) => t / WINDOW;

function linePath(times: number[], values: number[], top: number): string {
  return values
    .map((v, i) => {
      const x = xAt(times[i]) * VIEW_W;
      const y = VIEW_H - (v / top) * VIEW_H;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function ariaSummary(p: Pick<MetricPanel, "name" | "values" | "median" | "tail" | "tailLabel" | "format">) {
  const lo = Math.min(...p.values);
  const hi = Math.max(...p.values);
  return `${p.name} over the last 24 hours, in 15-minute steps: median ${p.format(p.median)}, ${p.tailLabel === "p95" ? "95th" : "5th"} percentile ${p.format(p.tail)}, lowest ${p.format(lo)}, highest ${p.format(hi)}.`;
}

function Panel({
  panel,
  times,
  active,
  plotRef,
  tooltip,
}: {
  panel: MetricPanel;
  times: number[];
  active: number | null;
  plotRef?: Ref<HTMLDivElement>;
  tooltip?: ReactNode;
}) {
  const ticks = niceTicks(Math.max(...panel.values));
  const top = ticks[ticks.length - 1];
  const yPct = (v: number) => 100 - (v / top) * 100;
  const point = active === null ? null : { x: xAt(times[active]) * 100, y: yPct(panel.values[active]) };

  return (
    <div className="grid grid-cols-1 gap-y-4 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-x-8">
      <div className="flex items-end justify-between gap-4 lg:flex-col lg:items-start lg:justify-start">
        <div>
          <p className="label-mono text-fg-2">
            {panel.name}
            <span className="normal-case"> · {panel.unit(top)}</span>
          </p>
          <p className="mt-2 font-mono text-stat leading-none text-fg">
            {panel.format(panel.median)}
            <span className="ml-2 text-small text-fg-2">median</span>
          </p>
        </div>
        <p className="font-mono text-small text-fg-2 lg:mt-3">{panel.tailLabel} {panel.format(panel.tail)}</p>
      </div>

      {/* Y axis, plot, and a right gutter for the median label so it never covers data. */}
      <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.25rem]">
        <div aria-hidden="true" className="relative">
          {ticks.map((v) => (
            <span
              key={v}
              className="absolute right-3 -translate-y-1/2 font-mono text-micro whitespace-nowrap text-fg-2"
              style={{ top: `${yPct(v)}%` }}
            >
              {panel.tick(v, top)}
            </span>
          ))}
        </div>
        <div ref={plotRef} data-testid="metrics-plot" className="relative h-28 md:h-32">
          <svg
            role="img"
            aria-label={ariaSummary(panel)}
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
          >
            {ticks.map((v) => (
              <line
                key={v}
                x1={0}
                x2={VIEW_W}
                y1={(yPct(v) / 100) * VIEW_H}
                y2={(yPct(v) / 100) * VIEW_H}
                stroke={v === 0 ? "var(--color-line-strong)" : "var(--color-line)"}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <line
              x1={0}
              x2={VIEW_W}
              y1={(yPct(panel.median) / 100) * VIEW_H}
              y2={(yPct(panel.median) / 100) * VIEW_H}
              stroke="var(--color-fg-2)"
              strokeOpacity={0.55}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={linePath(times, panel.values, top)}
              fill="none"
              stroke="var(--color-amber)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {point && (
            <>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 w-px bg-fg-2/60"
                style={{ left: `${point.x}%` }}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-canvas bg-amber"
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
              />
            </>
          )}
          {tooltip}
        </div>
        <div aria-hidden="true" className="relative">
          <span
            className="absolute left-2 -translate-y-1/2 font-mono text-micro leading-none text-fg-2"
            style={{ top: `${yPct(panel.median)}%` }}
          >
            p50
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Small multiples of the last 24 hours, stacked on one time axis: latency,
 * and decode speed for models that stream tokens. Each measure has its own
 * zero-based axis (never two scales on one plot) and its median drawn as a
 * hairline. A crosshair and one readout follow the pointer, and the arrow
 * keys step through the same readout. The table view lives next to it.
 */
export function MetricsChart({ times, panels: plain }: MetricsChartProps) {
  const panels: MetricPanel[] = plain.map((p) => ({ ...p, format: FORMAT[p.key], unit: UNIT[p.key], tick: TICK[p.key] }));
  const [active, setActive] = useState<number | null>(null);
  const [spoken, setSpoken] = useState("");
  // Plot width when the readout opened; a narrow plot pins the tooltip to an edge.
  const [plotWidth, setPlotWidth] = useState(0);
  const focused = useRef(false);
  const plotRef = useRef<HTMLDivElement>(null);
  const last = times.length - 1;

  const readout = (i: number) =>
    `${minutesAgo(times[i])}: ${panels.map((p) => `${p.name} ${p.format(p.values[i])}`).join(", ")}`;

  function indexAt(clientX: number): number | null {
    const box = plotRef.current?.getBoundingClientRect();
    if (!box || box.width === 0) return null;
    setPlotWidth(box.width);
    const share = (clientX - box.left) / box.width;
    if (share < -0.02 || share > 1.02) return null;
    const t = Math.min(1, Math.max(0, share)) * WINDOW;
    // Nearest step by start time.
    let best = 0;
    for (let i = 1; i < times.length; i++) {
      if (Math.abs(times[i] - t) < Math.abs(times[best] - t)) best = i;
    }
    return best;
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    setActive(indexAt(e.clientX));
  }

  function onPointerLeave() {
    if (!focused.current) setActive(null);
  }

  function step(to: number) {
    const i = Math.min(last, Math.max(0, to));
    setPlotWidth(plotRef.current?.getBoundingClientRect().width ?? 0);
    setActive(i);
    setSpoken(readout(i));
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const from = active ?? last;
    const moves: Record<string, number> = {
      ArrowLeft: from - 1,
      ArrowRight: from + 1,
      PageUp: from - 4,
      PageDown: from + 4,
      Home: 0,
      End: last,
    };
    if (!(e.key in moves)) return;
    e.preventDefault();
    step(moves[e.key]);
  }

  const tip = active === null ? null : xAt(times[active]) * 100;
  // Wide plots: beside the crosshair, flipped to its left past the middle.
  // Narrow plots (phones): pinned to the plot edge away from the crosshair,
  // so the readout never runs past the plot and the page never scrolls sideways.
  const tipStyle =
    tip === null
      ? undefined
      : plotWidth > 0 && plotWidth < 480
        ? tip > 50
          ? { left: 0 }
          : { right: 0 }
        : { left: `${tip}%`, transform: tip > 55 ? "translateX(calc(-100% - 12px))" : "translateX(12px)" };
  const tooltip =
    active !== null && tip !== null ? (
      <div
        data-testid="metrics-tooltip"
        aria-hidden="true"
        className="pointer-events-none absolute top-0 z-10 grid min-w-40 gap-1.5 rounded-md whitespace-nowrap border border-line-strong bg-surface-2 px-3 py-2.5 font-mono text-caption"
        style={tipStyle}
      >
        <span className="text-fg-2">{minutesAgo(times[active])}</span>
        {panels.map((p) => (
          <span key={p.key} className="flex items-baseline justify-between gap-4">
            <span className="text-fg">{p.format(p.values[active])}</span>
            <span className="text-fg-2">{p.key === "speed" ? "decode" : p.name === "Time to first token" ? "first token" : "response"}</span>
          </span>
        ))}
      </div>
    ) : null;

  return (
    <div
      role="group"
      tabIndex={0}
      aria-label="Last 24 hours. Arrow keys step through 15-minute intervals."
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onFocus={() => {
        focused.current = true;
        step(active ?? last);
      }}
      onBlur={() => {
        focused.current = false;
        setActive(null);
      }}
      onKeyDown={onKeyDown}
      className="relative touch-pan-y rounded-panel outline-offset-8 select-none"
    >
      <div className="space-y-10">
        {panels.map((p, i) => (
          <Panel
            key={p.key}
            panel={p}
            times={times}
            active={active}
            plotRef={i === 0 ? plotRef : undefined}
            tooltip={i === 0 ? tooltip : undefined}
          />
        ))}
      </div>

      {/* Shared time axis, under the last plot. */}
      <div aria-hidden="true" className="grid grid-cols-1 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-x-8">
        <div className="hidden lg:block" />
        <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.25rem]">
          <div />
          <div className="relative mt-2.5 h-4 font-mono text-micro text-fg-2">
            {[0, 6, 12, 18, 24].map((h) => (
              <span
                key={h}
                className={cn(
                  "absolute top-0 whitespace-nowrap",
                  h === 0 ? "left-0" : h === 24 ? "right-0" : "-translate-x-1/2",
                  (h === 6 || h === 18) && "hidden sm:block",
                )}
                style={h === 0 || h === 24 ? undefined : { left: `${(h / 24) * 100}%` }}
              >
                {h === 24 ? "now" : `${24 - h}h ago`}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {spoken}
      </p>
    </div>
  );
}
