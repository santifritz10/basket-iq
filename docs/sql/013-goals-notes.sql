-- =============================================================================
-- 013 — Objetivos medibles y notas clasificadas (NO destructiva)
-- =============================================================================
-- Qué hace:
--   1. Guarda una "foto" de las notas y objetivos existentes para comprobar
--      después que ningún texto ni estado cambió.
--   2. Agrega a public.player_goals columnas OPCIONALES para objetivos
--      medibles: título, tipo, métrica, valor inicial, meta, unidad, fechas,
--      prioridad, responsable, fuente de datos, muestra mínima y observaciones.
--      Los objetivos de texto existentes quedan exactamente igual (sus
--      columnas nuevas quedan vacías y se siguen mostrando como texto).
--   3. Crea public.player_goal_checkins: mediciones manuales y evidencias de
--      cada objetivo (para objetivos cualitativos o medidos a mano). No se
--      borran: se anulan.
--   4. Agrega a public.player_notes tipo de nota, visibilidad y vínculo
--      opcional con una evaluación, sesión, objetivo o partido.
--      Todas las notas existentes quedan como "Observación general" y
--      visibles para los colaboradores, igual que hoy.
--   5. Ajusta las políticas de player_notes: una nota "privada" solo la ve
--      y la modifica quien la escribió. Las demás siguen como hasta ahora.
--
-- Qué NO hace: no borra ni modifica textos ni estados de notas u objetivos.
-- No toca autenticación, jugadores, sesiones, evaluaciones ni estadísticas.
-- No desactiva RLS. Se puede ejecutar más de una vez.
--
-- Requiere: 001–002 (dominio de jugadores) y 012 (desarrollo del jugador).
--
-- Cómo usarla en Supabase → SQL Editor:
--   PASO A — pegá y corré todo el archivo.
--   PASO B — corré 013-goals-notes-verificacion.sql.
--
-- Reversión: docs/sql/013-goals-notes-rollback.sql (se niega si ya hay
-- objetivos medibles, mediciones o notas clasificadas/privadas).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Foto de control
-- -----------------------------------------------------------------------------
create table if not exists public.goals_notes_migration_snapshot (
  entity        text not null check (entity in ('note', 'goal')),
  id            uuid not null,
  player_id     uuid not null,
  body_md5      text not null,
  status        text,
  taken_at      timestamptz not null default timezone('utc', now()),
  primary key (entity, id)
);
alter table public.goals_notes_migration_snapshot enable row level security;
-- Sin políticas: solo la clave de servicio / SQL Editor la leen.

insert into public.goals_notes_migration_snapshot (entity, id, player_id, body_md5, status)
select 'note', n.id, n.player_id, md5(n.body), null from public.player_notes n
on conflict (entity, id) do nothing;

insert into public.goals_notes_migration_snapshot (entity, id, player_id, body_md5, status)
select 'goal', g.id, g.player_id, md5(g.body), g.status from public.player_goals g
on conflict (entity, id) do nothing;

-- -----------------------------------------------------------------------------
-- 2) Objetivos medibles (columnas opcionales)
-- -----------------------------------------------------------------------------
alter table public.player_goals add column if not exists title            text;
alter table public.player_goals add column if not exists goal_type        text;
alter table public.player_goals add column if not exists metric_key       text;
alter table public.player_goals add column if not exists comparison       text;
alter table public.player_goals add column if not exists baseline_value   numeric(10,2);
alter table public.player_goals add column if not exists target_value     numeric(10,2);
alter table public.player_goals add column if not exists unit             text;
alter table public.player_goals add column if not exists start_on         date;
alter table public.player_goals add column if not exists due_on           date;
alter table public.player_goals add column if not exists priority         text;
alter table public.player_goals add column if not exists responsible_user_id uuid references auth.users(id);
alter table public.player_goals add column if not exists data_source      text;
alter table public.player_goals add column if not exists min_sample       integer;
alter table public.player_goals add column if not exists observations     text;
alter table public.player_goals add column if not exists achieved_at      timestamptz;
alter table public.player_goals add column if not exists achieved_value   numeric(10,2);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'player_goals_goal_type_check') then
    alter table public.player_goals add constraint player_goals_goal_type_check
      check (goal_type is null or goal_type in ('technical','tactical','statistical','volume','consistency','competitive','qualitative'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'player_goals_comparison_check') then
    alter table public.player_goals add constraint player_goals_comparison_check
      check (comparison is null or comparison in ('gte','lte'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'player_goals_priority_check') then
    alter table public.player_goals add constraint player_goals_priority_check
      check (priority is null or priority in ('low','medium','high'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'player_goals_data_source_check') then
    alter table public.player_goals add constraint player_goals_data_source_check
      check (data_source is null or data_source in ('auto','manual'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'player_goals_min_sample_check') then
    alter table public.player_goals add constraint player_goals_min_sample_check
      check (min_sample is null or min_sample between 0 and 100000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'player_goals_dates_check') then
    alter table public.player_goals add constraint player_goals_dates_check
      check (start_on is null or due_on is null or due_on >= start_on);
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 3) Mediciones y evidencias de objetivos
-- -----------------------------------------------------------------------------
create table if not exists public.player_goal_checkins (
  id                  uuid primary key default gen_random_uuid(),
  goal_id             uuid not null references public.player_goals(id) on delete cascade,
  player_id           uuid not null references public.players(id) on delete cascade,
  measured_on         date not null,
  value               numeric(10,2),
  note                text check (note is null or char_length(note) <= 2000),
  created_by_user_id  uuid not null references auth.users(id),
  created_at          timestamptz not null default timezone('utc', now()),
  voided_at           timestamptz,
  voided_by_user_id   uuid references auth.users(id),
  constraint player_goal_checkins_has_content check (value is not null or note is not null)
);
create index if not exists player_goal_checkins_goal_idx on public.player_goal_checkins (goal_id, measured_on);
create index if not exists player_goal_checkins_player_idx on public.player_goal_checkins (player_id);

alter table public.player_goal_checkins enable row level security;

drop policy if exists "player_goal_checkins_select" on public.player_goal_checkins;
create policy "player_goal_checkins_select"
on public.player_goal_checkins for select to authenticated
using (public.has_player_access(player_id, 'viewer'));

drop policy if exists "player_goal_checkins_insert" on public.player_goal_checkins;
create policy "player_goal_checkins_insert"
on public.player_goal_checkins for insert to authenticated
with check (
  public.has_player_access(player_id, 'editor')
  and auth.uid() = created_by_user_id
  and exists (select 1 from public.player_goals g where g.id = goal_id and g.player_id = player_goal_checkins.player_id)
);

drop policy if exists "player_goal_checkins_update" on public.player_goal_checkins;
create policy "player_goal_checkins_update"
on public.player_goal_checkins for update to authenticated
using (public.has_player_access(player_id, 'editor'))
with check (public.has_player_access(player_id, 'editor'));
-- Sin política de delete: las mediciones se anulan (voided_at), no se borran.

-- -----------------------------------------------------------------------------
-- 4) Notas clasificadas
-- -----------------------------------------------------------------------------
alter table public.player_notes add column if not exists note_type   text not null default 'general';
alter table public.player_notes add column if not exists visibility  text not null default 'collaborators';
alter table public.player_notes add column if not exists linked_type text;
alter table public.player_notes add column if not exists linked_id   text;
alter table public.player_notes add column if not exists related_on  date;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'player_notes_note_type_check') then
    alter table public.player_notes add constraint player_notes_note_type_check
      check (note_type in ('technical','tactical','training','match','attitude','goals','general'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'player_notes_visibility_check') then
    alter table public.player_notes add constraint player_notes_visibility_check
      check (visibility in ('collaborators','private'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'player_notes_linked_check') then
    alter table public.player_notes add constraint player_notes_linked_check
      check (
        (linked_type is null and linked_id is null)
        or (linked_type in ('assessment','shooting_session','goal','stat_record') and linked_id is not null)
      );
  end if;
end $$;

create index if not exists player_notes_type_idx on public.player_notes (player_id, note_type);

-- -----------------------------------------------------------------------------
-- 5) Políticas de notas: las privadas solo para su autor
-- -----------------------------------------------------------------------------
drop policy if exists "player_notes_select" on public.player_notes;
create policy "player_notes_select"
on public.player_notes for select to authenticated
using (
  public.has_player_access(player_id, 'viewer')
  and (visibility = 'collaborators' or created_by_user_id = auth.uid())
);

drop policy if exists "player_notes_update" on public.player_notes;
create policy "player_notes_update"
on public.player_notes for update to authenticated
using (
  public.has_player_access(player_id, 'editor')
  and (visibility = 'collaborators' or created_by_user_id = auth.uid())
)
with check (
  public.has_player_access(player_id, 'editor')
  and (visibility = 'collaborators' or created_by_user_id = auth.uid())
);

drop policy if exists "player_notes_delete" on public.player_notes;
create policy "player_notes_delete"
on public.player_notes for delete to authenticated
using (
  public.has_player_access(player_id, 'editor')
  and (visibility = 'collaborators' or created_by_user_id = auth.uid())
);
-- player_notes_insert no cambia (editor y autor = usuario actual).
