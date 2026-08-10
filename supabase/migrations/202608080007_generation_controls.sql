-- Controles de generación: auditoría mínima de moderación.
-- Los prompts y las IP nunca se almacenan en claro.

create table if not exists public.generation_moderation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  job_id uuid references public.generation_jobs(id) on delete set null,
  prompt_hash text not null check (char_length(prompt_hash) = 64),
  ip_hash text check (ip_hash is null or char_length(ip_hash) = 64),
  decision text not null check (decision in ('allowed', 'blocked')),
  reason text,
  user_agent text check (user_agent is null or char_length(user_agent) <= 512),
  created_at timestamptz not null default now()
);

create index if not exists generation_moderation_events_user_created_idx
  on public.generation_moderation_events (user_id, created_at desc);
create index if not exists generation_moderation_events_decision_created_idx
  on public.generation_moderation_events (decision, created_at desc);

alter table public.generation_moderation_events enable row level security;
revoke all on public.generation_moderation_events from anon, authenticated;
