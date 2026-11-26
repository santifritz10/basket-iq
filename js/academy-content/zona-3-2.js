/*
 * Basket Lab Academy · Defensa zonal 3-2
 *
 * Contenido redactado en español por BasketIQ. Cada sección indica su origen
 * (fuente oficial, interpretación técnica, propuesta metodológica o variante de la app)
 * y las citas [S1]..[S8] remiten a la bibliografía del final, consultada directamente.
 *
 * Importante: no pudimos leer el apartado de WABC dedicado a la 1-2-2 (ver fuentes no
 * disponibles). Por eso las reglas concretas de la 3-2 de esta guía son interpretación
 * técnica de BasketIQ, apoyada en los principios generales de zona que sí verificamos.
 *
 * Coordenadas: metros sobre la cancha FIBA. x = distancia a la línea de fondo (aro en
 * x = 1,575), y = ancho (0 a 15). El lado derecho de la pantalla es y chica.
 * Defensores: X1 arriba, X2 ala derecha, X3 ala izquierda, X4 atrás derecha, X5 atrás izquierda.
 */
(function (root, factory) {
    var article = factory();
    if (typeof module === "object" && module.exports) module.exports = article;
    if (root) {
        if (root.BasketAcademy) root.BasketAcademy.register(article);
        else (root.BasketAcademyQueue = root.BasketAcademyQueue || []).push(article);
    }
})(typeof window !== "undefined" ? window : null, function () {
    "use strict";

    var VIEW = { court: "half", rotation: 90 };

    function D(label, x, y) { return { team: "defense", label: label, x: x, y: y }; }
    function O(label, x, y) { return { team: "offense", label: label, x: x, y: y }; }
    function merge(a, b) {
        var o = {};
        Object.keys(a).forEach(function (k) { o[k] = a[k]; });
        Object.keys(b).forEach(function (k) { o[k] = b[k]; });
        return o;
    }
    function defense(p) {
        return { x1: D("1", p.x1[0], p.x1[1]), x2: D("2", p.x2[0], p.x2[1]), x3: D("3", p.x3[0], p.x3[1]), x4: D("4", p.x4[0], p.x4[1]), x5: D("5", p.x5[0], p.x5[1]) };
    }
    function stepsWithRotation(state, rotId, bend) {
        return ["x1", "x2", "x3", "x4", "x5"].map(function (id) {
            return id === rotId ? ["rotation", id, state[id], bend || 0] : ["move", id, state[id]];
        });
    }

    // Posiciones de referencia (interpretación de BasketIQ).
    var TOP = { x1: [7.7, 7.4], x2: [6.0, 4.2], x3: [6.0, 10.8], x4: [2.2, 5.4], x5: [2.2, 9.6] };
    var WINGR = { x1: [5.9, 6.2], x2: [5.9, 3.0], x3: [5.0, 9.4], x4: [2.0, 3.4], x5: [2.2, 6.6] };
    var CORNERR = { x1: [5.2, 5.8], x2: [4.4, 2.8], x3: [2.4, 7.8], x4: [1.6, 1.5], x5: [2.0, 4.0] };
    var WINGL = { x1: [5.9, 8.8], x2: [5.0, 5.6], x3: [5.9, 12.0], x4: [2.2, 8.4], x5: [2.0, 11.6] };

    var OFFP = { o1: O("1", 9.0, 7.5), o2: O("2", 6.6, 2.4), o3: O("3", 6.6, 12.6), o4: O("4", 1.0, 0.7), o5: O("5", 1.0, 14.3) };

    var boards = [
        {
            id: "alineacion",
            title: "Alineación inicial y áreas de responsabilidad",
            kind: "interpretation",
            refs: ["S3"],
            intro: "Tres defensores arriba y dos atrás. El de arriba orienta el balón hacia un lado, como hace el base de arriba en las zonas de un base que describe WABC [S3].",
            spec: {
                view: VIEW,
                players: merge(defense(TOP), OFFP),
                phases: [
                    {
                        name: "Alineación 3-2",
                        note: "X1 arriba; X2 y X3 en las alas, a la altura de la línea de libres extendida; X4 y X5 a los costados de la pintura, cerca de los postes bajos. Las áreas son orientativas y se superponen.",
                        hide: ["o1", "o2", "o3", "o4", "o5"],
                        zones: [
                            { id: "a1", x: 6.6, y: 5.6, w: 3.0, h: 3.8, color: "#f97316" },
                            { id: "a2", x: 4.6, y: 0.6, w: 3.2, h: 4.8, color: "#f97316" },
                            { id: "a3", x: 4.6, y: 9.6, w: 3.2, h: 4.8, color: "#f97316" },
                            { id: "a4", x: 0.1, y: 0.4, w: 4.2, h: 7.0, color: "#16a34a" },
                            { id: "a5", x: 0.1, y: 7.6, w: 4.2, h: 7.0, color: "#16a34a" }
                        ]
                    },
                    {
                        name: "Balón arriba",
                        note: "X1 presiona al balón y lo orienta hacia un lado; X2 y X3 se ubican en la línea de pase hacia las alas. El centro de la zona, a la altura de la línea de libres, queda detrás de X1: es el espacio que la 3-2 tiene que vigilar.",
                        ball: "o1",
                        zones: [{ id: "v1", x: 4.4, y: 6.4, w: 2.0, h: 2.2, color: "#dc2626" }],
                        texts: [{ id: "t1", x: 5.4, y: 7.5, text: "Centro" }]
                    }
                ]
            },
            explain: [
                "La 3-2 es una zona de frente impar con tres defensores en la primera línea. Defiende bien el perímetro y las alas, pero deja menos jugadores cerca del aro que la 2-3. Muchos entrenadores llaman 1-2-2 a una alineación muy parecida; la diferencia suele estar en cuánto se adelanta X1."
            ]
        },
        {
            id: "circulacion",
            title: "Desplazamientos: arriba, ala, esquina e inversión",
            kind: "interpretation",
            refs: ["S2"],
            intro: "Cómo se corre la 3-2 con cada pase. Los cinco se mueven mientras el balón viaja [S2].",
            spec: {
                view: VIEW,
                players: merge(defense(TOP), OFFP),
                phases: [
                    {
                        name: "Balón arriba",
                        note: "X1 sobre el balón. Sale el pase al ala derecha.",
                        ball: "o1",
                        strokes: [["pass", "o1", "o2"]].concat(stepsWithRotation(WINGR, "x2"))
                    },
                    {
                        name: "Balón en el ala",
                        note: "X2 toma el balón. X1 baja al codo del lado del balón para cerrar el poste alto, X3 se hunde hacia la línea de libres, X4 se acerca a la esquina y al poste bajo y X5 se corre al centro de la pintura.",
                        strokes: [["pass", "o2", "o4"]].concat(stepsWithRotation(CORNERR, "x4"))
                    },
                    {
                        name: "Balón en la esquina",
                        note: "X4 sale a la esquina, X5 ocupa el poste bajo que dejó, X2 baja a cortar el pase de vuelta y X3, desde el lado débil, cae hacia el aro. Esa caída es la rotación clave de la 3-2.",
                        strokes: [["pass", "o4", "o2"]].concat(stepsWithRotation(WINGR, "x2"))
                    },
                    {
                        name: "Vuelta al ala",
                        note: "X2 vuelve a tomar el ala y X3 sube otra vez a la línea de libres.",
                        strokes: [["pass", "o2", "o1"]].concat(stepsWithRotation(TOP, "x1"))
                    },
                    {
                        name: "Otra vez arriba",
                        note: "La zona recupera la alineación. Ahora el balón se invierte al ala contraria.",
                        strokes: [["pass", "o1", "o3"]].concat(stepsWithRotation(WINGL, "x3"))
                    },
                    {
                        name: "Ala contraria",
                        note: "Mismas reglas en espejo: X3 toma el ala, X1 cierra el codo, X2 se hunde, X5 se acerca a la esquina y X4 va al centro de la pintura."
                    }
                ]
            }
        },
        {
            id: "esquina-rebote",
            title: "La esquina, la caída del lado débil y el rebote",
            kind: "interpretation",
            refs: ["S2"],
            intro: "El momento más delicado de la 3-2: con el balón en la esquina, solo dos defensores empiezan cerca del aro. Por eso el ala del lado débil tiene que caer.",
            spec: {
                view: VIEW,
                players: merge(defense(WINGR), merge(OFFP, { o5: O("5", 1.9, 10.6) })),
                phases: [
                    {
                        name: "Pase a la esquina",
                        note: "X4 sale a la esquina; X5 se corre al poste bajo del lado del balón y X3 cae desde el lado débil hasta la zona del aro, donde está el 5.",
                        ball: "o2",
                        strokes: [
                            ["pass", "o2", "o4"],
                            ["rotation", "x4", [1.6, 1.5]],
                            ["move", "x5", [2.0, 4.0]],
                            ["rotation", "x3", [2.4, 8.6], 0.4],
                            ["move", "x2", [4.4, 2.8]],
                            ["move", "x1", [5.2, 5.8]]
                        ]
                    },
                    {
                        name: "Tiro desde la esquina",
                        note: "Con el tiro, cada uno busca al más cercano [S2]. X3 bloquea al 5, X5 al atacante del poste bajo o del centro, X1 y X2 a los que entran desde arriba y X4 al tirador.",
                        strokes: [
                            ["shot", "o4", [1.6, 7.5]],
                            ["cut", "o3", [3.8, 10.6]],
                            ["move", "x3", [1.9, 9.6]],
                            ["move", "x1", [4.0, 7.2]],
                            ["move", "x2", [3.8, 9.6]]
                        ]
                    },
                    {
                        name: "Rebote cerrado",
                        note: "Si X3 no cae a tiempo, el rebote del lado débil, que es donde suele caer el balón tras un tiro desde el costado, queda para el ataque."
                    }
                ]
            },
            explain: [
                "Es una interpretación de BasketIQ: el manual WABC no describe esta rotación para la 3-2 en las secciones que pudimos leer, pero la regla de rebote de toda zona (con el tiro, todos buscan a alguien para bloquear) sí está en el manual de nivel 2 [S2]."
            ]
        },
        {
            id: "poste-alto",
            title: "El centro de la zona y el poste alto",
            kind: "interpretation",
            refs: ["S2"],
            intro: "Detrás de X1 y delante de X4 y X5 queda el espacio que más castiga a la 3-2. El poste alto se defiende con un brazo por delante y, si recibe, la zona se cierra sobre él [S2].",
            spec: {
                view: VIEW,
                players: merge(defense(TOP), OFFP),
                phases: [
                    {
                        name: "Corte al centro",
                        note: "El 5 sube desde la esquina izquierda hasta el poste alto, detrás de X1. X3 se cierra hacia el centro con el brazo en la línea de pase.",
                        ball: "o1",
                        strokes: [
                            ["cut", "o5", [5.3, 8.2], 0.6],
                            ["move", "x3", [5.6, 9.4]],
                            ["move", "x5", [2.6, 8.6]]
                        ]
                    },
                    {
                        name: "El balón entra igual",
                        note: "X1 cae sobre el poste desde arriba, X2 y X3 se cierran sobre los codos y X4 y X5 protegen los dos lados del aro.",
                        strokes: [
                            ["pass", "o1", "o5"],
                            ["move", "x1", [6.4, 7.8]],
                            ["move", "x2", [5.0, 5.6]],
                            ["move", "x3", [5.0, 9.6]],
                            ["move", "x4", [2.0, 5.8]],
                            ["move", "x5", [2.2, 9.0]]
                        ]
                    },
                    {
                        name: "Lo que concede",
                        note: "Con los cinco cerrados, quedan libres las alas y la línea de fondo detrás de X4 y X5. El poste alto de frente al aro puede pasar a cualquiera de los dos lados.",
                        zones: [
                            { id: "v1", x: 5.8, y: 1.0, w: 2.4, h: 2.6, color: "#dc2626" },
                            { id: "v2", x: 5.8, y: 11.4, w: 2.4, h: 2.6, color: "#dc2626" },
                            { id: "v3", x: 0.1, y: 0.6, w: 1.6, h: 3.2, color: "#dc2626" },
                            { id: "v4", x: 0.1, y: 11.2, w: 1.6, h: 3.2, color: "#dc2626" }
                        ],
                        texts: [
                            { id: "t1", x: 7.0, y: 2.3, text: "Ala" },
                            { id: "t2", x: 7.0, y: 12.7, text: "Ala" },
                            { id: "t3", x: 0.9, y: 2.2, text: "Fondo" },
                            { id: "t4", x: 0.9, y: 12.8, text: "Fondo" }
                        ]
                    }
                ]
            }
        },
        {
            id: "atacar",
            title: "Cómo se ataca la 3-2: frente par, hueco y poste alto",
            kind: "interpretation",
            refs: ["S6", "S7"],
            intro: "Contra una zona de un solo defensor arriba, dos bases obligan a X1 a elegir. El dribbling al hueco fija a dos defensores y el poste alto recibe en el centro [S6].",
            spec: {
                view: VIEW,
                players: merge(defense(TOP), {
                    o1: O("1", 8.7, 5.6), o2: O("2", 8.7, 9.4), o5: O("5", 5.0, 7.6), o3: O("3", 1.0, 0.8), o4: O("4", 1.0, 14.2)
                }),
                phases: [
                    {
                        name: "Dos bases contra uno",
                        note: "El 1 ataca con dribbling el hueco entre X1 y X2. Los dos tienen que salir a frenarlo.",
                        ball: "o1",
                        strokes: [
                            ["dribble", "o1", [7.6, 5.2]],
                            ["move", "x1", [7.6, 6.3]],
                            ["move", "x2", [6.6, 4.6]],
                            ["move", "x3", [6.4, 9.8]]
                        ]
                    },
                    {
                        name: "Pase al poste alto",
                        note: "Con X1 y X2 fijados, el 5 recibe en el centro de frente al aro. Alguno de los de atrás tiene que subir.",
                        strokes: [
                            ["pass", "o1", "o5"],
                            ["move", "x4", [3.4, 6.2]],
                            ["move", "x5", [2.4, 8.4]]
                        ]
                    },
                    {
                        name: "Pase a la esquina",
                        note: "X4 subió a frenar al poste: el 3 queda solo en la esquina y X4 tiene que recuperar una distancia larga.",
                        strokes: [
                            ["pass", "o5", "o3"],
                            ["rotation", "x4", [1.7, 1.7]]
                        ]
                    },
                    {
                        name: "Ventaja creada",
                        note: "Tiro de esquina o penetración contra una recuperación larga. Si X4 no hubiera subido, el 5 tiraba de media distancia sin oposición."
                    }
                ]
            },
            explain: [
                "El dribbling al hueco entre dos defensores y el dribbling que fija a un defensor son recursos que el manual FIBA-WABC describe como eficaces contra las zonas [S6]. El manual de nivel 3, al hablar de cómo diseñar un ataque, distingue entre jugar contra zonas de un base y de dos bases al frente [S7]: contra la 3-2, la respuesta habitual es atacar con dos.",
                "Otras formas de atacarla: ocupar las esquinas y la línea de fondo, cortes desde el lado débil hacia el aro, pases cruzados por encima de la zona y el rebote ofensivo del lado débil."
            ]
        }
    ];

    var sources = [
        {
            id: "S1",
            title: "Official Basketball Rules 2024 (v1.0)",
            publisher: "FIBA. Aprobado por el Central Board, Mies, 26 de abril de 2024; vigente desde el 1 de octubre de 2024",
            locator: "Regla 2, arts. 2.5.3, 2.5.4 y 2.5.7 (págs. 9-10); art. 26 (pág. 31)",
            url: "https://assets.fiba.basketball/image/upload/documents-corporate-fiba-official-rules-2024-v10.pdf",
            used: "Medidas de la cancha que usan las pizarras y la regla de 3 segundos, que se aplica al atacante y no restringe la defensa zonal.",
            accessed: "26/11/2026"
        },
        {
            id: "S2",
            title: "WABC Coaches Manual Level 2 · 1.3.3 Half court zone defence",
            publisher: "FIBA · World Association of Basketball Coaches (WABC)",
            locator: "Nivel 2, Team, 1 Defensive tactics and strategies, 1.3 Zone defences",
            url: "https://wabc.fiba.com/manual/level-2/l2-team/1-defensive-tactics-and-strategies/1-3-zone-defences/1-3-3-half-court-zone-defence/",
            used: "Principios generales de la zona (moverse con el pase, brazos arriba, comunicación, rebote, poste alto con un brazo por delante), las preguntas que el entrenador debe responder y la recomendación de enseñar primero una 2-1-2 o 2-3.",
            accessed: "26/11/2026"
        },
        {
            id: "S3",
            title: "WABC Coaches Manual Level 3 · 1.3.2 1-1-3 Match up defence",
            publisher: "FIBA · WABC",
            locator: "Nivel 3, Team, 1.3 Zone defenses",
            url: "https://wabc.fiba.com/manual/level-3/l3-team/1-defensive-tactics-and-strategies/1-3-zone-defenses/1-3-2-1-1-3-match-up-defence/",
            used: "Conceptos de las zonas de un base al frente que aplicamos a la 3-2: el defensor de arriba orienta el balón hacia un lado y la zona lo mantiene ahí, «volar con el balón», las voces («balón») y cómo practicar contra seis a ocho atacantes.",
            accessed: "26/11/2026"
        },
        {
            id: "S4",
            title: "WABC Coaches Manual Level 2 · 2.4.4 Proving an opponent is playing zone defence",
            publisher: "FIBA · WABC",
            locator: "Nivel 2, Team, 2.4 Offence against zone defence (leído en el espejo wabc-chn.fiba.com, mismo contenido)",
            url: "https://wabc-chn.fiba.com/manual/level-2/l2-team/2-offensive-tactics-and-strategies/2-4-offence-against-zone-defence/2-4-4-proving-an-opponent-is-playing-zone-defence/",
            used: "Definición de defensa zonal y la recomendación de no permitir zonas hasta los 15 años.",
            accessed: "26/11/2026"
        },
        {
            id: "S5",
            title: "WABC Mini-Basketball Manual · 5.2 Modified rules in competitions",
            publisher: "FIBA · WABC",
            locator: "Mini-Basketball, 5 Modified rules",
            url: "https://wabc.fiba.com/manual/mini-basketball/mb-5-modified-rules/mb-5-2-modified-rules-in-competitions/",
            used: "Regla modificada opcional: no permitir la defensa zonal hasta la categoría U16.",
            accessed: "26/11/2026"
        },
        {
            id: "S6",
            title: "FIBA-WABC Coaches Manual (glosario)",
            publisher: "FIBA · WABC",
            locator: "Glosario, págs. 22 y 24: «Freeze Dribble» y «Gap Dribble»",
            url: "https://assets.fiba.basketball/image/upload/documents-corporate-wabc-coaches-manual-eng.pdf",
            used: "El dribbling que fija a un defensor y el dribbling al hueco entre dos defensores como recursos eficaces contra las zonas.",
            accessed: "26/11/2026"
        },
        {
            id: "S7",
            title: "WABC Coaches Manual Level 3 (PDF) · 2.2.2 Designing offensive and defensive schemes",
            publisher: "FIBA · WABC",
            locator: "Coach, 2 Know-how, 2.2 Planning, págs. 37-41",
            url: "https://assets.fiba.basketball/image/upload/documents-corporate-wabc-coaching-manual-level-3-eng.pdf",
            used: "La distinción entre zonas de un base y de dos bases al frente al diseñar un ataque, y cómo medir si un sistema defensivo cumple su objetivo.",
            accessed: "26/11/2026"
        },
        {
            id: "S8",
            title: "WABC Coaches Manual Level 3 · 2.4.3 1-3-1 Alignment against zone defence",
            publisher: "FIBA · WABC",
            locator: "Nivel 3, Team, 2.4 Offence against zone defence",
            url: "https://wabc.fiba.com/manual/level-3/l3-team/2-offensive-tactics-and-strategies/2-4-offence-against-zone-defence/2-4-3-1-3-1-alignment-against-zone-defence/",
            used: "Recursos generales contra la zona que usamos en el ejercicio de ataque: el corte desde el lado débil que se detiene en la zona y sale a la esquina, y la recomendación de un ataque que sirva contra zona e individual.",
            accessed: "26/11/2026"
        }
    ];

    var unavailableSources = [
        {
            title: "WABC Coaches Manual Level 3 · 1.3.1 1-2-2 Match up defence",
            url: "https://wabc.fiba.com/manual/level-3/l3-team/1-defensive-tactics-and-strategies/1-3-zone-defenses/1-3-1-1-2-2-match-up-defence/",
            reason: "El apartado existe (aparece en el índice del buscador del sitio), pero el sitio no permitió la consulta automática ni en wabc.fiba.com ni en su espejo. No citamos su contenido: las reglas de la 3-2 de esta guía son interpretación de BasketIQ."
        },
        {
            title: "WABC Coaches Manual Level 3 · 1.3 Zone defenses (índice)",
            url: "https://wabc.fiba.com/manual/level-3/l3-team/1-defensive-tactics-and-strategies/1-3-zone-defenses/",
            reason: "No se pudo abrir."
        }
    ];

    var aprender = [
        {
            id: "introduccion",
            number: "1",
            title: "Introducción",
            kind: "interpretation",
            blocks: [
                { p: "La 3-2 pone tres defensores en la primera línea y dos atrás. Es la zona de la que se suele echar mano contra equipos que tiran bien desde las alas o desde arriba: el perímetro queda cubierto y el balón tiene menos ángulos de pase cómodos." },
                { p: "Lo que cede es, sobre todo, el centro de la zona (detrás del defensor de arriba), las esquinas y el rebote, porque solo dos jugadores empiezan cerca del aro. Esta guía explica cómo se organiza, qué hace cada jugador, cómo se ataca y cómo se entrena." },
                {
                    callout: "No pudimos acceder al apartado del manual WABC dedicado a la 1-2-2, una alineación muy cercana a la 3-2. Las reglas concretas que leés acá (quién sale a la esquina, quién cae del lado débil) son una interpretación técnica de BasketIQ, apoyada en los principios de zona que sí verificamos. Están marcadas como tales.",
                    title: "Sobre las fuentes de este contenido",
                    tone: "warn"
                }
            ]
        },
        {
            id: "definicion",
            number: "2",
            title: "Definición técnica",
            kind: "official",
            refs: ["S4", "S2", "S7"],
            blocks: [
                { p: "Una defensa zonal es una defensa de equipo en la que cada jugador es responsable de un área y de cualquier atacante que esté en ella [S4]. La 3-2 organiza esas áreas en dos líneas: tres defensores en el perímetro (arriba y las dos alas) y dos cerca del aro, a los costados de la pintura." },
                { p: "Es una zona de **frente impar**: un solo defensor en el centro de la primera línea. El manual WABC de nivel 3 distingue, al diseñar un ataque, entre zonas de un base y de dos bases al frente [S7]; para el ataque, esa diferencia importa más que el nombre exacto de la zona." },
                { p: "El mismo manual sugiere que, si se enseña una zona, se empiece por una 2-1-2 o 2-3 [S2]. La 3-2 llega después, como alternativa para un rival concreto." }
            ]
        },
        {
            id: "objetivos",
            number: "3",
            title: "Objetivos",
            kind: "interpretation",
            blocks: [
                {
                    list: [
                        "**Presionar el perímetro** con tres defensores arriba y en las alas.",
                        "**Orientar el balón hacia un lado** desde el defensor de arriba y mantenerlo ahí.",
                        "**Dificultar el tiro exterior** de un rival que depende de tiradores en las alas o arriba.",
                        "**Llevar el balón a la esquina**, donde la línea de fondo y la lateral ayudan a la defensa.",
                        "**Cambiar el ritmo** de un ataque preparado contra la 2-3."
                    ]
                }
            ]
        },
        {
            id: "principios",
            number: "4",
            title: "Principios",
            kind: "official",
            refs: ["S2", "S3"],
            blocks: [
                { p: "Los principios de toda zona que plantea WABC, en redacción propia [S2]:" },
                {
                    list: [
                        "**Moverse con el pase**: cuando el balón sale de las manos, no cuando llega.",
                        "**Brazos arriba y activos** para cerrar líneas de pase.",
                        "**Comunicar** quién sale y quién ayuda.",
                        "**Poste alto con un brazo por delante** y poste bajo del lado del balón negado.",
                        "**Rebote**: con cada tiro, todos buscan a alguien para bloquear."
                    ]
                },
                { p: "Y, de las zonas de un base al frente que describe el nivel 3: el defensor de arriba **orienta el balón hacia un lado** y la zona trata de mantenerlo ahí; quien toma al poseedor avisa «¡balón!» [S3]." }
            ]
        },
        {
            id: "explicacion",
            number: "5",
            title: "Explicación detallada",
            kind: "interpretation",
            refs: ["S2", "S3"],
            blocks: [
                { h: "5.1 Posicionamiento inicial" },
                { p: "X1 arriba, cerca de la línea de tres puntos; X2 y X3 en las alas, a la altura de la línea de libres extendida; X4 y X5 a los costados de la pintura, más o menos a la altura de los postes bajos. X1 orienta el balón hacia un lado, como el base de arriba de las zonas de un base [S3]." },
                { board: "alineacion" },
                { h: "5.2 Balón en el ala" },
                { p: "El ala del lado del balón (X2) lo toma. X1 baja al codo de ese lado para cerrar el poste alto; X3, desde el lado débil, se hunde hacia la línea de libres; X4 se acerca a la esquina y al poste bajo; X5 se corre al centro de la pintura." },
                { board: "circulacion" },
                { h: "5.3 Balón en la esquina" },
                { p: "En esta versión sale el de atrás del lado del balón (X4). Su lugar en el poste bajo lo ocupa X5, X2 baja a cortar el pase de vuelta y X3 cae desde el lado débil hacia el aro. Sin esa caída, la zona queda sin nadie del lado débil del aro." },
                { h: "5.4 Rotaciones y cambios de lado" },
                { p: "Con la inversión, la zona repite las reglas en espejo: X3 toma el ala izquierda, X1 cierra el otro codo y los de atrás se corren. La inversión rápida es exigente porque los dos de atrás tienen que cruzar toda la pintura, y la regla de moverse con el pase en el aire es la que la sostiene [S2]." },
                { h: "5.5 Defensa del poste alto" },
                { p: "El centro de la 3-2, detrás de X1, es su sector más expuesto. El pase al poste alto se defiende con un brazo por delante [S2]: en la práctica, lo niegan X1 desde arriba o el ala del lado débil cerrándose. Si el pase entra igual, la zona se cierra sobre el poste y quedan libres las alas y la línea de fondo." },
                { board: "poste-alto" },
                { h: "5.6 Defensa del poste bajo" },
                { p: "El poste bajo del lado del balón lo toma el de atrás de ese lado (X4) y se niega el pase [S2]. Cuando X4 sale a la esquina, el poste pasa a ser de X5, que llega desde el otro lado de la pintura." },
                { h: "5.7 Esquinas, ayudas y recuperaciones" },
                { p: "La penetración desde el ala la frena el de atrás del lado del balón, y el ala del lado débil cubre el aro. La penetración desde la esquina la frena X5 y el ala del lado débil vuelve a caer. Quien ayuda deja a alguien libre: el siguiente defensor tiene que ayudar al que ayudó, una pregunta que WABC pide responder antes de jugar cualquier zona [S2]." },
                { h: "5.8 Rebote defensivo" },
                { p: "Con solo dos defensores atrás, el rebote depende de que las alas bajen. La regla de WABC vale igual: con el tiro, todos buscan a alguien para bloquear [S2]. La caída del ala del lado débil es lo que permite cerrar el rebote contrario." },
                { board: "esquina-rebote" }
            ]
        },
        {
            id: "responsabilidades",
            number: "6",
            title: "Responsabilidades",
            kind: "interpretation",
            blocks: [
                {
                    table: {
                        caption: "Responsabilidades por puesto (orientativas, versión base)",
                        head: ["Jugador", "Balón arriba", "Balón en el ala", "Balón en la esquina", "Con el tiro"],
                        rows: [
                            ["X1 (arriba)", "Presiona y orienta el balón", "Cierra el codo del lado del balón", "Cuida el codo y el poste alto", "Rebote largo; primer pase de salida"],
                            ["X2 / X3 (alas)", "En la línea de pase hacia su ala", "El del lado del balón lo toma; el otro se hunde a la línea de libres", "El del lado del balón baja a cortar el pase de vuelta; el otro cae al aro", "El del lado débil bloquea el rebote contrario"],
                            ["X4 / X5 (atrás)", "A los costados de la pintura", "El del lado del balón se acerca a la esquina; el otro va al centro de la pintura", "El del lado del balón sale a la esquina; el otro ocupa el poste bajo", "Bloquean a los postes"]
                        ]
                    }
                },
                { p: "Es la versión que usamos en las pizarras y en el simulador. En el simulador también podés ver la variante en la que la esquina la toma el ala y el de atrás se queda en el poste bajo." }
            ]
        },
        {
            id: "aplicacion",
            number: "7",
            title: "Aplicación en situaciones reales",
            kind: "interpretation",
            blocks: [
                { p: "Situaciones en las que la 3-2 suele tener sentido:" },
                {
                    list: [
                        "El rival tiene buenos tiradores en las alas o arriba y poco juego interior.",
                        "El rival ataca con un solo base y le cuesta jugar desde el poste alto.",
                        "Tenés aleros largos y rápidos para la primera línea.",
                        "Querés que el rival vea una zona distinta de la 2-3 durante algunas posesiones."
                    ]
                },
                { p: "Situaciones en las que suele costar:" },
                {
                    list: [
                        "Rival con dos bases arriba y un poste alto que pasa bien.",
                        "Rival dominante en el rebote ofensivo.",
                        "Rival con tiradores de esquina o cortes por la línea de fondo.",
                        "Equipo propio sin dos jugadores grandes que puedan cubrir toda la pintura."
                    ]
                },
                {
                    callout: "En categorías formativas, antes de usarla revisá el reglamento de tu competencia. Ver la sección 15.",
                    tone: "warn"
                }
            ]
        },
        {
            id: "ventajas",
            number: "8",
            title: "Ventajas",
            kind: "interpretation",
            blocks: [
                {
                    list: [
                        "Tres defensores en el perímetro: buena presión sobre los tiradores de arriba y de las alas.",
                        "El balón se orienta hacia un lado y se puede anticipar el pase siguiente.",
                        "La esquina se vuelve una trampa natural si la zona quiere atrapar.",
                        "Pide menos recorrido a los aleros que la 2-3 para llegar a las alas."
                    ]
                }
            ]
        },
        {
            id: "limitaciones",
            number: "9",
            title: "Limitaciones y riesgos",
            kind: "interpretation",
            refs: ["S6", "S7"],
            blocks: [
                {
                    list: [
                        "**El centro de la zona**: detrás de X1, el poste alto puede recibir de frente al aro.",
                        "**Frente par**: dos bases obligan a X1 a elegir y abren el hueco con el ala [S7].",
                        "**Dribbling al hueco**: el que penetra entre dos defensores los fija a los dos [S6].",
                        "**Esquinas y línea de fondo**: solo dos jugadores cubren todo el fondo.",
                        "**Rebote**: si el ala del lado débil no cae, el rebote contrario queda libre."
                    ]
                },
                { board: "atacar" }
            ]
        },
        {
            id: "errores",
            number: "10",
            title: "Errores frecuentes",
            kind: "interpretation",
            blocks: [
                {
                    list: [
                        "X1 deja ir el balón al centro o no lo orienta hacia ningún lado.",
                        "Moverse cuando el balón ya llegó.",
                        "El ala del lado débil se queda arriba con el balón en la esquina y nadie cubre el aro.",
                        "X5 no llega al poste bajo cuando X4 sale a la esquina.",
                        "X2 sale tarde a cortar el pase de vuelta.",
                        "Nadie niega el centro y el poste alto recibe cómodo.",
                        "Con el tiro, las alas miran el aro en vez de bajar a bloquear."
                    ]
                }
            ]
        },
        {
            id: "correcciones",
            number: "11",
            title: "Correcciones y consignas",
            kind: "method",
            blocks: [
                {
                    table: {
                        caption: "Error, corrección y consigna breve para el entrenador",
                        head: ["Error", "Corrección", "Consigna"],
                        rows: [
                            ["Balón al centro", "X1 se ubica para mandarlo a un lado", "«¡Mandalo!»"],
                            ["Ala débil se queda arriba", "Con el pase a la esquina, caer al aro", "«¡Débil, abajo!»"],
                            ["Poste bajo libre", "X5 se corre con el pase a la esquina", "«¡Cinco, cruzá!»"],
                            ["Poste alto cómodo", "Brazo por delante desde arriba y desde el ala débil", "«¡Centro!»"],
                            ["Rebote perdido", "Con el tiro, las alas bajan a buscar", "«¡Tiro, buscá!»"]
                        ]
                    }
                }
            ]
        },
        {
            id: "metodologia",
            number: "12",
            title: "Metodología",
            kind: "method",
            refs: ["S2", "S3"],
            blocks: [
                { p: "Una secuencia posible para enseñar la 3-2:" },
                {
                    ordered: true,
                    list: [
                        "**Explicar en la pizarra** las áreas y, sobre todo, la caída del ala del lado débil.",
                        "**Cinco contra pasadores fijos** que solo pasan, y después con dribbling y cortes: es la forma en que WABC propone practicar las zonas de un base [S3].",
                        "**Lado fuerte**: tres contra cuatro con el balón en el ala y la esquina.",
                        "**Agregar el rebote** en cada tiro.",
                        "**Juego real** y corrección en las pausas."
                    ]
                },
                { p: "Antes de jugarla conviene responder las preguntas que propone WABC: quién toma el balón, quién frena la penetración, quién ayuda al que ayudó, quién corta los pases a la pintura y quién bloquea a quién [S2]." }
            ]
        },
        {
            id: "progresiones",
            number: "13",
            title: "Progresiones",
            kind: "method",
            blocks: [
                {
                    table: {
                        head: ["Paso", "Situación", "Qué se agrega"],
                        rows: [
                            ["1", "5 defensores, sin ataque", "Desplazamientos a la voz del entrenador"],
                            ["2", "5 contra 5 pasadores fijos", "Moverse con el pase, brazos arriba"],
                            ["3", "4 contra 3 en el lado fuerte", "Ala, esquina y caída del lado débil"],
                            ["4", "5 contra 5 pasadores con poste alto", "Negar el centro"],
                            ["5", "5 contra 5 con rebote", "Bloqueo de las alas en cada tiro"],
                            ["6", "5 contra 5 libre", "Alternar 3-2 y 2-3 según la señal del entrenador"]
                        ]
                    }
                }
            ]
        },
        {
            id: "adaptaciones",
            number: "15",
            title: "Adaptaciones según categoría",
            kind: "official",
            refs: ["S4", "S5", "S1"],
            blocks: [
                { p: "El manual WABC de nivel 2 recomienda no permitir la defensa zonal hasta los 15 años [S4], y el de minibásquet incluye como regla modificada opcional no permitirla hasta la categoría U16 [S5]. El Reglamento Oficial FIBA 2024 no la restringe [S1]: cualquier prohibición depende de la competencia." },
                {
                    table: {
                        caption: "Propuesta de BasketIQ por etapa (no es una norma oficial)",
                        head: ["Categoría", "Uso sugerido de la 3-2"],
                        rows: [
                            ["Minibásquet a U15", "No usarla como defensa. Sí reconocerla y atacarla con dos bases, cortes y ocupación de esquinas."],
                            ["U17", "Después de la 2-3 y la individual, como recurso puntual."],
                            ["U19 y mayores", "Alternativa a la 2-3 contra rivales de buen tiro exterior."]
                        ]
                    }
                },
                {
                    callout: "La tabla es una propuesta metodológica de BasketIQ, no un reglamento.",
                    tone: "info"
                }
            ]
        },
        {
            id: "variantes",
            number: "+",
            title: "Variantes y alternativas tácticas",
            kind: "variant",
            blocks: [
                { p: "Formas habituales de modificar la 3-2. Ninguna es universal:" },
                {
                    list: [
                        "**Quién toma la esquina**: el de atrás del lado del balón (versión base) o el ala, que baja desde arriba mientras el de atrás se queda en el poste bajo.",
                        "**Quién defiende el poste alto con balón**: los de arriba se cierran (versión base) o sube uno de los de atrás y el otro cubre el aro.",
                        "**1-2-2**: el defensor de arriba se adelanta más, a veces hasta media cancha, y las alas juegan más abiertas.",
                        "**3-2 con trampa en la esquina**: el ala persigue el pase y atrapa con el de atrás.",
                        "**3-2 hundida**: las alas defienden más cerca de la pintura para proteger el rebote."
                    ]
                }
            ]
        }
    ];

    var entrenar = [
        {
            id: "entrenar-intro",
            number: "14",
            title: "Ejercicios",
            kind: "method",
            blocks: [
                { p: "Tres ejercicios: los desplazamientos de la 3-2, la rotación de la esquina con el rebote y cómo atacarla con dos bases. Todos son propuestas de BasketIQ apoyadas en los principios de las fuentes." }
            ]
        }
    ];

    var exercises = [
        {
            id: "ej-deslizamientos",
            name: "Desplazamientos de la 3-2 con cinco pasadores",
            meta: {
                fundamento: "Defensa zonal",
                objetivo: "Desplazamientos defensivos",
                categories: ["U17", "Primera"],
                level: "Inicial",
                minPlayers: 10,
                maxPlayers: 13,
                minutes: [8, 10],
                court: "half",
                hoops: 1,
                materials: ["Balones"],
                optionalMaterials: ["Conos"],
                blockType: "tactica"
            },
            adaptations: [
                {
                    id: "tres-pasadores",
                    label: "Con tres pasadores (8 jugadores)",
                    text: "Regresión: tres pasadores (arriba, ala y esquina del mismo lado). Se trabaja un lado por vez, con atención a la caída del ala del lado débil.",
                    req: { minPlayers: 8 }
                }
            ],
            kind: "method",
            refs: ["S3"],
            board: "circulacion",
            objective: "Automatizar los desplazamientos de la 3-2 con el balón arriba, en las alas y en las esquinas.",
            secondary: ["Moverse con el pase", "Caída del ala del lado débil", "Avisar «¡balón!»"],
            category: "U17 en adelante (según reglamento)",
            level: "Inicial",
            players: "Mínimo 10 (5 defensores y 5 pasadores); hasta 13 con rotación",
            playersShort: "10 a 13 jugadores",
            duration: "8 a 10 minutos",
            space: "Media cancha",
            hoops: "1",
            materials: "1 balón; conos opcionales para marcar a los pasadores",
            organization: "Cinco pasadores: arriba, dos alas y dos esquinas. Cinco defensores en 3-2.",
            development: "Los pasadores se pasan el balón en el orden que indica el entrenador, con una pausa breve en cada recepción. La defensa se desplaza con cada pase y quien toma el balón grita «¡balón!». Cada dos minutos rotan los grupos.",
            rules: ["Los pasadores no tiran ni dribblean", "Pausa de dos segundos en cada recepción", "Pase cruzado de esquina a ala contraria permitido desde el segundo minuto"],
            cues: ["«¡Con el pase!»", "«¡Débil, abajo!»", "«¡Balón!»"],
            errors: ["El ala del lado débil se queda arriba con el balón en la esquina", "X5 no llega al poste bajo", "X1 no cierra el codo con el balón en el ala"],
            corrections: ["Congelar con el balón en la esquina y contar quién está cerca del aro", "Hacer el recorrido sin balón a la voz", "Marcar con conos los lugares de X1 y X5"],
            variants: ["Agregar un sexto pasador en el poste alto", "El entrenador elige el pase con una señal", "Alternar 3-2 y 2-3 con una palabra"],
            progressions: ["Permitir dribbling y cortes", "Pasar al 4 contra 3 del lado fuerte", "Agregar el tiro y el rebote"],
            regressions: ["Tres pasadores de un solo lado", "Hacerlo caminando", "Primero solo la línea de atrás con las alas"],
            evaluation: ["Siempre hay un defensor sobre el balón", "Con el balón en la esquina hay dos defensores cerca del aro", "Se escucha quién sale en cada pase"],
            basis: "Propuesta de BasketIQ. La forma de practicar contra pasadores que primero solo pasan y después dribblean y cortan está tomada de cómo WABC propone practicar las zonas de un base al frente [S3]."
        },
        {
            id: "ej-esquina",
            name: "Esquina, caída del lado débil y rebote",
            meta: {
                fundamento: "Defensa zonal",
                objetivo: "Rotaciones y rebote defensivo",
                categories: ["U17", "Primera"],
                level: "Intermedio",
                minPlayers: 9,
                maxPlayers: 12,
                minutes: [10, 12],
                court: "half",
                hoops: 1,
                materials: ["Balones"],
                optionalMaterials: [],
                blockType: "tactica"
            },
            adaptations: [
                {
                    id: "cuatro-contra-tres",
                    label: "4 defensores contra 3 en el lado fuerte (7 jugadores)",
                    text: "Regresión: X2, X4, X5 y el ala del lado débil (X3) contra tres atacantes (ala, esquina y poste bajo). Se trabaja solo la rotación de la esquina y el rebote.",
                    req: { minPlayers: 7 }
                }
            ],
            kind: "method",
            refs: ["S2"],
            board: "esquina-rebote",
            objective: "Asegurar que con el balón en la esquina siempre haya dos defensores cerca del aro y que el rebote del lado débil quede cerrado.",
            secondary: ["Salida a la esquina con control", "Cambio de responsabilidad en el poste bajo", "Bloqueo de rebote de las alas"],
            category: "U17 en adelante",
            level: "Intermedio",
            players: "9 (4 atacantes y 5 defensores); hasta 12 con rotación",
            playersShort: "9 a 12 jugadores",
            duration: "10 a 12 minutos",
            space: "Media cancha",
            hoops: "1",
            materials: "1 balón",
            organization: "Cuatro atacantes (ala, esquina, ala contraria y un poste en el lado débil) contra cinco defensores en 3-2.",
            development: "El balón entra al ala y baja a la esquina. A la señal del entrenador, la esquina tira. Todos los atacantes van al rebote; la defensa bloquea y sale con un pase al entrenador.",
            rules: ["Rebote defensivo: 1 punto; rebote ofensivo: 2 puntos para el ataque", "Si nadie está del lado débil del aro al momento del tiro, punto para el ataque", "Se juega hasta 7 y se cambian roles"],
            cues: ["«¡Débil, abajo!»", "«¡Tiro, buscá!»", "«¡Salida!»"],
            errors: ["El ala del lado débil cae tarde", "X5 se queda mirando y el poste bajo recibe", "Dos defensores bloquean al mismo atacante"],
            corrections: ["Congelar en el pase a la esquina y señalar el aro vacío", "Asignar antes del tiro quién bloquea a quién", "Hacer primero la caída sin tiro"],
            variants: ["Tiro desde el ala en lugar de la esquina", "El entrenador tira un segundo balón", "Atacante que entra desde fuera de la cancha"],
            progressions: ["Tiro sin señal previa", "Ataque libre con tiro tras tres pases", "5 contra 5 con transición"],
            regressions: ["4 contra 3 en el lado fuerte", "Tiro siempre desde la misma esquina", "Bloqueo sin contacto"],
            evaluation: ["Porcentaje de rebotes defensivos", "Defensores cerca del aro al momento del tiro", "Tiempo hasta el primer pase de salida"],
            basis: "Propuesta de BasketIQ. Se apoya en la regla de rebote de toda zona del manual WABC (con el tiro, todos buscan a alguien para bloquear) [S2]."
        },
        {
            id: "ej-atacar",
            name: "Atacar la 3-2 con dos bases y poste alto",
            meta: {
                fundamento: "Ataque contra zona",
                objetivo: "Crear ventajas contra la zona",
                categories: ["U15", "U17", "Primera"],
                level: "Intermedio",
                minPlayers: 10,
                maxPlayers: 12,
                minutes: [10, 15],
                court: "half",
                hoops: 1,
                materials: ["Balones"],
                optionalMaterials: [],
                blockType: "tactica"
            },
            adaptations: [
                {
                    id: "tres-contra-tres",
                    label: "3 contra 3 arriba (6 jugadores)",
                    text: "Regresión: dos bases y un poste alto contra X1 y las dos alas. Se trabaja solo el dribbling al hueco y el pase al centro.",
                    req: { minPlayers: 6 }
                }
            ],
            kind: "interpretation",
            refs: ["S6", "S8"],
            board: "atacar",
            objective: "Atacar el frente impar con dos bases: fijar con el dribbling al hueco y jugar desde el poste alto.",
            secondary: ["Dribbling al hueco", "Recepción de frente al aro en el poste alto", "Ocupar las esquinas"],
            category: "U15 en adelante (como contenido ofensivo, también donde la zona no está permitida)",
            level: "Intermedio",
            players: "10 (5 contra 5); hasta 12 con cambios",
            playersShort: "10 a 12 jugadores",
            duration: "10 a 15 minutos",
            space: "Media cancha",
            hoops: "1",
            materials: "1 balón",
            organization: "Ataque 2-1-2: dos bases, un poste alto y dos jugadores en las esquinas. Defensa en 3-2.",
            development: "Un base ataca el hueco entre X1 y un ala. Si los dos salen, pasa al poste alto, que decide: tiro, pase a la esquina si sube un defensor de atrás o pase al otro base. Desde el lado débil, la esquina puede cortar, detenerse en la zona y volver a salir a la esquina [S8].",
            rules: ["El tiro vale solo después de un toque del poste alto o de un dribbling al hueco", "Un punto extra por tiro de esquina sin defensor a menos de un brazo", "Tres posesiones por grupo"],
            cues: ["«¡Al hueco!»", "«¡Cinco, de frente!»", "«¡Esquinas llenas!»"],
            errors: ["Los bases se pasan el balón sin atacar ningún hueco", "El poste alto recibe de espaldas", "Las esquinas suben y se pierde el espacio del fondo"],
            corrections: ["Pedir un dribbling al hueco antes de cada pase", "Recibir con los pies orientados al aro", "Marcar las esquinas con conos"],
            variants: ["Pase cruzado de base a esquina contraria", "Corte del poste alto al aro", "Rebote ofensivo del lado débil obligatorio"],
            progressions: ["Defensa con trampa en la esquina", "Alternar 3-2 y 2-3 sin aviso", "Reloj de posesión reducido"],
            regressions: ["3 contra 3 arriba", "Defensa pasiva", "Sin tiro: punto por cada pase al poste alto"],
            evaluation: ["Recepciones del poste alto de frente al aro", "Tiros abiertos por posesión", "Pérdidas por pases cruzados"],
            basis: "El dribbling al hueco y el que fija a un defensor son recursos que el manual FIBA-WABC describe como eficaces contra las zonas [S6]; el corte desde el lado débil con pausa en la zona y salida a la esquina aparece en el manual de nivel 3 [S8]. La organización y las reglas son de BasketIQ."
        }
    ];

    var evaluar = [
        {
            id: "evaluar-criterios",
            number: "16",
            title: "Criterios de evaluación",
            kind: "method",
            refs: ["S7"],
            blocks: [
                { p: "Marcá lo que tu equipo ya hace bien. Las casillas se guardan en este dispositivo." },
                {
                    checklist: [
                        "X1 orienta el balón hacia un lado",
                        "Los defensores se mueven con el pase",
                        "Con el balón en la esquina hay siempre dos defensores cerca del aro",
                        "X5 llega al poste bajo cuando X4 sale a la esquina",
                        "El poste alto no recibe cómodo",
                        "Las alas bajan a bloquear con cada tiro",
                        "Se escucha «¡balón!» en cada recepción"
                    ]
                },
                {
                    table: {
                        caption: "Indicadores para medir en partido o en entrenamiento",
                        head: ["Indicador", "Cómo medirlo"],
                        rows: [
                            ["Recepciones en el centro de la zona", "Contar por posesión defendida en 3-2"],
                            ["Rebotes defensivos", "Rebotes tomados ÷ tiros fallados del rival"],
                            ["Tiros desde la esquina", "Contar y anotar si hubo defensor a menos de un brazo"],
                            ["Tiros exteriores concedidos", "Contar tiros de tres desde arriba y las alas"]
                        ]
                    }
                },
                { p: "Como sugiere el manual WABC de nivel 3, los indicadores tienen que estar ligados al objetivo del sistema: si la 3-2 se usa para cortar el tiro exterior, hay que medir desde dónde tira el rival [S7]." }
            ]
        },
        {
            id: "evaluar-preguntas",
            title: "Autoevaluación",
            kind: "method",
            refs: ["S2", "S6"],
            blocks: [
                { qa: "¿Cuál es el espacio más expuesto de la 3-2?", answer: ["El centro de la zona, detrás del defensor de arriba, y en segundo lugar las esquinas y el rebote."] },
                { qa: "El balón baja a la esquina derecha. ¿Qué hace el ala del lado débil?", answer: ["Cae hacia el aro para que haya dos defensores cerca del aro y alguien en el rebote contrario."] },
                { qa: "¿Por qué conviene atacar la 3-2 con dos bases?", answer: ["Porque obligan al único defensor de arriba a elegir y abren el hueco entre él y un ala."] },
                { qa: "¿Qué recurso de dribbling recomienda el manual FIBA-WABC contra las zonas?", answer: ["El dribbling al hueco entre dos defensores y el que fija a un defensor [S6]."] },
                { qa: "¿Cuándo hay que empezar a moverse en la zona?", answer: ["Cuando el balón sale de las manos del pasador [S2]."] }
            ]
        }
    ];

    // ------------------------------------------------------------------
    // Simulador
    // ------------------------------------------------------------------
    var OFF = { o1: [9.0, 7.5], o2: [6.6, 2.4], o3: [6.6, 12.6], o4: [1.0, 0.7], o5: [1.0, 14.3] };
    function P(off, def) { return merge(off, def); }

    var SIM = {
        id: "sim-zona-3-2",
        title: "Simulador de la zona 3-2",
        intro: "Elegí dónde está el balón y mirá cómo se ajusta la 3-2. Todas las versiones son interpretaciones o variantes de BasketIQ: las reglas concretas de la 3-2 no las pudimos verificar en el manual WABC.",
        view: VIEW,
        tags: ["Zona 3-2", "Academy"],
        players: {
            o1: O("1", 0, 0), o2: O("2", 0, 0), o3: O("3", 0, 0), o4: O("4", 0, 0), o5: O("5", 0, 0),
            x1: D("1", 0, 0), x2: D("2", 0, 0), x3: D("3", 0, 0), x4: D("4", 0, 0), x5: D("5", 0, 0)
        },
        mirrorSwap: { x2: "x3", x3: "x2", x4: "x5", x5: "x4", o2: "o3", o3: "o2", o4: "o5", o5: "o4" },
        positions: [
            { id: "top", label: "Eje central", group: "Perímetro" },
            { id: "wingR", label: "Ala derecha", group: "Perímetro" },
            { id: "cornerR", label: "Esquina derecha", group: "Perímetro" },
            { id: "wingL", label: "Ala izquierda", group: "Perímetro" },
            { id: "cornerL", label: "Esquina izquierda", group: "Perímetro" },
            { id: "highPost", label: "Poste alto", group: "Postes" },
            { id: "lowPostR", label: "Poste bajo derecho", group: "Postes" },
            { id: "lowPostL", label: "Poste bajo izquierdo", group: "Postes" }
        ],
        tour: ["top", "wingR", "cornerR", "lowPostR", "wingR", "top", "highPost", "top", "wingL", "cornerL", "lowPostL", "wingL", "top"],
        variants: [
            {
                id: "base",
                label: "Base: la esquina la toma el de atrás",
                kind: "interpretation",
                desc: "El ala toma el ala, el de atrás del lado del balón sale a la esquina, el otro de atrás ocupa el poste bajo y el ala del lado débil cae al aro.",
                states: {
                    top: {
                        title: "Balón en el eje central",
                        note: "X1 presiona y orienta el balón hacia un lado. X2 y X3 en la línea de pase hacia las alas; X4 y X5 a los costados de la pintura.",
                        ball: "o1",
                        pos: P(OFF, TOP),
                        resp: {
                            x1: "Presiona al balón y lo orienta hacia un lado.",
                            x2: "En la línea de pase hacia el ala derecha.",
                            x3: "En la línea de pase hacia el ala izquierda.",
                            x4: "Costado derecho de la pintura; vigila la esquina derecha.",
                            x5: "Costado izquierdo de la pintura; vigila la esquina izquierda."
                        },
                        help: "Si el base penetra por el centro, X2 y X3 se cierran y X4 o X5 da un paso al frente sin dejar el aro.",
                        vulnerable: [
                            { x: 4.4, y: 6.4, w: 2.0, h: 2.2, label: "Centro", text: "El centro de la zona, detrás de X1." },
                            { x: 0.1, y: 0.2, w: 1.6, h: 2.4, label: "Esquina", text: "La esquina derecha." },
                            { x: 0.1, y: 12.4, w: 1.6, h: 2.4, label: "Esquina", text: "La esquina izquierda." }
                        ]
                    },
                    wingR: {
                        title: "Balón en el ala derecha",
                        note: "X2 toma el ala, X1 cierra el codo de ese lado, X3 se hunde a la línea de libres, X4 se acerca a la esquina y X5 va al centro de la pintura.",
                        ball: "o2",
                        pos: P(OFF, WINGR),
                        resp: {
                            x1: "Cierra el codo y el poste alto del lado del balón.",
                            x2: "Defiende al ala con los brazos arriba.",
                            x3: "Se hunde hacia la línea de libres desde el lado débil.",
                            x4: "Se acerca a la esquina y al poste bajo del lado del balón.",
                            x5: "Se corre al centro de la pintura, delante del aro."
                        },
                        help: "Si el ala penetra por el fondo, X4 frena y X5 cubre el aro; si penetra por el medio, X1 cierra.",
                        vulnerable: [
                            { x: 5.6, y: 11.4, w: 2.6, h: 2.6, label: "Ala débil", text: "El ala izquierda, con un pase cruzado." },
                            { x: 0.1, y: 11.6, w: 1.8, h: 3.2, label: "Esquina débil", text: "La esquina izquierda, lejos de todos." }
                        ]
                    },
                    cornerR: {
                        title: "Balón en la esquina derecha",
                        note: "X4 sale a la esquina, X5 cruza al poste bajo, X2 baja a cortar el pase de vuelta y X3 cae desde el lado débil hacia el aro.",
                        ball: "o4",
                        pos: P(OFF, CORNERR),
                        resp: {
                            x1: "Cuida el codo y el poste alto del lado del balón.",
                            x2: "Baja a cortar el pase de vuelta al ala.",
                            x3: "Cae desde el lado débil hacia el aro: es el segundo defensor cerca del aro.",
                            x4: "Sale a la esquina y no deja penetrar por la línea de fondo.",
                            x5: "Cruza al poste bajo del lado del balón."
                        },
                        help: "Si la esquina penetra por el fondo, X5 frena y X3 cubre el aro. Con el tiro, X3 bloquea el rebote del lado débil.",
                        vulnerable: [
                            { x: 5.4, y: 9.4, w: 3.0, h: 4.4, label: "Lado débil", text: "El ala izquierda: X3 dejó la línea de libres para caer al aro." },
                            { x: 4.0, y: 6.6, w: 1.8, h: 2.0, label: "Centro", text: "El poste alto, si X1 no lo cierra." }
                        ]
                    },
                    wingL: { mirrorOf: "wingR" },
                    cornerL: { mirrorOf: "cornerR" },
                    highPost: {
                        title: "Balón en el poste alto",
                        note: "El atacante de la esquina izquierda subió al centro y recibió. X1 cae desde arriba, X2 y X3 se cierran sobre los codos y X4 y X5 protegen los dos lados del aro.",
                        ball: "o5",
                        pos: P(merge(OFF, { o5: [5.4, 7.5] }), { x1: [6.5, 7.5], x2: [5.0, 5.6], x3: [5.0, 9.4], x4: [2.0, 5.8], x5: [2.0, 9.2] }),
                        resp: {
                            x1: "Cae sobre el poste desde arriba.",
                            x2: "Se cierra sobre el codo derecho y vuelve si sale el pase al ala.",
                            x3: "Se cierra sobre el codo izquierdo y vuelve si sale el pase al ala.",
                            x4: "Protege el lado derecho del aro.",
                            x5: "Protege el lado izquierdo del aro."
                        },
                        help: "Si el poste alto ataca el aro, lo frena el de atrás más cercano y el otro cubre el aro. Si pasa al ala, el ala de ese lado sale con pasos cortos.",
                        vulnerable: [
                            { x: 5.8, y: 1.0, w: 2.4, h: 2.6, label: "Ala", text: "El ala derecha, con el pase de salida del poste." },
                            { x: 5.8, y: 11.4, w: 2.4, h: 2.6, label: "Ala", text: "El ala izquierda, con el pase de salida del poste." },
                            { x: 0.1, y: 0.6, w: 1.6, h: 3.0, label: "Fondo", text: "La línea de fondo derecha." }
                        ]
                    },
                    lowPostR: {
                        title: "Balón en el poste bajo derecho",
                        note: "El atacante de la esquina se metió al poste bajo con el balón. X4 lo defiende, X2 baja a molestar desde arriba y X5 cuida el aro.",
                        ball: "o4",
                        pos: P(merge(OFF, { o4: [1.9, 4.4] }), { x1: [5.4, 5.6], x2: [3.4, 3.2], x3: [3.8, 9.6], x4: [2.4, 4.9], x5: [2.0, 7.0] }),
                        resp: {
                            x1: "Protege el codo y el pase al centro.",
                            x2: "Baja a molestar al poste y vuelve al ala si sale el pase.",
                            x3: "Se hunde desde el lado débil hacia la pintura.",
                            x4: "Defiende al poste del lado del centro y le niega el giro hacia la pintura.",
                            x5: "Cuida el aro y la ayuda del lado del centro."
                        },
                        help: "Antes de que reciba, el pase al poste bajo se niega [S2]. Si recibe, X5 es la ayuda y X3 cuida el corte del lado débil.",
                        vulnerable: [
                            { x: 5.6, y: 1.0, w: 2.4, h: 2.6, label: "Ala", text: "El ala derecha si X2 se queda abajo." },
                            { x: 0.1, y: 11.6, w: 1.8, h: 3.2, label: "Esquina débil", text: "La esquina izquierda, con un pase cruzado." }
                        ]
                    },
                    lowPostL: { mirrorOf: "lowPostR" }
                }
            },
            {
                id: "alaEsquina",
                label: "La esquina la toma el ala",
                kind: "variant",
                inherits: "base",
                desc: "Criterio alternativo: el ala del lado del balón baja a la esquina y el de atrás se queda en el poste bajo. El poste queda mejor cubierto, pero X1 tiene que cubrir el ala.",
                states: {
                    cornerR: {
                        title: "Balón en la esquina derecha (baja el ala)",
                        note: "X2 persigue el pase hasta la esquina, X4 se queda en el poste bajo, X1 se abre al ala derecha, X5 cubre el centro de la pintura y X3 cierra el poste alto.",
                        ball: "o4",
                        pos: P(OFF, { x1: [5.8, 3.4], x2: [1.7, 1.5], x3: [4.6, 7.8], x4: [2.0, 3.8], x5: [2.2, 6.6] }),
                        resp: {
                            x1: "Se abre a cubrir el ala derecha.",
                            x2: "Baja hasta la esquina siguiendo el pase.",
                            x3: "Cierra el poste alto y el centro de la zona.",
                            x4: "Se queda en el poste bajo del lado del balón.",
                            x5: "Cubre el centro de la pintura y el aro."
                        },
                        help: "El recorrido de X2 es largo: tiene que salir cuando el pase deja el ala. Si llega tarde, X4 frena la penetración.",
                        vulnerable: [
                            { x: 6.6, y: 6.0, w: 2.4, h: 3.0, label: "Arriba", text: "El eje central, sin nadie arriba." },
                            { x: 5.6, y: 11.2, w: 2.6, h: 2.8, label: "Ala débil", text: "El ala izquierda, con un pase cruzado." }
                        ]
                    },
                    cornerL: { mirrorOf: "cornerR" }
                }
            },
            {
                id: "atrasSube",
                label: "Poste alto: sube uno de atrás",
                kind: "variant",
                inherits: "base",
                desc: "Criterio alternativo: cuando el poste alto recibe, sube uno de los de atrás a contenerlo y el otro cubre el aro; las alas se quedan con los tiradores.",
                states: {
                    highPost: {
                        title: "Balón en el poste alto (sube uno de atrás)",
                        note: "X4 sube a contener al poste, X5 se corre al centro delante del aro y X1, X2 y X3 se quedan en las líneas de pase hacia el perímetro.",
                        ball: "o5",
                        pos: P(merge(OFF, { o5: [5.4, 7.5] }), { x1: [6.6, 7.0], x2: [5.8, 4.0], x3: [5.8, 11.0], x4: [4.4, 7.3], x5: [1.9, 7.5] }),
                        resp: {
                            x1: "Molesta desde arriba y cuida el pase al eje central.",
                            x2: "Se queda en la línea de pase hacia el ala derecha.",
                            x3: "Se queda en la línea de pase hacia el ala izquierda.",
                            x4: "Sube a contener al poste alto y no lo deja girar.",
                            x5: "Cubre el aro solo."
                        },
                        help: "Si el poste pasa a un atacante que corta por el fondo, X5 sale y el ala del lado débil cae al aro.",
                        vulnerable: [
                            { x: 0.1, y: 0.6, w: 1.8, h: 3.4, label: "Fondo", text: "La línea de fondo derecha, que dejó X4." },
                            { x: 0.1, y: 11.0, w: 1.8, h: 3.4, label: "Fondo", text: "La línea de fondo izquierda." }
                        ]
                    }
                }
            }
        ]
    };

    return {
        id: "zona-3-2",
        sectionId: "zone32_defense",
        title: "Defensa zonal 3-2",
        subtitle: "Alineación, desplazamientos, la rotación de la esquina, variantes, cómo atacarla y cómo entrenarla. Indica con claridad qué está verificado en fuentes WABC y qué es interpretación.",
        sectionLabel: "Defensa · Defensas en zona",
        playCategory: "Defensa zonal",
        meta: ["Defensa de media cancha", "Desde U17 (según reglamento)", "5 pizarras animadas", "Simulador interactivo", "3 ejercicios"],
        updated: "2026-11-26",
        tabs: {
            aprender: aprender,
            visualizar: ["alineacion", "circulacion", "esquina-rebote", "poste-alto", "atacar"],
            entrenar: entrenar,
            evaluar: evaluar
        },
        boards: boards,
        exercises: exercises,
        sources: sources,
        unavailableSources: unavailableSources,
        simulator: SIM
    };
});
