import Link from "next/link";
import { Download, Maximize2, Mic2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export function VideoActionToolbar() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled
        className="border-white/10 bg-white/[0.03]"
      >
        <Download /> Descargar
      </Button>
      <Button
        render={<Link href="/video/upscale" />}
        nativeButton={false}
        variant="outline"
        size="sm"
        className="border-white/10 bg-white/[0.03]"
      >
        <Maximize2 /> Mejorar
      </Button>
      <Button
        render={<Link href="/video/lip-sync" />}
        nativeButton={false}
        variant="outline"
        size="sm"
        className="border-white/10 bg-white/[0.03]"
      >
        <Mic2 /> Sincronía labial
      </Button>
      <Button
        render={<Link href="/video/extend" />}
        nativeButton={false}
        variant="outline"
        size="sm"
        className="border-white/10 bg-white/[0.03]"
      >
        <Sparkles /> Extender
      </Button>
    </div>
  );
}
