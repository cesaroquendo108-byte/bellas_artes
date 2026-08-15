import { redirect } from "next/navigation";
import {
  CheckCircle2,
  CircleAlert,
  FlaskConical,
  Gauge,
  LockKeyhole,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getVastAdminServerConfig, isVastAdminOperator } from "@/lib/admin/vast-client";
import {
  listModelBenchmark,
  summarizeModelBenchmark,
  VAST_MODEL_BENCHMARK_SNAPSHOT,
  type ModelBenchmarkDecision,
  type ModelBenchmarkEvidence,
} from "@/lib/admin/model-benchmark";
import {
  listModelRuntimeCatalog,
  summarizeModelRuntime,
  type ModelRuntimeStatus,
} from "@/lib/generation/model-runtime-catalog";
import { requireAdmin } from "@/lib/auth";
import installState from "../../../../../infra/models/model-install-state.json";

export const dynamic = "force-dynamic";

const decisionLabels: Record<ModelBenchmarkDecision, string> = {
  implement_next: "Implementar siguiente",
  benchmark_next: "Próximo benchmark",
  evaluate_later: "Evaluar después",
  research_only: "Sólo investigación",
  replace: "Reemplazado",
  discard: "Descartado",
};

const evidenceLabels: Record<ModelBenchmarkEvidence, string> = {
  smoke_passed: "Smoke real",
  source_reviewed: "Fuentes verificadas",
  blocked: "Sin prueba real",
};

const installLabels = {
  installed: "Pesos instalados",
  installing: "Instalando",
  partial: "Instalación parcial",
  queued: "En cola de instalación",
  gated: "Acceso gated pendiente",
  blocked: "Instalación bloqueada",
} as const;

const runtimeLabels: Record<ModelRuntimeStatus, string> = {
  workflow_ready: "Workflow real listo",
  workflow_pending: "Workflow pendiente",
  component_pending: "Componente integrado",
  research_only: "Investigación privada",
  replaced: "Reemplazado / aislado",
};

type ModelInstallState = {
  state: keyof typeof installLabels;
  note: string;
};

export default async function AdminModelsPage() {
  const { profile } = await requireAdmin();
  if (!isVastAdminOperator(profile.email, getVastAdminServerConfig())) {
    redirect("/admin");
  }

  const models = listModelBenchmark().map((model) => ({
    ...model,
    installation: installState.models[
      model.id as keyof typeof installState.models
    ] as ModelInstallState,
  }));
  const runtimeById = new Map(listModelRuntimeCatalog().map((model) => [model.id, model]));
  const runtimeSummary = summarizeModelRuntime();
  const summary = summarizeModelBenchmark();

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">
            <FlaskConical className="size-4" />
            Laboratorio privado
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Benchmark de modelos
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Catálogo de evaluación exclusivo para {profile.email}. Ningún modelo
            de esta página se considera público o comercial por aparecer aquí.
          </p>
        </div>
        <Badge variant="outline" className="w-fit gap-2 border-violet-300 bg-violet-50 text-violet-700">
          <LockKeyhole className="size-3.5" /> Sólo operador
        </Badge>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Candidatos" value={summary.total} />
        <Metric label="Smoke real" value={summary.smokePassed} />
        <Metric label="Implementar" value={summary.implementNext} />
        <Metric label="Benchmark siguiente" value={summary.benchmarkNext} />
        <Metric label="Reemplazados/descartados" value={summary.replacedOrDiscarded} />
        <Metric
          label="Pesos instalados"
          value={Object.values(installState.models).filter((item) => item.state === "installed").length}
        />
        <Metric label="Workflows reales" value={runtimeSummary.workflowReady} />
        <Metric label="Smoke admin listo" value={runtimeSummary.smokeReady} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="size-4 text-violet-600" /> Snapshot de Vast.ai
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {VAST_MODEL_BENCHMARK_SNAPSHOT.prices.map((price) => (
              <div key={price.gpu} className="rounded-xl border border-border bg-muted/40 p-3">
                <p className="text-sm font-medium text-foreground">{price.gpu}</p>
                <p className="mt-1 text-2xl font-semibold text-violet-700">
                  US${price.hourlyUsd.toFixed(4)}/h
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {price.vramGb.toFixed(1)} GB · 15 min US${(price.hourlyUsd / 4).toFixed(4)}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Observado {new Intl.DateTimeFormat("es-VE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Caracas" }).format(new Date(VAST_MODEL_BENCHMARK_SNAPSHOT.observedAt))}. {VAST_MODEL_BENCHMARK_SNAPSHOT.note}
          </p>
        </CardContent>
      </Card>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        <div className="flex items-start gap-3">
          <CircleAlert className="mt-0.5 size-5 shrink-0" />
          <p>
            La puntuación mide viabilidad para Bellas Artes: licencia 30%, ajuste
            a GPU 25%, valor de producto 25% e integración 20%. No sustituye un
            benchmark visual A/B. Sólo Flux Schnell y SD3.5 tienen un smoke real.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm leading-6 text-violet-950">
        <p className="font-semibold">Integración del vault en Bellas Artes</p>
        <p className="mt-1">
          {runtimeSummary.installed} de {runtimeSummary.total} paquetes están registrados como instalados. {runtimeSummary.workflowReady} tienen un workflow API real y {runtimeSummary.workflowPending} esperan exportación/validación de ComfyUI. Los auxiliares ({runtimeSummary.components}) se conectan como componentes de otros pipelines; {runtimeSummary.researchOnly} permanecen sólo para investigación y {runtimeSummary.replaced} están aislados por licencia.
        </p>
      </div>

      <section className="grid gap-4 xl:grid-cols-2">
        {models.map((model) => (
          <Card key={model.id} className="overflow-hidden">
            {(() => {
              const runtime = runtimeById.get(model.id);
              if (!runtime) return null;
              return (
                <div className="border-b border-violet-200 bg-violet-50 px-6 py-3 text-xs text-violet-950">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{runtimeLabels[runtime.status]}</span>
                    <span>{runtime.canRunAdminSmoke ? "Listo para smoke admin" : "No ejecutable todavía"} · vault {runtime.vault}</span>
                  </div>
                  <p className="mt-1 leading-5">{runtime.useNote}</p>
                  {runtime.workflowVersions.length > 0 && (
                    <p className="mt-1 font-mono text-[10px] opacity-75">
                      {runtime.workflowVersions.join(" · ")}
                    </p>
                  )}
                </div>
              );
            })()}
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {model.category}
                  </p>
                  <CardTitle className="mt-1 text-lg">{model.name}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{model.purpose}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-semibold text-violet-700">{model.score}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">sobre 100</p>
                </div>
              </div>
              <Progress value={model.score} aria-label={`Viabilidad ${model.name}: ${model.score} de 100`} />
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{decisionLabels[model.decision]}</Badge>
                <Badge variant="outline" className={model.evidence === "smoke_passed" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : ""}>
                  {model.evidence === "smoke_passed" && <CheckCircle2 className="mr-1 size-3" />}
                  {evidenceLabels[model.evidence]}
                </Badge>
                <Badge variant="outline">{model.workflowState.replace("_", " ")}</Badge>
                <Badge
                  variant="outline"
                  className={model.installation.state === "installed" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-amber-300 bg-amber-50 text-amber-800"}
                >
                  {installLabels[model.installation.state]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <dl className="grid grid-cols-[7.5rem_1fr] gap-x-3 gap-y-2">
                <dt className="text-muted-foreground">Licencia</dt>
                <dd className="font-medium text-foreground">{model.license}</dd>
                <dt className="text-muted-foreground">GPU objetivo</dt>
                <dd>{model.targetGpu}</dd>
                <dt className="text-muted-foreground">VRAM mínima</dt>
                <dd>{model.minimumVramGb ? `${model.minimumVramGb} GB` : "No aplica"}</dd>
                <dt className="text-muted-foreground">Disco estimado</dt>
                <dd>{model.estimatedDiskGb ? `${model.estimatedDiskGb} GB` : "No aplica"}</dd>
              </dl>
              <div className="rounded-xl border border-border bg-muted/35 p-3">
                <p className="font-medium text-foreground">Evidencia</p>
                <p className="mt-1 leading-5 text-muted-foreground">{model.evidenceNote}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/35 p-3">
                <p className="font-medium text-foreground">Instalación privada</p>
                <p className="mt-1 leading-5 text-muted-foreground">
                  {model.installation.note}
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground">Decisión</p>
                <p className="mt-1 leading-5 text-muted-foreground">{model.decisionReason}</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Restricción</p>
                <p className="mt-1 leading-5 text-muted-foreground">{model.licenseConstraint}</p>
              </div>
              <a href={model.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex text-sm font-medium text-violet-700 underline-offset-4 hover:underline">
                Abrir fuente oficial o ficha de origen
              </a>
            </CardContent>
          </Card>
        ))}
      </section>
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
