/*
 * BasketIQ · Basket Lab Academy (arquitectura educativa)
 *
 * Expone window.BasketAcademy:
 * - Registro de artículos educativos con un modelo de datos común
 *   (pestañas Aprender / Visualizar / Simular / Entrenar / Evaluar / Fuentes).
 * - Renderizador reutilizable de artículos, índice, tablas y fuentes.
 * - Visor de pizarras educativas animadas sobre el motor de la pizarra táctica
 *   (window.BasketBoard), con "Abrir en pizarra táctica".
 * - Constructor compacto de pizarras (boardFromSpec) para escribir contenido.
 *
 * El contenido de cada concepto vive en js/academy-content/*.js.
 * Las funciones puras se pueden usar desde Node para pruebas.
 */
(function (root, factory) {
    var api = factory(root);
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.BasketAcademy = api;
})(typeof window !== "undefined" ? window : null, function (root) {
    "use strict";

    var TABS = [
        { id: "aprender", label: "Aprender" },
        { id: "visualizar", label: "Visualizar" },
        { id: "simular", label: "Simular" },
        { id: "entrenar", label: "Entrenar" },
        { id: "variantes", label: "Variantes" },
        { id: "evaluar", label: "Evaluar" },
        { id: "fuentes", label: "Fuentes" }
    ];

    /** Origen de cada bloque de contenido (requisito: diferenciarlo claramente). */
    var PROVENANCE = {
        official: { label: "Fuente oficial", desc: "Respaldado por un documento oficial de FIBA o WABC citado en Fuentes." },
        interpretation: { label: "Interpretación técnica", desc: "Desarrollo técnico de BasketIQ a partir de los principios citados; no es texto oficial." },
        method: { label: "Propuesta metodológica BasketIQ", desc: "Propuesta original de BasketIQ para enseñar o entrenar el concepto." },
        variant: { label: "Variante de la app", desc: "Variante táctica diseñada para BasketIQ; existen otras igual de válidas." }
    };

    var EXERCISE_FIELDS = [
        ["objective", "Objetivo principal"],
        ["secondary", "Objetivos secundarios"],
        ["category", "Categoría recomendada"],
        ["level", "Nivel de dificultad"],
        ["players", "Jugadores"],
        ["duration", "Duración"],
        ["space", "Espacio"],
        ["hoops", "Aros"],
        ["materials", "Materiales"],
        ["organization", "Organización"],
        ["development", "Desarrollo"],
        ["rules", "Reglas"],
        ["cues", "Consignas del entrenador"],
        ["errors", "Errores frecuentes"],
        ["corrections", "Correcciones"],
        ["variants", "Variantes"],
        ["progressions", "Progresiones"],
        ["regressions", "Regresiones"],
        ["evaluation", "Criterios de evaluación"],
        ["basis", "Fuente o fundamento técnico"]
    ];

    /** Pestañas visibles de un artículo (las fichas de Fundamentos no tienen simulador). */
    function tabsFor(article, labels) {
        var list;
        if (!article || !Array.isArray(article.tabOrder)) {
            // "Variantes" solo aparece en los artículos que la tienen.
            list = TABS.filter(function (t) { return t.id !== "variantes" || (article && article.tabs && article.tabs.variantes); });
        } else {
            list = TABS.filter(function (t) { return article.tabOrder.indexOf(t.id) >= 0; });
        }
        // Nombres propios de una sección (por ejemplo, el laboratorio táctico: Comprender, Enseñar...).
        labels = (article && article.tabLabels) || labels;
        if (!labels) return list;
        return list.map(function (t) { return labels[t.id] ? { id: t.id, label: labels[t.id] } : t; });
    }

    /** Modo jugador / entrenador: una sección sin audience vale para los dos. */
    var MODES = { player: "Jugador", coach: "Entrenador" };
    function forMode(list, mode) {
        if (!mode) return list || [];
        return (list || []).filter(function (s) { return !s || typeof s !== "object" || !s.audience || s.audience === mode; });
    }

    var registry = {};
    if (root && Array.isArray(root.BasketAcademyQueue)) {
        root.BasketAcademyQueue.forEach(function (a) { if (a && a.id) registry[a.id] = a; });
        root.BasketAcademyQueue = [];
    }

    function register(article) {
        registry[article.id] = article;
        return article;
    }

    function get(id) {
        return registry[id] || null;
    }

    function list() {
        return Object.keys(registry).map(function (k) { return registry[k]; });
    }

    // ------------------------------------------------------------------
    // Validación (se usa en las pruebas para que el contenido sea revisable)
    // ------------------------------------------------------------------
    function validateArticle(a) {
        var errors = [];
        if (!a || !a.id) return ["Artículo sin id"];
        var sourceIds = {};
        (a.sources || []).forEach(function (s) {
            if (!s.id || !s.title || !s.url) errors.push("Fuente incompleta: " + JSON.stringify(s));
            if (s.url && !/^https:\/\//.test(s.url)) errors.push("La fuente " + s.id + " no usa https");
            sourceIds[s.id] = true;
        });
        var boardIds = {};
        (a.boards || []).forEach(function (b) {
            if (!b.id || !b.spec) errors.push("Pizarra incompleta");
            boardIds[b.id] = true;
        });
        function checkRefs(where, refs) {
            (refs || []).forEach(function (r) {
                if (!sourceIds[r]) errors.push(where + ": referencia a fuente inexistente " + r);
            });
        }
        function checkText(where, text) {
            String(text || "").replace(/\[(S\d+)\]/g, function (_m, id) {
                if (!sourceIds[id]) errors.push(where + ": cita " + id + " sin fuente");
                return "";
            });
        }
        if (a.tabOrder) a.tabOrder.forEach(function (t) { if (!TABS.some(function (x) { return x.id === t; })) errors.push("Pestaña inexistente " + t); });
        (a.tabs.visualizar || []).forEach(function (v) {
            if (typeof v === "string" && !boardIds[v]) errors.push("visualizar: pizarra inexistente " + v);
        });
        ["aprender", "visualizar", "entrenar", "variantes", "evaluar"].forEach(function (tab) {
            (a.tabs[tab] || []).forEach(function (sec) {
                if (typeof sec === "string") return;
                if (sec.audience && !MODES[sec.audience]) errors.push(tab + "/" + sec.id + ": audiencia inválida " + sec.audience);
                if (!sec.id || !sec.title) errors.push(tab + ": sección sin id o título");
                if (!PROVENANCE[sec.kind]) errors.push(tab + "/" + sec.id + ": origen inválido " + sec.kind);
                if (sec.kind === "official" && !(sec.refs && sec.refs.length)) errors.push(tab + "/" + sec.id + ": contenido oficial sin referencia");
                checkRefs(tab + "/" + sec.id, sec.refs);
                (sec.blocks || []).forEach(function (bl) {
                    checkText(tab + "/" + sec.id, JSON.stringify(bl));
                    if (bl.board && !boardIds[bl.board]) errors.push(tab + "/" + sec.id + ": pizarra inexistente " + bl.board);
                });
            });
        });
        (a.exercises || []).forEach(function (ex) {
            EXERCISE_FIELDS.forEach(function (f) {
                if (ex[f[0]] == null || ex[f[0]] === "") errors.push("Ejercicio " + ex.id + " sin " + f[1]);
            });
            if (ex.board && !boardIds[ex.board]) errors.push("Ejercicio " + ex.id + ": pizarra inexistente");
            checkRefs("Ejercicio " + ex.id, ex.refs);
            checkText("Ejercicio " + ex.id, JSON.stringify(ex));
        });
        return errors;
    }

    // ------------------------------------------------------------------
    // Pizarras: especificación compacta -> documento de la pizarra táctica
    // ------------------------------------------------------------------
    /*
     * spec = {
     *   view: { court: "half", rotation: 90 },
     *   players: { o1: { team: "offense", label: "1", x, y }, x1: { team: "defense", ... } },
     *   phases: [{
     *     name, note,
     *     move: { x1: [x, y] },          // posiciones nuevas (el resto se conserva)
     *     ball: "o1" | [x, y],           // poseedor o posición libre
     *     strokes: [[type, from, to, bend]],   // from/to: id de jugador o [x, y]; bend: curvatura en metros
     *     zones: [{ x, y, w, h, color }], texts: [{ x, y, text, size, color }]
     *   }]
     * }
     */
    function boardFromSpec(spec, Board) {
        Board = Board || (root && root.BasketBoard);
        var pos = {};
        var players = spec.players || {};
        Object.keys(players).forEach(function (id) { pos[id] = [players[id].x, players[id].y]; });
        var ball = null;
        var zones = [];
        var texts = [];
        var carry = {};
        var carryBall;
        var MOVES = { move: 1, cut: 1, dribble: 1, screen_on: 1, screen_off: 1, rotation: 1 };
        var phases = (spec.phases || []).map(function (ph, i) {
            // Lo que dibujan los trazos de la fase anterior pasa a ser la posición de esta fase.
            Object.keys(carry).forEach(function (id) { pos[id] = carry[id]; });
            carry = {};
            if (carryBall !== undefined) ball = carryBall;
            carryBall = undefined;
            Object.keys(ph.move || {}).forEach(function (id) { pos[id] = ph.move[id]; });
            if (ph.ball !== undefined) ball = ph.ball;
            (ph.strokes || []).forEach(function (s) {
                if (typeof s[1] !== "string") return;
                if (MOVES[s[0]] && Array.isArray(s[2])) carry[s[1]] = s[2];
                if (s[0] === "pass" && typeof s[2] === "string") carryBall = s[2];
                if (s[0] === "shot") carryBall = [2.1, 7.5];
            });
            var objects = Object.keys(players).filter(function (id) {
                return !(ph.hide && ph.hide.indexOf(id) >= 0);
            }).map(function (id) {
                var p = players[id];
                return {
                    id: id,
                    kind: "player",
                    team: p.team,
                    label: p.label,
                    name: p.name || "",
                    color: p.color || (p.team === "defense" ? "#dc2626" : "#1d4ed8"),
                    x: pos[id][0],
                    y: pos[id][1]
                };
            });
            if (ball) {
                var b = { id: "ball", kind: "ball", holder: null, x: 0, y: 0 };
                if (typeof ball === "string") {
                    b.holder = ball;
                    b.x = pos[ball][0];
                    b.y = pos[ball][1];
                } else {
                    b.x = ball[0];
                    b.y = ball[1];
                }
                objects.push(b);
            }
            // Zonas y textos se mantienen de una fase a la siguiente salvo que la fase los redefina.
            if (ph.zones !== undefined) zones = ph.zones;
            if (ph.texts !== undefined) texts = ph.texts;
            zones.forEach(function (z, k) {
                objects.unshift({ id: z.id || "z" + k, kind: "zone", x: z.x, y: z.y, w: z.w, h: z.h, color: z.color || "#f97316" });
            });
            texts.forEach(function (t, k) {
                objects.push({ id: t.id || "t" + k, kind: "text", x: t.x, y: t.y, text: t.text, size: t.size || "s", color: t.color || "#111827" });
            });
            var strokes = (ph.strokes || []).map(function (s, k) {
                var from = s[1];
                var to = s[2];
                var a = typeof from === "string" ? { x: pos[from][0], y: pos[from][1] } : { x: from[0], y: from[1] };
                var bpt = typeof to === "string" ? { x: pos[to][0], y: pos[to][1] } : { x: to[0], y: to[1] };
                var c = null;
                if (s[3]) {
                    var mx = (a.x + bpt.x) / 2;
                    var my = (a.y + bpt.y) / 2;
                    var dx = bpt.x - a.x;
                    var dy = bpt.y - a.y;
                    var len = Math.hypot(dx, dy) || 1;
                    var mid = { x: mx - (dy / len) * s[3], y: my + (dx / len) * s[3] };
                    c = { x: 2 * mid.x - mx, y: 2 * mid.y - my };
                }
                return {
                    id: "s" + i + "_" + k,
                    type: s[0],
                    a: a,
                    b: bpt,
                    c: c,
                    from: typeof from === "string" ? from : null,
                    to: typeof to === "string" && s[0] === "pass" ? to : null,
                    color: s[4] || null
                };
            });
            return { id: "f" + i, name: ph.name || "Fase " + (i + 1), note: ph.note || "", objects: objects, strokes: strokes };
        });
        var doc = { version: 2, view: spec.view || { court: "half", rotation: 90 }, phases: phases };
        return Board ? Board.normalizeDoc(doc) : doc;
    }

    // ------------------------------------------------------------------
    // Texto
    // ------------------------------------------------------------------
    function esc(str) {
        return String(str == null ? "" : str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    /** **negrita**, *cursiva* y citas [S1] enlazadas a Fuentes. */
    function fmt(text) {
        return esc(text)
            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
            .replace(/(^|[\s(])\*(?!\s)(.+?)\*(?=[\s).,;:]|$)/g, "$1<em>$2</em>")
            .replace(/\[(S\d+)\]/g, '<a href="#" class="ac-cite" data-cite="$1" title="Ver fuente $1">[$1]</a>');
    }

    function slug(str) {
        return String(str || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
    }

    // ------------------------------------------------------------------
    // Render de bloques
    // ------------------------------------------------------------------
    function provenanceBadge(kind, refs) {
        var p = PROVENANCE[kind];
        if (!p) return "";
        return '<span class="ac-prov ac-prov--' + kind + '" title="' + esc(p.desc) + '">' + esc(p.label) +
            (refs && refs.length ? " · <span>" + refs.map(function (r) { return '<a href="#" class="ac-cite" data-cite="' + r + '">' + r + "</a>"; }).join(", ") + "</span>" : "") +
            "</span>";
    }

    function renderBlock(bl, ctx) {
        if (bl.p) return "<p>" + fmt(bl.p) + "</p>";
        if (bl.h) return '<h4 class="ac-h4">' + fmt(bl.h) + "</h4>";
        if (bl.list) {
            var tag = bl.ordered ? "ol" : "ul";
            return "<" + tag + ' class="ac-list">' + bl.list.map(function (li) { return "<li>" + fmt(li) + "</li>"; }).join("") + "</" + tag + ">";
        }
        if (bl.table) {
            return '<div class="ac-table-wrap"><table class="ac-table">' +
                (bl.table.caption ? "<caption>" + fmt(bl.table.caption) + "</caption>" : "") +
                "<thead><tr>" + bl.table.head.map(function (h) { return '<th scope="col">' + fmt(h) + "</th>"; }).join("") + "</tr></thead><tbody>" +
                bl.table.rows.map(function (r) {
                    return "<tr>" + r.map(function (c, i) { return i === 0 ? '<th scope="row">' + fmt(c) + "</th>" : "<td>" + fmt(c) + "</td>"; }).join("") + "</tr>";
                }).join("") + "</tbody></table></div>";
        }
        if (bl.callout) {
            return '<aside class="ac-callout ac-callout--' + (bl.tone || "info") + '">' + (bl.title ? "<strong>" + fmt(bl.title) + "</strong>" : "") + "<p>" + fmt(bl.callout) + "</p></aside>";
        }
        if (bl.quote) {
            return '<blockquote class="ac-quote"><p>' + fmt(bl.quote) + "</p>" + (bl.cite ? "<cite>" + fmt(bl.cite) + "</cite>" : "") + "</blockquote>";
        }
        if (bl.board) {
            var b = ctx.boardsById[bl.board];
            if (!b) return "";
            return '<div class="ac-board-slot" data-board="' + esc(b.id) + '"></div>';
        }
        if (bl.qa) {
            return '<details class="ac-qa"><summary>' + fmt(bl.qa) + '</summary><div class="ac-qa-body">' +
                (bl.answer || []).map(function (x) { return "<p>" + fmt(x) + "</p>"; }).join("") + "</div></details>";
        }
        if (bl.video) {
            var V = root && root.BasketVideos;
            return V ? V.renderCard(bl.video, { conceptId: bl.concept || ctx.conceptId, observe: bl.observe, purpose: bl.purpose }) : "";
        }
        if (bl.figure) {
            var F = root && root.BasketFundFigures;
            var art = F ? F.render(bl.figure) : "";
            return art ? '<figure class="ac-figure">' + art + (bl.caption ? "<figcaption>" + fmt(bl.caption) + "</figcaption>" : "") + "</figure>" : "";
        }
        if (bl.steps) {
            return '<ol class="ac-steps">' + bl.steps.map(function (st, i) {
                return '<li><span class="ac-step-n">' + (i + 1) + "</span><div><strong>" + fmt(st.title) + "</strong>" + (st.text ? "<p>" + fmt(st.text) + "</p>" : "") + "</div></li>";
            }).join("") + "</ol>";
        }
        if (bl.exerciseLink) {
            var other = get(bl.exerciseLink.article);
            var oex = other && (other.exercises || []).filter(function (x) { return x.id === bl.exerciseLink.id; })[0];
            if (!oex) return "";
            return '<div class="ac-exlink"><div><span class="ac-muted">Ejercicio compartido · está en la ficha de ' + esc(other.title) + "</span><strong>" + fmt(oex.name) + "</strong><p>" + fmt(oex.objective) + "</p>" +
                (oex.works && oex.works.length ? '<p class="ac-ex-works">Trabaja: ' + oex.works.map(esc).join(" · ") + "</p>" : "") + "</div>" +
                '<button type="button" class="tb-btn tb-btn--small tb-btn--accent" data-open-article="' + esc(other.id) + '" data-open-section="' + esc(oex.id) + '">Ver ejercicio</button></div>';
        }
        if (bl.links) {
            // Relaciones con otros contenidos (laboratorio táctico, fundamentos...). Navegan por host.go.
            return '<div class="ac-links">' + (bl.label ? '<span class="ac-links-label">' + esc(bl.label) + "</span>" : "") + bl.links.map(function (l) {
                return '<button type="button" class="ac-linkpill" data-go="' + esc(l.go) + '">' + esc(l.label) + "</button>";
            }).join("") + "</div>";
        }
        if (bl.checklist) {
            return '<ul class="ac-checklist">' + bl.checklist.map(function (c, i) {
                return '<li><label><input type="checkbox" data-check="' + esc(ctx.sectionId + "_" + i) + '"> <span>' + fmt(c) + "</span></label></li>";
            }).join("") + "</ul>";
        }
        return "";
    }

    function renderSection(sec, ctx) {
        ctx.sectionId = sec.id;
        return '<section class="ac-section" id="ac-sec-' + esc(sec.id) + '" data-section="' + esc(sec.id) + '">' +
            '<header class="ac-section-head"><h3>' + (sec.number ? '<span class="ac-num">' + esc(sec.number) + "</span>" : "") + fmt(sec.title) + "</h3>" +
            provenanceBadge(sec.kind, sec.refs) + "</header>" +
            (sec.blocks || []).map(function (bl) { return renderBlock(bl, ctx); }).join("") +
            "</section>";
    }

    /** Ejercicio en formato compacto (fichas con foto): lo esencial a la vista y el resto plegado. */
    function renderExerciseCompact(ex, ctx) {
        function group(title, fields, open, id) {
            var rows = fields.map(function (k) {
                var f = EXERCISE_FIELDS.filter(function (x) { return x[0] === k; })[0];
                var v = ex[k];
                if (!f || v == null || v === "" || (Array.isArray(v) && !v.length)) return "";
                var html = Array.isArray(v) ? '<ul class="ac-list">' + v.map(function (x) { return "<li>" + fmt(x) + "</li>"; }).join("") + "</ul>" : "<p>" + fmt(v) + "</p>";
                return '<div class="ac-ex-row"><dt>' + esc(f[1]) + "</dt><dd>" + html + "</dd></div>";
            }).join("");
            if (!rows) return "";
            return '<details class="ac-ex-fold"' + (open ? " open" : "") + (id ? ' data-fold="' + id + '"' : "") + "><summary>" + esc(title) + '</summary><dl class="ac-ex-grid">' + rows + "</dl></details>";
        }
        var fav = ctx.isExFav ? ctx.isExFav(ex.id) : null;
        var hasVariants = ex.variants && ex.variants.length;
        return '<article class="ac-exercise ac-exercise--compact" id="ac-sec-' + esc(ex.id) + '" data-section="' + esc(ex.id) + '">' +
            '<header class="ac-ex-head"><div><p class="ac-ex-kicker">Ejercicio' + (ex.solo ? " · se puede practicar solo" : "") + "</p><h3>" + fmt(ex.name) + "</h3></div>" + provenanceBadge(ex.kind || "method", ex.refs) + "</header>" +
            '<div class="ac-ex-chips"><span>' + esc(ex.level) + "</span><span>" + esc(ex.playersShort || ex.players) + "</span><span>" + esc(ex.duration) + "</span><span>" + esc(ex.space) + "</span></div>" +
            '<p class="ac-ex-objective">' + fmt(ex.objective) + "</p>" +
            (ex.works && ex.works.length ? '<p class="ac-ex-works">Trabaja: ' + ex.works.map(esc).join(" · ") + "</p>" : "") +
            '<div class="ac-ex-actions">' +
            (ctx.canAdd ? '<button type="button" class="tb-btn tb-btn--accent" data-add-exercise="' + esc(ex.id) + '">Añadir al entrenamiento</button>' : "") +
            (fav != null ? '<button type="button" class="tb-btn ac-exfav' + (fav ? " is-on" : "") + '" data-fav-exercise="' + esc(ex.id) + '" aria-pressed="' + (fav ? "true" : "false") + '">' + (fav ? "★ Guardado" : "☆ Guardar") + "</button>" : "") +
            (hasVariants ? '<button type="button" class="tb-btn" data-show-variants="' + esc(ex.id) + '">Ver variantes</button>' : "") +
            "</div>" +
            (ex.board ? '<div class="ac-board-slot" data-board="' + esc(ex.board) + '"></div>' : "") +
            group("Organización y desarrollo", ["organization", "development", "rules", "materials", "hoops", "category", "secondary"], false) +
            group("Consignas, errores y correcciones", ["cues", "errors", "corrections"], false) +
            group("Variantes, progresiones y evaluación", ["variants"].concat(EXERCISE_FIELDS.map(function (f) { return f[0]; }).filter(function (k) { return ["objective", "secondary", "category", "level", "players", "duration", "space", "hoops", "materials", "organization", "development", "rules", "cues", "errors", "corrections", "variants", "basis"].indexOf(k) < 0; })), false, "variants") +
            '<p class="ac-ex-basis">Fuente o fundamento técnico: ' + fmt(ex.basis) + "</p>" +
            "</article>";
    }

    function renderExercise(ex, ctx) {
        if (ctx.compact) return renderExerciseCompact(ex, ctx);
        var rows = EXERCISE_FIELDS.filter(function (f) { return f[0] !== "basis"; }).map(function (f) {
            var v = ex[f[0]];
            var html = Array.isArray(v) ? '<ul class="ac-list">' + v.map(function (x) { return "<li>" + fmt(x) + "</li>"; }).join("") + "</ul>" : "<p>" + fmt(v) + "</p>";
            return '<div class="ac-ex-row"><dt>' + esc(f[1]) + "</dt><dd>" + html + "</dd></div>";
        }).join("");
        return '<article class="ac-exercise" id="ac-sec-' + esc(ex.id) + '" data-section="' + esc(ex.id) + '">' +
            '<header class="ac-section-head"><h3>' + fmt(ex.name) + "</h3>" + provenanceBadge(ex.kind || "method", ex.refs) + "</header>" +
            '<div class="ac-ex-chips"><span>' + esc(ex.category) + "</span><span>" + esc(ex.level) + "</span><span>" + esc(ex.playersShort || ex.players) + "</span><span>" + esc(ex.duration) + "</span><span>" + esc(ex.space) + "</span>" + (ex.solo ? '<span class="ac-chip-solo">Se puede practicar solo</span>' : "") + "</div>" +
            (ex.works && ex.works.length ? '<p class="ac-ex-works"><strong>Fundamentos que trabaja:</strong> ' + ex.works.map(esc).join(" · ") + "</p>" : "") +
            (ex.board ? '<div class="ac-board-slot" data-board="' + esc(ex.board) + '"></div>' : "") +
            '<dl class="ac-ex-grid">' + rows + "</dl>" +
            '<p class="ac-ex-basis"><strong>Fuente o fundamento técnico:</strong> ' + fmt(ex.basis) + "</p>" +
            (ctx.canAdd || ctx.canAsk ? '<div class="ac-ex-actions">' +
                (ctx.canAdd ? '<button type="button" class="tb-btn tb-btn--accent" data-add-exercise="' + esc(ex.id) + '">Añadir al entrenamiento</button>' : "") +
                (ctx.canAsk ? '<button type="button" class="tb-btn" data-ask-exercise="' + esc(ex.id) + '">Analizar con mi Asistente IA</button>' : "") +
                (ctx.canLibrary ? '<button type="button" class="tb-btn" data-open-library>Ver biblioteca de ejercicios</button>' : "") + "</div>" : "") +
            "</article>";
    }

    function renderSources(article) {
        var used = (article.sources || []).map(function (s) {
            return '<li class="ac-source" id="ac-src-' + esc(s.id) + '"><span class="ac-source-id">' + esc(s.id) + "</span><div>" +
                "<strong>" + esc(s.title) + "</strong>" +
                '<p class="ac-muted">' + esc([s.publisher, s.year].filter(Boolean).join(" · ")) + (s.locator ? " · " + esc(s.locator) : "") + "</p>" +
                '<p><a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' + esc(s.url) + "</a></p>" +
                (s.used ? "<p>" + fmt(s.used) + "</p>" : "") +
                (s.accessed ? '<p class="ac-muted">Consultada el ' + esc(s.accessed) + ".</p>" : "") +
                "</div></li>";
        }).join("");
        var missing = (article.unavailableSources || []).map(function (s) {
            return "<li><strong>" + esc(s.title) + '</strong> — <a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' + esc(s.url) + "</a><br><span class=\"ac-muted\">" + esc(s.reason) + "</span></li>";
        }).join("");
        var legend = Object.keys(PROVENANCE).map(function (k) {
            return "<li>" + provenanceBadge(k) + " " + esc(PROVENANCE[k].desc) + "</li>";
        }).join("");
        return '<section class="ac-section" id="ac-sec-bibliografia" data-section="bibliografia"><header class="ac-section-head"><h3>Bibliografía verificable</h3></header>' +
            '<p>Cada cita entre corchetes del texto (por ejemplo [S1]) remite a esta lista. Todas las fuentes se consultaron directamente; los textos de BasketIQ son redacciones originales en español, no traducciones de los manuales.</p>' +
            '<ol class="ac-sources">' + used + "</ol></section>" +
            (missing ? '<section class="ac-section" id="ac-sec-no-consultadas" data-section="no-consultadas"><header class="ac-section-head"><h3>Fuentes que no pudimos consultar</h3></header><p>Estas fuentes son pertinentes pero no se pudieron abrir al redactar el contenido. No se usaron ni se citan.</p><ul class="ac-list">' + missing + "</ul></section>" : "") +
            '<section class="ac-section" id="ac-sec-origen" data-section="origen"><header class="ac-section-head"><h3>Cómo leer el origen de cada sección</h3></header><ul class="ac-list ac-prov-legend">' + legend + "</ul></section>";
    }

    /** Desafíos de la guía (vienen de BasketChallenges a través del host). */
    function renderChallengeList(list, ctx) {
        return '<section class="ac-section" id="ac-sec-desafios" data-section="desafios"><header class="ac-section-head"><h3>Desafíos tácticos</h3></header>' +
            "<p>Situaciones de juego para decidir sobre la pizarra. Al responder, recibís el análisis de tu decisión, las alternativas y la pizarra que lo explica.</p>" +
            '<ul class="ac-ch-list">' + list.map(function (c) {
                return '<li><div><strong>' + esc(c.title) + '</strong><span class="ac-muted">' + esc(c.question) + (c.statusLabel ? " · " + esc(c.statusLabel) : "") + "</span></div>" +
                    '<button type="button" class="tb-btn tb-btn--small tb-btn--accent" data-open-challenge="' + esc(c.id) + '">' + (c.statusLabel ? "Ver desafío" : "Responder") + "</button></li>";
            }).join("") + "</ul>" +
            (ctx.canStudy && !ctx.isStudied ? '<p class="ac-muted">Cuando termines la guía, marcala como estudiada para verla en «Mi progreso».</p><p><button type="button" class="tb-btn ac-studied" aria-pressed="false">Marcar como estudiada</button></p>' : "") +
            "</section>";
    }

    function tabSections(article, tab, ctx) {
        if (tab === "fuentes") {
            var out = [{ id: "bibliografia", title: "Bibliografía verificable" }];
            if ((article.unavailableSources || []).length) out.push({ id: "no-consultadas", title: "Fuentes no consultadas" });
            out.push({ id: "origen", title: "Origen del contenido" });
            return out;
        }
        var mode = ctx && ctx.mode;
        if (tab === "visualizar") return forMode(article.tabs.visualizar, mode).map(function (id) {
            if (typeof id === "object") return { id: id.id, title: id.title };
            var b = (article.boards || []).filter(function (x) { return x.id === id; })[0];
            return { id: "board-" + id, title: b ? b.title : id };
        });
        var secs = forMode(article.tabs[tab], mode).map(function (s) { return { id: s.id, title: s.title, number: s.number }; });
        if (tab === "entrenar") secs = secs.concat(orderExercises(article, mode).map(function (e) { return { id: e.id, title: e.name }; }));
        if (tab === "evaluar" && ctx && ctx.challenges && ctx.challenges.length) secs.push({ id: "desafios", title: "Desafíos tácticos" });
        return secs;
    }

    /** En modo jugador, primero los ejercicios que se pueden practicar solo. */
    function orderExercises(article, mode) {
        var list = (article.exercises || []).slice();
        if (mode === "player") list.sort(function (a, b) { return (b.solo ? 1 : 0) - (a.solo ? 1 : 0); });
        return list;
    }

    /** Resumen de la ficha de un fundamento (encabezado). */
    function renderFicha(article, mode, compact) {
        var f = article.ficha;
        if (!f) return "";
        if (compact) {
            var intro0 = mode && f.modeIntro ? f.modeIntro[mode] : "";
            var fact = function (label, v) {
                if (!v || (Array.isArray(v) && !v.length)) return "";
                var html = Array.isArray(v) ? v.map(function (x) { return fmt(x); }).join(" · ") : fmt(v);
                return '<div class="ac-fact"><dt>' + esc(label) + "</dt><dd>" + html + "</dd></div>";
            };
            return '<section class="ac-ficha ac-ficha--compact" aria-label="Resumen del fundamento">' +
                '<p class="ac-ficha-lead">' + fmt(f.definition) + "</p>" +
                '<dl class="ac-facts">' + fact((f.labels && f.labels.objective) || "Objetivo", f.objective) + fact((f.labels && f.labels.prereqs) || "Antes conviene dominar", f.prereqs) + fact((f.labels && f.labels.applications) || "Se usa en el juego", f.applications) + "</dl>" +
                (intro0 ? '<p class="ac-ficha-mode">' + fmt(intro0) + "</p>" : "") +
                "</section>";
        }
        function row(label, v) {
            if (!v || (Array.isArray(v) && !v.length)) return "";
            var html = Array.isArray(v) ? '<ul class="ac-list">' + v.map(function (x) { return "<li>" + fmt(x) + "</li>"; }).join("") + "</ul>" : "<p>" + fmt(v) + "</p>";
            return '<div class="ac-ficha-row"><dt>' + esc(label) + "</dt><dd>" + html + "</dd></div>";
        }
        var intro = mode && f.modeIntro ? f.modeIntro[mode] : "";
        return '<section class="ac-ficha" aria-label="Ficha del fundamento">' +
            (f.figure && root && root.BasketFundFigures ? '<div class="ac-ficha-art">' + root.BasketFundFigures.render(f.figure) + "</div>" : "") +
            '<dl class="ac-ficha-grid">' +
            row("Nombre en inglés", f.en) +
            row("Definición", f.definition) +
            row("Objetivo", f.objective) +
            row("Nivel orientativo", f.level) +
            row("Habilidades previas", f.prereqs) +
            row("Se usa en el juego", f.applications) +
            row("Material audiovisual", f.media) +
            "</dl>" +
            (intro ? '<p class="ac-ficha-mode">' + fmt(intro) + "</p>" : "") +
            "</section>";
    }

    function renderTab(article, tab, ctx) {
        if (tab === "fuentes") return renderSources(article);
        if (tab === "simular") {
            if (article.simulator) {
                return '<section class="ac-section ac-section--sim" id="ac-sec-simulador" data-section="simulador"><div class="ac-sim-slot"></div></section>';
            }
            return '<section class="ac-section" id="ac-sec-simulador" data-section="simulador"><header class="ac-section-head"><h3>Simulador</h3></header>' +
                '<p>Este contenido todavía no tiene simulador. Las situaciones están animadas en <strong>Visualizar</strong>.</p></section>';
        }
        if (tab === "visualizar") {
            return forMode(article.tabs.visualizar, ctx.mode).map(function (id) {
                if (typeof id === "object") return renderSection(id, ctx);
                var b = ctx.boardsById[id];
                if (!b) return "";
                return '<section class="ac-section" id="ac-sec-board-' + esc(id) + '" data-section="board-' + esc(id) + '"><div class="ac-board-slot" data-board="' + esc(id) + '"></div></section>';
            }).join("");
        }
        var html = forMode(article.tabs[tab], ctx.mode).map(function (s) { return renderSection(s, ctx); }).join("");
        if (tab === "entrenar") html += orderExercises(article, ctx.mode).map(function (e) { return renderExercise(e, ctx); }).join("");
        if (tab === "evaluar" && ctx.challenges && ctx.challenges.length) html += renderChallengeList(ctx.challenges, ctx);
        return html;
    }

    // ------------------------------------------------------------------
    // Visor de pizarras educativas
    // ------------------------------------------------------------------
    var PLAYER_ICON = {
        offense: '<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="8" fill="#1d4ed8"/><text x="12" y="16" text-anchor="middle" font-size="10" font-weight="700" fill="#fff" font-family="sans-serif">1</text></svg>',
        defense: '<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="7.5" stroke="#dc2626" stroke-width="2.5" fill="#fff"/><text x="12" y="15.5" text-anchor="middle" font-size="8" font-weight="700" fill="#dc2626" font-family="sans-serif">X</text></svg>',
        ball: '<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="7" fill="#f57c00" stroke="#3b1d06" stroke-width="1.4"/><path d="M5 12h14M12 5v14" stroke="#3b1d06" stroke-width="1.4"/></svg>',
        zone: '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="3" y="5" width="18" height="14" rx="3" fill="rgba(249,115,22,.3)" stroke="#f97316" stroke-dasharray="3 2"/></svg>'
    };

    var activeViewers = [];

    function mountViewer(slot, boardDef, options) {
        var Board = root && root.BasketBoard;
        if (!Board) {
            slot.innerHTML = '<p class="ac-muted">No se pudo cargar el motor de la pizarra.</p>';
            return null;
        }
        options = options || {};
        // Un documento ya armado (por ejemplo, una secuencia del simulador) se usa tal cual.
        var doc = boardDef.doc ? Board.normalizeDoc(JSON.parse(JSON.stringify(boardDef.doc))) : boardFromSpec(boardDef.spec, Board);
        var n = doc.phases.length;
        var state = { pos: 0, playing: false, target: null, hold: 0, speed: 1, arrows: true, raf: 0, last: 0, fullscreen: false };

        var usedStrokes = {};
        var hasZone = false;
        var hasBall = false;
        doc.phases.forEach(function (ph) {
            ph.strokes.forEach(function (s) { usedStrokes[s.type] = true; });
            ph.objects.forEach(function (o) {
                if (o.kind === "zone") hasZone = true;
                if (o.kind === "ball") hasBall = true;
            });
        });
        var legendItems = ['<li>' + PLAYER_ICON.offense + " Atacante</li>", "<li>" + PLAYER_ICON.defense + " Defensor</li>"];
        if (hasBall) legendItems.push("<li>" + PLAYER_ICON.ball + " Balón</li>");
        if (hasZone) legendItems.push("<li>" + PLAYER_ICON.zone + " Espacio relevante</li>");
        Board.STROKE_ORDER.forEach(function (k) {
            if (usedStrokes[k]) legendItems.push('<li><span class="ac-legend-stroke">' + ((Board.ICONS && Board.ICONS[k]) || "") + "</span>" + esc(Board.STROKE_TYPES[k].label) + "</li>");
        });

        slot.innerHTML =
            '<figure class="ac-board">' +
            '<figcaption class="ac-board-head"><span class="ac-board-kicker">Pizarra explicativa</span><strong>' + esc(boardDef.title) + "</strong>" +
            (boardDef.kind ? provenanceBadge(boardDef.kind, boardDef.refs) : "") + "</figcaption>" +
            (boardDef.intro ? '<p class="ac-board-intro">' + fmt(boardDef.intro) + "</p>" : "") +
            '<div class="ac-board-stage"><canvas aria-label="' + esc(boardDef.title) + '"></canvas></div>' +
            '<div class="ac-board-caption" aria-live="polite"></div>' +
            '<div class="ac-board-controls">' +
            '<button type="button" class="ac-pbtn" data-v="restart" aria-label="Reiniciar" title="Reiniciar">⟲</button>' +
            '<button type="button" class="ac-pbtn" data-v="prev" aria-label="Fase anterior" title="Fase anterior">◀</button>' +
            '<button type="button" class="ac-pbtn ac-pbtn--main" data-v="play" aria-label="Reproducir" title="Reproducir">▶</button>' +
            '<button type="button" class="ac-pbtn" data-v="next" aria-label="Fase siguiente" title="Fase siguiente">▶|</button>' +
            '<div class="ac-dots" role="tablist" aria-label="Fases">' + doc.phases.map(function (p, i) {
                return '<button type="button" class="ac-dot" data-phase="' + i + '" aria-label="Fase ' + (i + 1) + ": " + esc(p.name) + '" title="' + (i + 1) + ". " + esc(p.name) + '">' + (i + 1) + "</button>";
            }).join("") + "</div>" +
            '<select class="ac-speed" aria-label="Velocidad"><option value="0.5">0,5×</option><option value="1" selected>1×</option><option value="1.5">1,5×</option></select>' +
            "</div>" +
            '<div class="ac-board-actions">' +
            '<button type="button" class="tb-btn tb-btn--small" data-v="arrows" aria-pressed="true">Ocultar flechas</button>' +
            '<button type="button" class="tb-btn tb-btn--small" data-v="fullscreen">Pantalla completa</button>' +
            (options.onOpenInBoard ? '<button type="button" class="tb-btn tb-btn--small tb-btn--accent" data-v="open">Abrir en pizarra táctica</button>' : "") +
            "</div>" +
            '<details class="ac-board-legend"><summary>Leyenda</summary><ul>' + legendItems.join("") + "</ul></details>" +
            (boardDef.explain ? '<div class="ac-board-explain">' + boardDef.explain.map(function (x) { return "<p>" + fmt(x) + "</p>"; }).join("") + "</div>" : "") +
            "</figure>";

        var fig = slot.querySelector(".ac-board");
        var canvas = slot.querySelector("canvas");
        var stage = slot.querySelector(".ac-board-stage");
        var caption = slot.querySelector(".ac-board-caption");
        var ctx2d = canvas.getContext("2d");
        var vp = null;
        var dpr = 1;

        function layout() {
            var w = stage.clientWidth || 600;
            var aspect = Board.viewAspect(doc.view);
            var maxH = state.fullscreen ? Math.max(240, window.innerHeight - 190) : Math.min(560, Math.max(260, window.innerHeight * 0.62));
            var h = Math.max(220, Math.min(Math.round(w / aspect), maxH));
            dpr = Math.min(window.devicePixelRatio || 1, 2.5);
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            canvas.style.width = w + "px";
            canvas.style.height = h + "px";
            vp = Board.computeViewport(doc.view, w, h, 6);
            draw();
        }

        function draw() {
            if (!vp) return;
            var f = Board.sampleFrame(doc, state.pos);
            ctx2d.setTransform(1, 0, 0, 1, 0, 0);
            ctx2d.clearRect(0, 0, canvas.width, canvas.height);
            Board.renderScene(ctx2d, vp, { objects: f.objects, strokes: state.arrows ? f.strokes : [], strokeAlpha: f.strokeAlpha }, { dpr: dpr });
            var idx = Math.min(n - 1, Math.floor(state.pos + 1e-3));
            var ph = doc.phases[idx];
            caption.innerHTML = '<span class="ac-board-step">Fase ' + (idx + 1) + " de " + n + "</span> <strong>" + esc(ph.name) + "</strong>" + (ph.note ? "<p>" + fmt(ph.note) + "</p>" : "");
            slot.querySelectorAll(".ac-dot").forEach(function (d) {
                var on = Number(d.getAttribute("data-phase")) === idx;
                d.classList.toggle("is-active", on);
                d.setAttribute("aria-selected", on ? "true" : "false");
            });
            var pb = slot.querySelector('[data-v="play"]');
            pb.textContent = state.playing ? "❚❚" : "▶";
            pb.setAttribute("aria-label", state.playing ? "Pausar" : "Reproducir");
        }

        function tick(ts) {
            state.raf = 0;
            if (!state.playing) return;
            if (!slot.isConnected) { stop(); return; }
            var dt = state.last ? Math.min(0.1, (ts - state.last) / 1000) : 0;
            state.last = ts;
            if (state.hold > 0) state.hold -= dt * state.speed;
            else {
                var before = state.pos;
                state.pos += (dt * state.speed) / 1.8;
                if (state.pos >= state.target) {
                    state.pos = state.target;
                    stop();
                    draw();
                    return;
                }
                if (Math.floor(state.pos) > Math.floor(before)) {
                    state.pos = Math.floor(state.pos);
                    state.hold = 1.1;
                }
            }
            draw();
            state.raf = requestAnimationFrame(tick);
        }

        function play(target) {
            if (n < 2) return;
            if (target == null) {
                if (state.pos >= n - 1 - 1e-3) state.pos = 0;
                target = n - 1;
            }
            state.target = target;
            state.playing = true;
            state.last = 0;
            state.hold = 0;
            if (!state.raf) state.raf = requestAnimationFrame(tick);
            draw();
        }

        function stop() {
            state.playing = false;
            if (state.raf) cancelAnimationFrame(state.raf);
            state.raf = 0;
            draw();
        }

        function toggleFullscreen() {
            state.fullscreen = !state.fullscreen;
            fig.classList.toggle("ac-board--fullscreen", state.fullscreen);
            document.documentElement.classList.toggle("tb-noscroll", state.fullscreen);
            slot.querySelector('[data-v="fullscreen"]').textContent = state.fullscreen ? "Salir de pantalla completa" : "Pantalla completa";
            setTimeout(layout, 30);
        }

        slot.addEventListener("click", function (e) {
            var dot = e.target.closest("[data-phase]");
            if (dot) {
                stop();
                state.pos = Number(dot.getAttribute("data-phase"));
                draw();
                return;
            }
            var b = e.target.closest("[data-v]");
            if (!b) return;
            var v = b.getAttribute("data-v");
            if (v === "play") { if (state.playing) stop(); else play(); }
            else if (v === "next") { var t = Math.min(n - 1, Math.floor(state.pos + 1e-3) + 1); if (t > state.pos) play(t); }
            else if (v === "prev") { stop(); state.pos = Math.max(0, Math.ceil(state.pos - 1e-3) - 1); draw(); }
            else if (v === "restart") { stop(); state.pos = 0; draw(); }
            else if (v === "arrows") {
                state.arrows = !state.arrows;
                b.textContent = state.arrows ? "Ocultar flechas" : "Mostrar flechas";
                b.setAttribute("aria-pressed", state.arrows ? "true" : "false");
                draw();
            } else if (v === "fullscreen") toggleFullscreen();
            else if (v === "open" && options.onOpenInBoard) {
                stop();
                if (state.fullscreen) toggleFullscreen();
                // Copia profunda: la plantilla educativa no se modifica nunca.
                options.onOpenInBoard(JSON.parse(JSON.stringify(doc)), boardDef);
            }
        });
        slot.querySelector(".ac-speed").addEventListener("change", function (e) {
            state.speed = Number(e.target.value) || 1;
        });
        fig.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && state.fullscreen) toggleFullscreen();
        });

        var viewer = { layout: layout, stop: stop, slot: slot, doc: doc };
        activeViewers.push(viewer);
        layout();
        return viewer;
    }

    if (root && root.addEventListener) {
        root.addEventListener("resize", function () {
            activeViewers = activeViewers.filter(function (v) { return v.slot.isConnected; });
            activeViewers.forEach(function (v) { v.layout(); });
        });
    }

    // ------------------------------------------------------------------
    // Render de un artículo completo
    // ------------------------------------------------------------------
    /*
     * host = {
     *   onOpenInBoard(doc, boardDef),
     *   getProgress() -> { favorites: {}, reading: {} },
     *   setFavorite(articleId, bool), saveReading(articleId, { tab, section }),
     *   onBack()
     * }
     */
    function render(target, articleId, host, opts) {
        host = host || {};
        opts = opts || {};
        var article = get(articleId);
        if (!article) {
            target.innerHTML = '<section class="manual-section"><p>Contenido no encontrado.</p></section>';
            return;
        }
        // Contenedor propio: los eventos quedan atados a este artículo y desaparecen con él.
        target.innerHTML = "";
        var container = document.createElement("div");
        container.className = "ac-root";
        target.appendChild(container);
        activeViewers.forEach(function (v) { v.stop(); });
        activeViewers = [];
        var boardsById = {};
        (article.boards || []).forEach(function (b) { boardsById[b.id] = b; });
        var progress = host.getProgress ? host.getProgress() : { favorites: {}, reading: {} };
        var reading = (progress.reading || {})[article.id] || null;
        var isFav = !!(progress.favorites || {})[article.id];
        var isStudied = !!(progress.studied || {})[article.id];
        var challenges = host.getChallenges ? (host.getChallenges(article.id) || []) : [];
        var current = { tab: opts.tab || "aprender", mode: article.modes ? (host.getMode ? host.getMode() : "player") : null };
        var TABS_A = tabsFor(article, host.tabLabels);

        var media = host.heroMedia ? host.heroMedia(article) : null;
        var modesHtml = article.modes ? '<div class="ac-modes" role="group" aria-label="Perspectiva">' + (media ? '<span class="ac-modes-label">Ver como</span>' : "") + Object.keys(MODES).map(function (k) {
            return '<button type="button" class="ac-mode" data-mode="' + k + '" aria-pressed="' + (current.mode === k ? "true" : "false") + '">' + (media ? esc(MODES[k]) : "Modo " + esc(MODES[k].toLowerCase())) + "</button>";
        }).join("") + "</div>" : "";
        var favLabel = function (on) { return on ? "★ En favoritos" : "☆ Guardar en favoritos"; };
        var tabsHtml = '<nav class="ac-tabs" role="tablist" aria-label="Secciones del contenido">' +
            TABS_A.map(function (t) {
                return '<button type="button" role="tab" class="ac-tab" data-tab="' + t.id + '" aria-selected="false">' + esc(t.label) + "</button>";
            }).join("") + "</nav>";
        var jumpsHtml = article.quickJumps ? article.quickJumps.map(function (q, i) {
            return '<button type="button" class="tb-btn' + (!media || i === 0 ? " tb-btn--accent" : "") + '" data-jump-tab="' + esc(q.tab) + '"' + (q.section ? ' data-jump-section="' + esc(q.section) + '"' : "") + ">" + esc(q.label) + "</button>";
        }).join("") : "";

        if (media) {
            // Variante fotográfica (academia de Fundamentos): foto + datos clave, resumen breve,
            // barra de pestañas con el modo jugador/entrenador al costado.
            container.innerHTML =
                '<article class="ac ac--photo">' +
                (media.crumbs && media.crumbs.length ? '<nav class="ac-crumbnav" aria-label="Ruta">' + media.crumbs.map(function (c) {
                    return c.go ? '<button type="button" class="ac-crumb" data-go="' + esc(c.go) + '">' + esc(c.label) + "</button>" : '<span aria-current="page">' + esc(c.label) + "</span>";
                }).join('<span class="ac-crumb-sep" aria-hidden="true">/</span>') + "</nav>" : "") +
                '<header class="ac-hero ac-hero--photo">' +
                '<figure class="ac-hero-media">' + media.img + (media.note ? "<figcaption>" + esc(media.note) + "</figcaption>" : "") + "</figure>" +
                '<div class="ac-hero-info">' +
                (media.kicker ? '<p class="ac-hero-kicker">' + esc(media.kicker) + "</p>" : "") +
                "<h2>" + esc(article.title) + "</h2>" +
                (article.ficha && article.ficha.en ? '<p class="ac-hero-en">' + esc(article.ficha.en) + "</p>" : "") +
                '<p class="ac-subtitle">' + fmt(article.subtitle) + "</p>" +
                '<div class="ac-meta">' + (article.meta || []).map(function (m) { return "<span>" + esc(m) + "</span>"; }).join("") + "</div>" +
                '<div class="ac-hero-actions">' + jumpsHtml +
                '<button type="button" class="tb-btn ac-fav' + (isFav ? " is-on" : "") + '" aria-pressed="' + (isFav ? "true" : "false") + '">' + favLabel(isFav) + "</button>" +
                (host.setStudied ? studiedButton() : "") +
                (host.onAskAssistant ? '<button type="button" class="tb-btn ac-ask" data-ask-article>Analizar con mi Asistente IA</button>' : "") +
                "</div></div></header>" +
                '<div class="ac-resume" hidden></div>' +
                '<div class="ac-ficha-slot"></div>' +
                '<div class="ac-tabbar">' + tabsHtml + modesHtml + "</div>" +
                '<div class="ac-layout"><aside class="ac-toc" aria-label="Índice"></aside><div class="ac-content" role="tabpanel"></div></div>' +
                "</article>";
        } else {
        container.innerHTML =
            '<article class="ac">' +
            '<header class="ac-hero">' +
            '<p class="ac-crumbs">' + esc(article.crumbs || ("Basket Lab Academy · " + (article.sectionLabel || ""))) + "</p>" +
            "<h2>" + esc(article.title) + "</h2>" +
            '<p class="ac-subtitle">' + fmt(article.subtitle) + "</p>" +
            '<div class="ac-meta">' + (article.meta || []).map(function (m) { return "<span>" + esc(m) + "</span>"; }).join("") + "</div>" +
            modesHtml +
            '<div class="ac-ficha-slot"></div>' +
            '<div class="ac-hero-actions">' +
            jumpsHtml +
            '<button type="button" class="tb-btn ac-fav' + (isFav ? " is-on" : "") + '" aria-pressed="' + (isFav ? "true" : "false") + '">' + favLabel(isFav) + "</button>" +
            (host.setStudied ? studiedButton() : "") +
            (host.onAskAssistant ? '<button type="button" class="tb-btn tb-btn--accent ac-ask" data-ask-article>Analizar con mi Asistente IA</button>' : "") +
            "</div>" +
            '<div class="ac-resume" hidden></div>' +
            "</header>" +
            tabsHtml +
            '<div class="ac-layout"><aside class="ac-toc" aria-label="Índice"></aside><div class="ac-content" role="tabpanel"></div></div>' +
            "</article>";
        }

        function studiedButton() {
            return '<button type="button" class="tb-btn ac-studied' + (isStudied ? " is-on" : "") + '" aria-pressed="' + (isStudied ? "true" : "false") + '">' + (isStudied ? "✓ Estudiada" : "Marcar como estudiada") + "</button>";
        }

        var content = container.querySelector(".ac-content");
        var toc = container.querySelector(".ac-toc");
        var observer = null;
        var saveTimer = null;

        function showTab(tab, sectionId) {
            current.tab = tab;
            container.querySelectorAll(".ac-tab").forEach(function (b) {
                var on = b.getAttribute("data-tab") === tab;
                b.classList.toggle("is-active", on);
                b.setAttribute("aria-selected", on ? "true" : "false");
            });
            activeViewers.forEach(function (v) { v.stop(); });
            activeViewers = [];
            var ctx = { compact: !!media, isExFav: host.isExerciseFavorite ? function (exId) { return host.isExerciseFavorite(article.id, exId); } : null, mode: current.mode, conceptId: article.conceptId || null, boardsById: boardsById, canAdd: !!host.onAddExercise, canLibrary: !!host.onOpenLibrary, canAsk: !!host.onAskAssistant, challenges: host.onOpenChallenge ? challenges : [], canStudy: !!host.setStudied, isStudied: isStudied };
            content.innerHTML = renderTab(article, tab, ctx);
            var secs = tabSections(article, tab, ctx);
            toc.innerHTML = '<p class="ac-toc-title">En esta pestaña</p><ol>' + secs.map(function (s) {
                return '<li><a href="#ac-sec-' + esc(s.id) + '" data-goto="' + esc(s.id) + '">' + (s.number ? '<span class="ac-toc-num">' + esc(s.number) + "</span>" : "") + fmt(s.title) + "</a></li>";
            }).join("") + "</ol>";
            content.querySelectorAll(".ac-board-slot").forEach(function (slot) {
                var def = boardsById[slot.getAttribute("data-board")];
                if (def) mountViewer(slot, def, { onOpenInBoard: host.onOpenInBoard });
            });
            var simSlot = content.querySelector(".ac-sim-slot");
            if (simSlot) {
                if (root.BasketSim) {
                    root.BasketSim.mount(simSlot, article.simulator, {
                        fmt: fmt,
                        provenanceBadge: provenanceBadge,
                        onOpenInBoard: host.onOpenInBoard ? function (doc, meta) {
                            host.onOpenInBoard(doc, { title: meta.name, description: meta.description, tags: meta.tags });
                        } : null,
                        onSaveAsPlay: host.onSaveAsPlay || null,
                        onAskAssistant: host.onAskAssistant ? function (sel, button) {
                            host.onAskAssistant(article, { variantId: sel.variant, positionId: sel.position, returnFocus: button });
                        } : null,
                        onShowExercises: (article.exercises || []).length ? function () {
                            showTab("entrenar");
                            (container.querySelector(".ac-tabbar") || container.querySelector(".ac-tabs")).scrollIntoView({ behavior: "smooth", block: "start" });
                        } : null
                    });
                } else {
                    simSlot.innerHTML = '<p class="ac-muted">No se pudo cargar el simulador. Recargá la página.</p>';
                }
            }
            restoreChecks();
            watchSections();
            if (sectionId) scrollToSection(sectionId);
            persistReading(sectionId || (secs[0] && secs[0].id));
        }

        function scrollToSection(id) {
            var el = container.querySelector("#ac-sec-" + (window.CSS && CSS.escape ? CSS.escape(id) : id));
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }

        function persistReading(sectionId) {
            if (!host.saveReading || !container.isConnected) return;
            // Mientras se ofrece "Retomar lectura" no se pisa el punto guardado.
            var banner = container.querySelector(".ac-resume");
            if (banner && !banner.hidden) return;
            if (saveTimer) clearTimeout(saveTimer);
            saveTimer = setTimeout(function () {
                host.saveReading(article.id, { tab: current.tab, section: sectionId || null });
            }, 600);
        }

        function watchSections() {
            if (observer) observer.disconnect();
            if (typeof IntersectionObserver === "undefined") return;
            observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (en) {
                    if (!en.isIntersecting) return;
                    var id = en.target.getAttribute("data-section");
                    toc.querySelectorAll("a").forEach(function (a) {
                        a.classList.toggle("is-active", a.getAttribute("data-goto") === id);
                    });
                    persistReading(id);
                });
            }, { rootMargin: "-20% 0px -65% 0px" });
            content.querySelectorAll("[data-section]").forEach(function (s) { observer.observe(s); });
        }

        var CHECK_KEY = "basketLab_academyChecks";
        function restoreChecks() {
            var saved = {};
            try { saved = JSON.parse(localStorage.getItem(CHECK_KEY) || "{}") || {}; } catch (e) { saved = {}; }
            content.querySelectorAll("[data-check]").forEach(function (c) {
                c.checked = !!saved[article.id + ":" + c.getAttribute("data-check")];
            });
        }

        container.addEventListener("change", function (e) {
            var c = e.target.closest("[data-check]");
            if (!c) return;
            var saved = {};
            try { saved = JSON.parse(localStorage.getItem(CHECK_KEY) || "{}") || {}; } catch (err) { saved = {}; }
            saved[article.id + ":" + c.getAttribute("data-check")] = c.checked;
            try { localStorage.setItem(CHECK_KEY, JSON.stringify(saved)); } catch (err) { /* no-op */ }
        });

        function paintFicha() {
            var slot = container.querySelector(".ac-ficha-slot");
            if (slot) slot.innerHTML = renderFicha(article, current.mode, !!media);
        }
        paintFicha();

        container.addEventListener("click", function (e) {
            var modeBtn = e.target.closest("[data-mode]");
            if (modeBtn && article.modes) {
                current.mode = modeBtn.getAttribute("data-mode");
                container.querySelectorAll("[data-mode]").forEach(function (b) { b.setAttribute("aria-pressed", b === modeBtn ? "true" : "false"); });
                if (host.setMode) host.setMode(current.mode);
                paintFicha();
                showTab(current.tab);
                return;
            }
            var crumb = e.target.closest("[data-go]");
            if (crumb && host.go) {
                host.go(crumb.getAttribute("data-go"));
                return;
            }
            var jump = e.target.closest("[data-jump-tab]");
            if (jump) {
                container.querySelector(".ac-resume").hidden = true;
                showTab(jump.getAttribute("data-jump-tab"), jump.getAttribute("data-jump-section") || null);
                if (!jump.getAttribute("data-jump-section")) (container.querySelector(".ac-tabbar") || container.querySelector(".ac-tabs")).scrollIntoView({ behavior: "smooth", block: "start" });
                return;
            }
            var openArt = e.target.closest("[data-open-article]");
            if (openArt && host.onOpenArticle) {
                host.onOpenArticle(openArt.getAttribute("data-open-article"), { tab: "entrenar", section: openArt.getAttribute("data-open-section") });
                return;
            }
            var tabBtn = e.target.closest("[data-tab]");
            if (tabBtn) {
                container.querySelector(".ac-resume").hidden = true;
                showTab(tabBtn.getAttribute("data-tab"));
                (container.querySelector(".ac-tabbar") || container.querySelector(".ac-tabs")).scrollIntoView({ behavior: "smooth", block: "start" });
                return;
            }
            var go = e.target.closest("[data-goto]");
            if (go) {
                e.preventDefault();
                scrollToSection(go.getAttribute("data-goto"));
                return;
            }
            var cite = e.target.closest("[data-cite]");
            if (cite) {
                e.preventDefault();
                showTab("fuentes", "bibliografia");
                setTimeout(function () {
                    var el = container.querySelector("#ac-src-" + cite.getAttribute("data-cite"));
                    if (el) {
                        el.scrollIntoView({ behavior: "smooth", block: "center" });
                        el.classList.add("is-flash");
                        setTimeout(function () { el.classList.remove("is-flash"); }, 1600);
                    }
                }, 50);
                return;
            }
            var askArticle = e.target.closest("[data-ask-article]");
            if (askArticle && host.onAskAssistant) {
                host.onAskAssistant(article, { returnFocus: askArticle });
                return;
            }
            var askEx = e.target.closest("[data-ask-exercise]");
            if (askEx && host.onAskAssistant) {
                host.onAskAssistant(article, { exerciseId: askEx.getAttribute("data-ask-exercise"), returnFocus: askEx });
                return;
            }
            var favEx = e.target.closest("[data-fav-exercise]");
            if (favEx && host.setExerciseFavorite) {
                var exOn = favEx.getAttribute("aria-pressed") !== "true";
                favEx.setAttribute("aria-pressed", exOn ? "true" : "false");
                favEx.classList.toggle("is-on", exOn);
                favEx.textContent = exOn ? "★ Guardado" : "☆ Guardar";
                host.setExerciseFavorite(article.id, favEx.getAttribute("data-fav-exercise"), exOn);
                return;
            }
            var showVar = e.target.closest("[data-show-variants]");
            if (showVar) {
                var card = showVar.closest(".ac-exercise");
                var fold = card && card.querySelector('[data-fold="variants"]');
                if (fold) { fold.open = true; fold.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
                return;
            }
            var addEx = e.target.closest("[data-add-exercise]");
            if (addEx && host.onAddExercise) {
                host.onAddExercise(article, addEx.getAttribute("data-add-exercise"));
                return;
            }
            if (e.target.closest("[data-open-library]") && host.onOpenLibrary) {
                host.onOpenLibrary();
                return;
            }
            var openCh = e.target.closest("[data-open-challenge]");
            if (openCh && host.onOpenChallenge) {
                host.onOpenChallenge(openCh.getAttribute("data-open-challenge"));
                return;
            }
            var stBtn = e.target.closest(".ac-studied");
            if (stBtn && host.setStudied) {
                isStudied = !isStudied;
                container.querySelectorAll(".ac-studied").forEach(function (b) {
                    b.classList.toggle("is-on", isStudied);
                    b.setAttribute("aria-pressed", isStudied ? "true" : "false");
                    b.textContent = isStudied ? "✓ Estudiada" : "Marcar como estudiada";
                });
                host.setStudied(article.id, isStudied);
                return;
            }
            var fav = e.target.closest(".ac-fav");
            if (fav) {
                isFav = !isFav;
                fav.classList.toggle("is-on", isFav);
                fav.setAttribute("aria-pressed", isFav ? "true" : "false");
                fav.textContent = isFav ? "★ En favoritos" : "☆ Guardar en favoritos";
                if (host.setFavorite) host.setFavorite(article.id, isFav);
                return;
            }
            var res = e.target.closest("[data-resume]");
            if (res) {
                container.querySelector(".ac-resume").hidden = true;
                showTab(reading.tab, reading.section);
                return;
            }
            if (e.target.closest("[data-resume-close]")) {
                container.querySelector(".ac-resume").hidden = true;
                persistReading(current.tab === "aprender" ? ((article.tabs.aprender || [])[0] || {}).id : null);
            }
        });

        var validTab = reading && TABS_A.some(function (t) { return t.id === reading.tab; });
        if (!opts.tab && validTab && (reading.tab !== "aprender" || (reading.section && reading.section !== ((article.tabs.aprender || [])[0] || {}).id))) {
            var secTitle = "";
            tabSections(article, reading.tab, { mode: current.mode }).forEach(function (s) { if (s.id === reading.section) secTitle = s.title; });
            var tabLabel = TABS_A.filter(function (t) { return t.id === reading.tab; })[0].label;
            var banner = container.querySelector(".ac-resume");
            banner.innerHTML = "<span>La última vez llegaste a <strong>" + esc(tabLabel) + (secTitle ? " › " + fmt(secTitle) : "") + "</strong>.</span>" +
                '<span><button type="button" class="tb-btn tb-btn--small tb-btn--accent" data-resume>Retomar lectura</button>' +
                '<button type="button" class="tb-btn tb-btn--small" data-resume-close>Empezar desde el inicio</button></span>';
            banner.hidden = false;
        }
        showTab(current.tab, opts.section);
    }

    return {
        TABS: TABS,
        MODES: MODES,
        tabsFor: tabsFor,
        forMode: forMode,
        PROVENANCE: PROVENANCE,
        EXERCISE_FIELDS: EXERCISE_FIELDS,
        register: register,
        get: get,
        list: list,
        validateArticle: validateArticle,
        boardFromSpec: boardFromSpec,
        render: render,
        mountViewer: mountViewer,
        fmt: fmt,
        slug: slug
    };
});
