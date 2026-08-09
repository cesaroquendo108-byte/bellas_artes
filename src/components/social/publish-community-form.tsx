"use client";

import { ImageIcon, LoaderCircle, Send, Video } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  communityCategories,
  type CommunityCategory,
} from "@/lib/social/contracts";

const categoryLabels: Record<CommunityCategory, string> = {
  "marketing-advertising": "Marketing & Advertising",
  "film-stories": "Film & Stories",
  "music-video": "Music Video",
  animation: "Animation",
  ugc: "UGC",
  anime: "Anime",
};

export interface PublishableAsset {
  id: string;
  name: string;
  type: "image" | "video";
  signedUrl: string;
}

export function PublishCommunityForm({
  assets,
}: {
  assets: PublishableAsset[];
}) {
  const router = useRouter();
  const [assetId, setAssetId] = useState(assets[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState<CommunityCategory>("film-stories");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{
    tone: "error" | "success";
    text: string;
  } | null>(null);
  const selected = useMemo(
    () => assets.find((asset) => asset.id === assetId),
    [assetId, assets],
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setMessage(null);

    try {
      const targetPath = selected.type === "video" ? "/video/v2v" : "/image";
      const response = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: selected.id,
          title,
          description: description.trim() || null,
          category,
          directPayload: {
            kind: selected.type,
            targetPath,
            prompt: prompt.trim() || undefined,
          },
        }),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(body.message ?? "No se pudo enviar la publicación.");
      setMessage({
        tone: "success",
        text: "Enviada a moderación. No aparecerá en Inspire hasta ser aprobada.",
      });
      setTitle("");
      setDescription("");
      setPrompt("");
      router.refresh();
    } catch (reason) {
      setMessage({
        tone: "error",
        text:
          reason instanceof Error
            ? reason.message
            : "No se pudo enviar la publicación.",
      });
    } finally {
      setBusy(false);
    }
  }

  if (!assets.length) {
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-5 text-center">
        <ImageIcon className="size-9 text-slate-700" />
        <h2 className="mt-4 font-semibold text-white">
          No hay recursos publicables
        </h2>
        <p className="mt-2 max-w-md text-xs leading-5 text-slate-500">
          Genera o sube una imagen o video a tu biblioteca. Audio y documentos
          no se publican en Inspire.
        </p>
        <Button
          type="button"
          onClick={() => router.push("/assets")}
          className="mt-5 bg-violet-600 text-white"
        >
          Abrir biblioteca
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_380px]"
    >
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black">
        <div className="aspect-video">
          {selected?.type === "video" ? (
            <video
              src={selected.signedUrl}
              controls
              className="size-full object-contain"
            />
          ) : selected ? (
            // Private signed URLs are intentionally rendered without image optimization.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selected.signedUrl}
              alt={selected.name}
              className="size-full object-contain"
            />
          ) : null}
        </div>
        <div className="grid gap-2 border-t border-white/[0.08] bg-[#111114] p-3 sm:grid-cols-2">
          {assets.map((asset) => (
            <button
              key={asset.id}
              type="button"
              onClick={() => setAssetId(asset.id)}
              className={`flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition ${asset.id === assetId ? "border-violet-400/50 bg-violet-500/10 text-white" : "border-white/[0.06] text-slate-500 hover:text-white"}`}
            >
              {asset.type === "video" ? (
                <Video className="size-4 shrink-0" />
              ) : (
                <ImageIcon className="size-4 shrink-0" />
              )}
              <span className="truncate">{asset.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-5 rounded-2xl border border-white/[0.08] bg-[#111114] p-5">
        <div className="space-y-2">
          <Label htmlFor="community-title">Título</Label>
          <Input
            id="community-title"
            required
            maxLength={160}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Categoría</Label>
          <Select
            value={category}
            onValueChange={(value) =>
              value && setCategory(value as CommunityCategory)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {communityCategories.map((value) => (
                <SelectItem key={value} value={value}>
                  {categoryLabels[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="community-description">Descripción</Label>
          <Textarea
            id="community-description"
            maxLength={2000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="community-prompt">Contexto para Direct this</Label>
          <Textarea
            id="community-prompt"
            maxLength={4000}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Prompt opcional que el visitante podrá revisar en el estudio."
          />
        </div>
        {message && (
          <p
            role="status"
            className={
              message.tone === "success"
                ? "text-xs leading-5 text-emerald-300"
                : "text-xs leading-5 text-rose-300"
            }
          >
            {message.text}
          </p>
        )}
        <Button
          type="submit"
          disabled={busy || !title.trim() || !selected}
          className="w-full bg-violet-600 text-white"
        >
          {busy ? <LoaderCircle className="animate-spin" /> : <Send />}
          {busy ? "Enviando…" : "Enviar a moderación"}
        </Button>
      </div>
    </form>
  );
}
