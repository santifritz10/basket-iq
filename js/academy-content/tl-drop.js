/*
 * Basket Lab · Laboratorio táctico · Drop (cobertura del pick and roll)
 *
 * Redacción original de Basket Lab en español. Las citas [S1]..[Sn] remiten a la
 * bibliografía del final, consultada directamente el 28/11/2026. El término «drop» no
 * aparece en las secciones del manual WABC que pudimos consultar: lo que la ficha explica
 * sobre la cobertura es interpretación de Basket Lab y se marca así.
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
        Cat.source("wabc-l1-1-2-5", "S1"),
        Cat.source("wabc-l2-1-2-1", "S2"),
        Cat.source("wabc-l3-1-2-2", "S3")
    ];

    var PLAYERS = {
        o1: O("1", 9.4, 7.5), o5: O("5", 7.6, 6.2), o2: O("2", 6.6, 1.8), o3: O("3", 6.6, 13.2), o4: O("4", 1.2, 14.1),
        x1: D("1", 8.6, 7.6), x5: D("5", 6.4, 6.6), x2: D("2", 5.6, 2.6), x3: D("3", 5.2, 11.4), x4: D("4", 2.4, 12.4)
    };

    var boards = [
        {
            id: "drop-basico",
            title: "La cobertura, paso a paso",
            kind: "interpretation",
            intro: "Bloqueo central. El defensor del balón pasa por arriba del bloqueo y lo persigue; el defensor del bloqueador espera atrás, entre el balón y el aro.",
            spec: {
                view: VIEW,
                players: PLAYERS,
                phases: [
                    { name: "Llega el bloqueo", ball: "o1", note: "El 5 bloquea a X1. X5 ya está retrasado, por debajo de la altura del bloqueo, y avisa la cobertura.", strokes: [["screen_on", "o5", [8.4, 6.6]], ["move", "x5", [5.8, 6.8]]] },
                    { name: "Uso del bloqueo", note: "El 1 ataca por el lado del bloqueo. X1 pasa por arriba y lo persigue por detrás. X5 retrocede de frente al balón: contiene la penetración y no lo deja llegar cómodo al aro.", strokes: [["dribble", "o1", [6.6, 4.8], 0.3], ["move", "x1", [7.4, 5.4]], ["rotation", "x5", [4.6, 5.8]]] },
                    { name: "Continuación", note: "El 5 continúa hacia el aro. X5 queda entre el manejador y el bloqueador que continúa. Los defensores del lado débil se hunden hacia la pintura.", strokes: [["cut", "o5", [3.0, 7.0], 0.3], ["rotation", "x4", [2.4, 9.6]], ["rotation", "x3", [4.6, 9.6]]] },
                    { name: "El espacio que concede", note: "Queda un espacio de tiro entre X5 y X1, que viene detrás. Por eso el drop suele usarse contra manejadores que no castigan ese tiro, o con un ajuste.", zones: [{ x: 5.0, y: 3.4, w: 1.8, h: 1.8, color: "#dc2626" }] }
                ]
            }
        },
        {
            id: "drop-respuestas",
            title: "Respuestas ofensivas habituales",
            kind: "interpretation",
            intro: "Tres formas habituales de atacar el drop. Ninguna es automática: depende de quién tiene el balón y de dónde están las ayudas.",
            spec: {
                view: VIEW,
                players: {
                    o1: O("1", 6.6, 4.8), o5: O("5", 3.4, 6.6), o2: O("2", 6.6, 1.8), o3: O("3", 6.6, 13.2), o4: O("4", 1.2, 14.1),
                    x1: D("1", 7.4, 5.4), x5: D("5", 4.6, 5.8), x2: D("2", 5.4, 2.4), x3: D("3", 4.6, 9.6), x4: D("4", 2.4, 9.6)
                },
                phases: [
                    { name: "Tiro tras dribbling", ball: "o1", note: "Si X5 está muy atrás y X1 viene detrás, el manejador puede frenar y tirar.", strokes: [["shot", "o1", HOOP]] },
                    { name: "Pocket pass", note: "Si X5 sube a frenar el tiro, el pase picado entre los dos defensores llega al bloqueador que continúa.", strokes: [["pass", "o1", "o5"]] },
                    { name: "Pase al lado débil", note: "Si X4 se hunde a tomar al bloqueador, la esquina queda libre.", strokes: [["pass", "o5", "o4"]] }
                ]
            }
        }
    ];

    var aprender = [
        {
            id: "que-es", title: "Qué es", kind: "interpretation",
            blocks: [
                { p: "**Drop** es una **cobertura** del bloqueo directo: el defensor del bloqueador **se queda retrasado**, cerca de la pintura, en lugar de salir a frenar al manejador. El defensor del balón pasa por arriba del bloqueo y lo persigue. La idea es contener al manejador entre los dos y proteger el aro, concediendo, si hace falta, un tiro de media distancia." },
                { p: "Es una **cobertura**, no un sistema defensivo: el equipo puede usarla en algunos bloqueos y otra cobertura en otros." }
            ]
        },
        {
            id: "terminologia", title: "Sobre el nombre y las fuentes", kind: "official", refs: ["S1", "S2", "S3"],
            blocks: [
                { p: "En las secciones del manual WABC que consultamos, la cobertura no aparece con el nombre «drop». El manual enumera cinco técnicas para defender un bloqueo directo —por debajo, por arriba, a través, cambio y doble— y suma luego «push», también llamado «ice» [S1] [S2]. En nivel 3 describe un esquema donde, según el lugar del bloqueo, el defensor del bloqueador da un paso vertical para frenar al manejador y el resto se hunde hacia la pintura [S3]." },
                { callout: "El nombre «drop» y la manera de describirlo en esta ficha vienen del uso actual entre entrenadores; otros lo llaman «contención baja» o «big back». La sección WABC sobre defensa colectiva del pick and roll no pudo consultarse (ver Fuentes). Lo que sigue es interpretación de Basket Lab.", tone: "warn", title: "Lectura honesta" }
            ]
        },
        {
            id: "objetivo", title: "Objetivo", kind: "interpretation",
            blocks: [
                { list: ["Proteger el aro y la pintura.", "Evitar que el bloqueo genere un 2 contra 1 sobre el balón.", "Mantener a cada defensor con su atacante (sin cambios ni dobles).", "Reducir las ayudas del lado débil."] }
            ]
        },
        {
            id: "responsabilidades", title: "Responsabilidades", kind: "interpretation",
            blocks: [
                { table: { head: ["Defensor", "Responsabilidad"], rows: [
                    ["Del balón (X1)", "Pasa por arriba del bloqueo, lo más pegado posible, y persigue por detrás para molestar el tiro. No se queda enganchado en el bloqueo."],
                    ["Del bloqueador (X5)", "Espera retrasado, de frente al balón. Contiene la penetración hasta que X1 vuelve y retrocede con el bloqueador que continúa."],
                    ["Lado débil (X3, X4)", "Se hunden hacia la pintura para tomar al bloqueador si X5 queda con el balón; vuelven a sus atacantes con un closeout."],
                    ["Lado del balón (X2)", "No ayuda de más: su atacante es un pase corto."]
                ] } },
                { p: "La diferencia clave: X1 es responsable del **manejador**; la cobertura colectiva depende de que X5 elija bien la **altura** y de que el lado débil llegue." }
            ]
        },
        {
            id: "posicionamiento", title: "Posicionamiento", kind: "interpretation",
            blocks: [
                { p: "La altura de X5 es el ajuste principal. Más atrás protege mejor el aro pero concede más tiro; más arriba (a la altura del bloqueo) cierra el tiro pero facilita el pocket pass y el pick and pop. No existe una distancia correcta para todos: depende del manejador, del bloqueador y del reloj." }
            ]
        },
        {
            id: "ventajas-riesgos", title: "Ventajas y riesgos", kind: "interpretation",
            blocks: [
                { table: { head: ["Ventajas", "Riesgos"], rows: [
                    ["Protege el aro con el jugador grande cerca", "Concede el tiro tras dribbling de media distancia"],
                    ["Pocas rotaciones: cada uno con su atacante", "Pick and pop: el bloqueador abierto tira sin oposición"],
                    ["Sin desajustes de emparejamiento", "Pocket pass y short roll si X5 sube a frenar"],
                    ["Simple de enseñar", "Exige que X1 pase el bloqueo rápido; si se queda, hay 2 contra 1"]
                ] } }
            ]
        },
        {
            id: "jugadores", title: "Características necesarias", kind: "interpretation",
            blocks: [
                { list: ["**X5:** lectura, desplazamiento hacia atrás de frente al balón y buena protección del aro.", "**X1:** capacidad de pasar el bloqueo pegado y perseguir sin cometer falta.", "**Lado débil:** disciplina para hundirse y volver."] },
                { links: [
                    { label: "Contención del dribbling", go: "fundamento_contencion" },
                    { label: "Desplazamiento defensivo", go: "fundamento_desplazamiento" },
                    { label: "Defensa de ayuda", go: "fundamento_ayuda" }
                ], label: "Fundamentos relacionados" }
            ]
        },
        {
            id: "cuando", title: "Cuándo puede convenir y cuándo no", kind: "interpretation",
            blocks: [
                { h: "Puede convenir" },
                { list: ["Contra manejadores que no castigan el tiro tras dribbling.", "Con un defensor interior lento para salir al perímetro pero bueno cerca del aro.", "Cuando el bloqueador no tira de afuera."] },
                { h: "Puede no convenir" },
                { list: ["Contra un manejador que tira bien tras dribbling.", "Contra un bloqueador que se abre a tirar (pick and pop).", "Al final de la posesión, si el rival necesita un tiro de dos y la defensa prefiere obligar al pase."] }
            ]
        },
        {
            id: "errores", title: "Errores frecuentes", kind: "interpretation",
            blocks: [
                { table: { head: ["Error", "Qué provoca", "Corrección"], rows: [
                    ["X1 se queda en el bloqueo", "2 contra 1 contra X5", "Pegarse al bloqueador y pasar por arriba con el hombro"],
                    ["X5 demasiado atrás", "Tiro libre de marca", "Ajustar la altura según el manejador"],
                    ["X5 sube a frenar y no vuelve", "Pocket pass al bloqueador", "Contener y retroceder; no ir al balón"],
                    ["El lado débil no se hunde", "Bandeja del bloqueador", "Avisar y tocar al bloqueador"],
                    ["Nadie avisa la cobertura", "Dudas y desajustes", "X5 habla antes del bloqueo"]
                ] } }
            ]
        }
    ];

    var visualizar = [
        "drop-basico",
        "drop-respuestas",
        {
            id: "simulador-pnr", title: "Probarlo en el simulador", kind: "interpretation",
            blocks: [
                { p: "La guía de **Pick and roll** tiene un simulador de pick and roll lateral con la cobertura Drop y otras coberturas para comparar sobre la misma acción." },
                { links: [{ label: "Abrir el simulador de pick and roll", go: "tl_pick-and-roll" }] }
            ]
        }
    ];

    var entrenar = [
        {
            id: "objetivos", title: "Objetivos de enseñanza", kind: "method",
            blocks: [
                { list: ["X1: pasar el bloqueo por arriba y perseguir.", "X5: elegir la altura y retroceder de frente.", "Lado débil: hundirse y volver.", "Comunicar la cobertura antes del bloqueo."] }
            ]
        },
        {
            id: "progresion", title: "Progresión orientativa", kind: "method",
            blocks: [
                { table: { head: ["Etapa", "Formato", "Qué se busca"], rows: [
                    ["1", "Técnica individual: pasar el bloqueo y desplazarse hacia atrás", "Movimientos de X1 y X5"],
                    ["2", "2 contra 2 (ejercicio 1)", "Coordinación entre X1 y X5"],
                    ["3", "3 contra 3 con un tirador en la esquina", "Ayuda del lado débil"],
                    ["4", "5 contra 5 con pick and roll obligatorio", "Cobertura dentro del sistema"]
                ] } },
                { p: "Orientativa. También se puede empezar por el 3 contra 3 y volver a la técnica cuando aparezca el problema." }
            ]
        },
        {
            id: "adaptaciones", title: "Adaptaciones por categoría", kind: "method",
            blocks: [
                { table: { head: ["Grupo", "Adaptación"], rows: [
                    ["Minibásquet y U13", "No conviene enseñar coberturas de pick and roll: priorizar la defensa individual y las ayudas"],
                    ["U15", "Pasar el bloqueo y contener; sin nombres de coberturas"],
                    ["U17–U19", "Drop como una cobertura entre varias; comparar con cambio y ajustes"],
                    ["Mayores", "Elegir la cobertura según el informe del rival"]
                ] } }
            ]
        }
    ];

    var exercises = [
        {
            id: "ej-2c2-drop",
            name: "2 contra 2 de pick and roll contra drop",
            works: ["Defensa del pick and roll", "Contención", "Pasar el bloqueo"],
            meta: { fundamento: "Drop", fundamentos: ["contencion", "desplazamiento", "ayuda"], objetivo: "Coordinar al defensor del balón y al del bloqueador", categories: ["U17", "Mayores"], level: "Intermedio", minPlayers: 4, maxPlayers: 12, minutes: [10, 14], court: "half", hoops: 1, materials: ["Balones"], optionalMaterials: ["Conos"], blockType: "tactica" },
            adaptations: [{ id: "tres", label: "Con 6 jugadores", text: "Sumar un atacante y un defensor en la esquina del lado débil (3 contra 3).", req: { minPlayers: 6 } }],
            kind: "method",
            board: "drop-basico",
            objective: "Que el defensor del balón pase por arriba y persiga, y que el defensor del bloqueador contenga y retroceda.",
            secondary: ["Ataque: leer la altura de X5 (tiro, pocket pass o continuación)", "Comunicación"],
            category: "U17 a mayores",
            level: "Intermedio",
            players: "4 por grupo (2 contra 2); rotan",
            playersShort: "4 a 12 jugadores",
            duration: "10 a 14 minutos",
            space: "Media cancha",
            hoops: "1",
            materials: "Balones (conos opcionales para marcar la altura de X5)",
            organization: "Manejador arriba, bloqueador en el codo. Cada uno con su defensor.",
            development: "Se juega 2 contra 2 con un bloqueo central obligatorio. La defensa juega drop. El ataque elige: tiro tras dribbling, pocket pass o pase al que continúa. Se juega hasta canasta o recuperación.",
            rules: ["Bloqueo obligatorio en el primer ataque", "El manejador puede rechazar el bloqueo una vez por grupo", "Rotan ataque y defensa en cada posesión"],
            cues: ["X5: «¡Drop, drop!» antes del bloqueo", "X1: «¡Arriba y persigo!»", "X5: «¡De frente, hacia atrás!»"],
            errors: ["X1 se queda enganchado", "X5 sube y no vuelve", "Nadie avisa"],
            corrections: ["Marcar con un cono la altura de X5", "Pausar y preguntar al ataque qué vio", "Punto para el ataque si no hubo aviso"],
            variants: ["El entrenador indica la altura de X5 (atrás o a la altura del bloqueo)", "Bloqueo lateral"],
            progressions: ["3 contra 3 con tirador en la esquina", "Bloqueador que puede abrirse a tirar (pick and pop)"],
            regressions: ["Manejador sin tiro", "Defensa sin robos"],
            evaluation: ["Bloqueos pasados por arriba sin 2 contra 1", "Tiros de media distancia disputados", "Pocket pass concedidos"],
            basis: "Propuesta de Basket Lab. La técnica de pasar por arriba o por debajo según el tirador sigue al esquema que describe el manual WABC nivel 3 [S3]."
        }
    ];

    var variantes = [
        {
            id: "ajustes", title: "Ajustes", kind: "interpretation",
            blocks: [
                { list: [
                    "**Drop más alto (a la altura del bloqueo):** cierra el tiro; concede más pocket pass.",
                    "**Por debajo contra no tiradores:** si el manejador no tira, X1 puede pasar por debajo; el manual lo describe como opción contra un manejador que no tira [S3].",
                    "**Combinado con ice (push):** en bloqueos laterales, alejar al manejador del bloqueo y mantener a X5 atrás [S2].",
                    "**Cambio con el bloqueador débil en el tiro:** cuando el bloqueador no amenaza, algunos equipos cambian en lugar de drop."
                ] }
            ]
        },
        {
            id: "comparar", title: "Comparación con otras coberturas", kind: "interpretation",
            blocks: [
                { p: "Ninguna cobertura es superior en general. Cada una cambia qué concede la defensa." },
                { table: { head: ["Cobertura", "Qué protege", "Qué concede"], rows: [
                    ["Drop", "Aro y pintura; sin rotaciones largas", "Tiro de media distancia; pick and pop"],
                    ["Cambio (switch)", "El tiro del manejador; sin 2 contra 1", "Desajustes de emparejamiento"],
                    ["Hedge o show", "Frena al manejador lejos del aro", "El bloqueador que continúa, si nadie lo toma"],
                    ["Blitz o trap", "Saca el balón del manejador", "4 contra 3 detrás de la trampa"],
                    ["Ice (push)", "El medio de la cancha", "El tiro hacia la banda y el pase de vuelta"]
                ] } }
            ]
        },
        {
            id: "relaciones", title: "Relaciones", kind: "interpretation",
            blocks: [
                { links: [
                    { label: "Pick and roll", go: "tl_pick-and-roll" },
                    { label: "Creación de ventajas", go: "tl_ventajas" }
                ] }
            ]
        }
    ];

    return {
        id: "tl-drop",
        title: "Drop",
        subtitle: "El defensor del bloqueador espera atrás y protege la pintura: qué protege, qué concede y cuándo puede convenir.",
        sectionLabel: "Laboratorio táctico · Defensa colectiva",
        playCategory: "Defensa",
        meta: ["Cobertura defensiva", "Desde U17", "2 pizarras", "1 ejercicio"],
        updated: "2026-11-28",
        tabOrder: ["aprender", "visualizar", "entrenar", "variantes", "fuentes"],
        quickJumps: [
            { label: "Ver en la pizarra", tab: "visualizar" },
            { label: "Comparar coberturas", tab: "variantes", section: "comparar" }
        ],
        ficha: {
            en: "Drop coverage",
            definition: "Cobertura del bloqueo directo en la que el defensor del bloqueador se queda retrasado, cerca de la pintura, y el defensor del balón persigue por arriba.",
            objective: "Proteger el aro sin cambiar ni doblar.",
            prereqs: ["Contención del dribbling", "Desplazamiento defensivo", "Defensa de ayuda"],
            applications: ["Bloqueo central", "Contra bloqueadores que no tiran", "Con un defensor interior protector del aro"],
            labels: { objective: "Qué problema resuelve", prereqs: "Fundamentos necesarios", applications: "Cuándo se usa" }
        },
        tabs: { aprender: aprender, visualizar: visualizar, entrenar: entrenar, variantes: variantes },
        boards: boards,
        exercises: exercises,
        sources: sources,
        unavailableSources: Cat.unavailable(["wabc-l2-1-2-4"])
    };
});
