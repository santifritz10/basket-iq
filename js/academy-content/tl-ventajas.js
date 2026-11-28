/*
 * Basket Lab · Laboratorio táctico · Creación y aprovechamiento de ventajas (principio)
 *
 * Redacción original de Basket Lab en español. Las citas [S1]..[Sn] remiten a la
 * bibliografía del final, consultada directamente el 28/11/2026. Lo que no está respaldado
 * por esas fuentes se marca como interpretación o propuesta de Basket Lab.
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
    function O(l, x, y) { return { team: "offense", label: l, x: x, y: y }; }
    function D(l, x, y) { return { team: "defense", label: l, x: x, y: y }; }

    var sources = [
        Cat.source("wabc-l2-2-1-5", "S1"),
        Cat.source("wabc-l1-2-1-5", "S2"),
        Cat.source("wabc-l1-2-1-4", "S3"),
        Cat.source("mini-es", "S4", { locator: "2 Enseñanza centrada en el juego (2.1–2.3, págs. 6–9)", used: "Enseñar a partir del juego, con un defensor desde temprano y con preguntas en lugar de respuestas." })
    ];

    var boards = [
        {
            id: "penetrar-descargar",
            title: "Crear, leer y pasar la ventaja",
            kind: "interpretation",
            refs: ["S2", "S1"],
            intro: "Una penetración obliga a ayudar. La ventaja no termina en el que penetra: pasa al compañero que quedó libre y, si la defensa llega, al siguiente.",
            spec: {
                view: VIEW,
                players: {
                    o1: O("1", 9.0, 7.5), o2: O("2", 6.7, 2.2), o3: O("3", 6.7, 12.8), o4: O("4", 1.1, 0.9), o5: O("5", 1.1, 14.1),
                    x1: D("1", 8.0, 7.5), x2: D("2", 5.8, 3.4), x3: D("3", 5.4, 10.6), x4: D("4", 2.2, 2.4), x5: D("5", 2.6, 11.8)
                },
                phases: [
                    { name: "Crear", note: "El 1 supera a su defensor atacando su cadera y llega con los dos pies a la pintura buscando anotar [S2].", ball: "o1", strokes: [["dribble", "o1", [5.2, 6.6], 0.3], ["move", "x1", [6.6, 7.2]]] },
                    { name: "Leer", note: "X2 deja al 2 para frenar la penetración. Esa ayuda es la señal: hay un compañero libre [S1].", strokes: [["rotation", "x2", [4.6, 5.0]]], zones: [{ x: 5.8, y: 1.2, w: 2.0, h: 2.0, color: "#0d9488" }] },
                    { name: "Aprovechar", note: "El 1 descarga al 2. X2 tiene que recorrer un closeout largo.", zones: [], strokes: [["pass", "o1", "o2"], ["rotation", "x2", [6.0, 2.8]]] },
                    { name: "Conservar", note: "Si el closeout llega a tiempo, el 2 no fuerza: ataca el closeout o hace el pase extra a la esquina, donde X4 tuvo que subir. La ventaja viaja con el balón.", strokes: [["pass", "o2", "o4"], ["rotation", "x4", [1.9, 1.6]]] }
                ]
            }
        },
        {
            id: "inversion",
            title: "La inversión del balón también crea ventajas",
            kind: "official",
            refs: ["S3"],
            intro: "Sin dribbling: mover el balón de un lado al otro obliga a la defensa a desplazarse y puede dejar un closeout largo [S3].",
            spec: {
                view: VIEW,
                players: {
                    o1: O("1", 9.0, 7.5), o2: O("2", 6.7, 2.2), o3: O("3", 6.7, 12.8), o4: O("4", 1.1, 0.9), o5: O("5", 1.1, 14.1),
                    x1: D("1", 7.8, 6.2), x2: D("2", 5.9, 2.9), x3: D("3", 5.0, 9.6), x4: D("4", 2.0, 2.0), x5: D("5", 2.6, 10.4)
                },
                phases: [
                    { name: "Balón en el lado derecho", note: "El lado débil está hundido en la línea de ayuda: X3 y X5 están lejos de sus atacantes.", ball: "o2" },
                    { name: "Inversión rápida", note: "Dos pases rápidos llevan el balón al otro lado.", strokes: [["pass", "o2", "o1"]] },
                    { name: "Llegada al lado débil", note: "X3 tiene que salir desde la línea de ayuda: un closeout largo [S3]. El 3 recibe con ventaja: tiro o ataque.", strokes: [["pass", "o1", "o3"], ["rotation", "x3", [6.0, 12.0]], ["rotation", "x1", [7.6, 8.4]]], zones: [{ x: 5.8, y: 11.8, w: 2.0, h: 2.0, color: "#0d9488" }] }
                ]
            }
        }
    ];

    var aprender = [
        {
            id: "que-es", title: "Qué es", kind: "interpretation", refs: ["S1"],
            blocks: [
                { p: "Una **ventaja** es una situación en la que el ataque le gana tiempo o espacio a la defensa: un atacante libre, un defensor que llega tarde, un emparejamiento favorable o más atacantes que defensores en una zona. Crear ventajas es la razón de casi todas las acciones colectivas; aprovecharlas es la parte que más se pierde." },
                { p: "El manual WABC propone enseñar a **leer a la defensa** en lugar de seguir una jugada fija: identificar la señal que decide cada acción y preguntar en vez de dar la respuesta [S1]. Este principio organiza esa idea en cuatro momentos." },
                { callout: "Las palabras «ventaja», «superioridad» o «desequilibrio» se usan distinto según el entrenador. Acá las usamos en el sentido que explica esta ficha; no es una clasificación oficial.", tone: "info", title: "Sobre la terminología" }
            ]
        },
        {
            id: "momentos", title: "Los cuatro momentos", kind: "interpretation", refs: ["S1", "S3"],
            blocks: [
                { steps: [
                    { title: "Crear", text: "Desequilibrar a un defensor: penetración, bloqueo, corte, juego de poste, inversión del balón o transición [S3]." },
                    { title: "Leer", text: "Mirar la reacción: ¿vino la ayuda?, ¿de dónde?, ¿quién quedó libre? La defensa da la señal [S1]." },
                    { title: "Aprovechar", text: "Decidir rápido: tiro, pase al libre o seguir atacando. Una ventaja dura muy poco." },
                    { title: "Conservar", text: "Si la defensa llega, no forzar: pasar la ventaja al siguiente (pase extra, ataque al closeout) o volver a crearla." }
                ] }
            ]
        },
        {
            id: "tipos", title: "Tipos de ventaja", kind: "interpretation",
            blocks: [
                { table: { head: ["Tipo", "Qué es", "Ejemplo"], rows: [
                    ["Numérica", "Más atacantes que defensores en una zona o en toda la cancha", "2 contra 1 en contraataque; 2 contra 1 sobre el balón después de un bloqueo"],
                    ["Posicional", "Un atacante en mejor lugar que su defensor", "Corte por la espalda de un defensor que niega el pase"],
                    ["Dinámica", "Un defensor que llega en movimiento o tarde", "Closeout largo después de una ayuda o de una inversión"],
                    ["De emparejamiento", "Diferencia de tamaño, velocidad o habilidad", "Un base defendido por un pívot después de un cambio"]
                ] } }
            ]
        },
        {
            id: "como-se-crea", title: "Cómo se crea", kind: "official", refs: ["S2", "S3"],
            blocks: [
                { list: [
                    "**Penetración con dribbling:** atacar la cadera y el hombro del defensor, buscar primero anotar y meter los dos pies en la pintura [S2].",
                    "**Movimiento del balón:** la inversión obliga a todos los defensores a moverse; mientras se mueven, la ayuda puede no estar en su lugar [S3].",
                    "**Bloqueos:** directos o indirectos, generan un 2 contra 1 momentáneo o un cambio de emparejamiento (ver Pick and roll).",
                    "**Cortes:** atacan la espalda del defensor que mira el balón.",
                    "**Poste:** un pase adentro obliga a decidir si se ayuda o no [S1].",
                    "**Transición:** atacar antes de que la defensa se organice (ver Superioridades)."
                ] }
            ]
        },
        {
            id: "lectura", title: "Leer la señal correcta", kind: "official", refs: ["S1"],
            blocks: [
                { p: "En el ejemplo del manual, en un 2 contra 1 la señal es el defensor: si va al botador, se pasa; si no, se sigue hasta la bandeja [S1]. La misma lógica se repite en cada acción:" },
                { table: { head: ["Situación", "Señal", "Respuesta posible"], rows: [
                    ["Penetración", "Un defensor deja a su atacante para frenar", "Pase al que quedó libre"],
                    ["Recepción después de una ayuda", "El defensor llega corriendo y desequilibrado", "Ataque al closeout"],
                    ["Recepción con el defensor encima", "Closeout controlado", "Pase extra o reinicio"],
                    ["Pase al poste", "Un exterior se hunde a ayudar", "Pase al exterior libre [S1]"]
                ] } }
            ]
        },
        {
            id: "importancia", title: "Por qué importa", kind: "interpretation",
            blocks: [
                { p: "Un sistema ofensivo, por bueno que sea, solo crea la situación. Lo que define la posesión es si los jugadores reconocen la ventaja y la usan a tiempo. Por eso este principio atraviesa todo el laboratorio: aparece en el spacing, en el pick and roll, en el ataque contra zona y en el contraataque." }
            ]
        },
        {
            id: "cuando-no", title: "Cuándo conviene no forzar", kind: "interpretation",
            blocks: [
                { list: [
                    "Cuando la ventaja ya desapareció y el tiro sería disputado: conviene pasar y volver a crear.",
                    "Cuando el que recibe no tiene el recurso técnico (no tira bien desde ahí, no maneja bajo presión).",
                    "Al final de la posesión o del partido, la decisión depende del reloj y del marcador: puede convenir un tiro peor ahora antes que perder el balón."
                ] }
            ]
        },
        {
            id: "jugadores", title: "Qué necesitan los jugadores", kind: "interpretation",
            blocks: [
                { list: ["Atacar el aro con amenaza real de anotar.", "Recibir listos para tirar o atacar (pies preparados).", "Pasar con las dos manos y por las dos líneas.", "Mirar a la defensa, no solo al balón.", "Aceptar que el mejor tiro puede ser de otro."] },
                { links: [
                    { label: "Triple amenaza", go: "fundamento_triple-amenaza" },
                    { label: "Pase de descarga", go: "fundamento_kick-out" },
                    { label: "Catch and shoot", go: "fundamento_catch-shoot" },
                    { label: "Closeout (cómo defenderlo)", go: "fundamento_closeout" }
                ], label: "Fundamentos relacionados" }
            ]
        },
        {
            id: "errores", title: "Errores frecuentes", kind: "interpretation",
            blocks: [
                { table: { head: ["Error", "Qué provoca", "Corrección"], rows: [
                    ["Penetrar sin intención de anotar", "La defensa no ayuda y no hay ventaja", "Atacar el aro primero [S2]"],
                    ["Decidir antes de mirar", "Pase a un compañero marcado", "Preguntar «¿quién ayudó?» [S1]"],
                    ["Quedarse con el balón en la ventaja", "La defensa se recupera", "Decidir en un tiempo"],
                    ["Tirar contra un closeout que llegó bien", "Tiro disputado", "Pase extra o ataque al closeout"],
                    ["Receptores quietos durante la penetración", "Pases difíciles", "Reubicarse en la línea de pase [S2]"]
                ] } }
            ]
        }
    ];

    var visualizar = [
        "penetrar-descargar",
        "inversion",
        {
            id: "video", title: "Material audiovisual", kind: "interpretation",
            blocks: [
                { p: "Clínica oficial de FIBA sobre penetración con dribbling. La comprobamos (existe y se puede insertar), pero **no la revisamos minuto a minuto**: por eso no indicamos momentos concretos." },
                { video: "fiba-cdp-dribble-drive", concept: "tl:ventajas", observe: ["Cómo se ataca al defensor para obligar a una ayuda.", "Qué hacen los demás mientras el balón penetra.", "Qué pasa cuando la ayuda no llega."] }
            ]
        }
    ];

    var entrenar = [
        {
            id: "objetivos", title: "Objetivos de enseñanza", kind: "method",
            blocks: [
                { list: ["Reconocer la señal de la ayuda.", "Decidir en un tiempo: tiro, pase o seguir.", "Pasar la ventaja en vez de forzar.", "Ocupar espacios útiles cuando el balón penetra."] }
            ]
        },
        {
            id: "progresion", title: "Progresión orientativa", kind: "method", refs: ["S1", "S4"],
            blocks: [
                { p: "No es una secuencia obligatoria. El manual propone enseñar la decisión con oposición real y con preguntas [S1] [S4]; se puede empezar directamente por el juego reducido y volver a lo analítico cuando aparece un problema técnico." },
                { table: { head: ["Etapa", "Formato", "Qué se busca"], rows: [
                    ["1", "2 contra 1 (ejercicio 1)", "Leer a un solo defensor: pasar o seguir"],
                    ["2", "2 contra 2 con penetración obligatoria", "Ayuda y descarga"],
                    ["3", "3 contra 3 con puntos por decisión (ejercicio 2)", "Pase extra y ataque al closeout"],
                    ["4", "4 contra 4 o 5 contra 5 con reglas", "Ventaja dentro del sistema del equipo"]
                ] } }
            ]
        },
        {
            id: "consignas", title: "Consignas y preguntas", kind: "method", refs: ["S1"],
            blocks: [
                { list: ["«¿Quién te ayudó?»", "«¿Quién quedó libre cuando ayudó?»", "«¿Llegó bien el defensor? Entonces, ¿qué hacés?»", "«Atacá para anotar, pasá para ganar.»"] },
                { p: "Preguntar antes de corregir es la propuesta del manual: la defensa «dice» qué hacer [S1]." }
            ]
        },
        {
            id: "adaptaciones", title: "Adaptaciones por categoría", kind: "method",
            blocks: [
                { table: { head: ["Grupo", "Adaptación"], rows: [
                    ["Minibásquet", "Juegos de 2 contra 1 y 3 contra 2 sin explicaciones tácticas; una sola pregunta por vez"],
                    ["U13–U15", "Penetrar y descargar con oposición; puntos por pase extra"],
                    ["U17–U19", "Lectura de la ayuda dentro del sistema; ataque al closeout"],
                    ["Mayores", "Ventajas de emparejamiento y de reloj; decisiones según el plan de partido"]
                ] } },
                { p: "No todos los jugadores de una edad tienen el mismo nivel: adaptá por lo que el grupo resuelve, no por la categoría." }
            ]
        }
    ];

    var exercises = [
        {
            id: "ej-2c1-decision",
            name: "2 contra 1: pasar o seguir",
            works: ["Toma de decisiones", "Bandeja", "Pase"],
            meta: { fundamento: "Ventajas", fundamentos: ["bandeja", "pase-picado", "drible-avance"], objetivo: "Leer al defensor: pasar o seguir", categories: ["Mini", "U13", "U15", "U17"], level: "Inicial", minPlayers: 3, maxPlayers: 15, minutes: [8, 12], court: "half", hoops: 1, materials: ["Balones", "Conos"], optionalMaterials: [], blockType: "tactica" },
            adaptations: [],
            kind: "method",
            refs: ["S1"],
            objective: "Decidir según el defensor: si va al botador, pasar; si no, seguir hasta la bandeja [S1].",
            secondary: ["Pase a tiempo y a la mano lejana del defensor", "Defensor: fintar para obligar a decidir"],
            category: "Minibásquet a U17",
            level: "Inicial",
            players: "Grupos de 3 (2 atacantes y 1 defensor); rotan",
            playersShort: "3 a 15 jugadores",
            duration: "8 a 12 minutos",
            space: "Media cancha",
            hoops: "1",
            materials: "Balones y dos conos en mitad de cancha",
            organization: "Dos atacantes salen desde mitad de cancha separados por un carril. El defensor espera en la línea de tiros libres.",
            development: "Los atacantes avanzan y resuelven contra el defensor. Si el defensor sale al balón, pase al compañero; si se queda con el compañero, el botador sigue hasta la bandeja. Rotan: el que tiró pasa a defender.",
            rules: ["Máximo tres dribblings por atacante", "Punto extra si la decisión fue la correcta, aunque no entre", "El defensor elige libremente"],
            cues: ["«¡Mirá al defensor, no al aro!»", "«¿Vino a vos? Pasá.»", "«¿No vino? Terminá.»"],
            errors: ["Pasar siempre, sin mirar", "Pasar demasiado tarde, con el defensor encima", "Atacantes muy juntos"],
            corrections: ["El entrenador pregunta antes de corregir [S1]", "Marcar con conos dónde decidir", "Separar los carriles con conos"],
            variants: ["Desde la esquina y el ala, en media cancha", "Con un segundo defensor que llega desde atrás (pasa a 2 contra 2)"],
            progressions: ["3 contra 2", "2 contra 1 + 1 que llega desde atrás"],
            regressions: ["Defensor pasivo que se queda en un lugar avisado", "Sin dribbling: solo pases"],
            evaluation: ["Decisiones correctas sobre el total", "Pases que llegan a tiempo", "Finalizaciones con la ventaja"],
            basis: "Ejemplo de 2 contra 1 del manual WABC nivel 2, 2.1.5 [S1], organizado como ejercicio por Basket Lab."
        },
        {
            id: "ej-3c3-decision",
            name: "3 contra 3: la ventaja viaja",
            works: ["Toma de decisiones", "Penetración", "Pase de descarga", "Closeout"],
            meta: { fundamento: "Ventajas", fundamentos: ["kick-out", "catch-shoot", "closeout", "drible-avance"], objetivo: "Pasar la ventaja y atacar el closeout", categories: ["U15", "U17", "Mayores"], level: "Intermedio", minPlayers: 6, maxPlayers: 12, minutes: [12, 15], court: "half", hoops: 1, materials: ["Balones"], optionalMaterials: ["Petos"], blockType: "tactica" },
            adaptations: [{ id: "dos", label: "Con 4 jugadores", text: "2 contra 2 con penetración obligatoria y punto doble por pase extra.", req: { minPlayers: 4 } }],
            kind: "method",
            refs: ["S1", "S2"],
            board: "penetrar-descargar",
            objective: "Crear una ventaja con la penetración y conservarla con el pase extra o el ataque al closeout.",
            secondary: ["Receptores que se reubican durante la penetración [S2]", "Defensa: ayudar y recuperar"],
            category: "U15 a mayores",
            level: "Intermedio",
            players: "3 contra 3 por canasta; rotación por equipos",
            playersShort: "6 a 12 jugadores",
            duration: "12 a 15 minutos",
            space: "Media cancha",
            hoops: "1",
            materials: "Balones (petos opcionales)",
            organization: "Tres atacantes en arriba, ala y esquina opuesta. Tres defensores.",
            development: "Se juega 3 contra 3. Cada posesión empieza con una penetración. Puntuación especial: 2 puntos por canasta, 1 punto extra si la canasta llegó después de un pase extra o de atacar un closeout.",
            rules: ["La primera acción es una penetración", "Sin bloqueos en la primera versión", "Ataque hasta canasta o pérdida; se cambia de rol"],
            cues: ["«¡Para anotar!» [S2]", "«¿Quién ayudó?» [S1]", "«Si llegó bien, pasala.»"],
            errors: ["Penetrar sin atacar el aro", "Receptores quietos", "Tirar contra un closeout bien hecho"],
            corrections: ["Exigir dos pies en la pintura [S2]", "Mostrar en la pizarra dónde reubicarse", "Pausar y preguntar qué otra opción había"],
            variants: ["Con un bloqueo directo permitido", "Con la regla «la ventaja se pasa»: no se puede tirar después de recibir una descarga si el defensor llegó"],
            progressions: ["4 contra 4 con la misma puntuación", "Limitar el tiempo de posesión a 12 segundos"],
            regressions: ["Defensa que no puede robar el pase", "Solo penetración y descarga, sin pase extra"],
            evaluation: ["Canastas con punto extra", "Penetraciones que atraen ayuda", "Tiros contra closeout bien hecho (bajar)"],
            basis: "Propuesta de Basket Lab a partir de los principios de penetración y recepción [S2] y de la enseñanza por decisiones [S1]."
        }
    ];

    var variantes = [
        {
            id: "relaciones", title: "Relaciones con otros contenidos", kind: "interpretation",
            blocks: [
                { p: "Este principio no tiene una «variante» propia: aparece dentro de cada acción. Estas son las relaciones más directas." },
                { links: [
                    { label: "Spacing", go: "tl_spacing" },
                    { label: "Pick and roll", go: "tl_pick-and-roll" },
                    { label: "5 Out", go: "tl_cinco-abiertos" },
                    { label: "Superioridades 2c1 · 3c2 · 4c3", go: "tl_superioridades" },
                    { label: "Ataque contra zona 2-3", go: "tl_ataque-zona-2-3" }
                ], label: "En el laboratorio" }
            ]
        },
        {
            id: "defensa", title: "Cómo responde la defensa", kind: "interpretation",
            blocks: [
                { list: [
                    "**Evitar la primera ventaja:** contener el balón sin ayuda (cuando el defensor puede).",
                    "**Ayudar y recuperar:** frenar la penetración y volver a su atacante con un closeout.",
                    "**Rotar:** el segundo defensor toma al libre y el resto se reorganiza.",
                    "**Cambiar:** evita la ventaja posicional del bloqueo, a cambio de un posible desajuste de emparejamiento."
                ] }
            ]
        }
    ];

    return {
        id: "tl-ventajas",
        title: "Creación y aprovechamiento de ventajas",
        subtitle: "Desequilibrar a la defensa, leer quién ayudó y pasar la ventaja antes de que desaparezca.",
        sectionLabel: "Laboratorio táctico · Principios del juego",
        playCategory: "Ataque",
        meta: ["Principio ofensivo", "Todas las categorías", "2 pizarras", "1 video", "2 ejercicios"],
        updated: "2026-11-28",
        tabOrder: ["aprender", "visualizar", "entrenar", "variantes", "fuentes"],
        quickJumps: [
            { label: "Ver en la pizarra", tab: "visualizar" },
            { label: "Ejercicios", tab: "entrenar", section: "ej-2c1-decision" }
        ],
        ficha: {
            en: "Creating and using advantages",
            definition: "Ganarle tiempo o espacio a la defensa y usar esa diferencia antes de que la defensa se recupere.",
            objective: "Que la defensa tenga que ayudar y que el ataque encuentre al jugador que quedó libre.",
            prereqs: ["Triple amenaza", "Pase de descarga", "Catch and shoot"],
            applications: ["Penetración y descarga", "Pick and roll", "Inversión del balón", "Contraataque"],
            labels: { objective: "Qué problema resuelve", prereqs: "Fundamentos necesarios", applications: "Dónde aparece" }
        },
        tabs: { aprender: aprender, visualizar: visualizar, entrenar: entrenar, variantes: variantes },
        boards: boards,
        exercises: exercises,
        sources: sources,
        unavailableSources: []
    };
});
