-- Basket Lab — Asistente IA, etapa 1: historial persistente de conversaciones
-- Ejecutar en Supabase SQL Editor después de los scripts 001–006.
-- No modifica ni borra tablas existentes: solo crea tablas nuevas.
--
-- El servidor accede con la service role y filtra siempre por user_id.
-- RLS queda activado igual, como segunda barrera si algún día se lee
-- desde el navegador con la clave anónima.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Conversaciones
-- ---------------------------------------------------------------------------

create table if not exists public.assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Proyecto asociado (etapa 2). La clave foránea se agrega cuando exista la tabla de proyectos.
  project_id uuid null,
  title text not null default 'Nueva conversación'
    check (char_length(btrim(title)) between 1 and 120),
  title_source text not null default 'auto'
    check (title_source in ('auto', 'user')),
  mode text not null default 'tecnico'
    check (char_length(mode) between 1 and 40),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_message_at timestamptz not null default timezone('utc', now()),
  -- Permite que los mensajes referencien (id, user_id) y no puedan quedar
  -- asociados a una conversación de otro usuario.
  unique (id, user_id)
);

create index if not exists assistant_conversations_user_activity_idx
  on public.assistant_conversations (user_id, last_message_at desc);

create index if not exists assistant_conversations_user_project_idx
  on public.assistant_conversations (user_id, project_id, last_message_at desc);

create or replace function public.set_assistant_conversations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_assistant_conversations_updated_at on public.assistant_conversations;
create trigger trg_assistant_conversations_updated_at
before update on public.assistant_conversations
for each row
execute function public.set_assistant_conversations_updated_at();

-- ---------------------------------------------------------------------------
-- Mensajes
-- ---------------------------------------------------------------------------

create table if not exists public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  -- Orden estable dentro de la conversación, aunque dos mensajes tengan la misma hora.
  seq bigint generated always as identity,
  conversation_id uuid not null,
  user_id uuid not null,
  role text not null check (role in ('user', 'model')),
  content text not null check (char_length(content) between 1 and 60000),
  mode text null check (mode is null or char_length(mode) between 1 and 40),
  truncated boolean not null default false,
  model text null check (model is null or char_length(model) <= 80),
  created_at timestamptz not null default timezone('utc', clock_timestamp()),
  foreign key (conversation_id, user_id)
    references public.assistant_conversations (id, user_id)
    on delete cascade
);

create index if not exists assistant_messages_conversation_seq_idx
  on public.assistant_messages (conversation_id, seq);

create index if not exists assistant_messages_user_idx
  on public.assistant_messages (user_id);

-- ---------------------------------------------------------------------------
-- RLS: cada entrenador ve y modifica solo lo suyo
-- ---------------------------------------------------------------------------

alter table public.assistant_conversations enable row level security;
alter table public.assistant_messages enable row level security;

drop policy if exists "assistant_conversations_select_own" on public.assistant_conversations;
create policy "assistant_conversations_select_own"
on public.assistant_conversations for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "assistant_conversations_insert_own" on public.assistant_conversations;
create policy "assistant_conversations_insert_own"
on public.assistant_conversations for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "assistant_conversations_update_own" on public.assistant_conversations;
create policy "assistant_conversations_update_own"
on public.assistant_conversations for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "assistant_conversations_delete_own" on public.assistant_conversations;
create policy "assistant_conversations_delete_own"
on public.assistant_conversations for delete to authenticated
using (auth.uid() = user_id);

drop policy if exists "assistant_messages_select_own" on public.assistant_messages;
create policy "assistant_messages_select_own"
on public.assistant_messages for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "assistant_messages_insert_own" on public.assistant_messages;
create policy "assistant_messages_insert_own"
on public.assistant_messages for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "assistant_messages_delete_own" on public.assistant_messages;
create policy "assistant_messages_delete_own"
on public.assistant_messages for delete to authenticated
using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Verificación rápida
-- ---------------------------------------------------------------------------
-- select tablename from pg_tables
-- where schemaname = 'public' and tablename like 'assistant_%';
