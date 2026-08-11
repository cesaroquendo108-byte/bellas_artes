-- HISTÓRICO: bootstrap manual anterior a la secuencia canónica de migraciones.
-- No aplicar directamente; usar exclusivamente supabase/migrations/.
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
    user_id, type, package_name, amount, credits_granted, credit_delta,
    balance_after, description, metadata, status, payment_id, actor_id
  ) values (
    v_payment.user_id, 'purchase', v_payment.package_id,
    v_payment.price_usd, v_payment.credits::integer,
    v_payment.credits, v_balance, 'Compra de créditos',
    jsonb_build_object(
      'amount_bs', v_payment.extracted_amount_bs,
      'reference_number', v_payment.extracted_reference,
      'proof_image_url', v_payment.receipt_key,
      'price_usd', v_payment.price_usd,
      'payment_rate', v_payment.payment_rate
    ),
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
-- Bellas Artes - Fase 6: proyectos persistentes de Director y Story.

create table if not exists public.creative_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null check (kind in ('director', 'story')),
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text check (description is null or char_length(description) <= 2000),
  story_type text check (story_type is null or story_type in ('music-video', 'explainer', 'character-vlog', 'asmr', 'custom')),
  status text not null default 'draft' check (status in ('draft', 'ready', 'processing', 'completed', 'archived')),
  visibility text not null default 'private' check (visibility in ('private', 'community')),
  cover_asset_id uuid references public.assets(id) on delete set null,
  document jsonb not null default '{"version":1,"scenes":[]}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(document) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (
    visibility = 'private'
    or (
      cover_asset_id is not null
      and status in ('ready', 'completed')
      and jsonb_typeof(document -> 'scenes') = 'array'
      and jsonb_array_length(document -> 'scenes') > 0
    )
  )
);

create index if not exists creative_projects_owner_updated_idx
  on public.creative_projects (user_id, updated_at desc, id desc);
create index if not exists creative_projects_community_idx
  on public.creative_projects (kind, visibility, status, created_at desc, id desc)
  where visibility = 'community';

drop trigger if exists creative_projects_touch_updated_at on public.creative_projects;
create trigger creative_projects_touch_updated_at
before update on public.creative_projects
for each row execute function public.touch_updated_at();

create or replace function public.validate_creative_project_cover()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.cover_asset_id is not null and not exists (
    select 1 from public.assets
    where id = new.cover_asset_id and user_id = new.user_id
  ) then
    raise exception 'La portada debe pertenecer al propietario del proyecto';
  end if;
  return new;
end;
$$;

create or replace function public.validate_creative_project_assets()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asset_id text;
begin
  if jsonb_typeof(new.document -> 'scenes') <> 'array' then
    raise exception 'El documento debe incluir un arreglo de escenas';
  end if;

  for v_asset_id in
    select jsonb_array_elements_text(
      jsonb_path_query_array(new.document, '$.scenes[*].shots[*].assetIds[*]')
    )
  loop
    if v_asset_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       or not exists (
         select 1 from public.assets
         where id = v_asset_id::uuid and user_id = new.user_id
       ) then
      raise exception 'Los recursos del storyboard deben pertenecer al propietario';
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists creative_projects_validate_cover on public.creative_projects;
create trigger creative_projects_validate_cover
before insert or update of cover_asset_id, user_id on public.creative_projects
for each row execute function public.validate_creative_project_cover();

drop trigger if exists creative_projects_validate_assets on public.creative_projects;
create trigger creative_projects_validate_assets
before insert or update of document, user_id on public.creative_projects
for each row execute function public.validate_creative_project_assets();

alter table public.creative_projects enable row level security;

grant select, insert, update, delete on public.creative_projects to authenticated;

drop policy if exists "creative_projects_select" on public.creative_projects;
create policy "creative_projects_select"
on public.creative_projects for select
to authenticated
using (
  auth.uid() = user_id
  or (visibility = 'community' and status in ('ready', 'completed'))
);

drop policy if exists "creative_projects_insert_own" on public.creative_projects;
create policy "creative_projects_insert_own"
on public.creative_projects for insert
to authenticated
with check (
  auth.uid() = user_id
  and visibility = 'private'
  and status = 'draft'
);

drop policy if exists "creative_projects_update_own" on public.creative_projects;
create policy "creative_projects_update_own"
on public.creative_projects for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "creative_projects_delete_own" on public.creative_projects;
create policy "creative_projects_delete_own"
on public.creative_projects for delete
to authenticated
using (auth.uid() = user_id);

revoke all on function public.validate_creative_project_cover() from public, anon;
grant execute on function public.validate_creative_project_cover() to authenticated, service_role;
revoke all on function public.validate_creative_project_assets() from public, anon;
grant execute on function public.validate_creative_project_assets() to authenticated, service_role;
-- Bellas Artes - Fase 7: comunidad moderada y Brand Kits persistentes.

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.users(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text check (description is null or char_length(description) <= 2000),
  category text not null check (category in ('marketing-advertising','film-stories','music-video','animation','ugc','anime')),
  status text not null default 'pending' check (status in ('draft','pending','published','rejected','hidden')),
  direct_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(direct_payload) = 'object'),
  author_name_snapshot text not null check (char_length(trim(author_name_snapshot)) between 1 and 120),
  author_avatar_snapshot text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  published_at timestamptz,
  moderated_by uuid references public.users(id) on delete set null,
  moderation_note text check (moderation_note is null or char_length(moderation_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brand_kits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text check (description is null or char_length(description) <= 1000),
  colors jsonb not null default '[]'::jsonb check (jsonb_typeof(colors) = 'array' and jsonb_array_length(colors) <= 12),
  typography jsonb not null default '{"primary":"Inter","weights":["400","600"]}'::jsonb check (jsonb_typeof(typography) = 'object'),
  guidelines text not null default '' check (char_length(guidelines) <= 6000),
  negative_prompt text not null default '' check (char_length(negative_prompt) <= 3000),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brand_kit_assets (
  id uuid primary key default gen_random_uuid(),
  brand_kit_id uuid not null references public.brand_kits(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete restrict,
  kind text not null check (kind in ('logo','reference')),
  sort_order integer not null default 0 check (sort_order between 0 and 99),
  created_at timestamptz not null default now(),
  unique (brand_kit_id, asset_id)
);

create index if not exists community_posts_public_idx on public.community_posts (category, published_at desc, id desc) where status = 'published';
create index if not exists community_posts_moderation_idx on public.community_posts (status, created_at asc, id asc);
create index if not exists community_posts_author_idx on public.community_posts (author_id, created_at desc);
create index if not exists brand_kits_owner_idx on public.brand_kits (user_id, updated_at desc, id desc);
create index if not exists brand_kit_assets_kit_idx on public.brand_kit_assets (brand_kit_id, sort_order, id);

drop trigger if exists community_posts_touch_updated_at on public.community_posts;
create trigger community_posts_touch_updated_at before update on public.community_posts for each row execute function public.touch_updated_at();
drop trigger if exists brand_kits_touch_updated_at on public.brand_kits;
create trigger brand_kits_touch_updated_at before update on public.brand_kits for each row execute function public.touch_updated_at();

create or replace function public.validate_community_post_asset()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.assets
    where id = new.asset_id and user_id = new.author_id and type in ('image','video')
  ) then
    raise exception 'La publicación debe usar una imagen o video del autor';
  end if;
  return new;
end;
$$;

create or replace function public.validate_brand_kit_asset()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  select user_id into v_owner from public.brand_kits where id = new.brand_kit_id;
  if v_owner is null or not exists (
    select 1 from public.assets where id = new.asset_id and user_id = v_owner and type = 'image'
  ) then
    raise exception 'El recurso de marca debe pertenecer al propietario del kit';
  end if;
  if (select count(*) from public.brand_kit_assets where brand_kit_id = new.brand_kit_id and id <> new.id) >= 10 then
    raise exception 'Un Brand Kit admite como máximo 10 recursos';
  end if;
  return new;
end;
$$;

drop trigger if exists community_posts_validate_asset on public.community_posts;
create trigger community_posts_validate_asset before insert or update of asset_id, author_id on public.community_posts for each row execute function public.validate_community_post_asset();
drop trigger if exists brand_kit_assets_validate_asset on public.brand_kit_assets;
create trigger brand_kit_assets_validate_asset before insert or update of asset_id, brand_kit_id on public.brand_kit_assets for each row execute function public.validate_brand_kit_asset();

alter table public.community_posts enable row level security;
alter table public.brand_kits enable row level security;
alter table public.brand_kit_assets enable row level security;

grant select on public.community_posts to anon, authenticated;
grant insert, update, delete on public.community_posts to authenticated;
grant select, insert, update, delete on public.brand_kits to authenticated;
grant select, insert, update, delete on public.brand_kit_assets to authenticated;

drop policy if exists "community_posts_public_or_owner" on public.community_posts;
create policy "community_posts_public_or_owner" on public.community_posts for select to anon, authenticated
using (status = 'published' or auth.uid() = author_id or exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
drop policy if exists "community_posts_insert_own_pending" on public.community_posts;
create policy "community_posts_insert_own_pending" on public.community_posts for insert to authenticated
with check (auth.uid() = author_id and status in ('draft','pending') and moderated_by is null and published_at is null);
drop policy if exists "community_posts_update_own_unpublished" on public.community_posts;
create policy "community_posts_update_own_unpublished" on public.community_posts for update to authenticated
using (auth.uid() = author_id and status in ('draft','pending','rejected'))
with check (auth.uid() = author_id and status in ('draft','pending','rejected') and moderated_by is null and published_at is null);
drop policy if exists "community_posts_delete_own_unpublished" on public.community_posts;
create policy "community_posts_delete_own_unpublished" on public.community_posts for delete to authenticated
using (auth.uid() = author_id and status in ('draft','pending','rejected'));

drop policy if exists "brand_kits_owner_all" on public.brand_kits;
create policy "brand_kits_owner_all" on public.brand_kits for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "brand_kit_assets_owner_all" on public.brand_kit_assets;
create policy "brand_kit_assets_owner_all" on public.brand_kit_assets for all to authenticated
using (exists (select 1 from public.brand_kits where id = brand_kit_id and user_id = auth.uid()))
with check (exists (select 1 from public.brand_kits where id = brand_kit_id and user_id = auth.uid()));

revoke all on function public.validate_community_post_asset() from public, anon;
revoke all on function public.validate_brand_kit_asset() from public, anon;
grant execute on function public.validate_community_post_asset() to authenticated, service_role;
grant execute on function public.validate_brand_kit_asset() to authenticated, service_role;
-- Bellas Artes - Fase 5: Suite de Audio.
-- Esquema aditivo. Los trabajos y movimientos financieros solo se escriben
-- desde código servidor mediante el rol de servicio.

create table if not exists public.audio_voices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  provider text not null,
  provider_voice_id text,
  name text not null,
  language text not null default 'es',
  category text not null default 'general',
  description text,
  preview_asset_id uuid references public.assets(id) on delete set null,
  is_clone boolean not null default false,
  consent_confirmed_at timestamptz,
  consent_evidence jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not is_clone or (user_id is not null and consent_confirmed_at is not null))
);

create table if not exists public.audio_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null check (kind in ('tts', 'voice_changer', 'voice_clone', 'video_mix')),
  provider text not null,
  provider_job_id text,
  idempotency_key text not null,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'ready', 'failed', 'canceled')),
  request jsonb not null default '{}'::jsonb,
  output_asset_id uuid references public.assets(id) on delete set null,
  reserved_credits bigint not null default 0 check (reserved_credits >= 0),
  reservation_transaction_id uuid references public.transactions(id) on delete restrict,
  refund_transaction_id uuid references public.transactions(id) on delete restrict,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  refunded_at timestamptz,
  unique (user_id, idempotency_key)
);

create table if not exists public.audio_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  source_video_asset_id uuid references public.assets(id) on delete set null,
  duration_ms bigint not null default 0 check (duration_ms >= 0),
  preset jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audio_tracks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.audio_projects(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  asset_id uuid references public.assets(id) on delete set null,
  kind text not null check (kind in ('voice', 'music', 'effect', 'ambience')),
  name text not null,
  start_ms bigint not null default 0 check (start_ms >= 0),
  trim_start_ms bigint not null default 0 check (trim_start_ms >= 0),
  duration_ms bigint not null default 0 check (duration_ms >= 0),
  volume numeric(5,2) not null default 1 check (volume >= 0 and volume <= 2),
  speed numeric(5,2) not null default 1 check (speed >= 0.25 and speed <= 4),
  muted boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists audio_jobs_user_created_idx
  on public.audio_jobs (user_id, created_at desc, id desc);
create index if not exists audio_jobs_status_created_idx
  on public.audio_jobs (status, created_at asc);
create index if not exists audio_projects_user_updated_idx
  on public.audio_projects (user_id, updated_at desc);
create index if not exists audio_tracks_project_start_idx
  on public.audio_tracks (project_id, start_ms asc);

drop trigger if exists audio_voices_touch_updated_at on public.audio_voices;
create trigger audio_voices_touch_updated_at before update on public.audio_voices
for each row execute function public.touch_updated_at();
drop trigger if exists audio_jobs_touch_updated_at on public.audio_jobs;
create trigger audio_jobs_touch_updated_at before update on public.audio_jobs
for each row execute function public.touch_updated_at();
drop trigger if exists audio_projects_touch_updated_at on public.audio_projects;
create trigger audio_projects_touch_updated_at before update on public.audio_projects
for each row execute function public.touch_updated_at();
drop trigger if exists audio_tracks_touch_updated_at on public.audio_tracks;
create trigger audio_tracks_touch_updated_at before update on public.audio_tracks
for each row execute function public.touch_updated_at();

create or replace function public.reserve_audio_job_credits(
  p_user_id uuid,
  p_idempotency_key text,
  p_kind text,
  p_provider text,
  p_credits bigint,
  p_request jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.audio_jobs%rowtype;
  v_balance bigint;
  v_role text;
  v_job_id uuid := gen_random_uuid();
  v_transaction_id uuid;
  v_reserved bigint;
begin
  if p_kind not in ('tts', 'voice_changer', 'voice_clone', 'video_mix') then
    raise exception 'Tipo de trabajo de audio inválido';
  end if;
  if length(trim(p_idempotency_key)) < 8 then
    raise exception 'Clave de idempotencia inválida';
  end if;
  if p_credits < 0 then
    raise exception 'La reserva no puede ser negativa';
  end if;

  select role into v_role from public.users where id = p_user_id;
  if not found then raise exception 'Usuario inexistente'; end if;

  insert into public.wallets (user_id, balance) values (p_user_id, 0)
  on conflict (user_id) do nothing;
  select balance into v_balance from public.wallets
  where user_id = p_user_id for update;

  select * into v_job from public.audio_jobs
  where user_id = p_user_id and idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object(
      'success', true,
      'idempotent', true,
      'job_id', v_job.id,
      'status', v_job.status,
      'reserved_credits', v_job.reserved_credits,
      'remaining_credits', v_balance,
      'unlimited', v_role = 'admin'
    );
  end if;

  v_reserved := case when v_role = 'admin' then 0 else p_credits end;
  if v_balance - v_reserved < 0 then raise exception 'Créditos insuficientes'; end if;

  if v_reserved > 0 then
    v_balance := v_balance - v_reserved;
    update public.wallets set balance = v_balance where user_id = p_user_id;
    update public.users set credits = v_balance::integer where id = p_user_id;
    insert into public.transactions (
      user_id, type, credits_granted, credit_delta, balance_after,
      description, metadata, status
    ) values (
      p_user_id, 'generation', (-v_reserved)::integer, -v_reserved, v_balance,
      'Reserva para trabajo de audio',
      jsonb_build_object('audio_job_id', v_job_id, 'kind', p_kind),
      'approved'
    ) returning id into v_transaction_id;
  end if;

  insert into public.audio_jobs (
    id, user_id, kind, provider, idempotency_key, status, request,
    reserved_credits, reservation_transaction_id
  ) values (
    v_job_id, p_user_id, p_kind, p_provider, p_idempotency_key,
    'queued', coalesce(p_request, '{}'::jsonb), v_reserved, v_transaction_id
  ) returning * into v_job;

  return jsonb_build_object(
    'success', true,
    'idempotent', false,
    'job_id', v_job.id,
    'status', v_job.status,
    'reserved_credits', v_reserved,
    'remaining_credits', v_balance,
    'unlimited', v_role = 'admin'
  );
end;
$$;

create or replace function public.refund_audio_job_credits(
  p_job_id uuid,
  p_error_code text default null,
  p_error_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.audio_jobs%rowtype;
  v_balance bigint;
  v_refund_id uuid;
begin
  select * into v_job from public.audio_jobs where id = p_job_id for update;
  if not found then raise exception 'Trabajo de audio inexistente'; end if;

  if v_job.refunded_at is not null then
    return jsonb_build_object('success', true, 'idempotent', true, 'job_id', v_job.id);
  end if;
  if v_job.status = 'ready' then raise exception 'Un trabajo finalizado no puede reembolsarse'; end if;

  insert into public.wallets (user_id, balance) values (v_job.user_id, 0)
  on conflict (user_id) do nothing;
  select balance into v_balance from public.wallets
  where user_id = v_job.user_id for update;

  if v_job.reserved_credits > 0 then
    v_balance := v_balance + v_job.reserved_credits;
    update public.wallets set balance = v_balance where user_id = v_job.user_id;
    update public.users set credits = v_balance::integer where id = v_job.user_id;
    insert into public.transactions (
      user_id, type, credits_granted, credit_delta, balance_after,
      description, metadata, status
    ) values (
      v_job.user_id, 'adjustment', v_job.reserved_credits::integer,
      v_job.reserved_credits, v_balance, 'Reembolso de trabajo de audio',
      jsonb_build_object('audio_job_id', v_job.id), 'approved'
    ) returning id into v_refund_id;
  end if;

  update public.audio_jobs
  set status = 'failed', error_code = p_error_code,
      error_message = p_error_message, refund_transaction_id = v_refund_id,
      refunded_at = now(), completed_at = now()
  where id = v_job.id;

  return jsonb_build_object(
    'success', true, 'idempotent', false, 'job_id', v_job.id,
    'refunded_credits', v_job.reserved_credits, 'remaining_credits', v_balance
  );
end;
$$;

create or replace function public.complete_audio_job(
  p_job_id uuid,
  p_output_asset_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.audio_jobs%rowtype;
begin
  select * into v_job from public.audio_jobs where id = p_job_id for update;
  if not found then raise exception 'Trabajo de audio inexistente'; end if;
  if v_job.refunded_at is not null then raise exception 'El trabajo ya fue reembolsado'; end if;
  if v_job.status = 'ready' then
    return jsonb_build_object('success', true, 'idempotent', true, 'job_id', v_job.id);
  end if;
  if not exists (
    select 1 from public.assets
    where id = p_output_asset_id and user_id = v_job.user_id and type = 'audio'
  ) then raise exception 'Asset de salida inválido'; end if;

  update public.audio_jobs
  set status = 'ready', output_asset_id = p_output_asset_id,
      completed_at = now(), error_code = null, error_message = null
  where id = v_job.id;

  return jsonb_build_object('success', true, 'idempotent', false, 'job_id', v_job.id);
end;
$$;

revoke all on function public.reserve_audio_job_credits(uuid,text,text,text,bigint,jsonb) from public, anon, authenticated;
revoke all on function public.refund_audio_job_credits(uuid,text,text) from public, anon, authenticated;
revoke all on function public.complete_audio_job(uuid,uuid) from public, anon, authenticated;
grant execute on function public.reserve_audio_job_credits(uuid,text,text,text,bigint,jsonb) to service_role;
grant execute on function public.refund_audio_job_credits(uuid,text,text) to service_role;
grant execute on function public.complete_audio_job(uuid,uuid) to service_role;

alter table public.audio_voices enable row level security;
alter table public.audio_jobs enable row level security;
alter table public.audio_projects enable row level security;
alter table public.audio_tracks enable row level security;

grant select on public.audio_voices, public.audio_jobs, public.audio_projects, public.audio_tracks to authenticated;
revoke insert, update, delete on public.audio_voices, public.audio_jobs, public.audio_projects, public.audio_tracks from authenticated;

drop policy if exists "audio_voices_select_available" on public.audio_voices;
create policy "audio_voices_select_available" on public.audio_voices for select
  using (user_id is null or auth.uid() = user_id);
drop policy if exists "audio_jobs_select_own" on public.audio_jobs;
create policy "audio_jobs_select_own" on public.audio_jobs for select
  using (auth.uid() = user_id);
drop policy if exists "audio_projects_select_own" on public.audio_projects;
create policy "audio_projects_select_own" on public.audio_projects for select
  using (auth.uid() = user_id);
drop policy if exists "audio_tracks_select_own" on public.audio_tracks;
create policy "audio_tracks_select_own" on public.audio_tracks for select
  using (auth.uid() = user_id);

-- Bellas Artes: generación real, reservas idempotentes y auditoría de workers.
-- Esta migración es aditiva y usa únicamente las tablas canónicas de Fase 1.

create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null check (kind in ('image', 'video', 'audio', 'character', 'world')),
  operation text,
  public_model text not null,
  backend_model text not null,
  provider_route text not null check (provider_route in ('vast', 'runpod', 'fake')),
  workflow_version text not null,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'failed', 'canceled')),
  request jsonb not null default '{}'::jsonb,
  provider_job_id text,
  idempotency_key text not null,
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  credits_reserved bigint not null default 0 check (credits_reserved >= 0),
  credits_captured bigint not null default 0 check (credits_captured >= 0),
  credits_refunded bigint not null default 0 check (credits_refunded >= 0),
  reservation_transaction_id uuid references public.transactions(id) on delete restrict,
  capture_transaction_id uuid references public.transactions(id) on delete restrict,
  refund_transaction_id uuid references public.transactions(id) on delete restrict,
  error_code text,
  error_message text,
  cancel_requested boolean not null default false,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table if not exists public.generation_job_attempts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.generation_jobs(id) on delete cascade,
  attempt integer not null check (attempt > 0),
  provider_route text not null,
  provider_job_id text,
  status text not null check (status in ('processing', 'completed', 'failed', 'canceled')),
  error_code text,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (job_id, attempt)
);

create table if not exists public.generation_job_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.generation_jobs(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.generation_job_assets (
  job_id uuid not null references public.generation_jobs(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  role text not null default 'output' check (role in ('input', 'reference', 'output')),
  created_at timestamptz not null default now(),
  primary key (job_id, asset_id, role)
);

create index if not exists generation_jobs_user_created_idx
  on public.generation_jobs (user_id, created_at desc, id desc);
create index if not exists generation_jobs_status_created_idx
  on public.generation_jobs (status, created_at asc);
create index if not exists generation_jobs_kind_status_idx
  on public.generation_jobs (kind, status, updated_at desc);
create index if not exists generation_job_attempts_job_idx
  on public.generation_job_attempts (job_id, attempt desc);
create index if not exists generation_job_events_job_idx
  on public.generation_job_events (job_id, created_at desc);

drop trigger if exists generation_jobs_touch_updated_at on public.generation_jobs;
create trigger generation_jobs_touch_updated_at
before update on public.generation_jobs
for each row execute function public.touch_updated_at();

-- El worker de audio antiguo conserva su tabla propia. Estas funciones son la
-- fuente única para los nuevos jobs y no exponen mutaciones al navegador.
create or replace function public.reserve_generation_credits(
  p_user_id uuid,
  p_idempotency_key text,
  p_kind text,
  p_operation text,
  p_public_model text,
  p_backend_model text,
  p_provider_route text,
  p_workflow_version text,
  p_credits bigint,
  p_request jsonb default '{}'::jsonb,
  p_max_attempts integer default 3
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.generation_jobs%rowtype;
  v_job public.generation_jobs%rowtype;
  v_balance bigint;
  v_role text;
  v_reserved bigint;
  v_transaction_id uuid;
begin
  if p_kind not in ('image', 'video', 'audio', 'character', 'world') then
    raise exception 'Tipo de generación inválido';
  end if;
  if p_provider_route not in ('vast', 'runpod', 'fake') then
    raise exception 'Ruta de proveedor inválida';
  end if;
  if length(trim(p_idempotency_key)) < 8 then
    raise exception 'Clave de idempotencia inválida';
  end if;
  if p_credits < 0 then
    raise exception 'La reserva no puede ser negativa';
  end if;
  if p_max_attempts not between 1 and 10 then
    raise exception 'Número de intentos inválido';
  end if;

  select * into v_existing
  from public.generation_jobs
  where user_id = p_user_id and idempotency_key = p_idempotency_key
  for update;
  if found then
    return jsonb_build_object(
      'success', true,
      'idempotent', true,
      'job_id', v_existing.id,
      'status', v_existing.status,
      'reserved_credits', v_existing.credits_reserved,
      'remaining_credits', (select balance from public.wallets where user_id = p_user_id)
    );
  end if;

  select role into v_role from public.users where id = p_user_id;
  if not found then raise exception 'Usuario inexistente'; end if;

  insert into public.wallets (user_id, balance) values (p_user_id, 0)
  on conflict (user_id) do nothing;
  select balance into v_balance from public.wallets
  where user_id = p_user_id for update;

  v_reserved := case when v_role = 'admin' then 0 else p_credits end;
  if v_balance - v_reserved < 0 then raise exception 'Créditos insuficientes'; end if;

  if v_reserved > 0 then
    v_balance := v_balance - v_reserved;
    update public.wallets set balance = v_balance where user_id = p_user_id;
    update public.users set credits = v_balance::integer where id = p_user_id;
    insert into public.transactions (
      user_id, type, credits_granted, credit_delta, balance_after,
      description, metadata, status
    ) values (
      p_user_id, 'generation', (-v_reserved)::integer, -v_reserved, v_balance,
      'Reserva de generación',
      jsonb_build_object('idempotency_key', p_idempotency_key, 'kind', p_kind, 'operation', p_operation),
      'approved'
    ) returning id into v_transaction_id;
  end if;

  insert into public.generation_jobs (
    user_id, kind, operation, public_model, backend_model, provider_route,
    workflow_version, request, idempotency_key, max_attempts,
    credits_reserved, reservation_transaction_id
  ) values (
    p_user_id, p_kind, p_operation, p_public_model, p_backend_model, p_provider_route,
    p_workflow_version, coalesce(p_request, '{}'::jsonb), p_idempotency_key, p_max_attempts,
    v_reserved, v_transaction_id
  ) returning * into v_job;

  return jsonb_build_object(
    'success', true,
    'idempotent', false,
    'job_id', v_job.id,
    'status', v_job.status,
    'reserved_credits', v_job.credits_reserved,
    'remaining_credits', v_balance,
    'unlimited', v_role = 'admin'
  );
exception
  when unique_violation then
    select * into v_existing from public.generation_jobs
    where user_id = p_user_id and idempotency_key = p_idempotency_key;
    if found then
      return jsonb_build_object('success', true, 'idempotent', true,
        'job_id', v_existing.id, 'status', v_existing.status,
        'reserved_credits', v_existing.credits_reserved);
    end if;
    raise;
end;
$$;

create or replace function public.mark_generation_job_processing(
  p_job_id uuid,
  p_provider_job_id text,
  p_provider_route text,
  p_attempt integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_job public.generation_jobs%rowtype;
begin
  select * into v_job from public.generation_jobs where id = p_job_id for update;
  if not found then raise exception 'Job inexistente'; end if;
  if v_job.status in ('completed', 'failed', 'canceled') then
    return jsonb_build_object('success', true, 'idempotent', true, 'status', v_job.status);
  end if;
  update public.generation_jobs
  set status = 'processing', provider_job_id = p_provider_job_id,
      attempts = greatest(attempts, p_attempt), started_at = coalesce(started_at, now())
  where id = p_job_id;
  insert into public.generation_job_attempts (job_id, attempt, provider_route, provider_job_id, status)
  values (p_job_id, p_attempt, p_provider_route, p_provider_job_id, 'processing')
  on conflict (job_id, attempt) do update set provider_job_id = excluded.provider_job_id, status = 'processing';
  insert into public.generation_job_events (job_id, event_type, payload)
  values (p_job_id, 'processing', jsonb_build_object('attempt', p_attempt, 'provider_job_id', p_provider_job_id));
  return jsonb_build_object('success', true, 'status', 'processing');
end;
$$;

create or replace function public.complete_generation_job(
  p_job_id uuid,
  p_output_asset_ids uuid[] default '{}'::uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.generation_jobs%rowtype;
  v_asset_id uuid;
begin
  select * into v_job from public.generation_jobs where id = p_job_id for update;
  if not found then raise exception 'Job inexistente'; end if;
  if v_job.status = 'completed' then
    return jsonb_build_object('success', true, 'idempotent', true, 'status', v_job.status);
  end if;
  if v_job.status in ('failed', 'canceled') then raise exception 'El job ya terminó'; end if;

  foreach v_asset_id in array coalesce(p_output_asset_ids, '{}'::uuid[]) loop
    if not exists (select 1 from public.assets where id = v_asset_id and user_id = v_job.user_id) then
      raise exception 'El asset de salida no pertenece al usuario';
    end if;
    insert into public.generation_job_assets (job_id, asset_id, role)
    values (p_job_id, v_asset_id, 'output')
    on conflict do nothing;
  end loop;

  update public.generation_jobs
  set status = 'completed', credits_captured = credits_reserved,
      completed_at = now(), error_code = null, error_message = null
  where id = p_job_id;
  update public.generation_job_attempts
  set status = 'completed', completed_at = now()
  where job_id = p_job_id and status = 'processing';
  insert into public.generation_job_events (job_id, event_type, payload)
  values (p_job_id, 'completed', jsonb_build_object('output_asset_ids', coalesce(p_output_asset_ids, '{}'::uuid[])));
  return jsonb_build_object('success', true, 'status', 'completed', 'credits_captured', v_job.credits_reserved);
end;
$$;

create or replace function public.refund_generation_credits(
  p_job_id uuid,
  p_error_code text default null,
  p_error_message text default null,
  p_canceled boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.generation_jobs%rowtype;
  v_balance bigint;
  v_refund_id uuid;
  v_status text;
begin
  select * into v_job from public.generation_jobs where id = p_job_id for update;
  if not found then raise exception 'Job inexistente'; end if;
  if v_job.status = 'completed' then raise exception 'Un job finalizado no puede reembolsarse'; end if;
  if v_job.credits_refunded > 0 or v_job.status = 'failed' or v_job.status = 'canceled' then
    return jsonb_build_object('success', true, 'idempotent', true, 'status', v_job.status);
  end if;

  insert into public.wallets (user_id, balance) values (v_job.user_id, 0)
  on conflict (user_id) do nothing;
  select balance into v_balance from public.wallets where user_id = v_job.user_id for update;
  if v_job.credits_reserved > 0 then
    v_balance := v_balance + v_job.credits_reserved;
    update public.wallets set balance = v_balance where user_id = v_job.user_id;
    update public.users set credits = v_balance::integer where id = v_job.user_id;
    insert into public.transactions (
      user_id, type, credits_granted, credit_delta, balance_after,
      description, metadata, status
    ) values (
      v_job.user_id, 'adjustment', v_job.credits_reserved::integer,
      v_job.credits_reserved, v_balance, 'Reembolso de generación',
      jsonb_build_object('generation_job_id', v_job.id, 'error_code', p_error_code), 'approved'
    ) returning id into v_refund_id;
  end if;

  v_status := case when p_canceled then 'canceled' else 'failed' end;
  update public.generation_jobs
  set status = v_status, credits_refunded = credits_reserved,
      refund_transaction_id = v_refund_id, error_code = p_error_code,
      error_message = p_error_message, completed_at = now()
  where id = p_job_id;
  update public.generation_job_attempts
  set status = v_status, completed_at = now(), error_code = p_error_code,
      error_message = p_error_message
  where job_id = p_job_id and status = 'processing';
  insert into public.generation_job_events (job_id, event_type, payload)
  values (p_job_id, v_status, jsonb_build_object('error_code', p_error_code, 'message', p_error_message));
  return jsonb_build_object('success', true, 'status', v_status,
    'refunded_credits', v_job.credits_reserved, 'remaining_credits', v_balance);
end;
$$;

create or replace function public.request_generation_cancellation(p_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_job public.generation_jobs%rowtype;
begin
  select * into v_job from public.generation_jobs where id = p_job_id for update;
  if not found then raise exception 'Job inexistente'; end if;
  if v_job.status in ('completed', 'failed', 'canceled') then
    return jsonb_build_object('success', true, 'status', v_job.status);
  end if;
  update public.generation_jobs set cancel_requested = true where id = p_job_id;
  insert into public.generation_job_events (job_id, event_type) values (p_job_id, 'cancel_requested');
  return jsonb_build_object('success', true, 'status', 'cancel_requested');
end;
$$;

create or replace function public.record_generation_failure(
  p_job_id uuid,
  p_error_code text,
  p_error_message text,
  p_retryable boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.generation_jobs%rowtype;
begin
  select * into v_job from public.generation_jobs where id = p_job_id for update;
  if not found then raise exception 'Job inexistente'; end if;
  if v_job.status in ('completed', 'failed', 'canceled') then
    return jsonb_build_object('success', true, 'idempotent', true, 'status', v_job.status);
  end if;
  update public.generation_jobs
  set error_code = p_error_code, error_message = p_error_message
  where id = p_job_id;
  insert into public.generation_job_events (job_id, event_type, payload)
  values (p_job_id, case when p_retryable then 'retryable_failure' else 'failure' end,
    jsonb_build_object('error_code', p_error_code, 'message', p_error_message));
  return jsonb_build_object('success', true, 'retryable', p_retryable, 'status', v_job.status);
end;
$$;

create or replace function public.retry_generation_job(p_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.generation_jobs%rowtype;
  v_balance bigint;
  v_role text;
  v_reserved bigint;
  v_transaction_id uuid;
begin
  select * into v_job from public.generation_jobs where id = p_job_id for update;
  if not found then raise exception 'Job inexistente'; end if;
  if v_job.status not in ('failed', 'canceled') then raise exception 'El job no puede reintentarse en su estado actual'; end if;

  select role into v_role from public.users where id = v_job.user_id;
  if not found then raise exception 'Usuario inexistente'; end if;
  insert into public.wallets (user_id, balance) values (v_job.user_id, 0) on conflict (user_id) do nothing;
  select balance into v_balance from public.wallets where user_id = v_job.user_id for update;
  v_reserved := case when v_role = 'admin' then 0 else greatest(v_job.credits_reserved, 0) end;
  if v_balance - v_reserved < 0 then raise exception 'Créditos insuficientes'; end if;
  if v_reserved > 0 then
    v_balance := v_balance - v_reserved;
    update public.wallets set balance = v_balance where user_id = v_job.user_id;
    update public.users set credits = v_balance::integer where id = v_job.user_id;
    insert into public.transactions (
      user_id, type, credits_granted, credit_delta, balance_after, description, metadata, status
    ) values (
      v_job.user_id, 'generation', (-v_reserved)::integer, -v_reserved, v_balance,
      'Reserva de reintento de generación', jsonb_build_object('generation_job_id', v_job.id), 'approved'
    ) returning id into v_transaction_id;
  end if;
  update public.generation_jobs
  set status = 'queued', attempts = 0, provider_job_id = null,
      credits_reserved = v_reserved, credits_captured = 0, credits_refunded = 0,
      reservation_transaction_id = v_transaction_id, refund_transaction_id = null,
      error_code = null, error_message = null, cancel_requested = false,
      started_at = null, completed_at = null
  where id = p_job_id;
  insert into public.generation_job_events (job_id, event_type, payload)
  values (p_job_id, 'retry_requested', jsonb_build_object('credits_reserved', v_reserved));
  return jsonb_build_object('success', true, 'status', 'queued', 'reserved_credits', v_reserved);
end;
$$;

alter table public.generation_jobs enable row level security;
alter table public.generation_job_attempts enable row level security;
alter table public.generation_job_events enable row level security;
alter table public.generation_job_assets enable row level security;

grant select on public.generation_jobs to authenticated;
grant select on public.generation_job_attempts to authenticated;
grant select on public.generation_job_events to authenticated;
grant select on public.generation_job_assets to authenticated;
revoke insert, update, delete on public.generation_jobs from anon, authenticated;
revoke insert, update, delete on public.generation_job_attempts from anon, authenticated;
revoke insert, update, delete on public.generation_job_events from anon, authenticated;
revoke insert, update, delete on public.generation_job_assets from anon, authenticated;

drop policy if exists generation_jobs_select_own on public.generation_jobs;
create policy generation_jobs_select_own on public.generation_jobs for select
  using (auth.uid() = user_id);
drop policy if exists generation_job_attempts_select_own on public.generation_job_attempts;
create policy generation_job_attempts_select_own on public.generation_job_attempts for select
  using (exists (select 1 from public.generation_jobs j where j.id = job_id and j.user_id = auth.uid()));
drop policy if exists generation_job_events_select_own on public.generation_job_events;
create policy generation_job_events_select_own on public.generation_job_events for select
  using (exists (select 1 from public.generation_jobs j where j.id = job_id and j.user_id = auth.uid()));
drop policy if exists generation_job_assets_select_own on public.generation_job_assets;
create policy generation_job_assets_select_own on public.generation_job_assets for select
  using (exists (select 1 from public.generation_jobs j where j.id = job_id and j.user_id = auth.uid()));

revoke all on function public.reserve_generation_credits(uuid,text,text,text,text,text,text,text,bigint,jsonb,integer) from public, anon, authenticated;
revoke all on function public.mark_generation_job_processing(uuid,text,text,integer) from public, anon, authenticated;
revoke all on function public.complete_generation_job(uuid,uuid[]) from public, anon, authenticated;
revoke all on function public.refund_generation_credits(uuid,text,text,boolean) from public, anon, authenticated;
revoke all on function public.request_generation_cancellation(uuid) from public, anon, authenticated;
revoke all on function public.record_generation_failure(uuid,text,text,boolean) from public, anon, authenticated;
revoke all on function public.retry_generation_job(uuid) from public, anon, authenticated;
grant execute on function public.reserve_generation_credits(uuid,text,text,text,text,text,text,text,bigint,jsonb,integer) to service_role;
grant execute on function public.mark_generation_job_processing(uuid,text,text,integer) to service_role;
grant execute on function public.complete_generation_job(uuid,uuid[]) to service_role;
grant execute on function public.refund_generation_credits(uuid,text,text,boolean) to service_role;
grant execute on function public.request_generation_cancellation(uuid) to service_role;
grant execute on function public.record_generation_failure(uuid,text,text,boolean) to service_role;
grant execute on function public.retry_generation_job(uuid) to service_role;
