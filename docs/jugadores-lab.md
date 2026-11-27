# Jugadores Lab y Shooting Lab: desarrollo y seguimiento de jugadores

Documentación técnica del sistema de desarrollo de jugadores, construido en seis etapas (PR #13 a #18).
Para cada etapa: qué tablas usa, dónde está el código, qué reglas cumple y cómo se verifica.

## Mapa rápido

| Pantalla | Ruta | Componentes | Lógica (servidor) |
|---|---|---|---|
| Shooting Lab | `/shooting` | `components/shooting-lab/*` | `lib/shooting/{model,court,lab-core,dashboard}.js` |
| Plantel, perfil, comparar, asistencia | `/players` (`?player=`, `?view=compare`, `?view=attendance`) | `components/player-dev/*` | `lib/player-dev/core.js` y `*-core.js` |
| Informe para imprimir / PDF | `/players?view=report&id=` | `ReportPrint.js` | `reports-core.js` |

Todas las rutas de API están en `app/api/shooting-lab/*` y `app/api/player-dev/*` y pasan por `withLabUser`
(`app/api/shooting-lab/_helpers.js`), que exige sesión iniciada. Las rutas usan la clave de servicio de
Supabase (`services/server/*`), así que **cada permiso se verifica en código** (`requireAccess` con
`viewer` / `editor` / `admin`), además de las políticas RLS para el acceso directo.

Patrón de código: `lib/player-dev/*-core.js` recibe el cliente de base de datos por parámetro (`db`) y se
prueba con `tests/helpers/fake-supabase.mjs`, sin red. `services/server/player-dev-service.js` lo conecta
con Supabase y exige el modo relacional (`PLAYER_CENTRIC_ENABLED`). Las funciones puras (cálculos) están en
`lib/player-dev/{model,goals,plan,insights}.js` y `lib/shooting/model.js`.

## Migraciones (en orden)

Todas son **no destructivas**, se pueden correr dos veces y tienen verificación y reversión (la reversión
se niega si ya hay datos nuevos). Se corren a mano en Supabase → SQL Editor.

| SQL | Etapa | Qué agrega |
|---|---|---|
| `011-shooting-lab.sql` | 1 | Estado y modo de registro de `shooting_sessions`; `shooting_entries` (lanzamientos por jugador o colectivos, con anulación) |
| `012-player-development.sql` | 2 | `assessment_criteria`, `player_assessments`, `player_stat_records`, `teams`, `team_players` |
| `013-goals-notes.sql` | 3 | Objetivos medibles (columnas opcionales en `player_goals`), `player_goal_checkins`, tipo/visibilidad/vínculo en `player_notes` |
| `014-player-plan.sql` | 4 | `training_routines`, `player_plan_items`, `player_attendance` |
| `015-player-reports.sql` | 5 | Estado y período en `player_reports` (borrador / compartido / archivado) |
| `016-player-media-storage.sql` | 6 | `photo_path` / `shield_path` en `players` y bucket privado `player-media` |

Si el código llega antes que la migración, la pantalla correspondiente avisa «falta correr 0XX» y el resto
sigue funcionando (errores `*_not_installed`).

## Reglas de datos (por qué el sistema se comporta así)

- **Nada se inventa.** Cada número sale de un registro. Con muestra chica se dice «muestra insuficiente»
  (mínimo 20 lanzamientos por zona; cada objetivo puede definir el suyo).
- **Lo grupal no se atribuye a individuos.** Una sesión histórica con varios participantes no suma a nadie;
  solo cuentan los lanzamientos registrados para ese jugador (`shootingDays` en `goals.js`).
- **Entrenamiento y competencia van separados** (sesiones de tiro vs. planillas de partido).
- **Lo planificado no es lo realizado.** `player_plan_items` nunca mueve un objetivo: la medición
  (`measureGoal`) usa solo sesiones, partidos, evaluaciones y mediciones registradas.
- **Las evaluaciones subjetivas no cambian solas.** El 3 por defecto del sistema anterior no cuenta como
  evaluación; los valores viejos se confirman a mano en Fundamentos.
- **Los objetivos no se cumplen solos.** La app avisa cuando la meta se alcanzó con muestra suficiente; el
  entrenador lo confirma.
- **El planificador existente se lee, no se escribe.** Los entrenamientos viven en `user_app_data`
  (`trainings`); el plan y la asistencia guardan su id (`training_ref`) y una etiqueta.

## Permisos y privacidad

- Acceso por jugador en `player_members` (`viewer` < `editor` < `admin`), con `has_player_access` en RLS.
  Elegir un rol de relación (padre, ayudante…) no da permisos por sí solo.
- Un id ajeno responde como «inexistente» (404), no como «prohibido»: no revela si existe.
- **Notas privadas** y **informes en borrador**: solo los ve y edita su autor (RLS 013 y 015, y filtro en
  el servidor porque usa la clave de servicio).
- **Fotos y escudos**: bucket privado; el navegador recibe enlaces firmados que vencen en 1 hora. Nunca se
  hacen públicos.
- **Asistente IA** (Gemini): se usa el Asistente existente (`lib/server/assistant/*`: mismo modelo, mismas
  instrucciones base y mismo límite de consultas). Solo se consulta cuando el entrenador pregunta, y se envía
  un resumen sin nombre, equipo, fecha de nacimiento ni contactos (`digestToText` en `insights.js`). Las
  notas se envían solo si el entrenador lo marca, solo las compartidas y con el nombre reemplazado. El
  botón «Ver qué se envía» muestra el texto exacto.

## Imágenes (etapa 6)

- Las imágenes nuevas se achican en el navegador (320 px foto, 160 px escudo; webp si el navegador lo
  admite) y se suben a `player-media/<player_id>/<tipo>-<fecha>.<ext>` (`media-core.js`). Se verifica byte a
  byte antes de registrar la ruta.
- **Migración de imágenes viejas** (base64 dentro de `players`): desde el plantel, «Datos del sistema
  anterior» → «Copiar a Storage». Copia, verifica y guarda la ruta; **no borra** el base64. Después,
  «Liberar copias viejas» vuelve a verificar cada archivo y solo entonces vacía el campo viejo.
- El plantel ya no descarga el base64 de los jugadores con la foto en Storage (era la mayor parte del peso
  de la respuesta).
- Plan gratuito de Supabase: 1 GB de Storage; una foto de 320 px en webp pesa 15 a 30 KB.

## Pruebas

`npm test` corre todas las pruebas (Node test runner, sin red). Por área:

| Archivo | Cubre |
|---|---|
| `tests/shooting-*.test.mjs` | Modelo de zonas, sesiones, lanzamientos, anulación, permisos de Shooting Lab |
| `tests/player-dev*.test.mjs` | Evaluaciones, estadísticas, equipos, perfil |
| `tests/player-goals.test.mjs` | Objetivos medibles, mediciones, notas privadas, comparación |
| `tests/player-plan.test.mjs` | Planificador (solo lectura), rutinas, plan, asistencia |
| `tests/player-reports.test.mjs` | Resumen anonimizado, señales, informes, Asistente con Gemini simulado |
| `tests/player-media.test.mjs` | Subida, enlaces firmados, migración y liberación verificada de imágenes |
| `tests/player-collaboration.test.mjs` | Lector / editor / admin / sin acceso en todas las secciones |

Compilación: `SUPABASE_URL=https://example.supabase.co SUPABASE_ANON_KEY=dummy npx next build`.

## Recorrido de aceptación

1. Shooting Lab → Nueva sesión con tres jugadores.
2. Registrar lanzamientos distintos para cada jugador, y series completas.
3. Ver resultados individuales y colectivos; finalizar la sesión.
4. Jugadores → abrir un jugador → Lanzamiento y Evolución.
5. Objetivos → «+ Objetivo» medible (por ejemplo % en triple de esquina) → ver la evidencia vinculada.
6. Entrenamientos → «Asignar trabajo» → ejercicio de la biblioteca o plan de tiro sugerido, vinculado al
   objetivo y a un entrenamiento del planificador. Marcarlo realizado y vincular la sesión.
7. Informes → Análisis → preguntar al Asistente IA.
8. Informes → «+ Nuevo informe» → revisar, editar, compartir → «Imprimir / PDF».

## Pendiente fuera de estas etapas

- Unificar la navegación de toda la app (menú del SPA y páginas nuevas), que se hace en otro hilo.
- Borrar definitivamente datos del sistema anterior: solo cuando el entrenador lo decida y después de
  verificar (la app nunca lo hace sola).
