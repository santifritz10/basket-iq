/*
 * Basket Lab · Catálogo audiovisual centralizado
 *
 * window.BasketVideos (también requerible desde Node para las pruebas).
 *
 * Reglas de este catálogo:
 * - Un video se registra una sola vez y se relaciona con varios fundamentos.
 * - Solo se usan videos cuya existencia y permiso de inserción se comprobaron.
 *   "Comprobado" quiere decir lo que dice `check.method`; no significa que alguien haya
 *   revisado el contenido minuto a minuto (eso es `contentReviewed`).
 * - Las marcas temporales solo se cargan si el segmento se revisó de verdad.
 * - El reproductor se carga recién cuando la persona lo pide (no hay reproducción automática
 *   ni conexión con YouTube al abrir la ficha), con el dominio de privacidad mejorada.
 * - Nada de esto descarga, recorta ni guarda copias de los videos.
 * - No se envía ningún dato del jugador ni del entrenador al proveedor del video.
 *
 * La comprobación periódica se hace a mano con `node scripts/check-media-links.mjs`
 * (usa el oEmbed público de YouTube, sin clave ni servicio pago). Nunca en cada visita.
 */
(function (root, factory) {
    var api = factory(root);
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.BasketVideos = api;
})(typeof window !== "undefined" ? window : null, function (root) {
    "use strict";

    var TYPES = {
        demo: "Demostración técnica",
        drill: "Ejercicio práctico",
        theory: "Clase teórica",
        clinic: "Clínica para entrenadores",
        game: "Situación de partido",
        progression: "Progresión metodológica"
    };

    var FIBA_CDP_PAGE = "https://about.fiba.basketball/en/wabc-coaching-development-project";
    var OEMBED_NOTE = "oEmbed público de YouTube respondió 200 con título y canal. Eso confirma que el video existe, es público y su propietario permite insertarlo (si la inserción estuviera desactivada, oEmbed responde 401). No confirma restricciones por país o edad.";

    /*
     * Campos: id, title, author, channel, channelUrl, institution, platform, externalId, url,
     * language, captions, duration, type, concepts[{ id, why, timestamps[] }],
     * availability (available | removed | unknown), embed (allowed | blocked | unknown),
     * check { date, method, note }, contentReviewed (bool), license, foundAt, notes.
     */
    var VIDEOS = [
        {
            id: "fiba-cdp-dribble-drive",
            title: "WABC Coach Development Project: Dribble Drive Skills",
            author: "FIBA · WABC (no se pudo confirmar qué entrenador presenta este capítulo)",
            channel: "FIBA Basketball",
            channelUrl: "https://www.youtube.com/@FIBA",
            institution: "FIBA · World Association of Basketball Coaches (WABC)",
            platform: "youtube",
            externalId: "RgSTPexZfQI",
            url: "https://www.youtube.com/watch?v=RgSTPexZfQI",
            language: "No indicado. La serie se publica en la página de FIBA en inglés; no pudimos confirmar el idioma ni los subtítulos.",
            captions: "No verificado",
            duration: null,
            type: "clinic",
            concepts: [
                { id: "crossover", why: "Capítulo oficial sobre habilidades de penetración con dribbling, donde se inscribe el cambio de mano para atacar al defensor.", timestamps: [] },
                { id: "drible-avance", why: "Mismo capítulo: atacar el aro con dribbling.", timestamps: [] }
            ],
            availability: "available",
            embed: "allowed",
            check: { date: "2026-11-28", method: "oembed", note: OEMBED_NOTE },
            contentReviewed: false,
            license: "No informada en lo que pudimos consultar. Se trata como contenido con derechos reservados: solo se inserta con el reproductor oficial.",
            foundAt: FIBA_CDP_PAGE,
            notes: "Forma parte de la serie de nueve videos «Preparing Today's Players for the Future Game» (2025) que FIBA lista en su página oficial del proyecto."
        },
        {
            id: "fiba-cdp-shooter",
            title: "WABC Coach Development Project: Developing a shooter & the Utilization of the 3-point shot",
            author: "FIBA · WABC (no se pudo confirmar qué entrenador presenta este capítulo)",
            channel: "FIBA Basketball",
            channelUrl: "https://www.youtube.com/@FIBA",
            institution: "FIBA · World Association of Basketball Coaches (WABC)",
            platform: "youtube",
            externalId: "tIZ-P2lzrI4",
            url: "https://www.youtube.com/watch?v=tIZ-P2lzrI4",
            language: "No indicado. La serie se publica en la página de FIBA en inglés; no pudimos confirmar el idioma ni los subtítulos.",
            captions: "No verificado",
            duration: null,
            type: "clinic",
            concepts: [
                { id: "catch-shoot", why: "Capítulo oficial sobre cómo formar a un tirador y el uso del triple, el contexto en el que más se usa el tiro desde la recepción.", timestamps: [] }
            ],
            availability: "available",
            embed: "allowed",
            check: { date: "2026-11-28", method: "oembed", note: OEMBED_NOTE },
            contentReviewed: false,
            license: "No informada en lo que pudimos consultar. Se trata como contenido con derechos reservados: solo se inserta con el reproductor oficial.",
            foundAt: FIBA_CDP_PAGE,
            notes: "Serie oficial WABC Coach Development Project (2025)."
        },
        {
            id: "fiba-cdp-finishing",
            title: "WABC Coach Development Project: Finishing Skills",
            author: "FIBA · WABC (no se pudo confirmar qué entrenador presenta este capítulo)",
            channel: "FIBA Basketball",
            channelUrl: "https://www.youtube.com/@FIBA",
            institution: "FIBA · World Association of Basketball Coaches (WABC)",
            platform: "youtube",
            externalId: "jA_y9F3zz_A",
            url: "https://www.youtube.com/watch?v=jA_y9F3zz_A",
            language: "No indicado. La serie se publica en la página de FIBA en inglés; no pudimos confirmar el idioma ni los subtítulos.",
            captions: "No verificado",
            duration: null,
            type: "clinic",
            concepts: [
                { id: "bandeja", why: "Capítulo oficial sobre habilidades de finalización cerca del aro.", timestamps: [] }
            ],
            availability: "available",
            embed: "allowed",
            check: { date: "2026-11-28", method: "oembed", note: OEMBED_NOTE },
            contentReviewed: false,
            license: "No informada en lo que pudimos consultar. Se trata como contenido con derechos reservados: solo se inserta con el reproductor oficial.",
            foundAt: FIBA_CDP_PAGE,
            notes: "Serie oficial WABC Coach Development Project (2025)."
        },
        {
            id: "fiba-cdp-defending-penetration",
            title: "WABC Coach Development Project: Defending penetration",
            author: "FIBA · WABC (no se pudo confirmar qué entrenador presenta este capítulo)",
            channel: "FIBA Basketball",
            channelUrl: "https://www.youtube.com/@FIBA",
            institution: "FIBA · World Association of Basketball Coaches (WABC)",
            platform: "youtube",
            externalId: "_M4IcLwKq40",
            url: "https://www.youtube.com/watch?v=_M4IcLwKq40",
            language: "No indicado. La serie se publica en la página de FIBA en inglés; no pudimos confirmar el idioma ni los subtítulos.",
            captions: "No verificado",
            duration: null,
            type: "clinic",
            concepts: [
                { id: "contencion", why: "Capítulo oficial sobre cómo defender la penetración, el objetivo de la contención del dribbling.", timestamps: [] }
            ],
            availability: "available",
            embed: "allowed",
            check: { date: "2026-11-28", method: "oembed", note: OEMBED_NOTE },
            contentReviewed: false,
            license: "No informada en lo que pudimos consultar. Se trata como contenido con derechos reservados: solo se inserta con el reproductor oficial.",
            foundAt: FIBA_CDP_PAGE,
            notes: "No se asoció al Closeout: el título habla de penetración y no pudimos revisar si incluye closeouts."
        },
        {
            id: "basketlab-drible-estatico",
            title: "Dribbling Estático - BasketLab",
            author: "BasketLab",
            channel: "BasketLab",
            channelUrl: "https://www.youtube.com/@BasketLab8",
            institution: "Basket Lab · By Coach Fritz",
            platform: "youtube",
            externalId: "iBP54bSAymw",
            url: "https://www.youtube.com/shorts/iBP54bSAymw",
            language: "No verificado",
            captions: "No verificado",
            duration: null,
            type: "demo",
            concepts: [
                { id: "drible-control", why: "Video propio de Basket Lab que ya estaba en la ficha antigua de Drible estático.", timestamps: [] }
            ],
            availability: "available",
            embed: "allowed",
            check: { date: "2026-11-28", method: "oembed", note: OEMBED_NOTE },
            contentReviewed: false,
            license: "Contenido propio del canal BasketLab.",
            foundAt: "js/fundamentos-data.js (ficha antigua)",
            notes: "Se conserva el video que ya tenía la app, ahora con el reproductor de privacidad mejorada."
        }
    ];

    var byId = {};
    VIDEOS.forEach(function (v) { byId[v.id] = v; });

    function get(id) { return byId[id] || null; }

    /** El video se puede insertar sin mostrar un reproductor vacío. */
    function canEmbed(v) {
        return !!v && v.platform === "youtube" && v.availability === "available" && v.embed === "allowed" && /^[A-Za-z0-9_-]{11}$/.test(v.externalId || "") && !!v.check && !!v.check.date;
    }

    /** Se puede mostrar al menos como enlace (no eliminado). */
    function isListed(v) {
        return !!v && v.availability !== "removed" && !!v.check && !!v.check.date;
    }

    function forConcept(conceptId) {
        return VIDEOS.filter(function (v) {
            return isListed(v) && v.concepts.some(function (c) { return c.id === conceptId; });
        });
    }

    function hasVideo(conceptId) { return forConcept(conceptId).length > 0; }

    /** URL del reproductor oficial (dominio de privacidad mejorada, sin reproducción automática). */
    function embedUrl(v, start) {
        var q = ["rel=0"];
        if (start != null && start > 0) q.push("start=" + Math.floor(start));
        return "https://www.youtube-nocookie.com/embed/" + v.externalId + "?" + q.join("&");
    }

    function validate() {
        var errors = [];
        var ext = {};
        VIDEOS.forEach(function (v) {
            ["id", "title", "channel", "institution", "platform", "externalId", "url", "language", "type", "availability", "embed", "license"].forEach(function (f) {
                if (!v[f]) errors.push(v.id + ": falta " + f);
            });
            if (!TYPES[v.type]) errors.push(v.id + ": tipo inválido");
            if (!v.check || !/^\d{4}-\d{2}-\d{2}$/.test(v.check.date || "") || !v.check.method) errors.push(v.id + ": sin fecha o método de comprobación");
            if (ext[v.platform + ":" + v.externalId]) errors.push(v.id + ": video duplicado con " + ext[v.platform + ":" + v.externalId]);
            ext[v.platform + ":" + v.externalId] = v.id;
            if (!/^https:\/\//.test(v.url)) errors.push(v.id + ": URL sin https");
            if (/abierta|creative commons|cc[- ]by/i.test(v.license) && !v.licenseVerified) errors.push(v.id + ": licencia abierta sin verificar");
            (v.concepts || []).forEach(function (c) {
                if (!c.why) errors.push(v.id + ": relación sin finalidad educativa con " + c.id);
                if ((c.timestamps || []).length && !v.contentReviewed) errors.push(v.id + ": marcas temporales sin revisión del contenido");
            });
            if (!v.concepts || !v.concepts.length) errors.push(v.id + ": sin fundamentos relacionados");
        });
        return errors;
    }

    // ------------------------------------------------------------------
    // Interfaz (solo navegador)
    // ------------------------------------------------------------------
    function esc(s) {
        return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    function fmtDate(iso) {
        var p = String(iso || "").split("-");
        return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : iso;
    }

    /*
     * Tarjeta de un video para un fundamento.
     * opts = { conceptId, observe: [..] (qué mirar, texto original de Basket Lab), purpose }
     */
    function renderCard(videoId, opts) {
        opts = opts || {};
        var v = get(videoId);
        if (!v || !isListed(v)) {
            return '<div class="bv-card bv-card--missing"><p><strong>Video no disponible.</strong> Este recurso se retiró del catálogo o todavía no se comprobó. La ficha sigue completa sin él.</p></div>';
        }
        var rel = (v.concepts || []).filter(function (c) { return c.id === opts.conceptId; })[0] || {};
        var stamps = (rel.timestamps || []).map(function (t) {
            return '<li><button type="button" class="bv-stamp" data-video-load="' + esc(v.id) + '" data-start="' + Number(t.start) + '">' + esc(t.label) + "</button> " + esc(t.note || "") + "</li>";
        }).join("");
        var player = canEmbed(v)
            ? '<div class="bv-frame" data-video-slot="' + esc(v.id) + '">' +
                '<button type="button" class="bv-facade" data-video-load="' + esc(v.id) + '" aria-label="Cargar el reproductor de YouTube para ' + esc(v.title) + '">' +
                '<span class="bv-facade-play" aria-hidden="true"><svg viewBox="0 0 48 48" width="56" height="56"><circle cx="24" cy="24" r="22" fill="rgba(0,0,0,.55)" stroke="#ff9800" stroke-width="2"/><path d="M19 15l15 9-15 9z" fill="#fff"/></svg></span>' +
                '<span class="bv-facade-text"><strong>Cargar el reproductor de YouTube</strong><small>Al cargarlo te conectás con YouTube (modo de privacidad mejorada). El video no empieza solo.</small></span>' +
                "</button></div>"
            : '<div class="bv-frame bv-frame--blocked"><p><strong>Este video no se puede ver dentro de Basket Lab.</strong> ' +
                (v.embed === "blocked" ? "Su propietario no permite insertarlo en otros sitios." : "No pudimos confirmar que se pueda insertar.") +
                ' Podés verlo en su fuente original.</p><p><a class="tb-btn tb-btn--small" href="' + esc(v.url) + '" target="_blank" rel="noopener noreferrer">Ver en YouTube</a></p></div>';
        return '<article class="bv-card" id="bv-' + esc(v.id) + '">' +
            '<header class="bv-head"><span class="bv-type">' + esc(TYPES[v.type]) + "</span><h4>" + esc(v.title) + "</h4>" +
            '<p class="bv-by">' + esc(v.institution) + " · canal <a href=\"" + esc(v.channelUrl) + '" target="_blank" rel="noopener noreferrer">' + esc(v.channel) + "</a></p></header>" +
            player +
            '<div class="bv-body">' +
            (opts.purpose ? "<p><strong>Para qué verlo:</strong> " + esc(opts.purpose) + "</p>" : (rel.why ? "<p><strong>Relación con este fundamento:</strong> " + esc(rel.why) + "</p>" : "")) +
            (opts.observe && opts.observe.length ? "<p><strong>Qué observar:</strong></p><ul class=\"ac-list\">" + opts.observe.map(function (o) { return "<li>" + esc(o) + "</li>"; }).join("") + "</ul>" : "") +
            (stamps ? "<p><strong>Segmentos revisados:</strong></p><ul class=\"bv-stamps\">" + stamps + "</ul>" : '<p class="bv-note">Sin marcas de tiempo: todavía no revisamos este video minuto a minuto, así que no indicamos desde dónde mirarlo.</p>') +
            '<details class="bv-details"><summary>Datos del recurso</summary><dl>' +
            "<dt>Idioma</dt><dd>" + esc(v.language) + "</dd>" +
            "<dt>Subtítulos</dt><dd>" + esc(v.captions || "No verificado") + "</dd>" +
            "<dt>Duración</dt><dd>" + esc(v.duration || "No verificada") + "</dd>" +
            "<dt>Comprobado</dt><dd>" + esc(fmtDate(v.check.date)) + ". " + esc(v.check.note || "") + "</dd>" +
            "<dt>Contenido</dt><dd>" + (v.contentReviewed ? "Revisado por Basket Lab." : "No revisado minuto a minuto: la relación con el fundamento surge del título, la serie y la página oficial donde se publica.") + "</dd>" +
            "<dt>Licencia</dt><dd>" + esc(v.license) + "</dd>" +
            (v.foundAt && /^https:/.test(v.foundAt) ? '<dt>Dónde lo encontramos</dt><dd><a href="' + esc(v.foundAt) + '" target="_blank" rel="noopener noreferrer">' + esc(v.foundAt) + "</a></dd>" : "") +
            '<dt>Original</dt><dd><a href="' + esc(v.url) + '" target="_blank" rel="noopener noreferrer">' + esc(v.url) + "</a></dd>" +
            "</dl></details></div></article>";
    }

    /** Reemplaza la portada por el iframe oficial cuando la persona lo pide. */
    function activate(button) {
        if (!button || typeof document === "undefined") return;
        var id = button.getAttribute("data-video-load");
        var v = get(id);
        if (!canEmbed(v)) return;
        var card = button.closest(".bv-card");
        var slot = card ? card.querySelector('[data-video-slot="' + id + '"]') : null;
        if (!slot) return;
        var start = Number(button.getAttribute("data-start") || 0);
        slot.innerHTML = '<div class="bv-iframe-wrap"><iframe src="' + esc(embedUrl(v, start)) + '" title="' + esc(v.title) + '" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>' +
            '<p class="bv-note">Reproductor oficial de YouTube. Si no carga, <a href="' + esc(v.url) + '" target="_blank" rel="noopener noreferrer">abrilo en YouTube</a>.</p>';
        var frame = slot.querySelector("iframe");
        if (frame && frame.focus) frame.focus();
    }

    /** Delegación de clics: se ata una vez al documento. */
    if (root && root.document && root.document.addEventListener) {
        root.document.addEventListener("click", function (e) {
            var b = e.target && e.target.closest ? e.target.closest("[data-video-load]") : null;
            if (b) { e.preventDefault(); activate(b); }
        });
    }

    return {
        TYPES: TYPES,
        VIDEOS: VIDEOS,
        get: get,
        canEmbed: canEmbed,
        isListed: isListed,
        forConcept: forConcept,
        hasVideo: hasVideo,
        embedUrl: embedUrl,
        validate: validate,
        renderCard: renderCard,
        activate: activate
    };
});
