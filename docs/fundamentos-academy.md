# Fundamentos · Academia (etapa 1, primera entrega)

Este documento explica cómo quedó organizada la sección **Fundamentos**, qué se encontró en
la auditoría, qué se decidió y qué queda pendiente.

## 1. Auditoría de lo que había

| Pieza | Dónde | Estado encontrado |
|---|---|---|
| Contenido | `js/fundamentos-data.js` (`window.FUNDAMENTOS_CONTENIDO`) | 103 fichas con ventajas, desventajas y momentos convenientes. Sin fuentes, sin ejercicios, sin evaluación. |
| Menú interno | `FUNDAMENTOS_CATEGORY_VIEWS` en `js/main.js` | 8 categorías, 29 subcategorías, 91 enlaces (algunos repetidos). |
| Menú lateral | `index.html` | Árbol de 3 niveles con 91 entradas y emojis numerados. |
| Videos | 1 video (Drible estático, canal BasketLab) | Insertado con `youtube.com/embed` y carga inmediata (conexión con YouTube al abrir la ficha). |
| Ficha | Rama `fund_*` de `loadContent` | Una sola página plana: tres listas y, a veces, un video. |
| Fichas sin enlace | 13 entradas de `fundamentos-data.js` | No aparecían en ningún menú (drible en velocidad, cambio de ritmo, transición, retroceso, escape, etc.). |

### Duplicaciones y solapamientos

| Caso | Tipo | Decisión |
|---|---|---|
| Pocket pass (pases bajo presión y pick and roll) | Duplicación real: el mismo id en dos menús | Una ficha, relacionada con pase y pick and roll |
| Floater / Floater finish / Tear drop | Duplicación real | Una ficha (Finalizaciones), también en Lanzamiento |
| Runner | Variante (sin frenar) | Variante del Floater |
| Up and under / Up and under (poste) / Step through | Mismo movimiento | Una ficha en Poste; step through como variante lejos del poste |
| Spin move / Reverse dribble / Spin escape / Spin finish | Mismo gesto con aplicaciones distintas | Una ficha «Reverso con dribbling» con variantes |
| Spin move en el poste | Comparte nombre pero es otro movimiento | Ficha propia, relacionada |
| Fadeaway / Fadeaway (poste) | Mismo tiro, dos puntos de partida | Una ficha con variante de poste |
| Pull up / One dribble / Two dribble | Mismo tiro, cambia la cantidad de botes | Una ficha con variantes |
| Reverse layup / Reverse finish | Duplicación real | Una ficha |
| Bandeja derecha / izquierda | Misma técnica en espejo | Una ficha (modelo) con dos variantes |
| Spot up / Off screen shot | Formas de tirar desde la recepción | Variantes de Catch and shoot |
| Drible alto de avance / Drible en velocidad | Duplicación real | Una ficha; transición como variante |
| Retreat dribble / Pull back dribble | Duplicación real | Una ficha |
| Skip pass / Skip al lado débil | Duplicación real | Una ficha |
| Contener drible / Cortar penetración | Mismo objetivo en dos momentos | Una ficha con variante |
| Inside / Outside hand finish | Una misma lectura con dos respuestas | Una ficha «Elección de mano al finalizar» |
| Hesitation crossover / Double crossover | Combinaciones del crossover | Variantes del Crossover |
| Salida abierta / Salida directa | Posible sinónimo | **Se mantienen separadas** y se marca como pendiente de validar |

Resultado: **103 fichas antiguas → 75 conceptos**, sin perder contenido. Cada id antiguo
sigue funcionando y muestra su contenido (como ficha principal o como variante).

## 2. Modelo de contenidos

`js/fundamentos-catalog.js` (`window.BasketFundCatalog`):

- **Áreas** (8) con sus bloques internos, revisados sobre la propuesta inicial.
- **Conceptos**: una ficha principal por concepto con nombre, nombre en inglés, nombres
  alternativos, área y bloque principal, otras áreas donde aparece (`also`), nivel,
  habilidades, prerrequisitos, relacionados, variantes (con su id antiguo) y la explicación
  de cada fusión o separación.
- **Compatibilidad**: `resolve(id)` acepta ids nuevos (`fundamento_<id>`, `fund_area_<id>`)
  y antiguos (`fund_*`, `fund_cat_*`, subcategorías). Los favoritos y enlaces viejos siguen
  funcionando.
- **Buscador y filtros**: puros y probados (área, habilidad, dificultad, con video, con
  ejercicios, favoritos, fichas completas; sin acentos; español e inglés).
- **Bibliografía compartida** (`SOURCES`, `UNAVAILABLE`): las fichas toman las fuentes de un
  solo lugar.

Fichas completas: artículos de `BasketAcademy` en `js/academy-content/fund-*.js`, con
pestañas Aprender · Visualizar · Entrenar · Evaluar · Fuentes, modo jugador/entrenador,
accesos directos a ejercicios, ejercicios compartidos entre fichas y origen de cada sección
(fuente oficial, interpretación técnica, propuesta metodológica).

### Por qué no se pasó a React todavía

La sección vive dentro de la SPA (`loadContent`), igual que el planificador, la pizarra y
la biblioteca de ejercicios. Moverla a React ahora obligaba a reconstruir esas integraciones
o a duplicarlas. Los módulos nuevos son independientes de `main.js` (funciones puras +
render), así que se pueden envolver en un componente React más adelante sin reescribir el
contenido.

## 3. Videos

`js/video-catalog.js` (`window.BasketVideos`): un registro por video, relacionado con varios
fundamentos, con canal, institución, idioma, estado de disponibilidad, estado de inserción,
fecha y método de comprobación, licencia, y si el contenido se revisó.

Reglas aplicadas:

- Solo videos comprobados. «Comprobado» = oEmbed de YouTube respondió 200 (existe, es
  público, permite inserción). **No** se revisó el contenido minuto a minuto, y la ficha lo
  dice. Por eso no hay marcas de tiempo.
- El reproductor se carga recién cuando la persona lo pide, desde
  `youtube-nocookie.com` (privacidad mejorada), sin reproducción automática y sin enviar
  datos del jugador. La privacidad mejorada reduce, pero no elimina, el tratamiento de datos
  por parte de YouTube: la ficha no lo presenta como garantía.
- Si un video se elimina o bloquea la inserción, se muestra un mensaje y el enlace a la
  fuente original; nunca un reproductor vacío.
- Licencia desconocida = derechos reservados; solo inserción con el reproductor oficial.

Comprobación: `node scripts/check-media-links.mjs` (manual o programada, nunca por visita).

### Menores de edad

Basket Lab puede usarse con jugadores menores. Con esta entrega: no hay carga de YouTube sin
acción expresa, no se envían datos del jugador, y los videos elegidos son clínicas oficiales
de FIBA. Pendiente para la titular del sitio: decidir si el sitio se declara «dirigido a
niños» ante YouTube y revisar los Términos de YouTube API Services y su política para
contenido infantil; es una decisión legal que no tomamos desde el código.

## 4. Qué queda pendiente

- Etapa 2: más videos (buscar material oficial en español; revisar contenido y marcas de
  tiempo), job programado de comprobación.
- Etapa 3: renovar el resto de los 71 conceptos con el modelo de las 4 fichas; validar con
  las fuentes que no se pudieron abrir (manual WABC nivel 1, resto del glosario, reglamento
  art. 25).
- Etapa 4: desde una ficha, elegir jugador autorizado, vincular a un objetivo, registrar una
  observación (Jugadores Lab). Hoy: «Añadir al entrenamiento», favoritos, abrir pizarra y
  copia editable ya funcionan con el planificador existente.
- Sumar las fichas al contexto del Asistente IA (no se tocó la integración de Gemini).
