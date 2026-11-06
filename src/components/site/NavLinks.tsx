"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteNav } from "@/data/site";
import { isActivePath } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function NavLinks({ className }: { className?: string }) {
  const pathname = usePathname() ?? "/";
  return (
    <ul className={cn("flex items-center gap-1", className)}>
      {siteNav.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative inline-flex h-8 items-center rounded-md px-3 text-[0.875rem] transition-colors duration-150",
                "text-fg-2 hover:text-fg aria-[current=page]:text-fg",
                "after:absolute after:inset-x-3 after:-bottom-3 after:h-px after:bg-fg after:opacity-0 aria-[current=page]:after:opacity-100",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
