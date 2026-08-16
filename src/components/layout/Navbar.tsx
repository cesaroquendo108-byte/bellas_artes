"use client"

import Link from "next/link"
import { Menu, Paintbrush } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

const links = [
  { href: "/inspire", label: "Inspiración" },
  { href: "/blog", label: "Blog" },
  { href: "/tutorials", label: "Tutoriales" },
  { href: "/mcp", label: "MCP" },
]

export function Navbar() {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 flex h-16 items-center border-b border-white/[0.07] bg-black/90 px-4 backdrop-blur-xl md:px-6">
      <Link href="/" className="flex items-center gap-2">
        <span className="rounded-xl bg-violet-500/15 p-2">
          <Paintbrush className="size-5 text-violet-300" />
        </span>
        <span className="hidden text-xl font-bold tracking-tight text-white sm:block">
          Bellas <span className="text-violet-300">Artes</span>
        </span>
      </Link>

      <div className="ml-8 hidden items-center gap-1 md:flex">
        {links.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 text-sm text-slate-500 transition hover:bg-white/[0.05] hover:text-white">
            {item.label}
          </Link>
        ))}
      </div>

      <div className="ml-auto hidden items-center gap-2 md:flex">
        <Button render={<Link href="/" />} nativeButton={false} variant="ghost">Inicio</Button>
        <Button render={<Link href="/dashboard" />} nativeButton={false} className="bg-violet-600 text-white">Abrir estudio</Button>
      </div>

      <Sheet>
        <SheetTrigger render={<Button variant="ghost" size="icon" className="ml-auto md:hidden" />}>
          <Menu />
          <span className="sr-only">Abrir navegación</span>
        </SheetTrigger>
        <SheetContent side="right" className="border-white/10 bg-[#0d0d10] text-white">
          <SheetHeader><SheetTitle>Navegación</SheetTitle></SheetHeader>
          <div className="flex flex-col gap-2 px-4">
            {links.map((item) => (
              <SheetClose key={item.href} nativeButton={false} render={<Link href={item.href} className="rounded-xl border border-white/[0.07] px-4 py-3 text-sm" />}>
                {item.label}
              </SheetClose>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  )
}
