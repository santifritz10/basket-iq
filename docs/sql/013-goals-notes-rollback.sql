-- =============================================================================
-- 013 — Reversión. Se niega si ya hay datos que dependan de las columnas nuevas.
-- =============================================================================
do $$
begin
  if exists (select 1 from public.player_goal_checkins)
     or exists (select 1 from public.player_goals where goal_type is not null or metric_key is not null or title is not null)
     or exists (select 1 from public.player_notes where visibility <> 'collaborators' or note_type <> 'general' or linked_type is not null) then
    raise exception 'Hay objetivos medibles, mediciones o notas clasificadas/privadas. No se revierte para no perder datos.';
  end if;

  -- Políticas originales de notas (002).
  drop policy if exists "player_notes_select" on public.player_notes;
  create policy "player_notes_select" on public.player_notes for select to authenticated
    using (public.has_player_access(player_id, 'viewer'));
  drop policy if exists "player_notes_update" on public.player_notes;
  create policy "player_notes_update" on public.player_notes for update to authenticated
    using (public.has_player_access(player_id, 'editor')) with check (public.has_player_access(player_id, 'editor'));
  drop policy if exists "player_notes_delete" on public.player_notes;
  create policy "player_notes_delete" on public.player_notes for delete to authenticated
    using (public.has_player_access(player_id, 'editor'));

  drop table if exists public.player_goal_checkins;
  alter table public.player_notes
    drop column if exists note_type, drop column if exists visibility,
    drop column if exists linked_type, drop column if exists linked_id, drop column if exists related_on;
  alter table public.player_goals
    drop column if exists title, drop column if exists goal_type, drop column if exists metric_key,
    drop column if exists comparison, drop column if exists baseline_value, drop column if exists target_value,
    drop column if exists unit, drop column if exists start_on, drop column if exists due_on,
    drop column if exists priority, drop column if exists responsible_user_id, drop column if exists data_source,
    drop column if exists min_sample, drop column if exists observations, drop column if exists achieved_at,
    drop column if exists achieved_value;
end $$;
