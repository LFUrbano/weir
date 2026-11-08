"use client";

import Link from "next/link";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { formatMonthly, monthlyAt, volumePresets, volumeSummary } from "@/lib/compare";
import { formatTokens } from "@/lib/format";
import { shortModelName } from "@/lib/model-display";
import { cn } from "@/lib/utils";
import { SIDE_MARK, SideMark } from "./CompareStage";
import { useComparePair } from "./use-compare-pair";

/**
 * Both models' serverless bill at one of four monthly volumes, as bars on one
 * scale. The chosen volume is React state only: it is not part of the link.
 * Every kind has four presets with the default second, so the index carries
 * over when the pair changes kind.
 */
export function VolumeEstimate() {
  const { a, b, hydrated } = useComparePair();
  const presets = volumePresets(a);
  const [index, setIndex] = useState(() => presets.values.indexOf(presets.initial));
  const volume = presets.values[index] ?? presets.initial;
  const costs = { a: monthlyAt(a, volume), b: monthlyAt(b, volume) };
  const max = Math.max(costs.a, costs.b);

  return (
    <div data-testid="volume-estimate" className="rounded-panel border border-line bg-surface p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <span id="volume-label" className="label-mono text-fg-2">
          Monthly {presets.unit}
        </span>
        <div
          role="group"
          aria-labelledby="volume-label"
          className="flex rounded-md border border-line-strong p-0.5"
        >
          {presets.values.map((v, i) => {
            const active = i === index;
            return (
              <button
                key={v}
                type="button"
                aria-pressed={active}
                disabled={!hydrated}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-7 rounded-sm px-3 font-mono text-meta transition-colors duration-150 disabled:cursor-default",
                  active ? "bg-surface-2 text-fg" : "text-fg-2 hover:text-fg",
                )}
              >
                {formatTokens(v)}
              </button>
            );
          })}
        </div>
      </div>

      <ul className="mt-6 flex flex-col gap-4">
        {([["a", a], ["b", b]] as const).map(([side, m]) => {
          const ratio = max > 0 ? costs[side] / max : 0;
          return (
            <li
              key={side}
              data-side={side}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-2 md:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto]"
            >
              <span className="flex min-w-0 items-center gap-2.5 text-ui text-fg">
                <SideMark side={side} />
                <span className="truncate">{shortModelName(m)}</span>
              </span>
              <span
                aria-hidden="true"
                className="order-last col-span-2 block h-1.5 overflow-hidden rounded-full bg-surface-2 md:order-none md:col-span-1"
              >
                <span
                  className={cn(
                    "block h-full origin-left rounded-full motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out-quart",
                    SIDE_MARK[side],
                  )}
                  style={{ transform: `scaleX(${ratio})` }}
                />
              </span>
              <span className="text-right font-mono text-meta whitespace-nowrap text-fg">
                {formatMonthly(costs[side])} <span className="text-fg-2">/ month</span>
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex flex-col gap-4 border-t border-line pt-5 md:flex-row md:items-center md:justify-between">
        <p data-testid="volume-summary" aria-live="polite" className="text-ui text-fg">
          {volumeSummary(a, b, volume)}
        </p>
        <Link
          href="/pricing/#calculator"
          className={cn(buttonVariants({ variant: "outline" }), "self-start md:self-auto")}
        >
          Open the calculator
        </Link>
      </div>
    </div>
  );
}
