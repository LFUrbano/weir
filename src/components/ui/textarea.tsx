import * as React from "react"
import { cn } from "@/lib/utils"

// Focus uses the global amber :focus-visible outline (no outline-none here).
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-28 w-full rounded-md border border-line-strong bg-surface px-3 py-2.5 text-[0.9375rem] leading-relaxed text-fg transition-colors duration-150 placeholder:text-fg-2 hover:border-[color-mix(in_oklab,var(--color-line-strong),white_10%)] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-err md:text-small",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
