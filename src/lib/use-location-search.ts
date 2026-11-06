"use client";

import { useSyncExternalStore } from "react";

/**
 * `window.location.search` as React state, without useSearchParams.
 *
 * In a static export, useSearchParams has no value at build time, so Next
 * renders everything up to the nearest <Suspense> on the client only: the
 * catalog's 24 rows (in two layouts) were built from scratch on every load,
 * one ~250 ms task on a mid-range phone. With this store the build renders
 * the default catalog (server snapshot ""), React hydrates it as is, and a
 * URL with filters re-renders right after hydration.
 *
 * pushState and replaceState fire no event, so they are wrapped once to
 * notify subscribers; this covers the catalog's own writes and Next's router
 * (links to /models/ from the header, footer or command menu). Back and
 * Forward arrive as popstate.
 */
const listeners = new Set<() => void>();
let wrapped = false;

function notify() {
  for (const listener of listeners) listener();
}

function wrapHistory() {
  if (wrapped) return;
  wrapped = true;
  for (const method of ["pushState", "replaceState"] as const) {
    const original = window.history[method];
    window.history[method] = function (this: History, ...args: Parameters<History["pushState"]>) {
      original.apply(this, args);
      // Next's router writes history from an insertion effect, where React
      // must not be asked to re-render: let the current work finish first.
      queueMicrotask(notify);
    };
  }
  window.addEventListener("popstate", notify);
}

function subscribe(listener: () => void) {
  wrapHistory();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useLocationSearch(): string {
  return useSyncExternalStore(
    subscribe,
    () => window.location.search.replace(/^\?/, ""),
    () => "",
  );
}

const noopSubscribe = () => () => {};

/** false in the static HTML and during hydration, true after. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
