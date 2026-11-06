import type { ReactNode } from "react";
import { quickstartOutline, type StepId } from "@/components/docs/outline";

/** The numbered list the steps live in. Numbers are drawn, so the list says "list" for screen readers. */
export function Steps({ children }: { children: ReactNode }) {
  return (
    <ol role="list" aria-label="Quickstart steps" className="m-0 list-none p-0">
      {children}
    </ol>
  );
}

/**
 * One step: a number, a heading that links to itself, then the step's content.
 * The title and the number come from the outline, which the table of contents
 * reads too.
 */
export function Step({ id, children }: { id: StepId; children: ReactNode }) {
  const index = quickstartOutline.findIndex((s) => s.id === id);
  const { title } = quickstartOutline[index];
  const n = index + 1;
  return (
    <li
      data-step={n}
      className="mt-12 border-t border-line pt-10 first:mt-10 md:mt-16 md:pt-12 md:first:mt-12"
    >
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          data-testid="step-number"
          className="grid size-8 shrink-0 place-items-center rounded-md border border-line-strong font-mono text-small text-fg"
        >
          {n}
        </span>
        <h2 id={id} className="group text-h3 text-fg">
          <a
            href={`#${id}`}
            className="decoration-line-strong underline-offset-4 hover:underline"
          >
            {title}
            <span
              aria-hidden="true"
              className="ml-2.5 font-mono text-fg-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
            >
              #
            </span>
          </a>
        </h2>
      </div>
      <div className="mt-6 space-y-5">{children}</div>
    </li>
  );
}
