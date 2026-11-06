"use client";

import { useRef, useSyncExternalStore, type CSSProperties } from "react";
import { useScroll } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";

export interface RequestStep {
  name: string;
  /** "t+14 ms": when the request reaches this hop. */
  stamp: string;
  sentence: string;
  detail: string[];
}

/**
 * The path of one request, App to GPUs. As the list scrolls through the
 * viewport the path fills in amber hop by hop, so the reader follows the
 * request at their own pace; nothing moves unless they scroll. Horizontal on
 * large screens, a vertical list on small ones. Server and no-JS render the
 * finished path; reduced motion keeps it that way.
 */
export function RequestDiagram({ steps }: { steps: RequestStep[] }) {
  const ref = useRef<HTMLOListElement>(null);
  const reduced = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.75", "end 0.6"],
  });

  const scrolled = useSyncExternalStore(
    (onChange) => scrollYProgress.on("change", onChange),
    // Quantized so React only re-renders when the path visibly moves.
    () => Math.round(scrollYProgress.get() * 200) / 200,
    () => 1,
  );
  const progress = reduced ? 1 : Math.min(1, Math.max(0, scrolled));
  const segments = steps.length - 1;

  return (
    <ol
      ref={ref}
      data-testid="diagram-progress"
      data-progress={progress >= 1 ? "1" : progress.toFixed(2)}
      className="grid grid-cols-1 gap-y-10 lg:grid-cols-4 lg:gap-x-6"
    >
      {steps.map((step, i) => {
        const lit = i === 0 ? progress > 0.01 : progress >= i / segments - 0.001;
        const fill = Math.min(1, Math.max(0, progress * segments - i));
        return (
          <li
            key={step.name}
            data-testid="diagram-step"
            data-lit={lit ? "true" : "false"}
            className="group relative pl-9 lg:pt-11 lg:pl-0 lg:pr-4"
          >
            {i < segments ? (
              <span
                aria-hidden="true"
                className="absolute top-[5px] left-[5px] h-[calc(100%+2.5rem)] w-px bg-line-strong lg:h-px lg:w-[calc(100%+1.5rem)]"
              >
                <span
                  style={{ "--s": fill } as CSSProperties}
                  className="absolute inset-0 origin-top scale-x-100 scale-y-(--s) bg-amber lg:origin-left lg:scale-x-(--s) lg:scale-y-100"
                />
              </span>
            ) : null}
            <span
              aria-hidden="true"
              className="absolute top-0 left-0 size-[11px] border border-line-strong bg-canvas transition-colors duration-200 group-data-[lit=true]:border-amber group-data-[lit=true]:bg-amber"
            />
            <div className="label-mono -mt-px text-fg-2 normal-case transition-colors duration-200 group-data-[lit=true]:text-amber lg:mt-0">
              {step.stamp}
            </div>
            <h3 className="mt-4 text-h3 text-fg">{step.name}</h3>
            <p className="mt-3 max-w-[34rem] text-small text-fg-2">{step.sentence}</p>
            <ul className="mt-5 flex flex-wrap gap-1.5">
              {step.detail.map((d) => (
                <li
                  key={d}
                  className={cn(
                    "rounded-md border px-2 py-1 font-mono text-[0.75rem] leading-none transition-colors duration-200",
                    "border-line text-fg-2 group-data-[lit=true]:border-line-strong group-data-[lit=true]:text-fg",
                  )}
                >
                  {d}
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}
