/*
 * BasketIQ · Basket Lab Academy · Desafíos tácticos y progreso de aprendizaje
 *
 * Expone window.BasketChallenges:
 * - Registro de desafíos: una situación de juego sobre la pizarra, una pregunta y
 *   varias respuestas evaluadas (recomendada, válida, arriesgada, no recomendada).
 *   Puede haber más de una respuesta recomendada: no todo se reduce a correcto o incorrecto.
 * - Cada desafío se apoya en contenido que ya existe en una guía (sus pizarras, su
 *   simulador y sus fuentes), y enlaza a la sección donde se explica.
 * - Funciones puras para evaluar una respuesta, actualizar el registro y resumir
 *   el progreso (contenidos estudiados, desafíos, favoritos, resultados y temas pendientes).
 * - Pantallas: desafío, lista de desafíos y «Mi progreso».
 *
 * Los registros de progreso se guardan con el mismo modelo que el resto de la Academy
 * (user_app_data, tipo learning_progress): un elemento por id.
 *   - Guía:      { id: "<articleId>", favorite, studied, tab, section, updated_at }
 *   - Ejercicio: { id: "ex:<articleId>:<exerciseId>", favorite, updated_at }
 *   - Desafío:   { id: "ch:<challengeId>", kind: "challenge", choice, verdict, attempts,
 *                  firstChoice, firstVerdict, completedAt, lastAt, updated_at }
 * Ver docs/academy-progress.md para la asignación futura de contenidos a jugadores.
 */
(function (root, factory) {
    var api = factory(root);
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) {
        root.BasketChallenges = api;
        (root.BasketChallengesQueue || []).forEach(function (c) { api.register(c); });
        root.BasketChallengesQueue = [];
    }
})(typeof window !== "undefined" ? window : null, function (root) {
    "use strict";

    /** Escala de evaluación. «ok» indica si la decisión cuenta como resuelta. */
    var VERDICTS = {
        best: { label: "Recomendada", ok: true, rank: 0 },
        valid: { label: "Válida", ok: true, rank: 1 },
        risky: { label: "Arriesgada", ok: false, rank: 2 },
        poor: { label: "No recomendada", ok: false, rank: 3 }
    };
    var VERDICT_ORDER = ["best", "valid", "risky", "poor"];
    var PROVENANCE_KINDS = { official: 1, interpretation: 1, method: 1, variant: 1 };
    var RECORD_PREFIX = "ch:";

    var registry = [];
    var byId = {};

    function register(ch) {
        if (!ch || !ch.id) return;
        if (byId[ch.id]) registry = registry.filter(function (x) { return x.id !== ch.id; });
        byId[ch.id] = ch;
        registry.push(ch);
    }
    function get(id) { return byId[id] || null; }
    function list() { return registry.slice(); }
    function forArticle(articleId) { return registry.filter(function (c) { return c.articleId === articleId; }); }
    function recordId(challengeId) { return RECORD_PREFIX + challengeId; }

    function esc(str) {
        return String(str == null ? "" : str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    /** Negritas y citas [S1] que apuntan a las fuentes listadas al final del desafío. */
    function fmt(text) {
        return esc(text)
            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
            .replace(/\[(S\d+)\]/g, '<a href="#" class="ac-cite" data-ch-cite="$1" title="Ver fuente $1">[$1]</a>');
    }

    function clone(x) { return JSON.parse(JSON.stringify(x)); }

    // ------------------------------------------------------------------
    // Situación y pizarras
    // ------------------------------------------------------------------

    /** Estado del simulador de la guía con los ajustes del desafío (balón, posiciones). */
    function situationState(ch, article, Sim) {
        var sit = ch.situation || {};
        if (!article || !article.simulator || !Sim) return null;
        var r = Sim.resolveState(article.simulator, sit.variant, sit.position);
        if (!r) return null;
        var st = clone(r.state);
        var ov = sit.override || {};
        if (ov.ball) st.ball = ov.ball;
        Object.keys(ov.pos || {}).forEach(function (id) { st.pos[id] = ov.pos[id]; });
        (ov.hide || []).forEach(function (id) { delete st.pos[id]; });
        return st;
    }

    function arrowStrokes(state, arrows) {
        var out = [];
        (arrows || []).forEach(function (o, k) {
            var a = typeof o[1] === "string" ? state.pos[o[1]] : o[1];
            var b = typeof o[2] === "string" ? state.pos[o[2]] : o[2];
            if (!a || !b) return;
            out.push({
                id: "sa" + k, type: o[0], a: { x: a[0], y: a[1] }, b: { x: b[0], y: b[1] }, c: null,
                from: typeof o[1] === "string" ? o[1] : null, to: typeof o[2] === "string" ? o[2] : null, color: null
            });
        });
        return out;
    }

    /** Documento de pizarra de una sola fase con la situación a decidir (sin la respuesta). */
    function situationDoc(ch, deps) {
        deps = deps || {};
        var article = deps.article;
        var Sim = deps.Sim || (root && root.BasketSim);
        var Board = deps.Board || (root && root.BasketBoard);
        var st = situationState(ch, article, Sim);
        if (!st) return null;
        var doc = {
            version: 2,
            view: clone(article.simulator.view || { court: "half", rotation: 90 }),
            phases: [{
                id: "situacion",
                name: "Situación",
                note: "",
                objects: Sim.makeObjects(article.simulator, st, {}),
                strokes: arrowStrokes(st, (ch.situation || {}).arrows)
            }]
        };
        return Board ? Board.normalizeDoc(doc) : doc;
    }

    /** Definición de pizarra explicativa para el visor de la Academy. */
    function boardDefFor(ch, ref, deps) {
        deps = deps || {};
        var article = deps.article;
        if (!article || !ref) return null;
        if (ref.board) {
            var def = (article.boards || []).filter(function (b) { return b.id === ref.board; })[0];
            if (!def) return null;
            var out = clone(def);
            if (ref.title) out.title = ref.title;
            return out;
        }
        if (ref.sim) {
            var Sim = deps.Sim || (root && root.BasketSim);
            var Board = deps.Board || (root && root.BasketBoard);
            if (!Sim || !article.simulator) return null;
            var ok = ref.sim.positions.every(function (p) { return !!Sim.resolveState(article.simulator, ref.sim.variant, p); });
            if (!ok) return null;
            return {
                id: "ch-" + ch.id + "-" + ref.sim.variant,
                title: ref.title || ch.title,
                intro: ref.intro || "",
                kind: ref.kind || ch.kind,
                refs: ref.refs || ch.refs,
                doc: Sim.sequenceDoc(article.simulator, ref.sim.variant, ref.sim.positions, Board)
            };
        }
        return null;
    }

    // ------------------------------------------------------------------
    // Evaluación y registro
    // ------------------------------------------------------------------

    function grade(ch, optionId) {
        var option = (ch.options || []).filter(function (o) { return o.id === optionId; })[0];
        if (!option) return null;
        var info = VERDICTS[option.verdict];
        return {
            option: option,
            verdict: option.verdict,
            label: info.label,
            ok: info.ok,
            recommended: ch.options.filter(function (o) { return o.verdict === "best"; })
        };
    }

    /** Cambios a guardar en el registro del desafío tras una respuesta. */
    function nextRecord(prev, ch, optionId, nowIso) {
        var g = grade(ch, optionId);
        if (!g) return null;
        prev = prev || {};
        var now = nowIso || new Date().toISOString();
        return {
            kind: "challenge",
            articleId: ch.articleId,
            choice: optionId,
            verdict: g.verdict,
            attempts: (Number(prev.attempts) || 0) + 1,
            firstChoice: prev.firstChoice || optionId,
            firstVerdict: prev.firstVerdict || g.verdict,
            completedAt: prev.completedAt || now,
            lastAt: now
        };
    }

    // ------------------------------------------------------------------
    // Validación (pruebas automáticas del contenido)
    // ------------------------------------------------------------------

    /**
     * Revisa que el desafío se apoye en contenido real de la guía: fuentes citadas que existen,
     * situación y pizarras que se pueden construir, sección enlazada existente, al menos
     * una respuesta recomendada y análisis en todas las opciones.
     */
    function validateChallenge(ch, deps) {
        deps = deps || {};
        var errors = [];
        var article = deps.article;
        var Sim = deps.Sim;
        var where = "Desafío " + (ch && ch.id);
        if (!ch || !ch.id || !ch.title || !ch.question) return [where + ": faltan id, título o pregunta"];
        if (!article || article.id !== ch.articleId) return [where + ": la guía " + ch.articleId + " no existe"];
        if (!PROVENANCE_KINDS[ch.kind]) errors.push(where + ": origen inválido " + ch.kind);
        var sources = {};
        (article.sources || []).forEach(function (s) { sources[s.id] = true; });
        (ch.refs || []).forEach(function (r) { if (!sources[r]) errors.push(where + ": fuente inexistente " + r); });
        if (ch.kind === "official" && !(ch.refs && ch.refs.length)) errors.push(where + ": contenido oficial sin fuente");
        function cites(text, place) {
            String(text || "").replace(/\[(S\d+)\]/g, function (_m, id) {
                if (!sources[id]) errors.push(where + " (" + place + "): cita " + id + " sin fuente en la guía");
                return "";
            });
        }
        cites(ch.question, "pregunta");
        cites(ch.context, "contexto");
        (ch.explanation || []).forEach(function (p) { cites(p, "explicación"); });
        (ch.alternatives || []).forEach(function (p) { cites(p, "alternativas"); });
        if (!(ch.explanation && ch.explanation.length)) errors.push(where + ": sin explicación técnica");
        if (!(ch.alternatives && ch.alternatives.length)) errors.push(where + ": sin alternativas");

        var opts = ch.options || [];
        if (opts.length < 3) errors.push(where + ": necesita al menos tres opciones");
        var seen = {};
        opts.forEach(function (o) {
            if (!o.id || seen[o.id]) errors.push(where + ": opción sin id o repetida");
            seen[o.id] = true;
            if (!VERDICTS[o.verdict]) errors.push(where + "/" + o.id + ": evaluación inválida " + o.verdict);
            if (!o.label || !o.analysis) errors.push(where + "/" + o.id + ": sin texto o sin análisis");
            cites(o.analysis, o.id);
        });
        if (!opts.some(function (o) { return o.verdict === "best"; })) errors.push(where + ": ninguna respuesta recomendada");
        if (!opts.some(function (o) { return !VERDICTS[o.verdict] || !VERDICTS[o.verdict].ok; })) errors.push(where + ": todas las opciones son correctas, no hay decisión");

        if (Sim) {
            var st = situationState(ch, article, Sim);
            if (!st) errors.push(where + ": la situación no existe en el simulador de la guía");
            else {
                if (!st.pos[st.ball]) errors.push(where + ": el balón no tiene poseedor en la situación");
                var ids = Object.keys(st.pos);
                for (var i = 0; i < ids.length; i++) {
                    for (var j = i + 1; j < ids.length; j++) {
                        var a = st.pos[ids[i]], b = st.pos[ids[j]];
                        if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.55) errors.push(where + ": " + ids[i] + " y " + ids[j] + " se superponen");
                    }
                }
                ((ch.situation || {}).arrows || []).forEach(function (o) {
                    [o[1], o[2]].forEach(function (p) {
                        if (typeof p === "string" && !st.pos[p]) errors.push(where + ": flecha con jugador inexistente " + p);
                    });
                });
            }
            if (!(ch.boards && ch.boards.length)) errors.push(where + ": sin pizarra explicativa");
            (ch.boards || []).forEach(function (ref, k) {
                if (!boardDefFor(ch, ref, { article: article, Sim: Sim })) errors.push(where + ": pizarra " + (k + 1) + " no se puede construir");
            });
        }
        var rel = ch.related || {};
        var tabSecs = ((article.tabs || {})[rel.tab] || []).map(function (s) { return s.id; });
        if (!rel.tab || tabSecs.indexOf(rel.section) < 0) errors.push(where + ": la sección relacionada no existe en la guía");
        return errors;
    }

    // ------------------------------------------------------------------
    // Resumen del progreso (puro: recibe guías, desafíos y registros)
    // ------------------------------------------------------------------

    function summarizeProgress(input) {
        input = input || {};
        var articles = input.articles || [];
        var challenges = input.challenges || [];
        var items = {};
        (input.items || []).forEach(function (x) { if (x && x.id) items[x.id] = x; });
        var artById = {};
        articles.forEach(function (a) { artById[a.id] = a; });

        var studied = [];
        var inProgress = [];
        var notStarted = [];
        articles.forEach(function (a) {
            var it = items[a.id];
            var row = { id: a.id, title: a.title, sectionLabel: a.sectionLabel || "", updated_at: it && it.updated_at || null };
            if (it && it.studied) { row.studiedAt = it.studiedAt || it.updated_at || null; studied.push(row); }
            else if (it && it.tab) { row.tab = it.tab; row.section = it.section || null; inProgress.push(row); }
            else notStarted.push(row);
        });
        var byRecent = function (a, b) { return String(b.updated_at || "").localeCompare(String(a.updated_at || "")); };
        studied.sort(byRecent);
        inProgress.sort(byRecent);

        var favArticles = articles.filter(function (a) { return items[a.id] && items[a.id].favorite; })
            .map(function (a) { return { id: a.id, title: a.title }; });
        var favExercises = [];
        Object.keys(items).forEach(function (id) {
            if (id.indexOf("ex:") !== 0 || !items[id].favorite) return;
            var parts = id.slice(3).split(":");
            var art = artById[parts[0]];
            var ex = art && (art.exercises || []).filter(function (e) { return e.id === parts[1]; })[0];
            if (ex) favExercises.push({ key: id.slice(3), articleId: art.id, exerciseId: ex.id, title: ex.name, articleTitle: art.title });
        });

        var results = { best: 0, valid: 0, risky: 0, poor: 0 };
        var firstTryOk = 0;
        var chRows = challenges.map(function (c) {
            var rec = items[recordId(c.id)];
            var art = artById[c.articleId];
            var row = { id: c.id, title: c.title, topic: c.topic || "", articleId: c.articleId, articleTitle: art ? art.title : "", status: "pending", verdict: null, attempts: 0, lastAt: null, related: c.related || null };
            if (rec && VERDICTS[rec.verdict]) {
                row.verdict = rec.verdict;
                row.attempts = Number(rec.attempts) || 1;
                row.lastAt = rec.lastAt || rec.updated_at || null;
                row.status = VERDICTS[rec.verdict].ok ? "ok" : "review";
                results[rec.verdict] += 1;
                if (rec.firstVerdict && VERDICTS[rec.firstVerdict] && VERDICTS[rec.firstVerdict].ok) firstTryOk += 1;
            }
            return row;
        });
        var done = chRows.filter(function (r) { return r.status !== "pending"; }).length;
        var ok = chRows.filter(function (r) { return r.status === "ok"; }).length;

        // Temas pendientes: primero lo que hay que repasar, después lo empezado y por último lo nuevo.
        var pending = [];
        chRows.filter(function (r) { return r.status === "review"; }).forEach(function (r) {
            pending.push({ type: "review", id: r.id, articleId: r.articleId, title: r.title, reason: "Tu última respuesta fue «" + VERDICTS[r.verdict].label + "». Conviene repasar la sección relacionada y volver a intentarlo.", related: r.related });
        });
        inProgress.forEach(function (a) {
            pending.push({ type: "article", id: a.id, articleId: a.id, title: a.title, reason: "Guía empezada, todavía no marcada como estudiada.", tab: a.tab, section: a.section });
        });
        chRows.filter(function (r) { return r.status === "pending"; }).forEach(function (r) {
            pending.push({ type: "challenge", id: r.id, articleId: r.articleId, title: r.title, reason: "Desafío sin responder." });
        });
        notStarted.forEach(function (a) {
            pending.push({ type: "article-new", id: a.id, articleId: a.id, title: a.title, reason: "Guía que todavía no abriste." });
        });

        return {
            articles: { total: articles.length, studied: studied, inProgress: inProgress, notStarted: notStarted },
            favorites: { articles: favArticles, exercises: favExercises },
            challenges: { total: challenges.length, done: done, ok: ok, firstTryOk: firstTryOk, rows: chRows },
            results: results,
            pending: pending
        };
    }

    // ------------------------------------------------------------------
    // Pantallas
    // ------------------------------------------------------------------

    function verdictBadge(v) {
        var info = VERDICTS[v];
        return info ? '<span class="ch-verdict ch-verdict--' + v + '">' + esc(info.label) + "</span>" : "";
    }

    function statusBadge(row) {
        if (row.status === "ok") return '<span class="ch-status ch-status--ok">Resuelto · ' + esc(VERDICTS[row.verdict].label) + "</span>";
        if (row.status === "review") return '<span class="ch-status ch-status--review">Para repasar · ' + esc(VERDICTS[row.verdict].label) + "</span>";
        return '<span class="ch-status">Sin responder</span>';
    }

    /** Contenedor nuevo en cada pantalla: los eventos quedan atados a él y desaparecen con él. */
    function freshBox(target) {
        target.innerHTML = "";
        var box = document.createElement("div");
        box.className = "ch-root";
        target.appendChild(box);
        return box;
    }

    function deps(host, article) {
        return { article: article, Sim: root && root.BasketSim, Board: root && root.BasketBoard };
    }

    function articleFor(ch, host) {
        var A = host.academy || (root && root.BasketAcademy);
        return A ? A.get(ch.articleId) : null;
    }

    function sourcesHtml(ch, article) {
        var refs = {};
        function collect(t) { String(t || "").replace(/\[(S\d+)\]/g, function (_m, id) { refs[id] = true; return ""; }); }
        (ch.refs || []).forEach(function (r) { refs[r] = true; });
        collect(ch.context);
        (ch.explanation || []).forEach(collect);
        (ch.alternatives || []).forEach(collect);
        (ch.options || []).forEach(function (o) { collect(o.analysis); });
        var used = (article.sources || []).filter(function (s) { return refs[s.id]; });
        if (!used.length) return '<p class="ac-muted">Este desafío no cita fuentes externas: es una propuesta de BasketIQ basada en la guía.</p>';
        return '<ol class="ac-sources ch-sources">' + used.map(function (s) {
            return '<li class="ac-source" id="ch-src-' + esc(s.id) + '"><span class="ac-source-id">' + esc(s.id) + "</span><div><strong>" + esc(s.title) + "</strong>" +
                (s.locator ? '<p class="ac-muted">' + esc(s.locator) + "</p>" : "") +
                (s.url ? '<p><a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' + esc(s.url) + "</a></p>" : "") +
                "</div></li>";
        }).join("") + "</ol>";
    }

    function provenance(ch) {
        var A = root && root.BasketAcademy;
        var p = A && A.PROVENANCE && A.PROVENANCE[ch.kind];
        if (!p) return "";
        return '<span class="ac-prov ac-prov--' + esc(ch.kind) + '" title="' + esc(p.desc) + '">' + esc(p.label) +
            (ch.refs && ch.refs.length ? " · " + ch.refs.map(function (r) { return '<a href="#" class="ac-cite" data-ch-cite="' + esc(r) + '">' + esc(r) + "</a>"; }).join(", ") : "") + "</span>";
    }

    /**
     * Pantalla de un desafío.
     * host: { getRecord(id) → registro | null, saveResult(id, patch), openArticle(articleId, tab, section),
     *         onOpenInBoard(doc, boardDef)?, openChallenge(id)?, openList()? }
     */
    function mount(target, challengeId, host) {
        host = host || {};
        var container = freshBox(target);
        var ch = get(challengeId);
        var article = ch && articleFor(ch, host);
        if (!ch || !article) {
            container.innerHTML = '<section class="manual-section"><p>No se encontró este desafío.</p></section>';
            return null;
        }
        var Board = root && root.BasketBoard;
        var A = root && root.BasketAcademy;
        var sitDoc = situationDoc(ch, deps(host, article));
        var img = sitDoc && Board && Board.renderPhaseImage ? Board.renderPhaseImage(sitDoc, 0, { width: 900, label: false }) : "";
        var rec = host.getRecord ? host.getRecord(recordId(ch.id)) : null;
        var others = list();
        var idx = others.map(function (c) { return c.id; }).indexOf(ch.id);
        var next = others[(idx + 1) % others.length];
        var state = { selected: null, answered: false, viewer: null, board: 0 };

        container.innerHTML =
            '<article class="ac ch" aria-labelledby="ch-title">' +
            '<header class="ac-hero">' +
            '<p class="ac-crumbs">Basket Lab Academy · Desafíos tácticos · ' + esc(article.title) + "</p>" +
            '<h2 id="ch-title">' + esc(ch.title) + "</h2>" +
            '<div class="ch-hero-meta">' + provenance(ch) +
            (rec && VERDICTS[rec.verdict] ? '<span class="ch-prev">Ya lo respondiste ' + esc(String(rec.attempts || 1)) + (Number(rec.attempts) === 1 ? " vez" : " veces") + ". Última respuesta: " + verdictBadge(rec.verdict) + "</span>" : "") +
            "</div>" +
            "</header>" +
            '<section class="ac-section ch-situation">' +
            '<div class="ch-grid">' +
            '<figure class="ch-figure">' +
            (img ? '<img src="' + img + '" alt="' + esc("Situación en la pizarra: " + (ch.situation.caption || ch.question)) + '">' : '<p class="ac-muted">No se pudo dibujar la situación.</p>') +
            (ch.situation.caption ? "<figcaption>" + fmt(ch.situation.caption) + "</figcaption>" : "") +
            '<p class="ch-legend"><span class="ch-dot ch-dot--o"></span> Atacantes <span class="ch-dot ch-dot--x"></span> Defensores <span class="ch-dot ch-dot--b"></span> Balón</p>' +
            "</figure>" +
            '<div class="ch-ask">' +
            (ch.context ? '<p class="ch-context">' + fmt(ch.context) + "</p>" : "") +
            '<h3 class="ch-question" id="ch-q">' + fmt(ch.question) + "</h3>" +
            '<div class="ch-options" role="radiogroup" aria-labelledby="ch-q">' +
            ch.options.map(function (o, k) {
                return '<button type="button" class="ch-option" role="radio" aria-checked="false" data-opt="' + esc(o.id) + '">' +
                    '<span class="ch-option-key">' + String.fromCharCode(65 + k) + "</span><span>" + fmt(o.label) + "</span></button>";
            }).join("") +
            "</div>" +
            '<p class="ch-hint ac-muted">Puede haber más de una respuesta adecuada. Elegí la que harías vos en esta situación.</p>' +
            '<button type="button" class="tb-btn tb-btn--accent ch-confirm" disabled>Confirmar respuesta</button>' +
            "</div></div></section>" +
            '<div class="ch-feedback" hidden></div>' +
            "</article>";

        var feedback = container.querySelector(".ch-feedback");
        var confirmBtn = container.querySelector(".ch-confirm");

        function select(id) {
            if (state.answered) return;
            state.selected = id;
            container.querySelectorAll(".ch-option").forEach(function (b) {
                var on = b.getAttribute("data-opt") === id;
                b.classList.toggle("is-selected", on);
                b.setAttribute("aria-checked", on ? "true" : "false");
            });
            confirmBtn.disabled = !id;
        }

        function renderBoard() {
            var slot = feedback.querySelector(".ch-board-slot");
            if (!slot) return;
            if (state.viewer && state.viewer.stop) state.viewer.stop();
            var ref = ch.boards[state.board];
            var def = boardDefFor(ch, ref, deps(host, article));
            feedback.querySelectorAll("[data-board-i]").forEach(function (b) {
                var on = Number(b.getAttribute("data-board-i")) === state.board;
                b.classList.toggle("is-active", on);
                b.setAttribute("aria-pressed", on ? "true" : "false");
            });
            if (!def || !A) { slot.innerHTML = '<p class="ac-muted">No se pudo cargar la pizarra.</p>'; return; }
            state.viewer = A.mountViewer(slot, def, { onOpenInBoard: host.onOpenInBoard || null });
        }

        function answer() {
            if (!state.selected) return;
            var g = grade(ch, state.selected);
            state.answered = true;
            var patch = nextRecord(rec, ch, state.selected);
            if (host.saveResult) host.saveResult(recordId(ch.id), patch);
            rec = Object.assign({}, rec || {}, patch);
            container.querySelectorAll(".ch-option").forEach(function (b) {
                var o = grade(ch, b.getAttribute("data-opt")).option;
                b.disabled = true;
                b.classList.add("is-graded", "ch-option--" + o.verdict);
                b.insertAdjacentHTML("beforeend", verdictBadge(o.verdict));
            });
            confirmBtn.hidden = true;
            container.querySelector(".ch-hint").hidden = true;
            var rel = ch.related || {};
            var multiple = g.recommended.length > 1;
            feedback.innerHTML =
                '<section class="ac-section ch-result ch-result--' + g.verdict + '" tabindex="-1">' +
                '<header class="ac-section-head"><h3>Análisis de tu decisión</h3>' + verdictBadge(g.verdict) + "</header>" +
                '<p class="ch-choice"><strong>Elegiste:</strong> ' + fmt(g.option.label) + "</p>" +
                "<p>" + fmt(g.option.analysis) + "</p>" +
                (g.verdict !== "best" ? '<p class="ch-reco"><strong>' + (multiple ? "Respuestas recomendadas" : "Respuesta recomendada") + ":</strong> " +
                    g.recommended.map(function (o) { return fmt(o.label); }).join(" · ") + "</p>" :
                    (multiple ? '<p class="ch-reco">Hay otra respuesta recomendada: ' + g.recommended.filter(function (o) { return o.id !== g.option.id; }).map(function (o) { return fmt(o.label); }).join(" · ") + ". Depende del rival y de lo que tu equipo haya entrenado.</p>" : "")) +
                "</section>" +
                '<section class="ac-section"><header class="ac-section-head"><h3>Explicación técnica</h3></header>' +
                ch.explanation.map(function (p) { return "<p>" + fmt(p) + "</p>"; }).join("") + "</section>" +
                '<section class="ac-section"><header class="ac-section-head"><h3>Todas las opciones</h3></header><ul class="ch-all">' +
                ch.options.slice().sort(function (a, b) { return VERDICTS[a.verdict].rank - VERDICTS[b.verdict].rank; }).map(function (o) {
                    return '<li class="' + (o.id === g.option.id ? "is-mine" : "") + '"><div class="ch-all-head">' + verdictBadge(o.verdict) + "<strong>" + fmt(o.label) + "</strong>" + (o.id === g.option.id ? ' <span class="ac-muted">(tu respuesta)</span>' : "") + "</div><p>" + fmt(o.analysis) + "</p></li>";
                }).join("") + "</ul></section>" +
                '<section class="ac-section"><header class="ac-section-head"><h3>Posibles alternativas</h3></header><ul class="ac-list">' +
                ch.alternatives.map(function (p) { return "<li>" + fmt(p) + "</li>"; }).join("") + "</ul></section>" +
                '<section class="ac-section ch-boards"><header class="ac-section-head"><h3>Pizarra explicativa</h3></header>' +
                (ch.boards.length > 1 ? '<div class="ch-board-tabs" role="group" aria-label="Pizarras">' + ch.boards.map(function (b, i) {
                    return '<button type="button" class="tb-btn tb-btn--small" data-board-i="' + i + '" aria-pressed="false">' + esc(b.label || ("Pizarra " + (i + 1))) + "</button>";
                }).join("") + "</div>" : "") +
                '<div class="ch-board-slot"></div></section>' +
                '<section class="ac-section"><header class="ac-section-head"><h3>Fuentes</h3></header>' + sourcesHtml(ch, article) + "</section>" +
                '<div class="ch-actions">' +
                (host.openArticle ? '<button type="button" class="tb-btn tb-btn--accent" data-related>Ver en la guía: ' + esc(rel.label || article.title) + "</button>" : "") +
                '<button type="button" class="tb-btn" data-retry>Intentar de nuevo</button>' +
                (host.openChallenge && next && next.id !== ch.id ? '<button type="button" class="tb-btn" data-next="' + esc(next.id) + '">Siguiente desafío</button>' : "") +
                (host.openList ? '<button type="button" class="tb-btn" data-list>Todos los desafíos</button>' : "") +
                "</div>";
            feedback.hidden = false;
            renderBoard();
            var res = feedback.querySelector(".ch-result");
            if (res) {
                res.scrollIntoView({ behavior: "smooth", block: "start" });
                try { res.focus({ preventScroll: true }); } catch (e) { res.focus(); }
            }
        }

        container.addEventListener("click", function (e) {
            var opt = e.target.closest("[data-opt]");
            if (opt) { select(opt.getAttribute("data-opt")); return; }
            if (e.target.closest(".ch-confirm")) { answer(); return; }
            var bi = e.target.closest("[data-board-i]");
            if (bi) { state.board = Number(bi.getAttribute("data-board-i")); renderBoard(); return; }
            var cite = e.target.closest("[data-ch-cite]");
            if (cite) {
                e.preventDefault();
                var src = container.querySelector("#ch-src-" + cite.getAttribute("data-ch-cite"));
                if (src) {
                    src.scrollIntoView({ behavior: "smooth", block: "center" });
                    src.classList.add("is-flash");
                    setTimeout(function () { src.classList.remove("is-flash"); }, 1600);
                }
                return;
            }
            if (e.target.closest("[data-related]") && host.openArticle) {
                if (state.viewer && state.viewer.stop) state.viewer.stop();
                host.openArticle(ch.articleId, (ch.related || {}).tab, (ch.related || {}).section);
                return;
            }
            if (e.target.closest("[data-retry]")) {
                if (state.viewer && state.viewer.stop) state.viewer.stop();
                mount(target, ch.id, host);
                var top = target.querySelector(".ch");
                if (top) top.scrollIntoView({ behavior: "smooth", block: "start" });
                return;
            }
            var nx = e.target.closest("[data-next]");
            if (nx && host.openChallenge) { if (state.viewer && state.viewer.stop) state.viewer.stop(); host.openChallenge(nx.getAttribute("data-next")); return; }
            if (e.target.closest("[data-list]") && host.openList) { if (state.viewer && state.viewer.stop) state.viewer.stop(); host.openList(); }
        });
        // Flechas del teclado dentro del grupo de opciones (patrón de radiogroup).
        container.querySelector(".ch-options").addEventListener("keydown", function (e) {
            if (["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].indexOf(e.key) < 0 || state.answered) return;
            var btns = Array.prototype.slice.call(container.querySelectorAll(".ch-option"));
            var i = btns.indexOf(document.activeElement);
            var n = btns.length;
            var j = e.key === "ArrowDown" || e.key === "ArrowRight" ? (i + 1) % n : (i - 1 + n) % n;
            e.preventDefault();
            btns[j].focus();
            select(btns[j].getAttribute("data-opt"));
        });
        return { challenge: ch };
    }

    /** Lista de desafíos con su estado. host: { getItems(), openChallenge(id), articles() } */
    function mountList(target, host) {
        host = host || {};
        var container = freshBox(target);
        var A = host.academy || (root && root.BasketAcademy);
        var articles = A ? A.list() : [];
        var sum = summarizeProgress({ articles: articles, challenges: list(), items: host.getItems ? host.getItems() : [] });
        container.innerHTML =
            '<article class="ac ch-list-page">' +
            '<header class="ac-hero"><p class="ac-crumbs">Basket Lab Academy</p><h2>Desafíos tácticos</h2>' +
            '<p class="ac-subtitle">Situaciones de juego sobre la pizarra. Elegí qué harías y recibí el análisis de tu decisión, las alternativas y la pizarra que lo explica. Cada desafío se apoya en una guía de la Academy y en sus fuentes.</p>' +
            '<div class="ac-meta"><span>' + sum.challenges.done + " de " + sum.challenges.total + " respondidos</span><span>" + sum.challenges.ok + " resueltos</span></div></header>" +
            '<ul class="ch-cards">' + sum.challenges.rows.map(function (r) {
                var ch = get(r.id);
                return '<li class="ch-card"><button type="button" class="ch-card-btn" data-open-challenge="' + esc(r.id) + '">' +
                    '<span class="ch-card-topic">' + esc(r.articleTitle) + "</span>" +
                    "<strong>" + esc(r.title) + "</strong>" +
                    '<span class="ch-card-q">' + esc(ch.question) + "</span>" +
                    statusBadge(r) + "</button></li>";
            }).join("") + "</ul></article>";
        container.addEventListener("click", function (e) {
            var b = e.target.closest("[data-open-challenge]");
            if (b && host.openChallenge) host.openChallenge(b.getAttribute("data-open-challenge"));
        });
    }

    function when(iso) {
        if (!iso) return "";
        var d = new Date(iso);
        if (isNaN(d.getTime())) return "";
        return d.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
    }

    /**
     * «Mi progreso». host: { getItems(), openArticle(id, tab, section), openChallenge(id),
     *   openExercise(articleId, exerciseId), openList(), setStudied(id, on) }
     */
    function mountProgress(target, host) {
        host = host || {};
        var container = freshBox(target);
        var A = host.academy || (root && root.BasketAcademy);
        var articles = A ? A.list() : [];
        function draw() {
            var s = summarizeProgress({ articles: articles, challenges: list(), items: host.getItems ? host.getItems() : [] });
            var tabLabel = {};
            ((A && A.TABS) || []).forEach(function (t) { tabLabel[t.id] = t.label; });
            var pct = s.articles.total ? Math.round((s.articles.studied.length / s.articles.total) * 100) : 0;
            var totalAnswered = s.results.best + s.results.valid + s.results.risky + s.results.poor;
            var resultBars = VERDICT_ORDER.map(function (v) {
                var n = s.results[v];
                var w = totalAnswered ? Math.round((n / totalAnswered) * 100) : 0;
                return '<li><span class="ch-bar-label">' + verdictBadge(v) + '</span><span class="ch-bar"><span class="ch-bar-fill ch-bar-fill--' + v + '" style="width:' + w + '%"></span></span><span class="ch-bar-n">' + n + "</span></li>";
            }).join("");
            function articleRow(a, extra) {
                return '<li class="pg-row"><div><strong>' + esc(a.title) + "</strong>" + (extra ? '<span class="ac-muted">' + extra + "</span>" : "") + "</div>" +
                    '<span class="pg-actions">' + '<button type="button" class="tb-btn tb-btn--small" data-open-article="' + esc(a.id) + '"' + (a.tab ? ' data-tab="' + esc(a.tab) + '"' : "") + (a.section ? ' data-section="' + esc(a.section) + '"' : "") + ">" + (a.tab ? "Seguir" : "Abrir") + "</button></span></li>";
            }
            var empty = function (t) { return '<p class="ac-muted">' + t + "</p>"; };
            container.innerHTML =
                '<article class="ac pg">' +
                '<header class="ac-hero"><p class="ac-crumbs">Basket Lab Academy</p><h2>Mi progreso</h2>' +
                '<p class="ac-subtitle">Lo que estudiaste, los desafíos que respondiste, tus favoritos y lo que te queda por ver. Se guarda en tu cuenta junto con el resto de tus datos.</p></header>' +
                '<div class="pg-stats">' +
                '<div class="pg-stat"><span class="pg-stat-n">' + s.articles.studied.length + "/" + s.articles.total + '</span><span>Guías estudiadas</span><span class="pg-meter" role="img" aria-label="' + pct + '% de las guías estudiadas"><span style="width:' + pct + '%"></span></span></div>' +
                '<div class="pg-stat"><span class="pg-stat-n">' + s.challenges.done + "/" + s.challenges.total + "</span><span>Desafíos respondidos</span></div>" +
                '<div class="pg-stat"><span class="pg-stat-n">' + s.challenges.ok + "</span><span>Desafíos resueltos</span></div>" +
                '<div class="pg-stat"><span class="pg-stat-n">' + (s.favorites.articles.length + s.favorites.exercises.length) + "</span><span>Favoritos</span></div>" +
                "</div>" +
                '<div class="pg-cols">' +
                '<section class="ac-section"><header class="ac-section-head"><h3>Temas pendientes</h3></header>' +
                (s.pending.length ? '<ul class="pg-list">' + s.pending.slice(0, 8).map(function (p) {
                    var btn;
                    if (p.type === "review") btn = '<button type="button" class="tb-btn tb-btn--small" data-open-article="' + esc(p.articleId) + '" data-tab="' + esc((p.related || {}).tab || "aprender") + '" data-section="' + esc((p.related || {}).section || "") + '">Repasar</button><button type="button" class="tb-btn tb-btn--small" data-open-challenge="' + esc(p.id) + '">Reintentar</button>';
                    else if (p.type === "challenge") btn = '<button type="button" class="tb-btn tb-btn--small" data-open-challenge="' + esc(p.id) + '">Responder</button>';
                    else btn = '<button type="button" class="tb-btn tb-btn--small" data-open-article="' + esc(p.id) + '"' + (p.tab ? ' data-tab="' + esc(p.tab) + '"' : "") + (p.section ? ' data-section="' + esc(p.section) + '"' : "") + ">" + (p.type === "article" ? "Seguir" : "Abrir") + "</button>";
                    return '<li class="pg-row"><div><strong>' + esc(p.title) + '</strong><span class="ac-muted">' + esc(p.reason) + '</span></div><span class="pg-actions">' + btn + "</span></li>";
                }).join("") + "</ul>" + (s.pending.length > 8 ? '<p class="ac-muted">Y ' + (s.pending.length - 8) + " más.</p>" : "") : empty("No tenés temas pendientes. ¡Bien!")) +
                "</section>" +
                '<section class="ac-section"><header class="ac-section-head"><h3>Resultados de los desafíos</h3></header>' +
                (totalAnswered ? '<p class="ac-muted">Según tu última respuesta en cada desafío. Acertaste en el primer intento en ' + s.challenges.firstTryOk + " de " + s.challenges.done + ".</p>" +
                    '<ul class="ch-bars">' + resultBars + "</ul>" : empty("Todavía no respondiste desafíos.")) +
                '<ul class="pg-list">' + s.challenges.rows.filter(function (r) { return r.status !== "pending"; }).map(function (r) {
                    return '<li class="pg-row"><div><strong>' + esc(r.title) + '</strong><span class="ac-muted">' + esc(r.articleTitle) + " · " + r.attempts + (r.attempts === 1 ? " intento" : " intentos") + (r.lastAt ? " · " + esc(when(r.lastAt)) : "") + "</span></div>" +
                        '<span class="pg-actions">' + statusBadge(r) + '<button type="button" class="tb-btn tb-btn--small" data-open-challenge="' + esc(r.id) + '">Ver</button></span></li>';
                }).join("") + "</ul>" +
                (host.openList ? '<p><button type="button" class="tb-btn" data-list>Ir a los desafíos</button></p>' : "") +
                "</section>" +
                '<section class="ac-section"><header class="ac-section-head"><h3>Contenidos estudiados</h3></header>' +
                (s.articles.studied.length ? '<ul class="pg-list">' + s.articles.studied.map(function (a) {
                    return articleRow(a, a.studiedAt ? "Marcada como estudiada el " + esc(when(a.studiedAt)) : "");
                }).join("") + "</ul>" : empty("Todavía no marcaste guías como estudiadas. Usá «Marcar como estudiada» al final de cada guía o en su encabezado.")) +
                (s.articles.inProgress.length ? '<h4 class="ac-h4">Empezadas</h4><ul class="pg-list">' + s.articles.inProgress.map(function (a) {
                    return articleRow(a, "Última vez en " + esc(tabLabel[a.tab] || a.tab) + (a.updated_at ? " · " + esc(when(a.updated_at)) : ""));
                }).join("") + "</ul>" : "") +
                "</section>" +
                '<section class="ac-section"><header class="ac-section-head"><h3>Favoritos</h3></header>' +
                (s.favorites.articles.length || s.favorites.exercises.length ?
                    (s.favorites.articles.length ? '<h4 class="ac-h4">Guías</h4><ul class="pg-list">' + s.favorites.articles.map(function (a) { return articleRow(a, ""); }).join("") + "</ul>" : "") +
                    (s.favorites.exercises.length ? '<h4 class="ac-h4">Ejercicios</h4><ul class="pg-list">' + s.favorites.exercises.map(function (x) {
                        return '<li class="pg-row"><div><strong>' + esc(x.title) + '</strong><span class="ac-muted">' + esc(x.articleTitle) + '</span></div><span class="pg-actions"><button type="button" class="tb-btn tb-btn--small" data-open-exercise="' + esc(x.articleId) + '" data-exercise="' + esc(x.exerciseId) + '">Abrir</button></span></li>';
                    }).join("") + "</ul>" : "") :
                    empty("Guardá guías con «☆ Guardar en favoritos» y ejercicios desde la biblioteca o la pestaña Entrenar.")) +
                "</section>" +
                "</div></article>";
        }
        draw();
        container.addEventListener("click", function (e) {
            var oa = e.target.closest("[data-open-article]");
            if (oa && host.openArticle) { host.openArticle(oa.getAttribute("data-open-article"), oa.getAttribute("data-tab") || null, oa.getAttribute("data-section") || null); return; }
            var oc = e.target.closest("[data-open-challenge]");
            if (oc && host.openChallenge) { host.openChallenge(oc.getAttribute("data-open-challenge")); return; }
            var oe = e.target.closest("[data-open-exercise]");
            if (oe && host.openExercise) { host.openExercise(oe.getAttribute("data-open-exercise"), oe.getAttribute("data-exercise")); return; }
            if (e.target.closest("[data-list]") && host.openList) host.openList();
        });
    }

    return {
        VERDICTS: VERDICTS,
        VERDICT_ORDER: VERDICT_ORDER,
        register: register,
        get: get,
        list: list,
        forArticle: forArticle,
        recordId: recordId,
        situationState: situationState,
        situationDoc: situationDoc,
        boardDefFor: boardDefFor,
        grade: grade,
        nextRecord: nextRecord,
        validateChallenge: validateChallenge,
        summarizeProgress: summarizeProgress,
        mount: mount,
        mountList: mountList,
        mountProgress: mountProgress,
        fmt: fmt
    };
});
