/*
 * Basket Lab · Laboratorio táctico — modelo de contenidos
 *
 * window.BasketTacticalCatalog:
 *   AREAS      cinco áreas educativas, cada una con sus familias
 *   TYPES      tipos de contenido (principio, acción colectiva, estructura...). Un registro
 *              tiene un solo tipo; las relaciones con otras áreas van en `also` y `related`,
 *              nunca duplicando el registro.
 *   ENTRIES    lo que existe hoy en Basket Lab (fichas nuevas, guías de la Academy y páginas
 *              anteriores), con su id antiguo para que enlaces y favoritos sigan funcionando.
 *   resolve(sectionId)  ruta de la SPA -> { type: "home" | "area" | "entry" | "tool", ... }
 *   search(q)           búsqueda local, sin acentos, en español e inglés
 *
 * Es contenido estático: no consulta Supabase ni usa IA.
 */
(function (root, factory) {
    var api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.BasketTacticalCatalog = api;
})(typeof window !== "undefined" ? window : null, function () {
    "use strict";

    var HOME = "tactical_lab";
    var AREA_PREFIX = "tl_area_";
    var ENTRY_PREFIX = "tl_";

    /** Tipos de contenido (sección 5 de la especificación). */
    var TYPES = {
        principio: { label: "Principio de juego", desc: "Idea que orienta las decisiones en cualquier sistema." },
        concepto: { label: "Concepto colectivo", desc: "Forma de resolver un problema del juego entre varios jugadores." },
        accion: { label: "Acción colectiva", desc: "Acción concreta entre dos o tres jugadores, con sus lecturas." },
        estructura: { label: "Estructura inicial", desc: "Ubicación de partida que admite muchas acciones distintas." },
        sistema: { label: "Sistema ofensivo", desc: "Conjunto de reglas, lecturas o secuencias de un equipo." },
        cobertura: { label: "Cobertura defensiva", desc: "Respuesta colectiva ante una acción ofensiva concreta." },
        "estructura-def": { label: "Estructura defensiva", desc: "Organización defensiva de todo el equipo." },
        situacion: { label: "Situación especial", desc: "Momento del partido con reglas o condiciones propias." }
    };

    /** Estado del contenido: qué encuentra el entrenador al abrirlo. */
    var STATUS = {
        ficha: { label: "Ficha Tactical Lab", desc: "Ficha nueva: comprender, visualizar, experimentar, enseñar, variantes y fuentes." },
        guia: { label: "Guía completa", desc: "Guía de Basket Lab Academy con pizarras, ejercicios y fuentes." },
        anterior: { label: "Versión anterior", desc: "Contenido anterior de Basket Lab, conservado tal cual mientras se renueva." }
    };

    var AREAS = [
        {
            id: "principios",
            name: "Principios del juego",
            short: "Principios",
            desc: "Las ideas que explican por qué una acción funciona: espacio, tiempo, ventajas, ayudas.",
            families: [
                { id: "ofensivos", name: "Principios ofensivos", next: ["Timing", "Circulación del balón", "Movimiento sin balón", "Ritmo ofensivo", "Lectura defensiva", "Toma de decisiones"] },
                { id: "defensivos", name: "Principios defensivos", next: ["Contención del balón", "Protección del aro", "Comunicación", "Ayudas y recuperaciones", "Cierre de la posesión con el rebote"] }
            ]
        },
        {
            id: "ataque",
            name: "Ataque colectivo",
            short: "Ataque",
            desc: "Juego sin balón, bloqueos, acciones colectivas, estructuras y ataque contra zona y presión.",
            families: [
                { id: "sin-balon", name: "Juego sin balón", next: ["Pase y corte (give and go)", "Puerta atrás", "Reemplazos", "Flash", "Lift y drift"] },
                { id: "bloqueos-indirectos", name: "Bloqueos indirectos", next: ["Pin down", "Flare", "Back screen", "Stagger", "Screen the screener"] },
                { id: "bloqueos-directos", name: "Bloqueos directos", next: ["Pick and pop", "Short roll", "Slip", "Drag screen", "Spain pick and roll"] },
                { id: "acciones", name: "Acciones colectivas", next: ["Hand off y dribble hand off", "Drive and kick", "Extra pass", "Juego interior-exterior"] },
                { id: "estructuras", name: "Estructuras ofensivas", next: ["4 Out 1 In", "Horns", "Box", "Stack"] },
                { id: "sistemas", name: "Familias de sistemas", next: ["Motion offense", "Read and react", "Flex", "Princeton"] },
                { id: "vs-zona", name: "Ataque contra zona" },
                { id: "vs-presion", name: "Ataque contra presión", next: ["Salida de traps", "Ocupación del centro", "Ataque de la ventaja después de superar la presión"] }
            ]
        },
        {
            id: "defensa",
            name: "Defensa colectiva",
            short: "Defensa",
            desc: "Ayudas, rotaciones, defensa del pick and roll, zonas, presión y cierre de la posesión.",
            families: [
                { id: "individual", name: "Defensa individual en el sistema", next: ["Lado fuerte y lado débil", "Defensa a uno y a dos pases", "Defensa de cortes", "Defensa del poste"] },
                { id: "ayudas", name: "Ayudas y rotaciones", next: ["Primera y segunda ayuda", "Stunt", "X-out", "Closeouts encadenados"] },
                { id: "pick-and-roll", name: "Defensa del pick and roll", next: ["Switch", "Hedge y show", "Blitz", "Ice", "Under y over"] },
                { id: "indirectos", name: "Defensa de bloqueos indirectos", next: ["Perseguir", "Top lock", "Cambiar"] },
                { id: "zonas", name: "Defensas zonales", next: ["Zona 2-1-2"] },
                { id: "combinadas", name: "Defensas combinadas", next: ["Box and one", "Triangle and two"] },
                { id: "presion", name: "Presión defensiva", next: ["Presión 1-2-1-1", "Presión 1-2-2", "Presión individual a toda la cancha"] },
                { id: "cierre", name: "Cierre de la posesión", next: ["Bloqueo de rebote colectivo", "Protección del rebote largo"] }
            ]
        },
        {
            id: "transicion",
            name: "Transiciones",
            short: "Transiciones",
            desc: "Lo que pasa cuando cambia la posesión: correr, ocupar calles, volver y frenar el balón.",
            families: [
                { id: "ofensiva", name: "Transición ofensiva", next: ["Primer pase y salida", "Ocupación de calles", "Contraataque secundario", "Ataque temprano"] },
                { id: "defensiva", name: "Transición defensiva", next: ["Protección inicial del aro", "Emparejamientos en transición"] }
            ]
        },
        {
            id: "especiales",
            name: "Situaciones especiales",
            short: "Especiales",
            desc: "Saques, últimas posesiones, reloj, marcador y ajustes después de un tiempo muerto.",
            families: [
                { id: "saques", name: "Saques (BLOB y SLOB)", next: ["Saque de fondo", "Saque lateral"] },
                { id: "final", name: "Final de partido", next: ["Última posesión", "Gestión del reloj y del marcador", "Situaciones de falta"] },
                { id: "ajustes", name: "Ajustes", next: ["Superioridad e inferioridad numérica", "Ajustes después de un tiempo muerto"] }
            ]
        }
    ];

    /*
     * Registros. `article`: id del artículo de BasketAcademy. `legacy`: ids antiguos de la SPA
     * (siguen abriendo este contenido). `section`: ruta que abre el contenido cuando no hay artículo.
     */
    var ENTRIES = [
        // Principios
        { id: "spacing", name: "Spacing", en: "Floor spacing", aliases: ["espaciado", "ocupación de espacios", "distancias"], type: "principio", area: "principios", family: "ofensivos", status: "ficha", article: "spacing", legacy: ["spacing_ataque"], also: [["ataque", "estructuras"]], related: ["ventajas", "cinco-abiertos", "ataque-zona-2-3"], fundamentos: ["pase-pecho", "kick-out", "catch-shoot"], summary: "Distancias que hacen difícil ayudar y fácil pasar." },
        { id: "ventajas", name: "Creación y aprovechamiento de ventajas", en: "Creating and using advantages", aliases: ["ventaja", "superioridad", "decisión", "toma de decisiones", "leer la defensa"], type: "principio", area: "principios", family: "ofensivos", status: "ficha", article: "tl-ventajas", also: [["transicion", "ofensiva"]], related: ["spacing", "pick-and-roll", "superioridades", "cinco-abiertos"], fundamentos: ["triple-amenaza", "kick-out", "catch-shoot", "closeout"], summary: "Desequilibrar a la defensa, leer la ayuda y no devolver la ventaja." },

        // Ataque
        { id: "pick-and-roll", name: "Pick and roll", en: "Pick and roll · ball screen", aliases: ["bloqueo directo", "bloqueo y continuación", "pnr", "ball screen"], type: "accion", area: "ataque", family: "bloqueos-directos", status: "ficha", article: "pick-and-roll", legacy: ["pick_and_roll"], also: [["defensa", "pick-and-roll"]], related: ["drop", "ventajas", "cinco-abiertos"], fundamentos: ["pocket", "pull-up", "drible-control"], summary: "El bloqueo sobre el defensor del balón, sus coberturas y sus lecturas." },
        { id: "cinco-abiertos", name: "5 Out", en: "5 Out · five out", aliases: ["cinco abiertos", "5 abiertos", "sistema abierto", "motion 5 out", "juego abierto"], type: "estructura", area: "ataque", family: "estructuras", status: "ficha", article: "tl-5-out", legacy: ["abierto"], related: ["spacing", "ventajas", "pick-and-roll"], fundamentos: ["triple-amenaza", "kick-out", "catch-shoot", "jump-stop"], summary: "Cinco jugadores fuera de la línea de tres y la pintura libre para cortar y penetrar." },
        { id: "juego-interior", name: "Juego con interiores (sistema cerrado)", en: "Inside game · post offense", aliases: ["sistema cerrado", "poste bajo", "high-low", "4 out 1 in", "3 out 2 in"], type: "estructura", area: "ataque", family: "estructuras", status: "anterior", legacy: ["cerrado"], section: "cerrado", related: ["cinco-abiertos"], fundamentos: ["sellar", "recepcion-poste", "drop-step"], summary: "Estructuras con uno o dos jugadores en la pintura (contenido anterior)." },
        { id: "ataque-zona-2-3", name: "Ataque contra zona 2-3", en: "Attacking the 2-3 zone", aliases: ["vs 2-3", "romper la zona", "zona 2-3 ataque", "poste alto", "short corner", "sobrecarga"], type: "concepto", area: "ataque", family: "vs-zona", status: "ficha", article: "tl-ataque-zona-2-3", legacy: ["vs23"], related: ["zona-2-3", "spacing", "ventajas"], fundamentos: ["skip", "catch-shoot", "pase-cabeza", "recepcion-poste"], summary: "Ocupar huecos, poste alto, short corner e inversión: con simulador." },
        { id: "ataque-zona-1-3-1", name: "Ataque contra zona 1-3-1", en: "Attacking the 1-3-1 zone", aliases: ["vs 1-3-1"], type: "concepto", area: "ataque", family: "vs-zona", status: "anterior", legacy: ["vs131"], section: "vs131", related: ["zona-1-3-1"], summary: "Esquina débil y espalda del último defensor (contenido anterior)." },
        { id: "ataque-zona-3-2", name: "Ataque contra zona 3-2", en: "Attacking the 3-2 zone", aliases: ["vs 3-2"], type: "concepto", area: "ataque", family: "vs-zona", status: "anterior", legacy: ["vs32"], section: "vs32", related: ["zona-3-2"], summary: "Espacio entre líneas y esquinas (contenido anterior)." },
        { id: "ataque-zona-4-1", name: "Ataque contra zona 4-1", en: "Attacking a 4-1 zone", aliases: ["vs 4-1"], type: "concepto", area: "ataque", family: "vs-zona", status: "anterior", legacy: ["vs41"], section: "vs41", summary: "Ideas contra una alineación 4-1 (contenido anterior). Pendiente de revisar qué estructura describe." },

        // Defensa
        { id: "drop", name: "Drop", en: "Drop coverage", aliases: ["drop coverage", "contención baja", "big back", "cobertura baja", "sag"], type: "cobertura", area: "defensa", family: "pick-and-roll", status: "ficha", article: "tl-drop", related: ["pick-and-roll", "ventajas"], fundamentos: ["contencion", "desplazamiento", "ayuda"], summary: "El defensor del bloqueador espera atrás y protege la pintura." },
        { id: "zona-2-3", name: "Defensa zona 2-3", en: "2-3 zone defence", aliases: ["zona 2-3", "2-3"], type: "estructura-def", area: "defensa", family: "zonas", status: "ficha", article: "zona-2-3", legacy: ["zone23_defense"], related: ["ataque-zona-2-3"], fundamentos: ["posicion-defensiva", "closeout", "box-out"], summary: "Alineación, responsabilidades, rotaciones, variantes y simulador." },
        { id: "zona-3-2", name: "Defensa zona 3-2", en: "3-2 zone defence", aliases: ["zona 3-2", "1-2-2"], type: "estructura-def", area: "defensa", family: "zonas", status: "guia", article: "zona-3-2", legacy: ["zone32_defense"], related: ["ataque-zona-3-2"], summary: "Guía completa con pizarras, simulador y ejercicios." },
        { id: "zona-1-3-1", name: "Defensa zona 1-3-1", en: "1-3-1 zone defence", aliases: ["zona 1-3-1"], type: "estructura-def", area: "defensa", family: "zonas", status: "guia", article: "zona-1-3-1", legacy: ["zone131_defense"], related: ["ataque-zona-1-3-1"], summary: "Guía completa con pizarras, simulador y ejercicios." },
        { id: "presion", name: "Presión y salidas", en: "Pressure defence and press break", aliases: ["presión", "full court", "toda la cancha", "salida de presión", "press"], type: "estructura-def", area: "defensa", family: "presion", status: "guia", article: "presion", legacy: ["fullcourt"], also: [["ataque", "vs-presion"]], related: ["presion-2-2-1", "trampas"], summary: "Dónde, cuándo y por qué presionar, y cómo salir de la presión." },
        { id: "presion-2-2-1", name: "Presión 2-2-1", en: "2-2-1 press", aliases: ["2-2-1"], type: "estructura-def", area: "defensa", family: "presion", status: "anterior", legacy: ["press221"], section: "press221", related: ["presion"], summary: "Estructura, objetivos y cuándo soltarla (contenido anterior)." },
        { id: "trampas", name: "Trampas (double team)", en: "Trap · double team", aliases: ["double team", "trap", "dos contra uno", "trampa"], type: "cobertura", area: "defensa", family: "presion", status: "anterior", legacy: ["doubleteam"], section: "doubleteam", related: ["presion"], summary: "Principios y riesgos de atrapar el balón (contenido anterior)." },

        // Transiciones
        { id: "superioridades", name: "Superioridades: 2c1, 3c2 y 4c3", en: "Fast break advantages", aliases: ["2 contra 1", "3 contra 2", "4 contra 3", "contraataque", "fast break"], type: "concepto", area: "transicion", family: "ofensiva", status: "guia", article: "superioridades", legacy: ["superioridades"], related: ["ventajas", "balance-defensivo"], summary: "Fijar, pasar y mantener el spacing en superioridad numérica." },
        { id: "balance-defensivo", name: "Balance defensivo", en: "Defensive balance", aliases: ["transición defensiva", "volver", "seguridad", "safety", "balance"], type: "concepto", area: "transicion", family: "defensiva", status: "ficha", article: "tl-balance-defensivo", also: [["principios", "defensivos"]], related: ["superioridades", "cinco-abiertos"], fundamentos: ["desplazamiento", "contencion"], summary: "Quién vuelve, quién frena el balón y cómo se protege el aro al perder la posesión." }
    ];

    /** Herramientas que ya existen en Basket Lab (nada nuevo ni decorativo). */
    var TOOLS = [
        { id: "lecturas", name: "Lecturas de juego", desc: "Situaciones para decidir sobre la pizarra, con análisis de cada alternativa.", section: "desafios_tacticos" },
        { id: "simuladores", name: "Simuladores", desc: "Elegí una acción y mirá cómo puede reaccionar la defensa.", section: "tl_tool_simuladores" },
        { id: "playbook", name: "Mi libro de juego", desc: "Tus jugadas guardadas, para abrir en la pizarra y sumar al entrenamiento.", section: "plays_library" }
    ];

    /** Ids antiguos de hubs que ahora llevan a un área del laboratorio. */
    var LEGACY_HUBS = {
        ataques_hub: ["ataque", null],
        ataques_hub_zona: ["ataque", "vs-zona"],
        ataques_hub_hombre: ["ataque", "estructuras"],
        ataques_hub_conceptos: ["principios", null],
        defensas_zona_hub: ["defensa", "zonas"],
        defensas_zona_hub_principales: ["defensa", "zonas"],
        presion_hub: ["defensa", "presion"],
        presion_hub_sistemas: ["defensa", "presion"]
    };

    var byId = {};
    ENTRIES.forEach(function (e) { byId[e.id] = e; });
    var byArticle = {};
    ENTRIES.forEach(function (e) { if (e.article) byArticle[e.article] = e; });
    var byLegacy = {};
    ENTRIES.forEach(function (e) { (e.legacy || []).forEach(function (l) { byLegacy[l] = e; }); });

    function getArea(id) { return AREAS.filter(function (a) { return a.id === id; })[0] || null; }
    function getEntry(id) { return byId[id] || null; }
    function entryForArticle(articleId) { return byArticle[articleId] || null; }
    function entryForLegacy(sectionId) { return byLegacy[sectionId] || null; }
    function familyName(areaId, famId) {
        var a = getArea(areaId);
        var f = a && a.families.filter(function (x) { return x.id === famId; })[0];
        return f ? f.name : "";
    }

    function areaSection(id, fam) { return AREA_PREFIX + id + (fam ? "__" + fam : ""); }
    function entrySection(id) { return ENTRY_PREFIX + id; }

    /** Contenidos de un área: los propios y los que se relacionan con ella (sin duplicar registros). */
    function entriesInArea(areaId) {
        return ENTRIES.filter(function (e) {
            return e.area === areaId || (e.also || []).some(function (x) { return x[0] === areaId; });
        });
    }
    function familyOf(e, areaId) {
        if (e.area === areaId) return e.family;
        var x = (e.also || []).filter(function (y) { return y[0] === areaId; })[0];
        return x ? x[1] : null;
    }

    /**
     * Rutas de la SPA. Los ids antiguos de hojas (vs23, zone23_defense...) NO se resuelven
     * acá: siguen abriendo su contenido de siempre desde loadContent.
     */
    function resolve(sectionId) {
        var id = String(sectionId || "");
        if (id === HOME) return { type: "home" };
        if (id === "tl_tool_simuladores") return { type: "tool", tool: "simuladores" };
        if (LEGACY_HUBS[id]) return { type: "area", area: LEGACY_HUBS[id][0], family: LEGACY_HUBS[id][1] };
        if (id.indexOf(AREA_PREFIX) === 0) {
            var rest = id.slice(AREA_PREFIX.length).split("__");
            if (getArea(rest[0])) return { type: "area", area: rest[0], family: rest[1] || null };
            return null;
        }
        if (id.indexOf(ENTRY_PREFIX) === 0) {
            var e = getEntry(id.slice(ENTRY_PREFIX.length));
            if (e) return { type: "entry", entry: e.id };
        }
        return null;
    }

    function norm(s) {
        return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    }

    /** Búsqueda local: todas las palabras deben aparecer en nombre, alias, tipo, área o resumen. */
    function search(q) {
        var nq = norm(q).trim();
        if (!nq) return [];
        var words = nq.split(/\s+/);
        return ENTRIES.map(function (e) {
            var hay = norm([e.name, e.en, (e.aliases || []).join(" "), TYPES[e.type].label, (getArea(e.area) || {}).name, familyName(e.area, e.family), e.summary].join(" "));
            if (!words.every(function (w) { return hay.indexOf(w) >= 0; })) return null;
            var name = norm(e.name + " " + (e.aliases || []).join(" ") + " " + e.en);
            var score = words.filter(function (w) { return name.indexOf(w) >= 0; }).length * 2 + (e.status === "ficha" ? 1 : 0);
            return { e: e, score: score };
        }).filter(Boolean).sort(function (a, b) { return b.score - a.score || a.e.name.localeCompare(b.e.name, "es"); }).map(function (x) { return x.e; });
    }

    /** Temas previstos que todavía no tienen contenido (se muestran como texto, sin botón). */
    function upcoming(areaId, famId) {
        var a = getArea(areaId);
        var f = a && a.families.filter(function (x) { return x.id === famId; })[0];
        return (f && f.next) || [];
    }

    function counts() {
        var out = { ficha: 0, guia: 0, anterior: 0 };
        ENTRIES.forEach(function (e) { out[e.status]++; });
        return out;
    }

    return {
        HOME: HOME,
        TYPES: TYPES,
        STATUS: STATUS,
        AREAS: AREAS,
        ENTRIES: ENTRIES,
        TOOLS: TOOLS,
        LEGACY_HUBS: LEGACY_HUBS,
        getArea: getArea,
        getEntry: getEntry,
        entryForArticle: entryForArticle,
        entryForLegacy: entryForLegacy,
        familyName: familyName,
        familyOf: familyOf,
        entriesInArea: entriesInArea,
        areaSection: areaSection,
        entrySection: entrySection,
        resolve: resolve,
        search: search,
        upcoming: upcoming,
        counts: counts,
        norm: norm
    };
});
