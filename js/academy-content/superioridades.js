/*
 * Basket Lab Academy · Superioridades numéricas (2 contra 1, 3 contra 2, 4 contra 3)
 *
 * Contenido redactado en español por BasketIQ. Las citas [S1]..[S3] remiten a la
 * bibliografía del final, consultada directamente.
 *
 * Coordenadas: metros sobre la cancha FIBA, vista de media cancha con el aro arriba.
 * x = distancia a la línea de fondo (aro en x = 1,575; mitad de cancha en x = 14).
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
    var HOOP = [1.575, 7.5];

    function D(label, x, y) { return { team: "defense", label: label, x: x, y: y }; }
    function O(label, x, y) { return { team: "offense", label: label, x: x, y: y }; }
    function merge() {
        var o = {};
        Array.prototype.forEach.call(arguments, function (a) { Object.keys(a || {}).forEach(function (k) { o[k] = a[k]; }); });
        return o;
    }

    var boards = [
        {
            id: "dos-contra-uno",
            title: "2 contra 1: atacar el aro y leer al defensor",
            kind: "official",
            refs: ["S1"],
            intro: "El jugador con balón ataca primero el aro y deja que el defensor decida. Si el defensor cierra el camino al aro, pasa; si no lo cierra, sigue hasta el aro [S1].",
            spec: {
                view: VIEW,
                players: { o1: O("1", 11.5, 6.2), o2: O("2", 11.0, 11.0), x1: D("1", 5.0, 7.8) },
                phases: [
                    {
                        name: "Llegada",
                        note: "El 1 avanza con dribbling por el camino directo al aro. El 2 corre por su carril, abierto y a la misma altura.",
                        ball: "o1",
                        strokes: [
                            ["dribble", "o1", [6.6, 6.6]],
                            ["move", "o2", [6.8, 10.6]],
                            ["rotation", "x1", [5.6, 7.0]]
                        ]
                    },
                    {
                        name: "El defensor cierra el aro",
                        note: "X1 se comprometió con el balón: el camino al aro está defendido. Pase al 2, que corre hacia el aro y no hacia el costado del tablero [S1].",
                        strokes: [
                            ["pass", "o1", "o2"],
                            ["cut", "o2", [3.6, 9.4], 0.3]
                        ]
                    },
                    {
                        name: "Bandeja",
                        note: "El 2 recibe camino al aro. El manual destaca que hay que poder pasar con las dos manos para tener el mejor ángulo de pase [S1].",
                        strokes: [["shot", "o2", HOOP]]
                    },
                    {
                        name: "La otra lectura",
                        note: "Si X1 se hubiera quedado en la línea de pase, el camino al aro estaba libre: el 1 seguía con dribbling hasta la bandeja. El defensor intenta justamente que el atacante crea que eligió un carril y después hacer lo otro [S1]."
                    }
                ]
            }
        },
        {
            id: "tres-contra-dos",
            title: "3 contra 2: el primer defensor no sale y el pase de vuelta",
            kind: "official",
            refs: ["S2"],
            intro: "Contra dos defensores en «I», uno arriba de la línea de libres y otro delante del aro. Si el de arriba no sale al balón, el pase al ala obliga al de abajo a salir de la zona [S2].",
            spec: {
                view: VIEW,
                players: {
                    o1: O("1", 10.6, 7.5), o2: O("2", 10.0, 2.2), o3: O("3", 10.0, 12.8),
                    x1: D("1", 6.4, 7.5), x2: D("2", 2.6, 7.5)
                },
                phases: [
                    {
                        name: "Defensa en I",
                        note: "X1 arriba de la línea de libres y X2 delante del aro. El 1 avanza por el centro y los aleros abren los carriles.",
                        ball: "o1",
                        strokes: [
                            ["dribble", "o1", [7.8, 7.3]],
                            ["move", "o2", [7.0, 2.4]],
                            ["move", "o3", [7.0, 12.6]],
                            ["rotation", "x1", [5.8, 7.5]]
                        ]
                    },
                    {
                        name: "Pase al ala",
                        note: "X1 no salió al balón. El 1 pasa al ala; X2 tiene que dejar la zona para tomar al 2. El 3 ataca el aro y el 1 va al codo del lado del balón [S2].",
                        strokes: [
                            ["pass", "o1", "o2"],
                            ["rotation", "x2", [4.6, 3.4]],
                            ["cut", "o3", [3.4, 10.6], 0.3],
                            ["move", "o1", [6.0, 5.6]],
                            ["rotation", "x1", [3.6, 9.2]]
                        ]
                    },
                    {
                        name: "El pase que más se olvida",
                        note: "X1 bajó hacia el aro y cortó el pase al 3. El que quedó libre es el 1, en el codo. Según el manual, el error más común es no devolverle el balón al base [S2].",
                        strokes: [["pass", "o2", "o1"]]
                    },
                    {
                        name: "Tiro o penetración del 1",
                        note: "El 1 tiene que ser una amenaza: tira o penetra antes de que X2 recupere [S2]."
                    }
                ]
            }
        },
        {
            id: "cuatro-contra-tres",
            title: "4 contra 3: el que llega último",
            kind: "interpretation",
            intro: "Con tres defensores en triángulo, el cuarto atacante que llega desde atrás (trailer) suele ser el que queda libre después de dos pases.",
            spec: {
                view: VIEW,
                players: {
                    o1: O("1", 10.6, 7.5), o2: O("2", 9.8, 2.0), o3: O("3", 9.8, 13.0), o4: O("4", 12.8, 9.0),
                    x1: D("1", 6.6, 7.5), x2: D("2", 2.6, 5.8), x3: D("3", 2.6, 9.2)
                },
                phases: [
                    {
                        name: "Llegada",
                        note: "Tres atacantes llegan arriba y el 4 viene atrás. La defensa forma un triángulo: uno arriba y dos cerca del aro.",
                        ball: "o1",
                        strokes: [
                            ["dribble", "o1", [7.8, 7.3]],
                            ["move", "o2", [6.6, 2.0]],
                            ["move", "o3", [6.6, 13.0]],
                            ["move", "o4", [10.4, 8.6]],
                            ["rotation", "x1", [7.0, 7.4]]
                        ]
                    },
                    {
                        name: "Pase al ala",
                        note: "X2 sale al ala, X3 se corre al lado del balón y X1 baja a proteger el aro. Nadie quedó arriba.",
                        strokes: [
                            ["pass", "o1", "o2"],
                            ["rotation", "x2", [5.0, 2.6]],
                            ["rotation", "x3", [2.6, 6.6]],
                            ["rotation", "x1", [4.2, 8.2]],
                            ["move", "o4", [8.6, 7.4]],
                            ["cut", "o3", [3.6, 11.6], 0.3]
                        ]
                    },
                    {
                        name: "El trailer",
                        note: "El 4 llegó arriba sin defensor. Tiro o penetración contra una recuperación larga.",
                        strokes: [["pass", "o2", "o4"]]
                    },
                    { name: "Lectura", note: "Si X1 sube a cerrarle, el 3 queda solo del lado débil. La defensa no puede cubrir a los cuatro: elige qué conceder." }
                ]
            },
            explain: [
                "No pudimos leer el apartado del manual WABC sobre cómo defender el 4 contra 3 (ver fuentes no disponibles). Esta secuencia es una interpretación técnica de BasketIQ."
            ]
        }
    ];

    var sources = [
        {
            id: "S1",
            title: "WABC Coaches Manual Level 1 · 2.3.4 Basic fast break: 2v1 fast break (Advantage / Disadvantage – 2x1)",
            publisher: "FIBA · World Association of Basketball Coaches (WABC)",
            locator: "Nivel 1, Team, 2 Offensive tactics and strategies, 2.3 Transition",
            url: "https://wabc.fiba.com/manual/level-1/l1-team/l1-2-offensive-tactics-and-strategies/2-3-transition/2-3-4-basic-fast-break-2v1-fast-break/",
            used: "Carril de penetración y carril de pase; atacar primero el aro y dejar que el defensor decida; correr hacia el aro y no hacia el costado; pasar con las dos manos; qué intenta hacer el defensor; errores habituales de los jóvenes; enseñar preguntando qué vio el jugador.",
            accessed: "26/11/2026"
        },
        {
            id: "S2",
            title: "WABC Coaches Manual Level 1 · 2.3.5 Basic fast break: 3v2 fast break (Advantage / Disadvantage – 3x2)",
            publisher: "FIBA · WABC",
            locator: "Nivel 1, Team, 2.3 Transition",
            url: "https://wabc.fiba.com/manual/level-1/l1-team/l1-2-offensive-tactics-and-strategies/2-3-transition/2-3-5-basic-fast-break-3v2-fast-break/",
            used: "La defensa en «I»; qué hacer si el primer defensor sale o no sale al balón; el pase al ala que obliga a salir al segundo defensor; el corte del alero contrario; el base al codo y el pase de vuelta, que es el error más común; aprender jugando con preguntas dirigidas.",
            accessed: "26/11/2026"
        },
        {
            id: "S3",
            title: "Official Basketball Rules 2024 (v1.0)",
            publisher: "FIBA. Vigente desde el 1 de octubre de 2024",
            locator: "Regla 2 (cancha)",
            url: "https://assets.fiba.basketball/image/upload/documents-corporate-fiba-official-rules-2024-v10.pdf",
            used: "Medidas de la cancha de las pizarras.",
            accessed: "26/11/2026"
        }
    ];

    var unavailableSources = [
        {
            title: "WABC Coaches Manual Level 1 · 1.4.1 Defending situations of disadvantage: 2v1 and 3v2",
            url: "https://wabc.fiba.com/manual/level-1/l1-team/l1-1-defensive-tactics-and-strategies/1-4-defending-situations-of-disadvantage/1-4-1-2v1-and-3v2/",
            reason: "El sitio no permitió la consulta automática. Lo que decimos sobre la defensa en inferioridad, fuera de lo citado de los apartados de ataque, es interpretación de BasketIQ."
        },
        {
            title: "WABC Coaches Manual Level 2 · 1.4.1 Defending 4v3",
            url: "https://wabc.fiba.com/manual/level-2/l2-team/1-defensive-tactics-and-strategies/1-4-defending-situations-of-disadvantage/1-4-1-defending-4v3/",
            reason: "No se pudo abrir. El 4 contra 3 de esta guía es interpretación de BasketIQ."
        },
        {
            title: "WABC Coaches Manual Level 1 · 2.3.7 Activities to practice fast break principles",
            url: "https://wabc.fiba.com/manual/level-1/l1-team/l1-2-offensive-tactics-and-strategies/2-3-transition/2-3-7-activities-to-practice-fast-break-principles/",
            reason: "No se pudo abrir. Los ejercicios de esta guía son propuestas de BasketIQ."
        }
    ];

    var aprender = [
        {
            id: "introduccion",
            number: "1",
            title: "Introducción",
            kind: "interpretation",
            blocks: [
                { p: "Una superioridad numérica aparece cuando el ataque llega con más jugadores que la defensa: después de un robo, de un rebote con salida rápida o de una presión superada. Son las situaciones más favorables del juego, y aun así se desperdician muchas por decidir antes de tiempo, por perder el espacio o por no castigar al defensor que se compromete." },
                { p: "Esta guía explica cómo leer el 2 contra 1, el 3 contra 2 y el 4 contra 3, qué consecuencias suele tener cada decisión y cómo entrenarlas. En **Simular** podés elegir la situación y la decisión del ataque y ver una consecuencia plausible." },
                {
                    callout: "Las consecuencias que mostramos son plausibles, no garantizadas: dependen de la velocidad, de la distancia y de lo que haga cada defensor. La idea es entender la lógica de la lectura, no memorizar un resultado.",
                    tone: "info",
                    title: "Antes de empezar"
                }
            ]
        },
        {
            id: "definicion",
            number: "2",
            title: "Definición técnica",
            kind: "official",
            refs: ["S1", "S2"],
            blocks: [
                { p: "El manual WABC trata estas situaciones como **ventaja / desventaja**. En el 2 contra 1 define dos carriles: el **carril de penetración**, que es el camino directo entre el jugador con balón y el aro, y el **carril de pase**, el camino directo entre el jugador con balón y el compañero al que puede pasar [S1]." },
                { p: "En el 3 contra 2, el objetivo es que un defensor se comprometa con el balón y, con un pase, convertir la jugada en un 2 contra 1 [S2]. La misma lógica se extiende al 4 contra 3: cada pase obliga a un defensor a decidir y deja a alguien libre." }
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
                        "**Terminar con un tiro de alto porcentaje** antes de que la defensa se iguale.",
                        "**Obligar a los defensores a comprometerse** atacando el aro.",
                        "**Mantener el espacio** para que un defensor no pueda cubrir a dos atacantes.",
                        "**Decidir según lo que hace el defensor**, no según un plan previo [S1]."
                    ]
                }
            ],
            refs: ["S1"]
        },
        {
            id: "principios",
            number: "4",
            title: "Principios",
            kind: "official",
            refs: ["S1", "S2"],
            blocks: [
                {
                    list: [
                        "**Atacar el aro primero**: el jugador con balón ataca el aro y deja que el defensor decida la acción [S1].",
                        "**Si el carril de penetración está defendido, pasar; si no, seguir hasta el aro** [S1].",
                        "**Correr hacia el aro**, no hacia el costado del tablero [S1].",
                        "**Hacer que un defensor se comprometa** con el balón y pasar para crear un 2 contra 1 [S2].",
                        "**El que pasa sigue siendo amenaza**: en el 3 contra 2, el base que pasó al ala tiene que poder tirar o penetrar si el balón vuelve [S2].",
                        "**Rapidez**: la ventaja dura hasta que llega el defensor que recupera [S2]."
                    ]
                }
            ]
        },
        {
            id: "explicacion",
            number: "5",
            title: "Explicación detallada",
            kind: "interpretation",
            refs: ["S1", "S2"],
            blocks: [
                { h: "5.1 El 2 contra 1" },
                { p: "El jugador con balón ataca el aro por el carril de penetración; su compañero corre por su carril, abierto y a la misma altura. Si el defensor cierra el camino al aro, pase; si se queda en la línea de pase, bandeja. El defensor, por su parte, intenta que el atacante crea que se comprometió con un carril y después hace lo otro, por ejemplo amagando ir al balón y metiéndose en la línea de pase [S1]." },
                { board: "dos-contra-uno" },
                { h: "5.2 El 3 contra 2" },
                { p: "La mayoría de las defensas se organizan en «I»: un defensor arriba de la línea de libres y otro delante del aro [S2]. Si el de arriba sale al balón, un pase rápido al ala deja un 2 contra 1 entre los dos aleros y el de abajo, que hay que atacar antes de que el primero recupere. Si el de arriba no sale, el pase al ala obliga al de abajo a dejar la zona: el alero contrario ataca el aro, el base va al codo del lado del balón y se arma un 2 contra 1 contra el primer defensor [S2]." },
                { board: "tres-contra-dos" },
                { h: "5.3 El pase de vuelta" },
                { p: "El error más común que señala el manual es no devolverle el balón al base: cuando el balón llega al ala, el alero contrario parece libre, pero el primer defensor suele bajar hacia el aro y cortar ese pase; el que queda libre es el base [S2]." },
                { h: "5.4 El 4 contra 3" },
                { p: "Con tres defensores, la defensa suele formar un triángulo. Cada pase obliga a uno a salir, y el atacante que llega último (trailer) es con frecuencia el que queda libre. Es una interpretación técnica de BasketIQ: no pudimos leer el apartado WABC dedicado a esta situación." },
                { board: "cuatro-contra-tres" },
                { h: "5.5 Spacing en la superioridad" },
                { p: "En todas las superioridades, los compañeros del jugador con balón tienen que estar lo bastante abiertos para que un defensor no pueda cubrir a dos con un solo paso, y lo bastante cerca del aro para ser una amenaza real. Un carril demasiado cerca del balón regala la ventaja." }
            ]
        },
        {
            id: "responsabilidades",
            number: "6",
            title: "Responsabilidades",
            kind: "interpretation",
            refs: ["S1", "S2"],
            blocks: [
                {
                    table: {
                        caption: "Quién hace qué",
                        head: ["Jugador", "2 contra 1", "3 contra 2"],
                        rows: [
                            ["Con balón", "Atacar el aro y leer al defensor [S1]", "Atacar por el centro y obligar a X1 a decidir [S2]"],
                            ["Sin balón", "Correr por su carril hacia el aro, abierto [S1]", "Aleros abiertos; el del lado contrario ataca el aro tras el pase al ala [S2]"],
                            ["Pasador", "Elegir el pase con el mejor ángulo, con cualquiera de las dos manos [S1]", "Seguir siendo amenaza: ir al codo y estar listo para tirar o penetrar [S2]"]
                        ]
                    }
                }
            ]
        },
        {
            id: "aplicacion",
            number: "7",
            title: "Aplicación en situaciones reales",
            kind: "interpretation",
            blocks: [
                {
                    list: [
                        "Después de un robo en la mitad de la cancha: suele aparecer el 2 contra 1.",
                        "Después de un rebote defensivo con salida rápida: el 3 contra 2 y el 4 contra 3 son habituales.",
                        "Al superar una presión: la defensa queda desordenada y en inferioridad durante unos segundos.",
                        "Cuando la superioridad desaparece (llegó el defensor que recupera), conviene pasar al ataque organizado en lugar de forzar."
                    ]
                }
            ]
        },
        {
            id: "ventajas",
            number: "8",
            title: "Ventajas",
            kind: "interpretation",
            blocks: [
                { list: ["Tiros cerca del aro con poca oposición.", "Desgaste y desorden de la defensa.", "Situaciones de lectura simple, ideales para enseñar a decidir."] }
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
                        "Pases apurados o cruzados que se interceptan.",
                        "Decidir antes de leer: el defensor lo aprovecha [S1].",
                        "Perder el espacio: dos atacantes demasiado juntos se defienden con uno.",
                        "Tardar: la ventaja dura pocos segundos."
                    ]
                }
            ],
            refs: ["S1"]
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
                        "Decidir la acción al empezar en lugar de leer al defensor [S1].",
                        "No atacar el aro: dribblear o correr hacia el costado de la zona [S1].",
                        "En el 3 contra 2, no devolverle el balón al base [S2].",
                        "El compañero sin balón corre hacia el costado del tablero en lugar de hacia el aro [S1].",
                        "Esperar a que llegue el defensor que recupera."
                    ]
                }
            ]
        },
        {
            id: "correcciones",
            number: "11",
            title: "Correcciones y consignas",
            kind: "method",
            refs: ["S1", "S2"],
            blocks: [
                {
                    table: {
                        caption: "Error, corrección y consigna",
                        head: ["Error", "Corrección", "Consigna"],
                        rows: [
                            ["Decide antes", "Mirar al defensor mientras ataca el aro", "«¡Leé!»"],
                            ["No ataca el aro", "Camino directo al aro", "«¡Al aro!»"],
                            ["Carril cerrado", "Abrirse y correr hacia el aro", "«¡Ancho y al aro!»"],
                            ["Olvida al base", "Mirar al pasador después del pase al ala", "«¡Devolvé!»"]
                        ]
                    }
                },
                { p: "El manual WABC sugiere preguntar al jugador qué vio y después conversar qué acción correspondía [S1], y usar preguntas dirigidas como «¿qué estaba haciendo el defensor X1?» en lugar de explicarlo todo [S2]." }
            ]
        },
        {
            id: "metodologia",
            number: "12",
            title: "Metodología",
            kind: "method",
            refs: ["S2"],
            blocks: [
                {
                    ordered: true,
                    list: [
                        "**Jugar primero**: situaciones reales de 2 contra 1 y 3 contra 2, con pocas reglas.",
                        "**Preguntar** después de cada repetición qué hizo el defensor [S2].",
                        "**Aislar la lectura** cuando un error se repite (por ejemplo, el pase de vuelta al base).",
                        "**Agregar al defensor que recupera** para enseñar a decidir rápido.",
                        "**Encadenar**: 3 contra 2 que se convierte en 2 contra 1 de vuelta."
                    ]
                }
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
                            ["1", "2 contra 1 desde media cancha", "Leer el carril cerrado"],
                            ["2", "2 contra 1 con defensor que amaga", "Leer engaños"],
                            ["3", "3 contra 2 con defensa en «I»", "El pase de vuelta al base"],
                            ["4", "3 contra 2 con un defensor que recupera", "Decidir rápido"],
                            ["5", "4 contra 3 con trailer", "El cuarto que llega"],
                            ["6", "Continuidad: 3 contra 2 y 2 contra 1 de vuelta", "Transición defensiva"]
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
            refs: ["S1"],
            blocks: [
                { p: "El manual WABC ubica el 2 contra 1 y el 3 contra 2 en el nivel 1, es decir, entre los contenidos básicos [S1]. Proponemos:" },
                {
                    table: {
                        caption: "Propuesta de BasketIQ por etapa (no es una norma oficial)",
                        head: ["Categoría", "Contenido"],
                        rows: [
                            ["Minibásquet", "2 contra 1 y 3 contra 2 en juegos, con preguntas simples"],
                            ["U13 y U15", "Lectura del defensor, pase con las dos manos, pase de vuelta al base"],
                            ["U17 en adelante", "4 contra 3, trailer, decisión con defensor que recupera"]
                        ]
                    }
                }
            ]
        },
        {
            id: "variantes",
            number: "+",
            title: "Variantes y alternativas tácticas",
            kind: "variant",
            blocks: [
                {
                    list: [
                        "**3 contra 2 con defensa en paralelo** (los dos defensores a la misma altura): el hueco está en el medio.",
                        "**2 contra 1 con el compañero atrasado**: el pase va hacia adelante, al espacio.",
                        "**4 contra 3 con pase al poste**: el trailer entra a la zona en lugar de quedarse arriba.",
                        "**Superioridad que se diluye**: pasar a un ataque organizado con bloqueo directo temprano."
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
            blocks: [{ p: "Tres ejercicios en progresión. Todos se juegan con preguntas después de cada repetición, como propone el manual WABC." }],
            refs: []
        }
    ];

    var exercises = [
        {
            id: "ej-2c1",
            name: "2 contra 1 continuo con pregunta",
            meta: {
                fundamento: "Superioridades",
                objetivo: "Toma de decisiones",
                categories: ["Mini", "U13", "U15", "U17"],
                level: "Inicial",
                minPlayers: 6,
                maxPlayers: 15,
                minutes: [8, 12],
                court: "full",
                hoops: 2,
                materials: ["Balones"],
                optionalMaterials: [],
                blockType: "tecnica"
            },
            adaptations: [
                {
                    id: "tres-jugadores",
                    label: "Con 3 jugadores",
                    text: "Un trío rota los roles: dos atacan y uno defiende; después de cada repetición cambian.",
                    req: { minPlayers: 3, court: "half", hoops: 1 }
                },
                {
                    id: "media-cancha",
                    label: "Versión media cancha",
                    text: "Los atacantes salen desde la mitad de la cancha hacia un solo aro y el defensor sale de la línea de libres. Sin vuelta hacia el otro aro.",
                    req: { court: "half", hoops: 1 }
                }
            ],
            kind: "method",
            refs: ["S1"],
            board: "dos-contra-uno",
            objective: "Atacar el aro y decidir según lo que hace el defensor.",
            secondary: ["Correr hacia el aro sin balón", "Pase con cualquiera de las dos manos", "Defensor que amaga"],
            category: "Minibásquet a U17",
            level: "Inicial",
            players: "Mínimo 6 (tres filas); hasta 15",
            playersShort: "6 a 15 jugadores",
            duration: "8 a 12 minutos",
            space: "Cancha completa",
            hoops: "2",
            materials: "1 balón cada dos jugadores",
            organization: "Dos filas de atacantes en mitad de cancha y una fila de defensores debajo de cada aro.",
            development: "Dos atacantes salen contra un defensor. Al terminar, el defensor y uno de los atacantes atacan hacia el otro aro contra un nuevo defensor. Después de cada repetición, el entrenador pregunta al jugador con balón qué hizo el defensor.",
            rules: ["Máximo tres dribblings", "Si el defensor toca el balón, cambia de rol", "Bandeja o pase, no tiro exterior"],
            cues: ["«¡Al aro!»", "«¡Leé!»", "«¡Ancho y al aro!»"],
            errors: ["Decidir antes de leer", "Correr hacia el costado del tablero", "Pasar con la mano lejana sin ángulo"],
            corrections: ["Preguntar qué vio el jugador", "Marcar el carril con conos", "Practicar el pase con la mano del lado del compañero"],
            variants: ["Defensor que empieza detrás de los atacantes", "Defensor que amaga ir al balón", "Solo pase picado"],
            progressions: ["3 contra 2 continuo", "Agregar un defensor que recupera", "Reducir el tiempo"],
            regressions: ["Defensor pasivo que solo elige un carril", "Sin dribbling: solo pases", "Caminando la primera vez"],
            evaluation: ["Decisión correcta según el defensor", "Finalización", "Carril del compañero abierto y hacia el aro"],
            basis: "Lectura y errores del 2 contra 1 según el manual WABC de nivel 1 [S1]. La organización continua es de BasketIQ."
        },
        {
            id: "ej-3c2",
            name: "3 contra 2 y 2 contra 1 de vuelta",
            meta: {
                fundamento: "Superioridades",
                objetivo: "Toma de decisiones",
                categories: ["U13", "U15", "U17", "Primera"],
                level: "Intermedio",
                minPlayers: 10,
                maxPlayers: 15,
                minutes: [10, 15],
                court: "full",
                hoops: 2,
                materials: ["Balones"],
                optionalMaterials: [],
                blockType: "tactica"
            },
            adaptations: [
                {
                    id: "media-cancha",
                    label: "3 contra 2 en media cancha (5 jugadores)",
                    text: "Solo el 3 contra 2 hacia un aro, sin la vuelta. Los defensores empiezan en «I».",
                    req: { court: "half", hoops: 1, minPlayers: 5 }
                }
            ],
            kind: "method",
            refs: ["S2"],
            board: "tres-contra-dos",
            objective: "Convertir el 3 contra 2 en un 2 contra 1 con un pase y no olvidar el pase de vuelta al base.",
            secondary: ["Lectura del primer defensor", "Base que sigue siendo amenaza", "Transición defensiva en el 2 contra 1 de vuelta"],
            category: "U13 en adelante",
            level: "Intermedio",
            players: "10 (rotación de tríos y parejas); hasta 15",
            playersShort: "10 a 15 jugadores",
            duration: "10 a 15 minutos",
            space: "Cancha completa",
            hoops: "2",
            materials: "1 balón por grupo",
            organization: "Tríos de ataque en la mitad de la cancha. Dos defensores en «I» en cada aro.",
            development: "El trío ataca contra los dos defensores. Cuando termina, los dos defensores atacan 2 contra 1 hacia el otro aro contra el atacante que tiró. Pregunta del entrenador después de cada repetición: «¿qué hizo X1?».",
            rules: ["Tiro solo desde dentro de la zona o desde el codo", "Robo de la defensa: punto doble", "Rotación: atacantes a defensa"],
            cues: ["«¡Hacelo decidir!»", "«¡Devolvé!»", "«¡Al codo!»"],
            errors: ["Pase al ala sin haber atacado", "No devolver al base", "El alero contrario no ataca el aro"],
            corrections: ["Atacar hasta que X1 se mueva", "Congelar en la recepción del ala y mirar al base", "Marcar el corte del alero con un cono"],
            variants: ["Defensores en paralelo", "Un defensor que llega desde atrás", "Tiro exterior permitido"],
            progressions: ["4 contra 3 con trailer", "Defensor que recupera desde la mitad", "Reducir el tiempo de ataque"],
            regressions: ["Defensa pasiva en «I»", "Solo la primera fase (3 contra 2)", "Pases sin dribbling"],
            evaluation: ["Pase de vuelta cuando corresponde", "Tiros cerca del aro", "Tiempo hasta el tiro"],
            basis: "Lecturas del 3 contra 2 del manual WABC de nivel 1 (defensa en «I», pase al ala, pase de vuelta al base y aprender con preguntas) [S2]. La continuidad con el 2 contra 1 de vuelta es de BasketIQ."
        },
        {
            id: "ej-4c3",
            name: "4 contra 3 con trailer",
            meta: {
                fundamento: "Superioridades",
                objetivo: "Transición ofensiva",
                categories: ["U15", "U17", "Primera"],
                level: "Intermedio",
                minPlayers: 7,
                maxPlayers: 14,
                minutes: [10, 12],
                court: "full",
                hoops: 1,
                materials: ["Balones"],
                optionalMaterials: [],
                blockType: "tactica"
            },
            adaptations: [
                {
                    id: "media-cancha",
                    label: "Versión media cancha",
                    text: "Los cuatro atacantes empiezan en la mitad de la cancha con el 4 atrasado tres metros; la defensa en triángulo.",
                    req: { court: "half" }
                },
                {
                    id: "tres-contra-dos-trailer",
                    label: "3 contra 2 con trailer (5 jugadores)",
                    text: "Dos atacantes llegan arriba y el tercero sale dos segundos más tarde como trailer; dos defensores en «I». Media cancha y un aro.",
                    req: { minPlayers: 5, court: "half", hoops: 1 }
                }
            ],
            kind: "method",
            board: "cuatro-contra-tres",
            objective: "Encontrar al atacante que queda libre después de dos pases, con frecuencia el que llega último.",
            secondary: ["Llegada escalonada", "Pase extra", "Comunicación defensiva en inferioridad"],
            category: "U15 en adelante",
            level: "Intermedio",
            players: "7 (4 contra 3); hasta 14 con rotación",
            playersShort: "7 a 14 jugadores",
            duration: "10 a 12 minutos",
            space: "Cancha completa (o media)",
            hoops: "1",
            materials: "1 balón",
            organization: "Cuatro atacantes salen desde el fondo contrario tras un pase del entrenador; el 4 sale dos segundos más tarde. Tres defensores esperan en triángulo.",
            development: "El ataque busca un tiro de alto porcentaje en menos de ocho segundos. Los defensores se reparten con voces («¡balón!», «¡aro!», «¡arriba!»).",
            rules: ["Ocho segundos para tirar", "Tiro del trailer tras al menos dos pases: punto extra", "Rotación de roles cada tres posesiones"],
            cues: ["«¡Pase extra!»", "«¡Trailer!»", "«¡Balón, aro, arriba!» en defensa"],
            errors: ["Tiro rápido sin pase extra", "El trailer llega por el mismo carril que el balón", "La defensa no habla"],
            corrections: ["Exigir dos pases antes del tiro", "Marcar el carril del trailer", "Asignar las voces antes de empezar"],
            variants: ["Trailer que entra a la zona", "Un quinto defensor que recupera", "Salida desde rebote"],
            progressions: ["5 contra 4", "Defensor que recupera desde la mitad", "Reducir a seis segundos"],
            regressions: ["Defensa pasiva", "Sin dribbling", "Trailer que sale junto con los demás"],
            evaluation: ["Tiros abiertos generados", "Pases extra", "Tiempo hasta el tiro"],
            basis: "Propuesta de BasketIQ (interpretación técnica; no pudimos leer el apartado WABC de defensa del 4 contra 3)."
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
                        "El jugador con balón ataca el aro antes de decidir",
                        "Los compañeros corren abiertos y hacia el aro",
                        "Se pasa cuando el defensor cierra el aro y se sigue cuando no",
                        "En el 3 contra 2 aparece el pase de vuelta al base",
                        "La superioridad termina en un tiro cerca del aro o abierto",
                        "Cuando la ventaja desaparece, el equipo pasa al ataque organizado"
                    ]
                },
                {
                    table: {
                        caption: "Indicadores",
                        head: ["Indicador", "Cómo medirlo"],
                        rows: [
                            ["Conversión en superioridad", "Puntos ÷ situaciones de superioridad"],
                            ["Pérdidas en superioridad", "Contar pases interceptados"],
                            ["Tiempo hasta el tiro", "Segundos desde que se cruza la mitad"]
                        ]
                    }
                }
            ]
        },
        {
            id: "evaluar-preguntas",
            title: "Autoevaluación",
            kind: "method",
            refs: ["S1", "S2"],
            blocks: [
                { qa: "¿Qué son el carril de penetración y el carril de pase?", answer: ["El camino directo del jugador con balón al aro y el camino directo hacia el compañero al que puede pasar [S1]."] },
                { qa: "En el 2 contra 1, ¿quién decide la acción?", answer: ["El defensor: el jugador con balón ataca el aro y elige según lo que haga el defensor [S1]."] },
                { qa: "¿Cómo se organiza la defensa en «I»?", answer: ["Un defensor arriba de la línea de libres y otro delante del aro [S2]."] },
                { qa: "¿Cuál es el error más común en el 3 contra 2 según WABC?", answer: ["No devolverle el balón al base [S2]."] }
            ]
        }
    ];

    // ------------------------------------------------------------------
    // Simulador de decisiones
    // ------------------------------------------------------------------
    var I21 = { o1: [11.5, 6.2], o2: [11.0, 11.0], x1: [5.0, 7.8] };
    var I32 = { o1: [11.0, 7.5], o2: [10.4, 2.2], o3: [10.4, 12.8], x1: [6.6, 7.5], x2: [2.6, 7.5] };
    var I43 = { o1: [10.6, 7.5], o2: [9.8, 2.0], o3: [9.8, 13.0], o4: [12.8, 9.0], x1: [6.6, 7.5], x2: [2.6, 5.8], x3: [2.6, 9.2] };

    var SIM = {
        id: "sim-superioridades",
        title: "Simulador de superioridades",
        intro: "Elegí la situación y la decisión del jugador con balón. El simulador muestra una consecuencia plausible y su fundamento. No garantiza resultados: cambia con la velocidad, la distancia y lo que haga cada defensor.",
        view: VIEW,
        tags: ["Superioridades", "Academy"],
        optionalPlayers: true,
        ui: {
            variants: "Situación",
            positions: "Decisión del ataque",
            hint: "Elegí la situación arriba y probá las decisiones. Tocá un defensor para ver qué hace.",
            resp: "Qué hace cada defensor",
            help: "Fundamento",
            vulnerable: "Espacios libres",
            options: "Lo que queda disponible",
            disclaimer: "Es una consecuencia plausible, no un resultado garantizado: depende de la velocidad, la distancia y la reacción de cada defensor.",
            noTarget: "Para esta situación usá los botones de decisión."
        },
        players: {
            o1: O("1", 0, 0), o2: O("2", 0, 0), o3: O("3", 0, 0), o4: O("4", 0, 0),
            x1: D("1", 0, 0), x2: D("2", 0, 0), x3: D("3", 0, 0)
        },
        positions: [
            { id: "inicio", label: "Llegada", group: "Decisión" },
            { id: "fijar", label: "Fijar: atacar el aro", group: "Decisión" },
            { id: "pasar", label: "Pasar", group: "Decisión" },
            { id: "penetrar", label: "Penetrar hasta el final", group: "Decisión" },
            { id: "finalizar", label: "Tirar ya", group: "Decisión" },
            { id: "spacing", label: "Mantener el spacing", group: "Decisión" }
        ],
        tour: ["inicio", "fijar", "pasar"],
        variants: [
            {
                id: "dos-cierra",
                label: "2c1 · el defensor cierra el aro",
                kind: "official",
                refs: ["S1"],
                desc: "Dos atacantes contra un defensor que se compromete con el balón. Si el camino al aro está defendido, el pase es la decisión que el manual recomienda [S1].",
                states: {
                    inicio: {
                        title: "2 contra 1: llegada",
                        note: "El 1 llega con el balón por el centro y el 2 por su carril, abierto. X1 espera cerca de la línea de libres.",
                        ball: "o1",
                        pos: I21,
                        resp: { x1: "Espera retrocediendo, entre los dos atacantes y el aro." },
                        help: "El jugador con balón todavía no decide: primero ataca el aro [S1]."
                    },
                    fijar: {
                        title: "Fijar: el 1 ataca el aro",
                        note: "El 1 ataca el aro por el carril de penetración y X1 se compromete con él. El 2 sigue abierto y corriendo hacia el aro.",
                        ball: "o1",
                        pos: { o1: [6.6, 6.6], o2: [6.8, 10.6], x1: [5.6, 7.0] },
                        resp: { x1: "Sale a cerrar el camino al aro." },
                        help: "Atacar el aro obliga al defensor a decidir. Ahora el carril de pase está abierto [S1].",
                        options: [["pass", "o1", "o2"]],
                        optionsText: ["Pase al 2, que corre hacia el aro."]
                    },
                    pasar: {
                        title: "Pasar: bandeja del 2",
                        note: "El defensor se comprometió con el balón: el pase al 2 termina en bandeja.",
                        ball: "o2",
                        moves: { o2: "cut" },
                        pos: { o1: [6.2, 6.6], o2: [3.6, 9.6], x1: [5.0, 7.4] },
                        resp: { x1: "Llega tarde: estaba comprometido con el balón." },
                        help: "Si el carril de penetración está defendido, se pasa [S1]. El 2 corrió hacia el aro y no hacia el costado del tablero.",
                        options: [["shot", "o2", HOOP]],
                        optionsText: ["Bandeja sin oposición."]
                    },
                    penetrar: {
                        title: "Penetrar hasta el final contra el defensor",
                        note: "El 1 sigue con dribbling aunque X1 le cerró el camino. Llega al aro con el defensor encima: tiro disputado o falta en ataque.",
                        ball: "o1",
                        moves: { o1: "dribble" },
                        pos: { o1: [3.4, 6.8], o2: [5.0, 10.4], x1: [2.6, 7.2] },
                        resp: { x1: "Quieto en el camino, delante del aro." },
                        help: "Es el error de decidir antes de leer: el defensor había elegido el carril de penetración [S1].",
                        options: [["pass", "o1", "o2"]],
                        optionsText: ["Todavía puede pasar, pero con peor ángulo y más tarde."],
                        vulnerable: [{ x: 3.6, y: 9.2, w: 2.4, h: 2.4, label: "2 libre", text: "El 2 quedó libre todo el tiempo." }]
                    },
                    finalizar: {
                        title: "Tirar ya, desde lejos",
                        note: "El 1 se frena y tira de media distancia con X1 cerca. Desaprovecha la superioridad: era una bandeja.",
                        ball: "o1",
                        pos: { o1: [7.2, 6.4], o2: [6.8, 10.6], x1: [6.2, 6.8] },
                        resp: { x1: "Sale a molestar el tiro." },
                        help: "La superioridad busca el tiro de mayor porcentaje, que es el de cerca del aro.",
                        options: [["shot", "o1", HOOP]],
                        optionsText: ["Tiro de media distancia contestado."]
                    },
                    spacing: {
                        title: "Mantener el spacing",
                        note: "El 2 se mantiene abierto y a la misma altura. X1 no puede cubrir a los dos con un solo paso: tiene que elegir.",
                        ball: "o1",
                        pos: { o1: [7.4, 6.4], o2: [6.8, 11.4], x1: [5.4, 8.2] },
                        resp: { x1: "Queda en medio: no llega a ninguno de los dos." },
                        help: "Con el espacio correcto, cualquier elección del defensor deja una opción buena.",
                        options: [["pass", "o1", "o2"], ["dribble", "o1", [3.2, 6.8]]],
                        optionsText: ["Pase si X1 se va al balón.", "Penetración si X1 se queda con el 2."]
                    }
                }
            },
            {
                id: "dos-espera",
                label: "2c1 · el defensor se queda en la línea de pase",
                kind: "official",
                refs: ["S1"],
                inherits: "dos-cierra",
                desc: "El defensor no sale al balón y se queda cerca del carril de pase. El camino al aro queda libre [S1].",
                states: {
                    fijar: {
                        title: "Fijar: el 1 ataca el aro, X1 no sale",
                        note: "X1 se queda atrás, cerca de la línea de pase. El camino al aro está libre.",
                        ball: "o1",
                        pos: { o1: [6.6, 6.6], o2: [6.8, 10.6], x1: [3.6, 8.6] },
                        resp: { x1: "Se queda atrás, entre el 2 y el aro, para cortar el pase." },
                        help: "Si el carril de penetración no está defendido, el jugador con balón sigue hasta el aro [S1].",
                        options: [["dribble", "o1", [2.8, 6.6]]],
                        optionsText: ["Seguir con dribbling hasta la bandeja."]
                    },
                    pasar: {
                        title: "Pasar al compañero vigilado",
                        note: "El 1 pasa igual. X1 estaba esperando ese pase: lo intercepta o llega a molestar la recepción.",
                        ball: "o2",
                        pos: { o1: [6.2, 6.6], o2: [5.2, 10.2], x1: [4.0, 9.2] },
                        resp: { x1: "Ataca la línea de pase y molesta la recepción." },
                        help: "El defensor hizo creer que cuidaba el aro y se metió en el carril de pase: es justamente lo que el manual describe como engaño del defensor [S1].",
                        options: [["pass", "o2", "o1"]],
                        optionsText: ["Devolver al 1 si X1 sale al 2."]
                    },
                    penetrar: {
                        title: "Penetrar: bandeja del 1",
                        note: "El 1 sigue hasta el aro y X1 llega tarde desde la línea de pase.",
                        ball: "o1",
                        moves: { o1: "dribble" },
                        pos: { o1: [2.8, 6.6], o2: [5.0, 10.4], x1: [2.8, 8.4] },
                        resp: { x1: "Llega tarde desde la línea de pase." },
                        help: "Camino al aro sin defender: la decisión es seguir [S1].",
                        options: [["shot", "o1", HOOP]],
                        optionsText: ["Bandeja."]
                    },
                    finalizar: {
                        title: "Tirar ya, sin oposición",
                        note: "El 1 tira de media distancia sin nadie cerca. Es un tiro libre de oposición, pero de menor porcentaje que la bandeja que tenía.",
                        ball: "o1",
                        pos: { o1: [7.2, 6.4], o2: [6.8, 10.6], x1: [3.6, 8.6] },
                        resp: { x1: "Se queda atrás, cerca de la línea de pase." },
                        help: "El defensor concedió el aro; el tiro de media distancia desaprovecha esa concesión.",
                        options: [["shot", "o1", HOOP]],
                        optionsText: ["Tiro abierto de media distancia."]
                    },
                    spacing: {
                        title: "Mantener el spacing",
                        note: "El 2 sigue abierto. X1, en la línea de pase, deja el aro libre.",
                        ball: "o1",
                        pos: { o1: [7.4, 6.4], o2: [6.8, 11.4], x1: [3.6, 8.8] },
                        resp: { x1: "Cuida el pase y deja el aro." },
                        help: "El espacio del 2 sostiene el engaño del defensor: si el 2 se acercara, X1 podría cuidar a los dos.",
                        options: [["dribble", "o1", [2.8, 6.6]]],
                        optionsText: ["Penetración hasta el aro."]
                    }
                }
            },
            {
                id: "tres-sale",
                label: "3c2 · el primer defensor sale al balón",
                kind: "official",
                refs: ["S2"],
                desc: "Defensa en «I». Si el primer defensor se compromete con el balón, un pase rápido al ala deja un 2 contra 1 contra el segundo [S2].",
                states: {
                    inicio: {
                        title: "3 contra 2: llegada",
                        note: "El 1 avanza por el centro y los aleros por los carriles. X1 arriba de la línea de libres y X2 delante del aro: defensa en «I» [S2].",
                        ball: "o1",
                        pos: I32,
                        resp: { x1: "Arriba de la línea de libres: frena el balón.", x2: "Delante del aro: protege la bandeja." },
                        help: "El ataque busca que un defensor se comprometa con el balón [S2]."
                    },
                    fijar: {
                        title: "Fijar: el 1 ataca y X1 sale",
                        note: "El 1 ataca por el centro y X1 sale a frenarlo. Los aleros siguen abiertos.",
                        ball: "o1",
                        pos: { o1: [7.8, 7.3], o2: [7.0, 2.4], o3: [7.0, 12.6], x1: [7.0, 7.4], x2: [2.8, 7.5] },
                        resp: { x1: "Sale a frenar al balón.", x2: "Protege el aro." },
                        help: "X1 se comprometió: ahora hay un 2 contra 1 detrás de él [S2].",
                        options: [["pass", "o1", "o2"], ["pass", "o1", "o3"]],
                        optionsText: ["Pase rápido al ala derecha.", "Pase rápido al ala izquierda."]
                    },
                    pasar: {
                        title: "Pasar al ala: 2 contra 1 contra X2",
                        note: "Pase rápido al 2. X2 sale a frenarlo y el 3 corta al aro. Hay que atacar antes de que X1 recupere [S2].",
                        ball: "o2",
                        moves: { o3: "cut" },
                        pos: { o1: [7.6, 7.0], o2: [6.0, 2.8], o3: [3.6, 10.8], x1: [6.6, 6.6], x2: [4.4, 4.0] },
                        resp: { x1: "Intenta recuperar hacia el aro.", x2: "Sale a frenar al 2." },
                        help: "El 2 tiene que atacar rápido, antes de que X1 vuelva [S2].",
                        options: [["pass", "o2", "o3"], ["dribble", "o2", [3.0, 4.6]]],
                        optionsText: ["Pase al 3, que corta al aro.", "Penetración si X2 no sale."]
                    },
                    penetrar: {
                        title: "Penetrar por el centro contra los dos",
                        note: "El 1 sigue por el centro. X2 sube y lo encierran entre los dos: el ataque se metió donde estaban los defensores.",
                        ball: "o1",
                        moves: { o1: "dribble" },
                        pos: { o1: [4.4, 7.4], o2: [6.4, 2.6], o3: [6.4, 12.4], x1: [5.2, 7.8], x2: [3.4, 7.5] },
                        resp: { x1: "Persigue al balón.", x2: "Sube a frenar la penetración." },
                        help: "Penetrar por el centro tiene sentido solo si los dos defensores se abren; acá se juntaron.",
                        options: [["pass", "o1", "o2"], ["pass", "o1", "o3"]],
                        optionsText: ["Descarga al ala derecha, ahora con peor ángulo.", "Descarga al ala izquierda."]
                    },
                    finalizar: {
                        title: "Tirar ya con X1 encima",
                        note: "El 1 tira desde arriba con X1 contestando. Desaprovecha dos compañeros libres.",
                        ball: "o1",
                        pos: { o1: [7.8, 7.3], o2: [7.0, 2.4], o3: [7.0, 12.6], x1: [7.0, 7.4], x2: [2.8, 7.5] },
                        resp: { x1: "Contesta el tiro.", x2: "Espera el rebote." },
                        help: "El tiro contestado con superioridad numérica es casi siempre la peor opción.",
                        options: [["shot", "o1", HOOP]],
                        optionsText: ["Tiro contestado."]
                    },
                    spacing: {
                        title: "Mantener el spacing: aleros anchos y profundos",
                        note: "Los aleros se mantienen anchos y bajan hacia las esquinas. X2 no puede cubrir a los dos lados.",
                        ball: "o1",
                        pos: { o1: [7.8, 7.3], o2: [5.2, 1.4], o3: [5.2, 13.6], x1: [7.0, 7.4], x2: [2.8, 7.5] },
                        resp: { x1: "Frena al balón.", x2: "Queda entre dos aleros muy separados." },
                        help: "Cuanto más separados los aleros, más tarda X2 en llegar a cualquiera de los dos.",
                        options: [["pass", "o1", "o2"], ["pass", "o1", "o3"]],
                        optionsText: ["Pase al ala derecha.", "Pase al ala izquierda."]
                    }
                }
            },
            {
                id: "tres-espera",
                label: "3c2 · el primer defensor no sale",
                kind: "official",
                refs: ["S2"],
                inherits: "tres-sale",
                desc: "El primer defensor no se compromete. El pase al ala obliga al segundo a salir de la zona; el alero contrario ataca el aro y el base va al codo [S2].",
                states: {
                    fijar: {
                        title: "Fijar: X1 no sale",
                        note: "El 1 ataca, pero X1 se queda en la línea de libres sin comprometerse.",
                        ball: "o1",
                        pos: { o1: [7.8, 7.3], o2: [7.0, 2.4], o3: [7.0, 12.6], x1: [5.8, 7.5], x2: [2.6, 7.5] },
                        resp: { x1: "Se queda en la línea de libres sin salir al balón.", x2: "Protege el aro." },
                        help: "Si X1 no sale al balón, el pase al ala obliga a X2 a dejar la zona [S2].",
                        options: [["pass", "o1", "o2"], ["shot", "o1", HOOP]],
                        optionsText: ["Pase al ala para mover a X2.", "Tiro abierto, aunque desaprovecha la ventaja."]
                    },
                    pasar: {
                        title: "Pasar al ala: el pase de vuelta",
                        note: "X2 salió al ala. El 3 ataca el aro y el 1 fue al codo. X1 bajó hacia el aro y cortó el pase al 3: el libre es el 1 [S2].",
                        ball: "o2",
                        moves: { o3: "cut", o1: "move" },
                        pos: { o1: [6.0, 5.6], o2: [5.6, 2.8], o3: [3.4, 10.6], x1: [3.6, 9.2], x2: [4.6, 3.4] },
                        resp: { x1: "Baja hacia el aro y corta el pase al 3.", x2: "Deja la zona para tomar al 2." },
                        help: "El error más común es no devolverle el balón al base [S2].",
                        options: [["pass", "o2", "o1"], ["pass", "o2", "o3"]],
                        optionsText: ["Pase de vuelta al 1 en el codo: tiro o penetración antes de que X2 recupere.", "Pase al 3 solo si X1 no bajó."]
                    },
                    penetrar: {
                        title: "Penetrar por el centro",
                        note: "El 1 sigue por el centro y X1, que estaba esperando, lo frena junto con X2.",
                        ball: "o1",
                        moves: { o1: "dribble" },
                        pos: { o1: [4.6, 7.4], o2: [6.4, 2.6], o3: [6.4, 12.4], x1: [5.4, 8.0], x2: [3.6, 7.2] },
                        resp: { x1: "Frena desde la línea de libres.", x2: "Sube a ayudar." },
                        help: "Los dos defensores estaban en el centro: penetrar por ahí es ir hacia la ayuda.",
                        options: [["pass", "o1", "o2"], ["pass", "o1", "o3"]],
                        optionsText: ["Descarga al ala derecha.", "Descarga al ala izquierda."]
                    },
                    finalizar: {
                        title: "Tirar ya, sin oposición cercana",
                        note: "El 1 tira de media distancia con X1 lejos. Es un tiro abierto, pero el ataque tenía un tres contra dos para buscar algo mejor.",
                        ball: "o1",
                        pos: { o1: [7.8, 7.3], o2: [7.0, 2.4], o3: [7.0, 12.6], x1: [5.8, 7.5], x2: [2.6, 7.5] },
                        resp: { x1: "Concede el tiro.", x2: "Protege el aro." },
                        help: "Puede ser una buena opción para un tirador; si no, el pase al ala crea una ventaja mayor.",
                        options: [["shot", "o1", HOOP]],
                        optionsText: ["Tiro abierto de media distancia."]
                    },
                    spacing: {
                        title: "Mantener el spacing",
                        note: "Aleros anchos y profundos. X1 sigue sin salir y X2 queda en medio.",
                        ball: "o1",
                        pos: { o1: [7.8, 7.3], o2: [5.2, 1.4], o3: [5.2, 13.6], x1: [5.8, 7.5], x2: [2.6, 7.5] },
                        resp: { x1: "Espera en la línea de libres.", x2: "Entre los dos aleros." },
                        help: "El espacio obliga a X2 a recorrer mucho para salir al ala.",
                        options: [["pass", "o1", "o2"], ["shot", "o1", HOOP]],
                        optionsText: ["Pase al ala.", "Tiro si X1 sigue lejos."]
                    }
                }
            },
            {
                id: "cuatro",
                label: "4c3 · triángulo defensivo",
                kind: "interpretation",
                desc: "Cuatro atacantes, con uno que llega atrás (trailer), contra tres defensores en triángulo. Interpretación de BasketIQ: no pudimos leer el apartado WABC de esta situación.",
                states: {
                    inicio: {
                        title: "4 contra 3: llegada",
                        note: "Tres atacantes llegan arriba y el 4 viene atrás. La defensa forma un triángulo: X1 arriba, X2 y X3 cerca del aro.",
                        ball: "o1",
                        pos: I43,
                        resp: { x1: "Frena el balón arriba.", x2: "Cuida el lado derecho del aro.", x3: "Cuida el lado izquierdo del aro." },
                        help: "La defensa se reparte con voces: balón, aro y arriba."
                    },
                    fijar: {
                        title: "Fijar: el 1 ataca y X1 sale",
                        note: "X1 frena al balón. El 4 llega atrás, sin defensor.",
                        ball: "o1",
                        pos: { o1: [7.8, 7.3], o2: [6.6, 2.0], o3: [6.6, 13.0], o4: [10.4, 8.6], x1: [7.0, 7.4], x2: [2.8, 5.6], x3: [2.8, 9.4] },
                        resp: { x1: "Frena al balón.", x2: "Cuida el aro del lado derecho.", x3: "Cuida el aro del lado izquierdo." },
                        help: "Con X1 comprometido, cada pase obliga a otro defensor a salir.",
                        options: [["pass", "o1", "o2"], ["pass", "o1", "o4"]],
                        optionsText: ["Pase al ala.", "Pase atrás al trailer."]
                    },
                    pasar: {
                        title: "Pasar al ala: el trailer queda libre",
                        note: "X2 sale al ala, X3 se corre y X1 baja a cubrir el aro. Nadie quedó arriba: el 4 llega solo.",
                        ball: "o2",
                        moves: { o3: "cut" },
                        pos: { o1: [7.4, 5.8], o2: [6.0, 2.0], o3: [3.6, 11.6], o4: [8.6, 7.4], x1: [4.2, 8.2], x2: [5.0, 2.6], x3: [2.6, 6.6] },
                        resp: { x1: "Baja a cubrir el aro y el corte del 3.", x2: "Sale al ala.", x3: "Se corre al lado del balón." },
                        help: "Cada rotación deja a alguien libre; el que llega último suele ser el último en ser tomado.",
                        options: [["pass", "o2", "o4"], ["pass", "o2", "o1"]],
                        optionsText: ["Pase al trailer, solo arriba.", "Pase al 1, que también quedó sin defensor."]
                    },
                    penetrar: {
                        title: "Penetrar por el centro contra el triángulo",
                        note: "El 1 se mete entre X2 y X3; X1 lo persigue. La zona se cierra, pero arriba quedan el 4 y las alas.",
                        ball: "o1",
                        moves: { o1: "dribble" },
                        pos: { o1: [4.6, 7.4], o2: [6.6, 2.0], o3: [6.6, 13.0], o4: [9.0, 8.2], x1: [5.4, 8.0], x2: [3.4, 6.2], x3: [3.4, 8.8] },
                        resp: { x1: "Persigue al balón.", x2: "Cierra desde la derecha.", x3: "Cierra desde la izquierda." },
                        help: "Si tres defensores se cierran sobre el balón, los cuatro pases hacia afuera están libres.",
                        options: [["pass", "o1", "o4"], ["pass", "o1", "o2"]],
                        optionsText: ["Pase atrás al trailer.", "Descarga al ala."]
                    },
                    finalizar: {
                        title: "Tirar ya con X1 encima",
                        note: "Tiro contestado del 1 con tres compañeros libres o por llegar.",
                        ball: "o1",
                        pos: { o1: [7.8, 7.3], o2: [6.6, 2.0], o3: [6.6, 13.0], o4: [10.4, 8.6], x1: [7.0, 7.4], x2: [2.8, 5.6], x3: [2.8, 9.4] },
                        resp: { x1: "Contesta el tiro.", x2: "Rebote.", x3: "Rebote." },
                        help: "La superioridad se desperdicia con un tiro contestado.",
                        options: [["shot", "o1", HOOP]],
                        optionsText: ["Tiro contestado."]
                    },
                    spacing: {
                        title: "Mantener el spacing",
                        note: "Aleros bajan hacia las esquinas y el trailer llega por el lado contrario al balón. La defensa no puede cerrar todo.",
                        ball: "o1",
                        pos: { o1: [7.8, 7.3], o2: [5.0, 1.0], o3: [5.0, 14.0], o4: [8.8, 9.6], x1: [6.9, 7.8], x2: [3.0, 4.4], x3: [3.0, 10.6] },
                        resp: { x1: "Frena el balón.", x2: "Estirado hacia la esquina derecha.", x3: "Estirado hacia la esquina izquierda." },
                        help: "Cuanto más estirada la defensa, más largos sus desplazamientos y más tarde llegan las ayudas.",
                        options: [["pass", "o1", "o4"], ["pass", "o1", "o2"], ["dribble", "o1", [4.0, 7.0]]],
                        optionsText: ["Pase al trailer.", "Pase a la esquina.", "Penetración por el centro, ahora más libre."]
                    }
                }
            }
        ]
    };

    return {
        id: "superioridades",
        sectionId: "superioridades",
        title: "Superioridades numéricas",
        subtitle: "Cómo leer el 2 contra 1, el 3 contra 2 y el 4 contra 3: decisiones, consecuencias y cómo entrenarlas, con fuentes WABC.",
        sectionLabel: "Ataque · Conceptos",
        playCategory: "Transición / contraataque",
        meta: ["Transición", "Desde minibásquet", "3 pizarras animadas", "Simulador de decisiones", "3 ejercicios"],
        updated: "2026-11-26",
        tabs: {
            aprender: aprender,
            visualizar: ["dos-contra-uno", "tres-contra-dos", "cuatro-contra-tres"],
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
