-- Billing shadow registra la tarifa cotizada sin descontar saldo público.
-- Es aditivo: los jobs históricos conservan billing_mode=live.

alter table public.generation_jobs
  add column if not exists billing_mode text not null default 'live'
    check (billing_mode in ('shadow', 'live')),
  add column if not exists quoted_credits bigint not null default 0
    check (quoted_credits >= 0);

alter table public.generation_job_attempts
  add column if not exists actual_cost_usd numeric(12, 6)
    check (actual_cost_usd is null or actual_cost_usd >= 0),
  add column if not exists vast_balance_before_usd numeric(12, 6)
    check (vast_balance_before_usd is null or vast_balance_before_usd >= 0),
  add column if not exists vast_balance_after_usd numeric(12, 6)
    check (vast_balance_after_usd is null or vast_balance_after_usd >= 0);

create or replace function public.set_generation_billing_metadata(
  p_job_id uuid,
  p_billing_mode text,
  p_quoted_credits bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_job public.generation_jobs%rowtype;
begin
  if p_billing_mode not in ('shadow', 'live') then
    raise exception 'Modo de billing inválido';
  end if;
  if p_quoted_credits < 0 then
    raise exception 'La cotización no puede ser negativa';
  end if;

  select * into v_job from public.generation_jobs where id = p_job_id for update;
  if not found then raise exception 'Job inexistente'; end if;
  if p_billing_mode = 'shadow' and v_job.credits_reserved <> 0 then
    raise exception 'Un job shadow no puede reservar créditos';
  end if;

  update public.generation_jobs
  set billing_mode = p_billing_mode,
      quoted_credits = p_quoted_credits
  where id = p_job_id;

  insert into public.generation_job_events (job_id, event_type, payload)
  select p_job_id, 'billing_mode', jsonb_build_object(
    'billing_mode', p_billing_mode,
    'quoted_credits', p_quoted_credits
  )
  where not exists (
    select 1 from public.generation_job_events
    where job_id = p_job_id and event_type = 'billing_mode'
  );

  return jsonb_build_object(
    'success', true,
    'billing_mode', p_billing_mode,
    'quoted_credits', p_quoted_credits
  );
end;
$$;

revoke all on function public.set_generation_billing_metadata(uuid,text,bigint)
  from public, anon, authenticated;
grant execute on function public.set_generation_billing_metadata(uuid,text,bigint)
  to service_role;

create or replace function public.record_generation_actual_cost(
  p_job_id uuid,
  p_attempt integer,
  p_balance_before_usd numeric,
  p_balance_after_usd numeric,
  p_actual_cost_usd numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_attempt < 1 then raise exception 'Intento inválido'; end if;
  if least(p_balance_before_usd, p_balance_after_usd, p_actual_cost_usd) < 0 then
    raise exception 'Los costes y saldos no pueden ser negativos';
  end if;

  update public.generation_job_attempts
  set actual_cost_usd = p_actual_cost_usd,
      vast_balance_before_usd = p_balance_before_usd,
      vast_balance_after_usd = p_balance_after_usd
  where job_id = p_job_id and attempt = p_attempt;
  if not found then raise exception 'Intento de generación inexistente'; end if;

  insert into public.generation_job_events (job_id, event_type, payload)
  values (p_job_id, 'actual_cost', jsonb_build_object(
    'attempt', p_attempt,
    'actual_cost_usd', p_actual_cost_usd,
    'vast_balance_before_usd', p_balance_before_usd,
    'vast_balance_after_usd', p_balance_after_usd
  ));
  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.record_generation_actual_cost(uuid,integer,numeric,numeric,numeric)
  from public, anon, authenticated;
grant execute on function public.record_generation_actual_cost(uuid,integer,numeric,numeric,numeric)
  to service_role;

create index if not exists generation_jobs_billing_mode_idx
  on public.generation_jobs (billing_mode, created_at desc);
