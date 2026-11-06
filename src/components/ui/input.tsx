import * as React from "react"
import { cn } from "@/lib/utils"

// Focus uses the global amber :focus-visible outline (no outline-none here).
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-line-strong bg-surface px-3 text-ui text-fg transition-colors duration-150 placeholder:text-fg-2 hover:border-[color-mix(in_oklab,var(--color-line-strong),white_10%)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-err md:text-small [&::-webkit-search-cancel-button]:appearance-none",
        className
      )}
      {...props}
    />
  )
}

export { Input }
