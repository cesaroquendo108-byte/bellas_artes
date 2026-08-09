"use client";

import { Sparkles, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  communityCategories,
  type CommunityCategory,
  type CommunityPost,
} from "@/lib/social/contracts";
import { InspireCategoryRow } from "./inspire-category-row";
import { InspireStickyNav } from "./inspire-sticky-nav";

export function InspireFeed({
  posts: initialPosts,
  nextCursor: initialCursor,
  error,
  selectedCategory,
}: {
  posts: CommunityPost[];
  nextCursor?: string | null;
  error?: string | null;
  selectedCategory?: CommunityCategory;
}) {
  const categories = selectedCategory
    ? [selectedCategory]
    : [...communityCategories];
  const [posts, setPosts] = useState(initialPosts);
  const [nextCursor, setNextCursor] = useState(initialCursor ?? null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedCategory || !nextCursor || !sentinel.current) return;
    const node = sentinel.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || loading) return;
        setLoading(true);
        setLoadError(null);
        const params = new URLSearchParams({
          category: selectedCategory,
          cursor: nextCursor,
          limit: "24",
        });
        fetch(`/api/community/posts?${params}`)
          .then(async (response) => {
            const body = (await response.json()) as {
              posts?: CommunityPost[];
              nextCursor?: string | null;
              message?: string;
            };
            if (!response.ok)
              throw new Error(
                body.message ?? "No se pudo cargar más contenido.",
              );
            setPosts((current) => [
              ...current,
              ...(body.posts ?? []).filter(
                (post) => !current.some((item) => item.id === post.id),
              ),
            ]);
            setNextCursor(body.nextCursor ?? null);
          })
          .catch((reason) =>
            setLoadError(
              reason instanceof Error
                ? reason.message
                : "No se pudo cargar más contenido.",
            ),
          )
          .finally(() => setLoading(false));
      },
      { rootMargin: "320px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, nextCursor, selectedCategory]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-7 sm:py-14">
      <header className="relative overflow-hidden rounded-3xl border border-violet-400/20 bg-[#111114] p-7 sm:p-11">
        <div className="absolute -top-24 right-0 size-80 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="relative max-w-3xl">
          <Badge className="border border-violet-400/20 bg-violet-500/10 text-violet-200">
            <Sparkles /> Inspire
          </Badge>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">
            Ideas reales, listas para dirigir.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500">
            Explora imágenes y videos publicados por la comunidad y abre su
            contexto creativo en el estudio correspondiente.
          </p>
          <Button
            render={<Link href="/community/publish" />}
            nativeButton={false}
            className="mt-6 bg-violet-600 text-white"
          >
            <Upload /> Publicar una creación
          </Button>
        </div>
      </header>
      <div className="mt-8">
        <InspireStickyNav />
      </div>
      {error && (
        <div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-500/[0.08] p-4 text-xs text-amber-200">
          {error}
        </div>
      )}
      {categories.map((category) => (
        <InspireCategoryRow
          key={category}
          category={category}
          posts={posts.filter((post) => post.category === category)}
        />
      ))}
      {selectedCategory && (
        <div
          ref={sentinel}
          className="flex min-h-12 items-center justify-center text-xs text-slate-600"
        >
          {loading
            ? "Cargando más…"
            : nextCursor
              ? "Desplázate para ver más"
              : posts.length
                ? "Has llegado al final"
                : null}
          {loadError && <span className="text-rose-300">{loadError}</span>}
        </div>
      )}
    </div>
  );
}
