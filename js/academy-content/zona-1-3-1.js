/*
 * Basket Lab Academy · Defensa zonal 1-3-1
 *
 * Contenido redactado en español por BasketIQ. Cada sección indica su origen
 * (fuente oficial, interpretación técnica, propuesta metodológica o variante de la app)
 * y las citas [S1]..[S8] remiten a la bibliografía del final, consultada directamente.
 *
 * Coordenadas de las pizarras: metros sobre la cancha FIBA (28 x 15). x = distancia a la
 * línea de fondo (aro en x = 1,575), y = posición a lo ancho (0 a 15). Vista de media
 * cancha con el aro arriba. El lado derecho de la pantalla es y chica.
 *
 * Numeración de los defensores (la misma del manual WABC [S2]): X1 base de arriba,
 * X2 defensor de fondo, X3 y X4 aleros, X5 central.
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

    // Posiciones de referencia de la versión base (interpretación de BasketIQ de las reglas WABC [S2]).
    var TOP = { x1: [7.8, 7.3], x2: [2.0, 7.5], x3: [5.6, 3.4], x4: [5.6, 11.6], x5: [5.0, 7.5] };
    var WINGR = { x1: [5.6, 6.0], x2: [1.6, 4.0], x3: [5.9, 3.1], x4: [3.4, 8.6], x5: [2.6, 4.6] };
    var CORNERR = { x1: [5.2, 5.6], x2: [1.6, 1.5], x3: [4.6, 2.8], x4: [2.2, 6.4], x5: [2.2, 3.6] };
    var WINGL = { x1: [5.6, 9.0], x2: [1.6, 11.0], x3: [3.4, 6.4], x4: [5.9, 11.9], x5: [2.6, 10.4] };

    function steps(state) {
        return ["x1", "x2", "x3", "x4", "x5"].map(function (id) { return ["move", id, state[id]]; });
    }
    function stepsWithRotation(state, rotId, bend) {
        return ["x1", "x2", "x3", "x4", "x5"].map(function (id) {
            return id === rotId ? ["rotation", id, state[id], bend || 0] : ["move", id, state[id]];
        });
    }

    var OFFP = { o1: O("1", 9.0, 7.5), o2: O("2", 6.6, 2.4), o3: O("3", 6.6, 12.6), o4: O("4", 1.0, 0.7), o5: O("5", 1.0, 14.3) };

    var boards = [
        {
            id: "alineacion",
            title: "Alineación inicial y áreas de responsabilidad",
            kind: "interpretation",
            refs: ["S2"],
            intro: "Un defensor arriba, tres en la línea media y uno atrás. El de arriba orienta el balón hacia un lado; el de atrás cubre de esquina a esquina [S2].",
            spec: {
                view: VIEW,
                players: merge(defense({ x1: [7.6, 7.5], x2: [2.0, 7.5], x3: [5.6, 3.4], x4: [5.6, 11.6], x5: [5.0, 7.5] }), OFFP),
                phases: [
                    {
                        name: "Alineación 1-3-1",
                        note: "X1 (arriba) se ocupa del centro de la cancha; X3 y X4 de las alas; X5 del centro de la zona, a la altura de la línea de libres; X2 (fondo) de toda la línea final, de una esquina a la otra. Las áreas son orientativas.",
                        hide: ["o1", "o2", "o3", "o4", "o5"],
                        zones: [
                            { id: "a1", x: 6.6, y: 5.2, w: 3.0, h: 4.6, color: "#f97316" },
                            { id: "a3", x: 4.0, y: 0.6, w: 3.0, h: 4.6, color: "#16a34a" },
                            { id: "a5", x: 3.6, y: 5.6, w: 2.8, h: 3.8, color: "#7c3aed" },
                            { id: "a4", x: 4.0, y: 9.8, w: 3.0, h: 4.6, color: "#16a34a" },
                            { id: "a2", x: 0.1, y: 0.4, w: 3.4, h: 14.2, color: "#0ea5e9" }
                        ]
                    },
                    {
                        name: "Orientar el balón hacia un lado",
                        note: "Con el balón arriba, X1 se ubica de modo que el atacante solo pueda avanzar hacia uno de los lados (acá, hacia la derecha de la pantalla). El resto de la zona ya sabe hacia dónde se va a mover.",
                        move: { x1: [7.9, 7.9] },
                        ball: "o1",
                        zones: [],
                        strokes: [["dribble", "o1", [8.4, 5.4], 0.3]]
                    },
                    {
                        name: "El balón se fue al lado elegido",
                        note: "El ataque terminó del lado que quería la defensa. Desde ahí empiezan los desplazamientos de la página siguiente."
                    }
                ]
            },
            explain: [
                "La 1-3-1 es una zona de frente impar: hay un solo defensor arriba. Eso la hace fuerte contra un ataque con un base en el centro y débil contra un ataque con dos jugadores arriba, que obligan a X1 o a un alero a decidir a quién toman.",
                "El manual WABC la describe como una zona de emparejamiento (match up): los defensores no solo cuidan un área, también buscan quedar frente a un atacante concreto cuando el balón se mueve [S2]."
            ]
        },
        {
            id: "circulacion",
            title: "Desplazamientos: arriba, ala, esquina e inversión",
            kind: "interpretation",
            refs: ["S2"],
            intro: "Las reglas WABC para el balón en el ala y en la esquina, en una secuencia completa [S2]. Los cinco se mueven mientras el balón viaja.",
            spec: {
                view: VIEW,
                players: merge(defense(TOP), OFFP),
                phases: [
                    {
                        name: "Balón arriba",
                        note: "X1 presiona al balón, X5 cuida el centro y los aleros esperan en la línea de pase hacia las alas.",
                        ball: "o1",
                        strokes: [["pass", "o1", "o2"]].concat(stepsWithRotation(WINGR, "x3"))
                    },
                    {
                        name: "Balón en el ala",
                        note: "El alero X3 toma el balón; X1 baja a negar el poste alto; X5 se corre al poste bajo para jugarlo por delante; X4 entra a la ayuda; X2 se acerca a la esquina sin salir de la zona pintada [S2].",
                        strokes: [["pass", "o2", "o4"]].concat(stepsWithRotation(CORNERR, "x2"))
                    },
                    {
                        name: "Balón en la esquina",
                        note: "Sale X2 a la esquina. X5 se adelanta al poste bajo, X4 queda en ayuda detrás de él y X3 baja un poco hacia el poste, pero su responsabilidad sigue siendo el ala [S2].",
                        strokes: [["pass", "o4", "o2"]].concat(stepsWithRotation(WINGR, "x3"))
                    },
                    {
                        name: "Vuelta al ala",
                        note: "X3 vuelve a tomar el balón y X2 regresa a la zona pintada.",
                        strokes: [["pass", "o2", "o1"]].concat(stepsWithRotation(TOP, "x1"))
                    },
                    {
                        name: "Otra vez arriba",
                        note: "La zona recupera la alineación inicial. Ahora el balón se invierte al ala contraria.",
                        strokes: [["pass", "o1", "o3"]].concat(stepsWithRotation(WINGL, "x4"))
                    },
                    {
                        name: "Ala contraria",
                        note: "Mismas reglas del otro lado: X4 toma el balón, X1 niega el poste alto, X5 va al poste bajo, X3 queda en ayuda y X2 se acerca a la esquina izquierda."
                    }
                ]
            }
        },
        {
            id: "trampa-esquina",
            title: "Trampa en la esquina",
            kind: "interpretation",
            refs: ["S2"],
            intro: "El manual WABC plantea que el jugador de la esquina puede ser atrapado por el defensor exterior que sigue al pase hacia abajo [S2].",
            spec: {
                view: VIEW,
                players: merge(defense(WINGR), OFFP),
                phases: [
                    {
                        name: "Pase a la esquina",
                        note: "X2 sale a la esquina y X3, en lugar de quedarse en el ala, persigue el pase. X1 baja a cortar el pase de vuelta al ala y X5 se adelanta al poste bajo.",
                        ball: "o2",
                        strokes: [
                            ["pass", "o2", "o4"],
                            ["rotation", "x2", [1.4, 1.3]],
                            ["rotation", "x3", [1.9, 2.0], 0.4],
                            ["move", "x1", [5.9, 2.9]],
                            ["move", "x5", [2.4, 3.8]],
                            ["move", "x4", [2.8, 6.8]]
                        ]
                    },
                    {
                        name: "Esquina atrapada",
                        note: "Dos defensores encierran al atacante contra la línea de fondo y la lateral. Los pases cercanos (ala y poste bajo) están negados. Lo que queda abierto es el lado débil: el pase largo cruzado a la esquina o al ala contraria.",
                        zones: [
                            { id: "v1", x: 0.1, y: 11.6, w: 2.2, h: 3.2, color: "#dc2626" },
                            { id: "v2", x: 5.6, y: 11.2, w: 2.6, h: 2.8, color: "#dc2626" }
                        ],
                        texts: [
                            { id: "t1", x: 1.2, y: 12.6, text: "Esquina débil" },
                            { id: "t2", x: 6.9, y: 12.0, text: "Ala débil" }
                        ]
                    }
                ]
            },
            explain: [
                "La trampa no es obligatoria: el mismo manual propone otra opción, que X3 niegue el pase de vuelta al ala para que todos los pases cercanos queden cortados sin encerrar al balón [S2]. Las dos están en el simulador como variantes.",
                "Para que la trampa no termine en un tiro abierto del lado débil, el defensor que queda más cerca del aro (acá X4) tiene que estar listo para salir al pase largo, y el resto rota detrás de él."
            ]
        },
        {
            id: "poste-alto",
            title: "Defensa del poste alto",
            kind: "interpretation",
            refs: ["S2", "S5"],
            intro: "El centro de la 1-3-1 es el lugar de X5. Si el poste alto recibe, la zona tiene que cerrarse sobre él sin dejar solos a los tiradores de las alas.",
            spec: {
                view: VIEW,
                players: merge(defense(TOP), OFFP),
                phases: [
                    {
                        name: "Corte al poste alto",
                        note: "El 5 sube desde la esquina izquierda hacia la línea de libres. X5 se pone por delante, con un brazo en la línea de pase [S5].",
                        ball: "o1",
                        strokes: [
                            ["cut", "o5", [5.3, 8.6], 0.6],
                            ["move", "x5", [5.5, 7.8]]
                        ]
                    },
                    {
                        name: "El balón entra igual",
                        note: "X5 queda entre el balón y el aro, X1 cae desde arriba para molestar, X3 y X4 se hunden un paso sin perder de vista las alas y X2 protege el aro.",
                        strokes: [
                            ["pass", "o1", "o5"],
                            ["move", "x5", [4.4, 8.4]],
                            ["move", "x1", [6.4, 8.0]],
                            ["move", "x3", [5.0, 4.2]],
                            ["move", "x4", [5.4, 11.0]],
                            ["move", "x2", [1.9, 8.0]]
                        ]
                    },
                    {
                        name: "Lo que concede",
                        note: "Con el poste alto ocupado, el espacio que más sufre es la línea de fondo: un atacante que se mete detrás de X3 o de X4 queda en un dos contra uno contra X2.",
                        zones: [
                            { id: "v1", x: 0.1, y: 1.6, w: 2.4, h: 3.0, color: "#dc2626" },
                            { id: "v2", x: 0.1, y: 10.4, w: 2.4, h: 3.0, color: "#dc2626" }
                        ],
                        texts: [
                            { id: "t1", x: 1.2, y: 3.1, text: "Fondo" },
                            { id: "t2", x: 1.2, y: 11.9, text: "Fondo" }
                        ]
                    }
                ]
            },
            explain: [
                "El manual WABC de nivel 3 muestra que, contra la zona, el pase al poste alto deja a la defensa «en la práctica en individual»: si un defensor ayuda sobre el poste, el poste pasa al atacante que quedó libre [S4]. Por eso la ayuda sobre el poste alto tiene que ser corta y con regreso."
            ]
        },
        {
            id: "penetracion",
            title: "Penetración desde la esquina",
            kind: "interpretation",
            refs: ["S2"],
            intro: "Si el atacante de la esquina dribblea, lo frena el defensor que está en el área del poste bajo. X3 puede ayudar, pero sin perder el ala [S2].",
            spec: {
                view: VIEW,
                players: merge(defense(CORNERR), OFFP),
                phases: [
                    {
                        name: "Dribbling por la línea de fondo",
                        note: "El 4 ataca la línea de fondo. X5 sale a frenarlo, X2 lo acompaña desde atrás y X3 amaga hacia la penetración.",
                        ball: "o4",
                        strokes: [
                            ["dribble", "o4", [1.3, 3.0]],
                            ["move", "x5", [1.8, 3.8]],
                            ["move", "x2", [0.9, 2.2]],
                            ["move", "x3", [3.6, 2.8]],
                            ["move", "x4", [2.0, 6.0]],
                            ["move", "x1", [5.2, 5.2]]
                        ]
                    },
                    {
                        name: "Descarga al ala",
                        note: "Frenado, el 4 pasa al ala. X3 recupera con pasos cortos y brazos arriba; X5 y X2 vuelven a sus lugares.",
                        strokes: [
                            ["pass", "o4", "o2"],
                            ["rotation", "x3", [5.9, 3.1]],
                            ["move", "x5", [2.6, 4.6]],
                            ["move", "x2", [1.6, 4.0]],
                            ["move", "x4", [3.4, 8.6]],
                            ["move", "x1", [5.6, 6.0]]
                        ]
                    },
                    {
                        name: "Zona recuperada",
                        note: "Si X3 se fue del todo a ayudar, llega tarde al tiro del ala: por eso la regla de WABC es amagar, no abandonar el ala [S2]."
                    }
                ]
            },
            explain: [
                "Con el balón arriba la respuesta es otra: si el base penetra por el centro, lo frena X5 y X2 cruza la zona para quedar más cerca de los tiradores; si hay un poste bajo, X2 puede rotar para cortar el pase de la penetración a ese poste [S2]."
            ]
        },
        {
            id: "atacar",
            title: "Cómo se ataca la 1-3-1: dos contra uno sobre el alero",
            kind: "interpretation",
            refs: ["S4"],
            intro: "Una de las ideas que propone el manual WABC de nivel 3: un atacante ubicado detrás de la zona corre a la esquina y deja al alero defensor solo contra dos [S4].",
            spec: {
                view: VIEW,
                players: merge(defense({ x1: [7.8, 7.3], x2: [2.0, 7.0], x3: [5.6, 3.4], x4: [5.6, 11.6], x5: [4.6, 7.5] }), {
                    o1: O("1", 9.0, 7.5), o2: O("2", 6.6, 2.4), o3: O("3", 6.6, 12.6), o4: O("4", 1.2, 8.6), o5: O("5", 5.7, 7.5)
                }),
                phases: [
                    {
                        name: "Ataque 1-3-1 contra la zona",
                        note: "El 4 juega detrás de la zona, sobre la línea de fondo. Si los defensores miran solo el balón, puede cortar [S4].",
                        ball: "o1",
                        strokes: [
                            ["pass", "o1", "o2"],
                            ["rotation", "x3", [5.9, 3.1]],
                            ["move", "x1", [6.6, 5.4]],
                            ["move", "x2", [1.8, 5.0]],
                            ["move", "x4", [4.2, 9.8]],
                            ["move", "x5", [4.8, 6.6]],
                            ["cut", "o4", [1.0, 0.8], 0.6]
                        ]
                    },
                    {
                        name: "Dos contra uno en el lado del balón",
                        note: "El 2 y el 4 quedaron contra X3. Si X2 sale a la esquina, el 5 puede sellar al defensor del poste alto o cortar al aro.",
                        strokes: [
                            ["pass", "o2", "o4"],
                            ["rotation", "x2", [1.6, 1.6]],
                            ["move", "x3", [4.6, 2.8]],
                            ["move", "x5", [3.4, 5.4]],
                            ["cut", "o5", [2.2, 6.2], -0.3]
                        ]
                    },
                    {
                        name: "Opciones",
                        note: "Con el balón en la esquina, el 5 se mete al aro (si el 4 penetra, el 5 retrasa el corte) y el 2 también puede cortar si la zona le niega el pase de vuelta [S4]. Ninguna opción es automática: depende de qué defensor rote."
                    }
                ]
            },
            explain: [
                "El mismo apartado del manual muestra otros recursos: bloquear al defensor que rota (por ejemplo a X2) para obligar a otro a tomar la penetración, invertir el balón con cortes desde el lado débil que se detienen en la zona y salen a la esquina, y el pase al poste alto, que deja a la zona prácticamente en individual [S4].",
                "También recomienda que los equipos jóvenes usen un ataque que sirva tanto contra zona como contra individual, en lugar de un sistema distinto para cada zona [S4]."
            ]
        },
        {
            id: "ejercicio-deslizamientos",
            title: "Ejercicio: deslizamientos contra seis pasadores",
            kind: "method",
            refs: ["S3"],
            intro: "Cinco defensores en 1-3-1 contra seis pasadores fijos que solo pasan. Es la primera etapa que propone WABC para practicar la zona de emparejamiento [S3].",
            spec: {
                view: VIEW,
                players: merge(defense(TOP), {
                    o1: O("A", 9.0, 7.5), o2: O("B", 6.6, 2.4), o4: O("C", 1.0, 0.7), o3: O("D", 6.6, 12.6), o5: O("E", 1.0, 14.3), o6: O("F", 5.9, 8.6)
                }),
                phases: [
                    {
                        name: "A pasa a B",
                        note: "Los pasadores no tiran ni penetran. La defensa se mueve con el pase y quien toma el balón grita «¡balón!» [S3].",
                        ball: "o1",
                        strokes: [["pass", "o1", "o2"]].concat(stepsWithRotation(WINGR, "x3"))
                    },
                    { name: "B pasa a C", strokes: [["pass", "o2", "o4"]].concat(stepsWithRotation(CORNERR, "x2")) },
                    { name: "C devuelve a B", strokes: [["pass", "o4", "o2"]].concat(stepsWithRotation(WINGR, "x3")) },
                    {
                        name: "B pasa a A",
                        note: "El entrenador elige el siguiente pase. F, en el poste alto, obliga a X1 y X5 a negar el centro en todo momento.",
                        strokes: [["pass", "o2", "o1"]].concat(stepsWithRotation(TOP, "x1"))
                    },
                    { name: "De nuevo arriba", note: "Se sigue hacia D y E, y luego en el orden que indique el entrenador." }
                ]
            }
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
            title: "WABC Coaches Manual Level 3 · 1.3.3 1-3-1 Match up zone defence",
            publisher: "FIBA · World Association of Basketball Coaches (WABC)",
            locator: "Nivel 3, Team, 1 Defensive tactics and strategies, 1.3 Zone defenses",
            url: "https://wabc.fiba.com/manual/level-3/l3-team/1-defensive-tactics-and-strategies/1-3-zone-defenses/1-3-3-1-3-1-match-up-zone-defence/",
            used: "Alineación inicial, qué necesita cada puesto, reglas con el balón en el ala y en la esquina, defensa del dribbling desde la esquina y desde arriba, trampa en la esquina y condiciones para que funcione.",
            accessed: "26/11/2026"
        },
        {
            id: "S3",
            title: "WABC Coaches Manual Level 3 · 1.3.2 1-1-3 Match up defence",
            publisher: "FIBA · WABC",
            locator: "Nivel 3, Team, 1.3 Zone defenses. Apartados «Practising the 1-1-3 Match Up Zone», «Guard Slides», «Frontline Slides»",
            url: "https://wabc.fiba.com/manual/level-3/l3-team/1-defensive-tactics-and-strategies/1-3-zone-defenses/1-3-2-1-1-3-match-up-defence/",
            used: "La 1-1-3 es la zona de la que el manual deriva la 1-3-1 [S2]. De acá tomamos cómo practicarla (contra seis a ocho atacantes, primero solo pases), las voces de comunicación («balón») y el principio de moverse con el pase.",
            accessed: "26/11/2026"
        },
        {
            id: "S4",
            title: "WABC Coaches Manual Level 3 · 2.4.3 1-3-1 Alignment against zone defence",
            publisher: "FIBA · WABC",
            locator: "Nivel 3, Team, 2 Offensive tactics and strategies, 2.4 Offence against zone defence",
            url: "https://wabc.fiba.com/manual/level-3/l3-team/2-offensive-tactics-and-strategies/2-4-offence-against-zone-defence/2-4-3-1-3-1-alignment-against-zone-defence/",
            used: "Cómo se ataca una zona desde una alineación 1-3-1: dos contra uno sobre un defensor de la línea media, pase al poste alto, bloqueo al defensor que rota, cortes desde el lado débil y la recomendación de un ataque común contra zona e individual.",
            accessed: "26/11/2026"
        },
        {
            id: "S5",
            title: "WABC Coaches Manual Level 2 · 1.3.3 Half court zone defence",
            publisher: "FIBA · WABC",
            locator: "Nivel 2, Team, 1 Defensive tactics and strategies, 1.3 Zone defences",
            url: "https://wabc.fiba.com/manual/level-2/l2-team/1-defensive-tactics-and-strategies/1-3-zone-defences/1-3-3-half-court-zone-defence/",
            used: "Principios generales de toda zona (brazos arriba, comunicación, rebote, poste alto con un brazo por delante), las preguntas que el entrenador debe responder y la recomendación de enseñar primero una 2-1-2 o 2-3.",
            accessed: "26/11/2026"
        },
        {
            id: "S6",
            title: "WABC Coaches Manual Level 2 · 2.4.4 Proving an opponent is playing zone defence",
            publisher: "FIBA · WABC",
            locator: "Nivel 2, Team, 2.4 Offence against zone defence (leído en el espejo wabc-chn.fiba.com, mismo contenido)",
            url: "https://wabc-chn.fiba.com/manual/level-2/l2-team/2-offensive-tactics-and-strategies/2-4-offence-against-zone-defence/2-4-4-proving-an-opponent-is-playing-zone-defence/",
            used: "Definición de defensa zonal y la recomendación de no permitir zonas hasta los 15 años.",
            accessed: "26/11/2026"
        },
        {
            id: "S7",
            title: "WABC Mini-Basketball Manual · 5.2 Modified rules in competitions",
            publisher: "FIBA · WABC",
            locator: "Mini-Basketball, 5 Modified rules",
            url: "https://wabc.fiba.com/manual/mini-basketball/mb-5-modified-rules/mb-5-2-modified-rules-in-competitions/",
            used: "Regla modificada opcional: no permitir la defensa zonal hasta la categoría U16.",
            accessed: "26/11/2026"
        },
        {
            id: "S8",
            title: "WABC Coaches Manual Level 3 (PDF) · 2.2.2 Designing offensive and defensive schemes",
            publisher: "FIBA · WABC",
            locator: "Coach, 2 Know-how, 2.2 Planning, págs. 37-41",
            url: "https://assets.fiba.basketball/image/upload/documents-corporate-wabc-coaching-manual-level-3-eng.pdf",
            used: "La 1-1-3 de emparejamiento como base de la que se derivan la caja y uno y la 1-3-1 de emparejamiento; la diferencia entre zonas de un base y de dos bases al frente; y cómo medir si un sistema defensivo funciona.",
            accessed: "26/11/2026"
        }
    ];

    var unavailableSources = [
        {
            title: "WABC Coaches Manual Level 3 · 1.3 Zone defenses (índice)",
            url: "https://wabc.fiba.com/manual/level-3/l3-team/1-defensive-tactics-and-strategies/1-3-zone-defenses/",
            reason: "El sitio no permitió la consulta automática. Se leyeron directamente las subsecciones 1.3.2 y 1.3.3, que son las que se citan."
        },
        {
            title: "WABC Coaches Manual Level 1 · 1.3.1 Why zone is not recommended for players under 15",
            url: "https://wabc.fiba.com/manual/level-1/l1-team/l1-1-defensive-tactics-and-strategies/1-3-zone-defences/1-3-1-why-zone-is-not-recommended-for-players-under-15/",
            reason: "No se pudo abrir. Por eso no citamos las razones que da ese apartado; la recomendación de edad se toma de otras secciones que sí leímos."
        }
    ];

    var aprender = [
        {
            id: "introduccion",
            number: "1",
            title: "Introducción",
            kind: "interpretation",
            blocks: [
                { p: "La 1-3-1 es una zona de aspecto agresivo: un defensor arriba, tres en la línea media a la altura de la línea de libres y uno atrás que recorre toda la línea de fondo. Cierra el centro y el poste alto, cubre bien a los tiradores de las alas y genera oportunidades de trampa en las esquinas." },
                { p: "A cambio, le exige mucho a un jugador en particular, el defensor de fondo, y deja expuestos la línea de fondo y el rebote. Esta guía explica cómo se organiza, qué hace cada uno según dónde esté el balón, sus variantes, cómo atacarla y cómo entrenarla." },
                { p: "Si todavía no leíste la guía de la **zona 2-3**, conviene empezar por ahí: los principios generales de toda zona (moverse con el pase, brazos arriba, comunicación, rebote) se explican en detalle en ese contenido y acá se dan por conocidos." },
                {
                    callout: "Las reglas que mostramos siguen la versión de emparejamiento del manual WABC de nivel 3. Hay otras formas de jugar la 1-3-1 (más o menos agresivas, con o sin trampas). En el simulador podés comparar las variantes.",
                    title: "Antes de empezar",
                    tone: "info"
                }
            ]
        },
        {
            id: "definicion",
            number: "2",
            title: "Definición técnica",
            kind: "official",
            refs: ["S6", "S2", "S8"],
            blocks: [
                { p: "Como toda defensa zonal, la 1-3-1 es una defensa de equipo en la que cada jugador es responsable de un área de la cancha y de cualquier atacante que esté en ella [S6]." },
                { p: "El manual WABC de nivel 3 la presenta como una zona de **emparejamiento** (*match up*): además de cuidar su área, cada defensor busca quedar frente a un atacante cuando el balón se mueve, de modo que la zona se parezca a una individual en el lado del balón [S2]. El mismo manual la ubica como derivada de la 1-1-3 de emparejamiento [S8]." },
                {
                    table: {
                        caption: "Los cinco puestos de la 1-3-1 según WABC [S2]",
                        head: ["Puesto", "Nombre en el manual", "Responsabilidad principal"],
                        rows: [
                            ["X1", "Base de arriba (up guard)", "El centro de la cancha; orientar el balón hacia un lado"],
                            ["X3 / X4", "Línea media (frontline), alas", "Los jugadores exteriores de las alas"],
                            ["X5", "Línea media (frontline), centro", "Frenar cualquier penetración a la zona pintada"],
                            ["X2", "Base de fondo (back guard)", "La última línea: de una esquina a la otra"]
                        ]
                    }
                },
                { p: "Es una zona de **frente impar** (un solo defensor arriba). El manual de nivel 3 distingue, al diseñar un ataque, entre zonas de un base y de dos bases al frente [S8]; esa diferencia es clave para entender cómo se la ataca." }
            ]
        },
        {
            id: "objetivos",
            number: "3",
            title: "Objetivos",
            kind: "interpretation",
            refs: ["S2"],
            blocks: [
                {
                    list: [
                        "**Cerrar el centro y el poste alto**, con tres defensores a la altura de la línea de libres.",
                        "**Cubrir a los tiradores de las alas**: frente a la 1-1-3, la 1-3-1 tiene mejor cobertura de los tiradores exteriores, sobre todo en el ala [S2].",
                        "**Orientar el balón hacia un lado** y mantenerlo ahí.",
                        "**Crear trampas** en las esquinas, donde las líneas ayudan a la defensa.",
                        "**Romper el ritmo** de un rival que ataca con un base en el centro."
                    ]
                }
            ]
        },
        {
            id: "principios",
            number: "4",
            title: "Principios",
            kind: "official",
            refs: ["S2", "S3", "S5"],
            blocks: [
                { p: "El manual WABC enumera tres condiciones para que la zona de emparejamiento funcione, en redacción propia [S2]:" },
                {
                    ordered: true,
                    list: [
                        "**Que cada defensor pueda defender a un jugador exterior** e impedirle pasar o dribblear.",
                        "**Que los defensores vuelen con el balón**: se mueven mientras el pase está en el aire.",
                        "**Que se comuniquen** entre ellos."
                    ]
                },
                { p: "A eso se suman los principios generales de toda zona que plantea el manual de nivel 2: brazos arriba y activos, el poste alto defendido con al menos un brazo por delante, y con cada tiro todos buscan a quién bloquear [S5]. Y las voces que propone WABC para las zonas de emparejamiento: quien toma al poseedor avisa «¡balón!» [S3]." }
            ]
        },
        {
            id: "explicacion",
            number: "5",
            title: "Explicación detallada",
            kind: "interpretation",
            refs: ["S2", "S5"],
            blocks: [
                { h: "5.1 Posicionamiento inicial" },
                { p: "X1 arriba, cerca de la línea de tres puntos o un poco por dentro; X3 y X4 en las alas, a la altura de la línea de libres extendida; X5 en el centro, en la línea de libres; X2 atrás, delante del aro. Según WABC, X3 y X4 tienen menos distancia que recorrer hasta las alas que en la 1-1-3, y X5 es quien frena las penetraciones para que X4 no tenga que hacerlo y deje libre a un tirador [S2]." },
                { board: "alineacion" },
                { h: "5.2 Qué necesita cada puesto" },
                { p: "El manual señala tres requisitos: defensores de la línea media que puedan defender a los jugadores de las alas, un base de fondo muy rápido para cubrir de esquina a esquina y, preferentemente, alto, porque también va a tener que defender el poste bajo [S2]. Si tu equipo no tiene ese jugador, la 1-3-1 pierde buena parte de su sentido." },
                { h: "5.3 Balón en el ala" },
                { p: "Las reglas que propone WABC [S2]: el alero de ese lado (X3) defiende al jugador del ala; X1 rota para negar el poste alto; X5 se corre para jugar por delante a cualquier poste bajo; X4 rota a una posición de ayuda; X2 se acerca a la esquina pero se queda dentro de la zona pintada. Si el jugador de la esquina es muy buen tirador, X2 puede acercarse más." },
                { board: "circulacion" },
                { h: "5.4 Balón en la esquina" },
                { p: "X2 sale a defender la esquina, X5 juega por delante al poste bajo, X4 queda en ayuda detrás del poste y X3 puede bajar hacia el poste, aunque su responsabilidad principal sigue siendo el ala [S2]. Es la situación en la que más trabaja X2: por eso la salida tiene que empezar cuando el pase sale del ala." },
                { h: "5.5 Rotaciones e inversión" },
                { p: "Cuando el balón vuelve arriba y se invierte, la zona repite las mismas reglas del otro lado: ahora el alero contrario toma el balón y el que estaba en el ala queda como ayuda. Es una interpretación directa de las reglas anteriores, aplicada en espejo. El cambio de lado es caro para X2, que cruza toda la línea de fondo." },
                { h: "5.6 Defensa del poste alto" },
                { p: "El poste alto es el corazón de la 1-3-1 y su punto más protegido: X5 vive ahí y X1 baja a negarlo cuando el balón va al ala [S2]. Si el pase entra igual, la ayuda tiene que ser corta, porque el poste alto con balón deja a la zona prácticamente en individual y castiga a quien ayuda de más [S4]." },
                { board: "poste-alto" },
                { h: "5.7 Defensa del poste bajo y de las esquinas" },
                { p: "El poste bajo del lado del balón lo juega X5 por delante; la ayuda para el pase bombeado viene de atrás (X4 o X2). La esquina es de X2. Como un solo jugador cubre las dos esquinas y el poste bajo, este es el sector más frágil de la zona: si X2 sale tarde o sale y nadie ocupa el aro, la línea de fondo queda abierta." },
                { h: "5.8 Ayudas y recuperaciones" },
                { p: "Desde la esquina, la penetración la frena el defensor que está en el área del poste bajo, y X3 amaga sin abandonar el ala. Desde arriba, la frena X5 y X2 cruza la zona pintada para quedar más cerca de los tiradores; con un poste bajo ocupado, X2 puede rotar para cortar ese pase [S2]." },
                { board: "penetracion" },
                { h: "5.9 Trampas" },
                { p: "La esquina se presta a la trampa: X3 persigue el pase y encierra al atacante junto con X2. Como alternativa, X3 puede negar el pase de vuelta al ala y la zona corta todos los pases cercanos sin encerrar el balón [S2]." },
                { board: "trampa-esquina" },
                { h: "5.10 Rebote defensivo" },
                { p: "Es la debilidad más conocida de la 1-3-1: con tres defensores a la altura de la línea de libres, solo X2 y a veces X5 empiezan cerca del aro. La regla general de WABC vale igual: con el tiro, todos buscan a alguien para bloquear [S5]. En la práctica, el alero del lado débil (X4 cuando el balón está a la derecha) tiene que cerrar el rebote del lado contrario, que es por donde cae la mayoría de los tiros fallados desde el costado." }
            ]
        },
        {
            id: "responsabilidades",
            number: "6",
            title: "Responsabilidades",
            kind: "interpretation",
            refs: ["S2"],
            blocks: [
                {
                    table: {
                        caption: "Responsabilidades por puesto (orientativas, versión base)",
                        head: ["Jugador", "Balón arriba", "Balón en el ala", "Balón en la esquina", "Con el tiro"],
                        rows: [
                            ["X1 (arriba)", "Presiona y orienta el balón hacia un lado", "Baja a negar el poste alto", "Protege el codo y el poste alto del lado del balón", "Rebote largo; primer pase de salida"],
                            ["X3 / X4 (alas)", "En la línea de pase hacia su ala", "El del lado del balón lo toma; el otro entra a la ayuda", "El del lado del balón baja un paso sin perder el ala; el otro queda en ayuda", "El del lado débil cierra el rebote contrario"],
                            ["X5 (centro)", "Niega el poste alto y frena penetraciones", "Va al poste bajo y lo juega por delante", "Juega por delante al poste bajo", "Bloquea al poste más cercano"],
                            ["X2 (fondo)", "Delante del aro", "Se acerca a la esquina sin salir de la pintura", "Sale a la esquina", "Bloquea al atacante de la esquina o al más cercano al aro"]
                        ]
                    }
                },
                { p: "La tabla resume las reglas del manual WABC [S2] tal como las aplicamos en las pizarras y el simulador. El reparto exacto de las ayudas lo decide cada entrenador." }
            ]
        },
        {
            id: "aplicacion",
            number: "7",
            title: "Aplicación en situaciones reales",
            kind: "interpretation",
            blocks: [
                { p: "Situaciones en las que la 1-3-1 suele tener sentido:" },
                {
                    list: [
                        "El rival ataca con un solo base y depende de pases al poste alto o de tiradores en las alas.",
                        "Tenés un jugador rápido y con envergadura para el puesto de fondo, y aleros largos.",
                        "Querés cambiar el ritmo con trampas en las esquinas durante algunas posesiones.",
                        "El rival tira mal desde la esquina y juega poco por la línea de fondo."
                    ]
                },
                { p: "Situaciones en las que suele costar:" },
                {
                    list: [
                        "Rival con dos bases arriba (frente par), que obliga a X1 a elegir.",
                        "Rival con buenos tiradores de esquina o jugadores que atacan la línea de fondo.",
                        "Rival que gana el rebote ofensivo con facilidad.",
                        "Equipo propio sin un defensor de fondo rápido."
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
            refs: ["S2"],
            blocks: [
                {
                    list: [
                        "Mejor cobertura de los tiradores de las alas que otras zonas de un base [S2].",
                        "Poste alto muy protegido: X5 y X1 lo niegan casi siempre.",
                        "Orienta el balón y lo mantiene en un lado, lo que facilita anticipar los pases.",
                        "Las esquinas se convierten en lugares de trampa.",
                        "Puede sorprender a ataques preparados solo contra la 2-3."
                    ]
                }
            ]
        },
        {
            id: "limitaciones",
            number: "9",
            title: "Limitaciones y riesgos",
            kind: "interpretation",
            refs: ["S4"],
            blocks: [
                {
                    list: [
                        "**Línea de fondo y esquinas**: un solo defensor (X2) cubre las dos esquinas y ayuda en el poste bajo.",
                        "**Rebote**: pocos defensores cerca del aro al momento del tiro.",
                        "**Frente par**: dos atacantes arriba crean un dos contra uno sobre X1 o sobre un alero.",
                        "**Dos contra uno en el lado del balón**: un atacante que corre a la esquina deja al alero defensor contra dos [S4].",
                        "**Pases cruzados al lado débil**, sobre todo cuando la zona atrapa en una esquina.",
                        "**Desgaste**: X2 recorre mucha distancia en cada posesión."
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
            refs: ["S2"],
            blocks: [
                {
                    list: [
                        "X1 deja que el balón vaya al centro o al lado que no conviene en lugar de orientarlo.",
                        "Moverse cuando el balón ya llegó, en lugar de volar con el pase [S2].",
                        "X2 sale de la zona pintada cuando el balón está en el ala y la esquina todavía no recibió.",
                        "X3 abandona el ala para ayudar en una penetración desde la esquina y llega tarde al tiro.",
                        "En la trampa, los dos defensores se separan y el atacante pasa entre ellos.",
                        "Nadie cierra el rebote del lado débil.",
                        "X5 sale de más sobre el poste alto y deja el aro sin protección."
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
                            ["El balón llega al centro", "X1 se ubica para que solo pueda ir hacia un lado", "«¡Mandalo!»"],
                            ["Llega tarde al balón", "Empezar a moverse con el balón en el aire", "«¡Con el pase!»"],
                            ["X2 sale antes de tiempo", "Esperar dentro de la pintura hasta que salga el pase a la esquina", "«¡Dos, adentro!»"],
                            ["X3 abandona el ala", "Amagar a la penetración con un paso y volver", "«¡Amagá y volvé!»"],
                            ["Trampa abierta", "Pies juntos entre los dos defensores, brazos arriba", "«¡Cerrá la puerta!»"],
                            ["Rebote del lado débil libre", "El alero débil busca al atacante que entra", "«¡Débil, buscá!»"]
                        ]
                    }
                },
                { p: "Como en cualquier zona, sirve más una palabra que todo el equipo entienda que una explicación larga en plena acción." }
            ]
        },
        {
            id: "metodologia",
            number: "12",
            title: "Metodología",
            kind: "method",
            refs: ["S3", "S5"],
            blocks: [
                { p: "Una secuencia posible para enseñar la 1-3-1, basada en cómo propone WABC practicar las zonas de emparejamiento [S3]:" },
                {
                    ordered: true,
                    list: [
                        "**Explicar en la pizarra** los cinco puestos y las reglas de ala y esquina.",
                        "**Trabajar por separado** los deslizamientos de los dos de afuera (X1 y X2) y los de la línea media, como propone WABC [S3].",
                        "**Cinco contra seis a ocho atacantes que solo pasan**, y después con dribbling y cortes, hasta llegar a velocidad de juego [S3].",
                        "**Agregar la trampa** en la esquina cuando el equipo ya se desplaza bien.",
                        "**Juego real** con rebote y salida, y corrección en las pausas."
                    ]
                },
                { p: "Antes de jugarla, conviene responder las preguntas que plantea WABC para cualquier zona: quién toma el balón, quién frena la penetración, quién ayuda al que ayudó y quién bloquea a quién en el rebote [S5]." }
            ]
        },
        {
            id: "progresiones",
            number: "13",
            title: "Progresiones",
            kind: "method",
            refs: ["S3"],
            blocks: [
                {
                    table: {
                        head: ["Paso", "Situación", "Qué se agrega"],
                        rows: [
                            ["1", "X1 y X2 solos contra pasadores", "Deslizamientos de los dos de afuera y voces"],
                            ["2", "Línea media sola (X3, X5, X4)", "Ala, poste bajo y ayuda"],
                            ["3", "5 contra 6 pasadores fijos", "Moverse con el pase, sin dribbling [S3]"],
                            ["4", "5 contra 6 con dribbling y cortes", "Penetración desde la esquina y desde arriba [S3]"],
                            ["5", "Trampa en la esquina", "Encerrar y rotar detrás"],
                            ["6", "5 contra 5 con rebote", "Cerrar el rebote del lado débil"]
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
            refs: ["S6", "S7", "S4", "S1"],
            blocks: [
                { p: "El manual WABC de nivel 2 recomienda no permitir la defensa zonal hasta los 15 años [S6]; el de minibásquet incluye como regla modificada opcional no permitirla hasta la categoría U16 [S7]. En el apartado del nivel 3 sobre cómo atacar la zona, el manual menciona que FIBA recomienda que los chicos no jueguen zona hasta los 14 años [S4]. Las cifras no coinciden entre secciones; las citamos tal como aparecen." },
                { p: "El Reglamento Oficial FIBA 2024 no restringe la defensa zonal [S1]. Cualquier prohibición en formativas depende del reglamento de cada competencia." },
                {
                    table: {
                        caption: "Propuesta de BasketIQ por etapa (no es una norma oficial)",
                        head: ["Categoría", "Uso sugerido de la 1-3-1"],
                        rows: [
                            ["Minibásquet a U15", "No usarla como defensa. Sí reconocerla y atacarla con pases, cortes y ocupación de esquinas."],
                            ["U17", "Solo después de dominar una zona más simple (2-3) y la individual."],
                            ["U19 y mayores", "Recurso de cambio de ritmo, con o sin trampas según el rival y el personal disponible."]
                        ]
                    }
                },
                {
                    callout: "La tabla es una propuesta metodológica de BasketIQ, no un reglamento. Las edades de cada categoría y lo permitido cambian según la competencia.",
                    tone: "info"
                }
            ]
        },
        {
            id: "variantes",
            number: "+",
            title: "Variantes y alternativas tácticas",
            kind: "variant",
            refs: ["S2"],
            blocks: [
                { p: "Formas habituales de modificar la 1-3-1. Ninguna es universal:" },
                {
                    list: [
                        "**Esquina sin trampa** (versión base): X2 toma la esquina y X3 se queda con el ala [S2].",
                        "**Trampa en la esquina**: X3 persigue el pase y encierra junto con X2 [S2].",
                        "**Negar el pase de vuelta**: X3 corta el pase al ala y todos los pases cercanos quedan negados, sin encerrar [S2].",
                        "**1-3-1 de presión**: X1 y los aleros se adelantan hasta media cancha o más arriba para atrapar en las bandas. Es una variante de BasketIQ que tiene su lugar en los contenidos de presión.",
                        "**1-3-1 hundida**: la línea media se ubica más cerca del aro para proteger el rebote, a costa de conceder más tiro desde las alas."
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
                { p: "Tres ejercicios en progresión: deslizamientos sin oposición real, la trampa en la esquina y, del otro lado, cómo atacar la 1-3-1. Cada uno tiene su pizarra y se puede añadir al entrenamiento." }
            ]
        }
    ];

    var exercises = [
        {
            id: "ej-deslizamientos",
            name: "Deslizamientos de la 1-3-1 contra seis pasadores",
            meta: {
                fundamento: "Defensa zonal",
                objetivo: "Desplazamientos defensivos",
                categories: ["U17", "Primera"],
                level: "Inicial",
                minPlayers: 11,
                maxPlayers: 14,
                minutes: [8, 12],
                court: "half",
                hoops: 1,
                materials: ["Balones"],
                optionalMaterials: ["Conos"],
                blockType: "tactica"
            },
            adaptations: [
                {
                    id: "cuatro-pasadores",
                    label: "Con cuatro pasadores (9 jugadores)",
                    text: "Regresión: cuatro pasadores (arriba, ala, esquina y poste alto del mismo lado) contra los cinco defensores. Se trabaja un lado por vez y después el otro.",
                    req: { minPlayers: 9 }
                },
                {
                    id: "por-lineas",
                    label: "Por líneas (5 jugadores)",
                    text: "Regresión: primero X1 y X2 solos contra tres pasadores y después la línea media sola, como propone WABC para separar los deslizamientos de los de afuera y de la línea media.",
                    req: { minPlayers: 5 }
                }
            ],
            kind: "interpretation",
            refs: ["S3"],
            board: "ejercicio-deslizamientos",
            objective: "Automatizar las reglas de la 1-3-1 con el balón arriba, en el ala y en la esquina.",
            secondary: ["Volar con el pase", "Negar el poste alto en todo momento", "Avisar «¡balón!» al tomar al poseedor"],
            category: "U17 en adelante (según reglamento)",
            level: "Inicial",
            players: "Mínimo 11 (5 defensores y 6 pasadores); hasta 14 con rotación de grupos",
            playersShort: "11 a 14 jugadores",
            duration: "8 a 12 minutos",
            space: "Media cancha",
            hoops: "1",
            materials: "1 balón; conos opcionales para marcar los lugares de los pasadores",
            organization: "Seis pasadores: arriba (A), alas (B y D), esquinas (C y E) y poste alto (F). Cinco defensores en 1-3-1.",
            development: "Los pasadores se pasan el balón en el orden que marca el entrenador, con una pausa breve en cada recepción. La defensa aplica las reglas de ala y esquina y quien toma al poseedor grita «¡balón!». Cada dos minutos rotan los grupos.",
            rules: ["Los pasadores no tiran ni dribblean en la primera etapa", "El poste alto (F) recibe solo si la zona lo deja libre", "Pases cruzados por encima de la zona permitidos desde el tercer minuto"],
            cues: ["«¡Con el pase!»", "«¡Balón!»", "«¡Dos, adentro!» mientras el balón está en el ala"],
            errors: ["X2 sale a la esquina antes de que salga el pase", "X1 no baja a negar el poste alto con el balón en el ala", "X3 o X4 se quedan mirando en el lado débil"],
            corrections: ["Congelar la acción y preguntar quién debía moverse", "Hacer el recorrido a la voz, sin balón", "Sumar un punto a los pasadores cada vez que F recibe"],
            variants: ["Agregar la trampa en la esquina", "El entrenador decide el pase con una señal", "Cronometrar diez pases sin errores"],
            progressions: ["Permitir el dribbling y los cortes, hasta llegar a velocidad de juego", "Pasar a 5 contra 5 con rebote", "Que los pasadores puedan tirar desde las alas"],
            regressions: ["Cuatro pasadores de un solo lado", "Separar los deslizamientos de los de afuera y de la línea media", "Hacerlo caminando"],
            evaluation: ["Siempre hay un defensor sobre el balón", "F casi nunca recibe", "X2 llega a la esquina con el balón y no antes", "Se escucha «¡balón!» en cada recepción"],
            basis: "El manual WABC propone practicar las zonas de emparejamiento contra seis, siete u ocho atacantes, empezando solo con pases, sumando después dribbling y cortes, y trabajando por separado a los de afuera y a la línea media [S3]. La organización concreta y las consignas son de BasketIQ."
        },
        {
            id: "ej-trampa",
            name: "Trampa en la esquina y rotación detrás",
            meta: {
                fundamento: "Defensa zonal",
                objetivo: "Trampas y rotaciones",
                categories: ["U19", "Primera"],
                level: "Avanzado",
                minPlayers: 9,
                maxPlayers: 12,
                minutes: [10, 12],
                court: "half",
                hoops: 1,
                materials: ["Balones", "Conos"],
                optionalMaterials: [],
                blockType: "tactica"
            },
            adaptations: [
                {
                    id: "tres-contra-tres",
                    label: "3 contra 3 en el lado fuerte (6 jugadores)",
                    text: "Regresión: solo X2, X3 y X5 contra tres atacantes (ala, esquina y poste bajo). Se trabaja la trampa y el pase de vuelta, sin lado débil.",
                    req: { minPlayers: 6 }
                }
            ],
            kind: "method",
            refs: ["S2"],
            board: "trampa-esquina",
            objective: "Encerrar al atacante de la esquina sin dejar pases fáciles al lado débil.",
            secondary: ["Negar los pases cercanos", "Rotar detrás de la trampa", "Salir al pase largo con control"],
            category: "U19 en adelante",
            level: "Avanzado",
            players: "9 (4 atacantes y 5 defensores); hasta 12 con rotación",
            playersShort: "9 a 12 jugadores",
            duration: "10 a 12 minutos",
            space: "Media cancha",
            hoops: "1",
            materials: "1 balón; conos para marcar el área de trampa en cada esquina",
            organization: "Cuatro atacantes (arriba, ala, esquina y ala contraria) contra cinco defensores en 1-3-1. Conos en las esquinas marcan dónde se atrapa.",
            development: "El ataque circula; cada vez que el balón llega a la esquina, X2 y X3 atrapan. El atacante atrapado tiene cinco segundos para salir con un pase. Si el pase va al lado débil, la defensa rota y el juego sigue hasta el tiro.",
            rules: ["Solo se atrapa en la esquina", "El atrapado no puede dribblear", "Robo o cinco segundos sin pase: 2 puntos para la defensa"],
            cues: ["«¡Cerrá la puerta!»", "«¡Negá el ala!»", "«¡Débil, listo!»"],
            errors: ["Los dos defensores de la trampa dejan un hueco entre ellos", "X1 no corta el pase de vuelta al ala", "X4 se queda mirando y no sale al pase largo"],
            corrections: ["Pies de los dos defensores casi juntos y brazos arriba", "Marcar con un cono la posición de X1", "Primero practicar la rotación del lado débil sin trampa"],
            variants: ["Alternar trampa y negación del pase de vuelta según la señal del entrenador", "Permitir al atrapado un dribbling", "Agregar un quinto atacante en el poste bajo"],
            progressions: ["Ataque libre con tiro", "5 contra 5 con salida al contraataque tras el robo", "Trampa en las dos esquinas"],
            regressions: ["3 contra 3 en el lado fuerte", "Trampa sin pase largo permitido", "Atacante de la esquina pasivo"],
            evaluation: ["Pases robados o desviados por trampa", "Tiros abiertos concedidos desde el lado débil", "Tiempo que tarda la zona en recomponerse"],
            basis: "Propuesta metodológica de BasketIQ basada en la trampa en la esquina y la alternativa de negar el pase de vuelta que describe el manual WABC para la 1-3-1 [S2]."
        },
        {
            id: "ej-atacar",
            name: "Atacar la 1-3-1: dos contra uno sobre el alero",
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
                optionalMaterials: ["Conos"],
                blockType: "tactica"
            },
            adaptations: [
                {
                    id: "tres-contra-dos",
                    label: "3 contra 2 en un lado (5 jugadores)",
                    text: "Regresión: ala, esquina y poste contra un alero defensor y el defensor de fondo. Se repite el corte a la esquina y la lectura del dos contra uno.",
                    req: { minPlayers: 5 }
                }
            ],
            kind: "interpretation",
            refs: ["S4"],
            board: "atacar",
            objective: "Crear un dos contra uno sobre un defensor de la línea media con un corte a la esquina.",
            secondary: ["Ocupar el espacio detrás de la zona", "Leer qué defensor rota", "Usar el poste alto como pasador"],
            category: "U15 en adelante (como contenido ofensivo, también donde la zona no está permitida)",
            level: "Intermedio",
            players: "10 (5 contra 5); hasta 12 con cambios",
            playersShort: "10 a 12 jugadores",
            duration: "10 a 15 minutos",
            space: "Media cancha",
            hoops: "1",
            materials: "1 o 2 balones; conos opcionales para marcar la esquina",
            organization: "Ataque en 1-3-1 (base, dos alas, poste alto y un jugador detrás de la zona en la línea de fondo) contra cinco defensores en 1-3-1.",
            development: "El base pasa al ala. El jugador de la línea de fondo corre a la esquina del lado del balón y crea el dos contra uno sobre el alero defensor. El ala decide: tiro, pase a la esquina o pase al poste. Si el balón va a la esquina, el poste alto corta al aro (y retrasa el corte si la esquina penetra).",
            rules: ["El primer tiro solo vale después de un pase al ala o a la esquina", "Un punto extra si el balón toca la pintura antes del tiro", "Tres posesiones por grupo y se cambian los roles"],
            cues: ["«¡Detrás de la zona!»", "«¡Dos contra uno, leé!»", "«¡Cinco, esperá y entrá!»"],
            errors: ["El jugador de fondo corre a la esquina antes de que el balón llegue al ala", "El ala tira apurado sin mirar la esquina", "El poste corta al mismo tiempo que penetra la esquina y la congestiona"],
            corrections: ["Salir de la línea de fondo cuando el pase está en el aire", "Primera opción: mirar al defensor de fondo; si no sale, pase a la esquina", "Hacer la lectura primero sin defensa"],
            variants: ["Inversión rápida al lado contrario con un corte desde el lado débil", "Bloqueo del poste alto al alero defensor", "Pase directo al poste alto y lectura de la ayuda"],
            progressions: ["Defensa con trampa en la esquina", "Ataque libre con reloj de 24 segundos", "Alternar zona e individual sin aviso"],
            regressions: ["3 contra 2 en un lado", "Defensa pasiva que solo se desplaza", "Sin tiro: el ataque suma con el pase a la pintura"],
            evaluation: ["Tiros abiertos generados por posesión", "Pases a la pintura", "Pérdidas por pases cruzados"],
            basis: "Situación descrita en el manual WABC de nivel 3 para atacar la zona desde una alineación 1-3-1 (corte a la esquina para crear un dos contra uno sobre un defensor de la línea media, corte del poste al aro y corte del ala desde la esquina) [S4]. Las reglas, las consignas y la progresión son de BasketIQ."
        }
    ];

    var evaluar = [
        {
            id: "evaluar-criterios",
            number: "16",
            title: "Criterios de evaluación",
            kind: "method",
            blocks: [
                { p: "Marcá lo que tu equipo ya hace bien. Las casillas se guardan en este dispositivo." },
                {
                    checklist: [
                        "X1 orienta el balón hacia un lado en cada posesión",
                        "Los defensores se mueven con el pase",
                        "El poste alto casi nunca recibe cómodo",
                        "X2 sale a la esquina a tiempo y vuelve a la pintura cuando el balón sale",
                        "X3 y X4 amagan a la penetración sin abandonar su ala",
                        "El poste bajo del lado del balón está jugado por delante",
                        "La trampa en la esquina se cierra sin huecos y el lado débil rota",
                        "Con cada tiro, el alero del lado débil cierra el rebote contrario",
                        "Se escucha «¡balón!» en cada recepción"
                    ]
                },
                {
                    table: {
                        caption: "Indicadores para medir en partido o en entrenamiento",
                        head: ["Indicador", "Cómo medirlo"],
                        rows: [
                            ["Recepciones del poste alto", "Contar por posesión defendida en 1-3-1"],
                            ["Tiros desde la esquina", "Contar y anotar si hubo defensor a menos de un brazo"],
                            ["Rebotes defensivos", "Rebotes tomados ÷ tiros fallados del rival"],
                            ["Robos tras trampa", "Robos y pases desviados en las esquinas"]
                        ]
                    }
                },
                { p: "El manual WABC de nivel 3 sugiere medir un sistema defensivo con indicadores ligados a su objetivo: desde dónde tira el rival, cuántas veces toca el balón el poste, cuántas veces el balón penetra en la zona pintada y cuánto tiempo de posesión consume [S8]." }
            ],
            refs: ["S8"]
        },
        {
            id: "evaluar-preguntas",
            title: "Autoevaluación",
            kind: "method",
            refs: ["S2", "S4"],
            blocks: [
                { qa: "¿Qué jugador necesita la 1-3-1 en el puesto de fondo?", answer: ["Un defensor muy rápido para cubrir de esquina a esquina y, preferentemente, alto, porque también defiende el poste bajo [S2]."] },
                { qa: "El balón está en el ala derecha. ¿Qué hace X1?", answer: ["Baja a negar el poste alto [S2]."] },
                { qa: "El balón baja a la esquina. ¿Quién sale?", answer: ["X2, el defensor de fondo. X5 juega por delante al poste bajo y X4 queda en ayuda detrás [S2]."] },
                { qa: "El atacante de la esquina penetra por el fondo. ¿Qué hace X3?", answer: ["Puede amagar a la penetración, pero sin perder de vista el ala y listo para volver a ese lugar [S2]."] },
                { qa: "¿Qué alternativa a la trampa en la esquina propone WABC?", answer: ["Que X3 niegue el pase de vuelta al ala, de modo que todos los pases cercanos queden negados [S2]."] },
                { qa: "¿Cómo se crea un dos contra uno contra la 1-3-1?", answer: ["Por ejemplo, con un atacante que juega detrás de la zona y corre a la esquina cuando el balón llega al ala: el alero defensor queda contra dos [S4]."] }
            ]
        }
    ];

    // ------------------------------------------------------------------
    // Simulador
    // ------------------------------------------------------------------
    var OFF = { o1: [9.0, 7.5], o2: [6.6, 2.4], o3: [6.6, 12.6], o4: [1.0, 0.7], o5: [1.0, 14.3] };
    function P(off, def) { return merge(off, def); }

    var SIM = {
        id: "sim-zona-1-3-1",
        title: "Simulador de la zona 1-3-1",
        intro: "Elegí dónde está el balón y mirá cómo se ajusta la 1-3-1. La versión base sigue las reglas del manual WABC [S2]; las variantes muestran las dos respuestas que el mismo manual plantea para la esquina.",
        view: VIEW,
        tags: ["Zona 1-3-1", "Academy"],
        players: {
            o1: O("1", 0, 0), o2: O("2", 0, 0), o3: O("3", 0, 0), o4: O("4", 0, 0), o5: O("5", 0, 0),
            x1: D("1", 0, 0), x2: D("2", 0, 0), x3: D("3", 0, 0), x4: D("4", 0, 0), x5: D("5", 0, 0)
        },
        mirrorSwap: { x3: "x4", x4: "x3", o2: "o3", o3: "o2", o4: "o5", o5: "o4" },
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
                label: "Base: reglas WABC",
                kind: "interpretation",
                refs: ["S2"],
                desc: "Alero sobre el ala, X1 niega el poste alto, X5 juega por delante el poste bajo y X2 cubre las esquinas; en la esquina no se atrapa [S2].",
                states: {
                    top: {
                        title: "Balón en el eje central",
                        note: "X1 presiona y orienta al base hacia un lado. La línea media (X3, X5, X4) espera a la altura de la línea de libres y X2 protege el aro.",
                        ball: "o1",
                        pos: P(OFF, TOP),
                        resp: {
                            x1: "Presiona al balón y lo orienta hacia un lado; no lo deja ir al centro.",
                            x2: "Delante del aro: es la última línea y cubre las dos esquinas.",
                            x3: "En la línea de pase hacia el ala derecha.",
                            x4: "En la línea de pase hacia el ala izquierda.",
                            x5: "Niega el poste alto y frena cualquier penetración por el centro."
                        },
                        help: "Si el base penetra por el centro, X5 lo frena y X2 cruza la pintura para quedar cerca de los tiradores [S2].",
                        vulnerable: [
                            { x: 0.1, y: 0.2, w: 2.0, h: 2.4, label: "Esquina", text: "La esquina derecha: X2 tiene que recorrer mucho para llegar." },
                            { x: 0.1, y: 12.4, w: 2.0, h: 2.4, label: "Esquina", text: "La esquina izquierda, por el mismo motivo." }
                        ]
                    },
                    wingR: {
                        title: "Balón en el ala derecha",
                        note: "El alero X3 toma el balón, X1 baja a negar el poste alto, X5 va al poste bajo, X4 entra a la ayuda y X2 se acerca a la esquina sin salir de la pintura [S2].",
                        ball: "o2",
                        pos: P(OFF, WINGR),
                        resp: {
                            x1: "Baja a negar el poste alto.",
                            x2: "Se acerca a la esquina pero se queda dentro de la pintura; si el de la esquina es muy buen tirador, se acerca más.",
                            x3: "Defiende al jugador del ala.",
                            x4: "Entra a una posición de ayuda en el lado débil.",
                            x5: "Se corre al poste bajo y juega por delante a cualquier poste que haya ahí."
                        },
                        help: "X4, en ayuda, cubre el pase bombeado al poste bajo que X5 juega por delante.",
                        vulnerable: [
                            { x: 5.6, y: 11.2, w: 2.6, h: 2.6, label: "Ala débil", text: "El ala izquierda, con un pase cruzado por encima de la zona." },
                            { x: 0.1, y: 12.0, w: 2.0, h: 2.8, label: "Esquina débil", text: "La esquina del lado débil, lejos de todos." }
                        ]
                    },
                    cornerR: {
                        title: "Balón en la esquina derecha",
                        note: "Sale X2 a la esquina. X5 juega por delante el poste bajo, X4 queda en ayuda detrás y X3 baja un paso hacia el poste sin perder el ala [S2].",
                        ball: "o4",
                        pos: P(OFF, CORNERR),
                        resp: {
                            x1: "Protege el codo y el poste alto del lado del balón.",
                            x2: "Sale a la esquina y no deja penetrar por la línea de fondo.",
                            x3: "Baja hacia el poste, pero su responsabilidad principal sigue siendo el ala.",
                            x4: "Queda en ayuda detrás del poste bajo.",
                            x5: "Juega por delante al poste bajo del lado del balón."
                        },
                        help: "Si la esquina penetra, la frena el defensor del área del poste bajo (X5) y X3 amaga sin abandonar el ala [S2].",
                        vulnerable: [
                            { x: 5.4, y: 9.4, w: 3.0, h: 4.4, label: "Lado débil", text: "Todo el lado débil: la zona quedó cargada hacia la derecha." },
                            { x: 0.1, y: 8.0, w: 2.2, h: 2.8, label: "Rebote", text: "El rebote del lado débil, con solo X4 cerca del aro." }
                        ]
                    },
                    wingL: { mirrorOf: "wingR" },
                    cornerL: { mirrorOf: "cornerR" },
                    highPost: {
                        title: "Balón en el poste alto",
                        note: "El atacante de la esquina izquierda subió a la línea de libres y recibió. X5 queda entre el balón y el aro, X1 cae desde arriba y los aleros se hunden un paso sin perder las alas.",
                        ball: "o5",
                        pos: P(merge(OFF, { o5: [5.4, 7.5] }), { x1: [6.5, 7.4], x2: [1.9, 7.5], x3: [5.2, 4.0], x4: [5.2, 11.0], x5: [4.4, 7.5] }),
                        resp: {
                            x1: "Cae sobre el poste desde arriba para molestar el pase y el tiro.",
                            x2: "Protege el aro y cualquier corte por la línea de fondo.",
                            x3: "Se hunde un paso, pero queda listo para salir al ala derecha.",
                            x4: "Se hunde un paso, pero queda listo para salir al ala izquierda.",
                            x5: "Se queda entre el poste y el aro."
                        },
                        help: "La ayuda sobre el poste alto tiene que ser corta: si un defensor se va del todo, el poste pasa al atacante que quedó libre [S4].",
                        vulnerable: [
                            { x: 0.1, y: 1.6, w: 2.4, h: 3.0, label: "Fondo", text: "La línea de fondo derecha, detrás de X3." },
                            { x: 0.1, y: 10.4, w: 2.4, h: 3.0, label: "Fondo", text: "La línea de fondo izquierda, detrás de X4." }
                        ]
                    },
                    lowPostR: {
                        title: "Balón en el poste bajo derecho",
                        note: "El atacante de la esquina se metió al poste bajo con el balón. X5 lo defiende del lado del centro, X2 ayuda desde la línea de fondo y X3 baja a molestar desde arriba.",
                        ball: "o4",
                        pos: P(merge(OFF, { o4: [1.9, 4.4] }), { x1: [5.4, 5.6], x2: [1.2, 3.4], x3: [3.6, 3.0], x4: [2.8, 8.2], x5: [2.5, 5.0] }),
                        resp: {
                            x1: "Protege el poste alto y el pase al codo.",
                            x2: "Ayuda desde la línea de fondo y no deja el giro hacia ese lado.",
                            x3: "Baja a molestar al poste y vuelve al ala si sale el pase.",
                            x4: "Cuida el aro desde el lado débil y el corte por detrás.",
                            x5: "Defiende al poste del lado del centro y le niega el giro hacia la pintura."
                        },
                        help: "Antes de que reciba, el poste bajo se juega por delante [S2]. Una vez que recibió, el poste queda encerrado entre X5 y X2, y el lado débil es de X4.",
                        vulnerable: [
                            { x: 5.6, y: 1.0, w: 2.4, h: 2.6, label: "Ala", text: "El ala derecha si X3 se queda abajo." },
                            { x: 0.1, y: 11.6, w: 2.2, h: 3.2, label: "Esquina débil", text: "La esquina izquierda, con un pase cruzado desde el poste." }
                        ]
                    },
                    lowPostL: { mirrorOf: "lowPostR" }
                }
            },
            {
                id: "trampa",
                label: "Trampa en la esquina",
                kind: "interpretation",
                inherits: "base",
                refs: ["S2"],
                desc: "Cuando el balón baja a la esquina, X3 persigue el pase y atrapa junto con X2; X1 baja a negar el pase de vuelta al ala [S2]. Más presión, más riesgo en el lado débil.",
                states: {
                    cornerR: {
                        title: "Balón en la esquina derecha (trampa)",
                        note: "X2 y X3 encierran al atacante contra las líneas. X1 corta el pase de vuelta al ala, X5 juega por delante el poste bajo y X4 cuida el aro y el pase largo.",
                        ball: "o4",
                        pos: P(OFF, { x1: [5.9, 2.9], x2: [1.4, 1.3], x3: [1.9, 2.0], x4: [2.8, 6.8], x5: [2.4, 3.8] }),
                        resp: {
                            x1: "Baja a negar el pase de vuelta al ala.",
                            x2: "Atrapa desde la línea de fondo: no deja salir por el fondo.",
                            x3: "Persigue el pase y atrapa desde arriba: no deja salir por la banda ni partir la trampa.",
                            x4: "Último defensor: cuida el aro y sale al pase largo al lado débil.",
                            x5: "Juega por delante al poste bajo para cortar el pase corto."
                        },
                        help: "Si el atrapado logra el pase largo al lado débil, X4 sale y todos rotan detrás de él; el último en llegar a la zona toma el lugar vacío.",
                        vulnerable: [
                            { x: 0.1, y: 11.6, w: 2.2, h: 3.2, label: "Esquina débil", text: "El pase cruzado a la esquina izquierda." },
                            { x: 5.6, y: 11.2, w: 2.6, h: 2.8, label: "Ala débil", text: "El pase largo al ala izquierda." },
                            { x: 4.6, y: 6.4, w: 2.0, h: 2.2, label: "Codo", text: "El poste alto, que quedó sin defensor con X1 abajo." }
                        ]
                    },
                    cornerL: { mirrorOf: "cornerR" }
                }
            },
            {
                id: "niegaVuelta",
                label: "Negar el pase de vuelta",
                kind: "interpretation",
                inherits: "base",
                refs: ["S2"],
                desc: "Alternativa a la trampa: con el balón en la esquina, X3 niega el pase de vuelta al ala y todos los pases cercanos quedan cortados, sin encerrar al balón [S2].",
                states: {
                    cornerR: {
                        title: "Balón en la esquina derecha (se niegan los pases cercanos)",
                        note: "X2 defiende al balón, X3 se queda en la línea de pase del ala, X5 juega por delante el poste bajo y X1 cierra el codo. La esquina queda sin pases cortos.",
                        ball: "o4",
                        pos: P(OFF, { x1: [5.0, 5.6], x2: [1.6, 1.5], x3: [5.8, 2.8], x4: [2.4, 7.0], x5: [2.2, 3.6] }),
                        resp: {
                            x1: "Cierra el codo y el poste alto del lado del balón.",
                            x2: "Defiende al balón en la esquina y no deja penetrar por el fondo.",
                            x3: "Niega el pase de vuelta al ala.",
                            x4: "Queda en ayuda detrás del poste bajo y cuida el aro.",
                            x5: "Juega por delante al poste bajo."
                        },
                        help: "Si la esquina penetra, X5 frena y X4 cubre el aro. Como X3 está arriba, no hay amague desde el ala.",
                        vulnerable: [
                            { x: 5.4, y: 9.4, w: 3.0, h: 4.4, label: "Lado débil", text: "El pase cruzado al lado débil sigue siendo la salida." },
                            { x: 0.1, y: 2.6, w: 1.4, h: 2.2, label: "Fondo", text: "La penetración por la línea de fondo, sin ayuda de X3." }
                        ]
                    },
                    cornerL: { mirrorOf: "cornerR" }
                }
            }
        ]
    };

    return {
        id: "zona-1-3-1",
        sectionId: "zone131_defense",
        title: "Defensa zonal 1-3-1",
        subtitle: "Alineación, reglas de emparejamiento, trampas, rotaciones, cómo atacarla y cómo entrenarla, con fuentes WABC verificadas.",
        sectionLabel: "Defensa · Defensas en zona",
        playCategory: "Defensa zonal",
        meta: ["Defensa de media cancha", "Desde U17 (según reglamento)", "7 pizarras animadas", "Simulador interactivo", "3 ejercicios"],
        updated: "2026-11-26",
        tabs: {
            aprender: aprender,
            visualizar: ["alineacion", "circulacion", "trampa-esquina", "poste-alto", "penetracion", "atacar", "ejercicio-deslizamientos"],
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
