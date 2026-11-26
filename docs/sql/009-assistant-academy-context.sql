-- Basket Lab — Asistente IA, etapa 6: contexto de Basket Lab Academy en las conversaciones
-- Ejecutar en Supabase SQL Editor después de 007 y 008.
-- No borra ni modifica datos: solo agrega una columna opcional.
--
-- Guarda qué guía, ejercicio, momento del simulador, categoría y condiciones
-- eligió el entrenador al usar "Analizar con mi Asistente IA", para que las
-- respuestas siguientes de esa conversación mantengan el mismo contexto.
-- Solo guarda identificadores y condiciones, nunca el texto de los contenidos.
-- Sin esta columna el asistente funciona igual, pero las preguntas de seguimiento
-- pierden el contexto de Academy.

alter table public.assistant_conversations
  add column if not exists academy_context jsonb null;

alter table public.assistant_conversations
  drop constraint if exists assistant_conversations_academy_context_size;

alter table public.assistant_conversations
  add constraint assistant_conversations_academy_context_size
  check (academy_context is null or pg_column_size(academy_context) <= 4000);
