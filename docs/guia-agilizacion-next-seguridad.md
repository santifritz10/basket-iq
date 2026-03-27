# Guia rapida para agilizar migracion a Next.js segura

Esta guia te sirve como ruta corta de ejecucion para avanzar sin bloquearte.

## 1) Orden recomendado (sin desvio)

1. Seguridad base y secretos
2. Backend interno (`/api`)
3. Migracion UI a Next.js App Router
4. Hardening final + pruebas

## 2) Setup minimo de entorno

Ejecutar en raiz del proyecto:

```bash
npm install
```

Crear `.env.local` a partir de `.env.local.example` y completar:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (recomendado para rutas server)
- `NEWS_API_BASE_URL` y `NEWS_API_KEY` (si se usa noticias)

## 3) Checklist express por fase

### Fase A - Seguridad (P1)

- [ ] No dejar keys en `js/supabase-config.js`
- [ ] Usar solo variables de entorno en servidor
- [ ] Confirmar `.gitignore` incluye `.env.local`
- [ ] Revisar RLS en `profiles` y `user_app_data`

Resultado esperado: no hay secretos hardcodeados en frontend.

### Fase B - API interna

- [ ] `app/api/auth/*` (login, register, logout, session)
- [ ] `app/api/data/[type]` para `plays`, `trainings`, `annual_plans`, `shooting_heatmap`, `players_tracking`
- [ ] `app/api/news` para proxy seguro a proveedor externo
- [ ] `app/api/players`, `app/api/trainings`, `app/api/annual-plans`, `app/api/plays`, `app/api/shooting`
- [ ] Validar entradas/salidas y devolver solo datos necesarios

Resultado esperado: cliente deja de hablar directo con servicios sensibles.

### Fase C - Migracion a Next.js

- [ ] `app/layout.js`, `app/page.js`, `app/globals.css`
- [ ] Migrar secciones por dominio:
  - Dashboard
  - Planificacion de entrenamientos
  - Planificacion anual
  - Seguimiento de jugadores
  - Jugadas
  - Tiro
  - Fundamentos
- [ ] Reemplazar `innerHTML` por componentes React
- [ ] Mantener comportamiento funcional previo

Resultado esperado: app funcional bajo App Router.

### Fase D - Hardening y cierre

- [ ] Headers de seguridad en `next.config.mjs`
- [ ] Manejo uniforme de errores en API/UI
- [ ] Validar ausencia de secretos en repo
- [ ] Prueba completa de login + sync + CRUD de modulos principales

## 4) Estrategia para no trabarse

- Trabajar por lotes pequenos:
  - Lote 1: Auth + data route
  - Lote 2: Planificacion + anual
  - Lote 3: Jugadores
  - Lote 4: Jugadas + tiro + fundamentos
- Al terminar cada lote:
  1. abrir app
  2. probar flujo principal
  3. revisar errores de consola
  4. revisar lint

## 5) Comandos utiles (flujo diario)

```bash
npm run dev
```

```bash
npm run build
```

Si falla build:

1. corregir imports/rutas
2. validar envs requeridas
3. reintentar build

## 6) Criterio de finalizacion

Se considera terminado cuando:

- No hay API keys en frontend
- Cliente consume solo `/api` para logica sensible
- Login/sesion/sync funcionan
- Secciones clave no perdieron funcionalidad
- Build de Next.js compila correctamente

