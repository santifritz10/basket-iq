/*
 * Basket Lab · Fundamentos — ilustraciones originales (SVG)
 *
 * window.BasketFundFigures.render(id) -> string SVG.
 * Dibujos propios de Basket Lab, sin imágenes de terceros. Son esquemas: muestran
 * recorridos, distancias y secuencias, no pretenden representar la biomecánica exacta.
 */
(function (root, factory) {
    var api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.BasketFundFigures = api;
})(typeof window !== "undefined" ? window : null, function () {
    "use strict";

    var OR = "#ff9800";
    var OR2 = "#ffb74d";
    var LINE = "rgba(232,238,251,.55)";
    var SOFT = "rgba(232,238,251,.18)";
    var DEF = "#f87171";
    var ATT = "#60a5fa";

    function svg(vb, body, label) {
        return '<svg class="bf-svg" viewBox="' + vb + '" role="img" aria-label="' + label + '" xmlns="http://www.w3.org/2000/svg">' +
            "<title>" + label + "</title>" + body + "</svg>";
    }
    function ball(x, y, r) {
        r = r || 5;
        return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + OR + '"/><path d="M' + (x - r) + " " + y + "h" + 2 * r + "M" + x + " " + (y - r) + "v" + 2 * r + '" stroke="#3b1d06" stroke-width="1"/>';
    }
    function att(x, y, t) {
        return '<circle cx="' + x + '" cy="' + y + '" r="8" fill="' + ATT + '"/>' + (t ? '<text x="' + x + '" y="' + (y + 3.5) + '" text-anchor="middle" font-size="9" font-weight="700" fill="#0b1220" font-family="sans-serif">' + t + "</text>" : "");
    }
    function def(x, y) {
        return '<circle cx="' + x + '" cy="' + y + '" r="8" fill="none" stroke="' + DEF + '" stroke-width="2.5"/><path d="M' + (x - 3.5) + " " + (y - 3.5) + "l7 7M" + (x + 3.5) + " " + (y - 3.5) + 'l-7 7" stroke="' + DEF + '" stroke-width="2"/>';
    }
    function hoop(x, y) {
        return '<path d="M' + (x - 14) + " " + (y - 9) + "h28" + '" stroke="' + LINE + '" stroke-width="3"/><circle cx="' + x + '" cy="' + y + '" r="6" fill="none" stroke="' + OR + '" stroke-width="2.5"/>';
    }
    function label(x, y, t, anchor, color) {
        return '<text x="' + x + '" y="' + y + '" text-anchor="' + (anchor || "middle") + '" font-size="9" fill="' + (color || "rgba(232,238,251,.85)") + '" font-family="Segoe UI, system-ui, sans-serif">' + t + "</text>";
    }
    var ARROW = '<defs><marker id="bfA" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="' + OR + '"/></marker>' +
        '<marker id="bfD" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="' + DEF + '"/></marker></defs>';
    function court() {
        return '<rect x="1" y="1" width="158" height="98" rx="10" fill="rgba(255,152,0,.05)" stroke="' + SOFT + '"/>';
    }
    function foot(x, y, rot, txt, fill) {
        return '<g transform="translate(' + x + " " + y + ") rotate(" + (rot || 0) + ')"><ellipse cx="0" cy="0" rx="5" ry="9" fill="' + (fill || "rgba(255,152,0,.25)") + '" stroke="' + OR + '" stroke-width="1.3"/>' +
            (txt ? '<text x="0" y="3" text-anchor="middle" font-size="8" font-weight="700" fill="#fff" font-family="sans-serif" transform="rotate(' + -(rot || 0) + ')">' + txt + "</text>" : "") + "</g>";
    }

    var FIG = {
        // ---------------------------------------------------------- Áreas (portada)
        "area-dominio": function () {
            return svg("0 0 160 100", ARROW + court() +
                '<path d="M20 78 L52 40 L84 70 L116 32" fill="none" stroke="' + OR + '" stroke-width="2.5" stroke-dasharray="2 4" marker-end="url(#bfA)"/>' +
                '<path d="M60 22l6 10h-12z M92 86l6 -10h-12z" fill="' + OR2 + '" opacity=".7"/>' +
                ball(52, 40) + ball(84, 70) + att(20, 78) + def(126, 24), "Dominio del balón: cambios de dirección entre conos");
        },
        "area-pase": function () {
            return svg("0 0 160 100", ARROW + court() +
                '<path d="M30 70 L128 70" stroke="' + OR + '" stroke-width="2.5" stroke-dasharray="6 4" marker-end="url(#bfA)"/>' +
                '<path d="M30 70 L80 92 L128 30" fill="none" stroke="' + OR2 + '" stroke-width="2" stroke-dasharray="6 4" marker-end="url(#bfA)"/>' +
                def(80, 58) + att(22, 70, "1") + att(136, 70, "2") + att(136, 24, "3") + ball(32, 62, 4), "Pase y recepción: línea de pase directa y pase picado");
        },
        "area-lanzamiento": function () {
            return svg("0 0 160 100", ARROW + court() + hoop(128, 28) +
                '<path d="M36 74 Q80 -6 124 26" fill="none" stroke="' + OR + '" stroke-width="2.5" stroke-dasharray="3 4" marker-end="url(#bfA)"/>' +
                att(30, 80) + ball(40, 66, 4) + label(16, 96, "recepción y tiro", "start"), "Lanzamiento: trayectoria del tiro al aro");
        },
        "area-finalizaciones": function () {
            return svg("0 0 160 100", ARROW + court() + hoop(130, 24) +
                '<path d="M20 86 C60 84 96 70 120 36" fill="none" stroke="' + OR + '" stroke-width="2.5" marker-end="url(#bfA)"/>' +
                foot(96, 64, 40, "1") + foot(110, 50, 30, "2") + def(140, 54) + att(20, 86), "Finalizaciones: llegada al aro en dos apoyos");
        },
        "area-pies": function () {
            return svg("0 0 160 100", ARROW + court() +
                foot(64, 54, -10, "", "rgba(255,152,0,.55)") + foot(96, 54, 10) +
                '<path d="M96 30 A26 26 0 1 1 72 82" fill="none" stroke="' + OR + '" stroke-width="2" stroke-dasharray="4 4" marker-end="url(#bfA)"/>' +
                label(64, 80, "pie de pivote") , "Juego de pies: pivote sobre un pie");
        },
        "area-poste": function () {
            return svg("0 0 160 100", ARROW + court() + hoop(80, 14) +
                '<path d="M52 6 V70 H108 V6" fill="rgba(255,152,0,.08)" stroke="' + LINE + '"/>' +
                def(98, 46) + att(114, 52, "5") + '<path d="M120 60 Q132 70 124 80" fill="none" stroke="' + OR + '" stroke-width="2" marker-end="url(#bfA)"/>' +
                ball(30, 84) + '<path d="M36 80 L106 56" stroke="' + OR + '" stroke-width="2" stroke-dasharray="6 4" marker-end="url(#bfA)"/>', "Juego en el poste: sellado y línea de pase al poste");
        },
        "area-defensa": function () {
            return svg("0 0 160 100", ARROW + court() + hoop(80, 92) +
                att(80, 20) + ball(90, 14, 4) + def(80, 48) +
                '<path d="M66 48 H40 M94 48 H120" stroke="' + DEF + '" stroke-width="2" stroke-dasharray="4 3" marker-end="url(#bfD)"/>' +
                '<path d="M80 30 V82" stroke="' + SOFT + '" stroke-dasharray="2 3"/>' + label(118, 70, "línea balón-aro"), "Defensa individual: entre el atacante y el aro");
        },
        "area-rebote": function () {
            return svg("0 0 160 100", ARROW + court() + hoop(80, 16) +
                '<path d="M86 18 Q110 0 118 40" fill="none" stroke="' + OR + '" stroke-width="2.2" stroke-dasharray="3 4" marker-end="url(#bfA)"/>' +
                ball(118, 46, 4) + def(96, 60) + att(102, 76) + '<path d="M90 66 Q96 74 94 82" fill="none" stroke="' + DEF + '" stroke-width="2"/>', "Rebote: lectura de la trayectoria y bloqueo");
        },

        // ---------------------------------------------------------- Crossover
        "crossover-path": function () {
            return svg("0 0 320 190", ARROW +
                '<rect x="1" y="1" width="318" height="188" rx="12" fill="rgba(255,152,0,.05)" stroke="' + SOFT + '"/>' +
                def(160, 56) + label(160, 36, "defensor") +
                '<path d="M226 168 C220 140 206 118 196 104" fill="none" stroke="' + OR + '" stroke-width="2.5" stroke-dasharray="2 4"/>' +
                '<path d="M196 104 Q160 132 122 104" fill="none" stroke="' + OR + '" stroke-width="3" marker-end="url(#bfA)"/>' +
                '<path d="M122 104 C110 86 96 62 86 26" fill="none" stroke="' + OR2 + '" stroke-width="2.5" marker-end="url(#bfA)"/>' +
                ball(196, 104) + ball(160, 124, 4.5) + ball(122, 104) +
                label(312, 150, "1. llevar al defensor", "end") + label(312, 162, "hacia un lado", "end") +
                label(150, 140, "2. cambio de mano bajo,") + label(150, 152, "cerca y por delante") +
                label(8, 122, "3. primer paso", "start") + label(8, 134, "hacia el otro lado", "start") +
                label(160, 182, "Esquema orientativo visto desde arriba", "middle", "rgba(232,238,251,.5)"),
                "Crossover visto desde arriba: llevar al defensor, cambiar de mano bajo y por delante, atacar el otro lado");
        },

        // ---------------------------------------------------------- Catch and shoot
        "catch-shoot-sequence": function () {
            function step(x, n, t1, t2) {
                return '<rect x="' + x + '" y="18" width="88" height="120" rx="10" fill="rgba(255,152,0,.07)" stroke="' + SOFT + '"/>' +
                    '<circle cx="' + (x + 16) + '" cy="34" r="10" fill="' + OR + '"/><text x="' + (x + 16) + '" y="38" text-anchor="middle" font-size="11" font-weight="700" fill="#1a0f00" font-family="sans-serif">' + n + "</text>" +
                    label(x + 44, 112, t1) + label(x + 44, 124, t2);
            }
            return svg("0 0 400 160", ARROW +
                step(4, 1, "pies y manos listos", "antes del pase") +
                step(104, 2, "recibir con el", "cuerpo cuadrado") +
                step(204, 3, "un solo movimiento", "hacia arriba") +
                step(304, 4, "soltar y mantener", "el equilibrio") +
                // 1: dos manos en "objetivo"
                '<path d="M36 82 v-24 M60 82 v-24" stroke="' + LINE + '" stroke-width="3" stroke-linecap="round"/><path d="M30 58 h12 M54 58 h12" stroke="' + OR + '" stroke-width="3" stroke-linecap="round"/>' +
                foot(38, 96, -8) + foot(60, 96, 8) +
                // 2: balón llega
                ball(148, 64, 7) + '<path d="M110 50 L138 62" stroke="' + OR + '" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#bfA)"/>' + foot(136, 96, -8) + foot(160, 96, 8) +
                // 3: flecha vertical
                '<path d="M248 98 V54" stroke="' + OR + '" stroke-width="3" marker-end="url(#bfA)"/>' + ball(248, 100, 6) +
                // 4: arco
                '<path d="M324 92 Q350 30 380 54" fill="none" stroke="' + OR + '" stroke-width="2.2" stroke-dasharray="3 4" marker-end="url(#bfA)"/>' + foot(336, 100, -8) + foot(358, 100, 8) +
                label(200, 154, "Secuencia orientativa: muestra el orden de las acciones, no la postura exacta", "middle", "rgba(232,238,251,.5)"),
                "Catch and shoot en cuatro pasos: preparar, recibir, subir y soltar");
        },

        // ---------------------------------------------------------- Bandeja
        "bandeja-steps": function () {
            return svg("0 0 320 200", ARROW +
                '<rect x="1" y="1" width="318" height="198" rx="12" fill="rgba(255,152,0,.05)" stroke="' + SOFT + '"/>' +
                '<path d="M190 2 V120 H300 V2" fill="rgba(255,152,0,.06)" stroke="' + LINE + '"/>' +
                '<path d="M226 16 h48" stroke="' + LINE + '" stroke-width="4"/><rect x="241" y="12" width="18" height="10" fill="none" stroke="' + OR + '" stroke-width="1.6"/>' +
                '<circle cx="250" cy="28" r="7" fill="none" stroke="' + OR + '" stroke-width="2.5"/>' +
                '<path d="M40 184 C90 176 150 150 196 108" fill="none" stroke="' + OR + '" stroke-width="2" stroke-dasharray="2 5"/>' +
                ball(150, 150, 5) + label(150, 170, "último bote") +
                foot(182, 124, 40, "1") + label(160, 112, "pie derecho", "end") +
                foot(206, 98, 35, "2", "rgba(255,152,0,.6)") + label(184, 84, "pie izquierdo:", "end") + label(184, 95, "despega", "end") +
                '<path d="M214 88 Q232 50 244 32" fill="none" stroke="' + OR + '" stroke-width="2.4" marker-end="url(#bfA)"/>' +
                label(268, 46, "mano derecha,", "start") + label(268, 58, "al cuadro", "start") + label(268, 70, "del tablero", "start") +
                label(160, 194, "Bandeja por la derecha, vista desde arriba. Por la izquierda es en espejo.", "middle", "rgba(232,238,251,.55)"),
                "Bandeja por la derecha: último bote, apoyo derecho, despegue con el izquierdo y tiro con la mano derecha al tablero");
        },

        // ---------------------------------------------------------- Closeout
        "closeout-phases": function () {
            return svg("0 0 360 170", ARROW +
                '<rect x="1" y="1" width="358" height="168" rx="12" fill="rgba(255,152,0,.05)" stroke="' + SOFT + '"/>' +
                def(32, 70) + label(32, 96, "ayuda") +
                '<path d="M44 70 H196" stroke="' + OR + '" stroke-width="4" marker-end="url(#bfA)"/>' + label(118, 60, "carrera mientras el balón viaja") +
                '<path d="M206 70 h10 M224 70 h10 M242 70 h10" stroke="' + OR2 + '" stroke-width="4" stroke-linecap="round"/>' + label(230, 60, "pasos cortos y rápidos") +
                att(320, 70) + ball(320, 56, 4) + label(320, 96, "receptor") +
                '<path d="M262 82 V100 M308 82 V100 M262 92 H308" stroke="' + LINE + '"/>' + label(285, 112, "a un brazo") +
                '<path d="M30 132 H340" stroke="' + SOFT + '"/>' +
                label(180, 128, "Closeout largo (tirador): llegar cerca y con las manos altas", "middle", OR2) +
                label(180, 150, "Closeout corto (penetrador): frenar antes, a unos 2–3 m, para no ser superado", "middle", "rgba(232,238,251,.85)") +
                label(180, 164, "Esquema orientativo · WABC Coaches Manual, glosario", "middle", "rgba(232,238,251,.45)"),
                "Closeout: carrera, pasos cortos, llegada a un brazo de distancia; largo contra un tirador y corto contra un penetrador");
        }
    };

    function render(id) {
        return FIG[id] ? FIG[id]() : "";
    }

    return { render: render, ids: Object.keys(FIG) };
});
