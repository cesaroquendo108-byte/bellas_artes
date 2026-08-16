"use client";

import { usePathname } from "next/navigation";

import { AnimatedMetric, StatusPill } from "@/components/ui/motion-effects";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { BellasArtesMark } from "@/components/brand/bellas-artes-mark";

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
    <header className="ba-workspace-header sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-[#dce6f2] bg-white/90 px-3 backdrop-blur-xl sm:px-6">
      <SidebarTrigger className="size-9 rounded-xl text-[#5d7088] hover:bg-[#e7f1fb] hover:text-[#084f92]" />
      <div className="flex min-w-0 items-center gap-2.5">
        <BellasArtesMark className="size-8 rounded-xl md:hidden" />
        <div className="min-w-0">
          <p className="hidden truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0b72ce] min-[420px]:block">Bellas Artes</p>
          <p className="truncate text-sm font-semibold text-[#172740]">{label}</p>
        </div>
      </div>
      <div className="flex-1" />
      <StatusPill state="Acceso anticipado" tone="info" className="hidden lg:inline-flex" />
      <div className="rounded-full border border-[#b9d8f3] bg-white/90 px-3 py-1.5 text-xs text-[#5d7088] shadow-sm">
        {unlimited ? (
          <span className="font-semibold text-[#084f92]">Ilimitados</span>
        ) : (
          <><span className="font-semibold text-[#084f92]"><AnimatedMetric value={balance} /></span><span className="hidden sm:inline"> créditos</span></>
        )}
      </div>
    </header>
  );
}
