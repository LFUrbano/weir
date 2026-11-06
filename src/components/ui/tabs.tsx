"use client"

import * as React from "react"
import { Tabs as TabsPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn("group/tabs flex flex-col", className)}
      {...props}
    />
  )
}

// Line tabs: mono labels with a 2px amber rule under the active one.
function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn("flex items-stretch", className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-11 items-center justify-center rounded-none border-0 bg-transparent px-4 font-mono text-[0.8125rem] whitespace-nowrap text-fg-2 transition-colors duration-150 select-none hover:text-fg disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-fg",
        "after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-amber after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100",
        // Focus ring comes from the global amber :focus-visible; keep it inside the bar.
        "focus-visible:outline-offset-[-4px]",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("min-w-0 flex-1", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
