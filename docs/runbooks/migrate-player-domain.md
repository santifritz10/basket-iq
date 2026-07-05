# Migración del dominio jugador

## Prerrequisitos

1. Ejecutar SQL en Supabase (ver `docs/sql/README.md`)
2. Completar `.env.local` con `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`

## Migración batch

```bash
node scripts/migrate-player-domain.mjs
```

Migrar un solo usuario:

```bash
node scripts/migrate-player-domain.mjs --user-id=<uuid>
```

Reporte: `scripts/migrate-player-domain-report.json`

## Reconciliación

Comparar conteos blob vs SQL:

```bash
node scripts/reconcile-player-domain.mjs
```

Reporte: `scripts/reconcile-player-domain-report.json`

## Orden recomendado

1. Staging: SQL → migrate → reconcile
2. Activar `PLAYER_CENTRIC_ENABLED=true` y `NEXT_PUBLIC_PLAYER_CENTRIC_ENABLED=true` en staging
3. Validar app legacy + Next (lectura, escritura, invitaciones, Realtime)
4. Producción: repetir con backup previo

## Rollback

- No eliminar filas de `user_app_data`
- Desactivar feature flags (`PLAYER_CENTRIC_ENABLED=false`)
- Truncar tablas del dominio jugador solo si es necesario re-ejecutar migrate
