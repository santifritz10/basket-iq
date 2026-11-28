/*
 * Basket Lab · Laboratorio táctico · Balance defensivo (transición defensiva)
 *
 * Redacción original de Basket Lab en español. Las citas [S1]..[Sn] remiten a la
 * bibliografía del final, consultada directamente el 28/11/2026. Las secciones WABC sobre
 * transición defensiva no se pudieron consultar: la ficha lo dice y marca como
 * interpretación todo lo que no tiene respaldo en una fuente leída.
 *
 * Pizarras: cancha completa (x de 0 a 28; el aro propio está en x = 26,425).
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

    var HALF = { court: "half", rotation: 90 };
    var FULL = { court: "full", rotation: 90 };
    function O(l, x, y) { return { team: "offense", label: l, x: x, y: y }; }
    function D(l, x, y) { return { team: "defense", label: l, x: x, y: y }; }

    var sources = [
        Cat.source("wabc-l1-2-1-5", "S1", { used: "En la penetración de la ofensiva 5 Out, el jugador de arriba queda atrás para el balance defensivo." }),
        Cat.source("mini-es", "S2", { locator: "2 Enseñanza centrada en el juego (2.1–2.3, págs. 6–9)", used: "Enseñar a partir del juego, con oposición desde temprano y con preguntas." })
    ];

    var boards = [
        {
            id: "balance-en-ataque",
            title: "El balance empieza en el ataque",
            kind: "official",
            refs: ["S1"],
            intro: "Mientras el 2 penetra, el jugador de arriba no entra: queda atrás [S1]. Si el ataque termina con un tiro o una pérdida, ya hay alguien entre el balón y el aro propio.",
            spec: {
                view: HALF,
                players: {
                    o1: O("1", 9.4, 7.5), o2: O("2", 6.8, 2.0), o3: O("3", 7.0, 13.0), o4: O("4", 1.2, 0.9), o5: O("5", 1.2, 14.1),
                    x1: D("1", 8.4, 7.5), x2: D("2", 6.0, 2.8), x3: D("3", 5.6, 11.0), x4: D("4", 2.2, 2.0), x5: D("5", 2.6, 12.2)
                },
                phases: [
                    { name: "Penetración", ball: "o2", note: "El 2 ataca hacia el medio. Los receptores se ubican.", strokes: [["dribble", "o2", [4.2, 5.4], 0.3], ["move", "x2", [5.0, 4.4]], ["move", "o4", [2.4, 0.9]], ["move", "o5", [1.6, 13.0]]] },
                    { name: "Uno atrás", note: "El 1 se aleja un paso del aro en lugar de entrar al rebote: es el balance [S1].", strokes: [["move", "o1", [10.6, 7.5]]], zones: [{ x: 10.0, y: 6.2, w: 2.0, h: 2.6, color: "#0d9488" }] },
                    { name: "Tiro", note: "El 2 tira. Dos van al rebote; el 1 y el 3 ya están camino a su campo.", zones: [], strokes: [["shot", "o2", [1.575, 7.5]], ["move", "o3", [9.6, 11.6]]] }
                ]
            }
        },
        {
            id: "volver",
            title: "Al perder el balón: aro, balón, emparejar",
            kind: "interpretation",
            intro: "Cancha completa. El equipo de rojo acaba de perder el balón en el ataque. Primero alguien protege el aro, después alguien frena el balón y recién ahí se empareja.",
            spec: {
                view: FULL,
                players: {
                    a1: O("1", 4.2, 4.0), a2: O("2", 6.4, 12.0), a3: O("3", 8.0, 7.0), a4: O("4", 3.0, 9.6), a5: O("5", 2.6, 5.6),
                    d1: D("1", 11.0, 7.4), d2: D("2", 9.0, 2.6), d3: D("3", 6.2, 12.8), d4: D("4", 2.2, 8.6), d5: D("5", 2.0, 6.4)
                },
                phases: [
                    { name: "Cambio de posesión", ball: "a3", note: "El balón cambia de manos cerca del aro rival. Los defensores (rojo) están lejos de su propio aro." },
                    { name: "Proteger el aro", note: "El que estaba más atrás (balance) corre directo a su pintura antes de mirar a quién marcar.", strokes: [["move", "d1", [23.6, 7.5]], ["dribble", "a3", [13.0, 7.2], 0.3], ["move", "d2", [12.6, 5.0]]] },
                    { name: "Frenar el balón", note: "El defensor más cercano al balón se pone delante y lo obliga a frenar o a pasar hacia la banda. Gana tiempo para los demás.", strokes: [["move", "d2", [14.4, 6.6]], ["move", "a1", [18.0, 3.0]], ["move", "a2", [18.0, 12.0]], ["move", "d3", [15.6, 11.6]], ["move", "d4", [12.6, 9.0]], ["move", "d5", [11.6, 5.2]]] },
                    { name: "Emparejar y hablar", note: "Los que llegan toman al atacante más peligroso más cercano al aro, no necesariamente al suyo. Se reorganizan cuando el balón se detiene." }
                ]
            }
        }
    ];

    var aprender = [
        {
            id: "que-es", title: "Qué es", kind: "interpretation", refs: ["S1"],
            blocks: [
                { p: "El **balance defensivo** es la organización del ataque pensando en la defensa que viene: quién queda atrás cuando el equipo tira o pierde el balón, para que siempre haya alguien entre el balón y el propio aro. Es un concepto de **transición defensiva**, pero se prepara mientras se ataca." },
                { p: "El manual WABC lo menciona dentro de la ofensiva 5 Out: durante una penetración, el jugador de arriba queda atrás para el balance defensivo [S1]." }
            ]
        },
        {
            id: "fuentes-aviso", title: "Qué está respaldado y qué no", kind: "interpretation",
            blocks: [
                { callout: "Las secciones del manual WABC sobre transición defensiva no pudieron consultarse (ver Fuentes). Salvo la regla del jugador de arriba [S1], esta ficha es interpretación de Basket Lab y está **pendiente de revisión con fuentes**. La usamos porque el concepto es central, no porque esté completa.", tone: "warn", title: "Ficha con fuentes parciales" }
            ]
        },
        {
            id: "problema", title: "Qué problema resuelve", kind: "interpretation",
            blocks: [
                { list: ["Evitar canastas fáciles del rival en contraataque.", "Equilibrar el rebote ofensivo con la vuelta.", "Que los jugadores sepan qué hacer en el momento de mayor desorden: el cambio de posesión."] }
            ]
        },
        {
            id: "prioridades", title: "Prioridades al perder la posesión", kind: "interpretation",
            blocks: [
                { steps: [
                    { title: "Proteger el aro", text: "El jugador de balance corre a la pintura propia. Sin aro protegido, todo lo demás llega tarde." },
                    { title: "Frenar el balón", text: "El más cercano se pone delante del balón para obligarlo a frenar o a pasar hacia la banda." },
                    { title: "Emparejar", text: "Tomar al atacante más cercano al aro y más peligroso, aunque no sea el propio. Se reorganiza cuando el balón se detiene." },
                    { title: "Hablar", text: "Avisar quién toma el balón, quién el aro y a quién marca cada uno." }
                ] }
            ]
        },
        {
            id: "quien-vuelve", title: "Quién vuelve: reglas posibles", kind: "interpretation", refs: ["S1"],
            blocks: [
                { p: "No hay una regla única. Estas son formas habituales de organizarlo:" },
                { table: { head: ["Regla", "Cómo funciona", "Qué cuida", "Qué cuesta"], rows: [
                    ["Por ubicación", "El que está arriba cuando se tira vuelve [S1]", "Simple y automática", "Puede volver un buen reboteador"],
                    ["Por puesto", "Siempre vuelven el base y un alero", "Responsables claros", "Menos flexible si el ataque cambia de lugares"],
                    ["Por cantidad", "Dos al rebote, tres atrás (o al revés)", "Ajustable según el rival", "Hay que decidirlo antes del partido"],
                    ["Por situación", "Más jugadores al rebote si el rival corre poco", "Aprovecha el rebote ofensivo", "Exige lectura del rival"]
                ] } }
            ]
        },
        {
            id: "relacion", title: "Relación entre ataque, defensa y cambio de posesión", kind: "interpretation",
            blocks: [
                { p: "El balance une las tres fases: depende de cómo se ataca (5 Out deja a alguien arriba naturalmente; un ataque con dos interiores puede dejar a todos lejos), define cómo empieza la defensa y condiciona el contraataque rival (si hay balance, el rival no tiene superioridad)." },
                { links: [
                    { label: "5 Out", go: "tl_cinco-abiertos" },
                    { label: "Superioridades 2c1 · 3c2 · 4c3", go: "tl_superioridades" },
                    { label: "Desplazamiento defensivo", go: "fundamento_desplazamiento" },
                    { label: "Contención del dribbling", go: "fundamento_contencion" }
                ], label: "Relaciones" }
            ]
        },
        {
            id: "errores", title: "Errores frecuentes", kind: "interpretation",
            blocks: [
                { table: { head: ["Error", "Qué provoca", "Corrección"], rows: [
                    ["Todos al rebote ofensivo", "Contraataque sin oposición", "Definir antes quién vuelve"],
                    ["Protestar o lamentarse después del error", "Segundos perdidos", "Primero volver, después hablar"],
                    ["Correr mirando al propio atacante", "Nadie protege el aro", "Primero el aro, después emparejar"],
                    ["Saltar a robar el balón en la vuelta", "Superioridad rival", "Frenar, no robar"],
                    ["Volver en línea recta por el medio sin hablar", "Dos defensores con el mismo atacante", "Avisar en voz alta"]
                ] } }
            ]
        }
    ];

    var visualizar = ["balance-en-ataque", "volver"];

    var entrenar = [
        {
            id: "objetivos", title: "Objetivos de enseñanza", kind: "method",
            blocks: [
                { list: ["Que haya siempre alguien atrás cuando el equipo tira.", "Proteger el aro antes de emparejar.", "Frenar el balón sin arriesgar.", "Comunicar en la vuelta."] }
            ]
        },
        {
            id: "progresion", title: "Progresión orientativa", kind: "method", refs: ["S2"],
            blocks: [
                { p: "Es un contenido que se aprende jugando: conviene enseñarlo dentro de juegos con cambio de posesión [S2]." },
                { table: { head: ["Etapa", "Formato", "Qué se busca"], rows: [
                    ["1", "3 contra 3 a toda la cancha con cambio de posesión", "Volver y proteger el aro"],
                    ["2", "Ejercicio 1 (tiro y vuelta)", "Regla de balance definida"],
                    ["3", "5 contra 5 con puntos por balance", "Balance dentro del sistema"]
                ] } }
            ]
        },
        {
            id: "adaptaciones", title: "Adaptaciones por categoría", kind: "method",
            blocks: [
                { table: { head: ["Grupo", "Adaptación"], rows: [
                    ["Minibásquet", "Juegos de persecución y de «volver a casa»; sin reglas de balance"],
                    ["U13–U15", "Regla simple: el de arriba vuelve; prioridad aro-balón"],
                    ["U17 en adelante", "Reglas según el plan de partido; equilibrio con el rebote ofensivo"]
                ] } }
            ]
        }
    ];

    var exercises = [
        {
            id: "ej-tiro-y-vuelta",
            name: "Tiro y vuelta: 4 contra 4 con transición",
            works: ["Balance defensivo", "Transición defensiva", "Comunicación"],
            meta: { fundamento: "Balance defensivo", fundamentos: ["desplazamiento", "contencion"], objetivo: "Proteger el aro y frenar el balón al cambiar la posesión", categories: ["U13", "U15", "U17", "Mayores"], level: "Intermedio", minPlayers: 8, maxPlayers: 12, minutes: [10, 15], court: "full", hoops: 2, materials: ["Balones", "Petos"], optionalMaterials: [], blockType: "tactica" },
            adaptations: [{ id: "tres", label: "Con 6 jugadores", text: "3 contra 3 a toda la cancha con la misma regla.", req: { minPlayers: 6 } }],
            kind: "method",
            refs: ["S1", "S2"],
            board: "volver",
            objective: "Que el equipo que ataca tenga a alguien atrás al tirar y que, al perder la posesión, proteja el aro y frene el balón.",
            secondary: ["Rebote ofensivo con los que no vuelven", "Comunicación en la vuelta"],
            category: "U13 a mayores",
            level: "Intermedio",
            players: "8 (4 contra 4); con más, rotan por equipos",
            playersShort: "8 a 12 jugadores",
            duration: "10 a 15 minutos",
            space: "Cancha completa",
            hoops: "2",
            materials: "Balones y petos",
            organization: "4 contra 4 en media cancha. Después del tiro o de una pérdida, el que defendía ataca hacia el otro aro.",
            development: "Se ataca en media cancha. En cuanto hay tiro o pérdida, se juega la transición hacia el otro aro. Puntuación: 1 punto extra para la defensa si frena el contraataque sin recibir canasta en los primeros 6 segundos; 1 punto menos para el equipo que tiró si no tenía a nadie atrás en el momento del tiro.",
            rules: ["El equipo que ataca define en voz alta quién es el balance", "Dos jugadores como máximo al rebote ofensivo en la primera versión", "La transición termina en canasta o al cruzar 6 segundos"],
            cues: ["«¡Uno atrás!» [S1]", "«¡Aro, balón, emparejar!»", "«¡Hablá!»"],
            errors: ["Todos al rebote", "Lamentarse después de errar", "Saltar a robar en la vuelta"],
            corrections: ["Congelar en el tiro y preguntar quién era el balance [S2]", "Restar punto por protestar", "Premiar el frenado del balón"],
            variants: ["El entrenador decide cuántos van al rebote (1, 2 o 3)", "Pérdida provocada por el entrenador con un silbato: cambio de posesión inmediato"],
            progressions: ["5 contra 5", "Atacantes que salen desde el rebote defensivo con pase largo"],
            regressions: ["3 contra 3", "Contraataque rival que solo puede driblear"],
            evaluation: ["Tiros con balance", "Contraataques frenados", "Canastas fáciles concedidas"],
            basis: "Propuesta de Basket Lab. La regla del jugador de arriba viene del manual WABC nivel 1, 2.1.5 [S1]; el formato con cambio de posesión sigue la enseñanza centrada en el juego [S2]."
        }
    ];

    var variantes = [
        {
            id: "ajustes", title: "Ajustes", kind: "interpretation",
            blocks: [
                { list: [
                    "**Más balance contra equipos que corren:** tres atrás y solo dos al rebote.",
                    "**Menos balance contra equipos lentos:** más jugadores al rebote ofensivo.",
                    "**Balance según el marcador y el reloj:** al final del partido, ganando, conviene asegurar la vuelta.",
                    "**Presión después de canasta:** algunos equipos convierten la vuelta en presión; exige que el aro siga protegido."
                ] }
            ]
        },
        {
            id: "respuestas", title: "Cómo intenta superarlo el rival", kind: "interpretation",
            blocks: [
                { list: ["Primer pase largo después del rebote.", "Atacar al jugador de balance con 2 contra 1.", "Correr por las bandas para alejar a los que vuelven del medio."] },
                { links: [{ label: "Superioridades: cómo atacar el 2c1 y el 3c2", go: "tl_superioridades" }] }
            ]
        }
    ];

    return {
        id: "tl-balance-defensivo",
        title: "Balance defensivo",
        subtitle: "Quién queda atrás cuando el equipo tira, y qué se hace primero al perder el balón: aro, balón y emparejar.",
        sectionLabel: "Laboratorio táctico · Transiciones",
        playCategory: "Defensa",
        meta: ["Concepto colectivo", "Desde U13", "2 pizarras", "1 ejercicio", "Fuentes parciales"],
        updated: "2026-11-28",
        tabOrder: ["aprender", "visualizar", "entrenar", "variantes", "fuentes"],
        quickJumps: [
            { label: "Ver en la pizarra", tab: "visualizar" },
            { label: "Ejercicio", tab: "entrenar", section: "ej-tiro-y-vuelta" }
        ],
        ficha: {
            en: "Defensive balance",
            definition: "Organización del ataque para que, al tirar o perder el balón, siempre haya alguien entre el balón y el propio aro.",
            objective: "Evitar canastas fáciles en contraataque.",
            prereqs: ["Desplazamiento defensivo", "Contención del dribbling"],
            applications: ["Después de cada tiro", "Después de una pérdida", "Rebote ofensivo"],
            labels: { objective: "Qué problema resuelve", prereqs: "Fundamentos necesarios", applications: "Cuándo aparece" }
        },
        tabs: { aprender: aprender, visualizar: visualizar, entrenar: entrenar, variantes: variantes },
        boards: boards,
        exercises: exercises,
        sources: sources,
        unavailableSources: Cat.unavailable(["wabc-transicion-def"])
    };
});
