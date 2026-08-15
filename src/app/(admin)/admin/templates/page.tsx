import { redirect } from "next/navigation";
import {
  CircleAlert,
  Download,
  ExternalLink,
  LockKeyhole,
  Star,
  Workflow,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getVastAdminServerConfig, isVastAdminOperator } from "@/lib/admin/vast-client";
import {
  REVIEWED_COMFY_REPOSITORIES,
  listComfyTemplateCatalog,
  summarizeComfyTemplateCatalog,
  type ComfyTemplateReadiness,
} from "@/lib/generation/comfy-template-catalog";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const readinessLabels: Record<ComfyTemplateReadiness, string> = {
  mapping_required: "Requiere mapeo",
  custom_nodes_required: "Requiere custom nodes",
  weights_missing: "Faltan pesos",
  research_only: "Sólo investigación",
};

const readinessStyles: Record<ComfyTemplateReadiness, string> = {
  mapping_required: "border-amber-300 bg-amber-50 text-amber-800",
  custom_nodes_required: "border-sky-300 bg-sky-50 text-sky-800",
  weights_missing: "border-orange-300 bg-orange-50 text-orange-800",
  research_only: "border-rose-300 bg-rose-50 text-rose-800",
};

export default async function AdminTemplatesPage() {
  const { profile } = await requireAdmin();
  if (!isVastAdminOperator(profile.email, getVastAdminServerConfig())) {
    redirect("/admin");
  }

  const templates = listComfyTemplateCatalog();
  const summary = summarizeComfyTemplateCatalog();

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">
            <Workflow className="size-4" /> Biblioteca privada
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Templates ComfyUI
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Workflows públicos populares, fijados por commit y guardados localmente para importar en ComfyUI. Descargar no activa una GPU ni convierte el template en workflow del worker.
          </p>
        </div>
        <Badge variant="outline" className="w-fit gap-2 border-violet-300 bg-violet-50 text-violet-700">
          <LockKeyhole className="size-3.5" /> Sólo operador
        </Badge>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Templates" value={summary.total} />
        <Metric label="Repositorios" value={summary.repositories} />
        <Metric label="Imagen" value={summary.image} />
        <Metric label="Video" value={summary.video} />
        <Metric label="Sólo investigación" value={summary.researchOnly} />
      </section>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        <div className="flex items-start gap-3">
          <CircleAlert className="mt-0.5 size-5 shrink-0" />
          <p>
            Los modelos están íntegros en el vault, pero muchos repos oficiales usan pesos split y nombres distintos al paquete Diffusers instalado. Revisa la etiqueta de cada template antes del testing grande. La descarga pasa por una API privada y verifica el SHA-256 antes de entregar el JSON.
          </p>
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-2">
        {templates.map((template) => (
          <Card key={template.id} className="overflow-hidden">
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {template.category}
                  </p>
                  <CardTitle className="mt-1 text-lg">{template.title}</CardTitle>
                </div>
                <Badge variant="outline" className={readinessStyles[template.readiness]}>
                  {readinessLabels[template.readiness]}
                </Badge>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">{template.description}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Star className="size-3" /> {template.starsSnapshot.toLocaleString("es-VE")}
                </Badge>
                <Badge variant="outline">{template.license}</Badge>
                <Badge variant="outline">{template.sourceRepo}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="rounded-xl border border-border bg-muted/35 p-3">
                <p className="font-medium text-foreground">Preparación</p>
                <p className="mt-1 leading-5 text-muted-foreground">{template.compatibilityNote}</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Dependencias</p>
                <p className="mt-1 leading-5 text-muted-foreground">
                  {template.requirements.join(" · ")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  render={<a href={`/api/admin/comfy-templates/${template.id}`} download />}
                  nativeButton={false}
                  size="sm"
                >
                  <Download /> Descargar JSON
                </Button>
                <Button
                  render={<a href={template.sourceFileUrl} target="_blank" rel="noreferrer" />}
                  nativeButton={false}
                  variant="outline"
                  size="sm"
                >
                  <ExternalLink /> Ver original
                </Button>
                <Button
                  render={<a href={`${template.sourceRepoUrl}/blob/${template.sourceCommit}/LICENSE`} target="_blank" rel="noreferrer" />}
                  nativeButton={false}
                  variant="ghost"
                  size="sm"
                >
                  Licencia
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Repositorios populares revisados, no importados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {REVIEWED_COMFY_REPOSITORIES.map((repository) => (
            <div key={repository.repository} className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <a href={repository.url} target="_blank" rel="noreferrer" className="font-medium text-violet-700 underline-offset-4 hover:underline">
                  {repository.repository}
                </a>
                <span className="text-xs text-muted-foreground">
                  {repository.starsSnapshot.toLocaleString("es-VE")} estrellas · {repository.workflowCount} workflows · {repository.license}
                </span>
              </div>
              <p className="mt-1 leading-5 text-muted-foreground">{repository.reason}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}
