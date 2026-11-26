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
        ["aprender", "entrenar", "evaluar"].forEach(function (tab) {
            (a.tabs[tab] || []).forEach(function (sec) {
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

    function renderExercise(ex, ctx) {
        var rows = EXERCISE_FIELDS.filter(function (f) { return f[0] !== "basis"; }).map(function (f) {
            var v = ex[f[0]];
            var html = Array.isArray(v) ? '<ul class="ac-list">' + v.map(function (x) { return "<li>" + fmt(x) + "</li>"; }).join("") + "</ul>" : "<p>" + fmt(v) + "</p>";
            return '<div class="ac-ex-row"><dt>' + esc(f[1]) + "</dt><dd>" + html + "</dd></div>";
        }).join("");
        return '<article class="ac-exercise" id="ac-sec-' + esc(ex.id) + '" data-section="' + esc(ex.id) + '">' +
            '<header class="ac-section-head"><h3>' + fmt(ex.name) + "</h3>" + provenanceBadge(ex.kind || "method", ex.refs) + "</header>" +
            '<div class="ac-ex-chips"><span>' + esc(ex.category) + "</span><span>" + esc(ex.level) + "</span><span>" + esc(ex.playersShort || ex.players) + "</span><span>" + esc(ex.duration) + "</span><span>" + esc(ex.space) + "</span></div>" +
            (ex.board ? '<div class="ac-board-slot" data-board="' + esc(ex.board) + '"></div>' : "") +
            '<dl class="ac-ex-grid">' + rows + "</dl>" +
            '<p class="ac-ex-basis"><strong>Fuente o fundamento técnico:</strong> ' + fmt(ex.basis) + "</p>" +
            '<p class="ac-muted">Añadir al entrenamiento llega con la biblioteca de ejercicios (Etapa 4).</p>' +
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

    function tabSections(article, tab) {
        if (tab === "fuentes") {
            var out = [{ id: "bibliografia", title: "Bibliografía verificable" }];
            if ((article.unavailableSources || []).length) out.push({ id: "no-consultadas", title: "Fuentes no consultadas" });
            out.push({ id: "origen", title: "Origen del contenido" });
            return out;
        }
        if (tab === "visualizar") return (article.tabs.visualizar || []).map(function (id) {
            var b = (article.boards || []).filter(function (x) { return x.id === id; })[0];
            return { id: "board-" + id, title: b ? b.title : id };
        });
        var secs = (article.tabs[tab] || []).map(function (s) { return { id: s.id, title: s.title, number: s.number }; });
        if (tab === "entrenar") secs = secs.concat((article.exercises || []).map(function (e) { return { id: e.id, title: e.name }; }));
        return secs;
    }

    function renderTab(article, tab, ctx) {
        if (tab === "fuentes") return renderSources(article);
        if (tab === "simular") {
            return '<section class="ac-section" id="ac-sec-simulador" data-section="simulador"><header class="ac-section-head"><h3>Simulador de la zona 2-3</h3></header>' +
                '<p>El simulador interactivo (cambiar la ubicación del balón y ver los ajustes, rotaciones, ayudas y espacios vulnerables) se construye en la <strong>Etapa 3</strong> sobre este mismo contenido y el motor de la pizarra.</p>' +
                '<p>Mientras tanto, en <strong>Visualizar</strong> tenés las mismas situaciones como secuencias animadas paso a paso, y podés abrir cualquiera en tu pizarra táctica para moverla a gusto.</p></section>';
        }
        if (tab === "visualizar") {
            return (article.tabs.visualizar || []).map(function (id) {
                var b = ctx.boardsById[id];
                if (!b) return "";
                return '<section class="ac-section" id="ac-sec-board-' + esc(id) + '" data-section="board-' + esc(id) + '"><div class="ac-board-slot" data-board="' + esc(id) + '"></div></section>';
            }).join("");
        }
        var html = (article.tabs[tab] || []).map(function (s) { return renderSection(s, ctx); }).join("");
        if (tab === "entrenar") html += (article.exercises || []).map(function (e) { return renderExercise(e, ctx); }).join("");
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
        var doc = boardFromSpec(boardDef.spec, Board);
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
        var current = { tab: opts.tab || "aprender" };

        container.innerHTML =
            '<article class="ac">' +
            '<header class="ac-hero">' +
            '<p class="ac-crumbs">Basket Lab Academy · ' + esc(article.sectionLabel || "") + "</p>" +
            "<h2>" + esc(article.title) + "</h2>" +
            '<p class="ac-subtitle">' + fmt(article.subtitle) + "</p>" +
            '<div class="ac-meta">' + (article.meta || []).map(function (m) { return "<span>" + esc(m) + "</span>"; }).join("") + "</div>" +
            '<div class="ac-hero-actions">' +
            '<button type="button" class="tb-btn ac-fav' + (isFav ? " is-on" : "") + '" aria-pressed="' + (isFav ? "true" : "false") + '">' + (isFav ? "★ En favoritos" : "☆ Guardar en favoritos") + "</button>" +
            "</div>" +
            '<div class="ac-resume" hidden></div>' +
            "</header>" +
            '<nav class="ac-tabs" role="tablist" aria-label="Secciones del contenido">' +
            TABS.map(function (t) {
                return '<button type="button" role="tab" class="ac-tab" data-tab="' + t.id + '" aria-selected="false">' + esc(t.label) + "</button>";
            }).join("") + "</nav>" +
            '<div class="ac-layout"><aside class="ac-toc" aria-label="Índice"></aside><div class="ac-content" role="tabpanel"></div></div>' +
            "</article>";

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
            var ctx = { boardsById: boardsById };
            content.innerHTML = renderTab(article, tab, ctx);
            var secs = tabSections(article, tab);
            toc.innerHTML = '<p class="ac-toc-title">En esta pestaña</p><ol>' + secs.map(function (s) {
                return '<li><a href="#ac-sec-' + esc(s.id) + '" data-goto="' + esc(s.id) + '">' + (s.number ? '<span class="ac-toc-num">' + esc(s.number) + "</span>" : "") + fmt(s.title) + "</a></li>";
            }).join("") + "</ol>";
            content.querySelectorAll(".ac-board-slot").forEach(function (slot) {
                var def = boardsById[slot.getAttribute("data-board")];
                if (def) mountViewer(slot, def, { onOpenInBoard: host.onOpenInBoard });
            });
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

        container.addEventListener("click", function (e) {
            var tabBtn = e.target.closest("[data-tab]");
            if (tabBtn) {
                container.querySelector(".ac-resume").hidden = true;
                showTab(tabBtn.getAttribute("data-tab"));
                container.querySelector(".ac-tabs").scrollIntoView({ behavior: "smooth", block: "start" });
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

        var validTab = reading && TABS.some(function (t) { return t.id === reading.tab; });
        if (!opts.tab && validTab && (reading.tab !== "aprender" || (reading.section && reading.section !== ((article.tabs.aprender || [])[0] || {}).id))) {
            var secTitle = "";
            tabSections(article, reading.tab).forEach(function (s) { if (s.id === reading.section) secTitle = s.title; });
            var tabLabel = TABS.filter(function (t) { return t.id === reading.tab; })[0].label;
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
