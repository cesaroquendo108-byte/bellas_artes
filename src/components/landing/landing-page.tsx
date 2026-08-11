import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  AudioLines,
  Check,
  ChevronRight,
  Clapperboard,
  Globe2,
  ImageIcon,
  Menu,
  MonitorUp,
  ShieldCheck,
  Sparkles,
  UserRound,
  Video,
  WandSparkles,
} from "lucide-react";

import {
  directorTemplates,
  faqs,
  inspirationCategories,
  landingAssets,
  models,
  quickStarts,
  suiteCapabilities,
  type LandingCategory,
} from "@/lib/landing/content";

import { CapabilityStatusBadge } from "./capability-status";
import { PromptLauncher } from "./prompt-launcher";

const icons: Record<LandingCategory, React.ComponentType<{ className?: string }>> = {
  director: Clapperboard,
  image: ImageIcon,
  video: Video,
  character: UserRound,
  world: Globe2,
  audio: AudioLines,
};

function SectionHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-fuchsia-300">{eyebrow}</p>
      <h2 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl lg:text-5xl">{title}</h2>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">{copy}</p>
    </div>
  );
}

export function LandingPage() {
  return (
    <main className="landing-v1 min-h-screen overflow-x-clip bg-[#070708] text-white">
      <div className="border-b border-fuchsia-200/10 bg-gradient-to-r from-violet-950 via-fuchsia-950 to-violet-950 px-4 py-2 text-center text-xs text-fuchsia-100">
        Estudio creativo IA para Venezuela <span className="mx-2 text-white/30">·</span> Acceso anticipado
      </div>

      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#070708]/80 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-[1480px] items-center gap-5 px-4 sm:px-6 lg:px-10">
          <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight" aria-label="Bellas Artes, inicio">
            <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 shadow-lg shadow-fuchsia-500/20">
              <Sparkles className="size-4" />
            </span>
            <span>Bellas Artes</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Navegación pública">
            <Link href="/inspire" className="rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-white/[0.05] hover:text-white">Inspiración</Link>
            <Link href="/tutorials" className="rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-white/[0.05] hover:text-white">Tutoriales</Link>
            <Link href="/blog" className="rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-white/[0.05] hover:text-white">Blog</Link>
            <Link href="/mcp" className="rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-white/[0.05] hover:text-white">MCP</Link>
          </nav>
          <div className="ml-auto hidden items-center gap-2 sm:flex">
            <Link href="/login" className="rounded-xl px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/[0.06] hover:text-white">Entrar</Link>
            <Link href="/login?next=/dashboard" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200">Abrir mi estudio</Link>
          </div>
          <details className="group ml-auto sm:hidden">
            <summary className="flex size-10 cursor-pointer list-none items-center justify-center rounded-xl border border-white/10 text-zinc-300"><Menu className="size-5" /><span className="sr-only">Abrir menú</span></summary>
            <div className="absolute inset-x-3 top-[calc(100%+8px)] rounded-2xl border border-white/10 bg-[#111114] p-3 shadow-2xl">
              {[{ href: "/inspire", label: "Inspiración" }, { href: "/tutorials", label: "Tutoriales" }, { href: "/blog", label: "Blog" }, { href: "/mcp", label: "MCP" }, { href: "/login", label: "Entrar" }].map((item) => <Link key={item.href} href={item.href} className="block rounded-xl px-4 py-3 text-sm text-zinc-300 hover:bg-white/[0.06]">{item.label}</Link>)}
              <Link href="/login?next=/dashboard" className="mt-2 block rounded-xl bg-white px-4 py-3 text-center text-sm font-semibold text-black">Abrir mi estudio</Link>
            </div>
          </details>
        </div>
      </header>

      <section className="landing-mesh relative isolate">
        <div className="mx-auto grid max-w-[1480px] items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1.02fr)_minmax(420px,.98fr)] lg:px-10 lg:py-28">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/15 bg-fuchsia-400/[0.07] px-3 py-1.5 text-xs text-fuchsia-100">
              <span className="size-1.5 rounded-full bg-fuchsia-300 shadow-[0_0_12px_#f0abfc]" />
              Tu estudio, una historia a la vez
            </div>
            <h1 className="mt-7 max-w-4xl text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl xl:text-[84px]">
              De una idea a una <span className="landing-gradient-text">historia visual.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-400 sm:text-lg">
              Imagen, video, personajes, mundos y voz reunidos en una experiencia creativa diseñada para Venezuela.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login?next=/dashboard" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Abrir mi estudio <ArrowRight className="size-4" /></Link>
              <Link href="/inspire" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-white/[0.08]">Explorar inspiración</Link>
            </div>
          </div>

          <div className="relative min-h-[410px] sm:min-h-[520px]" aria-label="Vista previa del estudio creativo">
            <div className="absolute inset-4 rotate-2 rounded-[32px] bg-gradient-to-br from-violet-500/20 to-cyan-400/10 blur-2xl" />
            <div className="absolute inset-x-0 top-0 overflow-hidden rounded-[28px] border border-white/10 bg-[#111114] p-2 shadow-2xl shadow-black/60 sm:left-10">
              <div className="flex items-center gap-1.5 px-2 py-2"><span className="size-2 rounded-full bg-pink-400" /><span className="size-2 rounded-full bg-amber-300" /><span className="size-2 rounded-full bg-emerald-300" /><span className="ml-3 text-[10px] text-zinc-600">Director · Cortometraje</span></div>
              <div className="relative aspect-[16/9] overflow-hidden rounded-[20px] bg-zinc-900">
                <Image src={landingAssets["hero-director"]} alt="Escena fantástica de una historia visual" fill priority sizes="(max-width: 1024px) 92vw, 620px" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-violet-950/10" />
                <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
                  <div><p className="text-[10px] uppercase tracking-[.2em] text-fuchsia-200">Escena 01</p><p className="mt-1 text-sm font-medium">Una historia comienza entre sombras</p></div>
                  <span className="flex size-10 items-center justify-center rounded-full border border-white/15 bg-black/45 backdrop-blur"><Clapperboard className="size-4" /></span>
                </div>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 w-[58%] overflow-hidden rounded-[22px] border border-white/10 bg-[#111114]/95 p-2 shadow-2xl backdrop-blur-xl">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl"><Image src={landingAssets["capability-character"]} alt="Panel visual para personajes consistentes" fill sizes="300px" className="object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" /><p className="absolute bottom-3 left-3 text-xs font-medium">Identidad consistente</p></div>
            </div>
            <div className="absolute right-0 bottom-8 w-[45%] rounded-[22px] border border-white/10 bg-black/70 p-4 shadow-2xl backdrop-blur-xl">
              <p className="text-[10px] uppercase tracking-[.18em] text-cyan-200">Biblioteca privada</p>
              <div className="mt-3 grid grid-cols-3 gap-2">{["bg-violet-500/35", "bg-fuchsia-500/30", "bg-cyan-500/25"].map((tone) => <span key={tone} className={`aspect-square rounded-lg ${tone}`} />)}</div>
            </div>
          </div>

          <div className="lg:col-span-2"><PromptLauncher /></div>
        </div>
      </section>

      <section className="border-y border-white/[0.06] bg-white/[0.018] py-12">
        <div className="mx-auto max-w-[1480px] px-4 sm:px-6 lg:px-10">
          <p className="mb-5 text-center text-xs font-medium uppercase tracking-[.22em] text-zinc-600">Empieza por la parte de tu idea que ya tienes clara</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {quickStarts.map((item) => {
              const Icon = icons[item.category];
              return <Link key={item.id} href={item.href} className="group rounded-2xl border border-white/[0.07] bg-[#101012] p-4 transition hover:-translate-y-1 hover:border-fuchsia-300/25 hover:bg-white/[0.045]">
                <div className="flex items-start justify-between gap-2"><span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/25 to-fuchsia-500/15 text-fuchsia-200"><Icon className="size-4" /></span><ChevronRight className="size-4 text-zinc-700 transition group-hover:translate-x-0.5 group-hover:text-white" /></div>
                <h3 className="mt-5 font-medium">{item.title}</h3><p className="mt-2 text-xs leading-5 text-zinc-500">{item.description}</p><CapabilityStatusBadge status={item.status} className="mt-4" />
              </Link>;
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1480px] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
        <SectionHeading eyebrow="Vibe Direct" title="Elige el tono. Director organiza la historia." copy="Plantillas reales para empezar con una estructura, sin prometer una generación automática desde la portada." />
        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          {directorTemplates.map((template, index) => <Link key={template.id} href={template.href} className={`group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111114] ${index === 0 ? "col-span-2 row-span-2 min-h-80 md:min-h-0 xl:col-span-2" : "min-h-48"}`}>
            {template.imageKey && <Image src={landingAssets[template.imageKey]} alt={`Referencia visual para ${template.title}`} fill sizes={index === 0 ? "(max-width: 768px) 92vw, 420px" : "240px"} className="object-cover transition duration-500 group-hover:scale-105" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/15 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4"><CapabilityStatusBadge status={template.status} /><h3 className="mt-3 text-sm font-semibold">{template.title}</h3><p className="mt-1 hidden text-xs leading-5 text-zinc-400 sm:block">{template.description}</p></div>
          </Link>)}
        </div>
      </section>

      <section className="border-y border-white/[0.06] bg-[#0b0b0d]">
        <div className="mx-auto max-w-[1480px] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
          <SectionHeading eyebrow="Suite Bellas Artes" title="Una identidad creativa, muchas superficies." copy="Cada módulo comparte biblioteca, permisos y lenguaje visual. Cuando el backend aún no está listo, la interfaz lo dice con claridad." />
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {suiteCapabilities.map((capability) => {
              const Icon = icons[capability.category];
              return <Link key={capability.id} href={capability.href} className="group relative min-h-72 overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#111114] p-6 transition hover:border-violet-300/25">
                {capability.imageKey && <Image src={landingAssets[capability.imageKey]} alt={`Vista de ${capability.title}`} fill sizes="(max-width: 768px) 92vw, 520px" className="object-cover opacity-55 transition duration-500 group-hover:scale-105 group-hover:opacity-70" />}
                <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/75 to-transparent" />
                <div className="relative flex h-full flex-col"><div className="flex items-start justify-between"><span className="flex size-11 items-center justify-center rounded-xl border border-white/10 bg-black/40 backdrop-blur"><Icon className="size-5" /></span><CapabilityStatusBadge status={capability.status} /></div><div className="mt-auto pt-24"><h3 className="text-xl font-semibold">{capability.title}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-zinc-400">{capability.description}</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-fuchsia-200">Abrir superficie <ArrowRight className="size-3.5 transition group-hover:translate-x-1" /></span></div></div>
              </Link>;
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1480px] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
        <SectionHeading eyebrow="Modelos y estado" title="Sabes qué motor está listo antes de crear." copy="Sin nombres decorativos ni proveedores presentados como activos. Estos son los motores que forman parte del roadmap real." />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {models.map((model, index) => <article key={model.id} className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111114] p-5">
            <div className={`absolute inset-x-0 top-0 h-1 ${index === 0 ? "bg-gradient-to-r from-violet-400 to-fuchsia-400" : "bg-white/5"}`} />
            <p className="text-[10px] uppercase tracking-[.2em] text-zinc-600">{model.category}</p><h3 className="mt-4 text-lg font-semibold">{model.title}</h3><p className="mt-3 min-h-20 text-xs leading-5 text-zinc-500">{model.copy}</p><CapabilityStatusBadge status={model.status} className="mt-4" />
          </article>)}
        </div>
      </section>

      <section className="border-y border-white/[0.06] bg-white/[0.018]">
        <div className="mx-auto max-w-[1480px] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><SectionHeading eyebrow="Inspiración" title="Ideas para crear desde aquí." copy="Categorías conectadas al feed real de la comunidad Bellas Artes." /><Link href="/inspire" className="inline-flex items-center gap-2 text-sm text-fuchsia-200">Ver toda la inspiración <ArrowRight className="size-4" /></Link></div>
          <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">{inspirationCategories.map((item) => <Link key={item.title} href={`/inspire?category=${item.category}${item.focus ? `&focus=${item.focus}` : ""}`} className="group relative min-h-64 overflow-hidden rounded-2xl border border-white/[0.08]"><Image src={landingAssets[item.imageKey]} alt={`Inspiración de ${item.title}`} fill sizes="(max-width: 768px) 46vw, 240px" className="object-cover transition duration-500 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" /><div className="absolute inset-x-0 bottom-0 p-4"><h3 className="text-sm font-semibold">{item.title}</h3><p className="mt-1 text-[11px] leading-4 text-zinc-400">{item.description}</p></div></Link>)}</div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1480px] gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[.8fr_1.2fr] lg:px-10 lg:py-28">
        <div><SectionHeading eyebrow="Preguntas frecuentes" title="Transparencia antes de generar." copy="Privacidad, créditos, disponibilidad y beta explicados sin letra pequeña." /><div className="mt-8 space-y-3 text-sm text-zinc-400">{["Assets privados con URL firmada", "Billing shadow antes del cobro público", "Estados reales por herramienta"].map((item) => <p key={item} className="flex items-center gap-2"><Check className="size-4 text-emerald-300" />{item}</p>)}</div></div>
        <div className="space-y-3">{faqs.map((faq) => <details key={faq.question} className="group rounded-2xl border border-white/[0.08] bg-[#101012] p-5 open:border-violet-300/20"><summary className="cursor-pointer list-none pr-8 text-sm font-medium text-white marker:hidden">{faq.question}<span className="float-right text-zinc-600 transition group-open:rotate-45">+</span></summary><p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-500">{faq.answer}</p></details>)}</div>
      </section>

      <section className="px-4 pb-20 sm:px-6 lg:px-10">
        <div className="landing-cta mx-auto max-w-[1480px] overflow-hidden rounded-[32px] border border-fuchsia-300/15 px-6 py-12 text-center sm:px-12 sm:py-16">
          <MonitorUp className="mx-auto size-7 text-fuchsia-200" /><h2 className="mx-auto mt-5 max-w-3xl text-balance text-3xl font-semibold tracking-[-.035em] sm:text-5xl">Tu próxima historia puede empezar con una sola línea.</h2><p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-zinc-400">Entra a tu estudio, organiza referencias y prepara el proyecto mientras completamos la beta privada.</p><div className="mt-7 flex flex-wrap justify-center gap-3"><Link href="/login?next=/dashboard" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black">Abrir mi estudio <ArrowRight className="size-4" /></Link><Link href="/mcp" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-5 py-3 text-sm font-semibold text-white"><WandSparkles className="size-4" /> Conocer MCP</Link></div>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] px-4 py-10 sm:px-6 lg:px-10">
        <div className="mx-auto grid max-w-[1480px] gap-8 md:grid-cols-[1fr_auto_auto]">
          <div><div className="flex items-center gap-2 font-semibold"><Sparkles className="size-4 text-fuchsia-300" /> Bellas Artes</div><p className="mt-3 max-w-sm text-xs leading-5 text-zinc-600">Suite creativa IA construida desde Venezuela para historias, marcas y equipos que quieren crear con control.</p></div>
          <div><p className="text-xs font-semibold text-zinc-300">Explorar</p><div className="mt-3 grid gap-2 text-xs text-zinc-600"><Link href="/inspire">Inspiración</Link><Link href="/tutorials">Tutoriales</Link><Link href="/blog">Blog</Link><Link href="/mcp">MCP</Link></div></div>
          <div><p className="text-xs font-semibold text-zinc-300">Confianza</p><div className="mt-3 grid gap-2 text-xs text-zinc-600"><Link href="/privacy">Privacidad</Link><Link href="/terms">Términos</Link><Link href="/login">Entrar</Link></div></div>
        </div>
        <div className="mx-auto mt-10 flex max-w-[1480px] flex-col gap-3 border-t border-white/[0.05] pt-6 text-[11px] text-zinc-700 sm:flex-row sm:items-center sm:justify-between"><p>© {new Date().getFullYear()} Bellas Artes.</p><p className="flex items-center gap-2"><ShieldCheck className="size-3.5" /> Generación restringida hasta cerrar infraestructura y QA.</p></div>
      </footer>
    </main>
  );
}
