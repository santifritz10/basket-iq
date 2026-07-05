-- Basket Lab — Fase 0: dominio jugador (schema)
-- Ejecutar en Supabase SQL Editor (staging primero).
-- Idempotente donde es posible.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- players
-- ---------------------------------------------------------------------------

create table if not exists public.players (
  id                  uuid primary key default gen_random_uuid(),
  display_name        text not null,
  position            text,
  age                 smallint,
  height              text,
  level               text,
  team                text,
  category            text,
  photo_url           text,
  club_shield_url     text,
  fundamentals        jsonb not null default '{}'::jsonb,
  game_stats          jsonb not null default '{}'::jsonb,
  status              text not null default 'active'
                      check (status in ('active', 'archived')),
  created_by_user_id  uuid not null references auth.users(id),
  updated_by_user_id  uuid not null references auth.users(id),
  created_at          timestamptz not null default timezone('utc', now()),
  updated_at          timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_players_updated_at on public.players;
create trigger trg_players_updated_at
before update on public.players
for each row execute function public.set_updated_at();

create index if not exists players_status_idx on public.players (status);

-- ---------------------------------------------------------------------------
-- player_members
-- ---------------------------------------------------------------------------

create table if not exists public.player_members (
  id                  uuid primary key default gen_random_uuid(),
  player_id           uuid not null references public.players(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,
  relationship_type   text not null
                      check (relationship_type in (
                        'player', 'coach', 'assistant', 'parent', 'physio', 'scout'
                      )),
  access_level        text not null
                      check (access_level in ('admin', 'editor', 'viewer')),
  status              text not null default 'active'
                      check (status in ('pending', 'active', 'revoked')),
  invited_by_user_id  uuid references auth.users(id),
  accepted_at         timestamptz,
  created_by_user_id  uuid not null references auth.users(id),
  updated_by_user_id  uuid not null references auth.users(id),
  created_at          timestamptz not null default timezone('utc', now()),
  updated_at          timestamptz not null default timezone('utc', now()),
  unique (player_id, user_id)
);

drop trigger if exists trg_player_members_updated_at on public.player_members;
create trigger trg_player_members_updated_at
before update on public.player_members
for each row execute function public.set_updated_at();

create index if not exists player_members_user_idx on public.player_members (user_id, status);
create index if not exists player_members_player_idx on public.player_members (player_id, status);

-- ---------------------------------------------------------------------------
-- player_member_permissions (v2+, vacía en v1)
-- ---------------------------------------------------------------------------

create table if not exists public.player_member_permissions (
  id                  uuid primary key default gen_random_uuid(),
  player_member_id    uuid not null references public.player_members(id) on delete cascade,
  resource            text not null,
  action              text not null check (action in ('read', 'write', 'delete', 'admin')),
  granted             boolean not null default true,
  created_by_user_id  uuid not null references auth.users(id),
  created_at          timestamptz not null default timezone('utc', now()),
  unique (player_member_id, resource, action)
);

-- ---------------------------------------------------------------------------
-- player_invitations
-- ---------------------------------------------------------------------------

create table if not exists public.player_invitations (
  id                  uuid primary key default gen_random_uuid(),
  player_id           uuid not null references public.players(id) on delete cascade,
  email               text not null,
  relationship_type   text not null
                      check (relationship_type in (
                        'player', 'coach', 'assistant', 'parent', 'physio', 'scout'
                      )),
  access_level        text not null default 'editor'
                      check (access_level in ('admin', 'editor', 'viewer')),
  token_hash          text not null,
  invited_by_user_id  uuid not null references auth.users(id),
  expires_at          timestamptz not null,
  accepted_at         timestamptz,
  status              text not null default 'pending'
                      check (status in ('pending', 'accepted', 'expired', 'revoked')),
  created_at          timestamptz not null default timezone('utc', now())
);

create index if not exists player_invitations_email_idx on public.player_invitations (email, status);

-- ---------------------------------------------------------------------------
-- player_notes, goals, evolution
-- ---------------------------------------------------------------------------

create table if not exists public.player_notes (
  id                  uuid primary key default gen_random_uuid(),
  player_id           uuid not null references public.players(id) on delete cascade,
  body                text not null,
  created_by_user_id  uuid not null references auth.users(id),
  updated_by_user_id  uuid not null references auth.users(id),
  created_at          timestamptz not null default timezone('utc', now()),
  updated_at          timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_player_notes_updated_at on public.player_notes;
create trigger trg_player_notes_updated_at
before update on public.player_notes
for each row execute function public.set_updated_at();

create index if not exists player_notes_player_idx on public.player_notes (player_id, created_at desc);

create table if not exists public.player_goals (
  id                  uuid primary key default gen_random_uuid(),
  player_id           uuid not null references public.players(id) on delete cascade,
  body                text not null,
  status              text not null default 'active'
                      check (status in ('active', 'completed', 'archived')),
  created_by_user_id  uuid not null references auth.users(id),
  updated_by_user_id  uuid not null references auth.users(id),
  created_at          timestamptz not null default timezone('utc', now()),
  updated_at          timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_player_goals_updated_at on public.player_goals;
create trigger trg_player_goals_updated_at
before update on public.player_goals
for each row execute function public.set_updated_at();

create index if not exists player_goals_player_idx on public.player_goals (player_id, created_at desc);

create table if not exists public.player_evolution_events (
  id                  uuid primary key default gen_random_uuid(),
  player_id           uuid not null references public.players(id) on delete cascade,
  message             text not null,
  created_by_user_id  uuid not null references auth.users(id),
  updated_by_user_id  uuid not null references auth.users(id),
  created_at          timestamptz not null default timezone('utc', now()),
  updated_at          timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_player_evolution_updated_at on public.player_evolution_events;
create trigger trg_player_evolution_updated_at
before update on public.player_evolution_events
for each row execute function public.set_updated_at();

create index if not exists player_evolution_player_idx on public.player_evolution_events (player_id, created_at desc);

-- ---------------------------------------------------------------------------
-- shooting_sessions
-- ---------------------------------------------------------------------------

create table if not exists public.shooting_sessions (
  id                  uuid primary key default gen_random_uuid(),
  nombre              text not null default 'Sesión de tiro',
  fecha               date not null default current_date,
  zones               jsonb not null default '{}'::jsonb,
  session_type        text not null default 'individual'
                      check (session_type in ('individual', 'group')),
  created_by_user_id  uuid not null references auth.users(id),
  updated_by_user_id  uuid not null references auth.users(id),
  created_at          timestamptz not null default timezone('utc', now()),
  updated_at          timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_shooting_sessions_updated_at on public.shooting_sessions;
create trigger trg_shooting_sessions_updated_at
before update on public.shooting_sessions
for each row execute function public.set_updated_at();

create table if not exists public.shooting_session_players (
  session_id          uuid not null references public.shooting_sessions(id) on delete cascade,
  player_id           uuid not null references public.players(id) on delete cascade,
  primary key (session_id, player_id)
);

create index if not exists shooting_session_players_player_idx
  on public.shooting_session_players (player_id);

-- ---------------------------------------------------------------------------
-- activity_events
-- ---------------------------------------------------------------------------

create table if not exists public.activity_events (
  id                  uuid primary key default gen_random_uuid(),
  player_id           uuid not null references public.players(id) on delete cascade,
  actor_user_id       uuid not null references auth.users(id),
  event_type          text not null,
  entity_type         text,
  entity_id           uuid,
  summary             text not null,
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default timezone('utc', now())
);

create index if not exists activity_events_player_created_idx
  on public.activity_events (player_id, created_at desc);

-- ---------------------------------------------------------------------------
-- notifications (estructura v1, sin envío)
-- ---------------------------------------------------------------------------

create table if not exists public.notifications (
  id                  uuid primary key default gen_random_uuid(),
  recipient_user_id   uuid not null references auth.users(id) on delete cascade,
  player_id           uuid references public.players(id) on delete cascade,
  type                text not null,
  title               text not null,
  body                text,
  payload             jsonb not null default '{}'::jsonb,
  read_at             timestamptz,
  created_at          timestamptz not null default timezone('utc', now())
);

create index if not exists notifications_recipient_unread_idx
  on public.notifications (recipient_user_id, created_at desc)
  where read_at is null;

-- ---------------------------------------------------------------------------
-- player_media, player_reports (preparadas, sin UI v1)
-- ---------------------------------------------------------------------------

create table if not exists public.player_media (
  id                  uuid primary key default gen_random_uuid(),
  player_id           uuid not null references public.players(id) on delete cascade,
  media_type          text not null check (media_type in ('video', 'image', 'document')),
  title               text,
  url                 text not null,
  metadata            jsonb not null default '{}'::jsonb,
  created_by_user_id  uuid not null references auth.users(id),
  updated_by_user_id  uuid not null references auth.users(id),
  created_at          timestamptz not null default timezone('utc', now()),
  updated_at          timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_player_media_updated_at on public.player_media;
create trigger trg_player_media_updated_at
before update on public.player_media
for each row execute function public.set_updated_at();

create table if not exists public.player_reports (
  id                  uuid primary key default gen_random_uuid(),
  player_id           uuid not null references public.players(id) on delete cascade,
  title               text not null,
  body                text,
  report_type         text,
  metadata            jsonb not null default '{}'::jsonb,
  created_by_user_id  uuid not null references auth.users(id),
  updated_by_user_id  uuid not null references auth.users(id),
  created_at          timestamptz not null default timezone('utc', now()),
  updated_at          timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_player_reports_updated_at on public.player_reports;
create trigger trg_player_reports_updated_at
before update on public.player_reports
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- migración
-- ---------------------------------------------------------------------------

create table if not exists public.player_legacy_id_map (
  legacy_id             text not null,
  player_id             uuid not null references public.players(id) on delete cascade,
  migrated_from_user_id uuid not null references auth.users(id),
  created_at            timestamptz not null default timezone('utc', now()),
  primary key (legacy_id, migrated_from_user_id)
);

create table if not exists public.player_domain_migrations (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  migrated_at     timestamptz not null default timezone('utc', now()),
  players_count   int not null default 0,
  sessions_count  int not null default 0,
  warnings        jsonb not null default '[]'::jsonb
);

create table if not exists public.shooting_session_legacy_id_map (
  legacy_id               text not null,
  session_id              uuid not null references public.shooting_sessions(id) on delete cascade,
  migrated_from_user_id   uuid not null references auth.users(id),
  created_at              timestamptz not null default timezone('utc', now()),
  primary key (legacy_id, migrated_from_user_id)
);
