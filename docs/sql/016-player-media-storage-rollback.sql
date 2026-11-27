-- =============================================================================
-- 016 — Reversión. Se niega si ya hay rutas o archivos cargados.
-- =============================================================================
do $$
begin
  if exists (select 1 from public.players where photo_path is not null or shield_path is not null)
     or exists (select 1 from storage.objects where bucket_id = 'player-media') then
    raise exception 'Ya hay fotos o escudos en Storage. No se revierte para no perder datos.';
  end if;
  delete from storage.buckets where id = 'player-media';
  alter table public.players drop constraint if exists players_media_path_check;
  alter table public.players drop column if exists photo_path;
  alter table public.players drop column if exists shield_path;
end $$;
