# SQL — Dominio jugador (Fase 0)

Ejecutar en **Supabase SQL Editor** en este orden:

1. `001-player-domain-schema.sql` — tablas, índices, triggers
2. `002-player-domain-rls.sql` — funciones helper y políticas RLS
3. `003-player-domain-realtime.sql` — checklist Realtime (dashboard o SQL)
4. `004-legacy-archive.sql` — *(opcional, post-cutover)* marcar blobs archivados

## Asistente IA

- `007-assistant-conversations.sql` — historial persistente de conversaciones del asistente
  (tablas `assistant_conversations` y `assistant_messages`, con RLS). Solo crea tablas nuevas.
  Mientras no se ejecute, `/assistant` sigue funcionando pero sin guardar los chats.
- `009-assistant-academy-context.sql` — agrega la columna opcional `academy_context` a
  `assistant_conversations` para que "Analizar con mi Asistente IA" mantenga el contexto de la guía
  en las preguntas de seguimiento. Solo agrega una columna; no toca datos. Sin ella, la primera
  respuesta usa el contexto igual, pero las siguientes ya no.

## Basket Lab Academy

- `008-learning-progress.sql` — permite guardar en `user_app_data` el tipo `learning_progress`
  (favoritos y punto de lectura de los contenidos educativos). Solo amplía la restricción CHECK
  de `data_type`; no toca datos. Mientras no se ejecute, favoritos y lectura quedan solo en el dispositivo.

## Autenticación

- `010-auth-profiles.sql` — columnas opcionales de onboarding en `profiles` (rol deportivo, club,
  categorías) y trigger que crea el perfil al registrarse. No borra ni cambia datos existentes.
  Sin esta migración la app funciona igual: guarda esos datos en la cuenta del usuario.
  Reversión: `010-auth-profiles-rollback.sql`.

## Staging primero

Probar en proyecto de staging antes de producción.

## Rollback (solo si tablas vacías)

Eliminar en orden inverso de dependencias. No ejecutar en producción con datos.

## Verificación

```sql
-- Usuario sin membresía no debe ver jugadores
select count(*) from public.players;  -- 0 filas con JWT de usuario sin acceso

-- Tablas creadas
select tablename from pg_tables
where schemaname = 'public'
  and tablename like 'player%'
order by tablename;
```
