-- Reversión de 010-auth-profiles.sql
-- Parte A (segura): quita el trigger y la función. No toca datos.
drop trigger if exists on_auth_user_created_profile on auth.users;
drop function if exists public.handle_new_user_profile();

-- Parte B (BORRA los datos de onboarding: rol, club y categorías).
-- Ejecutar solo si realmente querés eliminar esas columnas.
-- alter table public.profiles drop constraint if exists profiles_sport_role_check;
-- alter table public.profiles drop constraint if exists profiles_club_length_check;
-- alter table public.profiles drop constraint if exists profiles_categories_size_check;
-- alter table public.profiles drop column if exists onboarding_completed_at;
-- alter table public.profiles drop column if exists categories;
-- alter table public.profiles drop column if exists club;
-- alter table public.profiles drop column if exists sport_role;
