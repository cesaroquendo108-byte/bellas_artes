"use client";

import Link from "next/link";
import { BookOpen, PlayCircle, Search, SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { TutorialMetadata } from "@/lib/content/types";
import { cn } from "@/lib/utils";
import { CoverArt } from "./cover-art";

const categories = ["Todos", "Generación de imágenes", "Video", "Edición"] as const;
const levelLabels = { beginner: "Inicial", pro: "Profesional" } as const;
export function TutorialsIndex({
  tutorials,
}: {
  tutorials: TutorialMetadata[];
}) {
  const [filter, setFilter] = useState<(typeof categories)[number]>("Todos");
  const [query, setQuery] = useState("");
  const visible = useMemo(
    () =>
      tutorials.filter(
        (item) =>
          (filter === "Todos" || item.category === filter) &&
          (!query.trim() ||
            `${item.title} ${item.excerpt}`
              .toLowerCase()
              .includes(query.trim().toLowerCase())),
      ),
    [filter, query, tutorials],
  );
  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-7 sm:py-20">
      <header>
        <Badge className="border border-violet-400/20 bg-violet-500/10 text-violet-200">
          Centro de aprendizaje
        </Badge>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">
          Tutorials
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500">
          Guías paso a paso para generación de imagen, video, edición y
          producción consistente.
        </p>
      </header>
      <div className="mt-9 flex flex-col gap-4 border-y border-white/[0.07] py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2 overflow-x-auto">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={cn(
                "min-w-fit rounded-full border px-4 py-2 text-xs",
                filter === item
                  ? "border-violet-400 bg-violet-600 text-white"
                  : "border-white/10 text-slate-500",
              )}
            >
              {item}
            </button>
          ))}
        </div>
        <label className="relative w-full lg:w-80">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-600" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar tutorial…"
            className="pl-9"
          />
        </label>
      </div>
      {visible.length ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((tutorial) => (
            <Link
              href={`/tutorials/${tutorial.slug}`}
              key={tutorial.slug}
              className="group overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111114] transition hover:-translate-y-1 hover:border-violet-400/35"
            >
              <CoverArt tone={tutorial.cover} className="aspect-video">
                <span className="absolute inset-0 m-auto flex size-12 items-center justify-center rounded-full bg-violet-600/80 text-white backdrop-blur">
                  {tutorial.mediaType === "video" ? (
                    <PlayCircle />
                  ) : (
                    <BookOpen />
                  )}
                </span>
                <Badge className="absolute right-2 bottom-2 bg-black/75 text-white">
                  {tutorial.duration}
                </Badge>
              </CoverArt>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <Badge className="bg-white/[0.06] text-[9px] text-slate-400">
                    {tutorial.category}
                  </Badge>
                  <span className="text-[9px] uppercase text-violet-300">
                    {levelLabels[tutorial.level]}
                  </span>
                </div>
                <h2 className="mt-3 line-clamp-2 text-sm font-semibold">
                  {tutorial.title}
                </h2>
                <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-slate-600">
                  {tutorial.excerpt}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-8 flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10">
          <SearchX className="size-7 text-slate-700" />
          <p className="mt-3 text-sm text-slate-500">
            No encontramos tutoriales.
          </p>
        </div>
      )}
    </div>
  );
}
