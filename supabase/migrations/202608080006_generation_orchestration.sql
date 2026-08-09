-- Bellas Artes: generación real, reservas idempotentes y auditoría de workers.
-- Esta migración es aditiva y usa únicamente las tablas canónicas de Fase 1.

create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null check (kind in ('image', 'video', 'audio', 'character', 'world')),
  operation text,
  public_model text not null,
  backend_model text not null,
  provider_route text not null check (provider_route in ('vast', 'runpod', 'fake')),
  workflow_version text not null,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'failed', 'canceled')),
  request jsonb not null default '{}'::jsonb,
  provider_job_id text,
  idempotency_key text not null,
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  credits_reserved bigint not null default 0 check (credits_reserved >= 0),
  credits_captured bigint not null default 0 check (credits_captured >= 0),
  credits_refunded bigint not null default 0 check (credits_refunded >= 0),
  reservation_transaction_id uuid references public.transactions(id) on delete restrict,
  capture_transaction_id uuid references public.transactions(id) on delete restrict,
  refund_transaction_id uuid references public.transactions(id) on delete restrict,
  error_code text,
  error_message text,
  cancel_requested boolean not null default false,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table if not exists public.generation_job_attempts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.generation_jobs(id) on delete cascade,
  attempt integer not null check (attempt > 0),
  provider_route text not null,
  provider_job_id text,
  status text not null check (status in ('processing', 'completed', 'failed', 'canceled')),
  error_code text,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (job_id, attempt)
);

create table if not exists public.generation_job_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.generation_jobs(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.generation_job_assets (
  job_id uuid not null references public.generation_jobs(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  role text not null default 'output' check (role in ('input', 'reference', 'output')),
  created_at timestamptz not null default now(),
  primary key (job_id, asset_id, role)
);

create index if not exists generation_jobs_user_created_idx
  on public.generation_jobs (user_id, created_at desc, id desc);
create index if not exists generation_jobs_status_created_idx
  on public.generation_jobs (status, created_at asc);
create index if not exists generation_jobs_kind_status_idx
  on public.generation_jobs (kind, status, updated_at desc);
create index if not exists generation_job_attempts_job_idx
  on public.generation_job_attempts (job_id, attempt desc);
create index if not exists generation_job_events_job_idx
  on public.generation_job_events (job_id, created_at desc);

drop trigger if exists generation_jobs_touch_updated_at on public.generation_jobs;
create trigger generation_jobs_touch_updated_at
before update on public.generation_jobs
for each row execute function public.touch_updated_at();

-- El worker de audio antiguo conserva su tabla propia. Estas funciones son la
-- fuente única para los nuevos jobs y no exponen mutaciones al navegador.
create or replace function public.reserve_generation_credits(
  p_user_id uuid,
  p_idempotency_key text,
  p_kind text,
  p_operation text,
  p_public_model text,
  p_backend_model text,
  p_provider_route text,
  p_workflow_version text,
  p_credits bigint,
  p_request jsonb default '{}'::jsonb,
  p_max_attempts integer default 3
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.generation_jobs%rowtype;
  v_job public.generation_jobs%rowtype;
  v_balance bigint;
  v_role text;
  v_reserved bigint;
  v_transaction_id uuid;
begin
  if p_kind not in ('image', 'video', 'audio', 'character', 'world') then
    raise exception 'Tipo de generación inválido';
  end if;
  if p_provider_route not in ('vast', 'runpod', 'fake') then
    raise exception 'Ruta de proveedor inválida';
  end if;
  if length(trim(p_idempotency_key)) < 8 then
    raise exception 'Clave de idempotencia inválida';
  end if;
  if p_credits < 0 then
    raise exception 'La reserva no puede ser negativa';
  end if;
  if p_max_attempts not between 1 and 10 then
    raise exception 'Número de intentos inválido';
  end if;

  select * into v_existing
  from public.generation_jobs
  where user_id = p_user_id and idempotency_key = p_idempotency_key
  for update;
  if found then
    return jsonb_build_object(
      'success', true,
      'idempotent', true,
      'job_id', v_existing.id,
      'status', v_existing.status,
      'reserved_credits', v_existing.credits_reserved,
      'remaining_credits', (select balance from public.wallets where user_id = p_user_id)
    );
  end if;

  select role into v_role from public.users where id = p_user_id;
  if not found then raise exception 'Usuario inexistente'; end if;

  insert into public.wallets (user_id, balance) values (p_user_id, 0)
  on conflict (user_id) do nothing;
  select balance into v_balance from public.wallets
  where user_id = p_user_id for update;

  v_reserved := case when v_role = 'admin' then 0 else p_credits end;
  if v_balance - v_reserved < 0 then raise exception 'Créditos insuficientes'; end if;

  if v_reserved > 0 then
    v_balance := v_balance - v_reserved;
    update public.wallets set balance = v_balance where user_id = p_user_id;
    update public.users set credits = v_balance::integer where id = p_user_id;
    insert into public.transactions (
      user_id, type, credits_granted, credit_delta, balance_after,
      description, metadata, status
    ) values (
      p_user_id, 'generation', (-v_reserved)::integer, -v_reserved, v_balance,
      'Reserva de generación',
      jsonb_build_object('idempotency_key', p_idempotency_key, 'kind', p_kind, 'operation', p_operation),
      'approved'
    ) returning id into v_transaction_id;
  end if;

  insert into public.generation_jobs (
    user_id, kind, operation, public_model, backend_model, provider_route,
    workflow_version, request, idempotency_key, max_attempts,
    credits_reserved, reservation_transaction_id
  ) values (
    p_user_id, p_kind, p_operation, p_public_model, p_backend_model, p_provider_route,
    p_workflow_version, coalesce(p_request, '{}'::jsonb), p_idempotency_key, p_max_attempts,
    v_reserved, v_transaction_id
  ) returning * into v_job;

  return jsonb_build_object(
    'success', true,
    'idempotent', false,
    'job_id', v_job.id,
    'status', v_job.status,
    'reserved_credits', v_job.credits_reserved,
    'remaining_credits', v_balance,
    'unlimited', v_role = 'admin'
  );
exception
  when unique_violation then
    select * into v_existing from public.generation_jobs
    where user_id = p_user_id and idempotency_key = p_idempotency_key;
    if found then
      return jsonb_build_object('success', true, 'idempotent', true,
        'job_id', v_existing.id, 'status', v_existing.status,
        'reserved_credits', v_existing.credits_reserved);
    end if;
    raise;
end;
$$;

create or replace function public.mark_generation_job_processing(
  p_job_id uuid,
  p_provider_job_id text,
  p_provider_route text,
  p_attempt integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_job public.generation_jobs%rowtype;
begin
  select * into v_job from public.generation_jobs where id = p_job_id for update;
  if not found then raise exception 'Job inexistente'; end if;
  if v_job.status in ('completed', 'failed', 'canceled') then
    return jsonb_build_object('success', true, 'idempotent', true, 'status', v_job.status);
  end if;
  update public.generation_jobs
  set status = 'processing', provider_job_id = p_provider_job_id,
      attempts = greatest(attempts, p_attempt), started_at = coalesce(started_at, now())
  where id = p_job_id;
  insert into public.generation_job_attempts (job_id, attempt, provider_route, provider_job_id, status)
  values (p_job_id, p_attempt, p_provider_route, p_provider_job_id, 'processing')
  on conflict (job_id, attempt) do update set provider_job_id = excluded.provider_job_id, status = 'processing';
  insert into public.generation_job_events (job_id, event_type, payload)
  values (p_job_id, 'processing', jsonb_build_object('attempt', p_attempt, 'provider_job_id', p_provider_job_id));
  return jsonb_build_object('success', true, 'status', 'processing');
end;
$$;

create or replace function public.complete_generation_job(
  p_job_id uuid,
  p_output_asset_ids uuid[] default '{}'::uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.generation_jobs%rowtype;
  v_asset_id uuid;
begin
  select * into v_job from public.generation_jobs where id = p_job_id for update;
  if not found then raise exception 'Job inexistente'; end if;
  if v_job.status = 'completed' then
    return jsonb_build_object('success', true, 'idempotent', true, 'status', v_job.status);
  end if;
  if v_job.status in ('failed', 'canceled') then raise exception 'El job ya terminó'; end if;

  foreach v_asset_id in array coalesce(p_output_asset_ids, '{}'::uuid[]) loop
    if not exists (select 1 from public.assets where id = v_asset_id and user_id = v_job.user_id) then
      raise exception 'El asset de salida no pertenece al usuario';
    end if;
    insert into public.generation_job_assets (job_id, asset_id, role)
    values (p_job_id, v_asset_id, 'output')
    on conflict do nothing;
  end loop;

  update public.generation_jobs
  set status = 'completed', credits_captured = credits_reserved,
      completed_at = now(), error_code = null, error_message = null
  where id = p_job_id;
  update public.generation_job_attempts
  set status = 'completed', completed_at = now()
  where job_id = p_job_id and status = 'processing';
  insert into public.generation_job_events (job_id, event_type, payload)
  values (p_job_id, 'completed', jsonb_build_object('output_asset_ids', coalesce(p_output_asset_ids, '{}'::uuid[])));
  return jsonb_build_object('success', true, 'status', 'completed', 'credits_captured', v_job.credits_reserved);
end;
$$;

create or replace function public.refund_generation_credits(
  p_job_id uuid,
  p_error_code text default null,
  p_error_message text default null,
  p_canceled boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.generation_jobs%rowtype;
  v_balance bigint;
  v_refund_id uuid;
  v_status text;
begin
  select * into v_job from public.generation_jobs where id = p_job_id for update;
  if not found then raise exception 'Job inexistente'; end if;
  if v_job.status = 'completed' then raise exception 'Un job finalizado no puede reembolsarse'; end if;
  if v_job.credits_refunded > 0 or v_job.status = 'failed' or v_job.status = 'canceled' then
    return jsonb_build_object('success', true, 'idempotent', true, 'status', v_job.status);
  end if;

  insert into public.wallets (user_id, balance) values (v_job.user_id, 0)
  on conflict (user_id) do nothing;
  select balance into v_balance from public.wallets where user_id = v_job.user_id for update;
  if v_job.credits_reserved > 0 then
    v_balance := v_balance + v_job.credits_reserved;
    update public.wallets set balance = v_balance where user_id = v_job.user_id;
    update public.users set credits = v_balance::integer where id = v_job.user_id;
    insert into public.transactions (
      user_id, type, credits_granted, credit_delta, balance_after,
      description, metadata, status
    ) values (
      v_job.user_id, 'adjustment', v_job.credits_reserved::integer,
      v_job.credits_reserved, v_balance, 'Reembolso de generación',
      jsonb_build_object('generation_job_id', v_job.id, 'error_code', p_error_code), 'approved'
    ) returning id into v_refund_id;
  end if;

  v_status := case when p_canceled then 'canceled' else 'failed' end;
  update public.generation_jobs
  set status = v_status, credits_refunded = credits_reserved,
      refund_transaction_id = v_refund_id, error_code = p_error_code,
      error_message = p_error_message, completed_at = now()
  where id = p_job_id;
  update public.generation_job_attempts
  set status = v_status, completed_at = now(), error_code = p_error_code,
      error_message = p_error_message
  where job_id = p_job_id and status = 'processing';
  insert into public.generation_job_events (job_id, event_type, payload)
  values (p_job_id, v_status, jsonb_build_object('error_code', p_error_code, 'message', p_error_message));
  return jsonb_build_object('success', true, 'status', v_status,
    'refunded_credits', v_job.credits_reserved, 'remaining_credits', v_balance);
end;
$$;

create or replace function public.request_generation_cancellation(p_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_job public.generation_jobs%rowtype;
begin
  select * into v_job from public.generation_jobs where id = p_job_id for update;
  if not found then raise exception 'Job inexistente'; end if;
  if v_job.status in ('completed', 'failed', 'canceled') then
    return jsonb_build_object('success', true, 'status', v_job.status);
  end if;
  update public.generation_jobs set cancel_requested = true where id = p_job_id;
  insert into public.generation_job_events (job_id, event_type) values (p_job_id, 'cancel_requested');
  return jsonb_build_object('success', true, 'status', 'cancel_requested');
end;
$$;

create or replace function public.record_generation_failure(
  p_job_id uuid,
  p_error_code text,
  p_error_message text,
  p_retryable boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.generation_jobs%rowtype;
begin
  select * into v_job from public.generation_jobs where id = p_job_id for update;
  if not found then raise exception 'Job inexistente'; end if;
  if v_job.status in ('completed', 'failed', 'canceled') then
    return jsonb_build_object('success', true, 'idempotent', true, 'status', v_job.status);
  end if;
  update public.generation_jobs
  set error_code = p_error_code, error_message = p_error_message
  where id = p_job_id;
  insert into public.generation_job_events (job_id, event_type, payload)
  values (p_job_id, case when p_retryable then 'retryable_failure' else 'failure' end,
    jsonb_build_object('error_code', p_error_code, 'message', p_error_message));
  return jsonb_build_object('success', true, 'retryable', p_retryable, 'status', v_job.status);
end;
$$;

create or replace function public.retry_generation_job(p_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.generation_jobs%rowtype;
  v_balance bigint;
  v_role text;
  v_reserved bigint;
  v_transaction_id uuid;
begin
  select * into v_job from public.generation_jobs where id = p_job_id for update;
  if not found then raise exception 'Job inexistente'; end if;
  if v_job.status not in ('failed', 'canceled') then raise exception 'El job no puede reintentarse en su estado actual'; end if;

  select role into v_role from public.users where id = v_job.user_id;
  if not found then raise exception 'Usuario inexistente'; end if;
  insert into public.wallets (user_id, balance) values (v_job.user_id, 0) on conflict (user_id) do nothing;
  select balance into v_balance from public.wallets where user_id = v_job.user_id for update;
  v_reserved := case when v_role = 'admin' then 0 else greatest(v_job.credits_reserved, 0) end;
  if v_balance - v_reserved < 0 then raise exception 'Créditos insuficientes'; end if;
  if v_reserved > 0 then
    v_balance := v_balance - v_reserved;
    update public.wallets set balance = v_balance where user_id = v_job.user_id;
    update public.users set credits = v_balance::integer where id = v_job.user_id;
    insert into public.transactions (
      user_id, type, credits_granted, credit_delta, balance_after, description, metadata, status
    ) values (
      v_job.user_id, 'generation', (-v_reserved)::integer, -v_reserved, v_balance,
      'Reserva de reintento de generación', jsonb_build_object('generation_job_id', v_job.id), 'approved'
    ) returning id into v_transaction_id;
  end if;
  update public.generation_jobs
  set status = 'queued', attempts = 0, provider_job_id = null,
      credits_reserved = v_reserved, credits_captured = 0, credits_refunded = 0,
      reservation_transaction_id = v_transaction_id, refund_transaction_id = null,
      error_code = null, error_message = null, cancel_requested = false,
      started_at = null, completed_at = null
  where id = p_job_id;
  insert into public.generation_job_events (job_id, event_type, payload)
  values (p_job_id, 'retry_requested', jsonb_build_object('credits_reserved', v_reserved));
  return jsonb_build_object('success', true, 'status', 'queued', 'reserved_credits', v_reserved);
end;
$$;

alter table public.generation_jobs enable row level security;
alter table public.generation_job_attempts enable row level security;
alter table public.generation_job_events enable row level security;
alter table public.generation_job_assets enable row level security;

grant select on public.generation_jobs to authenticated;
grant select on public.generation_job_attempts to authenticated;
grant select on public.generation_job_events to authenticated;
grant select on public.generation_job_assets to authenticated;
revoke insert, update, delete on public.generation_jobs from anon, authenticated;
revoke insert, update, delete on public.generation_job_attempts from anon, authenticated;
revoke insert, update, delete on public.generation_job_events from anon, authenticated;
revoke insert, update, delete on public.generation_job_assets from anon, authenticated;

drop policy if exists generation_jobs_select_own on public.generation_jobs;
create policy generation_jobs_select_own on public.generation_jobs for select
  using (auth.uid() = user_id);
drop policy if exists generation_job_attempts_select_own on public.generation_job_attempts;
create policy generation_job_attempts_select_own on public.generation_job_attempts for select
  using (exists (select 1 from public.generation_jobs j where j.id = job_id and j.user_id = auth.uid()));
drop policy if exists generation_job_events_select_own on public.generation_job_events;
create policy generation_job_events_select_own on public.generation_job_events for select
  using (exists (select 1 from public.generation_jobs j where j.id = job_id and j.user_id = auth.uid()));
drop policy if exists generation_job_assets_select_own on public.generation_job_assets;
create policy generation_job_assets_select_own on public.generation_job_assets for select
  using (exists (select 1 from public.generation_jobs j where j.id = job_id and j.user_id = auth.uid()));

revoke all on function public.reserve_generation_credits(uuid,text,text,text,text,text,text,text,bigint,jsonb,integer) from public, anon, authenticated;
revoke all on function public.mark_generation_job_processing(uuid,text,text,integer) from public, anon, authenticated;
revoke all on function public.complete_generation_job(uuid,uuid[]) from public, anon, authenticated;
revoke all on function public.refund_generation_credits(uuid,text,text,boolean) from public, anon, authenticated;
revoke all on function public.request_generation_cancellation(uuid) from public, anon, authenticated;
revoke all on function public.record_generation_failure(uuid,text,text,boolean) from public, anon, authenticated;
revoke all on function public.retry_generation_job(uuid) from public, anon, authenticated;
grant execute on function public.reserve_generation_credits(uuid,text,text,text,text,text,text,text,bigint,jsonb,integer) to service_role;
grant execute on function public.mark_generation_job_processing(uuid,text,text,integer) to service_role;
grant execute on function public.complete_generation_job(uuid,uuid[]) to service_role;
grant execute on function public.refund_generation_credits(uuid,text,text,boolean) to service_role;
grant execute on function public.request_generation_cancellation(uuid) to service_role;
grant execute on function public.record_generation_failure(uuid,text,text,boolean) to service_role;
grant execute on function public.retry_generation_job(uuid) to service_role;
