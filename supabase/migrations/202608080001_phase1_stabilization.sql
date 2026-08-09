-- Bellas Artes - Fase 1: esquema aditivo y transaccional.
-- Conserva users.credits y las columnas legacy de transactions como ruta de reversión.

create extension if not exists pgcrypto;

-- Retira las rutas heredadas que aceptaban identidad, montos o créditos
-- suministrados por el navegador. Las firmas se eliminan antes de crear
-- las operaciones transaccionales de esta fase.
drop function if exists public.process_payment_and_add_credits(uuid,text,numeric,text,text,integer,text);
drop function if exists public.deduct_credits_for_generation(uuid,integer,text);

alter table public.users
  add column if not exists role text not null default 'user',
  add column if not exists credits integer not null default 0,
  add column if not exists display_name text,
  add column if not exists avatar_url text,
  add column if not exists plan_tier text not null default 'free';

alter table public.users drop constraint if exists users_role_check;
alter table public.users add constraint users_role_check check (role in ('user', 'admin'));
alter table public.users drop constraint if exists users_plan_tier_check;
alter table public.users add constraint users_plan_tier_check check (plan_tier in ('free', 'pro', 'b2b'));

create table if not exists public.wallets (
  user_id uuid primary key references public.users(id) on delete cascade,
  balance bigint not null default 0 check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.wallets (user_id, balance)
select id, greatest(credits, 0)::bigint from public.users
on conflict (user_id) do nothing;

alter table public.transactions
  add column if not exists credit_delta bigint,
  add column if not exists balance_after bigint,
  add column if not exists description text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists payment_id uuid,
  add column if not exists actor_id uuid references public.users(id) on delete set null;

update public.transactions
set credit_delta = case
  when type = 'inference_cost' then -abs(coalesce(credits_granted, 0))
  else coalesce(credits_granted, 0)
end
where credit_delta is null;

alter table public.transactions alter column credit_delta set default 0;
alter table public.transactions alter column credit_delta set not null;
alter table public.transactions drop constraint if exists transactions_type_check;
alter table public.transactions add constraint transactions_type_check
  check (type in ('purchase', 'generation', 'bonus', 'adjustment', 'credit_purchase', 'inference_cost'));
alter table public.transactions drop constraint if exists transactions_status_check;
update public.transactions set status = 'approved' where status = 'validated';
alter table public.transactions add constraint transactions_status_check
  check (status in ('pending', 'approved', 'manual_review', 'amount_mismatch', 'rejected'));

create table if not exists public.pago_movil_proofs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  package_id text not null check (package_id in ('curioso', 'creador', 'estudio')),
  price_usd numeric(10,2) not null check (price_usd > 0),
  credits bigint not null check (credits > 0),
  payment_rate numeric(18,4) not null check (payment_rate > 0),
  expected_amount_bs numeric(18,2) not null check (expected_amount_bs > 0),
  extracted_amount_bs numeric(18,2),
  extracted_reference text,
  extracted_date date,
  receipt_key text not null,
  receipt_sha256 text not null,
  mime_type text not null,
  status text not null default 'pending'
    check (status in ('pending', 'manual_review', 'amount_mismatch', 'approved', 'rejected')),
  extraction jsonb not null default '{}'::jsonb,
  review_note text,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (receipt_sha256)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'transactions_payment_id_fkey'
  ) then
    alter table public.transactions
      add constraint transactions_payment_id_fkey
      foreign key (payment_id) references public.pago_movil_proofs(id)
      on delete restrict;
  end if;
end;
$$;

-- El historial heredado puede no sumar exactamente el saldo guardado en users.
-- Se añade un único ajuste de conciliación y se reconstruye balance_after para
-- que el ledger y la billetera partan de la misma verdad contable.
insert into public.transactions (
  user_id, type, package_name, credits_granted, credit_delta,
  balance_after, description, metadata, status
)
select
  w.user_id,
  'adjustment',
  'migracion_fase_1',
  (w.balance - coalesce(t.total_delta, 0))::integer,
  w.balance - coalesce(t.total_delta, 0),
  w.balance,
  'Conciliación de saldo al migrar la billetera',
  jsonb_build_object('source', 'users.credits'),
  'approved'
from public.wallets w
left join (
  select user_id, sum(credit_delta) as total_delta
  from public.transactions
  group by user_id
) t on t.user_id = w.user_id
where w.balance <> coalesce(t.total_delta, 0)
   or not exists (
     select 1 from public.transactions tx where tx.user_id = w.user_id
   );

with running as (
  select
    id,
    sum(credit_delta) over (
      partition by user_id order by created_at, id
      rows between unbounded preceding and current row
    ) as calculated_balance
  from public.transactions
)
update public.transactions tx
set balance_after = running.calculated_balance
from running
where tx.id = running.id;

drop index if exists public.pago_movil_reference_once;
create index if not exists pago_movil_reference_lookup
  on public.pago_movil_proofs (extracted_reference)
  where extracted_reference is not null and status <> 'rejected';
create unique index if not exists pago_movil_approved_reference_once
  on public.pago_movil_proofs (extracted_reference)
  where extracted_reference is not null and status = 'approved';

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('image', 'video', 'audio')),
  name text not null,
  r2_key text not null unique,
  mime_type text not null,
  bytes bigint not null default 0 check (bytes >= 0),
  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.set_asset_retention()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_tier text;
begin
  select plan_tier into v_plan_tier
  from public.users
  where id = new.user_id;

  if not found then
    raise exception 'Usuario inexistente para el asset';
  end if;

  if v_plan_tier = 'free' then
    new.expires_at := now() + interval '15 days';
  else
    new.expires_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists assets_set_retention on public.assets;
create trigger assets_set_retention
before insert or update of user_id on public.assets
for each row execute function public.set_asset_retention();

create index if not exists transactions_user_created_idx
  on public.transactions (user_id, created_at desc, id desc);
create index if not exists assets_user_created_idx
  on public.assets (user_id, created_at desc, id desc);
create index if not exists pago_movil_status_created_idx
  on public.pago_movil_proofs (status, created_at asc);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists wallets_touch_updated_at on public.wallets;
create trigger wallets_touch_updated_at before update on public.wallets
for each row execute function public.touch_updated_at();
drop trigger if exists pago_movil_touch_updated_at on public.pago_movil_proofs;
create trigger pago_movil_touch_updated_at before update on public.pago_movil_proofs
for each row execute function public.touch_updated_at();

create or replace function public.prevent_ledger_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'El ledger de créditos es inmutable';
end;
$$;

drop trigger if exists transactions_immutable on public.transactions;
create trigger transactions_immutable before update or delete on public.transactions
for each row execute function public.prevent_ledger_mutation();

create or replace function public.ensure_wallet_for_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.wallets (user_id, balance)
  values (new.id, greatest(coalesce(new.credits, 0), 0))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists ensure_wallet_after_user on public.users;
create trigger ensure_wallet_after_user after insert on public.users
for each row execute function public.ensure_wallet_for_user();

create or replace function public.apply_credit_delta(
  p_user_id uuid,
  p_delta bigint,
  p_type text,
  p_description text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance bigint;
  v_role text;
  v_transaction_id uuid;
begin
  if p_type not in ('generation', 'bonus', 'adjustment') then
    raise exception 'Tipo de movimiento no permitido';
  end if;

  select role into v_role from public.users where id = p_user_id;
  if not found then raise exception 'Usuario inexistente'; end if;

  insert into public.wallets (user_id, balance) values (p_user_id, 0)
  on conflict (user_id) do nothing;

  select balance into v_balance from public.wallets
  where user_id = p_user_id for update;

  if v_role = 'admin' and p_delta < 0 then
    return jsonb_build_object('success', true, 'unlimited', true, 'remaining_credits', v_balance);
  end if;

  if v_balance + p_delta < 0 then
    raise exception 'Créditos insuficientes';
  end if;

  v_balance := v_balance + p_delta;
  update public.wallets set balance = v_balance where user_id = p_user_id;
  update public.users set credits = v_balance::integer where id = p_user_id;

  insert into public.transactions (
    user_id, type, credits_granted, credit_delta, balance_after,
    description, metadata, status, actor_id
  ) values (
    p_user_id, p_type, p_delta::integer, p_delta, v_balance,
    p_description, coalesce(p_metadata, '{}'::jsonb), 'approved', p_actor_id
  ) returning id into v_transaction_id;

  return jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'remaining_credits', v_balance,
    'unlimited', false
  );
end;
$$;

create or replace function public.review_payment(
  p_payment_id uuid,
  p_decision text,
  p_reviewer uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.pago_movil_proofs%rowtype;
  v_balance bigint;
  v_transaction_id uuid;
begin
  if not exists (
    select 1 from public.users where id = p_reviewer and role = 'admin'
  ) then
    raise exception 'Se requiere rol administrador';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decisión inválida';
  end if;

  select * into v_payment from public.pago_movil_proofs
  where id = p_payment_id for update;
  if not found then raise exception 'Comprobante inexistente'; end if;
  if v_payment.status in ('approved', 'rejected') then
    raise exception 'El comprobante ya fue resuelto';
  end if;

  if p_decision = 'rejected' then
    update public.pago_movil_proofs
    set status = 'rejected', reviewed_by = p_reviewer,
        reviewed_at = now(), review_note = p_note
    where id = p_payment_id;
    return jsonb_build_object('success', true, 'status', 'rejected');
  end if;

  if v_payment.extracted_amount_bs is null
     or abs(v_payment.extracted_amount_bs - v_payment.expected_amount_bs) > 1 then
    raise exception 'El monto no coincide con el paquete';
  end if;
  if v_payment.extracted_reference is null then
    raise exception 'La referencia no pudo verificarse';
  end if;
  if exists (
    select 1 from public.pago_movil_proofs
    where id <> p_payment_id
      and extracted_reference = v_payment.extracted_reference
      and status = 'approved'
  ) then
    raise exception 'La referencia ya fue acreditada';
  end if;

  insert into public.wallets (user_id, balance)
  values (v_payment.user_id, 0) on conflict (user_id) do nothing;
  select balance into v_balance from public.wallets
  where user_id = v_payment.user_id for update;
  v_balance := v_balance + v_payment.credits;

  update public.wallets set balance = v_balance where user_id = v_payment.user_id;
  update public.users set credits = v_balance::integer where id = v_payment.user_id;
  update public.pago_movil_proofs
  set status = 'approved', reviewed_by = p_reviewer,
      reviewed_at = now(), review_note = p_note
  where id = p_payment_id;

  insert into public.transactions (
    user_id, type, package_name, amount_bs, reference_number,
    proof_image_url, credits_granted, credit_delta, balance_after,
    description, metadata, status, payment_id, actor_id
  ) values (
    v_payment.user_id, 'purchase', v_payment.package_id,
    v_payment.extracted_amount_bs, v_payment.extracted_reference,
    v_payment.receipt_key, v_payment.credits::integer,
    v_payment.credits, v_balance, 'Compra de créditos',
    jsonb_build_object('price_usd', v_payment.price_usd, 'payment_rate', v_payment.payment_rate),
    'approved', v_payment.id, p_reviewer
  ) returning id into v_transaction_id;

  return jsonb_build_object(
    'success', true, 'status', 'approved',
    'transaction_id', v_transaction_id, 'balance', v_balance
  );
end;
$$;

revoke all on function public.apply_credit_delta(uuid,bigint,text,text,jsonb,uuid) from public, anon, authenticated;
revoke all on function public.review_payment(uuid,text,uuid,text) from public, anon, authenticated;
grant execute on function public.apply_credit_delta(uuid,bigint,text,text,jsonb,uuid) to service_role;
grant execute on function public.review_payment(uuid,text,uuid,text) to service_role;

alter table public.users enable row level security;
alter table public.wallets enable row level security;
alter table public.transactions enable row level security;
alter table public.pago_movil_proofs enable row level security;
alter table public.assets enable row level security;

grant select on public.wallets to authenticated;
grant select on public.transactions to authenticated;
grant select on public.pago_movil_proofs to authenticated;
grant select on public.assets to authenticated;

revoke insert, update, delete on public.wallets from authenticated;
revoke insert, update, delete on public.transactions from authenticated;
revoke insert, update, delete on public.pago_movil_proofs from authenticated;
revoke insert, update, delete on public.assets from authenticated;

grant select on public.users to authenticated;
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users for select
  using (auth.uid() = id);

drop policy if exists "Users can insert their own transactions" on public.transactions;
drop policy if exists "Users can update their own profile" on public.users;
drop policy if exists "users_update_safe_profile" on public.users;
revoke update on public.users from authenticated;
grant update (display_name, avatar_url) on public.users to authenticated;
create policy "users_update_safe_profile" on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
drop policy if exists "wallet_select_own" on public.wallets;
create policy "wallet_select_own" on public.wallets for select
  using (auth.uid() = user_id);
drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own" on public.transactions for select
  using (auth.uid() = user_id);
drop policy if exists "payments_select_own" on public.pago_movil_proofs;
create policy "payments_select_own" on public.pago_movil_proofs for select
  using (auth.uid() = user_id);
drop policy if exists "assets_select_own" on public.assets;
create policy "assets_select_own" on public.assets for select
  using (auth.uid() = user_id);

-- Las escrituras financieras y de almacenamiento se realizan exclusivamente
-- con el cliente de administración en código servidor.
