/*
 * Basket Lab · Fundamentos — interfaz de la academia
 *
 * window.BasketFundamentos:
 *   renderHome(target, host)                 portada: foto, buscador, accesos rápidos y 8 áreas
 *   renderArea(target, areaId, subId, host)  área: familias de habilidades, videos y ejercicios
 *   renderConcept(target, conceptId, variantId, host)  ficha de un concepto en renovación
 *
 * Las fichas completas son artículos de BasketAcademy (js/academy-content/fund-*.js) y
 * las muestra el host con su renderizador. Este módulo no guarda datos propios: favoritos
 * pasan por el host (learning_progress) y la vista, los filtros y el scroll se recuerdan en
 * la sesión del navegador.
 */
(function (root, factory) {
    var api = factory(root);
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.BasketFundamentos = api;
})(typeof window !== "undefined" ? window : null, function (root) {
    "use strict";

    function Cat() { return root.BasketFundCatalog; }
    function Vid() { return root.BasketVideos; }
    function Med() { return root.BasketFundMedia; }
    function Acad() { return root.BasketAcademy; }

    function esc(s) {
        return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    var HISTORY_KEY = "basketLab_fundHistory";
    var STATE_KEY = "basketLab_fundState";
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

    /** Todos los ejercicios de las fichas de Fundamentos, una sola vez cada uno. */
    function allExercises() {
        var A = Acad();
        if (!A) return [];
        var out = [];
        A.list().forEach(function (a) {
            if (!a.conceptId) return;
            (a.exercises || []).forEach(function (ex) { out.push({ article: a, ex: ex }); });
        });
        return out;
    }

    function listedVideos() {
        var V = Vid();
        return V ? V.VIDEOS.filter(function (v) { return V.isListed(v); }) : [];
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
    // Estado de la portada (vista, búsqueda, filtros y scroll) por sesión
    // ------------------------------------------------------------------
    var EMPTY = { view: "explorar", q: "", area: "", skill: "", level: "", video: false, exercises: false, favorites: false, complete: false, filtersOpen: false };
    var state = (function () {
        var s = {};
        Object.keys(EMPTY).forEach(function (k) { s[k] = EMPTY[k]; });
        try {
            var saved = JSON.parse(sessionStorage.getItem(STATE_KEY) || "null");
            if (saved) Object.keys(EMPTY).forEach(function (k) { if (saved[k] != null) s[k] = saved[k]; });
        } catch (e) { /* sin almacenamiento */ }
        return s;
    })();
    var scrollMemory = {};

    function saveState() {
        try { sessionStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) { /* sin almacenamiento */ }
    }

    function activeFilters() {
        return !!(state.area || state.skill || state.level || state.video || state.exercises || state.favorites || state.complete);
    }
    function searching() { return !!(String(state.q).trim() || activeFilters()); }

    /** Contenedor que realmente se desplaza (la SPA puede desplazar el body o un panel). */
    function scroller(el) {
        var n = el && el.parentElement;
        while (n && n !== document.body) {
            var st = root.getComputedStyle ? root.getComputedStyle(n) : null;
            if (st && /(auto|scroll)/.test(st.overflowY) && n.scrollHeight > n.clientHeight) return n;
            n = n.parentElement;
        }
        return document.scrollingElement || document.documentElement;
    }
    function rememberScroll(key, el) { scrollMemory[key] = scroller(el).scrollTop; }
    function restoreScroll(key, el) {
        var y = scrollMemory[key];
        if (y == null) return;
        delete scrollMemory[key];
        var sc = scroller(el);
        requestAnimationFrame(function () { sc.scrollTop = y; });
    }

    // ------------------------------------------------------------------
    // Piezas
    // ------------------------------------------------------------------
    var ICON = {
        search: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M20 20l-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
        filters: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="7" r="2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="17" r="2" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
        play: '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M8 5l11 7-11 7z" fill="currentColor"/></svg>'
    };

    function levelTag(level) {
        var i = Cat().LEVELS.indexOf(level);
        return '<span class="fa-level fa-level--' + (i < 0 ? 0 : i) + '">' + esc(level) + "</span>";
    }

    /** Tarjeta compacta de un concepto (sin foto: evita repetir la misma imagen en pantalla). */
    function conceptCard(c, ctx, areaId) {
        var C = Cat();
        var where = "";
        if (areaId && c.area !== areaId) {
            var a = C.getArea(c.area);
            where = '<span class="fa-cc-where">Ficha principal en ' + esc(a ? a.name : "") + "</span>";
        } else if (!areaId) {
            var a2 = C.getArea(c.area);
            where = '<span class="fa-cc-where">' + esc(a2 ? a2.name : "") + "</span>";
        }
        var flags = [];
        if (c.article) flags.push('<span class="fa-flag fa-flag--class">Clase completa</span>');
        if (ctx.hasVideo(c)) flags.push('<span class="fa-flag">' + ICON.play + " Video</span>");
        if (ctx.hasExercises(c)) flags.push('<span class="fa-flag">Ejercicios</span>');
        if (ctx.isFavorite(c)) flags.push('<span class="fa-flag fa-flag--fav" title="En favoritos">★</span>');
        var en = c.en && c.en.toLowerCase() !== c.name.toLowerCase() ? c.en : "";
        return '<button type="button" class="fa-cc' + (c.article ? " is-class" : "") + '" data-concept="' + esc(c.id) + '">' +
            '<span class="fa-cc-top">' + levelTag(c.level) + where + "</span>" +
            '<span class="fa-cc-name">' + esc(c.name) + "</span>" +
            (en ? '<span class="fa-cc-en">' + esc(en) + "</span>" : "") +
            (c.variants.length ? '<span class="fa-cc-vars">Variantes: ' + esc(c.variants.map(function (v) { return v.name; }).join(" · ")) + "</span>" : "") +
            (flags.length ? '<span class="fa-cc-flags">' + flags.join("") + "</span>" : "") +
            "</button>";
    }

    /** Tarjeta de ejercicio con acciones reales (planificador, favoritos, ficha). */
    function exerciseCard(it, host) {
        var ex = it.ex;
        var fav = host && host.isExerciseFavorite ? host.isExerciseFavorite(it.article.id, ex.id) : null;
        return '<article class="fa-ex">' +
            '<p class="fa-ex-from">' + esc(it.article.title) + (ex.solo ? " · se puede practicar solo" : "") + "</p>" +
            "<h4>" + esc(ex.name) + "</h4>" +
            '<p class="fa-ex-obj">' + esc(String(ex.objective || "").replace(/\*\*/g, "")) + "</p>" +
            '<p class="fa-ex-meta"><span>' + esc(ex.level) + "</span><span>" + esc(ex.playersShort || ex.players) + "</span><span>" + esc(ex.duration) + "</span></p>" +
            '<div class="fa-ex-actions">' +
            (host && host.addExercise ? '<button type="button" class="tb-btn tb-btn--small tb-btn--accent" data-add-ex="' + esc(it.article.id) + '" data-ex="' + esc(ex.id) + '">Añadir al entrenamiento</button>' : "") +
            (fav != null ? '<button type="button" class="tb-btn tb-btn--small fa-exfav' + (fav ? " is-on" : "") + '" data-fav-ex="' + esc(it.article.id) + '" data-ex="' + esc(ex.id) + '" aria-pressed="' + (fav ? "true" : "false") + '">' + (fav ? "★ Guardado" : "☆ Guardar") + "</button>" : "") +
            '<button type="button" class="tb-btn tb-btn--small" data-open-article="' + esc(it.article.id) + '" data-open-section="' + esc(ex.id) + '">' + (ex.board ? "Ver con pizarra y variantes" : "Ver variantes") + "</button>" +
            "</div></article>";
    }

    function videoCards(list, compact, poster) {
        var V = Vid();
        return list.map(function (v) {
            var cid = ((v.concepts || [])[0] || {}).id;
            var c = Cat().getConcept(cid);
            return '<div class="fa-video">' + V.renderCard(v.id, { conceptId: cid, compact: compact, poster: !!poster }) +
                (c ? '<button type="button" class="fa-link fa-video-concept" data-concept="' + esc(c.id) + '">Ir a la ficha de ' + esc(c.name) + " →</button>" : "") +
                "</div>";
        }).join("");
    }

    function crumbs(items) {
        return '<nav class="fa-crumbs" aria-label="Ruta">' + items.map(function (it) {
            return it.go ? '<button type="button" class="fa-crumb" ' + it.go + ">" + esc(it.label) + "</button>" : '<span aria-current="page">' + esc(it.label) + "</span>";
        }).join('<span class="fa-crumb-sep" aria-hidden="true">/</span>') + "</nav>";
    }

    // ------------------------------------------------------------------
    // Portada
    // ------------------------------------------------------------------
    var VIEWS = [["explorar", "Explorar"], ["videos", "Videos"], ["ejercicios", "Ejercicios"], ["favoritos", "Favoritos"]];

    function areaCard(a, ctx) {
        var C = Cat();
        var M = Med();
        var n = C.areaCounts(a.id, { hasVideo: ctx.hasVideo });
        var key = M ? M.areaPhoto(a.id) : null;
        var info = [n.total + " fundamentos"];
        if (n.videos) info.push(n.videos + (n.videos > 1 ? " videos" : " video"));
        return '<button type="button" class="fa-acard" data-area="' + esc(a.id) + '">' +
            '<span class="fa-acard-media">' + (key ? M.img(key, { variant: "card", alt: "", sizes: "(max-width: 560px) 50vw, (max-width: 1100px) 33vw, 300px" }) : "") + "</span>" +
            '<span class="fa-acard-body">' +
            '<span class="fa-acard-name">' + esc(a.name) + "</span>" +
            '<span class="fa-acard-desc">' + esc(a.desc) + "</span>" +
            '<span class="fa-acard-info">' + esc(info.join(" · ")) + "</span>" +
            "</span></button>";
    }

    function filtersHtml() {
        var C = Cat();
        function opt(v, label, cur) { return '<option value="' + esc(v) + '"' + (v === cur ? " selected" : "") + ">" + esc(label) + "</option>"; }
        function chk(name, label) { return '<label class="fa-check"><input type="checkbox" name="' + name + '"' + (state[name] ? " checked" : "") + "> " + esc(label) + "</label>"; }
        return '<div class="fa-filters" id="fa-filters"' + (state.filtersOpen ? "" : " hidden") + ">" +
            '<label><span>Área</span><select name="area">' + opt("", "Todas", state.area) + C.AREAS.map(function (a) { return opt(a.id, a.name, state.area); }).join("") + "</select></label>" +
            '<label><span>Habilidad</span><select name="skill">' + opt("", "Todas", state.skill) + Object.keys(C.SKILLS).map(function (k) { return opt(k, C.SKILLS[k], state.skill); }).join("") + "</select></label>" +
            '<label><span>Nivel</span><select name="level">' + opt("", "Todos", state.level) + C.LEVELS.map(function (l) { return opt(l, l, state.level); }).join("") + "</select></label>" +
            '<div class="fa-checks">' + chk("video", "Con video") + chk("exercises", "Con ejercicios") + chk("complete", "Clases completas") + chk("favorites", "Favoritos") + "</div>" +
            '<button type="button" class="fa-link" data-clear>Limpiar filtros</button>' +
            "</div>";
    }

    /** Coincidencias de ejercicios y videos para el buscador (texto, sin duplicar fichas). */
    function searchExtras(q) {
        var C = Cat();
        var nq = C.norm(q || "").trim();
        if (!nq) return { exercises: [], videos: [] };
        var words = nq.split(/\s+/);
        function hit(text) { var t = C.norm(text); return words.every(function (w) { return t.indexOf(w) >= 0; }); }
        var exercises = allExercises().filter(function (it) {
            var ex = it.ex;
            var names = ((ex.meta && ex.meta.fundamentos) || []).map(function (id) { var c = C.getConcept(id); return c ? [c.name, c.en].concat(c.aliases).join(" ") : ""; });
            return hit([ex.name, ex.objective, (ex.works || []).join(" "), names.join(" "), it.article.title].join(" "));
        });
        var videos = listedVideos().filter(function (v) {
            var names = (v.concepts || []).map(function (r) { var c = C.getConcept(r.id); return c ? [c.name, c.en].concat(c.aliases).join(" ") : ""; });
            return hit([v.title, v.channel, v.institution, names.join(" ")].join(" "));
        });
        return { exercises: exercises, videos: videos };
    }

    function renderHome(target, host) {
        var C = Cat();
        var M = Med();
        var ctx = ctxFor(host);
        var hero = M && M.has("portada") ? M.img("portada", { variant: "hero", priority: true, cls: "fa-cover-img", sizes: "(max-width: 760px) 100vw, 1200px" }) : "";
        var favCount = C.CONCEPTS.filter(ctx.isFavorite).length;

        target.innerHTML =
            '<div class="fa fa-home">' +
            '<section class="fa-cover' + (hero ? "" : " fa-cover--plain") + '">' + hero +
            '<div class="fa-cover-inner">' +
            '<p class="fa-cover-kicker">Basket Lab · Academia de fundamentos</p>' +
            '<h1 class="fa-cover-title">Dominá los fundamentos.</h1>' +
            '<p class="fa-cover-sub">Aprendé, entrená y llevá tus habilidades al siguiente nivel.</p>' +
            '<form class="fa-searchbar" role="search" onsubmit="return false">' +
            '<label class="fa-searchbox"><span class="fa-sr">Buscar en Fundamentos</span>' + ICON.search +
            '<input type="search" name="q" value="' + esc(state.q) + '" placeholder="¿Qué querés aprender hoy?" autocomplete="off" enterkeyhint="search"></label>' +
            '<button type="button" class="fa-filterbtn' + (activeFilters() ? " has-active" : "") + '" data-toggle-filters aria-expanded="' + (state.filtersOpen ? "true" : "false") + '" aria-controls="fa-filters">' + ICON.filters + '<span>Filtros</span></button>' +
            "</form></div></section>" +
            '<div class="fa-toolbar">' +
            '<nav class="fa-views" aria-label="Accesos rápidos">' + VIEWS.map(function (v) {
                return '<button type="button" class="fa-viewbtn" data-view="' + v[0] + '" aria-pressed="' + (state.view === v[0] ? "true" : "false") + '">' + esc(v[1]) + (v[0] === "favoritos" && favCount ? ' <span class="fa-viewcount">' + favCount + "</span>" : "") + "</button>";
            }).join("") + "</nav>" +
            "</div>" +
            '<form class="fa-filterform" onsubmit="return false">' + filtersHtml() + "</form>" +
            '<div class="fa-view" aria-live="polite"></div>' +
            "</div>";

        var view = target.querySelector(".fa-view");
        var fa = target.querySelector(".fa");

        function paint() {
            target.querySelectorAll("[data-view]").forEach(function (b) {
                b.setAttribute("aria-pressed", !searching() && b.getAttribute("data-view") === state.view ? "true" : "false");
            });
            var fb = target.querySelector("[data-toggle-filters]");
            fb.classList.toggle("has-active", activeFilters());
            if (searching()) { view.innerHTML = resultsHtml(); return; }
            if (state.view === "videos") {
                var vids = listedVideos();
                view.innerHTML = '<header class="fa-viewhead"><h2>Videos</h2><p>Clínicas oficiales y material de Basket Lab comprobados. El reproductor se carga recién cuando tocás reproducir.</p></header>' +
                    (vids.length ? '<div class="fa-videos">' + videoCards(vids, true, true) + "</div>" : '<p class="fa-empty">Todavía no hay videos comprobados.</p>');
                return;
            }
            if (state.view === "ejercicios") {
                var exs = allExercises();
                view.innerHTML = '<header class="fa-viewhead"><h2>Ejercicios</h2><p>Ejercicios de las clases completas, listos para sumar a un entrenamiento.</p></header>' +
                    (exs.length ? '<div class="fa-exgrid">' + exs.map(function (it) { return exerciseCard(it, host); }).join("") + "</div>" : '<p class="fa-empty">Todavía no hay ejercicios.</p>');
                return;
            }
            if (state.view === "favoritos") {
                var favs = C.CONCEPTS.filter(ctx.isFavorite);
                var favExs = host && host.isExerciseFavorite ? allExercises().filter(function (it) { return host.isExerciseFavorite(it.article.id, it.ex.id); }) : [];
                view.innerHTML = '<header class="fa-viewhead"><h2>Favoritos</h2></header>' +
                    (favs.length || favExs.length
                        ? (favs.length ? '<h3 class="fa-subhead">Fundamentos</h3><div class="fa-cgrid">' + favs.map(function (c) { return conceptCard(c, ctx); }).join("") + "</div>" : "") +
                          (favExs.length ? '<h3 class="fa-subhead">Ejercicios</h3><div class="fa-exgrid">' + favExs.map(function (it) { return exerciseCard(it, host); }).join("") + "</div>" : "")
                        : '<div class="fa-empty"><p><strong>Todavía no guardaste nada.</strong></p><p>Tocá «Guardar en favoritos» en un fundamento o «Guardar» en un ejercicio para tenerlo a mano acá.</p></div>');
                return;
            }
            view.innerHTML = '<h2 class="fa-sr">Las ocho áreas</h2><div class="fa-areas">' + C.AREAS.map(function (a) { return areaCard(a, ctx); }).join("") + "</div>";
        }

        function resultsHtml() {
            var list = C.search(state, ctx);
            var extras = activeFilters() ? { exercises: [], videos: [] } : searchExtras(state.q);
            var total = list.length + extras.exercises.length + extras.videos.length;
            if (!total) {
                return '<div class="fa-empty"><p><strong>No encontramos nada con esa búsqueda.</strong></p><p>Probá con otro nombre, también en inglés (por ejemplo «pocket pass» o «closeout»), o sacá algún filtro.</p></div>';
            }
            return '<p class="fa-count">' + total + (total === 1 ? " resultado" : " resultados") + "</p>" +
                (list.length ? '<h3 class="fa-subhead">Fundamentos</h3><div class="fa-cgrid">' + list.map(function (c) { return conceptCard(c, ctx); }).join("") + "</div>" : "") +
                (extras.exercises.length ? '<h3 class="fa-subhead">Ejercicios</h3><div class="fa-exgrid">' + extras.exercises.map(function (it) { return exerciseCard(it, host); }).join("") + "</div>" : "") +
                (extras.videos.length ? '<h3 class="fa-subhead">Videos</h3><div class="fa-videos">' + videoCards(extras.videos, true, true) + "</div>" : "");
        }

        paint();

        var timer = null;
        function onField(e) {
            var el = e.target;
            if (!el.name || !(el.name in EMPTY)) return;
            state[el.name] = el.type === "checkbox" ? el.checked : el.value;
            saveState();
            if (timer) clearTimeout(timer);
            timer = setTimeout(paint, el.name === "q" ? 140 : 0);
        }
        fa.addEventListener("input", onField);
        fa.addEventListener("change", onField);

        fa.addEventListener("click", function (e) {
            var v = e.target.closest("[data-view]");
            if (v) {
                state.view = v.getAttribute("data-view");
                state.q = "";
                target.querySelector('input[name="q"]').value = "";
                if (activeFilters()) clearFilters();
                saveState();
                paint();
                return;
            }
            var tf = e.target.closest("[data-toggle-filters]");
            if (tf) {
                state.filtersOpen = !state.filtersOpen;
                saveState();
                tf.setAttribute("aria-expanded", state.filtersOpen ? "true" : "false");
                target.querySelector("#fa-filters").hidden = !state.filtersOpen;
                return;
            }
            if (e.target.closest("[data-clear]")) {
                clearFilters();
                target.querySelector(".fa-filterform").innerHTML = filtersHtml();
                saveState();
                paint();
            }
        });

        function clearFilters() {
            ["area", "skill", "level"].forEach(function (k) { state[k] = ""; });
            ["video", "exercises", "favorites", "complete"].forEach(function (k) { state[k] = false; });
        }

        wireNav(fa, host, "home");
        restoreScroll("home", fa);
    }

    // ------------------------------------------------------------------
    // Área
    // ------------------------------------------------------------------
    function renderArea(target, areaId, subId, host) {
        var C = Cat();
        var M = Med();
        var a = C.getArea(areaId);
        if (!a) { renderHome(target, host); return; }
        var ctx = ctxFor(host);
        var list = C.conceptsInArea(areaId);
        var n = C.areaCounts(areaId, { hasVideo: ctx.hasVideo });
        var key = M ? M.areaPhoto(areaId) : null;

        // Cada fundamento aparece una sola vez en la página: en su bloque principal del área
        // (o en el primero donde se usa, si su ficha principal está en otra área).
        var placed = {};
        list.forEach(function (c) {
            var subs = C.subsOf(c, areaId);
            placed[c.id] = c.area === areaId && subs.indexOf(c.sub) >= 0 ? c.sub : subs[0];
        });
        var families = a.subs.map(function (s) {
            var items = list.filter(function (c) { return placed[c.id] === s[0]; });
            // Orden de progresión: primero las clases completas, después de inicial a avanzado.
            items.sort(function (x, y) { return (y.article ? 1 : 0) - (x.article ? 1 : 0) || C.LEVELS.indexOf(x.level) - C.LEVELS.indexOf(y.level) || x.name.localeCompare(y.name, "es"); });
            return { id: s[0], label: s[1], items: items };
        }).filter(function (f) { return f.items.length; });

        var own = list.filter(function (c) { return c.area === areaId; });
        var vids = listedVideos().filter(function (v) { return (v.concepts || []).some(function (r) { var c = C.getConcept(r.id); return c && c.area === areaId; }); });
        var exs = [];
        var seen = {};
        own.forEach(function (c) {
            exercisesFor(c).forEach(function (it) {
                var k = it.article.id + ":" + it.ex.id;
                if (!seen[k]) { seen[k] = true; exs.push(it); }
            });
        });

        var stats = [n.total + " fundamentos"];
        if (n.complete) stats.push(n.complete + (n.complete > 1 ? " clases completas" : " clase completa"));
        if (vids.length) stats.push(vids.length + (vids.length > 1 ? " videos" : " video"));
        if (exs.length) stats.push(exs.length + (exs.length > 1 ? " ejercicios" : " ejercicio"));

        var jump = families.map(function (f) {
            return '<a href="#fa-fam-' + esc(f.id) + '" class="fa-jump" data-sub="' + esc(f.id) + '">' + esc(f.label) + " <span>" + f.items.length + "</span></a>";
        }).join("") +
            (vids.length ? '<a href="#fa-fam-videos" class="fa-jump" data-sub="videos">Videos <span>' + vids.length + "</span></a>" : "") +
            (exs.length ? '<a href="#fa-fam-ejercicios" class="fa-jump" data-sub="ejercicios">Ejercicios <span>' + exs.length + "</span></a>" : "");

        target.innerHTML =
            '<div class="fa fa-areapage">' +
            crumbs([{ label: "Fundamentos", go: "data-home" }, { label: a.name }]) +
            '<header class="fa-banner' + (key ? "" : " fa-banner--plain") + '">' +
            (key ? M.img(key, { variant: "cover", priority: true, cls: "fa-banner-img", sizes: "(max-width: 760px) 100vw, 1100px" }) : "") +
            '<div class="fa-banner-inner"><p class="fa-banner-kicker">Área de fundamentos</p><h1>' + esc(a.name) + "</h1>" +
            '<p class="fa-banner-desc">' + esc(a.desc) + "</p>" +
            '<p class="fa-banner-stats">' + esc(stats.join(" · ")) + "</p></div></header>" +
            '<nav class="fa-jumps" aria-label="Familias de habilidades">' + jump + "</nav>" +
            families.map(function (f) {
                return '<section class="fa-family" id="fa-fam-' + esc(f.id) + '"><header class="fa-family-head"><h2>' + esc(f.label) + '</h2><span class="fa-family-n">' + f.items.length + "</span></header>" +
                    '<div class="fa-cgrid">' + f.items.map(function (c) { return conceptCard(c, ctx, areaId); }).join("") + "</div></section>";
            }).join("") +
            (vids.length ? '<section class="fa-family" id="fa-fam-videos"><header class="fa-family-head"><h2>Videos del área</h2></header><div class="fa-videos">' + videoCards(vids, true) + "</div></section>" : "") +
            (exs.length ? '<section class="fa-family" id="fa-fam-ejercicios"><header class="fa-family-head"><h2>Ejercicios del área</h2></header><div class="fa-exgrid">' + exs.map(function (it) { return exerciseCard(it, host); }).join("") + "</div></section>" : "") +
            "</div>";

        var fa = target.querySelector(".fa");
        fa.querySelectorAll("[data-sub]").forEach(function (link) {
            link.addEventListener("click", function (e) {
                e.preventDefault();
                var el = fa.querySelector("#fa-fam-" + link.getAttribute("data-sub"));
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            });
        });
        wireNav(fa, host, "area:" + areaId);
        if (subId) {
            var el = fa.querySelector("#fa-fam-" + subId);
            if (el) setTimeout(function () { el.scrollIntoView({ block: "start" }); }, 30);
        } else {
            restoreScroll("area:" + areaId, fa);
        }
    }

    // ------------------------------------------------------------------
    // Concepto en renovación (contenido anterior dentro del modelo nuevo)
    // ------------------------------------------------------------------
    function legacyBlock(entry, title) {
        if (!entry) return "";
        function ul(list) { return '<ul class="ac-list">' + (list || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>"; }
        return '<section class="fa-legacy"><h3>' + esc(title || entry.nombre) + "</h3>" +
            '<div class="fa-legacy-grid">' +
            '<div><h4>Ventajas</h4>' + ul(entry.ventajas) + "</div>" +
            '<div><h4>Desventajas</h4>' + ul(entry.desventajas) + "</div>" +
            '<div><h4>Cuándo conviene</h4>' + ul(entry.momentos) + "</div>" +
            "</div></section>";
    }

    function conceptLinks(ids) {
        var C = Cat();
        var list = (ids || []).map(function (id) { return C.getConcept(id); }).filter(Boolean);
        if (!list.length) return "";
        return list.map(function (c) { return '<button type="button" class="fa-pill" data-concept="' + esc(c.id) + '">' + esc(c.name) + "</button>"; }).join("");
    }

    function renderConcept(target, conceptId, variantId, host) {
        var C = Cat();
        var M = Med();
        var c = C.getConcept(conceptId);
        if (!c) { renderHome(target, host); return; }
        pushHistory(c.id);
        var ctx = ctxFor(host);
        var legacy = (host && host.legacyContent) || {};
        var area = C.getArea(c.area);
        var key = M ? M.conceptPhoto(c) : null;
        var appearsIn = [[c.area, c.sub]].concat(c.also).map(function (x) {
            var a = C.getArea(x[0]);
            return '<button type="button" class="fa-pill" data-area="' + esc(x[0]) + '" data-area-sub="' + esc(x[1]) + '">' + esc(a ? a.name : "") + " · " + esc(C.subName(x[0], x[1])) + "</button>";
        }).join("");
        var isFav = ctx.isFavorite(c);
        var videos = Vid() ? Vid().forConcept(c.id) : [];
        var exs = exercisesFor(c);

        var legacyHtml = c.legacy.map(function (id) { return legacyBlock(legacy[id], c.legacy.length > 1 ? legacy[id] && legacy[id].nombre : "Ventajas, desventajas y cuándo usarlo"); }).join("") +
            c.variants.filter(function (v) { return v.legacy; }).map(function (v) {
                return '<div id="fa-var-' + esc(v.id) + '">' + legacyBlock(legacy[v.legacy], "Variante · " + v.name) + "</div>";
            }).join("");

        var facts = [
            ["Habilidades", esc(c.skills.map(function (s) { return C.SKILLS[s]; }).join(" · "))],
            ["Antes conviene dominar", conceptLinks(c.prereqs)],
            ["Relacionados", conceptLinks(c.related)],
            ["Aparece en", appearsIn]
        ].filter(function (f) { return f[1]; });

        target.innerHTML =
            '<div class="fa fa-conceptpage">' +
            crumbs([{ label: "Fundamentos", go: "data-home" }, { label: area ? area.name : "", go: 'data-area="' + esc(c.area) + '"' }, { label: c.name }]) +
            '<header class="fa-chero">' +
            (key ? '<figure class="fa-chero-media">' + M.img(key, { variant: "cover", priority: true, cls: "fa-chero-img", sizes: "(max-width: 760px) 100vw, 480px" }) + "<figcaption>Foto del área. " + esc(M.AI_NOTE) + "</figcaption></figure>" : "") +
            '<div class="fa-chero-info">' +
            '<p class="fa-chero-kicker">' + esc(area ? area.name : "") + " · " + esc(C.subName(c.area, c.sub)) + "</p>" +
            "<h1>" + esc(c.name) + "</h1>" +
            '<p class="fa-chero-en">' + esc([c.en].concat(c.aliases).filter(function (x, i, arr) { return x && arr.indexOf(x) === i && x.toLowerCase() !== c.name.toLowerCase(); }).join(" · ")) + "</p>" +
            '<p class="fa-chero-meta">' + levelTag(c.level) + '<span class="fa-flag">En renovación</span>' + (videos.length ? '<span class="fa-flag">' + ICON.play + " Video</span>" : "") + "</p>" +
            '<div class="fa-chero-actions">' +
            '<button type="button" class="tb-btn fa-fav' + (isFav ? " is-on" : "") + '" aria-pressed="' + (isFav ? "true" : "false") + '">' + (isFav ? "★ En favoritos" : "☆ Guardar en favoritos") + "</button>" +
            (videos.length ? '<button type="button" class="tb-btn tb-btn--accent" data-scroll="fa-c-videos">Ver video</button>' : "") +
            (exs.length ? '<button type="button" class="tb-btn" data-scroll="fa-c-ejercicios">Ejercicios</button>' : "") +
            "</div></div></header>" +
            '<p class="fa-notice">Esta ficha todavía no se renovó: muestra el contenido anterior de Basket Lab ordenado en el modelo nuevo, sin ejercicios, evaluación ni fuentes verificadas.</p>' +
            (facts.length ? '<dl class="fa-facts">' + facts.map(function (f) { return "<div><dt>" + f[0] + "</dt><dd>" + f[1] + "</dd></div>"; }).join("") + "</dl>" : "") +
            (c.merge ? '<aside class="fa-aside"><strong>Cómo se reorganizó.</strong> ' + esc(c.merge) + "</aside>" : "") +
            (c.pending ? '<aside class="fa-aside fa-aside--warn"><strong>Pendiente de validar.</strong> ' + esc(c.pending) + "</aside>" : "") +
            (c.variants.length ? '<section class="fa-family"><header class="fa-family-head"><h2>Variantes</h2></header><ul class="fa-variants">' + c.variants.map(function (v) { return "<li><strong>" + esc(v.name) + "</strong>" + (v.note ? "<span>" + esc(v.note) + "</span>" : "") + "</li>"; }).join("") + "</ul></section>" : "") +
            '<section class="fa-family"><header class="fa-family-head"><h2>Contenido</h2></header>' + (legacyHtml || '<p class="fa-empty">Sin contenido anterior.</p>') + "</section>" +
            (videos.length ? '<section class="fa-family" id="fa-c-videos"><header class="fa-family-head"><h2>Video</h2></header><div class="fa-videos">' + videos.map(function (v) { return Vid().renderCard(v.id, { conceptId: c.id, compact: true }); }).join("") + "</div></section>" : "") +
            (exs.length ? '<section class="fa-family" id="fa-c-ejercicios"><header class="fa-family-head"><h2>Ejercicios que lo trabajan</h2></header><div class="fa-exgrid">' + exs.map(function (it) { return exerciseCard(it, host); }).join("") + "</div></section>" : "") +
            "</div>";

        var fa = target.querySelector(".fa");
        fa.querySelector(".fa-fav").addEventListener("click", function (e) {
            isFav = !isFav;
            var b = e.currentTarget;
            b.classList.toggle("is-on", isFav);
            b.setAttribute("aria-pressed", isFav ? "true" : "false");
            b.textContent = isFav ? "★ En favoritos" : "☆ Guardar en favoritos";
            if (host && host.setFavorite) host.setFavorite(favKey(c), isFav);
        });
        fa.querySelectorAll("[data-scroll]").forEach(function (b) {
            b.addEventListener("click", function () {
                var el = fa.querySelector("#" + b.getAttribute("data-scroll"));
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            });
        });
        wireNav(fa, host, "concept:" + c.id);
        if (variantId) {
            var el = fa.querySelector("#fa-var-" + variantId);
            if (el) setTimeout(function () { el.scrollIntoView({ block: "start" }); el.classList.add("is-flash"); }, 30);
        }
    }

    /** Navegación común: siempre por loadContent para que funcione "Volver". */
    function wireNav(fa, host, scrollKey) {
        var go = host && host.go ? host.go : function () {};
        var C = Cat();
        fa.addEventListener("click", function (e) {
            var add = e.target.closest("[data-add-ex]");
            if (add && host && host.addExercise) { host.addExercise(add.getAttribute("data-add-ex"), add.getAttribute("data-ex")); return; }
            var fav = e.target.closest("[data-fav-ex]");
            if (fav && host && host.setExerciseFavorite) {
                var on = fav.getAttribute("aria-pressed") !== "true";
                fav.setAttribute("aria-pressed", on ? "true" : "false");
                fav.classList.toggle("is-on", on);
                fav.textContent = on ? "★ Guardado" : "☆ Guardar";
                host.setExerciseFavorite(fav.getAttribute("data-fav-ex"), fav.getAttribute("data-ex"), on);
                return;
            }
            var t = e.target.closest("[data-concept],[data-area],[data-home],[data-open-article]");
            if (!t || !fa.contains(t)) return;
            if (scrollKey) rememberScroll(scrollKey, fa);
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
        allExercises: allExercises,
        searchExtras: searchExtras,
        pushHistory: pushHistory,
        favKey: favKey
    };
});
