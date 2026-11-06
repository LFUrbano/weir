"use client";

import { SearchIcon } from "lucide-react";
import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Task } from "@/data/models";
import { SORT_KEYS, TASKS, type SortKey } from "@/lib/catalog";
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

/** Longest accepted query; the same cap parseCatalogParams applies to the URL. */
export const MAX_QUERY_LENGTH = 80;

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
}: CatalogFiltersProps) {
  const searchId = useId();
  const sortId = useId();
  const inert = !onQueryChange;

  return (
    <div className="flex flex-col gap-4">
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
          <span id={sortId} className="label-mono shrink-0 text-fg-2">
            Sort by
          </span>
          <Select
            value={sort}
            disabled={inert}
            onValueChange={(v) => {
              const next = SORT_KEYS.find((k) => k === v);
              if (next) onSortChange?.(next);
            }}
          >
            <SelectTrigger
              aria-labelledby={sortId}
              className={cn(
                "h-10 w-full md:w-[13.5rem]",
                // Inert only until hydration: keep it looking ready so nothing flashes.
                inert && "disabled:cursor-default disabled:opacity-100",
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              {SORT_KEYS.map((k) => (
                <SelectItem key={k} value={k}>
                  {SORT_LABELS[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              aria-label={`${TASK_LABELS[t]}, ${counts[t]} ${counts[t] === 1 ? "model" : "models"}`}
              onClick={() => onTaskChange?.(t)}
              className={cn(
                chip,
                active
                  ? "border-line-strong bg-surface-2 text-fg"
                  : "border-line text-fg-2 hover:border-line-strong hover:text-fg",
              )}
            >
              {TASK_LABELS[t]}
              <span
                aria-hidden="true"
                className={cn(
                  "font-mono text-[0.75rem] tabular-nums",
                  active ? "text-fg" : "text-fg-2",
                )}
              >
                {counts[t]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
