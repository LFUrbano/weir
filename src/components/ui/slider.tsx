"use client"

import * as React from "react"
import { Slider as SliderPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

type ThumbProps = Omit<React.ComponentProps<typeof SliderPrimitive.Thumb>, "className">

/**
 * One-thumb slider. `thumb` carries the accessible name and value text, since
 * the thumb is the element with role="slider". Focus uses the global amber
 * :focus-visible outline (no outline-none or ring here).
 */
function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  thumb,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & { thumb?: ThumbProps }) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex h-6 w-full cursor-pointer touch-none items-center select-none data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative h-1 grow overflow-hidden rounded-full bg-line-strong"
      >
        <SliderPrimitive.Range data-slot="slider-range" className="absolute h-full bg-fg-2" />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          {...thumb}
          className="relative block size-4 shrink-0 rounded-full border-2 border-canvas bg-fg transition-colors duration-150 after:absolute after:-inset-2.5 focus-visible:outline-offset-2 disabled:pointer-events-none"
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
