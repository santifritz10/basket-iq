-- =============================================================================
-- 015 — Verificación (correr después de 015-player-reports.sql)
-- =============================================================================

-- (a) Columnas nuevas: tiene que dar 5.
select count(*) as columnas
from information_schema.columns
where table_schema = 'public' and table_name = 'player_reports'
  and column_name in ('status', 'period_from', 'period_to', 'shared_at', 'archived_at');

-- (b) RLS activo y políticas: rls = true y politicas = 3 (select, insert, update).
select
  (select relrowsecurity from pg_class where relname = 'player_reports' and relnamespace = 'public'::regnamespace) as rls,
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'player_reports') as politicas;
