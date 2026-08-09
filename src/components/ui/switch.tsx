"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "group/switch relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent bg-input outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 data-checked:bg-primary data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-4 rounded-full bg-white transition-transform group-data-checked/switch:translate-x-[18px] group-data-unchecked/switch:translate-x-0.5" />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
