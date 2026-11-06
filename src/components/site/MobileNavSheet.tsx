"use client";

import Link from "next/link";
import type { RefObject } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { primaryCta, siteNav } from "@/data/site";
import { isActivePath } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { StatusDot } from "./StatusDot";

/** The phone menu sheet. Loaded on the first tap of "Menu" (MobileNav). */
export function MobileNavSheet({
  open,
  onOpenChange,
  pathname,
  returnFocusTo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pathname: string | null;
  returnFocusTo: RefObject<HTMLButtonElement | null>;
}) {
  // Same-page taps (e.g. the logo while already home) do not change the path.
  const close = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="gap-0 md:hidden"
        // There is no SheetTrigger (the button lives in MobileNav), so return
        // focus to it by hand; Radix would otherwise drop focus on <body>.
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          returnFocusTo.current?.focus();
        }}
      >
        <div className="flex h-(--header-h) shrink-0 items-center justify-between border-b border-line px-5">
          <SheetTitle className="sr-only">Site navigation</SheetTitle>
          <SheetDescription className="sr-only">Links to every section of the site.</SheetDescription>
          <Logo onClick={close} />
          <SheetClose asChild>
            <Button variant="ghost" size="sm" className="-mr-2 text-fg">
              Close
            </Button>
          </SheetClose>
        </div>

        <nav aria-label="Main" className="px-5">
          <ul>
            {siteNav.map((item, index) => (
              <li key={item.href} className="border-b border-line">
                <Link
                  href={item.href}
                  onClick={close}
                  aria-current={pathname && isActivePath(pathname, item.href) ? "page" : undefined}
                  className="group flex items-baseline justify-between py-5"
                >
                  <span className="font-display text-menu leading-none font-semibold tracking-[-0.025em] text-fg">
                    {item.label}
                  </span>
                  <span
                    aria-hidden="true"
                    className="label-mono text-fg-2 transition-colors group-hover:text-fg"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-auto flex flex-col gap-5 border-t border-line px-5 pt-6 pb-8">
          <Link
            href={primaryCta.href}
            onClick={close}
            className={cn(buttonVariants({ size: "lg" }), "w-full")}
          >
            {primaryCta.label}
          </Link>
          <div className="flex items-center justify-between text-small">
            <span className="cursor-default text-fg-2 select-none">Sign in</span>
            <span className="flex items-center gap-2 font-mono text-caption text-fg-2">
              <StatusDot state="ok" />
              All systems normal
            </span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
