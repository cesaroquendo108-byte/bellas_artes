"use client"

import { Check, Copy, MessageCircle, MousePointer2, PlugZap, Sparkles, WandSparkles } from "lucide-react"
import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Platform = "claude" | "chatgpt" | "cursor" | "other"
const platforms: { value: Platform; label: string }[] = [
  { value: "claude", label: "Claude" },
  { value: "chatgpt", label: "ChatGPT" },
  { value: "cursor", label: "Cursor" },
  { value: "other", label: "Otro" },
]

function CodeBlock({ value, enabled }: { value: string; enabled: boolean }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    if (!enabled) return
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="relative mt-4 overflow-x-auto rounded-xl border border-white/10 bg-black/60 p-4 pr-12 font-mono text-xs leading-6 text-slate-400">
      <code>{value}</code>
      <Button type="button" variant="ghost" size="icon-sm" disabled={!enabled} onClick={copy} className="absolute top-2 right-2">
        {copied ? <Check className="text-emerald-300" /> : <Copy />}
      </Button>
    </div>
  )
}

export function McpLanding({ serverUrl }: { serverUrl: string | null }) {
  const configured = Boolean(serverUrl)
  const [platform, setPlatform] = useState<Platform>("claude")
  const config = useMemo(
    () => JSON.stringify({ mcpServers: { "bellas-artes": { url: serverUrl ?? "MCP_SERVER_NOT_CONFIGURED" } } }, null, 2),
    [serverUrl],
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-7 sm:py-20">
      <header className="mx-auto max-w-4xl text-center">
        <Badge className="border border-violet-400/20 bg-violet-500/10 text-violet-200">
          <PlugZap /> Integraciones MCP
        </Badge>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-6xl">Conecta Bellas Artes con tu agente de IA.</h1>
        <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-500">
          Prepara Claude, ChatGPT, Cursor u otro cliente para acceder a herramientas creativas desde una sola conexión.
        </p>
        {!configured && (
          <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-amber-400/20 bg-amber-500/[0.08] p-4 text-xs text-amber-200">
            La integración MCP está preparada, pero el servidor todavía no está configurado.
          </div>
        )}
      </header>

      <Tabs value={platform} onValueChange={(value) => setPlatform(value as Platform)} className="mt-12">
        <TabsList className="mx-auto flex h-auto max-w-2xl overflow-x-auto border border-white/10 bg-white/[0.04] p-1">
          {platforms.map((item) => (
            <TabsTrigger key={item.value} value={item.value} className="h-11 min-w-28 data-active:bg-violet-600 data-active:text-white">
              {item.value === "cursor" ? <MousePointer2 /> : <MessageCircle />}
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {platforms.map((item) => (
          <TabsContent key={item.value} value={item.value} className="mt-8">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { title: "Abre la configuración", description: `En ${item.label}, abre el panel de herramientas o servidores MCP.` },
                { title: "Añade Bellas Artes", description: "Crea una conexión HTTP usando la URL y configuración mostradas abajo." },
                { title: "Verifica la conexión", description: "Confirma que el cliente reconoce las herramientas antes de iniciar una tarea." },
              ].map((step, index) => (
                <Card key={step.title} className="border-white/[0.08] bg-[#111114] p-5">
                  <span className="flex size-9 items-center justify-center rounded-full bg-violet-500/15 font-semibold text-violet-300">{index + 1}</span>
                  <h2 className="mt-5 font-semibold text-white">{step.title}</h2>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{step.description}</p>
                </Card>
              ))}
            </div>
            <div className="mx-auto mt-7 max-w-3xl">
              <CodeBlock value={serverUrl ?? "Servidor MCP no configurado"} enabled={configured} />
              <CodeBlock value={config} enabled={configured} />
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <section className="mt-20">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-300">Funciones destacadas</p>
          <h2 className="mt-3 text-3xl font-semibold">Lo que el MCP llevará a tu agente</h2>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { icon: WandSparkles, title: "Creación conectada", copy: "Solicita imágenes, videos y recursos desde el contexto de tu agente cuando el servidor esté activo." },
            { icon: PlugZap, title: "Una conexión", copy: "Una configuración común para distintos clientes compatibles con MCP." },
            { icon: Sparkles, title: "Historial consistente", copy: "Mantén las acciones vinculadas con la biblioteca y sesión de Bellas Artes." },
          ].map(({ icon: Icon, title, copy }) => (
            <Card key={title} className="border-white/[0.08] bg-gradient-to-br from-[#15151a] to-black p-6">
              <Icon className="size-5 text-violet-300" />
              <h3 className="mt-5 font-semibold">{title}</h3>
              <p className="mt-2 text-xs leading-5 text-slate-500">{copy}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-3xl">
        <h2 className="text-center text-3xl font-semibold">Solo tienes que pedirlo</h2>
        <div className="mt-8 space-y-4">
          <div className="ml-auto max-w-xl rounded-l-2xl rounded-tr-2xl bg-violet-600 p-4 text-sm">Crea una portada cinematográfica a partir del storyboard de mi proyecto.</div>
          <div className="mr-auto max-w-xl rounded-r-2xl rounded-tl-2xl bg-white/[0.07] p-4 text-sm text-slate-400">
            Cuando la integración esté configurada, podré consultar el proyecto y preparar la operación adecuada sin ejecutarla sin tu confirmación.
          </div>
        </div>
      </section>
    </div>
  )
}
