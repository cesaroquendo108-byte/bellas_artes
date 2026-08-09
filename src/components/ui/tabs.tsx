"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"

import { cn } from "@/lib/utils"

function Tabs({ className, orientation = "horizontal", ...props }: TabsPrimitive.Root.Props) {
  return <TabsPrimitive.Root data-slot="tabs" data-orientation={orientation} className={cn("flex gap-2 data-horizontal:flex-col", className)} {...props} />
}

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return <TabsPrimitive.List data-slot="tabs-list" className={cn("inline-flex h-9 items-center rounded-lg bg-muted p-1 text-muted-foreground", className)} {...props} />
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-medium whitespace-nowrap text-muted-foreground transition-all outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 data-active:bg-background data-active:text-foreground data-active:shadow-sm",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return <TabsPrimitive.Panel data-slot="tabs-content" className={cn("flex-1 outline-none", className)} {...props} />
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
