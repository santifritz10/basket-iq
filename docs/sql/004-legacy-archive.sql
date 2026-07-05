-- Basket Lab — Fase 6: marcar blobs legacy como archivados (opcional)
-- Ejecutar solo después del cutover y migración validada.

-- alter table public.user_app_data
--   add column if not exists legacy_archived_at timestamptz;

-- update public.user_app_data
-- set legacy_archived_at = timezone('utc', now())
-- where data_type in ('players_tracking', 'shooting_heatmap')
--   and legacy_archived_at is null;
