# Supabase Guardrails (Next.js)

## Qué archivos son server-only

Estos módulos están protegidos con `import "server-only"` y **no** deben importarse desde componentes con `"use client"`:

- `lib/server/env.js`
- `lib/server/supabase.js`
- `lib/server/auth.js`
- `services/server/user-data-service.js`
- `services/news-service.js`

Compatibilidad legacy (también server-only):

- `lib/env.js` (re-export server)
- `lib/supabase-server.js` (re-export server)
- `lib/auth-server.js` (re-export server)
- `services/user-data-service.js` (re-export server)

## Regla de imports

### Permitido

- Frontend/client: `fetch("/api/...")`
- Route handlers/server components: imports desde `lib/server/*` y `services/server/*`

### Prohibido

- Importar `lib/server/*` o `services/server/*` dentro de:
  - archivos con `"use client"`
  - componentes de UI cliente

## Uso correcto de Supabase

1. Cliente (browser) **no usa** `SUPABASE_SERVICE_ROLE_KEY`.
2. Cliente llama a `/api`.
3. `/api` usa `services/server/*`.
4. `services/server/*` usa `lib/server/supabase.js`.

Flujo:

`Client -> /api/* -> services/server/* -> Supabase`

## Variables de entorno

- `SUPABASE_SERVICE_ROLE_KEY` solo en `.env.local` (nunca en `NEXT_PUBLIC_*`).
- `lib/server/env.js` valida y falla si detecta `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`.

## Checklist para PR

- [ ] No hay imports de `lib/server/*` en componentes `use client`.
- [ ] No hay uso de `SUPABASE_SERVICE_ROLE_KEY` fuera de server runtime.
- [ ] No hay logs de secretos.
- [ ] Build de Next compila.
- [ ] Búsqueda en `.next` no devuelve `service_role` ni el valor de la key.

