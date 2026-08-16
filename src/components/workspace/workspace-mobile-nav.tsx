"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Liquid } from "liquid-gooey";
import {
  BookOpen,
  Boxes,
  Clapperboard,
  FolderOpen,
  Gauge,
  Globe2,
  Grid2X2Plus,
  Image as ImageIcon,
  MoreHorizontal,
  Palette,
  PanelsTopLeft,
  Settings,
  Sparkles,
  UsersRound,
  Video,
  Volume2,
  WalletCards,
} from "lucide-react";

import { MobileBottomSheet } from "@/components/workspace/mobile-bottom-sheet";
import { cn } from "@/lib/utils";

type MobileNavProps = { role: "user" | "admin" };

const createItems = [
  { label: "Imagen", href: "/image", icon: ImageIcon, detail: "Flux Schnell · Admin Preview" },
  { label: "Video", href: "/video", icon: Video, detail: "Workflows en preparación" },
  { label: "Audio", href: "/audio/my", icon: Volume2, detail: "TTS y Voice Changer" },
  { label: "Director", href: "/director", icon: Clapperboard, detail: "Historias y escenas" },
  { label: "Personajes", href: "/characters", icon: UsersRound, detail: "Consistencia visual" },
  { label: "Mundos", href: "/world", icon: Globe2, detail: "Bibliotecas visuales" },
];

const moreItems = [
  { label: "Personajes y mundos", href: "/characters-and-worlds", icon: Boxes },
  { label: "Kits de marca", href: "/brand-kits", icon: Palette },
  { label: "Créditos", href: "/credits", icon: WalletCards },
  { label: "Ajustes", href: "/settings", icon: Settings },
  { label: "Historias", href: "/story", icon: BookOpen },
];

export function WorkspaceMobileNav({ role }: MobileNavProps) {
  const pathname = usePathname();
  const [createOpen, setCreateOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const creating = createItems.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  const directItems = [
    { label: "Inicio", href: "/dashboard", icon: Gauge, active: pathname === "/dashboard" },
    { label: "Biblioteca", href: "/assets", icon: FolderOpen, active: pathname.startsWith("/assets") || pathname.startsWith("/media") },
    { label: "Proyectos", href: "/director/projects", icon: PanelsTopLeft, active: pathname.startsWith("/director/projects") || pathname.startsWith("/story/my") },
  ];

  return (
    <>
      <nav aria-label="Navegación principal móvil" className="fixed inset-x-0 bottom-0 z-50 border-t border-[#e2d9cb] bg-[#fffdf8]/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_34px_rgba(64,48,77,.08)] backdrop-blur-xl md:hidden">
        <div className="mx-auto grid h-[4.5rem] max-w-lg grid-cols-5 items-center">
          <MobileLink {...directItems[0]} />
          <button type="button" onClick={() => setCreateOpen(true)} className={navClass(creating)} aria-current={creating ? "page" : undefined}>
            <span className={cn("flex size-9 items-center justify-center rounded-2xl", creating ? "bg-violet-100 text-violet-700" : "text-[#7d7483]")}><Grid2X2Plus className="size-4.5" /></span>
            <span>Crear</span>
          </button>
          <MobileLink {...directItems[1]} />
          <MobileLink {...directItems[2]} />
          <button type="button" onClick={() => setMoreOpen(true)} className={navClass(false)}>
            <span className="flex size-9 items-center justify-center rounded-2xl text-[#7d7483]"><MoreHorizontal className="size-4.5" /></span>
            <span>Más</span>
          </button>
        </div>
      </nav>

      <MobileBottomSheet open={createOpen} onOpenChange={setCreateOpen} title="¿Qué quieres crear?" description="Cada estudio conserva tus permisos y el estado real del workflow.">
        <Liquid
          blur={8}
          contrast={22}
          fill="#ffffff"
          filterPadding={20}
          shadow="0 4px 16px rgba(64, 48, 77, .08)"
          className="grid grid-cols-2 gap-3"
        >
          {createItems.map(({ label, href, icon: Icon, detail }) => (
            <Liquid.Item key={href} morph={{ shape: true, bounce: 0.25, contentBlur: 0 }} className="min-w-0">
              <Link
                href={href}
                onClick={() => setCreateOpen(false)}
                className="block rounded-2xl border border-[#e6ded1] bg-transparent p-4 shadow-sm outline-none transition hover:border-violet-200 active:scale-[.98] focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffdf8] motion-reduce:transform-none motion-reduce:transition-none"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Icon className="size-4.5" /></span>
                <span className="mt-4 block text-sm font-semibold text-[#241f2e]">{label}</span>
                <span className="mt-1 block text-[10px] leading-4 text-[#817887]">{detail}</span>
              </Link>
            </Liquid.Item>
          ))}
        </Liquid>
      </MobileBottomSheet>

      <MobileBottomSheet open={moreOpen} onOpenChange={setMoreOpen} title="Más de tu estudio" description="Organiza tu identidad, tu cuenta y las áreas complementarias.">
        <div className="space-y-2">
          {moreItems.map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href} onClick={() => setMoreOpen(false)} className="flex items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-sm font-medium text-[#3b3344] transition hover:border-[#e6ded1] hover:bg-white">
              <span className="flex size-9 items-center justify-center rounded-xl bg-[#f0e9ff] text-violet-700"><Icon className="size-4" /></span>
              {label}
            </Link>
          ))}
          {role === "admin" ? (
            <Link href="/admin" onClick={() => setMoreOpen(false)} className="mt-3 flex items-center gap-3 rounded-2xl bg-[#241f2e] px-4 py-3 text-sm font-semibold text-white">
              <Sparkles className="size-4 text-violet-300" /> Abrir administración
            </Link>
          ) : null}
        </div>
      </MobileBottomSheet>
    </>
  );
}

function navClass(active: boolean) {
  return cn("flex min-w-0 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition motion-reduce:transition-none", active ? "text-violet-700" : "text-[#7d7483]");
}

function MobileLink({ label, href, icon: Icon, active }: { label: string; href: string; icon: typeof Gauge; active: boolean }) {
  return (
    <Link href={href} className={navClass(active)} aria-current={active ? "page" : undefined}>
      <span className={cn("flex size-9 items-center justify-center rounded-2xl", active ? "bg-violet-100 text-violet-700" : "text-[#7d7483]")}><Icon className="size-4.5" /></span>
      <span className="truncate">{label}</span>
    </Link>
  );
}
