"use client";

import Link from "next/link";
import { Menu, Sparkles } from "lucide-react";
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

const links = [
  { href: "/inspire", label: "Inspire" },
  { href: "/blog", label: "Blog" },
  { href: "/tutorials", label: "Tutorials" },
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
    <div className="min-h-screen overflow-x-clip bg-[#080809] text-white">
      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#080809]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-7">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-violet-600 shadow-lg shadow-violet-500/20">
              <Sparkles className="size-4" />
            </span>
            <span>Bellas Artes</span>
          </Link>
          <nav className="hidden flex-1 items-center gap-1 md:flex">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm transition",
                  pathname.startsWith(item.href)
                    ? "bg-violet-500/10 text-violet-200"
                    : "text-slate-500 hover:bg-white/[0.05] hover:text-white",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto hidden items-center gap-2 md:flex">
            {!authenticated && (
              <Button
                render={<Link href="/login" />}
                nativeButton={false}
                variant="ghost"
              >
                Entrar
              </Button>
            )}
            <Button
              render={<Link href="/dashboard" />}
              nativeButton={false}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
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
              className="border-white/10 bg-[#0d0d10] text-white"
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
                        className="rounded-xl border border-white/[0.07] px-4 py-3 text-sm text-slate-300"
                      />
                    }
                  >
                    {item.label}
                  </SheetClose>
                ))}
              </nav>
              <div className="mt-auto grid gap-2 p-4">
                {!authenticated && (
                  <SheetClose
                    nativeButton={false}
                    render={
                      <Link
                        href="/login"
                        className="rounded-lg border border-white/10 px-4 py-3 text-center text-sm"
                      />
                    }
                  >
                    Entrar
                  </SheetClose>
                )}
                <SheetClose
                  nativeButton={false}
                  render={
                    <Link
                      href="/dashboard"
                      className="rounded-lg bg-violet-600 px-4 py-3 text-center text-sm font-medium"
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
      <footer className="border-t border-white/[0.07] bg-[#0a0a0c]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-7 md:grid-cols-[1fr_auto]">
          <div>
            <p className="flex items-center gap-2 font-semibold">
              <Sparkles className="size-4 text-violet-300" /> Bellas Artes
            </p>
            <p className="mt-2 max-w-md text-xs leading-5 text-slate-600">
              Suite creativa de imagen, video y narrativa asistida por IA.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
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
