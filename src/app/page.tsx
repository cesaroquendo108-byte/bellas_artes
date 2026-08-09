import Link from "next/link";
import { ArrowRight, Image as ImageIcon, Layers3, ShieldCheck, Sparkles } from "lucide-react";

const features = [
  { icon: Sparkles, title: "Creación asistida", copy: "Un estudio diseñado para convertir ideas en piezas visuales listas para trabajar." },
  { icon: Layers3, title: "Todo en un solo lugar", copy: "Generaciones, archivos, créditos y decisiones reunidos en una experiencia clara." },
  { icon: ShieldCheck, title: "Pagos verificables", copy: "Compra créditos con pago móvil y conserva un historial auditable de cada movimiento." },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#0a0a0a] text-white">
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary"><Sparkles className="size-4" /></span>
          Bellas Artes
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          {[{ href: "/inspire", label: "Inspire" }, { href: "/blog", label: "Blog" }, { href: "/tutorials", label: "Tutorials" }, { href: "/mcp", label: "MCP" }].map((item) => (
            <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 text-sm text-slate-500 transition hover:bg-white/[0.05] hover:text-white">{item.label}</Link>
          ))}
        </div>
        <Link href="/login" className="ml-auto rounded-md border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/[0.06]">
          Entrar
        </Link>
      </nav>

      <section className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:py-24">
        <div className="relative z-10 max-w-3xl">
          <p className="mb-5 text-sm font-semibold text-violet-300">ESTUDIO CREATIVO CON IA</p>
          <h1 className="text-balance text-5xl font-semibold leading-[1.04] sm:text-6xl lg:text-7xl">
            Tus ideas merecen una forma extraordinaria.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-400">
            Bellas Artes reúne creación, biblioteca y control de créditos en una plataforma pensada para creadores de Venezuela.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/login" className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold shadow-lg shadow-primary/20 transition hover:bg-violet-500">
              Abrir mi estudio <ArrowRight className="size-4" />
            </Link>
            <a href="#como-funciona" className="rounded-md border border-white/10 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06]">
              Conocer la plataforma
            </a>
            <Link href="/inspire" className="rounded-md border border-violet-400/20 px-5 py-3 text-sm font-semibold text-violet-200 transition hover:bg-violet-500/10">
              Explorar Inspire
            </Link>
          </div>
        </div>

        <div className="relative min-h-[460px]" aria-hidden="true">
          <div className="absolute inset-0 rounded-[32px] border border-white/[0.07] bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,.22),transparent_38%),linear-gradient(145deg,#17131f,#0f0f12_62%)]" />
          <div className="absolute left-[8%] top-[10%] w-[72%] rounded-lg border border-white/10 bg-black/55 p-4 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-2 text-xs text-slate-500"><ImageIcon className="size-4 text-violet-300" /> Nueva creación</div>
            <div className="mt-4 aspect-[16/10] rounded-md bg-[linear-gradient(135deg,#221b35,#4c1d95_48%,#0f172a)]" />
          </div>
          <div className="absolute bottom-[8%] right-[5%] w-[64%] rounded-lg border border-white/10 bg-[#111114]/90 p-5 shadow-2xl">
            <p className="text-xs text-slate-500">Tu biblioteca</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="aspect-square rounded bg-violet-500/25" />
              <div className="aspect-square rounded bg-cyan-500/20" />
              <div className="aspect-square rounded bg-pink-500/20" />
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] px-5 py-8 text-xs text-slate-500 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Bellas Artes. Suite creativa IA.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/inspire" className="hover:text-white">Inspire</Link>
            <Link href="/blog" className="hover:text-white">Blog</Link>
            <Link href="/tutorials" className="hover:text-white">Tutorials</Link>
            <Link href="/mcp" className="hover:text-white">MCP</Link>
          </div>
        </div>
      </footer>

      <section id="como-funciona" className="border-t border-white/[0.06] bg-[#0d0d0f] px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold text-violet-300">UNA BASE PARA CRECER</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold sm:text-4xl">Menos fricción entre la idea y el trabajo creativo.</h2>
          <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.07] md:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.title} className="bg-[#101013] p-6 sm:p-8">
                <feature.icon className="size-5 text-violet-300" />
                <h3 className="mt-5 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 leading-7 text-slate-400">{feature.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
