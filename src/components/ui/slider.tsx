"use client"

import { Slider as SliderPrimitive } from "@base-ui/react/slider"

import { cn } from "@/lib/utils"

function Slider({ className, value, defaultValue, min = 0, max = 100, ...props }: SliderPrimitive.Root.Props) {
  const values = Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min]
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn("w-full", className)}
      value={value}
      defaultValue={defaultValue}
      min={min}
      max={max}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50">
        <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-muted">
          <SliderPrimitive.Indicator className="h-full bg-primary" />
        </SliderPrimitive.Track>
        {values.map((_, index) => (
          <SliderPrimitive.Thumb key={index} className="relative block size-3.5 shrink-0 rounded-full border border-violet-300 bg-white ring-violet-400/30 after:absolute after:-inset-2 hover:ring-4 focus-visible:ring-4 focus-visible:outline-none" />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
