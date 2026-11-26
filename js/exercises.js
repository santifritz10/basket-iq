/*
 * BasketIQ · Biblioteca de ejercicios y "Añadir al entrenamiento"
 *
 * window.BasketExercises
 * - Reúne los ejercicios de todos los contenidos de Basket Lab Academy.
 * - Filtros (fundamento, objetivo, categoría, nivel, jugadores, duración, cancha, aros, materiales).
 * - Revisa la compatibilidad de un ejercicio con las condiciones de un entrenamiento
 *   (jugadores, cancha, aros, materiales) y propone adaptaciones compatibles.
 * - Arma el bloque del planificador como copia editable: el ejercicio original no cambia.
 *
 * Las funciones puras se prueban desde Node. La interfaz recibe un "host" con el acceso
 * a los datos (entrenamientos, jugadas, favoritos), que vive en main.js.
 */
(function (root, factory) {
    var api = factory(root);
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.BasketExercises = api;
})(typeof window !== "undefined" ? window : null, function (root) {
    "use strict";

    var COURT_LABEL = { half: "Media cancha", full: "Cancha completa" };
    var BLOCK_TYPES = [
        ["calentamiento", "Calentamiento"],
        ["fundamentos", "Fundamentos"],
        ["tiro", "Tiro"],
        ["ejercicio", "Ejercicio"],
        ["tactica", "Táctica"],
        ["juego", "Juego"],
        ["vuelta_calma", "Vuelta a la calma"]
    ];
    var LEVELS = ["Inicial", "Intermedio", "Avanzado"];

    function esc(str) {
        return String(str == null ? "" : str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    /** Texto sin marcas de formato ni citas, para copiar al planificador. */
    function plain(text) {
        return String(text == null ? "" : text).replace(/\*\*(.+?)\*\*/g, "$1").replace(/\s*\[(S\d+)\]/g, "");
    }

    function asList(v) {
        return Array.isArray(v) ? v : v == null || v === "" ? [] : [v];
    }

    // ------------------------------------------------------------------
    // Datos
    // ------------------------------------------------------------------
    function collect(articles) {
        var out = [];
        (articles || []).forEach(function (a) {
            (a.exercises || []).forEach(function (ex) {
                if (!ex.meta) return;
                out.push({ key: a.id + ":" + ex.id, ex: ex, article: a });
            });
        });
        return out;
    }

    /** Requisitos efectivos, con la adaptación elegida aplicada. */
    function requirements(ex, adaptationId) {
        var m = ex.meta || {};
        var req = {
            minPlayers: m.minPlayers || 1,
            maxPlayers: m.maxPlayers || null,
            court: m.court || "half",
            hoops: m.hoops || 1,
            materials: (m.materials || []).slice()
        };
        var ad = (ex.adaptations || []).filter(function (x) { return x.id === adaptationId; })[0];
        if (ad && ad.req) Object.keys(ad.req).forEach(function (k) { req[k] = ad.req[k]; });
        return req;
    }

    function filterList(list, f) {
        f = f || {};
        var q = String(f.q || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        return list.filter(function (it) {
            var ex = it.ex;
            var m = ex.meta;
            if (f.fundamento && m.fundamento !== f.fundamento) return false;
            if (f.objetivo && m.objetivo !== f.objetivo) return false;
            if (f.categoria && (m.categories || []).indexOf(f.categoria) < 0) return false;
            if (f.nivel && m.level !== f.nivel) return false;
            if (f.favoritos && !(f.favSet && f.favSet[it.key])) return false;
            if (f.jugadores) {
                // Entra si el ejercicio, o alguna de sus adaptaciones, funciona con esa cantidad.
                var n = Number(f.jugadores);
                var ok = [null].concat((ex.adaptations || []).map(function (a) { return a.id; })).some(function (adId) {
                    var r = requirements(ex, adId);
                    return n >= r.minPlayers;
                });
                if (!ok) return false;
            }
            if (f.duracion && (m.minutes || [0])[0] > Number(f.duracion)) return false;
            if (f.cancha) {
                var fits = [null].concat((ex.adaptations || []).map(function (a) { return a.id; })).some(function (adId) {
                    var c = requirements(ex, adId).court;
                    return f.cancha === "full" ? true : c === "half";
                });
                if (f.cancha === "full" && m.court !== "full") return false;
                if (f.cancha === "half" && !fits) return false;
            }
            if (f.aros && (m.hoops || 1) > Number(f.aros)) return false;
            if (f.materiales && f.materiales.length) {
                var have = f.materiales;
                if ((m.materials || []).some(function (mat) { return have.indexOf(mat) < 0; })) return false;
            }
            if (q) {
                var hay = [ex.name, ex.objective, it.article.title, m.fundamento, m.objetivo].join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                if (hay.indexOf(q) < 0) return false;
            }
            return true;
        });
    }

    function facetValues(list) {
        var out = { fundamento: {}, objetivo: {}, categoria: {}, nivel: {}, materiales: {} };
        list.forEach(function (it) {
            var m = it.ex.meta;
            out.fundamento[m.fundamento] = true;
            out.objetivo[m.objetivo] = true;
            (m.categories || []).forEach(function (c) { out.categoria[c] = true; });
            out.nivel[m.level] = true;
            (m.materials || []).concat(m.optionalMaterials || []).forEach(function (x) { out.materiales[x] = true; });
        });
        var res = {};
        Object.keys(out).forEach(function (k) {
            res[k] = Object.keys(out[k]).filter(Boolean).sort(function (a, b) {
                if (k === "nivel") return LEVELS.indexOf(a) - LEVELS.indexOf(b);
                return a.localeCompare(b, "es");
            });
        });
        return res;
    }

    /*
     * Compatibilidad con las condiciones del entrenamiento.
     * cond = { players, court: "half"|"full", hoops, materials: [] }  (campos vacíos = no informado)
     * Devuelve { ok, issues: [{ code, text }], unknown: [texto], alternatives: [adaptation] }
     */
    function checkCompatibility(ex, cond, adaptationId) {
        cond = cond || {};
        var req = requirements(ex, adaptationId);
        var issues = [];
        var unknown = [];
        var players = cond.players === "" || cond.players == null ? null : Number(cond.players);
        if (players == null || isNaN(players)) unknown.push("cantidad de jugadores");
        else if (players < req.minPlayers) issues.push({ code: "players", text: "Necesita al menos " + req.minPlayers + " jugadores y hay " + players + "." });
        else if (req.maxPlayers && players > req.maxPlayers) issues.push({ code: "players_max", soft: true, text: "Está pensado para hasta " + req.maxPlayers + " jugadores y hay " + players + ": habrá más espera o hay que armar dos grupos." });
        if (!cond.court) unknown.push("espacio disponible");
        else if (req.court === "full" && cond.court === "half") issues.push({ code: "court", text: "Necesita cancha completa y el entrenamiento tiene solo media cancha." });
        var hoops = cond.hoops === "" || cond.hoops == null ? null : Number(cond.hoops);
        if (hoops == null || isNaN(hoops)) unknown.push("cantidad de aros");
        else if (hoops < req.hoops) issues.push({ code: "hoops", text: "Necesita " + req.hoops + " aro(s) y hay " + hoops + "." });
        if (Array.isArray(cond.materials) && cond.materials.length) {
            var missing = req.materials.filter(function (m) { return cond.materials.indexOf(m) < 0; });
            if (missing.length) issues.push({ code: "materials", text: "Faltan materiales: " + missing.join(", ") + "." });
        } else if (req.materials.length) {
            unknown.push("materiales");
        }
        var hard = issues.filter(function (i) { return !i.soft; });
        var alternatives = [];
        if (hard.length) {
            (ex.adaptations || []).forEach(function (ad) {
                if (ad.id === adaptationId) return;
                var r = checkCompatibility(ex, cond, ad.id);
                if (!r.issues.filter(function (i) { return !i.soft; }).length) alternatives.push(ad);
            });
        }
        return { ok: !hard.length, issues: issues, unknown: unknown, alternatives: alternatives };
    }

    /** Bloque del planificador: copia editable del ejercicio, con referencia al contenido original. */
    function buildBlock(item, opts) {
        opts = opts || {};
        var ex = item.ex;
        var article = item.article;
        var ad = (ex.adaptations || []).filter(function (x) { return x.id === opts.adaptationId; })[0] || null;
        var variantText = opts.variantText || "";
        var lines = [];
        function section(title, value) {
            var list = asList(value).map(plain).filter(Boolean);
            if (!list.length) return;
            lines.push(title.toUpperCase());
            if (list.length === 1) lines.push(list[0]);
            else list.forEach(function (x) { lines.push("• " + x); });
            lines.push("");
        }
        section("Objetivo principal", ex.objective);
        section("Objetivos secundarios", ex.secondary);
        if (ad) section("Adaptación elegida", ad.label + ": " + ad.text);
        if (variantText) section("Variante elegida", variantText);
        section("Organización", ex.organization);
        section("Desarrollo", ex.development);
        section("Reglas", ex.rules);
        section("Consignas", ex.cues);
        section("Materiales", ex.materials);
        section("Variantes", ex.variants);
        if (opts.notes) section("Observaciones", opts.notes);
        lines.push("Fuente: Basket Lab Academy · " + article.title + " › Entrenar › " + ex.name + ". " + plain(ex.basis));
        return {
            tipo_bloque: opts.blockType || (ex.meta && ex.meta.blockType) || "ejercicio",
            titulo: ex.name + (ad ? " (" + ad.label + ")" : ""),
            descripcion: lines.join("\n").trim(),
            duracion_minutos: Math.max(1, Math.round(Number(opts.minutes) || (ex.meta && ex.meta.minutes ? ex.meta.minutes[1] : 10))),
            academy_ref: {
                article_id: article.id,
                exercise_id: ex.id,
                adaptation_id: ad ? ad.id : null,
                variant: variantText || null,
                section_id: article.sectionId || null
            },
            observaciones: opts.notes || ""
        };
    }

    // ------------------------------------------------------------------
    // Interfaz
    // ------------------------------------------------------------------
    /*
     * host = {
     *   articles() -> [article],
     *   fmt(text) -> html, provenanceBadge(kind, refs) -> html,
     *   isFavorite(key), setFavorite(key, on),
     *   getTrainings() -> [entrenamiento], teams() -> [categoría],
     *   addBlock({ trainingId | newTraining: { nombre, fecha, categoria, condiciones }, block, board, conditions }) -> { ok, trainingId, error },
     *   openTraining(id), openArticle(sectionId, exerciseId), renderBoardThumb(boardDef) -> dataURL
     * }
     */
    var state = { filters: {} };

    function renderLibrary(container, host) {
        var items = collect(host.articles());
        var facets = facetValues(items);

        function options(list, sel, empty) {
            return '<option value="">' + esc(empty) + "</option>" + list.map(function (v) {
                return '<option value="' + esc(v) + '"' + (sel === v ? " selected" : "") + ">" + esc(v) + "</option>";
            }).join("");
        }
        var f = state.filters;
        container.innerHTML =
            '<section class="ac exl">' +
            '<header class="ac-hero"><p class="ac-crumbs">Basket Lab Academy · Planificación</p><h2>Biblioteca de ejercicios</h2>' +
            '<p class="ac-subtitle">Ejercicios con fundamento metodológico, ligados a los contenidos de la Academy. Cada uno se puede añadir a un entrenamiento como copia editable.</p></header>' +
            '<form class="exl-filters" aria-label="Filtros">' +
            '<label class="exl-f exl-f--q"><span>Buscar</span><input type="search" name="q" value="' + esc(f.q || "") + '" placeholder="Nombre, objetivo o contenido"></label>' +
            '<label class="exl-f"><span>Fundamento</span><select name="fundamento">' + options(facets.fundamento, f.fundamento, "Todos") + "</select></label>" +
            '<label class="exl-f"><span>Objetivo</span><select name="objetivo">' + options(facets.objetivo, f.objetivo, "Todos") + "</select></label>" +
            '<label class="exl-f"><span>Categoría</span><select name="categoria">' + options(facets.categoria, f.categoria, "Todas") + "</select></label>" +
            '<label class="exl-f"><span>Nivel</span><select name="nivel">' + options(facets.nivel, f.nivel, "Todos") + "</select></label>" +
            '<label class="exl-f"><span>Jugadores disponibles</span><input type="number" min="1" max="40" name="jugadores" value="' + esc(f.jugadores || "") + '" placeholder="Ej: 10"></label>' +
            '<label class="exl-f"><span>Duración máx. (min)</span><input type="number" min="1" max="120" name="duracion" value="' + esc(f.duracion || "") + '" placeholder="Ej: 10"></label>' +
            '<label class="exl-f"><span>Cancha</span><select name="cancha"><option value="">Cualquiera</option><option value="half"' + (f.cancha === "half" ? " selected" : "") + '>Tengo media cancha</option><option value="full"' + (f.cancha === "full" ? " selected" : "") + ">Solo de cancha completa</option></select></label>" +
            '<label class="exl-f"><span>Aros disponibles</span><input type="number" min="1" max="12" name="aros" value="' + esc(f.aros || "") + '" placeholder="Ej: 2"></label>' +
            '<fieldset class="exl-f exl-f--mat"><legend>Materiales disponibles</legend>' + facets.materiales.map(function (m) {
                var on = (f.materiales || []).indexOf(m) >= 0;
                return '<label class="exl-check"><input type="checkbox" name="materiales" value="' + esc(m) + '"' + (on ? " checked" : "") + "> " + esc(m) + "</label>";
            }).join("") + "</fieldset>" +
            '<label class="exl-check exl-f--fav"><input type="checkbox" name="favoritos"' + (f.favoritos ? " checked" : "") + "> Solo favoritos</label>" +
            '<button type="button" class="tb-btn tb-btn--small" data-x="clear">Limpiar filtros</button>' +
            "</form>" +
            '<p class="exl-count ac-muted" aria-live="polite"></p>' +
            '<div class="exl-grid"></div>' +
            "</section>";

        // Los eventos van en la sección recién creada (no en el contenedor) para no duplicarse al volver a dibujar.
        var section = container.querySelector(".exl");
        var grid = container.querySelector(".exl-grid");
        var form = container.querySelector(".exl-filters");

        function readFilters() {
            var fd = new FormData(form);
            state.filters = {
                q: fd.get("q") || "",
                fundamento: fd.get("fundamento") || "",
                objetivo: fd.get("objetivo") || "",
                categoria: fd.get("categoria") || "",
                nivel: fd.get("nivel") || "",
                jugadores: fd.get("jugadores") || "",
                duracion: fd.get("duracion") || "",
                cancha: fd.get("cancha") || "",
                aros: fd.get("aros") || "",
                materiales: fd.getAll("materiales"),
                favoritos: !!fd.get("favoritos")
            };
        }

        function draw() {
            var favSet = {};
            items.forEach(function (it) { if (host.isFavorite(it.key)) favSet[it.key] = true; });
            var shown = filterList(items, Object.assign({}, state.filters, { favSet: favSet }));
            container.querySelector(".exl-count").textContent = shown.length + " de " + items.length + " ejercicios";
            grid.innerHTML = shown.length ? shown.map(function (it) { return card(it, favSet[it.key], host); }).join("") :
                '<p class="ac-muted">Ningún ejercicio cumple esos filtros. Probá quitar alguno.</p>';
        }

        form.addEventListener("input", function () { readFilters(); draw(); });
        form.addEventListener("change", function () { readFilters(); draw(); });
        form.addEventListener("submit", function (e) { e.preventDefault(); });
        section.addEventListener("click", function (e) {
            var b = e.target.closest("[data-x]");
            if (!b) return;
            var act = b.getAttribute("data-x");
            var key = b.getAttribute("data-key");
            var it = items.filter(function (x) { return x.key === key; })[0];
            if (act === "clear") {
                state.filters = {};
                renderLibrary(container, host);
            } else if (act === "fav" && it) {
                var on = !host.isFavorite(key);
                host.setFavorite(key, on);
                draw();
            } else if (act === "add" && it) {
                openAddModal(it, host, {});
            } else if (act === "open" && it) {
                host.openArticle(it.article.sectionId, it.ex.id);
            }
        });
        draw();
    }

    function card(it, fav, host) {
        var ex = it.ex;
        var m = ex.meta;
        var thumb = "";
        if (ex.board && host.renderBoardThumb) {
            try { thumb = host.renderBoardThumb(it.article, ex.board) || ""; } catch (e) { thumb = ""; }
        }
        return '<article class="exl-card">' +
            (thumb ? '<img class="exl-thumb" alt="" src="' + esc(thumb) + '">' : "") +
            '<div class="exl-body">' +
            '<p class="ac-muted exl-from">' + esc(it.article.title) + " · " + esc(m.fundamento) + "</p>" +
            "<h3>" + esc(ex.name) + "</h3>" +
            "<p>" + esc(plain(ex.objective)) + "</p>" +
            '<div class="ac-ex-chips"><span>' + esc(m.level) + "</span><span>" + esc((m.categories || []).join(", ")) + "</span><span>" +
            esc(m.minPlayers + (m.maxPlayers ? "–" + m.maxPlayers : "+") + " jugadores") + "</span><span>" +
            esc(m.minutes[0] === m.minutes[1] ? m.minutes[0] + " min" : m.minutes[0] + "–" + m.minutes[1] + " min") + "</span><span>" +
            esc(COURT_LABEL[m.court]) + "</span><span>" + esc(m.hoops + (m.hoops === 1 ? " aro" : " aros")) + "</span></div>" +
            ((ex.adaptations || []).length ? '<p class="ac-muted">Adaptaciones: ' + esc(ex.adaptations.map(function (a) { return a.label; }).join(" · ")) + "</p>" : "") +
            '<div class="exl-actions">' +
            '<button type="button" class="tb-btn tb-btn--small tb-btn--accent" data-x="add" data-key="' + esc(it.key) + '">Añadir al entrenamiento</button>' +
            '<button type="button" class="tb-btn tb-btn--small" data-x="open" data-key="' + esc(it.key) + '">Ver ficha completa</button>' +
            '<button type="button" class="tb-btn tb-btn--small exl-fav' + (fav ? " is-on" : "") + '" data-x="fav" data-key="' + esc(it.key) + '" aria-pressed="' + (fav ? "true" : "false") + '">' + (fav ? "★ Favorito" : "☆ Favorito") + "</button>" +
            "</div></div></article>";
    }

    // ------------------------------------------------------------------
    // Modal "Añadir al entrenamiento"
    // ------------------------------------------------------------------
    function today() {
        var d = new Date();
        return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    }

    function openAddModal(it, host, opts) {
        opts = opts || {};
        var ex = it.ex;
        var trainings = (host.getTrainings() || []).slice().sort(function (a, b) {
            return String(b.fecha || "").localeCompare(String(a.fecha || "")) || (Number(b.id) || 0) - (Number(a.id) || 0);
        });
        var teams = host.teams();
        var overlay = document.createElement("div");
        overlay.className = "tb-modal exl-modal";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");
        overlay.setAttribute("aria-label", "Añadir al entrenamiento");
        var variantOptions = '<option value="">Original</option>' +
            (ex.adaptations || []).map(function (a) { return '<option value="ad:' + esc(a.id) + '">' + esc(a.label) + "</option>"; }).join("") +
            asList(ex.variants).map(function (v, i) { return '<option value="v:' + i + '">Variante: ' + esc(plain(v)) + "</option>"; }).join("");
        overlay.innerHTML =
            '<div class="tb-modal-card exl-modal-card">' +
            '<h3 class="tb-modal-title">Añadir al entrenamiento</h3>' +
            '<p class="tb-modal-text"><strong>' + esc(ex.name) + "</strong>. Se agrega como un bloque que podés editar en el planificador; el ejercicio de la biblioteca no cambia." +
            (ex.board ? " La pizarra se guarda como copia en Jugadas guardadas para que puedas modificarla." : "") + "</p>" +
            '<form class="exl-form">' +
            '<div class="tb-field"><span>Entrenamiento</span><select name="training">' +
            '<option value="__new">+ Crear un entrenamiento nuevo</option>' +
            trainings.map(function (t) {
                return '<option value="' + esc(t.id) + '">' + esc((t.nombre || "Sin nombre") + " · " + (t.categoria || "Sin categoría") + " · " + (t.fecha || "sin fecha")) + "</option>";
            }).join("") + "</select></div>" +
            '<div class="exl-new">' +
            '<div class="tb-field"><span>Nombre del entrenamiento</span><input name="nombre" placeholder="Ej: Martes, defensa zonal"></div>' +
            '<div class="tb-field-row"><div class="tb-field"><span>Equipo o categoría</span><select name="categoria">' + teams.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + "</option>"; }).join("") + "</select></div>" +
            '<div class="tb-field"><span>Fecha</span><input type="date" name="fecha" value="' + today() + '"></div></div>' +
            "</div>" +
            '<fieldset class="exl-cond"><legend>Condiciones del entrenamiento</legend>' +
            '<div class="tb-field-row"><div class="tb-field"><span>Jugadores</span><input type="number" min="1" max="40" name="players" placeholder="Ej: 10"></div>' +
            '<div class="tb-field"><span>Espacio</span><select name="court"><option value="">Sin indicar</option><option value="half">Media cancha</option><option value="full">Cancha completa</option></select></div>' +
            '<div class="tb-field"><span>Aros</span><input type="number" min="1" max="12" name="hoops" placeholder="Ej: 2"></div></div>' +
            '<div class="exl-mats">' + ["Balones", "Conos"].concat((ex.meta.materials || []).concat(ex.meta.optionalMaterials || []).filter(function (m) { return ["Balones", "Conos"].indexOf(m) < 0; })).map(function (m) {
                return '<label class="exl-check"><input type="checkbox" name="materials" value="' + esc(m) + '"> ' + esc(m) + "</label>";
            }).join("") + "</div>" +
            '<p class="ac-muted">Se guardan en el entrenamiento para revisar los próximos ejercicios.</p>' +
            "</fieldset>" +
            '<div class="tb-field-row"><div class="tb-field"><span>Bloque de la sesión</span><select name="blockType">' + BLOCK_TYPES.map(function (b) {
                return '<option value="' + b[0] + '"' + ((ex.meta.blockType || "ejercicio") === b[0] ? " selected" : "") + ">" + esc(b[1]) + "</option>";
            }).join("") + "</select></div>" +
            '<div class="tb-field"><span>Duración (min)</span><input type="number" min="1" max="120" name="minutes" value="' + (ex.meta.minutes ? ex.meta.minutes[1] : 10) + '"></div></div>' +
            '<div class="tb-field"><span>Variante del ejercicio</span><select name="variant">' + variantOptions + "</select></div>" +
            '<div class="tb-field"><span>Observaciones personales</span><textarea name="notes" rows="2" placeholder="Opcional"></textarea></div>' +
            '<div class="exl-check-result" aria-live="polite"></div>' +
            '<div class="tb-modal-actions"><button type="button" class="tb-btn" data-close>Cancelar</button>' +
            '<button type="submit" class="tb-btn tb-btn--accent" data-submit>Añadir</button></div>' +
            "</form></div>";
        document.body.appendChild(overlay);
        var form = overlay.querySelector("form");
        var result = overlay.querySelector(".exl-check-result");
        var confirmed = false;

        function close() {
            document.removeEventListener("keydown", onKey);
            overlay.remove();
        }
        function onKey(e) { if (e.key === "Escape") close(); }
        document.addEventListener("keydown", onKey);
        overlay.addEventListener("click", function (e) {
            if (e.target === overlay || e.target.closest("[data-close]")) close();
        });

        function selectedTraining() {
            var v = form.elements.training.value;
            if (v === "__new") return null;
            return trainings.filter(function (t) { return String(t.id) === v; })[0] || null;
        }

        function fillConditions() {
            var t = selectedTraining();
            overlay.querySelector(".exl-new").hidden = !!t;
            var c = (t && t.condiciones) || {};
            form.elements.players.value = c.jugadores != null ? c.jugadores : "";
            form.elements.court.value = c.espacio || "";
            form.elements.hoops.value = c.aros != null ? c.aros : "";
            form.querySelectorAll('input[name="materials"]').forEach(function (cb) {
                cb.checked = Array.isArray(c.materiales) && c.materiales.indexOf(cb.value) >= 0;
            });
        }

        function conditions() {
            return {
                players: form.elements.players.value,
                court: form.elements.court.value,
                hoops: form.elements.hoops.value,
                materials: Array.prototype.map.call(form.querySelectorAll('input[name="materials"]:checked'), function (c) { return c.value; })
            };
        }

        function adaptationId() {
            var v = form.elements.variant.value;
            return v.indexOf("ad:") === 0 ? v.slice(3) : null;
        }

        function evaluate() {
            var r = checkCompatibility(ex, conditions(), adaptationId());
            var html = "";
            if (r.issues.length) {
                html += '<div class="exl-warn' + (r.ok ? " exl-warn--soft" : "") + '"><strong>' + (r.ok ? "Revisá antes de añadir" : "No es compatible con este entrenamiento") + "</strong><ul>" +
                    r.issues.map(function (i) { return "<li>" + esc(i.text) + "</li>"; }).join("") + "</ul>" +
                    (r.alternatives.length ? "<p>Variante compatible:</p>" + r.alternatives.map(function (a) {
                        return '<button type="button" class="tb-btn tb-btn--small" data-use="' + esc(a.id) + '">Usar «' + esc(a.label) + "»</button>";
                    }).join(" ") : (!r.ok ? "<p>No hay una variante preparada que lo resuelva. Podés añadirlo igual y adaptarlo vos.</p>" : "")) +
                    "</div>";
            } else if (!r.unknown.length) {
                html += '<div class="exl-okmsg">Compatible con las condiciones indicadas.</div>';
            }
            if (r.unknown.length) html += '<p class="ac-muted">Sin datos de ' + esc(r.unknown.join(", ")) + ": no se pudo revisar.</p>";
            result.innerHTML = html;
            overlay.querySelector("[data-submit]").textContent = r.ok ? "Añadir" : "Añadir igual";
            return r;
        }

        // Cualquier cambio en el formulario pide confirmar de nuevo si sigue habiendo incompatibilidades.
        form.addEventListener("change", function (e) {
            if (e.target.name === "training") fillConditions();
            confirmed = false;
            evaluate();
        });
        form.addEventListener("input", function (e) {
            if (e.target.name === "players" || e.target.name === "hoops") {
                confirmed = false;
                evaluate();
            }
        });
        overlay.addEventListener("click", function (e) {
            var u = e.target.closest("[data-use]");
            if (!u) return;
            form.elements.variant.value = "ad:" + u.getAttribute("data-use");
            confirmed = false;
            var ad = (ex.adaptations || []).filter(function (a) { return a.id === u.getAttribute("data-use"); })[0];
            evaluate();
            if (ad) result.insertAdjacentHTML("afterbegin", '<p class="exl-okmsg">Elegiste la adaptación: ' + esc(ad.text) + "</p>");
        });
        form.addEventListener("submit", function (e) {
            e.preventDefault();
            var r = evaluate();
            if (!r.ok && !confirmed) {
                // No se modifica la planificación sin que el entrenador lo confirme.
                confirmed = true;
                result.insertAdjacentHTML("beforeend", '<p class="exl-warn-note">Tocá «Añadir igual» otra vez para confirmar que querés agregarlo con estas incompatibilidades.</p>');
                return;
            }
            var v = form.elements.variant.value;
            var variantText = v.indexOf("v:") === 0 ? plain(asList(ex.variants)[Number(v.slice(2))]) : "";
            var block = buildBlock(it, {
                adaptationId: adaptationId(),
                variantText: variantText,
                minutes: form.elements.minutes.value,
                notes: form.elements.notes.value.trim(),
                blockType: form.elements.blockType.value
            });
            var c = conditions();
            var payload = {
                block: block,
                boardId: ex.board || null,
                article: it.article,
                conditions: {
                    jugadores: c.players === "" ? null : Number(c.players),
                    espacio: c.court || null,
                    aros: c.hoops === "" ? null : Number(c.hoops),
                    materiales: c.materials
                },
                incompatibilities: r.issues.map(function (i) { return i.text; })
            };
            var t = selectedTraining();
            if (t) payload.trainingId = t.id;
            else payload.newTraining = { nombre: form.elements.nombre.value.trim() || ex.name, fecha: form.elements.fecha.value || "", categoria: form.elements.categoria.value };
            var res = host.addBlock(payload) || {};
            if (!res.ok) {
                result.insertAdjacentHTML("beforeend", '<p class="exl-warn">' + esc(res.error || "No se pudo añadir.") + "</p>");
                return;
            }
            form.innerHTML = '<p class="exl-okmsg">Listo: «' + esc(block.titulo) + "» quedó en el entrenamiento.</p>" +
                '<div class="tb-modal-actions"><button type="button" class="tb-btn" data-close>Seguir acá</button>' +
                '<button type="button" class="tb-btn tb-btn--accent" data-go="' + esc(res.trainingId) + '">Abrir el entrenamiento</button></div>';
            overlay.querySelector("[data-go]").addEventListener("click", function () {
                close();
                host.openTraining(res.trainingId);
            });
        });

        if (trainings.length) form.elements.training.value = String(trainings[0].id);
        fillConditions();
        evaluate();
        (form.elements.training).focus();
        return overlay;
    }

    return {
        COURT_LABEL: COURT_LABEL,
        collect: collect,
        requirements: requirements,
        filterList: filterList,
        facetValues: facetValues,
        checkCompatibility: checkCompatibility,
        buildBlock: buildBlock,
        renderLibrary: renderLibrary,
        openAddModal: openAddModal,
        plain: plain
    };
});
