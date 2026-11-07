"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { RotateCcw } from "lucide-react";
import type { CodePane } from "@/components/code/CodeTabs";
import { CopyButton } from "@/components/code/CopyButton";
import type { SnippetLang } from "@/components/code/snippets";
import { StatusDot } from "@/components/site/StatusDot";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TokenModel } from "@/data/models";
import { formatLatency, formatUsd } from "@/lib/format";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";
import { demoDuration, demoFrame, demoTokens, heroDemo, type DemoFrame } from "./hero-demo";

/** Pause between the terminal coming into view and the request going out. */
const START_DELAY_MS = 450;

type TerminalState = "idle" | DemoFrame["phase"];

const STATUS: Record<TerminalState, string> = {
  idle: "Ready",
  waiting: "Waiting for first token",
  streaming: "Streaming",
  done: "Done",
};

/**
 * The hero's request and its reply. The request is the server-highlighted
 * code panel; the reply streams in at the model's measured time to first
 * token and decode speed, and the three numbers under it are computed from
 * the same clock. With reduced motion it renders the finished call at once.
 */
export function HeroTerminal({
  panes,
  model,
  codeLines,
}: {
  panes: CodePane[];
  model: TokenModel;
  /** Line count of the longest pane, so switching tabs never changes the height. */
  codeLines: number;
}) {
  const [active, setActive] = useState<SnippetLang>("curl");
  const current = panes.find((p) => p.lang === active) ?? panes[0];

  const reduced = usePrefersReducedMotion();
  // The reply starts once the reply area itself is on screen, so on a phone it
  // waits until the visitor has scrolled down to it.
  const replyRef = useRef<HTMLDivElement>(null);
  // Ms since the request went out; null until the terminal has been seen.
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const el = replyRef.current;
    if (!el) return;
    const duration = demoDuration(model);
    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        timer = setTimeout(() => {
          const t0 = performance.now();
          const tick = (now: number) => {
            const e = Math.max(0, now - t0);
            setElapsed(e);
            if (e < duration) raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
        }, START_DELAY_MS);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [reduced, run, model]);

  const frame: DemoFrame | null = reduced
    ? demoFrame(model, Number.POSITIVE_INFINITY)
    : elapsed === null
      ? null
      : demoFrame(model, elapsed);
  const state: TerminalState = frame?.phase ?? "idle";
  const live = state === "waiting" || state === "streaming";
  const text = demoTokens.slice(0, frame?.tokens ?? 0).join("");

  function replay() {
    setElapsed(null);
    setRun((r) => r + 1);
  }

  const stats = [
    { label: "Time to first token", value: frame ? formatLatency(frame.ttftMs) : null },
    {
      label: "Throughput",
      value: frame?.throughput != null ? `${Math.round(frame.throughput)} tok/s` : null,
    },
    { label: "Cost", value: frame && frame.tokens > 0 ? formatUsd(frame.cost) : null },
  ];

  return (
    <div
      data-testid="hero-terminal"
      data-state={state}
      className="overflow-hidden rounded-panel border border-line bg-surface"
    >
      <Tabs value={active} onValueChange={(v) => setActive(v as SnippetLang)}>
        <div className="flex items-center justify-between gap-2 border-b border-line bg-surface-2 pr-2">
          <TabsList aria-label="Language">
            {panes.map((p) => (
              <TabsTrigger key={p.lang} value={p.lang}>
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <CopyButton key={current.lang} text={current.text} />
        </div>
        {panes.map((p) => (
          <TabsContent
            key={p.lang}
            value={p.lang}
            style={{ "--code-lines": codeLines } as CSSProperties}
            className="min-h-[calc(var(--code-lines)*var(--text-code)*var(--text-code--line-height)+2rem)] overflow-x-auto focus-visible:outline-offset-[-3px] md:min-h-[calc(var(--code-lines)*var(--text-code)*var(--text-code--line-height)+2.5rem)]"
          >
            {p.content}
          </TabsContent>
        ))}
      </Tabs>

      <div className="border-t border-line">
        <div className="flex h-10 items-center justify-between gap-3 px-4 md:px-5">
          <p className="label-mono flex min-w-0 items-center gap-2 text-fg-2">
            <span>Response</span>
            <span aria-hidden="true" className="hidden sm:inline">
              /
            </span>
            <span className="hidden truncate normal-case sm:inline">{heroDemo.modelSlug}</span>
          </p>
          <div className="flex shrink-0 items-center gap-1">
            <p className="label-mono flex items-center gap-2 text-fg-2">
              {live ? <StatusDot state="live" /> : null}
              {state === "done" ? <StatusDot state="ok" /> : null}
              {state === "done" ? `${STATUS.done} · ${frame?.tokens} tokens` : STATUS[state]}
            </p>
            {/* Always mounted (and focusable) so a keyboard user who presses it keeps
                focus; it is aria-disabled while the reply is playing. */}
            {!reduced ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={state === "done" ? replay : undefined}
                aria-disabled={state !== "done"}
                aria-label="Replay response"
                className="-mr-2 ml-1 text-fg-2 aria-disabled:cursor-default aria-disabled:opacity-40 aria-disabled:hover:bg-transparent aria-disabled:hover:text-fg-2"
              >
                <RotateCcw aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        </div>

        {/* The finished reply, read once by screen readers; the streaming copy is visual only. */}
        <p className="sr-only">{heroDemo.response}</p>
        <div
          ref={replyRef}
          aria-hidden="true"
          className="grid px-4 pb-5 font-mono text-code text-fg md:px-5 [&>*]:col-start-1 [&>*]:row-start-1"
        >
          {/* Invisible full reply: holds the final height so nothing below moves. */}
          <p className="invisible">{heroDemo.response}</p>
          <p data-testid="hero-response">
            {text}
            {state !== "done" ? (
              <span className="ml-px inline-block h-[1.1em] w-[0.6ch] translate-y-[0.2em] bg-fg-2 motion-safe:animate-caret" />
            ) : null}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-1 border-t border-line sm:grid-cols-3">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={cn(
              "flex items-baseline justify-between gap-2 px-4 py-3 sm:flex-col sm:items-start sm:py-3.5 md:px-5",
              i > 0 && "border-t border-line sm:border-t-0 sm:border-l",
            )}
          >
            <dt className="label-mono text-fg-2">{s.label}</dt>
            <dd className={cn(
                "font-mono text-ui leading-none whitespace-nowrap md:text-body md:leading-none",
                s.value ? "text-fg" : "text-fg-2",
              )}>
              {s.value ?? "—"}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
