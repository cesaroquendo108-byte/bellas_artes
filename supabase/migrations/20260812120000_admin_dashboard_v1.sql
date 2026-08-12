-- Bellas Artes: dashboard administrativo, pausa de emergencia y heartbeats.
-- Migracion aditiva. No activa generacion ni concede acceso a clientes.

-- Repara deriva histórica detectada en el proyecto remoto. El esquema base
-- canónico ya declara ambas columnas y el backfill conserva la fecha real de Auth.
alter table public.users
  add column if not exists email text not null default '',
  add column if not exists created_at timestamptz not null default now();

update public.users u
set email = coalesce(a.email, u.email),
    created_at = coalesce(a.created_at, u.created_at)
from auth.users a
where a.id = u.id
  and (u.email = '' or u.created_at is null);

create table if not exists public.platform_runtime_controls (
  control_key text primary key,
  emergency_paused boolean not null default false,
  pause_reason text,
  paused_by uuid references public.users(id) on delete set null,
  paused_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint platform_runtime_controls_key_check
    check (control_key in ('generation')),
  constraint platform_runtime_controls_pause_reason_check
    check (not emergency_paused or length(trim(coalesce(pause_reason, ''))) between 8 and 500)
);

insert into public.platform_runtime_controls (control_key, emergency_paused)
values ('generation', false)
on conflict (control_key) do nothing;

create table if not exists public.service_heartbeats (
  service_key text primary key,
  reported_status text not null
    check (reported_status in ('healthy', 'stopped', 'error')),
  details jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_heartbeats_observed_idx
  on public.service_heartbeats (observed_at desc);

create table if not exists public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.users(id) on delete restrict,
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_events_actor_created_idx
  on public.admin_audit_events (actor_id, created_at desc);
create index if not exists admin_audit_events_action_created_idx
  on public.admin_audit_events (action, created_at desc);

create or replace function public.prevent_admin_audit_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'El registro administrativo es inmutable';
end;
$$;

drop trigger if exists admin_audit_events_immutable on public.admin_audit_events;
create trigger admin_audit_events_immutable
before update or delete on public.admin_audit_events
for each row execute function public.prevent_admin_audit_mutation();

create or replace function public.pause_generation_runtime(
  p_actor uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_changed boolean := false;
  v_control public.platform_runtime_controls%rowtype;
begin
  select role into v_role from public.users where id = p_actor;
  if v_role is distinct from 'admin' then
    raise exception 'Se requieren permisos de administracion';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 8 then
    raise exception 'El motivo debe tener al menos 8 caracteres';
  end if;

  select * into v_control
  from public.platform_runtime_controls
  where control_key = 'generation'
  for update;

  if not found then
    insert into public.platform_runtime_controls (
      control_key, emergency_paused, pause_reason, paused_by, paused_at
    ) values (
      'generation', true, left(trim(p_reason), 500), p_actor, now()
    ) returning * into v_control;
    v_changed := true;
  elsif not v_control.emergency_paused then
    update public.platform_runtime_controls
    set emergency_paused = true,
        pause_reason = left(trim(p_reason), 500),
        paused_by = p_actor,
        paused_at = now(),
        updated_at = now()
    where control_key = 'generation'
    returning * into v_control;
    v_changed := true;
  end if;

  if v_changed then
    insert into public.admin_audit_events (
      actor_id, action, target_type, target_id, metadata
    ) values (
      p_actor,
      'generation.emergency_paused',
      'platform_runtime_control',
      'generation',
      jsonb_build_object('reason', v_control.pause_reason)
    );
  end if;

  return jsonb_build_object(
    'controlKey', v_control.control_key,
    'emergencyPaused', v_control.emergency_paused,
    'pauseReason', v_control.pause_reason,
    'pausedAt', v_control.paused_at,
    'changed', v_changed
  );
end;
$$;

create or replace function public.get_admin_dashboard_metrics(p_since timestamptz)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'usersTotal', (select count(*) from public.users),
    'usersNew', (select count(*) from public.users where created_at >= p_since),
    'betaUsers', (
      select count(*) from public.generation_access_grants
      where enabled = true and (expires_at is null or expires_at > now())
    ),
    'jobsTotal', (select count(*) from public.generation_jobs where created_at >= p_since),
    'jobsCompleted', (select count(*) from public.generation_jobs where created_at >= p_since and status = 'completed'),
    'jobsFailed', (select count(*) from public.generation_jobs where created_at >= p_since and status = 'failed'),
    'jobsCanceled', (select count(*) from public.generation_jobs where created_at >= p_since and status = 'canceled'),
    'paymentsPending', (
      select count(*) from public.pago_movil_proofs
      where status in ('pending', 'manual_review', 'amount_mismatch')
    ),
    'moderationPending', (select count(*) from public.community_posts where status = 'pending'),
    'refundMismatches', (
      select count(*) from public.generation_jobs
      where billing_mode = 'live'
        and status in ('failed', 'canceled')
        and credits_reserved > credits_refunded
    ),
    'expiredAssets', (
      select count(*) from public.assets
      where expires_at is not null and expires_at < now()
    ),
    'quotedCredits', (
      select coalesce(sum(quoted_credits), 0) from public.generation_jobs where created_at >= p_since
    ),
    'capturedCredits', (
      select coalesce(sum(credits_captured), 0) from public.generation_jobs where created_at >= p_since
    ),
    'refundedCredits', (
      select coalesce(sum(credits_refunded), 0) from public.generation_jobs where created_at >= p_since
    ),
    'actualCostUsd', (
      select coalesce(sum(a.actual_cost_usd), 0)
      from public.generation_job_attempts a
      join public.generation_jobs j on j.id = a.job_id
      where j.created_at >= p_since
    ),
    'estimatedCostUsd', (
      select coalesce(sum(a.estimated_cost_usd), 0)
      from public.generation_job_attempts a
      join public.generation_jobs j on j.id = a.job_id
      where j.created_at >= p_since
    ),
    'queues', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'kind', q.kind,
        'queued', q.queued,
        'processing', q.processing,
        'failed', q.failed,
        'oldestQueuedAt', q.oldest_queued_at
      ) order by q.kind), '[]'::jsonb)
      from (
        select kinds.kind,
          count(j.id) filter (where j.status = 'queued') as queued,
          count(j.id) filter (where j.status = 'processing') as processing,
          count(j.id) filter (where j.status = 'failed' and j.created_at >= p_since) as failed,
          min(j.created_at) filter (where j.status = 'queued') as oldest_queued_at
        from unnest(array['image','video','audio','character','world']) as kinds(kind)
        left join public.generation_jobs j on j.kind = kinds.kind
        group by kinds.kind
      ) q
    )
  );
$$;

alter table public.platform_runtime_controls enable row level security;
alter table public.service_heartbeats enable row level security;
alter table public.admin_audit_events enable row level security;

revoke all on public.platform_runtime_controls from public, anon, authenticated;
revoke all on public.service_heartbeats from public, anon, authenticated;
revoke all on public.admin_audit_events from public, anon, authenticated;
grant select, insert, update on public.platform_runtime_controls to service_role;
grant select, insert, update on public.service_heartbeats to service_role;
grant select, insert on public.admin_audit_events to service_role;

revoke all on function public.pause_generation_runtime(uuid,text) from public, anon, authenticated;
revoke all on function public.get_admin_dashboard_metrics(timestamptz) from public, anon, authenticated;
grant execute on function public.pause_generation_runtime(uuid,text) to service_role;
grant execute on function public.get_admin_dashboard_metrics(timestamptz) to service_role;
