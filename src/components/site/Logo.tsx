import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * The mark is a weir in section: the water level upstream, the crest, and the
 * lower level downstream. It reads as a step, which is what the router does to
 * a burst of traffic.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 16"
      fill="none"
      aria-hidden="true"
      className={cn("h-4 w-5 shrink-0", className)}
    >
      <path d="M1 4.25H9.25V12.75H19" stroke="currentColor" strokeWidth="1.75" strokeLinecap="square" />
      <path d="M12.5 15.25H19" stroke="var(--color-amber)" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Weir home"
      className={cn(
        "group inline-flex items-center gap-2 rounded-sm text-fg outline-offset-4",
        className,
      )}
    >
      <LogoMark className="transition-transform duration-300 ease-out-quart group-hover:translate-y-px" />
      <span className="font-display text-[1.3125rem] leading-none font-semibold tracking-[-0.035em]">
        weir
      </span>
    </Link>
  );
}
