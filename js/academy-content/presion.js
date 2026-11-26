/*
 * Basket Lab Academy · Presión a toda la cancha y salidas de presión
 *
 * Contenido redactado en español por BasketIQ. Las citas [S1]..[S5] remiten a la
 * bibliografía del final, consultada directamente.
 *
 * Coordenadas: metros sobre la cancha FIBA completa (28 x 15), vista vertical.
 * x = distancia a la línea de fondo del aro que ataca el equipo con balón (aro en x = 1,575);
 * la línea central está en x = 14 y el saque se hace desde la línea de fondo contraria (x = 28).
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

    var VIEW = { court: "full", rotation: 90 };

    function D(label, x, y) { return { team: "defense", label: label, x: x, y: y }; }
    function O(label, x, y) { return { team: "offense", label: label, x: x, y: y }; }
    function team(pos) {
        var r = {};
        Object.keys(pos).forEach(function (k) { r[k] = (k[0] === "x" ? D : O)(k.slice(1), pos[k][0], pos[k][1]); });
        return r;
    }

    var boards = [
        {
            id: "roles-saque",
            title: "Presión individual: roles en el saque",
            kind: "official",
            refs: ["S1"],
            intro: "El manual WABC propone cinco roles para presionar después de un tanto, antes de un saque o en los tiros libres: el que defiende el balón, el que presiona el saque, dos que niegan los pases hacia adelante y uno que vuelve a proteger el aro [S1].",
            spec: {
                view: VIEW,
                players: team({
                    o4: [27.9, 9.5], o1: [22.0, 10.5], o2: [22.0, 5.0], o3: [14.5, 3.5], o5: [14.5, 11.5],
                    x4: [26.8, 9.6], x1: [21.0, 10.2], x2: [20.8, 5.4], x3: [15.4, 7.5], x5: [7.0, 7.5]
                }),
                phases: [
                    {
                        name: "Presión al saque",
                        note: "X4 se ubica rápido en ángulo hacia la banda para empujar el pase hacia un lado [S1]. El 1 se mueve para liberarse.",
                        ball: "o4",
                        strokes: [
                            ["rotation", "x4", [26.9, 8.4]],
                            ["move", "o1", [24.8, 11.8], 0.2],
                            ["rotation", "x1", [23.8, 11.0]]
                        ]
                    },
                    {
                        name: "Cada uno a su lugar",
                        note: "Con el pase, el que defiende el balón se pone delante, otro niega el pase por la línea, otro se ubica en la línea media y X4 baja por debajo de la línea del balón [S1].",
                        strokes: [
                            ["pass", "o4", "o1"],
                            ["rotation", "x1", [23.4, 11.6]],
                            ["rotation", "x2", [18.6, 11.4]],
                            ["rotation", "x3", [17.4, 7.5]],
                            ["rotation", "x4", [23.0, 8.2]],
                            ["move", "o4", [26.0, 6.2]]
                        ]
                    },
                    {
                        name: "Si el balón cambia de lado",
                        note: "Las posiciones se invierten. La ayuda sale siempre desde debajo de la línea del balón, y todos ven al balón y a su jugador [S1]."
                    }
                ]
            }
        },
        {
            id: "girar-encauzar-doblar",
            title: "Girar, encauzar y doblar desde adelante",
            kind: "official",
            refs: ["S1"],
            intro: "El defensor del balón primero hace girar al que dribblea y después lo encauza por la banda. El doble llega desde adelante del balón; los otros dos interceptan y el quinto cuida el aro [S1].",
            spec: {
                view: VIEW,
                players: team({
                    o1: [24.0, 9.5], o2: [21.0, 4.0], o3: [17.0, 12.5], o4: [14.5, 5.0],
                    x1: [23.0, 9.5], x2: [20.2, 4.8], x3: [16.2, 11.6], x4: [13.8, 6.0], x5: [6.0, 7.5]
                }),
                phases: [
                    {
                        name: "Girar",
                        note: "X1, con la cabeza en el balón y a un brazo de distancia, sin empujar, obliga al 1 a girar [S1].",
                        ball: "o1",
                        strokes: [
                            ["dribble", "o1", [23.2, 11.0]],
                            ["rotation", "x1", [22.3, 10.4]]
                        ]
                    },
                    {
                        name: "Encauzar por la banda",
                        note: "Hombro con hombro, X1 lleva al 1 por la banda [S1].",
                        strokes: [
                            ["dribble", "o1", [20.6, 13.4]],
                            ["rotation", "x1", [20.7, 12.3]]
                        ]
                    },
                    {
                        name: "Doble desde adelante",
                        note: "X3 deja al 3 y dobla desde adelante del balón, sin dejar hueco entre los dos y con las manos altas, sin intentar robar. X2 y X4 pasan a interceptar; X5 sigue en el aro [S1].",
                        strokes: [
                            ["rotation", "x3", [19.3, 13.5]],
                            ["rotation", "x2", [18.2, 8.6]],
                            ["rotation", "x4", [15.6, 10.4]]
                        ]
                    },
                    {
                        name: "Rotación según el pase",
                        note: "Si el balón sale por la banda hacia el 3, lo toma el defensor que ve el pase: X4 [S1]. El que dobló vuelve a la línea del balón.",
                        strokes: [
                            ["pass", "o1", "o3"],
                            ["rotation", "x4", [16.0, 11.6]],
                            ["rotation", "x3", [17.8, 10.6]]
                        ]
                    }
                ]
            }
        },
        {
            id: "zona-221",
            title: "Zona 2-2-1: trampa en la banda",
            kind: "interpretation",
            intro: "Dos defensores adelante, dos en la mitad de la cancha y uno atrás. La primera línea deja el saque y lleva el balón a la banda; la trampa se cierra con un defensor de la segunda línea. No pudimos leer el apartado WABC sobre la 2-2-1: esta secuencia es interpretación de BasketIQ.",
            spec: {
                view: VIEW,
                players: team({
                    o4: [27.9, 9.5], o1: [24.5, 11.6], o2: [20.0, 3.6], o3: [12.0, 3.0], o5: [13.0, 12.6],
                    x1: [22.0, 5.6], x2: [22.0, 9.4], x3: [15.5, 3.6], x4: [15.5, 11.4], x5: [7.5, 7.5]
                }),
                phases: [
                    {
                        name: "Dejar el saque",
                        note: "La primera línea no niega el saque: espera que el balón entre y lo lleva a la banda.",
                        ball: "o4",
                        strokes: [
                            ["pass", "o4", "o1"],
                            ["rotation", "x2", [23.0, 10.6]],
                            ["rotation", "x1", [21.4, 7.6]],
                            ["move", "o4", [22.5, 8.0]]
                        ]
                    },
                    {
                        name: "Trampa en la banda",
                        note: "El 1 avanza por la banda y X4 sale a cerrarle adelante, con X2 detrás. X1 corta el pase al medio, X3 se mete en la línea media y X5 se corre al lado del balón.",
                        strokes: [
                            ["dribble", "o1", [17.6, 13.4]],
                            ["rotation", "x2", [18.4, 12.5]],
                            ["rotation", "x4", [16.6, 13.0]],
                            ["rotation", "x1", [19.6, 8.8]],
                            ["rotation", "x3", [14.2, 9.0]],
                            ["rotation", "x5", [9.0, 10.4]]
                        ]
                    },
                    {
                        name: "Lo que deja libre",
                        note: "Toda trampa deja a un atacante sin marca. Acá quedan el pase atrás al 4 y el pase largo al 3, que es el más riesgoso para la defensa porque nadie está cerca del aro del lado débil."
                    }
                ]
            }
        },
        {
            id: "salida-caja",
            title: "Salida de presión: de la caja a los cuatro lugares",
            kind: "official",
            refs: ["S3"],
            intro: "Contra la presión zonal, el manual WABC ubica a los jugadores sin balón respecto del que tiene el balón: opuesto, diagonal, mismo lado y largo. Cada uno tiene que estar en un hueco donde pueda recibir [S3].",
            spec: {
                view: VIEW,
                players: team({ o4: [27.9, 9.5], o1: [21.3, 10.0], o2: [21.3, 5.0], o3: [14.0, 4.5], o5: [14.0, 10.5] }),
                phases: [
                    {
                        name: "La caja",
                        note: "Dos jugadores en la mitad de la cancha y dos en la línea de tres [S3]. El 4 saca.",
                        ball: "o4",
                        strokes: [["cut", "o1", [24.6, 11.4], 0.2]]
                    },
                    {
                        name: "Cuatro lugares",
                        note: "El 1 recibe. El 4 entra como opuesto, el 2 va a la diagonal, el 5 al mismo lado y el 3 al lugar largo [S3].",
                        strokes: [
                            ["pass", "o4", "o1"],
                            ["move", "o4", [25.0, 5.6]],
                            ["move", "o2", [20.0, 4.4]],
                            ["move", "o5", [20.4, 13.4]],
                            ["move", "o3", [12.0, 6.0]]
                        ]
                    },
                    {
                        name: "Si no se liberan",
                        note: "Si el 1 y el 2 no pueden recibir, el 3 y el 5 cortan hacia el balón mientras el 1 y el 2 abren espacio; también pueden bloquearles [S3]. Los cortes hacia el balón son preferibles, pero los que se alejan abren lugar a un compañero [S3]."
                    }
                ]
            }
        },
        {
            id: "base-saca",
            title: "Salida de presión: el base saca",
            kind: "official",
            refs: ["S4"],
            intro: "Para aliviar la presión sobre el base, el manual WABC propone que saque él. Si el defensor del que saca va a doblar al receptor, el base entra a la cancha, recibe de vuelta y se aleja del doble con dribbling [S4].",
            spec: {
                view: VIEW,
                players: team({
                    o1: [27.9, 9.5], o4: [24.0, 8.4], o2: [20.5, 4.0],
                    x1: [26.8, 9.2], x4: [23.2, 9.2], x2: [19.8, 5.0]
                }),
                phases: [
                    {
                        name: "Recibir cerca del fondo",
                        note: "El 4 primero se aleja del pasador y después recibe a dos o tres metros de la línea de fondo [S4].",
                        ball: "o1",
                        strokes: [
                            ["cut", "o4", [25.6, 11.8], -0.25],
                            ["rotation", "x4", [24.8, 11.0]],
                            ["pass", "o1", "o4"]
                        ]
                    },
                    {
                        name: "X1 va al doble",
                        note: "X1 deja al que sacó para doblar al 4. El 1 entra a la cancha [S4].",
                        strokes: [
                            ["rotation", "x1", [26.6, 11.6]],
                            ["move", "o1", [26.8, 8.4]]
                        ]
                    },
                    {
                        name: "Pase de vuelta y salir del doble",
                        note: "El 4 devuelve al 1, que se aleja enseguida del doble con dribbling [S4].",
                        strokes: [
                            ["pass", "o4", "o1"],
                            ["dribble", "o1", [22.0, 6.8]]
                        ]
                    }
                ]
            }
        }
    ];

    var sources = [
        {
            id: "S1",
            title: "WABC Coaches Manual Level 1 · 1.1.12 Full court man-to-man defence",
            publisher: "FIBA · World Association of Basketball Coaches (WABC)",
            locator: "Nivel 1, Team, 1 Defensive tactics and strategies, 1.1 Man-to-man defence",
            url: "https://wabc.fiba.com/manual/level-1/l1-team/l1-1-defensive-tactics-and-strategies/1-1-man-to-man-defence/1-1-12-full-court-man-to-man-defence/",
            used: "Posición respecto del balón; la ayuda sale desde debajo de la línea del balón; dobles después de girar o de que el atacante levanta el dribbling, desde adelante, sin hueco, manos altas y sin intentar robar; violaciones de 8 y 5 segundos como objetivo; roles en el saque; girar y encauzar; ayudar y recuperar, cambio; ayudar al que ayudó; dobles con dos interceptores y un defensor del aro; ejercicios 1c1 a 5c5.",
            accessed: "26/11/2026"
        },
        {
            id: "S2",
            title: "WABC Coaches Manual Level 1 · 1.1.11 Transition defence",
            publisher: "FIBA · WABC",
            locator: "Nivel 1, Team, 1.1 Man-to-man defence",
            url: "https://wabc.fiba.com/manual/level-1/l1-team/l1-1-defensive-tactics-and-strategies/1-1-man-to-man-defence/1-1-11-transition-defence/",
            used: "Primero el aro, después el balón: el último defensor no corre directo al balón; frenar el pase de salida sin intentar robar.",
            accessed: "26/11/2026"
        },
        {
            id: "S3",
            title: "WABC Coaches Manual Level 1 · 2.4.2 Attacking full court zone pressure: purposeful movement",
            publisher: "FIBA · WABC",
            locator: "Nivel 1, Team, 2 Offensive tactics and strategies, 2.4 Offence against full court pressure",
            url: "https://wabc.fiba.com/manual/level-1/l1-team/l1-2-offensive-tactics-and-strategies/2-4-offence-against-full-court-pressure/2-4-2-attacking-full-court-zone-pressure-purposeful-movement/",
            used: "Lugares opuesto, diagonal, mismo lado y largo; estar en un hueco para recibir; la caja inicial; cortes hacia el balón y bloqueos si el 1 y el 2 no se liberan; práctica con la cancha dividida en cinco áreas.",
            accessed: "26/11/2026"
        },
        {
            id: "S4",
            title: "WABC Coaches Manual Level 2 · 2.5.1 Point guard inbound",
            publisher: "FIBA · WABC",
            locator: "Nivel 2, Team, 2 Offensive tactics and strategies, 2.5 Offence against full court pressure",
            url: "https://wabc.fiba.com/manual/level-2/l2-team/2-offensive-tactics-and-strategies/2-5-offence-against-full-court-pressure/2-5-1-point-guard-inbound/",
            used: "Cómo se defiende al base en el saque; la banda y la línea de fondo como defensores extra en la trampa; ayudar y recuperar, salto y cambio, doble; el base que saca; pase de vuelta y salir del doble; recibir a dos o tres metros del fondo; mano a mano tras la negación.",
            accessed: "26/11/2026"
        },
        {
            id: "S5",
            title: "Official Basketball Rules 2024 (v1.0)",
            publisher: "FIBA. Vigente desde el 1 de octubre de 2024",
            locator: "Regla 2 (cancha y líneas)",
            url: "https://assets.fiba.basketball/image/upload/documents-corporate-fiba-official-rules-2024-v10.pdf",
            used: "Medidas de la cancha completa de las pizarras.",
            accessed: "26/11/2026"
        }
    ];

    var unavailableSources = [
        {
            title: "WABC Coaches Manual Level 2 · 1.3.1 Full court trapping zone (2-2-1)",
            url: "https://wabc.fiba.com/manual/level-2/l2-team/1-defensive-tactics-and-strategies/1-3-zone-defences/1-3-1-full-court-trapping-zone-2-2-1/",
            reason: "El sitio no permitió la consulta automática. Todo lo que decimos sobre la zona 2-2-1 es interpretación de BasketIQ."
        },
        {
            title: "WABC Coaches Manual Level 1 · 2.4.1 Attacking full court zone pressure: general principles",
            url: "https://wabc.fiba.com/manual/level-1/l1-team/l1-2-offensive-tactics-and-strategies/2-4-offence-against-full-court-pressure/2-4-1-attacking-full-court-zone-pressure-general-principles/",
            reason: "No se pudo abrir. Los principios generales de salida que no llevan cita son interpretación de BasketIQ."
        }
    ];

    var aprender = [
        {
            id: "introduccion",
            number: "1",
            title: "Introducción",
            kind: "interpretation",
            blocks: [
                { p: "Presionar es defender lejos del propio aro para quitarle tiempo y espacio al ataque. Puede buscar robos, violaciones o, simplemente, que el rival llegue tarde a su ataque. También tiene un costo: cada doble deja a un atacante libre y cada defensor adelantado está lejos del aro." },
                { p: "Esta guía reúne la presión individual a toda la cancha, los dobles, la zona 2-2-1, la presión de media cancha y cómo salir de la presión. En **Simular** podés recorrer el saque, la recepción, la trampa, la rotación y la salida con cada tipo de presión." },
                {
                    callout: "La presión individual, los dobles y las salidas tienen fuente WABC. La 2-2-1 y la presión de media cancha son interpretación de BasketIQ, porque no pudimos leer el apartado del manual sobre la 2-2-1.",
                    tone: "warn",
                    title: "Qué es oficial y qué no"
                }
            ]
        },
        {
            id: "definicion",
            number: "2",
            title: "Definición técnica",
            kind: "official",
            refs: ["S1", "S4"],
            blocks: [
                { p: "En la **presión individual a toda la cancha**, cada defensor se ubica según su distancia al balón: más cerca cuanto más cerca está su atacante, y todos ven al balón y a su jugador [S1]. Los defensores se mueven a la **línea del balón**, porque la ayuda sale desde debajo de ella [S1]." },
                { p: "Una **trampa** (doble) es que dos defensores marquen al jugador con balón. Cuanto más cerca de la banda y de la línea de fondo, más efectiva es, porque cada línea funciona como un defensor más [S4]." },
                { p: "En la **zona de presión**, como la 2-2-1, cada defensor cuida un área en lugar de un jugador y las trampas se arman en lugares elegidos (interpretación de BasketIQ)." }
            ]
        },
        {
            id: "objetivos",
            number: "3",
            title: "Objetivos",
            kind: "official",
            refs: ["S1"],
            blocks: [
                {
                    list: [
                        "**Forzar un mal pase** o una violación de 8 segundos (doble en la zona de defensa) o de 5 segundos [S1].",
                        "**Quitar tiempo**: aunque no haya pérdida, el ataque tiene menos tiempo para tirar [S1].",
                        "**Sacar la iniciativa** al base rival y cambiar el ritmo del partido.",
                        "**Proteger el aro** aun cuando se presiona: siempre hay un defensor atrás [S1]."
                    ]
                }
            ]
        },
        {
            id: "principios",
            number: "4",
            title: "Principios",
            kind: "official",
            refs: ["S1", "S2", "S4"],
            blocks: [
                {
                    list: [
                        "**Ver balón y jugador**, y estar en la línea del balón [S1].",
                        "**Girar y encauzar** al que dribblea: cabeza en el balón, sin contacto, a un brazo de distancia; hombro con hombro por la banda [S1].",
                        "**Doblar en el momento justo**: después de hacerlo girar o cuando levanta el dribbling, y desde adelante del balón si fue encauzado [S1].",
                        "**Doblar bien**: sin dudar, sin hueco entre los dos, manos altas y sin intentar robar [S1].",
                        "**Interceptar**: los defensores lejos del balón se mueven con cada pase, cortan líneas y vuelan con el balón [S1].",
                        "**Aro antes que balón** cuando la presión se supera: el último defensor no corre directo al balón [S2].",
                        "**Usar las líneas**: la banda y la de fondo son un defensor más [S4]."
                    ]
                }
            ]
        },
        {
            id: "explicacion",
            number: "5",
            title: "Explicación detallada",
            kind: "interpretation",
            refs: ["S1", "S2", "S3", "S4"],
            blocks: [
                { h: "5.1 Presión individual a toda la cancha" },
                { p: "El manual WABC propone roles para el saque: el que defiende el balón; el que presiona el saque y puede negar la devolución o presionar al que dribblea; uno que no va al rebote y niega pases hacia adelante; otro que pelea el rebote y después niega; y uno que vuelve a defender el aro [S1]. Con el pase, el del lado del balón niega por la línea, otro se ubica en la línea media y el que presionó el saque baja por debajo de la línea del balón [S1]." },
                { board: "roles-saque" },
                { h: "5.2 Trampas y dobles" },
                { p: "El doble llega después de que el que dribblea gira, sobre todo con un reverso sin ver, o cuando levanta el dribbling. Si fue encauzado por la banda, el doble llega desde adelante [S1]. Si el balón se mueve lento, un defensor puede saltar sobre el que dribblea para doblar o para cambiar de marca [S1]." },
                { board: "girar-encauzar-doblar" },
                { h: "5.3 Líneas de pase y orientación" },
                { p: "Los defensores lejos del balón tienen que estar listos para el pase largo: interceptarlo o volar con el balón [S1]. Los que están a más de un pase miran hacia la línea de fondo para ver balón y jugador; el que tiene su jugador del lado del balón se orienta hacia la línea media [S1]." },
                { h: "5.4 Rotaciones" },
                { p: "En el 4 contra 4 con doble, dos doblan y dos interceptan, y la rotación depende de adónde va el pase: lo toma el defensor que ve el pase [S1]. Cuando un defensor cambia de marca, el más cercano «ayuda al que ayudó» y el que quedó libre rota al jugador sin marca [S1]. El quinto defensor cuida el aro y no participa de esas rotaciones [S1]." },
                { h: "5.5 Zona 2-2-1" },
                { p: "Dos defensores adelante dejan entrar el saque y llevan el balón a la banda; dos en la mitad de la cancha cierran la trampa y cortan los pases al medio; uno atrás protege el aro y el pase largo. Es una descripción de BasketIQ: no pudimos leer el apartado WABC." },
                { board: "zona-221" },
                { h: "5.6 Presión de media cancha" },
                { p: "La defensa espera en la mitad de la cancha y atrapa en la esquina que forman la banda y la línea central. Una vez que el balón cruzó, la línea central hace de defensor extra, porque el ataque no puede volver a su zona de defensa. Es interpretación de BasketIQ a partir del principio de usar las líneas [S4]." },
                { h: "5.7 Anticipación y recuperación" },
                { p: "Cuando la presión se supera, la prioridad es el aro: el último defensor puede amagar hacia el balón, pero vuelve al aro; si corre directo al balón, un pase por encima termina en bandeja [S2]. El que peleó el rebote frena el pase de salida con los brazos abiertos, sin intentar robar [S2]." },
                { h: "5.8 Salidas de presión" },
                { p: "Contra la zona de presión, los jugadores sin balón se ubican como opuesto (a la altura del balón, del otro lado), diagonal (adelante, a un pase, del otro lado), mismo lado (a un pase) y largo (a unos dos pases) [S3]. Nadie se queda quieto: cada uno busca un hueco para recibir [S3]." },
                { board: "salida-caja" },
                { p: "Si el defensor del que saca va a doblar al receptor, el que sacó entra, recibe de vuelta y se aleja del doble; funciona mejor si el receptor recibe a dos o tres metros del fondo [S4]. Que saque el base puede confundir a una defensa preparada para presionarlo [S4]." },
                { board: "base-saca" }
            ]
        },
        {
            id: "responsabilidades",
            number: "6",
            title: "Responsabilidades",
            kind: "official",
            refs: ["S1"],
            blocks: [
                {
                    table: {
                        caption: "Roles de la presión individual en el saque [S1]",
                        head: ["Rol", "Qué hace"],
                        rows: [
                            ["Punta", "Defiende el balón"],
                            ["Tapón", "Presiona el saque; puede negar la devolución o presionar al que dribblea"],
                            ["Seguridad", "No pelea el rebote ofensivo y niega los pases hacia adelante"],
                            ["Ala de rebote", "Pelea el rebote ofensivo y después niega los pases hacia adelante"],
                            ["Aro", "Vuelve a defender el aro"]
                        ]
                    }
                },
                { p: "Los nombres en español son traducción de BasketIQ de los roles del manual." }
            ]
        },
        {
            id: "aplicacion",
            number: "7",
            title: "Aplicación en situaciones reales",
            kind: "official",
            refs: ["S1"],
            blocks: [
                {
                    list: [
                        "Después de un tanto, antes de un saque y durante los tiros libres, que son los momentos en que el manual ubica los roles [S1].",
                        "Contra un base poco seguro con su mano débil.",
                        "Para cambiar el ritmo de un partido o al final, cuando hace falta recuperar el balón.",
                        "Como sorpresa durante unas pocas posesiones."
                    ]
                }
            ]
        },
        {
            id: "ventajas",
            number: "8",
            title: "Ventajas",
            kind: "interpretation",
            refs: ["S1"],
            blocks: [{ list: ["Pérdidas y violaciones [S1].", "Menos tiempo para el ataque rival [S1].", "Desgaste físico y mental del rival.", "Exige actividad y comunicación propias."] }]
        },
        {
            id: "limitaciones",
            number: "9",
            title: "Limitaciones y riesgos",
            kind: "interpretation",
            refs: ["S2"],
            blocks: [
                {
                    list: [
                        "Cada doble deja a un atacante libre: un pase rápido lo encuentra.",
                        "Ventajas numéricas cerca del propio aro si la presión se supera [S2].",
                        "Faltas por manos bajas o por intentar robar en el doble.",
                        "Gran costo físico: hace falta rotar jugadores."
                    ]
                }
            ]
        },
        {
            id: "errores",
            number: "10",
            title: "Errores frecuentes",
            kind: "official",
            refs: ["S1", "S2"],
            blocks: [
                {
                    list: [
                        "Quedarse arriba de la línea del balón: no se puede ayudar ni recuperar [S1].",
                        "Dudar al ir al doble o dejar un hueco entre los dos defensores [S1].",
                        "Intentar robar en el doble con las manos bajas [S1].",
                        "Doblar desde atrás a un jugador encauzado: el doble llega desde adelante [S1].",
                        "El último defensor corre al balón en lugar de proteger el aro [S2].",
                        "Adivinar en lugar de hablar en los cambios [S1]."
                    ]
                }
            ]
        },
        {
            id: "correcciones",
            number: "11",
            title: "Correcciones y consignas",
            kind: "method",
            refs: ["S1"],
            blocks: [
                {
                    table: {
                        caption: "Error, corrección y consigna",
                        head: ["Error", "Corrección", "Consigna"],
                        rows: [
                            ["Arriba del balón", "Correr hasta la línea del balón con cada pase", "«¡Línea!»"],
                            ["Doble tarde", "Arrancar cuando gira o levanta el dribbling", "«¡Ahora!»"],
                            ["Hueco en el doble", "Pies juntos con el compañero", "«¡Cerrá!»"],
                            ["Manos bajas", "Manos arriba, seguir el balón", "«¡Manos arriba!»"],
                            ["Último al balón", "Volver al aro y después mirar", "«¡Aro!»"]
                        ]
                    }
                },
                { p: "El manual insiste en que la clave es moverse temprano, no solamente ser rápido [S1]." }
            ]
        },
        {
            id: "metodologia",
            number: "12",
            title: "Metodología",
            kind: "official",
            refs: ["S1", "S3"],
            blocks: [
                {
                    ordered: true,
                    list: [
                        "**Ejercicios por partes** primero y después juego disputado [S1].",
                        "**1 contra 1**: girar y encauzar [S1].",
                        "**2 contra 2 a lo ancho de media cancha**: ayudar y recuperar, cambio [S1].",
                        "**3 contra 3 y 4 contra 4**: dobles, interceptores y ayudar al que ayudó [S1].",
                        "**5 contra 5** con roles en el saque [S1].",
                        "**Salida de presión**: cancha dividida en cinco áreas con un defensor en cada una, y después más defensores [S3]."
                    ]
                }
            ]
        },
        {
            id: "progresiones",
            number: "13",
            title: "Progresiones",
            kind: "method",
            refs: ["S1"],
            blocks: [
                {
                    table: {
                        head: ["Paso", "Situación", "Qué se agrega"],
                        rows: [
                            ["1", "1 contra 1 toda la cancha", "Girar y encauzar"],
                            ["2", "2 contra 2 a lo ancho", "Ayudar y recuperar; cambio"],
                            ["3", "3 contra 3", "Ayudar al que ayudó"],
                            ["4", "4 contra 4 con doble", "Interceptores y rotación"],
                            ["5", "5 contra 5 con roles", "Saque y recuperación"],
                            ["6", "5 contra 5 con presión y salida", "Decidir cuándo soltar la presión"]
                        ]
                    }
                }
            ]
        },
        {
            id: "adaptaciones",
            number: "15",
            title: "Adaptaciones según categoría",
            kind: "method",
            blocks: [
                { p: "En las páginas WABC que pudimos leer no encontramos una recomendación de edad para la presión. Proponemos:" },
                {
                    table: {
                        caption: "Propuesta de BasketIQ por etapa (no es una norma oficial)",
                        head: ["Categoría", "Contenido"],
                        rows: [
                            ["Minibásquet", "Presión individual 1 contra 1 sin dobles; salir de la presión con pases cortos"],
                            ["U13 y U15", "Girar, encauzar, ayudar y recuperar; salida con los cuatro lugares"],
                            ["U17 en adelante", "Dobles y rotaciones, zonas de presión, presión de media cancha"]
                        ]
                    }
                },
                { p: "Antes de usar una presión zonal en formativas, revisá el reglamento de tu competencia: algunas limitan las defensas zonales." }
            ]
        },
        {
            id: "variantes",
            number: "+",
            title: "Variantes y alternativas tácticas",
            kind: "variant",
            refs: ["S4"],
            blocks: [
                {
                    list: [
                        "**Salto y cambio**: el defensor de la línea media salta sobre el base que dribblea y su compañero rota [S4].",
                        "**Ayudar y recuperar** en lugar de doblar, para presionar con menos riesgo [S4].",
                        "**Presión de tres cuartos**: la defensa espera pasada la línea de tres de la zona de defensa rival.",
                        "**1-2-1-1 o 3-1-1**: otras zonas de presión, con el mismo criterio de dejar libre al atacante más lejano."
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
            refs: ["S1", "S3"],
            blocks: [{ p: "Tres ejercicios: dos de defensa basados en las progresiones del manual WABC [S1] y uno de salida de presión basado en la práctica por áreas [S3]." }]
        }
    ];

    var exercises = [
        {
            id: "ej-girar-encauzar",
            name: "Girar, encauzar y doblar 2 contra 2",
            meta: {
                fundamento: "Presión",
                objetivo: "Defensa del balón",
                categories: ["U13", "U15", "U17", "Primera"],
                level: "Inicial",
                minPlayers: 4,
                maxPlayers: 12,
                minutes: [8, 12],
                court: "full",
                hoops: 1,
                materials: ["Balones"],
                optionalMaterials: ["Conos"],
                blockType: "tecnica"
            },
            adaptations: [
                {
                    id: "uno-contra-uno",
                    label: "1 contra 1 a lo largo de media cancha",
                    text: "Solo girar y encauzar: el defensor lleva al atacante por la banda desde la línea de fondo hasta la línea central. Cambian de rol en cada repetición.",
                    req: { minPlayers: 2, court: "half" }
                }
            ],
            kind: "method",
            refs: ["S1"],
            board: "girar-encauzar-doblar",
            objective: "Hacer girar al que dribblea, encauzarlo por la banda y doblarlo desde adelante.",
            secondary: ["Distancia de un brazo", "Hombro con hombro", "Doble sin hueco y con manos altas"],
            category: "U13 en adelante",
            level: "Inicial",
            players: "4 (2 contra 2); hasta 12 con rotación",
            playersShort: "4 a 12 jugadores",
            duration: "8 a 12 minutos",
            space: "Media cancha de ancho, a lo largo de toda la cancha",
            hoops: "1",
            materials: "1 balón por grupo; conos para marcar el carril",
            organization: "Dos atacantes y dos defensores en la mitad de la cancha a lo ancho. El atacante con balón sale desde la línea de fondo.",
            development: "X1 hace girar al que dribblea y lo encauza por la banda. El compañero ayuda y recupera, cambia o dobla desde adelante cuando el atacante gira o levanta el dribbling [S1].",
            rules: ["Sin contacto del defensor del balón", "El doble solo desde adelante del balón", "Si el ataque pasa la mitad, sale con un pase"],
            cues: ["«¡Cabeza en el balón!»", "«¡Hombro!»", "«¡Ahora!»", "«¡Manos arriba!»"],
            errors: ["Empujar o tocar al que dribblea", "Doblar desde atrás", "Intentar robar en el doble"],
            corrections: ["Brazo extendido como medida", "Marcar con un cono el punto del doble", "Manos arriba durante tres segundos"],
            variants: ["Ayudar y recuperar sin doble", "Cambio con voz «¡Cambio!»", "Atacante que puede pasar al compañero"],
            progressions: ["3 contra 3 con ayudar al que ayudó", "4 contra 4 con dos interceptores", "5 contra 5 con roles"],
            regressions: ["1 contra 1 caminando", "Sin doble", "Atacante con dribbling solo de la mano fuerte"],
            evaluation: ["Giros provocados", "Dobles desde adelante", "Faltas cometidas"],
            basis: "Progresiones y consignas del manual WABC de nivel 1 para la defensa individual a toda la cancha [S1]."
        },
        {
            id: "ej-cuatro-interceptores",
            name: "4 contra 4 con doble e interceptores",
            meta: {
                fundamento: "Presión",
                objetivo: "Rotaciones defensivas",
                categories: ["U15", "U17", "Primera"],
                level: "Avanzado",
                minPlayers: 8,
                maxPlayers: 12,
                minutes: [12, 15],
                court: "full",
                hoops: 1,
                materials: ["Balones"],
                optionalMaterials: [],
                blockType: "tactica"
            },
            adaptations: [
                {
                    id: "tres-contra-tres",
                    label: "3 contra 3 en media cancha a lo largo",
                    text: "Dos doblan y uno intercepta; si el pase sale, el que ve el pase lo toma y los otros dos ayudan al que ayudó.",
                    req: { minPlayers: 6, court: "half" }
                }
            ],
            kind: "method",
            refs: ["S1"],
            board: "girar-encauzar-doblar",
            objective: "Doblar y rotar según el pase, con dos interceptores.",
            secondary: ["El que ve el pase lo toma", "Volar con el balón", "Comunicación"],
            category: "U15 en adelante",
            level: "Avanzado",
            players: "8 (4 contra 4); hasta 12 con un quinto defensor y rotación",
            playersShort: "8 a 12 jugadores",
            duration: "12 a 15 minutos",
            space: "Cancha completa",
            hoops: "1",
            materials: "1 balón",
            organization: "Cuatro atacantes salen desde el fondo contra cuatro defensores. Con 9 o más, un quinto defensor cuida el aro y no participa de las rotaciones [S1].",
            development: "X1 y X2 doblan al balón; X3 y X4 interceptan. Cuando sale el pase, lo toma el defensor que lo ve y el resto se reacomoda en la línea del balón [S1]. El ataque tiene 8 segundos para cruzar la mitad.",
            rules: ["8 segundos para cruzar la mitad", "Robo o violación: punto para la defensa", "Falta en el doble: punto para el ataque"],
            cues: ["«¡Doble!»", "«¡Mío!» del que toma el pase", "«¡Línea!»"],
            errors: ["Dos defensores al mismo atacante después del pase", "Interceptores mirando solo el balón", "Doble que llega tarde"],
            corrections: ["Congelar y preguntar quién veía el pase", "Ubicar a los interceptores con un pie en la línea del balón", "Doblar solo al girar o al levantar el dribbling"],
            variants: ["Pase largo permitido solo por la banda", "Quinto defensor que puede entrar a doblar", "Doble obligado en la línea central"],
            progressions: ["5 contra 5", "Ataque con salida de cuatro lugares", "Reducir a 6 segundos"],
            regressions: ["3 contra 3", "Doble en un lugar fijo marcado", "Ataque sin dribbling"],
            evaluation: ["Pérdidas forzadas", "Rotaciones correctas", "Bandejas concedidas"],
            basis: "Rotación del 4 contra 4 con doble y el quinto defensor en el aro, según el manual WABC de nivel 1 [S1]. Las reglas de puntos son de BasketIQ."
        },
        {
            id: "ej-salida-cinco-areas",
            name: "Salida de presión por áreas",
            meta: {
                fundamento: "Salida de presión",
                objetivo: "Salida de presión",
                categories: ["U13", "U15", "U17", "Primera"],
                level: "Intermedio",
                minPlayers: 6,
                maxPlayers: 12,
                minutes: [10, 15],
                court: "full",
                hoops: 1,
                materials: ["Balones", "Conos"],
                optionalMaterials: [],
                blockType: "tactica"
            },
            adaptations: [
                {
                    id: "tres-atacantes",
                    label: "3 atacantes y 1 defensor en media cancha",
                    text: "Saque desde la línea central: los tres ocupan opuesto, diagonal y mismo lado contra un defensor que cambia de área.",
                    req: { minPlayers: 4, court: "half" }
                }
            ],
            kind: "method",
            refs: ["S3"],
            board: "salida-caja",
            objective: "Ocupar los lugares opuesto, diagonal, mismo lado y largo y recibir en los huecos.",
            secondary: ["Cortes hacia el balón", "Bloqueos para liberar al 1 o al 2", "Saque del base"],
            category: "U13 en adelante",
            level: "Intermedio",
            players: "5 atacantes y 1 defensor como mínimo; hasta 12",
            playersShort: "6 a 12 jugadores",
            duration: "10 a 15 minutos",
            space: "Cancha completa dividida en cinco áreas",
            hoops: "1",
            materials: "Conos para marcar las cinco áreas; 1 balón",
            organization: "La cancha se divide en cinco áreas con un defensor en cada una [S3]. El ataque empieza en caja.",
            development: "El ataque sale de la caja hacia los cuatro lugares y avanza con pases. Se agregan defensores para aumentar la presión [S3].",
            rules: ["Cada atacante en un hueco, nunca quieto", "Máximo dos dribblings por jugador", "Al pasar la mitad, terminar en 3 contra 2"],
            cues: ["«¡Opuesto, diagonal, lado, largo!»", "«¡Al hueco!»", "«¡Mirá al medio!»"],
            errors: ["Recibir parado detrás de un defensor", "Todos lejos del balón", "Dribblear hacia la trampa"],
            corrections: ["Cortar hacia el balón", "Nombrar el lugar de cada uno antes del saque", "Pasar antes de que llegue el doble"],
            variants: ["Saque del base [S4]", "Defensa que dobla en la banda", "Un defensor más por área"],
            progressions: ["Cinco defensores libres", "Defensa 2-2-1", "Presión individual con dobles"],
            regressions: ["Defensores pasivos", "Sin dribbling", "Cuatro atacantes contra dos defensores"],
            evaluation: ["Salidas limpias de cada diez", "Pérdidas", "Tiempo hasta cruzar la mitad"],
            basis: "Lugares y práctica por áreas del manual WABC de nivel 1 [S3]. Las reglas de dribbling y la continuidad son de BasketIQ."
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
                        "Todos llegan a la línea del balón con cada pase",
                        "El defensor del balón hace girar y encauza sin contacto",
                        "Los dobles llegan a tiempo, sin hueco y con las manos altas",
                        "Los interceptores toman al jugador del pase que ven",
                        "Siempre hay un defensor cuidando el aro",
                        "En la salida de presión, cada atacante ocupa un lugar y recibe en un hueco"
                    ]
                },
                {
                    table: {
                        caption: "Indicadores",
                        head: ["Indicador", "Cómo medirlo"],
                        rows: [
                            ["Pérdidas forzadas", "Por cada diez posesiones de presión"],
                            ["Bandejas concedidas", "Contar las que llegan tras superar la presión"],
                            ["Tiempo del rival hasta cruzar", "Segundos desde el saque"]
                        ]
                    }
                }
            ]
        },
        {
            id: "evaluar-preguntas",
            title: "Autoevaluación",
            kind: "method",
            refs: ["S1", "S2", "S3", "S4"],
            blocks: [
                { qa: "¿Desde dónde sale la ayuda en la presión individual?", answer: ["Desde debajo de la línea del balón [S1]."] },
                { qa: "¿Cuándo conviene doblar?", answer: ["Cuando el que dribblea gira, sobre todo con un reverso sin ver, o cuando levanta el dribbling; si fue encauzado, desde adelante [S1]."] },
                { qa: "¿Qué hace el último defensor si la presión se supera?", answer: ["Protege primero el aro; puede amagar hacia el balón, pero no corre directo hacia él [S2]."] },
                { qa: "¿Cuáles son los cuatro lugares para salir de una zona de presión?", answer: ["Opuesto, diagonal, mismo lado y largo [S3]."] },
                { qa: "¿Por qué las trampas en la banda y el fondo son más efectivas?", answer: ["Porque cada línea funciona como un defensor más [S4]."] }
            ]
        }
    ];

    // ------------------------------------------------------------------
    // Simulador de presión
    // ------------------------------------------------------------------
    var SIM = {
        id: "sim-presion",
        title: "Simulador de presión",
        intro: "Elegí el tipo de presión y recorré el saque, la recepción, la trampa, la rotación y la salida. Las posiciones son plausibles, no las únicas posibles.",
        view: VIEW,
        tags: ["Presión", "Academy"],
        ui: {
            variants: "Tipo de presión",
            positions: "Momento",
            hint: "Elegí la presión arriba y recorré los momentos. Tocá un defensor para ver qué hace.",
            resp: "Qué hace cada defensor",
            help: "Por qué",
            vulnerable: "Lo que deja libre",
            options: "Opciones del ataque",
            disclaimer: "Es una reacción plausible de la defensa y del ataque, no la única: cambia con la velocidad, la distancia y la lectura de cada jugador.",
            noTarget: "Usá los botones de momento para avanzar."
        },
        players: team({
            o1: [0, 0], o2: [0, 0], o3: [0, 0], o4: [0, 0], o5: [0, 0],
            x1: [0, 0], x2: [0, 0], x3: [0, 0], x4: [0, 0], x5: [0, 0]
        }),
        positions: [
            { id: "saque", label: "Saque", group: "Momento" },
            { id: "recepcion", label: "Recepción", group: "Momento" },
            { id: "trampa", label: "Trampa", group: "Momento" },
            { id: "rotacion", label: "Rotación", group: "Momento" },
            { id: "salida", label: "Salida", group: "Momento" }
        ],
        tour: ["saque", "recepcion", "trampa", "rotacion", "salida"],
        variants: [
            {
                id: "individual",
                label: "Individual toda la cancha",
                kind: "official",
                refs: ["S1", "S2"],
                desc: "Cada defensor con su jugador, en la línea del balón. Doble desde adelante después de encauzar; dos interceptores y uno en el aro [S1].",
                states: {
                    saque: {
                        title: "Saque contra presión individual",
                        note: "X4 presiona el saque en ángulo para empujar el pase hacia un lado. X1 está con el base y los demás niegan o protegen el aro [S1].",
                        ball: "o4",
                        pos: {
                            o4: [27.9, 9.5], o1: [22.0, 10.5], o2: [21.6, 5.0], o3: [14.5, 3.5], o5: [15.0, 11.5],
                            x4: [26.9, 8.4], x1: [21.0, 10.0], x2: [20.6, 5.4], x3: [13.6, 4.4], x5: [13.4, 10.2]
                        },
                        resp: {
                            x1: "Con el base, del lado del medio.",
                            x2: "Niega el pase al 2.",
                            x3: "Niega el pase hacia adelante.",
                            x4: "Presiona el saque en ángulo para llevarlo a un lado [S1].",
                            x5: "Entre el 5 y el aro: el último en volver."
                        },
                        help: "Los roles del saque buscan que el balón entre hacia un lado elegido por la defensa [S1]."
                    },
                    recepcion: {
                        title: "Recepción del base",
                        note: "El 1 recibe cerca del fondo. X1 se pone delante para cortar el dribbling directo, X4 baja debajo de la línea del balón [S1][S4].",
                        ball: "o1",
                        pos: {
                            o4: [26.0, 6.2], o1: [24.8, 11.8], o2: [20.6, 4.4], o3: [13.0, 4.0], o5: [19.0, 12.8],
                            x4: [23.2, 8.2], x1: [23.6, 11.4], x2: [19.8, 5.4], x3: [12.6, 5.4], x5: [18.4, 11.8]
                        },
                        resp: {
                            x1: "Delante del 1: bloquea el dribbling directo hacia adelante [S4].",
                            x2: "En la línea de pase hacia el 2.",
                            x3: "Lejos: listo para el pase largo.",
                            x4: "Debajo de la línea del balón [S1].",
                            x5: "Niega el pase por la línea al 5."
                        },
                        help: "Todos ven balón y jugador, y la ayuda sale desde debajo de la línea del balón [S1].",
                        options: [["pass", "o1", "o4"], ["dribble", "o1", [22.0, 13.4]]],
                        optionsText: ["Pase atrás al 4.", "Dribbling por la banda, hacia donde lo lleva X1."]
                    },
                    trampa: {
                        title: "Doble desde adelante",
                        note: "X1 encauzó al 1 por la banda. X5 deja al 5 y dobla desde adelante. X2 y X4 interceptan; X3 cuida el aro [S1].",
                        ball: "o1",
                        moves: { o1: "dribble" },
                        pos: {
                            o4: [24.0, 7.5], o1: [19.5, 13.6], o2: [18.5, 4.0], o3: [11.0, 3.5], o5: [16.6, 11.2],
                            x4: [21.6, 9.2], x1: [19.9, 12.4], x5: [18.4, 13.6], x2: [17.6, 8.0], x3: [5.0, 7.0]
                        },
                        resp: {
                            x1: "Encauzó por la banda y cierra el doble desde atrás.",
                            x2: "Interceptor: entre el 2 y el 5.",
                            x3: "Cuida el aro; no entra en las rotaciones [S1].",
                            x4: "Interceptor: corta el pase de vuelta al 4.",
                            x5: "Dobla desde adelante, sin hueco y con las manos altas [S1]."
                        },
                        help: "El doble llega desde adelante del balón después de encauzar [S1]. La banda hace de defensor extra [S4].",
                        options: [["pass", "o1", "o5"], ["pass", "o1", "o4"], ["pass", "o1", "o2"]],
                        optionsText: ["Pase corto al 5, que quedó sin marca.", "Pase atrás al 4, con X4 cerca.", "Pase cruzado al 2: largo y con riesgo."],
                        vulnerable: [{ x: 15.6, y: 10.2, w: 2.2, h: 2.2, label: "5 libre", text: "X5 dejó al 5 para doblar." }]
                    },
                    rotacion: {
                        title: "Rotación: el que ve el pase lo toma",
                        note: "El balón salió al 5. X2, que veía el pase, lo toma; X5 vuelve hacia el 2 y X1 recupera a la línea del balón [S1].",
                        ball: "o5",
                        pos: {
                            o4: [24.0, 7.5], o1: [19.5, 13.6], o2: [18.5, 4.0], o3: [11.0, 3.5], o5: [16.6, 11.2],
                            x2: [15.6, 10.4], x5: [17.2, 6.0], x1: [18.0, 11.6], x4: [21.0, 8.8], x3: [5.0, 7.0]
                        },
                        resp: {
                            x1: "Recupera hacia la línea del balón.",
                            x2: "Toma al 5: era quien veía el pase [S1].",
                            x3: "Sigue en el aro.",
                            x4: "Se acerca a la línea del balón.",
                            x5: "Ayuda al que ayudó: va hacia el 2 [S1]."
                        },
                        help: "Con cada pase, el que ve el pase toma al receptor y el resto se reacomoda [S1].",
                        options: [["pass", "o5", "o2"], ["dribble", "o5", [12.4, 9.6]]],
                        optionsText: ["Pase al 2 si X5 no llega.", "Atacar por el medio antes de que la defensa se ordene."]
                    },
                    salida: {
                        title: "La presión se superó: aro antes que balón",
                        note: "El 5 cruzó la mitad. X3 protege el aro en lugar de correr al balón; los demás vuelven por el camino más corto [S2].",
                        ball: "o5",
                        moves: { o5: "dribble" },
                        pos: {
                            o4: [18.0, 7.5], o1: [15.5, 12.8], o2: [12.4, 3.4], o3: [7.0, 3.0], o5: [11.8, 9.4],
                            x3: [4.4, 6.6], x2: [10.6, 8.6], x5: [10.4, 4.6], x1: [13.6, 11.6], x4: [16.6, 8.0]
                        },
                        resp: {
                            x1: "Vuelve por el carril de la banda.",
                            x2: "Frena al balón retrocediendo.",
                            x3: "Protege el aro: no corre al balón [S2].",
                            x4: "Vuelve por el medio.",
                            x5: "Corre a la línea del pase al 2."
                        },
                        help: "Si el último defensor corre directo al balón, un pase por encima termina en bandeja [S2].",
                        options: [["pass", "o5", "o3"], ["pass", "o5", "o2"]],
                        optionsText: ["Pase al 3, ya cerca del aro.", "Pase al 2 en el ala."]
                    }
                }
            },
            {
                id: "zona221",
                label: "Zona 2-2-1",
                kind: "interpretation",
                desc: "Dos adelante, dos en la mitad y uno atrás. Dejan entrar el saque, llevan el balón a la banda y atrapan con la segunda línea. Interpretación de BasketIQ: no pudimos leer el apartado WABC sobre la 2-2-1.",
                states: {
                    saque: {
                        title: "Saque contra la 2-2-1",
                        note: "La primera línea deja el saque. La segunda línea espera en la mitad y X5 cuida el aro.",
                        ball: "o4",
                        pos: {
                            o4: [27.9, 9.5], o1: [24.5, 11.6], o2: [20.0, 3.6], o3: [12.0, 3.0], o5: [13.0, 12.6],
                            x1: [22.0, 5.6], x2: [22.0, 9.4], x3: [15.5, 3.6], x4: [15.5, 11.4], x5: [7.5, 7.5]
                        },
                        resp: {
                            x1: "Primera línea, lado derecho: no niega el saque.",
                            x2: "Primera línea, lado izquierdo.",
                            x3: "Segunda línea, cerca de la banda derecha.",
                            x4: "Segunda línea, cerca de la banda izquierda.",
                            x5: "Último: protege el aro y el pase largo."
                        },
                        help: "La 2-2-1 no busca negar el saque: prefiere elegir dónde atrapar."
                    },
                    recepcion: {
                        title: "Llevar el balón a la banda",
                        note: "El 1 recibe y X2 se ubica entre él y el medio. X1 cierra el pase al medio.",
                        ball: "o1",
                        pos: {
                            o4: [22.5, 8.0], o1: [24.5, 11.6], o2: [20.0, 3.6], o3: [12.0, 3.0], o5: [13.0, 12.6],
                            x1: [21.4, 7.6], x2: [23.0, 10.6], x3: [15.5, 3.8], x4: [15.8, 11.4], x5: [7.5, 7.5]
                        },
                        resp: {
                            x1: "Corta el pase al medio.",
                            x2: "Contiene al 1 del lado del medio y lo lleva a la banda.",
                            x3: "Espera en la segunda línea.",
                            x4: "Espera el dribbling por la banda.",
                            x5: "Protege el aro."
                        },
                        help: "Llevar el balón a la banda prepara la trampa: la línea lateral funciona como un defensor más [S4].",
                        options: [["pass", "o1", "o4"], ["dribble", "o1", [17.6, 13.4]]],
                        optionsText: ["Pase al 4 en el medio, antes de que X1 cierre.", "Dribbling por la banda: hacia la trampa."]
                    },
                    trampa: {
                        title: "Trampa en la banda",
                        note: "X4 sale a cerrarle adelante y X2 llega por detrás. X1, X3 y X5 cubren los pases cercanos.",
                        ball: "o1",
                        moves: { o1: "dribble" },
                        pos: {
                            o4: [22.5, 8.0], o1: [17.6, 13.4], o2: [17.5, 5.6], o3: [11.0, 4.0], o5: [13.0, 12.6],
                            x2: [18.4, 12.5], x4: [16.6, 13.0], x1: [19.6, 8.8], x3: [14.2, 9.0], x5: [9.0, 10.4]
                        },
                        resp: {
                            x1: "Corta el pase atrás y al medio.",
                            x2: "Cierra la trampa desde atrás.",
                            x3: "Se mete en la línea media: corta el pase al 2.",
                            x4: "Cierra la trampa desde adelante.",
                            x5: "Se corre al lado del balón: cuida el pase por la línea."
                        },
                        help: "Tres defensores cubren cuatro atacantes: la defensa elige dejar libre al más lejano.",
                        options: [["pass", "o1", "o4"], ["pass", "o1", "o2"], ["pass", "o1", "o5"]],
                        optionsText: ["Pase atrás al 4, con X1 cerca.", "Pase al medio al 2, con X3 al acecho.", "Pase por la línea al 5, con X5 llegando."],
                        vulnerable: [{ x: 9.0, y: 1.0, w: 3.6, h: 4.0, label: "Lado débil", text: "El 3 está lejos de todos." }]
                    },
                    rotacion: {
                        title: "Rotación tras el pase atrás",
                        note: "El 1 encontró al 4. X1 sale a él, X2 deja la trampa para cerrar el medio y la segunda línea vuelve a su lugar.",
                        ball: "o4",
                        pos: {
                            o4: [22.5, 8.0], o1: [17.6, 13.4], o2: [17.5, 5.6], o3: [11.0, 4.0], o5: [13.0, 12.6],
                            x1: [21.4, 7.8], x2: [20.0, 10.4], x4: [15.6, 11.0], x3: [15.2, 4.6], x5: [8.0, 7.5]
                        },
                        resp: {
                            x1: "Sale al 4.",
                            x2: "Deja la trampa y cierra el medio.",
                            x3: "Vuelve a la segunda línea del lado del 2.",
                            x4: "Vuelve a la segunda línea.",
                            x5: "Vuelve al centro, delante del aro."
                        },
                        help: "El pase atrás obliga a la zona a moverse de nuevo: cada rotación es una oportunidad para el ataque.",
                        options: [["pass", "o4", "o2"], ["dribble", "o4", [18.8, 7.6]]],
                        optionsText: ["Invertir al 2 del lado débil.", "Atacar el medio con dribbling."]
                    },
                    salida: {
                        title: "Salida por el medio",
                        note: "El 2 recibe en el medio, en la mitad de la cancha. X3 sale a frenarlo y queda un 2 contra 1 contra X5.",
                        ball: "o2",
                        pos: {
                            o4: [20.6, 6.0], o1: [16.5, 13.4], o2: [15.0, 7.6], o3: [10.5, 3.0], o5: [11.0, 12.8],
                            x3: [14.0, 6.6], x4: [14.6, 10.6], x5: [7.5, 7.5], x1: [19.5, 8.6], x2: [19.0, 11.6]
                        },
                        resp: {
                            x1: "Vuelve.",
                            x2: "Vuelve.",
                            x3: "Frena al balón en el medio.",
                            x4: "Se cierra hacia el medio.",
                            x5: "Solo contra dos: protege el aro [S2]."
                        },
                        help: "Recibir en el medio, más allá de la primera línea, es la forma más directa de dejar atrás una zona de presión.",
                        options: [["pass", "o2", "o3"], ["pass", "o2", "o5"]],
                        optionsText: ["Pase al 3: 2 contra 1 contra X5.", "Pase al 5 del otro lado."]
                    }
                }
            },
            {
                id: "mediacancha",
                label: "Media cancha con trampa",
                kind: "interpretation",
                desc: "La defensa espera en la mitad de la cancha y atrapa en la esquina que forman la banda y la línea central. Interpretación de BasketIQ a partir del principio de usar las líneas [S4].",
                refs: ["S4"],
                states: {
                    saque: {
                        title: "La defensa espera en la mitad",
                        note: "El saque entra sin oposición. Los defensores esperan cerca de la línea central.",
                        ball: "o4",
                        pos: {
                            o4: [27.9, 9.5], o1: [25.0, 10.5], o2: [20.0, 4.0], o3: [9.0, 1.6], o5: [8.5, 12.6],
                            x1: [13.0, 8.5], x2: [13.0, 4.0], x3: [10.0, 11.8], x4: [8.0, 3.0], x5: [4.0, 7.5]
                        },
                        resp: {
                            x1: "Espera al balón en la línea central.",
                            x2: "Espera del lado derecho.",
                            x3: "Del lado izquierdo, adelante del 5.",
                            x4: "Con el 3, del lado derecho.",
                            x5: "En el aro."
                        },
                        help: "Presionar más cerca del aro propio reduce los pases largos a la espalda de la defensa."
                    },
                    recepcion: {
                        title: "Encauzar en la mitad",
                        note: "El 1 sube y X1 lo recibe en la línea central, llevándolo hacia la banda izquierda.",
                        ball: "o1",
                        moves: { o1: "dribble" },
                        pos: {
                            o4: [22.0, 8.0], o1: [17.0, 11.5], o2: [16.5, 4.5], o3: [9.0, 1.6], o5: [8.5, 12.6],
                            x1: [15.0, 10.6], x2: [14.2, 5.5], x3: [10.2, 11.6], x4: [8.0, 3.2], x5: [4.2, 7.5]
                        },
                        resp: {
                            x1: "Lleva al 1 hacia la banda.",
                            x2: "Niega el pase al 2.",
                            x3: "Espera para atrapar adelante.",
                            x4: "Con el 3.",
                            x5: "En el aro."
                        },
                        help: "El objetivo es que el balón cruce por la banda, donde se puede atrapar.",
                        options: [["pass", "o1", "o2"], ["dribble", "o1", [13.2, 13.4]]],
                        optionsText: ["Pase al 2 antes de cruzar.", "Cruzar por la banda: hacia la trampa."]
                    },
                    trampa: {
                        title: "Trampa en la esquina de la mitad",
                        note: "El 1 cruzó por la banda. X3 sale a cerrarle adelante y X1 viene detrás. La banda y la línea central encierran al 1: no puede volver hacia atrás.",
                        ball: "o1",
                        moves: { o1: "dribble" },
                        pos: {
                            o4: [18.0, 8.0], o1: [13.2, 13.4], o2: [13.2, 4.2], o3: [8.6, 1.6], o5: [8.5, 12.6],
                            x1: [14.0, 12.4], x3: [12.3, 13.2], x2: [12.0, 8.0], x4: [8.0, 4.0], x5: [6.5, 10.0]
                        },
                        resp: {
                            x1: "Cierra la trampa desde atrás.",
                            x2: "Interceptor en el medio.",
                            x3: "Cierra la trampa desde adelante.",
                            x4: "Cuida al 3 y el lado débil.",
                            x5: "Se corre hacia el 5 y cuida el aro."
                        },
                        help: "Una vez que el balón cruzó, la línea central funciona como un defensor más, porque el ataque no puede volver a su zona de defensa. Lo mismo que el manual dice de la banda y el fondo [S4].",
                        options: [["pass", "o1", "o5"], ["pass", "o1", "o2"]],
                        optionsText: ["Pase por la línea al 5, con X5 llegando.", "Pase cruzado al 2: largo, X2 puede cortarlo."],
                        vulnerable: [{ x: 7.0, y: 11.4, w: 2.6, h: 2.4, label: "5", text: "El más cercano a la trampa sin defensor encima." }]
                    },
                    rotacion: {
                        title: "Rotación tras el pase cruzado",
                        note: "El balón llegó al 2. X2 sale a él y X4 se corre para cubrir al 3 y el aro.",
                        ball: "o2",
                        pos: {
                            o4: [18.0, 8.0], o1: [13.2, 13.4], o2: [13.0, 3.6], o3: [8.6, 1.6], o5: [8.5, 12.6],
                            x2: [12.0, 4.4], x4: [9.0, 3.2], x5: [5.0, 7.0], x1: [13.0, 10.6], x3: [10.0, 11.6]
                        },
                        resp: {
                            x1: "Deja la trampa y vuelve al medio.",
                            x2: "Cierra al 2.",
                            x3: "Vuelve con el 5.",
                            x4: "Entre el 3 y el aro.",
                            x5: "En el aro."
                        },
                        help: "El pase cruzado es largo: si X2 lo lee, lo intercepta; si no, la defensa queda corriendo.",
                        options: [["dribble", "o2", [8.5, 5.0]], ["pass", "o2", "o3"]],
                        optionsText: ["Atacar el cierre.", "Pase al 3 en la esquina."]
                    },
                    salida: {
                        title: "Ataque contra la defensa en movimiento",
                        note: "El 2 ataca y X4 sale a frenarlo. El 3 queda en la esquina.",
                        ball: "o2",
                        moves: { o2: "dribble" },
                        pos: {
                            o4: [12.5, 8.0], o1: [12.0, 13.0], o2: [8.5, 5.0], o3: [6.0, 1.2], o5: [7.0, 13.0],
                            x4: [7.4, 4.4], x5: [4.6, 8.0], x3: [8.8, 10.2], x1: [11.5, 9.0], x2: [10.0, 5.8]
                        },
                        resp: {
                            x1: "Vuelve a su lugar.",
                            x2: "Persigue al 2.",
                            x3: "Con el 5.",
                            x4: "Frena al 2 y deja al 3.",
                            x5: "Protege el aro."
                        },
                        help: "Superada la trampa, la defensa queda desordenada: el ataque tiene unos segundos de ventaja.",
                        options: [["pass", "o2", "o3"], ["dribble", "o2", [3.4, 6.0]]],
                        optionsText: ["Pase a la esquina.", "Seguir al aro si X5 no sale."]
                    }
                }
            }
        ]
    };

    return {
        id: "presion",
        sectionId: "fullcourt",
        title: "Presión y salidas de presión",
        subtitle: "Presión individual a toda la cancha, dobles, zona 2-2-1, media cancha y cómo salir de la presión, con fuentes WABC.",
        sectionLabel: "Presión",
        playCategory: "Presión",
        meta: ["Defensa", "Cancha completa", "5 pizarras animadas", "Simulador de presión", "3 ejercicios"],
        updated: "2026-11-26",
        tabs: {
            aprender: aprender,
            visualizar: ["roles-saque", "girar-encauzar-doblar", "zona-221", "salida-caja", "base-saca"],
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
