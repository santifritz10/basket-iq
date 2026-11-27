-- 012 — reversión. Solo si todavía no se cargó nada nuevo.
-- Se niega a correr si hay evaluaciones, estadísticas nuevas (no copiadas del
-- sistema anterior), criterios propios o equipos. Conserva la foto de control.
do $$
begin
  if exists (select 1 from public.player_assessments)
     or exists (select 1 from public.player_stat_records where origin is distinct from 'players.game_stats')
     or exists (select 1 from public.assessment_criteria)
     or exists (select 1 from public.teams) then
    raise exception 'Hay datos cargados con la versión nueva: no se revierte para no perderlos.';
  end if;

  drop table if exists public.team_players;
  drop table if exists public.teams;
  drop table if exists public.player_stat_records;
  drop table if exists public.player_assessments;
  drop table if exists public.assessment_criteria;
end $$;
