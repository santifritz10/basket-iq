-- Basket Lab — Restaurar jugadores activos desde el blob (sin Node)
-- Ejecutar en Supabase → SQL Editor.
-- Reemplazá TU_USER_ID por tu uuid (ej. 63e1a8b0-866d-4cb9-b375-dbd740de2655).
--
-- Cuándo usarlo: archivaste duplicados (PASO 2 de 005) pero NO corriste la migración.
-- El blob sigue con los 4 jugadores; este script los crea de nuevo en tablas relacionales.

do $$
declare
  v_user_id uuid := 'TU_USER_ID';
  v_blob jsonb;
  v_raw jsonb;
  v_legacy_id text;
  v_player_id uuid;
  v_note jsonb;
  v_goal jsonb;
  v_ev jsonb;
  v_note_body text;
  v_goal_body text;
  v_ev_msg text;
  v_goal_status text;
  v_age smallint;
  v_created_new boolean;
begin
  select uad.payload
  into v_blob
  from public.user_app_data uad
  where uad.user_id = v_user_id
    and uad.data_type = 'players_tracking';

  if v_blob is null or jsonb_typeof(v_blob) <> 'array' then
    raise exception 'No hay blob players_tracking para este usuario';
  end if;

  for v_raw in select value from jsonb_array_elements(v_blob) as t(value)
  loop
    v_created_new := false;
    v_legacy_id := coalesce(v_raw->>'id', '');
    if v_legacy_id = '' then
      raise notice 'Saltando jugador sin id legacy';
      continue;
    end if;

    select m.player_id
    into v_player_id
    from public.player_legacy_id_map m
    where m.legacy_id = v_legacy_id
      and m.migrated_from_user_id = v_user_id;

    if v_raw->>'age' is null or trim(v_raw->>'age') = '' then
      v_age := null;
    else
      v_age := (v_raw->>'age')::smallint;
    end if;

    if v_player_id is null then
      v_created_new := true;
      insert into public.players (
        display_name, position, age, height, level, team, category,
        photo_url, club_shield_url, fundamentals, game_stats,
        status, created_by_user_id, updated_by_user_id
      )
      values (
        coalesce(nullif(trim(v_raw->>'name'), ''), nullif(trim(v_raw->>'display_name'), ''), 'Sin nombre'),
        nullif(v_raw->>'position', ''),
        v_age,
        nullif(v_raw->>'height', ''),
        nullif(v_raw->>'level', ''),
        nullif(v_raw->>'team', ''),
        nullif(v_raw->>'category', ''),
        nullif(v_raw->>'photo_url', ''),
        nullif(v_raw->>'club_shield_url', ''),
        coalesce(v_raw->'fundamentals', '{}'::jsonb),
        coalesce(v_raw->'stats', v_raw->'game_stats', '{}'::jsonb),
        'active',
        v_user_id,
        v_user_id
      )
      returning id into v_player_id;

      insert into public.player_legacy_id_map (legacy_id, player_id, migrated_from_user_id)
      values (v_legacy_id, v_player_id, v_user_id)
      on conflict (legacy_id, migrated_from_user_id) do nothing;

      insert into public.player_members (
        player_id, user_id, relationship_type, access_level, status,
        accepted_at, created_by_user_id, updated_by_user_id
      )
      values (
        v_player_id, v_user_id, 'coach', 'editor', 'active',
        timezone('utc', now()), v_user_id, v_user_id
      )
      on conflict (player_id, user_id) do update set
        status = 'active',
        access_level = 'editor',
        updated_by_user_id = v_user_id,
        updated_at = timezone('utc', now());
    else
      update public.players
      set
        display_name = coalesce(nullif(trim(v_raw->>'name'), ''), nullif(trim(v_raw->>'display_name'), ''), display_name),
        position = nullif(v_raw->>'position', ''),
        age = v_age,
        height = nullif(v_raw->>'height', ''),
        level = nullif(v_raw->>'level', ''),
        team = nullif(v_raw->>'team', ''),
        category = nullif(v_raw->>'category', ''),
        photo_url = nullif(v_raw->>'photo_url', ''),
        club_shield_url = nullif(v_raw->>'club_shield_url', ''),
        fundamentals = coalesce(v_raw->'fundamentals', '{}'::jsonb),
        game_stats = coalesce(v_raw->'stats', v_raw->'game_stats', '{}'::jsonb),
        status = 'active',
        updated_by_user_id = v_user_id,
        updated_at = timezone('utc', now())
      where id = v_player_id;
      v_created_new := false;
    end if;

    if v_created_new then
    for v_note in select value from jsonb_array_elements(coalesce(v_raw->'notes_history', '[]'::jsonb)) as t(value)
    loop
      v_note_body := trim(coalesce(v_note->>'text', v_note->>'body', ''));
      if v_note_body = '' then continue; end if;
      insert into public.player_notes (player_id, body, created_by_user_id, updated_by_user_id, created_at)
      values (
        v_player_id,
        v_note_body,
        v_user_id,
        v_user_id,
        coalesce((v_note->>'created_at')::timestamptz, timezone('utc', now()))
      );
    end loop;

    for v_goal in select value from jsonb_array_elements(coalesce(v_raw->'goals', '[]'::jsonb)) as t(value)
    loop
      v_goal_body := trim(coalesce(v_goal->>'text', v_goal->>'body', ''));
      if v_goal_body = '' then continue; end if;
      v_goal_status := lower(coalesce(v_goal->>'status', 'active'));
      if v_goal_status in ('completado', 'completed') then
        v_goal_status := 'completed';
      elsif v_goal_status in ('archivado', 'archived') then
        v_goal_status := 'archived';
      else
        v_goal_status := 'active';
      end if;
      insert into public.player_goals (player_id, body, status, created_by_user_id, updated_by_user_id, created_at)
      values (
        v_player_id,
        v_goal_body,
        v_goal_status,
        v_user_id,
        v_user_id,
        coalesce((v_goal->>'created_at')::timestamptz, timezone('utc', now()))
      );
    end loop;

    for v_ev in select value from jsonb_array_elements(coalesce(v_raw->'evolution', '[]'::jsonb)) as t(value)
    loop
      v_ev_msg := trim(coalesce(v_ev->>'message', v_ev->>'text', ''));
      if v_ev_msg = '' then continue; end if;
      insert into public.player_evolution_events (player_id, message, created_by_user_id, updated_by_user_id, created_at)
      values (
        v_player_id,
        v_ev_msg,
        v_user_id,
        v_user_id,
        coalesce((v_ev->>'created_at')::timestamptz, timezone('utc', now()))
      );
    end loop;
    end if;

    raise notice 'OK legacy_id=% player_id=%', v_legacy_id, v_player_id;
  end loop;

  insert into public.player_domain_migrations (user_id, migrated_at, players_count, sessions_count, warnings)
  values (
    v_user_id,
    timezone('utc', now()),
    (select jsonb_array_length(v_blob)),
    0,
    '[]'::jsonb
  )
  on conflict (user_id) do update set
    migrated_at = timezone('utc', now()),
    players_count = excluded.players_count;
end $$;

-- Verificación: deben ser 4 filas active
select
  p.display_name,
  p.status,
  m.legacy_id
from public.players p
join public.player_members pm on pm.player_id = p.id
left join public.player_legacy_id_map m
  on m.player_id = p.id and m.migrated_from_user_id = pm.user_id
where pm.user_id = 'TU_USER_ID'
  and pm.status = 'active'
  and p.status = 'active'
order by p.display_name;
