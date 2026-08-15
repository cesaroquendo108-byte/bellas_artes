import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Cpu,
  Download,
  FlaskConical,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GPU_LAB_PLAN, summarizeGpuLabPlan, type GpuLabReadiness } from "@/lib/admin/gpu-lab-plan";
import { getVastAdminServerConfig, isVastAdminOperator } from "@/lib/admin/vast-client";
import { getGenerationConfig } from "@/lib/generation/config";
import { COMFY_TEMPLATE_CATALOG } from "@/lib/generation/comfy-template-catalog";
import { requireAdmin } from "@/lib/auth";
import installState from "../../../../../infra/models/model-install-state.json";

export const dynamic = "force-dynamic";

const readinessLabel: Record<GpuLabReadiness, string> = {
  cached_ready: "Cache listo",
  bootstrap_ready: "Bootstrap automático",
  manual_preparation: "Preparación manual",
  conditional: "Sólo si queda tiempo",
  blocked_3090: "No usar en 3090",
  policy_blocked: "Bloqueado por política",
};

const readinessStyle: Record<GpuLabReadiness, string> = {
  cached_ready: "border-emerald-300 bg-emerald-50 text-emerald-800",
  bootstrap_ready: "border-sky-300 bg-sky-50 text-sky-800",
  manual_preparation: "border-amber-300 bg-amber-50 text-amber-800",
  conditional: "border-orange-300 bg-orange-50 text-orange-800",
  blocked_3090: "border-rose-300 bg-rose-50 text-rose-800",
  policy_blocked: "border-slate-300 bg-slate-100 text-slate-700",
};

export default async function AdminTestingPage() {
  const { profile } = await requireAdmin();
  const vastConfig = getVastAdminServerConfig();
  if (!isVastAdminOperator(profile.email, vastConfig)) redirect("/admin");

  const generation = getGenerationConfig();
  const summary = summarizeGpuLabPlan();
  const templatesById = new Map(COMFY_TEMPLATE_CATALOG.map((template) => [template.id, template]));
  const installed = Object.values(installState.models).filter((entry) => entry.state === "installed").length;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">
            <FlaskConical className="size-4" /> Sesión privada 3090
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Centro de testing</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Orden de ejecución para una ventana de 2–3 horas. El bloque automático ocupa 80 minutos dentro de un único laboratorio público; video y modelos gated sólo se intentan después.
          </p>
        </div>
        <Badge variant="outline" className="w-fit gap-2 border-violet-300 bg-violet-50 text-violet-700">
          <LockKeyhole className="size-3.5" /> Sólo operador
        </Badge>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Casos" value={summary.total} />
        <Metric label="Automáticos" value={summary.runnable} />
        <Metric label="Minutos base" value={summary.runnableMinutes} />
        <Metric label="Condicionales" value={summary.conditional} />
        <Metric label="Bloqueados" value={summary.blocked} />
      </section>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="size-4 text-violet-600" /> Preflight de mañana</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Preflight ok={installed === 22} label={`${installed}/22 paquetes locales íntegros`} />
          <Preflight ok={COMFY_TEMPLATE_CATALOG.length === 20} label={`${COMFY_TEMPLATE_CATALOG.length}/20 templates privados`} />
          <Preflight ok={vastConfig.configured} label={vastConfig.configured ? "Vast admin configurado" : "Falta configuración Vast admin"} />
          <Preflight ok={!generation.enabled && generation.billingMode === "shadow"} label="Público apagado · billing shadow" />
        </CardContent>
      </Card>

      <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm leading-6 text-violet-950">
        <p className="font-semibold">Secuencia para abrir y empezar</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Elige “Laboratorio 3090 · imagen pública” por 180 minutos y selecciona una RTX 3090 verificada con descarga rápida.</li>
          <li>Espera el bootstrap. Después copia el túnel ComfyUI mostrado en GPUs y abre http://localhost:8188.</li>
          <li>Ejecuta los casos 1–5 en orden. Los demás sólo si queda tiempo y su bloqueo fue resuelto.</li>
          <li>Destruye la instancia al terminar; detenerla no cancela el almacenamiento ni sustituye la autodestrucción por TTL.</li>
        </ol>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button render={<Link href="/admin/gpus" />} nativeButton={false}><Cpu /> Abrir GPUs</Button>
          <Button render={<Link href="/admin/templates" />} nativeButton={false} variant="outline">Abrir templates</Button>
          <Button render={<Link href="/admin/models" />} nativeButton={false} variant="outline">Ver modelos</Button>
        </div>
      </div>

      <section className="space-y-4">
        {GPU_LAB_PLAN.map((testCase) => (
          <Card key={testCase.id} className="overflow-hidden">
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Caso {testCase.order}</p>
                  <CardTitle className="mt-1 text-lg">{testCase.title}</CardTitle>
                </div>
                <div className="flex flex-wrap gap-2">
                  {testCase.timeboxMinutes > 0 && <Badge variant="outline" className="gap-1"><Clock3 className="size-3" /> {testCase.timeboxMinutes} min</Badge>}
                  <Badge variant="outline" className={readinessStyle[testCase.readiness]}>{readinessLabel[testCase.readiness]}</Badge>
                </div>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">{testCase.objective}</p>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-4">
                <Info title="Modelos" text={testCase.modelIds.join(" · ")} />
                {testCase.prompt && <Info title="Prompt fijo" text={testCase.prompt} mono />}
                <ListBlock title="Ajustes" items={testCase.settings} />
              </div>
              <div className="space-y-4">
                <ListBlock title="Criterios de éxito" items={testCase.successCriteria} success />
                {testCase.blocker && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-950">
                    <p className="flex items-center gap-2 font-medium"><AlertTriangle className="size-4" /> Bloqueo</p>
                    <p className="mt-1">{testCase.blocker}</p>
                  </div>
                )}
                {testCase.templateIds.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-foreground">Workflows</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {testCase.templateIds.map((id) => {
                        const template = templatesById.get(id);
                        return template ? (
                          <Button key={id} render={<a href={`/api/admin/comfy-templates/${id}`} download />} nativeButton={false} size="sm" variant="outline">
                            <Download /> {template.title}
                          </Button>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold text-foreground">{value}</p></CardContent></Card>;
}

function Preflight({ ok, label }: { ok: boolean; label: string }) {
  return <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3 text-sm"><span className={ok ? "text-emerald-600" : "text-amber-600"}>{ok ? <CheckCircle2 className="size-5" /> : <AlertTriangle className="size-5" />}</span><span>{label}</span></div>;
}

function Info({ title, text, mono = false }: { title: string; text: string; mono?: boolean }) {
  return <div><p className="text-sm font-medium text-foreground">{title}</p><p className={mono ? "mt-1 rounded-xl bg-muted p-3 font-mono text-xs leading-5 text-muted-foreground" : "mt-1 text-sm leading-5 text-muted-foreground"}>{text}</p></div>;
}

function ListBlock({ title, items, success = false }: { title: string; items: readonly string[]; success?: boolean }) {
  return <div><p className="text-sm font-medium text-foreground">{title}</p><ul className="mt-2 space-y-1 text-sm text-muted-foreground">{items.map((item) => <li key={item} className="flex items-start gap-2">{success ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : <span className="mt-2 size-1.5 shrink-0 rounded-full bg-violet-500" />}<span>{item}</span></li>)}</ul></div>;
}
