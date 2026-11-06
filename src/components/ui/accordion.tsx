"use client"

import * as React from "react"
import { Accordion as AccordionPrimitive } from "radix-ui"
import { ChevronDownIcon } from "lucide-react"
import { cn } from "@/lib/utils"

function Accordion({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn("flex w-full flex-col", className)}
      {...props}
    />
  )
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("border-b border-line", className)}
      {...props}
    />
  )
}

// Focus uses the global amber :focus-visible outline (no outline-none or ring here).
function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "group/accordion-trigger flex flex-1 cursor-pointer items-start justify-between gap-6 py-5 text-left text-lede font-medium text-fg transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon
          aria-hidden="true"
          className="pointer-events-none mt-1 size-4 shrink-0 text-fg-2 transition-[color,rotate] duration-200 group-hover/accordion-trigger:text-fg group-aria-expanded/accordion-trigger:rotate-180"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

/**
 * Always mounted (`forceMount`), so every answer is in the static HTML for
 * search engines and for readers without JavaScript. Closed answers collapse
 * to zero height and turn invisible, which also takes them out of the
 * accessibility tree and the tab order.
 */
function AccordionContent({
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof AccordionPrimitive.Content>, "forceMount">) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      forceMount
      className="grid grid-rows-[0fr] transition-[grid-template-rows,visibility] duration-200 ease-out-quart data-[state=closed]:invisible data-[state=open]:grid-rows-[1fr]"
      {...props}
    >
      <div className="min-h-0 overflow-hidden">
        <div className={cn("pb-6 text-fg-2", className)}>{children}</div>
      </div>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
