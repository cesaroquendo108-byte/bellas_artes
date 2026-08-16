import Link from "next/link";
import {
  ArrowRight,
  Clapperboard,
  LayoutPanelTop,
  SearchX,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CreativeProject } from "@/lib/story/contracts";

import { StoryNavigation } from "./story-navigation";
import { StoryQuickStarts } from "./story-quick-starts";
import { StoryVideoCard } from "./story-video-card";

export function StoryHub({
  community,
  error,
}: {
  community: CreativeProject[];
  error?: string | null;
}) {
  return (
    <div className="story-page workspace-page">
      <StoryNavigation />
      <div className="px-4 py-8 sm:px-7 lg:px-10">
        <header>
          <Badge className="border border-[#ddd1ff] bg-[#f1eaff] text-[#7c3aed]">
            Historias
          </Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
            Cada gran video comienza con una historia.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            Transforma una idea en escenas, planos y referencias listas para
            producción.
          </p>
        </header>
        <section className="mt-9">
          <StoryQuickStarts />
        </section>
        <section className="mt-6 grid gap-3 md:grid-cols-2">
          <Link
            href="/story/create"
            className="group relative overflow-hidden rounded-2xl border border-[#ddd1ff] bg-gradient-to-br from-[#eee7ff] to-white p-6 transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(72,53,101,0.08)]"
          >
            <LayoutPanelTop className="size-6 text-[#7c3aed]" />
            <h2 className="mt-5 text-xl font-semibold text-[#2b2634]">Crear storyboard</h2>
            <p className="mt-2 text-xs text-[#817887]">
              Divide tu narrativa en escenas y planos persistentes.
            </p>
            <ArrowRight className="absolute right-6 bottom-6 text-[#7c3aed] transition group-hover:translate-x-2" />
          </Link>
          <Link
            href="/story/create?view=timeline"
            className="group relative overflow-hidden rounded-2xl border border-[#f4c8ed] bg-gradient-to-br from-[#fbeafa] to-white p-6 transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(72,53,101,0.08)]"
          >
            <Clapperboard className="size-6 text-[#c026d3]" />
            <h2 className="mt-5 text-xl font-semibold text-[#2b2634]">Abrir editor</h2>
            <p className="mt-2 text-xs text-[#817887]">
              Organiza duración, ritmo, cámara y transiciones.
            </p>
            <ArrowRight className="absolute right-6 bottom-6 text-[#c026d3] transition group-hover:translate-x-2" />
          </Link>
        </section>
        <section className="mt-14 pb-12">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-semibold">Historias de la comunidad</h2>
              <p className="mt-1 text-xs text-slate-600">
                Proyectos reales publicados por usuarios autenticados.
              </p>
            </div>
            <Button
              render={<Link href="/story/community" />}
              nativeButton={false}
              variant="ghost"
              size="sm"
            >
              Explorar <ArrowRight />
            </Button>
          </div>
          {error && (
            <div className="mb-5 rounded-xl border border-amber-400/20 bg-amber-500/[0.08] p-4 text-xs text-amber-200">
              {error}
            </div>
          )}
          {community.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {community.slice(0, 8).map((project) => (
                <StoryVideoCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-[#e6ded1] text-center">
              <SearchX className="size-8 text-[#a097a4]" />
              <p className="mt-4 text-sm text-[#817887]">
                La comunidad todavía no ha publicado historias
              </p>
              <p className="mt-1 text-xs text-[#8d8293]">
                No mostramos historias ficticias como contenido real.
              </p>
              <Button
                render={<Link href="/story/create" />}
                nativeButton={false}
                className="mt-5 bg-violet-600 text-white"
              >
                <Sparkles /> Crear la primera
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
