-- =============================================================================
-- 011 — Shooting Lab: registros individuales dentro de sesiones (NO destructiva)
-- =============================================================================
-- Qué hace:
--   1. Guarda una "foto" de las sesiones de tiro actuales (id, participantes y
--      un hash de sus zonas) para poder comprobar después que nada cambió.
--   2. Agrega columnas OPCIONALES a public.shooting_sessions:
--        status          draft | in_progress | completed | archived
--        recording_mode  legacy_zones (histórico agregado) | entries (registros nuevos)
--        finished_at, archived_at, notes
--      Las sesiones existentes quedan como status = completed y
--      recording_mode = legacy_zones. Sus zonas NO se modifican.
--   3. Crea la tabla public.shooting_entries: un registro por lanzamiento o por
--      serie, siempre de un jugador participante de la sesión o marcado
--      explícitamente como colectivo.
--   4. Activa RLS y crea las políticas de la tabla nueva.
--
-- Qué NO hace: no borra, no copia ni reparte tiros históricos, no toca jugadores,
-- miembros, invitaciones, notas, objetivos ni user_app_data. No desactiva RLS.
-- Se puede ejecutar más de una vez sin duplicar nada.
--
-- Cómo usarla en Supabase → SQL Editor:
--   PASO A (opcional) — pegá y corré solo el bloque "VALIDACIÓN PREVIA".
--   PASO B — pegá y corré todo el archivo.
--   PASO C — corré el bloque "VALIDACIÓN POSTERIOR" (al final, comentado).
--
-- Reversión: docs/sql/011-shooting-lab-rollback.sql (se niega a correr si
-- shooting_entries ya tiene registros).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- VALIDACIÓN PREVIA (solo lectura): cuántas sesiones hay y de qué tipo
-- -----------------------------------------------------------------------------
select
  count(*)                                                as sesiones,
  count(*) filter (where p.n = 0)                         as sin_participantes,
  count(*) filter (where p.n = 1)                         as con_un_participante,
  count(*) filter (where p.n >= 2)                        as grupales
from public.shooting_sessions s
cross join lateral (
  select count(*)::int as n
  from public.shooting_session_players ssp
  where ssp.session_id = s.id
) p;

-- -----------------------------------------------------------------------------
-- 1) Foto de control de las sesiones existentes
-- -----------------------------------------------------------------------------
create table if not exists public.shooting_lab_migration_snapshot (
  session_id        uuid primary key references public.shooting_sessions(id) on delete cascade,
  zones_md5         text not null,
  participants      int  not null,
  captured_at       timestamptz not null default timezone('utc', now())
);

alter table public.shooting_lab_migration_snapshot enable row level security;
-- Sin políticas: solo la clave de servicio (o el SQL Editor) la puede leer.

insert into public.shooting_lab_migration_snapshot (session_id, zones_md5, participants)
select
  s.id,
  md5(coalesce(s.zones, '{}'::jsonb)::text),
  (select count(*) from public.shooting_session_players ssp where ssp.session_id = s.id)
from public.shooting_sessions s
on conflict (session_id) do nothing;

-- -----------------------------------------------------------------------------
-- 2) Columnas nuevas en shooting_sessions
-- -----------------------------------------------------------------------------
alter table public.shooting_sessions add column if not exists status text not null default 'completed';
alter table public.shooting_sessions add column if not exists recording_mode text not null default 'legacy_zones';
alter table public.shooting_sessions add column if not exists finished_at timestamptz;
alter table public.shooting_sessions add column if not exists archived_at timestamptz;
alter table public.shooting_sessions add column if not exists notes text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'shooting_sessions_status_check') then
    alter table public.shooting_sessions
      add constraint shooting_sessions_status_check
      check (status in ('draft', 'in_progress', 'completed', 'archived'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'shooting_sessions_recording_mode_check') then
    alter table public.shooting_sessions
      add constraint shooting_sessions_recording_mode_check
      check (recording_mode in ('legacy_zones', 'entries'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'shooting_sessions_notes_length_check') then
    alter table public.shooting_sessions
      add constraint shooting_sessions_notes_length_check
      check (notes is null or char_length(notes) <= 2000);
  end if;
end $$;

create index if not exists shooting_sessions_status_idx
  on public.shooting_sessions (status, fecha desc);

-- -----------------------------------------------------------------------------
-- 3) Registros individuales y series
-- -----------------------------------------------------------------------------
create table if not exists public.shooting_entries (
  id                  uuid primary key default gen_random_uuid(),
  session_id          uuid not null references public.shooting_sessions(id) on delete cascade,
  player_id           uuid references public.players(id) on delete cascade,
  scope               text not null default 'player',
  entry_type          text not null,
  zone_id             text not null,
  tags                text[] not null default '{}',
  attempts            int  not null,
  made                int  not null,
  x_m                 numeric(5, 2),
  y_m                 numeric(5, 2),
  seq                 int,
  recorded_at         timestamptz not null default timezone('utc', now()),
  client_entry_id     uuid not null,
  voided_at           timestamptz,
  voided_by_user_id   uuid references auth.users(id),
  created_by_user_id  uuid not null references auth.users(id),
  created_at          timestamptz not null default timezone('utc', now()),

  constraint shooting_entries_client_unique unique (session_id, client_entry_id),
  -- El jugador tiene que ser participante de la sesión.
  constraint shooting_entries_participant_fk
    foreign key (session_id, player_id)
    references public.shooting_session_players (session_id, player_id),
  constraint shooting_entries_scope_check check (
    (scope = 'player' and player_id is not null)
    or (scope = 'collective' and player_id is null)
  ),
  constraint shooting_entries_type_check check (entry_type in ('shot', 'series')),
  constraint shooting_entries_zone_check check (zone_id in (
    'paint', 'mid_l', 'mid_c', 'mid_r',
    't3_corner_l', 't3_left45', 't3_front', 't3_right45', 't3_corner_r',
    'ft', 'rim'
  )),
  constraint shooting_entries_counts_check check (
    attempts >= 0 and made >= 0 and made <= attempts and attempts <= 1000
  ),
  constraint shooting_entries_shot_check check (
    entry_type <> 'shot' or attempts = 1
  ),
  constraint shooting_entries_series_check check (
    entry_type <> 'series' or (attempts >= 1 and seq is null)
  ),
  constraint shooting_entries_tags_check check (
    tags <@ array[
      'catch', 'off_dribble', 'moving', 'off_screen',
      'contested', 'uncontested', 'right_hand', 'left_hand'
    ]::text[]
    and not (tags @> array['catch', 'off_dribble']::text[])
    and not (tags @> array['contested', 'uncontested']::text[])
    and not (tags @> array['right_hand', 'left_hand']::text[])
  ),
  constraint shooting_entries_coords_check check (
    (x_m is null and y_m is null)
    or (x_m between 0 and 15 and y_m between 0 and 14)
  ),
  constraint shooting_entries_void_check check (
    (voided_at is null and voided_by_user_id is null)
    or (voided_at is not null and voided_by_user_id is not null)
  )
);

create index if not exists shooting_entries_session_idx
  on public.shooting_entries (session_id, recorded_at);
create index if not exists shooting_entries_player_idx
  on public.shooting_entries (player_id, recorded_at desc)
  where voided_at is null;

-- -----------------------------------------------------------------------------
-- 4) RLS de la tabla nueva
--    Registros de un jugador: los ve quien tiene acceso a ESE jugador.
--    Registros colectivos: los ve quien tiene acceso a la sesión.
--    (La app usa la clave de servicio y además verifica permisos en el servidor;
--    estas políticas son la segunda barrera.)
-- -----------------------------------------------------------------------------
alter table public.shooting_entries enable row level security;

drop policy if exists "shooting_entries_select" on public.shooting_entries;
create policy "shooting_entries_select"
on public.shooting_entries for select to authenticated
using (
  (player_id is not null and public.has_player_access(player_id, 'viewer'))
  or (player_id is null and public.can_access_shooting_session(session_id, 'viewer'))
);

drop policy if exists "shooting_entries_insert" on public.shooting_entries;
create policy "shooting_entries_insert"
on public.shooting_entries for insert to authenticated
with check (
  auth.uid() = created_by_user_id
  and (
    (player_id is not null and public.has_player_access(player_id, 'editor'))
    or (player_id is null and public.can_access_shooting_session(session_id, 'editor'))
  )
);

drop policy if exists "shooting_entries_update" on public.shooting_entries;
create policy "shooting_entries_update"
on public.shooting_entries for update to authenticated
using (
  (player_id is not null and public.has_player_access(player_id, 'editor'))
  or (player_id is null and public.can_access_shooting_session(session_id, 'editor'))
)
with check (
  (player_id is not null and public.has_player_access(player_id, 'editor'))
  or (player_id is null and public.can_access_shooting_session(session_id, 'editor'))
);

-- Sin política de DELETE: "deshacer" anula el registro (voided_at) y solo se
-- borran registros al eliminar la sesión completa desde el servidor.

-- Tiempo real (opcional, igual que 003): descomentá si querés ver los tiros de
-- otros colaboradores sin recargar.
-- alter publication supabase_realtime add table public.shooting_entries;

-- =============================================================================
-- VALIDACIÓN POSTERIOR (solo lectura) — corré estas consultas después
-- =============================================================================
-- a) Debe devolver 0 filas: sesiones cuyas zonas cambiaron o que desaparecieron.
-- select snap.session_id
-- from public.shooting_lab_migration_snapshot snap
-- left join public.shooting_sessions s on s.id = snap.session_id
-- where s.id is null
--    or (s.recording_mode = 'legacy_zones'
--        and md5(coalesce(s.zones, '{}'::jsonb)::text) <> snap.zones_md5);
--
-- b) Las sesiones existentes quedaron como históricas completas:
-- select status, recording_mode, count(*)
-- from public.shooting_sessions group by 1, 2 order by 1, 2;
--
-- c) RLS activo en la tabla nueva (debe decir true):
-- select relrowsecurity from pg_class where oid = 'public.shooting_entries'::regclass;
--
-- d) Informe de procedencia del histórico (qué puede y qué no puede atribuirse):
-- select
--   s.id, s.fecha, s.nombre,
--   snap.participants,
--   case
--     when snap.participants = 0 then 'sin participantes'
--     when snap.participants = 1 then 'histórico de un solo participante'
--     else 'grupal histórico sin atribución individual'
--   end as procedencia,
--   (select coalesce(sum(floor(coalesce((z.value->>'attempts')::numeric, 0))), 0)
--      from jsonb_each(coalesce(s.zones, '{}'::jsonb)) z
--      where jsonb_typeof(z.value) = 'object') as intentos
-- from public.shooting_sessions s
-- join public.shooting_lab_migration_snapshot snap on snap.session_id = s.id
-- order by s.fecha desc;
