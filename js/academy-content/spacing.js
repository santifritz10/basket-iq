/*
 * Basket Lab Academy · Spacing: espacios, cortes, reemplazos, inversión y penetración
 *
 * Contenido redactado en español por BasketIQ. Las citas [S1]..[S6] remiten a la
 * bibliografía del final, consultada directamente.
 *
 * Coordenadas: metros sobre la cancha FIBA, vista de media cancha con el aro arriba.
 * x = distancia a la línea de fondo (aro en x = 1,575), y de 0 a 15 (lado derecho de la pantalla = y chica).
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

    // Cinco lugares abiertos: «cabeza» (arriba), «manos» (alas) y «pies» (esquinas) [S1].
    var SPOTS = { o1: [9.0, 7.5], o2: [6.7, 2.4], o3: [6.7, 12.6], o4: [1.3, 0.9], o5: [1.3, 14.1] };
    // Defensa individual con el balón en el ala derecha (posiciones de BasketIQ).
    var DEF = { x1: [8.0, 6.5], x2: [5.9, 3.1], x3: [4.9, 9.6], x4: [2.2, 1.9], x5: [2.6, 11.2] };

    function attackers() {
        return {
            o1: O("1", SPOTS.o1[0], SPOTS.o1[1]), o2: O("2", SPOTS.o2[0], SPOTS.o2[1]), o3: O("3", SPOTS.o3[0], SPOTS.o3[1]),
            o4: O("4", SPOTS.o4[0], SPOTS.o4[1]), o5: O("5", SPOTS.o5[0], SPOTS.o5[1])
        };
    }
    function withDefense() {
        var p = attackers();
        Object.keys(DEF).forEach(function (k) { p[k] = D(k.slice(1), DEF[k][0], DEF[k][1]); });
        return p;
    }

    var boards = [
        {
            id: "cabeza-manos-pies",
            title: "Cinco lugares, pasar y cortar al corazón",
            kind: "official",
            refs: ["S1", "S2"],
            intro: "El manual WABC enseña el espaciado con conos en forma de figura humana: cabeza, dos manos y dos pies. Los cortes van al «corazón» (la zona) y vuelven a uno de esos lugares [S1].",
            spec: {
                view: VIEW,
                players: attackers(),
                phases: [
                    {
                        name: "Cinco lugares",
                        note: "Un jugador por lugar: arriba (cabeza), en las alas (manos) y en las esquinas (pies) [S1].",
                        ball: "o1",
                        zones: [{ x: 0.2, y: 5.05, w: 5.6, h: 4.9, label: "Corazón" }]
                    },
                    {
                        name: "Pasar y cortar",
                        note: "El 1 pasa al ala y corta al aro buscando la devolución: es el «dame y va» [S1]. Corta uno solo, cuando el compañero de al lado tiene el balón.",
                        strokes: [
                            ["pass", "o1", "o2"],
                            ["cut", "o1", [3.2, 7.2], 0.2]
                        ]
                    },
                    {
                        name: "Reemplazar al que cortó",
                        note: "El más cercano al hueco ocupa el lugar que quedó libre, y los demás se equilibran. El que cortó sale del corazón hacia un lugar vacío [S2].",
                        strokes: [
                            ["move", "o3", [9.0, 7.8], 0.15],
                            ["move", "o5", [6.4, 12.8], -0.15],
                            ["move", "o1", [1.4, 13.9], 0.2]
                        ]
                    }
                ]
            }
        },
        {
            id: "corte-atras",
            title: "Corte por la espalda contra la negación",
            kind: "official",
            refs: ["S1", "S3"],
            intro: "Si el defensor se pone en la línea de pase, el atacante sube, muestra las manos y corta por la espalda [S1]. El reemplazo arranca cuando el que corta pasa la línea de libres [S3].",
            spec: {
                view: VIEW,
                players: withDefense(),
                phases: [
                    {
                        name: "Negación",
                        note: "Balón en el ala derecha. X1 se mete en la línea de pase hacia el 1.",
                        ball: "o2",
                        strokes: [
                            ["rotation", "x1", [8.5, 6.3]],
                            ["move", "o1", [9.4, 7.0]]
                        ]
                    },
                    {
                        name: "Corte por la espalda",
                        note: "El 1 corta por la espalda hacia el aro. Una vez que pasó la línea de libres, sigue hasta el aro [S3].",
                        strokes: [
                            ["cut", "o1", [3.2, 6.4], -0.2],
                            ["rotation", "x1", [4.4, 6.6]],
                            ["move", "o3", [8.8, 7.8], 0.15],
                            ["rotation", "x3", [7.8, 8.6]]
                        ]
                    },
                    {
                        name: "Reemplazo y equilibrio",
                        note: "El 3 ya ocupó arriba y el 5 sube al ala. Si el pase al 1 no llegó, el 1 sale hacia la esquina vacía [S2].",
                        strokes: [
                            ["move", "o5", [6.4, 12.8], -0.15],
                            ["rotation", "x5", [5.4, 11.8]],
                            ["move", "o1", [1.4, 13.9], 0.2]
                        ]
                    }
                ]
            }
        },
        {
            id: "inversion",
            title: "Inversión del balón y cierre largo",
            kind: "official",
            refs: ["S4"],
            intro: "Mover el balón de un lado al otro obliga a los defensores a desplazarse mucho y rápido. La inversión puede provocar un cierre largo desde la línea media hasta el perímetro, y eso deja al atacante en ventaja [S4].",
            spec: {
                view: VIEW,
                players: withDefense(),
                phases: [
                    {
                        name: "Primer pase",
                        note: "El balón vuelve del ala al 1. La defensa empieza a correrse.",
                        ball: "o2",
                        strokes: [
                            ["pass", "o2", "o1"],
                            ["rotation", "x1", [8.1, 7.3]],
                            ["rotation", "x2", [5.0, 4.4]],
                            ["rotation", "x3", [5.1, 10.1]],
                            ["rotation", "x4", [2.4, 3.2]]
                        ]
                    },
                    {
                        name: "Inversión",
                        note: "Pase rápido al 3. X3 estaba en la línea media y tiene que cerrar desde lejos [S4].",
                        strokes: [
                            ["pass", "o1", "o3"],
                            ["rotation", "x3", [5.9, 11.7]],
                            ["rotation", "x1", [7.8, 8.6]],
                            ["rotation", "x5", [2.2, 12.9]]
                        ]
                    },
                    {
                        name: "Atacar el cierre",
                        note: "El 3 ataca al defensor que llega corriendo. Las ayudas tienen que salir de nuevo.",
                        strokes: [
                            ["dribble", "o3", [3.9, 10.9]],
                            ["rotation", "x3", [4.6, 11.9]],
                            ["rotation", "x5", [2.6, 10.6]]
                        ]
                    }
                ]
            }
        },
        {
            id: "penetracion-receptores",
            title: "Penetrar y ubicar a los receptores",
            kind: "official",
            refs: ["S5"],
            intro: "El que penetra mete los dos pies en la zona y piensa primero en anotar. Los demás se ubican para recibir: el del lado contrario se abre para tirar, el del lado del balón se coloca detrás del que penetra y el de arriba se queda para el equilibrio defensivo [S5].",
            spec: {
                view: VIEW,
                players: withDefense(),
                phases: [
                    {
                        name: "Penetración",
                        note: "El 2 penetra con los dos pies dentro de la zona. El 4 se ubica detrás del balón, sin acercarse demasiado; el 3 se abre y el 1 se queda arriba [S5].",
                        ball: "o2",
                        strokes: [
                            ["dribble", "o2", [3.6, 5.8]],
                            ["rotation", "x2", [4.4, 4.6]],
                            ["rotation", "x5", [2.4, 6.9]],
                            ["rotation", "x3", [4.0, 9.8]],
                            ["rotation", "x1", [7.6, 6.4]],
                            ["rotation", "x4", [3.0, 2.4]],
                            ["move", "o4", [5.2, 1.2]],
                            ["move", "o3", [7.4, 13.2]],
                            ["move", "o1", [9.4, 7.0]]
                        ]
                    },
                    {
                        name: "Descarga",
                        note: "X5 salió a frenar la penetración y dejó la esquina. Pase al 5.",
                        strokes: [
                            ["pass", "o2", "o5"],
                            ["rotation", "x3", [2.6, 12.5]]
                        ]
                    },
                    {
                        name: "Tiro",
                        note: "El 5 tira antes de que llegue el cierre.",
                        strokes: [["shot", "o5", HOOP]]
                    }
                ]
            }
        }
    ];

    var sources = [
        {
            id: "S1",
            title: "WABC Coaches Manual Level 1 · 2.1.1 Basic floor spacing, pass and cut / give and go",
            publisher: "FIBA · World Association of Basketball Coaches (WABC)",
            locator: "Nivel 1, Team, 2 Offensive tactics and strategies, 2.1 Offensive movement",
            url: "https://wabc.fiba.com/manual/level-1/l1-team/l1-2-offensive-tactics-and-strategies/2-1-offensive-movement/2-1-1-basic-floor-spacing-pass-and-cut-give-and-go/",
            used: "Método «cabeza, manos y pies» con conos; cortes al corazón; un corte por vez; pases cortos antes que cruzados; corte por la espalda contra la negación; pasar y cortar; juego del rompecabezas y sus reglas.",
            accessed: "26/11/2026"
        },
        {
            id: "S2",
            title: "WABC Coaches Manual Level 1 · 2.1.2 Motion offence 5-out: replacing the cutter",
            publisher: "FIBA · WABC",
            locator: "Nivel 1, Team, 2.1 Offensive movement",
            url: "https://wabc.fiba.com/manual/level-1/l1-team/l1-2-offensive-tactics-and-strategies/2-1-offensive-movement/2-1-2-motion-offence-5-out-replacing-the-cutter/",
            used: "Reemplazar al que cortó: el más cercano al hueco corta hacia el balón y ocupa el lugar; no seguir la línea de tres sino pasar por un lugar amenazante; equilibrio del resto.",
            accessed: "26/11/2026"
        },
        {
            id: "S3",
            title: "WABC Coaches Manual Level 1 · 2.1.3 Motion offence 5-out: purposeful movement, timing and spacing",
            publisher: "FIBA · WABC",
            locator: "Nivel 1, Team, 2.1 Offensive movement",
            url: "https://wabc.fiba.com/manual/level-1/l1-team/l1-2-offensive-tactics-and-strategies/2-1-offensive-movement/2-1-3-motion-offence-5-out-purposeful-movement-timing-and-spacing/",
            used: "Reglas de tiempo: el que corta y pasa la línea de libres sigue hasta el aro y su reemplazo arranca en ese momento; el dribbling que pasa el codo extendido sigue hacia el ala; regla opcional de frenar y mirar al balón dentro de la zona.",
            accessed: "26/11/2026"
        },
        {
            id: "S4",
            title: "WABC Coaches Manual Level 1 · 2.1.4 Motion offence 5-out: ball reversal",
            publisher: "FIBA · WABC",
            locator: "Nivel 1, Team, 2.1 Offensive movement",
            url: "https://wabc.fiba.com/manual/level-1/l1-team/l1-2-offensive-tactics-and-strategies/2-1-offensive-movement/2-1-4-motion-offence-5-out-ball-reversal/",
            used: "Mover el balón obliga a la defensa a desplazarse; el defensor en movimiento deja huecos para el dribbling; cierre largo desde la línea media; la defensa que se anticipa a la inversión abre una penetración arriba.",
            accessed: "26/11/2026"
        },
        {
            id: "S5",
            title: "WABC Coaches Manual Level 1 · 2.1.5 Motion offence 5-out: dribble penetration and receivers' principles",
            publisher: "FIBA · WABC",
            locator: "Nivel 1, Team, 2.1 Offensive movement",
            url: "https://wabc.fiba.com/manual/level-1/l1-team/l1-2-offensive-tactics-and-strategies/2-1-offensive-movement/2-1-5-motion-offence-5-out-dribble-penetration-receivers-principles/",
            used: "Advertencia contra las jugadas fijas que convierten a los jugadores en autómatas; principios de la penetración (cadera y hombro del defensor, anotar primero, dos pies dentro de la zona, parada en un tiempo, fintas); principios de los receptores (el contrario se abre, el del lado del balón se ubica detrás, el de arriba se queda).",
            accessed: "26/11/2026"
        },
        {
            id: "S6",
            title: "Official Basketball Rules 2024 (v1.0)",
            publisher: "FIBA. Vigente desde el 1 de octubre de 2024",
            locator: "Regla 2 (cancha y líneas)",
            url: "https://assets.fiba.basketball/image/upload/documents-corporate-fiba-official-rules-2024-v10.pdf",
            used: "Medidas de la cancha, la zona y la línea de tres de las pizarras.",
            accessed: "26/11/2026"
        }
    ];

    var unavailableSources = [
        {
            title: "WABC Coaches Manual Level 2 · 2.1.5 Developing decision making: putting perimeter and post together",
            url: "https://wabc.fiba.com/manual/level-2/l2-team/2-offensive-tactics-and-strategies/2-1-offensive-movement/2-1-5-developing-decision-making-putting-perimeter-and-post-together/",
            reason: "El sitio no permitió la consulta automática. Lo que decimos sobre el spacing con un jugador interior es interpretación de BasketIQ."
        }
    ];

    var aprender = [
        {
            id: "introduccion",
            number: "1",
            title: "Introducción",
            kind: "interpretation",
            blocks: [
                { p: "El spacing es la distancia entre los atacantes. Con buen espacio, cada defensor tiene que elegir entre ayudar y quedarse con su jugador, y cualquier elección deja algo libre. Con mal espacio, un defensor cubre a dos atacantes y la penetración choca con la ayuda." },
                { p: "Esta guía parte del ataque «cinco abiertos» del manual WABC de nivel 1: cómo ocupar los lugares, cortar, reemplazar, invertir el balón y ubicarse cuando un compañero penetra. En **Simular** podés comparar el mismo momento con buen espacio, con jugadores agrupados y con las esquinas vacías." }
            ]
        },
        {
            id: "definicion",
            number: "2",
            title: "Definición técnica",
            kind: "official",
            refs: ["S1", "S4"],
            blocks: [
                { p: "El manual WABC enseña el espaciado con cinco lugares marcados con conos en forma de figura humana: **cabeza** (arriba), **manos** (alas) y **pies** (esquinas). Los cortes van al «corazón», que es la zona, y vuelven a uno de esos lugares [S1]." },
                { p: "La **inversión del balón** es moverlo de un lado de la cancha al otro [S1]. Su sentido es obligar a la defensa a desplazarse y crear huecos [S4]." }
            ]
        },
        {
            id: "objetivos",
            number: "3",
            title: "Objetivos",
            kind: "interpretation",
            refs: ["S4", "S5"],
            blocks: [
                {
                    list: [
                        "**Separar a los defensores** para que sus ayudas sean largas.",
                        "**Abrir caminos** de penetración y de corte.",
                        "**Crear espacios de recepción** para el pase después de la penetración [S5].",
                        "**Hacer correr a la defensa** con la inversión del balón [S4].",
                        "**Enseñar a jugar**, no a repetir un recorrido fijo [S5]."
                    ]
                }
            ]
        },
        {
            id: "principios",
            number: "4",
            title: "Principios",
            kind: "official",
            refs: ["S1", "S2", "S3", "S5"],
            blocks: [
                {
                    list: [
                        "**Un jugador por lugar** y cortes de a uno, cuando el compañero de al lado tiene el balón [S1].",
                        "**Cortar al corazón** y volver a un lugar libre [S1].",
                        "**Pases cortos** antes que cruzados, sobre todo con jugadores jóvenes [S1].",
                        "**Reemplazar al que cortó**: el más cercano al hueco ocupa el lugar, pasando por un lugar amenazante y no por la línea de tres [S2].",
                        "**Respetar los tiempos**: el que corta y pasa la línea de libres sigue hasta el aro, y su reemplazo arranca en ese momento [S3].",
                        "**Ubicarse ante la penetración**: el del lado contrario se abre, el del lado del balón se coloca detrás del que penetra y el de arriba se queda [S5]."
                    ]
                }
            ]
        },
        {
            id: "explicacion",
            number: "5",
            title: "Explicación detallada",
            kind: "interpretation",
            refs: ["S1", "S2", "S3", "S4", "S5"],
            blocks: [
                { h: "5.1 Las esquinas" },
                { p: "Las esquinas son los lugares más lejos del balón cuando está arriba y los más difíciles de cubrir para la ayuda: el defensor de la esquina que sale a frenar una penetración deja el pase más corto hacia un tirador. Con las esquinas vacías, los defensores pueden esperar en la zona sin dejar a nadie." },
                { board: "cabeza-manos-pies" },
                { h: "5.2 Los cortes" },
                { p: "El corte va al corazón y vuelve a un lugar libre [S1]. Contra un defensor que niega el pase, el atacante sube, muestra las manos y corta por la espalda; contra un defensor que se aleja, corta derecho al aro [S1]. Una regla opcional del manual es que el que corta se frene dentro de la zona mirando al balón dos o tres segundos, para dar tiempo a que se muevan los de afuera [S3]." },
                { board: "corte-atras" },
                { h: "5.3 Los reemplazos" },
                { p: "Cuando alguien corta, queda un hueco. Lo ocupa el más cercano, que primero corta hacia el balón y después sale al lugar; los demás se equilibran [S2]. El tiempo importa: si el que corta desde arriba ya pasó la línea de libres, tiene que seguir al aro, y el reemplazo arranca en ese momento [S3]." },
                { h: "5.4 La inversión" },
                { p: "Cada pase de un lado al otro obliga a los defensores a correr. Un defensor que se está moviendo deja huecos para el dribbling, y la inversión rápida puede forzar un cierre largo desde la línea media hasta el perímetro [S4]. Si la defensa se anticipa a la inversión, el jugador de arriba puede penetrar [S4]." },
                { board: "inversion" },
                { h: "5.5 Las penetraciones" },
                { p: "El que penetra va a la cadera o al hombro del defensor, piensa primero en anotar, mete los dos pies en la zona, se frena en un tiempo y usa fintas para crear la penetración [S5]. Los receptores se ubican: el del lado contrario se abre para un tiro de afuera, el del lado del balón se coloca detrás del que penetra como salida, no demasiado cerca para que su defensor no moleste al de arriba, y el de arriba se queda para el equilibrio defensivo [S5]." },
                { board: "penetracion-receptores" },
                { h: "5.6 Los espacios de recepción" },
                { p: "Un buen espacio de recepción está lejos del defensor que ayuda y en la línea de un pase directo desde el balón. En la práctica son la esquina que dejó el defensor que ayudó, el ala contraria abierta y el lugar detrás del que penetra. Es una síntesis de BasketIQ a partir de los principios de los receptores [S5]." }
            ]
        },
        {
            id: "responsabilidades",
            number: "6",
            title: "Responsabilidades",
            kind: "interpretation",
            refs: ["S1", "S2", "S5"],
            blocks: [
                {
                    table: {
                        caption: "Qué hace cada lugar",
                        head: ["Lugar", "Con el balón cerca", "Cuando un compañero penetra"],
                        rows: [
                            ["Arriba (cabeza)", "Recibir la inversión; reemplazar al que corta [S2]", "Quedarse para el equilibrio defensivo [S5]"],
                            ["Ala del balón", "Pasar y cortar o recibir el reemplazo [S1]", "Si penetra el de arriba, ubicarse detrás del balón [S5]"],
                            ["Ala contraria", "Estar listo para la inversión", "Abrirse para el tiro [S5]"],
                            ["Esquinas (pies)", "Estirar la ayuda; subir a reemplazar [S2]", "Quedarse en la esquina o ubicarse detrás del balón, según el lado"]
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
                        "En el ataque cinco abiertos, como base de formación.",
                        "Después de un bloqueo directo: los que no participan sostienen el espacio para que la ayuda sea larga.",
                        "En transición, cuando la defensa llega y hay que ocupar lugares rápido.",
                        "Con un jugador interior: los cuatro de afuera se reparten los lugares y dejan la zona libre para el poste (interpretación; no pudimos leer el apartado WABC correspondiente)."
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
                { list: ["Ayudas defensivas más largas y tardías.", "Pases de descarga más fáciles.", "Todos los jugadores aprenden todos los lugares [S4].", "Se adapta a cualquier sistema posterior."] }
            ],
            refs: ["S4"]
        },
        {
            id: "limitaciones",
            number: "9",
            title: "Limitaciones y riesgos",
            kind: "interpretation",
            blocks: [
                {
                    list: [
                        "Sin cortes ni penetraciones, el espacio solo no genera nada.",
                        "Pases cruzados largos que se interceptan [S1].",
                        "Si todos están muy abiertos y nadie amenaza, la defensa se queda cerca de la zona igual.",
                        "Con mucho movimiento a la vez, los jugadores se pisan los lugares."
                    ]
                }
            ],
            refs: ["S1"]
        },
        {
            id: "errores",
            number: "10",
            title: "Errores frecuentes",
            kind: "interpretation",
            refs: ["S1", "S2", "S3"],
            blocks: [
                {
                    list: [
                        "Dos jugadores en el mismo lugar o a menos de dos o tres metros.",
                        "Cortar todos a la vez en lugar de uno por vez [S1].",
                        "Reemplazar caminando por la línea de tres [S2].",
                        "Frenarse en la zona después de pasar la línea de libres y taponar el camino [S3].",
                        "Acercarse al que penetra y traer al propio defensor a la ayuda.",
                        "Esquinas vacías sin motivo."
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
                        caption: "Error, corrección y consigna",
                        head: ["Error", "Corrección", "Consigna"],
                        rows: [
                            ["Dos en un lugar", "Volver a los conos", "«¡Un cono, un jugador!»"],
                            ["Corte sin sentido", "Cortar cuando el de al lado tiene el balón", "«¡De a uno!»"],
                            ["Reemplazo lento", "Primero hacia el balón, después al lugar", "«¡Llená!»"],
                            ["Se acerca al que penetra", "Abrirse o ubicarse detrás", "«¡Dale lugar!»"],
                            ["Esquina vacía", "Ocupar la esquina del lado de la penetración", "«¡Pies en la esquina!»"]
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
            refs: ["S1", "S5"],
            blocks: [
                {
                    ordered: true,
                    list: [
                        "**Lugares con conos** y juego del rompecabezas sin defensa [S1].",
                        "**Cortes y reemplazos** de a uno, primero sin defensa y después con defensa uno contra uno sin ayudas [S1].",
                        "**Reglas de tiempo** para los cortes y el dribbling [S3].",
                        "**Penetración y receptores** en 3 contra 0 y después 5 contra 0 [S5].",
                        "**Juego real** 5 contra 5 sin jugadas fijas, con preguntas [S5]."
                    ]
                },
                { p: "El manual advierte que enseñar jugadas fijas que se repiten sin importar lo que haga la defensa convierte a los jugadores en autómatas; propone enseñar espacio, movimiento, inversión y cuándo y cómo dribblear [S5]." }
            ]
        },
        {
            id: "progresiones",
            number: "13",
            title: "Progresiones",
            kind: "method",
            refs: ["S1", "S3", "S5"],
            blocks: [
                {
                    table: {
                        head: ["Paso", "Situación", "Qué se agrega"],
                        rows: [
                            ["1", "Rompecabezas con 5 jugadores y 6 conos [S1]", "Pases solo a un cono vecino"],
                            ["2", "Rompecabezas con movimientos simultáneos [S1]", "Reemplazos"],
                            ["3", "5 contra 0 con reglas de tiempo [S3]", "Corte que sigue al aro"],
                            ["4", "3 contra 0 de penetración y receptores [S5]", "Lugares de descarga"],
                            ["5", "5 contra 5 sin ayudas", "Corte por la espalda"],
                            ["6", "5 contra 5 libre", "Lectura completa"]
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
                { p: "El manual ubica estos contenidos en el nivel 1 y recomienda pases cortos con jugadores jóvenes [S1]. Proponemos:" },
                {
                    table: {
                        caption: "Propuesta de BasketIQ por etapa (no es una norma oficial)",
                        head: ["Categoría", "Contenido"],
                        rows: [
                            ["Minibásquet", "Lugares con conos, rompecabezas, pasar y cortar"],
                            ["U13", "Cinco abiertos con reemplazos y reglas de tiempo"],
                            ["U15", "Penetración y receptores, inversión con cierre largo"],
                            ["U17 en adelante", "Spacing combinado con bloqueos y con un jugador interior"]
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
                        "**Cuatro afuera y uno adentro**: el interior ocupa el poste bajo del lado del balón y los cuatro de afuera se reparten las alas y las esquinas.",
                        "**Tres afuera y dos adentro**: más juego interior, menos espacio para penetrar.",
                        "**Esquina vacía a propósito**: deja todo un lado para un uno contra uno o un bloqueo directo lateral."
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
            refs: ["S1"],
            blocks: [{ p: "Tres ejercicios en progresión. El primero es el juego del rompecabezas del manual WABC [S1]; los otros dos son propuestas de BasketIQ basadas en las reglas del manual." }]
        }
    ];

    var exercises = [
        {
            id: "ej-rompecabezas",
            name: "Juego del rompecabezas",
            meta: {
                fundamento: "Spacing",
                objetivo: "Ocupación de espacios",
                categories: ["Mini", "U13", "U15"],
                level: "Inicial",
                minPlayers: 5,
                maxPlayers: 12,
                minutes: [8, 10],
                court: "half",
                hoops: 1,
                materials: ["Balones", "Conos"],
                optionalMaterials: [],
                blockType: "tecnica"
            },
            adaptations: [
                {
                    id: "cuatro-jugadores",
                    label: "Con 4 jugadores y 5 conos",
                    text: "Mismas reglas con un cono menos: cuatro jugadores y un cono vacío.",
                    req: { minPlayers: 4 }
                }
            ],
            kind: "official",
            refs: ["S1"],
            board: "cabeza-manos-pies",
            objective: "Ocupar los lugares, pasar solo a un vecino y mover el hueco sin chocarse.",
            secondary: ["Pase corto", "Leer el lugar libre", "Moverse sin balón"],
            category: "Minibásquet a U15",
            level: "Inicial",
            players: "5 por grupo; hasta 12 con dos grupos que rotan",
            playersShort: "5 a 12 jugadores",
            duration: "8 a 10 minutos",
            space: "Media cancha",
            hoops: "1",
            materials: "6 conos en el perímetro y 1 balón",
            organization: "Seis conos en el perímetro: arriba, alas, esquinas y uno extra. Un jugador por cono; un cono queda vacío.",
            development: "Solo se pasa a un jugador parado en un cono vecino. Nadie puede pasar por un cono ocupado. Cada jugador tiene un tiempo máximo en su cono; al salir, deja un hueco para un compañero, aunque no reciba [S1].",
            rules: ["Un jugador por cono", "Pase solo a un cono vecino", "Tiempo máximo por cono: empezar con 5 o 6 segundos y bajar"],
            cues: ["«¡Un cono, un jugador!»", "«¡Mirá el hueco!»", "«¡Pase corto!»"],
            errors: ["Pasar a un cono lejano", "Dos jugadores yendo al mismo cono", "Quedarse quieto más del tiempo"],
            corrections: ["Señalar el cono vecino antes de pasar", "Decir el nombre del cono al moverse", "Contar en voz alta el tiempo"],
            variants: ["No volver al propio cono después de salir [S1]", "Movimientos simultáneos con reemplazos [S1]", "Pase y corte al corazón antes de ir al cono vacío"],
            progressions: ["Agregar defensa uno contra uno sin ayudas", "Pasar a 5 contra 0 con reglas de tiempo", "Quitar los conos"],
            regressions: ["Sin tiempo máximo", "Caminando", "Con dos conos vacíos"],
            evaluation: ["Pases a un vecino sin errores", "Huecos ocupados sin chocar", "Tiempo por cono respetado"],
            basis: "Juego del rompecabezas tal como lo describe el manual WABC de nivel 1 [S1]."
        },
        {
            id: "ej-cortes-reemplazos",
            name: "Cinco abiertos con cortes y reemplazos",
            meta: {
                fundamento: "Spacing",
                objetivo: "Cortes y reemplazos",
                categories: ["U13", "U15", "U17"],
                level: "Intermedio",
                minPlayers: 5,
                maxPlayers: 10,
                minutes: [10, 12],
                court: "half",
                hoops: 1,
                materials: ["Balones"],
                optionalMaterials: ["Conos"],
                blockType: "tactica"
            },
            adaptations: [
                {
                    id: "tres-abiertos",
                    label: "3 contra 0 (arriba y dos alas)",
                    text: "Tres jugadores en arriba y alas: pase, corte y reemplazo con la misma regla de tiempo.",
                    req: { minPlayers: 3 }
                }
            ],
            kind: "method",
            refs: ["S2", "S3"],
            board: "corte-atras",
            objective: "Cortar de a uno y reemplazar respetando los tiempos del manual.",
            secondary: ["Corte por la espalda", "Pasar por un lugar amenazante al reemplazar", "Equilibrio"],
            category: "U13 a U17",
            level: "Intermedio",
            players: "5 contra 0; 10 para jugar 5 contra 5 sin ayudas",
            playersShort: "5 a 10 jugadores",
            duration: "10 a 12 minutos",
            space: "Media cancha",
            hoops: "1",
            materials: "1 balón",
            organization: "Cinco jugadores en los lugares. Primero sin defensa; después con defensa uno contra uno sin ayudas.",
            development: "Cada pase permite un corte del jugador de al lado. El que corta y pasa la línea de libres sigue hasta el aro y su reemplazo arranca en ese momento [S3]. El que reemplaza primero corta hacia el balón y después sale al lugar [S2].",
            rules: ["Un corte por vez", "Diez pases sin repetir lugar antes de tirar", "Con defensa: el defensor no ayuda"],
            cues: ["«¡De a uno!»", "«¡Llená!»", "«¡Pasó la línea, seguí!»"],
            errors: ["Reemplazar por la línea de tres", "Dos cortes a la vez", "Frenarse en la zona sin mirar al balón"],
            corrections: ["Marcar con un cono el lugar amenazante", "El entrenador nombra al que corta", "Aplicar la regla de frenar y mirar dos o tres segundos [S3]"],
            variants: ["Corte por la espalda obligatorio si el defensor niega", "Dribbling que pasa el codo extendido sigue al ala [S3]", "Tiro solo después de un reemplazo"],
            progressions: ["Defensa con ayudas", "Agregar penetraciones", "5 contra 5 libre"],
            regressions: ["Sin regla de tiempo", "Cuatro jugadores", "Caminando"],
            evaluation: ["Cortes de a uno", "Reemplazos a tiempo", "Lugares ocupados después de cada corte"],
            basis: "Reglas de reemplazo y de tiempo del manual WABC de nivel 1 [S2][S3]. La regla de diez pases es de BasketIQ."
        },
        {
            id: "ej-penetrar-descargar",
            name: "Penetrar y descargar con receptores",
            meta: {
                fundamento: "Spacing",
                objetivo: "Penetrar y descargar",
                categories: ["U15", "U17", "Primera"],
                level: "Intermedio",
                minPlayers: 6,
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
                    id: "tres-contra-cero",
                    label: "3 contra 0",
                    text: "Uno penetra y los otros dos se ubican: uno cerca del aro y otro frente al que penetra, como introduce el manual [S5].",
                    req: { minPlayers: 3 }
                }
            ],
            kind: "method",
            refs: ["S5"],
            board: "penetracion-receptores",
            objective: "Penetrar con los dos pies dentro de la zona y que los receptores ocupen los espacios de descarga.",
            secondary: ["Anotar primero", "Parada en un tiempo", "Equilibrio defensivo del de arriba"],
            category: "U15 en adelante",
            level: "Intermedio",
            players: "6 (3 contra 3); hasta 12 con rotación",
            playersShort: "6 a 12 jugadores",
            duration: "10 a 15 minutos",
            space: "Media cancha",
            hoops: "1",
            materials: "1 balón",
            organization: "3 contra 3 desde arriba y las dos alas. Más tarde 4 contra 4 con una esquina y 5 contra 5.",
            development: "El ataque solo puede tirar después de una penetración con los dos pies dentro de la zona. En cada penetración, el del lado contrario se abre, el del lado del balón se ubica detrás y el de arriba se queda [S5].",
            rules: ["Tiro solo después de una penetración", "Punto extra si el tiro llega desde una descarga", "El de arriba no entra a la zona"],
            cues: ["«¡Dos pies adentro!»", "«¡Dale lugar!»", "«¡Arriba, quedate!»"],
            errors: ["Penetrar y frenarse afuera de la zona", "Receptores que se acercan al que penetra", "Todos al rebote"],
            corrections: ["Marcar la zona con conos", "Congelar y revisar los lugares", "Asignar al de arriba antes de empezar"],
            variants: ["Penetración desde el ala", "Penetración por el fondo", "Defensa que ayuda desde la esquina"],
            progressions: ["4 contra 4 con una esquina", "5 contra 5", "Defensa con cierres agresivos"],
            regressions: ["Defensa pasiva", "3 contra 0", "Sin dribbling previo: penetración desde la recepción"],
            evaluation: ["Penetraciones con dos pies dentro", "Receptores en su lugar", "Tiros desde descarga"],
            basis: "Principios de la penetración y de los receptores del manual WABC de nivel 1 [S5]. La organización y las reglas de puntos son de BasketIQ."
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
                        "Un jugador por lugar, con las esquinas ocupadas",
                        "Cortes de a uno, al corazón y de vuelta a un lugar libre",
                        "Reemplazos a tiempo y pasando por un lugar amenazante",
                        "Inversiones rápidas que provocan cierres largos",
                        "Penetraciones con los dos pies dentro de la zona",
                        "Receptores que se abren o se ubican detrás, sin acercarse"
                    ]
                },
                {
                    table: {
                        caption: "Indicadores",
                        head: ["Indicador", "Cómo medirlo"],
                        rows: [
                            ["Tiros desde descarga", "Contar por posesión"],
                            ["Lugares duplicados", "Contar las veces que dos atacantes quedan a menos de 3 m"],
                            ["Inversiones por posesión", "Contar cambios de lado del balón"]
                        ]
                    }
                }
            ]
        },
        {
            id: "evaluar-preguntas",
            title: "Autoevaluación",
            kind: "method",
            refs: ["S1", "S3", "S5"],
            blocks: [
                { qa: "¿Qué son la cabeza, las manos y los pies?", answer: ["Los cinco lugares del método WABC: arriba, las dos alas y las dos esquinas [S1]."] },
                { qa: "¿Cuándo arranca el reemplazo del que corta desde arriba?", answer: ["Cuando el que corta pasa la línea de libres; desde ahí tiene que seguir hasta el aro [S3]."] },
                { qa: "¿Dónde se ubican los receptores cuando un compañero penetra?", answer: ["El del lado contrario se abre, el del lado del balón se coloca detrás del que penetra y el de arriba se queda [S5]."] },
                { qa: "¿Por qué el manual desaconseja enseñar jugadas fijas a los más jóvenes?", answer: ["Porque convierten a los jugadores en autómatas que se mueven igual sin importar la defensa [S5]."] }
            ]
        }
    ];

    // ------------------------------------------------------------------
    // Simulador de spacing
    // ------------------------------------------------------------------
    function pos(o, x) { var r = {}; Object.keys(o).forEach(function (k) { r[k] = o[k]; }); Object.keys(x || {}).forEach(function (k) { r[k] = x[k]; }); return r; }
    var BASE = pos(SPOTS, DEF);

    var SIM = {
        id: "sim-spacing",
        title: "Simulador de spacing",
        intro: "Compará el mismo momento del ataque con buen espacio y con espacio malo. El simulador usa lógica local: muestra posiciones plausibles de la defensa, no un resultado garantizado.",
        view: VIEW,
        tags: ["Spacing", "Academy"],
        ui: {
            variants: "Spacing del ataque",
            positions: "Momento",
            hint: "Elegí el spacing arriba y recorré los momentos. Tocá un defensor para ver qué hace.",
            resp: "Qué hace cada defensor",
            help: "Por qué pasa",
            vulnerable: "Espacios de recepción",
            options: "Opciones del ataque",
            disclaimer: "Las posiciones defensivas son una reacción plausible, no la única posible.",
            noTarget: "Usá los botones de momento para mover el balón."
        },
        players: withDefense(),
        positions: [
            { id: "inicio", label: "Balón en el ala", group: "Momento" },
            { id: "penetracion", label: "Penetración", group: "Momento" },
            { id: "corte", label: "Corte y reemplazo", group: "Momento" },
            { id: "inversion", label: "Inversión", group: "Momento" }
        ],
        tour: ["inicio", "penetracion", "corte", "inversion"],
        variants: [
            {
                id: "base",
                label: "Cinco abiertos",
                kind: "official",
                refs: ["S1", "S5"],
                desc: "Un jugador en cada lugar: arriba, alas y esquinas [S1]. Las reacciones defensivas son una interpretación de BasketIQ.",
                states: {
                    inicio: {
                        title: "Cinco abiertos, balón en el ala",
                        note: "Cada atacante en un lugar. Los defensores lejos del balón se ubican entre su jugador y el aro, pero lejos unos de otros.",
                        ball: "o2",
                        pos: BASE,
                        resp: {
                            x1: "A un pase: entre el 1 y la línea de pase.",
                            x2: "Sobre el balón.",
                            x3: "A dos pases: en la línea media.",
                            x4: "A un pase, en la esquina: cerca de su jugador.",
                            x5: "Lado débil, cerca de la zona."
                        },
                        help: "Con las esquinas ocupadas, el defensor que ayude va a dejar a un jugador a un pase corto.",
                        vulnerable: [
                            { x: 0.4, y: 13.2, w: 2.2, h: 1.8, label: "Esquina", text: "Si X5 ayuda, la esquina queda libre." },
                            { x: 6.0, y: 11.8, w: 2.0, h: 2.0, label: "Ala contraria", text: "Destino de la inversión." }
                        ]
                    },
                    penetracion: {
                        title: "Penetración con receptores en su lugar",
                        note: "El 2 penetra con los dos pies en la zona. El 4 se ubica detrás del balón, el 3 se abre y el 1 se queda arriba [S5]. X5 sale a frenar y deja la esquina.",
                        ball: "o2",
                        moves: { o2: "dribble" },
                        pos: pos(BASE, { o2: [3.6, 5.8], o4: [5.2, 1.2], o3: [7.4, 13.2], o1: [9.4, 7.0], x2: [4.4, 4.6], x5: [2.4, 6.9], x3: [4.0, 9.8], x1: [7.6, 6.4], x4: [3.0, 2.4] }),
                        resp: {
                            x1: "Se cierra hacia la zona sin dejar del todo al 1.",
                            x2: "Persigue la penetración por detrás.",
                            x3: "Queda entre el 3 y el 5: no llega a los dos.",
                            x4: "Elige entre ayudar y quedarse con el 4.",
                            x5: "Sale a frenar la penetración."
                        },
                        help: "La ayuda de X5 es larga: cuando llega, deja la esquina a un pase directo.",
                        options: [["pass", "o2", "o5"], ["pass", "o2", "o4"], ["shot", "o2", HOOP]],
                        optionsText: ["Descarga a la esquina que dejó X5.", "Salida detrás del balón si X4 ayuda.", "Anotar si nadie frena [S5]."],
                        vulnerable: [{ x: 0.4, y: 13.2, w: 2.2, h: 1.8, label: "Esquina libre", text: "X5 la dejó para ayudar." }]
                    },
                    corte: {
                        title: "Corte por la espalda y reemplazos",
                        note: "X1 niega y el 1 corta por la espalda. El 3 reemplaza arriba y el 5 sube al ala [S1][S2].",
                        ball: "o2",
                        moves: { o1: "cut", o3: "move", o5: "move" },
                        pos: pos(BASE, { o1: [3.2, 6.4], o3: [8.8, 7.8], o5: [6.4, 12.8], x1: [4.4, 6.6], x3: [7.8, 8.6], x5: [5.4, 11.8] }),
                        resp: {
                            x1: "Persigue el corte desde atrás.",
                            x2: "Presiona el balón.",
                            x3: "Sigue al 3 hacia arriba.",
                            x4: "Se queda con el 4.",
                            x5: "Sube con el 5: ya no hay nadie en la zona del lado débil."
                        },
                        help: "Los reemplazos sacaron a los defensores de la zona: el corte llega sin ayuda.",
                        options: [["pass", "o2", "o1"], ["pass", "o2", "o3"]],
                        optionsText: ["Pase al corte.", "Pase al que reemplazó arriba para invertir."],
                        vulnerable: [{ x: 1.0, y: 5.4, w: 3.4, h: 3.0, label: "Zona libre", text: "Nadie espera en la zona." }]
                    },
                    inversion: {
                        title: "Inversión y cierre largo",
                        note: "El balón va del 2 al 1 y del 1 al 3. X3 estaba en la línea media y cierra desde lejos [S4].",
                        ball: "o3",
                        pos: pos(BASE, { x1: [7.8, 8.6], x2: [5.0, 4.4], x3: [5.9, 11.7], x4: [2.4, 3.2], x5: [2.2, 12.9] }),
                        resp: {
                            x1: "Se corre con el balón.",
                            x2: "Baja a la línea media.",
                            x3: "Cierre largo: llega corriendo.",
                            x4: "Se corre hacia la zona.",
                            x5: "A un pase, en la esquina."
                        },
                        help: "El defensor que llega corriendo es fácil de superar con un dribbling [S4].",
                        options: [["dribble", "o3", [3.9, 10.9]], ["shot", "o3", HOOP]],
                        optionsText: ["Atacar el cierre con dribbling.", "Tiro si el cierre llega corto."]
                    }
                }
            },
            {
                id: "agrupados",
                label: "Jugadores agrupados",
                kind: "interpretation",
                desc: "El 4 sube cerca del 2, el 3 baja hacia la zona y el 5 se mete en el poste bajo. Un defensor puede cubrir a dos.",
                states: {
                    inicio: {
                        title: "Agrupados: balón en el ala",
                        note: "El 4 está a menos de dos metros y medio del 2 y el 5 está en el poste bajo. Las ayudas quedan cortas.",
                        ball: "o2",
                        pos: { o1: [8.6, 7.2], o2: [6.7, 2.4], o3: [6.2, 10.6], o4: [4.8, 1.4], o5: [1.8, 10.6], x1: [7.6, 6.6], x2: [5.9, 3.1], x3: [5.4, 9.8], x4: [4.2, 2.2], x5: [2.4, 9.8] },
                        resp: {
                            x1: "Entre el 1 y el balón.",
                            x2: "Sobre el balón.",
                            x3: "Cerca de la zona y del 3 a la vez.",
                            x4: "Cuida al 4 y la penetración con el mismo paso.",
                            x5: "Pegado al 5, ya dentro de la zona."
                        },
                        help: "Cuando dos atacantes están cerca, un defensor llega a los dos."
                    },
                    penetracion: {
                        title: "Agrupados: la penetración choca",
                        note: "El 2 penetra y X4 lo frena sin dejar al 4, que está al lado. X5 ya estaba en la zona.",
                        ball: "o2",
                        moves: { o2: "dribble" },
                        pos: { o1: [8.6, 7.2], o2: [3.8, 5.6], o3: [6.2, 10.6], o4: [4.8, 1.4], o5: [1.8, 10.6], x1: [7.4, 6.6], x2: [4.8, 4.4], x3: [4.4, 8.6], x4: [3.6, 4.4], x5: [2.4, 7.4] },
                        resp: {
                            x1: "Se cierra sin riesgo: el 1 está lejos de todo.",
                            x2: "Persigue al balón.",
                            x3: "Cierra la zona: el 3 está cerca.",
                            x4: "Frena la penetración y sigue a un paso del 4.",
                            x5: "Ayuda sin moverse casi: ya estaba en la zona."
                        },
                        help: "Las ayudas son cortas porque los atacantes trajeron a sus defensores cerca del balón.",
                        options: [["pass", "o2", "o4"], ["pass", "o2", "o1"]],
                        optionsText: ["Pase al 4: X4 recupera con un paso.", "Pase largo al 1: posible, pero lento y con riesgo."]
                    },
                    corte: {
                        title: "Agrupados: el corte no tiene lugar",
                        note: "El 1 corta por la espalda, pero X5 y X3 esperan en la zona. No hubo reemplazos que los sacaran.",
                        ball: "o2",
                        moves: { o1: "cut" },
                        pos: { o1: [3.4, 6.6], o2: [6.7, 2.4], o3: [6.2, 10.6], o4: [4.8, 1.4], o5: [1.8, 10.6], x1: [4.6, 6.6], x2: [5.9, 3.1], x3: [5.0, 9.4], x4: [4.2, 2.2], x5: [2.4, 8.4] },
                        resp: {
                            x1: "Persigue el corte.",
                            x2: "Presiona el balón.",
                            x3: "Se queda cerca de la zona.",
                            x4: "Con el 4.",
                            x5: "Espera el corte en la zona."
                        },
                        help: "Un corte necesita una zona vacía; acá la ocupan dos defensores.",
                        options: [["pass", "o2", "o1"], ["pass", "o2", "o4"]],
                        optionsText: ["Pase al corte: X5 llega a molestar.", "Pase corto al 4, sin ventaja."]
                    },
                    inversion: {
                        title: "Agrupados: la inversión no estira",
                        note: "El balón llega al 3, pero X3 estaba cerca: el cierre es corto.",
                        ball: "o3",
                        pos: { o1: [8.6, 7.2], o2: [6.7, 2.4], o3: [6.2, 10.6], o4: [4.8, 1.4], o5: [1.8, 10.6], x1: [7.6, 8.0], x2: [5.0, 4.6], x3: [5.4, 10.0], x4: [3.8, 3.0], x5: [2.4, 9.8] },
                        resp: {
                            x1: "Se corre con el balón.",
                            x2: "A la línea media.",
                            x3: "Cierre corto: llega equilibrado.",
                            x4: "Se cierra a la zona.",
                            x5: "Con el 5 y en la ayuda a la vez."
                        },
                        help: "Sin distancia no hay cierre largo: la inversión no genera ventaja.",
                        options: [["pass", "o3", "o5"], ["dribble", "o3", [4.4, 9.2]]],
                        optionsText: ["Pase al 5, defendido.", "Penetración hacia dos defensores."]
                    }
                }
            },
            {
                id: "esquinas-vacias",
                label: "Esquinas vacías",
                kind: "interpretation",
                desc: "El 4 y el 5 esperan cerca de los codos en lugar de en las esquinas. Sus defensores pueden quedarse dentro de la zona.",
                states: {
                    inicio: {
                        title: "Esquinas vacías: balón en el ala",
                        note: "Nadie en las esquinas. X4 y X5 defienden dentro de la zona sin dejar a sus jugadores.",
                        ball: "o2",
                        pos: { o1: [9.0, 7.5], o2: [6.7, 2.4], o3: [6.7, 12.6], o4: [4.6, 4.2], o5: [4.6, 10.8], x1: [8.0, 6.5], x2: [5.9, 3.1], x3: [5.8, 11.6], x4: [3.6, 4.6], x5: [3.6, 10.4] },
                        resp: {
                            x1: "Entre el 1 y el balón.",
                            x2: "Sobre el balón.",
                            x3: "Con el 3.",
                            x4: "Dentro de la zona, a un paso del 4.",
                            x5: "Dentro de la zona, a un paso del 5."
                        },
                        help: "Sin jugadores en las esquinas, la ayuda no tiene que salir de la zona.",
                        vulnerable: [{ x: 0.4, y: 0.2, w: 2.4, h: 2.0, label: "Esquina vacía", text: "No hay nadie para recibir la descarga." }]
                    },
                    penetracion: {
                        title: "Esquinas vacías: penetración por el fondo",
                        note: "El 2 penetra por el fondo porque es el único camino abierto. X4 sale desde la zona y lo frena.",
                        ball: "o2",
                        moves: { o2: "dribble" },
                        pos: { o1: [9.0, 7.5], o2: [2.8, 2.6], o3: [6.7, 12.6], o4: [4.6, 4.2], o5: [4.6, 10.8], x1: [7.8, 6.8], x2: [4.0, 2.0], x3: [5.4, 11.0], x4: [2.6, 4.0], x5: [3.0, 8.2] },
                        resp: {
                            x1: "Se cierra a la zona.",
                            x2: "Persigue por el fondo.",
                            x3: "Entre el 3 y el 5.",
                            x4: "Frena la penetración sin dejar al 4 lejos.",
                            x5: "Cierra el centro de la zona."
                        },
                        help: "No hay esquina para descargar: el pase más cercano es al 4, cuyo defensor está al lado.",
                        options: [["pass", "o2", "o4"], ["pass", "o2", "o1"]],
                        optionsText: ["Pase al 4: X4 recupera rápido.", "Pase largo al 1: cruza la zona."]
                    },
                    corte: {
                        title: "Esquinas vacías: el corte choca con la ayuda",
                        note: "El 1 corta por la espalda, pero X4 y X5 están dentro de la zona.",
                        ball: "o2",
                        moves: { o1: "cut" },
                        pos: { o1: [3.2, 7.2], o2: [6.7, 2.4], o3: [6.7, 12.6], o4: [4.6, 4.2], o5: [4.6, 10.8], x1: [4.4, 7.0], x2: [5.9, 3.1], x3: [5.8, 11.6], x4: [3.4, 5.2], x5: [3.6, 9.6] },
                        resp: {
                            x1: "Persigue el corte.",
                            x2: "Presiona el balón.",
                            x3: "Con el 3.",
                            x4: "Corta la línea de pase al corte.",
                            x5: "Espera el corte desde el otro lado."
                        },
                        help: "Los jugadores en los codos dejan a sus defensores dentro de la zona, justo donde va el corte.",
                        options: [["pass", "o2", "o1"], ["pass", "o2", "o4"]],
                        optionsText: ["Pase al corte, disputado.", "Pase al 4 en el codo."]
                    },
                    inversion: {
                        title: "Esquinas vacías: inversión sin esquina",
                        note: "El balón llega al 3. Sin el 5 en la esquina, la penetración por el fondo es el único camino y X5 la espera.",
                        ball: "o3",
                        pos: { o1: [9.0, 7.5], o2: [6.7, 2.4], o3: [6.7, 12.6], o4: [4.6, 4.2], o5: [4.6, 10.8], x1: [7.8, 8.4], x2: [5.2, 3.0], x3: [5.4, 11.4], x4: [3.4, 5.0], x5: [3.6, 10.0] },
                        resp: {
                            x1: "Se corre con el balón.",
                            x2: "Se cierra a la línea media.",
                            x3: "Cierre corto: ya estaba cerca.",
                            x4: "En la zona.",
                            x5: "Espera la penetración por el fondo."
                        },
                        help: "La inversión sirve si hay a quién encontrar del otro lado; sin esquina, la defensa se acomoda fácil.",
                        options: [["dribble", "o3", [5.2, 13.8]], ["pass", "o3", "o5"]],
                        optionsText: ["Penetración por el fondo contra X5.", "Pase al 5 en el codo."]
                    }
                }
            }
        ]
    };

    return {
        id: "spacing",
        sectionId: "spacing_ataque",
        title: "Spacing en ataque",
        subtitle: "Esquinas, cortes, reemplazos, inversión y penetraciones: cómo ocupar los espacios para que la defensa no llegue, con fuentes WABC.",
        sectionLabel: "Ataque · Conceptos",
        playCategory: "Ataque",
        meta: ["Ataque", "Desde minibásquet", "4 pizarras animadas", "Simulador comparativo", "3 ejercicios"],
        updated: "2026-11-26",
        tabs: {
            aprender: aprender,
            visualizar: ["cabeza-manos-pies", "corte-atras", "inversion", "penetracion-receptores"],
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
