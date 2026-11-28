/*
 * Basket Lab · Fundamentos · Bandeja (ficha modelo)
 *
 * Redacción original de Basket Lab en español. Las citas [S1]..[Sn] remiten a la
 * bibliografía del final, consultada directamente el 28/11/2026. La regla de pasos
 * (art. 25 del reglamento FIBA) no se resume acá porque no pudimos leer su texto completo.
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
        Cat.source("cdp", "S1", { used: "Capítulo oficial «Finishing Skills», enlazado en Visualizar." }),
        Cat.source("mini-es", "S2"),
        Cat.source("cm-es", "S3", { locator: "2.3 Infracciones, pág. 9 (pie de pivote)", used: "La explicación general del pie de pivote y de cuándo debe salir el balón de la mano. Para el conteo de pasos en una bandeja remitimos al reglamento oficial." })
    ];

    var boards = [
        {
            id: "llegada-ala",
            title: "Llegada al aro desde el ala",
            kind: "interpretation",
            intro: "Recorrido de una bandeja por la derecha desde el ala, con el defensor que persigue. La pizarra muestra el camino y el lado del aro, no los apoyos.",
            spec: {
                view: VIEW,
                players: { o2: O("2", 7.4, 2.4), x2: D("2", 7.0, 3.6) },
                phases: [
                    { name: "Ventaja en el ala", note: "El atacante ganó medio cuerpo al defensor hacia la línea de fondo.", ball: "o2", strokes: [["dribble", "o2", [4.2, 4.2], 0.3], ["move", "x2", [4.8, 5.0]]] },
                    { name: "Ángulo hacia el tablero", note: "Último dribbling para entrar con ángulo de 45 grados al tablero, con el cuerpo entre el defensor y el balón.", strokes: [["dribble", "o2", [2.4, 5.6], 0.2], ["move", "x2", [3.0, 6.4]]], zones: [{ x: 1.0, y: 5.0, w: 1.6, h: 1.6, color: "#f97316" }] },
                    { name: "Finalización", note: "Bandeja con la mano derecha, la más lejana al defensor que llega desde el centro.", zones: [], strokes: [["shot", "o2", HOOP]] }
                ]
            }
        }
    ];

    var aprender = [
        {
            id: "que-es", title: "Qué es", kind: "interpretation",
            blocks: [
                { p: "La bandeja es la **finalización cerca del aro en carrera**: después del último dribbling (o de recibir en movimiento) el jugador da dos apoyos, despega con un pie y deja el balón en el aro, normalmente contra el tablero." },
                { p: "Antes había dos fichas, «Bandeja derecha» y «Bandeja izquierda». Es la misma técnica en espejo y se entrena con las dos manos: ahora es una sola ficha con las dos variantes." }
            ]
        },
        {
            id: "para-que", title: "Para qué sirve", kind: "interpretation",
            blocks: [
                { list: ["Convertir la ventaja de una penetración o de un contraataque en puntos.", "Terminar lejos del defensor usando el cuerpo y la mano más alejada.", "Es la base de las finalizaciones más complejas: reversa, eurostep, floater, con contacto."] }
            ]
        },
        {
            id: "cuando", title: "Cuándo utilizarla", kind: "interpretation",
            blocks: [
                { p: "Cuando se llega al aro con ventaja o en paralelo con el defensor. Si el defensor ya está esperando debajo del aro, aparecen otras opciones: floater, reversa, pasar o parar en un tiempo." }
            ]
        },
        {
            id: "principios", title: "Principios técnicos", kind: "interpretation",
            blocks: [
                { steps: [
                    { title: "Último dribbling con intención", text: "Con la mano del lado por el que se ataca y alejado del defensor." },
                    { title: "Dos apoyos", text: "Por la derecha: pie derecho, pie izquierdo y despegue con el izquierdo. Por la izquierda: en espejo." },
                    { title: "Despegue hacia arriba", text: "El último paso es más corto para convertir la carrera en salto vertical." },
                    { title: "Mano lejana al defensor", text: "Por la derecha, mano derecha; el cuerpo y el brazo libre protegen." },
                    { title: "Tablero como aliado", text: "Desde el costado, apuntar al ángulo superior del cuadro del lado de la bandeja." }
                ] },
                { figure: "bandeja-steps", caption: "Ilustración propia de Basket Lab. Bandeja por la derecha vista desde arriba." },
                { callout: "Sobre cuántos pasos se permiten y cómo se cuentan, consultá el reglamento FIBA (art. 25). No lo resumimos porque no pudimos leer el texto completo del artículo; ver «Fuentes no consultadas». La idea general de pie de pivote está explicada en el manual WABC [S3].", tone: "warn", title: "Reglamento" }
            ]
        },
        {
            id: "ejecutar", title: "Cómo hacerla (paso a paso)", kind: "interpretation", audience: "player",
            blocks: [
                { list: ["Atacá con el balón en la mano derecha si vas por la derecha.", "Tomá el balón con las dos manos mientras apoyás el pie derecho.", "Paso con el izquierdo, más corto, y saltá hacia arriba con ese pie.", "Subí el balón protegido y dejalo con la mano derecha en el ángulo del cuadro.", "Por la izquierda, todo al revés: izquierdo, derecho y despegue con el derecho; mano izquierda.", "Practicá las dos manos por igual: el defensor te va a cerrar tu mano buena."] }
            ]
        },
        {
            id: "errores", title: "Errores frecuentes", kind: "interpretation",
            blocks: [
                { table: { head: ["Error", "Qué provoca", "Corrección"], rows: [
                    ["Pies cambiados (despegar con el pie del lado de la mano)", "Bandeja incómoda y bloqueable", "Ritmo «derecha-izquierda-arriba» por la derecha"],
                    ["Saltar hacia adelante", "Pasarse del aro o cargar", "Último paso más corto, salto hacia arriba"],
                    ["Usar siempre la mano buena", "Bandeja tapada por el lado débil", "Series con la mano débil"],
                    ["Balón bajo y lejos del cuerpo", "Robo o tapón", "Subir el balón protegido con las dos manos"],
                    ["No mirar el tablero", "Tiros sin referencia", "Señalar el ángulo del cuadro antes de empezar"]
                ] } }
            ]
        },
        {
            id: "variantes", title: "Variantes", kind: "interpretation",
            blocks: [
                { list: [
                    "**Por la derecha y por la izquierda:** la misma técnica en espejo; antes eran dos fichas.",
                    "**Con la mano interior o exterior:** decidir con qué mano terminar según el defensor (ficha propia).",
                    "**Bandeja reversa:** terminar del otro lado del aro (ficha propia; reunía «Reverse layup» y «Reverse finish»).",
                    "**Bandeja de potencia:** a dos pies, con contacto (ficha propia).",
                    "**Eurostep, pro hop y floater:** finalizaciones que parten de la bandeja (fichas propias)."
                ] }
            ]
        }
    ];

    var visualizar = [
        {
            id: "apoyos", title: "Los apoyos de la bandeja", kind: "interpretation",
            blocks: [{ figure: "bandeja-steps", caption: "Último bote, apoyo derecho, despegue con el izquierdo y tiro con la mano derecha al tablero." }]
        },
        "llegada-ala",
        {
            id: "videos", title: "Video oficial relacionado", kind: "official", refs: ["S1"],
            blocks: [
                { video: "fiba-cdp-finishing", purpose: "Ver cómo plantea la WABC las habilidades de finalización cerca del aro.", observe: ["Qué finalizaciones se enseñan y en qué orden.", "Cómo se usa el cuerpo para proteger el balón.", "Qué se pide hacer con las dos manos."] }
            ]
        }
    ];
    // Los videos van primero: son la referencia real de la ejecución.
    visualizar.unshift(visualizar.pop());

    var entrenar = [
        {
            id: "progresion", title: "Progresión orientativa", kind: "method", refs: ["S2"],
            blocks: [
                { p: "No es una secuencia obligatoria. En minibásquet conviene que la bandeja aparezca dentro de juegos con bote y tiro, sin quedarse mucho tiempo en la técnica aislada [S2]." },
                { table: { head: ["Etapa", "Qué se busca", "Ejercicio"], rows: [
                    ["Familiarización", "El ritmo de los dos apoyos", "Bandeja paso a paso (ejercicio 1)"],
                    ["Ejecución y control", "Con dribbling y con las dos manos", "Ejercicio 1, progresión"],
                    ["Variabilidad", "Distintos ángulos y velocidades", "Bandejas en dos filas (ejercicio 2)"],
                    ["Oposición guiada", "Terminar con un defensor que persigue", "Persecución desde media cancha (ejercicio 3)"],
                    ["Toma de decisiones y juego", "Bandeja, otra finalización o pase", "2 contra 1 de contraataque; ejercicios compartidos"]
                ] } }
            ]
        },
        {
            id: "solo", title: "Cómo practicar solo", kind: "method", audience: "player",
            blocks: [
                { list: ["Sin balón: marcá en el piso el último bote y los dos apoyos; hacé el ritmo diez veces por lado.", "Con balón, desde parado a un paso del aro: un apoyo y despegue.", "Después desde el ala con un dribbling, y después con dos.", "Cerrá con «10 por lado»: diez bandejas por la derecha y diez por la izquierda, contando las que entran."] }
            ]
        },
        {
            id: "consignas", title: "Consignas y correcciones", kind: "method", audience: "coach",
            blocks: [
                { list: ["«¡Derecha, izquierda, arriba!» (por la derecha)", "«¡Último paso corto!»", "«¡Mano lejos del defensor!»", "«¡Al cuadro!»"] },
                { p: "Si el ritmo de pies no sale, sacá el balón y hacelo caminando. Volvé al balón apenas salga. Preguntá «¿con qué pie saltaste?» antes de decirlo [S2]." }
            ]
        },
        {
            id: "adaptaciones", title: "Adaptaciones según edad y nivel", kind: "method", audience: "coach",
            blocks: [
                { table: { head: ["Grupo", "Adaptación"], rows: [
                    ["Minibásquet", "Aro bajo, balón chico, juegos de bote y tiro con puntos; aceptar ritmos imperfectos al principio"],
                    ["U13–U15", "Las dos manos por igual; defensor que persigue"],
                    ["U17 y mayores", "Bandeja con contacto, elección de mano y lectura del defensor que llega a la ayuda"]
                ] } }
            ]
        },
        {
            id: "compartidos", title: "Ejercicios compartidos", kind: "method",
            blocks: [
                { p: "Estos ejercicios de otras fichas también terminan en bandeja:" },
                { exerciseLink: { article: "fund-crossover", id: "ej-zigzag" } },
                { exerciseLink: { article: "fund-closeout", id: "ej-penetrar-descargar" } }
            ]
        }
    ];

    var exercises = [
        {
            id: "ej-paso-a-paso",
            name: "Bandeja paso a paso",
            solo: true,
            works: ["Bandeja", "Parada en dos tiempos", "Coordinación"],
            meta: { fundamento: "Bandeja", fundamentos: ["bandeja", "stride-stop"], objetivo: "Ritmo de dos apoyos", categories: ["Mini", "U13", "U15"], level: "Inicial", minPlayers: 1, maxPlayers: 12, minutes: [8, 10], court: "half", hoops: 1, materials: ["Balones"], optionalMaterials: ["Conos"], blockType: "fundamentos" },
            adaptations: [{ id: "sin-aro", label: "Sin aro", text: "Ritmo de pies y subida del balón contra una pared o tirando al aire.", req: { hoops: 0 } }],
            kind: "method",
            refs: ["S2"],
            objective: "Automatizar el ritmo de los dos apoyos y el despegue con el pie correcto, con las dos manos.",
            secondary: ["Subir el balón protegido", "Usar el tablero"],
            category: "Minibásquet a U15",
            level: "Inicial",
            players: "De 1 a 12 en dos filas",
            playersShort: "1 a 12 jugadores",
            duration: "8 a 10 minutos",
            space: "Media cancha",
            hoops: "1",
            materials: "Un balón por jugador; conos opcionales para marcar los apoyos",
            organization: "Dos filas, una a cada lado del aro, a 45 grados.",
            development: "Paso 1: desde un paso del aro, despegue y bandeja. Paso 2: desde dos pasos, con los dos apoyos. Paso 3: con un dribbling. Paso 4: con dos dribblings desde el ala. Se cambia de fila para usar la otra mano.",
            rules: ["Cada jugador hace las dos manos", "Se avanza de paso cuando salen 3 seguidas", "El balón se sube con las dos manos"],
            cues: ["«¡Derecha, izquierda, arriba!»", "«¡Último paso corto!»", "«¡Al cuadro!»"],
            errors: ["Despegar con el pie equivocado", "Saltar hacia adelante", "Mirar el balón y no el tablero"],
            corrections: ["Conos marcando los apoyos", "Exagerar el último paso corto", "Señalar el ángulo del cuadro antes de salir"],
            variants: ["Con cinta en el piso en lugar de conos", "Recibiendo un pase en carrera en lugar de dribblar", "Mano débil solamente"],
            progressions: ["Bandejas en dos filas (ejercicio 2)", "Con un defensor que persigue (ejercicio 3)"],
            regressions: ["Caminando", "Sin balón", "Aro más bajo"],
            evaluation: ["Ritmo correcto por lado", "Bandejas convertidas por mano", "Balón protegido al subir"],
            basis: "Propuesta de Basket Lab. Para grupos de minibásquet, integrarla rápido a juegos de bote y tiro, como sugiere el manual WABC [S2]."
        },
        {
            id: "ej-dos-filas",
            name: "Bandejas en dos filas",
            works: ["Bandeja", "Pase en carrera", "Captura del rebote"],
            meta: { fundamento: "Bandeja", fundamentos: ["bandeja", "pase-carrera", "captura"], objetivo: "Bandeja tras recibir en carrera", categories: ["Mini", "U13", "U15", "U17"], level: "Inicial", minPlayers: 4, maxPlayers: 16, minutes: [8, 10], court: "half", hoops: 1, materials: ["Balones"], optionalMaterials: [], blockType: "calentamiento" },
            adaptations: [{ id: "tres", label: "Con 3 jugadores", text: "El entrenador hace de pasador fijo.", req: { minPlayers: 3 } }],
            kind: "method",
            objective: "Terminar la bandeja después de recibir en carrera, con continuidad de rebote y pase.",
            secondary: ["Pase adelantado", "Rebote y salida"],
            category: "Minibásquet a U17",
            level: "Inicial",
            players: "De 4 a 16 en dos filas",
            playersShort: "4 a 16 jugadores",
            duration: "8 a 10 minutos",
            space: "Media cancha",
            hoops: "1",
            materials: "2 o 3 balones",
            organization: "Fila de tiradores en el ala derecha con balón y fila de reboteros en el ala izquierda.",
            development: "El tirador dribbla y hace la bandeja. El rebotero toma el balón y pasa al siguiente tirador en carrera. Cada uno pasa a la otra fila. A los 2 minutos, se cambia de lado para usar la otra mano.",
            rules: ["Pase al espacio delante del tirador", "Bandeja sin parar", "Rebote antes de que pique, si se puede"],
            cues: ["«¡Pase delante!»", "«¡Recibí corriendo!»", "«¡Derecha, izquierda, arriba!»"],
            errors: ["Frenar para recibir", "Pase a los pies o atrás", "Desorden en las filas"],
            corrections: ["Pasar al lugar donde va a estar el tirador", "Recibir con las manos adelante", "Cada uno sale a su fila nueva enseguida"],
            variants: ["Pase picado", "Recepción con dos apoyos y bandeja sin dribbling", "Desde el centro de la cancha"],
            progressions: ["Más velocidad", "Contar bandejas seguidas sin error en un minuto"],
            regressions: ["Pase con el tirador quieto", "Un balón solo"],
            evaluation: ["Bandejas seguidas sin error", "Pases precisos en carrera", "Las dos manos"],
            basis: "Propuesta de Basket Lab."
        },
        {
            id: "ej-persecucion",
            name: "Persecución desde media cancha",
            works: ["Bandeja", "Drible de avance", "Elección de mano al finalizar"],
            meta: { fundamento: "Bandeja", fundamentos: ["bandeja", "drible-avance", "mano-finalizacion"], objetivo: "Terminar con un defensor que persigue", categories: ["U13", "U15", "U17", "Mayores"], level: "Intermedio", minPlayers: 2, maxPlayers: 12, minutes: [8, 12], court: "full", hoops: 1, materials: ["Balones"], optionalMaterials: ["Conos"], blockType: "juego" },
            adaptations: [{ id: "media", label: "En media cancha", text: "Salida desde la línea de tres con el defensor dos metros atrás.", req: { court: "half" } }],
            kind: "method",
            board: "llegada-ala",
            objective: "Llegar al aro con ventaja y terminar lejos del defensor que persigue.",
            secondary: ["Drible de avance", "Proteger el balón con el cuerpo", "Elegir la mano"],
            category: "U13 a mayores",
            level: "Intermedio",
            players: "Parejas (atacante y perseguidor); hasta 6 parejas",
            playersShort: "2 a 12 jugadores",
            duration: "8 a 12 minutos",
            space: "Cancha completa (o media, adaptado)",
            hoops: "1",
            materials: "Balones",
            organization: "Atacante con balón en media cancha; perseguidor dos o tres metros detrás.",
            development: "A la señal, el atacante dribbla al aro y hace la bandeja. El perseguidor intenta molestar sin falta. Cambian roles.",
            rules: ["El perseguidor no puede empujar ni tocar el brazo", "El atacante elige el lado", "Punto si convierte; punto doble con la mano débil"],
            cues: ["«¡Rápido y en línea recta!»", "«¡Cuerpo entre el defensor y el balón!»", "«¡Mano lejos del defensor!»"],
            errors: ["Mirar atrás", "Desacelerar antes del aro", "Terminar con la mano cercana al defensor"],
            corrections: ["Mirada al aro", "Mantener la velocidad hasta el último dribbling", "Elegir el lado del aro opuesto al defensor"],
            variants: ["Perseguidor desde el costado", "Atacante que debe usar la mano débil", "Terminar con reversa si el defensor llega por el lado del tablero"],
            progressions: ["Perseguidor más cerca", "2 contra 1 de contraataque"],
            regressions: ["Perseguidor más lejos", "Perseguidor pasivo"],
            evaluation: ["Bandejas convertidas con oposición", "Lado del aro bien elegido", "Velocidad mantenida"],
            basis: "Propuesta de Basket Lab."
        }
    ];

    var evaluar = [
        {
            id: "criterios", title: "Criterios de observación", kind: "interpretation",
            blocks: [
                { checklist: ["Despega con el pie contrario a la mano que tira", "Último paso más corto y salto hacia arriba", "Sube el balón protegido con las dos manos", "Termina con la mano lejana al defensor", "Usa el tablero desde el costado", "La hace con las dos manos"] },
                { p: "Las casillas se guardan solo en este dispositivo. Sirven para observar, no para calificar." }
            ]
        },
        {
            id: "indicadores", title: "Indicadores de progreso", kind: "method",
            blocks: [
                { table: { head: ["Nivel", "Lo hace…"], rows: [
                    ["Inicial", "Con buen ritmo de pies y dribbling, sin oposición, con las dos manos"],
                    ["Intermedio", "A velocidad y con un defensor que persigue"],
                    ["Avanzado", "Elige la finalización según el defensor (mano, lado, reversa, floater)"]
                ] } }
            ]
        },
        {
            id: "objetivos", title: "Relación con los objetivos del jugador", kind: "method", audience: "coach",
            blocks: [
                { p: "Estos criterios pueden servir de referencia para un objetivo de finalización en **Jugadores Lab**. La evaluación la carga el entrenador; ver la ficha o el video no la cambia." }
            ]
        }
    ];

    return {
        id: "fund-bandeja",
        conceptId: "bandeja",
        sectionId: "fundamento_bandeja",
        title: "Bandeja",
        subtitle: "La finalización en carrera cerca del aro: dos apoyos, despegue hacia arriba y la mano lejos del defensor, por los dos lados.",
        crumbs: "Basket Lab · Fundamentos · Finalizaciones · Bandejas",
        sectionLabel: "Fundamentos · Finalizaciones",
        playCategory: "Fundamentos",
        meta: ["Finalizaciones", "Nivel inicial", "1 pizarra", "1 video oficial", "3 ejercicios + 2 compartidos"],
        updated: "2026-11-28",
        tabOrder: ["aprender", "visualizar", "entrenar", "evaluar", "fuentes"],
        modes: true,
        quickJumps: [
            { label: "Ir a los ejercicios", tab: "entrenar", section: "ej-paso-a-paso" },
            { label: "Ver apoyos y video", tab: "visualizar" }
        ],
        ficha: {
            en: "Lay-up",
            definition: "Finalización cerca del aro en carrera: dos apoyos después del último dribbling o de la recepción, despegue con un pie y el balón al aro, normalmente contra el tablero.",
            objective: "Convertir en puntos la ventaja ganada al llegar al aro.",
            level: "Inicial (base de todas las finalizaciones).",
            prereqs: ["Drible de avance", "Parada en dos tiempos"],
            applications: ["Contraataque", "Penetración ganada en uno contra uno", "Corte por detrás del defensor"],
            media: "1 video oficial de FIBA relacionado (sin marcas de tiempo), 1 esquema propio de apoyos y 1 pizarra.",
            figure: "bandeja-steps",
            modeIntro: {
                player: "**Modo jugador:** el ritmo de pies por cada lado y cómo practicarlo solo.",
                coach: "**Modo entrenador:** progresión, consignas, adaptaciones por edad y criterios."
            }
        },
        tabs: { aprender: aprender, visualizar: visualizar, entrenar: entrenar, evaluar: evaluar },
        boards: boards,
        exercises: exercises,
        sources: sources,
        unavailableSources: Cat.unavailable(["wabc-online", "l1-es", "cm-glosario-resto", "mini-tirar", "reglas-25"])
    };
});
