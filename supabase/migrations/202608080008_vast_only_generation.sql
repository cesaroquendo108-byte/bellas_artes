-- Vast.ai Serverless es el único proveedor GPU activo.
-- La migración conserva filas históricas y bloquea rutas nuevas no autorizadas.

create or replace function public.enforce_vast_only_generation_provider()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.provider_route not in ('vast', 'fake') then
    raise exception 'Ruta de proveedor inválida: sólo Vast.ai Serverless está habilitado';
  end if;
  return new;
end;
$$;

drop trigger if exists generation_jobs_vast_only on public.generation_jobs;
create trigger generation_jobs_vast_only
before insert or update of provider_route on public.generation_jobs
for each row execute function public.enforce_vast_only_generation_provider();

revoke all on function public.enforce_vast_only_generation_provider() from public, anon, authenticated;
