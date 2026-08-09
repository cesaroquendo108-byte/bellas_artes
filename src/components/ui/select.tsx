"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "@base-ui/react/select"
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const Select = SelectPrimitive.Root

function SelectValue({ className, ...props }: SelectPrimitive.Value.Props) {
  return <SelectPrimitive.Value data-slot="select-value" className={cn("flex flex-1 text-left", className)} {...props} />
}

function SelectTrigger({ className, children, ...props }: SelectPrimitive.Trigger.Props) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "flex h-9 w-fit items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon render={<ChevronDownIcon className="size-4 text-muted-foreground" />} />
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  ...props
}: SelectPrimitive.Popup.Props & Pick<SelectPrimitive.Positioner.Props, "align" | "side" | "sideOffset">) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner side={side} sideOffset={sideOffset} align={align} className="isolate z-[70]">
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            "max-h-(--available-height) w-(--anchor-width) min-w-36 overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-xl ring-1 ring-white/10 duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
            className
          )}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectItem({ className, children, ...props }: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex cursor-default items-center rounded-md py-2 pr-8 pl-2 text-sm outline-none select-none focus:bg-accent data-disabled:pointer-events-none data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex-1 whitespace-nowrap">{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator render={<span className="absolute right-2 flex size-4 items-center justify-center" />}>
        <CheckIcon className="size-4" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

function SelectScrollUpButton(props: SelectPrimitive.ScrollUpArrow.Props) {
  return <SelectPrimitive.ScrollUpArrow className="flex justify-center py-1" {...props}><ChevronUpIcon className="size-4" /></SelectPrimitive.ScrollUpArrow>
}

function SelectScrollDownButton(props: SelectPrimitive.ScrollDownArrow.Props) {
  return <SelectPrimitive.ScrollDownArrow className="flex justify-center py-1" {...props}><ChevronDownIcon className="size-4" /></SelectPrimitive.ScrollDownArrow>
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }
