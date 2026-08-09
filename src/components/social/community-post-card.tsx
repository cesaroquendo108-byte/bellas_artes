"use client";

import { UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { CommunityPost } from "@/lib/social/contracts";
import { RemixButton } from "./remix-button";

/* eslint-disable @next/next/no-img-element -- private R2 URLs are short-lived and cannot be optimized safely. */
export function CommunityPostCard({ post }: { post: CommunityPost }) {
  const initials = post.authorName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <Dialog>
      <article className="group w-[280px] shrink-0 sm:w-[330px]">
        <DialogTrigger className="block w-full text-left">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-violet-950 to-black">
            {post.signedUrl && post.assetType === "image" && (
              <img
                src={post.signedUrl}
                alt={post.title}
                className="size-full object-cover transition duration-500 group-hover:scale-105"
              />
            )}
            {post.signedUrl && post.assetType === "video" && (
              <video
                src={post.signedUrl}
                muted
                playsInline
                preload="metadata"
                className="size-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-black/10 transition group-hover:bg-black/50" />
            <span className="absolute inset-0 m-auto flex h-fit w-fit rounded-lg bg-violet-600 px-4 py-2 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
              Direct this
            </span>
            {!post.signedUrl && (
              <span className="absolute inset-0 flex items-center justify-center text-xs text-slate-600">
                Media no disponible
              </span>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Avatar className="size-7">
              {post.authorAvatar && (
                <AvatarImage src={post.authorAvatar} alt="" />
              )}
              <AvatarFallback className="bg-violet-500/10 text-[9px] text-violet-300">
                {initials || <UserRound className="size-3" />}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-medium text-slate-200">
                {post.title}
              </h3>
              <p className="truncate text-[10px] text-slate-600">
                {post.authorName}
              </p>
            </div>
          </div>
        </DialogTrigger>
      </article>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{post.title}</DialogTitle>
          <DialogDescription>
            {post.authorName} · {post.category}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-black">
          {post.signedUrl && post.assetType === "image" ? (
            <img
              src={post.signedUrl}
              alt={post.title}
              className="max-h-[60dvh] w-full object-contain"
            />
          ) : post.signedUrl && post.assetType === "video" ? (
            <video
              src={post.signedUrl}
              controls
              playsInline
              className="max-h-[60dvh] w-full"
            />
          ) : (
            <div className="flex aspect-video items-center justify-center text-xs text-slate-600">
              Media no disponible
            </div>
          )}
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-500">
          {post.description || "El autor no añadió una descripción pública."}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <Badge className="bg-violet-500/10 text-violet-300">
            {post.category}
          </Badge>
          <RemixButton postId={post.id} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
