import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  Clapperboard,
  Film,
  Megaphone,
  Music2,
  Play,
  Presentation,
  Smartphone,
  Sparkles,
  UserRound,
  Video,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CreativeProject } from "@/lib/story/contracts";
import { directorTemplates } from "@/lib/landing/content";

import { DirectorInspirations } from "./director-inspirations";
import { DirectorProjectCard } from "./director-project-card";

const starts = [
  ["Cortometraje", "short-film", Film, "from-violet-700 to-indigo-950"],
  ["Videoclip", "music-video", Music2, "from-fuchsia-700 to-violet-950"],
  [
    "Anuncios de producto",
    "product-ads",
    BadgeDollarSign,
    "from-orange-700 to-rose-950",
  ],
  ["Anuncios UGC", "ugc-ads", UserRound, "from-cyan-700 to-blue-950"],
  ["Recreación de anuncio", "ad-remake", Play, "from-rose-700 to-fuchsia-950"],
  [
    "Contenido social",
    "social-content",
    Smartphone,
    "from-blue-700 to-violet-950",
  ],
  ["Microdrama", "micro-drama", Clapperboard, "from-red-700 to-slate-950"],
  ["Explicador", "explainer", Presentation, "from-emerald-700 to-teal-950"],
  ["Película de marca", "brand-film", Megaphone, "from-amber-700 to-orange-950"],
  ["Tráiler", "film-trailer", Video, "from-slate-600 to-violet-950"],
] as const;

const examples = [
  { title: "Shore Thing", tone: "from-cyan-900 to-slate-950" },
  { title: "The Auteur", tone: "from-amber-900 to-stone-950" },
  { title: "Max's Journey", tone: "from-violet-900 to-slate-950" },
];

export function DirectorHub({
  projects,
  community,
  error,
  initialTemplate,
  initialPrompt = "",
}: {
  projects: CreativeProject[];
  community: CreativeProject[];
  error?: string | null;
  initialTemplate?: string;
  initialPrompt?: string;
}) {
  const selectedTemplate = directorTemplates.find((item) => item.id === initialTemplate);
  const supportedTemplate = initialTemplate === "music-video" || initialTemplate === "explainer" ? initialTemplate : "custom";
  const createParams = new URLSearchParams({ kind: "director", template: supportedTemplate });
  if (initialPrompt.trim()) createParams.set("prompt", initialPrompt.trim());
  return (
    <div className="workspace-page px-0 py-2 sm:py-4">
      <header className="workspace-surface relative overflow-hidden rounded-[30px] p-7 sm:p-10">
        <div className="absolute -top-20 right-0 size-80 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="relative max-w-3xl">
          <Badge className="border border-violet-400/20 bg-violet-500/10 text-violet-200">
            Director IA
          </Badge>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">
            Dirige ideas. Construye historias.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500">
            Organiza escenas, personajes, mundos y medios generativos dentro de
            un proyecto narrativo persistente.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              render={<Link href="/story/create?kind=director" />}
              nativeButton={false}
              size="lg"
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
            >
              <Sparkles /> Crear proyecto
            </Button>
            <Button
              render={<Link href="/director/projects" />}
              nativeButton={false}
              variant="outline"
              size="lg"
              className="border-white/10"
            >
              <Clapperboard /> Ver proyectos
            </Button>
          </div>
        </div>
      </header>
      {selectedTemplate && (
        <section className="mt-5 flex flex-col gap-4 rounded-2xl border border-fuchsia-300/15 bg-gradient-to-r from-violet-500/[0.09] to-fuchsia-500/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-fuchsia-200">Plantilla seleccionada</p>
            <h2 className="mt-2 text-lg font-semibold">{selectedTemplate.title}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">{selectedTemplate.description}</p>
          </div>
          <Button render={<Link href={`/story/create?${createParams.toString()}`} />} nativeButton={false} className="bg-white text-black hover:bg-zinc-200">
            Continuar con esta estructura <ArrowRight />
          </Button>
        </section>
      )}
      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-violet-300">
              Inicio rápido
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Elige una estructura narrativa para comenzar.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {starts.map(([title, template, Icon, tone]) => (
            <Link
              key={template}
              href={`/director?template=${template}`}
              className={`group relative min-h-40 overflow-hidden rounded-2xl border p-4 transition hover:-translate-y-1 hover:border-violet-400/40 ${initialTemplate === template ? "border-fuchsia-300/60 ring-2 ring-fuchsia-400/15" : "border-white/10"}`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${tone} opacity-75 transition group-hover:scale-105`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
              <div className="relative flex h-full flex-col">
                <Icon className="size-5 text-white/70" />
                <div className="mt-auto">
                  <p className="font-medium text-white">{title}</p>
                  <span className="mt-1 flex items-center text-[10px] text-white/45">
                    Comenzar{" "}
                    <ArrowRight className="ml-1 size-3 transition group-hover:translate-x-1" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="mt-14">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold">Proyectos de director</h2>
            <p className="mt-1 text-xs text-slate-600">
              Tus proyectos reales y ejemplos editoriales claramente
              identificados.
            </p>
          </div>
          <Button
            render={<Link href="/director/projects" />}
            nativeButton={false}
            variant="ghost"
            size="sm"
          >
            Ver todos <ArrowRight />
          </Button>
        </div>
        {error && (
          <div className="mb-5 rounded-xl border border-amber-400/20 bg-amber-500/[0.08] p-4 text-xs text-amber-200">
            {error}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.slice(0, 4).map((project) => (
            <DirectorProjectCard key={project.id} project={project} />
          ))}
          {examples
            .slice(0, Math.max(1, 4 - projects.length))
            .map((example) => (
              <Link
                key={example.title}
                href={`/story/create?kind=director&example=${encodeURIComponent(example.title)}`}
                className="group overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121214] transition hover:border-violet-400/40"
              >
                <div
                  className={`relative aspect-video bg-gradient-to-br ${example.tone}`}
                >
                  <Badge className="absolute top-3 left-3 bg-white/15 text-[9px] text-white backdrop-blur">
                    Ejemplo
                  </Badge>
                  <span className="absolute inset-0 m-auto flex size-12 items-center justify-center rounded-full bg-violet-600 text-white opacity-0 transition group-hover:opacity-100">
                    <Play className="fill-current" />
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-semibold">{example.title}</h3>
                  <p className="mt-1 text-[10px] text-slate-600">
                    Plantilla editorial · no es un proyecto del usuario
                  </p>
                </div>
              </Link>
            ))}
        </div>
      </section>
      <DirectorInspirations projects={community} />
    </div>
  );
}
