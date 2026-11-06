"use client";

import { useSyncExternalStore } from "react";
import type { SnippetLang } from "@/components/code/snippets";

/**
 * The language a reader picked in any synced code panel. Docs pages keep it
 * here so one choice (Node, say) applies to every panel on the page. It lives
 * in memory only: nothing is written to storage, and a new page starts fresh.
 */
let picked: SnippetLang | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** `null` until the reader picks a language, on the server and on first render alike. */
export function useSharedLang(): readonly [SnippetLang | null, (lang: SnippetLang) => void] {
  const lang = useSyncExternalStore(
    subscribe,
    () => picked,
    () => null,
  );
  return [
    lang,
    (next) => {
      if (picked === next) return;
      picked = next;
      listeners.forEach((l) => l());
    },
  ] as const;
}
