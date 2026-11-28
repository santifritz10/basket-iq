/*
 * Basket Lab · Fundamentos — interfaz de la academia
 *
 * window.BasketFundamentos:
 *   renderHome(target, host)                 portada con 8 áreas, buscador y filtros
 *   renderArea(target, areaId, subId, host)  área con sus bloques internos
 *   renderConcept(target, conceptId, variantId, host)  ficha de un concepto en renovación
 *
 * Las fichas completas son artículos de BasketAcademy (js/academy-content/fund-*.js) y
 * las muestra el host con su renderizador. Este módulo no guarda datos propios: favoritos
 * e historial pasan por el host (learning_progress y almacenamiento local).
 */
(function (root, factory) {
    var api = factory(root);
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.BasketFundamentos = api;
})(typeof window !== "undefined" ? window : null, function (root) {
    "use strict";

    function Cat() { return root.BasketFundCatalog; }
    function Vid() { return root.BasketVideos; }
    function Fig() { return root.BasketFundFigures; }
    function Acad() { return root.BasketAcademy; }

    function esc(s) {
        return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    var HISTORY_KEY = "basketLab_fundHistory";
    function readHistory() {
        try { var v = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; }
    }
    function pushHistory(conceptId) {
        var list = readHistory().filter(function (x) { return x !== conceptId; });
        list.unshift(conceptId);
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 8))); } catch (e) { /* sin almacenamiento */ }
    }

    /** Clave de favorito: la ficha completa usa el id del artículo (mismo botón que en la ficha). */
    function favKey(c) { return c.article || "fund:" + c.id; }

    function articleOf(c) { var A = Acad(); return c.article && A ? A.get(c.article) : null; }

    /** Ejercicios que trabajan el concepto (propios de su ficha o de otras fichas). */
    function exercisesFor(c) {
        var A = Acad();
        if (!A) return [];
        var out = [];
        A.list().forEach(function (a) {
            (a.exercises || []).forEach(function (ex) {
                var f = (ex.meta && ex.meta.fundamentos) || [];
                if (a.conceptId === c.id || f.indexOf(c.id) >= 0) out.push({ article: a, ex: ex });
            });
        });
        return out;
    }

    function ctxFor(host) {
        var progress = host && host.getProgress ? host.getProgress() : { favorites: {} };
        return {
            hasVideo: function (c) { return !!(Vid() && Vid().hasVideo(c.id)); },
            hasExercises: function (c) { return exercisesFor(c).length > 0; },
            isFavorite: function (c) { return !!(progress.favorites || {})[favKey(c)]; }
        };
    }

    // ------------------------------------------------------------------
    // Piezas
    // ------------------------------------------------------------------
    function badges(c, ctx) {
        var out = [];
        out.push(c.article ? '<span class="fa-badge fa-badge--ok">Ficha completa</span>' : '<span class="fa-badge">En renovación</span>');
        out.push('<span class="fa-badge fa-badge--soft">' + esc(c.level) + "</span>");
        if (ctx.hasVideo(c)) out.push('<span class="fa-badge fa-badge--soft">Video</span>');
        if (ctx.hasExercises(c)) out.push('<span class="fa-badge fa-badge--soft">Ejercicios</span>');
        if (ctx.isFavorite(c)) out.push('<span class="fa-badge fa-badge--fav" title="En favoritos">★</span>');
        return out.join("");
    }

    function tile(c, ctx, areaId) {
        var C = Cat();
        var where = "";
        if (areaId && c.area !== areaId) {
            var a = C.getArea(c.area);
            where = '<span class="fa-tile-where">Ficha principal en ' + esc(a ? a.name : "") + "</span>";
        } else if (!areaId) {
            var a2 = C.getArea(c.area);
            where = '<span class="fa-tile-where">' + esc(a2 ? a2.name : "") + " · " + esc(C.subName(c.area, c.sub)) + "</span>";
        }
        return '<button type="button" class="fa-tile' + (c.article ? " is-complete" : "") + '" data-concept="' + esc(c.id) + '">' +
            '<span class="fa-tile-name">' + esc(c.name) + "</span>" +
            (c.en && c.en.toLowerCase() !== c.name.toLowerCase() ? '<span class="fa-tile-en">' + esc(c.en) + "</span>" : "") +
            where +
            '<span class="fa-tile-badges">' + badges(c, ctx) + "</span>" +
            "</button>";
    }

    function header(kicker, title, sub) {
        return '<header class="fa-hero"><p class="fa-kicker">' + esc(kicker) + "</p><h2>" + esc(title) + "</h2>" + (sub ? '<p class="fa-sub">' + esc(sub) + "</p>" : "") + "</header>";
    }

    // ------------------------------------------------------------------
    // Portada
    // ------------------------------------------------------------------
    var state = { q: "", area: "", skill: "", level: "", video: false, exercises: false, favorites: false, complete: false };

    function hasFilters() {
        return !!(state.q || state.area || state.skill || state.level || state.video || state.exercises || state.favorites || state.complete);
    }

    function renderHome(target, host) {
        var C = Cat();
        var ctx = ctxFor(host);
        var total = C.CONCEPTS.length;
        var complete = C.CONCEPTS.filter(function (c) { return !!c.article; });
        var videoCount = Vid() ? Vid().VIDEOS.filter(function (v) { return Vid().isListed(v); }).length : 0;

        var areaCards = C.AREAS.map(function (a) {
            var n = C.areaCounts(a.id, { hasVideo: ctx.hasVideo });
            return '<article class="fa-area">' +
                '<button type="button" class="fa-area-btn" data-area="' + esc(a.id) + '" aria-label="Abrir ' + esc(a.name) + '">' +
                '<span class="fa-area-art">' + (Fig() ? Fig().render(a.figure) : "") + "</span>" +
                '<span class="fa-area-body">' +
                '<span class="fa-area-sport">' + esc(a.sport) + "</span>" +
                '<strong class="fa-area-name">' + esc(a.name) + "</strong>" +
                '<span class="fa-area-desc">' + esc(a.desc) + "</span>" +
                '<span class="fa-area-count">' + n.total + " contenidos" + (n.complete ? " · " + n.complete + " ficha" + (n.complete > 1 ? "s" : "") + " completa" + (n.complete > 1 ? "s" : "") : "") + (n.videos ? " · " + n.videos + " con video" : "") + "</span>" +
                "</span></button></article>";
        }).join("");

        var featured = complete.map(function (c) { return tile(c, ctx); }).join("");

        var hist = readHistory().map(function (id) { return C.getConcept(id); }).filter(Boolean);
        var favs = C.CONCEPTS.filter(ctx.isFavorite);

        function opt(v, label, cur) { return '<option value="' + esc(v) + '"' + (v === cur ? " selected" : "") + ">" + esc(label) + "</option>"; }
        var filters =
            '<form class="fa-search" role="search" onsubmit="return false">' +
            '<label class="fa-q"><span class="fa-sr">Buscar un fundamento</span>' +
            '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M20 20l-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
            '<input type="search" name="q" value="' + esc(state.q) + '" placeholder="Buscá por nombre, en inglés o en español: floater, pocket, cierre…" autocomplete="off"></label>' +
            '<div class="fa-filters">' +
            '<label><span>Área</span><select name="area">' + opt("", "Todas", state.area) + C.AREAS.map(function (a) { return opt(a.id, a.sport, state.area); }).join("") + "</select></label>" +
            '<label><span>Habilidad</span><select name="skill">' + opt("", "Todas", state.skill) + Object.keys(C.SKILLS).map(function (k) { return opt(k, C.SKILLS[k], state.skill); }).join("") + "</select></label>" +
            '<label><span>Dificultad</span><select name="level">' + opt("", "Todas", state.level) + C.LEVELS.map(function (l) { return opt(l, l, state.level); }).join("") + "</select></label>" +
            '<label class="fa-check"><input type="checkbox" name="video"' + (state.video ? " checked" : "") + "> Con video</label>" +
            '<label class="fa-check"><input type="checkbox" name="exercises"' + (state.exercises ? " checked" : "") + "> Con ejercicios</label>" +
            '<label class="fa-check"><input type="checkbox" name="complete"' + (state.complete ? " checked" : "") + "> Fichas completas</label>" +
            '<label class="fa-check"><input type="checkbox" name="favorites"' + (state.favorites ? " checked" : "") + "> Favoritos</label>" +
            '<button type="button" class="tb-btn tb-btn--small" data-clear>Limpiar</button>' +
            "</div></form>";

        target.innerHTML =
            '<div class="fa">' +
            '<header class="fa-hero fa-hero--home">' +
            '<p class="fa-kicker">Basket Lab · By Coach Fritz</p>' +
            "<h2>Fundamentos</h2>" +
            '<p class="fa-sub">Una academia para aprender qué hacer, cuándo hacerlo y cómo entrenarlo. Cada concepto tiene una sola ficha y aparece en todas las áreas donde se usa.</p>' +
            '<p class="fa-stats"><span><strong>' + total + "</strong> conceptos</span><span><strong>" + complete.length + "</strong> fichas completas</span><span><strong>" + videoCount + "</strong> videos comprobados</span><span><strong>8</strong> áreas</span></p>" +
            "</header>" +
            filters +
            '<div class="fa-results" aria-live="polite"></div>' +
            '<div class="fa-home-body">' +
            (hist.length ? '<section class="fa-block"><h3>Seguí donde lo dejaste</h3><div class="fa-row">' + hist.slice(0, 4).map(function (c) { return tile(c, ctx); }).join("") + "</div></section>" : "") +
            '<section class="fa-block"><h3>Las ocho áreas</h3><div class="fa-areas">' + areaCards + "</div></section>" +
            '<section class="fa-block"><h3>Fichas modelo</h3><p class="fa-muted">Las primeras fichas renovadas, con aprender, visualizar, entrenar, evaluar y fuentes. El resto conserva su contenido anterior mientras se renueva.</p><div class="fa-row">' + featured + "</div></section>" +
            (favs.length ? '<section class="fa-block"><h3>Tus favoritos</h3><div class="fa-row">' + favs.map(function (c) { return tile(c, ctx); }).join("") + "</div></section>" : "") +
            "</div></div>";

        var results = target.querySelector(".fa-results");
        var body = target.querySelector(".fa-home-body");
        function paintResults() {
            if (!hasFilters()) {
                results.innerHTML = "";
                body.hidden = false;
                return;
            }
            var list = C.search(state, ctx);
            body.hidden = true;
            results.innerHTML = '<p class="fa-count">' + (list.length ? list.length + (list.length === 1 ? " resultado" : " resultados") : "No hay fundamentos con esos filtros.") + "</p>" +
                (list.length ? '<div class="fa-row fa-row--wrap">' + list.map(function (c) { return tile(c, ctx); }).join("") + "</div>" : '<p class="fa-muted">Probá con otro nombre (también en inglés) o sacá algún filtro.</p>');
        }
        paintResults();

        var form = target.querySelector(".fa-search");
        var timer = null;
        form.addEventListener("input", function (e) {
            var el = e.target;
            if (!el.name) return;
            state[el.name] = el.type === "checkbox" ? el.checked : el.value;
            if (timer) clearTimeout(timer);
            timer = setTimeout(paintResults, el.name === "q" ? 120 : 0);
        });
        form.addEventListener("change", function (e) {
            var el = e.target;
            if (!el.name) return;
            state[el.name] = el.type === "checkbox" ? el.checked : el.value;
            paintResults();
        });
        target.querySelector("[data-clear]").addEventListener("click", function () {
            state = { q: "", area: "", skill: "", level: "", video: false, exercises: false, favorites: false, complete: false };
            renderHome(target, host);
        });
        wireNav(target.querySelector(".fa"), host);
    }

    // ------------------------------------------------------------------
    // Área
    // ------------------------------------------------------------------
    function renderArea(target, areaId, subId, host) {
        var C = Cat();
        var a = C.getArea(areaId);
        if (!a) { renderHome(target, host); return; }
        var ctx = ctxFor(host);
        var list = C.conceptsInArea(areaId);
        var n = C.areaCounts(areaId, { hasVideo: ctx.hasVideo });
        var chips = a.subs.map(function (s) {
            var count = list.filter(function (c) { return C.subsOf(c, areaId).indexOf(s[0]) >= 0; }).length;
            return '<a href="#fa-sub-' + esc(s[0]) + '" class="fa-chip" data-sub="' + esc(s[0]) + '">' + esc(s[1]) + " <span>" + count + "</span></a>";
        }).join("");
        var groups = a.subs.map(function (s) {
            var items = list.filter(function (c) { return C.subsOf(c, areaId).indexOf(s[0]) >= 0; });
            items.sort(function (x, y) { return (y.article ? 1 : 0) - (x.article ? 1 : 0) || C.LEVELS.indexOf(x.level) - C.LEVELS.indexOf(y.level) || x.name.localeCompare(y.name, "es"); });
            return '<section class="fa-group" id="fa-sub-' + esc(s[0]) + '"><h3>' + esc(s[1]) + "</h3>" +
                (items.length ? '<div class="fa-row fa-row--wrap">' + items.map(function (c) { return tile(c, ctx, areaId); }).join("") + "</div>"
                    : '<p class="fa-muted">Todavía no hay contenidos en este bloque. Se completará en las próximas etapas.</p>') +
                "</section>";
        }).join("");
        target.innerHTML =
            '<div class="fa">' +
            '<nav class="fa-crumbs" aria-label="Ruta"><button type="button" class="fa-link" data-home>Fundamentos</button> › <span>' + esc(a.name) + "</span></nav>" +
            '<header class="fa-hero fa-hero--area"><div class="fa-hero-art">' + (Fig() ? Fig().render(a.figure) : "") + "</div><div>" +
            '<p class="fa-kicker">' + esc(a.sport) + "</p><h2>" + esc(a.name) + "</h2>" +
            '<p class="fa-sub">' + esc(a.desc) + "</p>" +
            '<p class="fa-stats"><span><strong>' + n.total + "</strong> contenidos</span>" + (n.related ? "<span><strong>" + n.related + "</strong> relacionados de otras áreas</span>" : "") + "<span><strong>" + n.complete + "</strong> fichas completas</span></p>" +
            "</div></header>" +
            '<nav class="fa-chips" aria-label="Bloques del área">' + chips + "</nav>" +
            groups +
            "</div>";
        target.querySelectorAll("[data-sub]").forEach(function (link) {
            link.addEventListener("click", function (e) {
                e.preventDefault();
                var el = target.querySelector("#fa-sub-" + link.getAttribute("data-sub"));
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            });
        });
        wireNav(target.querySelector(".fa"), host);
        if (subId) {
            var el = target.querySelector("#fa-sub-" + subId);
            if (el) setTimeout(function () { el.scrollIntoView({ block: "start" }); }, 30);
        }
    }

    // ------------------------------------------------------------------
    // Concepto en renovación (contenido anterior dentro del modelo nuevo)
    // ------------------------------------------------------------------
    function legacyBlock(entry, title) {
        if (!entry) return "";
        function ul(list) { return '<ul class="ac-list">' + (list || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>"; }
        return '<section class="fa-legacy"><h4>' + esc(title || entry.nombre) + "</h4>" +
            '<div class="fa-legacy-grid">' +
            '<div><h5>Ventajas</h5>' + ul(entry.ventajas) + "</div>" +
            '<div><h5>Desventajas</h5>' + ul(entry.desventajas) + "</div>" +
            '<div><h5>Momentos convenientes</h5>' + ul(entry.momentos) + "</div>" +
            "</div></section>";
    }

    function conceptLinks(ids) {
        var C = Cat();
        var list = (ids || []).map(function (id) { return C.getConcept(id); }).filter(Boolean);
        if (!list.length) return '<span class="fa-muted">—</span>';
        return list.map(function (c) { return '<button type="button" class="fa-link" data-concept="' + esc(c.id) + '">' + esc(c.name) + "</button>"; }).join(", ");
    }

    function renderConcept(target, conceptId, variantId, host) {
        var C = Cat();
        var c = C.getConcept(conceptId);
        if (!c) { renderHome(target, host); return; }
        pushHistory(c.id);
        var ctx = ctxFor(host);
        var legacy = (host && host.legacyContent) || {};
        var area = C.getArea(c.area);
        var appearsIn = [[c.area, c.sub]].concat(c.also).map(function (x) {
            var a = C.getArea(x[0]);
            return '<button type="button" class="fa-link" data-area="' + esc(x[0]) + '" data-area-sub="' + esc(x[1]) + '">' + esc(a ? a.name : "") + " › " + esc(C.subName(x[0], x[1])) + "</button>";
        }).join("<br>");
        var isFav = ctx.isFavorite(c);
        var videos = Vid() ? Vid().forConcept(c.id) : [];
        var exs = exercisesFor(c);

        var legacyHtml = c.legacy.map(function (id) { return legacyBlock(legacy[id], c.legacy.length > 1 ? legacy[id] && legacy[id].nombre : "Contenido anterior"); }).join("") +
            c.variants.filter(function (v) { return v.legacy; }).map(function (v) {
                return '<div id="fa-var-' + esc(v.id) + '">' + legacyBlock(legacy[v.legacy], "Variante · " + v.name) + "</div>";
            }).join("");

        target.innerHTML =
            '<div class="fa">' +
            '<nav class="fa-crumbs" aria-label="Ruta"><button type="button" class="fa-link" data-home>Fundamentos</button> › <button type="button" class="fa-link" data-area="' + esc(c.area) + '">' + esc(area ? area.name : "") + "</button> › <span>" + esc(c.name) + "</span></nav>" +
            '<header class="fa-hero fa-hero--concept">' +
            '<p class="fa-kicker">' + esc(area ? area.name : "") + " · " + esc(C.subName(c.area, c.sub)) + "</p>" +
            "<h2>" + esc(c.name) + "</h2>" +
            '<p class="fa-sub">' + esc(c.en) + (c.aliases.length ? " · también: " + esc(c.aliases.join(", ")) : "") + "</p>" +
            '<div class="fa-tile-badges">' + badges(c, ctx) + "</div>" +
            '<div class="fa-actions"><button type="button" class="tb-btn fa-fav' + (isFav ? " is-on" : "") + '" aria-pressed="' + (isFav ? "true" : "false") + '">' + (isFav ? "★ En favoritos" : "☆ Guardar en favoritos") + "</button></div>" +
            "</header>" +
            '<aside class="fa-notice"><strong>Ficha en renovación.</strong> Mostramos el contenido anterior de Basket Lab ordenado en el modelo nuevo. Todavía no tiene ejercicios, evaluación ni fuentes verificadas: queda pendiente de validación.</aside>' +
            '<dl class="ac-ficha-grid fa-ficha">' +
            '<div class="ac-ficha-row"><dt>Nivel orientativo</dt><dd><p>' + esc(c.level) + "</p></dd></div>" +
            '<div class="ac-ficha-row"><dt>Habilidades</dt><dd><p>' + esc(c.skills.map(function (s) { return C.SKILLS[s]; }).join(" · ")) + "</p></dd></div>" +
            '<div class="ac-ficha-row"><dt>Habilidades previas</dt><dd><p>' + conceptLinks(c.prereqs) + "</p></dd></div>" +
            '<div class="ac-ficha-row"><dt>Relacionados</dt><dd><p>' + conceptLinks(c.related) + "</p></dd></div>" +
            '<div class="ac-ficha-row"><dt>Aparece en</dt><dd><p>' + appearsIn + "</p></dd></div>" +
            "</dl>" +
            (c.merge ? '<aside class="ac-callout ac-callout--info"><strong>Cómo se reorganizó</strong><p>' + esc(c.merge) + "</p></aside>" : "") +
            (c.pending ? '<aside class="ac-callout ac-callout--warn"><strong>Pendiente de validar</strong><p>' + esc(c.pending) + "</p></aside>" : "") +
            (c.variants.length ? '<section class="fa-block"><h3>Variantes</h3><ul class="ac-list">' + c.variants.map(function (v) { return "<li><strong>" + esc(v.name) + ".</strong> " + esc(v.note || "") + "</li>"; }).join("") + "</ul></section>" : "") +
            '<section class="fa-block"><h3>Contenido</h3>' + (legacyHtml || '<p class="fa-muted">Sin contenido anterior.</p>') + "</section>" +
            (videos.length ? '<section class="fa-block"><h3>Material audiovisual</h3>' + videos.map(function (v) { return Vid().renderCard(v.id, { conceptId: c.id }); }).join("") + "</section>" : "") +
            (exs.length ? '<section class="fa-block"><h3>Ejercicios que lo trabajan</h3><div class="fa-row fa-row--wrap">' + exs.map(function (it) {
                return '<button type="button" class="fa-tile" data-open-article="' + esc(it.article.id) + '" data-open-section="' + esc(it.ex.id) + '"><span class="fa-tile-name">' + esc(it.ex.name) + '</span><span class="fa-tile-where">En la ficha de ' + esc(it.article.title) + "</span></button>";
            }).join("") + "</div></section>" : "") +
            "</div>";

        target.querySelector(".fa-fav").addEventListener("click", function (e) {
            isFav = !isFav;
            var b = e.currentTarget;
            b.classList.toggle("is-on", isFav);
            b.setAttribute("aria-pressed", isFav ? "true" : "false");
            b.textContent = isFav ? "★ En favoritos" : "☆ Guardar en favoritos";
            if (host && host.setFavorite) host.setFavorite(favKey(c), isFav);
        });
        wireNav(target.querySelector(".fa"), host);
        if (variantId) {
            var el = target.querySelector("#fa-var-" + variantId);
            if (el) setTimeout(function () { el.scrollIntoView({ block: "start" }); el.classList.add("is-flash"); }, 30);
        }
    }

    /** Navegación común: siempre por loadContent para que funcione "Volver". */
    function wireNav(target, host) {
        var go = host && host.go ? host.go : function () {};
        var C = Cat();
        target.addEventListener("click", function (e) {
            var t = e.target.closest("[data-concept],[data-area],[data-home],[data-open-article]");
            if (!t || !target.contains(t)) return;
            if (t.hasAttribute("data-home")) { go("fundamentos"); return; }
            if (t.hasAttribute("data-open-article")) {
                if (host && host.openArticle) host.openArticle(t.getAttribute("data-open-article"), { tab: "entrenar", section: t.getAttribute("data-open-section") });
                return;
            }
            if (t.hasAttribute("data-concept")) { go(C.conceptSection(t.getAttribute("data-concept"))); return; }
            if (t.hasAttribute("data-area")) go(C.areaSection(t.getAttribute("data-area"), t.getAttribute("data-area-sub") || null));
        });
    }

    return {
        renderHome: renderHome,
        renderArea: renderArea,
        renderConcept: renderConcept,
        exercisesFor: exercisesFor,
        pushHistory: pushHistory,
        favKey: favKey
    };
});
