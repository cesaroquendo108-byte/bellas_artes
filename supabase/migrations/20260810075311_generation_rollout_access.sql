-- Gates aditivos para beta privada, cuentas de servicio y entitlements premium.
-- Ningún grant se expone a anon/authenticated; sólo service_role lo administra.

create table if not exists public.generation_access_grants (
  user_id uuid primary key references public.users(id) on delete cascade,
  access_level text not null default 'beta'
    check (access_level in ('beta', 'pro', 'b2b', 'service')),
  allowed_kinds text[] not null default array['image']::text[]
    check (allowed_kinds <@ array['image','video','audio','character','world']::text[]),
  enabled boolean not null default true,
  expires_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists generation_access_grants_enabled_expires_idx
  on public.generation_access_grants (enabled, expires_at);

alter table public.generation_access_grants enable row level security;
revoke all on public.generation_access_grants from anon, authenticated;
grant select, insert, update, delete on public.generation_access_grants to service_role;

drop trigger if exists generation_access_grants_touch_updated_at on public.generation_access_grants;
create trigger generation_access_grants_touch_updated_at
before update on public.generation_access_grants
for each row execute function public.touch_updated_at();
