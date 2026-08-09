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
