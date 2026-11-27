-- =============================================================================
-- 015 — Reversión. Se niega si ya hay informes creados con la versión nueva.
-- Vuelve a la política de lectura original y quita la de edición y las columnas.
-- =============================================================================
do $$
begin
  if exists (select 1 from public.player_reports where status is not null or period_from is not null) then
    raise exception 'Ya hay informes creados con la versión nueva. No se revierte para no perder datos.';
  end if;
  drop policy if exists "player_reports_update" on public.player_reports;
  drop policy if exists "player_reports_select" on public.player_reports;
  create policy "player_reports_select" on public.player_reports for select to authenticated
    using (public.has_player_access(player_id, 'viewer'));
  alter table public.player_reports drop constraint if exists player_reports_status_check;
  alter table public.player_reports drop constraint if exists player_reports_period_check;
  alter table public.player_reports drop column if exists status;
  alter table public.player_reports drop column if exists period_from;
  alter table public.player_reports drop column if exists period_to;
  alter table public.player_reports drop column if exists shared_at;
  alter table public.player_reports drop column if exists archived_at;
  drop index if exists public.player_reports_player_idx;
end $$;
