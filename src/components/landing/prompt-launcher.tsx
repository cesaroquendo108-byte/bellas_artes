"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  AudioLines,
  Clapperboard,
  Globe2,
  ImageIcon,
  Sparkles,
  UserRound,
} from "lucide-react";

import { buildLandingStudioHref, quickStarts } from "@/lib/landing/content";
import { cn } from "@/lib/utils";

const icons = {
  director: Clapperboard,
  image: ImageIcon,
  video: Sparkles,
  character: UserRound,
  world: Globe2,
  audio: AudioLines,
};

export function PromptLauncher() {
  const router = useRouter();
  const [activeId, setActiveId] = useState("director");
  const [prompt, setPrompt] = useState("");
  const active = quickStarts.find((item) => item.id === activeId) ?? quickStarts[0];

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!active?.href) return;
    router.push(buildLandingStudioHref(active.href, prompt));
  }

  return (
    <form
      onSubmit={submit}
      className="relative min-w-0 w-full overflow-hidden rounded-[26px] border border-white/15 bg-[#0b213d]/90 p-2 shadow-2xl shadow-[#06172b]/35 backdrop-blur-2xl"
      aria-label="Elegir un estudio creativo"
    >
      <div className="flex max-w-full gap-1 overflow-x-auto p-1" role="tablist" aria-label="Estudios">
        {quickStarts.map((item) => {
          const Icon = icons[item.category];
          const selected = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveId(item.id)}
              className={cn(
                "flex min-w-fit items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition",
                selected
                  ? "bg-[#ffd34d] text-[#172740] shadow-lg"
                  : "text-[#b7cce0] hover:bg-white/[0.08] hover:text-white",
              )}
            >
              <Icon className="size-3.5" />
              {item.title}
            </button>
          );
        })}
      </div>
      <label htmlFor="landing-prompt" className="sr-only">
        Describe lo que quieres crear
      </label>
      <textarea
        id="landing-prompt"
        value={prompt}
        onChange={(event) => setPrompt(event.target.value.slice(0, 800))}
        placeholder={`Describe tu idea para ${active?.title.toLocaleLowerCase("es")}…`}
        className="min-h-28 w-full resize-none bg-transparent px-4 py-4 text-base leading-7 text-white outline-none placeholder:text-[#7897b4] sm:min-h-32 sm:text-lg"
      />
      <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] px-2 pt-2">
        <p className="hidden text-xs text-[#90abc4] sm:block">
          Abriremos el estudio con tu idea. No se ejecutará ninguna GPU desde esta página.
        </p>
        <button
          type="submit"
          className="ml-auto inline-flex items-center gap-2 rounded-xl bg-[#0b72ce] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#06172b]/25 transition hover:bg-[#2f86d6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd34d]"
        >
          Abrir {active?.title}
          <Sparkles className="size-4" />
        </button>
      </div>
    </form>
  );
}
