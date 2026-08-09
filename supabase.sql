-- LEGACY REFERENCE ONLY — DO NOT APPLY IN NEW ENVIRONMENTS.
-- The canonical schema is maintained in supabase/migrations/. This historical
-- bootstrap remains only for traceability and is intentionally locked down at
-- the end of the file.

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create users table
create table public.users (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  role text default 'user'::text not null,
  credits integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create transactions table
create table public.transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  type text check (type in ('credit_purchase', 'inference_cost')) not null,
  package_name text,
  amount_bs numeric,
  reference_number text,
  proof_image_url text,
  credits_granted integer not null,
  status text check (status in ('pending', 'approved', 'manual_review', 'amount_mismatch')) not null default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (reference_number)
);

-- Set up Row Level Security (RLS)
alter table public.users enable row level security;
alter table public.transactions enable row level security;

-- Policies for users
create policy "Users can view their own profile"
  on public.users for select
  using ( auth.uid() = id );

create policy "Users can update their own profile"
  on public.users for update
  using ( auth.uid() = id );

-- Policies for transactions
create policy "Users can view their own transactions"
  on public.transactions for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own transactions"
  on public.transactions for insert
  with check ( auth.uid() = user_id );

-- Handle new user signup trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RPC for processing payment safely with locking
create or replace function public.process_payment_and_add_credits(
  p_user_id uuid,
  p_package_id text,
  p_amount_bs numeric,
  p_reference text,
  p_status text,
  p_credits_to_add integer,
  p_receipt_url text
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_credits integer;
  v_transaction_id uuid;
begin
  -- Prevent double spends by checking reference_number existence first
  if exists (select 1 from public.transactions where reference_number = p_reference and reference_number != 'N/A') then
    return jsonb_build_object('error', 'Reference already exists');
  end if;

  -- Lock the user row
  select credits into v_user_credits
  from public.users
  where id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('error', 'User not found');
  end if;

  -- Create the transaction
  insert into public.transactions (
    user_id,
    type,
    package_name,
    amount_bs,
    reference_number,
    proof_image_url,
    credits_granted,
    status
  ) values (
    p_user_id,
    'credit_purchase',
    p_package_id,
    p_amount_bs,
    p_reference,
    p_receipt_url,
    p_credits_to_add,
    p_status
  ) returning id into v_transaction_id;

  -- Add credits if approved
  if p_status = 'approved' and p_credits_to_add > 0 then
    update public.users
    set credits = credits + p_credits_to_add
    where id = p_user_id;
  end if;

  return jsonb_build_object('success', true, 'transaction_id', v_transaction_id);
end;
$$;

-- SECURITY CLOSURE FOR THE LEGACY BOOTSTRAP
-- Financial mutations belong to the reviewed migration/RPC flow. The client
-- must never be able to call these historical SECURITY DEFINER functions or
-- mutate balances and transactions directly.
drop function if exists public.process_payment_and_add_credits(uuid, text, numeric, text, text, integer, text);
drop function if exists public.deduct_credits_for_generation(uuid, integer, text);

drop policy if exists "Users can insert their own transactions" on public.transactions;
drop policy if exists "Users can update their own profile" on public.users;

revoke insert, update, delete on table public.transactions from anon, authenticated;
revoke update on table public.users from anon, authenticated;

-- RPC for deducting credits for generation safely
create or replace function public.deduct_credits_for_generation(
  p_user_id uuid,
  p_cost integer,
  p_prompt text
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_credits integer;
  v_transaction_id uuid;
begin
  -- Lock the user row
  select credits into v_user_credits
  from public.users
  where id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('error', 'User not found');
  end if;

  if v_user_credits < p_cost then
    return jsonb_build_object('error', 'Insufficient credits');
  end if;

  -- Deduct credits
  update public.users
  set credits = credits - p_cost
  where id = p_user_id;

  -- Log the transaction
  insert into public.transactions (
    user_id,
    type,
    credits_granted,
    status,
    package_name
  ) values (
    p_user_id,
    'inference_cost',
    -p_cost,
    'approved',
    substring(p_prompt, 1, 100) -- Save prompt snippet in package_name for logs
  ) returning id into v_transaction_id;

  return jsonb_build_object('success', true, 'transaction_id', v_transaction_id, 'remaining_credits', v_user_credits - p_cost);
end;
$$;

-- Final lock after every historical function definition.
drop function if exists public.process_payment_and_add_credits(uuid, text, numeric, text, text, integer, text);
drop function if exists public.deduct_credits_for_generation(uuid, integer, text);
