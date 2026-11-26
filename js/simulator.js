/*
 * BasketIQ · Motor de simuladores tácticos
 *
 * Reutiliza el motor de la pizarra (window.BasketBoard) para dibujar y animar.
 * Un simulador es un conjunto de "situaciones" predefinidas (por ejemplo, dónde
 * está el balón) y "variantes" (criterios defensivos). Al pasar de una situación
 * a otra se arma al vuelo un documento de dos fases (antes -> después) con las
 * rotaciones dibujadas, y se anima con sampleFrame.
 *
 * Todo funciona con lógica local: no hay llamadas a servicios externos.
 *
 * Modelo de un escenario (ver js/academy-content/zona-2-3.js):
 * {
 *   id, title, intro, view,
 *   players: { o1: { team, label }, x1: {...} },
 *   positions: [{ id, label, group }],           // situaciones elegibles
 *   tour: [positionId, ...],                       // recorrido de "Reproducir"
 *   variants: [{
 *     id, label, desc, kind, refs, inherits,       // inherits: id de otra variante
 *     states: { positionId: {
 *        title, note, ball: playerId, pos: { o1: [x, y], x1: [x, y], ... },
 *        resp: { x1: "texto", ... }, help: "texto", vulnerable: [{ x, y, w, h, label }]
 *     } }
 *   }],
 *   related: "texto para el enlace a ejercicios relacionados",
 *   ui: { variants, positions, hint, resp, help, vulnerable, options, disclaimer }   // rótulos opcionales
 *   optionalPlayers: true    // las situaciones pueden usar solo algunos de los jugadores (2c1, 3c2...)
 * }
 *
 * Campos opcionales de una situación (Etapa 5):
 *   moves: { o5: "screen_on", o1: "dribble" }   // tipo de trazo al llegar a esta situación
 *   options: [["pass", "o1", "o5"], ["shot", "o1", [1.575, 7.5]]]   // opciones que se dibujan al final
 *   optionsText: ["Pase al bloqueador que continúa", ...]
 *   resp puede omitir defensores que no participan (se valida que estén los que sí aparecen)
 */
(function (root, factory) {
    var api = factory(root);
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.BasketSim = api;
})(typeof window !== "undefined" ? window : null, function (root) {
    "use strict";

    var DEFENSE_COLOR = "#dc2626";
    var OFFENSE_COLOR = "#1d4ed8";

    function esc(str) {
        return String(str == null ? "" : str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function fmtDefault(text) {
        return esc(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    }

    // ------------------------------------------------------------------
    // Funciones puras (se prueban desde Node)
    // ------------------------------------------------------------------

    /** Estado de una situación en una variante, heredando de la variante base. */
    function resolveState(scenario, variantId, positionId) {
        var byId = {};
        scenario.variants.forEach(function (v) { byId[v.id] = v; });
        var v = byId[variantId] || scenario.variants[0];
        var guard = 0;
        while (v && guard++ < 10) {
            if (v.states && v.states[positionId]) {
                var st = v.states[positionId];
                if (st.mirrorOf) {
                    // Situación escrita como espejo de otra (mismo criterio, del otro lado).
                    var src = resolveState(scenario, variantId, st.mirrorOf);
                    if (!src) return null;
                    st = mirrorState(src.state, scenario.mirrorSwap);
                }
                return { state: st, variant: v, own: v.id === variantId };
            }
            v = v.inherits ? byId[v.inherits] : null;
        }
        return null;
    }

    /** Situación espejada respecto del eje del aro (para escribir solo un lado). */
    function mirrorState(state, swap) {
        swap = swap || {};
        function sw(id) { return swap[id] || id; }
        var pos = {};
        Object.keys(state.pos).forEach(function (id) {
            pos[sw(id)] = [state.pos[id][0], Math.round((15 - state.pos[id][1]) * 100) / 100];
        });
        var resp = {};
        Object.keys(state.resp || {}).forEach(function (id) {
            resp[sw(id)] = mirrorText(state.resp[id], swap);
        });
        return {
            title: mirrorText(state.title, swap),
            note: mirrorText(state.note, swap),
            ball: sw(state.ball),
            pos: pos,
            resp: resp,
            help: mirrorText(state.help, swap),
            moves: state.moves ? (function () { var m = {}; Object.keys(state.moves).forEach(function (id) { m[sw(id)] = state.moves[id]; }); return m; })() : undefined,
            options: state.options ? state.options.map(function (o) {
                return [o[0], typeof o[1] === "string" ? sw(o[1]) : [o[1][0], 15 - o[1][1]], typeof o[2] === "string" ? sw(o[2]) : [o[2][0], 15 - o[2][1]]];
            }) : undefined,
            optionsText: state.optionsText ? state.optionsText.map(function (t) { return mirrorText(t, swap); }) : undefined,
            vulnerable: (state.vulnerable || []).map(function (z) {
                return { x: z.x, y: Math.round((15 - z.y - z.h) * 100) / 100, w: z.w, h: z.h, label: mirrorText(z.label, swap) };
            })
        };
    }

    /** Cambia nombres en textos al espejar: X1<->X2, derecha<->izquierda, etc. */
    function mirrorText(text, swap) {
        if (text == null) return text;
        var map = {};
        Object.keys(swap || {}).forEach(function (k) {
            if (/^x\d$/.test(k)) map["X" + k.slice(1)] = "X" + swap[k].slice(1);
        });
        map.derecho = "izquierdo";
        map.izquierdo = "derecho";
        map.derecha = "izquierda";
        map.izquierda = "derecha";
        map.Derecha = "Izquierda";
        map.Izquierda = "Derecha";
        var keys = Object.keys(map).sort(function (a, b) { return b.length - a.length; });
        var re = new RegExp("\\b(" + keys.join("|") + ")\\b", "g");
        return String(text).replace(re, function (m) { return map[m]; });
    }

    function makeObjects(scenario, state, opts) {
        opts = opts || {};
        var objs = [];
        if (opts.vulnerable) {
            (state.vulnerable || []).forEach(function (z, k) {
                objs.push({ id: "v" + k, kind: "zone", x: z.x, y: z.y, w: z.w, h: z.h, color: "#dc2626" });
            });
        }
        Object.keys(scenario.players).forEach(function (id) {
            var p = scenario.players[id];
            var at = state.pos[id];
            if (!at) return;
            objs.push({
                id: id,
                kind: "player",
                team: p.team,
                label: p.label,
                name: "",
                color: p.team === "defense" ? DEFENSE_COLOR : OFFENSE_COLOR,
                x: at[0],
                y: at[1]
            });
        });
        if (state.ball && state.pos[state.ball]) {
            objs.push({ id: "ball", kind: "ball", holder: state.ball, x: state.pos[state.ball][0], y: state.pos[state.ball][1] });
        }
        if (opts.vulnerable && opts.labels) {
            (state.vulnerable || []).forEach(function (z, k) {
                if (!z.label) return;
                // La etiqueta va en el borde de la zona más cercano a la línea de fondo, para no tapar jugadores.
                objs.push({ id: "vl" + k, kind: "text", x: z.x + Math.min(0.4, z.w / 2), y: z.y + z.h / 2, text: z.label, size: "s", color: "#7f1d1d" });
            });
        }
        return objs;
    }

    /** Trazos que llevan de una situación a otra: pase o dribbling, desplazamientos y rotaciones. */
    function transitionStrokes(scenario, from, to) {
        var strokes = [];
        var k = 0;
        Object.keys(scenario.players).forEach(function (id) {
            var a = from.pos[id];
            var b = to.pos[id];
            if (!a || !b) return;
            var d = Math.hypot(b[0] - a[0], b[1] - a[1]);
            if (d < 0.35) return;
            var team = scenario.players[id].team;
            var type = (to.moves && to.moves[id]) || (team === "defense" ? "rotation" : (from.ball === id && to.ball === id ? "dribble" : "move"));
            strokes.push({ id: "t" + k++, type: type, a: { x: a[0], y: a[1] }, b: { x: b[0], y: b[1] }, c: null, from: id, to: null, color: null });
        });
        if (from.ball && to.ball && from.ball !== to.ball && from.pos[from.ball] && to.pos[to.ball]) {
            var pa = from.pos[from.ball];
            var pb = to.pos[to.ball];
            strokes.push({ id: "t" + k++, type: "pass", a: { x: pa[0], y: pa[1] }, b: { x: pb[0], y: pb[1] }, c: null, from: from.ball, to: to.ball, color: null });
        }
        return strokes;
    }

    /** Opciones de la situación (pases posibles, tiro, penetración) como trazos de la pizarra. */
    function optionStrokes(state) {
        var out = [];
        (state.options || []).forEach(function (o, k) {
            var a = typeof o[1] === "string" ? state.pos[o[1]] : o[1];
            var b = typeof o[2] === "string" ? state.pos[o[2]] : o[2];
            if (!a || !b) return;
            out.push({
                id: "op" + k, type: o[0], a: { x: a[0], y: a[1] }, b: { x: b[0], y: b[1] }, c: null,
                from: typeof o[1] === "string" ? o[1] : null, to: typeof o[2] === "string" ? o[2] : null, color: "#0d9488"
            });
        });
        return out;
    }

    /** Documento de pizarra con una secuencia de situaciones (cada fase con los trazos hacia la siguiente). */
    function sequenceDoc(scenario, variantId, positionIds, Board) {
        Board = Board || (root && root.BasketBoard);
        var states = positionIds.map(function (pid) {
            var r = resolveState(scenario, variantId, pid);
            return r ? r.state : null;
        }).filter(Boolean);
        var phases = states.map(function (st, i) {
            var next = states[i + 1];
            return {
                id: "f" + i,
                name: st.title,
                note: st.note || "",
                objects: makeObjects(scenario, st, {}),
                strokes: next ? transitionStrokes(scenario, st, next) : optionStrokes(st)
            };
        });
        var doc = { version: 2, view: scenario.view || { court: "half", rotation: 90 }, phases: phases };
        return Board ? Board.normalizeDoc(doc) : doc;
    }

    /** Revisión de coherencia para las pruebas: posiciones dentro de la cancha, sin superposiciones, textos completos. */
    function validateScenario(scenario) {
        var errors = [];
        var ids = Object.keys(scenario.players);
        var defenders = ids.filter(function (id) { return scenario.players[id].team === "defense"; });
        var posIds = scenario.positions.map(function (p) { return p.id; });
        (scenario.tour || []).forEach(function (t) { if (posIds.indexOf(t) < 0) errors.push("Recorrido con situación inexistente " + t); });
        scenario.variants.forEach(function (v) {
            if (!v.label || !v.desc) errors.push("Variante sin nombre o descripción: " + v.id);
            posIds.forEach(function (pid) {
                var r = resolveState(scenario, v.id, pid);
                if (!r) { errors.push(v.id + "/" + pid + ": sin estado"); return; }
                var st = r.state;
                var where = v.id + "/" + pid;
                if (!st.title) errors.push(where + ": sin título");
                if (!st.help) errors.push(where + ": sin explicación de ayudas");
                if (!st.pos[st.ball]) errors.push(where + ": el balón no tiene poseedor válido");
                ids.forEach(function (id) {
                    var p = st.pos[id];
                    if (!p) { if (!scenario.optionalPlayers) errors.push(where + ": falta " + id); return; }
                    if (!(p[0] >= 0 && p[0] <= 14 && p[1] >= 0 && p[1] <= 15)) errors.push(where + ": " + id + " fuera de media cancha");
                });
                for (var i = 0; i < ids.length; i++) {
                    for (var j = i + 1; j < ids.length; j++) {
                        var a = st.pos[ids[i]];
                        var b = st.pos[ids[j]];
                        if (a && b && Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.55) errors.push(where + ": " + ids[i] + " y " + ids[j] + " superpuestos");
                    }
                }
                defenders.forEach(function (id) {
                    if (!st.pos[id]) return;
                    if (!st.resp || !st.resp[id]) errors.push(where + ": falta la responsabilidad de " + id);
                });
                Object.keys(st.moves || {}).forEach(function (id) {
                    if (!st.pos[id]) errors.push(where + ": trazo para un jugador inexistente " + id);
                    if (["move", "cut", "dribble", "screen_on", "screen_off", "rotation"].indexOf(st.moves[id]) < 0) errors.push(where + ": tipo de trazo inválido " + st.moves[id]);
                });
                (st.options || []).forEach(function (o) {
                    [o[1], o[2]].forEach(function (end) {
                        if (typeof end === "string" && !st.pos[end]) errors.push(where + ": opción con jugador inexistente " + end);
                    });
                    if (o[0] === "pass" && o[1] !== st.ball) errors.push(where + ": la opción de pase no sale del poseedor");
                });
                if (st.options && (!st.optionsText || st.optionsText.length !== st.options.length)) errors.push(where + ": cada opción necesita su explicación");
                (st.vulnerable || []).forEach(function (z) {
                    if (z.x < 0 || z.y < 0 || z.x + z.w > 14.01 || z.y + z.h > 15.01) errors.push(where + ": espacio vulnerable fuera de la cancha");
                });
            });
        });
        return errors;
    }

    // ------------------------------------------------------------------
    // Interfaz
    // ------------------------------------------------------------------
    var ICON = {
        restart: "⟲",
        prev: "◀",
        play: "▶",
        pause: "❚❚",
        next: "▶|"
    };

    /*
     * host = {
     *   fmt(text) -> html (para citas [S1] enlazadas),
     *   provenanceBadge(kind, refs) -> html,
     *   onOpenInBoard(doc, meta), onSaveAsPlay(doc, meta) -> { ok, error },
     *   onShowExercises()
     * }
     */
    function mount(container, scenario, host) {
        host = host || {};
        var Board = root && root.BasketBoard;
        if (!Board) {
            container.innerHTML = '<p class="ac-muted">No se pudo cargar el motor de la pizarra.</p>';
            return null;
        }
        var fmt = host.fmt || fmtDefault;
        var badge = host.provenanceBadge || function () { return ""; };
        var tour = scenario.tour && scenario.tour.length ? scenario.tour : scenario.positions.map(function (p) { return p.id; });
        var ui = scenario.ui || {};
        var L = {
            variants: ui.variants || "Variante defensiva",
            positions: ui.positions || "Ubicación del balón",
            hint: ui.hint || "Tocá un atacante para pasarle el balón, o un defensor para ver su responsabilidad.",
            resp: ui.resp || "Responsabilidades",
            help: ui.help || "Ayudas",
            vulnerable: ui.vulnerable || "Espacios potencialmente vulnerables",
            options: ui.options || "Opciones del ataque",
            disclaimer: ui.disclaimer || "Es una respuesta posible, no la única correcta: depende del rival, del reglamento y de lo que el equipo haya entrenado.",
            noTarget: ui.noTarget || "Desde esta ubicación del {p} no hay una situación preparada. Usá los botones de ubicación del balón."
        };

        var state = {
            variant: scenario.variants[0].id,
            position: tour[0],
            tourIndex: 0,
            history: [tour[0]],
            doc: null,
            pos: 1,
            playing: false,
            touring: false,
            hold: 0,
            speed: 1,
            arrows: true,
            vulnerable: true,
            explain: true,
            highlight: null,
            fullscreen: false,
            raf: 0,
            last: 0
        };

        var groups = [];
        var byGroup = {};
        scenario.positions.forEach(function (p) {
            var g = p.group || "";
            if (!byGroup[g]) { byGroup[g] = []; groups.push(g); }
            byGroup[g].push(p);
        });

        container.innerHTML =
            '<div class="sim">' +
            '<div class="sim-head"><div><span class="ac-board-kicker">Simulador táctico</span><h3>' + esc(scenario.title) + "</h3></div></div>" +
            (scenario.intro ? '<p class="sim-intro">' + fmt(scenario.intro) + "</p>" : "") +
            '<div class="sim-variants" role="radiogroup" aria-label="' + esc(L.variants) + '">' +
            scenario.variants.map(function (v) {
                return '<button type="button" role="radio" class="sim-variant" data-variant="' + esc(v.id) + '" aria-checked="false">' + esc(v.label) + "</button>";
            }).join("") + "</div>" +
            '<div class="sim-variant-desc"></div>' +
            '<div class="sim-grid">' +
            '<div class="sim-stage-col">' +
            '<div class="sim-balls" aria-label="' + esc(L.positions) + '">' +
            groups.map(function (g) {
                return '<div class="sim-ball-group">' + (g ? '<span class="sim-ball-label">' + esc(g) + "</span>" : "") +
                    byGroup[g].map(function (p) {
                        return '<button type="button" class="sim-ball" data-position="' + esc(p.id) + '" aria-pressed="false">' + esc(p.label) + "</button>";
                    }).join("") + "</div>";
            }).join("") +
            "</div>" +
            '<div class="sim-stage"><canvas aria-label="Simulador: tocá un atacante para pasarle el balón o un defensor para ver su responsabilidad"></canvas></div>' +
            '<p class="sim-hint">' + esc(L.hint) + "</p>" +
            '<div class="ac-board-controls">' +
            '<button type="button" class="ac-pbtn" data-v="restart" aria-label="Reiniciar" title="Reiniciar">' + ICON.restart + "</button>" +
            '<button type="button" class="ac-pbtn" data-v="prev" aria-label="Paso anterior del recorrido" title="Paso anterior">' + ICON.prev + "</button>" +
            '<button type="button" class="ac-pbtn ac-pbtn--main" data-v="play" aria-label="Reproducir recorrido" title="Reproducir recorrido">' + ICON.play + "</button>" +
            '<button type="button" class="ac-pbtn" data-v="next" aria-label="Paso siguiente del recorrido" title="Paso siguiente">' + ICON.next + "</button>" +
            '<span class="sim-step" aria-live="polite"></span>' +
            '<select class="ac-speed" aria-label="Velocidad"><option value="0.5">0,5×</option><option value="1" selected>1×</option><option value="1.5">1,5×</option></select>' +
            "</div>" +
            '<div class="ac-board-actions">' +
            '<button type="button" class="tb-btn tb-btn--small" data-v="arrows" aria-pressed="true">Ocultar flechas</button>' +
            '<button type="button" class="tb-btn tb-btn--small" data-v="vulnerable" aria-pressed="true">Ocultar espacios vulnerables</button>' +
            '<button type="button" class="tb-btn tb-btn--small" data-v="explain" aria-pressed="true">Ocultar explicaciones</button>' +
            '<button type="button" class="tb-btn tb-btn--small" data-v="fullscreen">Pantalla completa</button>' +
            "</div>" +
            '<div class="ac-board-actions">' +
            (host.onOpenInBoard ? '<button type="button" class="tb-btn tb-btn--small tb-btn--accent" data-v="open">Abrir en pizarra táctica</button>' : "") +
            (host.onSaveAsPlay ? '<button type="button" class="tb-btn tb-btn--small" data-v="save">Guardar como jugada propia</button>' : "") +
            (host.onShowExercises ? '<button type="button" class="tb-btn tb-btn--small" data-v="exercises">Ejercicios relacionados</button>' : "") +
            "</div>" +
            '<p class="sim-seq ac-muted"></p>' +
            '<p class="sim-msg" role="status" hidden></p>' +
            "</div>" +
            '<aside class="sim-panel" aria-live="polite"></aside>' +
            "</div>" +
            "</div>";

        var root2 = container.querySelector(".sim");
        var canvas = container.querySelector("canvas");
        var stage = container.querySelector(".sim-stage");
        var panel = container.querySelector(".sim-panel");
        var ctx2d = canvas.getContext("2d");
        var vp = null;
        var dpr = 1;
        var cssW = 0;
        var cssH = 0;

        function current() {
            return resolveState(scenario, state.variant, state.position);
        }

        function buildDoc(fromState, toState) {
            var objsTo = makeObjects(scenario, toState, { vulnerable: state.vulnerable, labels: true });
            var phases;
            if (fromState) {
                var objsFrom = makeObjects(scenario, fromState, { vulnerable: false });
                phases = [
                    { id: "a", name: fromState.title, note: "", objects: objsFrom, strokes: transitionStrokes(scenario, fromState, toState) },
                    { id: "b", name: toState.title, note: "", objects: objsTo, strokes: optionStrokes(toState) }
                ];
            } else {
                phases = [{ id: "b", name: toState.title, note: "", objects: objsTo, strokes: optionStrokes(toState) }];
            }
            return { version: 2, view: scenario.view || { court: "half", rotation: 90 }, phases: phases };
        }

        function go(positionId, opts) {
            opts = opts || {};
            var from = current();
            var prevPos = state.position;
            state.position = positionId;
            var to = current();
            if (!to) return;
            var animate = !!(from && prevPos !== positionId);
            state.doc = buildDoc(animate ? from.state : null, to.state);
            state.pos = 0;
            if (!opts.fromHistory && prevPos !== positionId) {
                state.history.push(positionId);
                if (state.history.length > 12) state.history.shift();
            }
            var ti = tour.indexOf(positionId);
            if (ti >= 0 && !opts.keepTourIndex) state.tourIndex = ti;
            if (animate) startAnim();
            else draw();
            renderPanel();
            renderButtons();
        }

        function startAnim() {
            state.playing = true;
            state.last = 0;
            if (!state.raf) state.raf = requestAnimationFrame(tick);
        }

        function stopAll() {
            state.playing = false;
            state.touring = false;
            if (state.raf) cancelAnimationFrame(state.raf);
            state.raf = 0;
            renderButtons();
            draw();
        }

        function tick(ts) {
            state.raf = 0;
            if (!root2.isConnected) { state.playing = false; return; }
            var dt = state.last ? Math.min(0.1, (ts - state.last) / 1000) : 0;
            state.last = ts;
            var end = state.doc.phases.length - 1;
            if (state.pos < end) {
                state.pos = Math.min(end, state.pos + (dt * state.speed) / 1.6);
                draw();
                if (state.pos >= end) state.hold = 1.6;
                state.raf = requestAnimationFrame(tick);
                return;
            }
            if (state.touring) {
                state.hold -= dt * state.speed;
                if (state.hold <= 0) {
                    if (state.tourIndex >= tour.length - 1) { stopAll(); return; }
                    state.tourIndex++;
                    go(tour[state.tourIndex], { keepTourIndex: true });
                    if (!state.raf) state.raf = requestAnimationFrame(tick);
                    return;
                }
                state.raf = requestAnimationFrame(tick);
                return;
            }
            state.playing = false;
            renderButtons();
            draw();
        }

        function layout() {
            var w = stage.clientWidth || 600;
            var aspect = Board.viewAspect(scenario.view || { court: "half", rotation: 90 });
            var maxH = state.fullscreen ? Math.max(260, window.innerHeight - 240) : Math.min(600, Math.max(280, window.innerHeight * 0.66));
            var h = Math.max(220, Math.min(Math.round(w / aspect), maxH));
            dpr = Math.min(window.devicePixelRatio || 1, 2.5);
            cssW = w;
            cssH = h;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            canvas.style.width = w + "px";
            canvas.style.height = h + "px";
            vp = Board.computeViewport(scenario.view || { court: "half", rotation: 90 }, w, h, 6);
            draw();
        }

        function draw() {
            if (!vp || !state.doc) return;
            var f = Board.sampleFrame(state.doc, state.pos);
            var atRest = state.pos >= state.doc.phases.length - 1;
            var strokes = [];
            var alpha = f.strokeAlpha;
            var last = state.doc.phases[state.doc.phases.length - 1];
            if (state.arrows) {
                if (!atRest) strokes = f.strokes;
                else if (last.strokes.length) { strokes = last.strokes; alpha = 1; }
                else if (state.doc.phases.length > 1) {
                    strokes = state.doc.phases[0].strokes;
                    alpha = 0.55;
                }
            }
            ctx2d.setTransform(1, 0, 0, 1, 0, 0);
            ctx2d.clearRect(0, 0, canvas.width, canvas.height);
            Board.renderScene(ctx2d, vp, { objects: f.objects, strokes: strokes, strokeAlpha: alpha }, {
                dpr: dpr,
                selection: state.highlight ? { id: state.highlight } : null
            });
        }

        function renderButtons() {
            container.querySelectorAll("[data-variant]").forEach(function (b) {
                var on = b.getAttribute("data-variant") === state.variant;
                b.classList.toggle("is-active", on);
                b.setAttribute("aria-checked", on ? "true" : "false");
            });
            container.querySelectorAll("[data-position]").forEach(function (b) {
                var on = b.getAttribute("data-position") === state.position;
                b.classList.toggle("is-active", on);
                b.setAttribute("aria-pressed", on ? "true" : "false");
            });
            var pb = container.querySelector('[data-v="play"]');
            pb.textContent = state.touring ? ICON.pause : ICON.play;
            pb.setAttribute("aria-label", state.touring ? "Pausar recorrido" : "Reproducir recorrido");
            container.querySelector(".sim-step").textContent = "Recorrido: paso " + (state.tourIndex + 1) + " de " + tour.length;
            var v = scenario.variants.filter(function (x) { return x.id === state.variant; })[0];
            container.querySelector(".sim-variant-desc").innerHTML = badge(v.kind, v.refs) + " " + fmt(v.desc);
            var seqLen = Math.min(state.history.length, 12);
            container.querySelector(".sim-seq").textContent = "Abrir en pizarra y Guardar usan la secuencia que recorriste: " + seqLen + (seqLen === 1 ? " situación." : " situaciones.");
        }

        function renderPanel() {
            var r = current();
            if (!r) return;
            var st = r.state;
            var v = scenario.variants.filter(function (x) { return x.id === state.variant; })[0];
            var inherited = !r.own && state.variant !== scenario.variants[0].id;
            var defenders = Object.keys(scenario.players).filter(function (id) { return scenario.players[id].team === "defense"; });
            panel.hidden = !state.explain;
            panel.innerHTML =
                '<h4 class="sim-title">' + fmt(st.title) + "</h4>" +
                (inherited ? '<p class="ac-muted">En esta situación la variante «' + esc(v.label) + "» se juega igual que la base.</p>" : "") +
                (st.note ? "<p>" + fmt(st.note) + "</p>" : "") +
                "<h5>" + esc(L.resp) + '</h5><ul class="sim-resp">' +
                defenders.filter(function (id) { return st.pos[id] && st.resp && st.resp[id]; }).map(function (id) {
                    var p = scenario.players[id];
                    return '<li><button type="button" class="sim-resp-btn' + (state.highlight === id ? " is-on" : "") + '" data-highlight="' + esc(id) + '" aria-pressed="' + (state.highlight === id ? "true" : "false") + '"><span class="sim-tag">X' + esc(p.label) + "</span><span>" + fmt(st.resp[id]) + "</span></button></li>";
                }).join("") + "</ul>" +
                "<h5>" + esc(L.help) + "</h5><p>" + fmt(st.help) + "</p>" +
                ((st.optionsText || []).length ? '<h5>' + esc(L.options) + '</h5><ul class="ac-list sim-options">' + st.optionsText.map(function (t) { return "<li>" + fmt(t) + "</li>"; }).join("") + "</ul>" : "") +
                ((st.vulnerable || []).length ? '<h5>' + esc(L.vulnerable) + '</h5><ul class="ac-list">' + st.vulnerable.map(function (z) { return "<li>" + fmt(z.text || z.label) + "</li>"; }).join("") + "</ul>" : "") +
                '<p class="ac-muted sim-disclaimer">' + esc(L.disclaimer) + "</p>";
        }

        function flash(text, ok) {
            var m = container.querySelector(".sim-msg");
            m.hidden = false;
            m.textContent = text;
            m.classList.toggle("is-error", !ok);
            clearTimeout(flash.t);
            flash.t = setTimeout(function () { m.hidden = true; }, 5000);
        }

        function historyDoc() {
            var seq = state.history.slice(-12);
            return sequenceDoc(scenario, state.variant, seq, Board);
        }

        function historyMeta() {
            var v = scenario.variants.filter(function (x) { return x.id === state.variant; })[0];
            var labels = state.history.slice(-12).map(function (pid) {
                var p = scenario.positions.filter(function (x) { return x.id === pid; })[0];
                return p ? p.label : pid;
            });
            return {
                name: scenario.title + " · " + v.label,
                description: "Secuencia del simulador: " + labels.join(" → ") + ".",
                tags: ["Simulador"].concat(scenario.tags || [])
            };
        }

        function toggleFullscreen() {
            state.fullscreen = !state.fullscreen;
            root2.classList.toggle("sim--fullscreen", state.fullscreen);
            document.documentElement.classList.toggle("tb-noscroll", state.fullscreen);
            container.querySelector('[data-v="fullscreen"]').textContent = state.fullscreen ? "Salir de pantalla completa" : "Pantalla completa";
            setTimeout(layout, 30);
        }

        function hitPlayer(evt) {
            var rect = canvas.getBoundingClientRect();
            var px = (evt.clientX - rect.left) * (cssW / rect.width);
            var py = (evt.clientY - rect.top) * (cssH / rect.height);
            var f = Board.sampleFrame(state.doc, state.pos);
            var best = null;
            var bestD = Infinity;
            f.objects.forEach(function (o) {
                if (o.kind !== "player") return;
                var s = Board.toScreen(vp, o);
                var d = Math.hypot(s.x - px, s.y - py);
                if (d < bestD) { bestD = d; best = o; }
            });
            var radius = Math.max(18, vp.scale * 0.6);
            return best && bestD <= radius ? best : null;
        }

        canvas.addEventListener("click", function (evt) {
            if (!vp || !state.doc) return;
            var p = hitPlayer(evt);
            if (!p) return;
            if (p.team === "defense") {
                state.highlight = state.highlight === p.id ? null : p.id;
                renderPanel();
                draw();
                return;
            }
            // Atacante: buscamos una situación en la que él tenga el balón en ese mismo lugar.
            var cur = current().state;
            var here = cur.pos[p.id];
            var target = null;
            scenario.positions.forEach(function (sp) {
                if (target) return;
                var r = resolveState(scenario, state.variant, sp.id);
                if (!r || r.state.ball !== p.id) return;
                var there = r.state.pos[p.id];
                if (Math.hypot(there[0] - here[0], there[1] - here[1]) < 1.2) target = sp.id;
            });
            if (target && target !== state.position) {
                stopAll();
                go(target);
            } else if (!target) {
                flash(L.noTarget.replace("{p}", p.label), false);
            }
        });

        container.addEventListener("click", function (e) {
            var vb = e.target.closest("[data-variant]");
            if (vb) {
                if (state.variant === vb.getAttribute("data-variant")) return;
                stopAll();
                var before = current();
                state.variant = vb.getAttribute("data-variant");
                var after = current();
                state.doc = buildDoc(before ? before.state : null, after.state);
                state.pos = 0;
                startAnim();
                renderPanel();
                renderButtons();
                return;
            }
            var pbtn = e.target.closest("[data-position]");
            if (pbtn) {
                stopAll();
                go(pbtn.getAttribute("data-position"));
                return;
            }
            var hb = e.target.closest("[data-highlight]");
            if (hb) {
                var id = hb.getAttribute("data-highlight");
                state.highlight = state.highlight === id ? null : id;
                renderPanel();
                draw();
                return;
            }
            var b = e.target.closest("[data-v]");
            if (!b) return;
            var v = b.getAttribute("data-v");
            if (v === "play") {
                if (state.touring) { stopAll(); return; }
                state.touring = true;
                if (tour[state.tourIndex] !== state.position || state.tourIndex >= tour.length - 1) {
                    // Fuera del recorrido o al final: empieza desde el principio.
                    state.tourIndex = 0;
                    if (state.position !== tour[0]) go(tour[0], { keepTourIndex: true });
                    state.hold = 0.8;
                } else {
                    state.tourIndex++;
                    go(tour[state.tourIndex], { keepTourIndex: true });
                }
                state.playing = true;
                if (!state.raf) state.raf = requestAnimationFrame(tick);
                renderButtons();
            } else if (v === "next") {
                stopAll();
                if (state.tourIndex < tour.length - 1) {
                    state.tourIndex = tour[state.tourIndex] === state.position ? state.tourIndex + 1 : state.tourIndex;
                    go(tour[state.tourIndex], { keepTourIndex: true });
                }
            } else if (v === "prev") {
                stopAll();
                if (state.tourIndex > 0) {
                    state.tourIndex--;
                    go(tour[state.tourIndex], { keepTourIndex: true });
                }
            } else if (v === "restart") {
                stopAll();
                state.tourIndex = 0;
                state.history = [];
                state.position = tour[0];
                state.history.push(tour[0]);
                state.highlight = null;
                state.doc = buildDoc(null, current().state);
                state.pos = 0;
                draw();
                renderPanel();
                renderButtons();
            } else if (v === "arrows") {
                state.arrows = !state.arrows;
                b.textContent = state.arrows ? "Ocultar flechas" : "Mostrar flechas";
                b.setAttribute("aria-pressed", state.arrows ? "true" : "false");
                draw();
            } else if (v === "vulnerable") {
                state.vulnerable = !state.vulnerable;
                b.textContent = state.vulnerable ? "Ocultar espacios vulnerables" : "Mostrar espacios vulnerables";
                b.setAttribute("aria-pressed", state.vulnerable ? "true" : "false");
                var keepPos = state.pos;
                var phases = state.doc.phases;
                var toState = current().state;
                phases[phases.length - 1].objects = makeObjects(scenario, toState, { vulnerable: state.vulnerable, labels: true });
                state.pos = keepPos;
                draw();
            } else if (v === "explain") {
                state.explain = !state.explain;
                b.textContent = state.explain ? "Ocultar explicaciones" : "Mostrar explicaciones";
                b.setAttribute("aria-pressed", state.explain ? "true" : "false");
                root2.classList.toggle("sim--no-panel", !state.explain);
                panel.hidden = !state.explain;
                setTimeout(layout, 30);
            } else if (v === "fullscreen") {
                toggleFullscreen();
            } else if (v === "open" && host.onOpenInBoard) {
                stopAll();
                if (state.fullscreen) toggleFullscreen();
                host.onOpenInBoard(historyDoc(), historyMeta());
            } else if (v === "save" && host.onSaveAsPlay) {
                var res = host.onSaveAsPlay(historyDoc(), historyMeta()) || {};
                if (res.ok) flash("Guardada en Jugadas guardadas como «" + historyMeta().name + "».", true);
                else flash(res.error || "No se pudo guardar la jugada.", false);
            } else if (v === "exercises" && host.onShowExercises) {
                stopAll();
                if (state.fullscreen) toggleFullscreen();
                host.onShowExercises();
            }
        });

        container.querySelector(".ac-speed").addEventListener("change", function (e) {
            state.speed = Number(e.target.value) || 1;
        });
        root2.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && state.fullscreen) toggleFullscreen();
        });
        if (root && root.addEventListener) {
            var onResize = function () {
                if (!root2.isConnected) { root.removeEventListener("resize", onResize); return; }
                layout();
            };
            root.addEventListener("resize", onResize);
        }

        state.doc = buildDoc(null, current().state);
        state.pos = 0;
        renderPanel();
        renderButtons();
        layout();

        return {
            go: go,
            stop: stopAll,
            getState: function () { return { variant: state.variant, position: state.position, history: state.history.slice() }; }
        };
    }

    return {
        resolveState: resolveState,
        mirrorState: mirrorState,
        mirrorText: mirrorText,
        transitionStrokes: transitionStrokes,
        sequenceDoc: sequenceDoc,
        validateScenario: validateScenario,
        optionStrokes: optionStrokes,
        makeObjects: makeObjects,
        mount: mount
    };
});
