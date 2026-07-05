# RFC: Arquitectura centrada en el jugador — Basket Lab

**Estado:** Aprobado (decisiones cerradas)  
**Versión:** 1.0  
**Fecha:** 2026-07-05  
**Alcance:** Diseño técnico y plan de implementación. Sin código de producto en este documento.

---

## 1. Resumen ejecutivo

Basket Lab evoluciona de una aplicación **centrada en el entrenador** (datos aislados por usuario en JSONB) a una plataforma **centrada en el jugador** (datos colaborativos con permisos).

### Principio inmutable

> El jugador es la entidad principal. Los usuarios colaboran sobre ese perfil con distintos permisos. Nunca se duplican datos entre cuentas. Toda modificación opera sobre un único registro.

### Alcance v1

| Incluido | Excluido (permanece en `user_app_data`) |
|----------|------------------------------------------|
| Perfil del jugador | Jugadas |
| Sesiones de tiro | Planificaciones de entrenamiento |
| Estadísticas deportivas | Biblioteca de jugadas |
| Fundamentos / evaluaciones | Sistemas ofensivos / defensivos |
| Notas, objetivos, evolución | Planes anuales |
| Invitaciones coach ↔ player | |
| Activity events (escritura, sin UI) | |
| Realtime (Supabase) | |
| Estructura de notificaciones (sin envío) | |

---

## 2. Decisiones cerradas

| # | Decisión | Resolución |
|---|----------|------------|
| 1 | Nomenclatura de permiso máximo | `admin` (no `owner`) |
| 2 | Jugador autónomo | Puede crear su perfil sin entrenador; puede invitar coaches después |
| 3 | Relación vs permiso | Separados en `player_members` |
| 4 | Permisos v1 | `admin` (jugador) / `editor` (entrenador) / `viewer` (reservado) |
| 5 | Activity Feed | Tabla creada desde v1; eventos registrados desde v1; UI en v2 |
| 6 | Notificaciones | Tabla creada desde v1; sin lógica de envío ni UI en v1 |
| 7 | Realtime | Supabase Realtime desde el cutover del dominio jugador |
| 8 | Dominio entrenador | Sin cambios; sigue en `user_app_data` por `user_id` |

### Matriz de permisos v1

| Acción | `admin` (jugador) | `editor` (entrenador) | `viewer` |
|--------|-------------------|----------------------|----------|
| Ver perfil y datos deportivos | ✓ | ✓ | ✓ |
| Crear/editar/eliminar contenido deportivo | ✓ | ✓ | ✗ |
| Invitar / revocar miembros | ✓ | ✗ | ✗ |
| Archivar perfil completo | ✓ | ✗ | ✗ |
| Editar membresías | ✓ | ✗ | ✗ |

---

## 3. Estado actual (baseline)

### Base de datos

```
auth.users
  └── profiles
  └── user_app_data (user_id + data_type + payload JSONB)
        ├── players_tracking   → array de jugadores
        ├── shooting_heatmap   → { version, sessions[], active_session_id }
        ├── plays, trainings, annual_plans
```

- RLS: cada usuario solo accede a sus propias filas.
- IDs de jugador: strings generados en cliente (`player_*`, `p_*`).
- Sesiones de tiro referencian jugadores via `player_ids[]` dentro del blob.

### Capas de aplicación

| Capa | Archivos clave | Persistencia actual |
|------|----------------|---------------------|
| Legacy UI | `js/main.js`, `js/shooting-zones-heatmap.js` | localStorage + `BasketLabDataSync` → Supabase directo |
| Next.js UI | `components/players/PlayersModule.js` | SSR + `fetch("/api/players")` |
| API | `app/api/players/route.js`, `app/api/shooting/route.js` | `user_app_data` via service role |
| Server | `services/server/user-data-service.js` | upsert blob completo |

### Riesgos de migración identificados

1. **Doble vía de escritura:** legacy escribe directo a Supabase; Next escribe via API.
2. **Merge conflictivo:** `resolveSyncData()` en cliente mezcla blobs por timestamp.
3. **IDs no estables:** migración requiere mapa legacy → UUID.
4. **Sesiones grupales:** una sesión puede referenciar múltiples jugadores.
5. **Cutover parcial:** dominio entrenador sigue en blobs; dominio jugador pasa a relacional.

---

## 4. Modelo de datos objetivo

### 4.1 Diagrama de entidades

```
profiles ─────────────────────────────────────────────┐
                                                       │
player_members ──── players ──── player_notes          │
     │                  │        player_goals          │
     │                  │        player_evolution_events
     │                  │                              │
     │                  ├── shooting_session_players ─── shooting_sessions
     │                  │                              │
     │                  └── activity_events             │
     │                                                  │
player_invitations                                     │
player_member_permissions (v2+, vacía en v1)           │
notifications (estructura v1, sin envío)               │
entity_revisions (v2+, opcional)                       │
player_legacy_id_map (migración)                       │
```

### 4.2 Tablas núcleo

#### `players`

```sql
create table public.players (
  id                  uuid primary key default gen_random_uuid(),
  display_name        text not null,
  position            text,
  age                 smallint,
  height              text,
  level               text,
  team                text,
  category            text,
  photo_url           text,
  club_shield_url     text,
  fundamentals        jsonb not null default '{}'::jsonb,
  game_stats          jsonb not null default '{}'::jsonb,
  status              text not null default 'active'
                      check (status in ('active', 'archived')),
  created_by_user_id  uuid not null references auth.users(id),
  updated_by_user_id  uuid not null references auth.users(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
```

#### `player_members`

```sql
create table public.player_members (
  id                  uuid primary key default gen_random_uuid(),
  player_id           uuid not null references public.players(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,
  relationship_type   text not null
                      check (relationship_type in (
                        'player', 'coach', 'assistant', 'parent', 'physio', 'scout'
                      )),
  access_level        text not null
                      check (access_level in ('admin', 'editor', 'viewer')),
  status              text not null default 'active'
                      check (status in ('pending', 'active', 'revoked')),
  invited_by_user_id  uuid references auth.users(id),
  accepted_at         timestamptz,
  created_by_user_id  uuid not null references auth.users(id),
  updated_by_user_id  uuid not null references auth.users(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (player_id, user_id)
);
```

#### `player_member_permissions` (v2+, creada vacía)

```sql
create table public.player_member_permissions (
  id                  uuid primary key default gen_random_uuid(),
  player_member_id    uuid not null references public.player_members(id) on delete cascade,
  resource            text not null,
  action              text not null check (action in ('read', 'write', 'delete', 'admin')),
  granted             boolean not null default true,
  created_by_user_id  uuid not null references auth.users(id),
  created_at          timestamptz not null default now(),
  unique (player_member_id, resource, action)
);
```

#### `player_invitations`

```sql
create table public.player_invitations (
  id                  uuid primary key default gen_random_uuid(),
  player_id           uuid not null references public.players(id) on delete cascade,
  email               text not null,
  relationship_type   text not null,
  access_level        text not null default 'editor',
  token_hash          text not null,
  invited_by_user_id  uuid not null references auth.users(id),
  expires_at          timestamptz not null,
  accepted_at         timestamptz,
  status              text not null default 'pending'
                      check (status in ('pending', 'accepted', 'expired', 'revoked')),
  created_at          timestamptz not null default now()
);
```

### 4.3 Datos deportivos del jugador

#### `player_notes`

```sql
create table public.player_notes (
  id                  uuid primary key default gen_random_uuid(),
  player_id           uuid not null references public.players(id) on delete cascade,
  body                text not null,
  created_by_user_id  uuid not null references auth.users(id),
  updated_by_user_id  uuid not null references auth.users(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
```

#### `player_goals`

```sql
create table public.player_goals (
  id                  uuid primary key default gen_random_uuid(),
  player_id           uuid not null references public.players(id) on delete cascade,
  body                text not null,
  status              text not null default 'active'
                      check (status in ('active', 'completed', 'archived')),
  created_by_user_id  uuid not null references auth.users(id),
  updated_by_user_id  uuid not null references auth.users(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
```

#### `player_evolution_events`

```sql
create table public.player_evolution_events (
  id                  uuid primary key default gen_random_uuid(),
  player_id           uuid not null references public.players(id) on delete cascade,
  message             text not null,
  created_by_user_id  uuid not null references auth.users(id),
  updated_by_user_id  uuid not null references auth.users(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
```

#### `shooting_sessions` + `shooting_session_players`

```sql
create table public.shooting_sessions (
  id                  uuid primary key default gen_random_uuid(),
  nombre              text not null default 'Sesión de tiro',
  fecha               date not null default current_date,
  zones               jsonb not null default '{}'::jsonb,
  session_type        text not null default 'individual'
                      check (session_type in ('individual', 'group')),
  created_by_user_id  uuid not null references auth.users(id),
  updated_by_user_id  uuid not null references auth.users(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table public.shooting_session_players (
  session_id          uuid not null references public.shooting_sessions(id) on delete cascade,
  player_id           uuid not null references public.players(id) on delete cascade,
  primary key (session_id, player_id)
);
```

### 4.4 Activity y notificaciones

#### `activity_events` (escritura desde v1)

```sql
create table public.activity_events (
  id                  uuid primary key default gen_random_uuid(),
  player_id           uuid not null references public.players(id) on delete cascade,
  actor_user_id       uuid not null references auth.users(id),
  event_type          text not null,
  entity_type         text,
  entity_id           uuid,
  summary             text not null,
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now()
);

create index activity_events_player_created_idx
  on public.activity_events (player_id, created_at desc);
```

**Event types v1:**

| event_type | Cuándo |
|------------|--------|
| `player.created` | Creación de perfil |
| `player.updated` | Cambio en perfil / stats / fundamentals |
| `player.archived` | Archivado de perfil |
| `shooting_session.created` | Nueva sesión |
| `shooting_session.updated` | Modificación de sesión (tiros, nombre, fecha) |
| `shooting_session.deleted` | Eliminación de sesión |
| `player_note.created` | Nueva nota |
| `player_goal.created` | Nuevo objetivo |
| `player_goal.updated` | Cambio de objetivo |
| `player_evolution.created` | Nuevo evento de evolución |
| `member.invited` | Invitación enviada |
| `member.joined` | Invitación aceptada |

#### `notifications` (estructura v1, sin envío)

```sql
create table public.notifications (
  id                  uuid primary key default gen_random_uuid(),
  recipient_user_id   uuid not null references auth.users(id) on delete cascade,
  player_id           uuid references public.players(id) on delete cascade,
  type                text not null,
  title               text not null,
  body                text,
  payload             jsonb not null default '{}'::jsonb,
  read_at             timestamptz,
  created_at          timestamptz not null default now()
);

create index notifications_recipient_unread_idx
  on public.notifications (recipient_user_id, created_at desc)
  where read_at is null;
```

### 4.5 Migración

#### `player_legacy_id_map`

```sql
create table public.player_legacy_id_map (
  legacy_id           text not null,
  player_id           uuid not null references public.players(id) on delete cascade,
  migrated_from_user_id uuid not null references auth.users(id),
  created_at          timestamptz not null default now(),
  primary key (legacy_id, migrated_from_user_id)
);
```

Permite resolver `player_ids[]` de sesiones antiguas durante la migración.

---

## 5. Seguridad: RLS y funciones helper

### 5.1 Jerarquía de acceso

```
admin  > editor > viewer
```

### 5.2 Funciones (evolucionables)

```sql
-- v1: evalúa access_level de membresía activa
create function public.has_player_access(p_player_id uuid, p_min_level text)
returns boolean ...

-- v2: agrega player_member_permissions
create function public.has_player_permission(
  p_player_id uuid, p_resource text, p_action text
) returns boolean ...
```

### 5.3 Políticas RLS v1

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `players` | viewer+ | authenticated (crea + auto-membership) | editor+ | admin (soft: status=archived) |
| `player_members` | viewer+ del player | admin | admin | admin |
| `player_notes/goals/evolution` | viewer+ | editor+ | editor+ | editor+ |
| `shooting_sessions` | viewer+ via junction | editor+ | editor+ | editor+ |
| `activity_events` | viewer+ | editor+ (via service/API) | — | — |
| `notifications` | recipient own | service role only (v2) | recipient own (mark read) | — |
| `player_invitations` | admin | admin | admin | admin |

**Nota:** `activity_events` se insertan desde la capa de servicio (API con service role + validación previa), no directamente desde el cliente.

### 5.4 Realtime (Supabase)

Habilitar Realtime en:

- `players`
- `player_notes`, `player_goals`, `player_evolution_events`
- `shooting_sessions` (filtrado en cliente por jugador activo)
- `player_members` (cambios de acceso)

**Canal sugerido:**

```
player:{player_id}
```

**Eventos suscritos:** `INSERT`, `UPDATE`, `DELETE` en tablas anteriores.

**Cliente:** invalidar cache local / refetch parcial al recibir evento. No reintroducir merge por timestamp.

---

## 6. Contrato de API v1

Todas las rutas requieren autenticación via cookies HTTP-only (patrón actual).

### 6.1 Jugadores

```
GET    /api/players
       → { items: Player[] }  // jugadores donde tengo membresía activa

POST   /api/players
       body: { display_name, ... }
       → crea player + membership admin/player o editor/coach según contexto
       → escribe activity_event player.created

GET    /api/players/:playerId
PATCH  /api/players/:playerId
       → editor+ ; escribe player.updated
DELETE /api/players/:playerId
       → admin ; soft delete (status=archived) ; escribe player.archived
```

### 6.2 Sub-recursos del jugador

```
GET/POST        /api/players/:playerId/notes
PATCH/DELETE    /api/players/:playerId/notes/:noteId

GET/POST        /api/players/:playerId/goals
PATCH/DELETE    /api/players/:playerId/goals/:goalId

GET/POST        /api/players/:playerId/evolution
PATCH/DELETE    /api/players/:playerId/evolution/:eventId
```

### 6.3 Sesiones de tiro

```
GET    /api/players/:playerId/shooting-sessions
POST   /api/players/:playerId/shooting-sessions
       body: { nombre, fecha, zones, player_ids? }  // player_ids para sesiones grupales

GET    /api/shooting-sessions/:sessionId
PATCH  /api/shooting-sessions/:sessionId
DELETE /api/shooting-sessions/:sessionId
```

Cada mutación escribe `activity_events` correspondiente.

### 6.4 Membresías e invitaciones

```
GET    /api/players/:playerId/members          // admin
POST   /api/players/:playerId/invitations      // admin
POST   /api/invitations/accept                 // token
DELETE /api/players/:playerId/members/:memberId  // admin (revoke)
```

### 6.5 Activity (solo lectura, sin UI v1)

```
GET /api/players/:playerId/activity?limit=50&cursor=
```

### 6.6 Endpoints legacy (deprecación gradual)

```
GET/POST /api/players        → mantiene compatibilidad durante transición (adapter)
GET/POST /api/shooting       → idem

GET/POST /api/plays          → SIN CAMBIOS
GET/POST /api/trainings      → SIN CAMBIOS
GET/POST /api/annual-plans   → SIN CAMBIOS
```

### 6.7 Capa de servicio

Nuevos módulos server-only:

```
services/server/player-service.js
services/server/shooting-session-service.js
services/server/player-member-service.js
services/server/activity-service.js
services/server/player-permissions.js   // has_player_access v1
```

Patrón obligatorio (guardrails actuales):

```
Client → /api/* → services/server/* → Supabase (service role + validación)
```

---

## 7. Estrategia de migración de datos

### 7.1 Mapa de transformación

| Origen (JSON) | Destino (SQL) |
|---------------|---------------|
| `players_tracking[]` | `players` + tablas hijas + `player_members` |
| `player.notes_history[]` | `player_notes` (una fila por nota) |
| `player.goals[]` | `player_goals` |
| `player.evolution[]` | `player_evolution_events` |
| `player.fundamentals` | `players.fundamentals` |
| `player.stats` | `players.game_stats` |
| `shooting_heatmap.sessions[]` | `shooting_sessions` + `shooting_session_players` |
| `session.player_ids[]` | junction via `player_legacy_id_map` |
| `session.zones` | `shooting_sessions.zones` |

### 7.2 Reglas de membresía post-migración

Por cada `user_id` que tenía `players_tracking`:

```
INSERT player_members (
  relationship_type = 'coach',
  access_level      = 'editor',
  status            = 'active'
)
```

Cuando el jugador reclame su perfil (invitación):

```
INSERT player_members (
  relationship_type = 'player',
  access_level      = 'admin'
)
```

### 7.3 Preservación de datos legacy

- No eliminar filas de `user_app_data` hasta Fase 6.
- Marcar como `legacy_archived` en columna auxiliar o tabla de control de migración.
- Mantener `player_legacy_id_map` indefinidamente (bajo costo, alto valor de trazabilidad).

---

## 8. Plan de implementación por fases

### Fase 0 — Fundación DB (riesgo: nulo para usuarios)

**Objetivo:** Crear esquema nuevo sin tocar flujos existentes.

**Entregables:**
- [ ] Script SQL: tablas, índices, triggers `updated_at`, funciones RLS
- [ ] Habilitar Realtime en tablas objetivo (Supabase dashboard)
- [ ] Feature flag: `PLAYER_CENTRIC_ENABLED=false`
- [ ] Documentar rollback: drop tables (solo si no hay datos)

**Validación:**
- Migraciones idempotentes (`IF NOT EXISTS`)
- RLS activo; usuario sin membresía no ve datos
- Tests manuales con SQL editor

**Duración estimada:** 1–2 días

---

### Fase 1 — Capa de servicio + API paralela (riesgo: bajo)

**Objetivo:** APIs nuevas operativas; UI sigue usando blobs.

**Entregables:**
- [ ] `player-service.js`, `shooting-session-service.js`, `activity-service.js`
- [ ] Rutas `/api/players/:id/*` y `/api/shooting-sessions/*`
- [ ] Inserción de `activity_events` en cada mutación
- [ ] Tests de integración API (crear jugador, sesión, nota)

**Validación:**
- CRUD completo via API (Postman / tests)
- Permisos: editor no puede invitar; admin sí
- Activity events generados correctamente

**Duración estimada:** 3–5 días

---

### Fase 2 — Dual write (riesgo: medio, controlado)

**Objetivo:** Cada escritura en el sistema actual también escribe en tablas nuevas.

**Entregables:**
- [ ] Hook en `saveUserDataByType` o adapter post-save para `players_tracking` y `shooting_heatmap`
- [ ] Hook en legacy `BasketLabDataSync` flush (mismo adapter)
- [ ] Log de discrepancias (conteo jugadores, sesiones)

**Flujo:**

```
UI guarda blob (como hoy)
  → upsert user_app_data
  → adapter sync_to_relational(user_id, payload)
  → upsert players / shooting_sessions
  → activity_events
```

**Validación:**
- Script de comparación: N jugadores blob = N players; sesiones equivalentes
- Sin regresión en UI actual

**Rollback:** desactivar adapter; blobs intactos

**Duración estimada:** 3–4 días

---

### Fase 3 — Migración histórica (riesgo: medio)

**Objetivo:** Poblar tablas nuevas con datos existentes de todos los usuarios.

**Entregables:**
- [ ] Script `scripts/migrate-player-domain.js` (idempotente, por user_id)
- [ ] Población de `player_legacy_id_map`
- [ ] Reporte de migración: OK / warnings / errors

**Algoritmo:**

```
FOR EACH user_app_data WHERE data_type = 'players_tracking':
  FOR EACH player IN payload:
    UPSERT players (by legacy map)
    UPSERT player_members (coach, editor)
    SPLIT notes/goals/evolution → tablas hijas
    MAP legacy_id → player.uuid

FOR EACH user_app_data WHERE data_type = 'shooting_heatmap':
  FOR EACH session IN payload.sessions:
    INSERT shooting_sessions
    FOR EACH legacy_player_id IN session.player_ids:
      RESOLVE uuid FROM player_legacy_id_map
      INSERT shooting_session_players
    INSERT activity_event (retroactivo, created_at = session.created_at)
```

**Validación:**
- Muestreo manual: 5 cuentas reales, comparar UI antes/después
- Sesiones huérfanas (player_id no resuelto) → reporte, no fallo silencioso

**Rollback:** truncar tablas nuevas; re-ejecutar desde blobs

**Duración estimada:** 2–3 días

---

### Fase 4 — Dual read + Realtime (riesgo: medio-alto)

**Objetivo:** UI lee del modelo nuevo; blobs como fallback.

**Entregables:**
- [ ] Feature flag: `PLAYER_CENTRIC_READ=true`
- [ ] Adapter read: API nueva → formato compatible con UI actual
- [ ] Cliente Realtime: suscripción `player:{id}`
- [ ] Eliminar `resolveSyncData` para dominio jugador (solo lectura relacional)

**Estrategia de compatibilidad UI:**

Opción recomendada — **Adapter en API**:

```
GET /api/players
  IF PLAYER_CENTRIC_READ:
    fetch from players table
    transform → legacy shape { id, name, notes_history: [...], ... }
  ELSE:
    fetch from user_app_data (actual)
```

Permite migrar `main.js` y `PlayersModule` sin rewrite masivo inicial.

**Validación:**
- Coach abre jugador → ve datos migrados
- Realtime: dos browsers, uno edita sesión, otro actualiza sin refresh
- Modo offline: degradación graceful (cache local, resync al reconectar)

**Rollback:** `PLAYER_CENTRIC_READ=false`

**Duración estimada:** 5–7 días

---

### Fase 5 — Cutover escritura (riesgo: alto → mitigado con flags)

**Objetivo:** Escrituras van solo al modelo relacional.

**Entregables:**
- [ ] `PLAYER_CENTRIC_WRITE=true`
- [ ] Dual write desactivado (ya no necesario)
- [ ] `user_app_data` para `players_tracking` y `shooting_heatmap` → read-only
- [ ] Invitaciones coach ↔ player operativas

**Validación:**
- No se crean filas nuevas en blobs
- Jugador invitado ve mismos datos que coach
- Activity feed acumula eventos desde cutover

**Rollback:** reactivar dual write + read from blob

**Duración estimada:** 3–5 días

---

### Fase 6 — Limpieza (riesgo: bajo)

**Objetivo:** Eliminar deuda técnica del dominio jugador.

**Entregables:**
- [ ] Remover adapter legacy read/write
- [ ] Deprecar endpoints blob `/api/players` POST, `/api/shooting` POST
- [ ] Refactor UI: consumir API relacional nativa (sin shape legacy)
- [ ] Archivar payloads viejos (backup, no delete inmediato)
- [ ] Actualizar `docs/supabase-schema.sql`

**Duración estimada:** 5–8 días

---

### Fase 7 — Colaboración extendida (v2, fuera de v1)

- UI de Activity Feed
- Envío de notificaciones
- Permisos granulares (`player_member_permissions`)
- Roles: parent, physio, scout con UI
- `entity_revisions` / historial completo

---

## 9. Impacto por componente

| Componente | Fases activas | Tipo de cambio |
|------------|---------------|----------------|
| `docs/supabase-schema.sql` | 0, 6 | Nuevo esquema |
| `services/server/*` | 1–5 | Nuevos servicios |
| `app/api/players/*` | 1–6 | Reescritura gradual |
| `app/api/shooting/*` | 1–6 | Reescritura gradual |
| `components/players/PlayersModule.js` | 4–6 | Read realtime + API |
| `js/main.js` (seguimiento jugadores) | 4–6 | Adapter → API |
| `js/shooting-zones-heatmap.js` | 4–6 | Persistencia por sesión/API |
| `lib/shooting-zones.js` | — | Sin cambios |
| `user_app_data` (plays, trainings, plans) | — | Sin cambios |
| `BasketLabDataSync` | 2–5 | Excluir tipos migrados |

---

## 10. Feature flags

| Flag | Default | Descripción |
|------|---------|-------------|
| `PLAYER_CENTRIC_ENABLED` | `false` | Master switch (F6: activa read+write+realtime) |
| `PLAYER_CENTRIC_READ` | `false` | Lectura desde tablas nuevas (override) |
| `PLAYER_CENTRIC_WRITE` | `false` | Escritura solo a tablas nuevas (override) |
| `PLAYER_CENTRIC_REALTIME` | `false` | Suscripciones Supabase (override) |

Activación progresiva en staging antes de producción.

---

## 11. Criterios de éxito v1

- [ ] Un jugador puede crear su perfil sin entrenador
- [ ] Un entrenador puede crear un jugador e invitarlo
- [ ] Coach y jugador ven exactamente los mismos datos
- [ ] Cambios en tiempo real (< 2s) via Supabase Realtime
- [ ] Cero duplicación de registros entre cuentas
- [ ] Toda entidad deportiva tiene auditoría (created/updated by/at)
- [ ] Activity events registrados desde el primer día post-cutover
- [ ] Dominio entrenador (jugadas, planes) sin regresiones
- [ ] Datos históricos migrados con mapa legacy intacto
- [ ] Rollback posible en cada fase via feature flags

---

## 12. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Pérdida de datos en migración | Baja | Crítico | Dual write + backup blobs + script idempotente |
| IDs huérfanos en sesiones | Media | Medio | `player_legacy_id_map` + reporte |
| Regresión UI legacy | Media | Alto | Adapter de compatibilidad hasta Fase 6 |
| Conflictos Realtime + offline | Media | Medio | Last-write-wins a nivel fila; sin merge blob |
| RLS mal configurado | Baja | Crítico | Tests de permisos automatizados |
| Dos vías de escritura divergentes | Alta (Fase 2–4) | Alto | Dual write + script de reconciliación diario |

---

## 13. Orden de ejecución recomendado

```
Fase 0 → Fase 1 → Fase 3 → Fase 2 → Fase 4 → Fase 5 → Fase 6
                  ↑
         migrar histórico ANTES de dual write evita
         re-sync duplicado; alternativa: F2 → F3 si preferís
         validar dual write con datos nuevos primero
```

**Recomendación:** F0 → F1 → F2 (dual write corto, staging) → F3 (histórico) → F4 → F5 → F6.

---

## 14. Glosario

| Término | Definición |
|---------|------------|
| **Dominio jugador** | Perfil, stats, sesiones, notas, evolución |
| **Dominio entrenador** | Jugadas, planificaciones, biblioteca, sistemas, planes anuales |
| **Membresía** | Vínculo user ↔ player con relación y permiso |
| **Admin** | Máximo nivel; gestiona perfil y miembros; no es "dueño" |
| **Editor** | CRUD de contenido deportivo; no gestiona miembros |
| **Cutover** | Momento en que el sistema deja de usar blobs para el dominio jugador |

---

## 15. Aprobación

| Rol | Estado | Fecha |
|-----|--------|-------|
| Producto / Arquitectura | Aprobado | 2026-07-05 |
| Implementación | Plan aprobado | 2026-07-05 |

**Próximo paso:** Fase 0 — script SQL de fundación (ver `implementation-plan-player-centric.md`).
