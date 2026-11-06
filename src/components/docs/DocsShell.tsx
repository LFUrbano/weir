import type { ReactNode } from "react";
import { Toc, type TocItem } from "@/components/docs/Toc";

/**
 * A docs page: the table of contents beside the article, stacked above it on
 * phones. The article is capped at a readable width; code panels fill it.
 */
export function DocsShell({
  eyebrow,
  toc,
  children,
}: {
  eyebrow: string;
  toc: readonly TocItem[];
  children: ReactNode;
}) {
  return (
    <div className="container-site pt-10 pb-20 md:pt-14 md:pb-28">
      <div className="grid grid-cols-1 gap-y-8 lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-x-16">
        <Toc items={toc} />
        <article className="min-w-0 max-w-[46rem]">
          <p className="label-mono mb-6 text-fg-2">{eyebrow}</p>
          {children}
        </article>
      </div>
    </div>
  );
}
