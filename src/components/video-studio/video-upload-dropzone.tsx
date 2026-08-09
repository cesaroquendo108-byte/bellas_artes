"use client";

import {
  FileAudio,
  FileImage,
  FileVideo,
  FolderOpen,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useId, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import type { MediaSlot, StudioAsset } from "./types";
import { useVideoStudio } from "./video-studio-context";

interface VideoUploadDropzoneProps {
  slot: MediaSlot;
  title: string;
  description: string;
  type: "video" | "image" | "audio";
  assets: StudioAsset[];
  maxMb?: number;
}

const acceptByType = {
  video: "video/mp4,video/quicktime,video/webm",
  image: "image/jpeg,image/png,image/webp",
  audio: "audio/mpeg,audio/wav,audio/mp4,audio/x-m4a",
};

const iconByType = { video: FileVideo, image: FileImage, audio: FileAudio };

export function VideoUploadDropzone({
  slot,
  title,
  description,
  type,
  assets,
  maxMb = type === "video" ? 100 : 50,
}: VideoUploadDropzoneProps) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { state, setLocalMedia, clearLocalMedia, selectSavedAsset } =
    useVideoStudio();
  const local = state.localMedia[slot];
  const saved = state.savedAssets[slot];
  const Icon = iconByType[type];
  const matchingAssets = assets.filter((asset) => asset.type === type);

  function choose(file?: File) {
    if (!file) return;
    const accepts =
      file.type.startsWith(`${type}/`) ||
      (type === "audio" && file.type.startsWith("audio/"));
    if (!accepts || file.size > maxMb * 1024 * 1024) {
      setError(`Usa un archivo ${type} válido de hasta ${maxMb} MB.`);
      return;
    }
    setError(null);
    setLocalMedia(slot, file, type);
  }

  if (local || saved) {
    const previewUrl = local?.previewUrl ?? saved?.signedUrl ?? "";
    const name = local?.file.name ?? saved?.name ?? title;
    return (
      <div className="overflow-hidden rounded-xl border border-violet-400/20 bg-violet-500/[0.06]">
        <div className="relative aspect-video bg-black/60">
          {type === "video" && (
            <video
              src={previewUrl}
              className="size-full object-cover"
              controls
              preload="metadata"
            />
          )}
          {type === "image" && (
            <div
              role="img"
              aria-label={name}
              className="size-full bg-cover bg-center"
              style={{ backgroundImage: `url(${previewUrl})` }}
            />
          )}
          {type === "audio" && (
            <div className="flex size-full items-center justify-center px-4">
              <audio src={previewUrl} controls className="w-full" />
            </div>
          )}
          <Badge className="absolute top-2 left-2 border border-white/10 bg-black/70 text-[10px] text-white">
            {local ? "Preview local" : "Asset guardado"}
          </Badge>
        </div>
        <div className="flex items-center gap-2 p-2.5">
          <Icon className="size-4 shrink-0 text-violet-300" />
          <span className="min-w-0 flex-1 truncate text-xs text-slate-300">
            {name}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() =>
              local ? clearLocalMedia(slot) : selectSavedAsset(slot)
            }
            aria-label={`Quitar ${name}`}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input
        id={inputId}
        type="file"
        accept={acceptByType[type]}
        className="sr-only"
        onChange={(event) => {
          choose(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <label
        htmlFor={inputId}
        className={cn(
          "flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.025] p-4 text-center transition hover:border-violet-400/60 hover:bg-violet-500/[0.06]",
          dragging && "border-violet-400 bg-violet-500/10",
        )}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          choose(event.dataTransfer.files[0]);
        }}
      >
        <UploadCloud className="mb-2 size-6 text-violet-300" />
        <span className="text-xs font-medium text-slate-200">{title}</span>
        <span className="mt-1 text-[10px] leading-4 text-slate-500">
          {description} · máx. {maxMb} MB
        </span>
      </label>
      {matchingAssets.length > 0 && (
        <Select
          value={null}
          onValueChange={(id) =>
            selectSavedAsset(
              slot,
              matchingAssets.find((asset) => asset.id === id),
            )
          }
        >
          <SelectTrigger className="h-8 w-full border-white/10 bg-white/[0.025] text-[11px] text-slate-400">
            <FolderOpen className="size-3.5 text-violet-300" />
            <SelectValue placeholder="Elegir de mi biblioteca" />
          </SelectTrigger>
          <SelectContent align="start">
            {matchingAssets.map((asset) => (
              <SelectItem key={asset.id} value={asset.id}>
                {asset.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {error && (
        <p role="alert" className="text-[11px] text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}
