/*
 * Basket Lab · Fundamentos · Catch and shoot (ficha modelo)
 *
 * Redacción original de Basket Lab en español. Las citas [S1]..[Sn] remiten a la
 * bibliografía del final, consultada directamente el 28/11/2026. Para la mecánica del
 * tiro no pudimos consultar un texto oficial completo: esas secciones se marcan como
 * interpretación técnica de Basket Lab.
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
        Cat.source("cdp", "S1", { used: "Capítulo oficial «Developing a shooter & the Utilization of the 3-point shot», enlazado en Visualizar." }),
        Cat.source("cm-en", "S2", { locator: "3.2 Glossary, pág. 19 («Close-out»)", used: "Contra un tirador el defensor hace un closeout «largo», más cerca y con las manos arriba. Lo usamos para explicar qué defensa espera el tirador." }),
        Cat.source("mini-es", "S3", { locator: "2 Enseñanza centrada en el juego (2.1–2.3, págs. 6–9)", used: "Enseñar desde el juego, con preguntas, y sumar un defensor desde temprano." })
    ];

    var boards = [
        {
            id: "descarga-esquina",
            title: "Penetración y descarga a la esquina",
            kind: "interpretation",
            intro: "El tirador espera en la esquina y se prepara antes de recibir. La pizarra muestra el espacio y el momento del pase, no la mecánica del tiro.",
            spec: {
                view: VIEW,
                players: { o1: O("1", 8.6, 7.5), o3: O("3", 1.2, 13.6), x1: D("1", 7.7, 7.5), x3: D("3", 2.2, 12.6) },
                phases: [
                    { name: "Lectura de la penetración", note: "El 1 penetra por el lado del 3. El defensor del 3 se cierra para ayudar.", ball: "o1", strokes: [["dribble", "o1", [4.6, 9.6], 0.3], ["rotation", "x3", [3.2, 10.6]], ["rotation", "x1", [5.6, 8.6]]] },
                    { name: "Preparación antes del pase", note: "El 3 ya tiene los pies y las manos listos: la decisión de tirar se toma antes de recibir.", zones: [{ x: 0.4, y: 12.8, w: 1.8, h: 1.8, color: "#f97316" }] },
                    { name: "Descarga y tiro", note: "Pase al pecho del tirador, recepción con el cuerpo cuadrado y tiro en un solo movimiento. Si el closeout llega largo y a tiempo, la opción es atacarlo con un dribbling.", zones: [], strokes: [["pass", "o1", "o3"], ["rotation", "x3", [1.9, 12.7]]] },
                    { name: "Tiro", strokes: [["shot", "o3", HOOP]] }
                ]
            }
        }
    ];

    var aprender = [
        {
            id: "que-es", title: "Qué es", kind: "interpretation",
            blocks: [
                { p: "Es el **tiro que se lanza inmediatamente después de recibir un pase**, sin dribbling. El jugador se prepara antes de que llegue el balón para soltarlo en un solo movimiento." },
                { p: "Lo que antes estaba como «Spot up» (esperar quieto la descarga) y «Off screen shot» (recibir saliendo de un bloqueo) son formas de este mismo tiro: ahora son variantes de esta ficha." }
            ]
        },
        {
            id: "para-que", title: "Para qué sirve", kind: "interpretation",
            blocks: [
                { list: ["Castigar a la defensa cuando ayuda y deja libre al tirador.", "Aprovechar el tiempo que tarda el defensor en hacer el closeout.", "Darle sentido al pase de descarga y al spacing: si el tirador no está listo, la ventaja se pierde."] }
            ]
        },
        {
            id: "cuando", title: "Cuándo utilizarlo", kind: "interpretation",
            blocks: [
                { p: "Cuando el pase llega y el defensor está lejos o llegando sin equilibrio. Si el defensor llega a tiempo, cerca y con las manos arriba (el closeout largo que el manual WABC indica contra un tirador [S2]), suele ser mejor atacarlo con uno o dos dribblings." },
                { callout: "La selección de tiro depende del tirador, del momento del partido y de la propuesta del equipo. Esta ficha no fija una distancia ni un porcentaje mínimo.", tone: "info" }
            ]
        },
        {
            id: "principios", title: "Principios técnicos", kind: "interpretation",
            blocks: [
                { steps: [
                    { title: "Prepararse antes del pase", text: "Pies y manos listos, rodillas flexionadas, mirada al aro y al pasador." },
                    { title: "Manos como objetivo", text: "Las manos muestran dónde quiere el balón el tirador; el pasador apunta ahí." },
                    { title: "Recibir con el cuerpo orientado", text: "Pies y hombros hacia el aro, o girar al recibir con los pies, no solo con el tronco." },
                    { title: "Un solo movimiento", text: "De la recepción al tiro sin bajar el balón de más ni hacer pausas." },
                    { title: "Equilibrio al final", text: "Caer en el mismo lugar donde se saltó, o muy cerca, indica que el tiro fue equilibrado." }
                ] },
                { figure: "catch-shoot-sequence", caption: "Secuencia propia de Basket Lab. Muestra el orden de las acciones, no la postura exacta." },
                { callout: "No pudimos consultar un texto oficial FIBA/WABC completo sobre la mecánica del tiro (ver «Fuentes no consultadas»). Estos principios son la lectura técnica de Basket Lab y quedan pendientes de validar contra el manual.", tone: "warn", title: "Pendiente de validación" }
            ]
        },
        {
            id: "ejecutar", title: "Cómo hacerlo (paso a paso)", kind: "interpretation", audience: "player",
            blocks: [
                { list: ["Antes del pase: pies a lo ancho de los hombros, rodillas flexionadas, manos arriba mostrando el objetivo.", "Mirá el aro, no el balón, mientras viaja.", "Recibí el balón con las dos manos, ya en tu posición de tiro.", "Subí y soltá en un solo movimiento.", "Mantené el final del tiro hasta que el balón llegue al aro.", "Si el defensor llegó encima, no fuerces: atacalo con un dribbling."] }
            ]
        },
        {
            id: "errores", title: "Errores frecuentes", kind: "interpretation",
            blocks: [
                { table: { head: ["Error", "Qué provoca", "Corrección"], rows: [
                    ["Prepararse después de recibir", "El defensor llega a tiempo", "Pies y manos listos antes del pase"],
                    ["Bajar el balón al recibir", "Tiro lento", "Recibir alto, en posición de tiro"],
                    ["Girar solo el tronco", "Tiro desequilibrado y torcido", "Orientar los pies hacia el aro"],
                    ["Tirar contra un closeout encima", "Tiro tapado o muy forzado", "Leer el closeout y atacarlo"],
                    ["Caer lejos del despegue", "Falta de equilibrio", "Repeticiones cortas, cerca del aro, cuidando la caída"]
                ] } }
            ]
        },
        {
            id: "variantes", title: "Variantes", kind: "interpretation",
            blocks: [
                { list: [
                    "**Spot up:** esperar la descarga quieto en un lugar fijo (esquina, ala). Antes era un fundamento aparte.",
                    "**Saliendo de un bloqueo:** recibir y tirar tras usar un bloqueo indirecto. Antes era «Off screen shot».",
                    "**Con giro al recibir:** el pase llega de un costado y el tirador orienta los pies al aro en la recepción.",
                    "**Tiro tras dribbling:** no es una variante sino otro concepto (pull-up), con ficha propia."
                ] }
            ]
        }
    ];

    var visualizar = [
        {
            id: "secuencia", title: "Secuencia del tiro desde la recepción", kind: "interpretation",
            blocks: [{ figure: "catch-shoot-sequence", caption: "Preparar, recibir, subir y soltar." }]
        },
        "descarga-esquina",
        {
            id: "videos", title: "Video oficial relacionado", kind: "official", refs: ["S1"],
            blocks: [
                { video: "fiba-cdp-shooter", purpose: "Ver cómo plantea la WABC la formación del tirador y el uso del triple: el contexto en el que se usa el catch and shoot.", observe: ["Qué tipo de tiros se proponen entrenar y por qué.", "Cómo se relaciona el tiro con el espacio y el pase.", "Diferencias entre formar la mecánica y elegir el tiro en el partido."] }
            ]
        }
    ];
    // Los videos van primero: son la referencia real de la ejecución.
    visualizar.unshift(visualizar.pop());

    var entrenar = [
        {
            id: "progresion", title: "Progresión orientativa", kind: "method", refs: ["S3"],
            blocks: [
                { p: "No es una secuencia obligatoria. El tiro sin defensor sirve para la mecánica, pero la decisión aparece recién con un defensor que hace closeout [S3]." },
                { table: { head: ["Etapa", "Qué se busca", "Ejercicio"], rows: [
                    ["Familiarización", "Recibir en posición de tiro", "Tiro de recepción en parejas, cerca del aro (ejercicio 1)"],
                    ["Ejecución y control", "Un solo movimiento y caída equilibrada", "Ejercicio 1 alejándose"],
                    ["Variabilidad", "Distintos ángulos y pases", "Ronda de cinco lugares (ejercicio 2)"],
                    ["Oposición guiada y decisión", "Tirar o atacar según el closeout", "Closeout y uno contra uno (ficha Closeout)"],
                    ["Aplicación al juego", "Estar listo en la descarga", "Penetrar, descargar y cerrar 2 contra 2 (ficha Closeout)"]
                ] } }
            ]
        },
        {
            id: "solo", title: "Cómo practicar solo", kind: "method", audience: "player",
            blocks: [
                { list: ["Autopase: tirá el balón con efecto hacia atrás para que vuelva hacia vos, prepará pies y manos y tirá al recibir.", "Empezá a 2 metros del aro y alejate solo si metés la mayoría.", "Contá tiros y aciertos: anotarlos en el Shooting Lab te muestra la evolución por zona.", "Terminá cada serie con 5 tiros desde la esquina, el lugar típico de la descarga."] }
            ]
        },
        {
            id: "consignas", title: "Consignas y correcciones", kind: "method", audience: "coach",
            blocks: [
                { list: ["«¡Listo antes del pase!»", "«¡Manos de objetivo!»", "«¡Pies al aro!»", "«¡Recibí y subí!»", "«¿Tirabas o atacabas?»"] },
                { p: "Corregí una cosa por serie. Primero la preparación previa, después la orientación de los pies y por último la decisión frente al closeout [S3]." }
            ]
        },
        {
            id: "adaptaciones", title: "Adaptaciones según edad y nivel", kind: "method", audience: "coach",
            blocks: [
                { table: { head: ["Grupo", "Adaptación"], rows: [
                    ["Minibásquet", "Aro y balón de minibásquet, tiros cerca, sin corrección técnica fina; juegos de pase y tiro con puntos"],
                    ["U13–U15", "Distancia de tiro según lo que el jugador domina; primeras lecturas del closeout"],
                    ["U17 y mayores", "Tiro desde bloqueos, desde el triple y con decisión contra closeouts reales"]
                ] } }
            ]
        },
        {
            id: "compartidos", title: "Ejercicios compartidos", kind: "method",
            blocks: [
                { p: "Estos ejercicios trabajan el catch and shoot junto con otros fundamentos. Están guardados una sola vez, en la ficha de Closeout:" },
                { exerciseLink: { article: "fund-closeout", id: "ej-closeout-1c1" } },
                { exerciseLink: { article: "fund-closeout", id: "ej-penetrar-descargar" } }
            ]
        }
    ];

    var exercises = [
        {
            id: "ej-parejas",
            name: "Tiro de recepción en parejas",
            solo: true,
            works: ["Catch and shoot", "Pase de pecho", "Triple amenaza"],
            meta: { fundamento: "Catch and shoot", fundamentos: ["catch-shoot", "pase-pecho", "triple-amenaza"], objetivo: "Preparación antes del pase", categories: ["Mini", "U13", "U15", "U17", "Mayores"], level: "Inicial", minPlayers: 2, maxPlayers: 12, minutes: [8, 10], court: "half", hoops: 1, materials: ["Balones"], optionalMaterials: ["Conos"], blockType: "tiro" },
            adaptations: [{ id: "solo", label: "Solo, con autopase", text: "El tirador se autopasa con efecto hacia atrás y se prepara antes de recibir.", req: { minPlayers: 1 } }],
            kind: "method",
            objective: "Recibir ya preparado para tirar y soltar en un solo movimiento.",
            secondary: ["Manos de objetivo", "Pies orientados al aro", "Caída equilibrada"],
            category: "Minibásquet a mayores",
            level: "Inicial",
            players: "Parejas (pasador y tirador); hasta 6 parejas en dos aros",
            playersShort: "2 a 12 jugadores",
            duration: "8 a 10 minutos",
            space: "Media cancha",
            hoops: "1",
            materials: "Un balón por pareja",
            organization: "Tirador a 2–3 metros del aro, pasador debajo del aro.",
            development: "El tirador se prepara, el pasador le pasa a las manos y el tirador tira al recibir. El pasador toma el rebote y vuelve a pasar. Cada 5 tiros cambian roles. Si mete 3 de 5, el tirador se aleja un paso.",
            rules: ["El tirador muestra las manos antes de cada pase", "No se dribbla", "Se aleja solo si mete 3 de 5"],
            cues: ["«¡Listo antes del pase!»", "«¡Manos de objetivo!»", "«¡Recibí y subí!»"],
            errors: ["Prepararse después de recibir", "Bajar el balón", "Alejarse demasiado rápido"],
            corrections: ["El pasador no pasa hasta ver manos y pies listos", "Recibir a la altura del pecho o más arriba", "Volver a la distancia anterior si mete menos de 3"],
            variants: ["Pase desde distintos ángulos", "Giro al recibir (pase desde el costado)", "Spot up: tirador quieto en la esquina"],
            progressions: ["Pasador que hace closeout corto después del pase", "Ronda de cinco lugares (ejercicio 2)"],
            regressions: ["Más cerca", "Balón más liviano o aro más bajo en minibásquet"],
            evaluation: ["Preparación previa en cada repetición", "Tiros en un solo movimiento", "Aciertos por distancia"],
            basis: "Propuesta de Basket Lab para entrenar la preparación previa del tirador."
        },
        {
            id: "ej-cinco-lugares",
            name: "Ronda de cinco lugares con descarga",
            works: ["Catch and shoot", "Pase de descarga", "Drible de avance"],
            meta: { fundamento: "Catch and shoot", fundamentos: ["catch-shoot", "kick-out", "drible-avance"], objetivo: "Tirar desde distintos ángulos tras una descarga", categories: ["U13", "U15", "U17", "Mayores"], level: "Intermedio", minPlayers: 3, maxPlayers: 9, minutes: [10, 12], court: "half", hoops: 1, materials: ["Balones", "Conos"], optionalMaterials: [], blockType: "tiro" },
            adaptations: [{ id: "dos", label: "Con 2 jugadores", text: "El pasador penetra, pasa y toma el rebote; el tirador recorre los cinco lugares.", req: { minPlayers: 2 } }],
            kind: "method",
            board: "descarga-esquina",
            objective: "Estar listo en el lugar de la descarga y tirar desde la recepción en distintos ángulos.",
            secondary: ["Momento del pase", "Moverse al lugar libre", "Rebote y continuidad"],
            category: "U13 a mayores",
            level: "Intermedio",
            players: "3 por aro (penetrador, tirador y rebotero); rotan",
            playersShort: "3 a 9 jugadores",
            duration: "10 a 12 minutos",
            space: "Media cancha",
            hoops: "1",
            materials: "Balones y 5 conos (esquinas, alas y arriba)",
            organization: "Cinco conos en el perímetro. El penetrador arriba con balón, el tirador en un cono y el rebotero debajo del aro.",
            development: "El penetrador dribbla hacia el aro y descarga al tirador, que tira desde la recepción. El rebotero devuelve el balón arriba. El tirador pasa al siguiente cono. Al completar los cinco lugares, rotan.",
            rules: ["El pase sale después de dos dribblings hacia el aro", "El tirador no puede dribblar", "Se cuenta cuántos de cinco mete cada uno"],
            cues: ["«¡Listo antes del pase!»", "«¡Pies al aro!»", "Penetrador: «¡Pasá al pecho!»"],
            errors: ["Tirador que espera de pie y sin preparar", "Pase alto o a los pies", "Tirar desequilibrado en las esquinas"],
            corrections: ["El penetrador no pasa si no ve manos de objetivo", "Pase al pecho, con un objetivo claro", "Repetir la esquina más cerca"],
            variants: ["Pase picado de descarga", "El tirador se mueve al lugar libre en lugar de seguir el orden", "Con un defensor que hace closeout corto"],
            progressions: ["Penetrador con defensor pasivo", "Closeout y uno contra uno (ficha Closeout)"],
            regressions: ["Sin penetración: pase directo", "Tres lugares en lugar de cinco"],
            evaluation: ["Tiros desde la recepción por lugar", "Pases precisos", "Aciertos por lugar (se pueden cargar en el Shooting Lab)"],
            basis: "Propuesta de Basket Lab."
        }
    ];

    var evaluar = [
        {
            id: "criterios", title: "Criterios de observación", kind: "interpretation",
            blocks: [
                { checklist: ["Pies y manos listos antes de recibir", "Recibe en posición de tiro, sin bajar el balón", "Pies orientados al aro", "Tira en un solo movimiento", "Cae equilibrado cerca de donde saltó", "Elige atacar si el closeout llega a tiempo y cerca"] },
                { p: "Las casillas se guardan solo en este dispositivo. Sirven para observar, no para calificar." }
            ]
        },
        {
            id: "indicadores", title: "Indicadores de progreso", kind: "method",
            blocks: [
                { table: { head: ["Nivel", "Lo hace…"], rows: [
                    ["Inicial", "Recibe preparado y tira en un solo movimiento cerca del aro"],
                    ["Intermedio", "Mantiene la mecánica desde distintos ángulos y tras una descarga"],
                    ["Avanzado", "Decide bien entre tirar y atacar frente a closeouts reales"]
                ] } },
                { p: "Para medir aciertos por zona, usá el **Shooting Lab**: registra los tiros reales. Esta ficha no cuenta tiros." }
            ]
        },
        {
            id: "objetivos", title: "Relación con los objetivos del jugador", kind: "method", audience: "coach",
            blocks: [
                { p: "Si un jugador tiene un objetivo de tiro en **Jugadores Lab**, estos criterios sirven para la observación cualitativa; los porcentajes salen del Shooting Lab. Ver la ficha o el video no cambia ninguna evaluación." }
            ]
        }
    ];

    return {
        id: "fund-catch-shoot",
        conceptId: "catch-shoot",
        sectionId: "fundamento_catch-shoot",
        title: "Catch and shoot",
        subtitle: "Recibir y tirar sin dribbling: prepararse antes del pase para soltar en un solo movimiento.",
        crumbs: "Basket Lab · Fundamentos · Lanzamiento · Tiro desde recepción",
        sectionLabel: "Fundamentos · Lanzamiento",
        playCategory: "Fundamentos",
        meta: ["Lanzamiento", "Nivel inicial", "1 pizarra", "1 video oficial", "2 ejercicios + 2 compartidos"],
        updated: "2026-11-28",
        tabOrder: ["aprender", "visualizar", "entrenar", "evaluar", "fuentes"],
        modes: true,
        quickJumps: [
            { label: "Ir a los ejercicios", tab: "entrenar", section: "ej-parejas" },
            { label: "Ver secuencia y video", tab: "visualizar" }
        ],
        ficha: {
            en: "Catch and shoot",
            definition: "Tiro lanzado inmediatamente después de recibir un pase, sin dribbling, con la preparación hecha antes de que llegue el balón.",
            objective: "Aprovechar la ventaja que crea el pase antes de que llegue el defensor.",
            level: "Inicial; la decisión frente al closeout es intermedia.",
            prereqs: ["Tiro en apoyo o en suspensión cerca del aro", "Parada en un tiempo", "Triple amenaza"],
            applications: ["Descarga tras una penetración", "Pase cruzado al lado débil", "Salida de un bloqueo indirecto"],
            media: "1 video oficial de FIBA relacionado (sin marcas de tiempo), 1 secuencia propia y 1 pizarra.",
            figure: "catch-shoot-sequence",
            modeIntro: {
                player: "**Modo jugador:** cómo prepararte, cuándo tirar y cómo practicar solo.",
                coach: "**Modo entrenador:** progresión, consignas, adaptaciones y ejercicios compartidos con otros fundamentos."
            }
        },
        tabs: { aprender: aprender, visualizar: visualizar, entrenar: entrenar, evaluar: evaluar },
        boards: boards,
        exercises: exercises,
        sources: sources,
        unavailableSources: Cat.unavailable(["wabc-online", "l1-es", "cm-glosario-resto", "mini-tirar"])
    };
});
