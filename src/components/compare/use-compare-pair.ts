"use client";

import { useMemo } from "react";
import { COMPARE_PATH, compareSearch, parseComparePair, type ComparePair } from "@/lib/compare";
import { useHydrated, useLocationSearch } from "@/lib/use-location-search";

/**
 * The pair in the URL (?a=&b=), as every part of the comparison page reads it.
 * The static HTML and the first client render have no query, so they show
 * the default pair; a shared link re-renders right after hydration (the same
 * pattern as the catalog, see useLocationSearch).
 */
export function useComparePair(): ComparePair & { search: string; hydrated: boolean } {
  const search = useLocationSearch();
  const hydrated = useHydrated();
  const pair = useMemo(() => parseComparePair(new URLSearchParams(search)), [search]);
  return { ...pair, search, hydrated };
}

/** The page's URL for a pair, after the same correction the page applies. */
export function compareHref(a: string, b: string): string {
  const pair = parseComparePair(new URLSearchParams(compareSearch(a, b)));
  return `${COMPARE_PATH}${compareSearch(pair.a.slug, pair.b.slug)}`;
}

/**
 * A new history entry for the pair, so Back returns to the previous one.
 * The native History API, not the router: the page's data is already here.
 */
export function pushPair(a: string, b: string) {
  window.history.pushState(null, "", compareHref(a, b));
}
