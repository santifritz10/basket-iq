-- 012 — verificación (solo lectura). Correr DESPUÉS de 012-player-development.sql.

-- a) Tiene que devolver 0 filas: ningún jugador cambió fundamentos, estadísticas,
--    equipo ni categoría por la migración.
select snap.player_id
from public.player_dev_migration_snapshot snap
left join public.players p on p.id = snap.player_id
where p.id is null
   or md5(coalesce(p.fundamentals, '{}'::jsonb)::text) <> snap.fundamentals_md5
   or md5(coalesce(p.game_stats, '{}'::jsonb)::text) <> snap.game_stats_md5
   or p.team is distinct from snap.team
   or p.category is distinct from snap.category;

-- b) Cuántos jugadores tenían valores del sistema anterior y cuántos se copiaron
--    como registro manual histórico (tienen que coincidir).
select
  (select count(*) from public.players p
     where jsonb_typeof(p.game_stats) = 'object'
       and exists (select 1 from jsonb_each(p.game_stats) k
                   where k.key in ('ft_pct','fg_pct','three_pct','assists','turnovers','rebounds')
                     and jsonb_typeof(k.value) in ('string','number')
                     and btrim(k.value #>> '{}') <> '')) as jugadores_con_valores,
  (select count(*) from public.player_stat_records where origin = 'players.game_stats') as registros_copiados;

-- c) Seguridad activa en las tablas nuevas (todas tienen que decir true).
select c.relname, c.relrowsecurity
from pg_class c
where c.oid in ('public.player_assessments'::regclass, 'public.player_stat_records'::regclass,
                'public.assessment_criteria'::regclass, 'public.teams'::regclass,
                'public.team_players'::regclass)
order by 1;
