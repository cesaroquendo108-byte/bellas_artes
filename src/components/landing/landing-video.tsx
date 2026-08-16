"use client";

import { useEffect, useRef } from "react";
import type { VideoHTMLAttributes } from "react";

import { cn } from "@/lib/utils";
import { landingVideos, type LandingVideoKey } from "@/lib/landing/content";

type LandingVideoProps = Omit<
  VideoHTMLAttributes<HTMLVideoElement>,
  "aria-label" | "autoPlay" | "loop" | "muted" | "poster" | "preload" | "src"
> & {
  videoKey: LandingVideoKey;
  eager?: boolean;
};

export function LandingVideo({ videoKey, eager = false, className, ...props }: LandingVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const asset = landingVideos[videoKey];

  useEffect(() => {
    const video = videoRef.current;
    if (!video || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    if (eager || !("IntersectionObserver" in window)) {
      void video.play().catch(() => undefined);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      },
      { rootMargin: "160px 0px", threshold: 0.1 },
    );

    observer.observe(video);
    return () => {
      observer.disconnect();
      video.pause();
    };
  }, [eager]);

  return (
    <video
      ref={videoRef}
      className={cn("size-full object-cover", className)}
      aria-label={asset.alt}
      loop
      muted
      playsInline
      poster={asset.poster}
      preload={eager ? "auto" : "metadata"}
      {...props}
    >
      <source src={asset.src} type="video/mp4" />
      {asset.alt}
    </video>
  );
}
