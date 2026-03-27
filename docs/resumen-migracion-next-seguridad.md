# Resumen de migracion a Next.js + seguridad

## Problemas detectados inicialmente

1. **Clave de Supabase anon hardcodeada en frontend**
   - Archivo: `js/supabase-config.js`
   - Riesgo: exposición de credenciales de cliente y abuso de cuota/proyecto.

2. **Lógica sensible en cliente**
   - Auth y sincronización se ejecutaban directamente desde navegador.
   - Riesgo: superficie de manipulación y dependencia completa de RLS.

3. **Falta de higiene de secretos**
   - No había `.gitignore` ni plantilla de entorno para separar secretos.

4. **Renderizado dinámico con `innerHTML`**
   - Riesgo XSS si entran datos maliciosos.

## Qué se implementó

### Base Next.js (App Router)
- `app/layout.js`
- `app/page.js`
- `app/globals.css`
- `next.config.mjs`
- `package.json`

### Seguridad de entorno
- `.gitignore` con exclusión de `.env.local`.
- `.env.local.example` con variables requeridas.
- `lib/env.js` para validación tipada de variables.
- `js/supabase-config.js` sin clave real (placeholders).

### Backend interno seguro (`/app/api`)
- Auth:
  - `app/api/auth/login/route.js`
  - `app/api/auth/register/route.js`
  - `app/api/auth/logout/route.js`
  - `app/api/auth/session/route.js`
- Datos:
  - `app/api/data/[type]/route.js`
  - `app/api/players/route.js`
  - `app/api/trainings/route.js`
  - `app/api/annual-plans/route.js`
  - `app/api/plays/route.js`
  - `app/api/shooting/route.js`
- Externo:
  - `app/api/news/route.js`

### Capa server
- `lib/supabase-server.js`
- `lib/auth-server.js`
- `services/user-data-service.js`
- `services/news-service.js`

### UI segura en Next
- Login/registro:
  - `app/(auth)/login/page.js`
  - `components/auth/AuthCard.js`
- Área protegida:
  - `app/(secure)/layout.js`
  - `app/(secure)/dashboard/page.js`
  - `app/(secure)/players/page.js`
  - `app/(secure)/trainings/page.js`
  - `app/(secure)/annual-plans/page.js`
  - `app/(secure)/plays/page.js`
  - `app/(secure)/shooting/page.js`
  - `components/players/PlayersModule.js`
  - `components/data/DataTypeModule.js`
  - `components/data/ShootingPayloadEditor.js`

### Datos / esquema
- Se alineó `players_tracking` en `docs/supabase-schema.sql`.

## Cómo agregar nuevas APIs de forma segura (futuro)

1. **Nunca** llamar API privada desde el cliente.
2. Crear `app/api/<modulo>/route.js`.
3. Leer keys solo desde `process.env` (validadas en `lib/env.js`).
4. Implementar lógica externa en `services/*`.
5. Devolver al frontend solo datos mínimos necesarios.
6. Validar input/output y manejar errores uniformemente.

## Pasos finales para correr local

1. Instalar dependencias:
   - `npm install`
2. Completar `.env.local` (desde `.env.local.example`).
3. Levantar:
   - `npm run dev`
4. Abrir:
   - `http://localhost:3000/login`

