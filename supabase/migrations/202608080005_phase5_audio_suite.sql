-- Bellas Artes - Fase 5: Suite de Audio.
-- Esquema aditivo. Los trabajos y movimientos financieros solo se escriben
-- desde código servidor mediante el rol de servicio.

create table if not exists public.audio_voices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  provider text not null,
  provider_voice_id text,
  name text not null,
  language text not null default 'es',
  category text not null default 'general',
  description text,
  preview_asset_id uuid references public.assets(id) on delete set null,
  is_clone boolean not null default false,
  consent_confirmed_at timestamptz,
  consent_evidence jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not is_clone or (user_id is not null and consent_confirmed_at is not null))
);

create table if not exists public.audio_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null check (kind in ('tts', 'voice_changer', 'voice_clone', 'video_mix')),
  provider text not null,
  provider_job_id text,
  idempotency_key text not null,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'ready', 'failed', 'canceled')),
  request jsonb not null default '{}'::jsonb,
  output_asset_id uuid references public.assets(id) on delete set null,
  reserved_credits bigint not null default 0 check (reserved_credits >= 0),
  reservation_transaction_id uuid references public.transactions(id) on delete restrict,
  refund_transaction_id uuid references public.transactions(id) on delete restrict,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  refunded_at timestamptz,
  unique (user_id, idempotency_key)
);

create table if not exists public.audio_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  source_video_asset_id uuid references public.assets(id) on delete set null,
  duration_ms bigint not null default 0 check (duration_ms >= 0),
  preset jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audio_tracks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.audio_projects(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  asset_id uuid references public.assets(id) on delete set null,
  kind text not null check (kind in ('voice', 'music', 'effect', 'ambience')),
  name text not null,
  start_ms bigint not null default 0 check (start_ms >= 0),
  trim_start_ms bigint not null default 0 check (trim_start_ms >= 0),
  duration_ms bigint not null default 0 check (duration_ms >= 0),
  volume numeric(5,2) not null default 1 check (volume >= 0 and volume <= 2),
  speed numeric(5,2) not null default 1 check (speed >= 0.25 and speed <= 4),
  muted boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists audio_jobs_user_created_idx
  on public.audio_jobs (user_id, created_at desc, id desc);
create index if not exists audio_jobs_status_created_idx
  on public.audio_jobs (status, created_at asc);
create index if not exists audio_projects_user_updated_idx
  on public.audio_projects (user_id, updated_at desc);
create index if not exists audio_tracks_project_start_idx
  on public.audio_tracks (project_id, start_ms asc);

drop trigger if exists audio_voices_touch_updated_at on public.audio_voices;
create trigger audio_voices_touch_updated_at before update on public.audio_voices
for each row execute function public.touch_updated_at();
drop trigger if exists audio_jobs_touch_updated_at on public.audio_jobs;
create trigger audio_jobs_touch_updated_at before update on public.audio_jobs
for each row execute function public.touch_updated_at();
drop trigger if exists audio_projects_touch_updated_at on public.audio_projects;
create trigger audio_projects_touch_updated_at before update on public.audio_projects
for each row execute function public.touch_updated_at();
drop trigger if exists audio_tracks_touch_updated_at on public.audio_tracks;
create trigger audio_tracks_touch_updated_at before update on public.audio_tracks
for each row execute function public.touch_updated_at();

create or replace function public.reserve_audio_job_credits(
  p_user_id uuid,
  p_idempotency_key text,
  p_kind text,
  p_provider text,
  p_credits bigint,
  p_request jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.audio_jobs%rowtype;
  v_balance bigint;
  v_role text;
  v_job_id uuid := gen_random_uuid();
  v_transaction_id uuid;
  v_reserved bigint;
begin
  if p_kind not in ('tts', 'voice_changer', 'voice_clone', 'video_mix') then
    raise exception 'Tipo de trabajo de audio inválido';
  end if;
  if length(trim(p_idempotency_key)) < 8 then
    raise exception 'Clave de idempotencia inválida';
  end if;
  if p_credits < 0 then
    raise exception 'La reserva no puede ser negativa';
  end if;

  select role into v_role from public.users where id = p_user_id;
  if not found then raise exception 'Usuario inexistente'; end if;

  insert into public.wallets (user_id, balance) values (p_user_id, 0)
  on conflict (user_id) do nothing;
  select balance into v_balance from public.wallets
  where user_id = p_user_id for update;

  select * into v_job from public.audio_jobs
  where user_id = p_user_id and idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object(
      'success', true,
      'idempotent', true,
      'job_id', v_job.id,
      'status', v_job.status,
      'reserved_credits', v_job.reserved_credits,
      'remaining_credits', v_balance,
      'unlimited', v_role = 'admin'
    );
  end if;

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
      'Reserva para trabajo de audio',
      jsonb_build_object('audio_job_id', v_job_id, 'kind', p_kind),
      'approved'
    ) returning id into v_transaction_id;
  end if;

  insert into public.audio_jobs (
    id, user_id, kind, provider, idempotency_key, status, request,
    reserved_credits, reservation_transaction_id
  ) values (
    v_job_id, p_user_id, p_kind, p_provider, p_idempotency_key,
    'queued', coalesce(p_request, '{}'::jsonb), v_reserved, v_transaction_id
  ) returning * into v_job;

  return jsonb_build_object(
    'success', true,
    'idempotent', false,
    'job_id', v_job.id,
    'status', v_job.status,
    'reserved_credits', v_reserved,
    'remaining_credits', v_balance,
    'unlimited', v_role = 'admin'
  );
end;
$$;

create or replace function public.refund_audio_job_credits(
  p_job_id uuid,
  p_error_code text default null,
  p_error_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.audio_jobs%rowtype;
  v_balance bigint;
  v_refund_id uuid;
begin
  select * into v_job from public.audio_jobs where id = p_job_id for update;
  if not found then raise exception 'Trabajo de audio inexistente'; end if;

  if v_job.refunded_at is not null then
    return jsonb_build_object('success', true, 'idempotent', true, 'job_id', v_job.id);
  end if;
  if v_job.status = 'ready' then raise exception 'Un trabajo finalizado no puede reembolsarse'; end if;

  insert into public.wallets (user_id, balance) values (v_job.user_id, 0)
  on conflict (user_id) do nothing;
  select balance into v_balance from public.wallets
  where user_id = v_job.user_id for update;

  if v_job.reserved_credits > 0 then
    v_balance := v_balance + v_job.reserved_credits;
    update public.wallets set balance = v_balance where user_id = v_job.user_id;
    update public.users set credits = v_balance::integer where id = v_job.user_id;
    insert into public.transactions (
      user_id, type, credits_granted, credit_delta, balance_after,
      description, metadata, status
    ) values (
      v_job.user_id, 'adjustment', v_job.reserved_credits::integer,
      v_job.reserved_credits, v_balance, 'Reembolso de trabajo de audio',
      jsonb_build_object('audio_job_id', v_job.id), 'approved'
    ) returning id into v_refund_id;
  end if;

  update public.audio_jobs
  set status = 'failed', error_code = p_error_code,
      error_message = p_error_message, refund_transaction_id = v_refund_id,
      refunded_at = now(), completed_at = now()
  where id = v_job.id;

  return jsonb_build_object(
    'success', true, 'idempotent', false, 'job_id', v_job.id,
    'refunded_credits', v_job.reserved_credits, 'remaining_credits', v_balance
  );
end;
$$;

create or replace function public.complete_audio_job(
  p_job_id uuid,
  p_output_asset_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.audio_jobs%rowtype;
begin
  select * into v_job from public.audio_jobs where id = p_job_id for update;
  if not found then raise exception 'Trabajo de audio inexistente'; end if;
  if v_job.refunded_at is not null then raise exception 'El trabajo ya fue reembolsado'; end if;
  if v_job.status = 'ready' then
    return jsonb_build_object('success', true, 'idempotent', true, 'job_id', v_job.id);
  end if;
  if not exists (
    select 1 from public.assets
    where id = p_output_asset_id and user_id = v_job.user_id and type = 'audio'
  ) then raise exception 'Asset de salida inválido'; end if;

  update public.audio_jobs
  set status = 'ready', output_asset_id = p_output_asset_id,
      completed_at = now(), error_code = null, error_message = null
  where id = v_job.id;

  return jsonb_build_object('success', true, 'idempotent', false, 'job_id', v_job.id);
end;
$$;

revoke all on function public.reserve_audio_job_credits(uuid,text,text,text,bigint,jsonb) from public, anon, authenticated;
revoke all on function public.refund_audio_job_credits(uuid,text,text) from public, anon, authenticated;
revoke all on function public.complete_audio_job(uuid,uuid) from public, anon, authenticated;
grant execute on function public.reserve_audio_job_credits(uuid,text,text,text,bigint,jsonb) to service_role;
grant execute on function public.refund_audio_job_credits(uuid,text,text) to service_role;
grant execute on function public.complete_audio_job(uuid,uuid) to service_role;

alter table public.audio_voices enable row level security;
alter table public.audio_jobs enable row level security;
alter table public.audio_projects enable row level security;
alter table public.audio_tracks enable row level security;

grant select on public.audio_voices, public.audio_jobs, public.audio_projects, public.audio_tracks to authenticated;
revoke insert, update, delete on public.audio_voices, public.audio_jobs, public.audio_projects, public.audio_tracks from authenticated;

drop policy if exists "audio_voices_select_available" on public.audio_voices;
create policy "audio_voices_select_available" on public.audio_voices for select
  using (user_id is null or auth.uid() = user_id);
drop policy if exists "audio_jobs_select_own" on public.audio_jobs;
create policy "audio_jobs_select_own" on public.audio_jobs for select
  using (auth.uid() = user_id);
drop policy if exists "audio_projects_select_own" on public.audio_projects;
create policy "audio_projects_select_own" on public.audio_projects for select
  using (auth.uid() = user_id);
drop policy if exists "audio_tracks_select_own" on public.audio_tracks;
create policy "audio_tracks_select_own" on public.audio_tracks for select
  using (auth.uid() = user_id);

