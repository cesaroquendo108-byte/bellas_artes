-- Vast.ai GPU rentals controlled exclusively by Bellas Artes administrators.
-- Credentials and raw provider responses are intentionally not persisted.

create table if not exists public.vast_admin_leases (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  active_slot smallint not null default 1 check (active_slot = 1),
  vast_instance_id bigint unique,
  operator_id uuid not null references auth.users(id) on delete restrict,
  offer_id bigint not null,
  preset text not null check (preset in ('comfy-clean', 'flux-cached')),
  market text not null check (market in ('on-demand', 'bid')),
  state text not null default 'pending' check (state in (
    'pending', 'reconciling', 'loading', 'running', 'stopped',
    'destroying', 'destroyed', 'failed', 'orphaned'
  )),
  label text not null unique check (label ~ '^ba-admin:[0-9a-f-]{36}$'),
  gpu_name text,
  gpu_ram_mb integer check (gpu_ram_mb is null or gpu_ram_mb >= 0),
  hourly_cost_usd numeric(12,6) not null check (hourly_cost_usd > 0 and hourly_cost_usd <= 0.60),
  estimated_max_cost_usd numeric(12,6) not null check (estimated_max_cost_usd >= 0 and estimated_max_cost_usd <= 1.20),
  balance_before_usd numeric(14,6) not null check (balance_before_usd >= 0),
  balance_after_usd numeric(14,6) check (balance_after_usd is null or balance_after_usd >= 0),
  expires_at timestamptz not null,
  last_synced_at timestamptz,
  destroyed_at timestamptz,
  error_code text check (error_code is null or length(error_code) <= 80),
  error_message text check (error_message is null or length(error_message) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (destroyed_at is null or state in ('destroyed', 'failed'))
);

create unique index if not exists vast_admin_leases_single_active_idx
  on public.vast_admin_leases (active_slot)
  where state not in ('destroyed', 'failed');

create index if not exists vast_admin_leases_expiry_idx
  on public.vast_admin_leases (expires_at)
  where state not in ('destroyed', 'failed');

create index if not exists vast_admin_leases_operator_created_idx
  on public.vast_admin_leases (operator_id, created_at desc);

drop trigger if exists vast_admin_leases_touch_updated_at on public.vast_admin_leases;
create trigger vast_admin_leases_touch_updated_at
before update on public.vast_admin_leases
for each row execute function public.touch_updated_at();

alter table public.vast_admin_leases enable row level security;

revoke all on public.vast_admin_leases from public, anon, authenticated;
grant select, insert, update on public.vast_admin_leases to service_role;

comment on table public.vast_admin_leases is
  'Server-only ledger for short-lived Vast.ai rentals created by Bellas Artes.';
comment on column public.vast_admin_leases.balance_after_usd is
  'Account-wide Vast balance observed after terminal cleanup; not an isolated invoice.';
