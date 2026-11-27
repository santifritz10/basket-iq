-- =============================================================================
-- Reversión de 011-shooting-lab.sql
-- =============================================================================
-- Quita la tabla shooting_entries y las columnas nuevas de shooting_sessions.
-- Se NIEGA a correr si ya hay registros de Shooting Lab o sesiones creadas con
-- el modo nuevo: en ese caso no borra nada y muestra un error.
-- No toca las zonas históricas, los participantes ni los jugadores.
-- =============================================================================

do $$
declare
  v_entries int := 0;
  v_new_sessions int := 0;
begin
  if to_regclass('public.shooting_entries') is not null then
    execute 'select count(*) from public.shooting_entries' into v_entries;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'shooting_sessions' and column_name = 'recording_mode'
  ) then
    execute 'select count(*) from public.shooting_sessions where recording_mode = ''entries''' into v_new_sessions;
  end if;

  if v_entries > 0 or v_new_sessions > 0 then
    raise exception 'Reversión cancelada: hay % registros y % sesiones de Shooting Lab. No se borró nada.',
      v_entries, v_new_sessions;
  end if;

  drop table if exists public.shooting_entries;

  alter table public.shooting_sessions drop constraint if exists shooting_sessions_status_check;
  alter table public.shooting_sessions drop constraint if exists shooting_sessions_recording_mode_check;
  alter table public.shooting_sessions drop constraint if exists shooting_sessions_notes_length_check;
  drop index if exists public.shooting_sessions_status_idx;
  alter table public.shooting_sessions drop column if exists notes;
  alter table public.shooting_sessions drop column if exists archived_at;
  alter table public.shooting_sessions drop column if exists finished_at;
  alter table public.shooting_sessions drop column if exists recording_mode;
  alter table public.shooting_sessions drop column if exists status;

  -- La foto de control se conserva; borrala a mano si ya no la necesitás:
  -- drop table if exists public.shooting_lab_migration_snapshot;
end $$;
