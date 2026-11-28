/*
 * Basket Lab · Laboratorio táctico · Ataque contra zona 2-3 (concepto colectivo + simulador)
 *
 * Redacción original de Basket Lab en español. Las citas [S1]..[Sn] remiten a la
 * bibliografía del final, consultada directamente el 28/11/2026. Lo que no está respaldado
 * por esas fuentes se marca como interpretación de Basket Lab. Conserva el contenido anterior
 * de «Ataques vs zona 2-3» (id antiguo «vs23»).
 *
 * Coordenadas: metros sobre la cancha FIBA (aro en x = 1,575; y de 0 a 15). La derecha de
 * la pantalla es y chica. Los defensores de la zona usan la misma alineación que la guía
 * «Defensa zonal 2-3» de Basket Lab, para que las dos fichas cuenten lo mismo.
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
    function merge(a, b) { var o = {}; Object.keys(a).forEach(function (k) { o[k] = a[k]; }); Object.keys(b || {}).forEach(function (k) { o[k] = b[k]; }); return o; }

    var sources = [
        Cat.source("wabc-l2-2-4-4", "S1"),
        Cat.source("wabc-l1-2-1-4", "S2", { used: "Sobre defensa individual: mover el balón obliga a los defensores a desplazarse y puede dejar un closeout largo. Acá lo usamos por analogía para la zona; la aplicación a la zona es interpretación de Basket Lab." }),
        Cat.source("wabc-l2-2-1-5", "S3")
    ];

    // Alineación de partida del ataque: un jugador arriba contra los dos bases de la zona.
    var OFF = { o1: [9.2, 7.5], o2: [6.8, 2.2], o3: [6.8, 12.8], o4: [1.0, 0.9], o5: [1.4, 12.6] };
    var DEF = { x1: [7.6, 6.5], x2: [6.4, 9.0], x3: [2.6, 3.4], x4: [2.6, 11.2], x5: [2.1, 7.5] };

    var boards = [
        {
            id: "huecos",
            title: "Ocupar los huecos de la zona",
            kind: "interpretation",
            intro: "La 2-3 tiene dos defensores adelante. Un atacante arriba y dos en las alas se ubican en los huecos entre defensores: cada pase obliga a uno de ellos a decidir.",
            spec: {
                view: VIEW,
                players: merge(
                    { o1: O("1", 9.2, 7.5), o2: O("2", 6.8, 2.2), o3: O("3", 6.8, 12.8), o4: O("4", 1.0, 0.9), o5: O("5", 1.4, 12.6) },
                    { x1: D("1", 7.6, 6.5), x2: D("2", 6.4, 9.0), x3: D("3", 2.6, 3.4), x4: D("4", 2.6, 11.2), x5: D("5", 2.1, 7.5) }
                ),
                phases: [
                    { name: "Uno contra dos", note: "El 1 se ubica entre X1 y X2. Si los dos lo miran, las alas quedan libres; si sale uno solo, el otro tiene que cubrir el poste alto.", ball: "o1", zones: [{ x: 6.0, y: 3.6, w: 1.6, h: 1.6, color: "#0d9488" }, { x: 6.0, y: 9.8, w: 1.6, h: 1.6, color: "#0d9488" }] },
                    { name: "Pase al hueco del ala", note: "El 2 recibe entre X1 y X3: ¿quién sale?", zones: [], strokes: [["pass", "o1", "o2"], ["rotation", "x1", [6.2, 3.2]], ["rotation", "x3", [2.4, 2.4]], ["rotation", "x2", [6.0, 6.8]]] }
                ]
            }
        },
        {
            id: "poste-alto-short",
            title: "Poste alto y short corner, juntos",
            kind: "interpretation",
            intro: "El poste alto obliga a la zona a cerrarse; el short corner castiga al defensor del aro si sube.",
            spec: {
                view: VIEW,
                players: merge(
                    { o1: O("1", 9.2, 7.5), o2: O("2", 6.8, 2.2), o3: O("3", 6.8, 12.8), o4: O("4", 1.0, 0.9), o5: O("5", 1.4, 12.6) },
                    { x1: D("1", 7.6, 6.5), x2: D("2", 6.4, 9.0), x3: D("3", 2.6, 3.4), x4: D("4", 2.6, 11.2), x5: D("5", 2.1, 7.5) }
                ),
                phases: [
                    { name: "Flash al poste alto", ball: "o1", note: "El 5 corta desde el lado débil a la línea de tiros libres y el 4 se mete al short corner.", strokes: [["cut", "o5", [5.6, 7.5], 0.5], ["move", "o4", [1.3, 2.8]]] },
                    { name: "Recepción", note: "Los bases se cierran sobre el poste y X5 queda entre el balón y el aro.", strokes: [["pass", "o1", "o5"], ["rotation", "x1", [6.6, 6.4]], ["rotation", "x2", [6.6, 8.6]], ["rotation", "x5", [2.8, 7.5]], ["rotation", "x3", [2.2, 4.4]]] },
                    { name: "Lectura", note: "Si X5 no sube: tiro. Si X5 sube: pase al short corner o al aro. Si X3 se hunde: el ala queda libre.", strokes: [["pass", "o5", "o4"]] }
                ]
            }
        }
    ];

    var aprender = [
        {
            id: "que-es", title: "Qué es", kind: "interpretation",
            blocks: [
                { p: "Atacar una zona 2-3 no es una jugada: es un conjunto de **principios para ocupar los espacios que la zona deja** y obligar a sus defensores a decidir. Cada pase y cada corte buscan que un defensor tenga que cubrir a dos atacantes, o que dos defensores duden sobre quién sale." },
                { p: "Para entender qué responde la defensa, esta ficha usa la misma alineación que la guía **Defensa zonal 2-3** de Basket Lab." },
                { links: [{ label: "Defensa zona 2-3 (la otra mirada)", go: "tl_zona-2-3" }], label: "Ver también" }
            ]
        },
        {
            id: "identificar", title: "Primero, reconocer que es zona", kind: "official", refs: ["S1"],
            blocks: [
                { p: "Las defensas zonales buscan proteger la zona cercana al aro y empujar al ataque a tirar desde afuera [S1]. Antes de aplicar un ataque contra zona hay que comprobar que lo es. El manual WABC propone formas simples [S1]:" },
                { list: ["**Invertir el balón:** obliga a todos los defensores a moverse; en zona se desplazan como bloque.", "**Cortar de abajo hacia arriba:** si nadie sigue al cortador, probablemente sea zona.", "**Pasar y cortar fuerte al aro:** si el defensor del pasador no lo sigue, es una señal."] }
            ]
        },
        {
            id: "principios", title: "Principios para atacarla", kind: "interpretation",
            blocks: [
                { table: { head: ["Principio", "Qué busca"], rows: [
                    ["Ocupar los huecos", "Ubicarse entre dos defensores: los dos dudan o uno llega tarde"],
                    ["Poste alto", "Recibir en el medio de la zona: obliga a cerrarse y abre las alas, el short corner o el aro"],
                    ["Short corner", "Castigar al defensor del aro si sale, o al alero si se hunde"],
                    ["Sobrecarga", "Poner más atacantes que defensores en un lado"],
                    ["Inversión rápida", "Mover el balón más rápido que la zona; un defensor llega tarde"],
                    ["Penetración entre defensores", "Atacar el hueco para que dos defensores cierren y quede alguien libre"],
                    ["Bloqueos contra zona", "Bloquear al defensor que tiene que salir (por ejemplo, al alero que sale a la esquina)"],
                    ["Rebote ofensivo", "En zona los defensores no tienen un atacante asignado para bloquear: hay espacios para el rebote del lado débil"]
                ] } },
                { p: "Estos principios son la síntesis de Basket Lab; no son una lista oficial. La sección del manual WABC dedicada al ataque contra zona no pudo consultarse completa (ver Fuentes)." }
            ]
        },
        {
            id: "quien-decide", title: "Qué defensores tienen que decidir", kind: "interpretation",
            blocks: [
                { table: { head: ["Acción", "Decide", "Dilema"], rows: [
                    ["Recepción en poste alto", "Los dos bases y el pívot", "Cerrar el poste o volver a las alas; subir al poste o proteger el aro"],
                    ["Pase al short corner", "El pívot y el alero del lado", "Salir y dejar el aro, o quedarse y conceder el tiro"],
                    ["Sobrecarga", "El base y el alero del lado del balón", "Quién toma al cuarto atacante"],
                    ["Inversión rápida", "El base del lado débil", "Closeout largo o tiro libre de marca"],
                    ["Penetración en el hueco", "Los dos defensores del hueco", "Cerrar los dos y dejar a sus atacantes"],
                    ["Pase a la esquina", "El alero o el base, según el criterio", "Quién sale y quién cubre el poste bajo"]
                ] } }
            ]
        },
        {
            id: "cuando", title: "Cuándo conviene y cuándo no", kind: "interpretation",
            blocks: [
                { list: ["Contra una zona bien organizada, la paciencia y el movimiento del balón valen más que el primer tiro abierto.", "Si el equipo tiene buenos tiradores, la inversión y el pase cruzado son más peligrosos.", "Si tiene un interior que pasa bien, el poste alto es el centro del ataque.", "Contra una zona que sale muy lejos (presión zonal), conviene atacar el fondo y el poste bajo."] }
            ]
        },
        {
            id: "jugadores", title: "Qué necesitan los jugadores", kind: "interpretation",
            blocks: [
                { list: ["Un jugador en el poste alto que reciba de frente, tire y pase.", "Tiradores en las alas y las esquinas.", "Pases por encima de la defensa (pase cruzado, pase por encima de la cabeza).", "Paciencia: varios pases antes de tirar."] },
                { links: [
                    { label: "Pase cruzado al lado débil", go: "fundamento_skip" },
                    { label: "Pase por encima de la cabeza", go: "fundamento_pase-cabeza" },
                    { label: "Catch and shoot", go: "fundamento_catch-shoot" },
                    { label: "Recepción en el poste", go: "fundamento_recepcion-poste" }
                ], label: "Fundamentos relacionados" }
            ]
        },
        {
            id: "errores", title: "Errores frecuentes", kind: "interpretation",
            blocks: [
                { table: { head: ["Error", "Qué provoca", "Corrección"], rows: [
                    ["Pararse frente a los defensores", "Un defensor cubre a un atacante sin decidir", "Ubicarse en los huecos"],
                    ["Pasar alrededor del perímetro sin amenazar", "La zona se desplaza cómoda", "Mirar el aro con cada recepción; amenazar antes de pasar"],
                    ["Tirar con el primer pase", "Tiros disputados y sin rebote", "Inversión o poste alto antes del tiro"],
                    ["Nadie va al rebote", "Una sola oportunidad", "Asignar quién entra al rebote del lado débil"],
                    ["Driblear en las bandas", "Trampas fáciles", "Pase antes que dribbling en la zona lateral"]
                ] } }
            ]
        },
        {
            id: "reglamento", title: "Reglamento y categorías", kind: "official", refs: ["S1"],
            blocks: [
                { p: "FIBA recomienda no permitir la defensa zonal hasta los 15 años [S1]. Muchas federaciones y ligas tienen reglas propias para categorías formativas (defensa individual obligatoria, límites a la presión). **Verificá el reglamento de tu competencia**: Basket Lab no lo sabe ni lo supone." }
            ]
        }
    ];

    var visualizar = ["huecos", "poste-alto-short"];

    // ------------------------------------------------------------------
    // Simulador: elegir una acción ofensiva y ver una reacción posible de la zona
    // ------------------------------------------------------------------
    var SIM = {
        id: "sim-ataque-zona-2-3",
        title: "Simulador: atacar la zona 2-3",
        intro: "Elegí una **acción ofensiva** y mirá cómo puede ajustarse la zona, qué defensores tienen que decidir y qué lecturas aparecen. Cambiá el **criterio defensivo** para ver que no todas las zonas reaccionan igual. Es un modelo educativo: muestra respuestas posibles, no resultados garantizados.",
        view: VIEW,
        tags: ["Ataque contra zona 2-3", "Laboratorio táctico"],
        players: {
            o1: O("1", 0, 0), o2: O("2", 0, 0), o3: O("3", 0, 0), o4: O("4", 0, 0), o5: O("5", 0, 0),
            x1: D("1", 0, 0), x2: D("2", 0, 0), x3: D("3", 0, 0), x4: D("4", 0, 0), x5: D("5", 0, 0)
        },
        positions: [
            { id: "inicio", label: "Ubicación inicial", group: "Inicio" },
            { id: "posteAlto", label: "Recepción en poste alto", group: "Acción ofensiva" },
            { id: "shortCorner", label: "Pase al short corner", group: "Acción ofensiva" },
            { id: "sobrecarga", label: "Sobrecarga lateral", group: "Acción ofensiva" },
            { id: "inversion", label: "Inversión rápida", group: "Acción ofensiva" },
            { id: "penetracion", label: "Penetración entre defensores", group: "Acción ofensiva" },
            { id: "esquina", label: "Pase a la esquina", group: "Acción ofensiva" }
        ],
        tour: ["inicio", "posteAlto", "inicio", "shortCorner", "inicio", "sobrecarga", "inversion", "inicio", "penetracion", "inicio", "esquina"],
        ui: {
            variants: "Criterio defensivo",
            positions: "Acción ofensiva",
            hint: "Elegí una acción ofensiva. Tocá un defensor para ver qué tiene que decidir.",
            resp: "Qué decide cada defensor",
            help: "Reacción de la zona",
            vulnerable: "Espacios que pueden aparecer",
            options: "Lecturas posibles del ataque",
            disclaimer: "Es una reacción posible de la zona, no la única. Depende del criterio que entrene cada equipo, de los jugadores y del momento del partido."
        },
        variants: [
            {
                id: "base",
                label: "Bases cierran el poste alto",
                kind: "interpretation",
                desc: "Criterio de la guía «Defensa zonal 2-3» de Basket Lab: un base sale al balón por encima de la línea de recogida, un alero por debajo; el poste alto lo cierran los bases y el pívot se queda cerca del aro.",
                states: {
                    inicio: {
                        title: "Ubicación inicial: uno arriba contra dos",
                        note: "El 1 se ubica en el hueco entre los dos bases. X1 sale al balón; X2 se cierra al poste alto. Las alas y la esquina esperan en los huecos.",
                        ball: "o1",
                        pos: merge(OFF, DEF),
                        resp: {
                            x1: "Sale al balón y le niega la penetración por el medio.",
                            x2: "Se cierra al poste alto y queda listo para salir al ala izquierda.",
                            x3: "Cubre el costado derecho de la pintura y mira la esquina.",
                            x4: "Cubre el costado izquierdo y al 5 en el poste bajo.",
                            x5: "Protege el aro desde el centro de la pintura."
                        },
                        help: "Con un solo atacante arriba, los dos bases no pueden salir a la vez: uno sale y el otro protege el medio.",
                        options: [["pass", "o1", "o2"], ["pass", "o1", "o3"]],
                        optionsText: ["Pase al ala derecha: ¿la toma X1 o X3?", "Pase al ala izquierda: X2 tiene que salir desde el poste alto."],
                        vulnerable: [{ x: 4.9, y: 6.7, w: 1.3, h: 1.6, label: "Poste alto", text: "El medio de la zona, si un atacante llega ahí." }]
                    },
                    posteAlto: {
                        title: "Recepción en poste alto",
                        note: "El 5 cortó desde el lado débil a la línea de tiros libres y recibió. El 4 se metió al short corner. Los bases se cierran sobre el poste desde arriba y X5 se queda entre el balón y el aro.",
                        ball: "o5",
                        moves: { o5: "cut", o4: "move" },
                        pos: merge(merge(OFF, { o5: [5.6, 7.5], o4: [1.3, 2.8] }), { x1: [6.6, 6.3], x2: [6.6, 8.7], x3: [2.3, 4.4], x4: [2.2, 10.6], x5: [2.9, 7.5] }),
                        resp: {
                            x1: "Se cierra sobre el poste desde arriba. Decide: ¿cierro el tiro o vuelvo al ala derecha?",
                            x2: "Se cierra sobre el poste desde arriba. Decide: ¿cierro o vuelvo al ala izquierda?",
                            x3: "Se hunde hacia el short corner. Decide: ¿lo sigo o vigilo el ala?",
                            x4: "Protege el lado débil y el aro.",
                            x5: "Decide: ¿subo a defender el tiro del poste alto o me quedo protegiendo el aro?"
                        },
                        help: "Si X5 no sube, el poste alto tiene tiro de media distancia. Si sube, el aro queda libre para el short corner.",
                        options: [["shot", "o5", HOOP], ["pass", "o5", "o4"], ["pass", "o5", "o3"]],
                        optionsText: ["Tiro desde el poste alto si X5 se queda abajo.", "Pase al short corner (o pase interior si el 4 corta al aro) si X5 o X3 suben.", "Inversión al ala débil si X2 se cerró demasiado."],
                        vulnerable: [{ x: 4.6, y: 6.6, w: 1.4, h: 1.8, label: "Tiro", text: "El tiro del poste alto." }, { x: 0.3, y: 2.1, w: 1.8, h: 1.6, label: "Short corner", text: "Detrás del alero, si se va a cerrar." }]
                    },
                    shortCorner: {
                        title: "Pase al short corner",
                        note: "El balón pasó por el ala y llegó al 4, que está en el short corner. X5 sale a defenderlo; X4 tiene que cruzar a proteger el aro mientras el 5 corta desde el lado débil.",
                        ball: "o4",
                        moves: { o5: "cut", o4: "move" },
                        pos: merge(merge(OFF, { o4: [1.3, 2.6], o5: [1.6, 9.8] }), { x1: [6.0, 2.9], x2: [5.4, 7.2], x3: [3.4, 1.6], x4: [2.3, 7.8], x5: [2.1, 3.6] }),
                        resp: {
                            x1: "Defiende el pase de vuelta al ala.",
                            x2: "Se hunde al medio y vigila el poste alto.",
                            x3: "Se queda entre la esquina y el ala: no puede tomar dos.",
                            x4: "Tiene que cruzar desde el lado débil para proteger el aro y tomar al cortador.",
                            x5: "Sale al short corner: deja el centro de la pintura."
                        },
                        help: "Cuando el pívot de la zona sale, alguien del lado débil tiene que cubrir el aro. Si llega tarde, el pase interior queda abierto.",
                        options: [["pass", "o4", "o5"], ["pass", "o4", "o2"], ["shot", "o4", HOOP]],
                        optionsText: ["Pase interior al 5 que corta si X4 llega tarde.", "Pase de vuelta al ala si X3 se hunde.", "Tiro desde el short corner si X5 no sale."],
                        vulnerable: [{ x: 0.5, y: 8.8, w: 1.8, h: 2.0, label: "Aro", text: "El aro, mientras X4 cruza." }, { x: 6.0, y: 11.8, w: 2.0, h: 2.0, label: "Ala débil", text: "Nadie cerca del 3." }]
                    },
                    sobrecarga: {
                        title: "Sobrecarga lateral",
                        note: "Cuatro atacantes del lado derecho: el 1 en la parte alta, el 2 en el ala, el 4 en la esquina y el 5 en el poste bajo. La zona tiene tres defensores de ese lado.",
                        ball: "o2",
                        moves: { o5: "cut", o1: "move" },
                        pos: merge(merge(OFF, { o1: [8.6, 5.4], o5: [1.6, 4.0] }), { x1: [6.0, 2.9], x2: [6.8, 6.3], x3: [2.7, 2.0], x4: [2.4, 8.6], x5: [2.4, 4.7] }),
                        resp: {
                            x1: "Defiende al balón en el ala.",
                            x2: "Toma al 1 en la parte alta. Decide: ¿me quedo con él o protejo el medio?",
                            x3: "Entre la esquina y el poste: no llega a los dos.",
                            x4: "Queda solo en el lado débil: tiene al 3 y al aro.",
                            x5: "Defiende al 5 en el poste bajo."
                        },
                        help: "Si la zona se corre entera hacia el balón, el lado débil queda con un solo defensor. Un pase cruzado lo castiga.",
                        options: [["pass", "o2", "o4"], ["pass", "o2", "o5"], ["pass", "o2", "o3"]],
                        optionsText: ["Pase a la esquina: X3 tiene que salir y deja el poste.", "Pase al poste bajo si X5 juega por detrás.", "Pase cruzado al ala débil: X4 tiene que elegir entre el 3 y el aro."],
                        vulnerable: [{ x: 5.8, y: 11.6, w: 2.2, h: 2.2, label: "Lado débil", text: "El 3, con un pase cruzado." }, { x: 0.3, y: 0.3, w: 1.8, h: 1.6, label: "Esquina", text: "Si X3 se queda con el poste." }]
                    },
                    inversion: {
                        title: "Inversión rápida",
                        note: "El balón vuelve del ala derecha al ala izquierda en dos pases rápidos. La zona estaba cargada a la derecha: X2 llega tarde y tiene que hacer un closeout largo.",
                        ball: "o3",
                        pos: merge(merge(OFF, { o5: [1.4, 12.6] }), { x1: [7.6, 8.4], x2: [5.8, 11.0], x3: [2.4, 5.4], x4: [2.6, 11.4], x5: [2.0, 8.6] }),
                        resp: {
                            x1: "Vuelve hacia el centro siguiendo el balón.",
                            x2: "Sale desde el medio al ala: closeout largo. Decide: ¿llego al tiro o freno la penetración?",
                            x3: "Cruza al lado débil para proteger el poste bajo y el aro.",
                            x4: "Defiende la esquina y el poste bajo izquierdo.",
                            x5: "Se corre hacia el lado del balón."
                        },
                        help: "Mientras la zona se desplaza, sus defensores están en movimiento y fuera de lugar. Una inversión rápida aprovecha ese momento [S2].",
                        options: [["shot", "o3", HOOP], ["dribble", "o3", [4.8, 10.2]], ["pass", "o3", "o5"]],
                        optionsText: ["Tiro si X2 llega tarde.", "Atacar el closeout con dribbling si X2 llega corriendo y desequilibrado.", "Pase al 5 si X4 sale a cerrar al tirador."],
                        vulnerable: [{ x: 6.0, y: 12.0, w: 1.8, h: 1.8, label: "Closeout", text: "El 3 recibe antes de que llegue X2." }]
                    },
                    penetracion: {
                        title: "Penetración entre defensores",
                        note: "El 2 ataca el hueco entre X1 y X3. Los dos cierran sobre él y X5 da un paso al frente.",
                        ball: "o2",
                        moves: { o2: "dribble" },
                        pos: merge(merge(OFF, { o2: [5.0, 4.4] }), { x1: [5.8, 5.2], x2: [6.4, 8.6], x3: [4.0, 3.3], x4: [2.2, 9.2], x5: [2.6, 5.4] }),
                        resp: {
                            x1: "Cierra el hueco desde arriba. Deja al 1.",
                            x2: "Vigila al 1 y al poste alto.",
                            x3: "Cierra el hueco desde abajo. Deja la esquina.",
                            x4: "Protege el aro del lado débil.",
                            x5: "Da un paso al frente para frenar sin despegarse del aro."
                        },
                        help: "Cuando dos defensores cierran sobre el balón, sus dos atacantes quedan libres. La penetración no busca solo anotar: busca ese pase.",
                        options: [["pass", "o2", "o4"], ["pass", "o2", "o1"], ["shot", "o2", HOOP]],
                        optionsText: ["Pase a la esquina: X3 cerró.", "Pase arriba: X1 cerró.", "Tiro tras dribbling si los dos llegan tarde."],
                        vulnerable: [{ x: 0.3, y: 0.3, w: 1.8, h: 1.6, label: "Esquina", text: "El 4, libre." }, { x: 8.2, y: 6.6, w: 1.8, h: 1.8, label: "Arriba", text: "El 1, libre." }]
                    },
                    esquina: {
                        title: "Pase a la esquina",
                        note: "La esquina está por debajo de la línea de recogida: la toma el alero X3. X5 cubre el poste bajo y X1 baja para cortar el pase de vuelta.",
                        ball: "o4",
                        pos: merge(OFF, { x1: [5.6, 2.8], x2: [5.0, 6.6], x3: [1.7, 1.6], x4: [2.2, 7.6], x5: [1.6, 3.9] }),
                        resp: {
                            x1: "Baja hacia el ala para molestar el pase de vuelta.",
                            x2: "Protege el poste alto y el codo.",
                            x3: "Sale a la esquina y le cierra la línea de fondo.",
                            x4: "Último defensor del lado débil: aro y rebote.",
                            x5: "Defiende el poste bajo del lado del balón."
                        },
                        help: "Con la zona cargada a la derecha, el lado débil queda con un solo defensor.",
                        options: [["pass", "o4", "o2"], ["pass", "o4", "o3"], ["dribble", "o4", [1.4, 3.6]]],
                        optionsText: ["Pase de vuelta al ala y nueva inversión.", "Pase cruzado largo al ala débil (difícil desde la esquina).", "Penetración por el fondo si X3 llega cerrando mal."],
                        vulnerable: [{ x: 5.8, y: 10.6, w: 2.6, h: 3.0, label: "Lado débil", text: "La zona quedó cargada a la derecha." }, { x: 4.0, y: 4.0, w: 1.4, h: 1.4, label: "Codo", text: "Entre X1 y X2." }]
                    }
                }
            },
            {
                id: "pivotSube",
                label: "El pívot sube al poste alto",
                kind: "variant",
                inherits: "base",
                desc: "Criterio alternativo: cuando el balón entra al poste alto, X5 sube a defenderlo y los aleros se juntan delante del aro. Defiende mejor el tiro del poste alto, pero expone el fondo y el short corner.",
                states: {
                    posteAlto: {
                        title: "Recepción en poste alto (sube el pívot)",
                        note: "X5 sube a contener al poste; X3 y X4 se juntan delante del aro y los bases se abren hacia las alas.",
                        ball: "o5",
                        moves: { o5: "cut", o4: "move" },
                        pos: merge(merge(OFF, { o5: [5.6, 7.5], o4: [1.3, 2.8] }), { x1: [7.0, 4.6], x2: [7.0, 10.4], x3: [2.0, 5.6], x4: [2.0, 9.4], x5: [4.4, 7.5] }),
                        resp: {
                            x1: "Se abre al ala derecha para cortar el pase y llegar al tiro.",
                            x2: "Se abre al ala izquierda.",
                            x3: "Se junta delante del aro. Decide: ¿salgo al short corner o protejo el aro?",
                            x4: "Se junta delante del aro, del lado izquierdo.",
                            x5: "Sube a contener al poste alto."
                        },
                        help: "Con X5 arriba, el aro queda a cargo de los aleros. Un pase al short corner obliga a uno de ellos a salir.",
                        options: [["pass", "o5", "o4"], ["pass", "o5", "o2"], ["dribble", "o5", [3.2, 7.2]]],
                        optionsText: ["Pase al short corner: X3 tiene que salir y deja el aro.", "Pase al ala si X1 se cerró hacia adentro.", "Giro y ataque al aro si X5 sube desequilibrado."],
                        vulnerable: [{ x: 0.3, y: 1.8, w: 1.6, h: 2.6, label: "Fondo", text: "El short corner y la línea de fondo." }]
                    }
                }
            },
            {
                id: "esquinaBase",
                label: "La esquina la toma el base",
                kind: "variant",
                inherits: "base",
                desc: "Criterio alternativo: cuando el balón baja a la esquina, sale el base del lado del balón y el alero se queda abajo protegiendo el poste bajo. Cubre mejor el poste, pero deja la parte alta con un solo defensor.",
                states: {
                    esquina: {
                        title: "Pase a la esquina (sale el base)",
                        note: "X1 baja desde el ala hasta la esquina; X3 se queda en el poste bajo; X2 se abre para cubrir el ala.",
                        ball: "o4",
                        pos: merge(OFF, { x1: [1.8, 1.6], x2: [5.8, 4.8], x3: [2.3, 3.6], x4: [2.4, 8.8], x5: [2.0, 5.8] }),
                        resp: {
                            x1: "Recorre mucha distancia hasta la esquina: sale con el pase, no con la recepción.",
                            x2: "Se abre hacia el ala derecha. Decide: ¿ala o poste alto?",
                            x3: "Se queda abajo, en el poste bajo.",
                            x4: "Protege el aro desde el lado débil.",
                            x5: "Se corre al centro de la pintura."
                        },
                        help: "Si X1 llega tarde, X3 frena la penetración por el fondo y X5 cubre el poste.",
                        options: [["pass", "o4", "o2"], ["pass", "o4", "o1"]],
                        optionsText: ["Pase de vuelta al ala: X2 tiene que elegir.", "Pase arriba: queda un solo defensor alto."],
                        vulnerable: [{ x: 6.4, y: 6.2, w: 2.4, h: 2.6, label: "Arriba", text: "Con X1 abajo, la parte alta queda con X2 solo." }]
                    }
                }
            }
        ]
    };

    var entrenar = [
        {
            id: "objetivos", title: "Objetivos de enseñanza", kind: "method",
            blocks: [
                { list: ["Reconocer la zona antes de atacarla [S1].", "Ubicarse en los huecos.", "Usar el poste alto y el short corner como pareja.", "Invertir el balón con pocos dribblings.", "Ir al rebote ofensivo con un plan."] }
            ]
        },
        {
            id: "progresion", title: "Progresión orientativa", kind: "method", refs: ["S3"],
            blocks: [
                { p: "Orientativa. Conviene trabajar contra una zona real lo antes posible y preguntar qué defensor dudó [S3]." },
                { table: { head: ["Etapa", "Formato", "Qué se busca"], rows: [
                    ["1", "5 contra 0 con cinco conos como zona", "Lugares en los huecos"],
                    ["2", "5 contra 5 con defensa que solo se desplaza", "Leer quién sale"],
                    ["3", "Ejercicio 1 (puntos por acción)", "Poste alto, short corner e inversión"],
                    ["4", "Ejercicio 2 (zona activa, posesiones con reloj)", "Decidir con paciencia y reloj"]
                ] } }
            ]
        },
        {
            id: "adaptaciones", title: "Adaptaciones por categoría", kind: "method", refs: ["S1"],
            blocks: [
                { p: "Si en tu competencia no se permite la zona en formativas (FIBA lo recomienda hasta los 15 años [S1]), este contenido sirve para categorías mayores o como cultura táctica. No conviene dedicar tiempo de formación a atacar defensas que los jugadores no van a enfrentar." },
                { table: { head: ["Grupo", "Adaptación"], rows: [
                    ["U15 (si el reglamento lo permite)", "Ocupar huecos y poste alto; nada más"],
                    ["U17–U19", "Short corner, sobrecarga e inversión; rebote ofensivo"],
                    ["Mayores", "Bloqueos contra zona y ajustes según cómo defiende el rival"]
                ] } }
            ]
        }
    ];

    var exercises = [
        {
            id: "ej-zona-puntos",
            name: "5 contra 5 contra 2-3 con puntos por acción",
            works: ["Ataque contra zona", "Poste alto", "Short corner", "Inversión"],
            meta: { fundamento: "Ataque contra zona 2-3", fundamentos: ["recepcion-poste", "skip", "catch-shoot", "pase-cabeza"], objetivo: "Usar el poste alto, el short corner y la inversión", categories: ["U17", "Mayores"], level: "Intermedio", minPlayers: 10, maxPlayers: 15, minutes: [12, 18], court: "half", hoops: 1, materials: ["Balones", "Petos"], optionalMaterials: [], blockType: "tactica" },
            adaptations: [{ id: "cuatro", label: "Con 9 jugadores", text: "4 contra 5: el ataque juega sin el 5 en el short corner y la defensa juega la zona completa.", req: { minPlayers: 9 } }],
            kind: "method",
            board: "poste-alto-short",
            objective: "Atacar la zona usando el poste alto, el short corner y la inversión antes de tirar.",
            secondary: ["Rebote ofensivo del lado débil", "Defensa: comunicar quién sale"],
            category: "U17 a mayores",
            level: "Intermedio",
            players: "10 (5 contra 5); con 15 rota un equipo",
            playersShort: "10 a 15 jugadores",
            duration: "12 a 18 minutos",
            space: "Media cancha",
            hoops: "1",
            materials: "Balones y petos",
            organization: "Defensa en zona 2-3. Ataque con uno arriba, dos alas, una esquina y un jugador en el lado débil.",
            development: "Se juega 5 contra 5. Puntos extra: +1 si el balón tocó el poste alto antes del tiro, +1 si hubo una inversión completa, +1 por rebote ofensivo. La defensa suma 1 punto por cada posesión sin tiro en 24 segundos.",
            rules: ["Máximo dos dribblings por jugador", "La defensa no puede cambiar a individual", "Se cambian los roles cada 5 posesiones"],
            cues: ["«¡Al hueco!»", "«¡Mirá el aro antes de pasar!»", "«¡Poste alto, short corner!»", "«¡Lado débil al rebote!»"],
            errors: ["Pasar sin amenazar", "Pararse frente a un defensor", "Tirar con el primer pase"],
            corrections: ["Congelar y mostrar los huecos", "Pedir una finta de tiro antes de pasar", "Exigir un toque del poste alto"],
            variants: ["El entrenador elige el criterio defensivo (bases cierran / el pívot sube) sin avisar al ataque", "Con un bloqueo contra zona permitido por posesión"],
            progressions: ["Reloj de 14 segundos", "Zona con trampa en la esquina"],
            regressions: ["Defensa que solo se desplaza y no roba", "5 contra 0 contra conos"],
            evaluation: ["Posesiones con toque del poste alto", "Tiros después de inversión", "Rebotes ofensivos"],
            basis: "Propuesta de Basket Lab. La forma de reconocer la zona sigue al manual WABC nivel 2, 2.4.4 [S1]."
        },
        {
            id: "ej-inversion-dos-pases",
            name: "Inversión en dos pases contra la zona",
            works: ["Inversión del balón", "Pase", "Catch and shoot", "Closeout"],
            meta: { fundamento: "Ataque contra zona 2-3", fundamentos: ["pase-pecho", "pase-cabeza", "catch-shoot", "skip"], objetivo: "Mover el balón más rápido que la zona", categories: ["U17", "Mayores"], level: "Inicial", minPlayers: 8, maxPlayers: 12, minutes: [8, 12], court: "half", hoops: 1, materials: ["Balones"], optionalMaterials: [], blockType: "tactica" },
            adaptations: [],
            kind: "method",
            refs: ["S2"],
            objective: "Llevar el balón de un ala a la otra en dos pases como máximo y atacar al defensor que llega tarde.",
            secondary: ["Recepción lista para tirar", "Ataque al closeout"],
            category: "U17 a mayores",
            level: "Inicial",
            players: "3 atacantes (ala, arriba, ala) contra 5 defensores en zona; el resto espera",
            playersShort: "8 a 12 jugadores",
            duration: "8 a 12 minutos",
            space: "Media cancha",
            hoops: "1",
            materials: "Balones",
            organization: "Tres atacantes en el perímetro (alas y arriba). Zona 2-3 completa.",
            development: "El balón empieza en un ala. En dos pases como máximo tiene que llegar al ala contraria. El que recibe tira si el defensor llega tarde o ataca el closeout. Se cuentan tiros sin oposición.",
            rules: ["Sin dribbling antes de la segunda recepción", "Pase cruzado directo permitido", "La zona se desplaza en bloque"],
            cues: ["«¡Rápido, no apurado!»", "«¡Pies listos antes de recibir!»", "«¿Llegó corriendo? Atacalo.»"],
            errors: ["Retener el balón arriba", "Recibir sin preparar los pies", "Pases bombeados lentos"],
            corrections: ["Contar «uno» y pasar", "Mostrar las manos antes del pase", "Pase de pecho firme o por encima de la cabeza"],
            variants: ["Con un poste alto que puede recibir y devolver", "La zona elige sobrecargar el lado del balón"],
            progressions: ["5 contra 5 completo (ejercicio 1)"],
            regressions: ["Zona que se mueve caminando"],
            evaluation: ["Inversiones en dos pases", "Tiros sin oposición", "Ataques al closeout que terminan en ventaja"],
            basis: "Propuesta de Basket Lab. La idea de mover el balón para dejar a los defensores en movimiento viene del manual WABC nivel 1, 2.1.4, aplicada por analogía a la zona [S2]."
        }
    ];

    var variantes = [
        {
            id: "ajustes", title: "Ajustes según la respuesta de la zona", kind: "interpretation",
            blocks: [
                { table: { head: ["Si la zona…", "El ataque puede…"], rows: [
                    ["Cierra el poste alto con los bases", "Pasar a las alas y tirar o invertir"],
                    ["Sube al pívot al poste alto", "Atacar el short corner y el fondo"],
                    ["Saca al alero a la esquina", "Usar el poste bajo y el codo"],
                    ["Saca al base a la esquina", "Atacar desde arriba"],
                    ["Se corre entera al balón", "Pase cruzado al lado débil"],
                    ["Atrapa en la esquina", "Tener un pase de salida al short corner y al ala"]
                ] } },
                { p: "No hay una respuesta universal: el simulador muestra tres criterios defensivos distintos para la misma acción." }
            ]
        },
        {
            id: "otras-zonas", title: "Otras zonas", kind: "interpretation",
            blocks: [
                { links: [
                    { label: "Ataque contra 1-3-1 (versión anterior)", go: "tl_ataque-zona-1-3-1" },
                    { label: "Ataque contra 3-2 (versión anterior)", go: "tl_ataque-zona-3-2" },
                    { label: "Ataque contra 4-1 (versión anterior)", go: "tl_ataque-zona-4-1" },
                    { label: "Defensa zona 2-3", go: "tl_zona-2-3" },
                    { label: "Creación de ventajas", go: "tl_ventajas" }
                ], label: "Relaciones" }
            ]
        },
        {
            id: "anterior", title: "Contenido anterior: «Ataques vs zona 2-3»", kind: "interpretation",
            blocks: [
                { p: "Este es el texto que tenía Basket Lab en «Ataques vs zona 2-3». Se conserva tal cual." },
                { h: "Principios para atacar la 2-3" },
                { list: ["Ocupar el **poste alto** (zona de tiro libre) con un jugador que pueda pasar, tirar o atacar.", "Colocar tiradores en las **esquinas** para abrir la defensa y castigar rotaciones lentas.", "Usar **cortes desde el lado débil** hacia la espalda de la segunda línea (especialmente desde la esquina opuesta).", "Jugar **pick and roll** entre el base y un interior en la parte alta para colapsar la zona.", "Invertir el balón rápidamente (lado a lado) para llegar a tiros abiertos o ventajas en closeout."] },
                { h: "Ideas de organización ofensiva" },
                { list: ["Estructuras **1-3-1** o **3-2** de ataque para cargar poste alto y esquinas.", "Utilizar un interior móvil que pueda jugar short corner y poste alto.", "Jugar con dos jugadores en el perímetro alto que alternen penetrar y descargar."] }
            ]
        }
    ];

    return {
        id: "tl-ataque-zona-2-3",
        title: "Ataque contra zona 2-3",
        subtitle: "Ocupar los huecos, usar el poste alto y el short corner, invertir el balón y obligar a cada defensor a decidir.",
        sectionLabel: "Laboratorio táctico · Ataque colectivo",
        playCategory: "Ataque",
        meta: ["Concepto colectivo", "Desde U17 (según reglamento)", "2 pizarras", "Simulador", "2 ejercicios"],
        updated: "2026-11-28",
        tabOrder: ["aprender", "visualizar", "simular", "entrenar", "variantes", "fuentes"],
        quickJumps: [
            { label: "Abrir el simulador", tab: "simular" },
            { label: "Ver en la pizarra", tab: "visualizar" }
        ],
        ficha: {
            en: "Attacking the 2-3 zone",
            definition: "Principios para ocupar los espacios que deja una zona 2-3 y obligar a sus defensores a decidir.",
            objective: "Que un defensor tenga que cubrir a dos atacantes o llegar tarde.",
            prereqs: ["Pase cruzado al lado débil", "Pase por encima de la cabeza", "Catch and shoot", "Recepción en el poste"],
            applications: ["Poste alto", "Short corner", "Sobrecarga", "Inversión", "Penetración en el hueco"],
            labels: { objective: "Qué problema resuelve", prereqs: "Fundamentos necesarios", applications: "Herramientas" }
        },
        tabs: { aprender: aprender, visualizar: visualizar, entrenar: entrenar, variantes: variantes },
        boards: boards,
        exercises: exercises,
        sources: sources,
        unavailableSources: Cat.unavailable(["wabc-l2-2-4"]),
        simulator: SIM
    };
});
