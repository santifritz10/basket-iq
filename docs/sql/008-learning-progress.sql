-- Basket Lab Academy — Etapa 2: favoritos y "retomar lectura" de los contenidos educativos
-- Ejecutar en Supabase SQL Editor (después de los scripts anteriores; no depende de 007).
--
-- Qué hace: agrega 'learning_progress' a los tipos de dato permitidos en
-- public.user_app_data. No borra ni modifica filas existentes: solo reemplaza
-- la restricción CHECK de data_type por otra con la lista ampliada.
--
-- Mientras no se ejecute, la app guarda favoritos y lectura solo en el dispositivo.

begin;

do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'user_app_data'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%data_type%'
  loop
    execute format('alter table public.user_app_data drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.user_app_data
  add constraint user_app_data_data_type_check
  check (data_type in (
    'plays',
    'trainings',
    'annual_plans',
    'shooting_heatmap',
    'players_tracking',
    'learning_progress'
  ));

commit;

-- Verificación: debe listar la restricción con 'learning_progress' incluido.
-- select conname, pg_get_constraintdef(oid)
-- from pg_constraint
-- where conrelid = 'public.user_app_data'::regclass and contype = 'c';
