/*
 * Basket Lab Academy · Defensa zonal 2-3
 *
 * Contenido redactado en español por BasketIQ. Cada sección indica su origen
 * (fuente oficial, interpretación técnica, propuesta metodológica o variante de la app)
 * y las citas [S1]..[S5] remiten a la bibliografía del final, consultada directamente.
 *
 * Coordenadas de las pizarras: metros sobre la cancha FIBA (28 x 15). x = distancia a la
 * línea de fondo (aro en x = 1,575), y = posición a lo ancho (0 a 15). Vista de media
 * cancha con el aro arriba.
 */
(function (root, factory) {
    var article = factory();
    if (typeof module === "object" && module.exports) module.exports = article;
    if (root) {
        // Si academy.js todavía no cargó, queda en cola y se registra cuando cargue.
        if (root.BasketAcademy) root.BasketAcademy.register(article);
        else (root.BasketAcademyQueue = root.BasketAcademyQueue || []).push(article);
    }
})(typeof window !== "undefined" ? window : null, function () {
    "use strict";

    var VIEW = { court: "half", rotation: 90 };

    function D(label, x, y) { return { team: "defense", label: label, x: x, y: y }; }
    function O(label, x, y) { return { team: "offense", label: label, x: x, y: y }; }

    // Alineación base de la 2-3 (interpretación de BasketIQ de la alineación que recomienda WABC [S2]).
    var BASE = { x1: [6.3, 5.6], x2: [6.3, 9.4], x3: [2.3, 3.6], x4: [2.3, 11.4], x5: [2.0, 7.5] };
    function defense(posMap) {
        var p = posMap || BASE;
        return {
            x1: D("1", p.x1[0], p.x1[1]),
            x2: D("2", p.x2[0], p.x2[1]),
            x3: D("3", p.x3[0], p.x3[1]),
            x4: D("4", p.x4[0], p.x4[1]),
            x5: D("5", p.x5[0], p.x5[1])
        };
    }
    function merge(a, b) {
        var o = {};
        Object.keys(a).forEach(function (k) { o[k] = a[k]; });
        Object.keys(b).forEach(function (k) { o[k] = b[k]; });
        return o;
    }

    var PICKUP_LINE = { id: "pickup", x: 4.95, y: 0.15, w: 0.12, h: 14.7, color: "#eab308" };
    var PICKUP_TEXT = { id: "pickup_t", x: 4.6, y: 13.6, text: "Línea de recogida", size: "s", color: "#854d0e" };

    var boards = [
        {
            id: "alineacion",
            title: "Alineación inicial y áreas de responsabilidad",
            kind: "interpretation",
            refs: ["S2"],
            intro: "Dos defensores adelante y tres atrás. Cada uno es responsable de un área y de cualquier atacante que entre en ella [S3].",
            spec: {
                view: VIEW,
                players: merge(defense(), {
                    o1: O("1", 9.0, 7.5), o2: O("2", 6.6, 2.4), o3: O("3", 6.6, 12.6), o4: O("4", 1.0, 0.7), o5: O("5", 1.0, 14.3)
                }),
                phases: [
                    {
                        name: "Alineación 2-3",
                        note: "Los dos bases (X1, X2) cubren el frente de la zona; los aleros (X3, X4) los laterales y el fondo; el pívot (X5) el centro de la pintura. Las áreas son orientativas: se superponen y se ajustan con el balón.",
                        hide: ["o1", "o2", "o3", "o4", "o5"],
                        zones: [
                            { id: "a1", x: 4.6, y: 2.2, w: 4.6, h: 5.3, color: "#f97316" },
                            { id: "a2", x: 4.6, y: 7.5, w: 4.6, h: 5.3, color: "#f97316" },
                            { id: "a3", x: 0.1, y: 0.4, w: 4.4, h: 4.7, color: "#16a34a" },
                            { id: "a5", x: 0.1, y: 5.1, w: 4.4, h: 4.8, color: "#7c3aed" },
                            { id: "a4", x: 0.1, y: 9.9, w: 4.4, h: 4.7, color: "#16a34a" }
                        ]
                    },
                    {
                        name: "Frente a un ataque 1-2-2",
                        note: "Con el balón arriba, un base sale a presionarlo y el otro se cierra hacia el centro para proteger el poste alto. Atrás, los tres defensores mantienen la pintura cerrada.",
                        move: { x1: [7.6, 6.8], x2: [6.0, 8.9] },
                        ball: "o1",
                        zones: []
                    }
                ]
            },
            explain: [
                "La distancia entre los dos bases es el primer hueco que busca el ataque. Si se abren demasiado, el atacante penetra por el centro; si se cierran demasiado, quedan libres los tiros desde las alas.",
                "Esta alineación es la que el manual WABC sugiere enseñar primero entre las zonas porque tiene desplazamientos simples y comparte la estructura de cuatro jugadores por fuera con la defensa individual [S2]."
            ]
        },
        {
            id: "circulacion",
            title: "Desplazamientos colectivos: centro, ala, esquina y cambio de lado",
            kind: "interpretation",
            refs: ["S2"],
            intro: "Los cinco se mueven con cada pase, y lo hacen mientras el balón viaja, no cuando ya llegó [S2]. Seguí la línea de recogida (amarilla): por encima toma el balón un base; por debajo, un alero.",
            spec: {
                view: VIEW,
                players: merge(defense({ x1: [7.6, 6.8], x2: [6.0, 8.9], x3: [2.4, 3.6], x4: [2.4, 11.4], x5: [2.0, 7.5] }), {
                    o1: O("1", 9.0, 7.5), o2: O("2", 6.6, 2.4), o3: O("3", 6.6, 12.6), o4: O("4", 1.0, 0.7), o5: O("5", 1.0, 14.3)
                }),
                phases: [
                    {
                        name: "Balón arriba",
                        note: "X1 presiona al balón, X2 protege el poste alto. Sale el pase al ala.",
                        ball: "o1",
                        zones: [PICKUP_LINE],
                        texts: [PICKUP_TEXT],
                        strokes: [
                            ["pass", "o1", "o2"],
                            ["rotation", "x1", [6.9, 3.4], -0.6],
                            ["move", "x2", [5.6, 6.6]],
                            ["move", "x3", [2.4, 2.6]],
                            ["move", "x5", [2.0, 5.8]],
                            ["move", "x4", [2.6, 8.8]]
                        ]
                    },
                    {
                        name: "Balón en el ala (por encima de la línea)",
                        note: "El ala está por encima de la línea de recogida: lo toma el base X1. X2 se cierra al poste alto, X3 se acerca a la esquina, X5 se corre al poste bajo del lado del balón y X4 entra a la pintura desde el lado débil.",
                        strokes: [
                            ["pass", "o2", "o4"],
                            ["rotation", "x3", [1.7, 1.6]],
                            ["move", "x1", [5.0, 3.0]],
                            ["move", "x2", [4.7, 6.4]],
                            ["move", "x5", [1.5, 3.9]],
                            ["move", "x4", [2.0, 7.4]]
                        ]
                    },
                    {
                        name: "Balón en la esquina (por debajo de la línea)",
                        note: "La esquina queda por debajo de la línea: la toma el alero X3. X5 defiende el poste bajo del lado del balón, X1 baja para cortar el pase de vuelta y el lado débil queda hundido cerca del aro.",
                        strokes: [
                            ["pass", "o4", "o2"],
                            ["rotation", "x1", [6.9, 3.4]],
                            ["move", "x3", [2.4, 2.8]],
                            ["move", "x5", [2.0, 5.8]],
                            ["move", "x2", [5.6, 6.6]],
                            ["move", "x4", [2.6, 8.8]]
                        ]
                    },
                    {
                        name: "Vuelta al ala",
                        note: "Al volver el balón, cada uno recupera su lugar. X1 cierra de nuevo sobre el ala con los brazos arriba.",
                        strokes: [
                            ["pass", "o2", "o1"],
                            ["rotation", "x2", [7.6, 8.2]],
                            ["move", "x1", [6.0, 5.8]],
                            ["move", "x3", [2.4, 3.6]],
                            ["move", "x5", [2.0, 7.5]],
                            ["move", "x4", [2.4, 11.4]]
                        ]
                    },
                    {
                        name: "Inversión al centro",
                        note: "Con la inversión, el base del lado al que va el balón (X2) toma al poseedor. Los bases pueden intercambiar lados; lo importante es que ninguno de los dos se quede mirando.",
                        strokes: [
                            ["pass", "o1", "o3"],
                            ["rotation", "x2", [6.9, 11.6], 0.6],
                            ["move", "x1", [5.6, 8.4]],
                            ["move", "x4", [2.4, 12.4]],
                            ["move", "x5", [2.0, 9.2]],
                            ["move", "x3", [2.6, 6.2]]
                        ]
                    },
                    {
                        name: "Ala contraria",
                        note: "La zona quedó espejada respecto del primer pase al ala. Así se ve el desplazamiento colectivo: cinco jugadores que se corren juntos, como un bloque."
                    }
                ]
            }
        },
        {
            id: "poste-alto-a",
            title: "Poste alto · Variante A: los bases cierran y el pívot protege el aro",
            kind: "interpretation",
            refs: ["S2"],
            intro: "El pase al poste alto se presiona desde los bases, con al menos un brazo por delante del atacante [S2]. El pívot no sale de la zona del aro.",
            spec: {
                view: VIEW,
                players: merge(defense({ x1: [7.6, 6.8], x2: [6.1, 8.9], x3: [2.4, 3.8], x4: [2.4, 11.2], x5: [2.0, 7.6] }), {
                    o1: O("1", 9.0, 7.5), o2: O("2", 6.6, 2.4), o3: O("3", 6.6, 12.6), o4: O("4", 1.0, 3.2), o5: O("5", 1.8, 9.6)
                }),
                phases: [
                    {
                        name: "Corte al poste alto",
                        note: "El 5 sube desde el poste bajo hacia la línea de libres. X2 se cierra sobre su camino con el brazo delante.",
                        ball: "o1",
                        strokes: [
                            ["cut", "o5", [5.4, 7.5], 0.5],
                            ["move", "x2", [6.2, 8.0]]
                        ]
                    },
                    {
                        name: "El balón entra igual",
                        note: "Si el pase llega, X1 y X2 se cierran sobre el poste desde arriba, X3 y X4 se hunden hacia los postes bajos y X5 se queda entre el balón y el aro.",
                        strokes: [
                            ["pass", "o1", "o5"],
                            ["move", "x1", [6.3, 6.6]],
                            ["move", "x2", [6.3, 8.5]],
                            ["move", "x3", [2.0, 4.6]],
                            ["move", "x4", [2.0, 10.4]],
                            ["move", "x5", [2.6, 7.5]]
                        ]
                    },
                    {
                        name: "Poste con balón",
                        note: "El aro queda protegido, pero los tiradores de las alas tienen más tiempo: los bases deben estar listos para salir a cerrar si el balón vuelve afuera."
                    }
                ]
            }
        },
        {
            id: "poste-alto-b",
            title: "Poste alto · Variante B: el pívot sube a defender",
            kind: "variant",
            intro: "Otra forma habitual de resolver la misma situación. No es mejor ni peor que la variante A: cambia qué espacio se protege y cuál se concede.",
            spec: {
                view: VIEW,
                players: merge(defense({ x1: [7.6, 6.8], x2: [6.2, 8.0], x3: [2.4, 3.8], x4: [2.4, 11.2], x5: [2.0, 7.6] }), {
                    o1: O("1", 9.0, 7.5), o2: O("2", 6.6, 2.4), o3: O("3", 6.6, 12.6), o4: O("4", 1.0, 3.2), o5: O("5", 5.4, 7.5)
                }),
                phases: [
                    {
                        name: "Pase al poste alto",
                        note: "El balón entra al 5 en la línea de libres.",
                        ball: "o1",
                        strokes: [
                            ["pass", "o1", "o5"],
                            ["rotation", "x5", [4.4, 7.5]],
                            ["move", "x3", [1.9, 5.8]],
                            ["move", "x4", [1.9, 9.2]],
                            ["move", "x1", [6.8, 4.4]],
                            ["move", "x2", [6.8, 10.6]]
                        ]
                    },
                    {
                        name: "El pívot sale, los aleros cierran el aro",
                        note: "X5 sube a contener al poste; X3 y X4 se juntan delante del aro; los bases se abren para cortar los pases a las alas. El espacio que queda más expuesto es el fondo: esquinas y corte por la línea final (ver al 4)."
                    }
                ]
            },
            explain: [
                "Cuándo puede convenir: si el rival tiene un poste alto que tira o pasa muy bien y tiradores de esquina flojos.",
                "Riesgo: un atacante que corta por la línea de fondo detrás de X3 o X4 queda solo cerca del aro. Elegí la variante según el rival, no por costumbre."
            ]
        },
        {
            id: "poste-bajo-rebote",
            title: "Poste bajo y rebote defensivo",
            kind: "interpretation",
            refs: ["S2"],
            intro: "El pase al poste bajo del lado del balón se niega y el poste se juega por delante; con el tiro, todos buscan a quién bloquear [S2].",
            spec: {
                view: VIEW,
                players: merge(defense({ x1: [6.9, 3.4], x2: [5.6, 6.6], x3: [2.4, 2.6], x4: [2.2, 8.8], x5: [2.0, 5.8] }), {
                    o1: O("1", 9.0, 7.5), o2: O("2", 6.6, 2.4), o3: O("3", 6.6, 12.6), o4: O("4", 1.9, 4.4), o5: O("5", 1.9, 10.4)
                }),
                phases: [
                    {
                        name: "Balón en el ala, poste bajo ocupado",
                        note: "X5 se adelanta al poste (lo juega por delante) y X4, desde el lado débil, queda listo para ayudar si sale un pase bombeado por arriba.",
                        ball: "o2",
                        strokes: [
                            ["move", "x5", [2.7, 4.2]],
                            ["move", "x4", [1.5, 6.4]],
                            ["move", "x3", [2.8, 2.6]]
                        ]
                    },
                    {
                        name: "Tiro desde el ala",
                        note: "Con el tiro, cada defensor busca al atacante más cercano y se interpone entre él y el aro.",
                        strokes: [
                            ["shot", "o2", [1.9, 7.5]],
                            ["cut", "o3", [3.6, 11.0]],
                            ["move", "x5", [1.7, 5.3]],
                            ["move", "x4", [1.8, 9.5]],
                            ["move", "x2", [3.4, 10.0]],
                            ["move", "x1", [5.8, 3.1]],
                            ["move", "x3", [3.2, 7.5]]
                        ]
                    },
                    {
                        name: "Bloqueo de rebote",
                        note: "X5 bloquea al 4, X4 al 5, X2 al 3 que entra desde el lado débil, X1 al tirador y X3 queda en el centro para el rebote largo. La zona no tiene marcas fijas: hay que encontrar a alguien en cada tiro."
                    }
                ]
            },
            explain: [
                "El rebote es uno de los puntos débiles conocidos de cualquier zona: como nadie empieza pegado a un atacante, los que entran desde el lado débil llegan sin oposición si la defensa no los busca."
            ]
        },
        {
            id: "penetracion",
            title: "Ayudas y recuperaciones ante una penetración",
            kind: "interpretation",
            refs: ["S2"],
            intro: "Ante la penetración rota el defensor más cercano [S2]. Detrás, alguien tiene que ayudar al que ayudó.",
            spec: {
                view: VIEW,
                players: merge(defense({ x1: [6.9, 3.4], x2: [5.6, 6.6], x3: [2.4, 2.6], x4: [2.6, 8.8], x5: [2.0, 5.8] }), {
                    o1: O("1", 9.0, 7.5), o2: O("2", 6.6, 2.4), o3: O("3", 6.6, 12.6), o4: O("4", 1.0, 0.7), o5: O("5", 1.0, 14.3)
                }),
                phases: [
                    {
                        name: "Penetración desde el ala",
                        note: "El 2 ataca el hueco entre X1 y X3.",
                        ball: "o2",
                        strokes: [
                            ["dribble", "o2", [3.9, 4.7]],
                            ["move", "x3", [2.9, 3.7]],
                            ["move", "x1", [5.0, 3.9]],
                            ["move", "x5", [2.0, 5.2]],
                            ["move", "x4", [2.0, 8.0]],
                            ["move", "x2", [4.6, 7.6]]
                        ]
                    },
                    {
                        name: "Ayuda y pase a la esquina",
                        note: "X3 frenó la penetración y X1 cerró desde arriba. El 2 descarga a la esquina, que quedó libre.",
                        strokes: [
                            ["pass", "o2", "o4"],
                            ["rotation", "x3", [1.7, 1.6]],
                            ["move", "x1", [4.9, 4.4]],
                            ["move", "x5", [2.2, 5.2]]
                        ]
                    },
                    {
                        name: "Recuperación",
                        note: "X3 recupera sobre la esquina con pasos cortos y brazos arriba; X5 vuelve al poste bajo y X1 se queda con el 2 hasta que salga. Si X3 no llega, el siguiente defensor rota y se avisa en voz alta."
                    }
                ]
            }
        },
        {
            id: "atacar",
            title: "Espacios vulnerables y cómo se ataca la 2-3",
            kind: "interpretation",
            refs: ["S2", "S5"],
            intro: "Dónde suele sufrir la 2-3 y una secuencia típica para atacarla: fijar a dos defensores con el dribbling en el hueco y pasar al espacio que queda.",
            spec: {
                view: VIEW,
                players: merge(defense({ x1: [6.6, 5.8], x2: [6.6, 9.2], x3: [2.4, 3.6], x4: [2.4, 11.4], x5: [2.0, 7.5] }), {
                    o1: O("1", 9.0, 7.5), o2: O("2", 6.6, 2.4), o3: O("3", 6.6, 12.6), o4: O("4", 1.0, 3.0), o5: O("5", 1.8, 10.2)
                }),
                phases: [
                    {
                        name: "Espacios vulnerables",
                        note: "El centro entre los dos bases, el poste alto, los huecos entre base y alero en cada ala y la zona del fondo detrás de los aleros.",
                        ball: "o1",
                        zones: [
                            { id: "g1", x: 7.2, y: 6.7, w: 2.0, h: 1.6, color: "#dc2626" },
                            { id: "g2", x: 4.7, y: 6.6, w: 1.7, h: 1.8, color: "#dc2626" },
                            { id: "g3", x: 4.0, y: 2.2, w: 1.8, h: 1.8, color: "#dc2626" },
                            { id: "g4", x: 4.0, y: 11.0, w: 1.8, h: 1.8, color: "#dc2626" },
                            { id: "g5", x: 0.1, y: 1.6, w: 1.6, h: 2.6, color: "#dc2626" },
                            { id: "g6", x: 0.1, y: 10.8, w: 1.6, h: 2.6, color: "#dc2626" }
                        ],
                        texts: [
                            { id: "l1", x: 8.2, y: 7.5, text: "Centro" },
                            { id: "l2", x: 5.55, y: 7.5, text: "Poste alto" },
                            { id: "l3", x: 4.9, y: 3.1, text: "Hueco" },
                            { id: "l4", x: 4.9, y: 11.9, text: "Hueco" },
                            { id: "l5", x: 0.9, y: 2.9, text: "Fondo" },
                            { id: "l6", x: 0.9, y: 12.1, text: "Fondo" }
                        ]
                    },
                    {
                        name: "Dribbling al hueco central",
                        note: "El 1 penetra entre los dos bases (dribbling al hueco). Si los dos salen a frenarlo, alguien queda libre.",
                        zones: [],
                        texts: [],
                        strokes: [
                            ["dribble", "o1", [7.6, 7.5]],
                            ["move", "x1", [7.0, 6.8]],
                            ["move", "x2", [7.0, 8.2]],
                            ["cut", "o5", [5.3, 7.9], -0.4]
                        ]
                    },
                    {
                        name: "Pase al poste alto",
                        note: "Con los dos bases fijados, el 5 recibe en la línea de libres de frente al aro. Desde ahí puede tirar, pasar al 4 que está en el fondo o abrir al ala.",
                        strokes: [
                            ["pass", "o1", "o5"],
                            ["move", "x5", [3.6, 7.6]],
                            ["move", "o4", [1.2, 4.8]]
                        ]
                    },
                    {
                        name: "Ventaja creada",
                        note: "Si X5 sube a defender al poste, el 4 queda solo cerca del aro. Si no sube, el 5 tira de media distancia sin oposición."
                    }
                ]
            },
            explain: [
                "Un ataque con un solo jugador arriba (frente impar) obliga a los dos bases a decidir quién lo toma. El dribbling al hueco y el dribbling que fija a un defensor son recursos que el manual de entrenadores FIBA-WABC describe como especialmente eficaces contra las zonas [S5].",
                "Otras formas de atacarla: invertir el balón rápido, pases por encima de la zona (de ala a ala), sobrecargar un lado, cortes desde el lado débil y tiradores en las esquinas. En la pestaña **Simular** podés ver cómo responde la zona cuando el balón llega a cada uno de esos lugares."
            ]
        },
        {
            id: "ejercicio-linea",
            title: "Ejercicio: 4 contra 5 con línea de recogida",
            kind: "interpretation",
            refs: ["S2"],
            intro: "Representación del ejercicio que propone WABC para entrenar la línea de recogida [S2]. Por encima de la línea defiende un base; por debajo, un alero.",
            spec: {
                view: VIEW,
                players: merge(defense({ x1: [7.4, 6.2], x2: [6.4, 9.2], x3: [2.4, 3.6], x4: [2.4, 11.4], x5: [2.0, 7.5] }), {
                    o1: O("1", 8.8, 5.6), o2: O("2", 8.8, 9.4), o3: O("3", 6.6, 2.4), o4: O("4", 1.0, 0.7)
                }),
                phases: [
                    {
                        name: "Pase al ala, encima de la línea",
                        note: "El balón va al ala: sale el base X1.",
                        ball: "o1",
                        zones: [PICKUP_LINE],
                        texts: [PICKUP_TEXT],
                        strokes: [
                            ["pass", "o1", "o3"],
                            ["rotation", "x1", [6.9, 3.4]],
                            ["move", "x2", [5.6, 6.8]],
                            ["move", "x3", [2.4, 2.6]],
                            ["move", "x5", [2.0, 5.8]],
                            ["move", "x4", [2.6, 8.8]]
                        ]
                    },
                    {
                        name: "Pase a la esquina, debajo de la línea",
                        note: "El balón baja a la esquina: sale el alero X3 y X1 vuelve a proteger el pase de regreso.",
                        strokes: [
                            ["pass", "o3", "o4"],
                            ["rotation", "x3", [1.7, 1.6]],
                            ["move", "x1", [5.0, 3.0]],
                            ["move", "x5", [1.5, 3.9]],
                            ["move", "x2", [4.7, 6.4]],
                            ["move", "x4", [2.0, 7.4]]
                        ]
                    },
                    {
                        name: "Regreso al ala",
                        note: "El balón vuelve arriba de la línea y vuelve a tomarlo X1. Se repite hasta completar los pases pedidos.",
                        strokes: [
                            ["pass", "o4", "o3"],
                            ["rotation", "x1", [6.9, 3.4]],
                            ["move", "x3", [2.4, 2.8]],
                            ["move", "x5", [2.0, 5.8]],
                            ["move", "x2", [5.6, 6.8]],
                            ["move", "x4", [2.6, 8.8]]
                        ]
                    },
                    { name: "Ciclo completo", note: "Mismo esquema en el otro lado con X2 y X4." }
                ]
            }
        },
        {
            id: "ejercicio-espejo",
            title: "Ejercicio: zona espejo con cuatro pasadores",
            kind: "method",
            intro: "Cuatro pasadores fijos alrededor del perímetro y cinco defensores que se desplazan juntos con cada pase.",
            spec: {
                view: VIEW,
                players: merge(defense({ x1: [7.6, 6.8], x2: [6.0, 8.9], x3: [2.4, 3.6], x4: [2.4, 11.4], x5: [2.0, 7.5] }), {
                    o1: O("A", 9.0, 7.5), o2: O("B", 6.6, 2.4), o4: O("C", 1.0, 0.7), o3: O("D", 6.6, 12.6)
                }),
                phases: [
                    {
                        name: "Pase de A a B",
                        note: "Los pasadores no tiran ni penetran: solo pasan, con una pausa de dos segundos en cada recepción.",
                        ball: "o1",
                        strokes: [
                            ["pass", "o1", "o2"],
                            ["rotation", "x1", [6.9, 3.4]],
                            ["move", "x2", [5.6, 6.6]],
                            ["move", "x3", [2.4, 2.6]],
                            ["move", "x5", [2.0, 5.8]],
                            ["move", "x4", [2.6, 8.8]]
                        ]
                    },
                    {
                        name: "Pase de B a C",
                        strokes: [
                            ["pass", "o2", "o4"],
                            ["rotation", "x3", [1.7, 1.6]],
                            ["move", "x1", [5.0, 3.0]],
                            ["move", "x2", [4.7, 6.4]],
                            ["move", "x5", [1.5, 3.9]],
                            ["move", "x4", [2.0, 7.4]]
                        ]
                    },
                    {
                        name: "Pase de C a A (pase largo)",
                        note: "El pase largo obliga a que todos corran mientras el balón está en el aire.",
                        strokes: [
                            ["pass", "o4", "o1"],
                            ["rotation", "x1", [7.6, 6.8]],
                            ["move", "x2", [6.0, 8.9]],
                            ["move", "x3", [2.4, 3.6]],
                            ["move", "x5", [2.0, 7.5]],
                            ["move", "x4", [2.4, 11.4]]
                        ]
                    },
                    { name: "De vuelta al inicio", note: "Se sigue hacia D y luego en cualquier orden que elija el entrenador." }
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
            used: "Medidas de la cancha que usan las pizarras (arco de 3 puntos a 6,75 m, semicírculo de no carga de 1,30 m, zona restringida) y la regla de 3 segundos, que se aplica al atacante.",
            accessed: "26/11/2026"
        },
        {
            id: "S2",
            title: "WABC Coaches Manual Level 2 · 1.3.3 Half court zone defence",
            publisher: "FIBA · World Association of Basketball Coaches (WABC)",
            locator: "Nivel 2, Team, 1 Defensive tactics and strategies, 1.3 Zone defences",
            url: "https://wabc.fiba.com/manual/level-2/l2-team/1-defensive-tactics-and-strategies/1-3-zone-defences/1-3-3-half-court-zone-defence/",
            used: "Por qué enseñar primero una alineación 2-1-2 o 2-3, la línea de recogida, las preguntas que el entrenador debe responder, los principios de la zona, la defensa del poste alto y bajo, las penetraciones y el ejercicio 4 contra 5.",
            accessed: "26/11/2026"
        },
        {
            id: "S3",
            title: "WABC Coaches Manual Level 2 · 2.4.4 Proving an opponent is playing zone defence",
            publisher: "FIBA · WABC",
            locator: "Nivel 2, Team, 2 Offensive tactics and strategies, 2.4 Offence against zone defence (leído en el espejo wabc-chn.fiba.com, mismo contenido)",
            url: "https://wabc-chn.fiba.com/manual/level-2/l2-team/2-offensive-tactics-and-strategies/2-4-offence-against-zone-defence/2-4-4-proving-an-opponent-is-playing-zone-defence/",
            used: "Definición de defensa zonal, la recomendación de no permitir zonas hasta los 15 años y cómo comprobar en un partido formativo si el rival está defendiendo en zona.",
            accessed: "26/11/2026"
        },
        {
            id: "S4",
            title: "WABC Mini-Basketball Manual · 5.2 Modified rules in competitions",
            publisher: "FIBA · WABC",
            locator: "Mini-Basketball, 5 Modified rules",
            url: "https://wabc.fiba.com/manual/mini-basketball/mb-5-modified-rules/mb-5-2-modified-rules-in-competitions/",
            used: "Entre las reglas modificadas opcionales para competencias de minibásquet: no permitir la defensa zonal hasta la categoría U16.",
            accessed: "26/11/2026"
        },
        {
            id: "S5",
            title: "FIBA-WABC Coaches Manual (glosario)",
            publisher: "FIBA · WABC",
            locator: "Glosario, págs. 22 y 24: «Freeze Dribble» y «Gap Dribble»",
            url: "https://assets.fiba.basketball/image/upload/documents-corporate-wabc-coaches-manual-eng.pdf",
            used: "El dribbling que fija a un defensor y el dribbling al hueco entre dos defensores, descritos como recursos eficaces contra defensas zonales.",
            accessed: "26/11/2026"
        }
    ];

    var unavailableSources = [
        {
            title: "WABC Coaches Manual Level 2 · 1.3 Zone defences (índice y demás subsecciones)",
            url: "https://wabc.fiba.com/manual/level-2/l2-team/1-defensive-tactics-and-strategies/1-3-zone-defences/",
            reason: "El sitio no respondió a la consulta automática. Solo pudimos leer la subsección 1.3.3, que es la que se cita."
        },
        {
            title: "WABC Coaches Manual Level 2 y 3 · 2.4 Offence against zone defence (demás subsecciones)",
            url: "https://wabc.fiba.com/manual/level-2/l2-team/2-offensive-tactics-and-strategies/2-4-offence-against-zone-defence/",
            reason: "No se pudieron abrir. Solo se leyó la 2.4.4 en el espejo oficial. Lo que decimos sobre cómo atacar la zona, fuera de lo citado, es interpretación técnica de BasketIQ."
        },
        {
            title: "WABC Coaches Manual Level 1",
            url: "https://wabc.fiba.com/manual/level-1/",
            reason: "No se pudo abrir al redactar este contenido."
        },
        {
            title: "Mini-Basketball Coaches Manual (PDF, FIBA-WABC 2016), pág. 36",
            url: "https://assets.fiba.basketball/image/upload/documents-corporate-wabc-coaching-manual-mini-basketball-eng.pdf",
            reason: "Solo accedimos a un resumen automático del documento, no al texto completo, así que no citamos sus razones para limitar la zona en minibásquet."
        }
    ];

    var aprender = [
        {
            id: "introduccion",
            number: "1",
            title: "Introducción",
            kind: "interpretation",
            blocks: [
                { p: "La zona 2-3 es probablemente la defensa zonal más conocida. Pone dos defensores al frente y tres cerca del aro, y su prioridad es proteger la pintura: obliga al rival a pasar el balón alrededor y, muchas veces, a tirar desde lejos." },
                { p: "Esta guía explica cómo se organiza, qué hace cada jugador según dónde está el balón, cuáles son sus puntos débiles, cómo se entrena y cuándo tiene sentido usarla. Las situaciones se pueden ver animadas en **Visualizar** y abrir en tu pizarra táctica para modificarlas." },
                { p: "**Cómo está organizado:** los apartados 1 a 13, 15 y las variantes están en esta pestaña; los ejercicios (14) en **Entrenar**; los criterios de evaluación (16) en **Evaluar**; las pizarras explicativas (17) aparecen dentro del texto y todas juntas en **Visualizar**; y la bibliografía (18) en **Fuentes**." },
                {
                    callout: "Las rotaciones que se muestran son una forma de jugar la 2-3, no la única. Cada entrenador ajusta quién toma el balón, quién ayuda y qué espacio concede según su equipo y el rival. Donde existen alternativas habituales, las mostramos como variantes.",
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
            refs: ["S3", "S2"],
            blocks: [
                { p: "El manual de entrenadores WABC define la defensa zonal como una defensa de equipo en la que cada jugador es responsable de defender un área de la cancha y a cualquier atacante que esté en esa área, y señala que está pensada sobre todo para proteger la zona cercana al aro [S3]." },
                { p: "En la **2-3**, los cinco defensores se alinean en dos líneas: dos adelante, a la altura aproximada de la línea de libres, y tres atrás, cerca del aro. Es una alineación de frente par (dos jugadores arriba), a diferencia de la 1-3-1 o la 1-2-2." },
                { p: "WABC sugiere que, si se va a enseñar una zona, se empiece por una alineación 2-1-2 o 2-3, porque es simple, tiene desplazamientos fáciles y comparte con la defensa individual la estructura de cuatro jugadores por fuera [S2]." },
                {
                    callout: "Que sea una zona no significa que requiera menos esfuerzo. El manual WABC lo aclara expresamente: la zona exige el mismo trabajo y la misma comunicación que la defensa individual [S2].",
                    tone: "warn"
                }
            ]
        },
        {
            id: "objetivos",
            number: "3",
            title: "Objetivos",
            kind: "interpretation",
            refs: ["S3"],
            blocks: [
                {
                    list: [
                        "**Proteger el aro y la pintura**, que es la razón de ser de la defensa zonal [S3].",
                        "**Reducir las penetraciones** y los pases al poste: obligar a que el balón circule por fuera.",
                        "**Llevar al rival a tiros exteriores** contestados, en lugar de tiros cerca del aro.",
                        "**Ocultar desventajas individuales**: un defensor lento o con faltas queda en un área en lugar de tener que seguir a un atacante rápido.",
                        "**Cambiar el ritmo del partido** y obligar al rival a usar un ataque distinto del que venía usando."
                    ]
                }
            ]
        },
        {
            id: "principios",
            number: "4",
            title: "Principios",
            kind: "official",
            refs: ["S2"],
            blocks: [
                { p: "Estos son los principios que el manual WABC plantea para la defensa zonal, en redacción propia [S2]:" },
                {
                    list: [
                        "**Anticipar el próximo pase** y empezar a moverse cuando el balón sale de las manos del pasador, no cuando llega.",
                        "**Ver el balón y la propia responsabilidad** al mismo tiempo.",
                        "**Brazos arriba y activos** para cerrar líneas de pase.",
                        "**Comunicar**: la zona solo falla de verdad si alguien no avisa a sus compañeros de lo que va a hacer.",
                        "**Rebote**: con cada tiro, todos buscan a alguien para bloquear.",
                        "**El más cercano toma el balón**, y el poste bajo del lado del balón se defiende por delante."
                    ]
                },
                { p: "El manual también propone que, antes de jugarla, el entrenador defina con claridad: quién defiende al balón, quién frena la penetración, si se ayuda y recupera o se ayuda y se queda, quién ayuda al que ayudó, quién corta los pases a la pintura y quién bloquea a quién en el rebote [S2]." }
            ]
        },
        {
            id: "explicacion",
            number: "5",
            title: "Explicación detallada",
            kind: "interpretation",
            refs: ["S2"],
            blocks: [
                { h: "5.1 Posicionamiento inicial" },
                { p: "Los bases (X1 y X2) se ubican cerca de los codos de la zona, un poco por encima de la línea de libres. Los aleros (X3 y X4) a los costados de la pintura, aproximadamente a la altura de los postes bajos. El pívot (X5) en el centro, delante del aro. Todos con los brazos arriba y de frente al balón." },
                { board: "alineacion" },
                { h: "5.2 La línea de recogida" },
                { p: "WABC usa una línea imaginaria, la *pick up line* (línea de recogida), para decidir quién sale al balón en el perímetro: si el balón está por encima de la línea, lo toma un base; si está por debajo, un alero. Cuando el balón se invierte, los de adelante toman al poseedor y pueden intercambiar lados [S2]." },
                { p: "La ubicación exacta de la línea la define el entrenador. En las pizarras de BasketIQ la dibujamos un poco por debajo de la línea de libres, de modo que el ala quede por encima y la esquina por debajo." },
                { h: "5.3 Desplazamientos colectivos" },
                { p: "Los cinco se mueven como un bloque hacia el lado del balón. Con el pase al ala, el base de ese lado sale a cerrar, el otro base se cierra hacia el poste alto, el alero del lado del balón se acerca a la esquina, el pívot se corre al poste bajo de ese lado y el alero del lado débil entra a la pintura [S2]." },
                { board: "circulacion" },
                { h: "5.4 Rotaciones" },
                { p: "Una rotación es el cambio de responsabilidad cuando un defensor sale de su área. La más frecuente en la 2-3 es la del balón que baja a la esquina: el alero sale a tomarlo, el pívot ocupa el poste bajo que dejó el alero y el base de ese lado baja a cortar el pase de vuelta. En el lado débil, el otro alero se hunde y queda como último defensor cerca del aro." },
                { h: "5.5 Defensa del poste alto" },
                { p: "El pase al poste alto es uno de los más peligrosos porque el receptor queda en el centro, de frente al aro. WABC propone presionarlo desde los bases con al menos un brazo por delante del atacante [S2]. Si el balón entra, hay dos respuestas habituales, que conviene no mezclar:" },
                {
                    table: {
                        caption: "Dos formas de defender el balón en el poste alto",
                        head: ["", "Variante A: cierran los bases", "Variante B: sube el pívot"],
                        rows: [
                            ["Quién contiene al poste", "X1 y X2, desde arriba", "X5, que sale de abajo del aro"],
                            ["Quién protege el aro", "X5", "X3 y X4, que se juntan delante del aro"],
                            ["Espacio que se concede", "Tiro de las alas si el balón sale rápido", "Fondo y cortes por la línea final"],
                            ["Conviene contra", "Postes altos que penetran", "Postes altos que tiran de media distancia"],
                            ["Origen", "Basada en el principio de WABC [S2]", "Variante de la app"]
                        ]
                    }
                },
                { board: "poste-alto-a" },
                { board: "poste-alto-b" },
                { h: "5.6 Defensa del poste bajo" },
                { p: "El pase al poste bajo del lado del balón se niega. WABC indica que lo corta el alero (X3) y que el poste del lado del balón se juega por delante [S2]. Quien juega por delante necesita ayuda por detrás para el pase bombeado: la da el defensor del lado débil." },
                { h: "5.7 Esquinas" },
                { p: "La esquina es el punto donde la 2-3 tiene que recorrer más distancia. Desde la esquina, el alero que sale deja libre el poste bajo, y por eso el pívot tiene que correrse a tiempo. Si el rival tiene un buen tirador de esquina, la salida tiene que empezar con el pase, no con la recepción." },
                { h: "5.8 Cambios de lado" },
                { p: "La inversión del balón (de un ala a la otra pasando por arriba, o con un pase largo) es la prueba más dura para la zona: los cinco tienen que cruzar la cancha. Por eso el principio de moverse con el balón en el aire es tan importante [S2]." },
                { h: "5.9 Ayudas y recuperaciones" },
                { p: "Ante una penetración, rota el defensor más cercano [S2]. El que ayuda deja a alguien libre, y un segundo defensor tiene que *ayudar al que ayudó*. La recuperación debe ser con pasos cortos al final y brazos arriba, para no regalar la penetración siguiente." },
                { board: "penetracion" },
                { h: "5.10 Rebote" },
                { p: "En la zona nadie empieza pegado a un atacante, así que el rebote necesita una regla clara. La de WABC es simple: con el tiro, cada uno encuentra a alguien para bloquear, y el más cercano al tirador lo bloquea a él [S2]." },
                { board: "poste-bajo-rebote" }
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
                        caption: "Responsabilidades por puesto (orientativas)",
                        head: ["Jugador", "Balón arriba", "Balón en el ala", "Balón en la esquina", "Con el tiro"],
                        rows: [
                            ["X1 / X2 (bases)", "Uno presiona al balón, el otro protege el poste alto", "El del lado del balón sale a cerrar; el otro se cierra al poste alto", "El del lado del balón baja a cortar el pase de vuelta", "Bloquean al tirador o a los que entran por arriba; rebote largo"],
                            ["X3 / X4 (aleros)", "A los costados de la pintura, atentos a los cortes", "El del lado del balón se acerca a la esquina; el del lado débil entra a la pintura", "El del lado del balón sale a la esquina; el del lado débil queda cerca del aro", "Bloquean a los que entran desde los costados"],
                            ["X5 (pívot)", "Centro de la pintura, delante del aro", "Se corre al poste bajo del lado del balón", "Defiende el poste bajo del lado del balón", "Bloquea al pívot rival"]
                        ]
                    }
                },
                { p: "La tabla refleja la versión de la 2-3 que usamos en las pizarras. En equipos en los que el alero no llega a la esquina, algunos entrenadores mandan al base del lado del balón a cubrirla; es una variante válida que cambia quién protege el pase de vuelta." }
            ]
        },
        {
            id: "aplicacion",
            number: "7",
            title: "Aplicación en situaciones reales",
            kind: "interpretation",
            blocks: [
                { p: "Situaciones en las que la 2-3 suele tener sentido:" },
                {
                    list: [
                        "El rival tiene buenos penetradores o un pívot dominante y tira poco desde afuera.",
                        "Tu equipo tiene jugadores altos que protegen bien el aro pero sufren contra atacantes rápidos en el uno contra uno.",
                        "Algún jugador importante está cargado de faltas y necesitás protegerlo.",
                        "Querés cambiar el ritmo durante unas posesiones, por ejemplo después de un tiempo muerto o tras un tiro libre, cuando la defensa puede ordenarse."
                    ]
                },
                { p: "Situaciones en las que suele costar:" },
                {
                    list: [
                        "Rival con varios tiradores exteriores confiables, sobre todo en las esquinas.",
                        "Rival con un poste alto que pasa bien y decide rápido.",
                        "Cuando el equipo no se comunica o llega cansado: la zona depende de que los cinco se muevan juntos."
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
            refs: ["S3"],
            blocks: [
                {
                    list: [
                        "Protege la zona cercana al aro, que es para lo que está pensada [S3].",
                        "Mantiene a los jugadores altos cerca del aro y del rebote.",
                        "Reduce las penetraciones y los pases al poste bajo.",
                        "Es relativamente simple de aprender, con desplazamientos claros [S2].",
                        "Ahorra desplazamientos largos de persecución a jugadores con menos velocidad lateral."
                    ]
                }
            ]
        },
        {
            id: "limitaciones",
            number: "9",
            title: "Limitaciones y riesgos",
            kind: "interpretation",
            blocks: [
                {
                    list: [
                        "**Alas y esquinas**: el frente con dos jugadores deja espacio en las alas y la esquina obliga al alero a recorrer mucha distancia.",
                        "**Poste alto**: un atacante de frente al aro en la línea de libres pone en duda a toda la zona.",
                        "**Rebote**: si nadie busca a quién bloquear, los que entran desde el lado débil llegan solos.",
                        "**Cambios de lado rápidos** y pases por encima de la zona.",
                        "**Riesgo formativo**: en edades tempranas puede ocultar problemas de defensa individual y limitar el desarrollo del ataque del rival (ver sección 15)."
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
                        "Moverse cuando el balón ya llegó, en lugar de hacerlo durante el pase [S2].",
                        "Bajar los brazos y dejar abiertas las líneas de pase.",
                        "Los dos bases salen al mismo atacante y dejan libre el centro o un ala.",
                        "El alero sale a la esquina y nadie ocupa el poste bajo que dejó.",
                        "Ningún defensor sale al tirador de la esquina por no saber a quién le tocaba.",
                        "No hablar: dos defensores esperan que el otro salga.",
                        "Mirar solo el balón y perder al atacante que corta por detrás.",
                        "Con el tiro, quedarse mirando el aro en vez de buscar a quién bloquear.",
                        "Recuperar corriendo de frente sin frenar, y regalar una penetración."
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
                            ["Llega tarde al balón", "Empezar a moverse con el balón en el aire", "«¡Con el pase!»"],
                            ["Brazos abajo", "Manos a la altura de los hombros, activas", "«¡Manos arriba!»"],
                            ["Dos sobre el mismo atacante", "Aplicar la línea de recogida y avisar quién sale", "«¡Mío!» / «¡Tuyo!»"],
                            ["Poste bajo libre al salir el alero", "El pívot se corre con el pase a la esquina", "«¡Cinco, abajo!»"],
                            ["Nadie bloquea en el rebote", "Con el tiro, cada uno busca al más cercano", "«¡Tiro, buscá!»"],
                            ["Recuperación descontrolada", "Pasos cortos al final y peso atrás", "«¡Llegá corto!»"]
                        ]
                    }
                },
                { p: "Las consignas cortas funcionan mejor que las explicaciones largas durante el juego. Conviene que todo el equipo use las mismas palabras." }
            ]
        },
        {
            id: "metodologia",
            number: "12",
            title: "Metodología",
            kind: "method",
            refs: ["S2"],
            blocks: [
                { p: "Una secuencia posible para enseñar la 2-3:" },
                {
                    ordered: true,
                    list: [
                        "**Explicar en la pizarra** las áreas y la línea de recogida. Usar la pizarra animada de esta guía.",
                        "**Recorrer sin oposición**: cinco defensores contra pasadores fijos que solo pasan (ejercicio «zona espejo»).",
                        "**Agregar reglas al ataque**, como en el 4 contra 5 de WABC: un mínimo de pases y zonas donde no se puede tirar [S2].",
                        "**Agregar el rebote**: cada tiro termina en bloqueo y salida.",
                        "**Juego real**: 5 contra 5 con el ataque libre, y corrección en las pausas."
                    ]
                },
                { p: "En cada paso conviene preguntar en lugar de solo indicar: «¿Quién sale si el balón está en la esquina?», «¿Quién ayudó y quién ayuda al que ayudó?»." }
            ]
        },
        {
            id: "progresiones",
            number: "13",
            title: "Progresiones",
            kind: "method",
            refs: ["S2"],
            blocks: [
                {
                    table: {
                        head: ["Paso", "Situación", "Qué se agrega"],
                        rows: [
                            ["1", "5 defensores, sin ataque", "Desplazamientos a la voz del entrenador («ala», «esquina», «arriba»)"],
                            ["2", "5 contra 4 pasadores fijos", "Moverse con el pase; brazos arriba"],
                            ["3", "4 contra 5 con línea de recogida", "Reglas de tiro y dribbling; mínimo de pases [S2]"],
                            ["4", "4 contra 5 con objetivo", "Primero el ataque suma por meter el balón en la pintura; después, juego disputado [S2]"],
                            ["5", "5 contra 5 con rebote", "Bloqueo y salida en cada tiro"],
                            ["6", "5 contra 5 con cambio de defensa", "Alternar zona e individual según la señal del entrenador"]
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
            refs: ["S3", "S4"],
            blocks: [
                { p: "El manual WABC de nivel 2 recomienda que no se permita la defensa zonal hasta los 15 años y que primero se enseñe la defensa individual [S3]. El manual WABC de minibásquet incluye, entre las reglas modificadas opcionales para competencias, que la defensa zonal no se permita hasta la categoría U16 [S4]." },
                { p: "En el Reglamento Oficial FIBA 2024 no encontramos ninguna restricción a la defensa zonal: la regla de 3 segundos se refiere al atacante que permanece en la zona restringida rival [S1]. Las prohibiciones de zona en formativas, por lo tanto, dependen de cada competencia. Antes de usarla, revisá el reglamento de tu liga o federación." },
                { p: "Cuando una competencia no permite zona, el manual WABC indica que la regla se aplica en media cancha y que, ante la duda, se le da el beneficio a la defensa. También propone formas de comprobar si el rival está defendiendo en zona, por ejemplo con cortes de abajo hacia arriba o invirtiendo el balón y observando si los defensores siguen a los atacantes o se quedan en sus áreas [S3]." },
                {
                    table: {
                        caption: "Propuesta de BasketIQ por etapa (no es una norma oficial)",
                        head: ["Categoría", "Uso sugerido de la 2-3"],
                        rows: [
                            ["Minibásquet y U13", "No usarla como defensa. Sí enseñar a reconocerla y atacarla con pases y cortes simples."],
                            ["U15", "Defensa individual como base. La zona solo como contenido para el ataque, salvo que el reglamento la permita."],
                            ["U17", "Introducirla con la progresión de esta guía, como recurso puntual."],
                            ["U19 y mayores", "Una defensa más del repertorio, con variantes y ajustes según el rival."]
                        ]
                    }
                },
                {
                    callout: "La tabla anterior es una propuesta metodológica de BasketIQ y no un reglamento. Las edades exactas de cada categoría y lo permitido en cada una cambian según la competencia.",
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
                { p: "Algunas formas en que los equipos modifican la 2-3. Ninguna es universal:" },
                {
                    list: [
                        "**Quién toma la esquina**: el alero del lado del balón (versión de las pizarras) o el base del lado del balón, que baja desde arriba.",
                        "**Quién defiende el balón en el poste alto**: los bases desde arriba o el pívot desde abajo (ver 5.5).",
                        "**Poste bajo por delante o por detrás**: por delante se niega el pase pero se necesita ayuda por detrás; por detrás se concede la recepción y se defiende el giro.",
                        "**Zona agresiva**: los bases presionan más arriba y buscan el dos contra uno en las alas cuando el balón entra ahí. WABC menciona la posibilidad de un dos contra uno en el ala [S2].",
                        "**Zona más hundida**: los bases defienden más cerca del codo y se concede el tiro exterior para proteger la pintura."
                    ]
                }
            ],
            refs: ["S2"]
        }
    ];

    var entrenar = [
        {
            id: "entrenar-intro",
            number: "14",
            title: "Ejercicios",
            kind: "method",
            blocks: [
                { p: "Los ejercicios siguen la progresión de la sección 13. El primero reproduce el planteo de WABC; los demás son propuestas de BasketIQ. Cada uno tiene su pizarra para mostrarla al equipo o abrirla en tu pizarra táctica y adaptarla." }
            ]
        }
    ];

    var exercises = [
        {
            id: "ej-espejo",
            name: "Zona espejo con cuatro pasadores",
            kind: "method",
            board: "ejercicio-espejo",
            objective: "Automatizar los desplazamientos colectivos de la 2-3 con cada pase.",
            secondary: ["Moverse con el balón en el aire", "Mantener brazos arriba", "Comunicar quién sale al balón"],
            category: "U17 en adelante (o U15 si el reglamento lo permite)",
            level: "Inicial",
            players: "Mínimo 9 (5 defensores y 4 pasadores); máximo 12 con rotación de grupos",
            playersShort: "9 a 12 jugadores",
            duration: "8 a 10 minutos",
            space: "Media cancha",
            hoops: "1",
            materials: "1 balón; conos opcionales para marcar las posiciones de los pasadores",
            organization: "Cuatro pasadores ubicados arriba, en un ala, en la esquina del mismo lado y en el ala contraria. Cinco defensores en alineación 2-3.",
            development: "Los pasadores se pasan el balón en el orden que indica el entrenador, con una pausa de dos segundos en cada recepción. La defensa se desplaza con cada pase y quien toma al balón lo dice en voz alta. Cada minuto rotan los grupos.",
            rules: ["Los pasadores no tiran ni penetran", "Pausa de dos segundos en cada recepción", "Pases largos permitidos solo después del segundo minuto"],
            cues: ["«¡Con el pase!»", "«¡Manos arriba!»", "«¡Mío!» al tomar el balón"],
            errors: ["Moverse después de la recepción", "Dos defensores salen al mismo pasador", "El pívot no se corre al poste bajo con el pase a la esquina"],
            corrections: ["Congelar la acción y preguntar quién debía salir", "Hacer el recorrido sin balón, a la voz del entrenador", "Marcar con un cono el lugar del pívot en cada situación"],
            variants: ["Agregar un quinto pasador en el poste alto", "El entrenador elige el pase con una señal", "Cronometrar: diez pases sin errores"],
            progressions: ["Quitar la pausa de dos segundos", "Permitir que un pasador penetre hasta un cono", "Pasar al 4 contra 5 con línea de recogida"],
            regressions: ["Solo tres pasadores (arriba, ala y esquina del mismo lado)", "Hacer el recorrido caminando", "Practicar primero solo el lado derecho"],
            evaluation: ["Todos los defensores están en su lugar cuando llega el pase", "Siempre hay un defensor sobre el balón", "Se escucha quién sale en cada pase"],
            basis: "Propuesta metodológica de BasketIQ. Se apoya en los principios de anticipar el pase, brazos arriba y comunicación del manual WABC [S2]."
        },
        {
            id: "ej-linea",
            name: "4 contra 5 con línea de recogida",
            kind: "interpretation",
            refs: ["S2"],
            board: "ejercicio-linea",
            objective: "Entrenar quién toma al balón en el perímetro según la línea de recogida.",
            secondary: ["Defender con el ataque buscando la pintura", "Comunicación entre bases y aleros", "Paciencia defensiva ante muchos pases"],
            category: "U17 en adelante",
            level: "Intermedio",
            players: "9 (4 atacantes y 5 defensores); hasta 14 con rotación",
            playersShort: "9 a 14 jugadores",
            duration: "10 a 12 minutos",
            space: "Media cancha",
            hoops: "1",
            materials: "1 balón; cinta o conos para marcar la línea de recogida",
            organization: "Cuatro atacantes contra cinco defensores en 2-3. Se marca la línea de recogida con conos o cinta.",
            development: "Algunos atacantes se mueven por encima y por debajo de la línea; al menos uno se queda siempre por encima. El ataque debe completar un mínimo de pases antes de tirar. La defensa aplica la regla: por encima de la línea sale un base, por debajo un alero.",
            rules: ["Al menos cuatro pases antes de tirar", "Por debajo de la línea no se puede tirar ni dribblear", "Un atacante siempre por encima de la línea"],
            cues: ["«¡Arriba, base!» / «¡Abajo, alero!»", "«¡Con el pase!»", "«¡Tiro, buscá!»"],
            errors: ["Base y alero salen juntos o ninguno sale", "El base no vuelve a cubrir el pase de regreso", "Se olvidan del rebote al final"],
            corrections: ["Detener y señalar dónde estaba el balón respecto de la línea", "Repetir la situación con el balón quieto", "Sumar un punto a la defensa por cada rebote bloqueado"],
            variants: ["Cambiar la altura de la línea", "Ataque con cinco jugadores pero sin poste alto", "Jugar a tres posesiones por grupo"],
            progressions: ["Primero el ataque suma solo si mete el balón en la pintura; después, juego disputado", "Quitar la regla de pases mínimos", "Permitir el dribbling por debajo de la línea"],
            regressions: ["Ataque sin tiro: solo pases", "Línea muy marcada y balón lento", "Tres contra cuatro en un lado de la cancha"],
            evaluation: ["Sale el defensor correcto en cada recepción", "La defensa no concede tiros cerca del aro", "Bloqueo de rebote en cada tiro"],
            basis: "Ejercicio descrito en el manual WABC de nivel 2 para la defensa zonal en media cancha (4 contra 5, pases mínimos, sin tiro ni dribbling por debajo de la línea, y progresión de puntuar solo metiendo el balón en la pintura) [S2]. La organización detallada, las consignas y las variantes son de BasketIQ."
        },
        {
            id: "ej-rebote",
            name: "Tiro, búsqueda y bloqueo desde la zona",
            kind: "method",
            board: "poste-bajo-rebote",
            objective: "Asegurar el rebote defensivo cuando se defiende en zona.",
            secondary: ["Encontrar al atacante más cercano", "Salida rápida después del rebote", "Defensa del poste bajo"],
            category: "U17 en adelante",
            level: "Intermedio",
            players: "10 (5 contra 5); máximo 15 con un equipo esperando",
            playersShort: "10 a 15 jugadores",
            duration: "10 minutos",
            space: "Media cancha (y cancha completa para la salida)",
            hoops: "1 o 2",
            materials: "2 balones (uno para el entrenador)",
            organization: "Cinco defensores en 2-3 y cinco atacantes en 1-2-2 o 1-3-1. El entrenador tiene un segundo balón.",
            development: "El ataque se pasa el balón; a la señal del entrenador, el poseedor tira. Todos los atacantes van al rebote y la defensa bloquea. Si la defensa toma el rebote, sale al contraataque hasta media cancha.",
            rules: ["Rebote defensivo: 1 punto; rebote ofensivo: 2 puntos para el ataque", "El tirador también va al rebote", "Se juega hasta 7 puntos y se cambian los roles"],
            cues: ["«¡Tiro, buscá!»", "«¡Contacto y aguantá!»", "«¡Salida!»"],
            errors: ["Mirar el aro en lugar de buscar a alguien", "Dos defensores bloquean al mismo atacante", "Nadie bloquea al que entra desde el lado débil"],
            corrections: ["Congelar en el momento del tiro y preguntar a quién busca cada uno", "Asignar antes del tiro, a la voz, quién bloquea a quién", "Hacer el bloqueo sin balón primero"],
            variants: ["El entrenador tira desde distintos lugares", "Atacantes que entran desde fuera de la cancha", "Sumar puntos por el contraataque convertido"],
            progressions: ["Tiros sin señal previa", "Ataque libre con tiro tras al menos tres pases", "5 contra 5 completo con transición"],
            regressions: ["3 contra 3 solo con la línea de atrás de la zona", "Tiros desde un único lugar", "Bloqueo sin contacto"],
            evaluation: ["Porcentaje de rebotes defensivos tomados", "Cada atacante tiene un defensor bloqueándolo", "Tiempo hasta la salida del primer pase"],
            basis: "Propuesta metodológica de BasketIQ basada en el principio de rebote en zona del manual WABC: con el tiro, todos buscan a alguien para bloquear [S2]."
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
                        "Siempre hay un defensor sobre el balón, a la distancia correcta",
                        "Los defensores se mueven con el pase, no después de la recepción",
                        "Se aplica la línea de recogida sin dudas",
                        "El poste alto no recibe cómodo de frente al aro",
                        "El poste bajo del lado del balón está negado o jugado por delante",
                        "Hay ayuda ante cada penetración y alguien ayuda al que ayudó",
                        "Se recupera con pasos cortos y brazos arriba",
                        "Se habla en cada pase",
                        "Con cada tiro, cada atacante tiene un defensor bloqueándolo",
                        "El equipo sabe cuál variante del poste alto usa y por qué"
                    ]
                },
                {
                    table: {
                        caption: "Indicadores para medir en partido o en entrenamiento",
                        head: ["Indicador", "Cómo medirlo"],
                        rows: [
                            ["Tiros concedidos cerca del aro", "Contar por posesión defendida en zona"],
                            ["Rebotes defensivos tras tiro", "Rebotes tomados ÷ tiros fallados del rival"],
                            ["Pases al poste alto recibidos", "Contar recepciones en la línea de libres"],
                            ["Tiros abiertos desde la esquina", "Contar tiros sin defensor a menos de un brazo"]
                        ]
                    }
                }
            ]
        },
        {
            id: "evaluar-preguntas",
            title: "Autoevaluación",
            kind: "method",
            refs: ["S2", "S3"],
            blocks: [
                { qa: "¿Qué es una defensa zonal?", answer: ["Una defensa de equipo en la que cada jugador es responsable de un área de la cancha y de cualquier atacante que esté en ella [S3]."] },
                { qa: "El balón está en el ala, por encima de la línea de recogida. ¿Quién sale?", answer: ["Un base. Por debajo de la línea saldría un alero [S2]."] },
                { qa: "¿Cuándo hay que empezar a moverse en la zona?", answer: ["Cuando el balón sale de las manos del pasador, no cuando llega al receptor [S2]."] },
                { qa: "Un atacante penetra por el hueco entre un base y un alero. ¿Qué pasa detrás de la ayuda?", answer: ["Rota el más cercano y otro defensor ayuda al que ayudó, para que el atacante que quedó libre no reciba cómodo."] },
                { qa: "¿Qué espacio concede la variante en la que el pívot sube al poste alto?", answer: ["El fondo: cortes por la línea final y la zona detrás de los aleros."] },
                { qa: "¿Se puede jugar zona en una competencia U14?", answer: ["Depende del reglamento de la competencia. WABC recomienda no permitirla hasta los 15 años (nivel 2) o hasta la categoría U16 (minibásquet) [S3] [S4]. El Reglamento Oficial FIBA no la restringe."] }
            ]
        }
    ];

    // ------------------------------------------------------------------
    // Simulador (Etapa 3). Lado derecho de la pantalla = y chica; el izquierdo se arma por espejo.
    // ------------------------------------------------------------------
    var OFF = { o1: [9.0, 7.5], o2: [6.6, 2.4], o3: [6.6, 12.6], o4: [1.0, 0.7], o5: [1.0, 14.3] };
    function P(off, def) { return merge(off, def); }

    var SIM = {
        id: "sim-zona-2-3",
        title: "Simulador de la zona 2-3",
        intro: "Elegí dónde está el balón y mirá cómo se ajustan los cinco defensores. Las flechas punteadas rojas son las rotaciones; las zonas rojas, los espacios que el ataque puede aprovechar. El criterio base sigue al manual WABC [S2]; las otras variantes son criterios alternativos.",
        view: VIEW,
        tags: ["Zona 2-3", "Academy"],
        players: {
            o1: O("1", 0, 0), o2: O("2", 0, 0), o3: O("3", 0, 0), o4: O("4", 0, 0), o5: O("5", 0, 0),
            x1: D("1", 0, 0), x2: D("2", 0, 0), x3: D("3", 0, 0), x4: D("4", 0, 0), x5: D("5", 0, 0)
        },
        mirrorSwap: { x1: "x2", x2: "x1", x3: "x4", x4: "x3", o2: "o3", o3: "o2", o4: "o5", o5: "o4" },
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
                label: "Base: línea de recogida",
                kind: "interpretation",
                refs: ["S2"],
                desc: "Por encima de la línea de recogida sale un base y por debajo un alero; el poste alto lo cierran los bases y el pívot se queda cerca del aro [S2].",
                states: {
                    top: {
                        title: "Balón en el eje central",
                        note: "Con un solo atacante arriba, uno de los bases sale al balón y el otro se cierra hacia el poste alto. Quién sale lo acuerda el equipo antes; acá sale X1.",
                        ball: "o1",
                        pos: P(OFF, { x1: [7.5, 6.6], x2: [6.1, 8.9], x3: [2.4, 3.6], x4: [2.4, 11.4], x5: [2.0, 7.5] }),
                        resp: {
                            x1: "Presiona al balón sin dejarlo penetrar por el centro.",
                            x2: "Protege el poste alto y queda listo para salir al ala izquierda.",
                            x3: "Cubre el costado derecho de la pintura y el corte por el fondo.",
                            x4: "Cubre el costado izquierdo de la pintura y el corte por el fondo.",
                            x5: "Centro de la pintura, delante del aro. Avisa los cortes."
                        },
                        help: "Si el balón penetra por el hueco entre los bases, los dos se cierran y X5 da un paso al frente sin despegarse del aro.",
                        vulnerable: [
                            { x: 4.2, y: 2.0, w: 1.8, h: 1.8, label: "Hueco", text: "El hueco entre X1 y X3 en el ala derecha." },
                            { x: 4.2, y: 11.2, w: 1.8, h: 1.8, label: "Hueco", text: "El hueco entre X2 y X4 en el ala izquierda." }
                        ]
                    },
                    wingR: {
                        title: "Balón en el ala derecha",
                        note: "El ala está por encima de la línea de recogida, así que la toma un base: X1. El resto de la zona se corre como un bloque hacia el lado del balón [S2].",
                        ball: "o2",
                        pos: P(OFF, { x1: [6.9, 3.4], x2: [5.6, 6.6], x3: [2.4, 2.6], x4: [2.6, 8.8], x5: [2.0, 5.8] }),
                        resp: {
                            x1: "Sale a cerrar al ala con los brazos arriba y le niega la penetración por el medio.",
                            x2: "Se cierra al poste alto y al codo del lado del balón.",
                            x3: "Se acerca a la esquina para llegar a tiempo si sale el pase.",
                            x4: "Entra a la pintura desde el lado débil: protege el aro y el corte por detrás.",
                            x5: "Se corre al poste bajo del lado del balón."
                        },
                        help: "Si el ala penetra por el fondo, X5 frena y X4 cubre el aro (ayuda a la ayuda). Si penetra por el medio, X2 cierra.",
                        vulnerable: [
                            { x: 5.6, y: 11.4, w: 2.4, h: 2.4, label: "Lado débil", text: "El ala izquierda, con un pase largo por encima de la zona." },
                            { x: 0.1, y: 1.6, w: 1.4, h: 2.2, label: "Fondo", text: "El fondo detrás de X3, si el alero sube demasiado." }
                        ]
                    },
                    cornerR: {
                        title: "Balón en la esquina derecha",
                        note: "La esquina está por debajo de la línea: la toma el alero X3. X1 baja para cortar el pase de vuelta y X5 queda en el poste bajo [S2].",
                        ball: "o4",
                        pos: P(OFF, { x1: [5.0, 3.0], x2: [4.7, 6.4], x3: [1.7, 1.6], x4: [2.0, 7.4], x5: [1.5, 3.9] }),
                        resp: {
                            x1: "Baja hacia el ala para molestar el pase de vuelta y ayudar en el codo.",
                            x2: "Niega el poste alto y vigila el codo del lado del balón.",
                            x3: "Sale a la esquina con pasos cortos al final y le cierra la línea de fondo.",
                            x4: "Queda como último defensor cerca del aro, del lado débil.",
                            x5: "Defiende el poste bajo del lado del balón, adelantado si hay un pívot ahí."
                        },
                        help: "Si la esquina penetra por el fondo, X5 frena y X4 cruza a cubrir el aro. Con el tiro, X3 bloquea al tirador.",
                        vulnerable: [
                            { x: 5.8, y: 9.6, w: 2.6, h: 3.4, label: "Lado débil", text: "El lado débil completo: la zona quedó cargada hacia la derecha." },
                            { x: 4.0, y: 4.0, w: 1.6, h: 1.4, label: "Codo", text: "El codo, entre X1 y X2, si un atacante corta ahí." }
                        ]
                    },
                    wingL: { mirrorOf: "wingR" },
                    cornerL: { mirrorOf: "cornerR" },
                    highPost: {
                        title: "Balón en el poste alto",
                        note: "Un atacante subió desde la esquina izquierda a la línea de libres y recibió. Los bases lo cierran desde arriba, con al menos un brazo por delante, y el pívot se queda entre el balón y el aro [S2].",
                        ball: "o5",
                        pos: P(merge(OFF, { o5: [5.4, 7.5] }), { x1: [6.4, 6.5], x2: [6.4, 8.5], x3: [2.0, 4.4], x4: [2.0, 10.6], x5: [2.6, 7.5] }),
                        resp: {
                            x1: "Se cierra sobre el poste alto desde arriba y vuelve si el balón sale al ala derecha.",
                            x2: "Se cierra sobre el poste alto desde arriba y vuelve si el balón sale al ala izquierda.",
                            x3: "Se hunde hacia el poste bajo derecho y protege el corte por el fondo.",
                            x4: "Se hunde hacia el poste bajo izquierdo y protege el corte por el fondo.",
                            x5: "Se queda entre el balón y el aro; no sale a la línea de libres."
                        },
                        help: "Si el poste alto se da vuelta y ataca el aro, X5 lo frena y los aleros cierran los postes bajos.",
                        vulnerable: [
                            { x: 5.8, y: 1.4, w: 2.2, h: 2.2, label: "Tiro", text: "El tiro desde el ala derecha si el balón sale rápido." },
                            { x: 5.8, y: 11.4, w: 2.2, h: 2.2, label: "Tiro", text: "El tiro desde el ala izquierda si el balón sale rápido." }
                        ]
                    },
                    lowPostR: {
                        title: "Balón en el poste bajo derecho",
                        note: "El atacante de la esquina se metió al poste bajo con el balón. X5 defiende detrás, del lado del aro, y X3 se cierra a ayudar desde arriba.",
                        ball: "o4",
                        pos: P(merge(OFF, { o4: [1.9, 4.4] }), { x1: [5.4, 3.2], x2: [4.6, 6.8], x3: [2.8, 3.2], x4: [1.9, 8.2], x5: [2.4, 5.1] }),
                        resp: {
                            x1: "Se hunde un paso para cerrar el pase al ala sin perderla de vista.",
                            x2: "Protege el poste alto y el medio de la pintura.",
                            x3: "Ayuda desde arriba sobre el poste y recupera si el balón sale al ala.",
                            x4: "Queda cerca del aro del lado débil, listo para la ayuda y el rebote.",
                            x5: "Defiende al poste del lado del aro y le niega el giro hacia el medio."
                        },
                        help: "Antes de que reciba, el poste del lado del balón se niega o se juega por delante [S2]. Una vez que recibió, la ayuda viene del defensor que está más cerca, y el lado débil vigila al que corta.",
                        vulnerable: [
                            { x: 5.6, y: 1.2, w: 2.2, h: 2.4, label: "Ala", text: "El ala derecha si X3 se va del todo a ayudar." },
                            { x: 0.1, y: 10.4, w: 2.4, h: 3.2, label: "Corte débil", text: "El corte por el lado débil hacia el aro." }
                        ]
                    },
                    lowPostL: { mirrorOf: "lowPostR" }
                }
            },
            {
                id: "esquinaBase",
                label: "La esquina la toma el base",
                kind: "variant",
                inherits: "base",
                desc: "Criterio alternativo: cuando el balón baja a la esquina, sale el base del lado del balón y el alero se queda abajo protegiendo el poste bajo. El base recorre más distancia, pero el poste bajo queda mejor cubierto.",
                states: {
                    cornerR: {
                        title: "Balón en la esquina derecha (sale el base)",
                        note: "X1 baja desde el ala hasta la esquina; X3 no sale y se queda en el poste bajo; X2 se abre para cubrir el ala que dejó X1.",
                        ball: "o4",
                        pos: P(OFF, { x1: [1.8, 1.6], x2: [5.6, 5.2], x3: [2.2, 3.6], x4: [2.4, 8.8], x5: [2.0, 5.8] }),
                        resp: {
                            x1: "Sale desde arriba hasta la esquina y le cierra la línea de fondo.",
                            x2: "Se abre hacia el ala derecha para el pase de vuelta y vigila el codo.",
                            x3: "Se queda abajo, en el poste bajo del lado del balón.",
                            x4: "Protege el aro desde el lado débil.",
                            x5: "Se corre hacia el centro de la pintura, entre el poste y el aro."
                        },
                        help: "Como X1 tiene que recorrer mucha distancia, la salida empieza cuando el pase sale del ala, no cuando llega a la esquina. Si llega tarde, X3 frena la penetración y X5 cubre el poste.",
                        vulnerable: [
                            { x: 6.2, y: 6.2, w: 2.4, h: 2.6, label: "Arriba", text: "El eje central: con X1 abajo, solo queda X2 arriba." },
                            { x: 5.8, y: 11.0, w: 2.4, h: 2.8, label: "Lado débil", text: "El ala izquierda, con un pase largo." }
                        ]
                    },
                    cornerL: { mirrorOf: "cornerR" }
                }
            },
            {
                id: "pivotSube",
                label: "El pívot defiende el poste alto",
                kind: "variant",
                inherits: "base",
                desc: "Criterio alternativo: cuando el balón entra al poste alto, X5 sube a defenderlo y los dos aleros se juntan delante del aro. Protege mejor el tiro del poste alto, pero expone el fondo.",
                states: {
                    highPost: {
                        title: "Balón en el poste alto (sube el pívot)",
                        note: "X5 sube a contener al poste; X3 y X4 se juntan delante del aro; los bases se abren para cortar los pases a las alas.",
                        ball: "o5",
                        pos: P(merge(OFF, { o5: [5.4, 7.5] }), { x1: [6.8, 4.4], x2: [6.8, 10.6], x3: [1.9, 5.8], x4: [1.9, 9.2], x5: [4.4, 7.5] }),
                        resp: {
                            x1: "Se abre hacia el ala derecha para cortar el pase y llegar al tiro.",
                            x2: "Se abre hacia el ala izquierda para cortar el pase y llegar al tiro.",
                            x3: "Se junta delante del aro, del lado derecho.",
                            x4: "Se junta delante del aro, del lado izquierdo.",
                            x5: "Sube a contener al poste alto y no lo deja girar cómodo."
                        },
                        help: "Si el poste alto pasa a un atacante que corta por el fondo, el alero de ese lado sale y el otro cubre el aro.",
                        vulnerable: [
                            { x: 0.1, y: 1.4, w: 1.6, h: 3.0, label: "Fondo", text: "El fondo derecho y el corte por la línea final." },
                            { x: 0.1, y: 10.6, w: 1.6, h: 3.0, label: "Fondo", text: "El fondo izquierdo y el corte por la línea final." }
                        ]
                    }
                }
            }
        ]
    };

    return {
        id: "zona-2-3",
        sectionId: "zone23_defense",
        title: "Defensa zonal 2-3",
        subtitle: "Organización, responsabilidades, rotaciones, variantes, cómo atacarla y cómo entrenarla, con fuentes FIBA y WABC verificadas.",
        sectionLabel: "Defensa · Defensas en zona",
        meta: ["Defensa de media cancha", "Desde U17 (según reglamento)", "9 pizarras animadas", "Simulador interactivo", "3 ejercicios"],
        updated: "2026-11-26",
        tabs: {
            aprender: aprender,
            visualizar: ["alineacion", "circulacion", "poste-alto-a", "poste-alto-b", "poste-bajo-rebote", "penetracion", "atacar", "ejercicio-linea", "ejercicio-espejo"],
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
