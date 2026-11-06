"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TocItem {
  id: string;
  title: string;
}

/** Where a section counts as "being read": a little below the sticky header. */
const READING_LINE = 140;

/** The id of the last heading that has reached the reading line (the first one before any has). */
function currentId(ids: string[]): string {
  const doc = document.documentElement;
  if (window.scrollY + window.innerHeight >= doc.scrollHeight - 2) return ids[ids.length - 1];
  let current = ids[0];
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el && el.getBoundingClientRect().top <= READING_LINE) current = id;
  }
  return current;
}

function Links({
  items,
  active,
  onNavigate,
}: {
  items: readonly TocItem[];
  active: string;
  onNavigate?: () => void;
}) {
  return (
    <ol className="m-0 list-none space-y-0.5 p-0">
      {items.map((item, i) => (
        <li key={item.id}>
          <a
            href={`#${item.id}`}
            aria-current={item.id === active ? "location" : undefined}
            onClick={onNavigate}
            className={cn(
              "flex items-baseline gap-3 border-l py-1.5 pr-2 pl-3 text-small transition-colors duration-150",
              item.id === active
                ? "border-amber text-fg"
                : "border-line text-fg-2 hover:border-line-strong hover:text-fg",
            )}
          >
            <span aria-hidden="true" className="font-mono text-code text-fg-2">
              {i + 1}
            </span>
            {item.title}
          </a>
        </li>
      ))}
    </ol>
  );
}

/**
 * "On this page". Every link is a plain anchor that works with no script at
 * all. The only client code is the scroll listener that marks the section
 * being read, and it does one comparison per heading per frame.
 *
 * Phones get a closed disclosure; from lg up the list sits beside the page and
 * sticks under the header. Both lists share one "active" value.
 */
export function Toc({ items }: { items: readonly TocItem[] }) {
  const [active, setActive] = useState(items[0].id);
  const details = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const ids = items.map((i) => i.id);
    let frame = 0;
    const update = () => {
      frame = 0;
      setActive(currentId(ids));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [items]);

  return (
    <>
      <nav aria-label="On this page" className="lg:hidden">
        <details ref={details} className="group rounded-panel border border-line bg-surface">
          <summary className="label-mono flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 text-fg-2 select-none [&::-webkit-details-marker]:hidden">
            On this page
            <ChevronDown
              aria-hidden="true"
              className="size-4 transition-transform duration-150 group-open:rotate-180"
            />
          </summary>
          <div className="border-t border-line p-2">
            <Links
              items={items}
              active={active}
              onNavigate={() => details.current?.removeAttribute("open")}
            />
          </div>
        </details>
      </nav>
      <nav
        aria-label="On this page"
        className="hidden lg:sticky lg:top-[calc(var(--header-h)+2.5rem)] lg:block lg:self-start"
      >
        <p aria-hidden="true" className="label-mono mb-3 text-fg-2">
          On this page
        </p>
        <Links items={items} active={active} />
      </nav>
    </>
  );
}
