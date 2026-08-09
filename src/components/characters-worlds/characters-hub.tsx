"use client";

import Link from "next/link";
import {
  BookOpen,
  ImageIcon,
  Library,
  Mic2,
  Plus,
  SearchX,
  Sparkles,
  UserRoundPlus,
  Video,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { AssetFilterToolbar } from "./asset-filter-toolbar";
import { CharacterCard } from "./character-card";
import {
  CharacterFilters,
  type CharacterFilterValues,
} from "./character-filters";
import { QuickStartCard, type QuickStartItem } from "./quick-start-card";
import type { LibraryFilter, LibraryStateProps } from "./types";

const quickStarts: QuickStartItem[] = [
  {
    title: "Explorar biblioteca",
    description: "Explora tus identidades guardadas",
    href: "/characters?view=mine",
    icon: Library,
    gradient: "from-slate-700 to-violet-800",
  },
  {
    title: "Crear personaje",
    description: "Construye una identidad consistente",
    href: "/characters/create",
    icon: UserRoundPlus,
    gradient: "from-violet-600 to-fuchsia-700",
    isNew: true,
  },
  {
    title: "Imagen del personaje",
    description: "Lleva el personaje al estudio de imágenes",
    href: "/image",
    icon: ImageIcon,
    gradient: "from-fuchsia-600 to-pink-700",
  },
  {
    title: "Video del personaje",
    description: "Anima una referencia guardada",
    href: "/video/i2v",
    icon: Video,
    gradient: "from-indigo-600 to-cyan-700",
  },
  {
    title: "Video con voz",
    description: "Sincroniza rostro y voz",
    href: "/video/lip-sync",
    icon: Mic2,
    gradient: "from-violet-700 to-pink-600",
  },
  {
    title: "Sincronizar movimiento",
    description: "Transfiere una actuación",
    href: "/video/action-sync",
    icon: Sparkles,
    gradient: "from-orange-600 to-fuchsia-700",
  },
];

function matchesLibraryFilter(
  asset: LibraryStateProps["assets"][number],
  filter: LibraryFilter,
) {
  return (
    filter === "all" ||
    (filter === "unsorted" &&
      !asset.folderId &&
      !asset.labels.length &&
      !asset.template) ||
    (filter === "labels" && asset.labels.length > 0) ||
    (filter === "folders" && Boolean(asset.folderId)) ||
    (filter === "templates" && asset.template)
  );
}

export function CharactersHub({
  assets,
  libraryError,
  initialView = "mine",
}: LibraryStateProps & { initialView?: "community" | "mine" }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [attributes, setAttributes] = useState<CharacterFilterValues>({
    style: "all",
    gender: "all",
    age: "all",
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const characters = useMemo(
    () =>
      assets.filter(
        (asset) =>
          asset.kind === "character" &&
          asset.type === "image" &&
          matchesLibraryFilter(asset, filter) &&
          (!query.trim() ||
            asset.name
              .toLocaleLowerCase("es")
              .includes(query.trim().toLocaleLowerCase("es"))) &&
          (attributes.style === "all" ||
            asset.style?.toLowerCase() === attributes.style) &&
          (attributes.gender === "all" ||
            asset.gender?.toLowerCase() === attributes.gender) &&
          (attributes.age === "all" ||
            asset.ageRange?.toLowerCase() === attributes.age),
      ),
    [assets, attributes, filter, query],
  );

  return (
    <div className="min-h-screen bg-[#080809] px-4 py-8 text-white sm:px-7 lg:px-10">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge className="border border-violet-400/20 bg-violet-500/10 text-violet-200">
            Characters
          </Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Personajes que permanecen reconocibles.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            Diseña identidades, organiza referencias y prepara cada personaje
            para imagen, video y narrativa.
          </p>
        </div>
        <Button
          render={<Link href="/characters/create" />}
          nativeButton={false}
          size="lg"
          className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
        >
          <Plus /> Crear personaje
        </Button>
      </header>

      <nav className="mt-8 flex w-fit rounded-xl border border-white/[0.08] bg-white/[0.025] p-1">
        <Link
          href="/characters?view=community"
          className={cn(
            "rounded-lg px-4 py-2 text-xs",
            initialView === "community"
              ? "bg-violet-500 text-white"
              : "text-slate-500",
          )}
        >
          Comunidad
        </Link>
        <Link
          href="/characters?view=mine"
          className={cn(
            "rounded-lg px-4 py-2 text-xs",
            initialView === "mine"
              ? "bg-violet-500 text-white"
              : "text-slate-500",
          )}
        >
          Mis personajes
        </Link>
        <Link
          href="/characters/create"
          className="rounded-lg px-4 py-2 text-xs text-slate-500 hover:text-white"
        >
          Estudio
        </Link>
      </nav>

      <section className="mt-8">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-300">
          Accesos rápidos
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {quickStarts.map((item) => (
            <QuickStartCard key={item.title} item={item} />
          ))}
        </div>
      </section>

      <section className="mt-12 pb-12">
        <div className="mb-5 flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-semibold">
              {initialView === "community"
                ? "Comunidad"
                : "Biblioteca de personajes"}
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Sólo se muestran recursos reales clasificados como personaje.
            </p>
          </div>
          {initialView === "mine" && (
            <>
              <AssetFilterToolbar
                filter={filter}
                onFilterChange={setFilter}
                query={query}
                onQueryChange={setQuery}
              />
              <CharacterFilters value={attributes} onChange={setAttributes} />
            </>
          )}
        </div>
        {feedback && (
          <div
            role="status"
            className="mb-4 rounded-xl border border-violet-400/20 bg-violet-500/10 p-3 text-xs text-violet-200"
          >
            {feedback}
          </div>
        )}
        {libraryError && (
          <div className="rounded-xl border border-amber-400/20 bg-amber-500/[0.08] p-4 text-xs text-amber-200">
            {libraryError}
          </div>
        )}
        {!libraryError && initialView === "community" && (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 text-center">
            <BookOpen className="size-8 text-slate-700" />
            <p className="mt-4 text-sm font-medium text-slate-400">
              La biblioteca comunitaria aún no está conectada
            </p>
            <p className="mt-1 text-xs text-slate-600">
              No presentamos perfiles ficticios como contenido real.
            </p>
          </div>
        )}
        {!libraryError && initialView === "mine" && characters.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {characters.map((asset) => (
              <CharacterCard
                key={asset.id}
                asset={asset}
                onUnavailableAction={setFeedback}
              />
            ))}
          </div>
        )}
        {!libraryError && initialView === "mine" && characters.length === 0 && (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 text-center">
            <SearchX className="size-8 text-slate-700" />
            <p className="mt-4 text-sm font-medium text-slate-400">
              No hay personajes con estos filtros
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Crea uno o clasifica un asset mediante metadata.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
