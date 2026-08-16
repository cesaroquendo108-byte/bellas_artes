"use client";

import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";

import { AnimatedMetric, StatusPill } from "@/components/ui/motion-effects";
import { SidebarTrigger } from "@/components/ui/sidebar";

const routeLabels: Array<[string, string]> = [
  ["/dashboard", "Inicio"],
  ["/image", "Estudio de imágenes"],
  ["/video", "Suite de video"],
  ["/audio", "Suite de audio"],
  ["/director", "Director"],
  ["/story", "Historias"],
  ["/characters-and-worlds", "Personajes y mundos"],
  ["/characters", "Personajes"],
  ["/world", "Mundos"],
  ["/brand-kits", "Kits de marca"],
  ["/media", "Centro de medios"],
  ["/assets", "Biblioteca"],
  ["/credits", "Créditos"],
  ["/billing", "Planes y créditos"],
  ["/settings", "Ajustes"],
];

function currentLabel(pathname: string) {
  return routeLabels.find(([href]) => pathname === href || pathname.startsWith(`${href}/`))?.[1] ?? "Mi estudio";
}

export function WorkspaceHeader({
  balance,
  unlimited,
}: {
  balance: number;
  unlimited: boolean;
}) {
  const pathname = usePathname();
  const label = currentLabel(pathname);

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-[#e6ded1] bg-[#f7f4ec]/88 px-3 backdrop-blur-xl sm:px-6">
      <SidebarTrigger className="size-9 rounded-xl text-[#6f6878] hover:bg-white hover:text-[#5b21b6]" />
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 md:hidden">
          <Sparkles className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="hidden truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-700 min-[420px]:block">Bellas Artes</p>
          <p className="truncate text-sm font-semibold text-[#241f2e]">{label}</p>
        </div>
      </div>
      <div className="flex-1" />
      <StatusPill state="Acceso anticipado" tone="info" className="hidden lg:inline-flex" />
      <div className="rounded-full border border-violet-200 bg-white/80 px-3 py-1.5 text-xs text-[#6f6878] shadow-sm">
        {unlimited ? (
          <span className="font-semibold text-violet-700">Ilimitados</span>
        ) : (
          <><span className="font-semibold text-violet-700"><AnimatedMetric value={balance} /></span><span className="hidden sm:inline"> créditos</span></>
        )}
      </div>
    </header>
  );
}
