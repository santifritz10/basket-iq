/*
 * Basket Lab · Fundamentos — modelo de contenidos sin duplicaciones
 *
 * window.BasketFundCatalog (también requerible desde Node para las pruebas).
 *
 * - AREAS: las 8 áreas deportivas con su organización interna (subáreas).
 * - CONCEPTS: una ficha principal por concepto técnico. Cada concepto tiene un área y
 *   subárea principal, y puede aparecer en otras (campo `also`) sin duplicar contenido.
 *   Las variantes, los nombres alternativos y las relaciones viven en el mismo registro.
 * - Compatibilidad: cada identificador antiguo (fund_*, fund_cat_*) se resuelve al
 *   concepto o al área nueva, así los enlaces y el menú anterior siguen funcionando.
 * - Buscador y filtros: funciones puras, sin dependencias.
 *
 * El contenido antiguo (ventajas, desventajas, momentos) sigue en js/fundamentos-data.js
 * y se muestra dentro de la ficha del concepto mientras se completa su renovación.
 */
(function (root, factory) {
    var api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.BasketFundCatalog = api;
})(typeof window !== "undefined" ? window : null, function () {
    "use strict";

    var LEVELS = ["Inicial", "Intermedio", "Avanzado"];

    /** Habilidades transversales (filtro "Habilidad"). */
    var SKILLS = {
        tecnica: "Técnica individual",
        decision: "Toma de decisiones",
        "sin-balon": "Juego sin balón",
        contacto: "Contacto y fuerza",
        coordinacion: "Coordinación y equilibrio",
        creatividad: "Creatividad"
    };

    var AREAS = [
        {
            id: "dominio-balon",
            legacy: "fund_cat_dribbling",
            sport: "Dribbling",
            name: "Dominio del balón",
            desc: "Controlar, proteger y llevar el balón para crear ventajas frente a la defensa.",
            figure: "area-dominio",
            subs: [
                ["control", "Control y coordinación"],
                ["proteccion", "Protección y avance"],
                ["direccion", "Cambios de dirección"],
                ["ritmo", "Cambios de ritmo"],
                ["ventajas", "Creación de ventajas"],
                ["aplicacion", "Aplicación frente a defensores"]
            ]
        },
        {
            id: "pase",
            legacy: "fund_cat_pase",
            sport: "Pase",
            name: "Pase y recepción",
            desc: "Pasar y recibir con precisión, en movimiento y bajo oposición, leyendo la defensa.",
            figure: "area-pase",
            subs: [
                ["tecnica-pase", "Técnica de pase"],
                ["recepcion", "Técnica de recepción"],
                ["precision", "Precisión"],
                ["movimiento", "Pase en movimiento"],
                ["oposicion", "Pase bajo oposición"],
                ["lecturas", "Lecturas y aplicaciones tácticas"]
            ]
        },
        {
            id: "lanzamiento",
            legacy: "fund_cat_tiro",
            sport: "Tiro",
            name: "Lanzamiento",
            desc: "Mecánica, preparación y selección de tiro: desde la recepción, tras dribbling y en movimiento.",
            figure: "area-lanzamiento",
            subs: [
                ["mecanica", "Mecánica"],
                ["preparacion", "Preparación y equilibrio"],
                ["tiro-libre", "Tiro libre"],
                ["recepcion", "Tiro desde recepción"],
                ["tras-dribbling", "Tiro después de dribbling"],
                ["en-movimiento", "Tiro en movimiento"],
                ["espacio", "Creación de espacio"],
                ["seleccion", "Selección de lanzamiento"]
            ]
        },
        {
            id: "finalizaciones",
            legacy: "fund_cat_finalizaciones",
            sport: "Finalizaciones",
            name: "Finalizaciones",
            desc: "Terminar cerca del aro con las dos manos, con contacto y leyendo al defensor.",
            figure: "area-finalizaciones",
            subs: [
                ["bandejas", "Bandejas"],
                ["extensiones", "Extensiones"],
                ["cambios-mano", "Cambios de mano"],
                ["contacto", "Finalizaciones con contacto"],
                ["sobre-defensores", "Finalizaciones por encima de defensores"],
                ["cerca-aro", "Cambios de dirección cerca del aro"],
                ["lecturas", "Lecturas según la posición defensiva"]
            ]
        },
        {
            id: "juego-pies",
            legacy: "fund_cat_juego_pies",
            sport: "Juego de pies",
            name: "Juego de pies",
            desc: "Equilibrio, paradas, pivotes, arranques y fintas: la base de todo lo demás.",
            figure: "area-pies",
            subs: [
                ["equilibrio", "Equilibrio"],
                ["paradas", "Paradas"],
                ["pivotes", "Pivotes"],
                ["arranques", "Arranques"],
                ["fintas", "Fintas"],
                ["coordinacion", "Coordinación"],
                ["aplicacion", "Aplicación ofensiva y defensiva"]
            ]
        },
        {
            id: "poste",
            legacy: "fund_cat_posteo",
            sport: "Posteo",
            name: "Juego en el poste",
            desc: "Ganar la posición, sellar, recibir y resolver de espaldas o de cara al aro.",
            figure: "area-poste",
            subs: [
                ["posicionamiento", "Posicionamiento"],
                ["sellado", "Sellado"],
                ["recepcion", "Recepción"],
                ["movimientos", "Movimientos"],
                ["lecturas", "Lecturas"],
                ["finalizaciones", "Finalizaciones"]
            ]
        },
        {
            id: "defensa",
            legacy: "fund_cat_defensa",
            sport: "Defensa individual",
            name: "Defensa individual",
            desc: "Posición, desplazamientos, defensa al balón y sin balón, ayudas y closeouts.",
            figure: "area-defensa",
            subs: [
                ["posicion", "Posición defensiva"],
                ["desplazamientos", "Desplazamientos"],
                ["al-balon", "Defensa al balón"],
                ["sin-balon", "Defensa sin balón"],
                ["ayudas", "Ayudas"],
                ["closeouts", "Closeouts"],
                ["recuperaciones", "Recuperaciones"],
                ["lecturas", "Lecturas defensivas"]
            ]
        },
        {
            id: "rebote",
            legacy: "fund_cat_rebote",
            sport: "Rebote",
            name: "Rebote",
            desc: "Leer la trayectoria, ganar la posición, bloquear, capturar y continuar la jugada.",
            figure: "area-rebote",
            subs: [
                ["trayectoria", "Lectura de trayectoria"],
                ["posicionamiento", "Posicionamiento"],
                ["bloqueo", "Bloqueo defensivo"],
                ["captura", "Captura"],
                ["ofensivo", "Rebote ofensivo"],
                ["continuidad", "Continuidad posterior"]
            ]
        }
    ];

    /** Subcategorías del menú anterior → área nueva (para enlaces viejos). */
    var LEGACY_GROUPS = {
        fund_cat_dribbling_control: "dominio-balon",
        fund_cat_dribbling_cambios: "dominio-balon",
        fund_cat_dribbling_creacion: "dominio-balon",
        fund_cat_pase_basicos: "pase",
        fund_cat_pase_movimiento: "pase",
        fund_cat_pase_creativos: "pase",
        fund_cat_pase_presion: "pase",
        fund_cat_pase_pickroll: "pase",
        fund_cat_tiro_basico: "lanzamiento",
        fund_cat_tiro_movimiento: "lanzamiento",
        fund_cat_tiro_exterior: "lanzamiento",
        fund_cat_tiro_avanzado: "lanzamiento",
        fund_cat_tiro_penetracion: "lanzamiento",
        fund_cat_finalizaciones_bandejas: "finalizaciones",
        fund_cat_finalizaciones_contacto: "finalizaciones",
        fund_cat_finalizaciones_avanzadas: "finalizaciones",
        fund_cat_finalizaciones_defensores: "finalizaciones",
        fund_cat_juego_pies_paradas: "juego-pies",
        fund_cat_juego_pies_pivotes: "juego-pies",
        fund_cat_juego_pies_arranques: "juego-pies",
        fund_cat_juego_pies_movimientos: "juego-pies",
        fund_cat_posteo_posicion: "poste",
        fund_cat_posteo_basicos: "poste",
        fund_cat_posteo_avanzados: "poste",
        fund_cat_defensa_posicion: "defensa",
        fund_cat_defensa_balon: "defensa",
        fund_cat_defensa_sin_balon: "defensa",
        fund_cat_rebote_defensivo: "rebote",
        fund_cat_rebote_ofensivo: "rebote"
    };

    /*
     * Conceptos. Campos:
     *   id, name, en (nombre en inglés), aliases[], area, sub, also[[area, sub]],
     *   level, skills[], legacy[] (ids antiguos que son este mismo concepto),
     *   variants[{ id, name, legacy?, note }], prereqs[conceptId], related[conceptId],
     *   article (id del artículo completo en BasketAcademy, si ya fue renovado),
     *   merge (explicación de una fusión o separación), pending (dudas a validar).
     */
    function C(o) { return o; }

    var CONCEPTS = [
        // ---------------------------------------------------------- Dominio del balón
        C({ id: "drible-control", name: "Drible de control", en: "Stationary / control dribble", aliases: ["drible estático", "bote estático"], area: "dominio-balon", sub: "control", level: "Inicial", skills: ["tecnica", "coordinacion"], legacy: ["fund_drible_estatico"], prereqs: [], related: ["drible-proteccion", "triple-amenaza"] }),
        C({ id: "drible-proteccion", name: "Drible de protección", en: "Protection dribble", aliases: ["drible bajo de protección", "bote protegido"], area: "dominio-balon", sub: "proteccion", also: [["dominio-balon", "aplicacion"]], level: "Inicial", skills: ["tecnica", "contacto"], legacy: ["fund_drible_bajo_proteccion"], prereqs: ["drible-control"], related: ["retreat", "escape"] }),
        C({
            id: "drible-avance", name: "Drible de avance", en: "Speed dribble", aliases: ["drible alto de avance", "drible en velocidad", "drible de transición"], area: "dominio-balon", sub: "proteccion", level: "Inicial", skills: ["tecnica", "decision"],
            legacy: ["fund_drible_alto_avance", "fund_drible_velocidad"],
            variants: [{ id: "transicion", name: "En transición", legacy: "fund_drible_transicion", note: "Mismo drible aplicado a llevar el balón de defensa a ataque." }],
            merge: "«Drible alto de avance» y «Drible en velocidad» describían el mismo drible; quedaron en una sola ficha. «Drible de transición» es su aplicación al contraataque.",
            prereqs: ["drible-control"], related: ["cambio-ritmo", "pase-adelantado"]
        }),
        C({ id: "cambio-ritmo", name: "Cambio de ritmo", en: "Change of pace", aliases: ["drible de cambio de ritmo", "cambio de velocidad"], area: "dominio-balon", sub: "ritmo", also: [["dominio-balon", "ventajas"]], level: "Inicial", skills: ["tecnica", "decision"], legacy: ["fund_drible_cambio_ritmo"], prereqs: ["drible-avance"], related: ["hesitation", "crossover"] }),
        C({ id: "hesitation", name: "Hesitation", en: "Hesitation dribble", aliases: ["amague de parada", "freno"], area: "dominio-balon", sub: "ritmo", also: [["dominio-balon", "ventajas"]], level: "Intermedio", skills: ["tecnica", "decision"], legacy: ["fund_hesitation"], prereqs: ["cambio-ritmo"], related: ["crossover", "in-out"] }),
        C({
            id: "crossover", name: "Crossover", en: "Crossover dribble", aliases: ["cambio de mano por delante", "cruce", "cambio de mano"], area: "dominio-balon", sub: "direccion", also: [["dominio-balon", "ventajas"], ["dominio-balon", "aplicacion"]], level: "Inicial", skills: ["tecnica", "decision"],
            legacy: ["fund_crossover"],
            variants: [
                { id: "hesitation-crossover", name: "Hesitation crossover", legacy: "fund_hesitation_crossover", note: "Combinación de freno y cambio de mano." },
                { id: "double-crossover", name: "Double crossover", legacy: "fund_double_crossover", note: "Dos cambios de mano seguidos para llevar al defensor y volver." }
            ],
            merge: "«Hesitation crossover» y «Double crossover» no son conceptos distintos: son combinaciones del crossover y quedan como variantes dentro de su ficha.",
            prereqs: ["drible-control", "drible-avance"], related: ["between-legs", "behind-back", "hesitation", "cambio-ritmo"],
            article: "fund-crossover"
        }),
        C({ id: "between-legs", name: "Cambio entre las piernas", en: "Between the legs", aliases: ["between the legs", "entre piernas"], area: "dominio-balon", sub: "direccion", level: "Intermedio", skills: ["tecnica", "coordinacion"], legacy: ["fund_between_legs"], prereqs: ["crossover"], related: ["behind-back", "crossover"] }),
        C({
            id: "behind-back", name: "Cambio por detrás de la espalda", en: "Behind the back", aliases: ["behind the back", "por la espalda"], area: "dominio-balon", sub: "direccion", also: [["dominio-balon", "aplicacion"]], level: "Intermedio", skills: ["tecnica", "coordinacion"],
            legacy: ["fund_behind_back"],
            variants: [{ id: "escape", name: "Para escapar de la presión", legacy: "fund_behind_back_escape", note: "El mismo cambio usado para salir de un dos contra uno o de una presión." }],
            prereqs: ["crossover"], related: ["between-legs", "escape"]
        }),
        C({
            id: "spin", name: "Reverso con dribbling", en: "Spin move / reverse dribble", aliases: ["spin move", "reverse dribble", "giro", "reverso"], area: "dominio-balon", sub: "direccion", also: [["finalizaciones", "cerca-aro"], ["dominio-balon", "aplicacion"]], level: "Intermedio", skills: ["tecnica", "coordinacion", "contacto"],
            legacy: ["fund_spin_move", "fund_reverse_dribble"],
            variants: [
                { id: "escape", name: "Reverso de escape", legacy: "fund_spin_escape", note: "Para salir de una presión cerca de la banda." },
                { id: "finalizacion", name: "Reverso para finalizar", legacy: "fund_spin_finish", note: "Aplicación cerca del aro, al terminar el dribbling." }
            ],
            merge: "«Spin move» y «Reverse dribble» son el mismo gesto. El reverso de escape y el reverso para finalizar son aplicaciones del mismo principio. El giro en el poste es otro movimiento (otro apoyo y otra lectura) y tiene ficha propia.",
            prereqs: ["crossover", "pivote-reverso"], related: ["spin-poste", "escape"]
        }),
        C({ id: "in-out", name: "In & out", en: "In and out dribble", aliases: ["amague de cambio", "dentro fuera"], area: "dominio-balon", sub: "ventajas", level: "Intermedio", skills: ["tecnica", "decision"], legacy: ["fund_in_out"], prereqs: ["crossover"], related: ["hesitation", "crossover"] }),
        C({ id: "shamgod", name: "Shamgod", en: "Shamgod", aliases: [], area: "dominio-balon", sub: "ventajas", level: "Avanzado", skills: ["tecnica", "creatividad"], legacy: ["fund_shamgod"], prereqs: ["crossover", "in-out"], related: [] }),
        C({ id: "combos", name: "Combinaciones de dribbling", en: "Combo dribbles", aliases: ["combo dribbles", "combinaciones"], area: "dominio-balon", sub: "ventajas", level: "Intermedio", skills: ["tecnica", "coordinacion", "creatividad"], legacy: ["fund_combo_dribbles"], prereqs: ["crossover", "between-legs", "behind-back"], related: [] }),
        C({ id: "drible-lateral", name: "Drible lateral", en: "Lateral dribble", aliases: [], area: "dominio-balon", sub: "aplicacion", level: "Inicial", skills: ["tecnica"], legacy: ["fund_drible_lateral"], prereqs: ["drible-control"], related: ["retreat"] }),
        C({ id: "retreat", name: "Drible de retroceso", en: "Retreat / pull-back dribble", aliases: ["retreat dribble", "pull back dribble", "retroceso"], area: "dominio-balon", sub: "aplicacion", level: "Inicial", skills: ["tecnica", "decision"], legacy: ["fund_retreat_dribble", "fund_pull_back_dribble"], merge: "«Retreat dribble» y «Pull back dribble» son el mismo recurso con dos nombres; quedaron en una ficha.", prereqs: ["drible-proteccion"], related: ["escape", "step-back"] }),
        C({ id: "escape", name: "Drible de escape", en: "Escape dribble", aliases: ["escape dribble", "salir de la presión"], area: "dominio-balon", sub: "aplicacion", level: "Intermedio", skills: ["tecnica", "decision"], legacy: ["fund_escape_dribble"], prereqs: ["drible-proteccion"], related: ["retreat", "spin", "behind-back"] }),

        // ---------------------------------------------------------- Pase y recepción
        C({ id: "pase-pecho", name: "Pase de pecho", en: "Chest pass", aliases: [], area: "pase", sub: "tecnica-pase", also: [["pase", "precision"]], level: "Inicial", skills: ["tecnica"], legacy: ["fund_pase_pecho"], prereqs: [], related: ["pase-picado"] }),
        C({
            id: "pase-picado", name: "Pase picado", en: "Bounce pass", aliases: ["bounce pass"], area: "pase", sub: "tecnica-pase", also: [["pase", "lecturas"]], level: "Inicial", skills: ["tecnica"],
            legacy: ["fund_pase_picado"],
            variants: [{ id: "al-roll", name: "Al jugador que continúa en el pick and roll", legacy: "fund_bounce_pass_roll", note: "La misma técnica aplicada al bloqueador que continúa." }],
            prereqs: ["pase-pecho"], related: ["pocket", "bounce-wrap"]
        }),
        C({ id: "pase-cabeza", name: "Pase por encima de la cabeza", en: "Overhead pass", aliases: [], area: "pase", sub: "tecnica-pase", level: "Inicial", skills: ["tecnica"], legacy: ["fund_pase_encima_cabeza"], prereqs: ["pase-pecho"], related: ["skip"] }),
        C({ id: "pase-beisbol", name: "Pase de béisbol", en: "Baseball pass", aliases: [], area: "pase", sub: "tecnica-pase", also: [["pase", "movimiento"]], level: "Intermedio", skills: ["tecnica"], legacy: ["fund_pase_beisbol"], prereqs: ["pase-pecho"], related: ["pase-adelantado"] }),
        C({
            id: "pase-adelantado", name: "Pase adelantado", en: "Lead pass", aliases: ["pase al espacio"], area: "pase", sub: "movimiento", also: [["pase", "precision"]], level: "Inicial", skills: ["tecnica", "decision"],
            legacy: ["fund_pase_adelantado"],
            variants: [{ id: "transicion", name: "En transición", legacy: "fund_pase_transicion", note: "Pase adelantado al compañero que corre el contraataque." }],
            prereqs: ["pase-pecho"], related: ["pase-carrera", "drible-avance"]
        }),
        C({ id: "pase-carrera", name: "Pase en carrera", en: "Pass on the move", aliases: [], area: "pase", sub: "movimiento", level: "Intermedio", skills: ["tecnica", "coordinacion"], legacy: ["fund_pase_carrera"], prereqs: ["pase-pecho", "stride-stop"], related: ["pase-adelantado"] }),
        C({ id: "no-look", name: "Pase sin mirar", en: "No-look pass", aliases: ["no look"], area: "pase", sub: "oposicion", level: "Avanzado", skills: ["tecnica", "decision", "creatividad"], legacy: ["fund_no_look_pass"], prereqs: ["pase-pecho", "pase-picado"], related: [] }),
        C({ id: "hook-pass", name: "Pase de gancho", en: "Hook pass", aliases: [], area: "pase", sub: "oposicion", level: "Intermedio", skills: ["tecnica"], legacy: ["fund_hook_pass"], prereqs: ["pase-cabeza"], related: [] }),
        C({ id: "behind-back-pass", name: "Pase por detrás de la espalda", en: "Behind the back pass", aliases: [], area: "pase", sub: "oposicion", level: "Avanzado", skills: ["tecnica", "creatividad"], legacy: ["fund_behind_back_pass"], prereqs: ["pase-pecho"], related: [] }),
        C({ id: "bounce-wrap", name: "Pase picado envolvente", en: "Wrap-around bounce pass", aliases: ["bounce wrap pass"], area: "pase", sub: "oposicion", level: "Intermedio", skills: ["tecnica"], legacy: ["fund_bounce_wrap_pass"], prereqs: ["pase-picado"], related: ["pocket"] }),
        C({ id: "skip", name: "Pase cruzado al lado débil", en: "Skip pass", aliases: ["skip pass", "skip al lado débil"], area: "pase", sub: "lecturas", also: [["pase", "oposicion"]], level: "Intermedio", skills: ["tecnica", "decision"], legacy: ["fund_skip_pass", "fund_skip_lado_debil"], merge: "«Skip pass» (pases bajo presión) y «Skip al lado débil» (pick and roll) eran el mismo pase en dos menús.", prereqs: ["pase-cabeza"], related: ["kick-out", "closeout"] }),
        C({ id: "kick-out", name: "Pase de descarga", en: "Kick-out pass", aliases: ["kick out", "penetrar y pasar"], area: "pase", sub: "lecturas", level: "Intermedio", skills: ["decision", "tecnica"], legacy: ["fund_kick_out_pass"], prereqs: ["pase-pecho", "drible-avance"], related: ["catch-shoot", "closeout"] }),
        C({ id: "pocket", name: "Pocket pass", en: "Pocket pass", aliases: ["pase al bolsillo", "pase al roll", "pase en pick and roll", "pase de bolsillo"], area: "pase", sub: "lecturas", also: [["pase", "oposicion"]], level: "Intermedio", skills: ["tecnica", "decision"], legacy: ["fund_pocket_pass"], merge: "Aparecía en «Pases bajo presión» y en «Pases en pick and roll» apuntando al mismo contenido. Ahora es una sola ficha relacionada con pase y con pick and roll.", prereqs: ["pase-picado"], related: ["pase-picado", "lob"] }),
        C({ id: "drop-pass", name: "Pase dejado", en: "Drop pass", aliases: ["drop pass", "dejada"], area: "pase", sub: "lecturas", level: "Intermedio", skills: ["decision", "tecnica"], legacy: ["fund_drop_pass"], prereqs: ["pase-picado"], related: ["kick-out"] }),
        C({ id: "lob", name: "Pase bombeado", en: "Lob pass", aliases: ["lob", "alley"], area: "pase", sub: "lecturas", level: "Intermedio", skills: ["tecnica", "decision"], legacy: ["fund_lob_pass"], prereqs: ["pase-cabeza"], related: ["pocket"] }),

        // ---------------------------------------------------------- Lanzamiento
        C({ id: "set-shot", name: "Tiro en apoyo", en: "Set shot", aliases: ["set shot", "tiro sin salto"], area: "lanzamiento", sub: "mecanica", level: "Inicial", skills: ["tecnica"], legacy: ["fund_set_shot"], prereqs: [], related: ["tiro-suspension", "tiro-libre"] }),
        C({ id: "tiro-suspension", name: "Tiro en suspensión", en: "Jump shot", aliases: ["jump shot"], area: "lanzamiento", sub: "mecanica", level: "Intermedio", skills: ["tecnica", "coordinacion"], legacy: ["fund_tiro_suspension"], prereqs: ["set-shot"], related: ["catch-shoot", "pull-up"] }),
        C({ id: "tiro-libre", name: "Tiro libre", en: "Free throw", aliases: [], area: "lanzamiento", sub: "tiro-libre", level: "Inicial", skills: ["tecnica"], legacy: ["fund_tiro_libre"], prereqs: ["set-shot"], related: [] }),
        C({
            id: "catch-shoot", name: "Catch and shoot", en: "Catch and shoot", aliases: ["tiro tras recepción", "tiro de recepción", "spot up"], area: "lanzamiento", sub: "recepcion", also: [["lanzamiento", "preparacion"], ["lanzamiento", "seleccion"], ["pase", "recepcion"]], level: "Inicial", skills: ["tecnica", "decision", "sin-balon"],
            legacy: ["fund_catch_shoot"],
            variants: [
                { id: "spot-up", name: "Spot up (esperando el pase quieto)", legacy: "fund_spot_up", note: "El tirador espera la descarga en un lugar fijo, con los pies y las manos preparados." },
                { id: "salida-bloqueo", name: "Saliendo de un bloqueo", legacy: "fund_off_screen_shot", note: "Recibir y tirar tras usar un bloqueo indirecto." }
            ],
            merge: "«Spot up» y «Off screen shot» son formas de tirar desde la recepción: quedaron como variantes de esta ficha.",
            prereqs: ["set-shot", "jump-stop"], related: ["kick-out", "closeout", "pull-up", "tiro-suspension"],
            article: "fund-catch-shoot"
        }),
        C({
            id: "pull-up", name: "Tiro tras dribbling", en: "Pull-up jumper", aliases: ["pull up", "parada y tiro"], area: "lanzamiento", sub: "tras-dribbling", level: "Intermedio", skills: ["tecnica", "decision", "coordinacion"],
            legacy: ["fund_pull_up"],
            variants: [
                { id: "un-bote", name: "Tras un dribbling", legacy: "fund_one_dribble_pull_up", note: "Un solo bote antes de parar y tirar." },
                { id: "dos-botes", name: "Tras dos dribblings", legacy: "fund_two_dribble_pull_up", note: "Dos botes para cambiar el ángulo o la distancia." }
            ],
            merge: "«Pull up», «One dribble pull up» y «Two dribble pull up» son el mismo tiro; cambia la cantidad de botes. Una ficha con variantes.",
            prereqs: ["tiro-suspension", "jump-stop"], related: ["catch-shoot", "step-back"]
        }),
        C({ id: "step-in", name: "Paso adentro y tiro", en: "Step-in shot", aliases: ["step in"], area: "lanzamiento", sub: "en-movimiento", level: "Intermedio", skills: ["tecnica", "decision"], legacy: ["fund_step_in_shot"], prereqs: ["shot-fake"], related: ["side-step"] }),
        C({
            id: "step-back", name: "Step back", en: "Step-back", aliases: ["paso atrás"], area: "lanzamiento", sub: "espacio", also: [["dominio-balon", "ventajas"]], level: "Avanzado", skills: ["tecnica", "coordinacion", "decision"],
            legacy: ["fund_step_back"],
            variants: [{ id: "drible", name: "Como dribbling de separación", legacy: "fund_step_back_dribble", note: "El mismo paso atrás para ganar espacio y seguir jugando, sin tirar." }],
            merge: "El step back de tiro y el step back de dribbling comparten gesto; difieren en la decisión final.",
            prereqs: ["pull-up", "retreat"], related: ["side-step", "fadeaway"]
        }),
        C({ id: "side-step", name: "Paso lateral y tiro", en: "Side step", aliases: ["side step"], area: "lanzamiento", sub: "espacio", level: "Avanzado", skills: ["tecnica", "coordinacion"], legacy: ["fund_side_step"], prereqs: ["pull-up"], related: ["step-back", "step-in"] }),
        C({
            id: "fadeaway", name: "Fadeaway", en: "Fadeaway", aliases: ["tiro cayendo hacia atrás"], area: "lanzamiento", sub: "espacio", also: [["poste", "movimientos"]], level: "Avanzado", skills: ["tecnica", "coordinacion"],
            legacy: ["fund_fadeaway"],
            variants: [{ id: "poste", name: "Desde el poste", legacy: "fund_fadeaway_post", note: "El mismo tiro tras un giro de espaldas al aro." }],
            merge: "Estaba en «Tiro avanzado» y en «Posteo avanzado». Es un mismo tiro con dos puntos de partida: una ficha con la variante de poste.",
            prereqs: ["tiro-suspension"], related: ["turnaround", "step-back"]
        }),
        C({ id: "turnaround", name: "Tiro con giro", en: "Turnaround jumper", aliases: ["turnaround"], area: "lanzamiento", sub: "espacio", also: [["poste", "finalizaciones"]], level: "Avanzado", skills: ["tecnica", "coordinacion"], legacy: ["fund_turnaround_jumper"], prereqs: ["pivote-reverso", "tiro-suspension"], related: ["fadeaway", "drop-step"] }),

        // ---------------------------------------------------------- Finalizaciones
        C({
            id: "bandeja", name: "Bandeja", en: "Lay-up", aliases: ["entrada", "lay up", "layup", "doble paso"], area: "finalizaciones", sub: "bandejas", also: [["finalizaciones", "cambios-mano"], ["juego-pies", "coordinacion"]], level: "Inicial", skills: ["tecnica", "coordinacion"],
            legacy: [],
            variants: [
                { id: "derecha", name: "Por la derecha (mano derecha)", legacy: "fund_bandeja_derecha", note: "Último apoyo con el pie izquierdo, balón con la mano derecha." },
                { id: "izquierda", name: "Por la izquierda (mano izquierda)", legacy: "fund_bandeja_izquierda", note: "Último apoyo con el pie derecho, balón con la mano izquierda." }
            ],
            merge: "«Bandeja derecha» y «Bandeja izquierda» son la misma técnica en espejo: una ficha con las dos manos, que es lo que se entrena.",
            prereqs: ["drible-avance", "stride-stop"], related: ["power-layup", "reverse", "eurostep", "floater"],
            article: "fund-bandeja"
        }),
        C({ id: "power-layup", name: "Bandeja de potencia", en: "Power lay-up", aliases: ["power layup", "a dos pies"], area: "finalizaciones", sub: "contacto", level: "Intermedio", skills: ["tecnica", "contacto"], legacy: ["fund_power_layup"], prereqs: ["bandeja", "jump-stop"], related: ["pro-hop"] }),
        C({ id: "reverse", name: "Bandeja reversa", en: "Reverse lay-up", aliases: ["reverse layup", "reverse finish", "por el otro lado del aro"], area: "finalizaciones", sub: "cerca-aro", also: [["finalizaciones", "lecturas"]], level: "Intermedio", skills: ["tecnica", "coordinacion"], legacy: ["fund_reverse_layup", "fund_reverse_finish"], merge: "«Reverse layup» (bandejas) y «Reverse finish» (finalizaciones avanzadas) eran la misma finalización.", prereqs: ["bandeja"], related: ["bandeja"] }),
        C({
            id: "mano-finalizacion", name: "Elección de mano al finalizar", en: "Inside / outside hand finish", aliases: ["inside hand finish", "outside hand finish", "mano interior", "mano exterior"], area: "finalizaciones", sub: "cambios-mano", also: [["finalizaciones", "lecturas"]], level: "Intermedio", skills: ["tecnica", "decision"],
            legacy: [],
            variants: [
                { id: "interior", name: "Con la mano interior", legacy: "fund_inside_hand_finish", note: "Mano más cercana al centro de la cancha." },
                { id: "exterior", name: "Con la mano exterior", legacy: "fund_outside_hand_finish", note: "Mano más lejana al defensor." }
            ],
            merge: "Las dos fichas respondían a la misma pregunta (con qué mano terminar según el defensor). Ahora es una lectura con dos opciones.",
            prereqs: ["bandeja"], related: ["bandeja", "reverse"]
        }),
        C({ id: "pro-hop", name: "Pro hop", en: "Pro hop", aliases: ["salto a dos pies"], area: "finalizaciones", sub: "contacto", level: "Intermedio", skills: ["tecnica", "contacto", "coordinacion"], legacy: ["fund_pro_hop_finish"], prereqs: ["bandeja", "jump-stop"], related: ["power-layup", "eurostep"] }),
        C({ id: "eurostep", name: "Eurostep", en: "Euro step", aliases: ["euro step", "paso europeo"], area: "finalizaciones", sub: "cerca-aro", level: "Avanzado", skills: ["tecnica", "coordinacion", "decision"], legacy: ["fund_eurostep"], prereqs: ["bandeja"], related: ["pro-hop"] }),
        C({ id: "high-glass", name: "Finalización alta al tablero", en: "High glass finish", aliases: ["high glass"], area: "finalizaciones", sub: "sobre-defensores", level: "Intermedio", skills: ["tecnica"], legacy: ["fund_high_glass_finish"], prereqs: ["bandeja"], related: ["floater"] }),
        C({
            id: "floater", name: "Floater", en: "Floater", aliases: ["tear drop", "bombita", "tiro flotado"], area: "finalizaciones", sub: "sobre-defensores", also: [["lanzamiento", "en-movimiento"]], level: "Intermedio", skills: ["tecnica", "decision"],
            legacy: ["fund_floater", "fund_floater_finish", "fund_tear_drop"],
            variants: [{ id: "runner", name: "Runner", legacy: "fund_runner", note: "Se lanza en plena carrera, sin frenar, normalmente desde más lejos." }],
            merge: "«Floater» (tiro), «Floater finish» (finalizaciones) y «Tear drop» eran el mismo lanzamiento. El runner se parece pero se ejecuta sin frenar: queda como variante, no como sinónimo.",
            prereqs: ["bandeja"], related: ["high-glass", "pull-up"]
        }),
        C({
            id: "up-under", name: "Up and under", en: "Up and under", aliases: ["finta y paso por debajo"], area: "poste", sub: "movimientos", also: [["finalizaciones", "sobre-defensores"], ["juego-pies", "fintas"]], level: "Intermedio", skills: ["tecnica", "decision"],
            legacy: ["fund_up_under", "fund_up_under_post"],
            variants: [{ id: "step-through", name: "Step through en el perímetro o en penetración", legacy: "fund_step_through", note: "La misma finta y paso cruzado lejos del poste." }],
            merge: "Estaba en «Finalizaciones sobre defensores» y en «Posteo básico». Es el mismo movimiento; el step through es su versión lejos del poste.",
            prereqs: ["shot-fake", "pivote-frontal"], related: ["shot-fake", "drop-step"]
        }),

        // ---------------------------------------------------------- Juego de pies
        C({ id: "jump-stop", name: "Parada en un tiempo", en: "Jump stop", aliases: ["jump stop", "parada a dos pies"], area: "juego-pies", sub: "paradas", also: [["juego-pies", "equilibrio"]], level: "Inicial", skills: ["coordinacion", "tecnica"], legacy: ["fund_jump_stop"], prereqs: [], related: ["stride-stop", "pivote-frontal"] }),
        C({ id: "stride-stop", name: "Parada en dos tiempos", en: "Stride stop", aliases: ["stride stop", "1-2", "parada en dos apoyos"], area: "juego-pies", sub: "paradas", level: "Inicial", skills: ["coordinacion", "tecnica"], legacy: ["fund_stride_stop"], prereqs: [], related: ["jump-stop", "bandeja"] }),
        C({ id: "pivote-frontal", name: "Pivote frontal", en: "Front pivot", aliases: [], area: "juego-pies", sub: "pivotes", level: "Inicial", skills: ["coordinacion", "tecnica"], legacy: ["fund_pivote_frontal"], prereqs: ["jump-stop"], related: ["pivote-reverso"] }),
        C({ id: "pivote-reverso", name: "Pivote reverso", en: "Reverse pivot", aliases: ["pivote de espaldas"], area: "juego-pies", sub: "pivotes", level: "Inicial", skills: ["coordinacion", "tecnica"], legacy: ["fund_pivote_reverso"], prereqs: ["jump-stop"], related: ["pivote-frontal", "spin"] }),
        C({ id: "salida-abierta", name: "Salida abierta", en: "Open step / direct drive", aliases: [], area: "juego-pies", sub: "arranques", level: "Inicial", skills: ["tecnica", "coordinacion"], legacy: ["fund_salida_abierta"], prereqs: ["triple-amenaza"], related: ["salida-cruzada", "salida-directa"] }),
        C({ id: "salida-cruzada", name: "Salida cruzada", en: "Crossover step", aliases: ["cross over step"], area: "juego-pies", sub: "arranques", level: "Inicial", skills: ["tecnica", "coordinacion"], legacy: ["fund_salida_cruzada"], prereqs: ["triple-amenaza"], related: ["salida-abierta"] }),
        C({ id: "salida-directa", name: "Salida directa", en: "Direct drive", aliases: [], area: "juego-pies", sub: "arranques", level: "Inicial", skills: ["tecnica"], legacy: ["fund_salida_directa"], prereqs: ["triple-amenaza"], related: ["salida-abierta"], pending: "En parte de la bibliografía en español «salida directa» se usa como sinónimo de «salida abierta». Se mantienen separadas hasta validar la diferencia con una fuente." }),
        C({ id: "jab-step", name: "Paso de amenaza", en: "Jab step", aliases: ["jab step", "finta de salida"], area: "juego-pies", sub: "fintas", level: "Inicial", skills: ["tecnica", "decision"], legacy: ["fund_jab_step"], prereqs: ["triple-amenaza"], related: ["shot-fake"] }),
        C({
            id: "shot-fake", name: "Finta de tiro", en: "Shot fake / pump fake", aliases: ["shot fake", "pump fake", "amague de tiro"], area: "juego-pies", sub: "fintas", also: [["finalizaciones", "sobre-defensores"]], level: "Inicial", skills: ["tecnica", "decision"],
            legacy: ["fund_shot_fake"],
            variants: [{ id: "cerca-aro", name: "Cerca del aro para finalizar", legacy: "fund_pump_fake_finish", note: "La misma finta para sacar del suelo al defensor antes de terminar." }],
            prereqs: ["triple-amenaza"], related: ["up-under", "jab-step", "closeout"]
        }),
        C({ id: "triple-amenaza", name: "Triple amenaza", en: "Triple threat", aliases: ["triple threat", "triple threat moves"], area: "juego-pies", sub: "aplicacion", also: [["juego-pies", "equilibrio"]], level: "Inicial", skills: ["tecnica", "decision"], legacy: ["fund_triple_threat"], prereqs: ["jump-stop"], related: ["jab-step", "shot-fake", "catch-shoot"] }),

        // ---------------------------------------------------------- Juego en el poste
        C({ id: "sellar", name: "Sellar al defensor", en: "Seal", aliases: ["sellado", "seal"], area: "poste", sub: "sellado", also: [["poste", "posicionamiento"]], level: "Intermedio", skills: ["contacto", "sin-balon"], legacy: ["fund_sellar_defensor"], prereqs: [], related: ["recepcion-poste"] }),
        C({ id: "recepcion-poste", name: "Recepción en el poste", en: "Post catch", aliases: [], area: "poste", sub: "recepcion", level: "Intermedio", skills: ["tecnica", "contacto"], legacy: ["fund_recepcion_poste"], prereqs: ["sellar", "jump-stop"], related: ["drop-step"] }),
        C({ id: "drop-step", name: "Drop step", en: "Drop step", aliases: ["paso de caída"], area: "poste", sub: "movimientos", level: "Intermedio", skills: ["tecnica", "contacto"], legacy: ["fund_drop_step"], prereqs: ["recepcion-poste", "pivote-reverso"], related: ["hook-shot", "up-under"] }),
        C({ id: "hook-shot", name: "Gancho", en: "Hook shot", aliases: ["hook", "gancho"], area: "poste", sub: "finalizaciones", level: "Intermedio", skills: ["tecnica"], legacy: ["fund_hook_shot"], prereqs: ["recepcion-poste"], related: ["drop-step"] }),
        C({ id: "spin-poste", name: "Giro en el poste", en: "Post spin move", aliases: ["spin en el poste"], area: "poste", sub: "movimientos", level: "Avanzado", skills: ["tecnica", "contacto"], legacy: ["fund_spin_move_post"], merge: "Comparte nombre con el reverso con dribbling, pero se ejecuta de espaldas al aro y con otra lectura del defensor: ficha propia, relacionada.", prereqs: ["drop-step", "pivote-reverso"], related: ["spin", "drop-step"] }),
        C({ id: "dream-shake", name: "Dream shake", en: "Dream shake", aliases: [], area: "poste", sub: "movimientos", level: "Avanzado", skills: ["tecnica", "creatividad"], legacy: ["fund_dream_shake"], prereqs: ["drop-step", "up-under"], related: [] }),

        // ---------------------------------------------------------- Defensa individual
        C({ id: "posicion-defensiva", name: "Posición defensiva", en: "Defensive stance", aliases: ["stance"], area: "defensa", sub: "posicion", level: "Inicial", skills: ["tecnica", "coordinacion"], legacy: ["fund_stance"], prereqs: [], related: ["desplazamiento", "closeout"] }),
        C({ id: "desplazamiento", name: "Desplazamiento defensivo", en: "Defensive slide", aliases: ["slide defensivo", "deslizamiento"], area: "defensa", sub: "desplazamientos", level: "Inicial", skills: ["tecnica", "coordinacion"], legacy: ["fund_slide_defensivo"], prereqs: ["posicion-defensiva"], related: ["contencion", "closeout"] }),
        C({
            id: "contencion", name: "Contención del dribbling", en: "On-ball containment", aliases: ["contener drible", "cortar penetración", "defensa al balón"], area: "defensa", sub: "al-balon", level: "Inicial", skills: ["tecnica", "decision"],
            legacy: ["fund_contener_drible"],
            variants: [{ id: "cortar", name: "Cortar la línea de penetración", legacy: "fund_cortar_penetracion", note: "Ganar la posición en la línea entre el atacante y el aro cuando ya arrancó." }],
            merge: "«Contener drible» y «Cortar penetración» describen el mismo objetivo en dos momentos del mismo duelo.",
            prereqs: ["posicion-defensiva", "desplazamiento"], related: ["closeout", "ayuda"]
        }),
        C({ id: "negacion", name: "Negación del pase", en: "Deny", aliases: ["deny", "negar"], area: "defensa", sub: "sin-balon", level: "Intermedio", skills: ["tecnica", "sin-balon"], legacy: ["fund_deny"], prereqs: ["posicion-defensiva"], related: ["ayuda"] }),
        C({ id: "ayuda", name: "Defensa de ayuda", en: "Help defense", aliases: ["help defense", "ayuda"], area: "defensa", sub: "ayudas", also: [["defensa", "lecturas"]], level: "Intermedio", skills: ["decision", "sin-balon"], legacy: ["fund_help_defense"], prereqs: ["posicion-defensiva"], related: ["closeout", "negacion"] }),
        C({
            id: "closeout", name: "Closeout", en: "Close-out", aliases: ["cierre", "ajustarse al tirador", "salida al tirador", "close out"], area: "defensa", sub: "closeouts", also: [["defensa", "recuperaciones"], ["defensa", "lecturas"]], level: "Inicial", skills: ["tecnica", "decision", "coordinacion"],
            legacy: ["fund_closeout"],
            variants: [
                { id: "largo", name: "Closeout largo (contra un tirador)", note: "Llegar más cerca y con las manos altas para disputar el tiro." },
                { id: "corto", name: "Closeout corto (contra un penetrador)", note: "Frenar antes, a unos 2–3 metros, para no ser superado." }
            ],
            prereqs: ["posicion-defensiva", "desplazamiento", "ayuda"], related: ["contencion", "ayuda", "catch-shoot", "kick-out"],
            article: "fund-closeout"
        }),

        // ---------------------------------------------------------- Rebote
        C({ id: "box-out", name: "Bloqueo de rebote", en: "Box out", aliases: ["box out", "cerrar el rebote"], area: "rebote", sub: "bloqueo", also: [["rebote", "posicionamiento"]], level: "Inicial", skills: ["contacto", "tecnica"], legacy: ["fund_box_out"], prereqs: ["posicion-defensiva", "pivote-reverso"], related: ["captura"] }),
        C({ id: "captura", name: "Captura del rebote", en: "Securing the rebound", aliases: ["captura"], area: "rebote", sub: "captura", also: [["rebote", "continuidad"]], level: "Inicial", skills: ["tecnica", "contacto"], legacy: ["fund_captura"], prereqs: ["box-out"], related: ["pase-adelantado"] }),
        C({ id: "tip", name: "Palmeo", en: "Tip-in", aliases: ["tip", "tip in"], area: "rebote", sub: "ofensivo", level: "Intermedio", skills: ["tecnica", "coordinacion"], legacy: ["fund_tip"], prereqs: [], related: ["segundo-salto"] }),
        C({ id: "segundo-salto", name: "Segundo salto", en: "Second jump", aliases: [], area: "rebote", sub: "ofensivo", level: "Intermedio", skills: ["coordinacion"], legacy: ["fund_segundo_salto"], prereqs: [], related: ["tip"] })
    ];

    // ------------------------------------------------------------------
    // Bibliografía compartida por las fichas (consultada el 28/11/2026)
    // ------------------------------------------------------------------
    var SOURCES = {
        "cm-es": {
            title: "WABC · Manual para entrenadores (Coaches Manual, versión en español)",
            publisher: "FIBA · World Association of Basketball Coaches (WABC)",
            url: "https://assets.fiba.basketball/image/upload/documents-corporate-wabc-coaches-manual-esp.pdf",
            locator: "3.2 Glosario de términos, págs. 18–19",
            used: "«Desplazamiento defensivo» (pág. 18): el pie que da el paso va primero en la dirección del movimiento. «Dirigir al botador» (pág. 19): posición de frente, una mano baja para frenar el cambio de mano y otra alta para frenar el pase. «Ajustarse al atacante» y «Ajustarse al tirador» (pág. 19): llegar corriendo a un brazo de distancia y terminar con pasos cortos; ajuste largo o corto según el jugador.",
            accessed: "28/11/2026"
        },
        "cm-en": {
            title: "WABC Coaches Manual (English), Glossary of terms",
            publisher: "FIBA · World Association of Basketball Coaches (WABC)",
            url: "https://assets.fiba.basketball/image/upload/documents-corporate-wabc-coaches-manual-eng.pdf",
            locator: "3.2 Glossary, pág. 19 («Close-out», «Channelling the Dribbler») y pág. 20 («Cross Over Step»)",
            used: "Close-out: llegar a un brazo del atacante cuando recibe, terminar con pasos cortos y rápidos y las dos manos arriba; «largo» contra un tirador y «corto» (a 2–3 m) contra un penetrador. Channelling the Dribbler: la mano más cercana al botador va baja para frenar el crossover.",
            accessed: "28/11/2026"
        },
        "mini-es": {
            title: "WABC · Manual para entrenadores – Mini básquetbol (versión en español)",
            publisher: "FIBA · World Association of Basketball Coaches (WABC)",
            url: "https://assets.fiba.basketball/image/upload/documents-corporate-wabc-coaching-manual-mini-basketball-esp.pdf",
            locator: "2 Enseñanza centrada en el juego (2.1–2.3, págs. 6–9) y 4.1 Botar (pág. 17)",
            used: "La enseñanza centrada solo en la técnica aislada es repetitiva y se desconecta del juego; incluir un defensor desde temprano da mejores resultados. El enfoque centrado en el juego parte del juego, agrega habilidades al ritmo de los jugadores y usa preguntas. En 4.1, actividades de bote con consignas del entrenador: cambiar de velocidad, de dirección y de mano.",
            accessed: "28/11/2026"
        },
        cdp: {
            title: "WABC Coaching Development Project · Video Series",
            publisher: "FIBA · WABC (página oficial)",
            url: "https://about.fiba.basketball/en/wabc-coaching-development-project",
            locator: "Serie «Preparing Today's Players for the Future Game» (2025), nueve videos",
            used: "Lista oficial de los capítulos de la serie y sus videos publicados en el canal de FIBA en YouTube.",
            accessed: "28/11/2026"
        }
    };

    /** Fuentes que buscamos y no pudimos consultar completas: no se citan. */
    var UNAVAILABLE = {
        "wabc-online": { title: "WABC Coaches Manual Level 1 (versión web, wabc.fiba.com)", url: "https://wabc.fiba.com/manual/level-1/", reason: "El sitio no respondió a la consulta automática el 28/11/2026. No se usó." },
        "l1-es": { title: "WABC Level 1 Coaches Course Manual (español, PDF)", url: "https://assets.fiba.basketball/image/upload/documents-corporate-wabc-coaching-level-manuals-level-1-esp.pdf", reason: "El PDF no se pudo abrir el 28/11/2026. No se usó." },
        "cm-glosario-resto": { title: "WABC Coaches Manual · resto del glosario (págs. 21 en adelante)", url: "https://assets.fiba.basketball/image/upload/documents-corporate-wabc-coaches-manual-esp.pdf", reason: "Solo pudimos leer el glosario hasta la pág. 21. Las entradas posteriores (por ejemplo bandeja, triple amenaza o tiro tras recepción, si existen) no se consultaron." },
        "mini-tirar": { title: "WABC Mini básquetbol · 4.2 Tirar y 4.3 Botar y tirar (págs. 21–24)", url: "https://assets.fiba.basketball/image/upload/documents-corporate-wabc-coaching-manual-mini-basketball-esp.pdf", reason: "No pudimos leer esas páginas completas. No se usaron." },
        "reglas-25": { title: "FIBA Official Basketball Rules 2024 · Art. 25 Avance ilegal (pasos)", url: "https://assets.fiba.basketball/image/upload/documents-corporate-fiba-official-rules-2024-v10.pdf", reason: "Solo obtuvimos un resumen automático del artículo, no el texto. Por eso no resumimos la regla de pasos: consultala en el reglamento." }
    };

    function source(key, id, extra) {
        var base = SOURCES[key];
        if (!base) throw new Error("Fuente desconocida " + key);
        var o = { id: id };
        Object.keys(base).forEach(function (k) { o[k] = base[k]; });
        Object.keys(extra || {}).forEach(function (k) { o[k] = extra[k]; });
        return o;
    }
    function unavailable(keys) {
        return keys.map(function (k) { return UNAVAILABLE[k]; });
    }

    // ------------------------------------------------------------------
    // Índices
    // ------------------------------------------------------------------
    var byId = {};
    var areaById = {};
    var legacyIndex = {}; // fund_x -> { concept, variant }
    AREAS.forEach(function (a) { areaById[a.id] = a; });
    CONCEPTS.forEach(function (c) {
        c.aliases = c.aliases || [];
        c.also = c.also || [];
        c.variants = c.variants || [];
        c.prereqs = c.prereqs || [];
        c.related = c.related || [];
        c.legacy = c.legacy || [];
        byId[c.id] = c;
        c.legacy.forEach(function (l) { legacyIndex[l] = { concept: c.id, variant: null }; });
        c.variants.forEach(function (v) { if (v.legacy) legacyIndex[v.legacy] = { concept: c.id, variant: v.id }; });
    });

    function getConcept(id) { return byId[id] || null; }
    function getArea(id) { return areaById[id] || null; }
    function subName(areaId, subId) {
        var a = areaById[areaId];
        if (!a) return "";
        var s = a.subs.filter(function (x) { return x[0] === subId; })[0];
        return s ? s[1] : "";
    }

    /** Todos los ids de contenido antiguo que muestran algo de este concepto. */
    function legacyIdsOf(c) {
        return c.legacy.concat(c.variants.map(function (v) { return v.legacy; }).filter(Boolean));
    }

    /**
     * Resuelve cualquier id de sección de Fundamentos (nuevo o antiguo).
     * -> { type: "home" } | { type: "area", area, sub? } | { type: "concept", concept, variant? } | null
     */
    var CONCEPT_PREFIX = "fundamento_";
    var AREA_PREFIX = "fund_area_";
    function resolve(sectionId) {
        var s = String(sectionId || "");
        if (s === "fundamentos") return { type: "home" };
        if (s.indexOf(CONCEPT_PREFIX) === 0) {
            var rest = s.slice(CONCEPT_PREFIX.length).split("__");
            return byId[rest[0]] ? { type: "concept", concept: rest[0], variant: rest[1] || null } : null;
        }
        if (s.indexOf(AREA_PREFIX) === 0) {
            var parts = s.slice(AREA_PREFIX.length).split("__");
            return areaById[parts[0]] ? { type: "area", area: parts[0], sub: parts[1] || null } : null;
        }
        if (legacyIndex[s]) return { type: "concept", concept: legacyIndex[s].concept, variant: legacyIndex[s].variant, legacy: s };
        for (var i = 0; i < AREAS.length; i++) if (AREAS[i].legacy === s) return { type: "area", area: AREAS[i].id, sub: null, legacy: s };
        if (LEGACY_GROUPS[s]) return { type: "area", area: LEGACY_GROUPS[s], sub: null, legacy: s };
        return null;
    }

    function conceptSection(id, variant) { return CONCEPT_PREFIX + id + (variant ? "__" + variant : ""); }
    function areaSection(id, sub) { return AREA_PREFIX + id + (sub ? "__" + sub : ""); }

    /** Conceptos de un área: los propios y los relacionados (aparecen sin duplicarse). */
    function conceptsInArea(areaId) {
        return CONCEPTS.filter(function (c) {
            return c.area === areaId || c.also.some(function (x) { return x[0] === areaId; });
        });
    }

    /** Subáreas en las que aparece el concepto dentro de un área. */
    function subsOf(c, areaId) {
        var out = [];
        if (c.area === areaId) out.push(c.sub);
        c.also.forEach(function (x) { if (x[0] === areaId && out.indexOf(x[1]) < 0) out.push(x[1]); });
        return out;
    }

    function areaCounts(areaId, extra) {
        var list = conceptsInArea(areaId);
        var own = list.filter(function (c) { return c.area === areaId; }).length;
        var complete = list.filter(function (c) { return !!c.article; }).length;
        var videos = extra && extra.hasVideo ? list.filter(function (c) { return extra.hasVideo(c); }).length : 0;
        return { total: list.length, own: own, related: list.length - own, complete: complete, videos: videos };
    }

    // ------------------------------------------------------------------
    // Búsqueda y filtros
    // ------------------------------------------------------------------
    function norm(s) {
        return String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    }

    function haystack(c) {
        var a = areaById[c.area];
        return [
            c.name, c.en, c.aliases.join(" "),
            c.variants.map(function (v) { return v.name; }).join(" "),
            a ? a.name + " " + a.sport : "",
            subName(c.area, c.sub),
            c.also.map(function (x) { var aa = areaById[x[0]]; return (aa ? aa.name : "") + " " + subName(x[0], x[1]); }).join(" ")
        ].join(" ");
    }

    /** Puntaje simple: nombre exacto > empieza con > alias > texto. 0 = no coincide. */
    function score(c, q) {
        var nq = norm(q);
        if (!nq) return 1;
        var words = nq.split(" ");
        var hay = norm(haystack(c));
        if (!words.every(function (w) { return hay.indexOf(w) >= 0; })) return 0;
        var name = norm(c.name);
        var en = norm(c.en);
        var aliases = c.aliases.map(norm);
        if (name === nq || en === nq || aliases.indexOf(nq) >= 0) return 100;
        if (name.indexOf(nq) === 0 || en.indexOf(nq) === 0) return 80;
        if (aliases.some(function (x) { return x.indexOf(nq) >= 0; })) return 60;
        if (c.variants.some(function (v) { return norm(v.name).indexOf(nq) >= 0; })) return 50;
        return 20;
    }

    /*
     * filters = { q, area, skill, level, video, exercises, favorites, complete }
     * ctx = { hasVideo(c), hasExercises(c), isFavorite(c) }
     */
    function search(filters, ctx) {
        filters = filters || {};
        ctx = ctx || {};
        var out = [];
        CONCEPTS.forEach(function (c) {
            if (filters.area && c.area !== filters.area && !c.also.some(function (x) { return x[0] === filters.area; })) return;
            if (filters.skill && c.skills.indexOf(filters.skill) < 0) return;
            if (filters.level && c.level !== filters.level) return;
            if (filters.complete && !c.article) return;
            if (filters.video && !(ctx.hasVideo && ctx.hasVideo(c))) return;
            if (filters.exercises && !(ctx.hasExercises && ctx.hasExercises(c))) return;
            if (filters.favorites && !(ctx.isFavorite && ctx.isFavorite(c))) return;
            var s = score(c, filters.q);
            if (!s) return;
            out.push({ concept: c, score: s + (c.article ? 5 : 0) });
        });
        out.sort(function (a, b) { return b.score - a.score || a.concept.name.localeCompare(b.concept.name, "es"); });
        return out.map(function (x) { return x.concept; });
    }

    /** Validación del modelo (pruebas). */
    function validate(legacyContent) {
        var errors = [];
        var seen = {};
        CONCEPTS.forEach(function (c) {
            if (seen[c.id]) errors.push("Concepto duplicado: " + c.id);
            seen[c.id] = true;
            if (!areaById[c.area]) errors.push(c.id + ": área inexistente " + c.area);
            else if (!subName(c.area, c.sub)) errors.push(c.id + ": subárea inexistente " + c.sub);
            c.also.forEach(function (x) { if (!subName(x[0], x[1])) errors.push(c.id + ": relación a subárea inexistente " + x.join("/")); });
            if (LEVELS.indexOf(c.level) < 0) errors.push(c.id + ": nivel inválido");
            c.skills.forEach(function (s) { if (!SKILLS[s]) errors.push(c.id + ": habilidad inválida " + s); });
            c.prereqs.concat(c.related).forEach(function (r) { if (!byId[r]) errors.push(c.id + ": relación a concepto inexistente " + r); });
            if (c.prereqs.indexOf(c.id) >= 0) errors.push(c.id + ": es prerrequisito de sí mismo");
        });
        var claimed = {};
        CONCEPTS.forEach(function (c) {
            legacyIdsOf(c).forEach(function (l) {
                if (claimed[l]) errors.push("El id antiguo " + l + " está en dos conceptos: " + claimed[l] + " y " + c.id);
                claimed[l] = c.id;
                if (legacyContent && !legacyContent[l]) errors.push(c.id + ": id antiguo sin contenido " + l);
            });
        });
        if (legacyContent) {
            Object.keys(legacyContent).forEach(function (k) {
                if (!claimed[k]) errors.push("Contenido antiguo sin concepto: " + k);
            });
        }
        return errors;
    }

    return {
        LEVELS: LEVELS,
        SKILLS: SKILLS,
        AREAS: AREAS,
        CONCEPTS: CONCEPTS,
        LEGACY_GROUPS: LEGACY_GROUPS,
        SOURCES: SOURCES,
        UNAVAILABLE: UNAVAILABLE,
        source: source,
        unavailable: unavailable,
        getConcept: getConcept,
        getArea: getArea,
        subName: subName,
        legacyIdsOf: legacyIdsOf,
        resolve: resolve,
        conceptSection: conceptSection,
        areaSection: areaSection,
        conceptsInArea: conceptsInArea,
        subsOf: subsOf,
        areaCounts: areaCounts,
        search: search,
        score: score,
        norm: norm,
        validate: validate
    };
});
