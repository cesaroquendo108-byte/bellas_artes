-- Bellas Artes - bootstrap canónico.
-- No contiene RPCs legacy ni permite mutaciones financieras desde el cliente.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade not null primary key,
  email text not null default '',
  role text not null default 'user',
  credits integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  credits_granted integer default 0,
  package_name text,
  type text,
  status text,
  amount numeric,
  amount_bs numeric,
  reference_number text,
  proof_image_url text,
  created_at timestamptz default now()
);

alter table public.users enable row level security;
alter table public.transactions enable row level security;

grant select on public.users to authenticated;
grant select on public.transactions to authenticated;

drop policy if exists "Users can view their own profile" on public.users;
create policy "Users can view their own profile" on public.users for select
  using (auth.uid() = id);
drop policy if exists "Users can view their own transactions" on public.transactions;
create policy "Users can view their own transactions" on public.transactions for select
  using (auth.uid() = user_id);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
