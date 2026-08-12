import Link from "next/link";
import { ArrowUpRight, FileImage, LockKeyhole, Music, Video } from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { EmptyState, StatusPill } from "@/components/ui/motion-effects";
import { MediaCard } from "@/components/ui/workspace";
import { getAssets } from "@/lib/assets/queries";
import type { AssetType } from "@/lib/types";

const filters: Array<{ value?: AssetType; label: string }> = [
  { label: "Todos" },
  { value: "image", label: "Imágenes" },
  { value: "video", label: "Videos" },
  { value: "audio", label: "Audio" },
];

const icons = { image: FileImage, video: Video, audio: Music };

export default async function AssetsPage({ searchParams }: { searchParams: Promise<{ type?: string; cursor?: string }> }) {
  const params = await searchParams;
  const type = (["image", "video", "audio"].includes(params.type ?? "") ? params.type : undefined) as AssetType | undefined;
  let result: Awaited<ReturnType<typeof getAssets>> | null = null;
  let error = "";
  try {
    result = await getAssets({ type }, params.cursor);
  } catch (reason) {
    error = reason instanceof Error ? reason.message : "No se pudo abrir la biblioteca.";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeading eyebrow="Biblioteca" title="Tus archivos, siempre bajo control" description="Imágenes, videos y audios privados, organizados en una superficie simple con enlaces temporales firmados." />
        <div className="mb-8 flex items-center gap-2"><LockKeyhole className="size-4 text-violet-700" /><StatusPill state="Privado" tone="success" /></div>
      </div>

      <nav aria-label="Filtrar biblioteca" className="flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-[#e6ded1] bg-white/70 p-1.5 shadow-sm">
        {filters.map((filter) => {
          const active = type === filter.value;
          return <Link key={filter.label} href={filter.value ? `/assets?type=${filter.value}` : "/assets"} aria-current={active ? "page" : undefined} className={`min-w-fit rounded-xl px-4 py-2 text-xs font-semibold transition ${active ? "bg-violet-100 text-violet-700 shadow-sm" : "text-[#756d7c] hover:bg-white hover:text-[#4c1d95]"}`}>{filter.label}</Link>;
        })}
      </nav>

      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">{error}</div>
      ) : result?.assets.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {result.assets.map((asset) => {
            const Icon = icons[asset.type as AssetType];
            const preview = asset.type === "image"
              ? <div role="img" aria-label={asset.name} className="size-full bg-cover bg-center transition duration-500 group-hover:scale-105 motion-reduce:transform-none" style={{ backgroundImage: `url(${asset.signedUrl})` }} />
              : <div className="flex size-full items-center justify-center bg-gradient-to-br from-violet-100 via-fuchsia-50 to-cyan-50"><Icon className="size-9 text-violet-600" /></div>;
            return (
              <MediaCard
                key={asset.id}
                preview={preview}
                title={asset.name}
                description={`${Math.ceil(Number(asset.bytes) / 1024)} KB · ${asset.expires_at ? `expira ${new Date(asset.expires_at).toLocaleDateString("es-VE")}` : "retención permanente"}`}
                meta={`${asset.type} · privado`}
                action={<a href={asset.signedUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 hover:underline">Abrir archivo <ArrowUpRight className="size-3.5" /></a>}
              />
            );
          })}
        </div>
      ) : (
        <EmptyState title="Tu biblioteca está vacía" description="Cuando existan assets privados, aparecerán aquí con acceso temporal firmado." action={<Link href="/image" className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white">Abrir estudio de imágenes</Link>} />
      )}

      {result?.nextCursor ? <Link href={`/assets?${type ? `type=${type}&` : ""}cursor=${encodeURIComponent(result.nextCursor)}`} className="inline-flex rounded-xl border border-[#ded4c6] bg-white px-4 py-2 text-sm font-semibold text-[#4c4455] shadow-sm transition hover:border-violet-200 hover:text-violet-700">Ver más</Link> : null}
    </div>
  );
}
