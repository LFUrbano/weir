"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps, FocusEvent, MouseEvent, TouchEvent } from "react";

/**
 * A next/link that prefetches its target on intent (pointer over it, keyboard
 * focus, a finger landing on it) instead of when it scrolls into view. Used for
 * the links every page shows above the fold (logo, main navigation, the calls
 * to action) and for the catalog's model rows.
 *
 * On view, the header and calls to action made every page download and parse
 * the code of four or five other routes (catalog, calculator, form, docs) in
 * the second after load, which is when a phone is busiest; the catalog's rows
 * prefetched 15 model pages on the first screen alone. Intent still leaves
 * 100+ ms before the click lands, enough for a static segment file. Other links
 * keep Next's default prefetch on view.
 */
export function IntentLink({
  href,
  onMouseEnter,
  onFocus,
  onTouchStart,
  ...props
}: Omit<ComponentProps<typeof Link>, "href" | "prefetch"> & { href: string }) {
  const router = useRouter();
  const prefetch = () => router.prefetch(href.split("#")[0]);

  return (
    <Link
      href={href}
      prefetch={false}
      onMouseEnter={(e: MouseEvent<HTMLAnchorElement>) => {
        prefetch();
        onMouseEnter?.(e);
      }}
      onFocus={(e: FocusEvent<HTMLAnchorElement>) => {
        prefetch();
        onFocus?.(e);
      }}
      onTouchStart={(e: TouchEvent<HTMLAnchorElement>) => {
        prefetch();
        onTouchStart?.(e);
      }}
      {...props}
    />
  );
}
