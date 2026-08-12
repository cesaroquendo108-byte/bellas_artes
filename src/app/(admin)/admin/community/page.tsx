import type { Metadata } from "next";

import { CommunityModeration } from "@/components/social";
import { listModerationQueue } from "@/lib/social/posts";

export const metadata: Metadata = { title: "Moderación de comunidad · Bellas Artes" };

export default async function CommunityAdminPage() {
  let posts = [] as Awaited<ReturnType<typeof listModerationQueue>>;
  let error: string | null = null;
  try { posts = await listModerationQueue("pending"); } catch { error = "La cola de moderación no está disponible en este entorno."; }
  return <div className="min-h-screen text-white"><header className="mb-8"><p className="text-xs font-semibold uppercase tracking-[.18em] text-amber-300">Administración</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Moderación de la comunidad</h1><p className="mt-3 text-sm text-slate-500">Aprueba, rechaza u oculta publicaciones. El feed público sólo consulta contenido aprobado.</p></header>{error ? <p className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 text-xs text-amber-200">{error}</p> : <CommunityModeration posts={posts} />}</div>;
}
