-- Bellas Artes - guardado atómico de proyectos de audio.
-- La operación se expone sólo al rol de servicio; la API valida la sesión y
-- la propiedad de los assets antes de invocarla.

create or replace function public.save_audio_project(
  p_user_id uuid,
  p_name text,
  p_source_video_asset_id uuid,
  p_duration_ms bigint,
  p_preset jsonb,
  p_tracks jsonb,
  p_project_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
begin
  if p_project_id is null then
    insert into public.audio_projects (
      user_id, name, source_video_asset_id, duration_ms, preset
    ) values (
      p_user_id, p_name, p_source_video_asset_id, p_duration_ms,
      coalesce(p_preset, '{}'::jsonb)
    ) returning id into v_project_id;
  else
    update public.audio_projects
    set name = p_name,
        source_video_asset_id = p_source_video_asset_id,
        duration_ms = p_duration_ms,
        preset = coalesce(p_preset, '{}'::jsonb)
    where id = p_project_id and user_id = p_user_id
    returning id into v_project_id;

    if v_project_id is null then
      raise exception 'PROJECT_NOT_FOUND';
    end if;
  end if;

  delete from public.audio_tracks
  where project_id = v_project_id and user_id = p_user_id;

  insert into public.audio_tracks (
    project_id, user_id, asset_id, kind, name, start_ms, trim_start_ms,
    duration_ms, volume, speed, muted
  )
  select
    v_project_id,
    p_user_id,
    case
      when track->>'assetId' is null or track->>'assetId' = '' then null
      else (track->>'assetId')::uuid
    end,
    track->>'kind',
    track->>'name',
    (track->>'startMs')::bigint,
    (track->>'trimStartMs')::bigint,
    (track->>'durationMs')::bigint,
    (track->>'volume')::numeric,
    (track->>'speed')::numeric,
    (track->>'muted')::boolean
  from jsonb_array_elements(coalesce(p_tracks, '[]'::jsonb)) as track;

  return v_project_id;
end;
$$;

revoke all on function public.save_audio_project(uuid,text,uuid,bigint,jsonb,jsonb,uuid)
  from public, anon, authenticated;
grant execute on function public.save_audio_project(uuid,text,uuid,bigint,jsonb,jsonb,uuid)
  to service_role;
