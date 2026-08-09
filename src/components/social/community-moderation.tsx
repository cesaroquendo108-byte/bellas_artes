"use client";

import { Check, EyeOff, LoaderCircle, SearchX, X } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { CommunityPost } from "@/lib/social/contracts";

export function CommunityModeration({ posts }: { posts: CommunityPost[] }) {
  const router = useRouter();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function moderate(id: string, decision: "approve" | "reject" | "hide") {
    setBusy(`${id}:${decision}`);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/community/posts/${id}/moderate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision,
            note: notes[id]?.trim() || undefined,
          }),
        },
      );
      const body = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(body.message ?? "No se pudo moderar la publicación.");
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudo moderar la publicación.",
      );
    } finally {
      setBusy(null);
    }
  }

  if (!posts.length) {
    return (
      <div className="flex min-h-[52vh] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 text-center">
        <SearchX className="size-8 text-slate-700" />
        <h2 className="mt-4 font-medium text-slate-300">Cola al día</h2>
        <p className="mt-2 text-xs text-slate-600">
          No hay publicaciones pendientes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <p
          role="status"
          className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-4 text-xs text-rose-200"
        >
          {error}
        </p>
      )}
      <div className="grid gap-5 xl:grid-cols-2">
        {posts.map((post) => (
          <article
            key={post.id}
            className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111114]"
          >
            <div className="aspect-video bg-black">
              {post.signedUrl ? (
                post.assetType === "video" ? (
                  <video
                    src={post.signedUrl}
                    controls
                    className="size-full object-contain"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.signedUrl}
                    alt={post.title}
                    className="size-full object-cover"
                  />
                )
              ) : (
                <div className="flex size-full items-center justify-center text-xs text-amber-200">
                  El recurso no está disponible.
                </div>
              )}
            </div>
            <div className="space-y-4 p-5">
              <div>
                <p className="text-[10px] uppercase tracking-[.16em] text-violet-300">
                  {post.category}
                </p>
                <h2 className="mt-2 font-semibold text-white">{post.title}</h2>
                <p className="mt-1 text-xs text-slate-500">
                  por {post.authorName}
                </p>
                {post.description && (
                  <p className="mt-3 text-xs leading-5 text-slate-400">
                    {post.description}
                  </p>
                )}
              </div>
              <Textarea
                value={notes[post.id] ?? ""}
                onChange={(event) =>
                  setNotes((current) => ({
                    ...current,
                    [post.id]: event.target.value,
                  }))
                }
                placeholder="Nota de moderación opcional"
                maxLength={1000}
              />
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  onClick={() => moderate(post.id, "approve")}
                  disabled={Boolean(busy)}
                  className="bg-emerald-600 text-white"
                >
                  {busy === `${post.id}:approve` ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <Check />
                  )}{" "}
                  Aprobar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => moderate(post.id, "reject")}
                  disabled={Boolean(busy)}
                >
                  <X /> Rechazar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => moderate(post.id, "hide")}
                  disabled={Boolean(busy)}
                >
                  <EyeOff /> Ocultar
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
