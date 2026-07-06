-- Basket Lab — Reparar duplicados API y dejar solo jugadores del blob
-- Ejecutar en Supabase SQL Editor.
-- Reemplazá TU_USER_ID por tu uuid (ej. 63e1a8b0-866d-4cb9-b375-dbd740de2655).

-- ---------------------------------------------------------------------------
-- PASO 0 — Ver blob (debe mostrar 4 jugadores)
-- ---------------------------------------------------------------------------
select
  elem.ordinality as pos,
  elem.value->>'id' as legacy_id,
  coalesce(elem.value->>'name', elem.value->>'display_name') as nombre
from public.user_app_data uad
cross join lateral jsonb_array_elements(uad.payload) with ordinality as elem(value, ordinality)
where uad.user_id = 'TU_USER_ID'
  and uad.data_type = 'players_tracking'
order by elem.ordinality;

-- ---------------------------------------------------------------------------
-- PASO 1 — Ver duplicados SQL a archivar (sin legacy_id_map)
-- ---------------------------------------------------------------------------
select p.id, p.display_name, p.created_at
from public.players p
join public.player_members pm on pm.player_id = p.id
where pm.user_id = 'TU_USER_ID'
  and pm.status = 'active'
  and p.status = 'active'
  and not exists (
    select 1
    from public.player_legacy_id_map m
    where m.player_id = p.id
      and m.migrated_from_user_id = pm.user_id
  )
order by p.created_at;

-- ---------------------------------------------------------------------------
-- PASO 2 — Archivar duplicados (no borra datos; status = archived)
-- ---------------------------------------------------------------------------
update public.players p
set
  status = 'archived',
  updated_at = timezone('utc', now())
from public.player_members pm
where pm.player_id = p.id
  and pm.user_id = 'TU_USER_ID'
  and p.status = 'active'
  and not exists (
    select 1
    from public.player_legacy_id_map m
    where m.player_id = p.id
      and m.migrated_from_user_id = pm.user_id
  );

-- ---------------------------------------------------------------------------
-- PASO 3 — Migrar blob → SQL (desde tu máquina, con service role):
--   node scripts/repair-player-duplicates.mjs --user-id=TU_USER_ID
-- O solo migración:
--   node scripts/migrate-player-domain.mjs --user-id=TU_USER_ID
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- PASO 4 — Verificación (debe devolver exactamente 4 filas)
-- ---------------------------------------------------------------------------
select
  p.id,
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
