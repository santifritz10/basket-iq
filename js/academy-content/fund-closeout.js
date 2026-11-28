/*
 * Basket Lab · Fundamentos · Closeout (ficha modelo)
 *
 * Redacción original de Basket Lab en español. Las citas [S1]..[Sn] remiten a la
 * bibliografía del final, consultada directamente el 28/11/2026.
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
        Cat.source("cm-en", "S1", { locator: "3.2 Glossary, pág. 19 («Close-out»)", used: "Definición del closeout: llegar corriendo a un brazo del atacante para cuando recibe, terminar con pasos cortos y rápidos y las dos manos arriba; «largo» contra un tirador y «corto» (a 2–3 m) contra un jugador que penetra." }),
        Cat.source("cm-es", "S2"),
        Cat.source("mini-es", "S3", { locator: "2 Enseñanza centrada en el juego (2.1–2.3, págs. 6–9)", used: "Incluir un defensor desde temprano y enseñar a partir del juego, con preguntas." })
    ];

    var boards = [
        {
            id: "ayuda-y-closeout",
            title: "De la ayuda al closeout",
            kind: "official",
            refs: ["S1"],
            intro: "El defensor del ala ayuda contra la penetración y, cuando sale el pase, cierra sobre su atacante. La pizarra muestra la distancia que hay que recorrer: no muestra la técnica del cuerpo.",
            spec: {
                view: VIEW,
                players: { o1: O("1", 8.6, 7.5), o2: O("2", 6.6, 2.0), x1: D("1", 7.7, 7.5), x2: D("2", 5.8, 3.0) },
                phases: [
                    { name: "Penetración", note: "El 1 supera a su defensor por el medio. El defensor del 2 deja a su atacante y se mete en el camino para frenar la penetración.", ball: "o1", strokes: [["dribble", "o1", [5.4, 6.4], 0.3], ["rotation", "x2", [4.8, 5.4]], ["rotation", "x1", [6.6, 7.6]]] },
                    { name: "Pase de descarga", note: "El 1 ve la ayuda y descarga al 2, que espera listo para tirar.", strokes: [["pass", "o1", "o2"]] },
                    { name: "Closeout", note: "El defensor sale corriendo mientras el balón viaja y termina con pasos cortos a un brazo de distancia, manos arriba [S1].", strokes: [["rotation", "x2", [6.0, 2.7]]], zones: [{ x: 5.6, y: 1.6, w: 1.6, h: 1.6, color: "#f97316" }] },
                    { name: "Contener lo que sigue", note: "Si el 2 no tira y arranca, el defensor ya está en posición para contenerlo. El objetivo no es solo tapar el tiro: es no regalar la penetración.", zones: [], strokes: [["dribble", "o2", [4.4, 2.6], 0.2], ["move", "x2", [4.8, 3.4]]] }
                ]
            }
        }
    ];

    var aprender = [
        {
            id: "que-es", title: "Qué es", kind: "official", refs: ["S1", "S2"],
            blocks: [
                { p: "El closeout es la **salida del defensor hacia el atacante que recibe**, generalmente después de una ayuda o de una rotación. El manual WABC lo describe como llegar corriendo hasta quedar a un brazo de distancia cuando el atacante recibe, y terminar con pasos cortos y rápidos [S1]. En la versión en español del manual se lo llama «ajustarse al atacante» o «ajustarse al tirador» [S2]." }
            ]
        },
        {
            id: "para-que", title: "Para qué sirve", kind: "interpretation",
            blocks: [
                { list: ["Disputar un tiro desde la recepción sin regalar la penetración.", "Recuperar al propio atacante después de ayudar.", "Ganar tiempo para que el resto del equipo se reacomode."] }
            ]
        },
        {
            id: "cuando", title: "Cuándo utilizarlo", kind: "interpretation",
            blocks: [
                { p: "Cada vez que el balón llega a un atacante que estaba lejos de su defensor: después de una ayuda, de una rotación, de un pase cruzado al lado débil o en transición defensiva." },
                { p: "El tipo de closeout depende de **quién recibe**: no es lo mismo un buen tirador que un jugador que prefiere penetrar." }
            ]
        },
        {
            id: "principios", title: "Principios técnicos", kind: "official", refs: ["S1"],
            blocks: [
                { steps: [
                    { title: "Salir mientras el balón viaja", text: "La carrera empieza con el pase, no con la recepción. Así se llega a tiempo." },
                    { title: "Correr primero, frenar después", text: "Carrera en la primera parte del recorrido y pasos cortos y rápidos al final para no pasarse [S1]." },
                    { title: "Llegar a un brazo", text: "La distancia de referencia es un brazo del atacante cuando recibe [S1]." },
                    { title: "Manos arriba al final", text: "Las dos manos se levantan al terminar el closeout [S1]." },
                    { title: "Largo o corto según el atacante", text: "Largo, más cerca, contra un tirador; corto, a unos 2–3 metros, contra un jugador que penetra [S1]." }
                ] },
                { figure: "closeout-phases", caption: "Ilustración propia de Basket Lab basada en la definición del glosario WABC [S1]." }
            ]
        },
        {
            id: "ejecutar", title: "Cómo hacerlo (paso a paso)", kind: "interpretation", audience: "player",
            blocks: [
                { list: ["Mientras ayudás, mirá el balón y a tu atacante a la vez.", "Cuando sale el pase, arrancá: no esperes a que reciba.", "Corré los primeros metros. A unos dos o tres metros, empezá a frenar con pasos cortos y rápidos.", "Llegá con el cuerpo bajo, en equilibrio, con las manos arriba.", "Si es un tirador, llegá más cerca. Si es un penetrador, frená antes.", "Si arranca, ya estás listo para desplazarte y contenerlo."] }
            ]
        },
        {
            id: "errores", title: "Errores frecuentes", kind: "interpretation",
            blocks: [
                { table: { head: ["Error", "Qué provoca", "Corrección"], rows: [
                    ["Salir tarde (cuando recibe)", "Tiro libre de marca", "Arrancar con el pase"],
                    ["Llegar corriendo sin frenar", "El atacante lo pasa con un dribbling", "Pasos cortos en los últimos metros [S1]"],
                    ["Saltar a la finta", "Penetración o falta", "Manos arriba sin despegar los pies"],
                    ["Mismo closeout para todos", "Regalar el tiro o la penetración", "Largo al tirador, corto al penetrador [S1]"],
                    ["Cuerpo alto al llegar", "Sin reacción lateral", "Llegar con las piernas flexionadas"]
                ] } }
            ]
        },
        {
            id: "variantes", title: "Variantes", kind: "interpretation",
            blocks: [
                { list: [
                    "**Closeout largo:** contra un tirador; llegar cerca y con las manos altas [S1].",
                    "**Closeout corto:** contra un penetrador; frenar a unos 2–3 metros [S1].",
                    "**Closeout con orientación:** llegar cerrando un lado para empujar al atacante hacia la ayuda. Es una decisión del sistema defensivo del equipo, no del manual citado."
                ] }
            ]
        }
    ];

    var visualizar = [
        {
            id: "esquema", title: "Las fases del closeout", kind: "official", refs: ["S1"],
            blocks: [
                { figure: "closeout-phases", caption: "Carrera, pasos cortos y llegada a un brazo. Abajo, la diferencia entre el closeout largo y el corto." }
            ]
        },
        "ayuda-y-closeout",
        {
            id: "videos", title: "Material audiovisual", kind: "interpretation",
            blocks: [
                { callout: "Todavía no hay un video verificado para esta ficha. El capítulo oficial de FIBA «Defending penetration» está en el catálogo, pero lo asociamos a la contención del dribbling: por el título no podemos asegurar que muestre closeouts, y no lo revisamos minuto a minuto. Preferimos una ficha completa sin video antes que un video que no corresponde.", tone: "info", title: "Sin video por ahora" }
            ]
        }
    ];

    var entrenar = [
        {
            id: "progresion", title: "Progresión orientativa", kind: "method", refs: ["S3"],
            blocks: [
                { p: "No es una secuencia obligatoria. Conviene sumar un atacante real lo antes posible [S3]." },
                { table: { head: ["Etapa", "Qué se busca", "Ejercicio"], rows: [
                    ["Familiarización", "Correr y frenar con pasos cortos", "Closeout a un cono (ejercicio 1)"],
                    ["Ejecución y control", "Llegar a un brazo con manos arriba", "Closeout a un compañero quieto (ejercicio 1, progresión)"],
                    ["Variabilidad", "Distintas distancias y ángulos", "Closeout desde la pintura a distintos lugares (ejercicio 1, variante)"],
                    ["Oposición guiada", "Largo o corto según el atacante", "Closeout y uno contra uno (ejercicio 2)"],
                    ["Toma de decisiones y juego", "Ayudar y recuperar", "Penetrar, descargar y cerrar 2 contra 2 (ejercicio 3)"]
                ] } }
            ]
        },
        {
            id: "solo", title: "Cómo practicar solo", kind: "method", audience: "player",
            blocks: [
                { list: ["Poné un cono a 5 metros. Arrancá desde la pintura, corré y frená con pasos cortos justo a un brazo del cono.", "Hacelo 10 veces desde distintos ángulos.", "Agregá un desplazamiento lateral al final: como si el atacante arrancara.", "Pedile a alguien que te filme de costado para ver si llegás con el cuerpo bajo."] }
            ]
        },
        {
            id: "consignas", title: "Consignas y correcciones", kind: "method", audience: "coach",
            blocks: [
                { list: ["«¡Salí con el pase!»", "«¡Corré, frená, llegá!»", "«¡Un brazo!»", "«¡Manos arriba, pies en el piso!»", "«¿Tirador o penetrador?»"] },
                { p: "Preguntá antes de corregir: «¿por qué te pasó con un dribbling?». La respuesta suele ser la llegada sin frenar [S3]." }
            ]
        },
        {
            id: "adaptaciones", title: "Adaptaciones según edad y nivel", kind: "method", audience: "coach",
            blocks: [
                { table: { head: ["Grupo", "Adaptación"], rows: [
                    ["Minibásquet", "Juegos de persecución con frenada; distancias cortas y sin exigir el tipo de closeout"],
                    ["U13–U15", "Closeout corto y largo con atacantes reales; contención después de llegar"],
                    ["U17 y mayores", "Closeout dentro de rotaciones del equipo, según informe del rival (quién tira y quién penetra)"]
                ] } }
            ]
        }
    ];

    var exercises = [
        {
            id: "ej-cono",
            name: "Closeout a un cono",
            solo: true,
            works: ["Closeout", "Posición defensiva", "Desplazamiento defensivo"],
            meta: { fundamento: "Closeout", fundamentos: ["closeout", "posicion-defensiva", "desplazamiento"], objetivo: "Correr, frenar y llegar a un brazo", categories: ["Mini", "U13", "U15", "U17"], level: "Inicial", minPlayers: 1, maxPlayers: 16, minutes: [5, 8], court: "half", hoops: 0, materials: ["Conos"], optionalMaterials: [], blockType: "fundamentos" },
            adaptations: [],
            kind: "method",
            refs: ["S1"],
            objective: "Automatizar la carrera inicial, la frenada con pasos cortos y la llegada equilibrada con las manos arriba.",
            secondary: ["Cuerpo bajo al llegar", "Desplazamiento lateral posterior"],
            category: "Minibásquet a mayores",
            level: "Inicial",
            players: "De 1 a 16 en filas",
            playersShort: "1 a 16 jugadores",
            duration: "5 a 8 minutos",
            space: "Media cancha",
            hoops: "0",
            materials: "Conos (uno por fila)",
            organization: "Filas en la pintura. Un cono en el ala o en la esquina, a 5–6 metros.",
            development: "A la señal, el primero corre hacia el cono, frena con pasos cortos y llega a un brazo con las manos arriba. Hace dos desplazamientos laterales y vuelve a la fila.",
            rules: ["Salida con una señal (palmada o pase al aire del entrenador)", "No se toca el cono", "Los desplazamientos laterales sin cruzar los pies"],
            cues: ["«¡Corré, frená, llegá!» [S1]", "«¡Un brazo!»", "«¡Manos arriba!»"],
            errors: ["Pasarse del cono", "Llegar parado y alto", "Mirar el piso"],
            corrections: ["Marcar con cinta el lugar donde empiezan los pasos cortos", "Exigir rodillas flexionadas al llegar", "El entrenador muestra un número con la mano al lado del cono"],
            variants: ["Desde distintos lugares de la pintura", "Closeout largo (cono como tirador) y corto (cono como penetrador) según una señal", "Con un compañero quieto en lugar del cono"],
            progressions: ["Compañero que recibe un pase", "Más distancia", "Salir después de tocar la pintura"],
            regressions: ["Caminando la parte final", "Menos distancia"],
            evaluation: ["Llegadas a un brazo sin pasarse", "Manos arriba al final", "Equilibrio para desplazarse"],
            basis: "Propuesta de Basket Lab para practicar la definición del closeout del glosario WABC [S1]."
        },
        {
            id: "ej-closeout-1c1",
            name: "Closeout y uno contra uno",
            works: ["Closeout", "Contención del dribbling", "Catch and shoot", "Crossover"],
            meta: { fundamento: "Closeout", fundamentos: ["closeout", "contencion", "catch-shoot", "crossover"], objetivo: "Largo o corto según el atacante", categories: ["U13", "U15", "U17", "Mayores"], level: "Intermedio", minPlayers: 3, maxPlayers: 12, minutes: [8, 12], court: "half", hoops: 1, materials: ["Balones"], optionalMaterials: [], blockType: "fundamentos" },
            adaptations: [{ id: "dos", label: "Con 2 jugadores", text: "El atacante se pasa el balón contra el tablero y el defensor sale desde abajo del aro.", req: { minPlayers: 2 } }],
            kind: "method",
            refs: ["S1"],
            objective: "Elegir el closeout según lo que hace el atacante y contenerlo después.",
            secondary: ["Atacante: tiro desde la recepción o ataque al closeout", "Defensa: no saltar a la finta"],
            category: "U13 a mayores",
            level: "Intermedio",
            players: "3 por grupo (pasador, atacante y defensor); rotan",
            playersShort: "3 a 12 jugadores",
            duration: "8 a 12 minutos",
            space: "Media cancha",
            hoops: "1",
            materials: "Balones",
            organization: "Defensor debajo del aro con balón. Atacante en el ala o la esquina. Pasador opcional en el centro.",
            development: "El defensor pasa al atacante y hace el closeout. El atacante puede tirar si el closeout es corto o llegar tarde, o atacar si el closeout es largo y desequilibrado. Se juega hasta tiro o pérdida.",
            rules: ["Antes de cada intento el entrenador le dice en secreto al atacante si es «tirador» o «penetrador»", "El atacante tiene dos dribblings como máximo", "Rotan en cada intento"],
            cues: ["«¡Salí con el pase!»", "«¿Tirador o penetrador?» [S1]", "Atacante: «¡Pies listos antes de recibir!»"],
            errors: ["Mismo closeout siempre", "Saltar a la finta de tiro", "Atacante que recibe sin preparar pies"],
            corrections: ["Pedir al defensor que diga «largo» o «corto» al salir", "Manos arriba sin despegar", "Ver ficha de Catch and shoot"],
            variants: ["El atacante elige libremente y el defensor lo lee por la ubicación", "Desde el lado débil, después de un pase cruzado"],
            progressions: ["Sumar un segundo atacante y un segundo defensor (ejercicio 3)"],
            regressions: ["Atacante solo tira o solo penetra, avisado", "Sin dribbling"],
            evaluation: ["Closeouts del tipo correcto", "Tiros disputados sin falta", "Penetraciones contenidas"],
            basis: "Propuesta de Basket Lab. El criterio largo/corto es el del glosario WABC [S1]."
        },
        {
            id: "ej-penetrar-descargar",
            name: "Penetrar, descargar y cerrar (2 contra 2)",
            works: ["Closeout", "Defensa de ayuda", "Pase de descarga", "Catch and shoot", "Crossover"],
            meta: { fundamento: "Closeout", fundamentos: ["closeout", "ayuda", "kick-out", "catch-shoot", "crossover"], objetivo: "Ayudar y recuperar", categories: ["U15", "U17", "Mayores"], level: "Intermedio", minPlayers: 4, maxPlayers: 12, minutes: [10, 14], court: "half", hoops: 1, materials: ["Balones"], optionalMaterials: [], blockType: "juego" },
            adaptations: [],
            kind: "method",
            refs: ["S1", "S3"],
            board: "ayuda-y-closeout",
            objective: "Ayudar contra la penetración y cerrar al tirador cuando sale la descarga.",
            secondary: ["Ataque: penetrar y pasar a tiempo", "Tirador listo para recibir", "Defensa: contener después del closeout"],
            category: "U15 a mayores",
            level: "Intermedio",
            players: "4 por grupo (2 contra 2); hasta 12 con rotación",
            playersShort: "4 a 12 jugadores",
            duration: "10 a 14 minutos",
            space: "Media cancha",
            hoops: "1",
            materials: "Balones",
            organization: "Dos atacantes: uno arriba con balón y otro en el ala o la esquina. Cada uno con su defensor.",
            development: "El atacante con balón penetra. El defensor del ala ayuda y, si sale la descarga, hace el closeout. Se juega 2 contra 2 hasta tiro o pérdida. Los atacantes pasan a defender.",
            rules: ["La penetración es obligatoria en el primer ataque", "Punto doble si la defensa ayuda y cierra sin recibir tiro libre de marca", "Rotan atacantes y defensores en cada posesión"],
            cues: ["Ayuda: «¡Balón y hombre!»", "«¡Salí con el pase!»", "«¡Corré, frená, llegá!» [S1]"],
            errors: ["Ayudar demasiado lejos y no llegar al closeout", "No ayudar por miedo al tiro", "Descargar antes de atraer a la ayuda"],
            corrections: ["Ubicar la ayuda a mitad de camino entre el balón y su atacante", "Recordar que la ayuda se recupera con el closeout", "El atacante pasa cuando la ayuda se compromete"],
            variants: ["Descarga desde el poste bajo", "Con un tercer atacante y un tercer defensor (3 contra 3)"],
            progressions: ["3 contra 3 con penetración libre", "Ventaja numérica: 2 contra 1 que pasa a 2 contra 2 cuando llega el segundo defensor"],
            regressions: ["Ayuda sin closeout (solo frenar la penetración)", "Atacante del ala sin dribbling"],
            evaluation: ["Ayudas que frenan la penetración", "Closeouts a tiempo", "Tiros sin oposición permitidos"],
            basis: "Propuesta de Basket Lab centrada en el juego [S3]. La técnica del closeout es la del glosario WABC [S1]. Este mismo ejercicio sirve para Catch and shoot y Crossover: está guardado una sola vez."
        }
    ];

    var evaluar = [
        {
            id: "criterios", title: "Criterios de observación", kind: "official", refs: ["S1"],
            blocks: [
                { checklist: ["Sale cuando el balón está en el aire", "Corre primero y frena con pasos cortos", "Llega a un brazo del atacante", "Termina con las manos arriba sin saltar", "Elige closeout largo o corto según el atacante", "Queda en equilibrio para contener la penetración"] },
                { p: "Las casillas se guardan solo en este dispositivo. Sirven para observar, no para calificar." }
            ]
        },
        {
            id: "indicadores", title: "Indicadores de progreso", kind: "method",
            blocks: [
                { table: { head: ["Nivel", "Lo hace…"], rows: [
                    ["Inicial", "Llega a un cono o a un compañero quieto sin pasarse"],
                    ["Intermedio", "Llega a tiempo contra un atacante real y lo contiene después"],
                    ["Avanzado", "Ayuda, recupera y elige el tipo de closeout dentro del juego"]
                ] } }
            ]
        },
        {
            id: "objetivos", title: "Relación con los objetivos del jugador", kind: "method", audience: "coach",
            blocks: [
                { p: "Estos criterios pueden usarse como referencia para un objetivo defensivo del jugador en **Jugadores Lab**. La evaluación la carga el entrenador; ver esta ficha no modifica ninguna evaluación." }
            ]
        }
    ];

    return {
        id: "fund-closeout",
        conceptId: "closeout",
        sectionId: "fundamento_closeout",
        title: "Closeout",
        subtitle: "La salida del defensor hacia el atacante que recibe: llegar a tiempo, frenar y no regalar ni el tiro ni la penetración.",
        crumbs: "Basket Lab · Fundamentos · Defensa individual · Closeouts",
        sectionLabel: "Fundamentos · Defensa individual",
        playCategory: "Fundamentos",
        meta: ["Defensa individual", "Nivel inicial", "1 pizarra", "Sin video por ahora", "3 ejercicios"],
        updated: "2026-11-28",
        tabOrder: ["aprender", "visualizar", "entrenar", "evaluar", "fuentes"],
        modes: true,
        quickJumps: [
            { label: "Ir a los ejercicios", tab: "entrenar", section: "ej-cono" },
            { label: "Ver esquema y pizarra", tab: "visualizar" }
        ],
        ficha: {
            en: "Close-out",
            definition: "Llegar corriendo hasta quedar a un brazo del atacante cuando recibe, terminar con pasos cortos y rápidos y las manos arriba (glosario WABC).",
            objective: "Disputar el tiro desde la recepción sin regalar la penetración.",
            level: "Inicial; la elección largo/corto es intermedia.",
            prereqs: ["Posición defensiva", "Desplazamiento defensivo", "Defensa de ayuda"],
            applications: ["Después de ayudar contra una penetración", "Ante un pase cruzado al lado débil", "En transición defensiva"],
            media: "Sin video verificado por ahora. 1 esquema propio basado en el glosario WABC y 1 pizarra.",
            figure: "closeout-phases",
            modeIntro: {
                player: "**Modo jugador:** cómo llegar a tiempo y en equilibrio, y cómo practicarlo.",
                coach: "**Modo entrenador:** progresión, consignas, adaptaciones y criterios de observación."
            }
        },
        tabs: { aprender: aprender, visualizar: visualizar, entrenar: entrenar, evaluar: evaluar },
        boards: boards,
        exercises: exercises,
        sources: sources,
        unavailableSources: Cat.unavailable(["wabc-online", "l1-es"])
    };
});
