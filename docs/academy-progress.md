# Basket Lab Academy · progreso de aprendizaje y desafíos

## Qué se guarda

El progreso usa el tipo `learning_progress` de `user_app_data`, que ya existe (migración 008). La Etapa 7 no necesita SQL nuevo. Cada elemento del arreglo tiene un `id` y se combina por `id` al sincronizar entre dispositivos.

| Elemento | `id` | Campos |
|---|---|---|
| Guía | `<articleId>` (por ejemplo `zona-2-3`) | `favorite`, `studied`, `studiedAt`, `tab`, `section` (última lectura) |
| Ejercicio favorito | `ex:<articleId>:<exerciseId>` | `favorite` |
| Desafío | `ch:<challengeId>` | `kind: "challenge"`, `articleId`, `choice`, `verdict`, `attempts`, `firstChoice`, `firstVerdict`, `completedAt`, `lastAt` |

Todos llevan `updated_at`. `verdict` es una de `best`, `valid`, `risky` o `poor` (Recomendada, Válida, Arriesgada, No recomendada). Un desafío cuenta como resuelto si la última respuesta es `best` o `valid`.

## Dónde está el código

- `js/challenges.js`: modelo, validación, evaluación, resumen del progreso y pantallas (desafío, lista y «Mi progreso»). Las funciones puras se prueban en `tests/challenges.test.mjs`.
- `js/academy-content/desafios.js`: los desafíos. Cada uno usa una situación del simulador de una guía, sus pizarras y sus fuentes. `validateChallenge` rechaza fuentes que la guía no tiene, situaciones o pizarras inexistentes y desafíos sin al menos una respuesta incorrecta.
- `js/main.js`: secciones `desafios_tacticos`, `mi_progreso` y `desafio_<id>`, y el puente con `learning_progress`.

## Cómo agregar un desafío

1. Elegí una situación que ya exista en el simulador de la guía (`variant` y `position`). Si hace falta mostrar el momento anterior a la respuesta, usá `override` para mover jugadores o el balón y `arrows` para dibujar el pase o el corte.
2. Escribí al menos tres opciones. Si hay más de una solución razonable, marcá varias como `best` o `valid` y explicá en el análisis cuándo conviene cada una.
3. Citá solo fuentes de la bibliografía de esa guía (`[S1]`...).
4. Corré `npm test`.

## Asignación futura de contenidos a jugadores (no implementado)

El modelo está preparado para que el entrenador asigne guías y desafíos, pero hoy no hay ninguna pantalla ni botón para hacerlo. Una propuesta para cuando se implemente:

- Una tabla nueva `academy_assignments` (`id`, `coach_id`, `player_id`, `item_type` = `article` o `challenge`, `item_id`, `due_date`, `created_at`), con RLS para que el entrenador vea y cree las suyas y el jugador vea solo las propias. Iría en `docs/sql/` con el número siguiente.
- El jugador guardaría su progreso con los mismos `id` de esta tabla (`<articleId>`, `ch:<challengeId>`), de modo que `summarizeProgress` sirva tal cual para mostrarle al entrenador el avance de cada jugador.
- Los temas pendientes sumarían primero lo asignado y todavía no hecho.
- La validación de permisos (que el jugador pertenezca al equipo del entrenador) tiene que hacerse en el servidor, igual que en el dominio de jugadores.
