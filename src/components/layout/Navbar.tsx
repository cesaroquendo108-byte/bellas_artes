"use client"

import Link from "next/link"
import { Menu } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { BellasArtesMark, BellasArtesWordmark } from "@/components/brand/bellas-artes-mark"

const links = [
  { href: "/inspire", label: "Inspiración" },
  { href: "/blog", label: "Blog" },
  { href: "/tutorials", label: "Tutoriales" },
  { href: "/mcp", label: "MCP" },
]

export function Navbar() {
  return (
    <nav className="ba-public-header fixed inset-x-0 top-0 z-50 flex h-16 items-center border-b border-[#dce6f2] bg-white/90 px-4 backdrop-blur-xl md:px-6">
      <Link href="/" className="flex items-center gap-2">
        <BellasArtesMark className="size-9 rounded-xl" />
        <span className="hidden text-xl sm:block"><BellasArtesWordmark /></span>
      </Link>

      <div className="ml-8 hidden items-center gap-1 md:flex">
        {links.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 text-sm text-[#5d7088] transition hover:bg-[#e7f1fb] hover:text-[#084f92]">
            {item.label}
          </Link>
        ))}
      </div>

      <div className="ml-auto hidden items-center gap-2 md:flex">
        <Button render={<Link href="/" />} nativeButton={false} variant="ghost">Inicio</Button>
        <Button render={<Link href="/dashboard" />} nativeButton={false} className="bg-[#0b72ce] text-white hover:bg-[#084f92]">Abrir estudio</Button>
      </div>

      <Sheet>
        <SheetTrigger render={<Button variant="ghost" size="icon" className="ml-auto md:hidden" />}>
          <Menu />
          <span className="sr-only">Abrir navegación</span>
        </SheetTrigger>
        <SheetContent side="right" className="border-[#dce6f2] bg-white text-[#172740]">
          <SheetHeader><SheetTitle>Navegación</SheetTitle></SheetHeader>
          <div className="flex flex-col gap-2 px-4">
            {links.map((item) => (
              <SheetClose key={item.href} nativeButton={false} render={<Link href={item.href} className="rounded-xl border border-[#dce6f2] px-4 py-3 text-sm" />}>
                {item.label}
              </SheetClose>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  )
}
