"use client";

import Link from "next/link";
import { useState } from "react";
import { Liquid } from "liquid-gooey";
import { ImageIcon, PanelsTopLeft, WandSparkles, X } from "lucide-react";

/**
 * A compact creation dock for the authenticated workspace. The real buttons
 * stay in the DOM and remain keyboard accessible while Liquid only paints the
 * shared surface behind them.
 */
export function LiquidCreateActions() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative h-[4.5rem] w-[18rem] max-w-full" aria-label="Acciones rápidas de creación">
      <Liquid
        blur={9}
        contrast={22}
        fill="#ffffff"
        filterPadding={30}
        shadow="0 8px 24px rgba(91, 33, 182, .16)"
        id="dashboard-liquid-create-options"
        role="group"
        className="relative size-full"
      >
        <Liquid.Item
          x={open ? -102 : 0}
          y={open ? 0 : 0}
          transition="bouncy"
          className="absolute left-1/2 top-1/2 z-10 -mt-7 -ml-16 w-32"
        >
          <Link
            href="/image"
            onClick={() => setOpen(false)}
            aria-hidden={!open}
            tabIndex={open ? 0 : -1}
            className="flex h-14 w-32 items-center justify-center gap-2 rounded-2xl border border-violet-200 px-3 text-xs font-semibold text-violet-800 outline-none transition hover:border-violet-300 hover:text-violet-950 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffdf8]"
          >
            <ImageIcon className="size-4" aria-hidden="true" />
            Imagen
          </Link>
        </Liquid.Item>

        <Liquid.Item
          x={open ? 102 : 0}
          y={0}
          transition="bouncy"
          delay={35}
          className="absolute left-1/2 top-1/2 z-10 -mt-7 -ml-16 w-32"
        >
          <Link
            href="/director"
            onClick={() => setOpen(false)}
            aria-hidden={!open}
            tabIndex={open ? 0 : -1}
            className="flex h-14 w-32 items-center justify-center gap-2 rounded-2xl border border-fuchsia-200 px-3 text-xs font-semibold text-fuchsia-800 outline-none transition hover:border-fuchsia-300 hover:text-fuchsia-950 focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffdf8]"
          >
            <PanelsTopLeft className="size-4" aria-hidden="true" />
            Director
          </Link>
        </Liquid.Item>

        <Liquid.Item
          x={0}
          y={0}
          transition="snappy"
          className="absolute left-1/2 top-1/2 z-20 -mt-7 -ml-16 w-32"
        >
          <button
            type="button"
            aria-expanded={open}
            aria-controls="dashboard-liquid-create-options"
            onClick={() => setOpen((current) => !current)}
            className="flex h-14 w-32 items-center justify-center gap-2 rounded-2xl border border-violet-300 bg-violet-600 px-3 text-xs font-semibold text-white outline-none shadow-lg shadow-violet-200/70 transition hover:bg-violet-700 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffdf8]"
          >
            {open ? <X className="size-4" aria-hidden="true" /> : <WandSparkles className="size-4" aria-hidden="true" />}
            <span>{open ? "Cerrar" : "Crear"}</span>
          </button>
        </Liquid.Item>
      </Liquid>
    </div>
  );
}
