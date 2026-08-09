"use client";

import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CreativeProject } from "@/lib/story/contracts";

import { DirectorProjectCard } from "./director-project-card";
import { StoryNavigation } from "./story-navigation";

export function MyStoriesDashboard({
  projects,
  error,
}: {
  projects: CreativeProject[];
  error?: string | null;
}) {
  return (
    <div className="min-h-screen bg-[#080809] text-white">
      <StoryNavigation />
      <div className="px-4 py-8 sm:px-7 lg:px-10">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge className="border border-violet-400/20 bg-violet-500/10 text-violet-200">
              Private Library
            </Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              My Stories
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Borradores y producciones sincronizadas con Supabase.
            </p>
          </div>
          <Button
            render={<Link href="/story/create" />}
            nativeButton={false}
            size="lg"
            className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
          >
            <Plus /> Create Story
          </Button>
        </header>
        {error && (
          <div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-500/[0.08] p-4 text-xs text-amber-200">
            {error}
          </div>
        )}
        {projects.length ? (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {projects.map((project) => (
              <DirectorProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
            <div className="flex size-20 items-center justify-center rounded-3xl border border-violet-400/20 bg-violet-500/10">
              <BookOpen className="size-8 text-violet-300" />
            </div>
            <h2 className="mt-6 text-xl font-semibold">
              Start your storytelling journey
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Crea tu primera historia y organiza cada escena dentro de un
              proyecto privado.
            </p>
            <Button
              render={<Link href="/story/create" />}
              nativeButton={false}
              size="lg"
              className="mt-6 bg-violet-600 text-white"
            >
              <Plus /> Create Story
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
