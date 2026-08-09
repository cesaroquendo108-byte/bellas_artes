"use client";

import { LoaderCircle, SearchX } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import type { CreativeProject } from "@/lib/story/contracts";

import { StoryFilters, type StoryFilter } from "./story-filters";
import { StoryNavigation } from "./story-navigation";
import { StoryVideoCard } from "./story-video-card";

export function CommunityStories({
  initialProjects,
  initialCursor,
  initialError,
}: {
  initialProjects: CreativeProject[];
  initialCursor: string | null;
  initialError?: string | null;
}) {
  const [projects, setProjects] = useState(initialProjects);
  const [cursor, setCursor] = useState(initialCursor);
  const [filter, setFilter] = useState<StoryFilter>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError ?? null);
  const sentinel = useRef<HTMLDivElement>(null);
  const visible = useMemo(
    () =>
      projects.filter(
        (project) => filter === "all" || project.storyType === filter,
      ),
    [filter, projects],
  );
  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/story/projects?kind=story&scope=community&limit=20&cursor=${encodeURIComponent(cursor)}`,
      );
      const body = (await response.json()) as {
        projects?: CreativeProject[];
        nextCursor?: string | null;
        message?: string;
      };
      if (!response.ok) throw new Error(body.message);
      setProjects((items) => [
        ...items,
        ...(body.projects ?? []).filter(
          (project) => !items.some((item) => item.id === project.id),
        ),
      ]);
      setCursor(body.nextCursor ?? null);
    } catch {
      setError("No se pudo cargar la siguiente página de historias.");
    } finally {
      setLoading(false);
    }
  }, [cursor, loading]);
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !cursor) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "300px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor, loadMore]);
  return (
    <div className="min-h-screen bg-[#080809] text-white">
      <StoryNavigation />
      <div className="px-4 py-8 sm:px-7 lg:px-10">
        <header>
          <Badge className="border border-violet-400/20 bg-violet-500/10 text-violet-200">
            Historias publicadas
          </Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Historias de la comunidad
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Explora proyectos que sus autores decidieron publicar.
          </p>
        </header>
        <div className="mt-7">
          <StoryFilters value={filter} onChange={setFilter} />
        </div>
        {error && (
          <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-500/[0.08] p-4 text-xs text-amber-200">
            {error}
          </div>
        )}
        {visible.length ? (
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {visible.map((project) => (
              <StoryVideoCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="mt-6 flex min-h-[55vh] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 text-center">
            <SearchX className="size-8 text-slate-700" />
            <h2 className="mt-4 text-base font-medium text-slate-300">
              No hay historias publicadas en esta categoría
            </h2>
            <p className="mt-2 text-xs text-slate-600">
              La galería sólo contiene proyectos comunitarios reales.
            </p>
          </div>
        )}
        <div ref={sentinel} className="flex h-20 items-center justify-center">
          {loading && (
            <span className="flex items-center gap-2 text-xs text-slate-500">
              <LoaderCircle className="size-4 animate-spin" /> Cargando
              historias…
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
