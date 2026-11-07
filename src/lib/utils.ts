import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * The --text-* scale in globals.css (tests/unit/type-tokens.test.ts keeps the
 * two in sync). tailwind-merge only knows Tailwind's default font sizes:
 * without this list it reads `text-small` as a color and drops it when
 * `text-fg` follows.
 */
export const fontSizeTokens = [
  "display",
  "h2",
  "h3",
  "body",
  "small",
  "label",
  "code",
  "micro",
  "caption",
  "meta",
  "ui",
  "lede",
  "h4",
  "logo",
  "figure-xs",
  "stat",
  "price",
  "figure-sm",
  "figure",
  "figure-lg",
  "menu",
  "h2-sm",
  "title-sm",
  "title",
  "hero",
];

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: fontSizeTokens,
    },
  },
  override: {
    // tailwind-merge assumes a font size overrides an earlier leading-*, and
    // drops the leading. In Tailwind v4 it doesn't: leading-* sets
    // --tw-leading, which every text-* size reads first, so an explicit
    // leading wins in any order. Keep both.
    conflictingClassGroups: { "font-size": [] },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
