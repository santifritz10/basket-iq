/*
 * Basket Lab Academy · Pick and roll (bloqueo directo y continuación)
 *
 * Contenido redactado en español por BasketIQ. Las citas [S1]..[S7] remiten a la
 * bibliografía del final, consultada directamente. Los nombres de las coberturas
 * (drop, switch, hedge, blitz, ice) son los de uso habitual; cuando el manual WABC usa
 * otro nombre para la misma idea, lo decimos en el texto.
 *
 * Coordenadas: metros sobre la cancha FIBA. x = distancia a la línea de fondo (aro en
 * x = 1,575), y = ancho (0 a 15). El lado derecho de la pantalla es y chica.
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

    // ------------------------------------------------------------------
    // Pizarras
    // ------------------------------------------------------------------
    var boards = [
        {
            id: "central",
            title: "Pick and roll central con el poste contrario que sube",
            kind: "official",
            refs: ["S6"],
            intro: "Un bloqueo directo temprano para el base en el centro de la cancha. Cuando el bloqueador continúa al aro, el poste del lado contrario sube y abre un juego de poste alto y poste bajo [S6].",
            spec: {
                view: VIEW,
                players: {
                    o1: O("1", 9.0, 7.5), o2: O("2", 6.4, 1.6), o3: O("3", 6.4, 13.4), o4: O("4", 5.4, 7.6), o5: O("5", 2.2, 10.4),
                    x1: D("1", 8.1, 7.5), x2: D("2", 5.6, 2.6), x3: D("3", 5.6, 12.4), x4: D("4", 4.6, 7.4), x5: D("5", 2.6, 9.6)
                },
                phases: [
                    {
                        name: "Llega el bloqueo",
                        note: "El 4 sube desde el poste alto y bloquea al defensor del base del lado del medio.",
                        ball: "o1",
                        strokes: [
                            ["screen_on", "o4", [8.4, 8.5]],
                            ["move", "x4", [7.2, 8.6]]
                        ]
                    },
                    {
                        name: "Uso del bloqueo",
                        note: "El 1 sale del bloqueo con dribbling. El 4 continúa al aro y el 5, del lado contrario, sube hacia la línea de libres extendida.",
                        strokes: [
                            ["dribble", "o1", [7.4, 5.4], 0.4],
                            ["rotation", "x1", [8.0, 6.4]],
                            ["rotation", "x4", [6.4, 6.0]],
                            ["cut", "o4", [3.4, 7.0], 0.3],
                            ["move", "o5", [5.6, 10.6]],
                            ["move", "x5", [4.6, 9.6]]
                        ]
                    },
                    {
                        name: "Inversión al poste que subió",
                        note: "Si el 1 no tiene ventaja, invierte el balón al 5. Con el 4 cerca del aro y el 5 arriba, aparece el juego de poste alto a poste bajo. El bloqueo no termina la jugada: abre la siguiente [S6].",
                        strokes: [
                            ["pass", "o1", "o5"],
                            ["move", "x5", [5.4, 9.8]],
                            ["move", "o4", [2.4, 6.8]]
                        ]
                    },
                    {
                        name: "Poste alto · poste bajo",
                        note: "El 5 puede tirar si su defensor no sale (el manual pide que ese jugador pueda tirar o penetrar), o pasar al 4 sellado debajo [S6]."
                    }
                ]
            },
            explain: [
                "El manual WABC de nivel 2 insiste en que estas acciones no sean «terminales»: tienen que llevar a otra acción. Y pide que el bloqueador sepa continuar al aro, abrirse (flare) y jugar con dribbling [S6]."
            ]
        },
        {
            id: "por-debajo",
            title: "Pasar por debajo y a través del bloqueo",
            kind: "official",
            refs: ["S1", "S2"],
            intro: "Dos técnicas básicas que el manual WABC de nivel 1 enseña para el defensor del balón: pasar por debajo (under) y a través (through) [S1] [S2].",
            spec: {
                view: VIEW,
                players: {
                    o1: O("1", 8.6, 6.2), o5: O("5", 7.9, 7.2),
                    x1: D("1", 7.8, 6.0), x5: D("5", 6.9, 7.3)
                },
                phases: [
                    {
                        name: "Bloqueo directo",
                        note: "El 5 bloquea al defensor del base. X5 decide cómo se ubica según la técnica elegida.",
                        ball: "o1",
                        strokes: [
                            ["dribble", "o1", [7.6, 8.8], -0.3],
                            ["move", "x5", [6.6, 7.6]],
                            ["rotation", "x1", [6.9, 8.6], 0.5]
                        ]
                    },
                    {
                        name: "Under / through",
                        note: "Under: X5 se pega al bloqueador y X1 pasa por debajo de los dos para cortar el camino del base antes de que llegue a la zona [S1]. Through: X5 da un paso atrás y le abre a X1 un camino entre el bloqueador y él [S2]."
                    }
                ]
            },
            explain: [
                "Pasar por debajo cuida la penetración pero concede el tiro detrás del bloqueo: por eso el manual de nivel 3 sugiere pasar por arriba si el base es buen tirador y por debajo si no lo es [S5]."
            ]
        },
        {
            id: "push-doble",
            title: "Ice (push) y el dos contra uno sobre el balón",
            kind: "official",
            refs: ["S3"],
            intro: "En el push, que el manual también llama ice, la defensa intenta que el base dribblee alejándose del bloqueo. Una variante es atrapar al balón con los dos defensores del bloqueo [S3].",
            spec: {
                view: VIEW,
                players: {
                    o1: O("1", 7.8, 3.0), o5: O("5", 7.3, 4.1), o2: O("2", 1.0, 0.7), o3: O("3", 6.6, 12.6), o4: O("4", 1.0, 14.3),
                    x1: D("1", 8.3, 3.9), x5: D("5", 5.8, 2.4), x2: D("2", 2.0, 1.8), x3: D("3", 5.4, 10.6), x4: D("4", 2.4, 12.0)
                },
                phases: [
                    {
                        name: "Ice: negar el bloqueo",
                        note: "X1 se ubica del lado del bloqueo y X5 se adelanta hacia la línea de fondo. El base no puede usar el bloqueo: tiene que ir hacia la banda.",
                        ball: "o1",
                        strokes: [
                            ["dribble", "o1", [6.4, 1.8]],
                            ["rotation", "x1", [7.1, 2.3]],
                            ["rotation", "x5", [5.5, 2.4]]
                        ]
                    },
                    {
                        name: "Doble sobre el balón",
                        note: "Variante: X5 y X1 atrapan al base. El bloqueador queda libre, así que un defensor de la línea de división (acá X4) tiene que meterse entre el 5 y el balón [S3].",
                        strokes: [
                            ["move", "x5", [5.8, 1.4]],
                            ["move", "x1", [6.9, 1.2]],
                            ["cut", "o5", [5.2, 5.0]],
                            ["rotation", "x4", [4.4, 6.0]],
                            ["move", "x3", [4.2, 10.6]]
                        ]
                    },
                    {
                        name: "Riesgo",
                        note: "Si el pase sale por encima de la trampa, el ataque juega cuatro contra tres detrás. La ayuda desde el lado débil tiene que llegar antes que el pase."
                    }
                ]
            }
        },
        {
            id: "show-lateral",
            title: "Pick and roll lateral: mostrar y recuperar",
            kind: "official",
            refs: ["S5"],
            intro: "Con un bloqueo fuera de la línea de tres, el manual WABC de nivel 3 describe que el defensor del bloqueador muestra fuerte y recupera sobre el bloqueador que corta, mientras los demás se hunden [S5].",
            spec: {
                view: VIEW,
                players: {
                    o1: O("1", 7.8, 3.0), o5: O("5", 7.3, 4.1), o2: O("2", 1.0, 0.7), o3: O("3", 6.6, 12.6), o4: O("4", 1.0, 14.3),
                    x1: D("1", 7.0, 3.2), x5: D("5", 6.6, 4.9), x2: D("2", 2.0, 1.8), x3: D("3", 5.4, 10.6), x4: D("4", 2.4, 12.0)
                },
                phases: [
                    {
                        name: "Mostrar",
                        note: "El base sale del bloqueo. X5 sale fuerte al camino del balón (show) para frenarlo y alejarlo del aro; X1 pasa por arriba del bloqueo.",
                        ball: "o1",
                        strokes: [
                            ["dribble", "o1", [7.6, 5.6], 0.3],
                            ["rotation", "x5", [6.7, 5.9]],
                            ["rotation", "x1", [8.1, 4.7], 0.4],
                            ["move", "x4", [3.4, 8.8]],
                            ["move", "x2", [2.4, 2.4]]
                        ]
                    },
                    {
                        name: "Recuperar",
                        note: "El 5 continúa al aro. X5 vuelve a tomarlo, X1 recupera al base y X4, que se hundió, frena la continuación hasta que X5 llega.",
                        strokes: [
                            ["cut", "o5", [4.0, 5.4], 0.3],
                            ["rotation", "x5", [4.8, 5.2]],
                            ["move", "x1", [7.0, 5.9]],
                            ["rotation", "x4", [3.2, 7.0]]
                        ]
                    },
                    {
                        name: "Cada uno con el suyo",
                        note: "Si la recuperación es a tiempo, la defensa vuelve a estar emparejada. Si X4 se queda con el 5, el 4 queda libre en la esquina: es la lectura que busca el ataque."
                    }
                ]
            }
        }
    ];

    // ------------------------------------------------------------------
    // Fuentes
    // ------------------------------------------------------------------
    var sources = [
        {
            id: "S1",
            title: "WABC Coaches Manual Level 1 · 1.2.5 Defending on ball screens - under",
            publisher: "FIBA · World Association of Basketball Coaches (WABC)",
            locator: "Nivel 1, Team, 1 Defensive tactics and strategies, 1.2 Defending screens",
            url: "https://wabc.fiba.com/manual/level-1/l1-team/l1-1-defensive-tactics-and-strategies/1-2-defending-screens/1-2-5-defending-on-ball-screens-under/",
            used: "Las cinco técnicas básicas contra el bloqueo directo (por debajo, por arriba, a través, cambio y doble) y cómo se pasa por debajo.",
            accessed: "26/11/2026"
        },
        {
            id: "S2",
            title: "WABC Coaches Manual Level 1 · 1.2.7 Defending on ball screens - through",
            publisher: "FIBA · WABC",
            locator: "Nivel 1, Team, 1.2 Defending screens",
            url: "https://wabc.fiba.com/manual/level-1/l1-team/l1-1-defensive-tactics-and-strategies/1-2-defending-screens/1-2-7-defending-on-ball-screens-through/",
            used: "Pasar a través: el defensor del bloqueador da un paso atrás y abre un camino para el defensor del balón.",
            accessed: "26/11/2026"
        },
        {
            id: "S3",
            title: "WABC Coaches Manual Level 2 · 1.2.1 Defending on ball screens - push",
            publisher: "FIBA · WABC",
            locator: "Nivel 2, Team, 1 Defensive tactics and strategies, 1.2 Defending screens",
            url: "https://wabc.fiba.com/manual/level-2/l2-team/1-defensive-tactics-and-strategies/1-2-defending-screens/1-2-1-defending-on-ball-screens-push/",
            used: "Push o ice: obligar al base a dribblear alejándose del bloqueo. Variante de doble sobre el balón con ayuda desde la línea de división, que se mete entre el bloqueador y el balón.",
            accessed: "26/11/2026"
        },
        {
            id: "S4",
            title: "WABC Coaches Manual Level 2 · 1.2.2 Defending on ball screens - weak",
            publisher: "FIBA · WABC",
            locator: "Nivel 2, Team, 1.2 Defending screens",
            url: "https://wabc.fiba.com/manual/level-2/l2-team/1-defensive-tactics-and-strategies/1-2-defending-screens/1-2-2-defending-on-ball-screens-weak/",
            used: "Weak: llevar al base hacia su mano o lado no preferido; el defensor del bloqueador se separa del bloqueo y presiona en esa dirección; por qué no conviene pasar por debajo en ese caso.",
            accessed: "26/11/2026"
        },
        {
            id: "S5",
            title: "WABC Coaches Manual Level 3 · 1.2.2 Having multiple defences against on-ball screens",
            publisher: "FIBA · WABC (incluye fragmentos de un artículo de Dusko Ivanovic en FIBA Assist)",
            locator: "Nivel 3, Team, 1 Defensive tactics and strategies, 1.2 Defensive schemes",
            url: "https://wabc.fiba.com/manual/level-3/l3-team/1-defensive-tactics-and-strategies/1-2-defensive-schemes/1-2-2-having-multiple-defences-against-on-ball-screens/",
            used: "Tener más de una respuesta al bloqueo directo; mostrar y recuperar fuera de la línea de tres; contener dentro de la línea de tres; pasar por arriba o por debajo según el tirador; cambio en el pick and roll lateral con rotación del otro interior; trampa al poste.",
            accessed: "26/11/2026"
        },
        {
            id: "S6",
            title: "WABC Coaches Manual Level 2 · 2.2.1 Off ball screens - middle pick and roll",
            publisher: "FIBA · WABC",
            locator: "Nivel 2, Team, 2 Offensive tactics and strategies, 2.2 Screening",
            url: "https://wabc.fiba.com/manual/level-2/l2-team/2-offensive-tactics-and-strategies/2-2-screening/2-2-1-off-ball-screens-middle-pick-and-roll/",
            used: "Bloqueos directos tempranos en el centro, acciones que no deben ser terminales, lo que debe saber hacer el bloqueador (continuar, abrirse, jugar con dribbling) y el pick and roll central con el poste contrario que sube.",
            accessed: "26/11/2026"
        },
        {
            id: "S7",
            title: "Official Basketball Rules 2024 (v1.0)",
            publisher: "FIBA. Vigente desde el 1 de octubre de 2024",
            locator: "Regla 2 (cancha) y art. 33.7 (bloqueo legal e ilegal)",
            url: "https://assets.fiba.basketball/image/upload/documents-corporate-fiba-official-rules-2024-v10.pdf",
            used: "Medidas de la cancha de las pizarras. Para las reglas del bloqueo legal remitimos al reglamento: no las resumimos acá.",
            accessed: "26/11/2026"
        }
    ];

    var unavailableSources = [
        {
            title: "WABC Coaches Manual Level 2 · 1.2.4 Team defence against pick and roll",
            url: "https://wabc.fiba.com/manual/level-2/l2-team/1-defensive-tactics-and-strategies/1-2-defending-screens/1-2-4-team-defence-against-pick-and-roll/",
            reason: "El sitio no permitió la consulta automática. Las ayudas y rotaciones del equipo que mostramos, fuera de lo citado, son interpretación de BasketIQ."
        },
        {
            title: "WABC Coaches Manual Level 2 · 2.1.5 Developing decision making",
            url: "https://wabc.fiba.com/manual/level-2/l2-team/2-offensive-tactics-and-strategies/2-1-offensive-movement/2-1-5-developing-decision-making-putting-perimeter-and-post-together/",
            reason: "No se pudo abrir."
        }
    ];

    // ------------------------------------------------------------------
    // Aprender
    // ------------------------------------------------------------------
    var aprender = [
        {
            id: "introduccion",
            number: "1",
            title: "Introducción",
            kind: "interpretation",
            blocks: [
                { p: "El pick and roll es la acción de dos jugadores más usada del básquet actual: un compañero bloquea al defensor del jugador con balón y, después del bloqueo, continúa hacia el aro (roll) o se abre para tirar (pop). Obliga a dos defensores a tomar una decisión en menos de un segundo, y esa decisión arrastra al resto del equipo." },
                { p: "Esta guía explica cómo se ejecuta, qué lee el jugador con balón, cómo se ocupan los espacios alrededor y cuáles son las coberturas defensivas más comunes (drop, switch, hedge, blitz e ice), con lo que cada una protege y lo que concede. En la pestaña **Simular** podés elegir la cobertura y ver, paso a paso, cómo responde la defensa y qué opciones le quedan al ataque." },
                {
                    callout: "Ninguna cobertura es la correcta para todos los casos. El manual WABC de nivel 3 recomienda justamente tener más de una respuesta y elegirla según el jugador con balón, el bloqueador y el lugar de la cancha [S5].",
                    title: "Antes de empezar",
                    tone: "info"
                }
            ],
            refs: ["S5"]
        },
        {
            id: "definicion",
            number: "2",
            title: "Definición técnica",
            kind: "official",
            refs: ["S1", "S6"],
            blocks: [
                { p: "Un **bloqueo directo** (on-ball screen) es el que se pone al defensor del jugador con balón. El manual WABC de nivel 1 enseña contra él cinco respuestas básicas: pasar por debajo, por arriba, a través, cambiar y hacer un dos contra uno (doble) [S1]." },
                { p: "**Pick and roll** es el bloqueo directo seguido de la continuación del bloqueador hacia el aro; **pick and pop**, el mismo bloqueo seguido de una apertura del bloqueador hacia el perímetro. El manual de nivel 2 señala que hoy los equipos usan bloqueos directos tempranos para que los bases generen acción desde el centro, y que el bloqueador tiene que saber continuar al aro, abrirse y jugar con dribbling [S6]." },
                {
                    table: {
                        caption: "Vocabulario de esta guía",
                        head: ["Término", "Qué significa", "Nombre en WABC"],
                        rows: [
                            ["Drop", "El defensor del bloqueador se queda atrás, entre el balón y el aro, y contiene", "Contener (contain); relacionado con pasar a través [S2] [S5]"],
                            ["Switch", "Los dos defensores intercambian marcas", "Switch [S1]"],
                            ["Hedge", "El defensor del bloqueador sale fuerte al camino del balón y vuelve", "Show (mostrar) y recuperar [S5]"],
                            ["Blitz", "Los dos defensores atrapan al jugador con balón", "Doble (double, trap) [S1] [S3]"],
                            ["Ice", "Se niega el uso del bloqueo y se lleva el balón hacia la banda", "Push o ice [S3]"]
                        ]
                    }
                }
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
                        "**Para el ataque**: crear una ventaja (un tiro abierto, una penetración, un pase a la continuación o un desajuste de tamaño) obligando a dos defensores a decidir.",
                        "**Encadenar acciones**: que el bloqueo lleve a una inversión, a otro bloqueo o a un juego de postes, en lugar de terminar en un tiro forzado [S6].",
                        "**Para la defensa**: elegir qué conceder. Cada cobertura protege algo (el aro, el tiro, la penetración por el centro) y paga con otra cosa."
                    ]
                }
            ],
            refs: ["S6"]
        },
        {
            id: "principios",
            number: "4",
            title: "Principios",
            kind: "interpretation",
            refs: ["S5", "S6"],
            blocks: [
                { h: "Para el ataque" },
                {
                    list: [
                        "**Ángulo del bloqueo**: el bloqueador apunta el cuerpo para que el camino de su compañero quede hacia donde el ataque quiere ir.",
                        "**Paciencia del jugador con balón**: esperar a que el bloqueo esté puesto y salir pegado al bloqueador, hombro con hombro.",
                        "**Leer al defensor del bloqueador**: lo que haga él decide la opción buena.",
                        "**Espacio alrededor**: los otros tres ocupan lugares que obligan a sus defensores a elegir entre ayudar y quedarse.",
                        "**No terminal**: si no hay ventaja, el balón se mueve a la siguiente acción [S6]."
                    ]
                },
                { h: "Para la defensa" },
                {
                    list: [
                        "**Decisión tomada antes**: los dos defensores saben qué cobertura juegan; el manual WABC pide agresividad, decisión, buen tiempo y movimientos eficientes [S5].",
                        "**Comunicación**: el defensor del bloqueador avisa que llega el bloqueo y de qué lado.",
                        "**Ayuda y recuperación del resto**: la cobertura de dos depende de los otros tres.",
                        "**El conjunto importa más que la táctica**: el manual de nivel 3 subraya que lo decisivo es que los jugadores trabajen al unísono [S5]."
                    ]
                }
            ]
        },
        {
            id: "explicacion",
            number: "5",
            title: "Explicación detallada",
            kind: "interpretation",
            refs: ["S1", "S2", "S3", "S4", "S5", "S6"],
            blocks: [
                { h: "5.1 La ejecución" },
                { p: "El bloqueador llega, se detiene antes del contacto y se queda quieto con una base amplia. El jugador con balón puede amagar hacia el lado contrario para que su defensor quede pegado al bloqueo y sale cerca del bloqueador. El bloqueador gira hacia el balón y continúa al aro, o se abre al perímetro si es tirador." },
                { board: "central" },
                { h: "5.2 Las técnicas básicas del defensor del balón" },
                { p: "El manual WABC de nivel 1 enseña a pasar **por debajo** (el defensor del bloqueador se pega a él y el del balón pasa por debajo de los dos), **a través** (el del bloqueador da un paso atrás y abre un camino entre él y el bloqueo) y **por arriba**, además del cambio y el doble [S1] [S2]. En el nivel 3 se agrega un criterio práctico: por arriba si el base es buen tirador, por debajo si no lo es [S5]." },
                { board: "por-debajo" },
                { h: "5.3 Drop (contener)" },
                { p: "El defensor del bloqueador se queda atrás, entre el balón y el aro, y contiene la penetración mientras el defensor del balón pasa por arriba y lo persigue. Protege el aro y la continuación; concede el tiro de media distancia del base. El manual de nivel 3 describe una idea cercana para bloqueos dentro de la línea de tres: el defensor del bloqueador sale a contener y el del balón pasa por arriba o por debajo según el tirador [S5]." },
                { h: "5.4 Switch (cambio)" },
                { p: "Los dos defensores intercambian marcas en el momento del bloqueo. No hay ventaja de dos contra uno, pero puede quedar un desajuste: un interior sobre el base en el perímetro, y un exterior sobre el bloqueador cerca del aro. En el pick and roll lateral, el manual de nivel 3 indica que si se cambia, el otro interior entra a la zona [S5]." },
                { h: "5.5 Hedge (mostrar y recuperar)" },
                { p: "El defensor del bloqueador sale fuerte al camino del balón para frenarlo y alejarlo del aro, y vuelve a su marca cuando el defensor del balón recupera. Con bloqueos fuera de la línea de tres, el manual WABC de nivel 3 describe justamente que el interior muestra fuerte y recupera sobre el bloqueador que corta, mientras los demás se hunden [S5]. El momento crítico es la vuelta: alguien tiene que frenar la continuación mientras tanto." },
                { board: "show-lateral" },
                { h: "5.6 Blitz (doble)" },
                { p: "Los dos defensores atrapan al jugador con balón. El bloqueador queda libre, así que un defensor desde la línea de división tiene que meterse entre él y el balón [S3]. Quita el balón de las manos del mejor creador, pero concede cuatro contra tres detrás si el pase sale." },
                { h: "5.7 Ice (push)" },
                { p: "Se niega el uso del bloqueo: el defensor del balón se ubica del lado del bloqueo y lo obliga a ir hacia la banda o la línea de fondo, donde lo espera el defensor del bloqueador [S3]. Funciona sobre todo en el pick and roll lateral. Una idea relacionada es el **weak**: llevar al base hacia su mano o lado no preferido; en ese caso no conviene pasar por debajo, porque el base podría cambiar de dirección y volver a su mano buena [S4]." },
                { board: "push-doble" },
                { h: "5.8 La continuación y las ayudas" },
                { p: "Con cualquier cobertura, la continuación del bloqueador es lo que pone a prueba al resto del equipo. Los defensores del lado débil deciden si frenan al que continúa (y dejan libre a su atacante) o se quedan con su marca. Si un defensor ayuda, el pase que sale es a su atacante: por eso la ocupación de las esquinas es tan importante para el ataque." },
                { h: "5.9 Cómo responde el ataque a cada cobertura" },
                {
                    table: {
                        caption: "Respuestas ofensivas habituales (interpretación técnica de BasketIQ)",
                        head: ["Cobertura", "Qué protege", "Qué concede", "Respuesta del ataque"],
                        rows: [
                            ["Drop", "Aro y continuación", "Tiro de media distancia del base", "Tiro tras dribbling, flotadora o pase bombeado a la continuación"],
                            ["Switch", "Ventaja de dos contra uno", "Desajustes de tamaño y velocidad", "Atacar al interior con dribbling o meter el balón al bloqueador sellado"],
                            ["Hedge", "Penetración inmediata", "Continuación mientras el interior vuelve", "Pase a la continuación o al lado débil si alguien ayuda"],
                            ["Blitz", "El tiro del creador", "Cuatro contra tres detrás", "Pase rápido al bloqueador en la continuación corta y decisión desde ahí"],
                            ["Ice", "El centro y el bloqueo", "El tiro del bloqueador que se abre", "Pick and pop, o rechazar el bloqueo y atacar la línea de fondo"]
                        ]
                    }
                }
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
                        caption: "Qué hace cada jugador (orientativo)",
                        head: ["Jugador", "Ataque", "Defensa"],
                        rows: [
                            ["Con balón", "Esperar el bloqueo, salir pegado, leer al defensor del bloqueador", "Pasar por arriba, por debajo o negar el bloqueo según la cobertura"],
                            ["Bloqueador", "Ángulo, contacto legal, continuar o abrirse a tiempo", "Avisar el bloqueo y ejecutar la cobertura (contener, mostrar, cambiar, atrapar)"],
                            ["Esquina del lado del balón", "Quedarse abierto para el pase de descarga", "Decidir si ayuda sobre la continuación o se queda"],
                            ["Lado débil", "Ocupar el ala y la esquina contrarias", "Frenar la continuación y recuperar"]
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
                        "**Final de posesión**: un bloqueo directo central con espacio alrededor es una forma simple de crear un tiro cuando queda poco tiempo.",
                        "**Transición**: el bloqueo temprano antes de que la defensa se ordene.",
                        "**Lateral**: con el balón en el ala, el bloqueo empuja hacia el centro; es donde más se usa el ice.",
                        "**Contra zona**: también se usan bloqueos directos para obligar a la zona a emparejarse."
                    ]
                },
                { p: "Cuál cobertura elegir depende del rival: si el base no tira de media distancia, el drop es cómodo; si el bloqueador es tirador, el drop es peligroso; si el bloqueador es lento, el switch puede dejar a un interior perdido en el perímetro." }
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
                        "Obliga a dos defensores a decidir a la vez.",
                        "Genera ventajas que se pueden encadenar con pases.",
                        "Funciona con muchos tipos de jugadores: el bloqueador puede ser interior o exterior.",
                        "Es simple de organizar y difícil de anular del todo."
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
                        "Sin espacio alrededor, la ayuda llega sin costo y el bloqueo no crea nada.",
                        "Si el jugador con balón sale antes de que el bloqueo esté puesto, el bloqueo se vuelve ilegal o inútil.",
                        "Usarlo como recurso único vuelve predecible al ataque.",
                        "Para la defensa, cada cobertura tiene su costo (ver tabla 5.9); usar siempre la misma permite que el ataque la prepare."
                    ]
                }
            ]
        },
        {
            id: "errores",
            number: "10",
            title: "Errores frecuentes",
            kind: "interpretation",
            blocks: [
                { h: "En ataque" },
                {
                    list: [
                        "Salir del bloqueo antes de que el bloqueador esté quieto.",
                        "Salir lejos del bloqueador y dejar pasar al defensor.",
                        "El bloqueador continúa tarde o hacia un lugar ocupado.",
                        "Los demás se acercan a mirar y se llevan a sus defensores a la jugada."
                    ]
                },
                { h: "En defensa" },
                {
                    list: [
                        "Los dos defensores no saben qué cobertura juegan.",
                        "Nadie avisa el bloqueo.",
                        "En el hedge, el interior se queda afuera y nadie frena la continuación.",
                        "En el blitz, la ayuda desde el lado débil llega tarde.",
                        "En el switch, el exterior que queda con el interior no pelea la posición."
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
                        caption: "Error, corrección y consigna breve",
                        head: ["Error", "Corrección", "Consigna"],
                        rows: [
                            ["Sale antes del bloqueo", "Esperar a ver al bloqueador quieto", "«¡Esperalo!»"],
                            ["Sale lejos del bloqueador", "Hombro con hombro", "«¡Rozalo!»"],
                            ["Nadie avisa", "El defensor del bloqueador nombra el bloqueo y el lado", "«¡Bloqueo derecha!»"],
                            ["Hedge sin vuelta", "Volver en cuanto el compañero recupera", "«¡Mostrá y volvé!»"],
                            ["Blitz sin ayuda", "El defensor de la línea de división se mete en el camino", "«¡Split!»"]
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
                { p: "Una secuencia posible:" },
                {
                    ordered: true,
                    list: [
                        "**Técnica del bloqueo sin defensa**: llegar, frenar, base amplia, continuar.",
                        "**2 contra 2 con una cobertura fija**: primero las técnicas básicas de nivel 1 (por debajo, a través, por arriba) [S1].",
                        "**2 contra 2 con cobertura elegida por el entrenador** con una señal: el ataque lee y responde.",
                        "**3 contra 3 y 4 contra 4** para sumar las ayudas y la ocupación de esquinas.",
                        "**5 contra 5** con más de una cobertura en el repertorio, como recomienda el manual de nivel 3 [S5]."
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
                            ["1", "Bloqueo sin defensa", "Ángulo, contacto legal, continuación y apertura"],
                            ["2", "2 contra 2 con defensa pasiva", "Lectura del defensor del bloqueador"],
                            ["3", "2 contra 2 con cobertura señalada", "Respuesta ofensiva a cada cobertura"],
                            ["4", "3 contra 3 con esquina ocupada", "Ayuda y descarga a la esquina"],
                            ["5", "4 contra 4", "Rotaciones del lado débil"],
                            ["6", "5 contra 5 con reloj", "Encadenar acciones"]
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
            refs: ["S1", "S3"],
            blocks: [
                { p: "El manual WABC ubica las técnicas básicas contra el bloqueo directo en el nivel 1 y las coberturas más complejas (push o ice, doble con ayuda) en el nivel 2 [S1] [S3]. Siguiendo esa progresión, proponemos:" },
                {
                    table: {
                        caption: "Propuesta de BasketIQ por etapa (no es una norma oficial)",
                        head: ["Categoría", "Ataque", "Defensa"],
                        rows: [
                            ["Minibásquet y U13", "Bloqueos simples con continuación al aro, dentro de juegos de pasar y cortar", "Pasar por arriba o a través; hablar"],
                            ["U15", "Pick and roll central y lateral con lectura simple", "Por debajo, a través, por arriba y cambio"],
                            ["U17", "Lectura de coberturas y ocupación de esquinas", "Mostrar y recuperar, ice o weak"],
                            ["U19 y mayores", "Encadenar acciones y desajustes", "Repertorio completo, incluido el doble"]
                        ]
                    }
                },
                {
                    callout: "Las edades y lo permitido dependen de cada competencia. La tabla es una propuesta metodológica, no un reglamento.",
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
                {
                    list: [
                        "**Pick and pop**: el bloqueador se abre en lugar de continuar. Castiga el drop y el blitz.",
                        "**Short roll**: el bloqueador recibe a media distancia, a la altura de la línea de libres. Es la respuesta habitual al blitz.",
                        "**Slip**: el bloqueador se va antes del contacto, sobre todo contra defensas que cambian o muestran temprano.",
                        "**Rechazo del bloqueo**: el base ataca hacia el lado contrario, útil contra el ice.",
                        "**Doble bloqueo directo (horns)**: dos bloqueadores; el manual de nivel 3 lo trata entre los esquemas defensivos [S5]."
                    ]
                }
            ],
            refs: ["S5"]
        }
    ];

    var entrenar = [
        {
            id: "entrenar-intro",
            number: "14",
            title: "Ejercicios",
            kind: "method",
            blocks: [
                { p: "Tres ejercicios en progresión: dos contra dos con cobertura señalada, tres contra tres con la esquina ocupada y cuatro contra cuatro con mostrar y recuperar. Sirven tanto para el ataque como para la defensa." }
            ]
        }
    ];

    var exercises = [
        {
            id: "ej-2c2-cobertura",
            name: "2 contra 2 con cobertura señalada",
            meta: {
                fundamento: "Pick and roll",
                objetivo: "Lectura del bloqueo directo",
                categories: ["U15", "U17", "Primera"],
                level: "Intermedio",
                minPlayers: 4,
                maxPlayers: 12,
                minutes: [10, 12],
                court: "half",
                hoops: 1,
                materials: ["Balones"],
                optionalMaterials: ["Conos"],
                blockType: "tactica"
            },
            adaptations: [
                {
                    id: "dos-contra-uno-bloqueo",
                    label: "Bloqueo sin defensor del bloqueador (3 jugadores)",
                    text: "Regresión: base, bloqueador y un solo defensor del balón. El defensor practica la técnica pedida (por debajo, a través o pasar por arriba) y el ataque aprende a salir pegado al bloqueo. Sin cobertura del defensor del bloqueador.",
                    req: { minPlayers: 3 }
                }
            ],
            kind: "method",
            refs: ["S1"],
            board: "por-debajo",
            objective: "Leer la cobertura del defensor del bloqueador y elegir la respuesta.",
            secondary: ["Ángulo y contacto del bloqueo", "Salir pegado al bloqueador", "Comunicación defensiva"],
            category: "U15 en adelante",
            level: "Intermedio",
            players: "4 por grupo (2 contra 2); hasta 12 con filas",
            playersShort: "4 a 12 jugadores",
            duration: "10 a 12 minutos",
            space: "Media cancha",
            hoops: "1",
            materials: "1 balón por grupo",
            organization: "Base con balón en el centro o en el ala, bloqueador en el poste alto. Filas de ataque y defensa a cada lado.",
            development: "Antes de cada repetición, el entrenador le muestra a la defensa una tarjeta o una señal con la cobertura (por arriba, por debajo, cambio, mostrar). El ataque no la ve y tiene que leerla en la cancha. Se juega hasta tiro o pérdida y se rota: ataque a defensa, defensa a la fila.",
            rules: ["El bloqueo tiene que ser legal: si hay falta del bloqueador, punto para la defensa", "Máximo dos dribblings después del bloqueo", "Un punto extra al ataque si eligió la respuesta propuesta para esa cobertura"],
            cues: ["«¡Esperalo!»", "«¡Rozalo!»", "«¡Bloqueo derecha!»"],
            errors: ["El base sale antes del bloqueo", "El bloqueador no continúa", "La defensa no avisa"],
            corrections: ["Hacer la llegada del bloqueo sin defensa y con pausa", "Señalar con un cono el lugar de la continuación", "Exigir la voz antes del contacto"],
            variants: ["Pick and pop en lugar de pick and roll", "Bloqueo lateral desde el ala", "Defensa libre: elige la cobertura la pareja"],
            progressions: ["Sumar un tirador en la esquina (3 contra 3)", "Sin señal: la defensa cambia de cobertura cuando quiere", "Reloj de 8 segundos"],
            regressions: ["Defensa pasiva que solo marca la cobertura", "Siempre la misma cobertura", "Sin tiro: el ataque suma por llegar a la zona"],
            evaluation: ["Respuesta correcta a la cobertura", "Bloqueos legales", "Voces de la defensa"],
            basis: "Las técnicas defensivas que se señalan son las del manual WABC de nivel 1 [S1]. La organización y la lectura propuesta son de BasketIQ."
        },
        {
            id: "ej-3c3-esquina",
            name: "3 contra 3: pick and roll con la esquina ocupada",
            meta: {
                fundamento: "Pick and roll",
                objetivo: "Ayudas y descarga",
                categories: ["U17", "Primera"],
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
                    id: "dos-contra-dos-mas-uno",
                    label: "2 contra 2 + pasador fijo en la esquina (5 jugadores)",
                    text: "Regresión: el atacante de la esquina no tiene defensor, pero solo puede tirar si recibe con el defensor de la esquina ayudando; un entrenador hace de ayuda.",
                    req: { minPlayers: 5 }
                }
            ],
            kind: "method",
            refs: ["S3"],
            board: "push-doble",
            objective: "Castigar la ayuda sobre la continuación con el pase a la esquina.",
            secondary: ["Decidir entre la continuación y la esquina", "Ayuda y recuperación del defensor de la esquina", "Rotación desde la línea de división"],
            category: "U17 en adelante",
            level: "Intermedio",
            players: "6 (3 contra 3); hasta 12 con filas",
            playersShort: "6 a 12 jugadores",
            duration: "10 a 15 minutos",
            space: "Media cancha",
            hoops: "1",
            materials: "1 balón por grupo",
            organization: "Pick and roll lateral con un tirador en la esquina del mismo lado. Tres defensores.",
            development: "El base usa el bloqueo. El defensor de la esquina decide si ayuda sobre la continuación. El ataque lee: si ayuda, pase a la esquina; si no ayuda, pase a la continuación o tiro. Cada tres posesiones la defensa cambia de cobertura (por ejemplo, de ice a doble).",
            rules: ["Tres posesiones por grupo", "Tiro de esquina tras ayuda: 2 puntos extra", "Robo de la defensa: 2 puntos"],
            cues: ["«¡Leé la ayuda!»", "«¡Esquina llena!»", "«¡Split!» para la defensa"],
            errors: ["El tirador de la esquina sube a pedir el balón", "El defensor de la esquina ayuda y no recupera", "Con doble, nadie frena al bloqueador"],
            corrections: ["Marcar la esquina con un cono", "Hacer la ayuda y la recuperación sin balón", "Asignar quién es la ayuda en la línea de división"],
            variants: ["Tirador en el ala contraria en lugar de la esquina", "Pick and pop", "Defensa con doble obligatorio"],
            progressions: ["4 contra 4 con lado débil", "Ataque libre tras el bloqueo", "Reloj de 10 segundos"],
            regressions: ["2 contra 2 más un pasador fijo", "Defensa pasiva", "Siempre la misma cobertura"],
            evaluation: ["Pase a la esquina cuando hubo ayuda", "Recuperación del defensor de la esquina", "Tiros abiertos concedidos"],
            basis: "Propuesta de BasketIQ. La ayuda desde la línea de división cuando se atrapa al balón sigue al manual WABC de nivel 2 [S3]."
        },
        {
            id: "ej-mostrar",
            name: "4 contra 4: mostrar y recuperar",
            meta: {
                fundamento: "Defensa del bloqueo directo",
                objetivo: "Coberturas defensivas",
                categories: ["U17", "U19", "Primera"],
                level: "Avanzado",
                minPlayers: 8,
                maxPlayers: 12,
                minutes: [12, 15],
                court: "half",
                hoops: 1,
                materials: ["Balones"],
                optionalMaterials: [],
                blockType: "tactica"
            },
            adaptations: [
                {
                    id: "tres-contra-tres",
                    label: "3 contra 3 (6 jugadores)",
                    text: "Regresión: sin el lado débil completo. El defensor del ala contraria es el que se hunde a frenar la continuación.",
                    req: { minPlayers: 6 }
                }
            ],
            kind: "interpretation",
            refs: ["S5"],
            board: "show-lateral",
            objective: "Mostrar fuerte sobre el balón y recuperar sobre la continuación con la ayuda del lado débil.",
            secondary: ["Tiempo de la recuperación", "Hundirse y volver del lado débil", "Comunicación de tres defensores"],
            category: "U17 en adelante",
            level: "Avanzado",
            players: "8 (4 contra 4); hasta 12 con un grupo esperando",
            playersShort: "8 a 12 jugadores",
            duration: "12 a 15 minutos",
            space: "Media cancha",
            hoops: "1",
            materials: "1 balón",
            organization: "Pick and roll lateral fuera de la línea de tres, con un atacante en la esquina del lado del balón y otro en la esquina contraria.",
            development: "La defensa muestra y recupera en cada bloqueo. Los defensores que no participan se hunden para frenar la continuación y vuelven. El ataque juega libre después del bloqueo.",
            rules: ["Cada posesión empieza con el bloqueo lateral", "Si la continuación recibe sola cerca del aro, punto para el ataque", "La defensa suma un punto por cada posesión sin tiro cerca del aro"],
            cues: ["«¡Mostrá y volvé!»", "«¡Hundite!»", "«¡Te lo devuelvo!» al recuperar"],
            errors: ["El interior se queda afuera", "Nadie se hunde y la continuación recibe sola", "El que se hundió no vuelve y queda libre la esquina"],
            corrections: ["Contar dos tiempos para mostrar y volver", "Marcar el lugar de ayuda con un cono", "Repetir solo la recuperación"],
            variants: ["Bloqueo dentro de la línea de tres: el interior contiene en lugar de mostrar", "Cambio en lugar de mostrar si el bloqueador no tira", "Bloqueo central"],
            progressions: ["5 contra 5 con dos coberturas a elección del entrenador", "Ataque con pick and pop", "Reloj de posesión"],
            regressions: ["3 contra 3", "Ataque sin pase al lado débil", "Mostrar sin recuperar (solo la primera parte)"],
            evaluation: ["Tiros concedidos cerca del aro tras la continuación", "Recuperaciones a tiempo", "Pases al lado débil concedidos"],
            basis: "El manual WABC de nivel 3 describe que, con el bloqueo fuera de la línea de tres, el interior muestra fuerte y recupera sobre el bloqueador que corta mientras los demás se hunden [S5]. El ejercicio y sus reglas son de BasketIQ."
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
                        "Los bloqueos son legales y llegan con el bloqueador quieto",
                        "El jugador con balón sale pegado al bloqueo",
                        "El ataque lee la cobertura y elige la opción que concede",
                        "Las esquinas están ocupadas durante el bloqueo",
                        "La defensa avisa el bloqueo y el lado",
                        "Los dos defensores ejecutan la misma cobertura",
                        "Alguien frena la continuación mientras el interior vuelve",
                        "El equipo tiene al menos dos coberturas entrenadas"
                    ]
                },
                {
                    table: {
                        caption: "Indicadores para medir",
                        head: ["Indicador", "Cómo medirlo"],
                        rows: [
                            ["Puntos por pick and roll", "Puntos ÷ posesiones que empiezan con bloqueo directo"],
                            ["Pérdidas en el bloqueo", "Pérdidas en los dos segundos posteriores al bloqueo"],
                            ["Tiros cerca del aro concedidos", "Contar por cobertura usada"],
                            ["Bloqueos ilegales", "Faltas en ataque del bloqueador"]
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
                { qa: "¿Cuáles son las cinco técnicas básicas contra el bloqueo directo que enseña WABC en el nivel 1?", answer: ["Por debajo, por arriba, a través, cambio y doble [S1]."] },
                { qa: "¿Qué busca el push o ice?", answer: ["Que el jugador con balón dribblee alejándose del bloqueo [S3]."] },
                { qa: "En un blitz, ¿quién se ocupa del bloqueador?", answer: ["Un defensor desde la línea de división, que se mete entre el bloqueador y el balón [S3]."] },
                { qa: "¿Por arriba o por debajo?", answer: ["El manual de nivel 3 sugiere por arriba si el base es buen tirador y por debajo si no lo es [S5]."] },
                { qa: "¿Qué concede el drop y cómo lo castiga el ataque?", answer: ["Concede el tiro de media distancia del base y, si el bloqueador es tirador, el pick and pop."] }
            ]
        }
    ];

    // ------------------------------------------------------------------
    // Simulador: pick and roll lateral, cinco coberturas
    // ------------------------------------------------------------------
    var HELP = { o2: [1.0, 0.7], o3: [6.6, 12.6], o4: [1.0, 14.3], x2: [2.0, 1.8], x3: [5.4, 10.6], x4: [2.4, 12.0] };
    function P() { return merge.apply(null, [HELP].concat(Array.prototype.slice.call(arguments))); }

    var RESP_HELP = {
        x2: "Se queda con el tirador de la esquina del lado del balón, listo para frenar una penetración por el fondo.",
        x3: "Se hunde desde el ala contraria hacia la zona: es la primera ayuda sobre el centro.",
        x4: "Desde la esquina contraria, cuida el aro y la continuación del bloqueador."
    };
    function resp(o) { return merge(RESP_HELP, o); }

    var INICIO_POS = P({ o1: [7.8, 3.0], o5: [4.6, 5.6], x1: [7.0, 3.2], x5: [3.9, 6.0] });

    var SIM = {
        id: "sim-pick-and-roll",
        title: "Simulador de pick and roll lateral",
        intro: "Elegí la cobertura defensiva y avanzá por los momentos del bloqueo. Al final se dibujan las opciones que suele tener el ataque contra esa cobertura. Las coberturas que el manual WABC describe llevan su cita; el resto es interpretación de BasketIQ.",
        view: VIEW,
        tags: ["Pick and roll", "Academy"],
        ui: {
            variants: "Cobertura defensiva",
            positions: "Momento de la jugada",
            hint: "Elegí una cobertura y avanzá con los botones de momento o con ▶. Tocá un defensor para ver qué hace.",
            options: "Opciones del ataque",
            disclaimer: "Cada cobertura muestra una reacción plausible del ataque, no la única respuesta correcta: los equipos combinan y ajustan estas coberturas.",
            noTarget: "En este momento de la jugada no hay una opción preparada para el {p}. Avanzá con los botones de momento."
        },
        players: {
            o1: O("1", 0, 0), o2: O("2", 0, 0), o3: O("3", 0, 0), o4: O("4", 0, 0), o5: O("5", 0, 0),
            x1: D("1", 0, 0), x2: D("2", 0, 0), x3: D("3", 0, 0), x4: D("4", 0, 0), x5: D("5", 0, 0)
        },
        positions: [
            { id: "inicio", label: "1. Antes del bloqueo", group: "Momento" },
            { id: "bloqueo", label: "2. Llega el bloqueo", group: "Momento" },
            { id: "uso", label: "3. Uso del bloqueo", group: "Momento" },
            { id: "continuacion", label: "4. Continuación", group: "Momento" },
            { id: "lectura", label: "5. Lectura del ataque", group: "Momento" }
        ],
        tour: ["inicio", "bloqueo", "uso", "continuacion", "lectura"],
        variants: [
            {
                id: "drop",
                label: "Drop",
                kind: "interpretation",
                refs: ["S5"],
                desc: "El defensor del bloqueador se queda atrás conteniendo y el del balón pasa por arriba y persigue. Protege el aro; concede el tiro de media distancia. Idea cercana a «contener» del manual WABC de nivel 3 [S5].",
                states: {
                    inicio: {
                        title: "Antes del bloqueo",
                        note: "El 1 tiene el balón en el ala derecha. El 5 sale del codo hacia él para bloquear; X5 lo acompaña y avisa: «¡Bloqueo!».",
                        ball: "o1",
                        pos: INICIO_POS,
                        resp: resp({ x1: "Presiona al balón y escucha el aviso de X5.", x5: "Acompaña al bloqueador y avisa el bloqueo y el lado." }),
                        help: "Todavía no hay ayudas: cada uno con su atacante, los del lado débil un paso hacia la zona."
                    },
                    bloqueo: {
                        title: "Llega el bloqueo (drop)",
                        note: "El 5 bloquea a X1 del lado del medio. X5 se queda atrás, a la altura de la línea de libres, entre el balón y el aro.",
                        ball: "o1",
                        moves: { o5: "screen_on" },
                        pos: P({ o1: [7.8, 3.0], o5: [7.3, 4.1], x1: [7.0, 3.2], x5: [5.6, 4.8] }),
                        resp: resp({ x1: "Se prepara para pasar por arriba del bloqueo, pegado al bloqueador.", x5: "Se queda atrás conteniendo, entre el balón y el aro." }),
                        help: "X5 ya está en posición de contener: no sale al balón."
                    },
                    uso: {
                        title: "Uso del bloqueo (drop)",
                        note: "El 1 sale hacia el centro. X1 lo persigue por arriba y X5 lo contiene de frente sin dejar de cuidar al bloqueador.",
                        ball: "o1",
                        moves: { o1: "dribble" },
                        pos: P({ o1: [6.8, 5.4], o5: [7.3, 4.1], x1: [7.5, 4.9], x5: [5.6, 5.6] }),
                        resp: resp({ x1: "Pasa por arriba y persigue desde atrás para molestar el tiro.", x5: "Contiene la penetración, de frente al balón." }),
                        help: "Mientras X1 está atrasado, X5 contiene solo. El lado débil todavía no ayuda."
                    },
                    continuacion: {
                        title: "Continuación (drop)",
                        note: "El 5 continúa al aro. X5 retrocede entre el balón y el que continúa; X1 recupera al base por detrás.",
                        ball: "o1",
                        moves: { o5: "cut", o1: "dribble" },
                        pos: P({ o1: [6.2, 6.0], o5: [3.8, 5.8], x1: [6.9, 5.4], x5: [4.6, 6.2] }),
                        resp: resp({ x1: "Recupera al base por detrás.", x5: "Retrocede entre el balón y la continuación." }),
                        help: "X3 y X4 se hunden un paso para que el pase bombeado a la continuación no sea cómodo."
                    },
                    lectura: {
                        title: "Lectura del ataque contra el drop",
                        note: "X5 quedó lejos del base. El 1 tiene espacio para tirar de media distancia; si X5 sube, la continuación queda libre.",
                        ball: "o1",
                        moves: { o1: "dribble" },
                        pos: P({ o1: [6.0, 6.3], o5: [3.6, 5.8], x1: [6.6, 5.6], x5: [4.5, 6.2] }),
                        resp: resp({ x1: "Llega por detrás a molestar el tiro.", x5: "Decide: sube al tiro o se queda con la continuación." }),
                        help: "La cobertura concede ese tiro a propósito: es mejor contra bases que no tiran de media distancia.",
                        options: [["shot", "o1", HOOP], ["pass", "o1", "o5"]],
                        optionsText: ["Tiro de media distancia tras el dribbling, si X5 no sube.", "Pase bombeado o picado a la continuación, si X5 sube al tiro."]
                    }
                }
            },
            {
                id: "switch",
                label: "Switch",
                kind: "official",
                refs: ["S1", "S5"],
                inherits: "drop",
                desc: "Los dos defensores cambian de marca. No hay dos contra uno, pero puede quedar un desajuste. El cambio está entre las técnicas básicas del nivel 1 [S1]; en el pick and roll lateral, si se cambia, el otro interior entra a la zona [S5].",
                states: {
                    bloqueo: {
                        title: "Llega el bloqueo (switch)",
                        note: "X5 se ubica a la altura del bloqueo, al lado del bloqueador, listo para tomar al base.",
                        ball: "o1",
                        moves: { o5: "screen_on" },
                        pos: P({ o1: [7.8, 3.0], o5: [7.3, 4.1], x1: [7.0, 3.2], x5: [6.6, 4.9] }),
                        resp: resp({ x1: "Se prepara para quedarse con el bloqueador.", x5: "Sube al nivel del bloqueo para tomar al base." }),
                        help: "Los dos avisan «¡cambio!» antes del contacto."
                    },
                    uso: {
                        title: "Uso del bloqueo (switch)",
                        note: "X5 toma al base y X1 se queda con el bloqueador. Queda un interior sobre el base y un exterior sobre el bloqueador.",
                        ball: "o1",
                        moves: { o1: "dribble" },
                        pos: P({ o1: [6.8, 5.4], o5: [7.3, 4.1], x1: [6.6, 3.7], x5: [6.1, 5.9] }),
                        resp: resp({ x1: "Se queda con el bloqueador y se ubica entre él y el aro.", x5: "Toma al base y lo contiene en el perímetro." }),
                        help: "X4 entra a la zona desde el lado débil, como indica el manual para el cambio en el pick and roll lateral [S5]."
                    },
                    continuacion: {
                        title: "Continuación (switch)",
                        note: "El 5 continúa hacia el aro con X1, más bajo, detrás. El 1 ataca a X5, más lento.",
                        ball: "o1",
                        moves: { o5: "cut", o1: "dribble" },
                        pos: P({ o1: [6.6, 6.4], o5: [3.6, 5.0], x1: [4.3, 4.6], x5: [5.8, 6.7], x4: [3.0, 9.6] }),
                        resp: resp({ x1: "Pelea la posición del bloqueador: lo frena antes de que llegue al aro.", x5: "Contiene al base con distancia para no ser superado.", x4: "Entra a la zona para ayudar contra el bloqueador si recibe cerca del aro." }),
                        help: "El cambio funciona si nadie queda perdido: la ayuda de X4 compensa el desajuste cerca del aro."
                    },
                    lectura: {
                        title: "Lectura del ataque contra el switch",
                        note: "Hay dos desajustes: el 5 sella a X1 cerca del aro y el 1 puede atacar a X5 con dribbling.",
                        ball: "o1",
                        moves: { o5: "move" },
                        pos: P({ o1: [6.6, 6.4], o5: [2.6, 4.8], x1: [3.2, 5.3], x5: [5.8, 6.7], x4: [3.0, 8.4] }),
                        resp: resp({ x1: "Juega por delante del bloqueador para negar el pase.", x5: "Contiene al base sin regalar la penetración.", x4: "Ayuda por detrás si el pase es bombeado." }),
                        help: "Si X4 ayuda de más, el 4 queda solo en la esquina contraria.",
                        options: [["pass", "o1", "o5"], ["dribble", "o1", [4.6, 7.6]], ["pass", "o1", "o4"]],
                        optionsText: ["Pase al bloqueador sellado sobre un defensor más bajo.", "Penetración contra el interior que quedó en el perímetro.", "Pase cruzado a la esquina contraria si X4 se fue a ayudar."]
                    }
                }
            },
            {
                id: "hedge",
                label: "Hedge",
                kind: "official",
                refs: ["S5"],
                inherits: "drop",
                desc: "El defensor del bloqueador sale fuerte al camino del balón y vuelve; los demás se hunden. Es el «mostrar y recuperar» que el manual de nivel 3 describe para bloqueos fuera de la línea de tres [S5].",
                states: {
                    bloqueo: {
                        title: "Llega el bloqueo (hedge)",
                        note: "X5 sube a la altura del bloqueo, listo para salir al camino del balón.",
                        ball: "o1",
                        moves: { o5: "screen_on" },
                        pos: P({ o1: [7.8, 3.0], o5: [7.3, 4.1], x1: [7.0, 3.2], x5: [6.6, 4.9] }),
                        resp: resp({ x1: "Se prepara para pasar por arriba.", x5: "Sube al nivel del bloqueo para mostrar." }),
                        help: "Los del lado débil ya empiezan a hundirse."
                    },
                    uso: {
                        title: "Uso del bloqueo (hedge)",
                        note: "X5 sale fuerte al camino del 1 y lo obliga a abrirse lejos del aro; X1 pasa por arriba del bloqueo.",
                        ball: "o1",
                        moves: { o1: "dribble" },
                        pos: P({ o1: [7.6, 5.6], o5: [7.3, 4.1], x1: [8.1, 4.7], x5: [6.7, 5.9], x2: [2.4, 2.4], x4: [3.4, 8.8] }),
                        resp: resp({ x1: "Pasa por arriba del bloqueo para recuperar al base.", x5: "Muestra fuerte: frena al base y lo aleja del aro.", x4: "Se hunde hacia la zona para frenar la continuación." }),
                        help: "Los demás se hunden: el manual describe que, mientras el interior muestra, los perímetros se hunden [S5]."
                    },
                    continuacion: {
                        title: "Continuación (hedge)",
                        note: "El 5 continúa al aro. X5 vuelve a tomarlo, X1 recupera al base y X4 frena la continuación hasta que X5 llega.",
                        ball: "o1",
                        moves: { o5: "cut" },
                        pos: P({ o1: [7.6, 5.6], o5: [4.0, 5.4], x1: [7.0, 5.9], x5: [4.8, 5.2], x2: [2.4, 2.4], x4: [3.2, 7.0] }),
                        resp: resp({ x1: "Recupera al base.", x5: "Vuelve a tomar al bloqueador que corta.", x4: "Frena la continuación y espera la vuelta de X5." }),
                        help: "Es el momento crítico: si X5 tarda en volver, X4 queda entre dos atacantes."
                    },
                    lectura: {
                        title: "Lectura del ataque contra el hedge",
                        note: "X4 se hundió para frenar la continuación: el 4 quedó solo en la esquina contraria. Si X4 vuelve antes de tiempo, la continuación queda libre.",
                        ball: "o1",
                        moves: { o5: "cut" },
                        pos: P({ o1: [7.6, 5.6], o5: [3.2, 5.8], x1: [7.0, 5.9], x5: [4.2, 5.4], x2: [2.4, 2.4], x4: [3.0, 7.2] }),
                        resp: resp({ x1: "Está de nuevo sobre el base.", x5: "Llega por detrás de la continuación.", x4: "Decide: se queda con la continuación o vuelve a la esquina." }),
                        help: "La defensa gana si la vuelta de X5 y la recuperación de X4 se dan al mismo tiempo.",
                        options: [["pass", "o1", "o5"], ["pass", "o1", "o4"]],
                        optionsText: ["Pase a la continuación antes de que X5 termine de volver.", "Pase cruzado al 4 en la esquina si X4 se quedó ayudando."]
                    }
                }
            },
            {
                id: "blitz",
                label: "Blitz",
                kind: "official",
                refs: ["S1", "S3"],
                inherits: "drop",
                desc: "Los dos defensores atrapan al base. El doble está entre las técnicas del nivel 1 [S1]; el manual de nivel 2 pide que un defensor de la línea de división se meta entre el bloqueador y el balón [S3].",
                states: {
                    bloqueo: {
                        title: "Llega el bloqueo (blitz)",
                        note: "X5 sube a la altura del bloqueo para atrapar en cuanto el base lo use.",
                        ball: "o1",
                        moves: { o5: "screen_on" },
                        pos: P({ o1: [7.8, 3.0], o5: [7.3, 4.1], x1: [7.0, 3.2], x5: [6.8, 4.8] }),
                        resp: resp({ x1: "Pasa por arriba para cerrar la trampa desde atrás.", x5: "Sube para cerrar la trampa de frente." }),
                        help: "Antes del contacto, los del lado débil saben quién va a ser la ayuda sobre el bloqueador."
                    },
                    uso: {
                        title: "Uso del bloqueo (blitz)",
                        note: "X1 y X5 atrapan al 1 apenas sale del bloqueo. El 5 queda libre: X4 empieza a rotar hacia la zona.",
                        ball: "o1",
                        moves: { o1: "dribble" },
                        pos: P({ o1: [7.5, 5.0], o5: [7.3, 4.1], x1: [8.3, 4.5], x5: [6.8, 5.7], x2: [2.4, 2.6], x3: [5.2, 9.8], x4: [3.4, 7.4] }),
                        resp: resp({ x1: "Cierra la trampa desde atrás, sin dejar que el base vuelva.", x5: "Cierra la trampa de frente, brazos arriba, sin falta.", x3: "Se hunde para cubrir el lado débil.", x4: "Rota a la línea de división para meterse entre el bloqueador y el balón." }),
                        help: "La regla del manual: la ayuda viene de la línea de división (X4 o X2) y se mete entre el bloqueador y el balón [S3]."
                    },
                    continuacion: {
                        title: "Continuación (blitz)",
                        note: "El 1 encuentra al 5 en la continuación corta, a la altura de la línea de libres. X4 sale a frenarlo; detrás, el ataque juega cuatro contra tres.",
                        ball: "o5",
                        moves: { o5: "cut" },
                        pos: P({ o1: [7.5, 5.0], o5: [5.6, 5.0], x1: [8.2, 5.4], x5: [6.8, 5.8], x2: [2.6, 3.6], x3: [4.0, 10.6], x4: [4.5, 5.8] }),
                        resp: resp({ x1: "Suelta la trampa y vuelve a la línea de pase más cercana.", x5: "Vuelve hacia el aro detrás del bloqueador.", x2: "Se hunde para cuidar el aro y la esquina a la vez.", x3: "Cubre el lado débil: entre el ala y la esquina.", x4: "Frena al bloqueador en la continuación corta." }),
                        help: "La defensa tiene un jugador menos detrás de la trampa hasta que X1 y X5 vuelven."
                    },
                    lectura: {
                        title: "Lectura del ataque contra el blitz",
                        note: "El 5 recibió de frente al aro con ventaja numérica detrás. Decide entre el tiro corto, la esquina contraria y la esquina del lado del balón.",
                        ball: "o5",
                        pos: P({ o1: [7.5, 5.0], o5: [5.6, 5.0], x1: [8.2, 5.4], x5: [6.8, 5.8], x2: [2.6, 3.6], x3: [4.0, 10.6], x4: [4.5, 5.8] }),
                        resp: resp({ x1: "Vuelve hacia la línea de pase más cercana.", x5: "Vuelve hacia el aro.", x2: "Elige entre el aro y la esquina.", x3: "Cubre dos atacantes a la vez.", x4: "Frena al bloqueador." }),
                        help: "Cuanto más rápido decida el 5, más le cuesta a la defensa recuperarse.",
                        options: [["pass", "o5", "o4"], ["pass", "o5", "o2"], ["shot", "o5", HOOP]],
                        optionsText: ["Pase a la esquina contraria, que X4 abandonó.", "Pase a la esquina del lado del balón si X2 se hundió.", "Tiro corto o flotadora si nadie sale."]
                    }
                }
            },
            {
                id: "ice",
                label: "Ice",
                kind: "official",
                refs: ["S3"],
                inherits: "drop",
                desc: "Se niega el uso del bloqueo y se lleva al base hacia la banda, donde lo espera el defensor del bloqueador. El manual de nivel 2 lo llama push o ice [S3].",
                states: {
                    bloqueo: {
                        title: "Llega el bloqueo (ice)",
                        note: "X1 salta al lado del bloqueo y X5 se adelanta hacia la banda y la línea de fondo. El base no puede usar el bloqueo.",
                        ball: "o1",
                        moves: { o5: "screen_on" },
                        pos: P({ o1: [7.8, 3.0], o5: [7.3, 4.1], x1: [8.3, 3.9], x5: [5.8, 2.4] }),
                        resp: resp({ x1: "Se ubica del lado del bloqueo para negarlo.", x5: "Se adelanta hacia la banda: espera al base del lado contrario al bloqueo." }),
                        help: "La consigna del manual: que el base dribblee alejándose del bloqueo [S3]."
                    },
                    uso: {
                        title: "Uso del bloqueo (ice)",
                        note: "El 1 tiene que ir hacia la banda. X1 lo acompaña desde arriba y X5 lo contiene sin dejarlo pasar hacia la línea de fondo.",
                        ball: "o1",
                        moves: { o1: "dribble" },
                        pos: P({ o1: [6.4, 1.8], o5: [7.3, 4.1], x1: [7.1, 2.3], x5: [5.5, 2.4], x2: [2.0, 1.6] }),
                        resp: resp({ x1: "Acompaña desde arriba, sin dejar volver al centro.", x5: "Contiene al base contra la banda.", x2: "Se queda en casa con el tirador de la esquina." }),
                        help: "X2 no puede ayudar: el base está yendo hacia su esquina."
                    },
                    continuacion: {
                        title: "Continuación (ice)",
                        note: "Como X5 se fue con el base, el 5 se abre arriba (pick and pop). X3 tiene que salir desde el lado débil a cerrarle.",
                        ball: "o1",
                        moves: { o5: "move" },
                        pos: P({ o1: [6.4, 1.8], o5: [7.6, 5.8], x1: [7.1, 2.3], x5: [5.5, 2.4], x2: [2.0, 1.6], x3: [6.4, 8.2] }),
                        resp: resp({ x1: "Cierra la línea de pase hacia el centro.", x5: "Sigue con el base hasta que suelte el balón.", x2: "En casa con la esquina.", x3: "Sale hacia el bloqueador que se abrió." }),
                        help: "La salida de X3 deja más solo al 3 en el ala contraria."
                    },
                    lectura: {
                        title: "Lectura del ataque contra el ice",
                        note: "El 1 devuelve el balón al 5 que se abrió. El 5 puede tirar si X3 llega tarde o seguir el pase al 3, que quedó solo.",
                        ball: "o5",
                        pos: P({ o1: [6.4, 1.8], o5: [7.6, 5.8], x1: [7.1, 2.3], x5: [5.5, 2.4], x2: [2.0, 1.6], x3: [6.6, 7.2] }),
                        resp: resp({ x1: "Vuelve hacia el centro.", x5: "Vuelve hacia la zona.", x2: "En casa con la esquina.", x3: "Cierra sobre el bloqueador con pasos cortos." }),
                        help: "Contra el ice, el bloqueador que tira desde afuera es la mejor respuesta del ataque.",
                        options: [["shot", "o5", HOOP], ["pass", "o5", "o3"]],
                        optionsText: ["Tiro del bloqueador que se abrió, si X3 llega tarde.", "Pase extra al 3, que quedó solo en el ala contraria."]
                    }
                }
            }
        ]
    };

    return {
        id: "pick-and-roll",
        sectionId: "pick_and_roll",
        title: "Pick and roll",
        subtitle: "Ejecución, lectura y coberturas defensivas (drop, switch, hedge, blitz e ice), con simulador, ejercicios y fuentes WABC.",
        sectionLabel: "Ataque · Conceptos",
        playCategory: "Ataque",
        meta: ["Ataque y defensa", "Desde U15", "4 pizarras animadas", "Simulador con 5 coberturas", "3 ejercicios"],
        updated: "2026-11-26",
        tabs: {
            aprender: aprender,
            visualizar: ["central", "por-debajo", "show-lateral", "push-doble"],
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
