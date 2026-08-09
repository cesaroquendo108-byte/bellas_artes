import { cn } from "@/lib/utils"

const tones: Record<string, string> = { director: "from-violet-800 via-indigo-950 to-black", brand: "from-fuchsia-800 via-violet-950 to-black", inspire: "from-cyan-800 via-blue-950 to-black", image: "from-purple-700 via-fuchsia-950 to-black", video: "from-sky-700 via-indigo-950 to-black", story: "from-amber-700 via-rose-950 to-black" }

export function CoverArt({ tone, className, children }: { tone: string; className?: string; children?: React.ReactNode }) { return <div className={cn("relative overflow-hidden bg-gradient-to-br", tones[tone] ?? tones.director, className)}><div className="absolute -top-16 -right-12 size-48 rounded-full bg-white/15 blur-3xl" /><div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_25%,rgba(255,255,255,.07)_50%,transparent_75%)]" />{children}</div> }
