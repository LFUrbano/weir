import type { ReactNode } from "react";

/**
 * A documentation-style band: the heading in a narrow column, the content
 * beside it. Used on model pages and on the comparison page.
 */
export function Band({
  id,
  eyebrow,
  title,
  lede,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lede?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="border-t border-line py-12 md:py-16">
      <div className="container-site grid grid-cols-12 gap-x-6 gap-y-8">
        <header className="col-span-12 lg:col-span-3">
          <p className="label-mono text-fg-2">{eyebrow}</p>
          <h2 id={`${id}-title`} className="mt-3 text-h3 text-fg">
            {title}
          </h2>
          {lede && <p className="mt-3 max-w-[34rem] text-small text-fg-2">{lede}</p>}
        </header>
        <div className="col-span-12 min-w-0 lg:col-span-9">{children}</div>
      </div>
    </section>
  );
}
