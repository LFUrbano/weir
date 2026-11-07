import { isTokenModel, type Model, type Task } from "@/data/models";
import { blendedPrice } from "@/lib/pricing";

export type SortKey = "name" | "price" | "speed" | "context";

export interface CatalogParams {
  q: string;
  task: Task | "all";
  sort: SortKey;
}

export const TASKS: Task[] = ["chat", "reasoning", "code", "embeddings", "vision", "image"];
export const SORT_KEYS: SortKey[] = ["name", "price", "speed", "context"];
export const DEFAULT_PARAMS: CatalogParams = { q: "", task: "all", sort: "name" };

/** Longest search query, in the URL, the catalog box and the command menu. */
export const MAX_QUERY_LENGTH = 80;

/** Reads catalog filters from a URL, falling back to defaults for anything invalid. */
export function parseCatalogParams(sp: URLSearchParams): CatalogParams {
  const q = (sp.get("q") ?? "").trim().slice(0, MAX_QUERY_LENGTH);
  const task = sp.get("task");
  const sort = sp.get("sort");
  return {
    q,
    task: TASKS.find((t) => t === task) ?? DEFAULT_PARAMS.task,
    sort: SORT_KEYS.find((s) => s === sort) ?? DEFAULT_PARAMS.sort,
  };
}

/**
 * Filters by task and by free text. Every word of the query must appear in the
 * model name or publisher (case-insensitive). Plain `includes` only, never a
 * RegExp built from user input.
 */
export function filterModels(list: Model[], p: CatalogParams): Model[] {
  const words = p.q.toLowerCase().split(/\s+/).filter(Boolean);
  return list.filter((m) => {
    if (p.task !== "all" && !m.tasks.includes(p.task)) return false;
    const haystack = `${m.name} ${m.publisher}`.toLowerCase();
    return words.every((w) => haystack.includes(w));
  });
}

function byName(a: Model, b: Model): number {
  return a.name.localeCompare(b.name);
}

/** Descending by value, nulls last, ties by name. */
function descNullsLast(get: (m: Model) => number | null) {
  return (a: Model, b: Model): number => {
    const x = get(a);
    const y = get(b);
    if (x === null && y === null) return byName(a, b);
    if (x === null) return 1;
    if (y === null) return -1;
    return y - x || byName(a, b);
  };
}

/** Token models by blended price at a 50/50 split, then image models by price per image. */
function byPrice(a: Model, b: Model): number {
  if (isTokenModel(a) && isTokenModel(b)) {
    return blendedPrice(a, 0.5) - blendedPrice(b, 0.5) || byName(a, b);
  }
  if (isTokenModel(a)) return -1;
  if (isTokenModel(b)) return 1;
  if (a.pricing.unit === "image" && b.pricing.unit === "image") {
    return a.pricing.perImage - b.pricing.perImage || byName(a, b);
  }
  return byName(a, b);
}

/** Returns a sorted copy; the input list is never mutated. */
export function sortModels(list: Model[], sort: SortKey): Model[] {
  const copy = [...list];
  switch (sort) {
    case "price":
      return copy.sort(byPrice);
    case "speed":
      return copy.sort(descNullsLast((m) => m.tokensPerSec));
    case "context":
      return copy.sort(descNullsLast((m) => m.contextK));
    default:
      return copy.sort(byName);
  }
}

/** Query string for the given filters, omitting defaults ("" when all are default). */
export function toSearchString(p: CatalogParams): string {
  const sp = new URLSearchParams();
  if (p.q) sp.set("q", p.q);
  if (p.task !== DEFAULT_PARAMS.task) sp.set("task", p.task);
  if (p.sort !== DEFAULT_PARAMS.sort) sp.set("sort", p.sort);
  const s = sp.toString();
  return s ? `?${s}` : "";
}
