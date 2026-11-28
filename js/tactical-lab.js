/*
 * Basket Lab · Laboratorio táctico — interfaz
 *
 * window.BasketTacticalLab:
 *   renderHome(target, host)               portada: foto, buscador, herramientas, 5 áreas y fichas
 *   renderArea(target, areaId, famId, host) área: familias con sus contenidos y temas previstos
 *   renderSimulators(target, host)          los simuladores que existen hoy
 *   heroMedia(article)                      foto y ruta para la ficha (variante fotográfica)
 *
 * Reutiliza los estilos de la academia de Fundamentos (fa-*) y su sistema de fotos.
 * No guarda datos: favoritos y lectura pasan por el host (learning_progress).
 * host = { go(sectionId), getProgress() }
 */
(function (root, factory) {
    var api = factory(root);
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.BasketTacticalLab = api;
})(typeof window !== "undefined" ? window : null, function (root) {
    "use strict";

    // En el navegador vienen de window; en Node (pruebas) se cargan con require.
    function dep(name, file) {
        if (root && root[name]) return root[name];
        if (typeof require === "function") { try { return require(file); } catch (e) { return null; } }
        return null;
    }
    function Cat() { return dep("BasketTacticalCatalog", "./tactical-catalog.js"); }
    function Med() { return dep("BasketTacticalMedia", "./tactical-media.js"); }
    function Acad() { return dep("BasketAcademy", "./academy.js"); }

    function esc(s) {
        return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    var STATE_KEY = "basketLab_tacticalState";
    var state = (function () {
        var s = { q: "" };
        try { var v = JSON.parse(sessionStorage.getItem(STATE_KEY) || "null"); if (v && typeof v.q === "string") s.q = v.q; } catch (e) { /* sin almacenamiento */ }
        return s;
    })();
    function saveState() { try { sessionStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) { /* sin almacenamiento */ } }

    var ICON = {
        search: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M20 20l-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
        sim: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="10" r="1.8" fill="currentColor"/><path d="M14 9l3 3-3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        read: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 3a9 9 0 100 18 9 9 0 000-18z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.5 9.5a2.5 2.5 0 113.5 2.3c-.6.3-1 .8-1 1.5V14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17" r="1.1" fill="currentColor"/></svg>',
        book: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M5 4h10a3 3 0 013 3v13H8a3 3 0 01-3-3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M5 17a3 3 0 013-3h10" fill="none" stroke="currentColor" stroke-width="2"/></svg>'
    };
    var TOOL_ICON = { lecturas: ICON.read, simuladores: ICON.sim, playbook: ICON.book };

    function isFav(host, e) {
        var p = host && host.getProgress ? host.getProgress() : null;
        return !!(p && e.article && (p.favorites || {})[e.article]);
    }

    /** Tarjeta de texto de un contenido (las fotos quedan para las categorías). */
    function entryCard(e, host, areaId) {
        var C = Cat();
        var where = "";
        if (areaId && e.area !== areaId) where = '<span class="fa-cc-where">Ficha principal en ' + esc(C.getArea(e.area).name) + "</span>";
        else if (!areaId) where = '<span class="fa-cc-where">' + esc(C.getArea(e.area).name) + "</span>";
        var flags = ['<span class="fa-flag' + (e.status === "ficha" ? " fa-flag--class" : "") + '">' + esc(C.STATUS[e.status].label) + "</span>"];
        var art = e.article && Acad() ? Acad().get(e.article) : null;
        if (art && art.simulator) flags.push('<span class="fa-flag">Simulador</span>');
        if (isFav(host, e)) flags.push('<span class="fa-flag fa-flag--fav" title="En favoritos">★</span>');
        return '<button type="button" class="fa-cc tl-cc' + (e.status === "ficha" ? " is-class" : "") + '" data-entry="' + esc(e.id) + '">' +
            '<span class="fa-cc-top"><span class="tl-type">' + esc(C.TYPES[e.type].label) + "</span>" + where + "</span>" +
            '<span class="fa-cc-name">' + esc(e.name) + "</span>" +
            (e.summary ? '<span class="tl-cc-sum">' + esc(e.summary) + "</span>" : "") +
            '<span class="fa-cc-flags">' + flags.join("") + "</span>" +
            "</button>";
    }

    function areaCard(a) {
        var C = Cat();
        var M = Med();
        var key = M ? M.areaPhoto(a.id) : null;
        var list = C.entriesInArea(a.id);
        var fichas = list.filter(function (e) { return e.status === "ficha"; }).length;
        var info = [list.length + (list.length === 1 ? " contenido" : " contenidos")];
        if (fichas) info.push(fichas + (fichas === 1 ? " ficha nueva" : " fichas nuevas"));
        return '<button type="button" class="fa-acard' + (key ? "" : " tl-acard--plain") + '" data-area="' + esc(a.id) + '">' +
            '<span class="fa-acard-media">' + (key ? M.img(key, { variant: "card", alt: "", sizes: "(max-width: 560px) 100vw, (max-width: 1100px) 50vw, 360px" }) : '<span class="tl-acard-word" aria-hidden="true">' + esc(a.short) + "</span>") + "</span>" +
            '<span class="fa-acard-body">' +
            '<span class="fa-acard-name">' + esc(a.name) + "</span>" +
            '<span class="fa-acard-desc">' + esc(a.desc) + "</span>" +
            '<span class="fa-acard-info">' + esc(info.join(" · ")) + "</span>" +
            "</span></button>";
    }

    function toolButtons() {
        return Cat().TOOLS.map(function (t) {
            return '<button type="button" class="tl-tool" data-go="' + esc(t.section) + '">' +
                '<span class="tl-tool-icon">' + (TOOL_ICON[t.id] || "") + "</span>" +
                '<span class="tl-tool-text"><strong>' + esc(t.name) + "</strong><span>" + esc(t.desc) + "</span></span></button>";
        }).join("");
    }

    function crumbs(items) {
        return '<nav class="fa-crumbs" aria-label="Ruta">' + items.map(function (it) {
            return it.go ? '<button type="button" class="fa-crumb" data-go="' + esc(it.go) + '">' + esc(it.label) + "</button>" : '<span aria-current="page">' + esc(it.label) + "</span>";
        }).join('<span class="fa-crumb-sep" aria-hidden="true">/</span>') + "</nav>";
    }

    // ------------------------------------------------------------------
    // Portada
    // ------------------------------------------------------------------
    function renderHome(target, host) {
        var C = Cat();
        var M = Med();
        var hero = M && M.has("tactical-lab-hero") ? M.img("tactical-lab-hero", { variant: "hero", priority: true, cls: "fa-cover-img", sizes: "(max-width: 760px) 100vw, 1200px" }) : "";
        var fichas = C.ENTRIES.filter(function (e) { return e.status === "ficha"; });

        target.innerHTML =
            '<div class="fa tl tl-home">' +
            '<section class="fa-cover tl-cover' + (hero ? "" : " fa-cover--plain") + '">' + hero +
            '<div class="fa-cover-inner">' +
            '<p class="fa-cover-kicker">Basket Lab · Laboratorio táctico</p>' +
            '<h1 class="fa-cover-title">Entendé el juego.</h1>' +
            '<p class="fa-cover-sub">Aprendé los principios, experimentá con la táctica y construí tu identidad como entrenador.</p>' +
            '<form class="fa-searchbar" role="search" onsubmit="return false">' +
            '<label class="fa-searchbox"><span class="fa-sr">Buscar en el laboratorio táctico</span>' + ICON.search +
            '<input type="search" name="q" value="' + esc(state.q) + '" placeholder="Buscá un concepto, sistema o cobertura" autocomplete="off" enterkeyhint="search"></label>' +
            "</form></div></section>" +
            '<nav class="tl-tools" aria-label="Herramientas del laboratorio">' + toolButtons() + "</nav>" +
            '<div class="fa-view tl-view" aria-live="polite"></div>' +
            "</div>";

        var view = target.querySelector(".tl-view");
        function paint() {
            var q = String(state.q || "").trim();
            if (q) {
                var res = C.search(q);
                view.innerHTML = res.length
                    ? '<p class="fa-count">' + res.length + (res.length === 1 ? " resultado" : " resultados") + '</p><div class="fa-cgrid">' + res.map(function (e) { return entryCard(e, host); }).join("") + "</div>"
                    : '<div class="fa-empty"><p><strong>No encontramos nada con esa búsqueda.</strong></p><p>Probá con otro nombre, también en inglés (por ejemplo «pick and roll», «drop» o «short corner»).</p></div>';
                return;
            }
            view.innerHTML =
                '<h2 class="tl-section-title">Cinco áreas para entender el juego</h2>' +
                '<div class="fa-areas tl-areas">' + C.AREAS.map(areaCard).join("") + "</div>" +
                '<section class="fa-family tl-start"><header class="fa-family-head"><h2>Fichas para empezar</h2><span class="fa-family-n">' + fichas.length + "</span></header>" +
                '<p class="tl-lead">Ocho contenidos de tipos distintos —principios, acciones, estructuras, coberturas— con el formato nuevo: comprender, visualizar, experimentar, enseñar, variantes y fuentes.</p>' +
                '<div class="fa-cgrid">' + fichas.map(function (e) { return entryCard(e, host); }).join("") + "</div></section>";
        }
        paint();

        var timer = null;
        var input = target.querySelector('input[name="q"]');
        input.addEventListener("input", function () {
            state.q = input.value;
            saveState();
            if (timer) clearTimeout(timer);
            timer = setTimeout(paint, 140);
        });
        wireNav(target.querySelector(".tl"), host);
    }

    // ------------------------------------------------------------------
    // Área
    // ------------------------------------------------------------------
    function renderArea(target, areaId, famId, host) {
        var C = Cat();
        var M = Med();
        var a = C.getArea(areaId);
        if (!a) { renderHome(target, host); return; }
        var key = M ? M.areaPhoto(areaId) : null;
        var list = C.entriesInArea(areaId);
        var fams = a.families.map(function (f) {
            var items = list.filter(function (e) { return C.familyOf(e, areaId) === f.id; });
            var order = { ficha: 0, guia: 1, anterior: 2 };
            items.sort(function (x, y) { return order[x.status] - order[y.status] || x.name.localeCompare(y.name, "es"); });
            return { f: f, items: items, next: f.next || [] };
        });

        target.innerHTML =
            '<div class="fa tl tl-areapage">' +
            crumbs([{ label: "Laboratorio táctico", go: C.HOME }, { label: a.name }]) +
            '<header class="fa-banner' + (key ? "" : " fa-banner--plain") + '">' +
            (key ? M.img(key, { variant: "cover", priority: true, cls: "fa-banner-img", sizes: "(max-width: 760px) 100vw, 1100px" }) : "") +
            '<div class="fa-banner-inner"><p class="fa-banner-kicker">Laboratorio táctico</p><h1>' + esc(a.name) + "</h1>" +
            '<p class="fa-banner-desc">' + esc(a.desc) + "</p>" +
            '<p class="fa-banner-stats">' + esc(list.length + (list.length === 1 ? " contenido" : " contenidos") + " · " + a.families.length + " familias") + "</p></div></header>" +
            '<nav class="fa-jumps" aria-label="Familias">' + fams.map(function (x) {
                return '<a href="#tl-fam-' + esc(x.f.id) + '" class="fa-jump" data-fam="' + esc(x.f.id) + '">' + esc(x.f.name) + (x.items.length ? " <span>" + x.items.length + "</span>" : "") + "</a>";
            }).join("") + "</nav>" +
            fams.map(function (x) {
                return '<section class="fa-family" id="tl-fam-' + esc(x.f.id) + '"><header class="fa-family-head"><h2>' + esc(x.f.name) + "</h2>" + (x.items.length ? '<span class="fa-family-n">' + x.items.length + "</span>" : "") + "</header>" +
                    (x.items.length ? '<div class="fa-cgrid">' + x.items.map(function (e) { return entryCard(e, host, areaId); }).join("") + "</div>" : "") +
                    (x.next.length ? '<p class="tl-next"><span>' + (x.items.length ? "Próximas fichas" : "En preparación") + ":</span> " + x.next.map(esc).join(" · ") + "</p>" : "") +
                    "</section>";
            }).join("") +
            "</div>";

        var root2 = target.querySelector(".tl");
        root2.querySelectorAll("[data-fam]").forEach(function (link) {
            link.addEventListener("click", function (e) {
                e.preventDefault();
                var el = root2.querySelector("#tl-fam-" + link.getAttribute("data-fam"));
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            });
        });
        wireNav(root2, host);
        if (famId) {
            var el = root2.querySelector("#tl-fam-" + famId);
            if (el) setTimeout(function () { el.scrollIntoView({ block: "start" }); }, 30);
        }
    }

    // ------------------------------------------------------------------
    // Simuladores (los que existen hoy, en las fichas y guías)
    // ------------------------------------------------------------------
    function simulatorEntries() {
        var C = Cat();
        var A = Acad();
        if (!A) return [];
        return C.ENTRIES.filter(function (e) { var art = e.article && A.get(e.article); return art && art.simulator; });
    }

    function renderSimulators(target, host) {
        var C = Cat();
        var A = Acad();
        var list = simulatorEntries();
        target.innerHTML =
            '<div class="fa tl tl-sims">' +
            crumbs([{ label: "Laboratorio táctico", go: C.HOME }, { label: "Simuladores" }]) +
            '<header class="fa-viewhead tl-viewhead"><h1>Simuladores</h1><p>Elegí una acción y mirá una reacción defensiva posible, los espacios que aparecen y las lecturas del ataque. Son modelos educativos: muestran respuestas posibles, no resultados garantizados. Funcionan en tu dispositivo, sin conexión a servicios externos.</p></header>' +
            (list.length ? '<ul class="tl-simlist">' + list.map(function (e) {
                var sim = A.get(e.article).simulator;
                return '<li><div><span class="tl-type">' + esc(C.getArea(e.area).name + " · " + C.TYPES[e.type].label) + "</span><strong>" + esc(sim.title) + "</strong><span class=\"tl-cc-sum\">" + esc(e.name) + "</span></div>" +
                    '<button type="button" class="tb-btn tb-btn--accent" data-sim="' + esc(e.id) + '">Abrir simulador</button></li>';
            }).join("") + "</ul>" : '<p class="fa-empty">No se pudieron cargar los simuladores.</p>') +
            "</div>";
        wireNav(target.querySelector(".tl"), host);
    }

    /** Navegación común: siempre por el host (loadContent) para que funcione "Volver". */
    function wireNav(el, host) {
        var go = host && host.go ? host.go : function () {};
        var C = Cat();
        el.addEventListener("click", function (e) {
            var t = e.target.closest("[data-entry],[data-area],[data-go],[data-sim]");
            if (!t || !el.contains(t)) return;
            if (t.hasAttribute("data-sim")) { if (host && host.openEntry) host.openEntry(t.getAttribute("data-sim"), { tab: "simular" }); return; }
            if (t.hasAttribute("data-entry")) { go(C.entrySection(t.getAttribute("data-entry"))); return; }
            if (t.hasAttribute("data-area")) { go(C.areaSection(t.getAttribute("data-area"))); return; }
            go(t.getAttribute("data-go"));
        });
    }

    /** Foto, tipo y ruta de una ficha del laboratorio (variante fotográfica del renderizador). */
    function heroMedia(article) {
        var C = Cat();
        var M = Med();
        var e = C && C.entryForArticle(article.id);
        if (!e) return null;
        var area = C.getArea(e.area);
        var key = M ? M.areaPhoto(e.area) : null;
        if (!key) return null;
        return {
            img: M.img(key, { variant: "cover", priority: true, cls: "ac-hero-img", sizes: "(max-width: 760px) 100vw, (max-width: 1200px) 45vw, 560px" }),
            note: M.AI_NOTE,
            kicker: area.name + " · " + C.TYPES[e.type].label,
            crumbs: [
                { label: "Laboratorio táctico", go: C.HOME },
                { label: area.name, go: C.areaSection(e.area, e.family) },
                { label: e.name }
            ]
        };
    }

    /** Pestañas con los nombres del laboratorio (el contenido de cada pestaña no cambia). */
    var TAB_LABELS = { aprender: "Comprender", visualizar: "Visualizar", simular: "Experimentar", entrenar: "Enseñar", variantes: "Variantes", evaluar: "Evaluar", fuentes: "Fuentes" };

    return {
        renderHome: renderHome,
        renderArea: renderArea,
        renderSimulators: renderSimulators,
        simulatorEntries: simulatorEntries,
        heroMedia: heroMedia,
        TAB_LABELS: TAB_LABELS
    };
});
