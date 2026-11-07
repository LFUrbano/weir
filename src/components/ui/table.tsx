import * as React from "react"
import { cn } from "@/lib/utils"

// No overflow wrapper: an overflow container would trap `position: sticky`
// on the header row, and Weir tables are laid out to fit instead of scrolling
// sideways. Lines sit on the cells (border-separate) so they stick with the
// header.
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <table
      data-slot="table"
      className={cn(
        "w-full border-separate border-spacing-0 caption-bottom text-small",
        className
      )}
      {...props}
    />
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead data-slot="table-header" className={className} {...props} />
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={className} {...props} />
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("bg-surface font-medium", className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "transition-colors duration-150 data-[state=selected]:bg-surface-2",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "label-mono h-11 border-b border-line-strong px-3 text-left align-middle whitespace-nowrap text-fg-2 first:pl-0 last:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "border-b border-line px-3 align-middle first:pl-0 last:pr-0",
        className
      )}
      {...props}
    />
  )
}

/**
 * The cell that names its row (a model, a GPU): a <th scope="row">, so a
 * screen reader announces it with each value in the row. Styled like a body
 * cell.
 */
function TableRowHeader({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-row-header"
      scope="row"
      className={cn(
        "border-b border-line px-3 text-left align-middle font-normal first:pl-0 last:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-small text-fg-2", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableRowHeader,
  TableCaption,
}
