import type { FeatureBundle, Transition } from "motion/react";

/**
 * How catalog rows move when the list is filtered or sorted: short, eased
 * out, a few pixels at most. A row that joins the list rises into place and
 * fades in; one that leaves fades out; the rest slide to their new places.
 */
export const ROW_SHIFT_PX = 6;
export const ROW_ENTER = { duration: 0.2, ease: "easeOut" } as const satisfies Transition;
export const ROW_EXIT = { duration: 0.16, ease: "easeOut" } as const satisfies Transition;
export const ROW_MOVE = { duration: 0.22, ease: "easeOut" } as const satisfies Transition;

export const rowVariants = {
  hidden: { opacity: 0, y: ROW_SHIFT_PX },
  shown: { opacity: 1, y: 0, transition: ROW_ENTER },
  /**
   * While the search text changes, leaving rows go at once: one keystroke
   * after another would otherwise keep a trail of fading rows on screen.
   */
  gone: (typing: boolean) => ({
    opacity: 0,
    transition: typing ? { duration: 0 } : ROW_EXIT,
  }),
};

const REDUCED = "(prefers-reduced-motion: reduce)";
let bundle: Promise<FeatureBundle> | undefined;

/**
 * Motion's animation and layout features, fetched when the browser is idle
 * after hydration: the rows render (and hydrate) as plain elements, and
 * nothing moves until the reader filters or sorts. With reduced motion the
 * features are never fetched.
 */
export function loadRowFeatures(): Promise<FeatureBundle> {
  if (window.matchMedia(REDUCED).matches) return new Promise(() => {});
  bundle ??= new Promise<void>((resolve) => {
    if ("requestIdleCallback" in window) window.requestIdleCallback(() => resolve(), { timeout: 2000 });
    else setTimeout(resolve, 200);
  })
    .then(() => import("./row-motion-features"))
    .then((m) => m.default);
  return bundle;
}
