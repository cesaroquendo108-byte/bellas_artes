"use client";

import Link from "next/link";
import {
  Box,
  ImageIcon,
  Layers3,
  Palette,
  SearchX,
  Sparkles,
  UserRound,
  WandSparkles,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { AssetFilterToolbar } from "./asset-filter-toolbar";
import { QuickStartCard, type QuickStartItem } from "./quick-start-card";
import type { LibraryFilter, LibraryStateProps, ResourceKind } from "./types";

export type UnifiedCategory =
  "all" | "characters" | "worlds" | "objects" | "backgrounds" | "styles";
const categories: {
  value: UnifiedCategory;
  label: string;
  kind?: ResourceKind;
}[] = [
  { value: "all", label: "Todos" },
  { value: "characters", label: "Personajes", kind: "character" },
  { value: "worlds", label: "Mundos", kind: "world" },
  { value: "objects", label: "Objetos", kind: "object" },
  { value: "backgrounds", label: "Fondos", kind: "background" },
  { value: "styles", label: "Estilos", kind: "style" },
];

function quickStarts(category: UnifiedCategory): QuickStartItem[] {
  if (category === "worlds")
    return [
      {
        title: "Crear mundo",
        description: "Diseña un entorno por descripción",
        href: "/world?mode=create",
        icon: Sparkles,
        gradient: "from-blue-600 to-violet-700",
      },
      {
        title: "Explorar mundos",
        description: "Abre la biblioteca inmersiva",
        href: "/world",
        icon: Layers3,
        gradient: "from-emerald-700 to-cyan-800",
      },
    ];
  if (category === "characters" || category === "all")
    return [
      {
        title: "Crear personaje",
        description: "Construye una identidad consistente",
        href: "/characters/create",
        icon: UserRound,
        gradient: "from-violet-600 to-fuchsia-700",
      },
      {
        title: "Crear mundo",
        description: "Diseña un entorno por descripción",
        href: "/world?mode=create",
        icon: Sparkles,
        gradient: "from-blue-600 to-violet-700",
      },
      {
        title: "Estudio de imágenes",
        description: "Reutiliza recursos visuales",
        href: "/image",
        icon: ImageIcon,
        gradient: "from-pink-600 to-orange-600",
      },
    ];
  return [
    {
      title: `Create ${category.slice(0, -1)}`,
      description: "Flujo preparado para una fase posterior",
      icon: category === "styles" ? Palette : Box,
      gradient: "from-slate-700 to-violet-800",
    },
  ];
}

function destination(asset: LibraryStateProps["assets"][number]) {
  return asset.kind === "character"
    ? `/characters/create?reference=${asset.id}`
    : asset.kind === "world"
      ? "/world?mode=create"
      : "/image";
}

export function CharactersAndWorldsHub({
  assets,
  libraryError,
  initialCategory = "all",
}: LibraryStateProps & { initialCategory?: UnifiedCategory }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const active =
    categories.find((category) => category.value === initialCategory) ??
    categories[0];
  const visible = useMemo(
    () =>
      assets.filter(
        (asset) =>
          asset.type === "image" &&
          (!active.kind || asset.kind === active.kind) &&
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
    [active.kind, assets, filter, query],
  );
  return (
    <div className="workspace-page px-0 py-2 sm:py-4">
      <header>
        <Badge className="border border-violet-400/20 bg-violet-500/10 text-violet-200">
          Biblioteca de recursos
        </Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Personajes y mundos
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
          Un repositorio para identidades, escenarios, objetos, fondos y estilos
          reutilizables.
        </p>
      </header>
      <nav className="mt-7 flex max-w-full gap-1 overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.025] p-1">
        {categories.map((category) => (
          <Link
            key={category.value}
            href={`/characters-and-worlds?category=${category.value}`}
            className={cn(
              "min-w-fit rounded-full px-4 py-2 text-xs transition",
              initialCategory === category.value
                ? "bg-violet-500 text-white"
                : "text-slate-500 hover:text-white",
            )}
          >
            {category.label}
          </Link>
        ))}
      </nav>
      <section className="mt-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:max-w-3xl">
          {quickStarts(initialCategory).map((item) => (
            <QuickStartCard key={item.title} item={item} />
          ))}
        </div>
      </section>
      <section className="mt-10 pb-12">
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
        {!libraryError && visible.length > 0 && (
          <div className="mt-5 columns-2 gap-3 sm:columns-3 md:columns-4 xl:columns-6">
            {visible.map((asset) => (
              <Dialog key={asset.id}>
                <article className="group relative mb-3 break-inside-avoid overflow-hidden rounded-xl border border-white/[0.08] bg-[#121214]">
                  <div
                    className={cn(
                      "w-full bg-cover bg-center",
                      asset.kind === "character"
                        ? "aspect-[3/4]"
                        : "aspect-square",
                    )}
                    style={{ backgroundImage: `url(${asset.signedUrl})` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/65 opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
                    <Button
                      render={<Link href={destination(asset)} />}
                      nativeButton={false}
                      size="sm"
                      className="bg-white/15 text-white backdrop-blur"
                    >
                      <WandSparkles /> Recrear
                    </Button>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/90 to-transparent p-2 pt-8">
                    <DialogTrigger className="min-w-0 flex-1 truncate text-left text-xs font-medium">
                      {asset.name}
                    </DialogTrigger>
                    <Badge className="bg-black/60 text-[8px]">
                      {asset.kind}
                    </Badge>
                  </div>
                </article>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{asset.name}</DialogTitle>
                    <DialogDescription>
                      Metadata del recurso seleccionado.
                    </DialogDescription>
                  </DialogHeader>
                  <div
                    className="mt-4 aspect-square rounded-xl bg-contain bg-center bg-no-repeat"
                    style={{ backgroundImage: `url(${asset.signedUrl})` }}
                  />
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    {asset.prompt ??
                      "No hay descripción disponible para este recurso."}
                  </p>
                </DialogContent>
              </Dialog>
            ))}
          </div>
        )}
        {!libraryError && visible.length === 0 && (
          <div className="mt-5 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 text-center">
            <SearchX className="size-8 text-slate-700" />
            <p className="mt-4 text-sm text-slate-400">
              No hay recursos reales en esta categoría
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Los recursos sin metadatos permanecen visibles únicamente en Todos.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
