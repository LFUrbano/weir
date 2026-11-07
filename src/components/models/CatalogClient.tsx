"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { models, type Task } from "@/data/models";
import {
  DEFAULT_PARAMS,
  TASKS,
  filterModels,
  parseCatalogParams,
  sortModels,
  toSearchString,
  type CatalogParams,
  type SortKey,
} from "@/lib/catalog";
import { useHydrated, useLocationSearch } from "@/lib/use-location-search";
import { CatalogFilters, TASK_LABELS } from "./CatalogFilters";
import { CatalogTable } from "./CatalogTable";

const CATALOG_PATH = "/models/";

/** The query as the URL stores it: trimmed and capped, through the same parser. */
function normalizeQuery(q: string): string {
  return parseCatalogParams(new URLSearchParams({ q })).q;
}

function taskCounts(p: CatalogParams): Record<Task | "all", number> {
  const count = (task: Task | "all") => filterModels(models, { ...p, task }).length;
  return Object.fromEntries((["all", ...TASKS] as const).map((t) => [t, count(t)])) as Record<
    Task | "all",
    number
  >;
}

function EmptyState({ params, onClear }: { params: CatalogParams; onClear?: () => void }) {
  const active = [
    params.q && { key: "search", value: `"${params.q}"` },
    params.task !== "all" && { key: "task", value: params.task },
  ].filter((f): f is { key: string; value: string } => Boolean(f));

  return (
    <div
      data-testid="catalog-empty"
      className="rounded-panel border border-line bg-surface px-6 py-12 md:px-12 md:py-16"
    >
      <h2 className="text-h3 break-words text-fg">
        No models match {params.q ? <>“{params.q}”</> : "this filter"}
        {params.q && params.task !== "all" && <> in {TASK_LABELS[params.task]}</>}
      </h2>
      {active.length > 0 && (
        <ul aria-label="Active filters" className="mt-5 flex flex-wrap gap-2">
          {active.map((f) => (
            <li
              key={f.key}
              className="max-w-full truncate rounded-md border border-line-strong px-2 py-1 font-mono text-caption text-fg-2"
            >
              {f.key}: <span className="text-fg">{f.value}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-5 max-w-[34rem] text-fg-2">
        Search matches model names and publishers. Try a family such as Llama or Qwen, a publisher
        such as Mistral AI, or clear the filters to see all {models.length} models.
      </p>
      <Button variant="outline" className="mt-8" onClick={onClear}>
        Clear filters
      </Button>
    </div>
  );
}

interface CatalogViewProps {
  params: CatalogParams;
  query: string;
  onQueryChange?: (q: string) => void;
  onTaskChange?: (task: Task | "all") => void;
  onSortChange?: (sort: SortKey) => void;
  onClear?: () => void;
}

function CatalogView({ params, query, onQueryChange, onTaskChange, onSortChange, onClear }: CatalogViewProps) {
  const filtered = { ...params, q: query };
  const { task, sort } = params;
  const list = useMemo(() => sortModels(filterModels(models, { task, sort, q: query }), sort), [task, sort, query]);
  const shown = list.length;
  // The rows only depend on the list: enabling the controls after hydration
  // must not render 24 rows (in two layouts) again.
  const table = useMemo(() => <CatalogTable list={list} task={task} sort={sort} />, [list, task, sort]);

  return (
    <div className="flex flex-col gap-6">
      <CatalogFilters
        query={query}
        task={params.task}
        sort={params.sort}
        counts={taskCounts(filtered)}
        onQueryChange={onQueryChange}
        onTaskChange={onTaskChange}
        onSortChange={onSortChange}
      />
      <p
        data-testid="catalog-count"
        aria-live="polite"
        className="font-mono text-meta text-fg-2 tabular-nums"
      >
        {shown === models.length ? (
          <>All {models.length} models</>
        ) : (
          <>
            <span className="text-fg">{shown}</span> of {models.length} models
          </>
        )}
      </p>
      {shown > 0 ? (
        table
      ) : (
        <EmptyState params={{ ...params, q: normalizeQuery(query) }} onClear={onClear} />
      )}
    </div>
  );
}

/**
 * The catalog with its state in the URL.
 *
 * The static HTML is this component with no query: every model, default
 * order, inert controls (readers without JavaScript get the full catalog).
 * React hydrates that HTML as is; the controls come alive right after, and a
 * URL with filters re-renders then (useLocationSearch, not useSearchParams,
 * which would make the whole catalog render on the client only).
 *
 * Search replaces the history entry on every keystroke; filters and sort push
 * one, so Back steps through them. URLs are written with the native History
 * API: router.replace would fetch the page's RSC payload again on every
 * keystroke, for a page whose data is already in the browser.
 *
 * The search box keeps its own text, because the URL trims spaces ("llama "
 * is stored as "llama"). Whenever the URL changes, the box takes the URL's
 * query unless the two already agree once trimmed: that covers Back and
 * Forward, links to /models/ (header, footer, command menu) and Clear filters,
 * without undoing a trailing space the reader just typed.
 */
export function CatalogClient() {
  const search = useLocationSearch();
  const hydrated = useHydrated();
  const params = parseCatalogParams(new URLSearchParams(search));
  const [query, setQuery] = useState(params.q);
  // "Reset state when a value changes", compared during render (no effect).
  const [lastSearch, setLastSearch] = useState(search);
  if (search !== lastSearch) {
    setLastSearch(search);
    if (normalizeQuery(query) !== params.q) setQuery(params.q);
  }

  const current = (): CatalogParams => ({ ...params, q: normalizeQuery(query) });
  const replace = (p: CatalogParams) =>
    window.history.replaceState(null, "", `${CATALOG_PATH}${toSearchString(p)}`);
  const push = (p: CatalogParams) =>
    window.history.pushState(null, "", `${CATALOG_PATH}${toSearchString(p)}`);

  // Inert (no handlers) until hydration, as in the static HTML.
  if (!hydrated) return <CatalogView params={params} query={query} />;

  return (
    <CatalogView
      params={params}
      query={query}
      onQueryChange={(q) => {
        setQuery(q);
        replace({ ...params, q: normalizeQuery(q) });
      }}
      onTaskChange={(task) => push({ ...current(), task })}
      onSortChange={(sort) => push({ ...current(), sort })}
      onClear={() => {
        setQuery("");
        push(DEFAULT_PARAMS);
      }}
    />
  );
}
