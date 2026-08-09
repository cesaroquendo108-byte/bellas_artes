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
