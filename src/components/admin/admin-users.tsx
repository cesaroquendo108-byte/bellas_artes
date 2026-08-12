"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  History,
  KeyRound,
  LoaderCircle,
  Search,
  ShieldCheck,
  UserCog,
  UsersRound,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/motion-effects";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  adminAccessFilters,
  adminPlanTiers,
  adminUserRoles,
  generationAccessLevels,
  type AdminAccessFilter,
  type AdminPlanTier,
  type AdminUserDetail,
  type AdminUserListItem,
  type AdminUserRole,
  type AdminUsersPage,
  type GenerationAccessLevel,
} from "@/lib/admin/user-contracts";
import { generationQueueNames, type GenerationQueueKind } from "@/lib/generation/queue-contracts";
import { cn } from "@/lib/utils";

type ApiError = { message?: string };

export function AdminUsers({ initialPage, currentAdminId }: { initialPage: AdminUsersPage; currentAdminId: string }) {
  const [pageData, setPageData] = useState(initialPage);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<AdminUserRole | "all">("all");
  const [plan, setPlan] = useState<AdminPlanTier | "all">("all");
  const [access, setAccess] = useState<AdminAccessFilter>("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminUserDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const firstRender = useRef(true);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ search, role, plan, access, page: String(page), pageSize: "20" });
      const response = await fetch(`/api/admin/users?${params}`, { cache: "no-store" });
      const payload = await response.json() as AdminUsersPage & ApiError;
      if (!response.ok) throw new Error(payload.message ?? "No se pudieron cargar los usuarios.");
      setPageData(payload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron cargar los usuarios.");
    } finally {
      setLoading(false);
    }
  }, [access, page, plan, role, search]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const timeout = window.setTimeout(() => void loadPage(), search ? 300 : 0);
    return () => window.clearTimeout(timeout);
  }, [loadPage, search]);

  const changeFilter = (callback: () => void) => {
    setPage(1);
    callback();
  };

  const openUser = async (userId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setError(null);
    try {
      const detail = await fetchUserDetail(userId);
      setSelected(detail);
    } catch (cause) {
      setDetailOpen(false);
      setError(cause instanceof Error ? cause.message : "No se pudo cargar el usuario.");
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshSelected = async () => {
    if (!selected) return;
    setSelected(await fetchUserDetail(selected.id));
    await loadPage();
  };

  return (
    <div className="min-w-0 space-y-6 text-white">
      <header className="relative overflow-hidden rounded-[28px] border border-amber-300/10 bg-gradient-to-br from-amber-400/[0.08] via-[#111113] to-violet-500/[0.06] p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-24 size-60 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400/12 text-amber-300"><UsersRound className="size-5" /></span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-amber-300">Administración</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Usuarios y acceso</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Gestiona roles y acceso controlado a generación. Esta superficie no modifica créditos, pagos ni la activación global.</p>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_160px_160px_170px]">
          <label className="relative block">
            <span className="sr-only">Buscar usuarios</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-600" />
            <Input value={search} onChange={(event) => changeFilter(() => setSearch(event.target.value))} placeholder="Buscar por nombre o email…" className="w-full pl-9" />
          </label>
          <FilterSelect label="Rol" value={role} values={["all", ...adminUserRoles]} onChange={(value) => changeFilter(() => setRole(value as AdminUserRole | "all"))} />
          <FilterSelect label="Plan" value={plan} values={["all", ...adminPlanTiers]} onChange={(value) => changeFilter(() => setPlan(value as AdminPlanTier | "all"))} />
          <FilterSelect label="Acceso" value={access} values={adminAccessFilters} onChange={(value) => changeFilter(() => setAccess(value as AdminAccessFilter))} />
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-4 text-xs text-slate-500">
          <span>{pageData.total.toLocaleString("es-VE")} usuarios</span>
          {loading && <span className="flex items-center gap-2 text-amber-300"><LoaderCircle className="size-3.5 animate-spin" />Actualizando</span>}
        </div>
      </section>

      {error && <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-400/20 bg-red-500/[0.07] p-4 text-sm text-red-200"><X className="mt-0.5 size-4 shrink-0" />{error}</div>}

      <section className={cn("overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] transition-opacity", loading && "opacity-65")}>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="border-b border-white/[0.08] text-xs text-slate-500"><tr><th className="px-4 py-3 font-medium">Usuario</th><th className="px-4 py-3 font-medium">Rol</th><th className="px-4 py-3 font-medium">Plan</th><th className="px-4 py-3 font-medium">Acceso</th><th className="px-4 py-3 font-medium">Registro</th><th className="px-4 py-3 text-right font-medium">Acción</th></tr></thead>
            <tbody className="divide-y divide-white/[0.05]">
              {pageData.users.map((user) => <UserRow key={user.id} user={user} onOpen={() => void openUser(user.id)} />)}
            </tbody>
          </table>
        </div>
        <div className="divide-y divide-white/[0.06] md:hidden">
          {pageData.users.map((user) => <UserCard key={user.id} user={user} onOpen={() => void openUser(user.id)} />)}
        </div>
        {!pageData.users.length && <div className="px-5 py-16 text-center"><UsersRound className="mx-auto size-8 text-slate-700" /><p className="mt-3 text-sm text-slate-500">No hay usuarios que coincidan con los filtros.</p></div>}
      </section>

      <nav className="flex items-center justify-between" aria-label="Paginación de usuarios">
        <Button variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(value - 1, 1))}><ChevronLeft />Anterior</Button>
        <span className="text-xs text-slate-500">Página {pageData.page} de {pageData.pageCount}</span>
        <Button variant="outline" disabled={page >= pageData.pageCount || loading} onClick={() => setPage((value) => value + 1)}>Siguiente<ChevronRight /></Button>
      </nav>

      <Sheet open={detailOpen} onOpenChange={(open) => { setDetailOpen(open); if (!open) setSelected(null); }}>
        <SheetContent side="right" className="w-full max-w-2xl overflow-y-auto border-white/10 bg-[#0d0d0f] p-0 max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:h-[92dvh] max-sm:w-full max-sm:border-l-0 max-sm:border-t sm:w-[640px] sm:max-w-[min(640px,100vw)]">
          {detailLoading && <div className="flex h-full min-h-80 items-center justify-center"><LoaderCircle className="size-6 animate-spin text-amber-300" /></div>}
          {selected && <UserDetail key={detailKey(selected)} user={selected} currentAdminId={currentAdminId} onUpdated={refreshSelected} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function UserDetail({ user, currentAdminId, onUpdated }: { user: AdminUserDetail; currentAdminId: string; onUpdated: () => Promise<void> }) {
  const [accessLevel, setAccessLevel] = useState<GenerationAccessLevel>(user.grant?.accessLevel ?? "beta");
  const [allowedKinds, setAllowedKinds] = useState<GenerationQueueKind[]>(user.grant?.allowedKinds ?? ["image"]);
  const [enabled, setEnabled] = useState(user.grant?.enabled ?? true);
  const [expiresAt, setExpiresAt] = useState(toLocalDateTime(user.grant?.expiresAt));
  const [accessReason, setAccessReason] = useState("");
  const [newRole, setNewRole] = useState<AdminUserRole>(user.role);
  const [roleReason, setRoleReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState<"access" | "role" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const saveAccess = async () => {
    setSaving("access"); setMessage(null);
    try {
      await mutate(`/api/admin/users/${user.id}/access`, {
        accessLevel,
        allowedKinds,
        enabled,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        reason: accessReason,
      });
      setAccessReason(""); setMessage("Acceso actualizado y auditado."); await onUpdated();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "No se pudo actualizar el acceso."); }
    finally { setSaving(null); }
  };

  const saveRole = async () => {
    setSaving("role"); setMessage(null);
    try {
      await mutate(`/api/admin/users/${user.id}/role`, { role: newRole, reason: roleReason, confirmation });
      setRoleReason(""); setConfirmation(""); setMessage("Rol actualizado y auditado."); await onUpdated();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "No se pudo actualizar el rol."); }
    finally { setSaving(null); }
  };

  const toggleKind = (kind: GenerationQueueKind) => setAllowedKinds((current) => current.includes(kind)
    ? current.length > 1 ? current.filter((value) => value !== kind) : current
    : [...current, kind]);

  return (
    <div className="min-h-full">
      <SheetHeader className="border-b border-white/[0.08] p-5 pr-14 sm:p-6">
        <div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-full bg-violet-500/15 text-sm font-semibold text-violet-200">{initials(user)}</span><div className="min-w-0"><SheetTitle className="truncate text-lg text-white">{user.displayName || "Usuario de Bellas Artes"}</SheetTitle><SheetDescription className="truncate">{user.email}</SheetDescription></div></div>
        <div className="mt-3 flex flex-wrap gap-2"><StatusPill state={user.role} tone={user.role === "admin" ? "warning" : "neutral"} /><StatusPill state={`Plan ${user.planTier}`} tone="info" />{user.grant ? <StatusPill state={user.grant.active ? `${user.grant.accessLevel} activo` : `${user.grant.accessLevel} inactivo`} tone={user.grant.active ? "success" : "warning"} /> : <StatusPill state="Sin grant" tone="neutral" />}</div>
      </SheetHeader>

      <div className="space-y-5 p-4 sm:p-6">
        {message && <div role="status" className={cn("rounded-xl border p-3 text-xs", message.includes("actualizado") ? "border-emerald-400/20 bg-emerald-500/[0.07] text-emerald-200" : "border-red-400/20 bg-red-500/[0.07] text-red-200")}>{message}</div>}

        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
          <SectionTitle icon={KeyRound} title="Acceso a generación" description="El grant sólo autoriza modalidades; no activa la generación global." />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-xs text-slate-500">Nivel<Select value={accessLevel} onValueChange={(value) => setAccessLevel(value as GenerationAccessLevel)}><SelectTrigger className="mt-2 w-full"><SelectValue /></SelectTrigger><SelectContent>{generationAccessLevels.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></label>
            <label className="text-xs text-slate-500">Expira<Input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="mt-2 w-full" /></label>
          </div>
          <div className="mt-4"><p className="text-xs text-slate-500">Modalidades permitidas</p><div className="mt-2 flex flex-wrap gap-2">{generationQueueNames.map((kind) => <button key={kind} type="button" onClick={() => toggleKind(kind)} className={cn("inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition", allowedKinds.includes(kind) ? "border-violet-400/25 bg-violet-500/12 text-violet-200" : "border-white/[0.08] text-slate-500 hover:text-white")}>{allowedKinds.includes(kind) && <Check className="size-3" />}{kind}</button>)}</div></div>
          <label className="mt-4 flex items-center justify-between rounded-xl border border-white/[0.07] bg-black/20 p-3"><span><span className="block text-sm text-slate-200">Grant habilitado</span><span className="mt-1 block text-xs text-slate-600">Puede vencer aunque permanezca habilitado.</span></span><Switch checked={enabled} onCheckedChange={setEnabled} /></label>
          <label className="mt-4 block text-xs text-slate-500">Motivo obligatorio<Textarea value={accessReason} onChange={(event) => setAccessReason(event.target.value)} placeholder="Ej. Invitación controlada a la beta privada" className="mt-2" /></label>
          <Button className="mt-4 w-full" onClick={() => void saveAccess()} disabled={saving !== null || accessReason.trim().length < 8 || allowedKinds.length === 0}>{saving === "access" && <LoaderCircle className="animate-spin" />}Guardar acceso</Button>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
          <SectionTitle icon={ShieldCheck} title="Rol administrativo" description="Cambiar el rol no modifica el plan, créditos ni grants." />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">{adminUserRoles.map((role) => <button key={role} type="button" onClick={() => setNewRole(role)} className={cn("rounded-xl border p-3 text-left transition", newRole === role ? "border-amber-300/25 bg-amber-400/[0.08] text-amber-200" : "border-white/[0.08] text-slate-500")}>{role === "admin" ? "Administrador" : "Usuario"}</button>)}</div>
          {user.id === currentAdminId && newRole === "user" && <p className="mt-3 rounded-lg border border-amber-300/15 bg-amber-400/[0.06] p-3 text-xs leading-5 text-amber-200">Estás modificando tu propio rol. La base de datos impedirá eliminar al último administrador.</p>}
          <label className="mt-4 block text-xs text-slate-500">Motivo obligatorio<Textarea value={roleReason} onChange={(event) => setRoleReason(event.target.value)} placeholder="Explica por qué cambia el rol" className="mt-2" /></label>
          <label className="mt-3 block text-xs text-slate-500">Escribe CAMBIAR ROL<Input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 font-mono" /></label>
          <Button variant="outline" className="mt-4 w-full border-amber-300/20 text-amber-200" onClick={() => void saveRole()} disabled={saving !== null || roleReason.trim().length < 8 || confirmation !== "CAMBIAR ROL" || newRole === user.role}>{saving === "role" && <LoaderCircle className="animate-spin" />}Aplicar cambio de rol</Button>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4"><SectionTitle icon={UserCog} title="Actividad reciente" description="Resumen sin prompts ni payloads de generación." /><div className="mt-4 space-y-2">{user.recentJobs.map((job) => <div key={job.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-black/20 p-3"><div className="min-w-0"><p className="truncate text-xs text-slate-300">{job.workflowVersion}</p><p className="mt-1 font-mono text-[10px] text-slate-700">{job.id.slice(0, 8)} · {formatDate(job.createdAt)}</p></div><StatusPill state={job.status} tone={job.status === "completed" ? "success" : job.status === "failed" ? "danger" : "info"} /></div>)}{!user.recentJobs.length && <p className="rounded-xl border border-dashed border-white/[0.08] p-5 text-center text-xs text-slate-600">Sin jobs registrados.</p>}</div></section>

        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4"><SectionTitle icon={History} title="Auditoría" description="Eventos inmutables asociados a este usuario." /><div className="mt-4 space-y-3">{user.auditEvents.map((event) => <div key={event.id} className="border-l border-amber-300/20 pl-3"><div className="flex items-center justify-between gap-3"><p className="text-xs font-medium text-slate-300">{auditLabel(event.action)}</p><span className="text-[10px] text-slate-700">{formatDate(event.createdAt)}</span></div><p className="mt-1 text-[11px] text-slate-600">{event.actorLabel}{typeof event.metadata.reason === "string" ? ` · ${event.metadata.reason}` : ""}</p></div>)}{!user.auditEvents.length && <p className="text-xs text-slate-600">No hay intervenciones administrativas registradas.</p>}</div></section>

        <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-black/20 p-3 text-xs text-slate-600"><CalendarClock className="size-4" />Registrado {formatDate(user.createdAt)}</div>
      </div>
    </div>
  );
}

function UserRow({ user, onOpen }: { user: AdminUserListItem; onOpen: () => void }) { return <tr className="transition hover:bg-white/[0.025]"><td className="px-4 py-3"><p className="font-medium text-slate-200">{user.displayName || "—"}</p><p className="mt-1 text-xs text-slate-600">{user.email}</p></td><td className="px-4 py-3"><StatusPill state={user.role} tone={user.role === "admin" ? "warning" : "neutral"} /></td><td className="px-4 py-3 text-xs text-slate-400">{user.planTier}</td><td className="px-4 py-3">{user.grant ? <StatusPill state={user.grant.active ? user.grant.accessLevel : "inactivo"} tone={user.grant.active ? "success" : "warning"} /> : <span className="text-xs text-slate-700">Sin grant</span>}</td><td className="px-4 py-3 text-xs text-slate-500">{formatDate(user.createdAt)}</td><td className="px-4 py-3 text-right"><Button variant="ghost" size="sm" onClick={onOpen}>Gestionar</Button></td></tr>; }
function UserCard({ user, onOpen }: { user: AdminUserListItem; onOpen: () => void }) { return <button type="button" onClick={onOpen} className="block w-full p-4 text-left transition hover:bg-white/[0.025]"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-200">{user.displayName || user.email}</p>{user.displayName && <p className="mt-1 truncate text-xs text-slate-600">{user.email}</p>}</div><ChevronRight className="mt-1 size-4 shrink-0 text-slate-700" /></div><div className="mt-3 flex flex-wrap gap-2"><StatusPill state={user.role} tone={user.role === "admin" ? "warning" : "neutral"} /><StatusPill state={user.planTier} tone="info" />{user.grant && <StatusPill state={user.grant.active ? user.grant.accessLevel : "inactivo"} tone={user.grant.active ? "success" : "warning"} />}</div></button>; }

function FilterSelect({ label, value, values, onChange }: { label: string; value: string; values: readonly string[]; onChange: (value: string) => void }) { return <Select value={value} onValueChange={(next) => next && onChange(next)}><SelectTrigger className="w-full"><SelectValue>{filterLabel(label, value)}</SelectValue></SelectTrigger><SelectContent>{values.map((item) => <SelectItem key={item} value={item}>{filterLabel(label, item)}</SelectItem>)}</SelectContent></Select>; }
function filterLabel(label: string, value: string) { if (value === "all") return `Todos · ${label}`; if (value === "none") return "Sin grant"; if (value === "active") return "Grant activo"; if (value === "inactive") return "Grant inactivo"; return value; }
function SectionTitle({ icon: Icon, title, description }: { icon: typeof KeyRound; title: string; description: string }) { return <div className="flex items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300"><Icon className="size-4" /></span><div><h2 className="text-sm font-semibold text-white">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-600">{description}</p></div></div>; }
function initials(user: AdminUserListItem) { return (user.displayName || user.email).split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "BA"; }
function formatDate(value: string) { return new Date(value).toLocaleString("es-VE", { dateStyle: "medium", timeStyle: "short" }); }
function toLocalDateTime(value?: string | null) { if (!value) return ""; const date = new Date(value); const offset = date.getTimezoneOffset() * 60_000; return new Date(date.getTime() - offset).toISOString().slice(0, 16); }
function auditLabel(action: string) { return action === "user.role_changed" ? "Rol actualizado" : action === "user.access_disabled" ? "Acceso deshabilitado" : action === "user.access_updated" ? "Acceso actualizado" : action; }
function detailKey(user: AdminUserDetail) { return [user.id, user.role, user.grant?.accessLevel, user.grant?.enabled, user.grant?.expiresAt, user.grant?.allowedKinds.join(",")].join(":"); }

async function fetchUserDetail(userId: string) {
  const response = await fetch(`/api/admin/users/${userId}`, { cache: "no-store" });
  const payload = await response.json() as { user?: AdminUserDetail; message?: string };
  if (!response.ok || !payload.user) throw new Error(payload.message ?? "No se pudo cargar el usuario.");
  return payload.user;
}

async function mutate(url: string, body: unknown) {
  const response = await fetch(url, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json() as ApiError;
  if (!response.ok) throw new Error(payload.message ?? "No se pudo guardar el cambio.");
  return payload;
}
