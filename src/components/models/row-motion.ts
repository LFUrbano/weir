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
const reduced = () => window.matchMedia(REDUCED).matches;

let wanted: () => void = () => {};
const intent = new Promise<void>((resolve) => {
  wanted = resolve;
});
let bundle: Promise<FeatureBundle> | undefined;

/**
 * The reader is about to filter or sort (a pointer over the controls, focus
 * in them, a finger on them): fetch the features now, once. Until then the
 * page loads and hydrates without them, and nothing is fetched while the
 * reader only scrolls. Never with reduced motion.
 */
export function wantRowFeatures(): void {
  if (!reduced()) wanted();
}

/**
 * Motion's animation and layout features, resolved once wantRowFeatures has
 * been called and the chunk has loaded. Until then the rows render as plain
 * elements and filtering or sorting works without animation. With reduced
 * motion it never resolves and the features are never fetched.
 */
export function loadRowFeatures(): Promise<FeatureBundle> {
  if (reduced()) return new Promise(() => {});
  bundle ??= intent.then(() => import("./row-motion-features")).then((m) => m.default);
  return bundle;
}
