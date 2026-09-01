-- Bellas Artes - aceptación legal versionada.
-- Sólo el servidor escribe estos comprobantes mediante service_role.

create table if not exists public.user_consents (
  user_id uuid not null references public.users(id) on delete cascade,
  consent_type text not null check (consent_type in ('terms', 'moderation')),
  version text not null check (char_length(version) between 1 and 80),
  accepted_at timestamptz not null default now(),
  ip_hash text check (ip_hash is null or char_length(ip_hash) = 64),
  user_agent text check (user_agent is null or char_length(user_agent) <= 512),
  metadata jsonb not null default '{}'::jsonb,
  primary key (user_id, consent_type, version)
);

create index if not exists user_consents_lookup_idx
  on public.user_consents (user_id, consent_type, accepted_at desc);

alter table public.user_consents enable row level security;
revoke all on public.user_consents from anon, authenticated;
grant select, insert, update, delete on public.user_consents to service_role;
