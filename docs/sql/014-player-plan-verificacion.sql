-- =============================================================================
-- 014 — Verificación (correr después de 014-player-plan.sql)
-- =============================================================================

-- (a) RLS activo: rls tiene que ser true en las 3 tablas.
select relname as tabla, relrowsecurity as rls
from pg_class
where relname in ('training_routines', 'player_plan_items', 'player_attendance')
  and relnamespace = 'public'::regnamespace;

-- (b) Políticas creadas: tiene que dar 9.
select count(*) as politicas
from pg_policies
where schemaname = 'public'
  and tablename in ('training_routines', 'player_plan_items', 'player_attendance');
