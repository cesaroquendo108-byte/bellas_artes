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
    <div className="min-h-screen bg-[#080809] text-white">
      <StoryNavigation />
      <div className="px-4 py-8 sm:px-7 lg:px-10">
        <header>
          <Badge className="border border-violet-400/20 bg-violet-500/10 text-violet-200">
            Historias
          </Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
            Cada gran video comienza con una historia.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            Transforma una idea en escenas, shots y referencias listas para
            producción.
          </p>
        </header>
        <section className="mt-9">
          <StoryQuickStarts />
        </section>
        <section className="mt-6 grid gap-3 md:grid-cols-2">
          <Link
            href="/story/create"
            className="group relative overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-950 to-[#15151a] p-6"
          >
            <LayoutPanelTop className="size-6 text-violet-300" />
            <h2 className="mt-5 text-xl font-semibold">Crear storyboard</h2>
            <p className="mt-2 text-xs text-slate-500">
              Divide tu narrativa en escenas y shots persistentes.
            </p>
            <ArrowRight className="absolute right-6 bottom-6 transition group-hover:translate-x-2" />
          </Link>
          <Link
            href="/story/create?view=timeline"
            className="group relative overflow-hidden rounded-2xl border border-fuchsia-400/20 bg-gradient-to-r from-fuchsia-950 to-[#15151a] p-6"
          >
            <Clapperboard className="size-6 text-fuchsia-300" />
            <h2 className="mt-5 text-xl font-semibold">Abrir editor</h2>
            <p className="mt-2 text-xs text-slate-500">
              Organiza duración, ritmo, cámara y transiciones.
            </p>
            <ArrowRight className="absolute right-6 bottom-6 transition group-hover:translate-x-2" />
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
            <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 text-center">
              <SearchX className="size-8 text-slate-700" />
              <p className="mt-4 text-sm text-slate-400">
                La comunidad todavía no ha publicado historias
              </p>
              <p className="mt-1 text-xs text-slate-600">
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
