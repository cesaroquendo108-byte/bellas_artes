"use client";

import { Plus, SearchX, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { BrandKit } from "@/lib/brand-kits/contracts";
import { BrandKitCard } from "./brand-kit-card";

export function BrandKitsDashboard({
  kits,
  error,
}: {
  kits: BrandKit[];
  error?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/brand-kits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const body = (await response.json()) as {
        kit?: BrandKit;
        message?: string;
      };

      if (!response.ok || !body.kit) {
        throw new Error(body.message ?? "No se pudo crear el kit.");
      }

      setOpen(false);
      router.push(`/brand-kits/${body.kit.id}`);
      router.refresh();
    } catch (reason) {
      setMessage(
        reason instanceof Error ? reason.message : "No se pudo crear el kit.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="workspace-page px-0 py-2 sm:py-4">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-300">
            Sistemas de marca
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
            Tus kits de marca
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            Guarda logos, colores, tipografías y reglas para mantener
            consistencia entre generaciones.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button
                size="lg"
                className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
              />
            }
          >
            <Plus /> Crear nuevo kit de marca
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear kit de marca</DialogTitle>
              <DialogDescription>
                Comienza con un nombre. Podrás completar todos los elementos en
                el editor.
              </DialogDescription>
            </DialogHeader>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nombre de la marca"
              autoFocus
            />
            {message && (
              <p role="status" className="text-xs text-rose-300">
                {message}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                onClick={create}
                disabled={busy || !name.trim()}
              >
                {busy ? "Creando…" : "Crear kit"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {error && (
        <div className="mt-7 rounded-xl border border-amber-400/20 bg-amber-500/[0.08] p-4 text-xs text-amber-200">
          {error}
        </div>
      )}

      {kits.length ? (
        <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {kits.map((kit) => (
            <BrandKitCard key={kit.id} kit={kit} />
          ))}
        </div>
      ) : (
        <div className="mt-9 flex min-h-[55vh] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 text-center">
          <SearchX className="size-8 text-slate-700" />
          <h2 className="mt-4 text-base font-medium text-slate-300">
            No tienes kits de marca
          </h2>
          <p className="mt-2 max-w-sm text-xs leading-5 text-slate-600">
            Crea una identidad reutilizable sin fabricar logos ni recursos
            ficticios.
          </p>
          <Button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-5 bg-violet-600 text-white"
          >
            <Sparkles /> Crear el primero
          </Button>
        </div>
      )}
    </div>
  );
}
