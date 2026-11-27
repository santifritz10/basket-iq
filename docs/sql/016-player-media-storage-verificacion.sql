-- =============================================================================
-- 016 — Verificación (correr después de 016-player-media-storage.sql)
-- =============================================================================
-- Tiene que dar: columnas = 2, bucket_privado = true.
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'players' and column_name in ('photo_path', 'shield_path')) as columnas,
  (select not public from storage.buckets where id = 'player-media') as bucket_privado;
