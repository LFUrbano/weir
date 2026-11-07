"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const loadSheet = () => import("./MobileNavSheet");

// The sheet (Radix Dialog) is not in any page's first load: it is fetched
// when "Menu" is touched or focused, and mounted on the first open.
const MobileNavSheet = dynamic(() => loadSheet().then((m) => m.MobileNavSheet), { ssr: false });

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
  const [mounted, setMounted] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }
  if (open && !mounted) setMounted(true);
  const trigger = useRef<HTMLButtonElement>(null);

  return (
    <>
      <Button
        ref={trigger}
        variant="ghost"
        size="sm"
        className="-mr-2 gap-2 text-fg md:hidden"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        onPointerDown={() => void loadSheet()}
        onFocus={() => void loadSheet()}
      >
        <MenuGlyph />
        Menu
      </Button>
      {mounted && (
        <MobileNavSheet open={open} onOpenChange={setOpen} pathname={pathname} returnFocusTo={trigger} />
      )}
    </>
  );
}
