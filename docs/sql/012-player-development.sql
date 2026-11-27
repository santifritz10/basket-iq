-- =============================================================================
-- 012 — Perfil y seguimiento: evaluaciones y estadísticas con historial,
--       equipos y categorías (NO destructiva)
-- =============================================================================
-- Qué hace:
--   1. Guarda una "foto" de fundamentos, estadísticas, equipo y categoría de
--      cada jugador para comprobar después que nada cambió.
--   2. Crea public.assessment_criteria: criterios propios de cada entrenador.
--   3. Crea public.player_assessments: cada evaluación con fecha, evaluador,
--      fundamento, criterio, escala, valor, observaciones y contexto.
--      Las estrellas del sistema anterior NO se convierten en evaluaciones:
--      muchas son el valor por defecto (3). El entrenador puede confirmarlas
--      a mano desde la app; recién ahí pasan a ser una evaluación.
--   4. Crea public.player_stat_records: estadísticas de partido, de
--      entrenamiento y registros manuales históricos, sin sobrescribir.
--      Copia los porcentajes cargados en el sistema anterior como un registro
--      "manual histórico" tal como estaban (sin inventar intentos).
--   5. Crea public.teams y public.team_players: equipos de cada entrenador e
--      historial de pertenencia. NO crea equipos automáticamente ni fusiona
--      nombres iguales: los textos originales de equipo y categoría quedan
--      en players y la app propone agrupaciones para confirmar.
--   6. Activa RLS y crea las políticas de todas las tablas nuevas.
--
-- Qué NO hace: no borra ni modifica players.fundamentals, players.game_stats,
-- players.team ni players.category. No toca autenticación, sesiones de tiro,
-- notas, objetivos ni user_app_data. No desactiva RLS.
-- Se puede ejecutar más de una vez sin duplicar nada.
--
-- Cómo usarla en Supabase → SQL Editor:
--   PASO A — pegá y corré todo el archivo.
--   PASO B — corré 012-player-development-verificacion.sql.
--
-- Reversión: docs/sql/012-player-development-rollback.sql (se niega a correr
-- si ya hay evaluaciones, estadísticas nuevas o equipos cargados).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Foto de control
-- -----------------------------------------------------------------------------
create table if not exists public.player_dev_migration_snapshot (
  player_id         uuid primary key references public.players(id) on delete cascade,
  fundamentals_md5  text not null,
  game_stats_md5    text not null,
  team              text,
  category          text,
  captured_at       timestamptz not null default timezone('utc', now())
);

alter table public.player_dev_migration_snapshot enable row level security;
-- Sin políticas: solo la clave de servicio (o el SQL Editor) la puede leer.

insert into public.player_dev_migration_snapshot (player_id, fundamentals_md5, game_stats_md5, team, category)
select
  p.id,
  md5(coalesce(p.fundamentals, '{}'::jsonb)::text),
  md5(coalesce(p.game_stats, '{}'::jsonb)::text),
  p.team,
  p.category
from public.players p
on conflict (player_id) do nothing;

-- -----------------------------------------------------------------------------
-- 2) Criterios propios del entrenador
-- -----------------------------------------------------------------------------
create table if not exists public.assessment_criteria (
  id                  uuid primary key default gen_random_uuid(),
  owner_user_id       uuid not null references auth.users(id) on delete cascade,
  dimension           text not null
                      check (dimension in ('dribbling', 'shooting', 'passing', 'finishing', 'defense',
                                           'off_ball', 'rebounding', 'decision_making', 'tactical_reading',
                                           'communication')),
  label               text not null check (char_length(label) between 1 and 80),
  description         text check (description is null or char_length(description) <= 500),
  scale_max           smallint not null default 5 check (scale_max between 2 and 10),
  level_descriptions  jsonb not null default '{}'::jsonb,
  active              boolean not null default true,
  created_at          timestamptz not null default timezone('utc', now()),
  updated_at          timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_assessment_criteria_updated_at on public.assessment_criteria;
create trigger trg_assessment_criteria_updated_at
before update on public.assessment_criteria
for each row execute function public.set_updated_at();

create index if not exists assessment_criteria_owner_idx on public.assessment_criteria (owner_user_id, active);

alter table public.assessment_criteria enable row level security;

drop policy if exists "assessment_criteria_owner_select" on public.assessment_criteria;
create policy "assessment_criteria_owner_select" on public.assessment_criteria
  for select using (owner_user_id = auth.uid());
drop policy if exists "assessment_criteria_owner_insert" on public.assessment_criteria;
create policy "assessment_criteria_owner_insert" on public.assessment_criteria
  for insert with check (owner_user_id = auth.uid());
drop policy if exists "assessment_criteria_owner_update" on public.assessment_criteria;
create policy "assessment_criteria_owner_update" on public.assessment_criteria
  for update using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 3) Evaluaciones técnicas con historial
--    Una "evaluación" (batch_id) agrupa los criterios evaluados en un mismo
--    momento. Un criterio sin fila = no evaluado (nunca se asume un valor).
-- -----------------------------------------------------------------------------
create table if not exists public.player_assessments (
  id                  uuid primary key default gen_random_uuid(),
  player_id           uuid not null references public.players(id) on delete cascade,
  batch_id            uuid not null,
  assessed_on         date not null,
  evaluator_user_id   uuid not null references auth.users(id),
  dimension           text not null
                      check (dimension in ('dribbling', 'shooting', 'passing', 'finishing', 'defense',
                                           'off_ball', 'rebounding', 'decision_making', 'tactical_reading',
                                           'communication')),
  criterion_key       text not null check (char_length(criterion_key) between 1 and 80),
  criterion_label     text not null check (char_length(criterion_label) between 1 and 80),
  scale_max           smallint not null check (scale_max between 2 and 10),
  value               smallint not null,
  notes               text check (notes is null or char_length(notes) <= 2000),
  context             text not null default 'training'
                      check (context in ('training', 'match', 'test', 'observation', 'other')),
  source              text not null default 'manual'
                      check (source in ('manual', 'legacy_confirmed')),
  voided_at           timestamptz,
  voided_by_user_id   uuid references auth.users(id),
  created_at          timestamptz not null default timezone('utc', now()),
  constraint player_assessments_value_chk check (value between 1 and scale_max),
  constraint player_assessments_batch_criterion_uniq unique (batch_id, criterion_key),
  constraint player_assessments_void_chk check ((voided_at is null) = (voided_by_user_id is null))
);

create index if not exists player_assessments_player_idx on public.player_assessments (player_id, assessed_on desc);

alter table public.player_assessments enable row level security;

drop policy if exists "player_assessments_select" on public.player_assessments;
create policy "player_assessments_select" on public.player_assessments
  for select using (public.has_player_access(player_id, 'viewer'));
drop policy if exists "player_assessments_insert" on public.player_assessments;
create policy "player_assessments_insert" on public.player_assessments
  for insert with check (public.has_player_access(player_id, 'editor') and evaluator_user_id = auth.uid());
drop policy if exists "player_assessments_update" on public.player_assessments;
create policy "player_assessments_update" on public.player_assessments
  for update using (public.has_player_access(player_id, 'editor'))
  with check (public.has_player_access(player_id, 'editor'));
-- Sin DELETE: una evaluación equivocada se anula (voided_at) y queda trazada.

-- -----------------------------------------------------------------------------
-- 4) Estadísticas con historial
--    match = partido, training = entrenamiento, manual_legacy = valor cargado
--    a mano antes (por ejemplo un porcentaje sin intentos): se guarda tal cual.
-- -----------------------------------------------------------------------------
create table if not exists public.player_stat_records (
  id                  uuid primary key default gen_random_uuid(),
  player_id           uuid not null references public.players(id) on delete cascade,
  record_type         text not null check (record_type in ('match', 'training', 'manual_legacy')),
  played_on           date,
  opponent            text check (opponent is null or char_length(opponent) <= 120),
  competition         text check (competition is null or char_length(competition) <= 120),
  season              text check (season is null or char_length(season) <= 40),
  minutes             numeric(5,1) check (minutes is null or (minutes >= 0 and minutes <= 999)),
  points              smallint check (points is null or points >= 0),
  fg2_made            smallint check (fg2_made is null or fg2_made >= 0),
  fg2_att             smallint check (fg2_att is null or fg2_att >= 0),
  fg3_made            smallint check (fg3_made is null or fg3_made >= 0),
  fg3_att             smallint check (fg3_att is null or fg3_att >= 0),
  ft_made             smallint check (ft_made is null or ft_made >= 0),
  ft_att              smallint check (ft_att is null or ft_att >= 0),
  assists             smallint check (assists is null or assists >= 0),
  oreb                smallint check (oreb is null or oreb >= 0),
  dreb                smallint check (dreb is null or dreb >= 0),
  turnovers           smallint check (turnovers is null or turnovers >= 0),
  steals              smallint check (steals is null or steals >= 0),
  blocks              smallint check (blocks is null or blocks >= 0),
  fouls               smallint check (fouls is null or fouls >= 0),
  legacy_values       jsonb not null default '{}'::jsonb,
  origin              text check (origin is null or origin in ('players.game_stats')),
  notes               text check (notes is null or char_length(notes) <= 2000),
  client_record_id    uuid,
  voided_at           timestamptz,
  voided_by_user_id   uuid references auth.users(id),
  created_by_user_id  uuid not null references auth.users(id),
  updated_by_user_id  uuid not null references auth.users(id),
  created_at          timestamptz not null default timezone('utc', now()),
  updated_at          timestamptz not null default timezone('utc', now()),
  constraint player_stat_records_pairs_chk check (
    (fg2_made is null) = (fg2_att is null) and coalesce(fg2_made, 0) <= coalesce(fg2_att, 0)
    and (fg3_made is null) = (fg3_att is null) and coalesce(fg3_made, 0) <= coalesce(fg3_att, 0)
    and (ft_made is null) = (ft_att is null) and coalesce(ft_made, 0) <= coalesce(ft_att, 0)
  ),
  constraint player_stat_records_void_chk check ((voided_at is null) = (voided_by_user_id is null))
);

drop trigger if exists trg_player_stat_records_updated_at on public.player_stat_records;
create trigger trg_player_stat_records_updated_at
before update on public.player_stat_records
for each row execute function public.set_updated_at();

create index if not exists player_stat_records_player_idx on public.player_stat_records (player_id, played_on desc);
create unique index if not exists player_stat_records_client_uniq
  on public.player_stat_records (player_id, client_record_id) where client_record_id is not null;
-- Un solo registro copiado del sistema anterior por jugador (idempotencia).
create unique index if not exists player_stat_records_legacy_origin_uniq
  on public.player_stat_records (player_id) where origin = 'players.game_stats';

alter table public.player_stat_records enable row level security;

drop policy if exists "player_stat_records_select" on public.player_stat_records;
create policy "player_stat_records_select" on public.player_stat_records
  for select using (public.has_player_access(player_id, 'viewer'));
drop policy if exists "player_stat_records_insert" on public.player_stat_records;
create policy "player_stat_records_insert" on public.player_stat_records
  for insert with check (public.has_player_access(player_id, 'editor') and created_by_user_id = auth.uid());
drop policy if exists "player_stat_records_update" on public.player_stat_records;
create policy "player_stat_records_update" on public.player_stat_records
  for update using (public.has_player_access(player_id, 'editor'))
  with check (public.has_player_access(player_id, 'editor'));

-- Copia de los valores cargados en el sistema anterior (solo si hay alguno).
-- Se guardan tal cual en legacy_values: no se inventan intentos ni conversiones.
insert into public.player_stat_records
  (player_id, record_type, played_on, legacy_values, origin, notes, created_by_user_id, updated_by_user_id)
select
  p.id,
  'manual_legacy',
  null,
  (select coalesce(jsonb_object_agg(k.key, k.value), '{}'::jsonb)
     from jsonb_each(p.game_stats) k
     where k.key in ('ft_pct', 'fg_pct', 'three_pct', 'assists', 'turnovers', 'rebounds')
       and jsonb_typeof(k.value) in ('string', 'number')
       and btrim(k.value #>> '{}') <> ''),
  'players.game_stats',
  'Valores cargados en el sistema anterior, sin fecha ni detalle de intentos.',
  p.created_by_user_id,
  p.created_by_user_id
from public.players p
where jsonb_typeof(p.game_stats) = 'object'
  and exists (
    select 1 from jsonb_each(p.game_stats) k
    where k.key in ('ft_pct', 'fg_pct', 'three_pct', 'assists', 'turnovers', 'rebounds')
      and jsonb_typeof(k.value) in ('string', 'number')
      and btrim(k.value #>> '{}') <> ''
  )
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- 5) Equipos y pertenencia con historial
--    Cada equipo es de un entrenador (owner). Nombres iguales de distintos
--    entrenadores son equipos distintos. left_on vacío = pertenece hoy.
-- -----------------------------------------------------------------------------
create table if not exists public.teams (
  id                  uuid primary key default gen_random_uuid(),
  owner_user_id       uuid not null references auth.users(id) on delete cascade,
  name                text not null check (char_length(name) between 1 and 120),
  category            text check (category is null or char_length(category) <= 80),
  season              text check (season is null or char_length(season) <= 40),
  club                text check (club is null or char_length(club) <= 120),
  archived_at         timestamptz,
  created_at          timestamptz not null default timezone('utc', now()),
  updated_at          timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_teams_updated_at on public.teams;
create trigger trg_teams_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

create index if not exists teams_owner_idx on public.teams (owner_user_id);

alter table public.teams enable row level security;

drop policy if exists "teams_owner_select" on public.teams;
create policy "teams_owner_select" on public.teams for select using (owner_user_id = auth.uid());
drop policy if exists "teams_owner_insert" on public.teams;
create policy "teams_owner_insert" on public.teams for insert with check (owner_user_id = auth.uid());
drop policy if exists "teams_owner_update" on public.teams;
create policy "teams_owner_update" on public.teams for update
  using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

create table if not exists public.team_players (
  id                  uuid primary key default gen_random_uuid(),
  team_id             uuid not null references public.teams(id) on delete cascade,
  player_id           uuid not null references public.players(id) on delete cascade,
  joined_on           date not null default current_date,
  left_on             date,
  original_team       text,
  original_category   text,
  created_by_user_id  uuid not null references auth.users(id),
  created_at          timestamptz not null default timezone('utc', now()),
  constraint team_players_dates_chk check (left_on is null or left_on >= joined_on)
);

-- Un jugador no puede estar dos veces "activo" en el mismo equipo.
create unique index if not exists team_players_active_uniq
  on public.team_players (team_id, player_id) where left_on is null;
create index if not exists team_players_player_idx on public.team_players (player_id);

alter table public.team_players enable row level security;

drop policy if exists "team_players_select" on public.team_players;
create policy "team_players_select" on public.team_players for select using (
  public.has_player_access(player_id, 'viewer')
  and exists (select 1 from public.teams t where t.id = team_id and t.owner_user_id = auth.uid())
);
drop policy if exists "team_players_insert" on public.team_players;
create policy "team_players_insert" on public.team_players for insert with check (
  public.has_player_access(player_id, 'editor')
  and created_by_user_id = auth.uid()
  and exists (select 1 from public.teams t where t.id = team_id and t.owner_user_id = auth.uid())
);
drop policy if exists "team_players_update" on public.team_players;
create policy "team_players_update" on public.team_players for update using (
  public.has_player_access(player_id, 'editor')
  and exists (select 1 from public.teams t where t.id = team_id and t.owner_user_id = auth.uid())
);
-- Sin DELETE: cuando un jugador se va, se completa left_on y queda el historial.
