"use client";

import { ChevronDownIcon, SearchIcon } from "lucide-react";
import { useId } from "react";
import { Input } from "@/components/ui/input";
import type { Task } from "@/data/models";
import { MAX_QUERY_LENGTH, SORT_KEYS, TASKS, type SortKey } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export const TASK_LABELS: Record<Task | "all", string> = {
  all: "All",
  chat: "Chat",
  reasoning: "Reasoning",
  code: "Code",
  embeddings: "Embeddings",
  vision: "Vision",
  image: "Image",
};

export const SORT_LABELS: Record<SortKey, string> = {
  name: "Name, A to Z",
  price: "Price, lowest first",
  speed: "Speed, fastest first",
  context: "Context, largest first",
};

export interface CatalogFiltersProps {
  query: string;
  task: Task | "all";
  sort: SortKey;
  /** Models per task for the current search, "all" included. */
  counts: Record<Task | "all", number>;
  /** Without handlers (static HTML before hydration) the controls render inert. */
  onQueryChange?: (q: string) => void;
  onTaskChange?: (task: Task | "all") => void;
  onSortChange?: (sort: SortKey) => void;
  /**
   * The first sign the reader is about to use the controls: a pointer over
   * them, focus inside them, a finger on them. Called on each such event.
   */
  onIntent?: () => void;
}

const chip =
  "inline-flex h-8 items-center gap-2 rounded-md border px-3 text-small transition-colors duration-150 disabled:cursor-default";

export function CatalogFilters({
  query,
  task,
  sort,
  counts,
  onQueryChange,
  onTaskChange,
  onSortChange,
  onIntent,
}: CatalogFiltersProps) {
  const searchId = useId();
  const sortId = useId();
  const inert = !onQueryChange;

  return (
    <div
      className="flex flex-col gap-4"
      onPointerEnter={onIntent}
      onFocus={onIntent}
      onTouchStart={onIntent}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-[26rem]">
          <label htmlFor={searchId} className="sr-only">
            Search models
          </label>
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-2"
          />
          <Input
            id={searchId}
            type="search"
            inputMode="search"
            autoComplete="off"
            spellCheck={false}
            maxLength={MAX_QUERY_LENGTH}
            placeholder="Search by name or publisher"
            value={query}
            readOnly={inert}
            onChange={(e) => onQueryChange?.(e.target.value)}
            className="h-10 pl-9"
          />
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor={sortId} className="label-mono shrink-0 text-fg-2">
            Sort by
          </label>
          {/* A native select: the same look as the other select triggers, closed,
              and the platform's own list when open (a sheet on phones). */}
          <div className="relative w-full md:w-[13.5rem]">
            <select
              id={sortId}
              value={sort}
              disabled={inert}
              onChange={(e) => {
                const next = SORT_KEYS.find((k) => k === e.target.value);
                if (next) onSortChange?.(next);
              }}
              className={cn(
                "h-9 w-full appearance-none rounded-md border border-line-strong bg-surface pr-8.5 pl-3 text-small text-fg transition-colors duration-150 hover:border-[color-mix(in_oklab,var(--color-line-strong),white_10%)] hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50",
                // Inert only until hydration: keep it looking ready so nothing flashes.
                inert && "disabled:cursor-default disabled:opacity-100",
              )}
            >
              {SORT_KEYS.map((k) => (
                <option key={k} value={k}>
                  {SORT_LABELS[k]}
                </option>
              ))}
            </select>
            {/* 11px from the edge, like the trigger's icon: its 10px padding plus the border. */}
            <ChevronDownIcon
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 right-2.75 size-4 -translate-y-1/2 text-fg-2"
            />
          </div>
        </div>
      </div>

      <div role="group" aria-label="Filter by task" className="flex flex-wrap gap-2">
        {(["all", ...TASKS] as const).map((t) => {
          const active = t === task;
          return (
            <button
              key={t}
              type="button"
              aria-pressed={active}
              disabled={inert}
              onClick={() => onTaskChange?.(t)}
              className={cn(
                chip,
                active
                  ? "border-line-strong bg-surface-2 text-fg"
                  : "border-line text-fg-2 hover:border-line-strong hover:text-fg",
              )}
            >
              {/* The name is the visible text plus " models": "Chat 13 models".
                  An aria-label that rewords it fails label-content-name-mismatch. */}
              {TASK_LABELS[t]}{" "}
              <span
                className={cn(
                  "font-mono text-caption tabular-nums",
                  active ? "text-fg" : "text-fg-2",
                )}
              >
                {counts[t]}
              </span>
              <span className="sr-only">{counts[t] === 1 ? " model" : " models"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
