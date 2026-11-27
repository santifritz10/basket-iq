-- =============================================================================
-- 015 — Informes de desarrollo (reutiliza public.player_reports)  (NO destructiva)
-- =============================================================================
-- Qué hace:
--   1. Agrega a public.player_reports columnas opcionales: status (borrador,
--      compartido, archivado), period_from, period_to, shared_at, archived_at.
--      Las filas que ya existan quedan con status NULL, que se trata como
--      "compartido": nadie pierde acceso a lo que ya veía. No se actualiza
--      ninguna fila.
--   2. Reemplaza la política de lectura: un BORRADOR solo lo ve quien lo creó;
--      los compartidos los ve cualquiera con acceso al jugador (como antes).
--   3. Agrega la política de actualización (antes no había): editor del jugador
--      y, si es borrador, solo su autor. Sigue sin haber delete (se archiva).
--
-- Qué NO hace: no borra ni cambia informes existentes, no toca otras tablas,
-- no desactiva RLS. Un informe nunca se comparte solo: lo comparte el
-- entrenador desde la app. Se puede ejecutar más de una vez.
--
-- Requiere: 001–002.
--
-- Cómo usarla en Supabase → SQL Editor:
--   PASO A — pegá y corré todo el archivo.
--   PASO B — corré 015-player-reports-verificacion.sql.
--
-- Reversión: docs/sql/015-player-reports-rollback.sql (se niega si ya hay
-- informes nuevos).
-- =============================================================================

alter table public.player_reports add column if not exists status      text;
alter table public.player_reports add column if not exists period_from date;
alter table public.player_reports add column if not exists period_to   date;
alter table public.player_reports add column if not exists shared_at   timestamptz;
alter table public.player_reports add column if not exists archived_at timestamptz;

-- Solo las filas NUEVAS empiezan como borrador (las existentes quedan en NULL).
alter table public.player_reports alter column status set default 'draft';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'player_reports_status_check') then
    alter table public.player_reports add constraint player_reports_status_check
      check (status is null or status in ('draft', 'shared', 'archived'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'player_reports_period_check') then
    alter table public.player_reports add constraint player_reports_period_check
      check (period_from is null or period_to is null or period_from <= period_to);
  end if;
end $$;

create index if not exists player_reports_player_idx on public.player_reports (player_id, created_at desc);

-- Lectura: borradores solo para su autor.
drop policy if exists "player_reports_select" on public.player_reports;
create policy "player_reports_select" on public.player_reports for select to authenticated
  using (
    public.has_player_access(player_id, 'viewer')
    and (status is distinct from 'draft' or created_by_user_id = auth.uid())
  );

-- Alta: igual que antes (editor y autor = usuario actual).
drop policy if exists "player_reports_insert" on public.player_reports;
create policy "player_reports_insert" on public.player_reports for insert to authenticated
  with check (public.has_player_access(player_id, 'editor') and auth.uid() = created_by_user_id);

-- Edición: editor; un borrador solo lo edita su autor.
drop policy if exists "player_reports_update" on public.player_reports;
create policy "player_reports_update" on public.player_reports for update to authenticated
  using (
    public.has_player_access(player_id, 'editor')
    and (status is distinct from 'draft' or created_by_user_id = auth.uid())
  )
  with check (public.has_player_access(player_id, 'editor'));
-- Sin delete: los informes se archivan.
