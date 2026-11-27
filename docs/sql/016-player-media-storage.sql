-- =============================================================================
-- 016 — Fotos y escudos en Supabase Storage (privado)  (NO destructiva)
-- =============================================================================
-- Qué hace:
--   1. Agrega a public.players las columnas opcionales photo_path y shield_path
--      (ruta del archivo en Storage). photo_url y club_shield_url NO se tocan:
--      las imágenes viejas (base64) quedan donde están hasta que se verifique
--      su copia y el entrenador decida liberarlas desde la app.
--   2. Crea el bucket PRIVADO "player-media" (límite 1 MB por archivo, solo
--      imágenes webp/jpeg/png). No se crean políticas para usuarios: solo el
--      servidor de la app lo usa y entrega enlaces firmados que vencen en 1 hora
--      a quien tiene acceso al jugador. Nada queda público.
--
-- Qué NO hace: no borra imágenes, no cambia filas, no desactiva RLS, no hace
-- público ningún archivo. Se puede ejecutar más de una vez.
-- Plan gratuito de Supabase: 1 GB de Storage; una foto de 320 px en webp pesa
-- unos 15–30 KB (≈ 40.000 fotos por GB).
--
-- Cómo usarla en Supabase → SQL Editor:
--   PASO A — pegá y corré todo el archivo.
--   PASO B — corré 016-player-media-storage-verificacion.sql.
--
-- Reversión: docs/sql/016-player-media-storage-rollback.sql (se niega si ya hay
-- archivos o rutas cargadas).
-- =============================================================================

alter table public.players add column if not exists photo_path  text;
alter table public.players add column if not exists shield_path text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'players_media_path_check') then
    alter table public.players add constraint players_media_path_check
      check ((photo_path is null or char_length(photo_path) <= 300) and (shield_path is null or char_length(shield_path) <= 300));
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('player-media', 'player-media', false, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
