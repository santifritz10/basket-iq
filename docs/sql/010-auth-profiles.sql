-- =============================================================================
-- 010 — Perfiles para la autenticación nueva (NO destructiva)
-- =============================================================================
-- Qué hace:
--   1. Agrega columnas OPCIONALES de onboarding a public.profiles
--      (rol deportivo, club, categorías, fecha de onboarding).
--      No borra ni modifica columnas o filas existentes.
--   2. Crea un trigger que genera el perfil automáticamente cuando se registra
--      un usuario nuevo en auth.users. Si el perfil ya existe, no hace nada.
--      Si algo falla, el registro del usuario NO se bloquea.
--   3. (Opcional, comentado) crea perfiles faltantes para usuarios existentes.
--
-- Qué NO hace: no toca contraseñas, ids, usuarios, conversaciones, jugadas,
-- planificaciones ni equipos. No desactiva RLS.
--
-- El "rol deportivo" es solo informativo: no otorga permisos en la app.
-- Reversión: docs/sql/010-auth-profiles-rollback.sql
-- =============================================================================

-- 1) Columnas opcionales -------------------------------------------------------
alter table public.profiles add column if not exists sport_role text;
alter table public.profiles add column if not exists club text;
alter table public.profiles add column if not exists categories text[] not null default '{}';
alter table public.profiles add column if not exists onboarding_completed_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_sport_role_check') then
    alter table public.profiles
      add constraint profiles_sport_role_check
      check (sport_role is null or sport_role in ('entrenador', 'ayudante', 'jugador', 'coordinador'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_club_length_check') then
    alter table public.profiles
      add constraint profiles_club_length_check check (club is null or char_length(club) <= 120);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_categories_size_check') then
    alter table public.profiles
      add constraint profiles_categories_size_check check (cardinality(categories) <= 12);
  end if;
end $$;

-- 2) Perfil automático al registrarse ---------------------------------------------
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  final_username text;
  display_name text;
begin
  if exists (select 1 from public.profiles where id = new.id) then
    return new;
  end if;

  base_username := lower(regexp_replace(split_part(coalesce(new.email, ''), '@', 1), '[^a-zA-Z0-9_]+', '_', 'g'));
  base_username := trim(both '_' from left(base_username, 24));
  if char_length(base_username) < 2 then
    base_username := 'usuario';
  end if;

  final_username := base_username;
  if exists (select 1 from public.profiles where username = final_username) then
    final_username := base_username || '_' || left(replace(new.id::text, '-', ''), 6);
  end if;

  display_name := left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
                                nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
                                final_username), 80);

  insert into public.profiles (id, username, full_name)
  values (new.id, final_username, display_name)
  on conflict do nothing;

  return new;
exception when others then
  -- Nunca bloquear el registro por un problema del perfil: la app lo crea
  -- igual en el primer inicio de sesión.
  raise warning 'handle_new_user_profile: %', sqlerrm;
  return new;
end;
$$;

revoke all on function public.handle_new_user_profile() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

-- 3) OPCIONAL: perfiles faltantes para usuarios existentes ------------------------
-- Solo inserta filas que no existen; no modifica perfiles actuales.
-- Para revisarlo antes, ejecutá primero solo el SELECT:
--
--   select u.id, u.email from auth.users u
--   left join public.profiles p on p.id = u.id
--   where p.id is null;
--
-- y si está bien, descomentá y ejecutá:
--
-- insert into public.profiles (id, username, full_name)
-- select u.id,
--        lower(regexp_replace(split_part(u.email, '@', 1), '[^a-zA-Z0-9_]+', '_', 'g')) || '_' || left(replace(u.id::text, '-', ''), 6),
--        left(coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), split_part(u.email, '@', 1)), 80)
-- from auth.users u
-- left join public.profiles p on p.id = u.id
-- where p.id is null
-- on conflict do nothing;
