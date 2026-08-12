"use client";

import Link from "next/link";
import { ArrowLeft, Check, LoaderCircle, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { BrandKit } from "@/lib/brand-kits/contracts";
import { BrandColorPalette } from "./brand-color-palette";
import { BrandGuidelinesForm } from "./brand-guidelines-form";
import { BrandLogoDropzone } from "./brand-logo-dropzone";
import { BrandTypographyForm } from "./brand-typography-form";

export function BrandKitEditor({ initialKit }: { initialKit: BrandKit }) {
  const router = useRouter();
  const [kit, setKit] = useState(initialKit);
  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/brand-kits/${kit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: kit.name,
          description: kit.description,
          colors: kit.colors,
          typography: kit.typography,
          guidelines: kit.guidelines,
          negativePrompt: kit.negativePrompt,
        }),
      });
      const body = (await response.json()) as {
        kit?: BrandKit;
        message?: string;
      };
      if (!response.ok || !body.kit)
        throw new Error(body.message ?? "No se pudo guardar.");
      setKit(body.kit);
      setSaveState("saved");
      router.refresh();
    } catch (reason) {
      setSaveState("error");
      setMessage(
        reason instanceof Error ? reason.message : "No se pudo guardar.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File) {
    setBusy(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("kind", "logo");
      const response = await fetch(`/api/brand-kits/${kit.id}/assets`, {
        method: "POST",
        body: form,
      });
      const body = (await response.json()) as {
        kit?: BrandKit;
        message?: string;
      };
      if (!response.ok || !body.kit) throw new Error(body.message);
      setKit(body.kit);
    } catch (reason) {
      setMessage(
        reason instanceof Error ? reason.message : "No se pudo subir el logo.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function remove(assetId: string) {
    setBusy(true);
    try {
      const response = await fetch(
        `/api/brand-kits/${kit.id}/assets/${assetId}`,
        { method: "DELETE" },
      );
      const body = (await response.json()) as {
        kit?: BrandKit;
        message?: string;
      };
      if (!response.ok || !body.kit) throw new Error(body.message);
      setKit(body.kit);
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "No se pudo quitar el recurso.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function removeKit() {
    setBusy(true);
    const response = await fetch(`/api/brand-kits/${kit.id}`, {
      method: "DELETE",
    });
    if (response.ok) {
      router.push("/brand-kits");
      router.refresh();
    } else {
      setMessage("No se pudo eliminar el kit.");
      setBusy(false);
    }
  }
  return (
    <div className="workspace-page p-0 sm:p-2 lg:p-4">
      <header className="flex flex-wrap items-center gap-3 border-b border-white/[0.07] pb-5">
        <Button
          render={<Link href="/brand-kits" />}
          nativeButton={false}
          variant="ghost"
          size="icon"
        >
          <ArrowLeft />
          <span className="sr-only">Volver</span>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold">{kit.name}</h1>
          <p className="text-[10px] text-slate-600">
            Kit de marca privado · {kit.assets.length} recursos
          </p>
        </div>
        <span
          className={`text-[10px] ${saveState === "error" ? "text-rose-300" : "text-slate-500"}`}
        >
          {saveState === "saved" ? (
            <span className="flex items-center gap-1">
              <Check className="size-3" /> Guardado
            </span>
          ) : saveState === "error" ? (
            "Error"
          ) : (
            "Sin guardar"
          )}
        </span>
        <Button
          type="button"
          onClick={save}
          disabled={busy || !kit.name.trim()}
          className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
        >
          {busy ? <LoaderCircle className="animate-spin" /> : <Save />} Save
          Changes
        </Button>
      </header>
      {message && (
        <div
          role="status"
          className="mt-5 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-xs text-rose-200"
        >
          {message}
        </div>
      )}
      <div className="mt-7 grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-5 rounded-2xl border border-white/[0.08] bg-[#111114] p-5">
          <div>
            <Label>Nombre</Label>
            <Input
              className="mt-2"
              value={kit.name}
              onChange={(event) => {
                setKit({ ...kit, name: event.target.value });
                setSaveState("idle");
              }}
            />
          </div>
          <div>
            <Label>Descripción</Label>
            <Textarea
              className="mt-2 min-h-28"
              value={kit.description ?? ""}
              onChange={(event) => {
                setKit({ ...kit, description: event.target.value || null });
                setSaveState("idle");
              }}
            />
          </div>
          <div className="pt-4">
            <Button
              type="button"
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
              className="w-full"
            >
              <Trash2 /> Eliminar kit
            </Button>
          </div>
        </aside>
        <main className="min-w-0 rounded-2xl border border-white/[0.08] bg-[#111114] p-4 sm:p-6">
          <Tabs defaultValue="logos">
            <TabsList className="max-w-full overflow-x-auto bg-white/[0.04]">
              <TabsTrigger value="logos">Logos</TabsTrigger>
              <TabsTrigger value="colors">Colores</TabsTrigger>
              <TabsTrigger value="typography">Tipografía</TabsTrigger>
              <TabsTrigger value="rules">Reglas</TabsTrigger>
            </TabsList>
            <TabsContent value="logos" className="mt-7">
              <BrandLogoDropzone
                assets={kit.assets}
                onUpload={upload}
                onRemove={remove}
                busy={busy}
              />
            </TabsContent>
            <TabsContent value="colors" className="mt-7">
              <BrandColorPalette
                colors={kit.colors}
                onChange={(colors) => {
                  setKit({ ...kit, colors });
                  setSaveState("idle");
                }}
              />
            </TabsContent>
            <TabsContent value="typography" className="mt-7">
              <BrandTypographyForm
                value={kit.typography}
                onChange={(typography) => {
                  setKit({ ...kit, typography });
                  setSaveState("idle");
                }}
              />
            </TabsContent>
            <TabsContent value="rules" className="mt-7">
              <BrandGuidelinesForm
                guidelines={kit.guidelines}
                negativePrompt={kit.negativePrompt}
                onGuidelinesChange={(guidelines) => {
                  setKit({ ...kit, guidelines });
                  setSaveState("idle");
                }}
                onNegativePromptChange={(negativePrompt) => {
                  setKit({ ...kit, negativePrompt });
                  setSaveState("idle");
                }}
              />
            </TabsContent>
          </Tabs>
        </main>
      </div>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar “{kit.name}”</DialogTitle>
            <DialogDescription>
              Se eliminará el kit y sus vínculos. Los recursos originales
              permanecerán en tu biblioteca.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={removeKit}
            >
              Eliminar kit de marca
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
