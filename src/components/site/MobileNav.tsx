"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { primaryCta, siteNav } from "@/data/site";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { StatusDot } from "./StatusDot";

function MenuGlyph() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4" fill="none">
      <path d="M2 5.5H14M2 10.5H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

export function MobileNav() {
  // The header lives in the root layout, so the open state survives client
  // navigation. Close the sheet whenever the route changes, whatever link
  // caused it (nav links, the logo, links added later). This is React's
  // "reset state when a value changes" pattern: compare during render instead
  // of setting state in an effect.
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }
  // Same-page taps (e.g. the logo while already home) do not change the path.
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="-mr-2 gap-2 text-fg md:hidden">
          <MenuGlyph />
          Menu
        </Button>
      </SheetTrigger>
      <SheetContent side="right" showCloseButton={false} className="gap-0 md:hidden">
        <div className="flex h-(--header-h) shrink-0 items-center justify-between border-b border-line px-5">
          <SheetTitle className="sr-only">Site navigation</SheetTitle>
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
                  className="group flex items-baseline justify-between py-5"
                >
                  <span className="font-display text-[1.75rem] leading-none font-semibold tracking-[-0.025em] text-fg">
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
          <div className="flex items-center justify-between text-[0.875rem]">
            <span className="cursor-default text-fg-2 select-none">Sign in</span>
            <span className="flex items-center gap-2 font-mono text-[0.75rem] text-fg-2">
              <StatusDot state="ok" />
              All systems normal
            </span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
