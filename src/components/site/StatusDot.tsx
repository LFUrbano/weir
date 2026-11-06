import { cn } from "@/lib/utils";

/** ok: healthy. live: streaming right now. error: a failed request (the 404). */
export type StatusState = "ok" | "live" | "error";

const tone: Record<StatusState, string> = {
  ok: "bg-ok",
  live: "bg-amber",
  error: "bg-err",
};

/**
 * A status LED. "live" pulses, the others hold still. The pulse is turned off
 * by the global reduced-motion rule. Pass `label` when no visible text next to
 * the dot says what it means.
 */
export function StatusDot({
  state,
  label,
  className,
}: {
  state: StatusState;
  label?: string;
  className?: string;
}) {
  return (
    <span
      data-state={state}
      className={cn("relative inline-flex size-2 shrink-0", className)}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      {state === "live" && (
        <span
          className={cn(
            "absolute inset-0 rounded-full opacity-60 motion-safe:animate-ping",
            tone[state],
          )}
        />
      )}
      <span className={cn("relative inline-flex size-2 rounded-full", tone[state])} />
    </span>
  );
}
