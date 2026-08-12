-- Bellas Artes: administración segura de usuarios, roles y acceso de generación.
-- Migración aditiva. No modifica créditos, pagos ni activa generación.

create or replace function public.search_admin_users(
  p_search text default '',
  p_role text default 'all',
  p_plan text default 'all',
  p_access text default 'all',
  p_offset integer default 0,
  p_limit integer default 20
)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  with filtered as (
    select
      u.id,
      u.email,
      u.display_name,
      u.role,
      u.plan_tier,
      u.created_at,
      g.access_level,
      g.allowed_kinds,
      g.enabled as grant_enabled,
      g.expires_at,
      (
        g.user_id is not null
        and g.enabled = true
        and (g.expires_at is null or g.expires_at > now())
      ) as grant_active
    from public.users u
    left join public.generation_access_grants g on g.user_id = u.id
    where
      (
        trim(coalesce(p_search, '')) = ''
        or u.email ilike '%' || trim(p_search) || '%'
        or coalesce(u.display_name, '') ilike '%' || trim(p_search) || '%'
      )
      and (p_role = 'all' or u.role = p_role)
      and (p_plan = 'all' or u.plan_tier = p_plan)
      and (
        p_access = 'all'
        or (p_access = 'active' and g.user_id is not null and g.enabled = true and (g.expires_at is null or g.expires_at > now()))
        or (p_access = 'inactive' and g.user_id is not null and (g.enabled = false or g.expires_at <= now()))
        or (p_access = 'none' and g.user_id is null)
      )
  ), paged as (
    select *
    from filtered
    order by created_at desc, id
    offset greatest(coalesce(p_offset, 0), 0)
    limit least(greatest(coalesce(p_limit, 20), 1), 50)
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'users', coalesce((select jsonb_agg(to_jsonb(paged) order by created_at desc, id) from paged), '[]'::jsonb)
  );
$$;

create or replace function public.set_generation_access_grant(
  p_actor uuid,
  p_user uuid,
  p_access_level text,
  p_allowed_kinds text[],
  p_enabled boolean,
  p_expires_at timestamptz,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role text;
  v_grant public.generation_access_grants%rowtype;
begin
  select role into v_actor_role from public.users where id = p_actor;
  if v_actor_role is distinct from 'admin' then
    raise exception 'Se requieren permisos de administracion';
  end if;
  if not exists (select 1 from public.users where id = p_user) then
    raise exception 'El usuario no existe';
  end if;
  if p_access_level not in ('beta', 'pro', 'b2b', 'service') then
    raise exception 'Nivel de acceso invalido';
  end if;
  if p_allowed_kinds is null
    or cardinality(p_allowed_kinds) = 0
    or not p_allowed_kinds <@ array['image','video','audio','character','world']::text[] then
    raise exception 'Modalidades permitidas invalidas';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 8 then
    raise exception 'El motivo debe tener al menos 8 caracteres';
  end if;

  insert into public.generation_access_grants (
    user_id, access_level, allowed_kinds, enabled, expires_at, created_by
  ) values (
    p_user, p_access_level, array(select distinct unnest(p_allowed_kinds)), p_enabled, p_expires_at, p_actor
  )
  on conflict (user_id) do update set
    access_level = excluded.access_level,
    allowed_kinds = excluded.allowed_kinds,
    enabled = excluded.enabled,
    expires_at = excluded.expires_at,
    updated_at = now()
  returning * into v_grant;

  insert into public.admin_audit_events (
    actor_id, action, target_type, target_id, metadata
  ) values (
    p_actor,
    case when p_enabled then 'user.access_updated' else 'user.access_disabled' end,
    'user',
    p_user::text,
    jsonb_build_object(
      'accessLevel', v_grant.access_level,
      'allowedKinds', v_grant.allowed_kinds,
      'enabled', v_grant.enabled,
      'expiresAt', v_grant.expires_at,
      'reason', left(trim(p_reason), 500)
    )
  );

  return jsonb_build_object(
    'userId', v_grant.user_id,
    'accessLevel', v_grant.access_level,
    'allowedKinds', v_grant.allowed_kinds,
    'enabled', v_grant.enabled,
    'expiresAt', v_grant.expires_at,
    'updatedAt', v_grant.updated_at
  );
end;
$$;

create or replace function public.set_admin_user_role(
  p_actor uuid,
  p_user uuid,
  p_role text,
  p_confirmation text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role text;
  v_previous_role text;
  v_admin_count bigint;
begin
  select role into v_actor_role from public.users where id = p_actor;
  if v_actor_role is distinct from 'admin' then
    raise exception 'Se requieren permisos de administracion';
  end if;
  if p_role not in ('user', 'admin') then
    raise exception 'Rol invalido';
  end if;
  if p_confirmation is distinct from 'CAMBIAR ROL' then
    raise exception 'Confirmacion invalida';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 8 then
    raise exception 'El motivo debe tener al menos 8 caracteres';
  end if;

  select role into v_previous_role
  from public.users
  where id = p_user
  for update;
  if not found then
    raise exception 'El usuario no existe';
  end if;

  if v_previous_role = 'admin' and p_role = 'user' then
    select count(*) into v_admin_count from public.users where role = 'admin';
    if v_admin_count <= 1 then
      raise exception 'No se puede retirar el ultimo administrador';
    end if;
  end if;

  if v_previous_role <> p_role then
    update public.users set role = p_role where id = p_user;
    insert into public.admin_audit_events (
      actor_id, action, target_type, target_id, metadata
    ) values (
      p_actor,
      'user.role_changed',
      'user',
      p_user::text,
      jsonb_build_object(
        'previousRole', v_previous_role,
        'role', p_role,
        'reason', left(trim(p_reason), 500)
      )
    );
  end if;

  return jsonb_build_object(
    'userId', p_user,
    'previousRole', v_previous_role,
    'role', p_role,
    'changed', v_previous_role <> p_role
  );
end;
$$;

revoke all on function public.search_admin_users(text,text,text,text,integer,integer) from public, anon, authenticated;
revoke all on function public.set_generation_access_grant(uuid,uuid,text,text[],boolean,timestamptz,text) from public, anon, authenticated;
revoke all on function public.set_admin_user_role(uuid,uuid,text,text,text) from public, anon, authenticated;

grant execute on function public.search_admin_users(text,text,text,text,integer,integer) to service_role;
grant execute on function public.set_generation_access_grant(uuid,uuid,text,text[],boolean,timestamptz,text) to service_role;
grant execute on function public.set_admin_user_role(uuid,uuid,text,text,text) to service_role;
