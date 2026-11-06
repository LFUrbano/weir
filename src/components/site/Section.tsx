import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A page section on the 12-column grid. The heading block takes the first
 * eight columns; children get the full width below it.
 *
 * Vertical padding is half the gap between two sections, so consecutive
 * sections sit 128 px apart on desktop (112 px on tablets, 80 px on phones),
 * with the hairline in the middle. Home bands that are not a Section use the
 * same `sectionY` classes.
 */
export const sectionY = "py-10 md:py-14 lg:py-16";

export function Section({
  eyebrow,
  title,
  lede,
  children,
  id,
  className,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  children?: ReactNode;
  id?: string;
  className?: string;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn("border-t border-line", sectionY, className)}
    >
      <div className="container-site">
        <div className="grid grid-cols-12 gap-x-6">
          <header className="col-span-12 md:col-span-8">
            {eyebrow && <p className="label-mono mb-5 text-fg-2">{eyebrow}</p>}
            <h2 id={headingId} className="text-[2rem] leading-[1.1] tracking-[-0.02em] text-fg md:text-h2">
              {title}
            </h2>
            {lede && <p className="mt-5 max-w-[38rem] text-[1.0625rem] leading-relaxed text-fg-2">{lede}</p>}
          </header>
        </div>
        {children && <div className="mt-12 md:mt-16">{children}</div>}
      </div>
    </section>
  );
}
