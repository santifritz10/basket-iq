# SQL — Dominio jugador (Fase 0)

Ejecutar en **Supabase SQL Editor** en este orden:

1. `001-player-domain-schema.sql` — tablas, índices, triggers
2. `002-player-domain-rls.sql` — funciones helper y políticas RLS
3. `003-player-domain-realtime.sql` — checklist Realtime (dashboard o SQL)
4. `004-legacy-archive.sql` — *(opcional, post-cutover)* marcar blobs archivados

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
