import Link from "next/link";
import {
  ArrowUpRight,
  AudioLines,
  Clapperboard,
  MessageSquareText,
  UserRound,
} from "lucide-react";

const items = [
  {
    title: "Videoclip",
    description: "Ritmo, secuencias y visuales sincronizados",
    template: "music-video",
    icon: AudioLines,
    gradient: "from-fuchsia-700 via-violet-700 to-indigo-900",
  },
  {
    title: "Video explicativo",
    description: "Convierte ideas complejas en una narrativa visual",
    template: "explainer",
    icon: MessageSquareText,
    gradient: "from-cyan-700 via-blue-700 to-violet-900",
  },
  {
    title: "Vlog de personaje",
    description: "Una historia guiada por un personaje consistente",
    template: "character-vlog",
    icon: UserRound,
    gradient: "from-orange-700 via-pink-700 to-violet-900",
  },
  {
    title: "Video ASMR",
    description: "Atmósfera, detalle y diseño sonoro por escenas",
    template: "asmr",
    icon: Clapperboard,
    gradient: "from-emerald-700 via-teal-800 to-slate-900",
  },
];

export function StoryQuickStarts() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map(({ icon: Icon, ...item }) => (
        <Link
          key={item.template}
          href={`/story/create?template=${item.template}`}
          className="group relative min-h-48 overflow-hidden rounded-2xl border border-white/10 p-4 transition hover:-translate-y-1 hover:border-violet-400/40"
        >
          <div
            className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-75 transition group-hover:scale-105`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
          <div className="relative flex h-full flex-col">
            <Icon className="size-5 text-white/80" />
            <ArrowUpRight className="ml-auto size-4 text-white/50 transition group-hover:translate-x-1 group-hover:-translate-y-1" />
            <div className="mt-auto">
              <h3 className="font-semibold text-white">{item.title}</h3>
              <p className="mt-1 text-[10px] leading-4 text-white/55">
                {item.description}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
