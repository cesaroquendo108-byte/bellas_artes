create table if not exists public.users (
  id uuid references auth.users not null primary key
);
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  credits_granted integer,
  package_name text,
  type text,
  status text,
  amount numeric,
  created_at timestamptz default now()
);
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (id)
  values (new.id);
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
