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
        <Badge className="border border-[#ddd1ff] bg-[#f1eaff] text-[#7c3aed]">
          Centro de aprendizaje
        </Badge>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[#2b2634] sm:text-6xl">
          Tutorials
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[#817887]">
          Guías paso a paso para generación de imagen, video, edición y
          producción consistente.
        </p>
      </header>
      <div className="mt-9 flex flex-col gap-4 border-y border-[#e6ded1] py-4 lg:flex-row lg:items-center lg:justify-between">
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
                  : "border-[#e6ded1] text-[#817887] hover:bg-[#f8f4ff]",
              )}
            >
              {item}
            </button>
          ))}
        </div>
        <label className="relative w-full lg:w-80">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#8d8293]" />
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
              className="group overflow-hidden rounded-2xl border border-[#e6ded1] bg-white transition hover:-translate-y-1 hover:border-violet-300 hover:shadow-[0_10px_24px_rgba(72,53,101,0.08)]"
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
                  <Badge className="border border-[#e6ded1] bg-[#f7f4ec] text-[9px] text-[#6f6878]">
                    {tutorial.category}
                  </Badge>
                  <span className="text-[9px] uppercase text-[#7c3aed]">
                    {levelLabels[tutorial.level]}
                  </span>
                </div>
                <h2 className="mt-3 line-clamp-2 text-sm font-semibold text-[#2b2634]">
                  {tutorial.title}
                </h2>
                <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-[#8d8293]">
                  {tutorial.excerpt}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-8 flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-[#e6ded1]">
          <SearchX className="size-7 text-[#a097a4]" />
          <p className="mt-3 text-sm text-[#817887]">
            No encontramos tutoriales.
          </p>
        </div>
      )}
    </div>
  );
}
