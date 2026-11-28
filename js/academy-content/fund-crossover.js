/*
 * Basket Lab · Fundamentos · Crossover (ficha modelo)
 *
 * Redacción original de Basket Lab en español. Las citas [S1]..[Sn] remiten a la
 * bibliografía del final, consultada directamente el 28/11/2026. Lo que no tiene cita es
 * interpretación técnica o propuesta metodológica de Basket Lab, y se marca como tal.
 *
 * Pizarras: metros sobre la cancha FIBA (aro en x = 1,575; y de 0 a 15).
 */
(function (root, factory) {
    var Cat = typeof module === "object" && module.exports ? require("../fundamentos-catalog.js") : root && root.BasketFundCatalog;
    var article = factory(Cat);
    if (typeof module === "object" && module.exports) module.exports = article;
    if (root) {
        if (root.BasketAcademy) root.BasketAcademy.register(article);
        else (root.BasketAcademyQueue = root.BasketAcademyQueue || []).push(article);
    }
})(typeof window !== "undefined" ? window : null, function (Cat) {
    "use strict";

    var VIEW = { court: "half", rotation: 90 };
    var HOOP = [1.575, 7.5];
    function O(l, x, y) { return { team: "offense", label: l, x: x, y: y }; }
    function D(l, x, y) { return { team: "defense", label: l, x: x, y: y }; }

    var sources = [
        Cat.source("cm-en", "S1", { locator: "3.2 Glossary, pág. 19 («Channelling the Dribbler») y pág. 20 («Cross Over Step»)", used: "La defensa al botador lleva baja la mano más cercana al balón para frenar el crossover. El «cross over step» es un paso cruzado por delante del cuerpo para cambiar de dirección o arrancar." }),
        Cat.source("cm-es", "S2", { locator: "3.2 Glosario de términos, pág. 19 («Dirigir al botador»)", used: "Misma idea en la versión en español: posición de frente, una mano baja para frenar el cambio de mano y otra alta para frenar el pase." }),
        Cat.source("mini-es", "S3"),
        Cat.source("cdp", "S4", { used: "Capítulo «Dribble Drive Skills» de la serie oficial, enlazado en Visualizar." })
    ];

    var boards = [
        {
            id: "uno-contra-uno",
            title: "Leer al defensor y cambiar de lado",
            kind: "interpretation",
            intro: "Una lectura simple de uno contra uno desde el ala. La pizarra muestra recorridos y espacios: no representa la técnica de las manos ni del cuerpo.",
            spec: {
                view: VIEW,
                players: { o1: O("1", 8.6, 10.2), x1: D("1", 7.6, 9.8) },
                phases: [
                    { name: "Ataque hacia la banda", note: "El atacante arranca con la mano exterior hacia la banda y obliga al defensor a desplazarse para cerrarle el camino.", ball: "o1", strokes: [["dribble", "o1", [7.2, 11.6], 0.3], ["rotation", "x1", [6.6, 11.0]]] },
                    { name: "El defensor se pasa", note: "El defensor cargó el peso hacia la banda y cerró ese lado. El camino libre ahora está del lado contrario.", zones: [{ x: 4.2, y: 6.6, w: 2.8, h: 3.4, color: "#f97316" }] },
                    { name: "Crossover y ataque al medio", note: "Cambio de mano por delante, bajo y cerca del cuerpo, y primer paso hacia el lado libre. El atacante ya está por delante del defensor.", strokes: [["dribble", "o1", [5.4, 9.0], 0.4], ["rotation", "x1", [6.2, 10.0]]] },
                    { name: "Llegada al aro o a la ayuda", note: "Con la ventaja ganada, el atacante sigue hacia el aro. Si llega una ayuda, la decisión pasa a ser de pase: ver Pase de descarga.", zones: [], strokes: [["dribble", "o1", [2.8, 8.0], 0.2], ["shot", "o1", HOOP]] }
                ]
            }
        }
    ];

    var aprender = [
        {
            id: "que-es", title: "Qué es", kind: "interpretation",
            blocks: [
                { p: "El crossover es un **cambio de mano por delante del cuerpo** mientras se dribbla. El balón pasa de una mano a la otra con un bote que cruza frente al jugador, y el ataque sigue hacia el lado contrario." },
                { p: "No es un truco: es la forma más directa de cambiar de dirección con el balón. Por eso es la base de casi todas las combinaciones (hesitation crossover, doble crossover, in & out)." }
            ]
        },
        {
            id: "para-que", title: "Para qué sirve", kind: "interpretation",
            blocks: [
                { list: ["Cambiar de dirección cuando el defensor cierra un camino.", "Atacar con la mano más lejana al defensor.", "Crear un primer paso de ventaja para llegar al aro, tirar o pasar.", "Ordenar el ataque: llevar el balón al lado donde está el espacio."] }
            ]
        },
        {
            id: "cuando", title: "Cuándo utilizarlo", kind: "interpretation",
            blocks: [
                { p: "Cuando el defensor **se compromete hacia un lado** (cargó el peso, cerró la banda o adelantó un pie) y el lado contrario queda libre." },
                { p: "Conviene evitarlo cuando el defensor está muy cerca y de frente con la mano baja del lado del cambio: justamente es la posición que el manual WABC recomienda al defensor para frenar el crossover [S1] [S2]. En ese caso es mejor alejar el balón primero (retroceso, cambio de ritmo) o usar un cambio protegido (entre las piernas, por detrás)." }
            ]
        },
        {
            id: "principios", title: "Principios técnicos", kind: "interpretation",
            blocks: [
                { steps: [
                    { title: "Bote bajo durante el cambio", text: "El balón cruza por debajo de la rodilla. Cuanto más alto, más tiempo está expuesto." },
                    { title: "Cerca del cuerpo", text: "El cambio es corto y por delante: un cruce ancho deja el balón al alcance del defensor." },
                    { title: "Cambio con el cuerpo, no solo con la mano", text: "Hombros y cadera van hacia el lado nuevo; el primer paso acompaña al balón y protege con el cuerpo." },
                    { title: "Mirada arriba", text: "Se dribbla mirando al defensor y a la cancha: el crossover se decide por lo que hace el defensor." },
                    { title: "Ritmo", text: "Un crossover a velocidad constante se lee fácil. Funciona mejor después de un cambio de ritmo o un freno." }
                ] },
                { callout: "Estos principios son la lectura técnica de Basket Lab. El manual WABC consultado no describe la técnica del crossover paso a paso; sí describe cómo lo defiende el defensor, y eso ayuda a entender cuándo usarlo [S1].", tone: "info", title: "Origen" }
            ]
        },
        {
            id: "ejecutar", title: "Cómo ejecutarlo (paso a paso)", kind: "interpretation", audience: "player",
            blocks: [
                { list: ["Dribblá con la mano derecha, bajo y a la altura de tu cadera derecha.", "Llevá al defensor hacia tu derecha con uno o dos botes.", "Empujá el balón con la parte de afuera de la mano derecha hacia tu mano izquierda, bajo y por delante.", "Recibilo con la izquierda bien abierta y seguí dribblando ya hacia la izquierda.", "Al mismo tiempo, el pie derecho da un paso cruzado hacia la izquierda: tu cuerpo queda entre el defensor y el balón.", "Seguí: el crossover sirve si después atacás. No te quedes parado a ver qué pasó."] },
                { p: "Practicalo hacia los dos lados. El lado que menos te sale es el que el defensor te va a cerrar." }
            ]
        },
        {
            id: "errores", title: "Errores frecuentes", kind: "interpretation",
            blocks: [
                { table: { head: ["Error", "Qué provoca", "Corrección"], rows: [
                    ["Cambio alto o ancho", "Robo fácil del defensor", "Bote por debajo de la rodilla y cerca del cuerpo"],
                    ["Mirar el balón", "No ver si el defensor se comprometió", "Practicar con un compañero que muestra números con los dedos"],
                    ["Cambiar sin motivo", "El defensor ya estaba en el lado nuevo", "Primero llevar al defensor; después cambiar"],
                    ["Quedarse después del cambio", "Se pierde la ventaja ganada", "Primer paso cruzado y ataque inmediato"],
                    ["Siempre a la misma velocidad", "El defensor lo anticipa", "Combinar con freno o cambio de ritmo"]
                ] } }
            ]
        },
        {
            id: "variantes", title: "Variantes", kind: "interpretation",
            blocks: [
                { list: [
                    "**Hesitation crossover:** un freno corto (amague de parada) y el cambio cuando el defensor se levanta. Antes estaba en el menú como fundamento aparte.",
                    "**Doble crossover:** dos cambios seguidos para llevar al defensor y volver. También estaba como fundamento aparte.",
                    "**In & out:** amague de cambio sin cambiar de mano. Es otro concepto, con ficha propia, porque el balón no cruza.",
                    "**Entre las piernas y por detrás:** cambios de mano protegidos por el cuerpo. Fichas propias."
                ] }
            ]
        }
    ];

    var visualizar = [
        {
            id: "esquema", title: "Esquema del crossover", kind: "interpretation",
            blocks: [
                { figure: "crossover-path", caption: "Ilustración propia de Basket Lab. Muestra el orden de las acciones, no la postura exacta." }
            ]
        },
        "uno-contra-uno",
        {
            id: "videos", title: "Video oficial relacionado", kind: "official", refs: ["S4"],
            blocks: [
                { video: "fiba-cdp-dribble-drive", purpose: "Escuchar cómo plantea FIBA/WABC el ataque con dribbling hacia el aro, que es el contexto donde el crossover tiene sentido.", observe: ["Para qué se usa el dribbling: ganar ventaja, no lucirse.", "Qué lecturas del defensor aparecen antes de cambiar de dirección.", "Cómo termina la acción: aro, tiro o pase."] },
                { callout: "No encontramos un video verificado que muestre solamente la técnica del crossover desde una fuente oficial. Preferimos no poner uno sin comprobar.", tone: "info" }
            ]
        }
    ];

    var entrenar = [
        {
            id: "progresion", title: "Progresión orientativa", kind: "method", refs: ["S3"],
            blocks: [
                { p: "Una guía para ordenar el aprendizaje, no una secuencia obligatoria. Según la edad y la experiencia se puede saltar o volver a un paso. El manual WABC de minibásquet recomienda no quedarse mucho tiempo en la técnica aislada y sumar un defensor desde temprano [S3]." },
                { table: { head: ["Etapa", "Qué se busca", "Ejercicio"], rows: [
                    ["Familiarización", "Cambiar de mano sin perder el balón", "Crossover en el lugar y caminando (ejercicio 1)"],
                    ["Ejecución y control", "Bote bajo y cerca a velocidad media", "Zigzag entre conos (ejercicio 1)"],
                    ["Variabilidad", "Cambiar de ritmo y de lado según una señal", "Zigzag con señales del entrenador (ejercicio 1, variante)"],
                    ["Oposición guiada", "Cambiar cuando el defensor se compromete", "Uno contra uno en carril (ejercicio 2)"],
                    ["Toma de decisiones", "Elegir: aro, tiro o pase", "Penetrar, descargar y cerrar 2 contra 2 (compartido con Closeout)"],
                    ["Aplicación al juego", "Usarlo dentro del juego reducido", "3 contra 3 con la regla de un crossover antes de pasar (variante del anterior)"]
                ] } }
            ]
        },
        {
            id: "solo", title: "Cómo practicar solo", kind: "method", audience: "player",
            blocks: [
                { list: ["5 minutos por día alcanzan: 30 cambios por lado en el lugar, después caminando y después trotando.", "Poné dos conos o dos zapatillas a 3 metros: llevá el balón hacia uno y cambiá antes de llegar.", "Grabate con el celular de frente: si el balón sube por encima de la rodilla, bajalo.", "Terminá siempre con un primer paso y una bandeja o un tiro corto."] }
            ]
        },
        {
            id: "consignas", title: "Consignas y correcciones", kind: "method", audience: "coach",
            blocks: [
                { list: ["«¡Abajo y cerca!»", "«¡Primero llevalo, después cambiá!»", "«¡Mirá al defensor, no al balón!»", "«¡Cambio y paso!»"] },
                { p: "Corregí de a una cosa por repetición. Primero la altura del bote, después la mirada, después el primer paso. Preguntá en vez de explicar: «¿por qué cambiaste ahí?» [S3]." }
            ]
        },
        {
            id: "compartidos", title: "Ejercicios compartidos", kind: "method",
            blocks: [
                { p: "La toma de decisiones después del crossover se entrena en un ejercicio que también trabaja el pase de descarga, el catch and shoot y el closeout. Está guardado una sola vez:" },
                { exerciseLink: { article: "fund-closeout", id: "ej-penetrar-descargar" } }
            ]
        },
        {
            id: "adaptaciones", title: "Adaptaciones según edad y nivel", kind: "method", audience: "coach",
            blocks: [
                { table: { head: ["Grupo", "Adaptación"], rows: [
                    ["Minibásquet", "Balón de tamaño reducido, juegos de bote con consignas (cambiar de mano, de velocidad, de dirección) y sin corrección técnica fina [S3]"],
                    ["U13–U15", "Agregar defensor pasivo y después activo; exigir los dos lados"],
                    ["U17 y mayores", "Combinaciones (hesitation, doble cambio), lectura del pie adelantado del defensor y continuidad con pase"]
                ] } }
            ]
        }
    ];

    var exercises = [
        {
            id: "ej-zigzag",
            name: "Zigzag de crossover entre conos",
            solo: true,
            works: ["Crossover", "Drible de avance", "Cambio de ritmo"],
            meta: { fundamento: "Crossover", fundamentos: ["crossover", "drible-avance", "cambio-ritmo"], objetivo: "Cambio de mano bajo y cerca", categories: ["Mini", "U13", "U15", "U17"], level: "Inicial", minPlayers: 1, maxPlayers: 16, minutes: [6, 10], court: "half", hoops: 0, materials: ["Balones", "Conos"], optionalMaterials: [], blockType: "fundamentos" },
            adaptations: [{ id: "sin-conos", label: "Sin conos", text: "Usar líneas de la cancha o zapatillas como referencias.", req: { materials: ["Balones"] } }],
            kind: "method",
            objective: "Cambiar de mano por delante, bajo y cerca del cuerpo, manteniendo la dirección de avance.",
            secondary: ["Mirada arriba", "Primer paso cruzado", "Los dos lados"],
            category: "Minibásquet a mayores",
            level: "Inicial",
            players: "De 1 a 16 (en filas de 4)",
            playersShort: "1 a 16 jugadores",
            duration: "6 a 10 minutos",
            space: "Media cancha",
            hoops: "0",
            materials: "Un balón por jugador y 5 conos por fila",
            organization: "Filas en la línea de fondo. Cinco conos en zigzag hasta media cancha, separados unos 3 metros.",
            development: "Cada jugador dribbla hacia el primer cono con la mano del lado del cono, hace el crossover antes de llegar y sale hacia el siguiente con la otra mano. Vuelve trotando por afuera.",
            rules: ["El cambio se hace antes del cono, no encima", "Cada cono es un cambio", "La vuelta se hace con la mano débil"],
            cues: ["«¡Abajo y cerca!»", "«¡Cambio y paso!»", "«¡Arriba la cabeza!»"],
            errors: ["Bote alto en el cambio", "Mirar el balón", "Frenar en cada cono"],
            corrections: ["Marcar una línea con cinta a la altura de la rodilla", "El entrenador muestra números con los dedos al final", "Acelerar los dos primeros botes después del cambio"],
            variants: ["Con señal: el entrenador levanta un brazo y el jugador cambia en ese momento", "Hesitation crossover en el cono central", "Doble crossover en el último cono"],
            progressions: ["Más velocidad", "Conos más juntos", "Terminar con bandeja"],
            regressions: ["Caminando", "Sin conos, en el lugar", "Balón más chico"],
            evaluation: ["Cambios por debajo de la rodilla", "Mirada arriba al final", "Sin pérdidas en la vuelta"],
            basis: "Propuesta de Basket Lab. Retoma la idea de las actividades de bote con consignas del manual WABC de minibásquet (cambiar de velocidad, dirección y mano) [S3]."
        },
        {
            id: "ej-carril",
            name: "Uno contra uno en carril",
            works: ["Crossover", "Contención del dribbling", "Desplazamiento defensivo"],
            meta: { fundamento: "Crossover", fundamentos: ["crossover", "contencion", "desplazamiento"], objetivo: "Cambiar cuando el defensor se compromete", categories: ["U13", "U15", "U17", "Mayores"], level: "Intermedio", minPlayers: 2, maxPlayers: 16, minutes: [8, 12], court: "full", hoops: 0, materials: ["Balones", "Conos"], optionalMaterials: [], blockType: "fundamentos" },
            adaptations: [{ id: "media-cancha", label: "En media cancha", text: "Carriles de 14 metros, ida y vuelta cambiando roles.", req: { court: "half" } }],
            kind: "method",
            refs: ["S1"],
            objective: "Usar el crossover en el momento en que el defensor cierra un lado, dentro de un espacio limitado.",
            secondary: ["Leer al defensor", "Proteger con el cuerpo", "Defensa: mano baja del lado del cambio"],
            category: "U13 a mayores",
            level: "Intermedio",
            players: "Parejas; hasta 8 parejas en carriles",
            playersShort: "2 a 16 jugadores",
            duration: "8 a 12 minutos",
            space: "Cancha completa dividida en carriles de 4 a 5 metros",
            hoops: "0",
            materials: "Un balón por pareja y conos para marcar carriles",
            organization: "Parejas en la línea de fondo, una por carril. El atacante con balón, el defensor enfrente a un brazo.",
            development: "El atacante tiene que cruzar la línea de media cancha (o la de fondo contraria) sin salir del carril. El defensor intenta frenarlo de frente. Cada intento vale un punto si el atacante llega. Cambian roles en cada viaje.",
            rules: ["No se puede salir del carril", "El defensor empieza pasivo (solo desplazamiento) y después activo", "Si el defensor toca el balón, se reinicia"],
            cues: ["Atacante: «¡Primero llevalo!»", "Atacante: «¡Cambio cuando se pasa!»", "Defensor: «¡Mano baja del lado del cambio!» [S1]"],
            errors: ["Cambiar a la primera, sin llevar al defensor", "Cambio a la altura del defensor (dentro de su alcance)", "Defensor cruzando los pies"],
            corrections: ["Exigir dos botes hacia un lado antes del cambio", "Cambiar a dos metros del defensor", "Defensor: el pie que da el paso va primero en la dirección del movimiento"],
            variants: ["Solo con la mano débil", "Con hesitation antes del cambio", "Defensor con las manos atrás (solo pies)"],
            progressions: ["Carril más angosto", "Tiempo límite de 6 segundos", "Terminar en el aro con bandeja contra el defensor"],
            regressions: ["Defensor pasivo todo el ejercicio", "Carril más ancho", "Caminando"],
            evaluation: ["Cambios hechos cuando el defensor ya se comprometió", "Intentos ganados por lado", "Pérdidas de balón"],
            basis: "Propuesta de Basket Lab. La consigna defensiva viene del glosario WABC (mano baja del lado del botador para frenar el crossover) [S1]."
        }
    ];

    var evaluar = [
        {
            id: "criterios", title: "Criterios de observación", kind: "interpretation",
            blocks: [
                { checklist: ["El bote cruza por debajo de la rodilla", "El cambio es cerca del cuerpo y por delante", "Mira al defensor durante el cambio", "Cambia cuando el defensor se comprometió, no antes", "El primer paso acompaña al balón hacia el lado nuevo", "Lo hace hacia los dos lados", "Después del cambio, ataca (aro, tiro o pase)"] },
                { p: "Las casillas se guardan solo en este dispositivo. Sirven para observar, no para calificar." }
            ]
        },
        {
            id: "indicadores", title: "Indicadores de progreso", kind: "method",
            blocks: [
                { table: { head: ["Nivel", "Lo hace…"], rows: [
                    ["Inicial", "En el lugar y caminando, con las dos manos, sin perder el balón"],
                    ["Intermedio", "A velocidad de juego contra un defensor pasivo, eligiendo el momento"],
                    ["Avanzado", "Contra defensa activa, combinado con cambios de ritmo y seguido de una buena decisión"]
                ] } }
            ]
        },
        {
            id: "objetivos", title: "Relación con los objetivos del jugador", kind: "method", audience: "coach",
            blocks: [
                { p: "Si un jugador tiene un objetivo de manejo de balón en **Jugadores Lab**, estos criterios sirven como referencia para la observación. La evaluación la carga siempre el entrenador: ver la ficha o el video no cambia ninguna evaluación ni marca un objetivo como cumplido." },
                { p: "El progreso educativo (qué leyó o estudió el jugador) es distinto del rendimiento deportivo (lo que hace en la cancha). Basket Lab los guarda por separado." }
            ]
        }
    ];

    return {
        id: "fund-crossover",
        conceptId: "crossover",
        sectionId: "fundamento_crossover",
        title: "Crossover",
        subtitle: "Cambio de mano por delante del cuerpo para cambiar de dirección y atacar el lado libre.",
        crumbs: "Basket Lab · Fundamentos · Dominio del balón · Cambios de dirección",
        sectionLabel: "Fundamentos · Dominio del balón",
        playCategory: "Fundamentos",
        meta: ["Dominio del balón", "Nivel inicial", "1 pizarra", "1 video oficial", "2 ejercicios + 1 compartido"],
        updated: "2026-11-28",
        tabOrder: ["aprender", "visualizar", "entrenar", "evaluar", "fuentes"],
        modes: true,
        quickJumps: [
            { label: "Ir a los ejercicios", tab: "entrenar", section: "ej-zigzag" },
            { label: "Ver esquema y video", tab: "visualizar" }
        ],
        ficha: {
            en: "Crossover dribble",
            definition: "Cambio de mano con un bote que cruza por delante del cuerpo, seguido de un ataque hacia el lado contrario.",
            objective: "Cambiar de dirección y ganar un primer paso cuando el defensor cierra un lado.",
            level: "Inicial (base de las combinaciones de dribbling).",
            prereqs: ["Drible de control con las dos manos", "Drible de avance"],
            applications: ["Uno contra uno desde el perímetro", "Atacar a un defensor que llega en closeout", "Cambiar el lado del ataque en transición"],
            media: "1 video oficial de FIBA relacionado (sin marcas de tiempo), 1 esquema propio y 1 pizarra.",
            figure: "crossover-path",
            modeIntro: {
                player: "**Modo jugador:** qué hacer, cuándo usarlo y cómo practicarlo solo.",
                coach: "**Modo entrenador:** cómo enseñarlo, consignas, adaptaciones por edad y criterios de evaluación."
            }
        },
        tabs: { aprender: aprender, visualizar: visualizar, entrenar: entrenar, evaluar: evaluar },
        boards: boards,
        exercises: exercises,
        sources: sources,
        unavailableSources: Cat.unavailable(["wabc-online", "l1-es", "cm-glosario-resto"])
    };
});
