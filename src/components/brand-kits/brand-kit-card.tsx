import Link from "next/link";
import { ArrowRight, ImageIcon } from "lucide-react";
import type { BrandKit } from "@/lib/brand-kits/contracts";
/* eslint-disable @next/next/no-img-element -- private R2 URLs are short-lived. */
export function BrandKitCard({ kit }: { kit: BrandKit }) {
  return (
    <Link
      href={`/brand-kits/${kit.id}`}
      className="group overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111114] transition hover:-translate-y-1 hover:border-violet-400/40"
    >
      <div className="relative flex aspect-[16/8] items-center justify-center overflow-hidden bg-[#0d0d10]">
        {kit.assets[0]?.signedUrl ? (
          <img
            src={kit.assets[0].signedUrl}
            alt=""
            className="size-full object-contain p-5"
          />
        ) : (
          <ImageIcon className="size-8 text-slate-700" />
        )}
        <div className="absolute right-3 bottom-3 flex gap-1">
          {kit.colors.slice(0, 5).map((color) => (
            <span
              key={color}
              className="size-5 rounded-full border border-white/20"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-white">
              {kit.name}
            </h2>
            <p className="mt-1 text-[10px] text-slate-600">
              {kit.assets.length} recursos · {kit.colors.length} colores
            </p>
          </div>
          <ArrowRight className="size-4 text-slate-600 transition group-hover:translate-x-1 group-hover:text-violet-300" />
        </div>
      </div>
    </Link>
  );
}
