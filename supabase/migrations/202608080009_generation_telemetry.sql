-- Telemetría de inferencia Vast.ai Serverless por intento.
-- No altera registros históricos ni contiene datos sensibles del prompt.

alter table public.generation_job_attempts
  add column if not exists startup_ms bigint check (startup_ms is null or startup_ms >= 0),
  add column if not exists inference_ms bigint check (inference_ms is null or inference_ms >= 0),
  add column if not exists total_ms bigint check (total_ms is null or total_ms >= 0),
  add column if not exists estimated_cost_usd numeric(12, 6)
    check (estimated_cost_usd is null or estimated_cost_usd >= 0);

create or replace function public.record_generation_metrics(
  p_job_id uuid,
  p_attempt integer,
  p_startup_ms bigint,
  p_inference_ms bigint,
  p_total_ms bigint,
  p_estimated_cost_usd numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_attempt < 1 then raise exception 'Intento inválido'; end if;
  if least(p_startup_ms, p_inference_ms, p_total_ms, p_estimated_cost_usd) < 0 then
    raise exception 'Las métricas no pueden ser negativas';
  end if;

  update public.generation_job_attempts
  set startup_ms = p_startup_ms,
      inference_ms = p_inference_ms,
      total_ms = p_total_ms,
      estimated_cost_usd = p_estimated_cost_usd
  where job_id = p_job_id and attempt = p_attempt;

  if not found then raise exception 'Intento de generación inexistente'; end if;

  insert into public.generation_job_events (job_id, event_type, payload)
  values (
    p_job_id,
    'metrics',
    jsonb_build_object(
      'attempt', p_attempt,
      'startup_ms', p_startup_ms,
      'inference_ms', p_inference_ms,
      'total_ms', p_total_ms,
      'estimated_cost_usd', p_estimated_cost_usd
    )
  );

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.record_generation_metrics(uuid,integer,bigint,bigint,bigint,numeric)
  from public, anon, authenticated;
grant execute on function public.record_generation_metrics(uuid,integer,bigint,bigint,bigint,numeric)
  to service_role;
