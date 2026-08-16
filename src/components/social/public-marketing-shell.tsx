"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { BellasArtesMark, BellasArtesWordmark } from "@/components/brand/bellas-artes-mark";

const links = [
  { href: "/inspire", label: "Inspiración" },
  { href: "/blog", label: "Blog" },
  { href: "/tutorials", label: "Tutoriales" },
  { href: "/mcp", label: "MCP" },
];

export function PublicMarketingShell({
  children,
  authenticated = false,
}: {
  children: React.ReactNode;
  authenticated?: boolean;
}) {
  const pathname = usePathname();
  return (
    <div className="ba-public-shell min-h-screen overflow-x-clip bg-[#f2f6fb] text-[#172740]">
      <header className="ba-public-header sticky top-0 z-50 border-b border-[#dce6f2] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-7">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <BellasArtesMark className="size-8 rounded-lg" />
            <BellasArtesWordmark />
          </Link>
          <nav className="hidden flex-1 items-center gap-1 md:flex">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm transition",
                  pathname.startsWith(item.href)
                    ? "bg-[#e7f1fb] text-[#084f92]"
                    : "text-[#5d7088] hover:bg-[#f2f6fb] hover:text-[#172740]",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto hidden items-center gap-2 md:flex">
            {!authenticated && <Button render={<Link href="/login" />} nativeButton={false} variant="ghost" className="text-[#46586f] hover:bg-[#e7f1fb] hover:text-[#172740]">Entrar</Button>}
            <Button
              render={<Link href="/dashboard" />}
              nativeButton={false}
              className="bg-[#0b72ce] text-white hover:bg-[#084f92]"
            >
              {authenticated ? "Volver al estudio" : "Abrir estudio"}
            </Button>
          </div>
          <Sheet>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto md:hidden"
                />
              }
            >
              <Menu />
              <span className="sr-only">Abrir navegación</span>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="border-[#dce6f2] bg-white text-[#172740]"
            >
              <SheetHeader>
                <SheetTitle>Navegación</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-2 px-4">
                {links.map((item) => (
                  <SheetClose
                    key={item.href}
                    nativeButton={false}
                    render={
                      <Link
                        href={item.href}
                        className="rounded-xl border border-[#dce6f2] px-4 py-3 text-sm text-[#46586f]"
                      />
                    }
                  >
                    {item.label}
                  </SheetClose>
                ))}
              </nav>
              <div className="mt-auto grid gap-2 p-4">
                {!authenticated && <SheetClose nativeButton={false} render={<Link href="/login" className="rounded-lg border border-[#dce6f2] px-4 py-3 text-center text-sm text-[#46586f]" />}>Entrar</SheetClose>}
                <SheetClose
                  nativeButton={false}
                  render={
                    <Link
                      href="/dashboard"
                      className="rounded-lg bg-[#0b72ce] px-4 py-3 text-center text-sm font-medium text-white"
                    />
                  }
                >
                  {authenticated ? "Volver al estudio" : "Abrir estudio"}
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <main>{children}</main>
      <footer className="ba-public-footer border-t border-white/10 bg-[#16305e]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-7 md:grid-cols-[1fr_auto]">
          <div>
            <p className="flex items-center gap-2 font-semibold">
              <BellasArtesMark inverse className="size-8 rounded-lg" /> <BellasArtesWordmark inverse />
            </p>
            <p className="mt-2 max-w-md text-xs leading-5 text-white/65">
              Suite creativa de imagen, video y narrativa nacida en Venezuela.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/70">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="hover:text-white"
              >
                {item.label}
              </Link>
            ))}
            <Link href="/privacy" className="hover:text-white">
              Privacidad
            </Link>
            <Link href="/terms" className="hover:text-white">
              Términos
            </Link>
            <Link href="/login" className="hover:text-white">
              Cuenta
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
