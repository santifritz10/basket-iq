-- =============================================================================
-- 013 — Verificación (correr después de 013-goals-notes.sql)
-- =============================================================================

-- (a) Textos y estados sin cambios: tiene que devolver 0 filas.
select s.entity, s.id
from public.goals_notes_migration_snapshot s
left join public.player_notes n on s.entity = 'note' and n.id = s.id
left join public.player_goals g on s.entity = 'goal' and g.id = s.id
where (s.entity = 'note' and (n.id is null or md5(n.body) <> s.body_md5))
   or (s.entity = 'goal' and (g.id is null or md5(g.body) <> s.body_md5 or g.status is distinct from s.status));

-- (b) Las notas existentes siguen visibles para los colaboradores:
--     notas_privadas_antiguas tiene que ser 0.
select count(*) as notas_privadas_antiguas
from public.player_notes n
join public.goals_notes_migration_snapshot s on s.entity = 'note' and s.id = n.id
where n.visibility <> 'collaborators';

-- (c) RLS activo: rls tiene que ser true en las dos tablas.
select relname as tabla, relrowsecurity as rls
from pg_class
where relname in ('player_goal_checkins', 'player_notes') and relnamespace = 'public'::regnamespace;
