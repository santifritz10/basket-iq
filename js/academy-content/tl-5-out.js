/*
 * Basket Lab · Laboratorio táctico · 5 Out (estructura inicial)
 *
 * Redacción original de Basket Lab en español. Las citas [S1]..[Sn] remiten a la
 * bibliografía del final, consultada directamente el 28/11/2026. Conserva el contenido
 * anterior de «Sistema abierto» (id antiguo «abierto»), sin los videos que no correspondían.
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
        Cat.source("wabc-l1-2-1-2", "S1"),
        Cat.source("wabc-l1-2-1-4", "S2"),
        Cat.source("wabc-l1-2-1-5", "S3"),
        Cat.source("wabc-l2-2-1-5", "S4")
    ];

    // Cinco lugares de referencia: arriba, dos alas y dos esquinas.
    var SPOTS = { o1: [9.0, 7.5], o2: [7.0, 2.0], o3: [7.0, 13.0], o4: [1.2, 0.9], o5: [1.2, 14.1] };
    function offense() { var o = {}; Object.keys(SPOTS).forEach(function (k) { o[k] = O(k.slice(1), SPOTS[k][0], SPOTS[k][1]); }); return o; }

    var boards = [
        {
            id: "lugares",
            title: "La estructura: cinco lugares y la pintura libre",
            kind: "interpretation",
            refs: ["S3"],
            intro: "Cinco jugadores fuera de la línea de tres. Es la ubicación de partida; lo que pasa después depende de las reglas del equipo.",
            spec: {
                view: VIEW,
                players: offense(),
                phases: [
                    { name: "Ubicación inicial", note: "Arriba, dos alas y dos esquinas. La pintura queda libre para cortar y penetrar.", ball: "o1", zones: [{ x: 0.2, y: 5.05, w: 5.6, h: 4.9, color: "#0d9488" }] }
                ]
            }
        },
        {
            id: "pasar-cortar",
            title: "Pasar, cortar y reemplazar",
            kind: "official",
            refs: ["S1"],
            intro: "Después del corte, el jugador más cercano al hueco corta hacia el balón y ocupa el lugar libre; los demás se reacomodan [S1].",
            spec: {
                view: VIEW,
                players: Object.assign(offense(), {
                    x1: D("1", 8.0, 7.5), x2: D("2", 6.1, 2.8), x3: D("3", 5.6, 11.0), x4: D("4", 2.2, 2.0), x5: D("5", 2.6, 12.2)
                }),
                phases: [
                    { name: "Pase al ala", ball: "o1", note: "El 1 pasa al 2.", strokes: [["pass", "o1", "o2"]] },
                    { name: "Corte al aro", note: "El 1 corta al aro por delante de su defensor buscando la devolución.", strokes: [["cut", "o1", [2.4, 5.6], -0.4], ["move", "x1", [4.2, 6.0]]] },
                    { name: "Reemplazo", note: "El 3, el más cercano al hueco de arriba, no camina por la línea de tres: corta hacia una posición amenazante y después sale arriba [S1]. El 5 sube al ala y el 1 sale a la esquina libre.", strokes: [["cut", "o3", [9.0, 7.6], 0.6], ["move", "o5", [7.0, 13.0], 0.3], ["cut", "o1", [1.2, 14.1], -0.6]] }
                ]
            }
        },
        {
            id: "penetracion",
            title: "Penetración y lugares de los receptores",
            kind: "official",
            refs: ["S3"],
            intro: "Con los dos pies en la pintura, quien penetra busca anotar primero. Los receptores se ubican para recibir; el de arriba queda atrás para el balance defensivo [S3].",
            spec: {
                view: VIEW,
                players: Object.assign(offense(), {
                    x1: D("1", 8.0, 7.5), x2: D("2", 6.1, 2.8), x3: D("3", 5.6, 11.0), x4: D("4", 2.2, 2.0), x5: D("5", 2.6, 12.2)
                }),
                phases: [
                    { name: "Ataque desde el ala", ball: "o2", note: "El 2 recibe y ataca la cadera de su defensor hacia el medio [S3].", strokes: [["dribble", "o2", [4.2, 5.4], 0.3], ["move", "x2", [5.0, 4.2]]] },
                    { name: "Receptores", note: "La esquina del lado del balón se desplaza para dar una línea de pase; la esquina contraria se abre para tirar; el 3 se mueve arriba y el 1 queda atrás para el balance [S3].", strokes: [["move", "o4", [2.4, 0.9]], ["move", "o5", [1.6, 13.0]], ["move", "o3", [7.6, 10.4]], ["move", "o1", [9.6, 6.0]], ["rotation", "x5", [2.4, 9.2]]] },
                    { name: "Decisión", note: "Si X5 ayuda, el pase va a la esquina libre. Si nadie ayuda, el 2 termina.", strokes: [["pass", "o2", "o5"]] }
                ]
            }
        }
    ];

    var aprender = [
        {
            id: "que-es", title: "Qué es", kind: "interpretation", refs: ["S3"],
            blocks: [
                { p: "**5 Out** es una **estructura inicial**: los cinco jugadores se ubican fuera de la línea de tres y dejan la pintura libre. No es un sistema en sí mismo. Desde 5 Out se pueden jugar reglas de pase y corte, penetrar y descargar, bloqueos directos o indirectos, o una ofensiva de movimiento." },
                { p: "El manual WABC usa el 5 Out para enseñar ofensiva de movimiento a equipos formativos, basada en fundamentos y no en jugadas memorizadas [S3]." }
            ]
        },
        {
            id: "problema", title: "Qué problema resuelve", kind: "interpretation",
            blocks: [
                { list: ["Saca a los defensores grandes de debajo del aro: la ayuda tiene que recorrer más distancia.", "Deja la pintura libre para cortes y penetraciones.", "Hace que todos los jugadores aprendan a jugar en todas las posiciones [S2].", "Es fácil de organizar con reglas simples."] }
            ]
        },
        {
            id: "ventajas-busca", title: "Qué ventajas busca", kind: "official", refs: ["S1", "S2", "S3"],
            blocks: [
                { table: { head: ["Acción", "Ventaja que busca"], rows: [
                    ["Pase y corte", "Ventaja posicional: el cortador por delante de su defensor [S1]"],
                    ["Inversión del balón", "Ventaja dinámica: closeout largo y ayuda fuera de lugar [S2]"],
                    ["Penetración", "Ventaja numérica momentánea: alguien tiene que ayudar [S3]"],
                    ["Reemplazos", "Mantener las distancias para la próxima acción [S1]"]
                ] } }
            ]
        },
        {
            id: "cuando", title: "Cuándo conviene y cuándo no", kind: "interpretation",
            blocks: [
                { h: "Conviene" },
                { list: ["Con varios jugadores capaces de penetrar, pasar y tirar.", "Para formar jugadores: todos ocupan todos los lugares.", "Contra defensas que ayudan mucho desde el lado fuerte.", "Para alejar del aro a un pívot rival que protege bien."] },
                { h: "Puede no convenir" },
                { list: ["Si el equipo tiene un interior que gana claramente cerca del aro y pocos tiradores: quizás convenga una estructura con uno o dos interiores (ver «Juego con interiores»).", "Si nadie amenaza desde afuera: la defensa se hunde y la pintura deja de estar libre.", "Contra defensas zonales, la estructura sola no alcanza: hay que ocupar huecos (ver Ataque contra zona 2-3)."] }
            ]
        },
        {
            id: "jugadores", title: "Características necesarias", kind: "interpretation",
            blocks: [
                { list: ["Amenaza de penetración desde el perímetro.", "Tiro exterior suficiente para que la defensa salga.", "Pases firmes y a tiempo (descarga, pase extra, pase al cortador).", "Lectura de cortes por la espalda cuando el defensor niega."] },
                { links: [
                    { label: "Triple amenaza", go: "fundamento_triple-amenaza" },
                    { label: "Pase de descarga", go: "fundamento_kick-out" },
                    { label: "Catch and shoot", go: "fundamento_catch-shoot" },
                    { label: "Parada en un tiempo", go: "fundamento_jump-stop" }
                ], label: "Fundamentos relacionados" }
            ]
        },
        {
            id: "errores", title: "Errores frecuentes", kind: "interpretation",
            blocks: [
                { table: { head: ["Error", "Qué provoca", "Corrección"], rows: [
                    ["Cortar y quedarse en la pintura", "La pintura se llena y no hay espacio para penetrar", "Cortar y salir al lugar libre [S1]"],
                    ["Reemplazar caminando por la línea de tres", "El defensor no tiene que reaccionar", "Cortar hacia una posición amenazante y después salir [S1]"],
                    ["Penetrar sin intención de anotar", "Nadie ayuda", "Atacar el aro primero [S3]"],
                    ["Todos se mueven a la vez", "Choques y pases sin receptor", "Una acción por vez, con timing"],
                    ["Nadie queda atrás", "Contraataque rival", "El de arriba queda para el balance [S3]"]
                ] } }
            ]
        }
    ];

    var visualizar = ["lugares", "pasar-cortar", "penetracion"];

    var entrenar = [
        {
            id: "objetivos", title: "Objetivos de enseñanza", kind: "method",
            blocks: [
                { list: ["Ocupar los cinco lugares y mantener las distancias.", "Cortar con intención y salir al lugar libre.", "Penetrar para anotar y ubicarse como receptor.", "Quedar alguien atrás para el balance defensivo."] }
            ]
        },
        {
            id: "progresion", title: "Progresión orientativa", kind: "method", refs: ["S3", "S4"],
            blocks: [
                { p: "Orientativa: se puede empezar con oposición. El manual WABC propone reglas de movimiento en lugar de jugadas memorizadas [S3] y enseñar la decisión con preguntas [S4]." },
                { table: { head: ["Etapa", "Formato", "Qué se busca"], rows: [
                    ["1", "5 contra 0 con reglas (ejercicio 1)", "Lugares, cortes y reemplazos"],
                    ["2", "3 contra 3 en un lado", "Pase y corte con un defensor real"],
                    ["3", "4 contra 4 con penetración obligatoria", "Lugares de los receptores"],
                    ["4", "5 contra 5 con reglas (ejercicio 2)", "Elegir la acción según la defensa"]
                ] } }
            ]
        },
        {
            id: "adaptaciones", title: "Adaptaciones por categoría", kind: "method",
            blocks: [
                { table: { head: ["Grupo", "Adaptación"], rows: [
                    ["Minibásquet", "Juego de «ocupar lugares» sin defensa y 3 contra 3; sin nombres de sistemas"],
                    ["U13–U15", "Pase y corte, reemplazos y penetración con reglas claras; todos juegan en todos los lugares"],
                    ["U17–U19", "Se suman bloqueos directos e indirectos desde la misma estructura"],
                    ["Mayores", "Reglas según las características del plantel y del rival"]
                ] } }
            ]
        }
    ];

    var exercises = [
        {
            id: "ej-5c0-reglas",
            name: "5 contra 0 con reglas de movimiento",
            works: ["Spacing", "Pase y corte", "Reemplazos"],
            meta: { fundamento: "5 Out", fundamentos: ["pase-pecho", "jump-stop", "catch-shoot"], objetivo: "Lugares, cortes y reemplazos", categories: ["U13", "U15", "U17", "Mayores"], level: "Inicial", minPlayers: 5, maxPlayers: 15, minutes: [6, 10], court: "half", hoops: 1, materials: ["Balones", "Conos"], optionalMaterials: [], blockType: "tactica" },
            adaptations: [],
            kind: "method",
            refs: ["S1"],
            board: "pasar-cortar",
            objective: "Automatizar la ocupación de los cinco lugares con una regla: después de pasar, cortar; el más cercano al hueco lo ocupa [S1].",
            secondary: ["Timing del corte", "Recepción lista para tirar"],
            category: "U13 a mayores",
            level: "Inicial",
            players: "5 por grupo; los que esperan rotan",
            playersShort: "5 a 15 jugadores",
            duration: "6 a 10 minutos",
            space: "Media cancha",
            hoops: "1",
            materials: "Balones y conos en los cinco lugares",
            organization: "Cinco jugadores en los conos: arriba, alas y esquinas.",
            development: "Se pasa, se corta al aro y se sale al lugar libre más cercano. Después de 5 pases, el que recibe en el ala penetra y los demás se ubican como receptores. Termina con tiro.",
            rules: ["Nadie se queda más de un segundo en la pintura", "Todos pasan por todos los lugares", "El que queda arriba durante una penetración no entra"],
            cues: ["«¡Pasá y cortá!»", "«¡Cortá con intención, después salí!» [S1]", "«¡Uno atrás!»"],
            errors: ["Cortar caminando", "Quedarse en la pintura", "Dos jugadores en el mismo lugar"],
            corrections: ["Pedir un cambio de ritmo antes del corte", "Contar «uno» en la pintura y salir", "Señalar en voz alta el lugar que se ocupa"],
            variants: ["Con un pase de vuelta al cortador", "Con puerta atrás cuando el entrenador levanta la mano (simula negación)"],
            progressions: ["Con defensores pasivos", "4 contra 4 o 5 contra 5 (ejercicio 2)"],
            regressions: ["3 contra 0 en un lado", "Sin penetración final"],
            evaluation: ["Lugares ocupados sin choques", "Cortes con cambio de ritmo", "Tiro final con los pies preparados"],
            basis: "Reglas de reemplazo del manual WABC nivel 1, 2.1.2 [S1], organizadas como ejercicio por Basket Lab."
        },
        {
            id: "ej-5c5-reglas",
            name: "5 contra 5 en 5 Out con reglas",
            works: ["Spacing", "Penetración y descarga", "Corte por la espalda", "Balance defensivo"],
            meta: { fundamento: "5 Out", fundamentos: ["kick-out", "catch-shoot", "drible-avance", "triple-amenaza"], objetivo: "Elegir la acción según la defensa", categories: ["U15", "U17", "Mayores"], level: "Intermedio", minPlayers: 10, maxPlayers: 15, minutes: [12, 18], court: "half", hoops: 1, materials: ["Balones", "Petos"], optionalMaterials: [], blockType: "tactica" },
            adaptations: [{ id: "cuatro", label: "Con 8 jugadores", text: "4 contra 4 en 4 Out con las mismas reglas.", req: { minPlayers: 8 } }],
            kind: "method",
            refs: ["S2", "S3", "S4"],
            board: "penetracion",
            objective: "Jugar 5 contra 5 desde 5 Out eligiendo entre pase y corte, inversión y penetración según la defensa.",
            secondary: ["Balance defensivo: uno atrás [S3]", "Defensa: ayudas y closeouts"],
            category: "U15 a mayores",
            level: "Intermedio",
            players: "10 (5 contra 5); con 15, rota un equipo",
            playersShort: "10 a 15 jugadores",
            duration: "12 a 18 minutos",
            space: "Media cancha",
            hoops: "1",
            materials: "Balones y petos",
            organization: "Ataque en 5 Out. Defensa individual.",
            development: "Se juega 5 contra 5. Puntos: canasta 2; punto extra por canasta después de una inversión o de una descarga. Si la defensa recupera, sale en transición hasta mitad de cancha y el ataque tiene que frenar el balón.",
            rules: ["Sin bloqueos en la primera versión", "Al menos un pase antes de penetrar", "El jugador de arriba no entra durante la penetración"],
            cues: ["«¿Quién ayudó?» [S4]", "«¡Invertí y atacá el closeout!» [S2]", "«¡Uno atrás!» [S3]"],
            errors: ["Pintura ocupada", "Penetraciones sin receptores", "Perder el balance"],
            corrections: ["Congelar y mostrar los lugares", "Pedir a los receptores que hablen", "Punto para la defensa si llega a la mitad sin oposición"],
            variants: ["Con un bloqueo directo por posesión", "Con un interior: pasa a 4 Out 1 In"],
            progressions: ["Limitar a 14 segundos", "Defensa con cambios en todos los bloqueos"],
            regressions: ["Defensa sin robar pases", "4 contra 4"],
            evaluation: ["Canastas con punto extra", "Pérdidas por pintura ocupada", "Contraataques rivales sin oposición"],
            basis: "Propuesta de Basket Lab a partir de las secciones 2.1.4 y 2.1.5 del nivel 1 [S2] [S3] y la enseñanza por decisiones del nivel 2 [S4]."
        }
    ];

    var variantes = [
        {
            id: "familias", title: "Qué se puede jugar desde 5 Out", kind: "interpretation",
            blocks: [
                { p: "La estructura no define la ofensiva. Estas son familias habituales; ninguna es la única forma correcta:" },
                { list: ["**Pase y corte con reemplazos** (la base de esta ficha) [S1].", "**Penetrar y descargar** con lugares fijos para los receptores [S3].", "**Bloqueo directo** con los otros tres abiertos: más espacio para el pick and roll.", "**Bloqueos indirectos** sin balón para liberar tiradores.", "**Paso a 4 Out 1 In** cuando un jugador corta y se queda en el poste."] },
                { links: [
                    { label: "Spacing", go: "tl_spacing" },
                    { label: "Creación de ventajas", go: "tl_ventajas" },
                    { label: "Pick and roll", go: "tl_pick-and-roll" },
                    { label: "Juego con interiores", go: "tl_juego-interior" },
                    { label: "Balance defensivo", go: "tl_balance-defensivo" }
                ], label: "Relaciones" }
            ]
        },
        {
            id: "respuestas", title: "Respuestas defensivas habituales", kind: "interpretation",
            blocks: [
                { table: { head: ["La defensa…", "El ataque puede…"], rows: [
                    ["Niega los pases al perímetro", "Cortar por la espalda"],
                    ["Se hunde en la pintura", "Invertir rápido y tirar o atacar el closeout"],
                    ["Cambia en todos los bloqueos", "Atacar el emparejamiento"],
                    ["Juega zona", "Dejar de lado el 5 Out puro y ocupar huecos"]
                ] } }
            ]
        },
        {
            id: "anterior", title: "Contenido anterior: «Sistema abierto»", kind: "interpretation",
            blocks: [
                { p: "Este es el texto que tenía Basket Lab en «Sistema Abierto». Se conserva. Los dos videos que acompañaban esa página no eran de básquet (los comprobamos el 28/11/2026) y se retiraron." },
                { h: "Principios del juego abierto" },
                { list: ["**Espaciado:** buenas distancias entre compañeros para que haya líneas claras de penetración y pase.", "**Lectura de ventajas:** atacar closeouts largos, defensores mal parados o cambios defensivos lentos.", "**Juego sin balón:** cortes por la espalda, reemplazos y relocalizaciones después de cada penetración o pase.", "**Movimiento continuo:** pase, corte, reemplazo.", "**Todos amenazan:** aunque no todos tiren igual, todos deben amenazar con pase, tiro o penetración."] },
                { h: "Cuándo usarlo" },
                { list: ["Con muchos exteriores con buena técnica y lectura de juego.", "Contra defensas que ayudan demasiado desde el lado fuerte.", "Para castigar a pívots lentos que quedan defendiendo en el perímetro."] }
            ]
        }
    ];

    return {
        id: "tl-5-out",
        title: "5 Out",
        subtitle: "Cinco jugadores abiertos y la pintura libre: una estructura inicial desde la que se juegan cortes, penetraciones y bloqueos.",
        sectionLabel: "Laboratorio táctico · Ataque colectivo",
        playCategory: "Ataque",
        meta: ["Estructura inicial", "Desde U13", "3 pizarras", "2 ejercicios"],
        updated: "2026-11-28",
        tabOrder: ["aprender", "visualizar", "entrenar", "variantes", "fuentes"],
        quickJumps: [
            { label: "Ver en la pizarra", tab: "visualizar" },
            { label: "Ejercicios", tab: "entrenar", section: "ej-5c0-reglas" }
        ],
        ficha: {
            en: "5 Out · five out",
            definition: "Estructura inicial con los cinco jugadores fuera de la línea de tres y la pintura libre.",
            objective: "Alejar la ayuda del aro y dejar espacio para cortar y penetrar.",
            prereqs: ["Triple amenaza", "Pase de descarga", "Catch and shoot", "Parada en un tiempo"],
            applications: ["Ofensiva de movimiento", "Penetrar y descargar", "Pick and roll con cuatro abiertos"],
            labels: { objective: "Qué problema resuelve", prereqs: "Fundamentos necesarios", applications: "Acciones habituales" }
        },
        tabs: { aprender: aprender, visualizar: visualizar, entrenar: entrenar, variantes: variantes },
        boards: boards,
        exercises: exercises,
        sources: sources,
        unavailableSources: []
    };
});
