-- =============================================================================
-- 014 — Reversión. Se niega si ya hay rutinas, trabajo planificado o asistencias.
-- =============================================================================
do $$
begin
  if exists (select 1 from public.player_plan_items)
     or exists (select 1 from public.player_attendance)
     or exists (select 1 from public.training_routines) then
    raise exception 'Ya hay rutinas, trabajo planificado o asistencias cargadas. No se revierte para no perder datos.';
  end if;
  drop table if exists public.player_plan_items;
  drop table if exists public.player_attendance;
  drop table if exists public.training_routines;
end $$;
