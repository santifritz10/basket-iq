-- =============================================================================
-- 014 — Integración deportiva: rutinas, trabajo planificado y asistencia
--       (NO destructiva)
-- =============================================================================
-- Qué hace:
--   1. Crea public.training_routines: rutinas individuales de cada entrenador
--      (lista de ejercicios propios o de la biblioteca de Basket Lab Academy).
--   2. Crea public.player_plan_items: trabajo PLANIFICADO para un jugador
--      (ejercicio de la biblioteca, rutina, plan de tiro sugerido o tarea
--      propia), con vínculo opcional a un objetivo y a un entrenamiento del
--      planificador. Cuando se realiza, se marca hecho y se puede vincular la
--      sesión de tiro realizada. Lo planificado NUNCA modifica objetivos:
--      el progreso de un objetivo se sigue calculando solo con datos realizados.
--   3. Crea public.player_attendance: participación de cada jugador en los
--      entrenamientos del planificador (presente, ausente, parcial, justificado).
--   4. Activa RLS y crea las políticas.
--
-- Qué NO hace: no modifica el planificador (los entrenamientos siguen donde
-- están; acá solo se guarda su identificador como referencia), ni jugadores,
-- objetivos, sesiones, notas o autenticación. No desactiva RLS.
-- Se puede ejecutar más de una vez.
--
-- Requiere: 001–002, 011 (shooting_sessions) y 012/013.
--
-- Cómo usarla en Supabase → SQL Editor:
--   PASO A — pegá y corré todo el archivo.
--   PASO B — corré 014-player-plan-verificacion.sql.
--
-- Reversión: docs/sql/014-player-plan-rollback.sql (se niega si ya hay datos).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Rutinas
-- -----------------------------------------------------------------------------
create table if not exists public.training_routines (
  id              uuid primary key default gen_random_uuid(),
  owner_user_id   uuid not null references auth.users(id),
  name            text not null check (char_length(name) between 1 and 120),
  description     text check (description is null or char_length(description) <= 2000),
  focus           text check (focus is null or char_length(focus) <= 80),
  items           jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  archived_at     timestamptz,
  created_at      timestamptz not null default timezone('utc', now()),
  updated_at      timestamptz not null default timezone('utc', now())
);
create index if not exists training_routines_owner_idx on public.training_routines (owner_user_id);

alter table public.training_routines enable row level security;

drop policy if exists "training_routines_select" on public.training_routines;
create policy "training_routines_select" on public.training_routines for select to authenticated
  using (owner_user_id = auth.uid());
drop policy if exists "training_routines_insert" on public.training_routines;
create policy "training_routines_insert" on public.training_routines for insert to authenticated
  with check (owner_user_id = auth.uid());
drop policy if exists "training_routines_update" on public.training_routines;
create policy "training_routines_update" on public.training_routines for update to authenticated
  using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
-- Sin delete: las rutinas se archivan.

-- -----------------------------------------------------------------------------
-- 2) Trabajo planificado por jugador
-- -----------------------------------------------------------------------------
create table if not exists public.player_plan_items (
  id                   uuid primary key default gen_random_uuid(),
  player_id            uuid not null references public.players(id) on delete cascade,
  kind                 text not null check (kind in ('exercise','routine','shooting_plan','custom')),
  title                text not null check (char_length(title) between 1 and 160),
  details              text check (details is null or char_length(details) <= 4000),
  content              jsonb not null default '{}'::jsonb,
  routine_id           uuid references public.training_routines(id) on delete set null,
  goal_id              uuid references public.player_goals(id) on delete set null,
  training_ref         text check (training_ref is null or char_length(training_ref) <= 80),
  training_label       text check (training_label is null or char_length(training_label) <= 200),
  planned_on           date,
  status               text not null default 'planned' check (status in ('planned','done','skipped','cancelled')),
  done_on              date,
  shooting_session_id  uuid references public.shooting_sessions(id) on delete set null,
  result_notes         text check (result_notes is null or char_length(result_notes) <= 2000),
  client_item_id       text check (client_item_id is null or char_length(client_item_id) <= 80),
  created_by_user_id   uuid not null references auth.users(id),
  updated_by_user_id   uuid not null references auth.users(id),
  created_at           timestamptz not null default timezone('utc', now()),
  updated_at           timestamptz not null default timezone('utc', now()),
  constraint player_plan_items_done_check check (status <> 'done' or done_on is not null)
);
create index if not exists player_plan_items_player_idx on public.player_plan_items (player_id, planned_on);
create index if not exists player_plan_items_goal_idx on public.player_plan_items (goal_id);
create index if not exists player_plan_items_training_idx on public.player_plan_items (training_ref);
create unique index if not exists player_plan_items_client_uidx
  on public.player_plan_items (player_id, client_item_id) where client_item_id is not null;

alter table public.player_plan_items enable row level security;

drop policy if exists "player_plan_items_select" on public.player_plan_items;
create policy "player_plan_items_select" on public.player_plan_items for select to authenticated
  using (public.has_player_access(player_id, 'viewer'));
drop policy if exists "player_plan_items_insert" on public.player_plan_items;
create policy "player_plan_items_insert" on public.player_plan_items for insert to authenticated
  with check (public.has_player_access(player_id, 'editor') and auth.uid() = created_by_user_id);
drop policy if exists "player_plan_items_update" on public.player_plan_items;
create policy "player_plan_items_update" on public.player_plan_items for update to authenticated
  using (public.has_player_access(player_id, 'editor'))
  with check (public.has_player_access(player_id, 'editor'));
-- Sin delete: lo planificado se cancela (status = 'cancelled').

-- -----------------------------------------------------------------------------
-- 3) Asistencia a entrenamientos del planificador
-- -----------------------------------------------------------------------------
create table if not exists public.player_attendance (
  id                  uuid primary key default gen_random_uuid(),
  player_id           uuid not null references public.players(id) on delete cascade,
  training_ref        text not null check (char_length(training_ref) between 1 and 80),
  training_label      text check (training_label is null or char_length(training_label) <= 200),
  trained_on          date not null,
  status              text not null check (status in ('present','absent','partial','excused')),
  notes               text check (notes is null or char_length(notes) <= 1000),
  created_by_user_id  uuid not null references auth.users(id),
  updated_by_user_id  uuid not null references auth.users(id),
  created_at          timestamptz not null default timezone('utc', now()),
  updated_at          timestamptz not null default timezone('utc', now()),
  constraint player_attendance_unique unique (player_id, training_ref)
);
create index if not exists player_attendance_player_idx on public.player_attendance (player_id, trained_on);

alter table public.player_attendance enable row level security;

drop policy if exists "player_attendance_select" on public.player_attendance;
create policy "player_attendance_select" on public.player_attendance for select to authenticated
  using (public.has_player_access(player_id, 'viewer'));
drop policy if exists "player_attendance_insert" on public.player_attendance;
create policy "player_attendance_insert" on public.player_attendance for insert to authenticated
  with check (public.has_player_access(player_id, 'editor') and auth.uid() = created_by_user_id);
drop policy if exists "player_attendance_update" on public.player_attendance;
create policy "player_attendance_update" on public.player_attendance for update to authenticated
  using (public.has_player_access(player_id, 'editor'))
  with check (public.has_player_access(player_id, 'editor'));
-- Sin delete: se corrige el estado.
