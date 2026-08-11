import Link from "next/link";
import { FileImage, Music, Video } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { EmptyState, SpotlightCard, StatusPill } from "@/components/ui/motion-effects";
import { getAssets } from "@/lib/assets/queries";
import type { AssetType } from "@/lib/types";

export default async function AssetsPage({ searchParams }: { searchParams: Promise<{ type?: string; cursor?: string }> }) {
  const p = await searchParams; const type = (["image","video","audio"].includes(p.type || "") ? p.type : undefined) as AssetType | undefined;
  let result: Awaited<ReturnType<typeof getAssets>> | null = null; let error = ""; try { result = await getAssets({ type }, p.cursor); } catch (e) { error = e instanceof Error ? e.message : "No se pudo abrir la biblioteca."; }
  const icons = { image: FileImage, video: Video, audio: Music };
  return <><div className="flex flex-wrap items-end justify-between gap-4"><PageHeading eyebrow="Biblioteca" title="Tus archivos" description="Assets privados, accesibles mediante enlaces temporales. El plan gratuito conserva archivos durante 15 días." /><StatusPill state="ready" tone="info" /></div><div className="mb-6 flex max-w-full gap-2 overflow-x-auto pb-1">{[["Todos",""][0],].length && ["","image","video","audio"].map(t=><Link key={t || "all"} href={t ? `/assets?type=${t}` : "/assets"} className={`min-w-fit rounded-xl border px-3 py-2 text-xs transition ${type === (t || undefined) ? "border-violet-400/40 bg-violet-500/10 text-violet-200" : "border-white/10 text-slate-400 hover:bg-white/[0.04] hover:text-white"}`}>{t ? ({image:"Imágenes",video:"Videos",audio:"Audio"} as Record<string,string>)[t] : "Todos"}</Link>)}</div>
    {error ? <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-5 text-sm text-amber-200">{error}</div> : result?.assets.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{result.assets.map(a=>{const Icon=icons[a.type as AssetType];return <SpotlightCard key={a.id} className="rounded-2xl" contentClassName="p-5"><a href={a.signedUrl} target="_blank" rel="noreferrer" className="block size-full"><Icon className="size-5 text-violet-300"/><p className="mt-4 truncate font-medium text-white">{a.name}</p><p className="mt-1 text-xs text-slate-500">{a.type} · {Math.ceil(Number(a.bytes)/1024)} KB</p></a></SpotlightCard>})}</div> : <EmptyState title="Tu biblioteca está vacía" description="Cuando existan assets privados, aparecerán aquí con acceso temporal firmado." />}
    {result?.nextCursor && <Link href={`/assets?${type ? `type=${type}&` : ""}cursor=${encodeURIComponent(result.nextCursor)}`} className="mt-5 inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm transition hover:border-violet-300/30 hover:bg-white/[0.04]">Ver más</Link>}
  </>;
}
