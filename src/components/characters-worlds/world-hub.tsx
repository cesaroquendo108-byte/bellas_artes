"use client";

import {
  Camera,
  Castle,
  Globe2,
  SearchX,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { AssetFilterToolbar } from "./asset-filter-toolbar";
import { QuickStartCard, type QuickStartItem } from "./quick-start-card";
import type { LibraryFilter, LibraryStateProps } from "./types";
import { WorldBuilder } from "./world-builder";
import { WorldCard } from "./world-card";

const quickStarts: QuickStartItem[] = [
  {
    title: "Explorar biblioteca",
    description: "Explora entornos guardados",
    href: "/world",
    icon: Globe2,
    gradient: "from-emerald-700 to-cyan-800",
  },
  {
    title: "Crear mundo",
    description: "Diseña un entorno por descripción",
    href: "/world?mode=create",
    icon: Castle,
    gradient: "from-blue-600 to-violet-700",
    isNew: true,
  },
  {
    title: "Cámara 3D del mundo",
    description: "Navegación espacial inmersiva",
    icon: Camera,
    gradient: "from-violet-700 to-fuchsia-800",
  },
  {
    title: "Reparto en escena",
    description: "Inserta personajes consistentes",
    icon: UsersRound,
    gradient: "from-orange-600 to-pink-700",
  },
];

export function WorldHub({
  assets,
  libraryError,
  createOpen = false,
}: LibraryStateProps & { createOpen?: boolean }) {
  const [builderOpen, setBuilderOpen] = useState(createOpen);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const worlds = useMemo(
    () =>
      assets.filter(
        (asset) =>
          asset.kind === "world" &&
          asset.type === "image" &&
          (!query.trim() ||
            asset.name.toLowerCase().includes(query.trim().toLowerCase())) &&
          (filter === "all" ||
            (filter === "unsorted" &&
              !asset.folderId &&
              !asset.labels.length &&
              !asset.template) ||
            (filter === "labels" && asset.labels.length > 0) ||
            (filter === "folders" && Boolean(asset.folderId)) ||
            (filter === "templates" && asset.template)),
      ),
    [assets, filter, query],
  );
  return (
    <div className="min-h-screen bg-[#080809] px-4 py-8 text-white sm:px-7 lg:px-10">
      <header className="relative overflow-hidden rounded-3xl border border-violet-400/20 bg-[#111114] p-7 sm:p-10">
        <div className="absolute -top-24 right-0 size-72 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="relative max-w-2xl">
          <Badge className="border border-violet-400/20 bg-violet-500/10 text-violet-200">
            Worlds
          </Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Escenarios con memoria visual.
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Organiza entornos, fondos y atmósferas preparados para historias
            consistentes.
          </p>
          <Button
            type="button"
            size="lg"
            onClick={() => setBuilderOpen(true)}
            className="mt-6 bg-gradient-to-r from-blue-600 to-violet-600 text-white"
          >
            <Sparkles /> Crear mundo
          </Button>
        </div>
      </header>
      <section className="mt-9">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[.18em] text-violet-300">
          Accesos rápidos
        </p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {quickStarts.map((item) => (
            <QuickStartCard key={item.title} item={item} />
          ))}
        </div>
      </section>
      <section className="mt-12 pb-12">
        <div className="mb-5">
          <h2 className="text-xl font-semibold">Biblioteca de mundos</h2>
          <p className="mt-1 text-xs text-slate-600">
            Entornos reales clasificados mediante metadata.
          </p>
        </div>
        <AssetFilterToolbar
          filter={filter}
          onFilterChange={setFilter}
          query={query}
          onQueryChange={setQuery}
        />
        {libraryError && (
          <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-500/[0.08] p-4 text-xs text-amber-200">
            {libraryError}
          </div>
        )}
        {!libraryError && worlds.length > 0 && (
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {worlds.map((asset) => (
              <WorldCard key={asset.id} asset={asset} />
            ))}
          </div>
        )}
        {!libraryError && worlds.length === 0 && (
          <div className="mt-5 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 text-center">
            <SearchX className="size-8 text-slate-700" />
            <p className="mt-4 text-sm text-slate-400">
              No hay mundos con estos filtros
            </p>
          </div>
        )}
      </section>
      <Sheet open={builderOpen} onOpenChange={setBuilderOpen}>
        <SheetContent
          side="right"
          className="h-full w-full max-w-5xl gap-0 overflow-y-auto border-white/10 bg-[#0d0d10] p-0"
        >
          <SheetHeader className="border-b border-white/[0.07]">
            <SheetTitle className="text-white">Crear mundo</SheetTitle>
            <SheetDescription>
              Construye un entorno sin salir de la biblioteca.
            </SheetDescription>
          </SheetHeader>
          <WorldBuilder assets={assets} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
