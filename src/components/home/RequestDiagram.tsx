"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
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
 *
 * The scroll tracker (Motion) loads after hydration: the diagram sits below
 * the fold, so nothing on screen waits for it.
 *
 * The colors fade only once the tracker has placed the path. Its first report
 * moves the path from the finished state to where the list really is (on load,
 * below the fold: nothing lit), and fading that move started some seventy color
 * transitions at once, off screen, which cost a phone a long task right after
 * hydration.
 */
export function RequestDiagram({ steps }: { steps: RequestStep[] }) {
  const ref = useRef<HTMLOListElement>(null);
  const reduced = usePrefersReducedMotion();
  // null (the finished path) until the tracker reports where the list really is.
  const [scrolled, setScrolled] = useState<number | null>(null);
  const placed = scrolled !== null;
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (reduced || !el) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    void import("./request-scroll").then(({ scroll }) => {
      if (cancelled) return;
      stop = scroll(
        // Quantized so React only re-renders when the path visibly moves.
        (p: number) => setScrolled(Math.round(p * 200) / 200),
        { target: el, offset: ["start 0.75", "end 0.6"] },
      );
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [reduced]);

  useEffect(() => {
    if (!placed || fade) return;
    // The path is placed in the DOM. Let a frame style it without transitions,
    // then turn them on for the reader's scrolling.
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setFade(true));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [placed, fade]);

  const progress = reduced || scrolled === null ? 1 : Math.min(1, Math.max(0, scrolled));
  const fadeColors = fade && "transition-colors duration-200";
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
              className={cn(
                "absolute top-0 left-0 size-[11px] border border-line-strong bg-canvas group-data-[lit=true]:border-amber group-data-[lit=true]:bg-amber",
                fadeColors,
              )}
            />
            <div
              className={cn(
                "label-mono -mt-px text-fg-2 normal-case group-data-[lit=true]:text-amber lg:mt-0",
                fadeColors,
              )}
            >
              {step.stamp}
            </div>
            <h3 className="mt-4 text-h3 text-fg">{step.name}</h3>
            <p className="mt-3 max-w-[34rem] text-small text-fg-2">{step.sentence}</p>
            <ul className="mt-5 flex flex-wrap gap-1.5">
              {step.detail.map((d) => (
                <li
                  key={d}
                  className={cn(
                    "rounded-md border px-2 py-1 font-mono text-caption leading-none",
                    "border-line text-fg-2 group-data-[lit=true]:border-line-strong group-data-[lit=true]:text-fg",
                    fadeColors,
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
