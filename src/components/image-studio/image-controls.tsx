"use client"

import { ChevronDown, Coins, LoaderCircle, SlidersHorizontal, Sparkles, WandSparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

import { ImageReferenceDropzones } from "./image-reference-dropzones"
import type {
  ImageGenerationMode,
  ImageStudioSettings,
  LocalReferences,
  ReferenceCategory,
  SelectedReferenceAsset,
} from "./types"

interface ImageControlsProps {
  mode: ImageGenerationMode
  settings: ImageStudioSettings
  references: LocalReferences
  selectedAsset: SelectedReferenceAsset | null
  isSubmitting: boolean
  feedback: { tone: "error" | "info"; message: string } | null
  onModeChange: (mode: ImageGenerationMode) => void
  onSettingsChange: (settings: ImageStudioSettings) => void
  onAddFiles: (category: ReferenceCategory, files: File[]) => void
  onRemoveFile: (category: ReferenceCategory, id: string) => void
  onRemoveSelectedAsset: () => void
  onSubmit: () => void
}

export function ImageControls({
  mode,
  settings,
  references,
  selectedAsset,
  isSubmitting,
  feedback,
  onModeChange,
  onSettingsChange,
  onAddFiles,
  onRemoveFile,
  onRemoveSelectedAsset,
  onSubmit,
}: ImageControlsProps) {
  function update<K extends keyof ImageStudioSettings>(key: K, value: ImageStudioSettings[K]) {
    onSettingsChange({ ...settings, [key]: value })
  }

  return (
    <form
      className="flex h-full max-h-[92dvh] min-h-0 flex-col"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-5 p-4 sm:p-5">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/20">
              <WandSparkles className="size-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-white">Image Studio</h1>
              <p className="text-[11px] text-slate-500">Crea, explora y vuelve a imaginar</p>
            </div>
          </div>
        </div>

        <Tabs value={mode} onValueChange={(value) => onModeChange(value as ImageGenerationMode)}>
          <TabsList className="w-full bg-white/[0.05]">
            <TabsTrigger value="create">Create Image</TabsTrigger>
            <TabsTrigger value="variation">Image Variations</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-2">
          <Label>Model</Label>
          <Select
            value={settings.model}
            itemToStringLabel={(value) => value === "gpt-image-2" ? "GPT Image 2" : String(value)}
            onValueChange={(value) => value && update("model", value as "gpt-image-2")}
          >
            <SelectTrigger className="w-full border-white/10 bg-white/[0.035]">
              <div className="flex items-center gap-2">
                <Sparkles className="size-3.5 text-violet-300" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="gpt-image-2">GPT Image 2</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="image-prompt">Prompt</Label>
            <span className="text-[10px] text-slate-600">{settings.prompt.length.toLocaleString("es-VE")} caracteres</span>
          </div>
          <Textarea
            id="image-prompt"
            value={settings.prompt}
            onChange={(event) => update("prompt", event.target.value)}
            placeholder="Describe la escena, el estilo, la iluminación y todos los detalles que imaginas..."
            className="min-h-32 resize-none border-white/10 bg-white/[0.025] leading-6 placeholder:text-slate-600 focus-visible:border-violet-400/60"
          />
        </div>

        <ImageReferenceDropzones
          references={references}
          selectedAsset={selectedAsset}
          onAddFiles={onAddFiles}
          onRemoveFile={onRemoveFile}
          onRemoveSelectedAsset={onRemoveSelectedAsset}
        />

        <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
          <div>
            <Label htmlFor="auto-polish">Auto Polish</Label>
            <p className="mt-1 text-[10px] text-slate-500">Mejora el prompt antes de generar</p>
          </div>
          <Switch id="auto-polish" checked={settings.autoPolish} onCheckedChange={(checked) => update("autoPolish", checked)} />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <CompactSelect label="Ratio" value={settings.aspectRatio} values={["1:1", "16:9", "9:16", "4:5"]} onChange={(value) => update("aspectRatio", value as ImageStudioSettings["aspectRatio"])} />
          <CompactSelect label="Resolution" value={settings.resolution} values={["1k", "2k"]} onChange={(value) => update("resolution", value as ImageStudioSettings["resolution"])} />
          <CompactSelect label="Quality" value={settings.quality} values={["low", "medium", "high"]} onChange={(value) => update("quality", value as ImageStudioSettings["quality"])} />
        </div>

        <Card className="gap-3 border border-white/[0.07] bg-white/[0.02] py-3 ring-0">
          <CardHeader className="flex flex-row items-center justify-between px-3">
            <CardTitle className="flex items-center gap-2 text-xs text-slate-200">
              <SlidersHorizontal className="size-3.5 text-violet-300" />
              Advanced controls
            </CardTitle>
            <ChevronDown className="size-3.5 text-slate-600" />
          </CardHeader>
          <CardContent className="space-y-4 px-3">
            <SliderControl label="CFG Scale" value={settings.cfgScale} min={1} max={20} step={0.5} onChange={(value) => update("cfgScale", value)} />
            <SliderControl label="Steps" value={settings.steps} min={4} max={50} step={1} onChange={(value) => update("steps", value)} />
          </CardContent>
        </Card>

        {feedback && (
          <div role="status" className={feedback.tone === "error" ? "rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-xs leading-5 text-rose-200" : "rounded-xl border border-violet-400/20 bg-violet-500/10 p-3 text-xs leading-5 text-violet-200"}>
            {feedback.message}
          </div>
        )}
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-white/[0.07] bg-[#101012]/95 p-4 backdrop-blur-xl sm:p-5">
        {isSubmitting && <Progress value={null} className="mb-3 overflow-hidden [&_[data-slot=progress-indicator]]:animate-pulse" />}
        <Button
          type="submit"
          disabled={isSubmitting || !settings.prompt.trim()}
          className="h-11 w-full rounded-xl border-0 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:scale-[1.01] hover:shadow-violet-500/40 disabled:scale-100"
        >
          {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : <WandSparkles className="size-4" />}
          {isSubmitting ? "Preparando..." : "Generate Image"}
          <Badge className="ml-auto border border-white/15 bg-black/20 text-[10px] text-white">
            <Coins className="size-3" /> 0 ahora
          </Badge>
        </Button>
      </div>
    </form>
  )
}

function CompactSelect({ label, value, values, onChange }: { label: string; value: string; values: string[]; onChange: (value: string) => void }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label className="text-[10px] text-slate-500">{label}</Label>
      <Select value={value} onValueChange={(next) => next && onChange(next)}>
        <SelectTrigger className="h-8 w-full min-w-0 border-white/10 bg-white/[0.025] px-2 text-[11px] capitalize">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {values.map((option) => <SelectItem key={option} value={option} className="capitalize">{option}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}

function SliderControl({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-400">{label}</span>
        <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 font-medium text-slate-200">{value}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(values) => onChange(Array.isArray(values) ? values[0] : values)} />
    </div>
  )
}
