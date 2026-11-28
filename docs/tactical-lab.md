# Laboratorio táctico (Tactical Lab)

"Entendé el juego." Reemplaza los grupos Ataques / Defensas en zona / Presión del menú por un laboratorio
con cinco áreas: Principios del juego, Ataque colectivo, Defensa colectiva, Transiciones y Situaciones especiales,
más las herramientas Lecturas de juego, Simuladores y Mi libro de juego.

## Fase 0 · Auditoría (resumen)

- Contenido táctico previo: guías en `js/academy-content/` (spacing, pick-and-roll, zona-2-3, zona-3-2, zona-1-3-1,
  presion, superioridades, desafios) y páginas antiguas dentro de `js/main.js` (`vs23`, `vs32`, `vs131`, `vs41`,
  `abierto`, `cerrado`, `press221`, `doubleteam`, `fullcourt`, `zone23_defense`, `spacing_ataque`, `pick_and_roll`)
  más hubs (`ataques_hub*`, `defensas_zona_hub*`, `presion_hub*`).
- Las páginas `abierto`, `cerrado`, `press221` y `doubleteam` tenían 14 videos embebidos que no eran de básquet
  (canciones pop, verificado por oEmbed; uno no existía). Se quitaron y quedó una nota. No se agregó ningún video nuevo sin verificar.
- Motores reutilizados: `BasketAcademy` (fichas con pestañas, citas [S#] validadas), `BasketSim` (escenarios con
  validación de posiciones y responsabilidades), `BasketBoard` (pizarra), catálogo de fuentes y de videos de Fundamentos.

## Arquitectura

| Archivo | Rol |
| --- | --- |
| `js/tactical-catalog.js` | Áreas, familias, 17 contenidos, ids antiguos, rutas (`tactical_lab`, `tl_area_<id>[__fam]`, `tl_<entry>`), buscador local |
| `js/tactical-lab.js` | Portada, páginas de área, lista de simuladores, cabecera fotográfica de las fichas |
| `js/tactical-media.js` | Fotos del laboratorio (WebP, generadas por `scripts/optimize-tactical-images.py`) |
| `js/academy-content/tl-*.js` | Fichas nuevas: ventajas, 5 Out, ataque contra 2-3 (con simulador), drop, balance defensivo |
| `css/tactical-lab.css` | Solo las piezas propias; el resto reutiliza `fa-*` de Fundamentos |

- Ids antiguos: los hubs redirigen a su área; las páginas antiguas se siguen mostrando como siempre, con un aviso
  que lleva a la ficha nueva cuando existe.
- Pestañas: Comprender / Visualizar / Experimentar / Enseñar / Variantes / Fuentes (ids internos sin cambios).
  "Variantes" solo aparece si la ficha la tiene.
- Sin SQL nuevo: favoritos y lectura usan `learning_progress`; "Mi libro de juego" reutiliza las jugadas guardadas.
- Sin llamadas a Gemini: navegación, fichas, buscador y simuladores son locales. El botón del asistente no se muestra
  en las fichas `tl-*` porque no están en el registro del servidor.

## Fuentes

Todas las fuentes citadas se consultaron el 28/11/2026 (WABC, FIBA): L1 2.1.2, 2.1.4, 2.1.5, 1.2.5; L2 1.2.1, 2.1.5,
2.4.4; L3 1.2.2. Marcadas como no disponibles (no se pudieron leer, no se citan): L2 1.2.4 (defensa del pick and roll),
el resto de L2 2.4 (ataque contra zona) y el material de transición defensiva. "Drop" no aparece nombrado en las
páginas WABC consultadas; la ficha lo dice.

## Fotos

| Espacio | Foto original |
| --- | --- |
| Portada | entrenamiento-tactico.png (igual a "Entrenamiento táctico de baloncesto-1 - copia.png") |
| Principios del juego | charla-tactica.png |
| Ataque colectivo | partido-accion.png |
| Defensa colectiva | defensa.png |
| Transiciones | contraataque.png |
| Situaciones especiales | tiempo-muerto.png |

Todas llevan la nota "Imagen ilustrativa generada con IA. No es una demostración táctica."

## Límites conocidos

- El simulador es un modelo educativo con tres criterios defensivos, no una simulación universal.
- Situaciones especiales todavía no tiene fichas (muestra los temas previstos como texto, sin botones).
- Zoom de la pizarra pendiente.

## Próximas fases

Fichas de juego sin balón y bloqueos indirectos, coberturas del pick and roll (hedge, switch, ICE) con simulador,
transición ofensiva, situaciones especiales (saques, final de partido) y el Playbook propio (Fase 6, con tabla nueva y RLS).
