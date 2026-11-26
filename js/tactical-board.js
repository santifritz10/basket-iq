/*
 * BasketIQ · Pizarra táctica (motor v2)
 *
 * Módulo autocontenido (sin dependencias) que expone window.BasketBoard.
 * - Modelo de datos en metros sobre una cancha FIBA de 28 x 15 m.
 * - Renderizador de cancha (completa / media, girable) y de escena.
 * - Editor con herramientas, selección, edición de trazos, deshacer/rehacer,
 *   atajos de teclado y autoguardado de borradores.
 * - Reproductor de fases con transiciones animadas.
 *
 * Las funciones puras (modelo, geometría, animación) se exportan también
 * para Node, así se pueden probar con `node --test`.
 */
(function (root, factory) {
    var api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.BasketBoard = api;
})(typeof window !== "undefined" ? window : null, function () {
    "use strict";

    // =====================================================================
    // CONSTANTES
    // =====================================================================

    var DOC_VERSION = 2;

    /** Medidas FIBA en metros (bordes internos de las líneas). */
    var FIBA = {
        length: 28,
        width: 15,
        line: 0.05,
        basketX: 1.575, // centro del aro desde el borde interno de la línea de fondo
        rimRadius: 0.225, // aro de 45 cm de diámetro interior
        backboardX: 1.2, // cara frontal del tablero
        backboardHalf: 0.9, // tablero de 1,80 m
        laneLength: 5.8, // de la línea de fondo al borde exterior de la línea de tiro libre
        laneHalfWidth: 2.45, // zona restringida de 4,90 m
        ftCircleRadius: 1.8,
        threeRadius: 6.75,
        threeSideDist: 0.9, // rectas del triple a 0,90 m de la banda
        noChargeRadius: 1.3, // Reglas Oficiales FIBA 2024, art. 2.5.7
        centerCircleRadius: 1.8,
        throwInX: 8.325 // línea de saque, medida desde la línea de fondo
    };

    var COLORS = {
        offense: "#1d4ed8",
        defense: "#dc2626",
        swatches: ["#1d4ed8", "#dc2626", "#f97316", "#16a34a", "#7c3aed", "#0891b2", "#ca8a04", "#111827"],
        floor: "#efd3a3",
        paint: "#e4b878",
        courtLine: "#5b3a1a",
        outside: "#262631",
        stroke: "#111827",
        selection: "#ff9800"
    };

    var OBJECT_KINDS = ["player", "ball", "cone", "obstacle", "zone", "text"];

    /** Tipos de trazo y su simbología. */
    var STROKE_TYPES = {
        move: { label: "Desplazamiento sin balón", short: "Desplaz.", key: "m", help: "Línea continua con flecha. Arrastrá desde el jugador hasta su destino.", moves: true },
        cut: { label: "Corte", short: "Corte", key: "k", help: "Línea gruesa con doble punta: desplazamiento explosivo hacia el aro o hacia un espacio.", moves: true },
        pass: { label: "Pase", short: "Pase", key: "p", help: "Línea discontinua. Arrastrá desde el jugador con balón hasta el receptor: en la fase siguiente el balón cambia de manos.", moves: false },
        dribble: { label: "Dribbling", short: "Dribbling", key: "d", help: "Línea ondulada. El jugador avanza con el balón.", moves: true },
        screen_on: { label: "Bloqueo directo", short: "B. directo", key: "s", help: "Línea terminada en doble barra: bloqueo al defensor del jugador con balón.", moves: true },
        screen_off: { label: "Bloqueo indirecto", short: "B. indirecto", key: "i", help: "Línea terminada en barra simple: bloqueo para un compañero sin balón.", moves: true },
        rotation: { label: "Rotación defensiva", short: "Rotación", key: "r", help: "Línea de puntos roja: ayuda o recuperación de un defensor.", moves: true },
        shot: { label: "Tiro", short: "Tiro", key: "g", help: "Doble línea con flecha hacia el aro.", moves: false },
        arrow: { label: "Flecha", short: "Flecha", key: "a", help: "Flecha genérica para señalar. Dibujala curva para que quede curva.", moves: false },
        free: { label: "Dibujo libre", short: "Libre", key: "f", help: "Trazo a mano alzada, sin flecha.", moves: false }
    };

    var STROKE_ORDER = ["move", "cut", "pass", "dribble", "screen_on", "screen_off", "rotation", "shot", "arrow", "free"];

    var ELEMENT_TOOLS = {
        offense: { label: "Atacante", key: "1", help: "Tocá la cancha para agregar un atacante. Se numeran solos." },
        defense: { label: "Defensor", key: "2", help: "Tocá la cancha para agregar un defensor." },
        ball: { label: "Balón", key: "b", help: "Tocá un jugador para darle el balón, o la cancha para dejarlo libre." },
        cone: { label: "Cono", key: "c", help: "Tocá la cancha para agregar un cono." },
        obstacle: { label: "Obstáculo", key: "o", help: "Tocá la cancha para agregar un obstáculo (colchoneta, silla, escudo)." },
        zone: { label: "Zona resaltada", key: "z", help: "Arrastrá para marcar un espacio de la cancha." },
        text: { label: "Texto", key: "t", help: "Tocá la cancha para agregar una anotación." }
    };

    // =====================================================================
    // UTILIDADES
    // =====================================================================

    function uid() {
        return Math.random().toString(36).slice(2, 10);
    }

    function clone(v) {
        return JSON.parse(JSON.stringify(v));
    }

    function clamp(v, a, b) {
        return v < a ? a : v > b ? b : v;
    }

    function num(v, fallback) {
        var n = Number(v);
        return isFinite(n) ? n : fallback;
    }

    function dist(a, b) {
        return Math.hypot(a.x - b.x, a.y - b.y);
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function lerpPt(a, b, t) {
        return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
    }

    function easeInOut(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    function escapeHtml(str) {
        return String(str == null ? "" : str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    // =====================================================================
    // MODELO DE DATOS
    // =====================================================================

    function createPhase(name) {
        return { id: uid(), name: name || "Fase 1", note: "", objects: [], strokes: [] };
    }

    function createEmptyDoc(view) {
        return {
            version: DOC_VERSION,
            view: {
                court: view && view.court === "full" ? "full" : "half",
                rotation: view && [0, 90, 180, 270].indexOf(view.rotation) >= 0 ? view.rotation : 90
            },
            phases: [createPhase("Fase 1")]
        };
    }

    function normalizePoint(p) {
        return { x: num(p && p.x, 0), y: num(p && p.y, 0) };
    }

    function normalizeObject(o) {
        if (!o || OBJECT_KINDS.indexOf(o.kind) < 0) return null;
        var out = { id: String(o.id || uid()), kind: o.kind, x: num(o.x, 7), y: num(o.y, 7.5) };
        if (o.kind === "player") {
            out.team = o.team === "defense" ? "defense" : "offense";
            out.label = String(o.label == null ? "" : o.label).slice(0, 3);
            out.name = String(o.name || "").slice(0, 24);
            out.color = typeof o.color === "string" ? o.color : out.team === "defense" ? COLORS.defense : COLORS.offense;
        } else if (o.kind === "ball") {
            out.holder = o.holder ? String(o.holder) : null;
        } else if (o.kind === "zone") {
            out.w = num(o.w, 3);
            out.h = num(o.h, 3);
            out.color = typeof o.color === "string" ? o.color : "#f97316";
        } else if (o.kind === "text") {
            out.text = String(o.text == null ? "Texto" : o.text).slice(0, 120);
            out.size = ["s", "m", "l"].indexOf(o.size) >= 0 ? o.size : "m";
            out.color = typeof o.color === "string" ? o.color : "#111827";
        }
        return out;
    }

    function normalizeStroke(s) {
        if (!s || !STROKE_TYPES[s.type]) return null;
        var out = {
            id: String(s.id || uid()),
            type: s.type,
            a: normalizePoint(s.a),
            b: normalizePoint(s.b),
            c: s.c ? normalizePoint(s.c) : null,
            from: s.from ? String(s.from) : null,
            to: s.to ? String(s.to) : null,
            color: typeof s.color === "string" ? s.color : null
        };
        if (s.type === "free" && Array.isArray(s.pts)) {
            out.pts = s.pts.slice(0, 600).map(normalizePoint);
            if (out.pts.length < 2) return null;
            out.a = out.pts[0];
            out.b = out.pts[out.pts.length - 1];
            out.c = null;
        }
        return out;
    }

    /** Valida y completa un documento leído de almacenamiento. Nunca lanza. */
    function normalizeDoc(raw) {
        var doc = createEmptyDoc(raw && raw.view);
        if (!raw || !Array.isArray(raw.phases) || !raw.phases.length) return doc;
        doc.phases = raw.phases.slice(0, 60).map(function (ph, i) {
            return {
                id: String((ph && ph.id) || uid()),
                name: String((ph && ph.name) || "Fase " + (i + 1)).slice(0, 60),
                note: String((ph && ph.note) || "").slice(0, 600),
                objects: (Array.isArray(ph && ph.objects) ? ph.objects : []).map(normalizeObject).filter(Boolean),
                strokes: (Array.isArray(ph && ph.strokes) ? ph.strokes : []).map(normalizeStroke).filter(Boolean)
            };
        });
        return doc;
    }

    function isBoardPlay(play) {
        return !!(play && play.board && Array.isArray(play.board.phases) && play.board.phases.length);
    }

    function findById(list, id) {
        for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
        return null;
    }

    function nextPlayerLabel(objects, team) {
        var used = {};
        objects.forEach(function (o) {
            if (o.kind === "player" && o.team === team) used[String(o.label)] = true;
        });
        for (var n = 1; n < 100; n++) if (!used[String(n)]) return String(n);
        return "?";
    }

    function makePlayer(team, label, x, y, extra) {
        var p = {
            id: uid(),
            kind: "player",
            team: team,
            label: String(label),
            name: "",
            color: team === "defense" ? COLORS.defense : COLORS.offense,
            x: x,
            y: y
        };
        if (extra) Object.keys(extra).forEach(function (k) { p[k] = extra[k]; });
        return p;
    }

    // =====================================================================
    // GEOMETRÍA DE TRAZOS
    // =====================================================================

    function quadPoint(a, c, b, t) {
        var mt = 1 - t;
        return {
            x: mt * mt * a.x + 2 * mt * t * c.x + t * t * b.x,
            y: mt * mt * a.y + 2 * mt * t * c.y + t * t * b.y
        };
    }

    /** Puntos (en metros) a lo largo del trazo. */
    function strokeSamples(st, n) {
        n = n || 32;
        if (st.type === "free" && st.pts && st.pts.length > 1) return st.pts;
        var out = [];
        for (var i = 0; i <= n; i++) {
            var t = i / n;
            out.push(st.c ? quadPoint(st.a, st.c, st.b, t) : lerpPt(st.a, st.b, t));
        }
        return out;
    }

    function strokeMidpoint(st) {
        if (st.type === "free" && st.pts) return st.pts[Math.floor(st.pts.length / 2)];
        return st.c ? quadPoint(st.a, st.c, st.b, 0.5) : lerpPt(st.a, st.b, 0.5);
    }

    /** Control de la curva cuadrática que pasa por `mid` en t = 0,5. */
    function controlFromMid(a, b, mid) {
        return { x: 2 * mid.x - (a.x + b.x) / 2, y: 2 * mid.y - (a.y + b.y) / 2 };
    }

    function polylineLength(pts) {
        var total = 0;
        for (var i = 1; i < pts.length; i++) total += dist(pts[i], pts[i - 1]);
        return total;
    }

    function pointAtLength(pts, target) {
        if (!pts.length) return { x: 0, y: 0 };
        var acc = 0;
        for (var i = 1; i < pts.length; i++) {
            var seg = dist(pts[i], pts[i - 1]);
            if (acc + seg >= target) {
                var t = seg ? (target - acc) / seg : 0;
                return lerpPt(pts[i - 1], pts[i], t);
            }
            acc += seg;
        }
        return { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y };
    }

    function pointAlong(pts, t) {
        return pointAtLength(pts, polylineLength(pts) * clamp(t, 0, 1));
    }

    /**
     * Convierte un trazo dibujado a mano en recto o curvo.
     * Si el trazo se aparta poco de la recta queda recto; si no, curva cuadrática.
     */
    function fitStroke(type, path) {
        var a = path[0];
        var b = path[path.length - 1];
        if (type === "free") {
            var simplified = [path[0]];
            for (var i = 1; i < path.length; i++) {
                if (dist(path[i], simplified[simplified.length - 1]) >= 0.08) simplified.push(path[i]);
            }
            if (simplified[simplified.length - 1] !== b) simplified.push(b);
            return { a: a, b: b, c: null, pts: simplified };
        }
        var mid = pointAlong(path, 0.5);
        var chord = dist(a, b) || 1;
        var straightMid = lerpPt(a, b, 0.5);
        var deviation = dist(mid, straightMid);
        if (deviation < Math.max(0.3, chord * 0.08)) return { a: a, b: b, c: null };
        return { a: a, b: b, c: controlFromMid(a, b, mid) };
    }

    // =====================================================================
    // FASES Y ANIMACIÓN
    // =====================================================================

    /**
     * Crea la fase siguiente aplicando los movimientos dibujados:
     * los jugadores con desplazamiento, corte, dribbling, bloqueo o rotación
     * terminan en el final de su trazo, y los pases cambian el poseedor del balón.
     */
    function deriveNextPhase(phase, index) {
        var objects = clone(phase.objects);
        var byId = {};
        objects.forEach(function (o) { byId[o.id] = o; });

        phase.strokes.forEach(function (st) {
            if (!STROKE_TYPES[st.type].moves || !st.from) return;
            var o = byId[st.from];
            if (o && o.kind !== "zone") {
                o.x = st.b.x;
                o.y = st.b.y;
            }
        });

        phase.strokes.forEach(function (st) {
            if (st.type !== "pass" && st.type !== "shot") return;
            var passer = st.from;
            var balls = objects.filter(function (o) {
                if (o.kind !== "ball") return false;
                if (passer && o.holder === passer) return true;
                var orig = findById(phase.objects, o.id);
                return !o.holder && orig && dist(orig, st.a) < 1;
            });
            if (!balls.length) return;
            var ball = balls[0];
            if (st.type === "shot") {
                ball.holder = null;
                ball.x = st.b.x;
                ball.y = st.b.y;
                return;
            }
            var receiver = st.to ? byId[st.to] : null;
            if (!receiver) {
                var best = null;
                var bestD = 1.6;
                objects.forEach(function (o) {
                    if (o.kind !== "player" || o.id === passer) return;
                    var d = dist(o, st.b);
                    if (d < bestD) { bestD = d; best = o; }
                });
                receiver = best;
            }
            if (receiver) {
                ball.holder = receiver.id;
                ball.x = receiver.x;
                ball.y = receiver.y;
            } else {
                ball.holder = null;
                ball.x = st.b.x;
                ball.y = st.b.y;
            }
        });

        return {
            id: uid(),
            name: "Fase " + ((index == null ? 0 : index) + 2),
            note: "",
            objects: objects,
            strokes: []
        };
    }

    function objectWorldPos(objects, o) {
        if (o.kind === "ball" && o.holder) {
            var h = findById(objects, o.holder);
            if (h) return { x: h.x, y: h.y };
        }
        return { x: o.x, y: o.y };
    }

    /**
     * Estado de la escena en una posición continua de la línea de tiempo.
     * pos = 1,5 significa "a mitad de la transición entre la fase 2 y la 3".
     */
    function sampleFrame(doc, pos) {
        var phases = doc.phases;
        var n = phases.length;
        pos = clamp(num(pos, 0), 0, n - 1);
        var i = Math.min(Math.floor(pos), n - 1);
        var t = pos - i;
        var A = phases[i];
        if (t < 1e-4 || i >= n - 1) {
            return {
                phaseIndex: i,
                t: 0,
                objects: A.objects.map(function (o) {
                    var c = clone(o);
                    c.alpha = 1;
                    c.attach = 1;
                    return c;
                }),
                strokes: A.strokes,
                strokeAlpha: 1
            };
        }
        var B = phases[i + 1];
        var e = easeInOut(t);
        var positions = {};
        var out = [];

        function moveFor(id) {
            for (var k = 0; k < A.strokes.length; k++) {
                var st = A.strokes[k];
                if (st.from === id && STROKE_TYPES[st.type].moves) return st;
            }
            return null;
        }

        B.objects.forEach(function (ob) {
            if (ob.kind === "ball") return;
            var oa = findById(A.objects, ob.id);
            var c = clone(ob);
            if (!oa) {
                c.alpha = e;
            } else {
                c.alpha = 1;
                var mv = moveFor(ob.id);
                if (mv && dist(mv.b, ob) < 0.8) {
                    var pts = strokeSamples(mv, 40);
                    var p = pointAlong(pts, e);
                    c.x = p.x + (ob.x - mv.b.x) * e;
                    c.y = p.y + (ob.y - mv.b.y) * e;
                } else {
                    c.x = lerp(oa.x, ob.x, e);
                    c.y = lerp(oa.y, ob.y, e);
                    if (ob.kind === "zone") {
                        c.w = lerp(num(oa.w, ob.w), ob.w, e);
                        c.h = lerp(num(oa.h, ob.h), ob.h, e);
                    }
                }
            }
            positions[ob.id] = { x: c.x, y: c.y };
            out.push(c);
        });
        A.objects.forEach(function (oa) {
            if (oa.kind === "ball" || findById(B.objects, oa.id)) return;
            var c = clone(oa);
            c.alpha = 1 - e;
            positions[oa.id] = { x: c.x, y: c.y };
            out.push(c);
        });

        function posOf(id) {
            return positions[id] || null;
        }

        // Balones: viajan entre poseedores, siguiendo los pases y tiros dibujados.
        var flight = easeInOut(clamp((t - 0.35) / 0.65, 0, 1));
        B.objects.forEach(function (bb) {
            if (bb.kind !== "ball") return;
            var ba = findById(A.objects, bb.id);
            var c = clone(bb);
            c.alpha = ba ? 1 : e;
            c.attach = 1;
            var startHolder = ba && ba.holder ? posOf(ba.holder) : null;
            var endHolder = bb.holder ? posOf(bb.holder) : null;
            var start = startHolder || (ba ? { x: ba.x, y: ba.y } : { x: bb.x, y: bb.y });
            var end = endHolder || { x: bb.x, y: bb.y };
            var sameHolder = ba && ba.holder && ba.holder === bb.holder;
            if (sameHolder) {
                c.x = end.x;
                c.y = end.y;
            } else {
                var shot = null;
                if (ba && ba.holder) {
                    A.strokes.forEach(function (st) {
                        if (st.type === "shot" && st.from === ba.holder) shot = st;
                    });
                }
                var p;
                if (shot && !bb.holder) {
                    var spts = strokeSamples(shot, 30);
                    var from = start;
                    p = pointAlong(spts, flight);
                    p = { x: p.x + (from.x - shot.a.x) * (1 - flight), y: p.y + (from.y - shot.a.y) * (1 - flight) };
                } else {
                    p = lerpPt(start, end, flight);
                }
                c.x = p.x;
                c.y = p.y;
                var wasHeld = !!(ba && ba.holder);
                var willBeHeld = !!bb.holder;
                if (flight <= 0) c.attach = wasHeld ? 1 : 0;
                else if (flight >= 1) c.attach = willBeHeld ? 1 : 0;
                else c.attach = 0;
                if (flight > 0 && flight < 1) c.holder = null;
                else if (flight <= 0) c.holder = ba ? ba.holder : null;
            }
            out.push(c);
        });
        A.objects.forEach(function (ba) {
            if (ba.kind !== "ball" || findById(B.objects, ba.id)) return;
            var c = clone(ba);
            c.alpha = 1 - e;
            c.attach = 1;
            out.push(c);
        });

        return { phaseIndex: i, t: t, objects: out, strokes: A.strokes, strokeAlpha: Math.max(0, 1 - e * 1.6) };
    }

    // =====================================================================
    // VISTA (transformación metros <-> píxeles)
    // =====================================================================

    var ROT = {
        0: [1, 0, 0, 1],
        90: [0, -1, 1, 0],
        180: [-1, 0, 0, -1],
        270: [0, 1, -1, 0]
    };

    function viewBounds(view) {
        var m = 0.9;
        if (view.court === "full") return { x0: -m, x1: FIBA.length + m, y0: -m, y1: FIBA.width + m };
        return { x0: -m, x1: FIBA.length / 2 + 0.6, y0: -m, y1: FIBA.width + m };
    }

    function viewAspect(view) {
        var b = viewBounds(view);
        var w = b.x1 - b.x0;
        var h = b.y1 - b.y0;
        return view.rotation % 180 === 0 ? w / h : h / w;
    }

    function computeViewport(view, width, height, pad) {
        pad = pad == null ? 6 : pad;
        var b = viewBounds(view);
        var R = ROT[view.rotation] || ROT[0];
        var bw = b.x1 - b.x0;
        var bh = b.y1 - b.y0;
        if (view.rotation % 180 !== 0) {
            var tmp = bw; bw = bh; bh = tmp;
        }
        var s = Math.max(1, Math.min((width - pad * 2) / bw, (height - pad * 2) / bh));
        var cx = (b.x0 + b.x1) / 2;
        var cy = (b.y0 + b.y1) / 2;
        var ox = width / 2;
        var oy = height / 2;
        return {
            view: view,
            bounds: b,
            width: width,
            height: height,
            scale: s,
            // X = a*x + c*y + e ; Y = b*x + d*y + f
            a: s * R[0],
            c: s * R[1],
            b: s * R[2],
            d: s * R[3],
            e: ox - s * (R[0] * cx + R[1] * cy),
            f: oy - s * (R[2] * cx + R[3] * cy),
            R: R,
            cx: cx,
            cy: cy,
            ox: ox,
            oy: oy
        };
    }

    function toScreen(vp, p) {
        return { x: vp.a * p.x + vp.c * p.y + vp.e, y: vp.b * p.x + vp.d * p.y + vp.f };
    }

    function toWorld(vp, p) {
        var u = (p.x - vp.ox) / vp.scale;
        var v = (p.y - vp.oy) / vp.scale;
        var R = vp.R;
        // R es ortogonal: inversa = transpuesta
        return { x: R[0] * u + R[2] * v + vp.cx, y: R[1] * u + R[3] * v + vp.cy };
    }

    function clampToBounds(vp, p) {
        var b = vp.bounds;
        return { x: clamp(p.x, b.x0 + 0.2, b.x1 - 0.2), y: clamp(p.y, b.y0 + 0.2, b.y1 - 0.2) };
    }

    function sizes(vp) {
        var rp = clamp(vp.scale * 0.42, 10, 26);
        return { player: rp, ball: rp * 0.55, font: Math.round(clamp(rp * 0.95, 10, 22)) };
    }

    // =====================================================================
    // RENDER: CANCHA FIBA
    // =====================================================================

    function drawBasketEnd(ctx, lw) {
        var F = FIBA;
        var cy = F.width / 2;
        // Zona restringida (pintada)
        ctx.fillStyle = COLORS.paint;
        ctx.fillRect(0, cy - F.laneHalfWidth, F.laneLength, F.laneHalfWidth * 2);
        ctx.strokeRect(0, cy - F.laneHalfWidth, F.laneLength, F.laneHalfWidth * 2);

        // Círculo de tiro libre: mitad exterior continua, interior discontinua
        ctx.beginPath();
        ctx.arc(F.laneLength, cy, F.ftCircleRadius, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
        ctx.save();
        ctx.setLineDash([0.32, 0.28]);
        ctx.beginPath();
        ctx.arc(F.laneLength, cy, F.ftCircleRadius, Math.PI / 2, (3 * Math.PI) / 2);
        ctx.stroke();
        ctx.restore();

        // Línea de tres puntos
        var yTop = F.threeSideDist;
        var yBot = F.width - F.threeSideDist;
        var dy = cy - yTop;
        var xMeet = F.basketX + Math.sqrt(F.threeRadius * F.threeRadius - dy * dy);
        var ang = Math.atan2(dy, xMeet - F.basketX);
        ctx.beginPath();
        ctx.moveTo(0, yTop);
        ctx.lineTo(xMeet, yTop);
        ctx.arc(F.basketX, cy, F.threeRadius, -ang, ang);
        ctx.lineTo(0, yBot);
        ctx.stroke();

        // Semicírculo de no carga
        ctx.beginPath();
        ctx.moveTo(F.backboardX, cy - F.noChargeRadius);
        ctx.lineTo(F.basketX, cy - F.noChargeRadius);
        ctx.arc(F.basketX, cy, F.noChargeRadius, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(F.backboardX, cy + F.noChargeRadius);
        ctx.stroke();

        // Tablero y aro
        ctx.save();
        ctx.lineWidth = lw * 2.2;
        ctx.beginPath();
        ctx.moveTo(F.backboardX, cy - F.backboardHalf);
        ctx.lineTo(F.backboardX, cy + F.backboardHalf);
        ctx.stroke();
        ctx.lineWidth = lw * 1.3;
        ctx.strokeStyle = "#c2410c";
        ctx.beginPath();
        ctx.moveTo(F.backboardX, cy);
        ctx.lineTo(F.basketX - F.rimRadius, cy);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(F.basketX, cy, F.rimRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    function drawCourt(ctx, vp, dpr) {
        var F = FIBA;
        dpr = dpr || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = COLORS.outside;
        ctx.fillRect(0, 0, vp.width, vp.height);

        ctx.setTransform(vp.a * dpr, vp.b * dpr, vp.c * dpr, vp.d * dpr, vp.e * dpr, vp.f * dpr);
        var full = vp.view.court === "full";
        var xEnd = full ? F.length : F.length / 2;
        var lw = Math.max(F.line, 1.4 / vp.scale);

        ctx.fillStyle = COLORS.floor;
        ctx.fillRect(0, 0, xEnd, F.width);

        ctx.strokeStyle = COLORS.courtLine;
        ctx.lineWidth = lw;
        ctx.lineJoin = "round";
        ctx.setLineDash([]);

        // Líneas de banda y de fondo
        ctx.strokeRect(0, 0, xEnd, F.width);

        // Línea y círculo central
        ctx.beginPath();
        ctx.moveTo(F.length / 2, 0);
        ctx.lineTo(F.length / 2, F.width);
        ctx.stroke();
        ctx.beginPath();
        if (full) ctx.arc(F.length / 2, F.width / 2, F.centerCircleRadius, 0, Math.PI * 2);
        else ctx.arc(F.length / 2, F.width / 2, F.centerCircleRadius, Math.PI / 2, (3 * Math.PI) / 2);
        ctx.stroke();

        // Líneas de saque (lado opuesto a la mesa)
        ctx.beginPath();
        ctx.moveTo(F.throwInX, F.width);
        ctx.lineTo(F.throwInX, F.width + 0.15);
        if (full) {
            ctx.moveTo(F.length - F.throwInX, F.width);
            ctx.lineTo(F.length - F.throwInX, F.width + 0.15);
        }
        ctx.stroke();

        drawBasketEnd(ctx, lw);
        if (full) {
            ctx.save();
            ctx.translate(F.length, 0);
            ctx.scale(-1, 1);
            drawBasketEnd(ctx, lw);
            ctx.restore();
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // =====================================================================
    // RENDER: ESCENA
    // =====================================================================

    function strokeColor(st) {
        if (st.color) return st.color;
        if (st.type === "rotation") return "#b91c1c";
        if (st.type === "arrow") return "#ea580c";
        return COLORS.stroke;
    }

    function arrowHead(ctx, from, tip, size, color) {
        var ang = Math.atan2(tip.y - from.y, tip.x - from.x);
        ctx.beginPath();
        ctx.moveTo(tip.x, tip.y);
        ctx.lineTo(tip.x - size * Math.cos(ang - 0.45), tip.y - size * Math.sin(ang - 0.45));
        ctx.lineTo(tip.x - size * Math.cos(ang + 0.45), tip.y - size * Math.sin(ang + 0.45));
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
    }

    function trimPolyline(pts, startTrim, endTrim) {
        var total = polylineLength(pts);
        if (total <= startTrim + endTrim + 4) return pts;
        var out = [];
        var acc = 0;
        out.push(pointAtLength(pts, startTrim));
        for (var i = 1; i < pts.length; i++) {
            acc += dist(pts[i], pts[i - 1]);
            if (acc > startTrim && acc < total - endTrim) out.push(pts[i]);
        }
        out.push(pointAtLength(pts, total - endTrim));
        return out;
    }

    function polyPath(ctx, pts) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    }

    function offsetPolyline(pts, off) {
        return pts.map(function (p, i) {
            var p0 = pts[Math.max(0, i - 1)];
            var p1 = pts[Math.min(pts.length - 1, i + 1)];
            var dx = p1.x - p0.x;
            var dy = p1.y - p0.y;
            var len = Math.hypot(dx, dy) || 1;
            return { x: p.x - (dy / len) * off, y: p.y + (dx / len) * off };
        });
    }

    function wavePolyline(pts, amp, wavelength, tailStraight) {
        var total = polylineLength(pts);
        var out = [];
        var step = 2.5;
        for (var l = 0; l <= total; l += step) {
            var p = pointAtLength(pts, l);
            var q = pointAtLength(pts, Math.min(total, l + 1));
            var dx = q.x - p.x;
            var dy = q.y - p.y;
            var len = Math.hypot(dx, dy) || 1;
            var fade = l > total - tailStraight ? Math.max(0, (total - l) / tailStraight) : 1;
            var off = Math.sin((l / wavelength) * Math.PI * 2) * amp * fade;
            out.push({ x: p.x - (dy / len) * off, y: p.y + (dx / len) * off });
        }
        out.push(pts[pts.length - 1]);
        return out;
    }

    function lastDirection(pts) {
        var tip = pts[pts.length - 1];
        for (var i = pts.length - 2; i >= 0; i--) {
            if (dist(pts[i], tip) > 6) return pts[i];
        }
        return pts[0];
    }

    function drawStroke(ctx, vp, st, opts) {
        opts = opts || {};
        var sz = sizes(vp);
        var color = strokeColor(st);
        var world = strokeSamples(st, 40);
        var pts = world.map(function (p) { return toScreen(vp, p); });
        if (pts.length < 2) return;
        var startTrim = st.from ? sz.player + 2 : 0;
        var endTrim = st.to ? sz.player + 3 : 0;
        if (startTrim || endTrim) pts = trimPolyline(pts, startTrim, endTrim);

        var lw = clamp(vp.scale * 0.075, 1.8, 3.2);
        var head = clamp(lw * 4.2, 9, 14);
        ctx.save();
        ctx.globalAlpha = opts.alpha == null ? 1 : opts.alpha;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = lw;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.setLineDash([]);

        if (opts.selected) {
            ctx.save();
            ctx.strokeStyle = "rgba(255,152,0,0.45)";
            ctx.lineWidth = lw + 8;
            polyPath(ctx, pts);
            ctx.stroke();
            ctx.restore();
        }

        var tip = pts[pts.length - 1];
        var type = st.type;
        var bodyEnd = type === "free" || type === "screen_on" || type === "screen_off" ? 0 : head * 0.8;
        var body = bodyEnd ? trimPolyline(pts, 0, bodyEnd) : pts;

        if (type === "pass") {
            ctx.setLineDash([lw * 3.2, lw * 2.4]);
            polyPath(ctx, body);
            ctx.stroke();
            ctx.setLineDash([]);
            arrowHead(ctx, lastDirection(pts), tip, head, color);
        } else if (type === "dribble") {
            var wave = wavePolyline(body, clamp(lw * 2, 4, 6), clamp(lw * 6, 12, 18), 10);
            polyPath(ctx, wave);
            ctx.stroke();
            arrowHead(ctx, lastDirection(pts), tip, head, color);
        } else if (type === "rotation") {
            ctx.setLineDash([0.1, lw * 2.4]);
            ctx.lineWidth = lw * 1.25;
            polyPath(ctx, body);
            ctx.stroke();
            ctx.setLineDash([]);
            arrowHead(ctx, lastDirection(pts), tip, head, color);
        } else if (type === "shot") {
            ctx.lineWidth = lw * 0.8;
            polyPath(ctx, offsetPolyline(body, lw * 1.2));
            ctx.stroke();
            polyPath(ctx, offsetPolyline(body, -lw * 1.2));
            ctx.stroke();
            arrowHead(ctx, lastDirection(pts), tip, head * 1.1, color);
        } else if (type === "cut") {
            ctx.lineWidth = lw * 1.35;
            polyPath(ctx, body);
            ctx.stroke();
            var back = lastDirection(pts);
            arrowHead(ctx, back, tip, head * 1.05, color);
            var ang = Math.atan2(tip.y - back.y, tip.x - back.x);
            var tip2 = { x: tip.x - Math.cos(ang) * head * 0.75, y: tip.y - Math.sin(ang) * head * 0.75 };
            arrowHead(ctx, back, tip2, head * 1.05, color);
        } else if (type === "screen_on" || type === "screen_off") {
            ctx.lineWidth = lw * 1.2;
            polyPath(ctx, pts);
            ctx.stroke();
            var bk = lastDirection(pts);
            var a2 = Math.atan2(tip.y - bk.y, tip.x - bk.x);
            var half = head * 0.95;
            var nx = -Math.sin(a2);
            var ny = Math.cos(a2);
            ctx.lineWidth = lw * 1.6;
            ctx.beginPath();
            ctx.moveTo(tip.x + nx * half, tip.y + ny * half);
            ctx.lineTo(tip.x - nx * half, tip.y - ny * half);
            if (type === "screen_on") {
                var bx = tip.x - Math.cos(a2) * lw * 2.6;
                var by = tip.y - Math.sin(a2) * lw * 2.6;
                ctx.moveTo(bx + nx * half, by + ny * half);
                ctx.lineTo(bx - nx * half, by - ny * half);
            }
            ctx.stroke();
        } else if (type === "free") {
            polyPath(ctx, pts);
            ctx.stroke();
        } else {
            // move / arrow
            polyPath(ctx, body);
            ctx.stroke();
            arrowHead(ctx, lastDirection(pts), tip, head, color);
        }
        ctx.restore();
    }

    function roundRect(ctx, x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function hexToRgba(hex, a) {
        var h = String(hex || "#000").replace("#", "");
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        var n = parseInt(h, 16);
        if (!isFinite(n)) return "rgba(0,0,0," + a + ")";
        return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
    }

    function textMetrics(ctx, vp, o) {
        var sz = sizes(vp);
        var mult = o.size === "s" ? 0.8 : o.size === "l" ? 1.35 : 1;
        var fs = Math.round(sz.font * mult);
        ctx.font = "600 " + fs + "px 'Segoe UI', system-ui, sans-serif";
        var lines = String(o.text || "").split("\n");
        var w = 0;
        lines.forEach(function (l) { w = Math.max(w, ctx.measureText(l).width); });
        return { fs: fs, lines: lines, w: w + fs * 0.9, h: lines.length * fs * 1.25 + fs * 0.5 };
    }

    function ballScreenPos(vp, objects, o, sz) {
        var p = toScreen(vp, { x: o.x, y: o.y });
        var attach = o.attach == null ? 1 : o.attach;
        if (o.holder && attach > 0) {
            var h = findById(objects, o.holder);
            if (h) {
                var hp = toScreen(vp, h);
                return { x: hp.x + sz.player * 0.78 * attach, y: hp.y - sz.player * 0.78 * attach };
            }
        }
        return p;
    }

    function drawObject(ctx, vp, o, objects, opts) {
        opts = opts || {};
        var sz = sizes(vp);
        var alpha = o.alpha == null ? 1 : o.alpha;
        if (alpha <= 0.01) return;
        ctx.save();
        ctx.globalAlpha = alpha;
        var p = toScreen(vp, o);
        var sel = opts.selected;

        if (o.kind === "zone") {
            var p1 = toScreen(vp, { x: o.x, y: o.y });
            var p2 = toScreen(vp, { x: o.x + o.w, y: o.y + o.h });
            var x = Math.min(p1.x, p2.x);
            var y = Math.min(p1.y, p2.y);
            var w = Math.abs(p2.x - p1.x);
            var h = Math.abs(p2.y - p1.y);
            roundRect(ctx, x, y, w, h, 8);
            ctx.fillStyle = hexToRgba(o.color, 0.24);
            ctx.fill();
            ctx.setLineDash([6, 4]);
            ctx.lineWidth = sel ? 2.5 : 1.6;
            ctx.strokeStyle = sel ? COLORS.selection : hexToRgba(o.color, 0.9);
            ctx.stroke();
            ctx.setLineDash([]);
        } else if (o.kind === "player") {
            var r = sz.player;
            if (sel) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, r + 5, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(255,152,0,0.35)";
                ctx.fill();
            }
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            if (o.team === "defense") {
                ctx.fillStyle = "#ffffff";
                ctx.fill();
                ctx.lineWidth = Math.max(2.5, r * 0.22);
                ctx.strokeStyle = o.color;
                ctx.stroke();
                ctx.fillStyle = o.color;
            } else {
                ctx.fillStyle = o.color;
                ctx.fill();
                ctx.lineWidth = 1.5;
                ctx.strokeStyle = "rgba(0,0,0,0.35)";
                ctx.stroke();
                ctx.fillStyle = "#ffffff";
            }
            var label = String(o.label || "");
            var fs = Math.round(r * (label.length > 1 ? 0.85 : 1.05));
            ctx.font = "700 " + fs + "px 'Segoe UI', system-ui, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(o.team === "defense" ? (label ? "X" + label : "X") : label, p.x, p.y + 1);
            if (o.name) {
                var nfs = Math.round(clamp(r * 0.62, 9, 13));
                ctx.font = "600 " + nfs + "px 'Segoe UI', system-ui, sans-serif";
                var tw = ctx.measureText(o.name).width + 8;
                roundRect(ctx, p.x - tw / 2, p.y + r + 2, tw, nfs + 5, 4);
                ctx.fillStyle = "rgba(17,24,39,0.82)";
                ctx.fill();
                ctx.fillStyle = "#fff";
                ctx.fillText(o.name, p.x, p.y + r + 2 + (nfs + 5) / 2);
            }
        } else if (o.kind === "ball") {
            var bp = ballScreenPos(vp, objects, o, sz);
            var rb = sz.ball;
            if (sel) {
                ctx.beginPath();
                ctx.arc(bp.x, bp.y, rb + 4, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(255,152,0,0.4)";
                ctx.fill();
            }
            ctx.beginPath();
            ctx.arc(bp.x, bp.y, rb, 0, Math.PI * 2);
            ctx.fillStyle = "#f57c00";
            ctx.fill();
            ctx.lineWidth = 1.4;
            ctx.strokeStyle = "#3b1d06";
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(bp.x - rb, bp.y);
            ctx.lineTo(bp.x + rb, bp.y);
            ctx.moveTo(bp.x, bp.y - rb);
            ctx.lineTo(bp.x, bp.y + rb);
            ctx.stroke();
        } else if (o.kind === "cone") {
            var s = sz.player * 0.85;
            if (sel) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, s + 4, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(255,152,0,0.35)";
                ctx.fill();
            }
            ctx.beginPath();
            ctx.moveTo(p.x, p.y - s);
            ctx.lineTo(p.x + s * 0.8, p.y + s * 0.7);
            ctx.lineTo(p.x - s * 0.8, p.y + s * 0.7);
            ctx.closePath();
            ctx.fillStyle = "#f97316";
            ctx.fill();
            ctx.lineWidth = 1.2;
            ctx.strokeStyle = "#7c2d12";
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(p.x - s * 0.38, p.y);
            ctx.lineTo(p.x + s * 0.38, p.y);
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if (o.kind === "obstacle") {
            var ow = sz.player * 2.3;
            var oh = sz.player * 0.95;
            roundRect(ctx, p.x - ow / 2, p.y - oh / 2, ow, oh, 4);
            ctx.fillStyle = "#475569";
            ctx.fill();
            ctx.lineWidth = sel ? 3 : 1.2;
            ctx.strokeStyle = sel ? COLORS.selection : "#0f172a";
            ctx.stroke();
            ctx.save();
            roundRect(ctx, p.x - ow / 2, p.y - oh / 2, ow, oh, 4);
            ctx.clip();
            ctx.strokeStyle = "#facc15";
            ctx.lineWidth = 3;
            for (var k = -ow; k < ow; k += 9) {
                ctx.beginPath();
                ctx.moveTo(p.x + k, p.y + oh / 2);
                ctx.lineTo(p.x + k + oh, p.y - oh / 2);
                ctx.stroke();
            }
            ctx.restore();
        } else if (o.kind === "text") {
            var m = textMetrics(ctx, vp, o);
            roundRect(ctx, p.x - m.w / 2, p.y - m.h / 2, m.w, m.h, 6);
            ctx.fillStyle = "rgba(255,255,255,0.88)";
            ctx.fill();
            if (sel) {
                ctx.lineWidth = 2;
                ctx.strokeStyle = COLORS.selection;
                ctx.stroke();
            }
            ctx.fillStyle = o.color || "#111827";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            m.lines.forEach(function (line, idx) {
                var ly = p.y - ((m.lines.length - 1) * m.fs * 1.25) / 2 + idx * m.fs * 1.25;
                ctx.fillText(line, p.x, ly);
            });
        }
        ctx.restore();
    }

    var DRAW_ORDER = { zone: 0, obstacle: 1, cone: 2, player: 3, ball: 4, text: 5 };

    function sortedObjects(objects) {
        return objects.slice().sort(function (a, b) { return DRAW_ORDER[a.kind] - DRAW_ORDER[b.kind]; });
    }

    /**
     * Dibuja cancha + escena.
     * scene: { objects, strokes, strokeAlpha }
     * opts: { dpr, selection, preview, handles, phaseLabel }
     */
    function renderScene(ctx, vp, scene, opts) {
        opts = opts || {};
        var dpr = opts.dpr || 1;
        drawCourt(ctx, vp, dpr);
        var objects = scene.objects || [];
        var sel = opts.selection || null;
        var ordered = sortedObjects(objects);
        ordered.forEach(function (o) {
            if (o.kind === "zone") drawObject(ctx, vp, o, objects, { selected: sel && sel.id === o.id });
        });
        (scene.strokes || []).forEach(function (st) {
            drawStroke(ctx, vp, st, { alpha: scene.strokeAlpha == null ? 1 : scene.strokeAlpha, selected: sel && sel.id === st.id });
        });
        if (opts.preview) drawStroke(ctx, vp, opts.preview, { alpha: 0.85 });
        ordered.forEach(function (o) {
            if (o.kind !== "zone") drawObject(ctx, vp, o, objects, { selected: sel && sel.id === o.id });
        });
        if (opts.handles) drawHandles(ctx, opts.handles);
        if (opts.phaseLabel) {
            ctx.save();
            ctx.font = "700 " + Math.round(clamp(vp.width / 38, 12, 22)) + "px 'Segoe UI', system-ui, sans-serif";
            var tw = ctx.measureText(opts.phaseLabel).width + 18;
            var th = Math.round(clamp(vp.width / 38, 12, 22)) + 12;
            roundRect(ctx, 10, 10, tw, th, 8);
            ctx.fillStyle = "rgba(17,24,39,0.85)";
            ctx.fill();
            ctx.fillStyle = "#ffb74d";
            ctx.textBaseline = "middle";
            ctx.fillText(opts.phaseLabel, 19, 10 + th / 2);
            ctx.restore();
        }
    }

    function drawHandles(ctx, handles) {
        handles.forEach(function (h) {
            ctx.save();
            ctx.beginPath();
            if (h.shape === "diamond") {
                ctx.moveTo(h.x, h.y - 8);
                ctx.lineTo(h.x + 8, h.y);
                ctx.lineTo(h.x, h.y + 8);
                ctx.lineTo(h.x - 8, h.y);
                ctx.closePath();
            } else {
                ctx.arc(h.x, h.y, 7, 0, Math.PI * 2);
            }
            ctx.fillStyle = "#fff";
            ctx.fill();
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = COLORS.selection;
            ctx.stroke();
            ctx.restore();
        });
    }

    /** Imagen de una fase (para miniaturas, PDF y exportación PNG). */
    function renderPhaseImage(doc, index, options) {
        options = options || {};
        if (typeof document === "undefined") return "";
        var view = doc.view || { court: "half", rotation: 90 };
        var width = options.width || 960;
        var aspect = viewAspect(view);
        var height = Math.round(width / aspect);
        var canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext("2d");
        var vp = computeViewport(view, width, height, Math.round(width * 0.01));
        var phase = doc.phases[clamp(index, 0, doc.phases.length - 1)];
        var label = options.label === false ? null : options.label || (doc.phases.length > 1 ? (index + 1) + ". " + (phase.name || "Fase") : null);
        renderScene(ctx, vp, { objects: phase.objects, strokes: phase.strokes }, { phaseLabel: label });
        var type = options.type || "image/png";
        return canvas.toDataURL(type, options.quality || 0.85);
    }

    function loadImage(src) {
        return new Promise(function (resolve) {
            var img = new Image();
            img.onload = function () { resolve(img); };
            img.onerror = function () { resolve(null); };
            img.src = src;
        });
    }

    /** Une varias imágenes en una lámina PNG con título. */
    function composeSheet(urls, title, subtitle) {
        return Promise.all(urls.map(loadImage)).then(function (imgs) {
            imgs = imgs.filter(Boolean);
            if (!imgs.length) return "";
            var cols = imgs.length === 1 ? 1 : 2;
            var cellW = 900;
            var cellH = Math.round(cellW * (imgs[0].height / imgs[0].width));
            var gap = 28;
            var headH = 120;
            var rows = Math.ceil(imgs.length / cols);
            var W = cols * cellW + (cols + 1) * gap;
            var H = headH + rows * (cellH + gap) + gap;
            var canvas = document.createElement("canvas");
            canvas.width = W;
            canvas.height = H;
            var ctx = canvas.getContext("2d");
            ctx.fillStyle = "#12121a";
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = "#ff9800";
            ctx.fillRect(0, 0, W, 6);
            ctx.fillStyle = "#ffffff";
            ctx.font = "700 44px 'Segoe UI', system-ui, sans-serif";
            ctx.textBaseline = "top";
            ctx.fillText(title || "Jugada", gap, 30);
            ctx.fillStyle = "#9a9aa8";
            ctx.font = "500 22px 'Segoe UI', system-ui, sans-serif";
            ctx.fillText(subtitle || "Basket Lab · Pizarra táctica", gap, 84);
            imgs.forEach(function (img, i) {
                var cx = gap + (i % cols) * (cellW + gap);
                var cy = headH + Math.floor(i / cols) * (cellH + gap);
                ctx.drawImage(img, cx, cy, cellW, cellH);
            });
            return canvas.toDataURL("image/png");
        });
    }

    function downloadDataUrl(dataUrl, filename) {
        if (!dataUrl) return;
        var a = document.createElement("a");
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { a.remove(); }, 0);
    }

    function safeFilename(name) {
        return String(name || "jugada")
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .replace(/[^a-zA-Z0-9-_ ]/g, "")
            .trim()
            .replace(/\s+/g, "-")
            .toLowerCase() || "jugada";
    }

    // =====================================================================
    // PLANTILLAS (diseños originales de BasketIQ)
    // =====================================================================

    var SPOTS = {
        top: { x: 8.9, y: 7.5 },
        wingL: { x: 6.7, y: 2.0 },
        wingR: { x: 6.7, y: 13.0 },
        cornerL: { x: 1.1, y: 0.45 },
        cornerR: { x: 1.1, y: 14.55 },
        slotL: { x: 8.3, y: 4.6 },
        slotR: { x: 8.3, y: 10.4 },
        blockL: { x: 2.4, y: 4.6 },
        blockR: { x: 2.4, y: 10.4 },
        elbowL: { x: 5.9, y: 5.0 },
        elbowR: { x: 5.9, y: 10.0 },
        highPost: { x: 5.9, y: 7.5 }
    };

    function towardBasket(p, d) {
        var bx = FIBA.basketX;
        var by = FIBA.width / 2;
        var len = Math.hypot(bx - p.x, by - p.y) || 1;
        return { x: p.x + ((bx - p.x) / len) * d, y: p.y + ((by - p.y) / len) * d };
    }

    function offenseSet(spots) {
        return spots.map(function (s, i) { return makePlayer("offense", i + 1, s.x, s.y); });
    }

    function defenseOn(offense) {
        return offense.map(function (o) {
            var p = towardBasket(o, 1.3);
            return makePlayer("defense", o.label, p.x, p.y);
        });
    }

    function stroke(type, from, to, b, c) {
        var a = { x: from.x, y: from.y };
        return { id: uid(), type: type, a: a, b: b || { x: to.x, y: to.y }, c: c || null, from: from.id || null, to: to && to.id && !b ? to.id : null, color: null };
    }

    function ballFor(holder) {
        return { id: uid(), kind: "ball", x: holder.x, y: holder.y, holder: holder.id };
    }

    var TEMPLATES = [
        {
            id: "empty_half",
            name: "Media cancha vacía",
            description: "Empezar de cero en media cancha.",
            build: function () { return createEmptyDoc({ court: "half", rotation: 90 }); }
        },
        {
            id: "empty_full",
            name: "Cancha completa vacía",
            description: "Para transiciones, presión y contraataques.",
            build: function () { return createEmptyDoc({ court: "full", rotation: 0 }); }
        },
        {
            id: "five_out",
            name: "5 abiertos (5 out)",
            description: "Base, aleros y esquinas ocupados. Pintura libre para penetrar y cortar.",
            build: function () {
                var doc = createEmptyDoc({ court: "half", rotation: 90 });
                var off = offenseSet([SPOTS.top, SPOTS.wingL, SPOTS.wingR, SPOTS.cornerL, SPOTS.cornerR]);
                var ph = doc.phases[0];
                ph.name = "Ocupación inicial";
                ph.objects = off.concat(defenseOn(off), [ballFor(off[0])]);
                return doc;
            }
        },
        {
            id: "four_out_one_in",
            name: "4 abiertos 1 adentro",
            description: "Cuatro exteriores y un interior en el poste bajo.",
            build: function () {
                var doc = createEmptyDoc({ court: "half", rotation: 90 });
                var off = offenseSet([SPOTS.slotL, SPOTS.slotR, SPOTS.cornerL, SPOTS.cornerR, SPOTS.blockL]);
                var ph = doc.phases[0];
                ph.name = "Ocupación inicial";
                ph.objects = off.concat(defenseOn(off), [ballFor(off[0])]);
                return doc;
            }
        },
        {
            id: "pick_and_roll",
            name: "Pick and roll central",
            description: "Bloqueo directo en el centro, continuación y pase al bloqueador. Tres fases.",
            build: function () {
                var doc = createEmptyDoc({ court: "half", rotation: 90 });
                var p1 = makePlayer("offense", 1, 9.3, 7.5);
                var p2 = makePlayer("offense", 2, SPOTS.cornerL.x, SPOTS.cornerL.y);
                var p3 = makePlayer("offense", 3, SPOTS.cornerR.x, SPOTS.cornerR.y);
                var p4 = makePlayer("offense", 4, SPOTS.wingL.x, SPOTS.wingL.y);
                var p5 = makePlayer("offense", 5, SPOTS.elbowR.x, SPOTS.elbowR.y);
                var off = [p1, p2, p3, p4, p5];
                var def = defenseOn(off);
                def[0].x = 8.1;
                def[0].y = 7.5;
                var ph = doc.phases[0];
                ph.name = "Bloqueo directo";
                ph.note = "El 5 sube a bloquear al defensor del 1. El 1 espera el bloqueo antes de salir.";
                ph.objects = off.concat(def, [ballFor(p1)]);
                ph.strokes = [stroke("screen_on", p5, null, { x: 8.3, y: 8.4 })];
                var ph2 = deriveNextPhase(ph, 0);
                ph2.name = "Salida del bloqueo y continuación";
                ph2.note = "El 1 sale con dribbling pegado al bloqueador; el 5 continúa hacia el aro.";
                var q1 = findById(ph2.objects, p1.id);
                var q5 = findById(ph2.objects, p5.id);
                ph2.strokes = [
                    stroke("dribble", q1, null, { x: 6.4, y: 11.2 }, { x: 8.8, y: 10.6 }),
                    stroke("move", q5, null, { x: 2.6, y: 8.2 }, { x: 5.4, y: 7.4 })
                ];
                var ph3 = deriveNextPhase(ph2, 1);
                ph3.name = "Pase al bloqueador";
                ph3.note = "Si la defensa del bloqueador sale a la ayuda, el pase al 5 en la continuación genera ventaja.";
                var r1 = findById(ph3.objects, p1.id);
                var r5 = findById(ph3.objects, p5.id);
                ph3.strokes = [stroke("pass", r1, r5)];
                var ph4 = deriveNextPhase(ph3, 2);
                ph4.name = "Finalización";
                var s5 = findById(ph4.objects, p5.id);
                ph4.strokes = [stroke("shot", s5, null, { x: FIBA.basketX, y: FIBA.width / 2 })];
                doc.phases = [ph, ph2, ph3, ph4];
                return doc;
            }
        },
        {
            id: "zone_23",
            name: "Zona 2-3 (posición inicial)",
            description: "Defensa zonal 2-3 frente a un ataque 1-3-1.",
            build: function () {
                var doc = createEmptyDoc({ court: "half", rotation: 90 });
                var off = offenseSet([SPOTS.top, SPOTS.wingL, SPOTS.wingR, SPOTS.highPost, { x: 1.6, y: 3.2 }]);
                var def = [
                    makePlayer("defense", 1, 6.6, 5.7),
                    makePlayer("defense", 2, 6.6, 9.3),
                    makePlayer("defense", 3, 2.9, 3.6),
                    makePlayer("defense", 4, 2.9, 11.4),
                    makePlayer("defense", 5, 2.4, 7.5)
                ];
                var ph = doc.phases[0];
                ph.name = "Posición inicial";
                ph.note = "Dos defensores arriba y tres abajo. Plantilla orientativa: el ajuste depende del criterio de cada entrenador.";
                ph.objects = off.concat(def, [ballFor(off[0])]);
                return doc;
            }
        },
        {
            id: "blob_box",
            name: "Saque de fondo en caja",
            description: "Cuatro jugadores en caja alrededor de la zona y sacador en la línea de fondo.",
            build: function () {
                var doc = createEmptyDoc({ court: "half", rotation: 90 });
                var inb = makePlayer("offense", 1, -0.5, 4.2);
                var b2 = makePlayer("offense", 2, SPOTS.blockL.x, SPOTS.blockL.y - 0.4);
                var b3 = makePlayer("offense", 3, SPOTS.blockR.x, SPOTS.blockR.y + 0.4);
                var e4 = makePlayer("offense", 4, SPOTS.elbowL.x, SPOTS.elbowL.y - 0.4);
                var e5 = makePlayer("offense", 5, SPOTS.elbowR.x, SPOTS.elbowR.y + 0.4);
                var ph = doc.phases[0];
                ph.name = "Caja";
                ph.objects = [inb, b2, b3, e4, e5, ballFor(inb)];
                ph.strokes = [
                    stroke("screen_off", e4, null, { x: 3.3, y: 4.2 }),
                    stroke("cut", b2, null, { x: 6.7, y: 2.6 }, { x: 4.6, y: 2.4 })
                ];
                return doc;
            }
        },
        {
            id: "three_vs_two",
            name: "Contraataque 3 contra 2",
            description: "Tres atacantes en carriles contra dos defensores en tándem.",
            build: function () {
                var doc = createEmptyDoc({ court: "full", rotation: 0 });
                var p1 = makePlayer("offense", 1, 19.5, 7.5);
                var p2 = makePlayer("offense", 2, 20.5, 2.4);
                var p3 = makePlayer("offense", 3, 20.5, 12.6);
                var d1 = makePlayer("defense", 1, 8.2, 7.5);
                var d2 = makePlayer("defense", 2, 3.6, 7.5);
                var ph = doc.phases[0];
                ph.name = "Carriles";
                ph.note = "El balón por el centro y los aleros abiertos por los carriles laterales.";
                ph.objects = [p1, p2, p3, d1, d2, ballFor(p1)];
                ph.strokes = [
                    stroke("dribble", p1, null, { x: 9.8, y: 7.5 }),
                    stroke("move", p2, null, { x: 4.2, y: 1.8 }, { x: 11, y: 1.6 }),
                    stroke("move", p3, null, { x: 4.2, y: 13.2 }, { x: 11, y: 13.4 })
                ];
                var ph2 = deriveNextPhase(ph, 0);
                ph2.name = "Fijar y pasar";
                ph2.note = "El 1 fija al primer defensor antes de pasar al lado débil del segundo.";
                var q1 = findById(ph2.objects, p1.id);
                var q2 = findById(ph2.objects, p2.id);
                var e1 = findById(ph2.objects, d1.id);
                e1.x = 7.6;
                e1.y = 7.5;
                ph2.strokes = [stroke("pass", q1, q2)];
                doc.phases = [ph, ph2];
                return doc;
            }
        },
        {
            id: "cones_zigzag",
            name: "Dribbling en zigzag con conos",
            description: "Circuito de conos para cambios de dirección con balón.",
            build: function () {
                var doc = createEmptyDoc({ court: "half", rotation: 90 });
                var ph = doc.phases[0];
                ph.name = "Circuito";
                var cones = [
                    { x: 12.5, y: 4 }, { x: 10.5, y: 8 }, { x: 8.5, y: 4 }, { x: 6.5, y: 8 }, { x: 4.5, y: 4 }
                ];
                var player = makePlayer("offense", 1, 13.5, 8);
                ph.objects = cones.map(function (c) { return { id: uid(), kind: "cone", x: c.x, y: c.y }; });
                ph.objects.push(player, ballFor(player));
                ph.strokes = [stroke("dribble", player, null, { x: 11.5, y: 5.2 }, { x: 13.8, y: 5.4 })];
                ph.objects.push({ id: uid(), kind: "text", x: 10.5, y: 12.2, text: "Cambio de mano en cada cono", size: "s", color: "#111827" });
                return doc;
            }
        }
    ];

    function buildTemplate(id) {
        for (var i = 0; i < TEMPLATES.length; i++) {
            if (TEMPLATES[i].id === id) return normalizeDoc(TEMPLATES[i].build());
        }
        return null;
    }

    // =====================================================================
    // ICONOS
    // =====================================================================

    function svg(inner, vb) {
        return '<svg viewBox="' + (vb || "0 0 24 24") + '" width="22" height="22" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + inner + "</svg>";
    }

    var ICONS = {
        select: svg('<path d="M5 3l14 8-6 2-3 6z" fill="currentColor" stroke="none"/>'),
        offense: svg('<circle cx="12" cy="12" r="8" fill="#1d4ed8" stroke="none"/><text x="12" y="16" text-anchor="middle" font-size="11" font-weight="700" fill="#fff" stroke="none" font-family="sans-serif">1</text>'),
        defense: svg('<circle cx="12" cy="12" r="7.5" stroke="#dc2626" stroke-width="2.5" fill="#fff"/><text x="12" y="15.5" text-anchor="middle" font-size="9" font-weight="700" fill="#dc2626" stroke="none" font-family="sans-serif">X</text>'),
        ball: svg('<circle cx="12" cy="12" r="8" fill="#f57c00" stroke="#3b1d06" stroke-width="1.4"/><path d="M4 12h16M12 4v16" stroke="#3b1d06" stroke-width="1.4"/>'),
        cone: svg('<path d="M12 4l6 15H6z" fill="#f97316" stroke="#7c2d12" stroke-width="1.2"/><path d="M9 13h6" stroke="#fff" stroke-width="2"/>'),
        obstacle: svg('<rect x="3" y="8" width="18" height="8" rx="2" fill="#475569" stroke="none"/><path d="M6 16l5-8M11 16l5-8M16 16l4-6" stroke="#facc15" stroke-width="2"/>'),
        zone: svg('<rect x="3" y="5" width="18" height="14" rx="3" fill="rgba(249,115,22,.3)" stroke="#f97316" stroke-dasharray="3 2"/>'),
        text: svg('<path d="M5 6h14M12 6v13M9 19h6"/>'),
        move: svg('<path d="M3 19L17 6"/><path d="M12 5h6v6" />'),
        cut: svg('<path d="M3 20L17 6" stroke-width="2.8"/><path d="M11 5h7v7"/><path d="M8 8h7v7" opacity=".7"/>'),
        pass: svg('<path d="M3 19L17 6" stroke-dasharray="3 3"/><path d="M12 5h6v6"/>'),
        dribble: svg('<path d="M3 18c2-4 4 2 6-2s4 2 6-2 2-3 3-5"/><path d="M14 6h5v5"/>'),
        screen_on: svg('<path d="M4 20L16 8"/><path d="M12 4l8 8M10 6.5l7.5 7.5" stroke-width="2.4"/>'),
        screen_off: svg('<path d="M4 20L16 8"/><path d="M12 4l8 8" stroke-width="2.4"/>'),
        rotation: svg('<path d="M3 19L17 6" stroke="#dc2626" stroke-dasharray="0.5 3.5" stroke-width="2.6"/><path d="M12 5h6v6" stroke="#dc2626"/>'),
        shot: svg('<path d="M3 17L15 7M5 19L17 9" stroke-width="1.6"/><path d="M13 4h7v7"/>'),
        arrow: svg('<path d="M4 18C6 8 12 5 19 6" stroke="#ea580c"/><path d="M14 3l5 3-3 5" stroke="#ea580c"/>'),
        free: svg('<path d="M3 17c3-6 5 2 8-3s4-6 7-4 2 6-1 7"/>'),
        undo: svg('<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/>'),
        redo: svg('<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 000 12h3"/>'),
        trash: svg('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
        copy: svg('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3"/>'),
        play: svg('<path d="M7 4l13 8-13 8z" fill="currentColor" stroke="none"/>'),
        pause: svg('<path d="M7 4h4v16H7zM14 4h4v16h-4z" fill="currentColor" stroke="none"/>'),
        prev: svg('<path d="M18 5L8 12l10 7z" fill="currentColor" stroke="none"/><path d="M6 5v14"/>'),
        next: svg('<path d="M6 5l10 7-10 7z" fill="currentColor" stroke="none"/><path d="M18 5v14"/>'),
        restart: svg('<path d="M4 12a8 8 0 108-8"/><path d="M4 4v5h5"/>'),
        rotate: svg('<path d="M20 12a8 8 0 11-3-6.2"/><path d="M20 4v5h-5"/>'),
        court: svg('<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M12 5v14"/><circle cx="12" cy="12" r="2.5"/>'),
        expand: svg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
        collapse: svg('<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>'),
        save: svg('<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/>'),
        template: svg('<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>'),
        more: svg('<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>'),
        help: svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 015 .5c0 2-2.5 2-2.5 4"/><circle cx="12" cy="17" r=".6" fill="currentColor"/>'),
        plus: svg('<path d="M12 5v14M5 12h14"/>'),
        left: svg('<path d="M15 5l-7 7 7 7"/>'),
        right: svg('<path d="M9 5l7 7-7 7"/>'),
        image: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>'),
        pdf: svg('<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 14h6M9 17h4"/>'),
        newdoc: svg('<path d="M6 3h9l4 4v14H6z"/><path d="M12 10v6M9 13h6"/>'),
        legend: svg('<path d="M4 6h3M10 6h10M4 12h3M10 12h10M4 18h3M10 18h10"/>'),
        close: svg('<path d="M6 6l12 12M18 6L6 18"/>')
    };

    // =====================================================================
    // EDITOR (solo navegador)
    // =====================================================================

    var DRAFT_KEY = "basketLab_boardDraft";
    var TUTORIAL_KEY = "basketLab_boardTutorialDone";
    var activeInstance = null;

    function storageGet(key) {
        try { return window.localStorage.getItem(key); } catch (e) { return null; }
    }
    function storageSet(key, value) {
        try { window.localStorage.setItem(key, value); return true; } catch (e) { return false; }
    }
    function storageRemove(key) {
        try { window.localStorage.removeItem(key); } catch (e) { /* no-op */ }
    }

    function mount(container, options) {
        if (activeInstance) activeInstance.destroy();
        var inst = createEditor(container, options || {});
        activeInstance = inst;
        return inst;
    }

    function createEditor(container, options) {
        var userId = options.userId || "guest";
        var draftKey = DRAFT_KEY + "__" + userId;

        var state = {
            doc: null,
            phaseIndex: 0,
            mode: "edit",
            tool: "select",
            selection: null,
            drag: null,
            undo: [],
            redo: [],
            committed: "",
            dirty: false,
            meta: { playId: null, name: "", description: "", category: "", team: "", tags: [] },
            pos: 0,
            playing: false,
            target: null,
            hold: 0,
            speed: 1,
            showStrokes: true,
            fullscreen: false,
            vp: null,
            dpr: 1,
            destroyed: false
        };

        // -------------------------------------------------------------
        // DOM
        // -------------------------------------------------------------
        var root = document.createElement("section");
        root.className = "tb";
        root.innerHTML = buildShellHtml();
        container.appendChild(root);

        var $ = function (sel) { return root.querySelector(sel); };
        var canvas = $(".tb-canvas");
        var ctx = canvas.getContext("2d");
        var stage = $(".tb-stage");

        function buildShellHtml() {
            var tools = '<div class="tb-toolgroup" role="group" aria-label="Selección">' +
                toolBtn("select", "Seleccionar y mover", "V") +
                "</div>" +
                '<div class="tb-toolgroup" role="group" aria-label="Elementos">' +
                Object.keys(ELEMENT_TOOLS).map(function (k) {
                    return toolBtn(k, ELEMENT_TOOLS[k].label, ELEMENT_TOOLS[k].key.toUpperCase());
                }).join("") +
                "</div>" +
                '<div class="tb-toolgroup" role="group" aria-label="Trazos">' +
                STROKE_ORDER.map(function (k) {
                    return toolBtn(k, STROKE_TYPES[k].label, STROKE_TYPES[k].key.toUpperCase());
                }).join("") +
                "</div>" +
                '<div class="tb-toolgroup tb-toolgroup--history" role="group" aria-label="Historial">' +
                '<button type="button" class="tb-tool" data-action="undo" title="Deshacer (Ctrl+Z)" aria-label="Deshacer">' + ICONS.undo + '<span class="tb-tool-label">Deshacer</span></button>' +
                '<button type="button" class="tb-tool" data-action="redo" title="Rehacer (Ctrl+Y)" aria-label="Rehacer">' + ICONS.redo + '<span class="tb-tool-label">Rehacer</span></button>' +
                "</div>";

            return (
                '<header class="tb-head">' +
                '  <div class="tb-title-wrap">' +
                '    <p class="tb-eyebrow">Pizarra táctica</p>' +
                '    <h2 class="tb-title"><span class="tb-title-text">Jugada nueva</span><span class="tb-dirty" hidden>· sin guardar</span></h2>' +
                "  </div>" +
                '  <div class="tb-mode" role="tablist" aria-label="Modo">' +
                '    <button type="button" role="tab" class="tb-mode-btn is-active" data-mode="edit" aria-selected="true">Editar</button>' +
                '    <button type="button" role="tab" class="tb-mode-btn" data-mode="play" aria-selected="false">' + ICONS.play + " Reproducir</button>" +
                "  </div>" +
                '  <div class="tb-actions">' +
                '    <button type="button" class="tb-btn" data-action="templates" title="Plantillas">' + ICONS.template + '<span>Plantillas</span></button>' +
                '    <button type="button" class="tb-btn tb-btn--accent" data-action="save" title="Guardar jugada (Ctrl+S)">' + ICONS.save + '<span>Guardar</span></button>' +
                '    <div class="tb-menu-wrap">' +
                '      <button type="button" class="tb-btn tb-btn--icon" data-action="menu" aria-haspopup="true" aria-expanded="false" title="Más opciones" aria-label="Más opciones">' + ICONS.more + "</button>" +
                '      <div class="tb-menu" role="menu" hidden>' +
                '        <button type="button" role="menuitem" data-action="new">' + ICONS.newdoc + " Nueva jugada</button>" +
                '        <button type="button" role="menuitem" data-action="save-copy">' + ICONS.copy + " Guardar como copia</button>" +
                '        <button type="button" role="menuitem" data-action="export-png">' + ICONS.image + " Exportar fase actual (PNG)</button>" +
                '        <button type="button" role="menuitem" data-action="export-sheet">' + ICONS.image + " Exportar todas las fases (PNG)</button>" +
                '        <button type="button" role="menuitem" data-action="export-pdf">' + ICONS.pdf + " Exportar PDF</button>" +
                '        <button type="button" role="menuitem" data-action="clear-phase">' + ICONS.trash + " Vaciar fase actual</button>" +
                '        <button type="button" role="menuitem" data-action="library">' + ICONS.legend + " Ir a Jugadas guardadas</button>" +
                '        <button type="button" role="menuitem" data-action="tutorial">' + ICONS.help + " Ver tutorial</button>" +
                '        <button type="button" role="menuitem" data-action="shortcuts">' + ICONS.help + " Atajos de teclado</button>" +
                "      </div>" +
                "    </div>" +
                "  </div>" +
                "</header>" +
                '<div class="tb-draft" hidden></div>' +
                '<div class="tb-body">' +
                '  <nav class="tb-tools" aria-label="Herramientas">' + tools + "</nav>" +
                '  <div class="tb-main">' +
                '    <div class="tb-viewbar">' +
                '      <div class="tb-hint" aria-live="polite"></div>' +
                '      <div class="tb-viewbar-actions">' +
                '        <button type="button" class="tb-chip" data-action="court" title="Alternar media cancha / cancha completa">' + ICONS.court + '<span class="tb-court-label">Media cancha</span></button>' +
                '        <button type="button" class="tb-chip" data-action="rotate" title="Girar la cancha 90°">' + ICONS.rotate + "<span>Girar</span></button>" +
                '        <button type="button" class="tb-chip" data-action="toggle-strokes" title="Mostrar u ocultar flechas" hidden>' + ICONS.legend + '<span>Flechas</span></button>' +
                '        <button type="button" class="tb-chip" data-action="fullscreen" title="Pantalla completa" aria-label="Pantalla completa">' + ICONS.expand + "</button>" +
                "      </div>" +
                "    </div>" +
                '    <div class="tb-stage"><canvas class="tb-canvas" aria-label="Cancha de básquet"></canvas>' +
                '      <div class="tb-stage-caption" hidden></div>' +
                "    </div>" +
                '    <div class="tb-timeline">' +
                '      <div class="tb-player" hidden>' +
                '        <button type="button" class="tb-pbtn" data-action="restart" title="Reiniciar" aria-label="Reiniciar">' + ICONS.restart + "</button>" +
                '        <button type="button" class="tb-pbtn" data-action="step-back" title="Fase anterior (←)" aria-label="Fase anterior">' + ICONS.prev + "</button>" +
                '        <button type="button" class="tb-pbtn tb-pbtn--main" data-action="toggle-play" title="Reproducir / pausar (Espacio)" aria-label="Reproducir">' + ICONS.play + "</button>" +
                '        <button type="button" class="tb-pbtn" data-action="step-forward" title="Fase siguiente (→)" aria-label="Fase siguiente">' + ICONS.next + "</button>" +
                '        <input type="range" class="tb-scrub" min="0" max="0" step="0.001" value="0" aria-label="Línea de tiempo">' +
                '        <label class="tb-speed"><span class="sr-only">Velocidad</span><select data-role="speed" aria-label="Velocidad">' +
                '          <option value="0.5">0,5×</option><option value="1" selected>1×</option><option value="1.5">1,5×</option><option value="2">2×</option>' +
                "        </select></label>" +
                "      </div>" +
                '      <div class="tb-phases" role="list"></div>' +
                '      <div class="tb-phase-actions">' +
                '        <button type="button" class="tb-btn tb-btn--small tb-btn--accent" data-action="phase-next" title="Crea la fase siguiente aplicando los movimientos dibujados">' + ICONS.plus + "<span>Fase siguiente</span></button>" +
                '        <button type="button" class="tb-btn tb-btn--small" data-action="phase-dup" title="Duplicar la fase actual">' + ICONS.copy + "<span>Duplicar</span></button>" +
                '        <button type="button" class="tb-btn tb-btn--small tb-btn--icon" data-action="phase-left" title="Mover fase a la izquierda" aria-label="Mover fase a la izquierda">' + ICONS.left + "</button>" +
                '        <button type="button" class="tb-btn tb-btn--small tb-btn--icon" data-action="phase-right" title="Mover fase a la derecha" aria-label="Mover fase a la derecha">' + ICONS.right + "</button>" +
                '        <button type="button" class="tb-btn tb-btn--small tb-btn--icon tb-btn--danger" data-action="phase-del" title="Eliminar fase" aria-label="Eliminar fase">' + ICONS.trash + "</button>" +
                "      </div>" +
                "    </div>" +
                "  </div>" +
                '  <aside class="tb-side">' +
                '    <section class="tb-panel tb-props" aria-label="Propiedades"></section>' +
                '    <section class="tb-panel tb-phase-panel" aria-label="Fase"></section>' +
                '    <details class="tb-panel tb-legend"' + ((typeof window !== "undefined" && window.innerWidth >= 1100) ? " open" : "") + '><summary>' + ICONS.legend + " Leyenda</summary><div class=\"tb-legend-list\"></div></details>" +
                "  </aside>" +
                "</div>" +
                '<div class="tb-toast" role="status" aria-live="polite" hidden></div>'
            );
        }

        function toolBtn(id, label, key) {
            return '<button type="button" class="tb-tool" data-tool="' + id + '" title="' + escapeHtml(label) + " (" + key + ')" aria-label="' + escapeHtml(label) + '" aria-pressed="false">' +
                (ICONS[id] || "") + '<span class="tb-tool-label">' + escapeHtml(STROKE_TYPES[id] ? STROKE_TYPES[id].short : ELEMENT_TOOLS[id] ? ELEMENT_TOOLS[id].label : "Selección") + "</span></button>";
        }

        // Leyenda
        $(".tb-legend-list").innerHTML = STROKE_ORDER.map(function (k) {
            return '<div class="tb-legend-item"><span class="tb-legend-icon">' + ICONS[k] + '</span><div><strong>' + escapeHtml(STROKE_TYPES[k].label) +
                " <kbd>" + STROKE_TYPES[k].key.toUpperCase() + "</kbd></strong><p>" + escapeHtml(STROKE_TYPES[k].help) + "</p></div></div>";
        }).join("") +
            '<div class="tb-legend-item"><span class="tb-legend-icon">' + ICONS.offense + '</span><div><strong>Atacante</strong><p>Círculo lleno con número.</p></div></div>' +
            '<div class="tb-legend-item"><span class="tb-legend-icon">' + ICONS.defense + '</span><div><strong>Defensor</strong><p>Círculo con borde y X.</p></div></div>';

        // -------------------------------------------------------------
        // DOCUMENTO E HISTORIAL
        // -------------------------------------------------------------

        function phase() {
            return state.doc.phases[state.phaseIndex];
        }

        function snapshot() {
            return JSON.stringify({ doc: state.doc, phaseIndex: state.phaseIndex });
        }

        function setDoc(doc, meta, opts) {
            state.doc = normalizeDoc(doc);
            state.phaseIndex = 0;
            state.selection = null;
            state.undo = [];
            state.redo = [];
            state.committed = snapshot();
            state.pos = 0;
            state.playing = false;
            state.meta = {
                playId: meta && meta.playId != null ? meta.playId : null,
                name: (meta && meta.name) || "",
                description: (meta && meta.description) || "",
                category: (meta && meta.category) || "",
                team: (meta && meta.team) || "",
                tags: (meta && Array.isArray(meta.tags)) ? meta.tags.slice() : []
            };
            state.dirty = !!(opts && opts.dirty);
            refreshAll();
        }

        function commit() {
            var now = snapshot();
            if (now === state.committed) return;
            state.undo.push(state.committed);
            if (state.undo.length > 120) state.undo.shift();
            state.redo = [];
            state.committed = now;
            markDirty();
            refreshAfterChange();
        }

        function markDirty() {
            state.dirty = true;
            scheduleDraft();
            updateHeader();
        }

        function restore(snap) {
            var parsed = JSON.parse(snap);
            state.doc = parsed.doc;
            state.phaseIndex = clamp(parsed.phaseIndex || 0, 0, state.doc.phases.length - 1);
            state.selection = null;
            state.committed = snap;
        }

        function undo() {
            if (!state.undo.length) return;
            state.redo.push(state.committed);
            restore(state.undo.pop());
            markDirty();
            refreshAll();
        }

        function redo() {
            if (!state.redo.length) return;
            state.undo.push(state.committed);
            restore(state.redo.pop());
            markDirty();
            refreshAll();
        }

        // -------------------------------------------------------------
        // BORRADOR AUTOMÁTICO
        // -------------------------------------------------------------
        var draftTimer = null;
        function scheduleDraft() {
            if (draftTimer) clearTimeout(draftTimer);
            draftTimer = setTimeout(saveDraft, 700);
        }
        function saveDraft() {
            draftTimer = null;
            if (!state.dirty) return;
            storageSet(draftKey, JSON.stringify({ doc: state.doc, meta: state.meta, savedAt: new Date().toISOString() }));
        }
        function clearDraft() {
            if (draftTimer) clearTimeout(draftTimer);
            draftTimer = null;
            storageRemove(draftKey);
        }
        function readDraft() {
            var raw = storageGet(draftKey);
            if (!raw) return null;
            try {
                var d = JSON.parse(raw);
                if (!d || !d.doc || !Array.isArray(d.doc.phases)) return null;
                var hasContent = d.doc.phases.some(function (p) {
                    return (p.objects && p.objects.length) || (p.strokes && p.strokes.length);
                });
                return hasContent ? d : null;
            } catch (e) {
                return null;
            }
        }

        function showDraftBanner(draft) {
            var el = $(".tb-draft");
            var when = "";
            try {
                when = new Date(draft.savedAt).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
            } catch (e) { when = ""; }
            var name = draft.meta && draft.meta.name ? "«" + escapeHtml(draft.meta.name) + "»" : "una jugada";
            el.innerHTML = "<span>Tenés cambios sin guardar en " + name + (when ? " (" + escapeHtml(when) + ")" : "") + ".</span>" +
                '<span class="tb-draft-actions"><button type="button" class="tb-btn tb-btn--small tb-btn--accent" data-action="draft-restore">Recuperar</button>' +
                '<button type="button" class="tb-btn tb-btn--small" data-action="draft-discard">Descartar</button></span>';
            el.hidden = false;
            el._draft = draft;
        }

        // -------------------------------------------------------------
        // TAMAÑO Y RENDER
        // -------------------------------------------------------------
        var renderQueued = false;
        function requestRender() {
            if (renderQueued || state.destroyed) return;
            renderQueued = true;
            window.requestAnimationFrame(function () {
                renderQueued = false;
                render();
            });
        }

        function layout() {
            if (state.destroyed) return;
            var width = stage.clientWidth || 600;
            var aspect = viewAspect(state.doc.view);
            var rect = stage.getBoundingClientRect();
            var viewportH = window.innerHeight || 800;
            var maxH;
            if (state.fullscreen) {
                maxH = Math.max(240, viewportH - rect.top - ($(".tb-timeline").offsetHeight || 0) - 12);
            } else {
                maxH = Math.max(300, Math.min(viewportH - 250, 900));
            }
            var height = Math.min(Math.round(width / aspect), maxH);
            height = Math.max(height, 220);
            stage.style.height = height + "px";
            state.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
            canvas.width = Math.round(width * state.dpr);
            canvas.height = Math.round(height * state.dpr);
            canvas.style.width = width + "px";
            canvas.style.height = height + "px";
            state.vp = computeViewport(state.doc.view, width, height, 6);
            render();
        }

        function currentScene() {
            if (state.mode === "play") {
                var f = sampleFrame(state.doc, state.pos);
                return { objects: f.objects, strokes: state.showStrokes ? f.strokes : [], strokeAlpha: f.strokeAlpha };
            }
            return { objects: phase().objects, strokes: phase().strokes, strokeAlpha: 1 };
        }

        function render() {
            if (state.destroyed || !state.vp) return;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            var scene = currentScene();
            var preview = null;
            if (state.drag && state.drag.type === "draw" && state.drag.path.length > 1) {
                var fit = fitStroke(state.drag.strokeType, state.drag.path);
                preview = { id: "_preview", type: state.drag.strokeType, a: fit.a, b: fit.b, c: fit.c, pts: fit.pts, from: state.drag.from, to: null, color: null };
            }
            renderScene(ctx, state.vp, scene, {
                dpr: state.dpr,
                selection: state.mode === "edit" ? state.selection : null,
                preview: preview,
                handles: state.mode === "edit" ? selectionHandles() : null
            });
            if (state.drag && state.drag.type === "zone" && state.drag.cur) {
                ctx.save();
                var p1 = toScreen(state.vp, state.drag.start);
                var p2 = toScreen(state.vp, state.drag.cur);
                ctx.setLineDash([6, 4]);
                ctx.strokeStyle = COLORS.selection;
                ctx.lineWidth = 2;
                ctx.strokeRect(Math.min(p1.x, p2.x), Math.min(p1.y, p2.y), Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
                ctx.restore();
            }
        }

        // -------------------------------------------------------------
        // SELECCIÓN Y HIT TEST
        // -------------------------------------------------------------

        function selectedItem() {
            var sel = state.selection;
            if (!sel) return null;
            var ph = phase();
            if (sel.kind === "object") return findById(ph.objects, sel.id);
            return findById(ph.strokes, sel.id);
        }

        function selectionHandles() {
            var item = selectedItem();
            if (!item || !state.vp) return null;
            if (state.selection.kind === "stroke") {
                if (item.type === "free") return null;
                var mid = strokeMidpoint(item);
                return [
                    { id: "a", shape: "circle", x: toScreen(state.vp, item.a).x, y: toScreen(state.vp, item.a).y },
                    { id: "b", shape: "circle", x: toScreen(state.vp, item.b).x, y: toScreen(state.vp, item.b).y },
                    { id: "mid", shape: "diamond", x: toScreen(state.vp, mid).x, y: toScreen(state.vp, mid).y }
                ];
            }
            if (item.kind === "zone") {
                var corner = toScreen(state.vp, { x: item.x + item.w, y: item.y + item.h });
                return [{ id: "resize", shape: "diamond", x: corner.x, y: corner.y }];
            }
            return null;
        }

        function objectHitRadius(o, touch) {
            var sz = sizes(state.vp);
            var base = o.kind === "ball" ? sz.ball + 4 : o.kind === "obstacle" ? sz.player * 1.2 : sz.player + 2;
            return Math.max(base, touch ? 22 : 14);
        }

        function hitObject(sp, touch, exclude) {
            var ph = phase();
            var list = sortedObjects(ph.objects).reverse();
            var sz = sizes(state.vp);
            for (var i = 0; i < list.length; i++) {
                var o = list[i];
                if (exclude && o.id === exclude) continue;
                if (o.kind === "zone") continue;
                if (o.kind === "text") {
                    var m = textMetrics(ctx, state.vp, o);
                    var tp = toScreen(state.vp, o);
                    if (Math.abs(sp.x - tp.x) <= m.w / 2 + 4 && Math.abs(sp.y - tp.y) <= m.h / 2 + 4) return o;
                    continue;
                }
                var p = o.kind === "ball" ? ballScreenPos(state.vp, ph.objects, o, sz) : toScreen(state.vp, o);
                if (Math.hypot(sp.x - p.x, sp.y - p.y) <= objectHitRadius(o, touch)) return o;
            }
            return null;
        }

        function hitPlayer(sp, touch, exclude) {
            var ph = phase();
            var best = null;
            var bestD = Infinity;
            ph.objects.forEach(function (o) {
                if (o.kind !== "player" || o.id === exclude) return;
                var p = toScreen(state.vp, o);
                var d = Math.hypot(sp.x - p.x, sp.y - p.y);
                if (d <= objectHitRadius(o, touch) && d < bestD) { best = o; bestD = d; }
            });
            return best;
        }

        function hitZone(sp) {
            var ph = phase();
            for (var i = ph.objects.length - 1; i >= 0; i--) {
                var o = ph.objects[i];
                if (o.kind !== "zone") continue;
                var p1 = toScreen(state.vp, { x: o.x, y: o.y });
                var p2 = toScreen(state.vp, { x: o.x + o.w, y: o.y + o.h });
                if (sp.x >= Math.min(p1.x, p2.x) && sp.x <= Math.max(p1.x, p2.x) && sp.y >= Math.min(p1.y, p2.y) && sp.y <= Math.max(p1.y, p2.y)) return o;
            }
            return null;
        }

        function distToSegment(p, a, b) {
            var dx = b.x - a.x;
            var dy = b.y - a.y;
            var len2 = dx * dx + dy * dy;
            var t = len2 ? clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / len2, 0, 1) : 0;
            return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
        }

        function hitStroke(sp, touch) {
            var ph = phase();
            var tol = touch ? 16 : 9;
            for (var i = ph.strokes.length - 1; i >= 0; i--) {
                var st = ph.strokes[i];
                var pts = strokeSamples(st, 24).map(function (p) { return toScreen(state.vp, p); });
                for (var k = 1; k < pts.length; k++) {
                    if (distToSegment(sp, pts[k - 1], pts[k]) <= tol) return st;
                }
            }
            return null;
        }

        function hitHandle(sp, touch) {
            var hs = selectionHandles();
            if (!hs) return null;
            var tol = touch ? 22 : 12;
            for (var i = 0; i < hs.length; i++) {
                if (Math.hypot(sp.x - hs[i].x, sp.y - hs[i].y) <= tol) return hs[i];
            }
            return null;
        }

        // -------------------------------------------------------------
        // OPERACIONES SOBRE ELEMENTOS
        // -------------------------------------------------------------

        function addObject(kind, w, extra) {
            var ph = phase();
            var o;
            if (kind === "offense" || kind === "defense") {
                o = makePlayer(kind, nextPlayerLabel(ph.objects, kind), w.x, w.y);
            } else if (kind === "ball") {
                o = { id: uid(), kind: "ball", x: w.x, y: w.y, holder: null };
                if (extra && extra.holder) {
                    o.holder = extra.holder.id;
                    o.x = extra.holder.x;
                    o.y = extra.holder.y;
                    ph.objects.forEach(function (b) {
                        if (b.kind === "ball" && b.holder === o.holder) b.holder = null;
                    });
                }
            } else if (kind === "cone" || kind === "obstacle") {
                o = { id: uid(), kind: kind, x: w.x, y: w.y };
            } else if (kind === "text") {
                o = { id: uid(), kind: "text", x: w.x, y: w.y, text: "Texto", size: "m", color: "#111827" };
            } else if (kind === "zone") {
                o = { id: uid(), kind: "zone", x: w.x, y: w.y, w: extra.w, h: extra.h, color: "#f97316" };
            }
            if (!o) return null;
            ph.objects.push(o);
            state.selection = { kind: "object", id: o.id };
            return o;
        }

        function moveObjectTo(o, w) {
            var dx = w.x - o.x;
            var dy = w.y - o.y;
            o.x = w.x;
            o.y = w.y;
            if (o.kind === "zone") return;
            phase().strokes.forEach(function (st) {
                if (st.from === o.id) {
                    st.a = { x: st.a.x + dx, y: st.a.y + dy };
                    if (st.c) st.c = { x: st.c.x + dx * 0.5, y: st.c.y + dy * 0.5 };
                }
                if (st.to === o.id) {
                    st.b = { x: st.b.x + dx, y: st.b.y + dy };
                    if (st.c) st.c = { x: st.c.x + dx * 0.5, y: st.c.y + dy * 0.5 };
                }
            });
        }

        function deleteSelection() {
            var sel = state.selection;
            if (!sel) return;
            var ph = phase();
            if (sel.kind === "object") {
                var o = findById(ph.objects, sel.id);
                ph.objects = ph.objects.filter(function (x) { return x.id !== sel.id; });
                if (o && o.kind === "player") {
                    ph.objects.forEach(function (b) {
                        if (b.kind === "ball" && b.holder === o.id) {
                            b.holder = null;
                            b.x = o.x + 0.4;
                            b.y = o.y - 0.4;
                        }
                    });
                    ph.strokes.forEach(function (st) {
                        if (st.from === o.id) st.from = null;
                        if (st.to === o.id) st.to = null;
                    });
                }
            } else {
                ph.strokes = ph.strokes.filter(function (x) { return x.id !== sel.id; });
            }
            state.selection = null;
            commit();
        }

        function duplicateSelection() {
            var item = selectedItem();
            if (!item) return;
            var ph = phase();
            var copy = clone(item);
            copy.id = uid();
            if (state.selection.kind === "object") {
                copy.x += 0.9;
                copy.y += 0.9;
                if (copy.kind === "player") copy.label = nextPlayerLabel(ph.objects, copy.team);
                if (copy.kind === "ball") copy.holder = null;
                ph.objects.push(copy);
                state.selection = { kind: "object", id: copy.id };
            } else {
                var shift = function (p) { return p ? { x: p.x + 0.9, y: p.y + 0.9 } : p; };
                copy.a = shift(copy.a);
                copy.b = shift(copy.b);
                copy.c = shift(copy.c);
                if (copy.pts) copy.pts = copy.pts.map(shift);
                copy.from = null;
                copy.to = null;
                ph.strokes.push(copy);
                state.selection = { kind: "stroke", id: copy.id };
            }
            commit();
        }

        // -------------------------------------------------------------
        // PUNTERO (mouse, lápiz y táctil)
        // -------------------------------------------------------------

        var gestureCaptured = false;

        function eventPoint(e) {
            var rect = canvas.getBoundingClientRect();
            return { x: e.clientX - rect.left, y: e.clientY - rect.top };
        }

        function onPointerDown(e) {
            if (state.mode !== "edit" || !state.vp) return;
            if (e.button != null && e.button > 0) return;
            closeMenu();
            var sp = eventPoint(e);
            var w = clampToBounds(state.vp, toWorld(state.vp, sp));
            var touch = e.pointerType === "touch" || e.pointerType === "pen";
            var tool = state.tool;
            gestureCaptured = false;

            function capture() {
                gestureCaptured = true;
                try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* no-op */ }
            }

            if (STROKE_TYPES[tool]) {
                var anchor = hitPlayer(sp, touch);
                var start = anchor ? { x: anchor.x, y: anchor.y } : w;
                state.drag = { type: "draw", strokeType: tool, path: [start], from: anchor ? anchor.id : null, pointerId: e.pointerId, touch: touch };
                capture();
                return;
            }
            if (tool === "zone") {
                state.drag = { type: "zone", start: w, cur: null, pointerId: e.pointerId };
                capture();
                return;
            }

            // Manijas de la selección
            var handle = hitHandle(sp, touch);
            if (handle) {
                state.drag = { type: "handle", handle: handle.id, pointerId: e.pointerId, moved: false, touch: touch };
                capture();
                return;
            }

            var obj = hitObject(sp, touch);
            if (tool === "ball" && obj && obj.kind === "player") {
                addObject("ball", w, { holder: obj });
                commit();
                capture();
                return;
            }
            if (obj) {
                state.selection = { kind: "object", id: obj.id };
                var base = obj.kind === "ball" && obj.holder ? objectWorldPos(phase().objects, obj) : { x: obj.x, y: obj.y };
                state.drag = { type: "move", id: obj.id, offset: { x: base.x - w.x, y: base.y - w.y }, startSp: sp, moved: false, pointerId: e.pointerId, touch: touch };
                capture();
                refreshPanels();
                requestRender();
                return;
            }

            if (ELEMENT_TOOLS[tool]) {
                addObject(tool, w);
                commit();
                capture();
                if (tool === "text") focusTextInput();
                return;
            }

            // Herramienta seleccionar
            var st = hitStroke(sp, touch);
            if (st) {
                state.selection = { kind: "stroke", id: st.id };
                state.drag = { type: "move-stroke", id: st.id, last: w, moved: false, pointerId: e.pointerId };
                capture();
                refreshPanels();
                requestRender();
                return;
            }
            var zone = hitZone(sp);
            if (zone) {
                state.selection = { kind: "object", id: zone.id };
                state.drag = { type: "move", id: zone.id, offset: { x: zone.x - w.x, y: zone.y - w.y }, startSp: sp, moved: false, pointerId: e.pointerId };
                capture();
                refreshPanels();
                requestRender();
                return;
            }
            if (state.selection) {
                state.selection = null;
                refreshPanels();
                requestRender();
            }
            // No capturamos: en celular el gesto queda libre para desplazar la página.
        }

        function onPointerMove(e) {
            if (!state.vp) return;
            var sp = eventPoint(e);
            var drag = state.drag;
            if (!drag) {
                if (e.pointerType === "mouse" && state.mode === "edit") updateCursor(sp);
                return;
            }
            if (drag.pointerId != null && e.pointerId !== drag.pointerId) return;
            var w = clampToBounds(state.vp, toWorld(state.vp, sp));
            var ph = phase();

            if (drag.type === "draw") {
                var last = drag.path[drag.path.length - 1];
                if (dist(last, w) > 0.05) drag.path.push(w);
            } else if (drag.type === "zone") {
                drag.cur = w;
            } else if (drag.type === "move") {
                var o = findById(ph.objects, drag.id);
                if (!o) return;
                if (!drag.moved && drag.startSp && Math.hypot(sp.x - drag.startSp.x, sp.y - drag.startSp.y) < 3) return;
                drag.moved = true;
                var target = { x: w.x + drag.offset.x, y: w.y + drag.offset.y };
                if (o.kind === "ball" && o.holder) o.holder = null;
                moveObjectTo(o, target);
            } else if (drag.type === "move-stroke") {
                var st = findById(ph.strokes, drag.id);
                if (!st) return;
                var dx = w.x - drag.last.x;
                var dy = w.y - drag.last.y;
                if (!dx && !dy) return;
                drag.moved = true;
                drag.last = w;
                var sh = function (p) { return p ? { x: p.x + dx, y: p.y + dy } : p; };
                st.a = sh(st.a);
                st.b = sh(st.b);
                st.c = sh(st.c);
                if (st.pts) st.pts = st.pts.map(sh);
                st.from = null;
                st.to = null;
            } else if (drag.type === "handle") {
                drag.moved = true;
                var item = selectedItem();
                if (!item) return;
                if (state.selection.kind === "stroke") {
                    var mid = item.c ? quadPoint(item.a, item.c, item.b, 0.5) : lerpPt(item.a, item.b, 0.5);
                    if (drag.handle === "a" || drag.handle === "b") {
                        var key = drag.handle;
                        var snap = hitPlayer(sp, drag.touch);
                        var np = snap ? { x: snap.x, y: snap.y } : w;
                        item[key] = np;
                        if (key === "a") item.from = snap ? snap.id : null;
                        else item.to = snap && (item.type === "pass") ? snap.id : null;
                        if (item.c) item.c = controlFromMid(item.a, item.b, mid);
                    } else if (drag.handle === "mid") {
                        var straight = lerpPt(item.a, item.b, 0.5);
                        item.c = dist(w, straight) < 0.2 ? null : controlFromMid(item.a, item.b, w);
                    }
                } else if (item.kind === "zone" && drag.handle === "resize") {
                    item.w = w.x - item.x;
                    item.h = w.y - item.y;
                    if (Math.abs(item.w) < 0.5) item.w = item.w < 0 ? -0.5 : 0.5;
                    if (Math.abs(item.h) < 0.5) item.h = item.h < 0 ? -0.5 : 0.5;
                }
            }
            requestRender();
        }

        function onPointerUp(e) {
            var drag = state.drag;
            if (!drag) return;
            if (drag.pointerId != null && e.pointerId !== drag.pointerId) return;
            state.drag = null;
            gestureCaptured = false;
            var ph = phase();
            var sp = eventPoint(e);

            if (drag.type === "draw") {
                var path = drag.path;
                if (path.length > 1 && polylineLength(path) >= 0.45) {
                    var fit = fitStroke(drag.strokeType, path);
                    var endPlayer = drag.strokeType === "pass" ? hitPlayer(sp, drag.touch, drag.from) : null;
                    var st = {
                        id: uid(),
                        type: drag.strokeType,
                        a: fit.a,
                        b: endPlayer ? { x: endPlayer.x, y: endPlayer.y } : fit.b,
                        c: fit.c,
                        from: drag.from,
                        to: endPlayer ? endPlayer.id : null,
                        color: null
                    };
                    if (fit.pts) st.pts = fit.pts;
                    if (st.c && endPlayer) st.c = controlFromMid(st.a, st.b, pointAlong(path, 0.5));
                    ph.strokes.push(st);
                    state.selection = { kind: "stroke", id: st.id };
                    commit();
                    return;
                }
                requestRender();
                return;
            }
            if (drag.type === "zone") {
                if (drag.cur && Math.abs(drag.cur.x - drag.start.x) > 0.4 && Math.abs(drag.cur.y - drag.start.y) > 0.4) {
                    addObject("zone", { x: Math.min(drag.start.x, drag.cur.x), y: Math.min(drag.start.y, drag.cur.y) }, {
                        w: Math.abs(drag.cur.x - drag.start.x),
                        h: Math.abs(drag.cur.y - drag.start.y)
                    });
                    commit();
                    return;
                }
                requestRender();
                return;
            }
            if (drag.type === "move") {
                var o = findById(ph.objects, drag.id);
                if (o && o.kind === "ball" && drag.moved) {
                    var holder = hitPlayer(sp, drag.touch);
                    if (holder) {
                        ph.objects.forEach(function (b) {
                            if (b.kind === "ball" && b.holder === holder.id && b.id !== o.id) b.holder = null;
                        });
                        o.holder = holder.id;
                        o.x = holder.x;
                        o.y = holder.y;
                    }
                }
                if (drag.moved) commit();
                else refreshPanels();
                requestRender();
                return;
            }
            if (drag.type === "handle" && state.selection && state.selection.kind === "object") {
                var z = selectedItem();
                if (z && z.kind === "zone") {
                    if (z.w < 0) { z.x += z.w; z.w = -z.w; }
                    if (z.h < 0) { z.y += z.h; z.h = -z.h; }
                }
            }
            if (drag.moved) commit();
            requestRender();
        }

        function updateCursor(sp) {
            var c = "default";
            if (STROKE_TYPES[state.tool] || state.tool === "zone") c = "crosshair";
            else if (hitHandle(sp, false)) c = "grab";
            else if (hitObject(sp, false)) c = "move";
            else if (state.tool === "select" && (hitStroke(sp, false) || hitZone(sp))) c = "pointer";
            else if (ELEMENT_TOOLS[state.tool]) c = "copy";
            canvas.style.cursor = c;
        }

        // Táctil: cancelar el scroll solo si el gesto es de la pizarra.
        function onTouchStart(e) {
            if (gestureCaptured && e.cancelable) e.preventDefault();
        }
        function onTouchMove(e) {
            if ((gestureCaptured || state.drag) && e.cancelable) e.preventDefault();
        }

        canvas.addEventListener("pointerdown", onPointerDown);
        canvas.addEventListener("pointermove", onPointerMove);
        canvas.addEventListener("pointerup", onPointerUp);
        canvas.addEventListener("pointercancel", function (e) {
            state.drag = null;
            gestureCaptured = false;
            requestRender();
        });
        canvas.addEventListener("touchstart", onTouchStart, { passive: false });
        canvas.addEventListener("touchmove", onTouchMove, { passive: false });
        canvas.addEventListener("dblclick", function (e) {
            if (state.mode !== "edit") return;
            var item = selectedItem();
            if (item && item.kind === "text") focusTextInput();
            else if (item && item.kind === "player") {
                var input = $(".tb-props [data-prop='label']");
                if (input) { input.focus(); input.select(); }
            }
        });

        // -------------------------------------------------------------
        // FASES
        // -------------------------------------------------------------

        function selectPhase(i) {
            state.phaseIndex = clamp(i, 0, state.doc.phases.length - 1);
            state.selection = null;
            state.committed = snapshot();
            refreshAll();
        }

        function phaseNext() {
            var next = deriveNextPhase(phase(), state.phaseIndex);
            next.name = "Fase " + (state.phaseIndex + 2);
            state.doc.phases.splice(state.phaseIndex + 1, 0, next);
            renumberDefaultNames();
            state.phaseIndex += 1;
            state.selection = null;
            commit();
            refreshAll();
            var hasMoves = state.doc.phases[state.phaseIndex - 1].strokes.length > 0;
            toast(hasMoves ? "Fase creada aplicando los movimientos dibujados." : "Fase creada. Dibujá movimientos y volvé a tocar «Fase siguiente».");
        }

        function phaseDuplicate() {
            var copy = clone(phase());
            copy.id = uid();
            copy.name = (copy.name || "Fase") + " (copia)";
            state.doc.phases.splice(state.phaseIndex + 1, 0, copy);
            state.phaseIndex += 1;
            state.selection = null;
            commit();
            refreshAll();
        }

        function phaseMove(dir) {
            var i = state.phaseIndex;
            var j = i + dir;
            if (j < 0 || j >= state.doc.phases.length) return;
            var arr = state.doc.phases;
            var tmp = arr[i];
            arr[i] = arr[j];
            arr[j] = tmp;
            state.phaseIndex = j;
            renumberDefaultNames();
            commit();
            refreshAll();
        }

        function phaseDelete() {
            if (state.doc.phases.length <= 1) {
                toast("La jugada necesita al menos una fase. Usá «Vaciar fase actual» para borrarla.");
                return;
            }
            var ph = phase();
            var hasContent = ph.objects.length || ph.strokes.length;
            var go = function () {
                state.doc.phases.splice(state.phaseIndex, 1);
                state.phaseIndex = Math.max(0, state.phaseIndex - 1);
                renumberDefaultNames();
                state.selection = null;
                commit();
                refreshAll();
            };
            if (hasContent) confirmDialog("¿Eliminar «" + (ph.name || "Fase") + "»?", "Podés recuperarla con Deshacer.", "Eliminar fase").then(function (ok) { if (ok) go(); });
            else go();
        }

        function renumberDefaultNames() {
            state.doc.phases.forEach(function (p, i) {
                if (/^Fase \d+$/.test(p.name || "")) p.name = "Fase " + (i + 1);
            });
        }

        // -------------------------------------------------------------
        // REPRODUCCIÓN
        // -------------------------------------------------------------
        var TRANSITION_SECONDS = 1.7;
        var HOLD_SECONDS = 0.7;
        var lastTs = 0;
        var rafId = 0;

        function setMode(mode) {
            if (mode === state.mode) return;
            state.mode = mode;
            state.drag = null;
            if (mode === "play") {
                state.pos = state.phaseIndex;
                state.playing = false;
                state.target = null;
            } else {
                stopPlayback();
                state.phaseIndex = clamp(Math.round(state.pos), 0, state.doc.phases.length - 1);
            }
            root.classList.toggle("tb--play", mode === "play");
            root.querySelectorAll(".tb-mode-btn").forEach(function (b) {
                var on = b.getAttribute("data-mode") === mode;
                b.classList.toggle("is-active", on);
                b.setAttribute("aria-selected", on ? "true" : "false");
            });
            $(".tb-player").hidden = mode !== "play";
            $(".tb-phase-actions").hidden = mode === "play";
            $("[data-action='toggle-strokes']").hidden = mode !== "play";
            refreshAll();
            layout();
        }

        function startPlayback(target) {
            var last = state.doc.phases.length - 1;
            if (last <= 0) {
                toast("Agregá al menos una fase más para ver la animación.");
                return;
            }
            if (target == null) {
                if (state.pos >= last - 1e-3) state.pos = 0;
                target = last;
            }
            state.target = target;
            state.playing = true;
            state.hold = state.pos % 1 === 0 && target === last ? HOLD_SECONDS * 0.4 : 0;
            lastTs = 0;
            updatePlayerUI();
            if (!rafId) rafId = window.requestAnimationFrame(tick);
        }

        function stopPlayback() {
            state.playing = false;
            state.target = null;
            if (rafId) window.cancelAnimationFrame(rafId);
            rafId = 0;
            updatePlayerUI();
        }

        function tick(ts) {
            rafId = 0;
            if (state.destroyed || !state.playing) return;
            if (!root.isConnected) { destroy(); return; }
            var dt = lastTs ? Math.min(0.1, (ts - lastTs) / 1000) : 0;
            lastTs = ts;
            if (state.hold > 0) {
                state.hold -= dt * state.speed;
            } else {
                var before = state.pos;
                state.pos += (dt * state.speed) / TRANSITION_SECONDS;
                var crossed = Math.floor(state.pos) > Math.floor(before) ? Math.floor(state.pos) : null;
                if (state.pos >= state.target) {
                    state.pos = state.target;
                    render();
                    updatePlayerUI();
                    stopPlayback();
                    return;
                }
                if (crossed != null) {
                    state.pos = crossed;
                    state.hold = HOLD_SECONDS;
                }
            }
            render();
            updatePlayerUI();
            rafId = window.requestAnimationFrame(tick);
        }

        function stepForward() {
            var last = state.doc.phases.length - 1;
            var target = Math.min(last, Math.floor(state.pos + 1e-3) + 1);
            if (target <= state.pos) return;
            startPlayback(target);
            state.hold = 0;
        }

        function stepBack() {
            stopPlayback();
            state.pos = Math.max(0, Math.ceil(state.pos - 1e-3) - 1);
            render();
            updatePlayerUI();
        }

        function restartPlayback() {
            stopPlayback();
            state.pos = 0;
            render();
            updatePlayerUI();
        }

        function updatePlayerUI() {
            var scrub = $(".tb-scrub");
            var n = state.doc.phases.length;
            scrub.max = String(Math.max(0, n - 1));
            scrub.value = String(state.pos);
            var btn = $("[data-action='toggle-play']");
            btn.innerHTML = state.playing ? ICONS.pause : ICONS.play;
            btn.setAttribute("aria-label", state.playing ? "Pausar" : "Reproducir");
            if (state.mode === "play") {
                var idx = clamp(Math.floor(state.pos + 1e-3), 0, n - 1);
                highlightPhaseChip(idx);
                var ph = state.doc.phases[idx];
                var cap = $(".tb-stage-caption");
                cap.hidden = false;
                cap.innerHTML = "<strong>" + (idx + 1) + "/" + n + " · " + escapeHtml(ph.name || "Fase") + "</strong>" + (ph.note ? "<span>" + escapeHtml(ph.note) + "</span>" : "");
                renderPhasePanel(idx);
            }
        }

        // -------------------------------------------------------------
        // INTERFAZ
        // -------------------------------------------------------------

        function setTool(tool) {
            if (state.mode !== "edit") setMode("edit");
            state.tool = tool;
            state.drag = null;
            root.querySelectorAll(".tb-tool[data-tool]").forEach(function (b) {
                var on = b.getAttribute("data-tool") === tool;
                b.classList.toggle("is-active", on);
                b.setAttribute("aria-pressed", on ? "true" : "false");
            });
            var hint = tool === "select"
                ? "Seleccionar: tocá un elemento o trazo para editarlo, arrastralo para moverlo."
                : STROKE_TYPES[tool]
                    ? STROKE_TYPES[tool].label + ": " + STROKE_TYPES[tool].help
                    : ELEMENT_TOOLS[tool].label + ": " + ELEMENT_TOOLS[tool].help;
            $(".tb-hint").textContent = hint;
            canvas.style.cursor = STROKE_TYPES[tool] || tool === "zone" ? "crosshair" : "default";
        }

        function updateHeader() {
            $(".tb-title-text").textContent = state.meta.name || "Jugada nueva";
            $(".tb-dirty").hidden = !state.dirty;
            $("[data-action='undo']").disabled = !state.undo.length;
            $("[data-action='redo']").disabled = !state.redo.length;
            $(".tb-court-label").textContent = state.doc.view.court === "full" ? "Cancha completa" : "Media cancha";
        }

        var thumbTimer = null;
        function renderTimeline() {
            var list = $(".tb-phases");
            var n = state.doc.phases.length;
            list.innerHTML = state.doc.phases.map(function (p, i) {
                return '<button type="button" role="listitem" class="tb-phase' + (i === state.phaseIndex ? " is-active" : "") + '" data-phase="' + i + '" title="' + escapeHtml(p.name) + '">' +
                    '<span class="tb-phase-thumb"><canvas width="120" height="90" data-thumb="' + i + '"></canvas></span>' +
                    '<span class="tb-phase-name"><b>' + (i + 1) + "</b> " + escapeHtml(p.name || "Fase") + "</span></button>";
            }).join("");
            $("[data-action='phase-left']").disabled = state.phaseIndex === 0;
            $("[data-action='phase-right']").disabled = state.phaseIndex >= n - 1;
            $("[data-action='phase-del']").disabled = n <= 1;
            if (thumbTimer) clearTimeout(thumbTimer);
            thumbTimer = setTimeout(renderThumbs, 60);
        }

        function renderThumbs() {
            thumbTimer = null;
            if (state.destroyed) return;
            var aspect = viewAspect(state.doc.view);
            root.querySelectorAll("canvas[data-thumb]").forEach(function (c) {
                var i = Number(c.getAttribute("data-thumb"));
                var ph = state.doc.phases[i];
                if (!ph) return;
                var h = 78;
                var w = Math.round(h * aspect);
                c.width = w * 2;
                c.height = h * 2;
                c.style.width = w + "px";
                c.style.height = h + "px";
                var tctx = c.getContext("2d");
                var vp = computeViewport(state.doc.view, w, h, 2);
                renderScene(tctx, vp, { objects: ph.objects, strokes: ph.strokes }, { dpr: 2 });
            });
        }

        function highlightPhaseChip(idx) {
            root.querySelectorAll(".tb-phase").forEach(function (b) {
                b.classList.toggle("is-active", Number(b.getAttribute("data-phase")) === idx);
            });
        }

        function swatchesHtml(current, prop) {
            return '<div class="tb-swatches" role="group" aria-label="Color">' + COLORS.swatches.map(function (c) {
                return '<button type="button" class="tb-swatch' + (String(current).toLowerCase() === c ? " is-active" : "") + '" style="--sw:' + c + '" data-color="' + c + '" data-prop="' + prop + '" aria-label="Color ' + c + '"></button>';
            }).join("") + "</div>";
        }

        function refreshPanels() {
            renderProps();
            renderPhasePanel(state.phaseIndex);
        }

        function renderProps() {
            var el = $(".tb-props");
            if (state.mode === "play") {
                el.innerHTML = '<h3 class="tb-panel-title">Modo reproducción</h3><p class="tb-muted">Usá los controles debajo de la cancha. Para cambiar algo, volvé a <strong>Editar</strong>.</p>';
                return;
            }
            var item = selectedItem();
            if (!item) {
                el.innerHTML = '<h3 class="tb-panel-title">Elemento</h3><p class="tb-muted">Seleccioná un jugador, el balón, un trazo o una anotación para editarlo.</p>' +
                    '<div class="tb-quick"><button type="button" class="tb-btn tb-btn--small" data-action="add-offense-5">+ 5 atacantes</button>' +
                    '<button type="button" class="tb-btn tb-btn--small" data-action="add-defense-5">+ 5 defensores</button></div>';
                return;
            }
            var html = "";
            var actions = '<div class="tb-prop-actions"><button type="button" class="tb-btn tb-btn--small" data-action="dup-selection">' + ICONS.copy + "<span>Duplicar</span></button>" +
                '<button type="button" class="tb-btn tb-btn--small tb-btn--danger" data-action="del-selection">' + ICONS.trash + "<span>Eliminar</span></button></div>";
            if (state.selection.kind === "stroke") {
                html += '<h3 class="tb-panel-title">Trazo</h3>' +
                    '<label class="tb-field"><span>Tipo</span><select data-prop="type">' +
                    STROKE_ORDER.map(function (k) { return '<option value="' + k + '"' + (item.type === k ? " selected" : "") + ">" + escapeHtml(STROKE_TYPES[k].label) + "</option>"; }).join("") +
                    "</select></label>" +
                    '<div class="tb-field"><span>Color</span>' + swatchesHtml(strokeColor(item), "color") + "</div>" +
                    (item.type !== "free"
                        ? '<p class="tb-muted">Arrastrá los extremos para moverlos y el rombo central para curvar el trazo.</p>' +
                          (item.c ? '<button type="button" class="tb-btn tb-btn--small" data-action="straighten">Enderezar</button>' : "")
                        : "") +
                    actions;
            } else if (item.kind === "player") {
                html += '<h3 class="tb-panel-title">' + (item.team === "defense" ? "Defensor" : "Atacante") + "</h3>" +
                    '<div class="tb-field-row"><label class="tb-field tb-field--short"><span>Número</span><input type="text" maxlength="3" data-prop="label" value="' + escapeHtml(item.label) + '"></label>' +
                    '<label class="tb-field"><span>Nombre</span><input type="text" maxlength="24" data-prop="name" placeholder="Opcional" value="' + escapeHtml(item.name) + '"></label></div>' +
                    '<div class="tb-field"><span>Color</span>' + swatchesHtml(item.color, "color") + "</div>" +
                    '<label class="tb-field"><span>Equipo</span><select data-prop="team"><option value="offense"' + (item.team === "offense" ? " selected" : "") + '>Ataque</option><option value="defense"' + (item.team === "defense" ? " selected" : "") + ">Defensa</option></select></label>" +
                    actions;
            } else if (item.kind === "ball") {
                html += '<h3 class="tb-panel-title">Balón</h3><p class="tb-muted">' + (item.holder ? "Lo tiene un jugador: se mueve con él. Arrastralo para soltarlo." : "Arrastralo sobre un jugador para dárselo.") + "</p>" + actions;
            } else if (item.kind === "text") {
                html += '<h3 class="tb-panel-title">Anotación</h3>' +
                    '<label class="tb-field"><span>Texto</span><textarea rows="2" maxlength="120" data-prop="text">' + escapeHtml(item.text) + "</textarea></label>" +
                    '<label class="tb-field"><span>Tamaño</span><select data-prop="size"><option value="s"' + (item.size === "s" ? " selected" : "") + '>Chico</option><option value="m"' + (item.size === "m" ? " selected" : "") + '>Mediano</option><option value="l"' + (item.size === "l" ? " selected" : "") + ">Grande</option></select></label>" +
                    '<div class="tb-field"><span>Color</span>' + swatchesHtml(item.color, "color") + "</div>" + actions;
            } else if (item.kind === "zone") {
                html += '<h3 class="tb-panel-title">Zona resaltada</h3><p class="tb-muted">Arrastrá el rombo de la esquina para cambiar el tamaño.</p>' +
                    '<div class="tb-field"><span>Color</span>' + swatchesHtml(item.color, "color") + "</div>" + actions;
            } else {
                html += '<h3 class="tb-panel-title">' + (item.kind === "cone" ? "Cono" : "Obstáculo") + "</h3>" + actions;
            }
            el.innerHTML = html;
        }

        function renderPhasePanel(idx) {
            var el = $(".tb-phase-panel");
            var ph = state.doc.phases[idx];
            if (!ph) return;
            if (state.mode === "play") {
                el.innerHTML = '<h3 class="tb-panel-title">Fase ' + (idx + 1) + " de " + state.doc.phases.length + "</h3><p><strong>" + escapeHtml(ph.name || "Fase") + "</strong></p>" + (ph.note ? '<p class="tb-note">' + escapeHtml(ph.note) + "</p>" : '<p class="tb-muted">Sin notas para esta fase.</p>');
                return;
            }
            el.innerHTML = '<h3 class="tb-panel-title">Fase ' + (idx + 1) + " de " + state.doc.phases.length + "</h3>" +
                '<label class="tb-field"><span>Nombre de la fase</span><input type="text" maxlength="60" data-phase-prop="name" value="' + escapeHtml(ph.name) + '"></label>' +
                '<label class="tb-field"><span>Notas para el equipo</span><textarea rows="3" maxlength="600" data-phase-prop="note" placeholder="Lectura, consigna o variante de esta fase">' + escapeHtml(ph.note) + "</textarea></label>";
        }

        function refreshAfterChange() {
            updateHeader();
            renderTimeline();
            refreshPanels();
            requestRender();
        }

        function refreshAll() {
            updateHeader();
            renderTimeline();
            refreshPanels();
            updatePlayerUI();
            if (state.mode !== "play") $(".tb-stage-caption").hidden = true;
            requestRender();
        }

        function focusTextInput() {
            setTimeout(function () {
                var input = $(".tb-props [data-prop='text']");
                if (input) { input.focus(); input.select(); }
            }, 30);
        }

        // Propiedades: cambios en vivo
        root.addEventListener("input", function (e) {
            var t = e.target;
            if (t.matches("[data-prop]") && !t.matches(".tb-swatch")) {
                var item = selectedItem();
                if (!item) return;
                var prop = t.getAttribute("data-prop");
                if (prop === "label") item.label = t.value.slice(0, 3);
                else if (prop === "name") item.name = t.value.slice(0, 24);
                else if (prop === "text") item.text = t.value.slice(0, 120);
                requestRender();
            } else if (t.matches("[data-phase-prop]")) {
                var ph = phase();
                ph[t.getAttribute("data-phase-prop")] = t.value;
                if (t.getAttribute("data-phase-prop") === "name") {
                    var chip = root.querySelector(".tb-phase.is-active .tb-phase-name");
                    if (chip) chip.innerHTML = "<b>" + (state.phaseIndex + 1) + "</b> " + escapeHtml(t.value || "Fase");
                }
            } else if (t.matches(".tb-scrub")) {
                stopPlayback();
                state.pos = Number(t.value) || 0;
                render();
                updatePlayerUI();
            }
        });

        root.addEventListener("change", function (e) {
            var t = e.target;
            if (t.matches("[data-prop]")) {
                var item = selectedItem();
                if (!item) return;
                var prop = t.getAttribute("data-prop");
                if (prop === "type") item.type = t.value;
                else if (prop === "team") {
                    item.team = t.value;
                    item.color = t.value === "defense" ? COLORS.defense : COLORS.offense;
                } else if (prop === "size") item.size = t.value;
                commit();
            } else if (t.matches("[data-phase-prop]")) {
                commit();
                renderTimeline();
            } else if (t.matches("[data-role='speed']")) {
                state.speed = Number(t.value) || 1;
            }
        });

        root.addEventListener("click", function (e) {
            var sw = e.target.closest(".tb-swatch");
            if (sw) {
                var item = selectedItem();
                if (item) {
                    item.color = sw.getAttribute("data-color");
                    commit();
                }
                return;
            }
            var toolBtnEl = e.target.closest("[data-tool]");
            if (toolBtnEl) {
                setTool(toolBtnEl.getAttribute("data-tool"));
                return;
            }
            var modeBtn = e.target.closest("[data-mode]");
            if (modeBtn) {
                setMode(modeBtn.getAttribute("data-mode"));
                return;
            }
            var phaseBtn = e.target.closest("[data-phase]");
            if (phaseBtn) {
                var idx = Number(phaseBtn.getAttribute("data-phase"));
                if (state.mode === "play") {
                    stopPlayback();
                    state.pos = idx;
                    render();
                    updatePlayerUI();
                } else {
                    selectPhase(idx);
                }
                return;
            }
            var actionEl = e.target.closest("[data-action]");
            if (!actionEl || actionEl.disabled) return;
            handleAction(actionEl.getAttribute("data-action"), actionEl);
        });

        function handleAction(action, el) {
            if (action !== "menu") closeMenu();
            switch (action) {
                case "undo": undo(); break;
                case "redo": redo(); break;
                case "templates": openTemplates(); break;
                case "save": openSaveDialog(false); break;
                case "save-copy": openSaveDialog(true); break;
                case "menu": toggleMenu(); break;
                case "new": newPlay(); break;
                case "export-png": exportCurrentPng(); break;
                case "export-sheet": exportSheet(); break;
                case "export-pdf": exportPdf(); break;
                case "clear-phase": clearPhase(); break;
                case "library":
                    if (options.onOpenLibrary) options.onOpenLibrary();
                    break;
                case "tutorial": openTutorial(); break;
                case "shortcuts": openShortcuts(); break;
                case "court": toggleCourt(); break;
                case "rotate": rotateView(); break;
                case "fullscreen": toggleFullscreen(); break;
                case "toggle-strokes":
                    state.showStrokes = !state.showStrokes;
                    el.classList.toggle("is-off", !state.showStrokes);
                    render();
                    break;
                case "restart": restartPlayback(); break;
                case "step-back": stepBack(); break;
                case "step-forward": stepForward(); break;
                case "toggle-play":
                    if (state.playing) stopPlayback();
                    else startPlayback();
                    break;
                case "phase-next": phaseNext(); break;
                case "phase-dup": phaseDuplicate(); break;
                case "phase-left": phaseMove(-1); break;
                case "phase-right": phaseMove(1); break;
                case "phase-del": phaseDelete(); break;
                case "dup-selection": duplicateSelection(); break;
                case "del-selection": deleteSelection(); break;
                case "straighten": {
                    var it = selectedItem();
                    if (it) { it.c = null; commit(); }
                    break;
                }
                case "add-offense-5": addFive("offense"); break;
                case "add-defense-5": addFive("defense"); break;
                case "draft-restore": {
                    var banner = $(".tb-draft");
                    var d = banner._draft;
                    banner.hidden = true;
                    if (d) setDoc(d.doc, d.meta, { dirty: true });
                    layout();
                    toast("Borrador recuperado.");
                    break;
                }
                case "draft-discard":
                    $(".tb-draft").hidden = true;
                    clearDraft();
                    break;
            }
        }

        function addFive(team) {
            var ph = phase();
            var spots = [SPOTS.top, SPOTS.wingL, SPOTS.wingR, SPOTS.cornerL, SPOTS.cornerR];
            var offenseByLabel = {};
            ph.objects.forEach(function (o) {
                if (o.kind === "player" && o.team === "offense") offenseByLabel[o.label] = o;
            });
            var added = 0;
            for (var n = 1; n <= 5; n++) {
                var exists = ph.objects.some(function (o) { return o.kind === "player" && o.team === team && String(o.label) === String(n); });
                if (exists) continue;
                var p;
                if (team === "defense" && offenseByLabel[String(n)]) p = towardBasket(offenseByLabel[String(n)], 1.3);
                else if (team === "defense") p = towardBasket(spots[n - 1], 1.3);
                else p = spots[n - 1];
                ph.objects.push(makePlayer(team, n, p.x, p.y));
                added++;
            }
            if (!added) {
                toast("Ya están los cinco " + (team === "defense" ? "defensores" : "atacantes") + " en esta fase.");
                return;
            }
            commit();
        }

        function clearPhase() {
            var ph = phase();
            if (!ph.objects.length && !ph.strokes.length) return;
            confirmDialog("¿Vaciar la fase actual?", "Se borran todos los elementos y trazos de «" + (ph.name || "Fase") + "». Podés recuperarlo con Deshacer.", "Vaciar").then(function (ok) {
                if (!ok) return;
                ph.objects = [];
                ph.strokes = [];
                state.selection = null;
                commit();
            });
        }

        function newPlay() {
            var go = function () {
                clearDraft();
                var aspectWide = (stage.clientWidth || 600) > (window.innerHeight || 800) * 0.9;
                setDoc(createEmptyDoc({ court: "half", rotation: aspectWide ? 90 : 90 }), null);
                layout();
            };
            if (state.dirty) confirmDialog("¿Empezar una jugada nueva?", "Los cambios sin guardar de la jugada actual se van a perder.", "Empezar de cero").then(function (ok) { if (ok) go(); });
            else go();
        }

        function toggleCourt() {
            var v = state.doc.view;
            v.court = v.court === "full" ? "half" : "full";
            var wide = (stage.clientWidth || 600) >= (window.innerHeight || 800) * 0.8;
            v.rotation = v.court === "full" ? (wide ? 0 : 90) : 90;
            commit();
            layout();
        }

        function rotateView() {
            var v = state.doc.view;
            v.rotation = (v.rotation + 90) % 360;
            commit();
            layout();
        }

        function toggleFullscreen() {
            state.fullscreen = !state.fullscreen;
            root.classList.toggle("tb--fullscreen", state.fullscreen);
            document.documentElement.classList.toggle("tb-noscroll", state.fullscreen);
            var btn = $("[data-action='fullscreen']");
            btn.innerHTML = state.fullscreen ? ICONS.collapse : ICONS.expand;
            btn.setAttribute("aria-label", state.fullscreen ? "Salir de pantalla completa" : "Pantalla completa");
            try {
                if (state.fullscreen && root.requestFullscreen && !document.fullscreenElement) root.requestFullscreen().catch(function () {});
                else if (!state.fullscreen && document.fullscreenElement) document.exitFullscreen().catch(function () {});
            } catch (e) { /* algunos navegadores (iOS) no lo permiten: queda el modo CSS */ }
            setTimeout(layout, 60);
        }

        function onFullscreenChange() {
            if (!document.fullscreenElement && state.fullscreen) {
                state.fullscreen = false;
                root.classList.remove("tb--fullscreen");
                document.documentElement.classList.remove("tb-noscroll");
                $("[data-action='fullscreen']").innerHTML = ICONS.expand;
                setTimeout(layout, 60);
            }
        }
        document.addEventListener("fullscreenchange", onFullscreenChange);

        function toggleMenu() {
            var menu = $(".tb-menu");
            var btn = $("[data-action='menu']");
            menu.hidden = !menu.hidden;
            btn.setAttribute("aria-expanded", menu.hidden ? "false" : "true");
        }
        function closeMenu() {
            var menu = $(".tb-menu");
            if (menu && !menu.hidden) {
                menu.hidden = true;
                $("[data-action='menu']").setAttribute("aria-expanded", "false");
            }
        }
        function onDocClick(e) {
            if (!root.contains(e.target) || !e.target.closest(".tb-menu-wrap")) closeMenu();
        }
        document.addEventListener("click", onDocClick);

        // -------------------------------------------------------------
        // TECLADO
        // -------------------------------------------------------------
        function onKeyDown(e) {
            if (state.destroyed) return;
            if (!root.isConnected) { destroy(); return; }
            if (document.querySelector(".tb-modal")) {
                if (e.key === "Escape") closeModal();
                return;
            }
            var t = e.target;
            var typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
            var mod = e.ctrlKey || e.metaKey;
            if (mod && e.key.toLowerCase() === "s") {
                e.preventDefault();
                openSaveDialog(false);
                return;
            }
            if (typing) return;
            if (mod && e.key.toLowerCase() === "z") {
                e.preventDefault();
                if (e.shiftKey) redo(); else undo();
                return;
            }
            if (mod && e.key.toLowerCase() === "y") {
                e.preventDefault();
                redo();
                return;
            }
            if (mod && e.key.toLowerCase() === "d") {
                e.preventDefault();
                duplicateSelection();
                return;
            }
            if (mod || e.altKey) return;
            if (state.mode === "play") {
                if (e.key === " ") { e.preventDefault(); if (state.playing) stopPlayback(); else startPlayback(); }
                else if (e.key === "ArrowRight") { e.preventDefault(); stepForward(); }
                else if (e.key === "ArrowLeft") { e.preventDefault(); stepBack(); }
                else if (e.key === "Escape" || e.key.toLowerCase() === "e") setMode("edit");
                return;
            }
            if (e.key === "Delete" || e.key === "Backspace") {
                if (state.selection) { e.preventDefault(); deleteSelection(); }
                return;
            }
            if (e.key === "Escape") {
                if (state.fullscreen) toggleFullscreen();
                else if (state.selection) { state.selection = null; refreshPanels(); requestRender(); }
                else setTool("select");
                return;
            }
            if (e.key === "ArrowRight" && e.shiftKey) { selectPhase(state.phaseIndex + 1); return; }
            if (e.key === "ArrowLeft" && e.shiftKey) { selectPhase(state.phaseIndex - 1); return; }
            if (e.key === " ") { e.preventDefault(); setMode("play"); startPlayback(); return; }
            if (e.key === "?") { openShortcuts(); return; }
            var k = e.key.toLowerCase();
            if (k === "v") { setTool("select"); return; }
            if (k === "n") { phaseNext(); return; }
            var found = null;
            Object.keys(ELEMENT_TOOLS).forEach(function (id) { if (ELEMENT_TOOLS[id].key === k) found = id; });
            STROKE_ORDER.forEach(function (id) { if (STROKE_TYPES[id].key === k) found = id; });
            if (found) setTool(found);
        }
        document.addEventListener("keydown", onKeyDown);

        // -------------------------------------------------------------
        // DIÁLOGOS
        // -------------------------------------------------------------
        var modalResolve = null;
        function openModal(html, onReady) {
            closeModal();
            var overlay = document.createElement("div");
            overlay.className = "tb-modal";
            overlay.setAttribute("role", "dialog");
            overlay.setAttribute("aria-modal", "true");
            overlay.innerHTML = '<div class="tb-modal-card">' + html + "</div>";
            overlay.addEventListener("click", function (e) {
                if (e.target === overlay) closeModal();
                if (e.target.closest("[data-modal-close]")) closeModal();
            });
            document.body.appendChild(overlay);
            if (onReady) onReady(overlay);
            var focusable = overlay.querySelector("input, textarea, select, button.tb-btn--accent, button");
            if (focusable) setTimeout(function () { focusable.focus(); }, 20);
            return overlay;
        }
        function closeModal() {
            var m = document.querySelector(".tb-modal");
            if (m) m.remove();
            if (modalResolve) {
                var r = modalResolve;
                modalResolve = null;
                r(false);
            }
        }

        function confirmDialog(title, text, okLabel) {
            return new Promise(function (resolve) {
                openModal(
                    '<h3 class="tb-modal-title">' + escapeHtml(title) + "</h3>" +
                    (text ? '<p class="tb-modal-text">' + escapeHtml(text) + "</p>" : "") +
                    '<div class="tb-modal-actions"><button type="button" class="tb-btn" data-modal-close>Cancelar</button>' +
                    '<button type="button" class="tb-btn tb-btn--danger-solid" data-confirm>' + escapeHtml(okLabel || "Confirmar") + "</button></div>",
                    function (ov) {
                        ov.querySelector("[data-confirm]").addEventListener("click", function () {
                            modalResolve = null;
                            ov.remove();
                            resolve(true);
                        });
                    }
                );
                modalResolve = resolve;
            });
        }

        function openSaveDialog(asCopy) {
            var hasContent = state.doc.phases.some(function (p) { return p.objects.length || p.strokes.length; });
            if (!hasContent) {
                toast("La pizarra está vacía: agregá jugadores o trazos antes de guardar.");
                return;
            }
            var editing = state.meta.playId != null && !asCopy;
            var categories = options.categories || [];
            var teams = options.teams || [];
            var name = state.meta.name || "";
            if (asCopy && name) name = name + " (copia)";
            openModal(
                '<h3 class="tb-modal-title">' + (editing ? "Guardar cambios" : asCopy ? "Guardar como copia" : "Guardar jugada") + "</h3>" +
                '<form class="tb-save-form">' +
                '<label class="tb-field"><span>Nombre *</span><input type="text" name="name" maxlength="80" required value="' + escapeHtml(name) + '" placeholder="Ej.: Pick and roll central"></label>' +
                '<div class="tb-field-row">' +
                '<label class="tb-field"><span>Categoría</span><select name="category"><option value="">Sin categoría</option>' +
                categories.map(function (c) { return '<option value="' + escapeHtml(c) + '"' + (state.meta.category === c ? " selected" : "") + ">" + escapeHtml(c) + "</option>"; }).join("") +
                "</select></label>" +
                '<label class="tb-field"><span>Equipo</span><input type="text" name="team" list="tb-team-list" maxlength="40" value="' + escapeHtml(state.meta.team) + '" placeholder="Ej.: U15"><datalist id="tb-team-list">' +
                teams.map(function (t) { return '<option value="' + escapeHtml(t) + '">'; }).join("") + "</datalist></label></div>" +
                '<label class="tb-field"><span>Etiquetas</span><input type="text" name="tags" maxlength="160" value="' + escapeHtml((state.meta.tags || []).join(", ")) + '" placeholder="Separadas por coma: zona, fin de cuarto"></label>' +
                '<label class="tb-field"><span>Descripción</span><textarea name="description" rows="4" maxlength="2000" placeholder="Objetivo, lecturas, variantes...">' + escapeHtml(state.meta.description) + "</textarea></label>" +
                '<p class="tb-form-error" hidden></p>' +
                '<div class="tb-modal-actions"><button type="button" class="tb-btn" data-modal-close>Cancelar</button>' +
                '<button type="submit" class="tb-btn tb-btn--accent">' + ICONS.save + "<span>Guardar</span></button></div>" +
                "</form>",
                function (ov) {
                    var form = ov.querySelector("form");
                    form.addEventListener("submit", function (ev) {
                        ev.preventDefault();
                        var fd = new FormData(form);
                        var nm = String(fd.get("name") || "").trim();
                        var err = form.querySelector(".tb-form-error");
                        if (!nm) {
                            err.textContent = "Poné un nombre a la jugada.";
                            err.hidden = false;
                            return;
                        }
                        var meta = {
                            name: nm,
                            category: String(fd.get("category") || ""),
                            team: String(fd.get("team") || "").trim(),
                            tags: String(fd.get("tags") || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 12),
                            description: String(fd.get("description") || "").trim()
                        };
                        var submit = form.querySelector("[type='submit']");
                        submit.disabled = true;
                        Promise.resolve(doSave(meta, asCopy)).then(function (res) {
                            if (res && res.ok) {
                                ov.remove();
                                toast(editing ? "Cambios guardados en Jugadas guardadas." : "Jugada guardada en Jugadas guardadas.");
                            } else {
                                submit.disabled = false;
                                err.textContent = (res && res.error) || "No se pudo guardar la jugada.";
                                err.hidden = false;
                            }
                        });
                    });
                }
            );
        }

        function buildRecord(meta, asCopy) {
            var doc = clone(state.doc);
            var steps = doc.phases.map(function (p, i) {
                return renderPhaseImage(doc, i, { width: 480, type: "image/jpeg", quality: 0.72, label: false });
            });
            return {
                id: asCopy ? null : state.meta.playId,
                name: meta.name,
                description: meta.description,
                category: meta.category,
                team: meta.team,
                tags: meta.tags,
                board: doc,
                steps: steps
            };
        }

        function doSave(meta, asCopy) {
            if (!options.onSave) return { ok: false, error: "Guardado no disponible." };
            var record = buildRecord(meta, asCopy);
            var res;
            try {
                res = options.onSave(record);
            } catch (e) {
                return { ok: false, error: e && e.message ? e.message : "Error al guardar." };
            }
            return Promise.resolve(res).then(function (r) {
                if (r && r.ok) {
                    state.meta = {
                        playId: r.play ? r.play.id : record.id,
                        name: meta.name,
                        description: meta.description,
                        category: meta.category,
                        team: meta.team,
                        tags: meta.tags
                    };
                    state.dirty = false;
                    clearDraft();
                    updateHeader();
                }
                return r;
            });
        }

        function openTemplates() {
            var items = TEMPLATES.map(function (t) {
                var doc = normalizeDoc(t.build());
                var img = renderPhaseImage(doc, 0, { width: 300, label: false });
                return '<button type="button" class="tb-template" data-template="' + t.id + '">' +
                    '<img src="' + img + '" alt="">' +
                    "<strong>" + escapeHtml(t.name) + "</strong><span>" + escapeHtml(t.description) +
                    (doc.phases.length > 1 ? " · " + doc.phases.length + " fases" : "") + "</span></button>";
            }).join("");
            openModal(
                '<div class="tb-modal-head"><h3 class="tb-modal-title">Plantillas</h3><button type="button" class="tb-btn tb-btn--icon" data-modal-close aria-label="Cerrar">' + ICONS.close + "</button></div>" +
                '<p class="tb-modal-text">Puntos de partida diseñados por BasketIQ. Se cargan como una jugada nueva que podés modificar.</p>' +
                '<div class="tb-template-grid">' + items + "</div>",
                function (ov) {
                    ov.addEventListener("click", function (e) {
                        var b = e.target.closest("[data-template]");
                        if (!b) return;
                        var id = b.getAttribute("data-template");
                        var apply = function () {
                            var doc = buildTemplate(id);
                            if (!doc) return;
                            ov.remove();
                            setDoc(doc, null, { dirty: true });
                            scheduleDraft();
                            layout();
                            toast("Plantilla cargada. Guardala cuando la tengas lista.");
                        };
                        if (state.dirty) {
                            ov.remove();
                            confirmDialog("¿Reemplazar la jugada actual?", "Los cambios sin guardar se van a perder.", "Usar plantilla").then(function (ok) { if (ok) apply(); });
                        } else apply();
                    });
                }
            );
        }

        var TUTORIAL = [
            { t: "Bienvenido a la pizarra táctica", d: "Diseñá jugadas por fases, animalas y guardalas en Jugadas guardadas. Este recorrido dura menos de un minuto." },
            { t: "1. Agregá elementos", d: "Elegí Atacante, Defensor, Balón, Cono, Obstáculo, Zona o Texto en la barra de herramientas y tocá la cancha. Con «+ 5 atacantes» cargás un quinteto de una vez." },
            { t: "2. Dibujá movimientos", d: "Elegí un trazo (desplazamiento, pase, dribbling, bloqueo...) y arrastrá desde el jugador. Si lo dibujás curvo, queda curvo. La leyenda explica cada símbolo." },
            { t: "3. Editá lo que quieras", d: "Con Seleccionar tocá cualquier elemento o trazo: podés moverlo, cambiar número, nombre y color, duplicarlo o eliminarlo. Los trazos tienen manijas para ajustar extremos y curva." },
            { t: "4. Armá la secuencia", d: "«Fase siguiente» crea una fase nueva aplicando los movimientos: los jugadores van al final de sus trazos y el balón pasa al receptor del pase." },
            { t: "5. Reproducí y guardá", d: "En Reproducir ves la animación completa, paso a paso y a distintas velocidades. Guardá con el botón naranja o Ctrl+S. Si cerrás sin guardar, la pizarra te ofrece recuperar el borrador." }
        ];

        function openTutorial() {
            var step = 0;
            var ov = openModal('<div class="tb-tutorial"></div>');
            function paint() {
                var s = TUTORIAL[step];
                ov.querySelector(".tb-tutorial").innerHTML =
                    '<p class="tb-eyebrow">Paso ' + (step + 1) + " de " + TUTORIAL.length + "</p>" +
                    '<h3 class="tb-modal-title">' + escapeHtml(s.t) + "</h3><p class=\"tb-modal-text\">" + escapeHtml(s.d) + "</p>" +
                    '<div class="tb-dots">' + TUTORIAL.map(function (_x, i) { return '<span class="' + (i === step ? "is-active" : "") + '"></span>'; }).join("") + "</div>" +
                    '<div class="tb-modal-actions"><button type="button" class="tb-btn" data-tut="skip">Saltar</button>' +
                    (step > 0 ? '<button type="button" class="tb-btn" data-tut="prev">Anterior</button>' : "") +
                    '<button type="button" class="tb-btn tb-btn--accent" data-tut="next">' + (step === TUTORIAL.length - 1 ? "Empezar" : "Siguiente") + "</button></div>";
            }
            ov.addEventListener("click", function (e) {
                var b = e.target.closest("[data-tut]");
                if (!b) return;
                var a = b.getAttribute("data-tut");
                if (a === "prev") step = Math.max(0, step - 1);
                else if (a === "next" && step < TUTORIAL.length - 1) step++;
                else {
                    storageSet(TUTORIAL_KEY, "1");
                    ov.remove();
                    return;
                }
                paint();
            });
            paint();
        }

        function openShortcuts() {
            var rows = [
                ["V", "Seleccionar y mover"],
                ["1 / 2", "Atacante / defensor"],
                ["B · C · O · Z · T", "Balón · cono · obstáculo · zona · texto"]
            ].concat(STROKE_ORDER.map(function (k) { return [STROKE_TYPES[k].key.toUpperCase(), STROKE_TYPES[k].label]; })).concat([
                ["Supr / Retroceso", "Eliminar lo seleccionado"],
                ["Ctrl + D", "Duplicar lo seleccionado"],
                ["Ctrl + Z / Ctrl + Y", "Deshacer / rehacer"],
                ["Ctrl + S", "Guardar jugada"],
                ["N", "Fase siguiente"],
                ["Shift + ← / →", "Cambiar de fase"],
                ["Espacio", "Reproducir / pausar"],
                ["← / →", "En reproducción: fase anterior / siguiente"],
                ["Esc", "Deseleccionar o salir de pantalla completa"]
            ]);
            openModal(
                '<div class="tb-modal-head"><h3 class="tb-modal-title">Atajos de teclado</h3><button type="button" class="tb-btn tb-btn--icon" data-modal-close aria-label="Cerrar">' + ICONS.close + "</button></div>" +
                '<table class="tb-shortcuts"><tbody>' + rows.map(function (r) { return "<tr><td><kbd>" + escapeHtml(r[0]) + "</kbd></td><td>" + escapeHtml(r[1]) + "</td></tr>"; }).join("") + "</tbody></table>"
            );
        }

        var toastTimer = null;
        function toast(msg) {
            var el = $(".tb-toast");
            el.textContent = msg;
            el.hidden = false;
            if (toastTimer) clearTimeout(toastTimer);
            toastTimer = setTimeout(function () { el.hidden = true; }, 3200);
        }

        // -------------------------------------------------------------
        // EXPORTACIÓN
        // -------------------------------------------------------------
        function exportCurrentPng() {
            var idx = state.mode === "play" ? clamp(Math.round(state.pos), 0, state.doc.phases.length - 1) : state.phaseIndex;
            var url = renderPhaseImage(state.doc, idx, { width: 1600 });
            downloadDataUrl(url, safeFilename(state.meta.name || "jugada") + "-fase-" + (idx + 1) + ".png");
        }

        function exportSheet() {
            var urls = state.doc.phases.map(function (_p, i) { return renderPhaseImage(state.doc, i, { width: 900 }); });
            composeSheet(urls, state.meta.name || "Jugada", state.doc.phases.length + " fase(s) · Basket Lab").then(function (url) {
                downloadDataUrl(url, safeFilename(state.meta.name || "jugada") + ".png");
            });
        }

        function exportPdf() {
            if (!options.onPrint) return;
            var record = {
                name: state.meta.name || "Jugada",
                description: state.meta.description || "",
                board: clone(state.doc),
                steps: []
            };
            options.onPrint(record);
        }

        // -------------------------------------------------------------
        // CICLO DE VIDA
        // -------------------------------------------------------------
        var resizeObs = null;
        if (typeof ResizeObserver !== "undefined") {
            var lastW = 0;
            resizeObs = new ResizeObserver(function () {
                var w = stage.clientWidth;
                if (Math.abs(w - lastW) > 1) { lastW = w; layout(); }
            });
            resizeObs.observe(root);
        }
        function onWinResize() { layout(); }
        window.addEventListener("resize", onWinResize);

        function onBeforeUnload(e) {
            if (state.dirty && root.isConnected) {
                saveDraft();
            }
        }
        window.addEventListener("beforeunload", onBeforeUnload);
        window.addEventListener("pagehide", onBeforeUnload);

        function destroy() {
            if (state.destroyed) return;
            if (state.dirty) saveDraft();
            state.destroyed = true;
            stopPlayback();
            document.removeEventListener("keydown", onKeyDown);
            document.removeEventListener("click", onDocClick);
            document.removeEventListener("fullscreenchange", onFullscreenChange);
            window.removeEventListener("resize", onWinResize);
            window.removeEventListener("beforeunload", onBeforeUnload);
            window.removeEventListener("pagehide", onBeforeUnload);
            document.documentElement.classList.remove("tb-noscroll");
            if (resizeObs) resizeObs.disconnect();
            closeModal();
            if (activeInstance && activeInstance.root === root) activeInstance = null;
        }

        // Detecta cuando la app reemplaza el contenido (otra sección).
        var domObs = null;
        if (typeof MutationObserver !== "undefined") {
            domObs = new MutationObserver(function () {
                if (!root.isConnected) {
                    domObs.disconnect();
                    destroy();
                }
            });
            domObs.observe(container, { childList: true });
        }

        // -------------------------------------------------------------
        // INICIO
        // -------------------------------------------------------------
        var initialDoc = null;
        var initialMeta = null;
        if (options.play && isBoardPlay(options.play)) {
            initialDoc = options.play.board;
            initialMeta = {
                playId: options.play.id,
                name: options.play.name,
                description: options.play.description,
                category: options.play.category,
                team: options.play.team,
                tags: options.play.tags
            };
        } else if (options.doc) {
            initialDoc = options.doc;
            initialMeta = options.meta || null;
        }
        setDoc(initialDoc || createEmptyDoc({ court: "half", rotation: 90 }), initialMeta, { dirty: !!(options.doc && !options.play) });
        setTool("select");
        layout();
        setTimeout(layout, 50);

        if (!options.play && !options.doc) {
            var draft = readDraft();
            if (draft) showDraftBanner(draft);
            else if (!storageGet(TUTORIAL_KEY)) setTimeout(openTutorial, 250);
        }

        return {
            root: root,
            destroy: destroy,
            getDoc: function () { return clone(state.doc); },
            isDirty: function () { return state.dirty; },
            _state: state
        };
    }

    // =====================================================================
    // API PÚBLICA
    // =====================================================================

    return {
        VERSION: DOC_VERSION,
        FIBA: FIBA,
        STROKE_TYPES: STROKE_TYPES,
        STROKE_ORDER: STROKE_ORDER,
        TEMPLATES: TEMPLATES,
        createEmptyDoc: createEmptyDoc,
        normalizeDoc: normalizeDoc,
        isBoardPlay: isBoardPlay,
        deriveNextPhase: deriveNextPhase,
        sampleFrame: sampleFrame,
        fitStroke: fitStroke,
        strokeSamples: strokeSamples,
        computeViewport: computeViewport,
        viewAspect: viewAspect,
        toScreen: toScreen,
        toWorld: toWorld,
        buildTemplate: buildTemplate,
        renderScene: renderScene,
        ICONS: ICONS,
        renderPhaseImage: renderPhaseImage,
        composeSheet: composeSheet,
        downloadDataUrl: downloadDataUrl,
        safeFilename: safeFilename,
        mount: mount
    };
});
