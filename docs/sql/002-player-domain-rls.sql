-- Basket Lab — Fase 0: dominio jugador (RLS)
-- Ejecutar después de 001-player-domain-schema.sql

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.player_access_level(p_player_id uuid, p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select pm.access_level
  from public.player_members pm
  where pm.player_id = p_player_id
    and pm.user_id = p_user_id
    and pm.status = 'active'
  limit 1;
$$;

create or replace function public.has_player_access(p_player_id uuid, p_min_level text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_level text;
begin
  if auth.uid() is null then
    return false;
  end if;

  v_level := public.player_access_level(p_player_id, auth.uid());
  if v_level is null then
    return false;
  end if;

  return case p_min_level
    when 'viewer' then v_level in ('viewer', 'editor', 'admin')
    when 'editor' then v_level in ('editor', 'admin')
    when 'admin'  then v_level = 'admin'
    else false
  end;
end;
$$;

create or replace function public.can_access_shooting_session(p_session_id uuid, p_min_level text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.shooting_session_players ssp
    where ssp.session_id = p_session_id
      and public.has_player_access(ssp.player_id, p_min_level)
  );
$$;

-- v2 stub: granular permissions fallback to access_level
create or replace function public.has_player_permission(
  p_player_id uuid,
  p_resource text,
  p_action text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return case p_action
    when 'read' then public.has_player_access(p_player_id, 'viewer')
    when 'write', 'delete' then public.has_player_access(p_player_id, 'editor')
    when 'admin' then public.has_player_access(p_player_id, 'admin')
    else false
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------

alter table public.players enable row level security;
alter table public.player_members enable row level security;
alter table public.player_member_permissions enable row level security;
alter table public.player_invitations enable row level security;
alter table public.player_notes enable row level security;
alter table public.player_goals enable row level security;
alter table public.player_evolution_events enable row level security;
alter table public.shooting_sessions enable row level security;
alter table public.shooting_session_players enable row level security;
alter table public.activity_events enable row level security;
alter table public.notifications enable row level security;
alter table public.player_media enable row level security;
alter table public.player_reports enable row level security;
alter table public.player_legacy_id_map enable row level security;
alter table public.player_domain_migrations enable row level security;

-- ---------------------------------------------------------------------------
-- players
-- ---------------------------------------------------------------------------

drop policy if exists "players_select_member" on public.players;
create policy "players_select_member"
on public.players for select to authenticated
using (public.has_player_access(id, 'viewer'));

drop policy if exists "players_insert_authenticated" on public.players;
create policy "players_insert_authenticated"
on public.players for insert to authenticated
with check (auth.uid() = created_by_user_id and auth.uid() = updated_by_user_id);

drop policy if exists "players_update_editor" on public.players;
create policy "players_update_editor"
on public.players for update to authenticated
using (public.has_player_access(id, 'editor'))
with check (public.has_player_access(id, 'editor'));

-- ---------------------------------------------------------------------------
-- player_members
-- ---------------------------------------------------------------------------

drop policy if exists "player_members_select" on public.player_members;
create policy "player_members_select"
on public.player_members for select to authenticated
using (public.has_player_access(player_id, 'viewer'));

drop policy if exists "player_members_insert_admin" on public.player_members;
create policy "player_members_insert_admin"
on public.player_members for insert to authenticated
with check (public.has_player_access(player_id, 'admin'));

drop policy if exists "player_members_update_admin" on public.player_members;
create policy "player_members_update_admin"
on public.player_members for update to authenticated
using (public.has_player_access(player_id, 'admin'))
with check (public.has_player_access(player_id, 'admin'));

drop policy if exists "player_members_delete_admin" on public.player_members;
create policy "player_members_delete_admin"
on public.player_members for delete to authenticated
using (public.has_player_access(player_id, 'admin'));

-- ---------------------------------------------------------------------------
-- player_notes / goals / evolution
-- ---------------------------------------------------------------------------

drop policy if exists "player_notes_select" on public.player_notes;
create policy "player_notes_select"
on public.player_notes for select to authenticated
using (public.has_player_access(player_id, 'viewer'));

drop policy if exists "player_notes_insert" on public.player_notes;
create policy "player_notes_insert"
on public.player_notes for insert to authenticated
with check (
  public.has_player_access(player_id, 'editor')
  and auth.uid() = created_by_user_id
);

drop policy if exists "player_notes_update" on public.player_notes;
create policy "player_notes_update"
on public.player_notes for update to authenticated
using (public.has_player_access(player_id, 'editor'))
with check (public.has_player_access(player_id, 'editor'));

drop policy if exists "player_notes_delete" on public.player_notes;
create policy "player_notes_delete"
on public.player_notes for delete to authenticated
using (public.has_player_access(player_id, 'editor'));

drop policy if exists "player_goals_select" on public.player_goals;
create policy "player_goals_select"
on public.player_goals for select to authenticated
using (public.has_player_access(player_id, 'viewer'));

drop policy if exists "player_goals_insert" on public.player_goals;
create policy "player_goals_insert"
on public.player_goals for insert to authenticated
with check (
  public.has_player_access(player_id, 'editor')
  and auth.uid() = created_by_user_id
);

drop policy if exists "player_goals_update" on public.player_goals;
create policy "player_goals_update"
on public.player_goals for update to authenticated
using (public.has_player_access(player_id, 'editor'))
with check (public.has_player_access(player_id, 'editor'));

drop policy if exists "player_goals_delete" on public.player_goals;
create policy "player_goals_delete"
on public.player_goals for delete to authenticated
using (public.has_player_access(player_id, 'editor'));

drop policy if exists "player_evolution_select" on public.player_evolution_events;
create policy "player_evolution_select"
on public.player_evolution_events for select to authenticated
using (public.has_player_access(player_id, 'viewer'));

drop policy if exists "player_evolution_insert" on public.player_evolution_events;
create policy "player_evolution_insert"
on public.player_evolution_events for insert to authenticated
with check (
  public.has_player_access(player_id, 'editor')
  and auth.uid() = created_by_user_id
);

drop policy if exists "player_evolution_update" on public.player_evolution_events;
create policy "player_evolution_update"
on public.player_evolution_events for update to authenticated
using (public.has_player_access(player_id, 'editor'))
with check (public.has_player_access(player_id, 'editor'));

drop policy if exists "player_evolution_delete" on public.player_evolution_events;
create policy "player_evolution_delete"
on public.player_evolution_events for delete to authenticated
using (public.has_player_access(player_id, 'editor'));

-- ---------------------------------------------------------------------------
-- shooting_sessions + junction
-- ---------------------------------------------------------------------------

drop policy if exists "shooting_sessions_select" on public.shooting_sessions;
create policy "shooting_sessions_select"
on public.shooting_sessions for select to authenticated
using (public.can_access_shooting_session(id, 'viewer'));

drop policy if exists "shooting_sessions_insert" on public.shooting_sessions;
create policy "shooting_sessions_insert"
on public.shooting_sessions for insert to authenticated
with check (auth.uid() = created_by_user_id);

drop policy if exists "shooting_sessions_update" on public.shooting_sessions;
create policy "shooting_sessions_update"
on public.shooting_sessions for update to authenticated
using (public.can_access_shooting_session(id, 'editor'))
with check (public.can_access_shooting_session(id, 'editor'));

drop policy if exists "shooting_sessions_delete" on public.shooting_sessions;
create policy "shooting_sessions_delete"
on public.shooting_sessions for delete to authenticated
using (public.can_access_shooting_session(id, 'editor'));

drop policy if exists "shooting_session_players_select" on public.shooting_session_players;
create policy "shooting_session_players_select"
on public.shooting_session_players for select to authenticated
using (public.has_player_access(player_id, 'viewer'));

drop policy if exists "shooting_session_players_insert" on public.shooting_session_players;
create policy "shooting_session_players_insert"
on public.shooting_session_players for insert to authenticated
with check (public.has_player_access(player_id, 'editor'));

drop policy if exists "shooting_session_players_delete" on public.shooting_session_players;
create policy "shooting_session_players_delete"
on public.shooting_session_players for delete to authenticated
using (public.has_player_access(player_id, 'editor'));

-- ---------------------------------------------------------------------------
-- activity_events
-- ---------------------------------------------------------------------------

drop policy if exists "activity_events_select" on public.activity_events;
create policy "activity_events_select"
on public.activity_events for select to authenticated
using (public.has_player_access(player_id, 'viewer'));

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications for select to authenticated
using (recipient_user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications for update to authenticated
using (recipient_user_id = auth.uid())
with check (recipient_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- player_invitations
-- ---------------------------------------------------------------------------

drop policy if exists "player_invitations_select_admin" on public.player_invitations;
create policy "player_invitations_select_admin"
on public.player_invitations for select to authenticated
using (public.has_player_access(player_id, 'admin'));

drop policy if exists "player_invitations_insert_admin" on public.player_invitations;
create policy "player_invitations_insert_admin"
on public.player_invitations for insert to authenticated
with check (public.has_player_access(player_id, 'admin'));

drop policy if exists "player_invitations_update_admin" on public.player_invitations;
create policy "player_invitations_update_admin"
on public.player_invitations for update to authenticated
using (public.has_player_access(player_id, 'admin'))
with check (public.has_player_access(player_id, 'admin'));

-- ---------------------------------------------------------------------------
-- player_media / player_reports (mismo patrón que notes)
-- ---------------------------------------------------------------------------

drop policy if exists "player_media_select" on public.player_media;
create policy "player_media_select"
on public.player_media for select to authenticated
using (public.has_player_access(player_id, 'viewer'));

drop policy if exists "player_media_insert" on public.player_media;
create policy "player_media_insert"
on public.player_media for insert to authenticated
with check (public.has_player_access(player_id, 'editor') and auth.uid() = created_by_user_id);

drop policy if exists "player_reports_select" on public.player_reports;
create policy "player_reports_select"
on public.player_reports for select to authenticated
using (public.has_player_access(player_id, 'viewer'));

drop policy if exists "player_reports_insert" on public.player_reports;
create policy "player_reports_insert"
on public.player_reports for insert to authenticated
with check (public.has_player_access(player_id, 'editor') and auth.uid() = created_by_user_id);

-- ---------------------------------------------------------------------------
-- migration tables: service-only (no client policies)
-- ---------------------------------------------------------------------------

-- player_legacy_id_map, player_domain_migrations, player_member_permissions:
-- sin policies para authenticated → denegado por RLS; API usa service role.
