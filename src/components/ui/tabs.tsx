"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Tabs with the WAI-ARIA tabs pattern and nothing more: roles, aria-selected,
 * aria-controls / aria-labelledby, a roving tabindex, Left/Right (looping),
 * Home/End, and automatic activation (a tab is selected when it takes focus,
 * from a key or a press; Enter and Space select too). Same markup and
 * data-state hooks as the Radix primitive they replace, whose collection,
 * roving-focus group and presence machinery cost a phone tens of milliseconds
 * per panel at hydration. Inactive panels stay in the DOM, hidden and empty,
 * so every aria-controls points at an element.
 */

type Orientation = "horizontal" | "vertical"

type TabsContextValue = {
  baseId: string
  value: string
  orientation: Orientation
  select: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

function useTabs(part: string) {
  const ctx = React.useContext(TabsContext)
  if (!ctx) throw new Error(`${part} must be inside <Tabs>`)
  return ctx
}

/** Keeps ids valid whatever the value holds ("c++", "node 20"). */
function idFor(baseId: string, part: "trigger" | "content", value: string) {
  return `${baseId}-${part}-${value.replace(/[^\w-]/g, "_")}`
}

function Tabs({
  className,
  orientation = "horizontal",
  value: valueProp,
  defaultValue,
  onValueChange,
  ...props
}: Omit<React.ComponentProps<"div">, "defaultValue" | "dir"> & {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  orientation?: Orientation
}) {
  const baseId = React.useId()
  const [own, setOwn] = React.useState(defaultValue ?? "")
  const value = valueProp ?? own
  const select = React.useCallback(
    (next: string) => {
      if (next === value) return
      if (valueProp === undefined) setOwn(next)
      onValueChange?.(next)
    },
    [value, valueProp, onValueChange]
  )
  const ctx = React.useMemo(
    () => ({ baseId, value, orientation, select }),
    [baseId, value, orientation, select]
  )

  return (
    <TabsContext.Provider value={ctx}>
      <div
        dir="ltr"
        data-slot="tabs"
        data-orientation={orientation}
        className={cn("group/tabs flex flex-col", className)}
        {...props}
      />
    </TabsContext.Provider>
  )
}

const NEXT_KEY = { horizontal: "ArrowRight", vertical: "ArrowDown" } as const
const PREV_KEY = { horizontal: "ArrowLeft", vertical: "ArrowUp" } as const

// Line tabs: mono labels with a 2px amber rule under the active one.
function TabsList({
  className,
  onKeyDown,
  ...props
}: React.ComponentProps<"div">) {
  const { orientation } = useTabs("TabsList")

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event)
    if (event.defaultPrevented) return
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
    const list = event.currentTarget
    const ownTabs = Array.from(
      list.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)')
    ).filter((tab) => tab.closest('[role="tablist"]') === list)
    const at = ownTabs.indexOf(event.target as HTMLButtonElement)
    if (at === -1) return
    let to: number
    if (event.key === NEXT_KEY[orientation]) to = (at + 1) % ownTabs.length
    else if (event.key === PREV_KEY[orientation]) to = (at - 1 + ownTabs.length) % ownTabs.length
    else if (event.key === "Home" || event.key === "PageUp") to = 0
    else if (event.key === "End" || event.key === "PageDown") to = ownTabs.length - 1
    else return
    event.preventDefault()
    // Focus selects the tab (automatic activation).
    ownTabs[to].focus()
  }

  return (
    <div
      role="tablist"
      aria-orientation={orientation}
      data-slot="tabs-list"
      data-orientation={orientation}
      className={cn("flex items-stretch", className)}
      onKeyDown={handleKeyDown}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  value,
  disabled,
  onMouseDown,
  onKeyDown,
  onFocus,
  ...props
}: Omit<React.ComponentProps<"button">, "value"> & { value: string }) {
  const { baseId, value: selected, orientation, select } = useTabs("TabsTrigger")
  const active = value === selected

  return (
    <button
      type="button"
      role="tab"
      id={idFor(baseId, "trigger", value)}
      aria-selected={active}
      aria-controls={idFor(baseId, "content", value)}
      data-state={active ? "active" : "inactive"}
      data-orientation={orientation}
      data-disabled={disabled ? "" : undefined}
      disabled={disabled}
      // Roving tabindex: Tab enters the list on the selected tab and leaves it
      // on the next press; the arrows move between tabs.
      tabIndex={active ? 0 : -1}
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-11 items-center justify-center rounded-none border-0 bg-transparent px-4 font-mono text-meta whitespace-nowrap text-fg-2 transition-colors duration-150 select-none hover:text-fg disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-fg",
        "after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-amber after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100",
        // Focus ring comes from the global amber :focus-visible; keep it inside the bar.
        "focus-visible:outline-offset-[-4px]",
        className
      )}
      onMouseDown={(event) => {
        onMouseDown?.(event)
        if (event.defaultPrevented || disabled) return
        // The main button selects on press; any other (a context menu, a
        // middle click) neither selects nor takes focus.
        if (event.button === 0 && !event.ctrlKey) select(value)
        else event.preventDefault()
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (event.defaultPrevented || disabled) return
        if (event.key === "Enter" || event.key === " ") select(value)
      }}
      onFocus={(event) => {
        onFocus?.(event)
        if (event.defaultPrevented || disabled) return
        select(value)
      }}
      {...props}
    />
  )
}

function TabsContent({
  className,
  value,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "value"> & { value: string }) {
  const { baseId, value: selected, orientation } = useTabs("TabsContent")
  const active = value === selected

  return (
    <div
      role="tabpanel"
      id={idFor(baseId, "content", value)}
      aria-labelledby={idFor(baseId, "trigger", value)}
      hidden={!active}
      tabIndex={0}
      data-state={active ? "active" : "inactive"}
      data-orientation={orientation}
      data-slot="tabs-content"
      className={cn("min-w-0 flex-1", className)}
      {...props}
    >
      {active ? children : null}
    </div>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
