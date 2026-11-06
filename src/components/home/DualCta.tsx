import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { primaryCta } from "@/data/site";
import { cn } from "@/lib/utils";

/**
 * The two ways in, each with one line saying who it is for. Used in the hero
 * and again at the end of the page.
 */
export function DualCta({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-[auto_auto] sm:justify-start", className)}>
      <div>
        <Link href={primaryCta.href} className={buttonVariants({ size: "lg" })}>
          {primaryCta.label}
        </Link>
        <p className="mt-3 text-small text-fg-2">
          <span className="block text-fg">For developers</span>
          $5 in credit, no card
        </p>
      </div>
      <div>
        <Link href="/enterprise/" className={buttonVariants({ variant: "outline", size: "lg" })}>
          Talk to an engineer
        </Link>
        <p className="mt-3 text-small text-fg-2">
          <span className="block text-fg">For teams at scale</span>
          Dedicated GPUs, SLA, SSO
        </p>
      </div>
    </div>
  );
}
