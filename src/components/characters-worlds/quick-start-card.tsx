import Link from "next/link"
import type { LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface QuickStartItem {
  title: string
  description: string
  href?: string
  icon: LucideIcon
  gradient: string
  isNew?: boolean
}

export function QuickStartCard({ item, className }: { item: QuickStartItem; className?: string }) {
  const Icon = item.icon
  const content = (
    <>
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-65 transition duration-500 group-hover:scale-110 group-hover:opacity-90", item.gradient)} />
      <Icon className="absolute top-4 left-4 size-6 text-white/90" />
      {item.isNew && <Badge className="absolute top-3 right-3 bg-violet-600 text-[9px] text-white">New</Badge>}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/75 to-transparent p-3 pt-10">
        <p className="text-xs font-semibold text-white">{item.title}</p>
        <p className="mt-1 line-clamp-2 text-[9px] leading-4 text-slate-400">{item.description}</p>
        {!item.href && <span className="mt-1 block text-[9px] text-violet-300">Próximamente</span>}
      </div>
    </>
  )
  const classes = cn("group relative aspect-square overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121214] transition hover:-translate-y-1 hover:border-violet-400/40 hover:shadow-xl hover:shadow-violet-950/30", !item.href && "opacity-60", className)
  return item.href ? <Link href={item.href} className={classes}>{content}</Link> : <div aria-disabled="true" className={classes}>{content}</div>
}
