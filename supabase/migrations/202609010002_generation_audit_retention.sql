-- Bellas Artes - retención limitada de auditoría de moderación.
-- Los prompts no se almacenan; los hashes vencen para limitar la retención.

alter table public.generation_moderation_events
  add column if not exists retention_expires_at timestamptz;

update public.generation_moderation_events
set retention_expires_at = created_at + interval '180 days'
where retention_expires_at is null;

alter table public.generation_moderation_events
  alter column retention_expires_at set default (now() + interval '180 days');
alter table public.generation_moderation_events
  alter column retention_expires_at set not null;

create index if not exists generation_moderation_events_retention_idx
  on public.generation_moderation_events (retention_expires_at, id);

create or replace function public.prune_generation_moderation_events(p_limit integer default 500)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  if p_limit < 1 or p_limit > 5000 then
    raise exception 'Límite de retención inválido';
  end if;

  with expired as (
    select id
    from public.generation_moderation_events
    where retention_expires_at <= now()
    order by retention_expires_at asc, id asc
    limit p_limit
  )
  delete from public.generation_moderation_events events
  using expired
  where events.id = expired.id;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.prune_generation_moderation_events(integer)
  from public, anon, authenticated;
grant execute on function public.prune_generation_moderation_events(integer)
  to service_role;
