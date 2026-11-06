import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { SiteRoute } from "@/data/site";
import { cn } from "@/lib/utils";

/** Inline `code`: mono on a raised chip, wrapping instead of pushing the page wide. */
export function InlineCode({ className, ...props }: ComponentProps<"code">) {
  return (
    <code
      className={cn(
        "rounded-sm border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-code break-words text-fg",
        className,
      )}
      {...props}
    />
  );
}

/**
 * The sentence under the title. MDX wraps text it finds inside a block
 * component in a paragraph, so this is a div that styles that paragraph.
 */
export function Lede({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6 [&_p]:max-w-[35rem] [&_p]:text-[1.0625rem] [&_p]:leading-relaxed [&_p]:text-fg-2">
      {children}
    </div>
  );
}

/** An aside inside a step: a rule that applies to everything above it. */
export function Note({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="max-w-[35rem] rounded-panel border border-line bg-surface px-4 py-3.5 md:px-5">
      <p className="label-mono text-fg-2">{title}</p>
      <div className="mt-2 space-y-2 text-small leading-relaxed text-fg [&_p]:max-w-none [&_p]:text-small [&_p]:leading-relaxed">
        {children}
      </div>
    </aside>
  );
}

export interface LinkCardItem {
  href: SiteRoute | `/models/${string}/`;
  title: string;
  text: string;
}

/** Where to go next: a grid of links, each with a line on what is there. */
export function LinkCards({ items }: { items: readonly LinkCardItem[] }) {
  return (
    <ul role="list" className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            className="group flex h-full flex-col rounded-panel border border-line bg-surface p-5 transition-colors duration-150 hover:border-line-strong hover:bg-surface-2"
          >
            <span className="flex items-center justify-between gap-3 font-display text-[1.0625rem] font-semibold text-fg">
              {item.title}
              <span
                aria-hidden="true"
                className="font-mono text-fg-2 transition-transform duration-150 group-hover:translate-x-0.5"
              >
                →
              </span>
            </span>
            <span className="mt-2 text-small text-fg-2">{item.text}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
