# Plan de implementación — Dominio jugador (Basket Lab)

**Estado:** Aprobado  
**Depende de:** [`rfc-player-centric-architecture.md`](./rfc-player-centric-architecture.md)  
**Fecha:** 2026-07-05  
**Alcance:** Plan por fases. Sin código de producto hasta aprobación de este documento.

---

## 0. Decisiones de producto (cerradas)

### Dominio jugador (compartido, tiempo real, un solo registro)

Todo lo relacionado con **rendimiento deportivo** vive en el perfil del jugador:

| Contenido | Estado en v1 | Tabla / destino |
|-----------|--------------|-----------------|
| Sesiones de tiro | Implementar | `shooting_sessions` |
| Estadísticas | Implementar | `players.game_stats` |
| Evaluaciones / fundamentos | Implementar | `players.fundamentals` |
| Objetivos | Implementar | `player_goals` |
| Evolución | Implementar | `player_evolution_events` |
| Notas / informes cortos | Implementar | `player_notes` |
| Videos | Preparar esquema | `player_media` (tabla vacía, sin UI v1) |
| Informes formales | Preparar esquema | `player_reports` (tabla vacía, sin UI v1) |

### Dominio entrenador (privado, nunca fluye al jugador)

Permanece en `user_app_data` por `user_id`:

- Biblioteca / jugadas (`plays`)
- Sistemas ofensivos / defensivos (parte de `plays` o extensión futura)
- Planificaciones / ejercicios (`trainings`)
- Planes anuales (`annual_plans`)
- Scouting de rivales (futuro, mismo patrón user-scoped)
- Configuración personal del entrenador (futuro)

**Regla:** ningún endpoint del dominio jugador lee ni expone datos de estos módulos.

### Colaboración

- Misma fila en Postgres para coach y jugador.
- Supabase Realtime desde Fase 4.
- Sin merge de blobs ni copias entre cuentas.

### Auditoría y actividad

- `created_by`, `updated_by`, `created_at`, `updated_at` en entidades importantes.
- `activity_events` con escritura desde la primera mutación post-cutover (Fase 1 en API nueva; visible en producción desde Fase 5).

### Notificaciones

- Tabla `notifications` creada en Fase 0.
- Sin envío ni UI hasta v2.

---

## 1. Visión general de fases

```text
Fase 0 ──► Fase 1 ──► Fase 2 ──► Fase 3 ──► Fase 4 ──► Fase 5 ──► Fase 6
  DB         API         Dual        Migrar      Read+RT      Write       Limpieza
             (paralela)  write       histórico   cutover      cutover
```

Cada fase deja el sistema **funcionando** con el modelo anterior intacto hasta el cutover (Fase 5).

| Fase | Duración est. | Usuario final nota cambios |
|------|---------------|----------------------------|
| 0 | 1–2 días | No |
| 1 | 3–5 días | No |
| 2 | 3–4 días | No (solo staging validación) |
| 3 | 2–3 días | No |
| 4 | 5–7 días | Sí (realtime, datos migrados) |
| 5 | 3–5 días | Sí (colaboración coach↔player) |
| 6 | 5–8 días | Mínimo (refactor interno) |

**Total estimado:** 22–34 días de desarrollo.

---

## 2. Feature flags (transversal)

Agregar en `lib/server/env.js` y `.env.local.example`:

| Variable | Default | Fase activa |
|----------|---------|-------------|
| `PLAYER_CENTRIC_ENABLED` | `false` | 0+ (F6: activa read+write+realtime) |
| `PLAYER_CENTRIC_READ` | `false` | 4 (override) |
| `PLAYER_CENTRIC_WRITE` | `false` | 5 (override) |
| `PLAYER_CENTRIC_REALTIME` | `false` | 4 (override) |

Activar en **staging** antes que producción. Rollback = apagar flag.

---

## 3. Fase 0 — Fundación de base de datos

### Objetivo

Crear el esquema relacional del dominio jugador **sin modificar** ningún flujo de la aplicación. Las tablas existen vacías; la app sigue usando `user_app_data`.

### Archivos a crear

| Archivo | Propósito |
|---------|-----------|
| `docs/sql/001-player-domain-schema.sql` | DDL: tablas, índices, triggers |
| `docs/sql/002-player-domain-rls.sql` | Funciones helper + políticas RLS |
| `docs/sql/003-player-domain-realtime.sql` | Comentarios / checklist Realtime (Supabase dashboard) |
| `docs/sql/README.md` | Orden de ejecución en Supabase SQL Editor |

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `docs/supabase-schema.sql` | Referencia al nuevo esquema (o append al final) |
| `lib/server/env.js` | Agregar feature flags (opcional en F0, obligatorio F1) |
| `.env.local.example` | Documentar flags (si existe; si no, crear) |

### Migraciones necesarias

Ejecutar en Supabase (orden):

1. Extensiones y funciones `updated_at` genéricas.
2. Tablas: `players`, `player_members`, `player_member_permissions`, `player_invitations`, `player_notes`, `player_goals`, `player_evolution_events`, `shooting_sessions`, `shooting_session_players`, `activity_events`, `notifications`, `player_legacy_id_map`, `player_media`, `player_reports`.
3. Índices y triggers.
4. RLS habilitado en todas las tablas.
5. Realtime: habilitar publicación para tablas del dominio jugador (dashboard Supabase).

**No tocar:** `user_app_data`, `profiles` (salvo comentarios).

### Riesgos

| Riesgo | Prob. | Mitigación |
|--------|-------|------------|
| Script SQL rompe entorno | Baja | Scripts idempotentes; probar en proyecto Supabase de staging |
| RLS bloquea service role mal configurado | Media | Validar inserts con service role en tests manuales |
| Realtime no habilitado | Baja | Checklist en `003-player-domain-realtime.sql` |

### Compatibilidad con sistema actual

- **100% compatible.** Cero cambios en app.
- Validación: app funciona igual; tablas nuevas vacías en Table Editor.

### Criterios de done

- [ ] Scripts ejecutados sin error en staging
- [ ] RLS: usuario sin membresía no ve filas
- [ ] Realtime habilitado en tablas objetivo
- [ ] Rollback documentado: `DROP TABLE` en orden inverso (solo si vacías)

---

## 4. Fase 1 — Capa de servicio y API paralela

### Objetivo

Implementar CRUD del dominio jugador vía API nueva. La UI **sigue** usando blobs; las rutas nuevas se prueban con tests o herramientas externas.

### Archivos a crear

| Archivo | Propósito |
|---------|-----------|
| `services/server/player-permissions.js` | `hasPlayerAccess()`, jerarquía admin/editor/viewer |
| `services/server/player-service.js` | CRUD `players`, notas, goals, evolution |
| `services/server/shooting-session-service.js` | CRUD sesiones + junction |
| `services/server/player-member-service.js` | Membresías e invitaciones |
| `services/server/activity-service.js` | `recordActivityEvent()` |
| `services/server/player-legacy-adapter.js` | Transformaciones relacional ↔ shape JSON legacy |
| `app/api/players/[playerId]/route.js` | GET, PATCH, DELETE |
| `app/api/players/[playerId]/notes/route.js` | GET, POST |
| `app/api/players/[playerId]/notes/[noteId]/route.js` | PATCH, DELETE |
| `app/api/players/[playerId]/goals/route.js` | Idem goals |
| `app/api/players/[playerId]/goals/[goalId]/route.js` | |
| `app/api/players/[playerId]/evolution/route.js` | |
| `app/api/players/[playerId]/evolution/[eventId]/route.js` | |
| `app/api/players/[playerId]/shooting-sessions/route.js` | GET, POST |
| `app/api/shooting-sessions/[sessionId]/route.js` | GET, PATCH, DELETE |
| `app/api/players/[playerId]/members/route.js` | GET (admin) |
| `app/api/players/[playerId]/invitations/route.js` | POST (admin) |
| `app/api/invitations/accept/route.js` | POST |
| `app/api/players/[playerId]/activity/route.js` | GET (sin UI) |
| `lib/server/player-domain-flags.js` | Lectura centralizada de feature flags |

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `app/api/players/route.js` | Sin cambio funcional (aún blob); opcional comentario deprecación |
| `app/api/shooting/route.js` | Idem |
| `lib/server/env.js` | Feature flags |
| `docs/supabase-guardrails.md` | Listar nuevos services server-only |

### Archivos que NO se tocan

- `js/main.js`
- `js/shooting-zones-heatmap.js`
- `components/players/PlayersModule.js`
- Rutas `/api/plays`, `/api/trainings`, `/api/annual-plans`

### Migraciones necesarias

Ninguna adicional (Fase 0 ya aplicada).

### Riesgos

| Riesgo | Prob. | Mitigación |
|--------|-------|------------|
| Lógica de permisos incorrecta | Media | Tests: admin vs editor vs sin acceso |
| Activity events inconsistentes | Baja | Una función `recordActivityEvent` obligatoria en cada mutación |
| Duplicación de validación | Media | Validación solo en services; routes delgadas |

### Compatibilidad

- UI y legacy **sin cambios**.
- Probar API nueva con curl/Postman/ tests de integración.
- Blobs siguen siendo fuente de verdad para usuarios.

### Criterios de done

- [ ] Crear jugador → `players` + `player_members` + `activity_events`
- [ ] Editor no puede invitar; admin sí
- [ ] CRUD sesión de tiro con auditoría
- [ ] GET activity devuelve eventos
- [ ] Build Next compila; guardrails respetados

---

## 5. Fase 2 — Dual write (sincronización blob → relacional)

### Objetivo

Cada vez que el sistema actual **guarda** `players_tracking` o `shooting_heatmap`, también sincronizar al modelo relacional. Lectura sigue desde blobs.

### Archivos a crear

| Archivo | Propósito |
|---------|-----------|
| `services/server/player-domain-sync.js` | `syncPlayersTrackingFromBlob(userId, items)` |
| `services/server/shooting-domain-sync.js` | `syncShootingHeatmapFromBlob(userId, payload)` |
| `scripts/reconcile-player-domain.js` | Comparar blob vs tablas; reporte discrepancias |

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `services/server/user-data-service.js` | Tras `saveUserDataByType`, si flag `PLAYER_CENTRIC_DUAL_WRITE` y tipo es `players_tracking` o `shooting_heatmap`, llamar sync |
| `app/api/players/route.js` | POST dispara sync (vía user-data-service) |
| `app/api/shooting/route.js` | POST dispara sync |
| `app/api/data/[type]/route.js` | POST dispara sync para tipos migrados |
| `lib/server/env.js` | Flag `PLAYER_CENTRIC_DUAL_WRITE` |

### Archivos legacy (opcional en F2, recomendado F4)

| Archivo | Cambio |
|---------|--------|
| `js/main.js` | `upsertRemoteDataType`: tras flush exitoso, llamar `POST /api/internal/sync-player-domain` **o** confiar solo en sync server-side |

**Recomendación F2:** sync **solo server-side** en `saveUserDataByType`. El legacy escribe directo a Supabase (`user_app_data`), no pasa por API Next.

Por tanto, F2 requiere **también**:

| Archivo | Cambio |
|---------|--------|
| `js/main.js` | Cambiar `upsertRemoteDataType` para tipos migrados: usar `fetch("/api/players")` / nuevo endpoint sync en lugar de Supabase directo **O** |
| — | Alternativa: Database Webhook / Edge Function en Supabase al upsert de `user_app_data` |

**Estrategia recomendada (menor riesgo en F2):**

1. **Next routes** (`PlayersModule`): sync vía `user-data-service` ✓
2. **Legacy direct Supabase:** agregar en `js/main.js` llamada post-flush a `POST /api/sync/player-domain` con el payload local

### Archivos a crear (sync legacy)

| Archivo | Propósito |
|---------|-----------|
| `app/api/sync/player-domain/route.js` | Recibe `{ dataType, payload }`, ejecuta sync server-side |

### Migraciones necesarias

Ninguna DDL. Poblar `player_legacy_id_map` en cada sync (upsert por legacy id).

### Riesgos

| Riesgo | Prob. | Mitigación |
|--------|-------|------------|
| Legacy bypass API Next | **Alta** | Endpoint `/api/sync/player-domain` + hook en `flushPendingDataSync` |
| Doble escritura inconsistente | Media | Script reconcile diario en staging |
| Performance (sync completo en cada save) | Media | Sync incremental por diff de IDs (v1: full sync aceptable si pocos jugadores) |
| Sesiones grupales mal mapeadas | Media | Junction `shooting_session_players` por cada legacy id resuelto |

### Compatibilidad

- Lectura: **solo blobs** → UI idéntica.
- Escritura: blob primero (como hoy) + sync secundario (best-effort, log errors).
- Si sync falla, blob sigue siendo válido; alertar en logs.

### Criterios de done

- [ ] Guardar en `PlayersModule` → filas en `players`
- [ ] Guardar en legacy main.js → filas en `players` (via sync endpoint)
- [ ] Reconcile script: 0 discrepancias en cuenta de prueba
- [ ] `plays` / `trainings` no disparan sync

---

## 6. Fase 3 — Migración histórica

### Objetivo

Poblar tablas relacional es desde **todos** los `user_app_data` existentes en producción/staging. Idempotente: re-ejecutable sin duplicar.

### Archivos a crear

| Archivo | Propósito |
|---------|-----------|
| `scripts/migrate-player-domain.js` | Migración batch por `user_id` |
| `scripts/migrate-player-domain-report.js` | Genera JSON/HTML de resultados |
| `docs/runbooks/migrate-player-domain.md` | Procedimiento operativo |

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `package.json` | Scripts npm: `migrate:player-domain`, `reconcile:player-domain` |

### Migraciones necesarias

Ninguna DDL. Opcional:

```sql
-- Tabla de control de migración
create table public.player_domain_migrations (
  user_id uuid primary key,
  migrated_at timestamptz,
  players_count int,
  sessions_count int,
  warnings jsonb
);
```

### Algoritmo (resumen)

```
FOR user IN (SELECT DISTINCT user_id FROM user_app_data WHERE data_type IN (...)):
  payload_players = get payload players_tracking
  payload_shooting = get payload shooting_heatmap

  FOR player IN payload_players:
    UPSERT players (match by legacy_id_map)
    UPSERT player_members (coach, editor)
    SPLIT notes, goals, evolution → tablas hijas
    INSERT activity_events (retroactivo, created_at original)

  FOR session IN payload_shooting.sessions:
    UPSERT shooting_sessions
    LINK shooting_session_players via legacy map
    INSERT activity_events

  RECORD player_domain_migrations
```

### Riesgos

| Riesgo | Prob. | Mitigación |
|--------|-------|------------|
| Pérdida de datos | Baja | No borrar blobs; backup Supabase pre-migración |
| IDs huérfanos en sesiones | Media | Reporte `warnings`; sesión se crea sin junction |
| Duplicados si re-ejecuta | Media | Upsert por `legacy_id` + `migrated_from_user_id` |
| Notas sin autor original | Alta | `created_by_user_id = coach user_id` (único disponible) |

### Compatibilidad

- App sigue leyendo blobs.
- Tablas nuevas pobladas en paralelo.
- Validar con reconcile script antes de Fase 4.

### Criterios de done

- [ ] 100% cuentas con `players_tracking` migradas
- [ ] Reporte de warnings revisado manualmente
- [ ] Reconcile: paridad blob ↔ SQL en muestra de 10 cuentas
- [ ] `player_legacy_id_map` completo

---

## 7. Fase 4 — Dual read + Realtime

### Objetivo

La UI lee del modelo relacional (via adapter legacy shape). Supabase Realtime actualiza pantallas sin refresh. Escritura **aún** puede ir a blob + dual write, o empezar write híbrido.

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `app/api/players/route.js` | GET: si `PLAYER_CENTRIC_READ`, agregar desde `player-service` + adapter |
| `app/api/shooting/route.js` | GET: si flag, armar payload desde sesiones SQL |
| `app/(secure)/players/page.js` | Cargar desde API (sin cambio de interfaz props) |
| `app/(secure)/shooting/page.js` | Idem |
| `components/players/PlayersModule.js` | Suscripción Realtime; refetch al evento |
| `js/main.js` | `getPlayersTracking` / pull: fetch API o Realtime según flag |
| `js/shooting-zones-heatmap.js` | `loadPayload` / save: leer API; Realtime listener |
| `js/main.js` | Eliminar `resolveSyncData` para tipos migrados en lectura |
| `app/page.js` | Bump cache scripts si aplica |
| `lib/client/player-realtime.js` | **Nuevo** helper suscripción Supabase (anon + RLS) |

### Archivos a crear

| Archivo | Propósito |
|---------|-----------|
| `lib/client/player-realtime.js` | `subscribePlayerChannel(playerId, onChange)` |
| `lib/client/supabase-browser.js` | Cliente Supabase browser (solo Realtime + RLS, sin service key) |

### Migraciones necesarias

- Verificar Realtime habilitado (Fase 0).
- Política RLS SELECT en tablas suscritas.

### Riesgos

| Riesgo | Prob. | Mitigación |
|--------|-------|------------|
| Regresión UI legacy | **Alta** | Adapter mantiene shape `{ id, name, notes_history[] }` |
| Realtime + dual write race | Media | Preferir timestamp SQL; ignorar eventos propios (echo suppression) |
| Offline legacy | Media | Cache localStorage como hoy; resync al reconectar |
| UUID vs legacy id en UI | Media | Adapter expone `id` UUID; mapa interno si hace falta |
| `ShootingPayloadEditor` desincronizado | Baja | Actualizar o marcar deprecated |

### Compatibilidad

- **Adapter de lectura:** API devuelve mismo JSON que antes.
- Flag off → comportamiento actual.
- Dominio entrenador untouched.

### Criterios de done

- [ ] Lista de jugadores idéntica pre/post en staging
- [ ] Dos browsers: editar sesión en uno → otro actualiza < 2s
- [ ] Offline: no crash; sync al volver online
- [ ] Flag rollback probado

---

## 8. Fase 5 — Cutover de escritura

### Objetivo

Todas las **escrituras** del dominio jugador van solo al modelo relacional. Blobs `players_tracking` y `shooting_heatmap` en solo lectura (backup). Invitaciones coach ↔ player operativas.

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `app/api/players/route.js` | POST: si `PLAYER_CENTRIC_WRITE`, rechazar o no-op blob; escribir SQL |
| `app/api/shooting/route.js` | Idem |
| `services/server/user-data-service.js` | No upsert blob para tipos migrados |
| `components/players/PlayersModule.js` | POST/PATCH por recurso (`/api/players/:id/...`) en lugar de array completo |
| `js/main.js` | `savePlayersTracking`, player CRUD → API granular |
| `js/shooting-zones-heatmap.js` | `savePayload` → API por sesión |
| `js/main.js` | Desactivar dual write / sync |
| `app/api/data/[type]/route.js` | Rechazar POST para tipos migrados (410 o redirect) |

### Archivos a crear

| Archivo | Propósito |
|---------|-----------|
| `components/players/InviteMemberForm.js` | UI invitación (admin) |
| `app/(secure)/invitations/accept/page.js` | Flujo aceptar invitación |

### Migraciones necesarias

Opcional: marcar filas legacy

```sql
ALTER TABLE user_app_data ADD COLUMN IF NOT EXISTS legacy_archived_at timestamptz;
-- UPDATE ... SET legacy_archived_at = now() WHERE data_type IN (...)
```

### Riesgos

| Riesgo | Prob. | Mitigación |
|--------|-------|------------|
| Pérdida writes durante cutover | Media | Ventana de mantenimiento corta; flag atómico |
| Colaboración coach-player rota | **Alta** | Probar flujo invitación end-to-end en staging |
| Legacy main.js parcialmente migrado | **Alta** | Checklist por función en main.js |
| Activity sin eventos | Baja | Verificar cada write path llama activity-service |

### Compatibilidad

- Rollback: `PLAYER_CENTRIC_WRITE=false`, reactivar dual write.
- Blobs intactos como backup.

### Criterios de done

- [ ] Ninguna fila nueva en `user_app_data` para tipos migrados
- [ ] Jugador invitado ve mismos datos que coach
- [ ] Activity feed acumula eventos
- [ ] Permisos: coach no invita; jugador admin sí
- [ ] Módulos entrenador sin regresión

---

## 9. Fase 6 — Limpieza y consolidación

### Objetivo

Eliminar adapters, deuda técnica y rutas deprecadas. UI consume API relacional nativa.

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `js/main.js` | Remover paths blob players/shooting; simplificar DataSync |
| `js/shooting-zones-heatmap.js` | IDs UUID nativos; sin payload monolítico |
| `components/players/PlayersModule.js` | API nativa; eliminar persist de array completo |
| `services/server/player-legacy-adapter.js` | Deprecar / eliminar |
| `app/api/players/route.js` | GET lista; POST crear (sin blob) |
| `app/api/sync/player-domain/route.js` | Eliminar |
| `services/server/player-domain-sync.js` | Eliminar |
| `docs/supabase-schema.sql` | Esquema consolidado |
| `docs/rfc-player-centric-architecture.md` | Marcar implementado |

### Archivos a eliminar (candidatos)

- `components/data/ShootingPayloadEditor.js` (editor JSON crudo) o reemplazar por UI real
- Scripts dual-write obsoletos

### Migraciones necesarias

- Archivar blobs (no delete): export o columna `legacy_archived_at`.
- Eventualmente eliminar check constraint types obsoletos ( **no urgente** ).

### Riesgos

| Riesgo | Prob. | Mitigación |
|--------|-------|------------|
| Eliminar adapter demasiado pronto | Media | Solo F6 tras 2+ semanas estables en F5 |
| Usuarios con cache local stale | Baja | Bump versión cache en `app/page.js` |

### Compatibilidad

- Sin blobs para dominio jugador.
- Dominio entrenador sigue igual.

### Criterios de done

- [x] Eliminados sync route y servicios dual-write
- [x] Flag `PLAYER_CENTRIC_ENABLED` consolida read/write/realtime
- [x] Documentación y `.env.local.example` actualizados
- [ ] No referencias activas a dual-write en código (blobs legacy solo con flags off)
- [ ] `004-legacy-archive.sql` ejecutado en prod (opcional, post-cutover estable)

---

## 10. Matriz de archivos por fase (referencia rápida)

| Archivo | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
|---------|---|---|---|---|---|---|---|
| `docs/sql/*.sql` | ● | | | | | | |
| `services/server/player-*.js` | | ● | ● | ● | ● | ● | ◐ |
| `services/server/user-data-service.js` | | | ● | | | ● | ◐ |
| `app/api/players/**` | | ● | ● | | ● | ● | ● |
| `app/api/shooting/**` | | ● | ● | | ● | ● | ● |
| `app/api/sync/**` | | | ● | | | | ✕ |
| `scripts/migrate-*.js` | | | | ● | | | ✕ |
| `components/players/PlayersModule.js` | | | | | ● | ● | ● |
| `js/main.js` | | | ● | | ● | ● | ● |
| `js/shooting-zones-heatmap.js` | | | | | ● | ● | ● |
| `lib/client/player-realtime.js` | | | | | ● | ● | ● |
| `app/api/plays|trainings|annual-plans` | | | | | | | — |

● = modificar/crear · ◐ = simplificar · ✕ = eliminar · — = sin cambios

---

## 11. Estrategia de compatibilidad (resumen transversal)

### Durante Fases 0–3

- Fuente de verdad usuario: **blobs**.
- Tablas SQL: copia derivada (dual write + migración).
- UI: sin cambios visibles.

### Durante Fase 4

- Fuente de verdad lectura: **SQL**.
- Fuente de verdad escritura: **blob + sync** (o SQL si se adelanta).
- Adapter garantiza shape JSON legacy.

### Durante Fase 5+

- Fuente de verdad: **SQL** lectura y escritura.
- Blobs: backup read-only.

### Reglas de aislamiento dominio entrenador

```
┌─────────────────────────────────────────────────────────┐
│  user_app_data (user_id)                                │
│  plays | trainings | annual_plans  →  SOLO entrenador   │
└─────────────────────────────────────────────────────────┘
                          ✕ nunca cruza
┌─────────────────────────────────────────────────────────┐
│  players + hijos (player_id)  →  colaborativo + RT      │
└─────────────────────────────────────────────────────────┘
```

---

## 12. Checklist pre-implementación

Antes de escribir código de Fase 0:

- [ ] Proyecto Supabase de **staging** disponible
- [ ] Backup de producción documentado
- [ ] RFC aprobado
- [ ] Este plan revisado
- [ ] Decisión F2 legacy sync: endpoint `/api/sync/player-domain` confirmada
- [ ] Decisión IDs en UI post-cutover: UUID expuesto al cliente confirmada

---

## 13. v2 (fuera de alcance, preparado en esquema)

| Feature | Preparación en v1 |
|---------|-------------------|
| Activity Feed UI | Tabla + escritura |
| Notificaciones | Tabla `notifications` |
| Permisos granulares | Tabla `player_member_permissions` |
| Videos | Tabla `player_media` |
| Informes | Tabla `player_reports` |
| Padre / physio / scout | `relationship_type` enum |
| Historial completo | Tabla `entity_revisions` (opcional F0) |

---

## 14. Aprobación

| Documento | Estado |
|-----------|--------|
| RFC arquitectura | Aprobado |
| Decisiones producto | Aprobado |
| Plan implementación | Aprobado (2026-07-05) |

| Fase 2 | ✅ Implementado (dual write + sync endpoint + legacy hook) | 2026-07-05 |
| Fase 3 | ✅ Implementado (scripts migrate + reconcile) | 2026-07-05 |
| Fase 4 | ✅ Implementado (dual read + Realtime) | 2026-07-05 |
| Fase 5 | ✅ Implementado (cutover escritura) | 2026-07-05 |
| Fase 6 | ✅ Implementado (limpieza) | 2026-07-05 |
